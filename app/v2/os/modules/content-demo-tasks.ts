/* DATOS DE DEMOSTRACIÓN · tareas de los contenidos ficticios y reinicio de la demo.
 * Cada contenido demo tiene su única tarea en `workspace.tasks` (misma identidad que
 * crearía el flujo: CONTENT-<cliente>-<contenido>, o la tarea demo anterior si ya existía).
 * Las tareas se agregan de forma aditiva y solo si el contenido demo está presente en la
 * clave local del cliente; nunca se tocan tareas ni registros manuales. */
import { readLocalJson } from "../local-persistence";
import { osClients, osTasks, type OsTask } from "../os-data";
import { buildContentTask, contentTaskId, type LocalWrite } from "../workflow-tasks";
import { CONTENT_DEMO_CLIENTS, CONTENT_DEMO_LABEL, contentDemoCollections, contentDemoSeedsFor, contentDemoTaskId } from "./content-demo";
import { contentState } from "./content-workflow";
import type { ModuleRecord } from "./types";

/* Debe coincidir con DEMO_SEED_DATE y seedRecords (store.ts no se importa para evitar ciclos con os-store). */
const SEED_DATE = "2026-10-30T12:00:00.000Z";
const TASK_DATE = "2026-11-20T12:00:00.000Z";
const key = (slug: string, serviceId: string, collection: string) => `client:${slug}:module:${serviceId}:${collection}`;

export function contentDemoRecords(slug: string, serviceId: string, collection: string): ModuleRecord[] {
  return (contentDemoSeedsFor(slug, serviceId, collection) ?? []).map(({ id, ...values }) => ({
    id, client: slug, module: serviceId as ModuleRecord["module"], collection, user: "Sistema", source: "demo", createdAt: SEED_DATE, updatedAt: SEED_DATE,
    history: [{ at: SEED_DATE, user: "Sistema", text: "Precargado como dato de demostración" }], values,
  }));
}
export function hasContentDemo(slug: string) {
  return (CONTENT_DEMO_CLIENTS as readonly string[]).includes(slug);
}
/** Los registros anteriores sin flujo (publicaciones viejas) no generan tarea. */
function needsTask(record: ModuleRecord) {
  return Boolean(record.values.contentTransitions) || !["Programado", "Publicada"].includes(contentState(record));
}
function taskFor(slug: string, record: ModuleRecord, tasks: OsTask[]) {
  const client = osClients.find((item) => item.slug === slug);
  if (!client) return null;
  const normalized = { ...record, values: { ...record.values, estado: contentState(record), tareaId: record.values.tareaId || contentDemoTaskId(record.id) } };
  const task = buildContentTask(client, normalized, tasks, CONTENT_DEMO_LABEL, TASK_DATE);
  return { ...task, activity: [{ text: `${CONTENT_DEMO_LABEL} · ${normalized.values.estado} · responsable ${task.owner}`, when: TASK_DATE }] };
}

/** Agrega (sin duplicar) la tarea de cada contenido demo presente en la cuenta. */
export function withContentDemoTasks(tasks: OsTask[], readStored = true): OsTask[] {
  let next = tasks;
  for (const slug of CONTENT_DEMO_CLIENTS) {
    const stored = readStored ? readLocalJson<ModuleRecord[] | null>(key(slug, "contenidos", "piezas"), null) : null;
    const current = Array.isArray(stored) ? stored : contentDemoRecords(slug, "contenidos", "piezas");
    for (const record of current) {
      if (record.source !== "demo" || record.client !== slug || !needsTask(record)) continue;
      const id = contentTaskId(slug, record, next);
      if (next.some((task) => task.id === id || task.id === contentDemoTaskId(record.id))) continue;
      const task = taskFor(slug, record, next);
      if (task) next = [...next, task];
    }
  }
  return next;
}

/** Quita solo los registros `source: "demo"` del cliente, vuelve a sembrarlos y restablece sus tareas. */
export function resetContentDemo(slug: string, tasks: OsTask[]): { writes: LocalWrite[]; tasks: OsTask[]; removed: number; kept: number } {
  const writes: LocalWrite[] = [];
  let removed = 0, kept = 0;
  for (const { serviceId, collection } of contentDemoCollections(slug)) {
    const stored = readLocalJson<ModuleRecord[] | null>(key(slug, serviceId, collection), null);
    if (!Array.isArray(stored)) continue; // La clave vacía ya muestra la demo original.
    const fresh = contentDemoRecords(slug, serviceId, collection);
    const freshIds = new Set(fresh.map((record) => record.id));
    const demoContents = new Set(contentDemoRecords(slug, "contenidos", "piezas").map((record) => record.id));
    // En Diseño de marca se conservan los registros demo propios del módulo (no derivados de estos contenidos).
    const manual = stored.filter((record) => record.source !== "demo" || (serviceId !== "contenidos" && !freshIds.has(record.id) && !demoContents.has(record.values.contenidoId ?? "")));
    removed += stored.length - manual.length; kept += manual.length;
    writes.push({ key: key(slug, serviceId, collection), value: [...manual, ...fresh] });
  }
  const demoIds = new Set(contentDemoRecords(slug, "contenidos", "piezas").map((record) => record.id));
  const linked = (task: OsTask) => task.workItem?.collection === "piezas" && demoIds.has(task.workItem.id) && (task.clientSlug ? task.clientSlug === slug : osTasks.some((item) => item.id === task.id));
  const base = tasks.filter((task) => !linked(task)).concat(osTasks.filter((task) => linked(task)));
  const fresh = contentDemoRecords(slug, "contenidos", "piezas");
  let next = base;
  for (const record of fresh) {
    if (!needsTask(record) || next.some((task) => task.id === contentTaskId(slug, record, next))) continue;
    const task = taskFor(slug, record, next);
    if (task) next = [...next, task];
  }
  return { writes, tasks: next, removed, kept };
}
