import { test, expect } from "@playwright/test";
import { osClients, osTasks, type OsTask } from "../app/v2/os/os-data";
import { serviceForTask, withTaskService, isArchivedTask, tasksForService } from "../app/v2/os/director-data";
import { buildContentReport, buildPaidMediaReport, buildReportSnapshot, totalsOf } from "../app/v2/os/reports/builders";
import { contentDemoMetrics, contentDemoSeries, PAID_WEEKS, paidDemoMetrics } from "../app/v2/os/reports/demo-fixtures";
import { projectInput } from "../app/v2/os/metrics/input";
import { weekPeriod, monthPeriod } from "../app/v2/os/metrics/period";
import { seedMetricsInput } from "./metrics-fixtures";
import { moduleDemoSeeds } from "../app/v2/os/modules/demo-fixtures";
import { moduleCollections } from "../app/v2/os/modules/collections";

const epsa = osClients.find((client) => client.slug === "epsa")!;
const aca = osClients.find((client) => client.slug === "aca")!;

test("every seed task declares exactly one module and migration fills legacy tasks without touching other fields", () => {
  for (const task of osTasks) expect(task.serviceId, task.id).toBeTruthy();
  const legacy = osTasks.map((task) => {
    const copy: OsTask = { ...task };
    delete copy.serviceId;
    return copy;
  });
  const migrated = legacy.map(withTaskService);
  expect(migrated).toHaveLength(osTasks.length);
  migrated.forEach((task, index) => {
    expect(task.serviceId).toBe(osTasks[index].serviceId);
    expect({ ...task, serviceId: undefined }).toEqual({ ...legacy[index], serviceId: undefined });
  });
  const explicit = { ...osTasks[0], serviceId: "contenidos" as const };
  expect(serviceForTask(explicit)).toBe("contenidos");
});

test("tasks per module are isolated per client and the 30-day archive rule applies", () => {
  const paidEpsa = tasksForService(osTasks, "epsa", "publicidad-digital").map((task) => task.id);
  expect(paidEpsa).toEqual(expect.arrayContaining(["T-143", "T-146", "T-148"]));
  expect(paidEpsa).not.toContain("T-142");
  expect(paidEpsa).not.toContain("T-403");
  const archived = osTasks.find((task) => task.id === "T-148")!;
  expect(isArchivedTask(archived)).toBe(true);
  expect(isArchivedTask({ ...archived, completedAt: new Date().toISOString() })).toBe(false);
});

test("weekly report derives tasks per module, honours the selected services and labels demo sources", () => {
  const narrative = { conclusions: "", recommendations: "", nextSteps: "" };
  const metrics = projectInput(seedMetricsInput("epsa"), epsa.services);
  const all = buildReportSnapshot({ client: epsa, report: { type: "semanal", period: weekPeriod("2026-11-23"), services: epsa.services, narrative }, metrics, asOf: "2026-11-27", generatedAt: "2026-11-27T12:00:00.000Z", generatedBy: "x", version: 1, review: [], inputDigest: "d" });
  expect(all.sections.map((section) => section.serviceId)).toEqual(epsa.services);
  const attention = all.sections.flatMap((section) => section.attention.map((item) => item.id));
  expect(attention).toContain("task-T-144");
  expect(all.origins.demo).toBeGreaterThan(0);
  expect(all.sections.find((section) => section.serviceId === "publicidad-digital")!.notes.join(" ")).toMatch(/no están conectados/);

  const paid = buildReportSnapshot({ client: epsa, report: { type: "servicio", period: monthPeriod("2026-11"), services: ["publicidad-digital"], narrative }, metrics: projectInput(seedMetricsInput("epsa"), ["publicidad-digital"]), asOf: "2026-11-27", generatedAt: "2026-11-27T12:00:00.000Z", generatedBy: "x", version: 1, review: [], inputDigest: "d" });
  expect(paid.sections.map((section) => section.serviceId)).toEqual(["publicidad-digital"]);
  // A module that is not included never leaks into the report (T-145 is Desarrollo web).
  expect(JSON.stringify(all)).not.toContain("T-145");
});

