import { test, expect } from "@playwright/test";
import { osClients, type OsTask } from "../app/v2/os/os-data";
import {
  addDays, addJornadaComment, applyJornadaAction, buildJornadaTask, clientProjection, createJornada, editionDeadline, jornadaActions, jornadaTaskId, localDate,
  providerProjection, quotaUsage, upsertJornadaDelivery, upsertJornadaDesignRequest, type JornadaAction, type JornadaRole,
} from "../app/v2/os/modules/av-model";
import { AV_DEMO_QUOTAS, avDemoSeedsFor } from "../app/v2/os/modules/av-demo";
import type { ModuleRecord } from "../app/v2/os/modules/types";
import { demoCatalog, JORNADA_TYPES, removeProvider, setProviderActive, upsertProvider, validateProvider } from "../app/v2/os/providers-catalog";

const edinovo = osClients.find((client) => client.slug === "edinovo")!;
const AT = "2026-11-20T15:00:00.000Z";
function seeds(slug = "edinovo"): ModuleRecord[] {
  return (avDemoSeedsFor(slug, "jornadas") ?? []).map(({ id, ...values }) => ({ id, client: slug, module: "audiovisuales", collection: "jornadas", user: "Sistema", source: "demo", createdAt: AT, updatedAt: AT, history: [], values }));
}
function fresh() {
  return createJornada({ id: "JOR-QA", client: edinovo, actor: "Lucía Benítez", at: AT, types: JORNADA_TYPES, titulo: "QA jornada", tipo: "UGC", proveedorId: "PRV-BRUMA", proveedor: "Estudio Bruma", fecha: "2026-12-04", drive: "https://drive.google.com/drive/folders/qa", brief: "" });
}

test("quota: demo Edinovo shows used, pending and available, and validation is blocked when none are left", () => {
  const records = seeds();
  const usage = quotaUsage(AV_DEMO_QUOTAS.edinovo, records);
  expect(usage).toEqual({ contracted: 6, used: 5, pending: 1, available: 1, defined: true });
  const pending = records.find((record) => record.id === "JOR-EDI-05")!;
  const validated = applyJornadaAction(pending, "validate", { role: "pm", actor: "Lucía Benítez", client: edinovo, available: usage.available, taskId: "T" });
  expect(quotaUsage(AV_DEMO_QUOTAS.edinovo, records.map((record) => record.id === validated.id ? validated : record)).available).toBe(0);
  expect(() => applyJornadaAction(fresh(), "validate", { role: "pm", actor: "Lucía Benítez", client: edinovo, available: 0, taskId: "T" })).toThrow(/No quedan jornadas disponibles/);
  // Una jornada cancelada libera el cupo.
  const cancelled = applyJornadaAction(records.find((record) => record.id === "JOR-EDI-03")!, "cancel", { role: "content", actor: "Lucía Benítez", client: edinovo, taskId: "T" });
  expect(quotaUsage(AV_DEMO_QUOTAS.edinovo, records.map((record) => record.id === cancelled.id ? cancelled : record)).available).toBe(2);
});

test("stage progression keeps one task per jornada, reassigns owners and computes the 3-day edition deadline", () => {
  let record = fresh();
  let tasks: OsTask[] = [];
  const owners: string[] = [];
  const step = (action: JornadaAction, role: JornadaRole, actor: string, extra: { patch?: Record<string, string>; comment?: string } = {}) => {
    record = applyJornadaAction(record, action, { role, actor, client: edinovo, providerId: role === "provider" ? "PRV-BRUMA" : undefined, available: 1, taskId: jornadaTaskId("edinovo", record), at: AT, ...extra });
    const task = buildJornadaTask(edinovo, record, tasks, actor, AT);
    tasks = tasks.some((item) => item.id === task.id) ? tasks.map((item) => item.id === task.id ? task : item) : [...tasks, task];
    owners.push(task.owner);
  };
  tasks = [buildJornadaTask(edinovo, record, tasks, "Lucía Benítez", AT)];
  expect(tasks[0]).toMatchObject({ id: "AV-edinovo-JOR-QA", owner: "Lucía Benítez", status: "En aprobación", serviceId: "audiovisuales", workflow: { kind: "jornada", stage: "Validación" } });
  step("validate", "pm", "Lucía Benítez");
  step("confirm-agenda", "content", "Lucía Benítez");
  expect(() => step("send-brief", "content", "Lucía Benítez")).toThrow(/brief/);
  step("send-brief", "content", "Lucía Benítez", { patch: { brief: "Testimonios", guion: "Tres preguntas" } });
  expect(jornadaActions(record, { role: "provider", actor: "Kinética Films", client: edinovo, providerId: "PRV-KINETICA" })).toEqual([]);
  expect(() => step("mark-raw", "provider", "Estudio Bruma")).toThrow(/plan de rodaje/);
  step("mark-raw", "provider", "Estudio Bruma", { patch: { planRodaje: "Dos cámaras" } });
  expect(record.values.fechaLimiteEdicion).toBe(addDays(localDate(AT), 3));
  expect(editionDeadline("2026-11-20T15:00:00.000Z")).toBe("2026-11-23");
  step("mark-edit", "provider", "Estudio Bruma");
  step("request-edit-changes", "content", "Lucía Benítez", { comment: "Acortar el cierre" });
  step("mark-edit", "provider", "Estudio Bruma");
  expect(record.values.edicionVersion).toBe("v2");
  step("approve-edit", "content", "Lucía Benítez");
  expect(() => step("deliver-design", "designer", "Tomás Aguirre")).toThrow(/enlace/);
  step("deliver-design", "designer", "Tomás Aguirre", { patch: { finalUrl: "https://example.com/final" } });
  expect(jornadaActions(record, { role: "admin", actor: "Nicolás Okro", client: edinovo })).toEqual([]);
  step("client-approve", "client", "Cliente · Edinovo");
  expect(tasks).toHaveLength(1);
  expect(tasks[0]).toMatchObject({ status: "Hecho", workflow: { stage: "Cerrada" } });
  expect(owners).toEqual(["Lucía Benítez", "Lucía Benítez", "Estudio Bruma", "Estudio Bruma", "Lucía Benítez", "Estudio Bruma", "Lucía Benítez", "Tomás Aguirre", "Cliente · Edinovo", "Lucía Benítez"]);
  expect(JSON.parse(record.values.jornadaTransitions).map((entry: { to: string }) => entry.to)).toEqual(["Agenda", "Brief y guiones", "Rodaje", "Edición", "Validación de Content", "Edición", "Validación de Content", "Subtítulos y motion", "Aprobación del cliente", "Cerrada"]);
});

