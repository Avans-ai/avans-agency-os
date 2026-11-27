/* Audiovisuales · métricas desde las jornadas (`audiovisuales:jornadas`) y el cupo contratado.
 * El uso del cupo es el del módulo (quotaUsage): usadas = validadas por el PM dentro del
 * período del cupo; pendientes = esperando validación. */
import { JORNADA_STAGES, jornadaHref, jornadaStageDue, jornadaState, quotaUsage, type JornadaState } from "../modules/av-model";
import { serviceHref } from "../service-workspace-data";
import { finishSnapshot, isBefore, periodComparisons, type SnapshotOptions } from "./common";
import { recordsOf, type MetricsInput } from "./input";
import { inPeriod, isIsoDate, shortDate, type MetricPeriod } from "./period";
import { serviceTasks, taskItems } from "./tasks";
import { countMetric, missingMetric, noDataMetric, originOfRecords, type ItemRef, type Metric, type ServiceSnapshot } from "./types";

const SERVICE = "audiovisuales" as const;
const CLOSED: JornadaState[] = ["Cerrada", "Cancelada"];
const SHOOT_STATES: JornadaState[] = ["Agenda", "Brief y guiones", "Rodaje"];
const APPROVAL_STATES: JornadaState[] = ["Validación", "Validación de Content", "Aprobación del cliente"];

export function avResults(input: MetricsInput, period: MetricPeriod): Metric[] {
  const jornadas = recordsOf(input, SERVICE, "jornadas").filter((record) => jornadaState(record) !== "Cancelada");
  const dated = jornadas.filter((record) => inPeriod(record.values.fecha, period));
  const closed = jornadas.filter((record) => inPeriod(record.values.cerradaAt?.slice(0, 10), period));
  if (!dated.length && !closed.length) return [noDataMetric("jornadas", "Jornadas con fecha en el período", "pendiente", "Ninguna jornada tiene fecha en el período."), noDataMetric("cerradas", "Jornadas cerradas en el período", "pendiente")];
  const origin = originOfRecords([...dated, ...closed]);
  return [countMetric("jornadas", "Jornadas con fecha en el período", dated.length, origin), countMetric("cerradas", "Jornadas cerradas en el período", closed.length, origin)];
}

