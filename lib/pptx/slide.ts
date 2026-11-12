import {
  escapeXml,
  findAll,
  findFirst,
  getAttr,
  innerXml,
  outerXml,
  setAttr,
  spliceRanges,
  textOf,
  xmlSafe,
} from "./xml";
import { EMU_PER_PT, fitText, type TextBoxMetrics } from "./text-fit";

export type Box = { x: number; y: number; cx: number; cy: number };

export type SlideShape = {
  kind: "sp" | "pic" | "cxnSp" | "grpSp" | "graphicFrame";
  id: string;
  name: string;
  start: number;
  end: number;
  xml: string;
  box: Box | null;
  text: string;
  /** Solid fill colour of the shape geometry, when it has one. */
  fill: string | null;
};

const SHAPE_KINDS = ["p:sp", "p:pic", "p:cxnSp", "p:grpSp", "p:graphicFrame"] as const;

export function shapeBox(shapeXml: string): Box | null {
  const xfrm = findFirst(shapeXml, "a:xfrm");
  if (!xfrm) return null;
  const inner = innerXml(shapeXml, xfrm);
  const off = findFirst(inner, "a:off");
  const ext = findFirst(inner, "a:ext");
  if (!off || !ext) return null;
  const o = outerXml(inner, off);
  const e = outerXml(inner, ext);
  return {
    x: Number(getAttr(o, "x") ?? 0),
    y: Number(getAttr(o, "y") ?? 0),
    cx: Number(getAttr(e, "cx") ?? 0),
    cy: Number(getAttr(e, "cy") ?? 0),
  };
}

function shapeFill(shapeXml: string): string | null {
  const spPr = findFirst(shapeXml, "p:spPr");
  if (!spPr) return null;
  const inner = innerXml(shapeXml, spPr);
  const solid = findAll(inner, "a:solidFill").find(
    (f) => !findAll(inner, "a:ln").some((ln) => f.start > ln.start && f.end <= ln.end),
  );
  if (!solid) return null;
  const color = /val="([0-9A-Za-z]+)"/.exec(outerXml(inner, solid));
  return color ? color[1].toUpperCase() : null;
}

export function spTreeRange(slideXml: string) {
  const tree = findFirst(slideXml, "p:spTree");
  if (!tree) throw new Error("Slide sin p:spTree");
  return tree;
}

/** Top-level drawing objects of a slide, in z-order. */
export function listShapes(slideXml: string): SlideShape[] {
  const tree = spTreeRange(slideXml);
  const found = SHAPE_KINDS.flatMap((tag) =>
    findAll(slideXml, tag, tree.openEnd, tree.closeStart).map((el) => ({ tag, el })),
  ).sort((a, b) => a.el.start - b.el.start);
  // Drop elements nested in a group: only direct children are listed.
  const top = found.filter(
    (f) => !found.some((o) => o !== f && o.el.start < f.el.start && o.el.end >= f.el.end),
  );
  return top.map(({ tag, el }) => {
    const xml = outerXml(slideXml, el);
    const cNvPr = findFirst(xml, "p:cNvPr");
    const head = cNvPr ? outerXml(xml, cNvPr) : "";
    return {
      kind: tag.slice(2) as SlideShape["kind"],
      id: getAttr(head, "id") ?? "",
      name: getAttr(head, "name") ?? "",
      start: el.start,
      end: el.end,
      xml,
      box: shapeBox(xml),
      text: tag === "p:sp" ? paragraphsOf(xml).join("\n") : "",
      fill: tag === "p:sp" ? shapeFill(xml) : null,
    };
  });
}

export function paragraphsOf(shapeXml: string): string[] {
  const body = findFirst(shapeXml, "p:txBody");
  if (!body) return [];
  return findAll(shapeXml, "a:p", body.openEnd, body.closeStart).map((p) =>
    textOf(outerXml(shapeXml, p)),
  );
}

export function removeShapes(slideXml: string, ids: Set<string>): string {
  const edits = listShapes(slideXml)
    .filter((s) => ids.has(s.id))
    .map((s) => ({ start: s.start, end: s.end, text: "" }));
  return edits.length ? spliceRanges(slideXml, edits) : slideXml;
}

