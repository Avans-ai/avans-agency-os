import { test, expect } from "@playwright/test";
import { osClients } from "../app/v2/os/os-data";
import {
  addBusinessDays, adStages, applyAdAction, applyPlanAction, buildAdTask, buildPlanTask, budgetPacing, campaignPlan, canActPaid, computeAdDeadlines, createAdRecord,
  deadlineHealth, lightFor, mediaPlanFromKnowledge, paidComments, paidTeam, planStepErrors, spendByChannel, upsertAdDesignRequest, type AdAction, type AdRequestInput,
} from "../app/v2/os/modules/paid-model";
import { channelBreakdown, monthlyBudget, weeklyKpis } from "../app/v2/os/modules/paid-metrics";
import { paidDemoSeeds } from "../app/v2/os/modules/paid-demo";
import type { ModuleRecord } from "../app/v2/os/modules/types";

const epsa = osClients.find((client) => client.slug === "epsa")!;
const aca = osClients.find((client) => client.slug === "aca")!;
const at = (minute: number) => `2026-11-20T12:${String(minute).padStart(2, "0")}:00.000Z`;
const record = (values: Record<string, string>, collection = "campanas", client = "epsa", id = "CMP-QA"): ModuleRecord => ({ id, client, module: "publicidad-digital", collection, user: "QA", source: "manual", createdAt: at(0), updatedAt: at(0), history: [], values });
const seed = (collection: string, client: string, id: string) => { const { id: _id, ...values } = paidDemoSeeds[collection][client].find((item) => item.id === id)!; void _id; return { ...record(values, collection, client, id), source: "demo" as const }; };
const input: AdRequestInput = { nombre: "Placa QA", campana: "CMP-EPSA-01", tipo: "Anuncio", canal: "Meta Ads", funnel: "Conversión", piezas: ["Placa", "Reel"], insight: "i", respuesta: "r", beneficio: "b", propuesta: "p", rtb: "rtb", cta: "Comprá", fechaNecesaria: "2026-12-04" };

test("deadlines are computed backwards per stage in business days (durations a definir)", () => {
  expect(addBusinessDays("2026-11-30", -3)).toBe("2026-11-25");
  const deadlines = computeAdDeadlines("2026-12-04", "Anuncio");
  expect(deadlines.map((d) => [d.stage, d.start, d.due])).toEqual([
    ["Opciones de Content", "2026-11-19", "2026-11-24"],
    ["Validación del PM", "2026-11-24", "2026-11-25"],
    ["Diseño", "2026-11-25", "2026-11-30"],
    ["Validación del diseño", "2026-11-30", "2026-12-01"],
    ["Aprobación del cliente", "2026-12-01", "2026-12-03"],
    ["Puesta en circulación", "2026-12-03", "2026-12-04"],
  ]);
  expect(new Set(deadlines.map((d) => d.group))).toEqual(new Set(["Content y validación", "Diseño", "Cliente y circulación"]));
  // A Sunday needed date falls back to Friday; atención por WhatsApp skips design.
  expect(computeAdDeadlines("2026-12-06", "Anuncio").at(-1)!.due).toBe("2026-12-04");
  expect(computeAdDeadlines("2026-12-04", "Atención por WhatsApp").map((d) => d.stage)).toEqual(["Opciones de Content", "Validación del PM", "Aprobación del cliente", "Puesta en circulación"]);
  // Configurable durations.
  const custom = computeAdDeadlines("2026-12-04", "Anuncio", { "Opciones de Content": 1, "Validación del PM": 1, Diseño: 1, "Validación del diseño": 1, "Aprobación del cliente": 1, "Puesta en circulación": 1 });
  expect(custom[0].start).toBe("2026-11-26");
  expect(deadlineHealth(deadlines, "2026-11-19").ok).toBe(true);
  expect(deadlineHealth(deadlines, "2026-11-23")).toMatchObject({ ok: false, late: 2 });
  expect(computeAdDeadlines("", "Anuncio")).toEqual([]);
});

