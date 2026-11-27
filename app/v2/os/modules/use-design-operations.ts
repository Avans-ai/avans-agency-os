"use client";

import { useEffect, useRef } from "react";
import { canEditService, clientOfTask, serviceForTask } from "../director-data";
import { readLocalJson, writeLocalBatch } from "../local-persistence";
import { osProjects, type OsClient, type OsTask } from "../os-data";
import { useOsStore } from "../os-store";
import { previewActor } from "../preview-roles";
import { applyStageTask, assignmentNotification, chainBaseOf, dueKindForDate, isUnassigned, latestChainTask, ownerOrPending, upsertTasks, workflowNotification, type LocalWrite, type StageTaskResult } from "../workflow-tasks";
import type { ModuleRecord } from "./types";
import { DESIGN_DEMO_TASK_DATE } from "./design-demo";
import { designComments, designStage, resetDemoRecords } from "./design-operation";
import { moduleKey, seedRecords } from "./store";

const SERVICE = "diseno-marca";
const DONE = ["Aprobados", "Entregados", "Aprobado", "Hecho", "Entregado", "Cerrado"];

/** Tarea vigente del pedido (la de su etapa actual dentro de la cadena).
 * Las tareas anteriores identifican al cliente por el proyecto, antes de que existiera clientSlug. */
export function designRequestTask(tasks: OsTask[], record: ModuleRecord) {
  if (record.module !== "diseno-marca" || record.collection !== "trabajos") return undefined;
  const first = tasks.find((task) => clientOfTask(task)?.slug === record.client
    && serviceForTask(task) === "diseno-marca"
    && task.workItem?.collection === "trabajos"
    && task.workItem.id === record.id);
  return first ? latestChainTask(tasks, chainBaseOf(first)) ?? first : undefined;
}
/** Pendientes y En producción son el mismo trabajo (diseñar); Aprobados y Entregados cierran el pedido. */
export function designTaskStage(stage: string) {
  return stage === "Pendientes" || stage === "En producción" ? "Producción" : stage;
}
const DESIGN_VERB: Record<string, string> = { "En revisión interna": "Revisar diseño", Ajustes: "Ajustar diseño", "Esperando aprobación": "Registrar aprobación del diseño" };
/** Tarea de la etapa actual del pedido aplicada a su cadena (completa la anterior y crea la siguiente). */
export function designStageTasks(client: OsClient, record: ModuleRecord, tasks: OsTask[], actor: string, at: string): StageTaskResult {
  const previous = designRequestTask(tasks, record);
  const base = previous ? chainBaseOf(previous) : `DESIGN-${client.slug}-${record.id}`;
  return applyStageTask(tasks, buildDesignTask(client, record, previous, actor, at), { base, at, actor, stageKey: designTaskStage });
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
    title: `${DESIGN_VERB[stage] ?? "Diseñar"} · ${record.values.nombre}`,
    // La revisión es del revisor configurado en el pedido; si no hay, queda pendiente de asignación (no se inventa).
    owner: ownerOrPending(review ? record.values.revisor || record.values.responsable : record.values.responsable),
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
    // A content request, a Publicidad digital ad or an audiovisual jornada already owns a single central task; never create a second design task.
    if (record.values.contenidoId || record.values.anuncioId || record.values.jornadaId) {
      if (!options.persistRecord) return true;
      const ok = writeLocalBatch([{ key, value: records.map((item) => item.id === record.id && item.client === client.slug ? record : item) }, ...(options.extraWrites || [])]);
      if (!ok) store.notify("No se pudo guardar en este navegador.", "error");
      return ok;
    }
    const tasks = readLocalJson<{ tasks: OsTask[] }>("workspace", { tasks: store.tasks }).tasks;
    const previous = designRequestTask(tasks, record);
    const at = new Date().toISOString();
    const stage = designStageTasks(client, record, tasks, previewActor(store.role), at);
    const task = stage.current;
    const savedRecord = { ...record, values: { ...record.values, tareaId: task.id } };
    // El pedido se guarda con el id de su tarea vigente, en el mismo lote que la cadena de tareas.
    const writes = options.persistRecord ? [{ key, value: oldRecord ? records.map((item) => item.id === record.id && item.client === client.slug ? savedRecord : item) : [savedRecord, ...records] }] : [];
    const notification = isUnassigned(task.owner) || task.status === "Hecho" ? undefined
      : stage.created && previous ? workflowNotification(task, `${client.slug}-${record.id}-${record.updatedAt}`, at, "assignment")
        : !previous ? assignmentNotification(task, at) ?? workflowNotification(task, `${client.slug}-${record.id}-${record.updatedAt}`, at, "assignment")
          : previous.owner !== task.owner ? workflowNotification(task, `${client.slug}-${record.id}-${record.updatedAt}`, at, "owner") : undefined;
    return store.commitWorkflow(stage.changed, notification, [...writes, ...(options.extraWrites || [])]);
  }
  /** Crea, una sola vez, la tarea central de cada pedido de demostración que todavía no la tiene. */
  function seedDemoTasks(force = false) {
    if (!store.localHydrated || !store.servicesOf(client.slug).includes(SERVICE)) return 0;
    const key = moduleKey(client.slug, SERVICE, "trabajos");
    let created = 0;
    const pending = readLocalJson<ModuleRecord[]>(key, seedRecords(client.slug, SERVICE, "trabajos"))
      .filter((record) => record.client === client.slug && record.source === "demo" && !record.values.contenidoId && !record.values.anuncioId && !record.values.jornadaId && (force || !record.values.tareaId));
    for (const target of pending) {
      const records = readLocalJson<ModuleRecord[]>(key, seedRecords(client.slug, SERVICE, "trabajos"));
      const tasks = readLocalJson<{ tasks: OsTask[] }>("workspace", { tasks: store.tasks }).tasks;
      const existing = designRequestTask(tasks, target);
      if (existing && !force) {
        if (!store.commitWorkflow(existing, undefined, [{ key, value: records.map((r) => r.id === target.id && r.client === client.slug ? { ...r, values: { ...r.values, tareaId: existing.id } } : r) }])) break;
        continue;
      }
      const base = buildDesignTask(client, target, undefined, "Sistema", DESIGN_DEMO_TASK_DATE);
      // Al reiniciar, la demo vuelve a su primera tarea: se quitan las tareas de etapas posteriores de esa cadena.
      const baseId = existing ? chainBaseOf(existing) : base.id;
      const task: OsTask = { ...base, id: baseId, chainId: undefined, cycle: 1, createdAt: DESIGN_DEMO_TASK_DATE, activity: [{ text: "Tarea de demostración creada con el pedido", when: DESIGN_DEMO_TASK_DATE }],
        comments: designComments(target).map((comment) => ({ who: comment.actor, when: comment.at, text: comment.text })) };
      const value = records.map((r) => r.id === target.id && r.client === client.slug ? { ...r, values: { ...r.values, tareaId: task.id } } : r);
      if (!store.commitTasks((latest) => upsertTasks(latest.filter((item) => item.chainId !== baseId), [task]), [{ key, value }])) break;
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
