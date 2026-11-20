import type { ModuleRecord } from "./types";

export const CONTENT_STATES = ["Borrador", "Revisión interna de producción", "Revisión preliminar del cliente", "Información del cliente", "Ajustes", "Producción de diseño", "Revisión interna del diseño", "Aprobación final del cliente", "Aprobado", "Programado", "Publicada"] as const;
export type ContentState = typeof CONTENT_STATES[number];
export type ContentRole = "admin" | "pm" | "content" | "designer" | "client";
export type ContentAction = "submit" | "approve-internal" | "approve-preliminary" | "request-changes" | "resubmit" | "request-information" | "provide-information" | "deliver-design" | "approve-design" | "approve-final" | "schedule";
export type ContentTransition = { id: string; from: ContentState; to: ContentState; actor: string; at: string; comment: string; responsible: string; taskId: string; action: ContentAction };
export type ContentComment = { id: string; actor: string; at: string; text: string; visibility: "client" | "internal"; attachmentUrl?: string; attachmentId?: string; attachmentName?: string };
const LEGACY: Record<string, ContentState> = { Idea: "Borrador", Brief: "Borrador", "En producción": "Producción de diseño", "En revisión": "Revisión interna del diseño", "En aprobación": "Aprobación final del cliente", "Cambios pedidos": "Ajustes", Programada: "Programado" };

