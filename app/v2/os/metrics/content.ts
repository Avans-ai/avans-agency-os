/* Contenidos · métricas desde el calendario editorial (`contenidos:piezas`) y los planes
 * mensuales (`contenidos:planes`). Las etapas son las ocho del flujo editorial (CONTENT_FLOW). */
import { CONTENT_FLOW, clientRequests, contentFlowStep, contentState, type ContentState } from "../modules/content-workflow";
import type { ModuleRecord } from "../modules/types";
import { contentDemoMetrics, type PieceMetric } from "../reports/demo-fixtures";
import { serviceHref } from "../service-workspace-data";
import { finishSnapshot, isBefore, isUpcoming, number, periodComparisons, type SnapshotOptions } from "./common";
import { recordsOf, type MetricsInput } from "./input";
import { inPeriod, shortDate, type MetricPeriod } from "./period";
import { serviceTasks, taskItems } from "./tasks";
import { countMetric, missingMetric, noDataMetric, originOfRecords, type ItemRef, type Metric, type ServiceSnapshot } from "./types";

const SERVICE = "contenidos" as const;
export const CONTENT_SCHEDULED: ContentState[] = ["Programado", "Publicada"];
/** «En revisión o aprobación»: misma lectura que el contador «En revisión» del módulo. */
export function isContentInReview(state: ContentState) {
  return /Revisión|Aprobación/.test(state);
}
export function contentHref(clientSlug: string, id: string) {
  return `${serviceHref(clientSlug, SERVICE)}?seccion=piezas&registro=${encodeURIComponent(id)}`;
}

/** Plan mensual del período: el plan cuyo mes (AAAA-MM) es el del inicio del período. */
export function planForPeriod(plans: ModuleRecord[], period: MetricPeriod) {
  const month = period.start.slice(0, 7);
  return plans.find((plan) => plan.values.mes === month);
}

export function pendingClientRequests(pieces: ModuleRecord[]) {
  return pieces.flatMap((piece) => clientRequests(piece.values).filter((request) => request.status === "Pendiente").map((request) => ({ piece, request })));
}

/** Resultados del período: planificados y publicados por fecha; alcance solo con métricas cargadas. */
export function contentResults(input: MetricsInput, period: MetricPeriod, metrics: Record<string, PieceMetric> = contentDemoMetrics): Metric[] {
  const pieces = recordsOf(input, SERVICE, "piezas");
  const dated = pieces.filter((piece) => inPeriod(piece.values.fecha, period));
  if (!dated.length) return [noDataMetric("planificados", "Contenidos con fecha en el período", "pendiente", "Ningún contenido tiene fecha en el período."), noDataMetric("publicados", "Publicados en el período", "pendiente"), missingMetric("alcance", "Alcance de lo publicado", "no-conectado", "Redes del cliente no conectadas.")];
  const origin = originOfRecords(dated);
  const published = dated.filter((piece) => contentState(piece) === "Publicada");
  const measured = published.filter((piece) => metrics[piece.id]);
  const reach = measured.reduce((sum, piece) => sum + metrics[piece.id].reach, 0);
  const interactions = measured.reduce((sum, piece) => sum + metrics[piece.id].interactions, 0);
  return [
    countMetric("planificados", "Contenidos con fecha en el período", dated.length, origin),
    countMetric("publicados", "Publicados en el período", published.length, origin, { hint: "Estado «Publicada» con fecha dentro del período." }),
    measured.length
      ? { id: "alcance", label: "Alcance de lo publicado", value: reach, display: number(reach), origin: "demo", hint: `${measured.length} ${measured.length === 1 ? "pieza medida" : "piezas medidas"} · métricas de demostración, redes no conectadas.` }
      : missingMetric("alcance", "Alcance de lo publicado", "no-conectado", "Redes del cliente no conectadas: no hay alcance medido."),
    measured.length && reach
      ? { id: "engagement", label: "Engagement de lo publicado", value: (interactions / reach) * 100, display: `${number((interactions / reach) * 100, 1)} %`, origin: "demo", hint: "Interacciones / alcance de las piezas medidas (demo)." }
      : missingMetric("engagement", "Engagement de lo publicado", "no-conectado"),
  ];
}

