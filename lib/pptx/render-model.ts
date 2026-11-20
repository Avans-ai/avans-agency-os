/**
 * Reads a PPTX into a framework-free description of what each slide draws:
 * geometry, fills, lines, text runs and pictures, with theme colours already
 * resolved. The React viewer renders this model; tests inspect it.
 */
import { readZip, readText, type PackageFiles } from "./zip";
import { parseRels, relsPathOf, resolveTarget, slideParts, REL } from "./package";
import {
  decodeXml,
  findAll,
  findFirst,
  getAttr,
  innerXml,
  outerXml,
} from "./xml";
import { shapeBox, type Box } from "./slide";

export type RenderRun = {
  text: string;
  size: number; // pt
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  caps: boolean;
  color: string | null; // #RRGGBB
  opacity: number;
  typeface: string;
  spacing: number; // pt
  breakBefore?: boolean;
};

export type RenderParagraph = {
  align: "left" | "center" | "right" | "justify";
  /** Line spacing: multiple of single spacing, or fixed points. */
  lineSpacing: { pct?: number; pts?: number };
  spaceBefore: number; // pt
  spaceAfter: number; // pt
  marginLeft: number; // pt
  indent: number; // pt
  bullet: string | null;
  runs: RenderRun[];
  /** Size used for empty paragraphs (endParaRPr). */
  emptySize: number;
};

export type RenderText = {
  insets: { l: number; t: number; r: number; b: number }; // pt
  anchor: "top" | "middle" | "bottom";
  wrap: boolean;
  vertical: boolean;
  paragraphs: RenderParagraph[];
};

export type RenderElement =
  | {
      kind: "shape";
      id: string;
      name: string;
      box: Box;
      rotation: number;
      flipH: boolean;
      flipV: boolean;
      geometry: "rect" | "ellipse" | "roundRect" | "line" | "other";
      fill: { color: string; opacity: number } | null;
      line: { color: string; width: number; opacity: number } | null;
      text: RenderText | null;
    }
  | {
      kind: "picture";
      id: string;
      name: string;
      box: Box;
      rotation: number;
      media: string | null;
      crop: { l: number; t: number; r: number; b: number };
      opacity: number;
    };

export type RenderSlide = {
  index: number;
  part: string;
  background: string;
  elements: RenderElement[];
};

export type RenderDeck = {
  width: number; // EMU
  height: number; // EMU
  slides: RenderSlide[];
  media: Map<string, { bytes: Uint8Array; type: string }>;
};

const EMU_PT = 12700;

type ColorContext = { scheme: Record<string, string>; map: Record<string, string> };

