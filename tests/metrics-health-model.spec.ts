import { test, expect } from "@playwright/test";
import { serviceSnapshot } from "../app/v2/os/metrics";
import { customPeriod, inPeriod, monthPeriod, previousPeriod, weekPeriod } from "../app/v2/os/metrics/period";
import { EMPTY_SIGNALS, evaluateHealth, HEALTH_RULES } from "../app/v2/os/metrics/service-health";
import { DESIGN_DONE, stagedDesignRequests } from "../app/v2/os/metrics/design";
import { paidResults } from "../app/v2/os/metrics/paid";
import { quotaUsage } from "../app/v2/os/modules/av-model";
import { weeklyKpis } from "../app/v2/os/modules/paid-metrics";
import type { MetricsInput } from "../app/v2/os/metrics/input";
import { seedMetricsInput } from "./metrics-fixtures";

const asOf = "2026-11-27";
const options = { period: monthPeriod("2026-11"), asOf };
const empty = (slug: string): MetricsInput => ({ clientSlug: slug, tasks: [], records: {}, quota: null });

test("traffic light rules: grey without data, red beats yellow, yellow beats green; always a label and a reason", () => {
  expect(evaluateHealth(EMPTY_SIGNALS)).toMatchObject({ level: "gris", label: "Sin datos" });
  const base = { ...EMPTY_SIGNALS, hasData: true };
  expect(evaluateHealth(base)).toMatchObject({ level: "verde", label: "En orden" });
  expect(evaluateHealth({ ...base, approvals: 2 })).toMatchObject({ level: "amarillo", label: "Requiere atención", reason: "2 aprobaciones pendientes." });
  expect(evaluateHealth({ ...base, approvals: 2, blocked: 1 })).toMatchObject({ level: "rojo", label: "En riesgo", reason: "1 bloqueo activo." });
  expect(evaluateHealth({ ...base, overdue: 3, kpiRed: 1, pacing: "rojo" }).reason).toBe("3 trabajos vencidos · 1 indicador fuera de objetivo · y 1 más.");
  expect(evaluateHealth({ ...base, quotaUndefined: true }).level).toBe("amarillo");
  expect(evaluateHealth({ ...base, quotaExceeded: true }).level).toBe("rojo");
  expect(evaluateHealth({ ...base, pacing: "amarillo" }).level).toBe("amarillo");
  expect(HEALTH_RULES.map((rule) => rule.level)).toEqual(["rojo", "amarillo", "verde", "gris"]);
  for (const reading of [evaluateHealth(EMPTY_SIGNALS), evaluateHealth(base), evaluateHealth({ ...base, blocked: 1 })]) {
    expect(reading.label.length).toBeGreaterThan(0);
    expect(reading.icon).toBeTruthy();
  }
});

test("periods: month, ISO week, custom, previous period of equal length, inclusive bounds", () => {
  expect(monthPeriod("2026-11")).toEqual({ kind: "mes", start: "2026-11-01", end: "2026-11-30", label: "Noviembre 2026" });
  expect(previousPeriod(monthPeriod("2026-03"))).toMatchObject({ start: "2026-02-01", end: "2026-02-28", label: "Febrero 2026" });
  expect(weekPeriod("2026-11-27")).toMatchObject({ start: "2026-11-23", end: "2026-11-29", label: "Semana del 23 al 29 de noviembre de 2026" });
  expect(previousPeriod(weekPeriod("2026-11-27")).start).toBe("2026-11-16");
  const custom = customPeriod("2026-10-12", "2026-11-08");
  expect(custom.label).toBe("12 de octubre al 8 de noviembre de 2026");
  expect(previousPeriod(custom)).toMatchObject({ start: "2026-09-14", end: "2026-10-11" });
  expect(inPeriod("2026-11-30", monthPeriod("2026-11"))).toBe(true);
  expect(inPeriod("2026-12-01", monthPeriod("2026-11"))).toBe(false);
  expect(() => customPeriod("2026-11-10", "2026-11-01")).toThrow();
});

