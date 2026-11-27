/* Generador de reportes · modelo puro (sin React ni almacenamiento).
 * Un reporte es un registro con su configuración (tipo, período, servicios), su texto
 * (conclusiones, recomendaciones, próximos pasos, escrito por el equipo) y sus versiones
 * emitidas. Cada versión guarda la instantánea de datos usada al generar y la entrada de
 * métricas proyectada: una versión emitida nunca cambia; los cambios posteriores en los
 * módulos solo aparecen en una versión nueva. Se guarda en `client:<slug>:reports:v1`. */
import type { MetricsInput } from "../metrics/input";
import { isPeriod, type MetricPeriod } from "../metrics/period";
import type { ServiceId } from "../os-data";
import type { ReviewKind } from "./review-circuit";
import type { ReportSnapshot } from "./builders";

export type ReportType = "semanal" | "mensual" | "servicio";
export const REPORT_TYPES: { id: ReportType; label: string; detail: string }[] = [
  { id: "semanal", label: "Semanal operativo", detail: "Estado de cada servicio, pendientes, bloqueos, aprobaciones y próximas fechas de la semana." },
  { id: "mensual", label: "Mensual", detail: "Resultados del mes por servicio, comparados con el mes anterior cuando hay datos comparables." },
  { id: "servicio", label: "Específico de un servicio", detail: "Un solo servicio con todo su detalle para el período que elijas." },
];
export const REPORT_TYPE_LABEL: Record<ReportType, string> = { semanal: "Reporte semanal operativo", mensual: "Reporte mensual", servicio: "Reporte de servicio" };
export const REPORT_STEPS = ["Tipo", "Período", "Servicios", "Datos", "Indicadores", "Conclusiones", "Revisión", "Vista previa", "Generar"] as const;

export type ReportNarrative = { conclusions: string; recommendations: string; nextSteps: string };
export const EMPTY_NARRATIVE: ReportNarrative = { conclusions: "", recommendations: "", nextSteps: "" };

export type ReportVersion = {
  version: number;
  generatedAt: string;
  generatedBy: string;
  fileName: string;
  /** Archivo guardado en IndexedDB `avans-os-client-files-v1` (clave `<cliente>:<fileId>`). */
  fileId: string;
  fileSize: number;
  sha256: string;
  /** Fuente creada en «Archivos y documentos» (conocimiento del cliente), si el rol pudo registrarla. */
  sourceId?: string;
  registered: boolean;
  snapshot: ReportSnapshot;
  /** Entrada de métricas usada (proyectada): permite reproducir la instantánea. */
  input: MetricsInput;
};

export type ReportEvent = { at: string; actor: string; text: string };
export type ReportRecord = {
  id: string;
  clientSlug: string;
  type: ReportType;
  period: MetricPeriod;
  services: ServiceId[];
  narrative: ReportNarrative;
  step: number;
  status: "Borrador" | "Emitido";
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  versions: ReportVersion[];
  history: ReportEvent[];
};
export type ReportsState = { version: 1; clientSlug: string; reports: ReportRecord[] };

export const reportsKey = (clientSlug: string) => `client:${clientSlug}:reports:v1`;
export const emptyReports = (clientSlug: string): ReportsState => ({ version: 1, clientSlug, reports: [] });

/** Lectura tolerante: un formato inesperado se trata como vacío y nunca mezcla clientes. */
export function readReports(value: unknown, clientSlug: string): ReportsState {
  const state = value as ReportsState | null;
  if (!state || state.version !== 1 || state.clientSlug !== clientSlug || !Array.isArray(state.reports)) return emptyReports(clientSlug);
  return { version: 1, clientSlug, reports: state.reports.filter((report) => report && report.clientSlug === clientSlug && isPeriod(report.period) && Array.isArray(report.versions)) };
}

export function reviewKindOf(type: ReportType): ReviewKind {
  return type;
}
/** Cada versión tiene su propia revisión por responsable. */
export function reviewReference(report: Pick<ReportRecord, "id" | "versions">) {
  return `${report.id}·v${report.versions.length + 1}`;
}

export function reportTitle(report: Pick<ReportRecord, "type" | "period" | "services">, serviceName: (id: ServiceId) => string) {
  if (report.type === "servicio" && report.services[0]) return `Reporte de ${serviceName(report.services[0])} · ${report.period.label}`;
  return `${REPORT_TYPE_LABEL[report.type]} · ${report.period.label}`;
}

const slug = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export function reportFileName(clientSlug: string, report: Pick<ReportRecord, "type" | "period" | "services">, version: number) {
  const scope = report.type === "servicio" && report.services[0] ? `${report.services[0]}-` : "";
  return `reporte-${report.type}-${scope}${clientSlug}-${slug(report.period.label)}-v${version}.pdf`.slice(0, 160);
}

