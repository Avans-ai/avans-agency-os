/* Punto de entrada único de las métricas por servicio. El Inicio del cliente y el generador
 * de Reportes llaman a `serviceSnapshot` con la misma entrada y el mismo período: no hay
 * fórmulas distintas por pantalla. */
import type { ServiceId } from "../os-data";
import { avSnapshot } from "./audiovisual";
import type { SnapshotOptions } from "./common";
import { contentSnapshot } from "./content";
import { designSnapshot } from "./design";
import type { MetricsInput } from "./input";
import { genericSnapshot, strategySnapshot, webSnapshot } from "./other";
import { paidSnapshot } from "./paid";
import type { ServiceSnapshot } from "./types";

/** Versión de las definiciones: se guarda con cada instantánea de reporte. */
export const METRICS_VERSION = "metrics-2026-11-v1";

export function serviceSnapshot(serviceId: ServiceId, input: MetricsInput, options: SnapshotOptions): ServiceSnapshot {
  switch (serviceId) {
    case "diseno-marca": return designSnapshot(input, options);
    case "contenidos": return contentSnapshot(input, options);
    case "publicidad-digital": return paidSnapshot(input, options);
    case "audiovisuales": return avSnapshot(input, options);
    case "estrategia": return strategySnapshot(input, options);
    case "desarrollo-web": return webSnapshot(input, options);
    default: return genericSnapshot(input, serviceId, options);
  }
}

export function serviceSnapshots(services: ServiceId[], input: MetricsInput, options: SnapshotOptions) {
  return services.map((serviceId) => serviceSnapshot(serviceId, input, options));
}

export type { MetricsInput } from "./input";
export type { SnapshotOptions } from "./common";
export type { ServiceSnapshot, Metric, ItemRef, ChartSpec, Comparison, DataOrigin } from "./types";