function applyMods(hex: string, xml: string): { color: string; opacity: number } {
  let [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  let opacity = 1;
  const val = (name: string) => {
    const m = new RegExp(`<a:${name} val="(-?\\d+)"`).exec(xml);
    return m ? Number(m[1]) / 100000 : null;
  };
  const lumMod = val("lumMod");
  const lumOff = val("lumOff");
  const shade = val("shade");
  const tint = val("tint");
  const alpha = val("alpha");
  if (lumMod !== null || lumOff !== null) {
    // Approximation in RGB space; adequate for the flat colours of the master.
    [r, g, b] = [r, g, b].map((c) =>
      Math.min(255, Math.max(0, c * (lumMod ?? 1) + 255 * (lumOff ?? 0))),
    );
  }
  if (shade !== null) [r, g, b] = [r, g, b].map((c) => c * shade);
  if (tint !== null) [r, g, b] = [r, g, b].map((c) => c + (255 - c) * (1 - tint));
  if (alpha !== null) opacity = alpha;
  const hx = (c: number) => Math.round(c).toString(16).padStart(2, "0");
  return { color: `#${hx(r)}${hx(g)}${hx(b)}`.toUpperCase(), opacity };
}

/** Resolves the first colour element (srgbClr/schemeClr/prstClr/sysClr) of a fragment. */
function colorOf(fragment: string, ctx: ColorContext): { color: string; opacity: number } | null {
  const srgb = findFirst(fragment, "a:srgbClr");
  const scheme = findFirst(fragment, "a:schemeClr");
  const sys = findFirst(fragment, "a:sysClr");
  const candidates = [srgb, scheme, sys].filter(Boolean).sort((a, b) => a!.start - b!.start);
  const el = candidates[0];
  if (!el) return null;
  const xml = outerXml(fragment, el);
  if (el === srgb) return applyMods(getAttr(xml, "val") ?? "000000", xml);
  if (el === sys) return applyMods(getAttr(xml, "lastClr") ?? "000000", xml);
  const key = getAttr(xml, "val") ?? "tx1";
  const mapped = ctx.map[key] ?? key;
  return applyMods(ctx.scheme[mapped] ?? "000000", xml);
}

function fillOf(spPr: string, ctx: ColorContext) {
  const ln = findFirst(spPr, "a:ln");
  const outside = ln ? spPr.slice(0, ln.start) + spPr.slice(ln.end) : spPr;
  if (findFirst(outside, "a:noFill") && !findFirst(outside, "a:solidFill")) return null;
  const solid = findFirst(outside, "a:solidFill");
  return solid ? colorOf(outerXml(outside, solid), ctx) : null;
}

function lineOf(spPr: string, ctx: ColorContext) {
  const ln = findFirst(spPr, "a:ln");
  if (!ln) return null;
  const xml = outerXml(spPr, ln);
  if (findFirst(xml, "a:noFill")) return null;
  const solid = findFirst(xml, "a:solidFill");
  if (!solid) return null;
  const c = colorOf(outerXml(xml, solid), ctx);
  if (!c) return null;
  return { ...c, width: Number(getAttr(xml, "w") ?? 9525) / EMU_PT };
}

const toPt = (v: string | undefined, fallback: number) =>
  v === undefined ? fallback : Number(v) / EMU_PT;

function parseText(shapeXml: string, ctx: ColorContext): RenderText | null {
  const body = findFirst(shapeXml, "p:txBody");
  if (!body) return null;
  const inner = innerXml(shapeXml, body);
  const bodyPrEl = findFirst(inner, "a:bodyPr");
  const bodyPr = bodyPrEl ? outerXml(inner, bodyPrEl) : "<a:bodyPr/>";
  const anchor = getAttr(bodyPr, "anchor");
  const paragraphs: RenderParagraph[] = findAll(inner, "a:p").map((pEl) => {
    const p = outerXml(inner, pEl);
    const pPrEl = findFirst(p, "a:pPr");
    const pPr = pPrEl ? outerXml(p, pPrEl) : "";
    const algn = getAttr(pPr, "algn");
    const lnPct = /<a:lnSpc><a:spcPct val="(\d+)"/.exec(pPr)?.[1];
    const lnPts = /<a:lnSpc><a:spcPts val="(\d+)"/.exec(pPr)?.[1];
    const bef = /<a:spcBef><a:spcPts val="(\d+)"/.exec(pPr)?.[1];
    const aft = /<a:spcAft><a:spcPts val="(\d+)"/.exec(pPr)?.[1];
    const buChar = /<a:buChar char="([^"]*)"/.exec(pPr)?.[1];
    const runs: RenderRun[] = [];
    let pendingBreak = false;
    const pieces = [...findAll(p, "a:r"), ...findAll(p, "a:br"), ...findAll(p, "a:fld")].sort(
      (a, b) => a.start - b.start,
    );
    for (const piece of pieces) {
      const xml = outerXml(p, piece);
      if (piece.name === "a:br") {
        pendingBreak = true;
        continue;
      }
      const rPrEl = findFirst(xml, "a:rPr");
      const rPr = rPrEl ? outerXml(xml, rPrEl) : "";
      const solid = rPr ? findFirst(rPr, "a:solidFill") : null;
      const color = solid ? colorOf(outerXml(rPr, solid), ctx) : null;
      runs.push({
        text: findAll(xml, "a:t")
          .map((t) => decodeXml(innerXml(xml, t)))
          .join(""),
        size: Number(getAttr(rPr, "sz") ?? 1800) / 100,
        bold: getAttr(rPr, "b") === "1",
        italic: getAttr(rPr, "i") === "1",
        underline: (getAttr(rPr, "u") ?? "none") !== "none",
        strike: (getAttr(rPr, "strike") ?? "noStrike") !== "noStrike",
        caps: getAttr(rPr, "cap") === "all",
        color: color?.color ?? null,
        opacity: color?.opacity ?? 1,
        typeface: /<a:latin typeface="([^"]+)"/.exec(rPr)?.[1] ?? "Figtree",
        spacing: Number(getAttr(rPr, "spc") ?? 0) / 100,
        breakBefore: pendingBreak || undefined,
      });
      pendingBreak = false;
    }
    const endEl = findFirst(p, "a:endParaRPr");
    return {
      align:
        algn === "ctr" ? "center" : algn === "r" ? "right" : algn === "just" ? "justify" : "left",
      lineSpacing: lnPts ? { pts: Number(lnPts) / 100 } : { pct: lnPct ? Number(lnPct) / 100000 : 1 },
      spaceBefore: bef ? Number(bef) / 100 : 0,
      spaceAfter: aft ? Number(aft) / 100 : 0,
      marginLeft: toPt(getAttr(pPr, "marL"), 0),
      indent: toPt(getAttr(pPr, "indent"), 0),
      bullet: buChar && !pPr.includes("<a:buNone/>") ? decodeXml(buChar) : null,
      runs,
      emptySize: (() => {
        const sz = endEl ? getAttr(outerXml(p, endEl), "sz") : undefined;
        return sz ? Number(sz) / 100 : (runs[0]?.size ?? 18);
      })(),
    };
  });
  return {
    insets: {
      l: toPt(getAttr(bodyPr, "lIns"), 7.2),
      t: toPt(getAttr(bodyPr, "tIns"), 3.6),
      r: toPt(getAttr(bodyPr, "rIns"), 7.2),
      b: toPt(getAttr(bodyPr, "bIns"), 3.6),
    },
    anchor: anchor === "ctr" ? "middle" : anchor === "b" ? "bottom" : "top",
    wrap: getAttr(bodyPr, "wrap") !== "none",
    vertical: /vert="(vert|vert270|eaVert)"/.test(bodyPr),
    paragraphs,
  };
}

