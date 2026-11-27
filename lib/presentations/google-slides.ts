import { unzipSync, strFromU8 } from "fflate";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import {
  officeEntries,
  bytesHash,
} from "../../app/v2/os/knowledge/intake/extraction";
import {
  assertExportAllowed,
  MASTER_SHA256,
  DRAFT_WATERMARK,
} from "../../app/v2/os/knowledge/presentation/manifest";
import type {
  PresentationManifest,
  PresentationExport,
} from "../../app/v2/os/knowledge/presentation/types";
export const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";
export { PRESENTATION_SCOPES } from "./readiness";
export type SlideElement = {
  objectId: string;
  shape?: {
    text?: {
      textElements?: {
        startIndex?: number;
        endIndex?: number;
        textRun?: { content: string; style?: Record<string, unknown> };
      }[];
    };
  };
  image?: unknown;
  elementGroup?: { children?: SlideElement[] };
};
export type NativePresentation = {
  presentationId: string;
  revisionId?: string;
  pageSize?: unknown;
  slides?: {
    objectId: string;
    pageElements?: SlideElement[];
    slideProperties?: {
      notesPage?: { notesProperties?: { speakerNotesObjectId?: string } };
    };
  }[];
};
export type TemplateBinding = {
  templateFileId: string;
  masterSha256: string;
  visualValidation: { at: string; by: string };
  slides: Record<
    string,
    {
      slideId: string;
      objects: Record<string, string>;
      textSlots: Record<
        string,
        { text: string; maxCharacters: number; style?: Record<string, unknown> }
      >;
    }
  >;
};
const googleId = (value: string) => {
  if (!/^[\w-]+$/.test(value)) throw new Error("Invalid Google file ID");
  return encodeURIComponent(value);
};
export class GoogleSlidesAdapter {
  constructor(
    private token: string,
    private http: typeof fetch = fetch,
  ) {
    if (typeof window !== "undefined") throw new Error("Server-only adapter");
  }
  private async request(url: string, init: RequestInit = {}) {
    const response = await this.http(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: AbortSignal.timeout(30000),
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(`Google presentation API HTTP ${response.status}`);
    return response;
  }
  async importMaster(bytes: Uint8Array, name: string, parentId: string) {
    if ((await bytesHash(bytes)) !== MASTER_SHA256)
      throw new Error(
        "El archivo no coincide con la plantilla maestra oficial.",
      );
    const formats = (await (
      await this.request(
        "https://www.googleapis.com/drive/v3/about?fields=importFormats",
      )
    ).json()) as { importFormats?: Record<string, string[]> };
    if (
      !formats.importFormats?.[PPTX_MIME]?.includes(
        "application/vnd.google-apps.presentation",
      )
    )
      throw new Error(
        "Google Drive does not currently advertise PPTX conversion",
      );
    const boundary = `avans_${crypto.randomUUID()}`;
    const metadata = {
      name,
      mimeType: "application/vnd.google-apps.presentation",
      parents: [googleId(parentId)],
      appProperties: { avansMasterSha256: MASTER_SHA256 },
    };
    const body = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${PPTX_MIME}\r\n\r\n`,
      new Uint8Array(bytes).buffer,
      `\r\n--${boundary}--`,
    ]);
    return (
      await this.request(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
        {
          method: "POST",
          headers: {
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body,
        },
      )
    ).json() as Promise<{ id: string; name: string; webViewLink?: string }>;
  }
  async copy(
    templateId: string,
    parentId: string,
    name: string,
    exportId: string,
  ) {
    return (
      await this.request(
        `https://www.googleapis.com/drive/v3/files/${googleId(templateId)}/copy?fields=id,name,webViewLink`,
        {
          method: "POST",
          body: JSON.stringify({
            name,
            parents: [googleId(parentId)],
            appProperties: {
              avansExportId: exportId,
              avansMasterSha256: MASTER_SHA256,
            },
          }),
        },
      )
    ).json() as Promise<{ id: string; name: string; webViewLink?: string }>;
  }
  async presentation(fileId: string) {
    return (
      await this.request(
        `https://slides.googleapis.com/v1/presentations/${googleId(fileId)}`,
      )
    ).json() as Promise<NativePresentation>;
  }
  async batch(
    fileId: string,
    requests: Record<string, unknown>[],
    revisionId?: string,
  ) {
    return (
      await this.request(
        `https://slides.googleapis.com/v1/presentations/${googleId(fileId)}:batchUpdate`,
        {
          method: "POST",
          body: JSON.stringify({
            requests,
            ...(revisionId
              ? { writeControl: { requiredRevisionId: revisionId } }
              : {}),
          }),
        },
      )
    ).json();
  }
  async exportPptx(fileId: string) {
    const response = await this.request(
      `https://www.googleapis.com/drive/v3/files/${googleId(fileId)}/export?mimeType=${encodeURIComponent(PPTX_MIME)}`,
    );
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > 10 * 1024 * 1024)
      throw new Error("La exportación excede los 10 MB admitidos por Drive.");
    return bytes;
  }
}
export function flattenElements(elements: SlideElement[] = []): SlideElement[] {
  return elements.flatMap((e) => [
    e,
    ...flattenElements(e.elementGroup?.children),
  ]);
}
export function compilePresentationRequests(
  manifest: PresentationManifest,
  binding: TemplateBinding,
  native: NativePresentation,
) {
  assertExportAllowed(manifest);
  if (
    binding.masterSha256 !== MASTER_SHA256 ||
    !binding.visualValidation.at ||
    !binding.visualValidation.by
  )
    throw new Error(
      "La conversión del master no tiene validación visual registrada.",
    );
  const duplicate: Record<string, unknown>[] = [],
    populate: Record<string, unknown>[] = [],
    order: string[] = [];
  for (const slide of manifest.slides) {
    const bound = binding.slides[slide.templateSlideKey];
    if (!bound)
      throw new Error(`Falta mapa de objetos: ${slide.templateSlideKey}`);
    const original = native.slides?.find((s) => s.objectId === bound.slideId);
    if (!original)
      throw new Error("La plantilla cambió: falta una slide vinculada.");
    const elements = flattenElements(original.pageElements),
      prefix = `av${slide.outputOrder}_${manifest.id.replace(/-/g, "").slice(0, 12)}`,
      slideId = `${prefix}_slide`;
    const ids = Object.fromEntries(
      [original.objectId, ...elements.map((e) => e.objectId)].map((id, i) => [
        id,
        i === 0 ? slideId : `${prefix}_e${i}`,
      ]),
    );
    duplicate.push({
      duplicateObject: { objectId: original.objectId, objectIds: ids },
    });
    order.push(slideId);
    const mapped = (key: string) => {
      const objectId = bound.objects[key];
      if (!objectId || !ids[objectId])
        throw new Error(`Falta objeto de plantilla ${key}`);
      return ids[objectId];
    };
    const deletes = new Set(slide.removeObjectKeys);
    for (const [key, text] of Object.entries(slide.replacements)) {
      if (deletes.has(key)) continue;
      const objectId = mapped(key),
        slot = bound.textSlots[key];
      if (!slot)
        throw new Error(`Falta validación tipográfica del campo ${key}`);
      const element = elements.find((e) => e.objectId === bound.objects[key]);
      const runs =
        element?.shape?.text?.textElements?.filter((e) => !!e.textRun) ?? [];
      const originalText = runs
        .map((e) => e.textRun!.content)
        .join("")
        .replace(/\n$/, "");
      if (originalText !== slot.text)
        throw new Error(
          "La plantilla cambió: el texto ya no coincide con su mapa de objetos.",
        );
      if (text.length > slot.maxCharacters)
        throw new Error(
          `El texto de ${slide.title} supera la capacidad visual validada. Acortalo o ampliá el mapa de la plantilla.`,
        );
      const styles = new Set(
        runs
          .filter((r) => r.textRun!.content.trim())
          .map((r) => JSON.stringify(r.textRun!.style ?? {})),
      );
      if (styles.size > 1)
        throw new Error(
          `El campo ${key} tiene estilos mixtos: requiere un mapa de rangos aprobado.`,
        );
      if (slot.text.length)
        populate.push({
          deleteText: {
            objectId,
            textRange: {
              type: "FIXED_RANGE",
              startIndex: 0,
              endIndex: slot.text.length,
            },
          },
        });
      if (text) {
        populate.push({ insertText: { objectId, insertionIndex: 0, text } });
        if (slot.style && Object.keys(slot.style).length)
          populate.push({
            updateTextStyle: {
              objectId,
              textRange: {
                type: "FIXED_RANGE",
                startIndex: 0,
                endIndex: text.length,
              },
              style: slot.style,
              fields: Object.keys(slot.style).join(","),
            },
          });
      }
    }
    for (const image of slide.images) {
      if (image.action === "delete") deletes.add(image.templateObjectKey);
      if (image.action === "replace") {
        if (
          !image.url ||
          !/^https:\/\//.test(image.url) ||
          image.url.length > 2000
        )
          throw new Error("Imagen sin URL HTTPS válida.");
        populate.push({
          replaceImage: {
            imageObjectId: mapped(image.templateObjectKey),
            url: image.url,
            imageReplaceMethod: "CENTER_INSIDE",
          },
        });
      }
    }
    for (const key of deletes)
      populate.push({ deleteObject: { objectId: mapped(key) } });
    if (manifest.mode === "internal-draft") {
      const id = `${prefix}_draft`;
      populate.push(
        {
          createShape: {
            objectId: id,
            shapeType: "TEXT_BOX",
            elementProperties: {
              pageObjectId: slideId,
              size: {
                width: { magnitude: 1000, unit: "PT" },
                height: { magnitude: 30, unit: "PT" },
              },
              transform: {
                scaleX: 1,
                scaleY: 1,
                translateX: 20,
                translateY: 10,
                unit: "PT",
              },
            },
          },
        },
        { insertText: { objectId: id, text: DRAFT_WATERMARK } },
        {
          updateTextStyle: {
            objectId: id,
            textRange: { type: "ALL" },
            style: {
              fontFamily: "Arial",
              fontSize: { magnitude: 12, unit: "PT" },
              bold: true,
              foregroundColor: {
                opaqueColor: { rgbColor: { red: 0.85, green: 0.2, blue: 0.1 } },
              },
            },
            fields: "fontFamily,fontSize,bold,foregroundColor",
          },
        },
      );
    }
  }
  return {
    duplicate,
    populate,
    order,
    reorder: order
      .slice()
      .reverse()
      .map((id) => ({
        updateSlidesPosition: { slideObjectIds: [id], insertionIndex: 0 },
      })),
    removeOriginals: (native.slides ?? []).map((s) => ({
      deleteObject: { objectId: s.objectId },
    })),
  };
}
export function validateNativePresentation(
  native: NativePresentation,
  manifest: PresentationManifest,
) {
  if (native.slides?.length !== manifest.slides.length)
    throw new Error("La cantidad de slides no coincide con el manifest.");
  for (const slide of native.slides) {
    const elements = flattenElements(slide.pageElements),
      text = elements
        .flatMap(
          (e) =>
            e.shape?.text?.textElements?.map((t) => t.textRun?.content ?? "") ??
            [],
        )
        .join("\n");
    if (
      /\[[^\]]+\]|PÁGINA INTERNA|Duplicar esta slide|Duplicar este bloque|• (PROJECT MANAGER|CONTENT MANAGER|DISEÑADOR|LÍDER TÉCNICO)/.test(
        text,
      )
    )
      throw new Error("Quedaron placeholders o instrucciones internas.");
    if (!text.trim() && !elements.some((e) => e.image))
      throw new Error("La presentación contiene una slide vacía.");
    if (manifest.mode === "internal-draft" && !text.includes(DRAFT_WATERMARK))
      throw new Error("Falta la marca visible de borrador interno.");
  }
}
export function validatePptx(
  bytes: Uint8Array,
  manifest: PresentationManifest,
) {
  officeEntries(bytes);
  const entries = unzipSync(bytes);
  if (!entries["[Content_Types].xml"] || !entries["ppt/presentation.xml"])
    throw new Error("El archivo no es un PPTX editable válido.");
  const parse = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
  });
  const presentation = strFromU8(entries["ppt/presentation.xml"]);
  if (XMLValidator.validate(presentation) !== true)
    throw new Error("La estructura PPTX está dañada.");
  const root = parse.parse(presentation);
  const ids = root["p:presentation"]?.["p:sldIdLst"]?.["p:sldId"];
  const count = Array.isArray(ids) ? ids.length : ids ? 1 : 0;
  if (count !== manifest.slides.length)
    throw new Error("El PPTX no coincide con el manifest.");
  for (const [name, data] of Object.entries(entries).filter(([name]) =>
    /^ppt\/slides\/slide\d+\.xml$/.test(name),
  )) {
    const xml = strFromU8(data);
    if (XMLValidator.validate(xml) !== true)
      throw new Error(`Slide PPTX dañada: ${name}`);
    if (
      /\[[^\]<>]+\]|PÁGINA INTERNA|Duplicar esta slide|Duplicar este bloque/.test(
        xml,
      )
    )
      throw new Error("El PPTX conserva instrucciones o placeholders.");
    if (!/<a:t[^>]*>[^<]+|<p:pic[ >]/.test(xml))
      throw new Error("El PPTX contiene una slide vacía.");
  }
  return { slides: count, bytes: bytes.length };
}
export interface ExportJobRepository {
  claim(
    record: PresentationExport,
    organizationId: string,
  ): Promise<{ acquired: boolean; record: PresentationExport }>;
  save(record: PresentationExport, organizationId: string): Promise<void>;
  storePptx(
    bytes: Uint8Array,
    input: {
      organizationId: string;
      clientSlug: string;
      exportId: string;
      fileName: string;
    },
  ): Promise<{ downloadUrl: string }>;
}
/** Caller must authenticate organization/client and resolve an authorized folder.
 * claim provides a durable idempotency lease. No preview role is a credential. */
