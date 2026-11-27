import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { osClients } from "../app/v2/os/os-data";
import { projectInput } from "../app/v2/os/metrics/input";
import { customPeriod, monthPeriod, weekPeriod } from "../app/v2/os/metrics/period";
import { buildReportSnapshot, buildPaidMediaReport, buildContentReport, totalsOf, type ReportSnapshot } from "../app/v2/os/reports/builders";
import { createDraft, deleteDraft, emptyReports, issueVersion, readReports, reportFileName, startNewVersion, updateDraft, type ReportVersion } from "../app/v2/os/reports/generator";
import { renderReportPdf } from "../app/v2/os/reports/pdf";
import { PAID_WEEKS, paidDemoMetrics, contentDemoMetrics, contentDemoSeries } from "../app/v2/os/reports/demo-fixtures";
import { moduleDemoSeeds } from "../app/v2/os/modules/demo-fixtures";
import { pdfAssets, seedMetricsInput } from "./metrics-fixtures";

const aca = osClients.find((client) => client.slug === "aca")!;
const epsa = osClients.find((client) => client.slug === "epsa")!;
const OUT = join(__dirname, "..", "test-results", "report-generator-model");
const AT = "2026-11-27T15:00:00.000Z";
const narrative = { conclusions: "El mes cerró con foco en aprobaciones.", recommendations: "Acelerar validaciones del PM.", nextSteps: "Revisar la grilla de diciembre." };

function snapshotFor(client = aca, period = monthPeriod("2026-11"), services = client.services) {
  const metrics = projectInput(seedMetricsInput(client.slug), services);
  return buildReportSnapshot({ client, report: { type: "mensual", period, services, narrative }, metrics, asOf: "2026-11-27", generatedAt: AT, generatedBy: "Nicolás Okro", version: 1, review: [], inputDigest: "test" });
}

function pdfText(bytes: Uint8Array, name: string) {
  mkdirSync(OUT, { recursive: true });
  const file = join(OUT, `${name}.pdf`);
  writeFileSync(file, bytes);
  return { file, text: execFileSync("pdftotext", ["-layout", file, "-"]).toString("utf8") };
}

test("the snapshot reproduces from the stored projected input and never mixes clients", () => {
  const full = seedMetricsInput("aca");
  const period = monthPeriod("2026-11");
  const fromFull = buildReportSnapshot({ client: aca, report: { type: "mensual", period, services: aca.services, narrative }, metrics: full, asOf: "2026-11-27", generatedAt: AT, generatedBy: "x", version: 1, review: [], inputDigest: "d" });
  const stored = JSON.parse(JSON.stringify(projectInput(full, aca.services)));
  const fromStored = buildReportSnapshot({ client: aca, report: { type: "mensual", period, services: aca.services, narrative }, metrics: stored, asOf: "2026-11-27", generatedAt: AT, generatedBy: "x", version: 1, review: [], inputDigest: "d" });
  expect(fromStored).toEqual(fromFull);
  expect(stored.records["diseno-marca"]).toBeUndefined();
  expect(JSON.stringify(stored)).not.toContain("EPSA");
  expect(() => buildReportSnapshot({ client: epsa, report: { type: "mensual", period, services: ["contenidos"], narrative }, metrics: stored, asOf: "2026-11-27", generatedAt: AT, generatedBy: "x", version: 1, review: [], inputDigest: "d" })).toThrow(/otro cliente/);
});

test("comparisons appear only when both periods have data", () => {
  // Noviembre tiene una semana demo (2 nov) y octubre cuatro: no son comparables.
  const november = snapshotFor(aca, monthPeriod("2026-11")).sections.find((section) => section.serviceId === "publicidad-digital")!;
  expect(november.comparisons).toEqual([]);
  expect(november.notes.join(" ")).toMatch(/Sin comparación: el período anterior tiene 4 semanas/);
  // Cuatro semanas contra las cuatro anteriores: sí hay comparación, con la misma fórmula de ambos lados.
  const fourWeeks = snapshotFor(aca, customPeriod("2026-10-12", "2026-11-08")).sections.find((section) => section.serviceId === "publicidad-digital")!;
  const leads = fourWeeks.comparisons.find((item) => item.id === "leads")!;
  expect(leads.previous).toBeGreaterThan(0);
  expect(leads.current).toBe(fourWeeks.results.find((metric) => metric.id === "leads")!.value);
  const empty = snapshotFor(aca, monthPeriod("2027-03"));
  for (const section of empty.sections) expect(section.comparisons).toEqual([]);
  const paidEmpty = empty.sections.find((section) => section.serviceId === "publicidad-digital")!;
  expect(paidEmpty.results.every((metric) => metric.value === null && metric.display === "No conectado")).toBe(true);
});

