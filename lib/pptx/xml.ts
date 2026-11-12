/**
 * Minimal, dependency-free XML helpers for OOXML parts.
 *
 * The presentation generator edits the master template in place, so it works on
 * the original XML strings instead of re-serializing a DOM: every byte that is
 * not explicitly changed (namespaces, extension lists, attribute order) is kept
 * exactly as PowerPoint/Google Slides wrote it. The helpers only understand
 * elements, attributes and text; they run identically in the browser and Node.
 */

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Removes characters that are not allowed in XML 1.0 documents. */
export function xmlSafe(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "");
}

export function decodeXml(value: string): string {
  return value.replace(
    /&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g,
    (_, entity: string) => {
      if (entity === "amp") return "&";
      if (entity === "lt") return "<";
      if (entity === "gt") return ">";
      if (entity === "quot") return '"';
      if (entity === "apos") return "'";
      const code =
        entity[1] === "x"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    },
  );
}

/** A located element: absolute offsets into the string it was found in. */
export type XmlElement = {
  name: string;
  start: number;
  /** Offset right after the `>` of the opening tag. */
  openEnd: number;
  /** Offset of the closing tag (equals `end` for self-closing tags). */
  closeStart: number;
  end: number;
  selfClosing: boolean;
};

function tagEnd(xml: string, from: number): number {
  let quote = "";
  for (let i = from; i < xml.length; i++) {
    const c = xml[i];
    if (quote) {
      if (c === quote) quote = "";
    } else if (c === '"' || c === "'") quote = c;
    else if (c === ">") return i;
  }
  return -1;
}

function isNameEnd(c: string | undefined) {
  return c === " " || c === ">" || c === "/" || c === "\n" || c === "\t" || c === "\r";
}

/**
 * Finds the occurrences of `<name …>` between `from` and `to` that are not
 * nested inside another occurrence of the same element.
 */
export function findAll(
  xml: string,
  name: string,
  from = 0,
  to = xml.length,
): XmlElement[] {
  const out: XmlElement[] = [];
  const open = `<${name}`;
  const close = `</${name}>`;
  let i = from;
  while (i < to) {
    const start = xml.indexOf(open, i);
    if (start < 0 || start >= to) break;
    if (!isNameEnd(xml[start + open.length])) {
      i = start + open.length;
      continue;
    }
    const gt = tagEnd(xml, start + open.length);
    if (gt < 0) throw new Error(`XML mal formado: <${name}> sin cerrar`);
    if (xml[gt - 1] === "/") {
      out.push({
        name,
        start,
        openEnd: gt + 1,
        closeStart: gt + 1,
        end: gt + 1,
        selfClosing: true,
      });
      i = gt + 1;
      continue;
    }
    let depth = 1;
    let j = gt + 1;
    while (depth > 0) {
      const nextOpen = xml.indexOf(open, j);
      const nextClose = xml.indexOf(close, j);
      if (nextClose < 0) throw new Error(`XML mal formado: falta </${name}>`);
      if (nextOpen >= 0 && nextOpen < nextClose) {
        if (!isNameEnd(xml[nextOpen + open.length])) {
          j = nextOpen + open.length;
          continue;
        }
        const innerGt = tagEnd(xml, nextOpen + open.length);
        if (xml[innerGt - 1] !== "/") depth++;
        j = innerGt + 1;
      } else {
        depth--;
        j = nextClose + close.length;
        if (depth === 0) {
          out.push({
            name,
            start,
            openEnd: gt + 1,
            closeStart: nextClose,
            end: j,
            selfClosing: false,
          });
        }
      }
    }
    i = j;
  }
  return out;
}

export function findFirst(
  xml: string,
  name: string,
  from = 0,
  to = xml.length,
): XmlElement | null {
  return findAll(xml, name, from, to)[0] ?? null;
}

export const outerXml = (xml: string, el: XmlElement) => xml.slice(el.start, el.end);
export const innerXml = (xml: string, el: XmlElement) =>
  el.selfClosing ? "" : xml.slice(el.openEnd, el.closeStart);
export const openTag = (xml: string, el: XmlElement) => xml.slice(el.start, el.openEnd);

/** Reads an attribute of an opening tag (or of the first tag of a fragment). */
export function getAttr(fragment: string, attr: string): string | undefined {
  const end = tagEnd(fragment, 0);
  const tag = end < 0 ? fragment : fragment.slice(0, end + 1);
  const match = new RegExp(`\\s${attr.replace(/[:]/g, "\\:")}="([^"]*)"`).exec(tag);
  return match ? decodeXml(match[1]) : undefined;
}

/** Sets (or adds) an attribute on the first opening tag of a fragment. */
export function setAttr(fragment: string, attr: string, value: string): string {
  const end = tagEnd(fragment, 0);
  if (end < 0) return fragment;
  const selfClosing = fragment[end - 1] === "/";
  const tag = fragment.slice(0, end + 1);
  const rest = fragment.slice(end + 1);
  const re = new RegExp(`(\\s${attr.replace(/[:]/g, "\\:")}=")[^"]*(")`);
  if (re.test(tag)) return tag.replace(re, `$1${escapeXml(value)}$2`) + rest;
  const insertAt = selfClosing ? end - 1 : end;
  return (
    fragment.slice(0, insertAt) +
    ` ${attr}="${escapeXml(value)}"` +
    fragment.slice(insertAt)
  );
}

export function removeAttr(fragment: string, attr: string): string {
  const end = tagEnd(fragment, 0);
  if (end < 0) return fragment;
  const tag = fragment.slice(0, end + 1);
  return (
    tag.replace(new RegExp(`\\s${attr.replace(/[:]/g, "\\:")}="[^"]*"`), "") +
    fragment.slice(end + 1)
  );
}

/** Concatenated, decoded content of every `<a:t>` element of a fragment. */
export function textOf(xml: string, separator = ""): string {
  return findAll(xml, "a:t")
    .map((t) => decodeXml(innerXml(xml, t)))
    .join(separator);
}

/** Replaces a set of non-overlapping ranges in one pass. */
export function spliceRanges(
  xml: string,
  edits: { start: number; end: number; text: string }[],
): string {
  const sorted = [...edits].sort((a, b) => a.start - b.start);
  let out = "";
  let cursor = 0;
  for (const e of sorted) {
    if (e.start < cursor) throw new Error("Ediciones XML superpuestas");
    out += xml.slice(cursor, e.start) + e.text;
    cursor = e.end;
  }
  return out + xml.slice(cursor);
}