export function replaceShapes(slideXml: string, next: Map<string, string>): string {
  const edits = listShapes(slideXml)
    .filter((s) => next.has(s.id))
    .map((s) => ({ start: s.start, end: s.end, text: next.get(s.id)! }));
  return edits.length ? spliceRanges(slideXml, edits) : slideXml;
}

export function insertShape(slideXml: string, shapeXml: string): string {
  const tree = spTreeRange(slideXml);
  return slideXml.slice(0, tree.closeStart) + shapeXml + slideXml.slice(tree.closeStart);
}

export function maxShapeId(slideXml: string): number {
  let max = 1;
  for (const m of slideXml.matchAll(/<p:cNvPr[^>]*\sid="(\d+)"/g))
    max = Math.max(max, Number(m[1]));
  return max;
}

export function setBox(shapeXml: string, box: Box): string {
  const xfrm = findFirst(shapeXml, "a:xfrm");
  if (!xfrm) return shapeXml;
  const inner = innerXml(shapeXml, xfrm);
  const off = findFirst(inner, "a:off")!;
  const ext = findFirst(inner, "a:ext")!;
  let next = spliceRanges(inner, [
    {
      start: off.start,
      end: off.end,
      text: setAttr(setAttr(outerXml(inner, off), "x", String(Math.round(box.x))), "y", String(Math.round(box.y))),
    },
    {
      start: ext.start,
      end: ext.end,
      text: setAttr(setAttr(outerXml(inner, ext), "cx", String(Math.round(box.cx))), "cy", String(Math.round(box.cy))),
    },
  ]);
  next = shapeXml.slice(0, xfrm.openEnd) + next + shapeXml.slice(xfrm.closeStart);
  return next;
}

/** Style of the text body, read once from the original placeholder. */
export type TextStyle = {
  bodyPr: string;
  lstStyle: string;
  pPr: string;
  rPr: string;
  endParaRPr: string;
  metrics: Omit<TextBoxMetrics, "widthPt" | "heightPt"> & {
    insets: { l: number; t: number; r: number; b: number };
    anchor: string;
  };
  size: number;
};

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return v !== undefined && Number.isFinite(n) ? n : fallback;
};

export function textStyleOf(shapeXml: string): TextStyle | null {
  const body = findFirst(shapeXml, "p:txBody");
  if (!body) return null;
  const inner = innerXml(shapeXml, body);
  const bodyPrEl = findFirst(inner, "a:bodyPr");
  const lstEl = findFirst(inner, "a:lstStyle");
  const paragraphs = findAll(inner, "a:p");
  const p =
    paragraphs.find((q) => /\[/.test(textOf(outerXml(inner, q)))) ?? paragraphs[0];
  const pXml = p ? outerXml(inner, p) : "<a:p/>";
  const pPrEl = findFirst(pXml, "a:pPr");
  const runs = findAll(pXml, "a:r");
  const run =
    runs.find((r) => /\[/.test(textOf(outerXml(pXml, r)))) ?? runs[0];
  const runXml = run ? outerXml(pXml, run) : "";
  const rPrEl = runXml ? findFirst(runXml, "a:rPr") : null;
  const endEl = findFirst(pXml, "a:endParaRPr");
  const bodyPr = bodyPrEl ? outerXml(inner, bodyPrEl) : "<a:bodyPr/>";
  const pPr = pPrEl ? outerXml(pXml, pPrEl) : "";
  const rPr = rPrEl ? outerXml(runXml, rPrEl) : '<a:rPr lang="es-AR"/>';
  const typeface = /<a:latin typeface="([^"]+)"/.exec(rPr)?.[1] ?? "Figtree";
  const lnPct = /<a:lnSpc><a:spcPct val="(\d+)"/.exec(pPr)?.[1];
  const lnPts = /<a:lnSpc><a:spcPts val="(\d+)"/.exec(pPr)?.[1];
  const bef = /<a:spcBef><a:spcPts val="(\d+)"/.exec(pPr)?.[1];
  const aft = /<a:spcAft><a:spcPts val="(\d+)"/.exec(pPr)?.[1];
  return {
    bodyPr,
    lstStyle: lstEl ? outerXml(inner, lstEl) : "<a:lstStyle/>",
    pPr,
    rPr,
    endParaRPr: endEl ? outerXml(pXml, endEl) : "",
    size: num(getAttr(rPr, "sz"), 1800),
    metrics: {
      typeface,
      bold: getAttr(rPr, "b") === "1",
      lineSpacing: lnPct ? Number(lnPct) / 100000 : 1,
      lineSpacingPt: lnPts ? Number(lnPts) / 100 : undefined,
      spaceBeforePt: bef ? Number(bef) / 100 : 0,
      spaceAfterPt: aft ? Number(aft) / 100 : 0,
      wrap: getAttr(bodyPr, "wrap") !== "none",
      insets: {
        l: num(getAttr(bodyPr, "lIns"), 91440),
        t: num(getAttr(bodyPr, "tIns"), 45720),
        r: num(getAttr(bodyPr, "rIns"), 91440),
        b: num(getAttr(bodyPr, "bIns"), 45720),
      },
      anchor: getAttr(bodyPr, "anchor") ?? "t",
    },
  };
}

