"use client";

import { useEffect, useRef } from "react";
import { canEditService, clientOfTask, serviceForTask } from "../director-data";
import { readLocalJson, writeLocalBatch } from "../local-persistence";
import { osProjects, type OsClient, type OsTask } from "../os-data";
import { useOsStore } from "../os-store";
import { previewActor } from "../preview-roles";
import { dueKindForDate, workflowNotification, type LocalWrite } from "../workflow-tasks";
import type { ModuleRecord } from "./types";
import { DESIGN_DEMO_TASK_DATE } from "./design-demo";
import { designComments, designStage, resetDemoRecords } from "./design-operation";
import { moduleKey, seedRecords } from "./store";

const SERVICE = "diseno-marca";
const DONE = ["Aprobados", "Entregados", "Aprobado", "Hecho", "Entregado", "Cerrado"];

/** Older module tasks identify their client through the project, before clientSlug existed. */
export function designRequestTask(tasks: OsTask[], record: ModuleRecord) {
  if (record.module !== "diseno-marca" || record.collection !== "trabajos") return undefined;
  return tasks.find((task) => clientOfTask(task)?.slug === record.client
    && serviceForTask(task) === "diseno-marca"
    && task.workItem?.collection === "trabajos"
    && task.workItem.id === record.id);
}

/** Tarea única del pedido: la misma entidad se actualiza en cada cambio de estado o responsable. */
export function buildDesignTask(client: OsClient, record: ModuleRecord, previous: OsTask | undefined, actor: string, at: string): OsTask {
  const stage = designStage(record);
  const done = DONE.includes(stage);
  const review = stage === "En revisión interna" || stage === "Esperando aprobación";
  return {
    ...previous, id: previous?.id || `DESIGN-${client.slug}-${record.id}`, clientSlug: client.slug,
    projectSlug: previous?.projectSlug || osProjects.find((p) => p.clientSlug === client.slug)?.slug || "", serviceId: "diseno-marca",
    workItem: { id: record.id, collection: "trabajos", label: record.values.nombre },
    workflow: { kind: "design", stage, href: `/v2/clientes/${client.slug}/diseno-marca?seccion=pedidos&registro=${encodeURIComponent(record.id)}` },
    title: `Diseñar · ${record.values.nombre}`, owner: record.values.responsable || "Diseñador por asignar",
    prio: (["Alta", "Media", "Baja"] as const).find((p) => p === record.values.prioridad) || previous?.prio || "Media",
    due: record.values.fechaObjetivo || "Sin fecha", dueKind: done ? "past" : dueKindForDate(record.values.fechaObjetivo, at),
    approver: review ? record.values.revisor || undefined : undefined,
    status: done ? "Hecho" : review ? "En aprobación" : stage === "Pendientes" ? "Por hacer" : "En curso",
    desc: [record.values.objetivo, record.values.detalle, [record.values.tipoPieza, record.values.canal, record.values.formatos, record.values.medidas].filter(Boolean).join(" · "), record.values.referencias, record.values.materiales, record.values.recursos].filter(Boolean).join("\n\n"),
    files: previous?.files || [], comments: previous?.comments || [], activity: [{ text: `${actor}: ${stage}`, when: at }, ...(previous?.activity || [])],
    completedAt: done ? previous?.completedAt || at : undefined,
  };
}