test("ad flow: one task reassigned per stage, returns need a comment and bump the version, one design request", () => {
  const ad = createAdRecord("epsa", "ANU-QA", input, { actor: "Martín Ledesma", at: at(1), brief: "brief" });
  expect(ad.values.etapa).toBe("Opciones de Content");
  expect(JSON.parse(ad.values.plazos)).toHaveLength(6);
  expect(() => createAdRecord("epsa", "X", { ...input, insight: "" }, { actor: "x", at: at(1), brief: "" })).toThrow(/insight/);
  const team = paidTeam(epsa);
  const owners: string[] = [];
  const taskIds = new Set<string>();
  let current = ad;
  let design: ModuleRecord[] = [];
  const step = (action: AdAction, extra: { comment?: string; patch?: Record<string, string> } = {}, minute = 2) => {
    current = applyAdAction(current, action, { actor: "QA", at: at(minute), ...extra });
    const task = buildAdTask(epsa, current, undefined, "QA", at(minute));
    taskIds.add(task.id); owners.push(task.owner);
    design = upsertAdDesignRequest(design, current, { actor: "QA", at: at(minute), taskId: task.id, designer: team.designer, reviewer: team.pm }).records;
    return task;
  };
  expect(() => applyAdAction(ad, "send-to-pm", { actor: "QA", at: at(2) })).toThrow(/opción/);
  expect(() => applyAdAction(ad, "pm-approve", { actor: "QA", at: at(2) })).toThrow(/Opciones de Content/);
  step("send-to-pm", { patch: { propuestaContent: "Opción A" } }, 2);
  expect(design).toHaveLength(0);
  expect(() => applyAdAction(current, "pm-return", { actor: "QA", at: at(3) })).toThrow(/comentario/);
  step("pm-return", { comment: "Más corto" }, 3);
  expect(current.values).toMatchObject({ etapa: "Opciones de Content", version: "2", devuelto: "Más corto" });
  step("send-to-pm", {}, 4);
  const designTask = step("pm-approve", {}, 5);
  expect(designTask).toMatchObject({ serviceId: "diseno-marca", owner: "Tomás Aguirre", workflow: { kind: "paid", stage: "Diseño" } });
  expect(design).toHaveLength(1);
  expect(design[0]).toMatchObject({ id: "DIS-ANU-QA", module: "diseno-marca", collection: "trabajos", values: { servicioOrigen: "publicidad-digital", campanaId: "CMP-EPSA-01", anuncioId: "ANU-QA", operacion: "En producción" } });
  expect(() => applyAdAction(current, "design-ready", { actor: "QA", at: at(6), patch: { enlacePieza: "javascript:alert(1)" } })).toThrow(/enlace/);
  step("design-ready", { patch: { enlacePieza: "https://example.com/pieza" } }, 6);
  step("pm-return-design", { comment: "Subir contraste" }, 7);
  expect(design[0].values).toMatchObject({ operacion: "Ajustes", estado: "Cambios pedidos" });
  step("design-ready", {}, 8);
  step("pm-approve-design", {}, 9);
  const clientTask = buildAdTask(epsa, current, undefined, "QA", at(9));
  expect(clientTask).toMatchObject({ owner: "Cliente · EPSA / Line Up", status: "En aprobación" });
  step("client-changes", { comment: "Cambiar foto" }, 10);
  expect(current.values).toMatchObject({ etapa: "Diseño", version: "4" });
  step("design-ready", {}, 11);
  step("pm-approve-design", {}, 12);
  step("client-approve", {}, 13);
  expect(current.values.etapa).toBe("Puesta en circulación");
  const done = step("launch", {}, 14);
  expect(done).toMatchObject({ status: "Hecho", owner: "Martín Ledesma" });
  expect(current.values).toMatchObject({ etapa: "En circulación", fechaCirculacion: "2026-11-20" });
  expect(design).toHaveLength(1);
  expect(design[0].values).toMatchObject({ operacion: "Aprobados", archivo: "https://example.com/pieza" });
  expect(taskIds).toEqual(new Set(["PAID-epsa-ANU-QA"]));
  expect(owners).toContain("Lucía Benítez");
  expect(owners).toContain("Valentina Ríos");
  const comments = paidComments(current.values.comentarios);
  expect(comments.filter((c) => c.kind === "devolucion").map((c) => c.version)).toEqual([1, 2, 3]);
  step("finish", {}, 15);
  expect(current.values.etapa).toBe("Finalizado");
});

