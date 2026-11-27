/* Avans OS · definiciones de métricas compartidas (Inicio del cliente y Reportes).
 * Tipos serializables: una instantánea de reporte se guarda tal cual en el navegador,
 * así que no hay funciones ni fechas como objetos, solo texto y números. */
import type { ServiceId } from "../os-data";
import type { MetricPeriod } from "./period";
import type { HealthReading } from "./service-health";

/** Procedencia de cada dato. Nunca se muestra un cero o un éxito cuando el dato falta. */
export type DataOrigin = "real" | "demo" | "pendiente" | "no-conectado";
export const ORIGIN_LABEL: Record<DataOrigin, string> = {
  real: "Real",
  demo: "Demo",
  pendiente: "Pendiente de configurar",
  "no-conectado": "No conectado",
};
export const ORIGIN_DETAIL: Record<DataOrigin, string> = {
  real: "Registrado en el módulo (carga del equipo o integración).",
  demo: "Dato de demostración rotulado: no proviene del cliente ni de una plataforma.",
  pendiente: "El módulo todavía no tiene esta información configurada.",
  "no-conectado": "Requiere una integración que no está conectada: no se muestran cifras.",
};

export type Metric = {
  id: string;
  label: string;
  /** null = sin datos. La vista muestra `display` («Sin datos», «Pendiente de configurar»), nunca 0. */
  value: number | null;
  display: string;
  origin: DataOrigin;
  hint?: string;
  href?: string;
  light?: "verde" | "amarillo" | "rojo" | "gris";
};

export type ItemKind = "bloqueo" | "vencido" | "aprobacion" | "cliente" | "revision" | "proximo";
export const ITEM_KIND_LABEL: Record<ItemKind, string> = {
  bloqueo: "Bloqueo",
  vencido: "Vencido",
  aprobacion: "Aprobación pendiente",
  cliente: "Pedido al cliente",
  revision: "Para revisar",
  proximo: "Próxima fecha",
};

export type ItemRef = {
  id: string;
  title: string;
  detail: string;
  kind: ItemKind;
  /** Enlace al elemento concreto o a la vista filtrada del módulo. */
  href: string;
  date?: string;
  origin: DataOrigin;
};

export type ChartSpec =
  | { kind: "bars"; id: string; title: string; items: { label: string; value: number }[]; href?: string; origin: DataOrigin; unit?: string }
  | { kind: "line"; id: string; title: string; labels: string[]; values: number[]; format: "money" | "number"; origin: DataOrigin };

/** Comparación con el período anterior: solo existe cuando ambos períodos tienen datos. */
export type Comparison = {
  id: string;
  label: string;
  current: number;
  previous: number;
  currentDisplay: string;
  previousDisplay: string;
  /** Variación porcentual; null si el período anterior vale 0. */
  delta: number | null;
  better: "up" | "down";
  origin: DataOrigin;
};

export type ServiceSnapshot = {
  serviceId: ServiceId;
  label: string;
  period: MetricPeriod;
  /** Fecha de corte (AAAA-MM-DD) de los estados operativos. */
  asOf: string;
  /** El módulo tiene datos propios para evaluar (registros o tareas). */
  configured: boolean;
  health: HealthReading;
  indicators: Metric[];
  /** Resultados del período (fechados). */
  results: Metric[];
  comparisons: Comparison[];
  charts: ChartSpec[];
  attention: ItemRef[];
  upcoming: ItemRef[];
  /** Notas de lectura: qué período miden, qué es demo, qué no está conectado. */
  notes: string[];
  origin: DataOrigin;
  moduleHref: string;
};

/** Combina procedencias: demo «contamina» (se rotula), real solo si todo es real. */
export function mergeOrigins(origins: DataOrigin[]): DataOrigin {
  if (!origins.length) return "pendiente";
  if (origins.includes("demo")) return "demo";
  if (origins.includes("real")) return "real";
  if (origins.includes("no-conectado")) return "no-conectado";
  return "pendiente";
}

export function originOfRecords(records: { source: string }[]): DataOrigin {
  if (!records.length) return "pendiente";
  return records.some((record) => record.source === "demo") ? "demo" : "real";
}

export const NO_DATA = "Sin datos";
export const NOT_CONFIGURED = "Pendiente de configurar";
export const NOT_CONNECTED = "No conectado";

export function countMetric(id: string, label: string, count: number, origin: DataOrigin, extra: Partial<Metric> = {}): Metric {
  return { id, label, value: count, display: String(count), origin, ...extra };
}
export function missingMetric(id: string, label: string, origin: Exclude<DataOrigin, "real" | "demo">, hint?: string): Metric {
  return { id, label, value: null, display: origin === "pendiente" ? NOT_CONFIGURED : origin === "no-conectado" ? NOT_CONNECTED : NO_DATA, origin, hint };
}
export function noDataMetric(id: string, label: string, origin: DataOrigin, hint?: string): Metric {
  return { id, label, value: null, display: NO_DATA, origin, hint };
}

/** Lectura en texto del semáforo de un indicador (siempre acompaña al color). */
export function lightText(metric: Pick<Metric, "id" | "light">) {
  if (metric.id === "gasto-mes") return metric.light === "verde" ? "Ritmo de gasto en rango" : metric.light === "amarillo" ? "Ritmo de gasto para vigilar" : "Ritmo de gasto fuera de rango";
  return metric.light === "verde" ? "En objetivo" : metric.light === "amarillo" ? "Cerca del objetivo" : "Fuera de objetivo";
}
