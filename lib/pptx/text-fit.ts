import { FONT_METRICS, type FontFaceMetrics } from "./font-metrics";

export const EMU_PER_PT = 12700;

/** Average advance (thousandths of an em) used for characters outside the table. */
const FALLBACK_ADVANCE = 560;

function faceOf(typeface: string, bold: boolean): FontFaceMetrics {
  const family = FONT_METRICS[typeface] ?? FONT_METRICS.Figtree;
  return bold ? family.bold : family.regular;
}

export function textWidthPt(
  text: string,
  sizePt: number,
  typeface = "Figtree",
  bold = false,
): number {
  const face = faceOf(typeface, bold);
  let units = 0;
  for (const ch of text) units += face.widths[ch] ?? FALLBACK_ADVANCE;
  return (units * sizePt) / 1000;
}

/** Height of one line at 100 % spacing, in points (ascent + descent). */
export function singleLinePt(sizePt: number, typeface = "Figtree") {
  const face = faceOf(typeface, false);
  return ((face.ascent + face.descent + face.lineGap) * sizePt) / 1000;
}

/** Greedy word wrap with the same rules PowerPoint applies to `wrap="square"`. */
export function wrapLines(
  text: string,
  widthPt: number,
  sizePt: number,
  typeface = "Figtree",
  bold = false,
): string[] {
  const lines: string[] = [];
  const space = textWidthPt(" ", sizePt, typeface, bold);
  let line = "";
  let lineWidth = 0;
  for (const word of text.split(/ +/)) {
    let w = textWidthPt(word, sizePt, typeface, bold);
    if (line && lineWidth + space + w <= widthPt) {
      line += " " + word;
      lineWidth += space + w;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    lineWidth = 0;
    let rest = word;
    // A word longer than the box is broken by characters (URLs, long codes).
    while (w > widthPt && rest.length > 1) {
      let cut = 1;
      while (
        cut < rest.length &&
        textWidthPt(rest.slice(0, cut + 1), sizePt, typeface, bold) <= widthPt
      )
        cut++;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
      w = textWidthPt(rest, sizePt, typeface, bold);
    }
    line = rest;
    lineWidth = w;
  }
  lines.push(line);
  return lines;
}

export type TextBoxMetrics = {
  /** Usable width and height inside the insets, in points. */
  widthPt: number;
  heightPt: number;
  typeface: string;
  bold: boolean;
  /** Line spacing as a fraction of single spacing (1 = 100 %). */
  lineSpacing: number;
  /** Fixed line spacing in points, when the paragraph uses spcPts. */
  lineSpacingPt?: number;
  spaceBeforePt: number;
  spaceAfterPt: number;
  wrap: boolean;
};

export function textHeightPt(
  paragraphs: string[],
  sizePt: number,
  box: TextBoxMetrics,
): { height: number; lines: number; widest: number } {
  const lineHeight =
    box.lineSpacingPt ?? singleLinePt(sizePt, box.typeface) * box.lineSpacing;
  let lines = 0;
  let widest = 0;
  for (const p of paragraphs) {
    const wrapped = box.wrap
      ? wrapLines(p, box.widthPt, sizePt, box.typeface, box.bold)
      : [p];
    lines += wrapped.length;
    for (const l of wrapped)
      widest = Math.max(widest, textWidthPt(l, sizePt, box.typeface, box.bold));
  }
  const spacing =
    paragraphs.length * (box.spaceBeforePt + box.spaceAfterPt) -
    box.spaceBeforePt;
  return { height: lines * lineHeight + Math.max(0, spacing), lines, widest };
}

export type FitResult = {
  /** Font size in hundredths of a point (OOXML `sz`). */
  size: number;
  /** Required height of the text area in points. */
  heightPt: number;
  fits: boolean;
  reduced: boolean;
};

/**
 * Deterministic fit: keeps the template size when possible, otherwise reduces
 * in small steps until the text fits the available height. Below `minSize`
 * the text keeps the minimum size and is reported as overflowing; it is never
 * cut.
 */
export function fitText(
  paragraphs: string[],
  baseSize: number,
  box: TextBoxMetrics,
  availableHeightPt: number,
  minSize = Math.max(900, Math.round(baseSize * 0.45)),
): FitResult {
  // 4 % safety margin: renderers differ slightly in kerning and wrapping.
  const margin = 0.96;
  const measure = (size: number) =>
    textHeightPt(paragraphs, size / 100, { ...box, widthPt: box.widthPt * margin });
  const fitsAt = (size: number) => {
    const m = measure(size);
    return {
      ok: m.height <= availableHeightPt + 0.5 && (box.wrap || m.widest <= box.widthPt * margin),
      height: m.height,
    };
  };
  const base = fitsAt(baseSize);
  if (base.ok) return { size: baseSize, heightPt: base.height, fits: true, reduced: false };
  const step = Math.max(50, Math.round(baseSize * 0.04));
  for (let size = baseSize - step; size >= Math.min(minSize, baseSize); size -= step) {
    const r = fitsAt(size);
    if (r.ok) return { size, heightPt: r.height, fits: true, reduced: true };
  }
  const floor = Math.min(minSize, baseSize);
  return { size: floor, heightPt: measure(floor).height, fits: false, reduced: floor < baseSize };
}
