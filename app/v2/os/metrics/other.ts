/* Estrategia, Desarrollo web y módulos genéricos (CRM, IA, Soluciones gráficas, Mercado Libre).
 * Solo se usan sus entidades actuales y sus estados ya definidos: no se inventan procesos. */
import type { ServiceId } from "../os-data";
import type { ModuleRecord } from "../modules/types";
import { serviceHref } from "../service-workspace-data";
import { finishSnapshot, isBefore, isUpcoming, periodComparisons, type SnapshotOptions } from "./common";
import { recordsOf, type MetricsInput } from "./input";
import { inPeriod, shortDate, type MetricPeriod } from "./period";
import { serviceTasks, taskItems, taskOrigin } from "./tasks";
import { countMetric, noDataMetric, originOfRecords, type ItemRef, type Metric, type ServiceSnapshot } from "./types";

const recordHref = (clientSlug: string, serviceId: ServiceId, section: string, id?: string) => `${serviceHref(clientSlug, serviceId)}?seccion=${section}${id ? `&registro=${encodeURIComponent(id)}` : ""}`;
const item = (record: ModuleRecord, title: string, detail: string, kind: ItemRef["kind"], href: string, date?: string): ItemRef => ({ id: record.id, title, detail, kind, href, date, origin: originOfRecords([record]) });

/* ───────── Estrategia ───────── */
export function strategyResults(input: MetricsInput, period: MetricPeriod): Metric[] {
  const meetings = recordsOf(input, "estrategia", "reuniones").filter((record) => inPeriod(record.values.fecha, period));
  const decisions = recordsOf(input, "estrategia", "decisiones").filter((record) => inPeriod(record.values.fecha, period));
  if (!meetings.length && !decisions.length) return [noDataMetric("reuniones", "Reuniones del período", "pendiente", "No hay reuniones ni decisiones fechadas en el período."), noDataMetric("decisiones", "Decisiones del período", "pendiente")];
  const origin = originOfRecords([...meetings, ...decisions]);
  return [countMetric("reuniones", "Reuniones del período", meetings.length, origin), countMetric("decisiones", "Decisiones del período", decisions.length, origin)];
}

