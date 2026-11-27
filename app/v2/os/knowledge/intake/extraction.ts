import { unzipSync, strFromU8 } from "fflate";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { SourceExtractionResult } from "./types";
export const INTAKE_LIMITS = {
  files: 6,
  fileBytes: 10 * 1024 * 1024,
  zipBytes: 40 * 1024 * 1024,
  entries: 2000,
  textCharacters: 120000,
  totalTextCharacters: 600000,
  pdfPages: 100,
};
export const acceptedExtensions = [
  "pdf",
  "docx",
  "pptx",
  "xlsx",
  "csv",
  "txt",
  "md",
  "png",
  "jpg",
  "jpeg",
  "webp",
] as const;
export const intakeAccept = acceptedExtensions.map((e) => `.${e}`).join(",");
const mime: Record<string, string[]> = {
  pdf: ["application/pdf"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  pptx: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  csv: [
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "text/plain",
  ],
  txt: ["text/plain"],
  md: ["text/markdown", "text/x-markdown", "text/plain"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
};
export function sanitizeFileName(name: string) {
  return (
    name
      .split(/[\\/]/)
      .pop()!
      .normalize("NFKC")
      .replace(/[\u0000-\u001f\u007f<>:"|?*\u202a-\u202e\u2066-\u2069]/g, "_")
      .slice(0, 160)
      .trim() || "archivo"
  );
}
export function validateFile(file: {
  name: string;
  size: number;
  type: string;
}) {
  const name = sanitizeFileName(file.name),
    extension = name.split(".").pop()!.toLowerCase();
  if (!(acceptedExtensions as readonly string[]).includes(extension))
    throw new Error(
      "Formato no permitido. Usá PDF, DOCX, PPTX, XLSX, CSV, TXT, Markdown o PNG/JPG/WEBP.",
    );
  if (!file.size) throw new Error("El archivo está vacío (0 bytes).");
  if (file.size > INTAKE_LIMITS.fileBytes)
    throw new Error("El archivo supera el límite de 10 MB.");
  if (
    file.type &&
    file.type !== "application/octet-stream" &&
    !mime[extension].includes(file.type.toLowerCase())
  )
    throw new Error("El MIME del archivo no coincide con su extensión.");
  return { name, extension };
}
export async function bytesHash(bytes: Uint8Array) {
  const buffer = new Uint8Array(bytes).buffer;
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
function parseXml(xml: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error("El documento contiene entidades XML no permitidas.");
  if (XMLValidator.validate(xml) !== true)
    throw new Error("El XML del documento está dañado.");
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@",
    parseTagValue: false,
    trimValues: false,
    processEntities: true,
  }).parse(xml) as Record<string, unknown>;
}
function strings(node: unknown, key: string): string[] {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap((n) => strings(n, key));
  return Object.entries(node).flatMap(([k, v]) =>
    k === key
      ? [
          typeof v === "object"
            ? String((v as Record<string, unknown>)["#text"] ?? "")
            : String(v),
        ]
      : strings(v, key),
  );
}
/** Check central directory sizes before inflation; reject encrypted, macro-enabled,
 * executable and traversal entries. No embedded content is evaluated. */
export function officeEntries(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0)
    throw new Error("El archivo Office no es un ZIP válido o está truncado.");
  const count = view.getUint16(end + 10, true),
    offset = view.getUint32(end + 16, true);
  if (count > INTAKE_LIMITS.entries || count === 65535)
    throw new Error("El documento contiene demasiadas partes.");
  let at = offset,
    total = 0;
  for (let i = 0; i < count; i++) {
    if (at + 46 > bytes.length || view.getUint32(at, true) !== 0x02014b50)
      throw new Error("Directorio ZIP dañado.");
    const flags = view.getUint16(at + 8, true),
      compressed = view.getUint32(at + 20, true),
      size = view.getUint32(at + 24, true),
      len = view.getUint16(at + 28, true);
    const name = strFromU8(bytes.slice(at + 46, at + 46 + len));
    total += size;
    if (flags & 1)
      throw new Error("No se admiten documentos cifrados con contraseña.");
    if (name.startsWith("/") || name.split(/[\\/]/).includes(".."))
      throw new Error("Ruta interna no permitida.");
    if (/vbaProject|\.exe$|\.js$|\.vbs$|\.dll$/i.test(name))
      throw new Error("El documento contiene macros o scripts no permitidos.");
    if (
      total > INTAKE_LIMITS.zipBytes ||
      size > INTAKE_LIMITS.zipBytes ||
      size / Math.max(compressed, 1) > 300
    )
      throw new Error(
        "El contenido descomprimido excede el límite seguro de 40 MB.",
      );
    at +=
      46 + len + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
  }
  return unzipSync(bytes, {
    filter: (f) =>
      /^(word\/document|ppt\/(presentation|slides\/slide\d+)|xl\/(sharedStrings|worksheets\/sheet\d+))\.xml$/.test(
        f.name,
      ) || f.name === "ppt/_rels/presentation.xml.rels",
  });
}
export type PdfExtractor = (
  bytes: Uint8Array,
) => Promise<{ text: string; pages: number; warnings: string[] }>;
export async function extractSource(
  sourceId: string,
  file: { name: string; size: number; type: string },
  bytes: Uint8Array,
  pdf?: PdfExtractor,
): Promise<SourceExtractionResult> {
  const { name, extension } = validateFile(file);
  if (bytes.length !== file.size)
    throw new Error("El tamaño leído no coincide con el archivo.");
  let text = "",
    warnings: string[] = [],
    pages = 0;
  const start = String.fromCharCode(...bytes.slice(0, 12));
  if (extension === "pdf") {
    if (!start.startsWith("%PDF-"))
      throw new Error("El contenido no es un PDF válido.");
    if (!pdf) throw new Error("Extractor PDF no disponible en este entorno.");
    const result = await pdf(bytes);
    text = result.text;
    pages = result.pages;
    warnings = result.warnings;
  } else if (["docx", "pptx", "xlsx"].includes(extension)) {
    if (!start.startsWith("PK"))
      throw new Error("El contenido no corresponde a un documento Office.");
    const entries = officeEntries(bytes);
    if (extension === "docx") {
      const part = entries["word/document.xml"];
      if (!part)
        throw new Error("Falta word/document.xml: el archivo no es DOCX.");
      text = strings(parseXml(strFromU8(part)), "w:t").join("\n");
    } else if (extension === "pptx") {
      if (!entries["ppt/presentation.xml"])
        throw new Error(
          "Falta la presentación principal: el archivo no es PPTX.",
        );
      let slides = Object.keys(entries)
        .filter((k) => /slides\/slide\d+\.xml$/.test(k))
        .sort(
          (a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]),
        );
      const order = (
        (
          parseXml(strFromU8(entries["ppt/presentation.xml"]))[
            "p:presentation"
          ] as Record<string, unknown>
        )?.["p:sldIdLst"] as Record<string, unknown>
      )?.["p:sldId"];
      const rels = entries["ppt/_rels/presentation.xml.rels"];
      if (order && rels) {
        const relationships = (
          parseXml(strFromU8(rels)).Relationships as Record<string, unknown>
        )?.Relationship;
        const mappings = (
          Array.isArray(relationships) ? relationships : [relationships]
        ) as Record<string, string>[];
        slides = (Array.isArray(order) ? order : [order]).map((item) => {
          const relation = mappings.find(
            (r) => r?.["@Id"] === (item as Record<string, string>)["@r:id"],
          );
          const target = relation?.["@Target"] ?? "";
          const key = target.startsWith("/")
            ? target.slice(1)
            : `ppt/${target}`;
          if (
            relation?.["@TargetMode"] === "External" ||
            !/^ppt\/slides\/slide\d+\.xml$/.test(key) ||
            !entries[key]
          )
            throw new Error(
              "La presentación tiene una referencia de slide inválida.",
            );
          return key;
        });
      } else
        warnings.push(
          "El orden de páginas no está declarado: se muestra el orden de las partes del archivo.",
        );
      pages = slides.length;
      const content = slides.map((key) =>
        strings(parseXml(strFromU8(entries[key])), "a:t").join("\n"),
      );
      if (!content.some((t) => t.trim()))
        throw new Error("La presentación no contiene texto extraíble.");
      text = content
        .map((value, i) => `Página ${i + 1}\n${value}`)
        .join("\n\n");
    } else {
      const sharedRoot = entries["xl/sharedStrings.xml"]
        ? parseXml(strFromU8(entries["xl/sharedStrings.xml"]))
        : null;
      const sharedItems = (
        sharedRoot?.sst as Record<string, unknown> | undefined
      )?.si;
      const shared = (
        Array.isArray(sharedItems)
          ? sharedItems
          : sharedItems
            ? [sharedItems]
            : []
      ).map((item) => strings(item, "t").join(""));
      const sheets = Object.keys(entries)
        .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
        .sort();
      if (!sheets.length) throw new Error("No se encontraron hojas XLSX.");
      const sheetText = sheets.map((key) => {
        const root = parseXml(strFromU8(entries[key]));
        const rows = (root.worksheet as Record<string, unknown>)?.sheetData as
          Record<string, unknown> | undefined;
        const list = Array.isArray(rows?.row)
          ? rows.row
          : rows?.row
            ? [rows.row]
            : [];
        return list
          .map((row) => {
            const c = (row as Record<string, unknown>).c;
            return (Array.isArray(c) ? c : c ? [c] : [])
              .map((cell) => {
                const x = cell as Record<string, unknown>;
                return x["@t"] === "s"
                  ? (shared[Number(x.v)] ?? "")
                  : x["@t"] === "inlineStr"
                    ? strings(x.is, "t").join("")
                    : String(x.v ?? "");
              })
              .join(" | ");
          })
          .join("\n");
      });
      if (!sheetText.some((value) => value.replace(/[|\s]/g, "")))
        throw new Error("La planilla no contiene valores extraíbles.");
      text = sheetText
        .map((value, i) => `Hoja ${i + 1}\n${value}`)
        .join("\n\n");
      warnings.push(
        "Se leen valores guardados. No se ejecutan fórmulas ni vínculos externos.",
      );
    }
  } else if (["png", "jpg", "jpeg", "webp"].includes(extension)) {
    const valid =
      extension === "png"
        ? bytes[0] === 137 && start.slice(1, 4) === "PNG"
        : ["jpg", "jpeg"].includes(extension)
          ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          : start.startsWith("RIFF") && start.slice(8, 12) === "WEBP";
    if (!valid)
      throw new Error("La firma de la imagen no coincide con su formato.");
    return {
      sourceId,
      rawText: "",
      metadata: {
        fileName: name,
        extension,
        size: bytes.length,
        requiresOcr: true,
      },
      warnings: [
        "OCR no configurado. La imagen fue reconocida, pero su texto no se extrajo. Pegá una transcripción o vinculá una fuente textual.",
      ],
    };
  } else {
    if (bytes.includes(0))
      throw new Error(
        "El archivo de texto contiene bytes binarios no permitidos.",
      );
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error(
        "El texto no está en UTF-8. Guardalo con esa codificación y volvé a cargarlo.",
      );
    }
    if (/^\s*<(?:!doctype\s+html|html|script)/i.test(text))
      throw new Error(
        "El contenido HTML o ejecutable no se procesa como texto.",
      );
  }
  text = text.replace(/\u0000/g, "").trim();
  if (!text)
    throw new Error(
      extension === "pdf"
        ? "El PDF no contiene texto extraíble. Puede ser escaneado: OCR no configurado."
        : "No se encontró contenido textual en el archivo.",
    );
  if (text.length > INTAKE_LIMITS.textCharacters) {
    text = text.slice(0, INTAKE_LIMITS.textCharacters);
    warnings.push(
      "Texto limitado a 120.000 caracteres. La fuente requiere revisión antes de analizar.",
    );
  }
  return {
    sourceId,
    rawText: text,
    metadata: { fileName: name, extension, size: bytes.length, pages },
    warnings,
  };
}