export async function generateGooglePresentation(
  input: {
    record: PresentationExport;
    organizationId: string;
    clientFolderId: string;
    binding: TemplateBinding;
  },
  adapter: GoogleSlidesAdapter,
  repository: ExportJobRepository,
) {
  const { record, organizationId, binding } = input;
  assertExportAllowed(record.manifest);
  if (record.format === "manifest")
    throw new Error("Elegí un formato de archivo para exportar.");
  if (!organizationId || record.clientSlug !== record.manifest.clientSlug)
    throw new Error("Falta contexto autorizado de organización/cliente.");
  const claimed = await repository.claim(record, organizationId);
  if (!claimed.acquired) return claimed.record;
  let next = {
    ...record,
    status: "generating" as PresentationExport["status"],
  };
  try {
    const original = await adapter.presentation(binding.templateFileId);
    const plan = compilePresentationRequests(
      record.manifest,
      binding,
      original,
    );
    const name = `Marketing Discovery - ${record.manifest.clientName} - v${record.version}`;
    const copy = await adapter.copy(
      binding.templateFileId,
      input.clientFolderId,
      name,
      record.id,
    );
    next = { ...next, googleFileId: copy.id };
    await repository.save(next, organizationId);
    // Apply to a new copy only. The master and earlier exports are never mutated.
    for (const requests of [
      plan.duplicate,
      plan.populate,
      plan.reorder,
      plan.removeOriginals,
    ])
      for (let i = 0; i < requests.length; i += 200) {
        const current = await adapter.presentation(copy.id);
        await adapter.batch(
          copy.id,
          requests.slice(i, i + 200),
          current.revisionId,
        );
      }
    const populated = await adapter.presentation(copy.id);
    const noteRequests = (populated.slides ?? []).flatMap((s) =>
      s.slideProperties?.notesPage?.notesProperties?.speakerNotesObjectId
        ? [
            {
              deleteText: {
                objectId:
                  s.slideProperties.notesPage.notesProperties
                    .speakerNotesObjectId,
                textRange: { type: "ALL" },
              },
            },
          ]
        : [],
    );
    if (noteRequests.length)
      await adapter.batch(copy.id, noteRequests, populated.revisionId);
    const verified = await adapter.presentation(copy.id);
    validateNativePresentation(verified, record.manifest);
    const bytes = await adapter.exportPptx(copy.id);
    validatePptx(bytes, record.manifest);
    const fileName = `${name}.pptx`,
      stored = await repository.storePptx(bytes, {
        organizationId,
        clientSlug: record.clientSlug,
        exportId: record.id,
        fileName,
      });
    next = {
      ...next,
      status: "ready",
      googleSlidesUrl: `https://docs.google.com/presentation/d/${googleId(copy.id)}/edit`,
      fileName,
      downloadUrl: stored.downloadUrl,
      generatedAt: new Date().toISOString(),
    };
    await repository.save(next, organizationId);
    return next;
  } catch (error) {
    next = {
      ...next,
      status: "failed",
      error:
        error instanceof Error
          ? error.message
          : "La generación falló; no se confirmó un archivo listo.",
    };
    await repository.save(next, organizationId);
    return next;
  }
}