export function strategySnapshot(input: MetricsInput, options: SnapshotOptions): ServiceSnapshot {
  const { asOf, period } = options;
  const slug = input.clientSlug;
  const priorities = recordsOf(input, "estrategia", "prioridades");
  const meetings = recordsOf(input, "estrategia", "reuniones");
  const decisions = recordsOf(input, "estrategia", "decisiones");
  const risks = recordsOf(input, "estrategia", "riesgos");
  const all = [...priorities, ...meetings, ...decisions, ...risks];
  const origin = originOfRecords(all);
  const tasks = serviceTasks(input.tasks, "estrategia", asOf);
  const activePriorities = priorities.filter((record) => ["Planificada", "En curso", "Bloqueada"].includes(record.values.estado));
  const blockedPriorities = priorities.filter((record) => record.values.estado === "Bloqueada");
  const openRisks = risks.filter((record) => record.values.estado !== "Cerrado");
  const blockingRisks = openRisks.filter((record) => record.values.tipo === "Bloqueo");
  const clientRisks = openRisks.filter((record) => record.values.tipo === "Dependencia del cliente");
  const pendingMinutes = meetings.filter((record) => record.values.estado === "Acta pendiente");
  const proposed = decisions.filter((record) => record.values.estado === "Propuesta" || record.values.estado === "Revisar");
  const configured = all.length > 0 || tasks.open.length > 0;
  const indicators: Metric[] = all.length ? [
    countMetric("prioridades", "Prioridades activas", activePriorities.length, origin, { href: recordHref(slug, "estrategia", "planificacion") }),
    countMetric("riesgos", "Riesgos abiertos", openRisks.length, origin, { href: recordHref(slug, "estrategia", "riesgos") }),
    countMetric("decisiones", "Decisiones por confirmar", proposed.length, origin, { href: recordHref(slug, "estrategia", "decisiones") }),
    countMetric("actas", "Actas pendientes", pendingMinutes.length, origin, { href: recordHref(slug, "estrategia", "reuniones") }),
  ] : [noDataMetric("estrategia", "Planificación y seguimiento", "pendiente", "Todavía no hay prioridades, reuniones, decisiones ni riesgos cargados.")];
  const attention: ItemRef[] = [
    ...blockedPriorities.map((record) => item(record, record.values.iniciativa || record.id, `Prioridad bloqueada${record.values.detalle ? ` · ${record.values.detalle}` : ""}`, "bloqueo", recordHref(slug, "estrategia", "planificacion", record.id))),
    ...blockingRisks.map((record) => item(record, record.values.riesgo || record.id, `Riesgo de bloqueo · impacto ${record.values.impacto || "sin definir"}`, "bloqueo", recordHref(slug, "estrategia", "riesgos", record.id))),
    ...clientRisks.map((record) => item(record, record.values.riesgo || record.id, "Dependencia del cliente", "cliente", recordHref(slug, "estrategia", "riesgos", record.id))),
    ...proposed.map((record) => item(record, record.values.decision || record.id, `Decisión ${record.values.estado.toLocaleLowerCase("es")}`, "aprobacion", recordHref(slug, "estrategia", "decisiones", record.id), record.values.fecha)),
    ...pendingMinutes.map((record) => item(record, record.values.tema || record.id, "Acta de reunión pendiente", "revision", recordHref(slug, "estrategia", "reuniones", record.id), record.values.fecha)),
    ...taskItems(slug, tasks),
  ];
  const upcoming = meetings.filter((record) => isUpcoming(record.values.fecha, asOf)).map((record) => item(record, record.values.tema || record.id, `Reunión · ${record.values.estado}`, "proximo", recordHref(slug, "estrategia", "reuniones", record.id), record.values.fecha));
  return finishSnapshot({
    serviceId: "estrategia", options, configured, clientSlug: slug,
    signals: { hasData: configured, blocked: blockedPriorities.length + blockingRisks.length + tasks.blocked.length, overdue: tasks.late.length, kpiRed: 0, kpiYellow: 0, approvals: proposed.length + tasks.approvals.length, clientPending: clientRisks.length, pendingReview: pendingMinutes.length },
    indicators,
    results: strategyResults(input, period),
    comparisons: periodComparisons((current) => strategyResults(input, current), options, { reuniones: "up" }),
    attention,
    upcoming,
    notes: [all.length ? `Estado al ${shortDate(asOf)} de prioridades, riesgos, decisiones y reuniones.` : "Sin registros de Estrategia: el estado no se evalúa como éxito."],
    origins: [origin, ...tasks.open.map(taskOrigin)],
  });
}

/* ───────── Desarrollo web ───────── */
const WEB_DONE = ["Aprobado", "Publicado"];
export function webResults(input: MetricsInput, period: MetricPeriod): Metric[] {
  const releases = recordsOf(input, "desarrollo-web", "publicaciones").filter((record) => inPeriod(record.values.fecha, period) && record.values.estado === "Publicada");
  const qa = recordsOf(input, "desarrollo-web", "qa").filter((record) => inPeriod(record.values.fecha, period));
  if (!releases.length && !qa.length) return [noDataMetric("publicaciones", "Publicaciones del período", "pendiente", "No hay publicaciones ni pruebas fechadas en el período."), noDataMetric("qa", "Casos de QA probados en el período", "pendiente")];
  const origin = originOfRecords([...releases, ...qa]);
  return [countMetric("publicaciones", "Publicaciones del período", releases.length, origin), countMetric("qa", "Casos de QA probados en el período", qa.length, origin)];
}

