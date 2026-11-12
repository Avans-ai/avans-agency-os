import { escapeXml, findAll, findFirst, getAttr, outerXml } from "./xml";
import { readText, writeText, type PackageFiles } from "./zip";

export const REL = {
  slide: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",
  notesSlide: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide",
  image: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
  coreProps: "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties",
} as const;
export const CT = {
  slide: "application/vnd.openxmlformats-officedocument.presentationml.slide+xml",
  core: "application/vnd.openxmlformats-package.core-properties+xml",
} as const;

export type Relationship = { id: string; type: string; target: string; external: boolean };

export function parseRels(xml: string): Relationship[] {
  return findAll(xml, "Relationship").map((el) => {
    const tag = outerXml(xml, el);
    return {
      id: getAttr(tag, "Id") ?? "",
      type: getAttr(tag, "Type") ?? "",
      target: getAttr(tag, "Target") ?? "",
      external: getAttr(tag, "TargetMode") === "External",
    };
  });
}

export function serializeRels(rels: Relationship[]): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    rels
      .map(
        (r) =>
          `<Relationship Id="${escapeXml(r.id)}" Type="${escapeXml(r.type)}" Target="${escapeXml(r.target)}"${r.external ? ' TargetMode="External"' : ""}/>`,
      )
      .join("") +
    "</Relationships>"
  );
}

/** Resolves a relationship target against the folder of the source part. */
export function resolveTarget(sourcePart: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = sourcePart.split("/").slice(0, -1);
  for (const seg of target.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg !== ".") parts.push(seg);
  }
  return parts.join("/");
}

export const relsPathOf = (part: string) => {
  const i = part.lastIndexOf("/");
  return `${part.slice(0, i)}/_rels/${part.slice(i + 1)}.rels`;
};

/** Slide part names in presentation order. */
export function slideParts(files: PackageFiles): string[] {
  const pres = readText(files, "ppt/presentation.xml");
  const rels = parseRels(readText(files, "ppt/_rels/presentation.xml.rels"));
  const list = findFirst(pres, "p:sldIdLst");
  if (!list) return [];
  return findAll(pres, "p:sldId", list.openEnd, list.closeStart).map((el) => {
    const rid = getAttr(outerXml(pres, el), "r:id");
    const rel = rels.find((r) => r.id === rid);
    if (!rel) throw new Error(`Relación de slide ${rid} inexistente`);
    return resolveTarget("ppt/presentation.xml", rel.target);
  });
}

export type BuiltSlide = { xml: string; rels: Relationship[] };

/**
 * Replaces every slide of the package with `slides` (in order), dropping
 * notes pages and media that no longer have a reference. Masters, layouts,
 * theme and embedded fonts are left untouched.
 */