test("paid media report computes CTR, CPC, CPL, comparison and ROAS only for ecommerce", () => {
  const campaigns = (moduleDemoSeeds["publicidad-digital"]!.campanas.epsa).map((seed) => ({ id: seed.id, name: seed.nombre, platform: seed.plataforma, objective: seed.objetivo, status: seed.estado, budget: Number(seed.presupuesto), source: "demo" as const }));
  const report = buildPaidMediaReport({ clientName: epsa.name, campaigns, metrics: paidDemoMetrics, weeks: PAID_WEEKS, businessModel: "leads", period: "p", previousPeriod: "pp" });
  expect(report.hasData).toBe(true);
  const { totals } = report;
  expect(totals.ctr).toBeCloseTo((totals.clicks / totals.impressions) * 100, 6);
  expect(totals.cpl).toBeCloseTo(totals.spend / totals.leads, 6);
  expect(report.kpis.map((kpi) => kpi.label)).not.toContain("ROAS");
  expect(report.campaigns.find((row) => row.id === "CMP-EPSA-03")?.hasData).toBe(false);
  expect(report.sources.filter((source) => source.origin === "integracion").every((source) => source.status === "No conectada")).toBe(true);

  const shop = buildPaidMediaReport({
    clientName: "Tienda demo",
    campaigns: [{ id: "X", name: "Catálogo", platform: "Meta Ads", objective: "Ventas ecommerce", status: "Activa", budget: 1, source: "demo" }],
    metrics: { X: Array.from({ length: 8 }, () => ({ spend: 100, impressions: 1000, reach: 800, clicks: 50, leads: 0, conversions: 5, revenue: 400 })) },
    weeks: PAID_WEEKS,
    businessModel: "ecommerce",
    period: "p",
    previousPeriod: "pp",
  });
  expect(shop.totals.roas).toBeCloseTo(4, 6);
  expect(shop.kpis.map((kpi) => kpi.label)).toContain("ROAS");
  expect(totalsOf([], "leads").cpl).toBe(0);
});

test("content and monthly reports read module objects and keep demo metrics labelled", () => {
  const pieces = moduleDemoSeeds.contenidos!.piezas.epsa.map((seed) => ({ id: seed.id, title: seed.titulo, format: seed.formato, channel: seed.canal, axisId: seed.eje, status: seed.estado, date: seed.fecha, source: "demo" as const }));
  const axes = moduleDemoSeeds.contenidos!.ejes.epsa.map((seed) => ({ id: seed.id, name: seed.nombre }));
  const content = buildContentReport({ clientName: epsa.name, pieces, axes, metrics: contentDemoMetrics, series: contentDemoSeries.epsa, audience: [], learnings: ["x"], period: "Oct" });
  expect(content.published).toBe(3);
  expect(content.pending).toBe(4);
  expect(content.formats[0].label).toBe("Documento LinkedIn");
  expect(content.themes.map((theme) => theme.label)).toContain("Servicio posventa");

  const monthly = buildReportSnapshot({ client: aca, report: { type: "mensual", period: monthPeriod("2026-10"), services: aca.services, narrative: { conclusions: "", recommendations: "", nextSteps: "" } }, metrics: projectInput(seedMetricsInput("aca"), aca.services), asOf: "2026-11-27", generatedAt: "2026-11-27T12:00:00.000Z", generatedBy: "x", version: 1, review: [], inputDigest: "d" });
  expect(monthly.sections.map((section) => section.serviceId)).toEqual(aca.services);
  expect(monthly.sections.flatMap((section) => section.results).some((metric) => metric.origin === "demo")).toBe(true);
});

test("module definitions only use stages already defined for generic services", () => {
  for (const id of ["crm", "ia-automatizaciones", "soluciones-graficas", "mercado-libre"] as const) {
    expect(moduleCollections[id]).toHaveLength(1);
    expect(moduleCollections[id][0].fields.find((field) => field.key === "etapa")?.options?.length).toBeGreaterThan(0);
  }
  // Funcionalidades 2: «anuncios» (pedidos de anuncio, landing y atención) se suma sin quitar colecciones.
  expect(moduleCollections["publicidad-digital"].map((def) => def.id)).toEqual(["campanas", "anuncios", "creatividades", "optimizaciones", "aprendizajes"]);
  expect(moduleCollections["diseno-marca"].map((def) => def.id)).toEqual(["trabajos", "sistema", "biblioteca"]);
  expect(moduleCollections["diseno-marca"][0].fields.find((field) => field.key === "etapa")?.options).toEqual(["Brief", "Exploración", "Diseño", "Revisión", "Entrega"]);
});
