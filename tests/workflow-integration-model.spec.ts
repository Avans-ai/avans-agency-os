import { test, expect } from "@playwright/test";
import { osClients, type OsTask } from "../app/v2/os/os-data";
import type { ModuleRecord } from "../app/v2/os/modules/types";
import { buildContentTask, contentTaskId, dueKindForDate, upcomingNotifications, workflowNotification } from "../app/v2/os/workflow-tasks";
import { readLocalJson, writeLocalBatch } from "../app/v2/os/local-persistence";
import { designRequestTask } from "../app/v2/os/modules/use-design-operations";

const epsa = osClients.find((client) => client.slug === "epsa")!;
const aca = osClients.find((client) => client.slug === "aca")!;
const at = "2026-11-20T15:00:00.000Z";

function piece(client = "epsa", state = "Borrador", values: Record<string, string> = {}): ModuleRecord {
  return {
    id: "SAME-CONTENT-ID", client, module: "contenidos", collection: "piezas", user: "QA", source: "manual",
    createdAt: at, updatedAt: at, history: [],
    values: { titulo: "Publicación de prueba", estado: state, responsable: "Content QA", disenador: "Diseño QA", revisor: "PM QA", fecha: "2026-11-25", ...values },
  };
}

test("workflow task identity is isolated by client even when external content IDs coincide", () => {
  const first = buildContentTask(epsa, piece(), [], "QA", at);
  const second = buildContentTask(aca, piece("aca"), [first], "QA", at);
  expect(first.id).not.toBe(second.id);
  expect(second.clientSlug).toBe("aca");
  expect(second.projectSlug).not.toBe(first.projectSlug);

  // An explicit client relation must take precedence over a stale project relation.
  const inconsistent = { ...first, clientSlug: "aca", id: "FOREIGN-TASK" };
  expect(contentTaskId("epsa", piece(), [inconsistent])).not.toBe("FOREIGN-TASK");
});

test("design requests reuse legacy project-linked tasks without taking another client, service or collection", () => {
  const record = { ...piece(), module: "diseno-marca" as const, collection: "trabajos" };
  const legacy = { ...buildContentTask(epsa, piece(), [], "QA", at), id: "DESIGN-LEGACY", serviceId: "diseno-marca" as const, workItem: { id: record.id, collection: "trabajos", label: "Pedido existente" } };
  delete legacy.clientSlug;
  legacy.comments = [{ who: "Diseñador", when: at, text: "Conservar historial del pedido" }];
  expect(designRequestTask([legacy], record)).toBe(legacy);
  expect(designRequestTask([legacy], record)?.comments).toEqual(legacy.comments);
  const explicitOtherClient = { ...legacy, clientSlug: "aca", id: "WRONG-CLIENT" };
  const otherProject = { ...legacy, projectSlug: buildContentTask(aca, piece("aca"), [], "QA", at).projectSlug, id: "WRONG-PROJECT" };
  const otherService = { ...legacy, serviceId: "crm" as const, id: "WRONG-SERVICE" };
  const otherCollection = { ...legacy, workItem: { ...legacy.workItem, collection: "piezas" }, id: "WRONG-COLLECTION" };
  for (const wrong of [explicitOtherClient, otherProject, otherService, otherCollection]) expect(designRequestTask([wrong], record)).toBeUndefined();
  expect(designRequestTask([explicitOtherClient, otherProject, otherService, otherCollection, legacy], record)?.id).toBe("DESIGN-LEGACY");
});