test("atención por mail o WhatsApp skips design and never creates a design request", () => {
  let ad = createAdRecord("aca", "ANU-W", { ...input, tipo: "Atención por WhatsApp", detalle: "Mensaje 1", insight: "", piezas: [] }, { actor: "x", at: at(1), brief: "" });
  expect(adStages("Atención por WhatsApp")).not.toContain("Diseño");
  ad = applyAdAction(ad, "send-to-pm", { actor: "x", at: at(2), patch: { propuestaContent: "Guion" } });
  ad = applyAdAction(ad, "pm-approve", { actor: "x", at: at(3) });
  expect(ad.values.etapa).toBe("Aprobación del cliente");
  expect(upsertAdDesignRequest([], ad, { actor: "x", at: at(3), taskId: "t", designer: "d", reviewer: "r", seed: true }).records).toHaveLength(0);
  ad = applyAdAction(ad, "client-changes", { actor: "x", at: at(4), comment: "Más cálido" });
  expect(ad.values.etapa).toBe("Opciones de Content");
});

test("plan: step validation, submit → PM validation task → approve or return with comment; legacy campaigns read as approved", () => {
  expect(planStepErrors({}, "target")).toEqual(expect.arrayContaining(["Completá el nombre de la campaña.", "Indicá a qué ICP, segmento o target apunta."]));
  expect(planStepErrors({ canales: JSON.stringify({ "Meta Ads": 60, "Google Ads": 30 }) }, "canales")[0]).toMatch(/100 %/);
  const draft = record({ nombre: "QA", objetivo: "Generación de leads", inicio: "2026-12-01", icpIds: "icp-buyers", productoIds: "offering-0", presupuestoMensual: "500000", canales: JSON.stringify({ "Meta Ads": 70, "ChatGPT Ads": 30 }), enfoque: "Confiabilidad", planEstado: "Borrador" });
  expect(() => applyPlanAction(record({ nombre: "x", planEstado: "Borrador" }), "submit", { actor: "x", at: at(1) })).toThrow();
  const sent = applyPlanAction(draft, "submit", { actor: "Martín Ledesma", at: at(1) });
  expect(campaignPlan(sent).state).toBe("En validación del PM");
  const task = buildPlanTask(epsa, sent, undefined, "Martín Ledesma", at(1));
  expect(task).toMatchObject({ id: "PAID-PLAN-epsa-CMP-QA", owner: "Valentina Ríos", status: "En aprobación" });
  expect(() => applyPlanAction(sent, "return", { actor: "Valentina Ríos", at: at(2) })).toThrow(/ajustar/);
  const returned = applyPlanAction(sent, "return", { actor: "Valentina Ríos", at: at(2), comment: "Bajar ChatGPT" });
  expect(buildPlanTask(epsa, returned, task, "Valentina Ríos", at(2))).toMatchObject({ id: task.id, owner: "Martín Ledesma", status: "Por hacer" });
  const approved = applyPlanAction(applyPlanAction(returned, "submit", { actor: "x", at: at(3) }), "approve", { actor: "Valentina Ríos", at: at(4) });
  expect(approved.values).toMatchObject({ planEstado: "Aprobada", estado: "En preparación", aprobadoPor: "Valentina Ríos" });
  expect(buildPlanTask(epsa, approved, task, "x", at(4)).status).toBe("Hecho");
  // Compatibility on read: a stored campaign without the new fields keeps working.
  const legacy = campaignPlan(record({ nombre: "Vieja", plataforma: "LinkedIn Ads", estado: "Activa", presupuesto: "1200000", inicio: "2026-10-01", fin: "2026-12-31" }));
  expect(legacy).toMatchObject({ state: "Aprobada", legacy: true, channels: { "LinkedIn Ads": 100 }, monthlyBudget: 400000 });
  expect(campaignPlan(record({ estado: "Borrador" })).state).toBe("Borrador");
});

