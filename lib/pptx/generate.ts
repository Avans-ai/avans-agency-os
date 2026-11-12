import { readZip, readText, writeZip, type PackageFiles } from "./zip";
import {
  REL,
  parseRels,
  rebuildSlides,
  relsPathOf,
  resolveTarget,
  setCoreProperties,
  slideParts,
  type BuiltSlide,
  type Relationship,
} from "./package";
import {
  freeBottom,
  insertShape,
  listShapes,
  maxShapeId,
  removeShapes,
  replaceShapes,
  replaceText,
  setBox,
  setPicture,
  slideBackground,
  textShapeXml,
  type Box,
  type SlideShape,
} from "./slide";
import { EMU_PER_PT } from "./text-fit";
import { findFirst, getAttr, outerXml } from "./xml";
import { coverCrop, imageSize } from "./images";

export type DeckImage = {
  bytes: Uint8Array;
  contentType: "image/png" | "image/jpeg";
};

export type PendingItem = {
  kind: "field" | "image" | "text";
  label: string;
  /** Module the data belongs to (Discovery, Benchmark, Plan de Marketing). */
  module?: string;
  /** Link to the screen where the data is completed. */
  href?: string;
  objectId?: string;
};

export type DeckSlideSpec = {
  /** 1-based slide number in the master template. */
  template: number;
  key: string;
  title: string;
  /** Object id (`p:cNvPr id`) → text. An empty string removes the object. */
  replacements: Record<string, string>;
  /** Object ids removed from the slide (instructions, roles, unused cells). */
  remove: string[];
  /** Vertical/horizontal offsets in EMU, applied before text fitting. */
  moves?: Record<string, { dx?: number; dy?: number }>;
  /**
   * Image placeholders: object id → image to place, or null to remove the
   * placeholder frame and its caption.
   */
  images?: Record<string, DeckImage | null>;
  pending?: PendingItem[];
};

export type DeckSpec = {
  slides: DeckSlideSpec[];
  /** Text of the draft marker added to every slide; null for final files. */
  draftMarker?: string | null;
  title: string;
  author: string;
  /** ISO date; also used as the archive timestamp so output is reproducible. */
  createdAt: string;
};

export type SlideReport = {
  index: number;
  template: number;
  key: string;
  title: string;
  pending: PendingItem[];
  adjustments: string[];
};

export type GenerationReport = {
  slides: SlideReport[];
  removedTemplateSlides: number[];
  warnings: string[];
  draft: boolean;
};

/** Text of internal guidance that must never reach a presented file. */
export const INSTRUCTION_PATTERNS: RegExp[] = [
  /^•\s*[A-ZÁÉÍÓÚÑ+ ]+$/, // role footer: "• PROJECT MANAGER", "• DISEÑADOR + CONTENT MANAGER"
  /Duplicar esta slide/i,
  /PÁGINA INTERNA/i,
  /Todo lo que está en coral/i,
  /Agregar o quitar columnas/i,
  /Los KPIs son los mismos para todos/i,
  /Dejar en el listado solo los módulos/i,
  /Antes de presentar:/i,
  /^Duplicar/i,
  /^Acá van los planes de medios/i,
  /Mover cada barra a las semanas/i,
  /esta slide se reemplaza por/i,
  /Este slide lo completa/i,
];

export const PLACEHOLDER = /\[[^\]]*\]/;

const INSTRUCTION_FILL = "FFE5D4";

function contains(outer: Box, inner: Box, tolerance = EMU_PER_PT) {
  return (
    inner.x >= outer.x - tolerance &&
    inner.y >= outer.y - tolerance &&
    inner.x + inner.cx <= outer.x + outer.cx + tolerance &&
    inner.y + inner.cy <= outer.y + outer.cy + tolerance
  );
}

const sameBox = (a: Box, b: Box) =>
  Math.abs(a.x - b.x) <= EMU_PER_PT &&
  Math.abs(a.y - b.y) <= EMU_PER_PT &&
  Math.abs(a.cx - b.cx) <= EMU_PER_PT &&
  Math.abs(a.cy - b.cy) <= EMU_PER_PT;

