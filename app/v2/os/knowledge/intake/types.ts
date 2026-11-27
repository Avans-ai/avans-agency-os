import type { AnswerValue } from "../questionnaire";
import type { EvidenceReference } from "../types";
export type ProcessingStatus =
  | "pending"
  | "extracting"
  | "ready"
  | "analyzing"
  | "suggested"
  | "needs-review"
  | "failed"
  | "processed";
export const processingLabels: Record<ProcessingStatus, string> = {
  pending: "Pendiente",
  extracting: "Extrayendo contenido",
  ready: "Lista para analizar",
  analyzing: "Analizando",
  suggested: "Propuestas generadas",
  "needs-review": "Requiere revisión",
  failed: "Falló",
  processed: "Procesada",
};
export type SourceProcessing = {
  status: ProcessingStatus;
  fileName?: string;
  size?: number;
  extension?: string;
  warnings: string[];
  extractedAt?: string;
  provider?: string;
  originalStored: false;
};
export type SourceExtractionResult = {
  sourceId: string;
  rawText: string;
  metadata: Record<string, unknown>;
  warnings: string[];
};
export type QuestionnaireAnswerSuggestion = {
  id: string;
  clientSlug: string;
  sourceIds: string[];
  sourceVersions?: Record<string, number>;
  questionId: string;
  targetFieldPath: string;
  previousValue: AnswerValue;
  proposedValue: AnswerValue;
  explanation: string;
  evidence: EvidenceReference[];
  confidence: number;
  impact: "low" | "medium" | "high";
  status: "pending" | "approved" | "rejected" | "applied";
  provider: string;
  demo: boolean;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  editedAt?: string;
  decisionNote?: string;
};
export type AnalysisInput = {
  clientSlug: string;
  sources: { id: string; text: string; demo: boolean }[];
  questions: {
    id: string;
    targetFieldPath: string;
    label: string;
    fields?: { key: string; kind: string }[];
  }[];
  maxSuggestions: number;
  maxInputCharacters: number;
};
export interface QuestionnaireAnalysisProvider {
  readonly id: string;
  readonly label: string;
  readonly configured: boolean;
  analyze(input: AnalysisInput, signal: AbortSignal): Promise<unknown>;
}
/** Future server implementations require authenticated organization/client access.
 * Browser files stay in memory and are never persisted by this interface. */
export interface OriginalSourceStorage {
  put(input: {
    organizationId: string;
    clientSlug: string;
    sourceId: string;
    file: Blob;
  }): Promise<{ storagePath: string }>;
  remove(storagePath: string): Promise<void>;
}
