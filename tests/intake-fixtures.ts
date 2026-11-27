import { zipSync, strToU8 } from "fflate";
export const officeFile = (parts: Record<string, string>) =>
  Buffer.from(
    zipSync(
      Object.fromEntries(
        Object.entries(parts).map(([key, value]) => [key, strToU8(value)]),
      ),
      { mtime: new Date("2026-01-01T00:00:00Z") },
    ),
  );
export const docxFixture = () =>
  officeFile({
    "word/document.xml":
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Empresa QA. Cobertura: Argentina.</w:t></w:r></w:p></w:body></w:document>',
  });
export const pptxFixture = () =>
  officeFile({
    "[Content_Types].xml":
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
    "ppt/presentation.xml":
      '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst></p:presentation>',
    "ppt/_rels/presentation.xml.rels":
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="slides/slide1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"/></Relationships>',
    "ppt/slides/slide1.xml":
      '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Presentacion QA editable</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>',
  });
export function pdfFixture() {
  const text = "Empresa PDF QA. Cobertura: Argentina y Chile.";
  const stream = `BT /F1 16 Tf 50 700 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [i, obj] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  }
  const at = Buffer.byteLength(pdf);
  pdf +=
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((o) => String(o).padStart(10, "0") + " 00000 n \n")
      .join("") +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${at}\n%%EOF\n`;
  return Buffer.from(pdf);
}