test("legacy task linked through its project is reused through design, rejection, resubmission and programming", () => {
  const legacy = buildContentTask(epsa, piece(), [], "QA", at);
  delete legacy.clientSlug;
  legacy.id = "T-LEGACY";
  legacy.comments = [{ who: "PM", when: at, text: "Conservar esta devolución" }];
  const tasks: OsTask[] = [legacy];
  const steps = [
    ["Revisión interna de producción", "PM QA", "contenidos", "En aprobación"],
    ["Revisión preliminar del cliente", `Cliente · ${epsa.name}`, "contenidos", "En aprobación"],
    ["Producción de diseño", "Diseño QA", "diseno-marca", "Por hacer"],
    ["Revisión interna del diseño", "Content QA", "contenidos", "En aprobación"],
    ["Aprobación final del cliente", `Cliente · ${epsa.name}`, "contenidos", "En aprobación"],
    ["Ajustes", "Diseño QA", "diseno-marca", "Por hacer"],
    ["Revisión interna del diseño", "Content QA", "contenidos", "En aprobación"],
    ["Aprobado", "Content QA", "contenidos", "Por hacer"],
    ["Programado", "Content QA", "contenidos", "Hecho"],
  ];
  for (const [stage, owner, serviceId, status] of steps) {
    const next = buildContentTask(epsa, piece("epsa", stage, { returnState: "Aprobación final del cliente" }), tasks, "QA", at);
    expect(next).toMatchObject({ id: "T-LEGACY", owner, serviceId, status, clientSlug: "epsa" });
    expect(next.comments).toEqual(legacy.comments);
    tasks.splice(tasks.findIndex((task) => task.id === next.id), 1, next);
  }
  expect(tasks).toHaveLength(1);
  expect(tasks[0].completedAt).toBe(at);
  expect(tasks[0].activity).toHaveLength(steps.length + 1);

  const reopened = buildContentTask(epsa, piece("epsa", "Ajustes", { returnState: "Revisión interna del diseño" }), tasks, "QA", at);
  expect(reopened.completedAt).toBeUndefined();
  expect(reopened.archivedAt).toBeUndefined();
  expect(reopened.id).toBe("T-LEGACY");
});

test("missing client information creates a blocked task and the response clears the blocker", () => {
  const blocked = buildContentTask(epsa, piece("epsa", "Información del cliente", { necesitaCliente: "Foto del producto" }), [], "QA", at);
  expect(blocked).toMatchObject({ owner: `Cliente · ${epsa.name}`, blocked: "Foto del producto", status: "Por hacer" });
  const resumed = buildContentTask(epsa, piece("epsa", "Borrador"), [blocked], "Cliente", at);
  expect(resumed.blocked).toBeUndefined();
  expect(resumed.id).toBe(blocked.id);
});

test("notifications are stable for a retried event but distinct across tasks and clients", () => {
  const first = buildContentTask(epsa, piece("epsa", "Revisión preliminar del cliente"), [], "QA", at);
  const second = buildContentTask(aca, piece("aca", "Revisión preliminar del cliente"), [], "QA", at);
  const sameClientOther = buildContentTask(epsa, { ...piece("epsa", "Revisión preliminar del cliente"), id: "SECOND-CONTENT-ID" }, [], "QA", at);
  const a = workflowNotification(first, "TRANSITION-same-time-0", at);
  const b = workflowNotification(second, "TRANSITION-same-time-0", at);
  const c = workflowNotification(sameClientOther, "TRANSITION-same-time-0", at);
  expect(a).toEqual(workflowNotification(first, "TRANSITION-same-time-0", at));
  expect(new Set([a.id, b.id, c.id]).size).toBe(3);
  expect(a.href).toBe(`/v2/portal/epsa?contenido=${encodeURIComponent(first.workItem!.id)}`);
  expect(b.href).toContain("/v2/portal/aca?");
  const internal = buildContentTask(epsa, piece("epsa", "Revisión interna de producción"), [], "QA", at);
  expect(workflowNotification(internal, "next", at).href).toBe("/v2/clientes/epsa/contenido?seccion=piezas&registro=SAME-CONTENT-ID");
});

test("due notifications respect Buenos Aires midnight and exclude completed tasks", () => {
  const justBeforeMidnight = "2026-11-21T02:59:59.000Z";
  expect(dueKindForDate("2026-11-20", justBeforeMidnight)).toBe("today");
  expect(dueKindForDate("2026-11-20", "2026-11-21T03:00:00.000Z")).toBe("late");
  expect(dueKindForDate("2026-11-27", at)).toBe("week");
  expect(dueKindForDate("2026-11-28", at)).toBe("later");
  expect(dueKindForDate("Sin fecha", at)).toBe("later");
  const pending = buildContentTask(epsa, piece("epsa", "Borrador", { fecha: "2026-11-20" }), [], "QA", at);
  const completed = { ...pending, id: "DONE", status: "Hecho" as const };
  const first = upcomingNotifications([pending, completed], at);
  const repeated = upcomingNotifications([pending, completed], "2026-11-20T16:00:00.000Z");
  expect(first).toHaveLength(1);
  expect(first[0].kind).toBe("due");
  expect(first[0].id).toBe(repeated[0].id);
});

