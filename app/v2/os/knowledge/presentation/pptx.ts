/**
 * Bridge between the presentation manifest (what goes on each page of the
 * master) and the framework-free PPTX engine in lib/pptx. Pure: runs in the
 * browser and in Node tests.
 */
import {
  generatePptx,
  type DeckSlideSpec,
  type DeckSpec,
  type GenerationReport,
  type PendingItem,
} from "../../../../../lib/pptx/generate";
import { decodeDataUrl } from "../../../../../lib/pptx/images";
import { DRAFT_WATERMARK, MASTER_SHA256 } from "./manifest";
import type { PresentationFileInfo, PresentationManifest } from "./types";

/** Copied from assets/templates by scripts/copy-presentation-template.mjs. */
export const TEMPLATE_URL = `/templates/marketing-discovery-v1.pptx?v=${MASTER_SHA256.slice(0, 12)}`;

export const MODULE_LABELS: Record<string, string> = {
  discovery: "Discovery",
  benchmark: "Benchmark",
  "marketing-plan": "Plan de Marketing",
  template: "Portada y cierre",
};

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function presentationFileName(manifest: PresentationManifest, version: number) {
  const slug = manifest.clientSlug.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  return `marketing-discovery-${slug}-v${version}-${manifest.mode === "client" ? "cliente" : "borrador"}.pptx`;
}

export function manifestToDeckSpec(manifest: PresentationManifest): DeckSpec {
  const slides: DeckSlideSpec[] = manifest.slides.map((slide) => {
    const pending: PendingItem[] = (slide.pending ?? []).map((p) => ({
      kind: p.kind,
      label: p.label,
      module: MODULE_LABELS[p.module],
      href: p.href,
      objectId: p.objectKey,
    }));
    const images: DeckSlideSpec["images"] = {};
    for (const image of slide.images) {
      if (image.action === "keep") continue;
      const local = image.action === "replace" && image.url ? decodeDataUrl(image.url) : null;
      images[image.templateObjectKey] = local;
      if (image.action === "replace" && !local) {
        // Remote references are never downloaded: the slide keeps no frame and
        // the link is listed so the team inserts the image by hand.
        const base = (slide.pending ?? [])[0];
        pending.push({
          kind: "image",
          label: `Imagen registrada como enlace (no se descarga): ${image.url}`,
          module: base ? MODULE_LABELS[base.module] : undefined,
          href: base?.href,
          objectId: image.templateObjectKey,
        });
      }
    }
    const removed = new Set(slide.removeObjectKeys);
    return {
      template: slide.templateSlideNumber,
      key: `${slide.templateSlideKey}${slide.repeatEntityId ? `:${slide.repeatEntityId}` : ""}`,
      title: slide.title,
      replacements: Object.fromEntries(
        Object.entries(slide.replacements).filter(([id]) => !removed.has(id)),
      ),
      remove: slide.removeObjectKeys,
      moves: slide.moves,
      images,
      pending,
    };
  });
  const draft = manifest.mode !== "client";
  return {
    slides,
    draftMarker: draft ? DRAFT_WATERMARK : null,
    title: `Marketing Discovery · ${manifest.clientName}${draft ? " · Borrador interno" : ""}`,
    author: `Avans OS · ${manifest.generatedBy}`,
    createdAt: manifest.generatedAt,
  };
}

export type GeneratedPresentation = {
  bytes: Uint8Array;
  report: GenerationReport;
  info: PresentationFileInfo;
};

/** Builds the PPTX from the verified master. Same inputs → same bytes. */
export async function buildPresentationFile(
  template: Uint8Array,
  manifest: PresentationManifest,
  version: number,
  storageKey: string,
): Promise<GeneratedPresentation> {
  const templateSha256 = await sha256Hex(template);
  if (templateSha256 !== MASTER_SHA256)
    throw new Error(
      "La plantilla descargada no coincide con el master oficial (SHA-256). No se generó el archivo.",
    );
  const { bytes, report } = generatePptx(template, manifestToDeckSpec(manifest));
  return {
    bytes,
    report,
    info: {
      fileName: presentationFileName(manifest, version),
      sha256: await sha256Hex(bytes),
      size: bytes.length,
      slideCount: report.slides.length,
      pendingCount: report.slides.reduce((n, s) => n + s.pending.length, 0),
      storage: "indexeddb",
      storageKey,
      templateSha256,
    },
  };
}
