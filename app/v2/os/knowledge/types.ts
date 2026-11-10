import type { MarketingDiscovery, DiscoveryStatus } from "../discovery/model";
import type { ServiceId } from "../os-data";
import type { KnowledgeValue } from "./blueprints";
import type { QuestionnaireInstance } from "./questionnaire";
import type {
  SourceProcessing,
  QuestionnaireAnswerSuggestion,
} from "./intake/types";
import type { PresentationExport } from "./presentation/types";
export type KnowledgeModule = "discovery" | "benchmark" | "marketing-plan";
export type KnowledgeSource = {
  intake?: SourceProcessing;
  id: string;
  organizationId?: string;
  clientSlug: string;
  type:
    | "questionnaire"
    | "meeting-smart-note"
    | "meeting-transcript"
    | "meeting-manual-note"
    | "document"
    | "catalog"
    | "brochure"
    | "website"
    | "drive-file"
    | "calendar-event"
    | "manual"
    | "benchmark-scan"
    | "platform";
  title: string;
  provider: "google" | "manual" | "system";
  externalId?: string;
  externalUrl: string;
  mimeType?: string;
  occurredAt: string;
  importedAt: string;
  importedBy: string;
  contentHash: string;
  status:
    | "pending"
    | "imported"
    | "processing"
    | "processed"
    | "needs-review"
    | "failed";
  rawText: string;
  metadata: Record<string, unknown>;
  version: number;
  owner: string;
  lastSyncedAt: string;
  error: string;
  impactedModules: string[];
  validationStatus: DiscoveryStatus;
  evidence: string;
  notes: string;
  demo: boolean;
  visibility: "team" | "managers";
};
export type MeetingArtifact = {
  id: string;
  sourceId: string;
  title: string;
  occurredAt: string;
  organizer: string;
  attendees: string[];
  eventId: string;
  eventUrl: string;
  conferenceRecordId: string;
  smartNoteName: string;
  documentId: string;
  documentUrl: string;
  workspaceEventId: string;
  explicitClientSlug: string;
  folderId: string;
  summary: string;
  decisions: string[];
  tasks: string[];
  association: "automatic" | "suggested" | "needs-review" | "unrelated";
  candidates: string[];
  clientSlug: string;
  associationReason: string;
  demo: boolean;
  hash: string;
  rawText: string;
};
export type EvidenceReference = {
  sourceId: string;
  excerpt: string;
  page?: number;
  paragraph?: number;
  speaker?: string;
  timestamp?: string;
};
export type KnowledgeChangeProposal = {
  id: string;
  clientSlug: string;
  sourceId: string;
  targetModule: KnowledgeModule;
  targetSection: string;
  targetEntityId: string;
  targetFieldPath: string;
  operation: "create" | "update" | "append" | "remove";
  previousValue: unknown;
  proposedValue: unknown;
  explanation: string;
  evidence: EvidenceReference[];
  confidence: number;
  impact: "low" | "medium" | "high";
  status: "pending" | "approved" | "rejected" | "applied";
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  rejectionReason?: string;
  dedupKey: string;
  affectedModules: string[];
  versionId?: string;
};
export type KnowledgeDependency = {
  sourceEntityType: string;
  sourceEntityId: string;
  targetEntityType: string;
  targetEntityId: string;
  dependencyReason: string;
};
export type KnowledgeVersion = {
  id: string;
  entityType: string;
  entityId: string;
  version: number;
  changedAt: string;
  changedBy: string;
  sourceId?: string;
  proposalId?: string;
  snapshot: unknown;
};
export type ReviewNotice = {
  id: string;
  entityType: string;
  entityId: string;
  reason: string;
  changedAt: string;
  sourceId?: string;
  resolvedAt?: string;
  resolvedBy?: string;
};
export type KnowledgeItem = {
  id: string;
  section: string;
  values: Record<string, KnowledgeValue>;
  sourceIds: string[];
  discoveryRefs: string[];
  findingIds: string[];
  owner: string;
  evidence: string;
  observedAt: string;
  captures: string;
  notes: string;
  status: DiscoveryStatus;
  demo: boolean;
  updatedAt: string;
  updatedBy: string;
};
export type BenchmarkBrand = {
  id: string;
  name: string;
  type: "Propia" | "Directa" | "Indirecta" | "Referente";
  segmentIds: string[];
  rationale: string;
  url: string;
  region: string;
  principal: boolean;
  clientValidated: boolean;
  status: DiscoveryStatus;
  owner: string;
  sourceIds: string[];
  items: KnowledgeItem[];
  demo: boolean;
};
export type BenchmarkSnapshot = {
  id: string;
  brandId: string;
  capturedAt: string;
  capturedBy: string;
  brand: BenchmarkBrand;
};
export type BenchmarkFinding = KnowledgeItem & {
  impactedServices: ServiceId[];
};
export type ScanJob = {
  id: string;
  status:
    "pending-configuration" | "queued" | "running" | "succeeded" | "failed";
  adapter: "manual-snapshot" | "connected-provider";
  lastRunAt: string;
  nextRunAt: string;
  cadence: "weekly" | "biweekly" | "monthly";
  sourceIds: string[];
  error: string;
};
export type BenchmarkState = {
  brands: BenchmarkBrand[];
  snapshots: BenchmarkSnapshot[];
  findings: BenchmarkFinding[];
  scan: ScanJob;
};
export type MarketingPlan = {
  modules: Partial<Record<ServiceId, KnowledgeItem[]>>;
};
export type KnowledgeState = {
  answerSuggestions?: QuestionnaireAnswerSuggestion[];
  presentationExports?: PresentationExport[];
  version: 1;
  clientSlug: string;
  revision: number;
  discovery: Omit<MarketingDiscovery, "sources">;
  questionnaire: QuestionnaireInstance;
  sources: KnowledgeSource[];
  meetings: MeetingArtifact[];
  proposals: KnowledgeChangeProposal[];
  benchmark: BenchmarkState;
  plan: MarketingPlan;
  dependencies: KnowledgeDependency[];
  versions: KnowledgeVersion[];
  reviews: ReviewNotice[];
  audit: {
    id: string;
    at: string;
    actor: string;
    action: string;
    sourceId?: string;
    proposalId?: string;
  }[];
  updatedAt: string;
  updatedBy: string;
};
export type MutationContext = { actor: string; at: string };
export const newId = () => crypto.randomUUID();
export const sourceTypes: KnowledgeSource["type"][] = [
  "questionnaire",
  "meeting-smart-note",
  "meeting-transcript",
  "meeting-manual-note",
  "document",
  "catalog",
  "brochure",
  "website",
  "drive-file",
  "calendar-event",
  "manual",
  "benchmark-scan",
  "platform",
];
export const sourceLabels: Record<KnowledgeSource["type"], string> = {
  questionnaire: "Cuestionario",
  "meeting-smart-note": "Smart Note",
  "meeting-transcript": "Transcripción",
  "meeting-manual-note": "Nota de reunión",
  document: "Documento",
  catalog: "Catálogo",
  brochure: "Brochure",
  website: "Sitio web",
  "drive-file": "Archivo de Drive",
  "calendar-event": "Evento de Calendar",
  manual: "Carga manual",
  "benchmark-scan": "Relevamiento de Benchmark",
  platform: "Plataforma",
};
