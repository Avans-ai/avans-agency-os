"use client";

import { canEditService } from "../director-data";
import { readLocalJson } from "../local-persistence";
import type { OsClient, OsTask } from "../os-data";
import { useOsStore } from "../os-store";
import { previewActor } from "../preview-roles";
import { projectPortalContent } from "../portal/portal-model";
import { buildContentTask, contentOwner, contentTaskId, workflowNotification, type LocalWrite } from "../workflow-tasks";
import { resetContentDemo } from "./content-demo-tasks";
import { upsertContentDesignRequest } from "./content-design";
import { addContentComment, applyContentAction, clientRequests, clientRequestValues, contentComments, contentState, contentTransitions, PREPRODUCTION_FIELDS, recordContentChange, type ContentAction, type ContentRole } from "./content-workflow";
import { createDesignVersion } from "./design-model";
import { buildGuidelineOverride, GUIDELINE_OVERRIDE_FIELD, guidelineOverrides, type GuidelineWarning } from "./content-guideline-check";
import { moduleKey, seedRecords } from "./store";
import type { ModuleRecord } from "./types";

export type ContentOperationOptions = { comment?: string; actor?: string; role?: ContentRole; patch?: Record<string, string>; /** Advertencias de lineamientos que el Content decidió ignorar: quedan en el historial. */ guidelineOverride?: GuidelineWarning[] };
export type ContentCommentOptions = { text: string; actor?: string; role?: ContentRole; visibility: "client" | "internal"; attachmentUrl?: string; attachmentName?: string; attachmentId?: string; requestId?: string };
const PREPRODUCTION_STATES = ["Preproducción", "Producción de diseño", "Información del cliente"];
function parseOverride(raw?: string): GuidelineWarning[] {
  if (!raw) return [];
  try { const value: unknown = JSON.parse(raw); return Array.isArray(value) ? value as GuidelineWarning[] : []; } catch { return []; }
}
/** Registra que el Content siguió adelante pese a las advertencias de lineamientos (sin IA). */
function withGuidelineOverride(record: ModuleRecord, warnings: GuidelineWarning[], actor: string, at: string, stage: string): ModuleRecord {
  const previous = guidelineOverrides(record.values.guidelineChecks);
  const entry = buildGuidelineOverride(warnings, actor, at, stage, previous);
  const terms = warnings.map((warning) => `«${warning.term}» (${warning.sourceLabel})`).join(", ");
  return { ...record, values: { ...record.values, guidelineChecks: JSON.stringify([...previous, entry]) }, history: [{ at, user: actor, text: `${stage} con advertencias de lineamientos: ${terms}` }, ...record.history] };
}
export function useContentOperations(client: OsClient) {
  const store = useOsStore();
  const role: ContentRole | undefined = store.role === "operativo" ? "content" : ["admin", "pm", "content", "designer", "client"].includes(store.role) ? store.role as ContentRole : undefined;
  const read = (serviceId: "contenidos" | "diseno-marca", collection: string) => readLocalJson<ModuleRecord[]>(moduleKey(client.slug, serviceId, collection), seedRecords(client.slug, serviceId, collection));

  function current(record: ModuleRecord, requestedRole?: ContentRole) {
    if (!store.localHydrated) throw new Error("Esperá a que termine de cargar la cuenta.");
    if (record.client !== client.slug || record.module !== "contenidos" || record.collection !== "piezas") throw new Error("El contenido no pertenece a esta cuenta.");
    // Explicit client context is used only by the isolated local portal, never as server identity.
    if (requestedRole !== "client" && !canEditService(store.role, client.slug, "contenidos")) throw new Error("Tu rol no puede modificar contenidos de esta cuenta.");
    if (!role && requestedRole !== "client") throw new Error("Este perfil no participa de la revisión de contenidos.");
    const key = moduleKey(client.slug, "contenidos", "piezas");
    const records = read("contenidos", "piezas");
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
    const designRecords = read("diseno-marca", "trabajos");
    if (state === "Producción de diseño" || (state === "Ajustes" && ["Revisión interna del diseño", "Aprobación final del cliente"].includes(record.values.returnState))) {
      // Un único pedido por contenido, con propuesta, preproducción, pedidos al cliente y recursos del Design System.
      const axis = read("contenidos", "ejes").find((item) => item.id === record.values.eje);
      const result = upsertContentDesignRequest(designRecords, record, { actor: record.user, at: record.updatedAt, taskId: task.id, designer: contentOwner(client, record), system: read("diseno-marca", "sistema"), axis });
      writes.push({ key: designKey, value: result.records });
    } else if (designRecords.some((item) => item.values.contenidoId === record.id)) {
      writes.push({ key: designKey, value: designRecords.map((item) => item.values.contenidoId === record.id && item.client === client.slug ? { ...item, updatedAt: record.updatedAt, values: { ...item.values, estado: ["Aprobado", "Programado", "Publicada"].includes(state) ? "Aprobado" : "En aprobación", tareaId: task.id, archivo: record.values.archivoDiseno || item.values.archivo || "" } } : item) });
    }
    const lastAction = contentTransitions(record).at(-1)?.action;
    if (record.values.archivoDiseno && ["Revisión interna del diseño", "Aprobación final del cliente", "Aprobado", "Programado"].includes(state)) {
      const libraryKey = moduleKey(client.slug, "diseno-marca", "biblioteca");
      const library = read("diseno-marca", "biblioteca");
      const versions = library.filter((item) => item.client === client.slug && item.values.contenidoId === record.id);
      // Una versión ya registrada se reconoce por su archivo o por la versión del contenido: nunca se duplica.
      const same = versions.find((item) => item.values.archivo === record.values.archivoDiseno || item.values.enlace === record.values.archivoDiseno || (Boolean(record.values.version) && item.values.versionContenido === record.values.version));
      const status = ["Aprobado", "Programado"].includes(state) ? "Aprobado" : "En revisión";
      if (same) writes.push({ key: libraryKey, value: library.map((item) => item.id === same.id ? { ...item, updatedAt: record.updatedAt, values: { ...item.values, estado: status } } : item) });
      else if (lastAction === "deliver-design" || lastAction === "resubmit") {
        const previous = versions.sort((a, b) => Number(b.values.version) - Number(a.values.version))[0];
        const result = createDesignVersion(library, { client: client.slug, id: `PIE-${crypto.randomUUID()}`, previousId: previous?.id,
          values: { nombre: record.values.titulo, contenidoId: record.id, pedidoId: designRecords.find((item) => item.values.contenidoId === record.id)?.id || `DIS-${record.id}`, servicioOrigen: "contenidos", categoria: "Redes", archivo: record.values.archivoDiseno, versionContenido: record.values.version || "", responsable: record.values.disenador || record.user, fecha: record.updatedAt.slice(0, 10), estado: status } }, { actor: record.user, at: record.updatedAt });
        // La versión derivada hereda el origen del contenido (demo o manual), como el pedido de diseño.
        writes.push({ key: libraryKey, value: result.records.map((item) => item.id === result.record.id ? { ...item, source: record.source } : item) });
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
      if (options.guidelineOverride?.length) next = withGuidelineOverride(next, options.guidelineOverride, actor, next.updatedAt, `Enviar a revisión · ${transitions[transitions.length - 1].to}`);
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
      let next = addContentComment(fresh, { ...options, actor });
      if (options.requestId) {
        // Respuesta a un pedido estructurado: queda recibido con su material y fecha.
        const list = clientRequests(fresh.values);
        if (!list.some((item) => item.id === options.requestId)) throw new Error("El pedido ya no existe en este contenido.");
        const updated = list.map((item) => item.id === options.requestId ? { ...item, status: "Recibido" as const, responseAt: next.updatedAt, responseBy: actor, response: options.text, attachmentId: options.attachmentId || item.attachmentId, attachmentName: options.attachmentName || item.attachmentName, attachmentUrl: options.attachmentUrl || item.attachmentUrl } : item);
        next = { ...next, values: { ...next.values, ...clientRequestValues(updated) } };
      }
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
        records: read("contenidos", "piezas"),
        tasks: readLocalJson<{ tasks: OsTask[] }>("workspace", { tasks: store.tasks }).tasks,
      };
      const at = new Date().toISOString(), actor = previewActor(store.role);
      const override = parseOverride(values[GUIDELINE_OVERRIDE_FIELD]);
      const protectedKeys = new Set(["estado", "clientSnapshot", "contentTransitions", "contentComments", "contentChanges", "preliminaryApprovedAt", "finalApprovedAt", "returnState", "informationReturnState", "tareaId", "demo", "guidelineChecks", GUIDELINE_OVERRIDE_FIELD]);
      const patch = Object.fromEntries(Object.entries(values).filter(([key]) => !protectedKeys.has(key)));
      for (const [field, collection] of [["eje", "ejes"], ["plan", "planes"]]) {
        if (patch[field] && !read("contenidos", collection).some((item) => item.id === patch[field] && item.client === client.slug)) throw new Error(`La referencia de ${field} no pertenece a este cliente.`);
      }
      const merged = { ...previous?.values, ...patch, estado: previous ? contentState(previous) : "Borrador" };
      let record: ModuleRecord = { ...previous,
        id: previous?.id || `PZA-${crypto.randomUUID()}`, client: client.slug, module: "contenidos", collection: "piezas", source: previous?.source || "manual", createdAt: previous?.createdAt || at, updatedAt: at, user: actor,
        values: previous ? recordContentChange(previous, merged, actor, at) : merged,
        history: [{ at, user: actor, text: previous ? "Actualizó la propuesta de contenido" : "Creó el borrador de contenido" }, ...(previous?.history || [])],
      };
      if (override.length) record = withGuidelineOverride(record, override, actor, at, "Guardar borrador");
      record.values.tareaId = contentTaskId(client.slug, record, data.tasks);
      const task = buildContentTask(client, record, data.tasks, actor, at);
      const oldTask = data.tasks.find((item) => item.id === task.id);
      const event = !oldTask || oldTask.owner !== task.owner ? `${client.slug}-${record.id}-${at}` : undefined;
      return save(record, previous ? data.records : [record, ...data.records], task, event, oldTask ? "owner" : "assignment", typeof extraWrites === "function" ? extraWrites(record) : extraWrites) ? record : null;
    } catch (error) { store.notify(error instanceof Error ? error.message : "No se pudo guardar el contenido.", "error"); return null; }
  }
  /** Preproducción: copy definitivo, guion, wireframe, referencias, material e indicaciones antes del diseño. */
  function savePreproduction(record: ModuleRecord, values: Record<string, string>) {
    try {
      if (!["admin", "pm", "content", "operativo"].includes(store.role)) throw new Error("La preproducción la completa Contenidos.");
      const { records, fresh, tasks } = current(record);
      if (!PREPRODUCTION_STATES.includes(contentState(fresh))) throw new Error("La preproducción se completa después de la aprobación inicial y antes de la entrega del diseño.");
      const at = new Date().toISOString(), actor = previewActor(store.role);
      const allowed = new Set(PREPRODUCTION_FIELDS.map((field) => field.key));
      const patch = Object.fromEntries(Object.entries(values).filter(([key]) => allowed.has(key)).map(([key, value]) => [key, value.trim()]));
      const next: ModuleRecord = { ...fresh, user: actor, updatedAt: at, values: recordContentChange(fresh, { ...fresh.values, ...patch }, actor, at), history: [{ at, user: actor, text: "Actualizó la preproducción" }, ...fresh.history] };
      const task = buildContentTask(client, next, tasks, actor, at);
      return save(next, records, task);
    } catch (error) { store.notify(error instanceof Error ? error.message : "No se pudo guardar la preproducción.", "error"); return false; }
  }
  /** Quita solo los registros de demostración de esta cuenta y los vuelve a cargar. */
  function resetDemo() {
    try {
      if (!store.localHydrated || !["admin", "pm", "content", "operativo"].includes(store.role) || !canEditService(store.role, client.slug, "contenidos")) throw new Error("Tu rol no puede reiniciar los datos de esta cuenta.");
      let summary = { removed: 0, kept: 0 };
      const ok = store.commitTasks((tasks) => { const result = resetContentDemo(client.slug, tasks); summary = result; return result.tasks; }, resetContentDemo(client.slug, store.tasks).writes);
      if (ok) store.notify(`Datos de demostración reiniciados · ${summary.kept} registros manuales conservados`, "success");
      return ok;
    } catch (error) { store.notify(error instanceof Error ? error.message : "No se pudo reiniciar la demostración.", "error"); return false; }
  }
  return { transition, sync, comment, saveDraft, savePreproduction, resetDemo };
}