test("cierre creates a single design request and a single delivery, even when repeated", () => {
  const record = seeds().find((item) => item.id === "JOR-EDI-04")!;
  const ctx = { actor: "Lucía Benítez", at: AT, taskId: "AV-edinovo-JOR-EDI-04", designer: "Tomás Aguirre" };
  const first = upsertJornadaDesignRequest([], record, { ...ctx, stage: "En producción" });
  const second = upsertJornadaDesignRequest(first.records, record, { ...ctx, stage: "Aprobados" });
  expect(second.records).toHaveLength(1);
  expect(second.request).toMatchObject({ id: "DIS-JOR-EDI-04", module: "diseno-marca", collection: "trabajos", values: { servicioOrigen: "audiovisuales", jornadaId: "JOR-EDI-04", estado: "Aprobado", operacion: "Aprobados", tareaId: "AV-edinovo-JOR-EDI-04" } });
  const deliveries = upsertJornadaDelivery(upsertJornadaDelivery([], record, ctx), record, ctx);
  expect(deliveries).toHaveLength(1);
});

test("provider and client projections hide internal data and other providers' jornadas", () => {
  const records = seeds();
  const episode = records.find((item) => item.id === "JOR-EDI-02")!;
  const view = providerProjection(episode, "PRV-KINETICA")!;
  expect(view.comments.map((comment) => comment.text)).toEqual(["Priorizar planos de los docentes: el cliente pidió una apertura corta."]);
  expect(Object.keys(view.values)).not.toContain("pm");
  expect(providerProjection(episode, "PRV-BRUMA")).toBeNull();
  // Antes de la etapa 3 el proveedor no ve el brief.
  expect(providerProjection(records.find((item) => item.id === "JOR-EDI-03")!, "PRV-BRUMA")!.values.brief).toBeUndefined();
  const withClient = addJornadaComment(episode, { actor: "Lucía Benítez", text: "Compartido con el cliente", visibility: "client", at: AT });
  expect(clientProjection(withClient)!.comments.map((comment) => comment.text)).toEqual(["Compartido con el cliente"]);
});

test("provider catalog: create, validate, edit, deactivate and delete only manual providers without jornadas", () => {
  let catalog = demoCatalog();
  const draft = { nombre: "QA Films", contacto: "Ana", foto: "", links: [{ label: "Portfolio", url: "https://example.com/qa" }], descripcion: "Coberturas", tipos: ["Cobertura de evento" as const] };
  expect(validateProvider({ ...draft, links: [] }, catalog.providers)).toMatch(/enlace/);
  expect(validateProvider({ ...draft, foto: "https://example.com/foto.jpg" }, catalog.providers)).toMatch(/foto/);
  expect(validateProvider({ ...draft, nombre: "Kinética Films" }, catalog.providers)).toMatch(/Ya hay/);
  const created = upsertProvider(catalog, draft, { actor: "QA", at: AT });
  catalog = created.catalog;
  expect(catalog.providers).toHaveLength(4);
  catalog = upsertProvider(catalog, { ...draft, descripcion: "Coberturas y UGC", tipos: ["UGC", "Cobertura de evento"] }, { actor: "QA", at: AT, id: created.provider.id }).catalog;
  expect(catalog.providers.find((item) => item.id === created.provider.id)).toMatchObject({ descripcion: "Coberturas y UGC", tipos: ["UGC", "Cobertura de evento"], source: "manual" });
  catalog = setProviderActive(catalog, "PRV-LUMEN", false, { actor: "QA", at: AT });
  expect(catalog.providers.find((item) => item.id === "PRV-LUMEN")!.activo).toBe(false);
  expect(() => removeProvider(catalog, "PRV-LUMEN", 0)).toThrow(/demostración/);
  expect(() => removeProvider(catalog, created.provider.id, 2)).toThrow(/jornadas asignadas/);
  expect(removeProvider(catalog, created.provider.id, 0).providers).toHaveLength(3);
});
