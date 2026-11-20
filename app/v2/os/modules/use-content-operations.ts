"use client";

import { canEditService } from "../director-data";
import { readLocalJson } from "../local-persistence";
import type { OsClient, OsTask } from "../os-data";
import { useOsStore } from "../os-store";
import { previewActor } from "../preview-roles";
import { projectPortalContent } from "../portal/portal-model";
import { buildContentTask, contentOwner, contentTaskId, workflowNotification, type LocalWrite } from "../workflow-tasks";
import { addContentComment, applyContentAction, contentComments, contentState, contentTransitions, type ContentAction, type ContentRole } from "./content-workflow";
import { createDesignVersion, upsertDesignRequest } from "./design-model";
import { moduleKey, seedRecords } from "./store";
import type { ModuleRecord } from "./types";

export type ContentOperationOptions = { comment?: string; actor?: string; role?: ContentRole; patch?: Record<string, string> };
export type ContentCommentOptions = { text: string; actor?: string; role?: ContentRole; visibility: "client" | "internal"; attachmentUrl?: string; attachmentName?: string; attachmentId?: string };
export function useContentOperations(client: OsClient) {
  const store = useOsStore();
  const role: ContentRole | undefined = store.role === "operativo" ? "content" : ["admin", "pm", "content", "designer", "client"].includes(store.role) ? store.role as ContentRole : undefined;

  function current(record: ModuleRecord, requestedRole?: ContentRole) {
    if (!store.localHydrated) throw new Error("Esperá a que termine de cargar la cuenta.");
    if (record.client !== client.slug || record.module !== "contenidos" || record.collection !== "piezas") throw new Error("El contenido no pertenece a esta cuenta.");
    // Explicit client context is used only by the isolated local portal, never as server identity.
    if (requestedRole !== "client" && !canEditService(store.role, client.slug, "contenidos")) throw new Error("Tu rol no puede modificar contenidos de esta cuenta.");
    if (!role && requestedRole !== "client") throw new Error("Este perfil no participa de la revisión de contenidos.");
    const key = moduleKey(client.slug, "contenidos", "piezas");
    const records = readLocalJson<ModuleRecord[]>(key, seedRecords(client.slug, "contenidos", "piezas"));
    const fresh = records.find((item) => item.id === record.id && item.client === client.slug);
    if (!fresh) throw new Error("No se encontró el contenido. Volvé a abrirlo.");
    if (fresh.updatedAt !== record.updatedAt || JSON.stringify(fresh.values) !== JSON.stringify(record.values)) throw new Error("El contenido cambió en otra vista. Revisá la versión actual antes de continuar.");
    const tasks = readLocalJson<{ tasks: OsTask[] }>("workspace", { tasks: store.tasks }).tasks;
    return { key, records, fresh, tasks };
  }
  function save(record: ModuleRecord, records: ModuleRecord[], task: OsTask, eventId?: string, kind?: Parameters<typeof workflowNotification>[3], extraWrites: LocalWrite[] = []) {
    const writes: LocalWrite[] = [...extraWrites, { key: moduleKey(client.slug, "contenidos", "piezas"), value: records.map((item) => item.id === record.id && item.client === client.slug ? record : item) }];
    const state = contentState(record);
    const designKey = moduleKey(client.slug, "diseno-marca", "trabajos");
    const designRecords = readLocalJson<ModuleRecord[]>(designKey, seedRecords(client.slug, "diseno-marca", "trabajos"));
    if (state === "Producción de diseño" || (state === "Ajustes" && ["Revisión interna del diseño", "Aprobación final del cliente"].includes(record.values.returnState))) {
      const result = upsertDesignRequest(designRecords, { ...record, values: { ...record.values, disenador: contentOwner(client, record) } }, { actor: record.user, at: record.updatedAt });
      writes.push({ key: designKey, value: result.records.map((item) => item.id === result.request.id ? { ...item, values: { ...item.values, tareaId: task.id } } : item) });
    } else if (designRecords.some((item) => item.values.contenidoId === record.id)) {
      writes.push({ key: designKey, value: designRecords.map((item) => item.values.contenidoId === record.id && item.client === client.slug ? { ...item, updatedAt: record.updatedAt, values: { ...item.values, estado: ["Aprobado", "Programado", "Publicada"].includes(state) ? "Aprobado" : "En aprobación", tareaId: task.id, archivo: record.values.archivoDiseno || item.values.archivo || "" } } : item) });
    }
    const lastAction = contentTransitions(record).at(-1)?.action;
    if (record.values.archivoDiseno && ["Revisión interna del diseño", "Aprobación final del cliente", "Aprobado", "Programado"].includes(state)) {
      const libraryKey = moduleKey(client.slug, "diseno-marca", "biblioteca");
      const library = readLocalJson<ModuleRecord[]>(libraryKey, []);
      const versions = library.filter((item) => item.client === client.slug && item.values.contenidoId === record.id);
      const same = versions.find((item) => item.values.archivo === record.values.archivoDiseno && (item.values.version === record.values.version || item.values.versionContenido === record.values.version));
      const status = ["Aprobado", "Programado"].includes(state) ? "Aprobado" : "En revisión";
      if (same) writes.push({ key: libraryKey, value: library.map((item) => item.id === same.id ? { ...item, updatedAt: record.updatedAt, values: { ...item.values, estado: status } } : item) });
      else if (lastAction === "deliver-design" || lastAction === "resubmit") {
        const previous = versions.sort((a, b) => Number(b.values.version) - Number(a.values.version))[0];
        const result = createDesignVersion(library, { client: client.slug, id: `PIE-${crypto.randomUUID()}`, previousId: previous?.id,
          values: { nombre: record.values.titulo, contenidoId: record.id, pedidoId: designRecords.find((item) => item.values.contenidoId === record.id)?.id || `DIS-${record.id}`, servicioOrigen: "contenidos", categoria: "Redes", archivo: record.values.archivoDiseno, versionContenido: record.values.version || "", responsable: record.values.disenador || record.user, fecha: record.updatedAt.slice(0, 10), estado: status } }, { actor: record.user, at: record.updatedAt });
        writes.push({ key: libraryKey, value: result.records });
      }
    }
    const notification = eventId ? workflowNotification(task, eventId, record.updatedAt, kind) : undefined;
    return store.commitWorkflow(task, notification, writes);
  }
  function transition(record: ModuleRecord, action: ContentAction, options: ContentOperationOptions = {}) {
    try {
      const { records, fresh, tasks } = current(record, options.role);
      const effectiveRole = options.role === "client" ? "client" : role!;
      const actor = options.actor || previewActor(store.role);
      let next = applyContentAction(fresh, action, { ...options, actor, role: effectiveRole, taskId: contentTaskId(client.slug, fresh, tasks) });
      const transitions = contentTransitions(next);
      transitions[transitions.length - 1].responsible = contentOwner(client, next);
      next = { ...next, values: { ...next.values, contentTransitions: JSON.stringify(transitions) } };
      const task = buildContentTask(client, next, tasks, actor, next.updatedAt);
      return save(next, records, task, `${client.slug}-${record.id}-${transitions[transitions.length - 1].id}`, effectiveRole === "client" ? "client-response" : action === "request-changes" ? "changes" : action.startsWith("approve") ? "approval" : action === "request-information" ? "blocked" : "review");
    } catch (error) { store.notify(error instanceof Error ? error.message : "No se pudo completar la transición.", "error"); return false; }
  }
  function sync(record: ModuleRecord) {
    try {
      const { records, fresh, tasks } = current(record);
      const task = buildContentTask(client, fresh, tasks, previewActor(store.role), fresh.updatedAt);
      const previous = tasks.find((item) => item.id === task.id);
      const changedOwner = previous?.owner !== task.owner;
      return save(fresh, records, task, !previous || changedOwner ? `${client.slug}-${record.id}-${fresh.updatedAt}` : undefined, previous ? "owner" : "assignment");
    } catch (error) { store.notify(error instanceof Error ? error.message : "No se pudo vincular la tarea.", "error"); return false; }
  }
  function comment(record: ModuleRecord, options: ContentCommentOptions) {
    try {
      const { records, fresh, tasks } = current(record, options.role);
      const fromClient = options.role === "client";
      if (fromClient && options.visibility !== "client") throw new Error("Los comentarios del cliente son compartidos.");
      if (fromClient && !projectPortalContent(fresh, client.slug)) throw new Error("Este contenido todavía no está disponible para el cliente.");
      const actor = options.actor || previewActor(store.role);
      const next = addContentComment(fresh, { ...options, actor });
      const task = buildContentTask(client, next, tasks, actor, next.updatedAt);
      if (fromClient) {
        task.owner = next.values.responsable || client.team.find((p) => /Contenido/.test(p.role))?.name || "Content por asignar";
        task.title = `Revisar respuesta del cliente · ${next.values.titulo}`;
        task.status = "Por hacer";
        task.completedAt = undefined;
      }
      const last = contentComments(next).at(-1)!;
      task.comments = [...task.comments, { who: actor, when: next.updatedAt, text: options.text || "Adjuntó material" }];
      return save(next, records, task, `${client.slug}-${record.id}-${last.id}`, fromClient ? "client-response" : "review");
    } catch (error) { store.notify(error instanceof Error ? error.message : "No se pudo guardar el comentario.", "error"); return false; }
  }
  function saveDraft(values: Record<string, string>, previous?: ModuleRecord, extraWrites: LocalWrite[] | ((record: ModuleRecord) => LocalWrite[]) = []): ModuleRecord | null {
    try {
      if (!store.localHydrated || !["admin", "pm", "content", "operativo"].includes(store.role) || !canEditService(store.role, client.slug, "contenidos")) throw new Error("Tu rol no puede editar propuestas de esta cuenta.");
      if (!values.titulo?.trim()) throw new Error("Completá el título del contenido.");
      if (previous && !["Borrador", "Ajustes"].includes(contentState(previous))) throw new Error("La propuesta está en revisión. Solicitá ajustes antes de modificarla.");
      const data = previous ? current(previous) : {
        records: readLocalJson<ModuleRecord[]>(moduleKey(client.slug, "contenidos", "piezas"), seedRecords(client.slug, "contenidos", "piezas")),
        tasks: readLocalJson<{ tasks: OsTask[] }>("workspace", { tasks: store.tasks }).tasks,
      };
      const at = new Date().toISOString(), actor = previewActor(store.role);
      const protectedKeys = new Set(["estado", "clientSnapshot", "contentTransitions", "contentComments", "preliminaryApprovedAt", "finalApprovedAt", "returnState", "informationReturnState", "tareaId"]);
      const patch = Object.fromEntries(Object.entries(values).filter(([key]) => !protectedKeys.has(key)));
      for (const [field, collection] of [["eje", "ejes"], ["plan", "planes"]]) {
        if (patch[field] && !readLocalJson<ModuleRecord[]>(moduleKey(client.slug, "contenidos", collection), seedRecords(client.slug, "contenidos", collection)).some((item) => item.id === patch[field] && item.client === client.slug)) throw new Error(`La referencia de ${field} no pertenece a este cliente.`);
      }
      const record: ModuleRecord = { ...previous,
        id: previous?.id || `PZA-${crypto.randomUUID()}`, client: client.slug, module: "contenidos", collection: "piezas", source: previous?.source || "manual", createdAt: previous?.createdAt || at, updatedAt: at, user: actor,
        values: { ...previous?.values, ...patch, estado: previous ? contentState(previous) : "Borrador" },
        history: [{ at, user: actor, text: previous ? "Actualizó la propuesta de contenido" : "Creó el borrador de contenido" }, ...(previous?.history || [])],
      };
      record.values.tareaId = contentTaskId(client.slug, record, data.tasks);
      const task = buildContentTask(client, record, data.tasks, actor, at);
      const oldTask = data.tasks.find((item) => item.id === task.id);
      const event = !oldTask || oldTask.owner !== task.owner ? `${client.slug}-${record.id}-${at}` : undefined;
      return save(record, previous ? data.records : [record, ...data.records], task, event, oldTask ? "owner" : "assignment", typeof extraWrites === "function" ? extraWrites(record) : extraWrites) ? record : null;
    } catch (error) { store.notify(error instanceof Error ? error.message : "No se pudo guardar el contenido.", "error"); return null; }
  }
  return { transition, sync, comment, saveDraft };
}