test("a module without data is «Sin datos» / «Pendiente de configurar», never zero or success", () => {
  for (const serviceId of ["diseno-marca", "contenidos", "publicidad-digital", "audiovisuales", "estrategia", "desarrollo-web", "crm"] as const) {
    const snapshot = serviceSnapshot(serviceId, empty("aca"), options);
    expect(snapshot.health.level, serviceId).toBe("gris");
    expect(snapshot.configured).toBe(false);
    for (const metric of [...snapshot.indicators, ...snapshot.results]) {
      expect(metric.value, `${serviceId} ${metric.id}`).toBeNull();
      expect(metric.display).toMatch(/Sin datos|Pendiente de configurar|No conectado/);
    }
    expect(snapshot.comparisons).toEqual([]);
  }
});

test("design indicators come from `diseno-marca:trabajos` with the board stage", () => {
  const input = seedMetricsInput("aca");
  const staged = stagedDesignRequests(input);
  const snapshot = serviceSnapshot("diseno-marca", input, options);
  const open = staged.filter((item) => !DESIGN_DONE.includes(item.stage));
  const value = (id: string) => snapshot.indicators.find((metric) => metric.id === id)!.value;
  expect(value("produccion")).toBe(open.filter((item) => ["En producción", "Ajustes"].includes(item.stage)).length);
  expect(value("revision")).toBe(open.filter((item) => ["En revisión interna", "Esperando aprobación"].includes(item.stage)).length);
  expect(value("demorados")).toBe(open.filter((item) => item.record.values.fechaObjetivo && item.record.values.fechaObjetivo < asOf).length);
  const chart = snapshot.charts.find((item) => item.id === "design-stages");
  expect(chart?.kind === "bars" && chart.items.reduce((sum, item) => sum + item.value, 0)).toBe(staged.length);
  expect(snapshot.origin).toBe("demo");
  expect(snapshot.attention.every((item) => item.href.startsWith("/v2/clientes/aca/"))).toBe(true);
});

test("paid indicators reuse the module KPIs and budget; results per period with the module formula", () => {
  const input = seedMetricsInput("aca");
  const snapshot = serviceSnapshot("publicidad-digital", input, options);
  const kpis = weeklyKpis("aca", input.records["publicidad-digital"]!.campanas);
  expect(snapshot.indicators.find((metric) => metric.id === "kpi-leads")!.display).toBe(kpis.kpis.find((kpi) => kpi.id === "leads")!.display);
  const october = paidResults(input, monthPeriod("2026-10"));
  const leads = october.find((metric) => metric.id === "leads")!;
  const spend = october.find((metric) => metric.id === "inversion")!;
  expect(october.find((metric) => metric.id === "cpl")!.value).toBeCloseTo(spend.value! / leads.value!, 6);
  expect(leads.origin).toBe("demo");
  // Sin semanas en el período: no conectado, sin cifras.
  expect(paidResults(input, monthPeriod("2025-01")).every((metric) => metric.value === null && metric.origin === "no-conectado")).toBe(true);
});

test("audiovisual quota uses the module rule; content counts follow the editorial flow", () => {
  const input = seedMetricsInput("edinovo");
  const av = serviceSnapshot("audiovisuales", input, options);
  const usage = quotaUsage(input.quota!, input.records.audiovisuales!.jornadas);
  expect(av.indicators.find((metric) => metric.id === "cupo")!.display).toBe(`${usage.used} de ${usage.contracted}`);
  expect(av.indicators.find((metric) => metric.id === "disponibles")!.value).toBe(usage.available);
  const content = serviceSnapshot("contenidos", seedMetricsInput("aca"), options);
  const chart = content.charts.find((item) => item.id === "content-stages");
  expect(chart?.kind === "bars" && chart.items.map((item) => item.label)).toHaveLength(8);
  // Aislamiento: la entrada de un cliente nunca produce enlaces ni datos de otro.
  expect(JSON.stringify(content)).not.toMatch(/epsa|EPSA/);
});