export function webSnapshot(input: MetricsInput, options: SnapshotOptions): ServiceSnapshot {
  const { asOf, period } = options;
  const slug = input.clientSlug;
  const projects = recordsOf(input, "desarrollo-web", "proyectos");
  const pages = recordsOf(input, "desarrollo-web", "sitemap");
  const qa = recordsOf(input, "desarrollo-web", "qa");
  const all = [...projects, ...pages, ...qa, ...recordsOf(input, "desarrollo-web", "publicaciones")];
  const origin = originOfRecords(all);
  const tasks = serviceTasks(input.tasks, "desarrollo-web", asOf);
  const openProjects = projects.filter((record) => !WEB_DONE.includes(record.values.estado));
  const lateProjects = openProjects.filter((record) => isBefore(record.values.fechaObjetivo, asOf));
  const readyPages = pages.filter((record) => ["Lista", "Publicada"].includes(record.values.estado));
  const clientPages = pages.filter((record) => record.values.contenido === "Pendiente del cliente");
  const qaBlocked = qa.filter((record) => record.values.resultado === "Bloqueado");
  const qaPending = qa.filter((record) => ["Pendiente", "Falla"].includes(record.values.resultado));
  const approvals = projects.filter((record) => record.values.estado === "En aprobación");
  const configured = all.length > 0 || tasks.open.length > 0;
  const indicators: Metric[] = all.length ? [
    countMetric("proyectos", "Proyectos web abiertos", openProjects.length, origin, { href: recordHref(slug, "desarrollo-web", "proyectos") }),
    pages.length ? { id: "paginas", label: "Páginas listas", value: readyPages.length, display: `${readyPages.length} de ${pages.length}`, origin, href: recordHref(slug, "desarrollo-web", "sitemap") } : noDataMetric("paginas", "Páginas listas", "pendiente", "Sitemap sin cargar."),
    qa.length ? { id: "qa", label: "QA aprobado", value: qa.filter((record) => record.values.resultado === "Aprobado").length, display: `${qa.filter((record) => record.values.resultado === "Aprobado").length} de ${qa.length} casos`, origin, href: recordHref(slug, "desarrollo-web", "qa") } : noDataMetric("qa", "QA aprobado", "pendiente", "Sin casos de QA."),
    countMetric("contenido-cliente", "Páginas esperando contenido del cliente", clientPages.length, origin),
  ] : [noDataMetric("web", "Proyectos web", "pendiente", "Todavía no hay proyectos, páginas ni pruebas cargados.")];
  const attention: ItemRef[] = [
    ...qaBlocked.map((record) => item(record, record.values.caso || record.id, `QA bloqueado${record.values.evidencia ? ` · ${record.values.evidencia}` : ""}`, "bloqueo", recordHref(slug, "desarrollo-web", "qa", record.id))),
    ...lateProjects.map((record) => item(record, record.values.nombre || record.id, `Fecha objetivo ${shortDate(record.values.fechaObjetivo)} vencida · ${record.values.etapa || record.values.estado}`, "vencido", recordHref(slug, "desarrollo-web", "proyectos", record.id), record.values.fechaObjetivo)),
    ...clientPages.map((record) => item(record, record.values.pagina || record.id, "Contenido pendiente del cliente", "cliente", recordHref(slug, "desarrollo-web", "sitemap", record.id))),
    ...approvals.map((record) => item(record, record.values.nombre || record.id, "Proyecto en aprobación", "aprobacion", recordHref(slug, "desarrollo-web", "proyectos", record.id), record.values.fechaObjetivo)),
    ...qaPending.map((record) => item(record, record.values.caso || record.id, `QA ${record.values.resultado.toLocaleLowerCase("es")}`, "revision", recordHref(slug, "desarrollo-web", "qa", record.id))),
    ...taskItems(slug, tasks),
  ];
  const upcoming = openProjects.filter((record) => isUpcoming(record.values.fechaObjetivo, asOf)).map((record) => item(record, record.values.nombre || record.id, `Fecha objetivo · ${record.values.etapa || record.values.estado}`, "proximo", recordHref(slug, "desarrollo-web", "proyectos", record.id), record.values.fechaObjetivo));
  return finishSnapshot({
    serviceId: "desarrollo-web", options, configured, clientSlug: slug,
    signals: { hasData: configured, blocked: qaBlocked.length + tasks.blocked.length, overdue: lateProjects.length + tasks.late.length, kpiRed: 0, kpiYellow: 0, approvals: approvals.length + tasks.approvals.length, clientPending: clientPages.length, pendingReview: qaPending.length },
    indicators,
    results: webResults(input, period),
    comparisons: periodComparisons((current) => webResults(input, current), options, { publicaciones: "up" }),
    charts: pages.length ? [{ kind: "bars", id: "web-pages", title: "Páginas por estado", items: ["Planificada", "En diseño", "En desarrollo", "Lista", "Publicada"].map((state) => ({ label: state, value: pages.filter((record) => record.values.estado === state).length })), href: recordHref(slug, "desarrollo-web", "sitemap"), origin }] : [],
    attention,
    upcoming,
    notes: [all.length ? `Estado al ${shortDate(asOf)} de proyectos, sitemap y QA.` : "Sin registros de Desarrollo web: el estado no se evalúa como éxito."],
    origins: [origin, ...tasks.open.map(taskOrigin)],
  });
}

