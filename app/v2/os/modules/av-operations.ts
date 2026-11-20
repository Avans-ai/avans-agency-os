"use client";

/* Audiovisuales · operaciones de la jornada. Cada cambio se guarda en un solo lote:
 * la jornada, LA tarea de la jornada (id estable, se reasigna por etapa), la notificación
 * al nuevo responsable y, en el cierre, el pedido único a Diseño y la entrega confirmada.
 * Persistencia local de vista previa: nada sale de este navegador. */
import { useMemo } from "react";
import { canEditService } from "../director-data";
import { readLocalJson, useLocalStorageState, writeLocalJson } from "../local-persistence";
import type { OsClient, OsTask } from "../os-data";
import { useOsStore, type PreviewRole } from "../os-store";
import { previewActor } from "../preview-roles";
import { JORNADA_TYPES, type AudiovisualProvider } from "../providers-catalog";
import type { LocalWrite } from "../workflow-tasks";
import { AV_DEMO_QUOTAS } from "./av-demo";
import {
  addJornadaComment, applyJornadaAction, buildJornadaTask, createJornada, designLead, editableFields, emptyQuota, jornadaKey, jornadaNotification, jornadaState, jornadaTaskId,
  normalizeQuota, notificationKind, quotaKey, quotaUsage, updateQuota, upsertJornadaDelivery, upsertJornadaDesignRequest,
  type JornadaAction, type JornadaQuota, type JornadaRole, type JornadaVisibility, type NewJornada,
} from "./av-model";
import { moduleKey, seedRecords, useModuleRecords } from "./store";
import type { ModuleRecord } from "./types";

export function defaultQuota(clientSlug: string): JornadaQuota {
  return AV_DEMO_QUOTAS[clientSlug] ?? emptyQuota(clientSlug);
}
export function readQuota(clientSlug: string) {
  return normalizeQuota(readLocalJson<unknown>(quotaKey(clientSlug), null), clientSlug, defaultQuota(clientSlug));
}
export function readJornadas(clientSlug: string) {
  return readLocalJson<ModuleRecord[]>(jornadaKey(clientSlug), seedRecords(clientSlug, "audiovisuales", "jornadas"));
}

/** Jornadas, cupo y uso del cupo de una cuenta (se actualiza con cambios de esta pestaña y de otras). */
export function useJornadaData(client: OsClient) {
  const { data, hydrated } = useModuleRecords(client.slug, "audiovisuales", ["jornadas"]);
  const [rawQuota] = useLocalStorageState<unknown>(quotaKey(client.slug), null);
  const quota = useMemo(() => normalizeQuota(rawQuota, client.slug, defaultQuota(client.slug)), [client.slug, rawQuota]);
  const jornadas = useMemo(() => (data.jornadas ?? []).filter((record) => record.client === client.slug), [client.slug, data.jornadas]);
  const usage = useMemo(() => quotaUsage(quota, jornadas), [jornadas, quota]);
  return { jornadas, quota, usage, hydrated };
}

/** Rol de la jornada para el rol de vista previa del equipo (null = no participa). */
export function jornadaRoleOf(role: PreviewRole, clientSlug: string): JornadaRole | null {
  if (role === "admin" || role === "content" || role === "designer" || role === "provider" || role === "client") return role;
  if (role === "pm" || role === "operativo") return canEditService(role, clientSlug, "audiovisuales") ? "pm" : null;
  return null;
}

type Options = { comment?: string; patch?: Record<string, string>; role?: JornadaRole; actor?: string; providerId?: string };

