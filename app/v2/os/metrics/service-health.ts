/* Semáforo de estado por servicio. Reglas puras, deterministas y documentadas
 * (docs/REPORTS_GENERATOR.md). El color siempre va acompañado de un texto y un ícono:
 *
 *  Gris  · «Sin datos»          → el módulo no tiene registros ni tareas para evaluar.
 *  Rojo  · «En riesgo»          → al menos un bloqueo activo, un trabajo vencido, un KPI
 *                                  fuera de objetivo (> 15 %), ritmo de gasto en rojo o el
 *                                  cupo de jornadas excedido.
 *  Amarillo · «Requiere atención» → sin rojos, pero con aprobaciones pendientes, pedidos de
 *                                  material al cliente, elementos para revisar, KPI hasta
 *                                  15 % fuera de objetivo, ritmo de gasto en amarillo o el
 *                                  cupo de jornadas sin configurar.
 *  Verde · «En orden»            → hay datos y no se cumple ninguna de las anteriores.
 *
 * El motivo muestra las dos causas de mayor peso del nivel resultante. */

export type HealthLevel = "verde" | "amarillo" | "rojo" | "gris";
export type Light = HealthLevel;

export type HealthSignals = {
  hasData: boolean;
  blocked: number;
  overdue: number;
  kpiRed: number;
  kpiYellow: number;
  pacing?: Light;
  quotaExceeded?: boolean;
  quotaUndefined?: boolean;
  approvals: number;
  clientPending: number;
  pendingReview: number;
};

export type HealthReading = { level: HealthLevel; label: string; reason: string; icon: "check" | "alert" | "blocked" | "minus" };

export const HEALTH_LABEL: Record<HealthLevel, string> = { verde: "En orden", amarillo: "Requiere atención", rojo: "En riesgo", gris: "Sin datos" };
export const HEALTH_ICON: Record<HealthLevel, HealthReading["icon"]> = { verde: "check", amarillo: "alert", rojo: "blocked", gris: "minus" };

export const HEALTH_RULES: { level: HealthLevel; label: string; rule: string }[] = [
  { level: "rojo", label: HEALTH_LABEL.rojo, rule: "Hay al menos un bloqueo activo, un trabajo vencido, un indicador más de 15 % fuera de objetivo, ritmo de gasto en rojo o el cupo de jornadas excedido." },
  { level: "amarillo", label: HEALTH_LABEL.amarillo, rule: "Sin rojos, pero con aprobaciones pendientes, pedidos de material al cliente, elementos para revisar, un indicador hasta 15 % fuera de objetivo, ritmo de gasto en amarillo o el cupo sin configurar." },
  { level: "verde", label: HEALTH_LABEL.verde, rule: "Hay datos del módulo y no se cumple ninguna condición roja ni amarilla." },
  { level: "gris", label: HEALTH_LABEL.gris, rule: "El módulo no tiene registros ni tareas para evaluar. No se muestra como éxito." },
];

export const EMPTY_SIGNALS: HealthSignals = { hasData: false, blocked: 0, overdue: 0, kpiRed: 0, kpiYellow: 0, approvals: 0, clientPending: 0, pendingReview: 0 };

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function evaluateHealth(signals: HealthSignals): HealthReading {
  if (!signals.hasData) return { level: "gris", label: HEALTH_LABEL.gris, reason: "El módulo todavía no tiene registros ni tareas para evaluar.", icon: HEALTH_ICON.gris };
  const red = [
    signals.blocked > 0 ? plural(signals.blocked, "bloqueo activo", "bloqueos activos") : "",
    signals.overdue > 0 ? plural(signals.overdue, "trabajo vencido", "trabajos vencidos") : "",
    signals.kpiRed > 0 ? plural(signals.kpiRed, "indicador fuera de objetivo", "indicadores fuera de objetivo") : "",
    signals.pacing === "rojo" ? "ritmo de gasto fuera de rango" : "",
    signals.quotaExceeded ? "cupo de jornadas excedido" : "",
  ].filter(Boolean);
  if (red.length) return { level: "rojo", label: HEALTH_LABEL.rojo, reason: sentence(red), icon: HEALTH_ICON.rojo };
  const yellow = [
    signals.approvals > 0 ? plural(signals.approvals, "aprobación pendiente", "aprobaciones pendientes") : "",
    signals.clientPending > 0 ? plural(signals.clientPending, "pedido al cliente sin respuesta", "pedidos al cliente sin respuesta") : "",
    signals.pendingReview > 0 ? plural(signals.pendingReview, "elemento para revisar", "elementos para revisar") : "",
    signals.kpiYellow > 0 ? plural(signals.kpiYellow, "indicador cerca del objetivo", "indicadores cerca del objetivo") : "",
    signals.pacing === "amarillo" ? "ritmo de gasto para vigilar" : "",
    signals.quotaUndefined ? "cupo de jornadas sin configurar" : "",
  ].filter(Boolean);
  if (yellow.length) return { level: "amarillo", label: HEALTH_LABEL.amarillo, reason: sentence(yellow), icon: HEALTH_ICON.amarillo };
  return { level: "verde", label: HEALTH_LABEL.verde, reason: "Sin bloqueos, vencimientos ni aprobaciones pendientes.", icon: HEALTH_ICON.verde };
}

function sentence(parts: string[]) {
  const text = parts.slice(0, 2).join(" · ");
  const rest = parts.length > 2 ? ` · y ${parts.length - 2} más` : "";
  return `${text.charAt(0).toLocaleUpperCase("es")}${text.slice(1)}${rest}.`;
}