test("visual permissions per stage and client isolation", () => {
  expect(canActPaid("technical", epsa, "lt")).toBe(true);
  expect(canActPaid("technical", epsa, "pm")).toBe(false);
  expect(canActPaid("technical", aca, "lt")).toBe(false);
  expect(canActPaid("pm", epsa, "pm")).toBe(true);
  expect(canActPaid("content", epsa, "content")).toBe(true);
  expect(canActPaid("designer", epsa, "designer")).toBe(true);
  expect(canActPaid("client", epsa, "lt")).toBe(false);
  expect(canActPaid("provider", epsa, "content")).toBe(false);
  expect(canActPaid("admin", aca, "pm")).toBe(true);
  expect(canActPaid("admin", aca, "client")).toBe(false);
  expect(paidTeam(aca)).toMatchObject({ lt: "Sofía Ramírez", content: "Lucía Benítez" });
  const design = [{ ...record({ anuncioId: "ANU-1" }, "trabajos", "aca", "DIS-ANU-1"), module: "diseno-marca" as const }];
  const ad = createAdRecord("epsa", "ANU-1", input, { actor: "x", at: at(1), brief: "" });
  // Same ad id in another client never matches ACA's request.
  const moved = applyAdAction(applyAdAction(ad, "send-to-pm", { actor: "x", at: at(2), patch: { propuestaContent: "A" } }), "pm-approve", { actor: "x", at: at(3) });
  const result = upsertAdDesignRequest(design, moved, { actor: "x", at: at(3), taskId: "t", designer: "d", reviewer: "r" });
  expect(result.created).toBe(true);
  expect(result.records.filter((r) => r.values.anuncioId === "ANU-1").map((r) => r.client).sort()).toEqual(["aca", "epsa"]);
});

test("demo metrics: semáforos, pacing and spend by channel are derived, labelled and consistent", () => {
  expect(lightFor(100, 100, "higher")).toBe("verde");
  expect(lightFor(90, 100, "higher")).toBe("amarillo");
  expect(lightFor(130, 100, "lower")).toBe("rojo");
  expect(budgetPacing(3000, 2000, 20, 30).light).toBe("verde");
  expect(budgetPacing(3000, 2400, 20, 30).light).toBe("amarillo");
  expect(budgetPacing(3000, 3200, 20, 30).light).toBe("rojo");
  expect(spendByChannel([{ channels: { "Meta Ads": 50, "Google Ads": 50 }, spend: 1000 }, { channels: { "Meta Ads": 100 }, spend: 500 }])).toEqual({ "Meta Ads": 1000, "Google Ads": 500 });
  const campaigns = paidDemoSeeds.campanas.aca.map((s) => seed("campanas", "aca", s.id));
  const weekly = weeklyKpis("aca", campaigns);
  expect(weekly.hasData).toBe(true);
  expect(weekly.kpis.map((k) => k.id)).toEqual(["leads", "cpl", "ctr", "conversions"]);
  expect(weekly.kpis.some((k) => k.light === "rojo")).toBe(true);
  const budget = monthlyBudget(campaigns);
  expect(budget.rows.map((r) => r.campaign.id)).toEqual(["CMP-ACA-01", "CMP-ACA-02"]);
  expect(budget.rows.find((r) => r.campaign.id === "CMP-ACA-02")!.light).toBe("rojo");
  const breakdown = channelBreakdown(campaigns[0]);
  expect(breakdown.rows.map((r) => r.channel)).toEqual(["Meta Ads", "TikTok Ads"]);
  expect(Math.round(breakdown.rows.reduce((s, r) => s + r.spend, 0))).toBe(Math.round(breakdown.totals.spend));
  expect(weeklyKpis("lider-energy", paidDemoSeeds.campanas["lider-energy"].map((s) => seed("campanas", "lider-energy", s.id))).hasData).toBe(false);
});

test("media plan is read from the Plan de Marketing blocks without copying", () => {
  expect(mediaPlanFromKnowledge([]).empty).toBe(true);
  const plan = mediaPlanFromKnowledge([
    { id: "c1", section: "campaigns", status: "Validado", values: { name: "Lanzamiento", monthlyInvestment: 900000, platforms: ["Meta Ads", "Google Ads"], share: 100 } },
    { id: "a1", section: "allocations", status: "Borrador", values: { campaignIds: ["c1"], channel: "Meta Ads", share: 70 } },
    { id: "k1", section: "paidKpis", status: "Borrador", values: { indicator: "Costo por consulta", businessModel: "Leads" } },
  ]);
  expect(plan.campaigns[0]).toMatchObject({ name: "Lanzamiento", platforms: "Meta Ads · Google Ads", allocations: [{ channel: "Meta Ads", share: 70 }] });
  expect(plan.total).toBe(900000);
  expect(plan.kpis[0].indicator).toBe("Costo por consulta");
});