export function useDesignOperations(client: OsClient) {
  const store = useOsStore();
  function syncDesignRequest(record: ModuleRecord, options: { persistRecord?: boolean; expectedUpdatedAt?: string; extraWrites?: LocalWrite[] } = {}) {
    if (!store.localHydrated || record.client !== client.slug || record.module !== "diseno-marca" || record.collection !== "trabajos" || !canEditService(store.role, client.slug, "diseno-marca")) return false;
    const key = moduleKey(client.slug, "diseno-marca", "trabajos");
    const records = readLocalJson<ModuleRecord[]>(key, seedRecords(client.slug, "diseno-marca", "trabajos"));
    const oldRecord = records.find((item) => item.id === record.id && item.client === client.slug);
    if (options.persistRecord && ((options.expectedUpdatedAt && oldRecord?.updatedAt !== options.expectedUpdatedAt) || (!options.expectedUpdatedAt && oldRecord))) {
      store.notify("El pedido cambió en otra vista. Volvé a abrirlo antes de guardar.", "error");
      return false;
    }
    // A content (or audiovisual jornada) request already owns a single central task; never create a second design task.
    if (record.values.contenidoId || record.values.jornadaId) {
      if (!options.persistRecord) return true;
      const ok = writeLocalBatch([{ key, value: records.map((item) => item.id === record.id && item.client === client.slug ? record : item) }, ...(options.extraWrites || [])]);
      if (!ok) store.notify("No se pudo guardar en este navegador.", "error");
      return ok;
    }
    const tasks = readLocalJson<{ tasks: OsTask[] }>("workspace", { tasks: store.tasks }).tasks;
    const previous = designRequestTask(tasks, record);
    const at = new Date().toISOString();
    const task = buildDesignTask(client, record, previous, previewActor(store.role), at);
    const savedRecord = { ...record, values: { ...record.values, tareaId: task.id } };
    const writes = options.persistRecord ? [{ key, value: oldRecord ? records.map((item) => item.id === record.id && item.client === client.slug ? savedRecord : item) : [savedRecord, ...records] }] : [];
    const notification = !previous || previous.owner !== task.owner || previous.workflow?.stage !== task.workflow?.stage ? workflowNotification(task, `${client.slug}-${record.id}-${record.updatedAt}`, at, previous ? "owner" : "assignment") : undefined;
    return store.commitWorkflow(task, notification, [...writes, ...(options.extraWrites || [])]);
  }
  /** Crea, una sola vez, la tarea central de cada pedido de demostración que todavía no la tiene. */
  function seedDemoTasks(force = false) {
    if (!store.localHydrated || !store.servicesOf(client.slug).includes(SERVICE)) return 0;
    const key = moduleKey(client.slug, SERVICE, "trabajos");
    let created = 0;
    const pending = readLocalJson<ModuleRecord[]>(key, seedRecords(client.slug, SERVICE, "trabajos"))
      .filter((record) => record.client === client.slug && record.source === "demo" && !record.values.contenidoId && !record.values.jornadaId && (force || !record.values.tareaId));
    for (const target of pending) {
      const records = readLocalJson<ModuleRecord[]>(key, seedRecords(client.slug, SERVICE, "trabajos"));
      const tasks = readLocalJson<{ tasks: OsTask[] }>("workspace", { tasks: store.tasks }).tasks;
      const existing = designRequestTask(tasks, target);
      if (existing && !force) {
        if (!store.commitWorkflow(existing, undefined, [{ key, value: records.map((r) => r.id === target.id && r.client === client.slug ? { ...r, values: { ...r.values, tareaId: existing.id } } : r) }])) break;
        continue;
      }
      const base = buildDesignTask(client, target, undefined, "Sistema", DESIGN_DEMO_TASK_DATE);
      const task: OsTask = { ...base, id: existing?.id || base.id, activity: [{ text: "Tarea de demostración creada con el pedido", when: DESIGN_DEMO_TASK_DATE }],
        comments: designComments(target).map((comment) => ({ who: comment.actor, when: comment.at, text: comment.text })) };
      const value = records.map((r) => r.id === target.id && r.client === client.slug ? { ...r, values: { ...r.values, tareaId: task.id } } : r);
      if (!store.commitWorkflow(task, undefined, [{ key, value }])) break;
      created++;
    }
    return created;
  }

  /** Quita solo los registros `demo` de este cliente en Diseño de marca y vuelve a cargar las semillas. */
  function resetDemo() {
    if (!canEditService(store.role, client.slug, SERVICE)) return false;
    const writes: LocalWrite[] = ["sistema", "trabajos", "biblioteca"].map((collection) => {
      const key = moduleKey(client.slug, SERVICE, collection);
      const seeds = seedRecords(client.slug, SERVICE, collection);
      return { key, value: resetDemoRecords(readLocalJson<ModuleRecord[]>(key, seeds), seeds, client.slug) };
    });
    if (!writeLocalBatch(writes)) { store.notify("No se pudieron reiniciar los datos de demostración.", "error"); return false; }
    seedDemoTasks(true);
    store.notify("Datos de demostración reiniciados · los registros manuales se conservaron", "success");
    return true;
  }
  return { syncDesignRequest, seedDemoTasks, resetDemo };
}

/** Siembra las tareas de demostración al abrir el módulo, sin duplicarlas. */
export function useDesignDemoTasks(client: OsClient) {
  const store = useOsStore();
  const { seedDemoTasks } = useDesignOperations(client);
  const done = useRef(false);
  const ready = store.localHydrated && store.servicesOf(client.slug).includes(SERVICE);
  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    seedDemoTasks();
  });
}
