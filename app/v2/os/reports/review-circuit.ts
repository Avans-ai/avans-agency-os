/* Circuito de revisión de reportes (semanal operativo y mensual de resultados).
 * Cada reporte tiene partes por responsable: LT (Publicidad digital), Content (Contenidos)
 * y PM (resumen y Estrategia). Cada responsable revisa y marca su parte con comentarios;
 * cuando todas están revisadas, el PM exporta el archivo y prepara el mail al cliente.
 * Puro: sin React ni almacenamiento. Se guarda en `client:<slug>:report-reviews` (local). */
import { canEditService, canManageClient } from "../director-data";
import type { OsClient, ServiceId } from "../os-data";
import type { PreviewRole } from "../preview-roles";

export type ReviewKind = "semanal" | "mensual";
export const REVIEW_KIND_LABEL: Record<ReviewKind, string> = { semanal: "Reporte semanal operativo", mensual: "Reporte mensual de resultados" };
export type PartRole = "pm" | "technical" | "content";
export const PART_ROLE_LABEL: Record<PartRole, string> = { pm: "PM", technical: "LT · Líder técnico", content: "Content" };
export type PartId = "resumen" | "publicidad" | "contenidos";
export type ReportPart = { id: PartId; label: string; detail: string; role: PartRole; serviceId: ServiceId; owner: string };
export type PartStatus = "Pendiente" | "Revisada" | "Requiere ajustes";
export type PartReview = { status: PartStatus; comment: string; by: string; at: string };
export type ReviewEvent = { at: string; actor: string; text: string };
export type ReportReviewRecord = { kind: ReviewKind; period: string; parts: Partial<Record<PartId, PartReview>>; history: ReviewEvent[]; exportedAt?: string; exportedBy?: string; exportName?: string; emailPreparedAt?: string; emailPreparedBy?: string };
export type ReportReviewsState = { version: 1; reports: Record<string, ReportReviewRecord> };

export const EMPTY_REVIEWS: ReportReviewsState = { version: 1, reports: {} };
export const reportReviewsKey = (clientSlug: string) => `client:${clientSlug}:report-reviews`;
export const reviewId = (kind: ReviewKind, period: string) => `${kind}:${period}`;
export const AI_DRAFTS_PENDING = "Borradores con IA: pendientes de conexión. Hoy el reporte se arma con las tareas guardadas y datos de demostración rotulados.";
export const EMAIL_NOT_CONNECTED = "Gmail / SMTP no conectado: el OS no envía el mail. Copiá el borrador, adjuntá el archivo exportado y envialo desde tu correo.";

/** Lectura tolerante: cualquier formato inesperado se trata como vacío sin romper la vista. */
export function readReviews(value: unknown): ReportReviewsState {
  if (!value || typeof value !== "object") return EMPTY_REVIEWS;
  const reports = (value as ReportReviewsState).reports;
  return reports && typeof reports === "object" ? { version: 1, reports } : EMPTY_REVIEWS;
}

export function reportParts(client: OsClient, activeServices: ServiceId[]): ReportPart[] {
  const find = (pattern: RegExp) => client.team.find((person) => pattern.test(person.role))?.name;
  const parts: ReportPart[] = [{ id: "resumen", label: "Resumen y Estrategia", detail: "Resumen ejecutivo, objetivos, alertas y próximos pasos.", role: "pm", serviceId: "estrategia", owner: client.owner }];
  if (activeServices.includes("publicidad-digital")) parts.push({ id: "publicidad", label: "Publicidad digital", detail: "KPIs de pauta, inversión, campañas y optimizaciones.", role: "technical", serviceId: "publicidad-digital", owner: find(/Paid media|Performance/) ?? "Líder técnico por asignar" });
  if (activeServices.includes("contenidos")) parts.push({ id: "contenidos", label: "Contenidos", detail: "Producción, publicaciones, alcance y aprendizajes.", role: "content", serviceId: "contenidos", owner: find(/Contenido/) ?? "Content por asignar" });
  return parts;
}

export function partReview(record: ReportReviewRecord | undefined, partId: PartId): PartReview {
  return record?.parts[partId] ?? { status: "Pendiente", comment: "", by: "", at: "" };
}
export function reviewProgress(record: ReportReviewRecord | undefined, parts: ReportPart[]) {
  const reviewed = parts.filter((part) => partReview(record, part.id).status === "Revisada").length;
  return { reviewed, total: parts.length, ready: parts.length > 0 && reviewed === parts.length, percent: parts.length ? Math.round((reviewed / parts.length) * 100) : 0 };
}

/** Cada responsable revisa su parte. El administrador conserva el acceso. Roles visuales, no permisos de servidor. */
export function canReviewPart(role: PreviewRole, client: OsClient, part: ReportPart) {
  if (role === "admin") return true;
  if (part.role === "pm") return (role === "pm" || role === "operativo") && canManageClient(role, client.slug);
  if (part.role === "technical") return role === "technical" && canEditService(role, client.slug, part.serviceId);
  return role === "content" && canEditService(role, client.slug, part.serviceId);
}
export function canSendReport(role: PreviewRole, client: OsClient) {
  return canManageClient(role, client.slug);
}