function parseElements(part: string, files: PackageFiles, ctx: ColorContext): RenderElement[] {
  const xml = readText(files, part);
  const tree = findFirst(xml, "p:spTree");
  if (!tree) return [];
  const relsPath = relsPathOf(part);
  const rels = files.has(relsPath) ? parseRels(readText(files, relsPath)) : [];
  const tags = ["p:sp", "p:pic", "p:cxnSp"];
  const found = tags
    .flatMap((t) => findAll(xml, t, tree.openEnd, tree.closeStart))
    .sort((a, b) => a.start - b.start);
  const out: RenderElement[] = [];
  for (const el of found) {
    const s = outerXml(xml, el);
    // Placeholders of layouts/masters are prompts, not artwork.
    if (part.includes("slideLayout") || part.includes("slideMaster"))
      if (findFirst(s, "p:ph")) continue;
    const box = shapeBox(s);
    if (!box) continue;
    const cNvPr = findFirst(s, "p:cNvPr");
    const head = cNvPr ? outerXml(s, cNvPr) : "";
    const xfrmEl = findFirst(s, "a:xfrm");
    const xfrm = xfrmEl ? outerXml(s, xfrmEl) : "";
    const rotation = Number(getAttr(xfrm, "rot") ?? 0) / 60000;
    const spPrEl = findFirst(s, "p:spPr");
    const spPr = spPrEl ? outerXml(s, spPrEl) : "";
    if (el.name === "p:pic") {
      const blip = findFirst(s, "a:blip");
      const rid = blip ? getAttr(outerXml(s, blip), "r:embed") : undefined;
      const rel = rels.find((r) => r.id === rid && r.type === REL.image);
      const src = findFirst(s, "a:srcRect");
      const srcXml = src ? outerXml(s, src) : "";
      const alpha = /<a:alphaModFix amt="(\d+)"/.exec(s)?.[1];
      out.push({
        kind: "picture",
        id: getAttr(head, "id") ?? "",
        name: getAttr(head, "name") ?? "",
        box,
        rotation,
        media: rel ? resolveTarget(part, rel.target) : null,
        crop: {
          l: Number(getAttr(srcXml, "l") ?? 0) / 100000,
          t: Number(getAttr(srcXml, "t") ?? 0) / 100000,
          r: Number(getAttr(srcXml, "r") ?? 0) / 100000,
          b: Number(getAttr(srcXml, "b") ?? 0) / 100000,
        },
        opacity: alpha ? Number(alpha) / 100000 : 1,
      });
      continue;
    }
    const prst = /<a:prstGeom prst="(\w+)"/.exec(spPr)?.[1];
    out.push({
      kind: "shape",
      id: getAttr(head, "id") ?? "",
      name: getAttr(head, "name") ?? "",
      box,
      rotation,
      flipH: getAttr(xfrm, "flipH") === "1",
      flipV: getAttr(xfrm, "flipV") === "1",
      geometry:
        el.name === "p:cxnSp" || prst === "line" || prst === "straightConnector1"
          ? "line"
          : prst === "ellipse"
            ? "ellipse"
            : prst === "roundRect"
              ? "roundRect"
              : prst === "rect" || !prst
                ? "rect"
                : "other",
      fill: fillOf(spPr, ctx),
      line: lineOf(spPr, ctx),
      text: parseText(s, ctx),
    });
  }
  return out;
}