test("draft → issue keeps issued versions immutable and validates scope", () => {
  let state = emptyReports("aca");
  const period = monthPeriod("2026-11");
  state = createDraft(state, { id: "R1", type: "mensual", period, services: ["contenidos"], actor: "Nicolás Okro", at: AT }, aca.services);
  expect(() => createDraft(state, { id: "R2", type: "mensual", period, services: ["crm"], actor: "x", at: AT }, aca.services)).toThrow(/servicios activos/);
  expect(() => createDraft(state, { id: "R3", type: "servicio", period, services: aca.services, actor: "x", at: AT }, aca.services)).toThrow(/un solo servicio/);
  state = updateDraft(state, "R1", { narrative: { ...narrative }, step: 6 }, { actor: "x", at: AT }, aca.services);
  const snapshot = snapshotFor(aca, period, ["contenidos"]);
  const version: ReportVersion = { version: 1, generatedAt: AT, generatedBy: "x", fileName: reportFileName("aca", state.reports[0], 1), fileId: "f1", fileSize: 10, sha256: "h", registered: true, snapshot, input: projectInput(seedMetricsInput("aca"), ["contenidos"]) };
  state = issueVersion(state, "R1", version);
  expect(state.reports[0].status).toBe("Emitido");
  expect(version.fileName).toBe("reporte-mensual-aca-noviembre-2026-v1.pdf");
  expect(() => updateDraft(state, "R1", { step: 2 }, { actor: "x", at: AT }, aca.services)).toThrow(/emitida/);
  expect(() => deleteDraft(state, "R1")).toThrow(/historial/);
  const frozen = JSON.stringify(state.reports[0].versions[0]);
  state = startNewVersion(state, "R1", { actor: "x", at: AT });
  state = updateDraft(state, "R1", { narrative: { conclusions: "Cambió" } as typeof narrative }, { actor: "x", at: AT }, aca.services);
  expect(JSON.stringify(state.reports[0].versions[0])).toBe(frozen);
  expect(() => issueVersion(state, "R1", { ...version, version: 1 })).toThrow(/siguiente/);
  expect(readReports(state, "epsa").reports).toEqual([]);
  expect(readReports({ version: 1, clientSlug: "aca", reports: [{ ...state.reports[0], clientSlug: "epsa" }] }, "aca").reports).toEqual([]);
});

test("PDF: valid file with Figtree, client, period, services and no other client's data", async () => {
  const snapshot: ReportSnapshot = snapshotFor(aca, monthPeriod("2026-11"));
  const bytes = await renderReportPdf(snapshot, pdfAssets());
  expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
  const { file, text } = pdfText(bytes, "aca-mensual");
  expect(text).toContain("ACA");
  expect(text).toContain("Noviembre 2026");
  expect(text).toContain("Publicidad digital");
  expect(text).toContain("Contenidos");
  expect(text).toContain("El mes cerró con foco en aprobaciones.");
  expect(text).toMatch(/Página 1 de \d+/);
  expect(text).not.toMatch(/EPSA|Line Up|Edinovo|Portland/);
  const fonts = execFileSync("pdffonts", [file]).toString();
  expect(fonts).toMatch(/Figtree/);
  const info = execFileSync("pdfinfo", [file]).toString();
  expect(info).toMatch(/Pages:\s+([3-9]|\d\d)/);

  const weekly = buildReportSnapshot({ client: epsa, report: { type: "semanal", period: weekPeriod("2026-11-23"), services: epsa.services, narrative: { conclusions: "", recommendations: "", nextSteps: "" } }, metrics: projectInput(seedMetricsInput("epsa"), epsa.services), asOf: "2026-11-27", generatedAt: AT, generatedBy: "Valentina Ríos", version: 2, review: [{ part: "Resumen y Estrategia", role: "PM", owner: "Valentina Ríos", status: "Revisada", by: "Valentina Ríos", at: AT, comment: "OK" }], inputDigest: "abc" });
  const epsaPdf = pdfText(await renderReportPdf(weekly, pdfAssets()), "epsa-semanal");
  expect(epsaPdf.text).toContain("EPSA");
  expect(epsaPdf.text).toContain("Sin conclusiones cargadas.");
  expect(epsaPdf.text).not.toMatch(/\bACA\b/);
});

test("module result reports reuse the metric definitions (paid totals per period, content states)", () => {
  const campaigns = moduleDemoSeeds["publicidad-digital"]!.campanas.epsa.map((seed) => ({ id: seed.id, name: seed.nombre, platform: seed.plataforma, objective: seed.objetivo, status: seed.estado, budget: Number(seed.presupuesto), source: "demo" as const }));
  const report = buildPaidMediaReport({ clientName: epsa.name, campaigns, metrics: paidDemoMetrics, weeks: PAID_WEEKS, businessModel: "leads", period: "p", previousPeriod: "pp" });
  expect(report.totals.cpl).toBeCloseTo(report.totals.spend / report.totals.leads, 6);
  expect(totalsOf([], "leads").cpl).toBe(0);
  const pieces = moduleDemoSeeds.contenidos!.piezas.epsa.map((seed) => ({ id: seed.id, title: seed.titulo, format: seed.formato, channel: seed.canal, axisId: seed.eje, status: seed.estado, date: seed.fecha, source: "demo" as const }));
  const content = buildContentReport({ clientName: epsa.name, pieces, axes: [], metrics: contentDemoMetrics, series: contentDemoSeries.epsa, audience: [], learnings: [], period: "Oct" });
  expect(content.published).toBe(3);
  expect(content.statusBreakdown.map((item) => item.label)).toContain("Aprobación final del cliente");
});
