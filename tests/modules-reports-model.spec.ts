import { test, expect } from "@playwright/test";
import { osClients, osTasks, type OsTask } from "../app/v2/os/os-data";
import { serviceForTask, withTaskService, isArchivedTask, tasksForService } from "../app/v2/os/director-data";
import {
  buildContentReport,
  buildMonthlyReport,
  buildPaidMediaReport,
  buildWeeklyReport,
  totalsOf,
} from "../app/v2/os/reports/builders";
import {
  contentDemoMetrics,
  contentDemoSeries,
  monthlyDemo,
  PAID_WEEKS,
  paidDemoMetrics,
  weeklyDemo,
} from "../app/v2/os/reports/demo-fixtures";
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

test("weekly report derives tasks, honours the module filter and labels demo sources", () => {
  const all = buildWeeklyReport({ client: epsa, activeServices: epsa.services, tasks: osTasks, period: "S45", owner: epsa.owner, demo: weeklyDemo.epsa, attention: [], recommendations: [] });
  expect(all.services.map((row) => row.serviceId)).toEqual(epsa.services);
  expect(all.blockers.map((line) => line.taskId)).toContain("T-144");
  expect(all.approvals.map((line) => line.taskId)).toContain("T-142");
  expect(all.sources.some((source) => source.origin === "demo")).toBe(true);
  expect(all.sources.find((source) => source.origin === "integracion")?.status).toBe("No conectada");

  const paid = buildWeeklyReport({ client: epsa, activeServices: epsa.services, moduleFilter: "publicidad-digital", tasks: osTasks, period: "S45", owner: epsa.owner, demo: weeklyDemo.epsa, attention: [], recommendations: [] });
  expect(paid.services.map((row) => row.serviceId)).toEqual(["publicidad-digital"]);
  expect(paid.blockers).toHaveLength(0);
  expect(paid.nextSteps.every((line) => line.serviceId === "publicidad-digital")).toBe(true);
  expect(paid.deliverablesLate.every((line) => line.serviceId === "publicidad-digital")).toBe(true);

  // A module that is not active never leaks into the report (T-145 is Desarrollo web).
  expect(all.nextSteps.map((line) => line.taskId)).not.toContain("T-145");
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

  const monthly = buildMonthlyReport({ client: aca, activeServices: aca.services, tasks: osTasks, demo: monthlyDemo.aca, content, recommendations: [], period: "Octubre 2026", previousPeriod: "Septiembre 2026", owner: aca.owner });
  expect(monthly.results.map((result) => result.serviceId)).toEqual(aca.services);
  expect(monthly.results.flatMap((result) => result.indicators).some((indicator) => indicator.origin === "tareas")).toBe(true);
});

test("module definitions only use stages already defined for generic services", () => {
  for (const id of ["crm", "ia-automatizaciones", "diseno-marca", "soluciones-graficas", "mercado-libre"] as const) {
    expect(moduleCollections[id]).toHaveLength(1);
    expect(moduleCollections[id][0].fields.find((field) => field.key === "etapa")?.options?.length).toBeGreaterThan(0);
  }
  expect(moduleCollections["publicidad-digital"].map((def) => def.id)).toEqual(["campanas", "creatividades", "optimizaciones", "aprendizajes"]);
});