function mockStorage(run: (storage: Map<string, string>, events: string[], failOnce: (key: string) => void) => void) {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const eventDescriptor = Object.getOwnPropertyDescriptor(globalThis, "CustomEvent");
  const storage = new Map<string, string>();
  const events: string[] = [];
  let failingKey: string | null = null;
  const target = {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (key === failingKey) { failingKey = null; throw new Error("QuotaExceededError"); }
        storage.set(key, value);
      },
      removeItem: (key: string) => storage.delete(key),
    },
    dispatchEvent: (event: { detail: { key: string } }) => { events.push(event.detail.key); return true; },
  };
  class LocalEvent {
    detail: { key: string };
    constructor(_type: string, options: { detail: { key: string } }) { this.detail = options.detail; }
  }
  Object.defineProperty(globalThis, "window", { configurable: true, value: target });
  Object.defineProperty(globalThis, "CustomEvent", { configurable: true, value: LocalEvent });
  try { run(storage, events, (key) => { failingKey = `avans-os:preview:v1:${key}`; }); }
  finally {
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
    else Reflect.deleteProperty(globalThis, "window");
    if (eventDescriptor) Object.defineProperty(globalThis, "CustomEvent", eventDescriptor);
    else Reflect.deleteProperty(globalThis, "CustomEvent");
  }
}

test("batch saves content, task and notification in one visible update without touching unrelated keys", () => {
  mockStorage((storage, events) => {
    storage.set("another-application", "preserve");
    storage.set("avans-os:preview:v1:client:aca:sentinel", "unchanged");
    const pieceKey = "client:epsa:module:contenidos:piezas";
    const task = buildContentTask(epsa, piece(), [], "QA", at);
    const notification = workflowNotification(task, "create", at, "assignment");
    const visibleSnapshots: { contents: number; tasks: number }[] = [];
    const dispatch = window.dispatchEvent;
    window.dispatchEvent = (event) => {
      visibleSnapshots.push({
        contents: readLocalJson<ModuleRecord[]>(pieceKey, []).length,
        tasks: readLocalJson<{ tasks: OsTask[] }>("workflow-test-store", { tasks: [] }).tasks.length,
      });
      return dispatch(event);
    };
    expect(writeLocalBatch([{ key: pieceKey, value: [piece()] }, { key: "workflow-test-store", value: { tasks: [task], notifications: [notification] } }])).toBe(true);
    expect(readLocalJson<ModuleRecord[]>(pieceKey, [])).toHaveLength(1);
    expect(readLocalJson<{ tasks: OsTask[] }>("workflow-test-store", { tasks: [] }).tasks[0].id).toBe(task.id);
    expect(events).toEqual([pieceKey, "workflow-test-store"]);
    expect(visibleSnapshots).toEqual([{ contents: 1, tasks: 1 }, { contents: 1, tasks: 1 }]);
    const envelopes = [pieceKey, "workflow-test-store"].map((key) => JSON.parse(storage.get(`avans-os:preview:v1:${key}`)!));
    expect(envelopes[0].savedAt).toBe(envelopes[1].savedAt);
    expect(storage.get("another-application")).toBe("preserve");
    expect(storage.get("avans-os:preview:v1:client:aca:sentinel")).toBe("unchanged");
  });
});

test("quota failure restores original serialized values, removes new records and emits no success event", () => {
  mockStorage((storage, events, failOnce) => {
    const original = JSON.stringify({ version: 1, value: { estado: "Borrador" }, savedAt: "old" });
    storage.set("avans-os:preview:v1:content", original);
    failOnce("tasks");
    expect(writeLocalBatch([
      { key: "content", value: { estado: "Revisión interna de producción" } },
      { key: "new-design-request", value: { id: "new" } },
      { key: "tasks", value: [{ id: "task" }] },
    ])).toBe(false);
    expect(storage.get("avans-os:preview:v1:content")).toBe(original);
    expect(storage.has("avans-os:preview:v1:new-design-request")).toBe(false);
    expect(storage.has("avans-os:preview:v1:tasks")).toBe(false);
    expect(events).toEqual([]);
  });
});

test("unserializable batch leaves existing persistence untouched", () => {
  mockStorage((storage, events) => {
    storage.set("avans-os:preview:v1:content", "legacy envelope");
    const cyclic: { self?: unknown } = {}; cyclic.self = cyclic;
    expect(writeLocalBatch([{ key: "content", value: "replacement" }, { key: "invalid", value: cyclic }])).toBe(false);
    expect(storage.get("avans-os:preview:v1:content")).toBe("legacy envelope");
    expect(storage.size).toBe(1);
    expect(events).toEqual([]);
  });
});
