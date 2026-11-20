"use client";

import { canEditService, clientOfTask, serviceForTask } from "../director-data";
import { readLocalJson } from "../local-persistence";
import { osProjects, type OsClient, type OsTask } from "../os-data";
import { useOsStore } from "../os-store";
import { previewActor } from "../preview-roles";
import { dueKindForDate, workflowNotification } from "../workflow-tasks";
import type { ModuleRecord } from "./types";
import { moduleKey, seedRecords } from "./store";

/** Older module tasks identify their client through the project, before clientSlug existed. */
export function designRequestTask(tasks: OsTask[], record: ModuleRecord) {
  if (record.module !== "diseno-marca" || record.collection !== "trabajos") return undefined;
  return tasks.find((task) => clientOfTask(task)?.slug === record.client
    && serviceForTask(task) === "diseno-marca"
    && task.workItem?.collection === "trabajos"
    && task.workItem.id === record.id);
}

export function useDesignOperations(client: OsClient) {
  const store = useOsStore();
  function syncDesignRequest(record: ModuleRecord, options: { persistRecord?: boolean; expectedUpdatedAt?: string } = {}) {
    if (!store.localHydrated || record.client !== client.slug || record.module !== "diseno-marca" || record.collection !== "trabajos" || !canEditService(store.role, client.slug, "diseno-marca")) return false;
    // A content request already owns a single central task; never create a second design task.
    if (record.values.contenidoId) return true;
    const tasks = readLocalJson<{ tasks: OsTask[] }>("workspace", { tasks: store.tasks }).tasks;
    const key = moduleKey(client.slug, "diseno-marca", "trabajos");
    const records = readLocalJson<ModuleRecord[]>(key, seedRecords(client.slug, "diseno-marca", "trabajos"));
    const oldRecord = records.find((item) => item.id === record.id && item.client === client.slug);
    if (options.persistRecord && ((options.expectedUpdatedAt && oldRecord?.updatedAt !== options.expectedUpdatedAt) || (!options.expectedUpdatedAt && oldRecord))) {
      store.notify("El pedido cambió en otra vista. Volvé a abrirlo antes de guardar.", "error");
      return false;
    }
    const previous = designRequestTask(tasks, record);
    const at = new Date().toISOString();
    const stage = record.values.estado || "Por hacer";
    const task: OsTask = {
      ...previous, id: previous?.id || `DESIGN-${client.slug}-${record.id}`, clientSlug: client.slug,
      projectSlug: previous?.projectSlug || osProjects.find((p) => p.clientSlug === client.slug)?.slug || "", serviceId: "diseno-marca",
      workItem: { id: record.id, collection: "trabajos", label: record.values.nombre },
      workflow: { kind: "design", stage, href: `/v2/clientes/${client.slug}/diseno-marca?seccion=pedidos&registro=${encodeURIComponent(record.id)}` },
      title: `Diseñar · ${record.values.nombre}`, owner: record.values.responsable || "Diseñador por asignar", prio: previous?.prio || "Media",
      due: record.values.fechaObjetivo || "Sin fecha", dueKind: dueKindForDate(record.values.fechaObjetivo, at),
      status: ["Aprobado", "Hecho", "Entregado", "Cerrado"].includes(stage) ? "Hecho" : /aprobación|revisión/i.test(stage) ? "En aprobación" : "Por hacer",
      desc: [record.values.detalle, record.values.objetivo, record.values.canal, record.values.formatos, record.values.referencias, record.values.recursos].filter(Boolean).join("\n\n"),
      files: previous?.files || [], comments: previous?.comments || [], activity: [{ text: `${previewActor(store.role)}: ${stage}`, when: at }, ...(previous?.activity || [])],
      completedAt: ["Aprobado", "Hecho", "Entregado", "Cerrado"].includes(stage) ? at : undefined,
    };
    const savedRecord = { ...record, values: { ...record.values, tareaId: task.id } };
    const writes = options.persistRecord ? [{ key, value: oldRecord ? records.map((item) => item.id === record.id && item.client === client.slug ? savedRecord : item) : [savedRecord, ...records] }] : [];
    const notification = !previous || previous.owner !== task.owner || previous.workflow?.stage !== stage ? workflowNotification(task, `${client.slug}-${record.id}-${record.updatedAt}`, at, previous ? "owner" : "assignment") : undefined;
    return store.commitWorkflow(task, notification, writes);
  }
  return { syncDesignRequest };
}