export function useJornadaOperations(client: OsClient) {
  const store = useOsStore();
  const teamRole = jornadaRoleOf(store.role, client.slug);

  function context(options: Options) {
    if (!store.localHydrated) throw new Error("Esperá a que termine de cargar la cuenta.");
    // Portal y espacio del proveedor declaran su rol explícito: es una vista previa local, no una identidad de servidor.
    const role = options.role ?? teamRole;
    if (!role) throw new Error("Tu rol no participa de las jornadas de esta cuenta.");
    const actor = options.actor || previewActor(store.role);
    const tasks = readLocalJson<{ tasks: OsTask[] }>("workspace", { tasks: store.tasks }).tasks;
    return { role, actor, tasks };
  }
  function fresh(record: ModuleRecord) {
    if (record.client !== client.slug || record.module !== "audiovisuales" || record.collection !== "jornadas") throw new Error("La jornada no pertenece a esta cuenta.");
    const records = readJornadas(client.slug);
    const current = records.find((item) => item.id === record.id && item.client === client.slug);
    if (!current) throw new Error("No se encontró la jornada. Volvé a abrirla.");
    if (current.updatedAt !== record.updatedAt) throw new Error("La jornada cambió en otra vista. Revisá la versión actual antes de continuar.");
    return { records, current };
  }
  function commit(record: ModuleRecord, records: ModuleRecord[], task: OsTask, notify: { eventId: string; kind: Parameters<typeof jornadaNotification>[4] } | null, extra: LocalWrite[] = []) {
    const exists = records.some((item) => item.id === record.id && item.client === client.slug);
    const writes: LocalWrite[] = [{ key: jornadaKey(client.slug), value: exists ? records.map((item) => item.id === record.id && item.client === client.slug ? record : item) : [record, ...records] }, ...extra];
    const notification = notify ? jornadaNotification(task, record, notify.eventId, record.updatedAt, notify.kind) : undefined;
    return store.commitWorkflow(task, notification, writes);
  }

  function create(input: NewJornada) {
    try {
      const { role, actor, tasks } = context({});
      if (!["admin", "pm", "content"].includes(role) || !canEditService(store.role, client.slug, "audiovisuales")) throw new Error("Las jornadas las crea el Content o el PM de la cuenta.");
      const at = new Date().toISOString();
      const record = createJornada({ ...input, id: `JOR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, client, actor, at, types: JORNADA_TYPES });
      const usage = quotaUsage(readQuota(client.slug), [record, ...readJornadas(client.slug)]);
      const task = buildJornadaTask(client, record, tasks, actor, at, usage);
      record.values.tareaId = task.id;
      return commit(record, readJornadas(client.slug), task, { eventId: `${client.slug}-${record.id}-created`, kind: "assignment" }) ? record : null;
    } catch (error) { store.notify(error instanceof Error ? error.message : "No se pudo crear la jornada.", "error"); return null; }
  }

  function transition(record: ModuleRecord, action: JornadaAction, options: Options = {}) {
    try {
      const { role, actor, tasks } = context(options);
      const { records, current } = fresh(record);
      const quota = readQuota(client.slug);
      const before = quotaUsage(quota, records);
      const taskId = jornadaTaskId(client.slug, current);
      const next = applyJornadaAction(current, action, { role, actor, client, providerId: options.providerId, comment: options.comment, patch: options.patch, available: before.available, taskId });
      const nextRecords = records.map((item) => item.id === next.id && item.client === client.slug ? next : item);
      const task = buildJornadaTask(client, next, tasks, actor, next.updatedAt, quotaUsage(quota, nextRecords));
      const extra: LocalWrite[] = [];
      const state = jornadaState(next);
      const designKey = moduleKey(client.slug, "diseno-marca", "trabajos");
      const stage = action === "approve-edit" ? "En producción" : action === "deliver-design" ? "Esperando aprobación" : action === "client-changes" ? "Ajustes" : action === "client-approve" ? "Aprobados" : null;
      if (stage) {
        // Un único pedido a Diseño por jornada (DIS-<jornada>), vinculado a la tarea de la jornada: no se crea otra tarea.
        const design = upsertJornadaDesignRequest(readLocalJson<ModuleRecord[]>(designKey, seedRecords(client.slug, "diseno-marca", "trabajos")), next, { actor, at: next.updatedAt, taskId: task.id, designer: next.values.disenador || designLead(client), stage });
        extra.push({ key: designKey, value: design.records });
      }
      if (state === "Cerrada") {
        const deliveryKey = moduleKey(client.slug, "audiovisuales", "entregas");
        extra.push({ key: deliveryKey, value: upsertJornadaDelivery(readLocalJson<ModuleRecord[]>(deliveryKey, seedRecords(client.slug, "audiovisuales", "entregas")), next, { actor, at: next.updatedAt }) });
      }
      const ok = commit(next, records, task, { eventId: `${client.slug}-${next.id}-${next.updatedAt}-${action}`, kind: notificationKind(action) }, extra);
      if (ok && (action === "validate" || action === "cancel")) syncQuotaBlocks();
      if (ok) store.notify(`${current.values.titulo}: ${state} · responsable ${task.owner}`, "success");
      return ok;
    } catch (error) { store.notify(error instanceof Error ? error.message : "No se pudo avanzar la jornada.", "error"); return false; }
  }

  /** Guarda los datos de la etapa actual sin avanzar (agenda, brief, plan de rodaje, enlaces). */
  function saveFields(record: ModuleRecord, patch: Record<string, string>, providers: AudiovisualProvider[], options: Options = {}) {
    try {
      const { role, actor, tasks } = context(options);
      const { records, current } = fresh(record);
      const allowed = editableFields(current, { role, actor, client, providerId: options.providerId });
      const clean = Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key)).map(([key, value]) => [key, value.trim()]));
      if (!Object.keys(clean).length) throw new Error("No hay cambios para guardar en esta etapa.");
      if (clean.proveedorId) {
        const provider = providers.find((item) => item.id === clean.proveedorId && item.activo);
        if (!provider) throw new Error("Elegí un proveedor activo del catálogo.");
        clean.proveedor = provider.nombre;
      }
      const at = new Date().toISOString();
      const next: ModuleRecord = { ...current, user: actor, updatedAt: at, values: { ...current.values, ...clean }, history: [{ at, user: actor, text: `Actualizó ${Object.keys(clean).filter((key) => key !== "proveedor").join(", ")}` }, ...current.history] };
      const task = buildJornadaTask(client, next, tasks, actor, at, quotaUsage(readQuota(client.slug), records));
      const previous = tasks.find((item) => item.id === task.id);
      return commit(next, records, task, previous && previous.owner !== task.owner ? { eventId: `${client.slug}-${next.id}-${at}-owner`, kind: "owner" } : null);
    } catch (error) { store.notify(error instanceof Error ? error.message : "No se pudo guardar la jornada.", "error"); return false; }
  }

  function comment(record: ModuleRecord, text: string, visibility: JornadaVisibility, options: Options = {}) {
    try {
      const { role, actor, tasks } = context(options);
      if (role === "provider" && visibility !== "provider") throw new Error("Los comentarios del proveedor se comparten con el equipo de la jornada.");
      if (role === "client" && visibility !== "client") throw new Error("Los comentarios del cliente son compartidos.");
      if (role === "provider" && record.values.proveedorId !== options.providerId) throw new Error("Esta jornada no está asignada a tu estudio.");
      const { records, current } = fresh(record);
      const next = addJornadaComment(current, { actor, text, visibility, at: new Date().toISOString() });
      const base = buildJornadaTask(client, next, tasks, actor, next.updatedAt);
      const task = { ...base, comments: [...base.comments, { who: actor, when: next.updatedAt, text: `${visibility === "internal" ? "Interno" : visibility === "provider" ? "Con el proveedor" : "Con el cliente"}: ${text.trim()}` }] };
      return commit(next, records, task, null);
    } catch (error) { store.notify(error instanceof Error ? error.message : "No se pudo guardar el comentario.", "error"); return false; }
  }

  function saveQuota(patch: { contracted: number; period: string; start: string; end: string }) {
    try {
      const { actor } = context({});
      const next = updateQuota(readQuota(client.slug), patch, { actor, at: new Date().toISOString() });
      if (!writeLocalJson(quotaKey(client.slug), next)) throw new Error("No se pudo guardar el cupo en este navegador.");
      syncQuotaBlocks();
      store.notify(`Cupo actualizado: ${next.contracted} jornadas · ${next.period}`, "success");
      return true;
    } catch (error) { store.notify(error instanceof Error ? error.message : "No se pudo guardar el cupo.", "error"); return false; }
  }

  /** Marca (o libera) el bloqueo por cupo en las tareas de las jornadas que esperan validación. */
  function syncQuotaBlocks() {
    const records = readJornadas(client.slug).filter((record) => record.client === client.slug && jornadaState(record) === "Validación");
    const usage = quotaUsage(readQuota(client.slug), readJornadas(client.slug));
    const blocked = usage.available < 1 ? "Sin jornadas disponibles en el cupo contratado" : undefined;
    const ids = new Set(records.map((record) => jornadaTaskId(client.slug, record)));
    const latest = readLocalJson<{ tasks: OsTask[] }>("workspace", { tasks: store.tasks }).tasks;
    if (!latest.some((task) => ids.has(task.id) && task.blocked !== blocked)) return;
    store.commitTasks((tasks) => tasks.map((task) => ids.has(task.id) && task.blocked !== blocked ? { ...task, blocked } : task), []);
  }

  /** Crea, una sola vez, la tarea de cada jornada de demostración que todavía no la tiene (sin notificaciones). */
  function seedDemoTasks() {
    if (!store.localHydrated || !store.servicesOf(client.slug).includes("audiovisuales")) return 0;
    const records = readJornadas(client.slug).filter((record) => record.client === client.slug);
    const latest = readLocalJson<{ tasks: OsTask[] }>("workspace", { tasks: store.tasks }).tasks;
    const missing = records.filter((record) => record.source === "demo" && !latest.some((task) => task.id === jornadaTaskId(client.slug, record)));
    if (!missing.length) return 0;
    const usage = quotaUsage(readQuota(client.slug), records);
    const at = new Date().toISOString();
    const created = missing.map((record) => ({ ...buildJornadaTask(client, record, latest, "Sistema", at, usage), activity: [{ text: "Tarea de demostración creada con la jornada", when: record.createdAt }] }));
    const ok = store.commitTasks((tasks) => [...tasks, ...created.filter((task) => !tasks.some((item) => item.id === task.id))], []);
    return ok ? created.length : 0;
  }

  return { teamRole, create, transition, saveFields, comment, saveQuota, seedDemoTasks };
}