function luminance(hex: string) {
  const c = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Shapes that are internal instructions according to their text or style. */
export function instructionShapes(shapes: SlideShape[]): Set<string> {
  const ids = new Set<string>();
  const texts = shapes.filter(
    (s) => s.text && INSTRUCTION_PATTERNS.some((re) => re.test(s.text.trim())),
  );
  for (const t of texts) ids.add(t.id);
  // Coral instruction boxes and the icon square/glyph inside them.
  for (const box of shapes.filter((s) => s.fill === INSTRUCTION_FILL && s.box)) {
    if (!texts.some((t) => t.box && contains(box.box!, t.box, 4 * EMU_PER_PT))) continue;
    ids.add(box.id);
    for (const s of shapes)
      if (s.box && s !== box && contains(box.box!, s.box, 4 * EMU_PER_PT)) ids.add(s.id);
  }
  return ids;
}

type Ctx = {
  files: PackageFiles;
  mediaCounter: { n: number };
  width: number;
  height: number;
};

function buildSlide(
  ctx: Ctx,
  part: string,
  spec: DeckSlideSpec,
  index: number,
  draftMarker: string | null | undefined,
): { slide: BuiltSlide; report: SlideReport } {
  let xml = readText(ctx.files, part);
  const relsPath = relsPathOf(part);
  const rels: Relationship[] = ctx.files.has(relsPath)
    ? parseRels(readText(ctx.files, relsPath))
    : [];
  const pending: PendingItem[] = [...(spec.pending ?? [])];
  const adjustments: string[] = [];
  const remove = new Set(spec.remove);

  // 1 · Instructions (catalog ids plus a text/style safety net).
  for (const id of instructionShapes(listShapes(xml))) remove.add(id);

  // 2 · Image placeholders.
  const placed = new Map<string, string>();
  for (const [picId, image] of Object.entries(spec.images ?? {})) {
    const shapes = listShapes(xml);
    const pic = shapes.find((s) => s.id === picId && s.kind === "pic");
    if (!pic?.box) continue;
    if (image) {
      const ext = image.contentType === "image/png" ? "png" : "jpg";
      const media = `ppt/media/avans-os-${++ctx.mediaCounter.n}.${ext}`;
      ctx.files.set(media, image.bytes);
      const relId = `rIdImg${ctx.mediaCounter.n}`;
      rels.push({
        id: relId,
        type: REL.image,
        target: `../media/${media.split("/").pop()}`,
        external: false,
      });
      const size = imageSize(image.bytes);
      placed.set(
        picId,
        setPicture(pic.xml, relId, size ? coverCrop(size, pic.box) : { l: 0, t: 0, r: 0, b: 0 }),
      );
      continue;
    }
    remove.add(pic.id);
    for (const s of shapes) {
      if (s === pic || !s.box) continue;
      // The grey frame behind the placeholder and the caption inside it.
      if ((sameBox(s.box, pic.box) && !s.text) || contains(pic.box, s.box)) remove.add(s.id);
    }
  }
  if (placed.size) xml = replaceShapes(xml, placed);

  // 3 · Empty values remove their object; the rest is replaced below.
  for (const [id, value] of Object.entries(spec.replacements))
    if (!value.trim()) remove.add(id);
  xml = removeShapes(xml, remove);

  // 4 · Moves (e.g. compacting the list of contracted services).
  if (spec.moves) {
    const moved = new Map<string, string>();
    for (const s of listShapes(xml)) {
      const m = spec.moves[s.id];
      if (m && s.box)
        moved.set(s.id, setBox(s.xml, { ...s.box, x: s.box.x + (m.dx ?? 0), y: s.box.y + (m.dy ?? 0) }));
    }
    xml = replaceShapes(xml, moved);
  }

  // 5 · Text, top to bottom so grown boxes are seen by the ones below.
  const contentBottom = Math.round(ctx.height * 0.882);
  const targets = listShapes(xml)
    .filter((s) => spec.replacements[s.id]?.trim())
    .sort((a, b) => (a.box?.y ?? 0) - (b.box?.y ?? 0));
  for (const target of targets) {
    const shapes = listShapes(xml);
    const current = shapes.find((s) => s.id === target.id)!;
    const limit = current.box ? freeBottom(current, shapes, contentBottom) : undefined;
    const r = replaceText(current.xml, spec.replacements[target.id], limit);
    if (r.size < r.baseSize)
      adjustments.push(`Objeto ${target.id}: texto reducido de ${r.baseSize / 100} a ${r.size / 100} pt`);
    if (r.grown) adjustments.push(`Objeto ${target.id}: caja ampliada hacia espacio libre`);
    if (!r.fits)
      pending.push({
        kind: "text",
        label: `Texto extenso en «${spec.title}»: revisar el ajuste (objeto ${target.id})`,
        objectId: target.id,
      });
    xml = replaceShapes(xml, new Map([[target.id, r.xml]]));
  }

  // 6 · Placeholders that no data replaced are removed, never shown.
  const leftovers = new Set<string>();
  for (const s of listShapes(xml))
    if (s.text && PLACEHOLDER.test(s.text)) {
      leftovers.add(s.id);
      if (!pending.some((p) => p.objectId === s.id))
        pending.push({
          kind: "field",
          label: s.text.replace(/[[\]]/g, "").replace(/\s+/g, " ").trim(),
          objectId: s.id,
        });
    }
  xml = removeShapes(xml, leftovers);

  // 7 · Draft marker in the band freed by the role footer.
  if (draftMarker) {
    const bg = slideBackground(xml) ?? "FFFFFF";
    const coral = "FF6C4C";
    const color = contrast(coral, bg) >= 2.2 ? coral : contrast("15171A", bg) > contrast("FFFFFF", bg) ? "15171A" : "FFFFFF";
    const w = 520 * EMU_PER_PT;
    xml = insertShape(
      xml,
      textShapeXml({
        id: maxShapeId(xml) + 1,
        name: "Avans OS · Marca de borrador",
        box: {
          x: ctx.width - 56 * EMU_PER_PT - w,
          y: Math.round(ctx.height * 0.8938),
          cx: w,
          cy: 18 * EMU_PER_PT,
        },
        text: draftMarker,
        size: 1350,
        color,
        typeface: "Figtree",
        align: "r",
      }),
    );
  }

  return {
    slide: { xml, rels: rels.filter((r) => r.type !== REL.notesSlide) },
    report: {
      index,
      template: spec.template,
      key: spec.key,
      title: spec.title,
      pending,
      adjustments,
    },
  };
}

export function generatePptx(
  template: Uint8Array,
  spec: DeckSpec,
): { bytes: Uint8Array; report: GenerationReport } {
  const files = readZip(template);
  const parts = slideParts(files);
  const pres = readText(files, "ppt/presentation.xml");
  const sldSz = findFirst(pres, "p:sldSz");
  const sizeTag = sldSz ? outerXml(pres, sldSz) : "";
  const ctx: Ctx = {
    files,
    mediaCounter: { n: 0 },
    width: Number(getAttr(sizeTag, "cx") ?? 12192000),
    height: Number(getAttr(sizeTag, "cy") ?? 6858000),
  };
  const built: BuiltSlide[] = [];
  const reports: SlideReport[] = [];
  spec.slides.forEach((s, i) => {
    const part = parts[s.template - 1];
    if (!part) throw new Error(`La plantilla no tiene la página ${s.template}.`);
    const { slide, report } = buildSlide(ctx, part, s, i + 1, spec.draftMarker);
    built.push(slide);
    reports.push(report);
  });
  setCoreProperties(files, {
    title: spec.title,
    creator: spec.author,
    created: spec.createdAt,
    keywords: spec.draftMarker ? "borrador" : "versión cliente",
  });
  rebuildSlides(files, built);
  const used = new Set(spec.slides.map((s) => s.template));
  const bytes = writeZip(files, new Date(spec.createdAt));
  return {
    bytes,
    report: {
      slides: reports,
      removedTemplateSlides: parts.map((_, i) => i + 1).filter((n) => !used.has(n)),
      warnings: reports.flatMap((r) =>
        r.pending.filter((p) => p.kind === "text").map((p) => p.label),
      ),
      draft: !!spec.draftMarker,
    },
  };
}

/** Utility for tests and tooling: resolves the media of a slide part. */
export function slideMedia(files: PackageFiles, part: string): string[] {
  const relsPath = relsPathOf(part);
  if (!files.has(relsPath)) return [];
  return parseRels(readText(files, relsPath))
    .filter((r) => r.type === REL.image)
    .map((r) => resolveTarget(part, r.target));
}