export type TextReplacement = {
  xml: string;
  size: number;
  baseSize: number;
  grown: boolean;
  fits: boolean;
};

/**
 * Replaces the whole text of a shape keeping the paragraph and run formatting
 * of the original placeholder. Each line of `value` becomes a paragraph; empty
 * lines are dropped (no empty bullets). `maxBottom` (EMU) is how far down the
 * box may grow without touching another object.
 */
export function replaceText(
  shapeXml: string,
  value: string,
  maxBottom?: number,
): TextReplacement {
  const style = textStyleOf(shapeXml);
  const box = shapeBox(shapeXml);
  if (!style || !box) throw new Error("El objeto no tiene texto editable.");
  const paragraphs = xmlSafe(value)
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const { insets } = style.metrics;
  const widthPt = (box.cx - insets.l - insets.r) / EMU_PER_PT;
  const heightPt = (box.cy - insets.t - insets.b) / EMU_PER_PT;
  const metrics: TextBoxMetrics = { ...style.metrics, widthPt, heightPt };
  const canGrow =
    style.metrics.anchor === "t" && maxBottom !== undefined && maxBottom > box.y + box.cy;
  const maxHeightPt = canGrow
    ? (maxBottom! - box.y - insets.t - insets.b) / EMU_PER_PT
    : heightPt;
  // Prefer the template size in the original box, then let it grow into free
  // space, and only then reduce the size.
  let fit = fitText(paragraphs, style.size, metrics, heightPt, style.size);
  if (!fit.fits) fit = fitText(paragraphs, style.size, metrics, maxHeightPt);
  const size = fit.size;
  const sized = (rPr: string) => (rPr ? setAttr(rPr, "sz", String(size)) : rPr);
  const rPr = sized(style.rPr);
  const end = style.endParaRPr ? sized(style.endParaRPr) : "";
  const body =
    style.bodyPr +
    style.lstStyle +
    (paragraphs.length ? paragraphs : [""])
      .map(
        (line) =>
          `<a:p>${style.pPr}${line ? `<a:r>${rPr}<a:t>${escapeXml(line)}</a:t></a:r>` : ""}${end}</a:p>`,
      )
      .join("");
  const txBody = findFirst(shapeXml, "p:txBody")!;
  let xml = shapeXml.slice(0, txBody.openEnd) + body + shapeXml.slice(txBody.closeStart);
  const neededCy = Math.ceil(fit.heightPt * EMU_PER_PT + insets.t + insets.b);
  let grown = false;
  if (canGrow && neededCy > box.cy) {
    xml = setBox(xml, { ...box, cy: Math.min(neededCy, maxBottom! - box.y) });
    grown = true;
  }
  return { xml, size, baseSize: style.size, grown, fits: fit.fits };
}