function backgroundOf(part: string, files: PackageFiles, ctx: ColorContext): string | null {
  const xml = readText(files, part);
  const bg = findFirst(xml, "p:bg");
  if (!bg) return null;
  const c = colorOf(outerXml(xml, bg), ctx);
  return c?.color ?? null;
}

function relTarget(files: PackageFiles, part: string, type: string): string | null {
  const relsPath = relsPathOf(part);
  if (!files.has(relsPath)) return null;
  const rel = parseRels(readText(files, relsPath)).find((r) => r.type.endsWith(type));
  return rel ? resolveTarget(part, rel.target) : null;
}

export function readRenderDeck(bytes: Uint8Array): RenderDeck {
  const files = readZip(bytes);
  const pres = readText(files, "ppt/presentation.xml");
  const size = findFirst(pres, "p:sldSz");
  const sizeXml = size ? outerXml(pres, size) : "";
  const parts = slideParts(files);
  const mediaTypes: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
  };
  const media = new Map<string, { bytes: Uint8Array; type: string }>();
  for (const [name, data] of files)
    if (name.startsWith("ppt/media/"))
      media.set(name, {
        bytes: data,
        type: mediaTypes[name.split(".").pop()!.toLowerCase()] ?? "application/octet-stream",
      });
  const contexts = new Map<string, ColorContext>();
  const colorContext = (masterPart: string): ColorContext => {
    if (contexts.has(masterPart)) return contexts.get(masterPart)!;
    const master = readText(files, masterPart);
    const clrMap = findFirst(master, "p:clrMap");
    const map: Record<string, string> = {};
    if (clrMap) {
      const tag = outerXml(master, clrMap);
      for (const m of tag.matchAll(/(\w+)="(\w+)"/g)) map[m[1]] = m[2];
    }
    const themePart = relTarget(files, masterPart, "/theme");
    const scheme: Record<string, string> = {};
    if (themePart) {
      const theme = readText(files, themePart);
      const cs = findFirst(theme, "a:clrScheme");
      if (cs) {
        const csXml = outerXml(theme, cs);
        for (const key of ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"]) {
          const el = findFirst(csXml, `a:${key}`);
          if (!el) continue;
          const inner = outerXml(csXml, el);
          scheme[key] =
            /srgbClr val="([0-9A-Fa-f]{6})"/.exec(inner)?.[1] ??
            /lastClr="([0-9A-Fa-f]{6})"/.exec(inner)?.[1] ??
            "000000";
        }
      }
    }
    const ctx = { scheme, map };
    contexts.set(masterPart, ctx);
    return ctx;
  };
  const slides: RenderSlide[] = parts.map((part, i) => {
    const layout = relTarget(files, part, "/slideLayout");
    const master = layout ? relTarget(files, layout, "/slideMaster") : null;
    const ctx = master ? colorContext(master) : { scheme: {}, map: {} };
    const slideXml = readText(files, part);
    const layoutXml = layout ? readText(files, layout) : "";
    const showMaster = (xml: string) => !/<p:(sld|sldLayout)\b[^>]*\sshowMasterSp="0"/.test(xml);
    const elements: RenderElement[] = [];
    if (master && layout && showMaster(slideXml) && showMaster(layoutXml))
      elements.push(...parseElements(master, files, ctx));
    if (layout && showMaster(slideXml)) elements.push(...parseElements(layout, files, ctx));
    elements.push(...parseElements(part, files, ctx));
    const background =
      backgroundOf(part, files, ctx) ??
      (layout ? backgroundOf(layout, files, ctx) : null) ??
      (master ? backgroundOf(master, files, ctx) : null) ??
      "#FFFFFF";
    return { index: i + 1, part, background, elements };
  });
  return {
    width: Number(getAttr(sizeXml, "cx") ?? 12192000),
    height: Number(getAttr(sizeXml, "cy") ?? 6858000),
    slides,
    media,
  };
}

/** Plain text per slide, in reading order (useful for search and tests). */
export function slideTexts(deck: RenderDeck): string[][] {
  return deck.slides.map((s) =>
    s.elements.flatMap((e) =>
      e.kind === "shape" && e.text
        ? e.text.paragraphs.map((p) => p.runs.map((r) => r.text).join("")).filter(Boolean)
        : [],
    ),
  );
}

export { EMU_PT };