export function contentSnapshot(input: MetricsInput, options: SnapshotOptions): ServiceSnapshot {
  const { asOf, period } = options;
  const pieces = recordsOf(input, SERVICE, "piezas");
  const plans = recordsOf(input, SERVICE, "planes");
  const origin = originOfRecords(pieces);
  const tasks = serviceTasks(input.tasks, SERVICE, asOf);
  const state = (piece: ModuleRecord) => contentState(piece);
  const plan = planForPeriod(plans, period);
  const planPieces = plan ? pieces.filter((piece) => piece.values.plan === plan.id) : [];
  const review = pieces.filter((piece) => isContentInReview(state(piece)));
  const waitingInfo = pieces.filter((piece) => state(piece) === "Información del cliente");
  const requests = pendingClientRequests(pieces);
  const overdue = pieces.filter((piece) => isBefore(piece.values.fecha, asOf) && !CONTENT_SCHEDULED.includes(state(piece)));
  const upcoming = pieces.filter((piece) => isUpcoming(piece.values.fecha, asOf) && state(piece) !== "Publicada");
  const href = (id: string) => contentHref(input.clientSlug, id);
  const configured = pieces.length > 0 || plans.length > 0 || tasks.open.length > 0;
  const has = pieces.length > 0;

  const planMetric: Metric = plan
    ? { id: "plan", label: `Plan de ${period.label}`, value: planPieces.length, display: `${plan.values.estado || "Sin estado"} · ${planPieces.length}/${plan.values.cantidad || "—"} contenidos`, origin: originOfRecords([plan]), href: `${serviceHref(input.clientSlug, SERVICE)}?seccion=planes&plan=${encodeURIComponent(plan.id)}`, hint: plan.values.nombre }
    : missingMetric("plan", `Plan de ${period.label}`, "pendiente", "No hay un plan mensual cargado para este mes.");
  const indicators: Metric[] = has ? [
    planMetric,
    countMetric("revision", "En revisión o aprobación", review.length, origin, { href: `${serviceHref(input.clientSlug, SERVICE)}?seccion=piezas`, hint: "Revisiones internas, del cliente y aprobación final." }),
    countMetric("proximas", "Próximas publicaciones (14 días)", upcoming.length, origin, { href: `${serviceHref(input.clientSlug, SERVICE)}?seccion=calendario` }),
    countMetric("material", "Material pedido al cliente", requests.length + waitingInfo.filter((piece) => !requests.some((item) => item.piece.id === piece.id)).length, origin, { hint: "Pedidos estructurados pendientes y contenidos esperando información del cliente." }),
  ] : [planMetric, noDataMetric("piezas", "Contenidos del calendario", "pendiente", "Todavía no hay contenidos cargados.")];

  const attention: ItemRef[] = [
    ...overdue.map((piece): ItemRef => ({ id: piece.id, title: piece.values.titulo || piece.id, detail: `Fecha ${shortDate(piece.values.fecha)} vencida · ${state(piece)}`, kind: "vencido", href: href(piece.id), date: piece.values.fecha, origin: originOfRecords([piece]) })),
    ...requests.map(({ piece, request }): ItemRef => ({ id: `${piece.id}-${request.id}`, title: piece.values.titulo || piece.id, detail: `Pedido al cliente · ${request.type}: ${request.detail}`, kind: "cliente", href: href(piece.id), date: piece.values.fecha, origin: originOfRecords([piece]) })),
    ...review.filter((piece) => !overdue.includes(piece)).map((piece): ItemRef => ({ id: piece.id, title: piece.values.titulo || piece.id, detail: `${state(piece)} · publica ${shortDate(piece.values.fecha)}`, kind: "aprobacion", href: href(piece.id), date: piece.values.fecha, origin: originOfRecords([piece]) })),
    ...taskItems(input.clientSlug, tasks),
  ];
  const results = contentResults(input, period);
  return finishSnapshot({
    serviceId: SERVICE, options, configured, clientSlug: input.clientSlug,
    signals: { hasData: configured, blocked: tasks.blocked.length, overdue: overdue.length + tasks.late.length, kpiRed: 0, kpiYellow: 0, approvals: review.length + tasks.approvals.length, clientPending: requests.length + waitingInfo.length, pendingReview: 0 },
    indicators,
    results,
    comparisons: periodComparisons((current) => contentResults(input, current), options, { publicados: "up", alcance: "up" }),
    charts: has ? [{ kind: "bars", id: "content-stages", title: "Contenidos por etapa del flujo", items: CONTENT_FLOW.map((step) => ({ label: step.label, value: pieces.filter((piece) => contentFlowStep(state(piece)) === step.step).length })), href: `${serviceHref(input.clientSlug, SERVICE)}?seccion=piezas`, origin }] : [],
    attention,
    upcoming: upcoming.map((piece): ItemRef => ({ id: piece.id, title: piece.values.titulo || piece.id, detail: `${piece.values.canal || "Sin canal"} · ${state(piece)}`, kind: "proximo", href: href(piece.id), date: piece.values.fecha, origin: originOfRecords([piece]) })),
    notes: [has ? `Etapas al ${shortDate(asOf)}. Publicaciones y alcance medidos en ${period.label}; el alcance es de demostración (redes no conectadas).` : "Sin contenidos cargados: el estado no se evalúa como éxito."],
    origins: [origin],
  });
}