const overlaps = (a0: number, a1: number, b0: number, b1: number) =>
  Math.min(a1, b1) - Math.max(a0, b0) > EMU_PER_PT;

/**
 * Lowest y (EMU) a text box can extend to: the first object below it in the
 * same column, the bottom of a container behind it, or the content limit.
 */
export function freeBottom(
  target: SlideShape,
  shapes: SlideShape[],
  contentBottom: number,
): number {
  const box = target.box!;
  const bottom = box.y + box.cy;
  let limit = contentBottom;
  const gap = 6 * EMU_PER_PT;
  for (const s of shapes) {
    if (s === target || !s.box || s.id === target.id) continue;
    const b = s.box;
    if (!overlaps(box.x, box.x + box.cx, b.x, b.x + b.cx)) continue;
    if (b.y >= box.y + 2 * EMU_PER_PT) limit = Math.min(limit, b.y - gap);
    else if (b.y + b.cy > bottom) limit = Math.min(limit, b.y + b.cy - gap);
  }
  return Math.max(limit, bottom);
}

/** Sets the picture of a `p:pic` and crops it to fill its frame. */
export function setPicture(
  picXml: string,
  relId: string,
  crop: { l: number; t: number; r: number; b: number },
): string {
  const blip = findFirst(picXml, "a:blip");
  if (!blip) return picXml;
  let xml =
    picXml.slice(0, blip.start) +
    setAttr(picXml.slice(blip.start, blip.openEnd), "r:embed", relId) +
    picXml.slice(blip.openEnd);
  const src = findFirst(xml, "a:srcRect");
  const rect = `<a:srcRect l="${crop.l}" t="${crop.t}" r="${crop.r}" b="${crop.b}"/>`;
  if (src) xml = xml.slice(0, src.start) + rect + xml.slice(src.end);
  else {
    const b = findFirst(xml, "a:blip")!;
    xml = xml.slice(0, b.end) + rect + xml.slice(b.end);
  }
  return xml;
}

export function textShapeXml(o: {
  id: number;
  name: string;
  box: Box;
  text: string;
  size: number;
  color: string;
  typeface: string;
  align: "l" | "r" | "ctr";
  bold?: boolean;
}): string {
  const font = escapeXml(o.typeface);
  return (
    `<p:sp><p:nvSpPr><p:cNvPr id="${o.id}" name="${escapeXml(o.name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr><a:xfrm><a:off x="${Math.round(o.box.x)}" y="${Math.round(o.box.y)}"/><a:ext cx="${Math.round(o.box.cx)}" cy="${Math.round(o.box.cy)}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>` +
    `<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="t" anchorCtr="0"><a:noAutofit/></a:bodyPr><a:lstStyle/>` +
    `<a:p><a:pPr marL="0" indent="0" algn="${o.align}"><a:lnSpc><a:spcPct val="100000"/></a:lnSpc><a:spcBef><a:spcPts val="0"/></a:spcBef><a:spcAft><a:spcPts val="0"/></a:spcAft><a:buNone/></a:pPr>` +
    `<a:r><a:rPr lang="es-AR" sz="${o.size}" b="${o.bold ? 1 : 0}" i="0" u="none" strike="noStrike" cap="none"><a:solidFill><a:srgbClr val="${o.color}"/></a:solidFill>` +
    `<a:latin typeface="${font}"/><a:ea typeface="${font}"/><a:cs typeface="${font}"/><a:sym typeface="${font}"/></a:rPr>` +
    `<a:t>${escapeXml(o.text)}</a:t></a:r></a:p></p:txBody></p:sp>`
  );
}

/** Solid background colour declared on the slide itself (`p:bg`). */
export function slideBackground(slideXml: string): string | null {
  const bg = findFirst(slideXml, "p:bg");
  if (!bg) return null;
  const m = /<a:srgbClr val="([0-9A-Fa-f]{6})"/.exec(outerXml(slideXml, bg));
  return m ? m[1].toUpperCase() : null;
}