export function markPart(state: ReportReviewsState, input: { kind: ReviewKind; period: string; part: ReportPart; status: PartStatus; comment: string; actor: string; at: string }): ReportReviewsState {
  if (input.status === "Requiere ajustes" && !input.comment.trim()) throw new Error("Contá qué hay que ajustar en esta parte.");
  const id = reviewId(input.kind, input.period);
  const current = state.reports[id] ?? { kind: input.kind, period: input.period, parts: {}, history: [] };
  const review: PartReview = { status: input.status, comment: input.comment.trim(), by: input.actor, at: input.at };
  const text = `${input.status === "Revisada" ? "Marcó como revisada" : input.status === "Requiere ajustes" ? "Pidió ajustes en" : "Reabrió"} la parte «${input.part.label}»${review.comment ? `: ${review.comment}` : ""}`;
  return { version: 1, reports: { ...state.reports, [id]: { ...current, parts: { ...current.parts, [input.part.id]: review }, history: [{ at: input.at, actor: input.actor, text }, ...current.history] } } };
}

export function recordEvent(state: ReportReviewsState, kind: ReviewKind, period: string, event: ReviewEvent, patch: Partial<ReportReviewRecord> = {}): ReportReviewsState {
  const id = reviewId(kind, period);
  const current = state.reports[id] ?? { kind, period, parts: {}, history: [] };
  return { version: 1, reports: { ...state.reports, [id]: { ...current, ...patch, history: [event, ...current.history] } } };
}

const slug = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export function exportFileName(clientSlug: string, kind: ReviewKind, period: string) {
  return `reporte-${kind}-${clientSlug}-${slug(period)}.html`;
}
const esc = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export type ExportInput = {
  clientName: string; kind: ReviewKind; title: string; period: string; owner: string;
  summary: string[]; kpis: { label: string; value: string }[]; conclusion: string;
  parts: { part: ReportPart; review: PartReview }[]; generatedAt: string; generatedBy: string;
};
/** Archivo HTML autocontenido para adjuntar o convertir a PDF desde el navegador del PM. */
export function buildReportHtml(input: ExportInput) {
  const date = new Date(input.generatedAt).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(input.title)} · ${esc(input.clientName)}</title>
<style>body{font-family:Figtree,Arial,sans-serif;color:#1b1a19;background:#f6f1ea;margin:0;padding:32px 16px}main{max-width:820px;margin:0 auto;background:#fff;border:1px solid #d9d2c7;padding:32px}h1{font-weight:500;margin:4px 0 8px}h2{font-size:16px;margin:28px 0 10px;text-transform:uppercase;letter-spacing:.08em}p,li{line-height:1.55}.meta{color:#6b655e;font-size:14px}.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1px;background:#d9d2c7;border:1px solid #d9d2c7}.kpis div{background:#fff;padding:12px}.kpis strong{display:block;font-size:22px}.part{border-left:3px solid #e8735a;padding:4px 12px;margin:10px 0}.note{font-size:12px;color:#6b655e;margin-top:28px}.conclusion{background:#2b2522;color:#f6f1ea;padding:14px 16px}</style></head>
<body><main>
<p class="meta">Avans · ${esc(input.clientName)}</p>
<h1>${esc(input.title)}</h1>
<p class="meta">Período: <strong>${esc(input.period)}</strong> · Responsable: <strong>${esc(input.owner)}</strong></p>
<h2>Resumen ejecutivo</h2><ul>${input.summary.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
<h2>Indicadores</h2><div class="kpis">${input.kpis.map((kpi) => `<div><span>${esc(kpi.label)}</span><strong>${esc(kpi.value)}</strong></div>`).join("")}</div>
<h2>Revisión por responsable</h2>${input.parts.map(({ part, review }) => `<div class="part"><strong>${esc(part.label)}</strong> · ${esc(PART_ROLE_LABEL[part.role])} · ${esc(part.owner)}<br>${esc(review.status)}${review.by ? ` por ${esc(review.by)}` : ""}${review.comment ? `<br><em>${esc(review.comment)}</em>` : ""}</div>`).join("")}
<h2>Conclusión</h2><p class="conclusion">${esc(input.conclusion)}</p>
<p class="note">Exportado el ${esc(date)} por ${esc(input.generatedBy)} desde Avans OS. Incluye datos de demostración rotulados en la plataforma; las métricas reales requieren las integraciones conectadas.</p>
</main></body></html>`;
}

export type EmailDraft = { to: string[]; subject: string; body: string };
export function buildEmailDraft(input: { client: OsClient; kind: ReviewKind; period: string; sender: string; summary: string[]; fileName: string }): EmailDraft {
  const to = input.client.contacts.map((contact) => `${contact.name} · ${contact.role} (correo a completar)`);
  const greeting = input.client.contacts[0]?.name && !/^Contacto/.test(input.client.contacts[0].name) ? `Hola ${input.client.contacts[0].name.split(" ")[0]}:` : "Hola:";
  const subject = `${REVIEW_KIND_LABEL[input.kind]} · ${input.client.name} · ${input.period}`;
  const body = [
    greeting,
    "",
    `Te compartimos el ${REVIEW_KIND_LABEL[input.kind].toLowerCase()} de ${input.period}. Lo revisó cada responsable del equipo antes del envío.`,
    "",
    "Lo más importante:",
    ...input.summary.slice(0, 3).map((item) => `• ${item}`),
    "",
    `Adjuntamos el reporte completo (${input.fileName}). Si querés, lo repasamos en la próxima reunión.`,
    "",
    "Saludos,",
    input.sender,
    "Avans",
  ].join("\n");
  return { to, subject, body };
}