function touch(state: ReportsState, id: string, update: (report: ReportRecord) => ReportRecord): ReportsState {
  const current = state.reports.find((report) => report.id === id);
  if (!current) throw new Error("El reporte ya no existe. Volvé a la lista de reportes.");
  return { ...state, reports: state.reports.map((report) => (report.id === id ? update(report) : report)) };
}

export function validateConfig(input: { type: ReportType; period: MetricPeriod; services: ServiceId[] }, activeServices: ServiceId[]) {
  if (!REPORT_TYPES.some((type) => type.id === input.type)) throw new Error("Elegí el tipo de reporte.");
  if (!isPeriod(input.period)) throw new Error("Elegí un período válido.");
  if (!input.services.length) throw new Error("Elegí al menos un servicio para incluir.");
  if (input.services.some((service) => !activeServices.includes(service))) throw new Error("Solo se pueden incluir servicios activos del cliente.");
  if (input.type === "servicio" && input.services.length !== 1) throw new Error("El reporte específico incluye un solo servicio.");
}

export function createDraft(state: ReportsState, input: { id: string; type: ReportType; period: MetricPeriod; services: ServiceId[]; actor: string; at: string }, activeServices: ServiceId[]): ReportsState {
  validateConfig(input, activeServices);
  const report: ReportRecord = {
    id: input.id, clientSlug: state.clientSlug, type: input.type, period: input.period, services: input.services, narrative: EMPTY_NARRATIVE, step: 1,
    status: "Borrador", createdAt: input.at, createdBy: input.actor, updatedAt: input.at, updatedBy: input.actor, versions: [],
    history: [{ at: input.at, actor: input.actor, text: "Creó el borrador del reporte" }],
  };
  return { ...state, reports: [report, ...state.reports] };
}

export type DraftPatch = Partial<Pick<ReportRecord, "type" | "period" | "services" | "narrative" | "step">>;
export function updateDraft(state: ReportsState, id: string, patch: DraftPatch, ctx: { actor: string; at: string }, activeServices: ServiceId[]): ReportsState {
  return touch(state, id, (report) => {
    if (report.status !== "Borrador") throw new Error("La versión ya fue emitida. Creá una versión nueva para cambiarla.");
    const next = { ...report, ...patch, narrative: { ...report.narrative, ...patch.narrative }, updatedAt: ctx.at, updatedBy: ctx.actor };
    if (report.versions.length && patch.type && patch.type !== report.type) throw new Error("El tipo de un reporte ya emitido no cambia: creá un reporte nuevo.");
    validateConfig(next, activeServices);
    return { ...next, step: Math.max(1, Math.min(REPORT_STEPS.length, next.step)) };
  });
}

export function deleteDraft(state: ReportsState, id: string): ReportsState {
  const report = state.reports.find((item) => item.id === id);
  if (!report) return state;
  if (report.versions.length) throw new Error("Un reporte con versiones emitidas no se borra: queda en el historial.");
  return { ...state, reports: state.reports.filter((item) => item.id !== id) };
}

/** Reabre un reporte emitido como borrador de la versión siguiente (las anteriores no cambian). */
export function startNewVersion(state: ReportsState, id: string, ctx: { actor: string; at: string }): ReportsState {
  return touch(state, id, (report) => {
    if (report.status === "Borrador") return report;
    return { ...report, status: "Borrador", step: 4, updatedAt: ctx.at, updatedBy: ctx.actor, history: [{ at: ctx.at, actor: ctx.actor, text: `Abrió el borrador de la versión ${report.versions.length + 1}` }, ...report.history] };
  });
}

/** Agrega una versión emitida. Las versiones existentes se conservan byte a byte. */
export function issueVersion(state: ReportsState, id: string, version: ReportVersion): ReportsState {
  return touch(state, id, (report) => {
    if (report.status !== "Borrador") throw new Error("No hay un borrador abierto para emitir.");
    if (version.version !== report.versions.length + 1) throw new Error("La versión no es la siguiente del reporte.");
    if (version.snapshot.clientSlug !== report.clientSlug || version.input.clientSlug !== report.clientSlug) throw new Error("La instantánea pertenece a otro cliente.");
    const text = `Generó la versión ${version.version} (${version.fileName})${version.registered ? " y la registró en Archivos y documentos" : ""}`;
    return { ...report, status: "Emitido", step: REPORT_STEPS.length, versions: [...report.versions, version], updatedAt: version.generatedAt, updatedBy: version.generatedBy, history: [{ at: version.generatedAt, actor: version.generatedBy, text }, ...report.history] };
  });
}

export function recordReportEvent(state: ReportsState, id: string, event: ReportEvent): ReportsState {
  return touch(state, id, (report) => ({ ...report, history: [event, ...report.history] }));
}
