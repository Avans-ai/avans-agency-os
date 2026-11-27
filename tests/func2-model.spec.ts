import { test, expect } from "@playwright/test";
import { osClients, osTasks } from "../app/v2/os/os-data";
import { dueSortKey, generatePeriodicTasks, nextOccurrence, PERIODIC_PROCEDURES, procedureRows } from "../app/v2/os/procedures-periodic";
import { tasksForClient } from "../app/v2/os/director-data";
import { checkContentGuidelines } from "../app/v2/os/modules/content-guideline-check";
import { buildEmailDraft, buildReportHtml, canReviewPart, canSendReport, EMPTY_REVIEWS, markPart, partReview, readReviews, reportParts, reviewId, reviewProgress } from "../app/v2/os/reports/review-circuit";

const epsa = osClients.find((client) => client.slug === "epsa")!;
const aca = osClients.find((client) => client.slug === "aca")!;
const at = "2026-11-20T15:00:00.000Z"; // viernes 20 nov 2026 (Buenos Aires)

test("periodic procedures: next occurrence per frequency, one task per period, idempotent and isolated", () => {
  const weekly = PERIODIC_PROCEDURES.find((item) => item.id === "estrategia-reporte-semanal")!;
  const monthly = PERIODIC_PROCEDURES.find((item) => item.id === "contenidos-plan-mensual")!;
  expect(nextOccurrence(weekly, at)).toEqual({ period: "2026-W47", periodLabel: "semana 47", due: "2026-11-20" });
  // Pasado el viernes, la próxima ocurrencia es la semana siguiente (nunca una vencida).
  expect(nextOccurrence(weekly, "2026-11-21T15:00:00.000Z").due).toBe("2026-11-27");
  expect(nextOccurrence(monthly, at)).toMatchObject({ period: "2026-11", due: "2026-11-20" });
  expect(nextOccurrence(monthly, "2026-11-25T15:00:00.000Z")).toMatchObject({ period: "2026-12", due: "2026-12-20" });

  const first = generatePeriodicTasks(epsa, epsa.services, osTasks, "Valentina Ríos", at);
  // EPSA: estrategia (2) + publicidad digital (2) + contenidos (2).
  expect(first.created).toHaveLength(6);
  expect(first.notifications).toHaveLength(6);
  expect(first.notifications.every((item) => item.kind === "assignment" && item.recipient === first.created.find((task) => task.id === item.taskId)!.owner)).toBe(true);
  const plan = first.created.find((task) => task.id === "PROC-epsa-contenidos-plan-mensual-2026-11")!;
  expect(plan).toMatchObject({ clientSlug: "epsa", serviceId: "contenidos", owner: "Lucía Benítez", due: "2026-11-20", dueKind: "today", status: "Por hacer" });
  expect(plan.desc).toContain("demostración");
  expect(first.created.find((task) => task.id.includes("publicidad-revision-semanal"))!.owner).toBe("Martín Ledesma");

  const second = generatePeriodicTasks(epsa, epsa.services, first.tasks, "Valentina Ríos", at);
  expect(second.created).toHaveLength(0);
  expect(second.tasks).toHaveLength(first.tasks.length);
  expect(procedureRows(epsa, epsa.services, second.tasks, at).every((row) => row.task)).toBe(true);

  // Aislamiento: las tareas de EPSA no aparecen en ACA, y ACA solo genera sus módulos.
  expect(tasksForClient(first.tasks, "aca").some((task) => task.id.startsWith("PROC-"))).toBe(false);
  const acaRun = generatePeriodicTasks(aca, aca.services, first.tasks, "Sofía Ramírez", at);
  expect(acaRun.created.map((task) => task.serviceId).sort()).toEqual(["contenidos", "contenidos", "publicidad-digital", "publicidad-digital"]);
  expect(acaRun.created.every((task) => task.clientSlug === "aca")).toBe(true);
});

test("tasks list sorting key understands mixed due formats", () => {
  expect(dueSortKey("2026-11-27")).toBe("2026-11-27");
  expect(dueSortKey("30 oct")).toBe("2026-10-30");
  expect(dueSortKey("Mié 4 nov")).toBe("2026-11-04");
  expect(dueSortKey("Sin fecha")).toBe("9999-12-31");
});

