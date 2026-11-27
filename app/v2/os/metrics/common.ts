/* Piezas comunes a los cálculos de cada servicio. */
import { serviceLabel, type ServiceId } from "../os-data";
import { serviceHref } from "../service-workspace-data";
import { addDays, inPeriod, isIsoDate, previousPeriod, type MetricPeriod } from "./period";
import { evaluateHealth, type HealthSignals } from "./service-health";
import { mergeOrigins, type ChartSpec, type Comparison, type DataOrigin, type ItemRef, type Metric, type ServiceSnapshot } from "./types";

/** Horizonte de «próximas fechas»: 14 días desde la fecha de corte (igual que Contenidos). */
export const UPCOMING_DAYS = 14;

export type SnapshotOptions = { period: MetricPeriod; asOf: string; /** Calcular comparaciones con el período anterior. */ compare?: boolean };

export function upcomingWindow(asOf: string) {
  return { start: asOf, end: addDays(asOf, UPCOMING_DAYS) };
}
export function isBefore(date: string | undefined, asOf: string) {
  return isIsoDate(date) && date < asOf;
}
export function isUpcoming(date: string | undefined, asOf: string) {
  return inPeriod(date, upcomingWindow(asOf));
}
export function byDate(a: ItemRef, b: ItemRef) {
  return (a.date || "9999").localeCompare(b.date || "9999");
}

export function percentDelta(current: number, previous: number) {
  return previous ? ((current - previous) / previous) * 100 : null;
}

export function compare(id: string, label: string, current: Metric | undefined, previous: Metric | undefined, better: "up" | "down"): Comparison | null {
  if (!current || !previous || current.value === null || previous.value === null) return null;
  return { id, label, current: current.value, previous: previous.value, currentDisplay: current.display, previousDisplay: previous.display, delta: percentDelta(current.value, previous.value), better, origin: mergeOrigins([current.origin, previous.origin]) };
}

/** Resultados del período actual y del anterior con la misma función: comparaciones honestas. */
export function periodComparisons(results: (period: MetricPeriod) => Metric[], options: SnapshotOptions, better: Record<string, "up" | "down">): Comparison[] {
  if (!options.compare) return [];
  const current = results(options.period);
  const previous = results(previousPeriod(options.period));
  return current.flatMap((metric) => {
    if (!(metric.id in better)) return [];
    const item = compare(metric.id, metric.label, metric, previous.find((candidate) => candidate.id === metric.id), better[metric.id]);
    return item ? [item] : [];
  });
}

export function finishSnapshot(input: {
  serviceId: ServiceId;
  options: SnapshotOptions;
  configured: boolean;
  signals: HealthSignals;
  indicators: Metric[];
  results?: Metric[];
  comparisons?: Comparison[];
  charts?: ChartSpec[];
  attention?: ItemRef[];
  upcoming?: ItemRef[];
  notes?: string[];
  origins: DataOrigin[];
  clientSlug: string;
}): ServiceSnapshot {
  return {
    serviceId: input.serviceId,
    label: serviceLabel(input.serviceId),
    period: input.options.period,
    asOf: input.options.asOf,
    configured: input.configured,
    health: evaluateHealth({ ...input.signals, hasData: input.configured && input.signals.hasData }),
    indicators: input.indicators,
    results: input.results ?? [],
    comparisons: input.comparisons ?? [],
    charts: input.charts ?? [],
    attention: input.attention ?? [],
    upcoming: [...(input.upcoming ?? [])].sort(byDate),
    notes: input.notes ?? [],
    origin: mergeOrigins(input.origins),
    moduleHref: serviceHref(input.clientSlug, input.serviceId),
  };
}

export function money(value: number) {
  return `$ ${Math.round(value).toLocaleString("es-AR")}`;
}
export function moneyShort(value: number) {
  if (Math.abs(value) >= 1_000_000) return `$ ${(value / 1_000_000).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M`;
  if (Math.abs(value) >= 10_000) return `$ ${Math.round(value / 1000).toLocaleString("es-AR")} mil`;
  return money(value);
}
export function number(value: number, digits = 0) {
  return value.toLocaleString("es-AR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
export function percent(value: number, digits = 1) {
  return `${number(value, digits)} %`;
}
