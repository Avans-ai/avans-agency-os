/* Registro del PDF generado en el repositorio común del cliente («Archivos y documentos» =
 * fuentes del conocimiento `client:<slug>:knowledge:v1`). El binario vive en IndexedDB
 * (`avans-os-client-files-v1`, el mismo almacenamiento de los materiales de la Ficha), así
 * que la fuente queda marcada como archivo guardado y recuperable en este navegador. Puro. */
import { newSource } from "../knowledge/sources";
import { versionChange } from "../knowledge/state";
import type { KnowledgeSource, KnowledgeState, MutationContext } from "../knowledge/types";
import type { BrandMaterial } from "../knowledge/profile-model";
import { snapshotText, type ReportSnapshot } from "./builders";

export type ReportFileRef = { sourceId: string; reportId: string; fileId: string; fileName: string; fileSize: number; sha256: string };
export const REPORT_SOURCE_NOTE = "Reporte generado en Avans OS. Archivo PDF guardado en este navegador y recuperable desde Reportes o la biblioteca de materiales. Generarlo no lo envió.";

export function reportSource(snapshot: ReportSnapshot, file: ReportFileRef, ctx: MutationContext): KnowledgeSource {
  const material: BrandMaterial = {
    category: "Documentos institucionales",
    kind: "Archivo",
    description: `${snapshot.title} · ${snapshot.clientName} · versión ${snapshot.version}`,
    productIds: [],
    serviceIds: snapshot.services.map((service) => service.id),
    file: { id: file.fileId, name: file.fileName, type: "application/pdf", size: file.fileSize },
  };
  return {
    ...newSource(snapshot.clientSlug, ctx),
    id: file.sourceId,
    type: "document",
    provider: "system",
    title: `${snapshot.title} · v${snapshot.version}`,
    mimeType: "application/pdf",
    occurredAt: snapshot.generatedAt.slice(0, 10),
    contentHash: file.sha256,
    status: "processed",
    rawText: snapshotText(snapshot),
    metadata: {
      brandMaterial: material,
      report: { reportId: file.reportId, version: snapshot.version, period: snapshot.period, type: snapshot.type, storedFile: true, recoverable: true, fileId: file.fileId, inputDigest: snapshot.inputDigest },
    },
    owner: snapshot.generatedBy,
    lastSyncedAt: snapshot.generatedAt,
    impactedModules: [],
    validationStatus: "Validado",
    evidence: `Instantánea ${snapshot.metricsVersion} · SHA-256 del PDF ${file.sha256}`,
    notes: REPORT_SOURCE_NOTE,
    demo: snapshot.origin === "demo",
    visibility: "team",
  };
}

export function withReportSource(k: KnowledgeState, snapshot: ReportSnapshot, file: ReportFileRef, ctx: MutationContext): KnowledgeState {
  if (k.clientSlug !== snapshot.clientSlug) throw new Error("El reporte pertenece a otro cliente.");
  if (k.sources.some((source) => source.id === file.sourceId || (source.contentHash && source.contentHash === file.sha256))) throw new Error("Este PDF ya está registrado en Archivos y documentos.");
  const source = reportSource(snapshot, file, ctx);
  const next = versionChange(k, "report", file.reportId, undefined, { version: snapshot.version, sourceId: source.id, fileName: file.fileName }, ctx, source.id);
  return {
    ...next,
    sources: [...k.sources, source],
    audit: [...next.audit, { id: crypto.randomUUID(), at: ctx.at, actor: ctx.actor, action: `Registró el reporte «${source.title}» (${file.fileName})`, sourceId: source.id }],
  };
}