test("guideline check without AI cites the source and ignores accents and case", () => {
  const sources = { avoid: ["barato"], use: ["confianza"], donts: [{ text: "Prometer tiempos de respuesta", source: "plan" as const }, { text: "Usar «gratis» en promociones", source: "notes" as const }] };
  const result = checkContentGuidelines({ titulo: "Un plan BARATO para vos", copy: "Te prometemos tiempos de respuesta récord y envío gratis.", cta: "Sumate" }, sources);
  expect(result.warnings.map((item) => `${item.source}:${item.field}`)).toEqual(["glossary:titulo", "plan:copy", "notes:copy"]);
  expect(result.warnings[0].message).toBe("Estás usando «barato», que el cliente pidió evitar");
  expect(result.warnings[0].sourceLabel).toBe("Glosario de la Ficha");
  expect(result.suggestions[0]).toContain("«confianza»");
  // Palabra contenida en otra (baratísimo) no dispara el término exacto; texto limpio no genera advertencias.
  expect(checkContentGuidelines({ copy: "Precios baratísimos" }, { avoid: ["barato"], use: [], donts: [] }).warnings).toHaveLength(0);
  expect(checkContentGuidelines({ copy: "Conocé cómo trabajamos" }, sources).warnings).toHaveLength(0);
});

test("report review: parts per responsible, export only when all reviewed, email draft without sending", () => {
  const parts = reportParts(epsa, epsa.services);
  expect(parts.map((part) => `${part.role}:${part.owner}`)).toEqual(["pm:Valentina Ríos", "technical:Martín Ledesma", "content:Lucía Benítez"]);
  expect(reportParts(aca, aca.services).map((part) => part.id)).toEqual(["resumen", "publicidad", "contenidos"]);
  expect(reportParts(osClients.find((c) => c.slug === "grupo-portland")!, ["estrategia", "desarrollo-web"]).map((part) => part.id)).toEqual(["resumen"]);

  expect(canReviewPart("content", epsa, parts[2])).toBe(true);
  expect(canReviewPart("content", epsa, parts[1])).toBe(false);
  expect(canReviewPart("technical", epsa, parts[1])).toBe(true);
  expect(canReviewPart("pm", epsa, parts[0])).toBe(true);
  expect(canReviewPart("pm", epsa, parts[2])).toBe(false);
  expect(canReviewPart("admin", epsa, parts[1])).toBe(true);
  expect(canSendReport("pm", epsa)).toBe(true);
  expect(canSendReport("content", epsa)).toBe(false);

  const period = "Semana 45";
  let state = readReviews({ broken: true });
  expect(state).toEqual(EMPTY_REVIEWS);
  expect(() => markPart(state, { kind: "semanal", period, part: parts[1], status: "Requiere ajustes", comment: " ", actor: "Martín Ledesma", at })).toThrow();
  state = markPart(state, { kind: "semanal", period, part: parts[0], status: "Revisada", comment: "Resumen ok", actor: "Valentina Ríos", at });
  state = markPart(state, { kind: "semanal", period, part: parts[1], status: "Requiere ajustes", comment: "Falta CPL", actor: "Martín Ledesma", at });
  let record = state.reports[reviewId("semanal", period)];
  expect(reviewProgress(record, parts)).toMatchObject({ reviewed: 1, total: 3, ready: false });
  state = markPart(state, { kind: "semanal", period, part: parts[1], status: "Revisada", comment: "", actor: "Martín Ledesma", at });
  state = markPart(state, { kind: "semanal", period, part: parts[2], status: "Revisada", comment: "", actor: "Lucía Benítez", at });
  record = state.reports[reviewId("semanal", period)];
  expect(reviewProgress(record, parts)).toMatchObject({ reviewed: 3, ready: true, percent: 100 });
  expect(record.history).toHaveLength(4);
  expect(state.reports[reviewId("mensual", period)]).toBeUndefined();

  const html = buildReportHtml({ clientName: "EPSA <script>", kind: "semanal", title: "Reporte semanal operativo", period, owner: "Valentina Ríos", summary: ["Todo en orden"], kpis: [{ label: "Bloqueos", value: "1" }], conclusion: "Seguir", parts: parts.map((part) => ({ part, review: partReview(record, part.id) })), generatedAt: at, generatedBy: "Valentina Ríos" });
  expect(html).toContain("<!doctype html>");
  expect(html).toContain("EPSA &lt;script&gt;");
  expect(html).not.toContain("EPSA <script>");
  const draft = buildEmailDraft({ client: epsa, kind: "semanal", period, sender: "Valentina Ríos", summary: ["Uno", "Dos"], fileName: "reporte.html" });
  expect(draft.to).toEqual(["Carolina Méndez · Gerenta de Marketing · aprueba piezas (correo a completar)", "Diego Fernández · Director Comercial · aprueba presupuesto (correo a completar)"]);
  expect(draft.subject).toBe("Reporte semanal operativo · EPSA / Line Up · Semana 45");
  expect(draft.body).toContain("Hola Carolina:");
  expect(draft.body).toContain("reporte.html");
});