export function avSnapshot(input: MetricsInput, options: SnapshotOptions): ServiceSnapshot {
  const { asOf, period } = options;
  const jornadas = recordsOf(input, SERVICE, "jornadas");
  const live = jornadas.filter((record) => !CLOSED.includes(jornadaState(record)));
  const origin = originOfRecords(jornadas);
  const tasks = serviceTasks(input.tasks, SERVICE, asOf);
  const quota = input.quota;
  const usage = quota ? quotaUsage(quota, jornadas) : null;
  const quotaOrigin = quota?.source === "demo" ? "demo" as const : "real" as const;
  const href = (id: string) => jornadaHref(input.clientSlug, id);
  const overdue = live.filter((record) => isBefore(jornadaStageDue(record), asOf));
  const approvals = live.filter((record) => APPROVAL_STATES.includes(jornadaState(record)) && !overdue.includes(record));
  const shoots = live.filter((record) => SHOOT_STATES.includes(jornadaState(record)) && isIsoDate(record.values.fecha) && record.values.fecha >= asOf).sort((a, b) => a.values.fecha.localeCompare(b.values.fecha));
  const editions = live.filter((record) => jornadaState(record) === "Edición").sort((a, b) => (a.values.fechaLimiteEdicion || "9999").localeCompare(b.values.fechaLimiteEdicion || "9999"));
  const configured = jornadas.length > 0 || Boolean(usage?.defined) || tasks.open.length > 0;

  const indicators: Metric[] = [
    usage?.defined
      ? { id: "cupo", label: "Cupo de jornadas usado", value: usage.used, display: `${usage.used} de ${usage.contracted}`, origin: quotaOrigin, hint: `${quota?.period || "Período sin nombre"} · ${usage.pending} en validación`, light: usage.used > usage.contracted ? "rojo" : usage.available === 0 ? "amarillo" : "verde" }
      : missingMetric("cupo", "Cupo de jornadas", "pendiente", "Cargá el cupo contratado en el módulo."),
    usage?.defined ? countMetric("disponibles", "Jornadas disponibles", usage.available, quotaOrigin) : missingMetric("disponibles", "Jornadas disponibles", "pendiente"),
    shoots[0] ? { id: "rodaje", label: "Próximo rodaje", value: null, display: shortDate(shoots[0].values.fecha), origin: originOfRecords([shoots[0]]), hint: shoots[0].values.titulo, href: href(shoots[0].id) } : noDataMetric("rodaje", "Próximo rodaje", origin, "Sin rodajes agendados."),
    editions[0] ? { id: "edicion", label: "Próxima edición", value: null, display: shortDate(editions[0].values.fechaLimiteEdicion), origin: originOfRecords([editions[0]]), hint: editions[0].values.titulo, href: href(editions[0].id) } : noDataMetric("edicion", "Próxima edición", origin, "Sin ediciones en curso."),
  ];
  const attention: ItemRef[] = [
    ...overdue.map((record): ItemRef => ({ id: record.id, title: record.values.titulo || record.id, detail: `«${jornadaState(record)}» vencida el ${shortDate(jornadaStageDue(record))}`, kind: "vencido", href: href(record.id), date: jornadaStageDue(record), origin: originOfRecords([record]) })),
    ...approvals.map((record): ItemRef => ({ id: record.id, title: record.values.titulo || record.id, detail: `${jornadaState(record)} · vence ${shortDate(jornadaStageDue(record))}`, kind: "aprobacion", href: href(record.id), date: jornadaStageDue(record), origin: originOfRecords([record]) })),
    ...taskItems(input.clientSlug, tasks),
  ];
  const upcoming: ItemRef[] = [
    ...shoots.map((record): ItemRef => ({ id: `${record.id}-rodaje`, title: record.values.titulo || record.id, detail: `Rodaje · ${jornadaState(record)} · ${record.values.proveedor || "Proveedor por definir"}`, kind: "proximo", href: href(record.id), date: record.values.fecha, origin: originOfRecords([record]) })),
    ...editions.map((record): ItemRef => ({ id: `${record.id}-edicion`, title: record.values.titulo || record.id, detail: "Entrega de la edición", kind: "proximo", href: href(record.id), date: record.values.fechaLimiteEdicion, origin: originOfRecords([record]) })),
  ];
  return finishSnapshot({
    serviceId: SERVICE, options, configured, clientSlug: input.clientSlug,
    signals: { hasData: configured, blocked: tasks.blocked.length, overdue: overdue.length + tasks.late.length, kpiRed: 0, kpiYellow: 0, quotaExceeded: Boolean(usage?.defined && usage.used > usage.contracted), quotaUndefined: !usage?.defined, approvals: approvals.length + tasks.approvals.length, clientPending: 0, pendingReview: 0 },
    indicators,
    results: avResults(input, period),
    comparisons: periodComparisons((current) => avResults(input, current), options, { jornadas: "up", cerradas: "up" }),
    charts: jornadas.length ? [{ kind: "bars", id: "av-stages", title: "Jornadas por etapa", items: JORNADA_STAGES.map((stage) => ({ label: stage.label, value: jornadas.filter((record) => stage.states.includes(jornadaState(record))).length })), href: `${serviceHref(input.clientSlug, SERVICE)}?seccion=jornadas`, origin }] : [],
    attention,
    upcoming,
    notes: [usage?.defined ? `Cupo: ${quota?.period || "período sin nombre"}${quotaOrigin === "demo" ? " (demo)" : ""}. Etapas al ${shortDate(asOf)}.` : "Cupo de jornadas sin configurar: no se calcula disponibilidad."],
    origins: [origin, ...(usage?.defined ? [quotaOrigin] : [])],
  });
}