/* ───────── Módulos genéricos (trabajos por etapa) ───────── */
const GENERIC_DONE = ["Aprobado", "Cerrado"];
export function genericResults(input: MetricsInput, serviceId: ServiceId, period: MetricPeriod): Metric[] {
  const dated = recordsOf(input, serviceId, "trabajos").filter((record) => inPeriod(record.values.fechaObjetivo, period));
  if (!dated.length) return [noDataMetric("comprometidos", "Trabajos con fecha en el período", "pendiente", "Ningún trabajo tiene fecha en el período.")];
  const origin = originOfRecords(dated);
  return [countMetric("comprometidos", "Trabajos con fecha en el período", dated.length, origin), countMetric("cerrados", "Cerrados o aprobados", dated.filter((record) => GENERIC_DONE.includes(record.values.estado)).length, origin)];
}

export function genericSnapshot(input: MetricsInput, serviceId: ServiceId, options: SnapshotOptions): ServiceSnapshot {
  const { asOf, period } = options;
  const slug = input.clientSlug;
  const work = recordsOf(input, serviceId, "trabajos");
  const origin = originOfRecords(work);
  const tasks = serviceTasks(input.tasks, serviceId, asOf);
  const open = work.filter((record) => !GENERIC_DONE.includes(record.values.estado));
  const blocked = open.filter((record) => record.values.estado === "Bloqueado");
  const late = open.filter((record) => isBefore(record.values.fechaObjetivo, asOf));
  const approvals = open.filter((record) => record.values.estado === "En aprobación");
  const changes = open.filter((record) => record.values.estado === "Cambios pedidos");
  const configured = work.length > 0 || tasks.open.length > 0;
  const href = (id?: string) => recordHref(slug, serviceId, "trabajos", id);
  const indicators: Metric[] = work.length ? [
    countMetric("abiertos", "Trabajos abiertos", open.length, origin, { href: href() }),
    countMetric("vencidos", "Trabajos vencidos", late.length, origin),
    countMetric("aprobacion", "En aprobación", approvals.length, origin),
  ] : [noDataMetric("trabajos", "Trabajos del módulo", "pendiente", "Todavía no hay trabajos cargados.")];
  const stages = Array.from(new Set(work.map((record) => record.values.etapa).filter(Boolean)));
  return finishSnapshot({
    serviceId, options, configured, clientSlug: slug,
    signals: { hasData: configured, blocked: blocked.length + tasks.blocked.length, overdue: late.length + tasks.late.length, kpiRed: 0, kpiYellow: 0, approvals: approvals.length + tasks.approvals.length, clientPending: 0, pendingReview: changes.length },
    indicators,
    results: genericResults(input, serviceId, period),
    comparisons: periodComparisons((current) => genericResults(input, serviceId, current), options, { cerrados: "up" }),
    charts: stages.length ? [{ kind: "bars", id: `${serviceId}-stages`, title: "Trabajos por etapa", items: stages.map((stage) => ({ label: stage, value: work.filter((record) => record.values.etapa === stage).length })), href: href(), origin }] : [],
    attention: [
      ...blocked.map((record) => item(record, record.values.nombre || record.id, `Bloqueado · ${record.values.etapa || "sin etapa"}`, "bloqueo", href(record.id))),
      ...late.filter((record) => !blocked.includes(record)).map((record) => item(record, record.values.nombre || record.id, `Fecha objetivo ${shortDate(record.values.fechaObjetivo)} vencida · ${record.values.etapa || record.values.estado}`, "vencido", href(record.id), record.values.fechaObjetivo)),
      ...approvals.map((record) => item(record, record.values.nombre || record.id, "En aprobación", "aprobacion", href(record.id), record.values.fechaObjetivo)),
      ...changes.map((record) => item(record, record.values.nombre || record.id, "Cambios pedidos", "revision", href(record.id), record.values.fechaObjetivo)),
      ...taskItems(slug, tasks),
    ],
    upcoming: open.filter((record) => isUpcoming(record.values.fechaObjetivo, asOf)).map((record) => item(record, record.values.nombre || record.id, `${record.values.etapa || "Sin etapa"} · ${record.values.responsable || "Sin responsable"}`, "proximo", href(record.id), record.values.fechaObjetivo)),
    notes: [work.length ? `Estado al ${shortDate(asOf)} de los trabajos del módulo.` : "Sin trabajos cargados: el estado no se evalúa como éxito."],
    origins: [origin, ...tasks.open.map(taskOrigin)],
  });
}
