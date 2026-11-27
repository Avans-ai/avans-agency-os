/* Diseño de marca · métricas desde los pedidos (`diseno-marca:trabajos`).
 * La etapa de cada pedido es la del tablero de la operación (designStage): los pedidos que
 * nacen de Contenidos siguen el estado de su contenido de origen. */
import { DESIGN_STAGES, designStage, type DesignStage } from "../modules/design-operation";
import type { ModuleRecord } from "../modules/types";
import { serviceHref } from "../service-workspace-data";
import { finishSnapshot, isBefore, isUpcoming, periodComparisons, type SnapshotOptions } from "./common";
import { recordsOf, type MetricsInput } from "./input";
import { inPeriod, shortDate, type MetricPeriod } from "./period";
import { serviceTasks, taskItems } from "./tasks";
import { countMetric, noDataMetric, originOfRecords, type ItemRef, type Metric, type ServiceSnapshot } from "./types";

const SERVICE = "diseno-marca" as const;
export const DESIGN_DONE: DesignStage[] = ["Aprobados", "Entregados"];
export const DESIGN_IN_PRODUCTION: DesignStage[] = ["En producción", "Ajustes"];
export const DESIGN_IN_REVIEW: DesignStage[] = ["En revisión interna", "Esperando aprobación"];

export function designRequestHref(clientSlug: string, id: string) {
  return `${serviceHref(clientSlug, SERVICE)}?seccion=trabajos&registro=${encodeURIComponent(id)}`;
}

export function stagedDesignRequests(input: MetricsInput) {
  const contents = recordsOf(input, "contenidos", "piezas");
  return recordsOf(input, SERVICE, "trabajos").map((record) => ({ record, stage: designStage(record, record.values.contenidoId ? contents.find((item) => item.id === record.values.contenidoId) : undefined) }));
}

/** Fecha de entrega de un pedido terminado: la registrada o, si falta, la fecha objetivo. */
function deliveryDate(record: ModuleRecord) {
  return record.values.fechaEntrega || record.values.fechaObjetivo;
}

/** Resultados fechados del período: comprometidas (fecha objetivo) y entregadas. */
export function designResults(input: MetricsInput, period: MetricPeriod): Metric[] {
  const staged = stagedDesignRequests(input);
  const planned = staged.filter(({ record }) => inPeriod(record.values.fechaObjetivo, period));
  const delivered = staged.filter(({ record, stage }) => DESIGN_DONE.includes(stage) && inPeriod(deliveryDate(record), period));
  const dated = staged.filter(({ record }) => inPeriod(record.values.fechaObjetivo, period) || inPeriod(record.values.fechaEntrega, period));
  const origin = originOfRecords(dated.map(({ record }) => record));
  if (!dated.length) return [noDataMetric("comprometidas", "Entregas comprometidas en el período", "pendiente", "Ningún pedido tiene fecha en el período."), noDataMetric("entregadas", "Piezas aprobadas o entregadas en el período", "pendiente")];
  return [
    countMetric("comprometidas", "Entregas comprometidas en el período", planned.length, origin, { hint: "Pedidos con fecha objetivo dentro del período." }),
    countMetric("entregadas", "Piezas aprobadas o entregadas en el período", delivered.length, origin, { hint: "Pedidos aprobados o entregados con fecha de entrega (o fecha objetivo) en el período." }),
  ];
}

export function designSnapshot(input: MetricsInput, options: SnapshotOptions): ServiceSnapshot {
  const { asOf } = options;
  const staged = stagedDesignRequests(input);
  const records = staged.map(({ record }) => record);
  const origin = originOfRecords(records);
  const open = staged.filter(({ stage }) => !DESIGN_DONE.includes(stage));
  const production = open.filter(({ stage }) => DESIGN_IN_PRODUCTION.includes(stage));
  const review = open.filter(({ stage }) => DESIGN_IN_REVIEW.includes(stage));
  const approvals = open.filter(({ stage }) => stage === "Esperando aprobación");
  const delayed = open.filter(({ record }) => isBefore(record.values.fechaObjetivo, asOf));
  const upcoming = open.filter(({ record }) => isUpcoming(record.values.fechaObjetivo, asOf));
  const tasks = serviceTasks(input.tasks, SERVICE, asOf);
  const href = (id: string) => designRequestHref(input.clientSlug, id);
  const line = ({ record, stage }: { record: ModuleRecord; stage: DesignStage }) => `${stage} · entrega ${shortDate(record.values.fechaObjetivo)} · ${record.values.responsable || "Sin responsable"}`;
  const configured = records.length > 0 || tasks.open.length > 0;
  const has = records.length > 0;

  const indicators: Metric[] = has ? [
    countMetric("produccion", "Solicitudes en producción", production.length, origin, { hint: "En producción o en ajustes.", href: `${serviceHref(input.clientSlug, SERVICE)}?seccion=operacion` }),
    countMetric("revision", "Piezas en revisión", review.length, origin, { hint: "Revisión interna o esperando aprobación." }),
    countMetric("proximas", "Próximas entregas (14 días)", upcoming.length, origin),
    countMetric("demorados", "Trabajos demorados", delayed.length, origin, { hint: "Fecha objetivo vencida sin aprobar ni entregar.", light: delayed.length ? "rojo" : "verde" }),
  ] : [noDataMetric("pedidos", "Pedidos de diseño", "pendiente", "Todavía no hay pedidos cargados en el módulo.")];

  const attention: ItemRef[] = [
    ...delayed.map((item): ItemRef => ({ id: item.record.id, title: item.record.values.nombre || item.record.id, detail: `Vencido · ${line(item)}`, kind: "vencido", href: href(item.record.id), date: item.record.values.fechaObjetivo, origin: originOfRecords([item.record]) })),
    ...approvals.filter((item) => !delayed.includes(item)).map((item): ItemRef => ({ id: item.record.id, title: item.record.values.nombre || item.record.id, detail: `Esperando aprobación · ${item.record.values.revisor ? `revisa ${item.record.values.revisor}` : "revisor por asignar"}`, kind: "aprobacion", href: href(item.record.id), date: item.record.values.fechaObjetivo, origin: originOfRecords([item.record]) })),
    ...taskItems(input.clientSlug, tasks),
  ];

  const results = designResults(input, options.period);
  const comparisons = periodComparisons((period) => designResults(input, period), options, { entregadas: "up" });
  return finishSnapshot({
    serviceId: SERVICE, options, configured, clientSlug: input.clientSlug,
    signals: { hasData: configured, blocked: tasks.blocked.length, overdue: delayed.length + tasks.late.length, kpiRed: 0, kpiYellow: 0, approvals: approvals.length + tasks.approvals.length, clientPending: 0, pendingReview: 0 },
    indicators,
    results,
    comparisons,
    charts: has ? [{ kind: "bars", id: "design-stages", title: "Solicitudes por estado", items: DESIGN_STAGES.map((stage) => ({ label: stage, value: staged.filter((item) => item.stage === stage).length })), href: `${serviceHref(input.clientSlug, SERVICE)}?seccion=operacion`, origin }] : [],
    attention,
    upcoming: upcoming.map((item): ItemRef => ({ id: item.record.id, title: item.record.values.nombre || item.record.id, detail: `Entrega · ${line(item)}`, kind: "proximo", href: href(item.record.id), date: item.record.values.fechaObjetivo, origin: originOfRecords([item.record]) })),
    notes: [has ? `Estados al ${shortDate(asOf)} según el tablero de la operación. Las entregas fechadas se miden en ${options.period.label}.` : "Sin pedidos de diseño: el estado no se evalúa como éxito."],
    origins: [origin],
  });
}