export function rebuildSlides(files: PackageFiles, slides: BuiltSlide[]) {
  if (!slides.length) throw new Error("La presentación no tiene slides.");
  for (const name of [...files.keys()])
    if (/^ppt\/(slides|notesSlides)\//.test(name)) files.delete(name);

  slides.forEach((s, i) => {
    writeText(files, `ppt/slides/slide${i + 1}.xml`, s.xml);
    writeText(
      files,
      `ppt/slides/_rels/slide${i + 1}.xml.rels`,
      serializeRels(s.rels.filter((r) => r.type !== REL.notesSlide)),
    );
  });

  // presentation.xml.rels: replace slide relationships.
  const presRels = parseRels(readText(files, "ppt/_rels/presentation.xml.rels")).filter(
    (r) => r.type !== REL.slide,
  );
  let next = presRels.reduce((n, r) => Math.max(n, Number(/^rId(\d+)$/.exec(r.id)?.[1] ?? 0)), 0);
  const slideRels = slides.map((_, i) => ({
    id: `rId${++next}`,
    type: REL.slide,
    target: `slides/slide${i + 1}.xml`,
    external: false,
  }));
  writeText(files, "ppt/_rels/presentation.xml.rels", serializeRels([...presRels, ...slideRels]));

  // presentation.xml: new slide id list; section lists reference old ids.
  let pres = readText(files, "ppt/presentation.xml");
  const list = findFirst(pres, "p:sldIdLst");
  const ids = slideRels.map((r, i) => `<p:sldId id="${256 + i}" r:id="${r.id}"/>`).join("");
  if (list) pres = pres.slice(0, list.start) + `<p:sldIdLst>${ids}</p:sldIdLst>` + pres.slice(list.end);
  else {
    const masters = findFirst(pres, "p:notesMasterIdLst") ?? findFirst(pres, "p:sldMasterIdLst");
    if (!masters) throw new Error("presentation.xml sin lista de masters");
    pres = pres.slice(0, masters.end) + `<p:sldIdLst>${ids}</p:sldIdLst>` + pres.slice(masters.end);
  }
  for (const section of findAll(pres, "p14:sectionLst").reverse())
    pres = pres.slice(0, section.start) + pres.slice(section.end);
  writeText(files, "ppt/presentation.xml", pres);

  pruneMedia(files);
  updateContentTypes(files, slides.length);
  updateAppProps(files, slides.length);
}

function pruneMedia(files: PackageFiles) {
  const used = new Set<string>();
  for (const [name, bytes] of files) {
    if (!name.endsWith(".rels")) continue;
    const source = name.replace(/_rels\/([^/]+)\.rels$/, "$1");
    for (const r of parseRels(new TextDecoder().decode(bytes)))
      if (!r.external) used.add(resolveTarget(source, r.target));
  }
  for (const name of [...files.keys()])
    if (name.startsWith("ppt/media/") && !used.has(name)) files.delete(name);
}

function updateContentTypes(files: PackageFiles, count: number) {
  let ct = readText(files, "[Content_Types].xml");
  for (const el of findAll(ct, "Override").reverse()) {
    const part = getAttr(outerXml(ct, el), "PartName") ?? "";
    if (/^\/ppt\/(slides|notesSlides)\//.test(part)) ct = ct.slice(0, el.start) + ct.slice(el.end);
  }
  const defaults = new Set(
    findAll(ct, "Default").map((el) => (getAttr(outerXml(ct, el), "Extension") ?? "").toLowerCase()),
  );
  const media: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
  };
  let extra = "";
  for (const name of files.keys()) {
    const ext = name.split(".").pop()!.toLowerCase();
    if (name.startsWith("ppt/media/") && media[ext] && !defaults.has(ext)) {
      extra += `<Default Extension="${ext}" ContentType="${media[ext]}"/>`;
      defaults.add(ext);
    }
  }
  for (let i = 1; i <= count; i++)
    extra += `<Override PartName="/ppt/slides/slide${i}.xml" ContentType="${CT.slide}"/>`;
  if (files.has("docProps/core.xml") && !ct.includes('PartName="/docProps/core.xml"'))
    extra += `<Override PartName="/docProps/core.xml" ContentType="${CT.core}"/>`;
  ct = ct.replace("</Types>", extra + "</Types>");
  writeText(files, "[Content_Types].xml", ct);
}

function updateAppProps(files: PackageFiles, count: number) {
  if (!files.has("docProps/app.xml")) return;
  const app = readText(files, "docProps/app.xml").replace(
    /<Slides>\d+<\/Slides>/,
    `<Slides>${count}</Slides>`,
  );
  writeText(files, "docProps/app.xml", app);
}

/** Writes Dublin Core properties (title, author) so the file identifies itself. */
export function setCoreProperties(
  files: PackageFiles,
  props: { title: string; creator: string; created: string; keywords?: string },
) {
  const xml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    `<dc:title>${escapeXml(props.title)}</dc:title>` +
    `<dc:creator>${escapeXml(props.creator)}</dc:creator>` +
    `<cp:lastModifiedBy>${escapeXml(props.creator)}</cp:lastModifiedBy>` +
    (props.keywords ? `<cp:keywords>${escapeXml(props.keywords)}</cp:keywords>` : "") +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${escapeXml(props.created)}</dcterms:created>` +
    `<dcterms:modified xsi:type="dcterms:W3CDTF">${escapeXml(props.created)}</dcterms:modified>` +
    "</cp:coreProperties>";
  writeText(files, "docProps/core.xml", xml);
  const rels = parseRels(readText(files, "_rels/.rels"));
  if (!rels.some((r) => r.type === REL.coreProps)) {
    rels.push({ id: "rIdCore", type: REL.coreProps, target: "docProps/core.xml", external: false });
    writeText(files, "_rels/.rels", serializeRels(rels));
  }
}