/** Read compatibility only: old records and their history are never rewritten on mount. */
export function contentState(record: ModuleRecord): ContentState {
  const state = record.values.estado;
  return CONTENT_STATES.includes(state as ContentState) ? state as ContentState : LEGACY[state] ?? "Borrador";
}
export function contentTransitions(record: ModuleRecord): ContentTransition[] {
  return readArray<ContentTransition>(record.values.contentTransitions);
}
export function contentComments(record: ModuleRecord): ContentComment[] {
  return readArray<ContentComment>(record.values.contentComments);
}
function readArray<T>(raw?: string): T[] {
  try { const value: unknown = JSON.parse(raw || "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
}
export function safeContentUrl(value?: string) {
  if (!value) return false;
  try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; }
}
export function contentTaskOwner(record: ModuleRecord, state = contentState(record)) {
  if (["Revisión preliminar del cliente", "Aprobación final del cliente", "Información del cliente"].includes(state)) return record.values.clienteResponsable || "Cliente";
  if (state === "Producción de diseño" || (state === "Ajustes" && ["Revisión interna del diseño", "Aprobación final del cliente"].includes(record.values.returnState))) return record.values.disenador || "Diseñador por asignar";
  if (state === "Revisión interna de producción") return record.values.revisor || "Responsable de contenidos";
  return record.values.responsable || "Content Manager por asignar";
}
const ACTION_LABELS: Record<ContentAction, string> = {
  submit: "Enviar a revisión interna", "approve-internal": "Enviar al cliente", "approve-preliminary": "Aprobar propuesta", "request-changes": "Solicitar ajustes", resubmit: "Reenviar a revisión", "request-information": "Solicitar información al cliente", "provide-information": "Enviar información", "deliver-design": "Entregar diseño", "approve-design": "Solicitar aprobación final", "approve-final": "Aprobar pieza final", schedule: "Marcar programado",
};
export function getContentActions(record: ModuleRecord, role: ContentRole): { id: ContentAction; label: string }[] {
  const state = contentState(record);
  const allowed = (...roles: ContentRole[]) => role === "admin" || roles.includes(role);
  let actions: ContentAction[] = [];
  if (state === "Borrador" && allowed("pm", "content")) actions = ["submit", "request-information"];
  if (state === "Revisión interna de producción" && allowed("pm", "content")) actions = ["approve-internal", "request-changes", "request-information"];
  if (state === "Revisión preliminar del cliente" && allowed("client")) actions = ["approve-preliminary", "request-changes"];
  if (state === "Información del cliente" && allowed("client")) actions = ["provide-information"];
  if (state === "Ajustes") {
    const design = ["Revisión interna del diseño", "Aprobación final del cliente"].includes(record.values.returnState);
    if (design ? allowed("designer", "content", "pm") : allowed("content", "pm")) actions = ["resubmit"];
  }
  if (state === "Producción de diseño" && allowed("designer")) actions = ["deliver-design", "request-information"];
  if (state === "Revisión interna del diseño" && allowed("content", "pm")) actions = ["approve-design", "request-changes"];
  if (state === "Aprobación final del cliente" && allowed("client")) actions = ["approve-final", "request-changes"];
  if (state === "Aprobado" && allowed("content", "pm")) actions = ["schedule"];
  return actions.map((id) => ({ id, label: ACTION_LABELS[id] }));
}

export function addContentComment(record: ModuleRecord, input: Omit<ContentComment, "id" | "at"> & { at?: string }): ModuleRecord {
  if (!input.text.trim() && !input.attachmentUrl && !input.attachmentId) throw new Error("Escribí un comentario o agregá un material.");
  if (input.attachmentUrl && !safeContentUrl(input.attachmentUrl)) throw new Error("El material debe tener un enlace HTTP o HTTPS válido.");
  const at = input.at || new Date().toISOString();
  const comment: ContentComment = { ...input, text: input.text.trim(), at, id: `COMMENT-${at}-${contentComments(record).length}` };
  return { ...record, user: input.actor, updatedAt: at, values: { ...record.values, contentComments: JSON.stringify([...contentComments(record), comment]) }, history: [{ at, user: input.actor, text: input.visibility === "client" ? "Agregó un comentario compartido con el cliente" : "Agregó un comentario interno" }, ...record.history] };
}

export type ContentActionContext = { actor: string; role: ContentRole; comment?: string; at?: string; taskId?: string; responsible?: string; patch?: Record<string, string> };
export function applyContentAction(record: ModuleRecord, action: ContentAction, context: ContentActionContext): ModuleRecord {
  if (record.module !== "contenidos" || record.collection !== "piezas") throw new Error("El registro no es un contenido.");
  if (!getContentActions(record, context.role).some((option) => option.id === action)) throw new Error("La acción no está disponible para este estado y rol.");
  const from = contentState(record);
  const at = context.at || new Date().toISOString();
  // Only delivery/scheduling data may accompany an action. Reviewers cannot silently alter approved copy.
  const patchKeys = action === "deliver-design" || action === "resubmit" ? ["archivoDiseno", "version"] : action === "schedule" ? ["fecha", "hora", "enlaceMetricool"] : [];
  const patch = Object.fromEntries(Object.entries(context.patch || {}).filter(([key]) => patchKeys.includes(key)));
  const values = { ...record.values, ...patch };
  // Imported/legacy pieces may predate public snapshots. Freeze the currently
  // shared version before an adjustment sends them back into internal work.
  if (!values.clientSnapshot && ["Revisión preliminar del cliente", "Aprobación final del cliente", "Información del cliente"].includes(from)) {
    const fields = ["titulo", "eje", "idea", "bajada", "objetivo", "necesitaCliente", "copy", "canal", "formato", "fecha", "hora", "referencia"];
    if (from === "Aprobación final del cliente") fields.push("archivoDiseno", "version");
    values.clientSnapshot = JSON.stringify(Object.fromEntries(fields.map((key) => [key, record.values[key] || ""])));
  }
  const comment = context.comment?.trim() || "";
  let to: ContentState;
  switch (action) {
    case "submit": {
      const fields: Record<string, string> = { titulo: "título", eje: "eje temático", idea: "idea", bajada: "bajada", copy: "copy preliminar", canal: "canal", formato: "formato" };
      const missing = Object.entries(fields).filter(([key]) => !values[key]?.trim()).map(([, label]) => label);
      if (missing.length) throw new Error(`Completá ${missing.join(", ")} antes de enviar a revisión.`);
      to = "Revisión interna de producción"; break;
    }
    case "approve-internal": to = "Revisión preliminar del cliente"; break;
    case "approve-preliminary": to = "Producción de diseño"; break;
    case "request-changes":
      if (!comment) throw new Error("Explicá qué ajustes necesitás.");
      values.returnState = from;
      to = "Ajustes"; break;
    case "resubmit":
      // Every design change repeats internal design review, including a client's final rejection.
      to = ["Revisión interna del diseño", "Aprobación final del cliente"].includes(values.returnState) ? "Revisión interna del diseño" : "Revisión interna de producción";
      if (to === "Revisión interna del diseño" && !safeContentUrl(values.archivoDiseno)) throw new Error("Adjuntá un enlace válido a la versión del diseño.");
      break;
    case "request-information":
      if (!comment) throw new Error("Indicá qué información falta.");
      values.informationReturnState = from;
      to = "Información del cliente"; break;
    case "provide-information":
      if (!comment) throw new Error("Detallá la información aportada o comentá el material adjunto.");
      to = CONTENT_STATES.includes(values.informationReturnState as ContentState) ? values.informationReturnState as ContentState : "Borrador";
      if (["Información del cliente", "Programado", "Publicada", "Aprobado"].includes(to)) to = "Borrador";
      break;
    case "deliver-design":
      if (!safeContentUrl(values.archivoDiseno)) throw new Error("Adjuntá un enlace HTTP o HTTPS al diseño antes de entregarlo.");
      to = "Revisión interna del diseño"; break;
    case "approve-design":
      if (!safeContentUrl(values.archivoDiseno)) throw new Error("Falta el archivo del diseño para pedir aprobación final.");
      to = "Aprobación final del cliente"; break;
    case "approve-final":
      if (!safeContentUrl(values.archivoDiseno)) throw new Error("La pieza necesita un enlace al diseño final.");
      to = "Aprobado"; break;
    case "schedule":
      if (!validContentDate(values.fecha) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(values.hora || "")) throw new Error("Completá una fecha y un horario de programación válidos.");
      if (values.enlaceMetricool && !safeContentUrl(values.enlaceMetricool)) throw new Error("Revisá el enlace de programación.");
      to = "Programado"; break;
  }
  const nextBase = { ...record, values };
  const transition: ContentTransition = { id: `TRANSITION-${at}-${contentTransitions(record).length}`, from, to, actor: context.actor, at, comment, responsible: context.responsible || contentTaskOwner(nextBase, to), taskId: context.taskId || `CONTENT-${record.client}-${record.id}`, action };
  values.estado = to;
  if (["approve-internal", "approve-design", "request-information"].includes(action)) {
    const publicFields = ["titulo", "eje", "idea", "bajada", "objetivo", "necesitaCliente", "copy", "canal", "formato", "fecha", "hora", "referencia"];
    if (action === "approve-design") publicFields.push("archivoDiseno", "version");
    values.clientSnapshot = JSON.stringify(Object.fromEntries(publicFields.map((key) => [key, values[key] || ""])));
  }
  values.contentTransitions = JSON.stringify([...contentTransitions(record), transition]);
  values.tareaId = transition.taskId;
  if (action === "approve-preliminary") values.preliminaryApprovedAt = at;
  if (action === "approve-final") values.finalApprovedAt = at;
  if (["request-changes", "resubmit"].includes(action)) delete values.finalApprovedAt;
  const next: ModuleRecord = { ...record, user: context.actor, updatedAt: at, values, history: [{ at, user: context.actor, text: `${from} → ${to}${comment ? ` · ${comment}` : ""} · ${transition.taskId}` }, ...record.history] };
  if (comment) return addContentComment(next, { actor: context.actor, at, text: comment, visibility: context.role === "client" || action === "request-information" ? "client" : "internal" });
  return next;
}

export function validContentDate(date?: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date;
}

export function ideaToContentValues(idea: ModuleRecord, initial: Record<string, string> = {}) {
  return { titulo: idea.values.idea || "", idea: idea.values.detalle || idea.values.idea || "", eje: idea.values.eje || "", referencia: idea.values.url || "", ideaId: idea.id, origen: idea.values.origen || "Equipo", sourceBenchmarkBrandId: idea.values.sourceBenchmarkBrandId || "", sourceBenchmarkItemId: idea.values.sourceBenchmarkItemId || "", capturaReferencia: idea.values.captura || "", ...initial, estado: "Borrador" };
}
