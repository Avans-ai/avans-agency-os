import type { KnowledgeState, KnowledgeSource } from "../types";
import type { ServiceId } from "../../os-data";
export type PresentationMode = "internal-draft" | "client";
export type PresentationImageReplacement = {
  templateObjectKey: string;
  url?: string;
  action: "keep" | "replace" | "delete";
  description: string;
  sourceId?: string;
};
export type PresentationSlideManifest = {
  templateSlideKey: string;
  templateSlideNumber: number;
  outputOrder: number;
  repeatEntityId?: string;
  title: string;
  replacements: Record<string, string>;
  images: PresentationImageReplacement[];
  removeInstructionLayers: boolean;
  removeObjectKeys: string[];
  warnings: string[];
  /** Offsets (EMU) applied to template objects, e.g. compacting the services index. */
  moves?: Record<string, { dx?: number; dy?: number }>;
  /** Fields and images of this slide that have no data and were left out. */
  pending?: PresentationPendingItem[];
};
export type PresentationPendingItem = {
  objectKey: string;
  label: string;
  module: "discovery" | "benchmark" | "marketing-plan" | "template";
  href: string;
  kind: "field" | "image";
};
/** Generated PPTX stored with a history record (bytes live in IndexedDB). */
export type PresentationFileInfo = {
  fileName: string;
  sha256: string;
  size: number;
  slideCount: number;
  pendingCount: number;
  storage: "indexeddb";
  storageKey: string;
  templateSha256: string;
};
export type PresentationSnapshot = {
  discovery: KnowledgeState["discovery"];
  benchmark: KnowledgeState["benchmark"];
  marketingPlan: KnowledgeState["plan"];
  includedServiceIds: ServiceId[];
  sources: Pick<
    KnowledgeSource,
    | "id"
    | "title"
    | "type"
    | "contentHash"
    | "version"
    | "demo"
    | "validationStatus"
    | "externalUrl"
  >[];
  at: string;
  actor: string;
};
export type PreparationBlock = {
  id: "discovery" | "benchmark" | "marketing-plan";
  label: string;
  percent: number;
  missing: string[];
  unvalidated: number;
  sourceIds: string[];
  updatedAt: string;
  owners: string[];
  slides: number;
  href: string;
};
export type PresentationManifest = {
  id: string;
  clientSlug: string;
  clientName: string;
  templateVersion: string;
  mode: PresentationMode;
  discoveryVersion: string;
  benchmarkVersion: string;
  marketingPlanVersion: string;
  includedServiceIds: ServiceId[];
  slides: PresentationSlideManifest[];
  removedSlides: { slide: number; reason: string }[];
  missingFields: string[];
  warnings: string[];
  missingImages: string[];
  preparation: PreparationBlock[];
  snapshot: PresentationSnapshot;
  generatedAt: string;
  generatedBy: string;
  warningsConfirmed: boolean;
};
export type PresentationExport = {
  id: string;
  clientSlug: string;
  format: "manifest" | "pptx" | "google-slides";
  mode: PresentationMode;
  version: number;
  status: "preview" | "queued" | "generating" | "ready" | "failed";
  manifest: PresentationManifest;
  fileName?: string;
  file?: PresentationFileInfo;
  downloadUrl?: string;
  googleFileId?: string;
  googleSlidesUrl?: string;
  generatedAt?: string;
  generatedBy?: string;
  error?: string;
};
export interface PresentationRepository {
  save(exported: PresentationExport, organizationId: string): Promise<void>;
  get(
    id: string,
    organizationId: string,
    clientSlug: string,
  ): Promise<PresentationExport | null>;
}
