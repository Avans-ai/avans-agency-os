import type { ModuleRecord } from "./types";

export const CONTENT_STATES = ["Borrador", "Revisión interna de producción", "Revisión preliminar del cliente", "Información del cliente", "Ajustes", "Preproducción", "Producción de diseño", "Revisión interna del diseño", "Aprobación final del cliente", "Aprobado", "Programado", "Publicada"] as const;
export type ContentState = typeof CONTENT_STATES[number];
export type ContentRole = "admin" | "pm" | "content" | "designer" | "client";
export type ContentAction = "submit" | "approve-internal" | "approve-preliminary" | "request-changes" | "resubmit" | "request-information" | "provide-information" | "send-to-design" | "deliver-design" | "approve-design" | "approve-final" | "schedule";
/** Instancia de revisión a la que pertenece un comentario. */
export type ReviewKind = "internal-review" | "client-review" | "adjustment" | "final-approval" | "comment";
export const REVIEW_KIND_LABEL: Record<ReviewKind, string> = { "internal-review": "Revisión interna", "client-review": "Revisión del cliente", adjustment: "Ajustes", "final-approval": "Aprobación final", comment: "Comentario" };
export type ContentTransition = { id: string; from: ContentState; to: ContentState; actor: string; at: string; comment: string; responsible: string; taskId: string; action: ContentAction; version?: string };
export type ContentComment = { id: string; actor: string; at: string; text: string; visibility: "client" | "internal"; attachmentUrl?: string; attachmentId?: string; attachmentName?: string; version?: string; stage?: string; kind?: ReviewKind; requestId?: string };
/** Cambio editorial registrado: qué campos cambiaron, en qué versión y a pedido de quién. */
export type ContentChange = { id: string; at: string; actor: string; version: string; fields: string[]; requestedBy?: string; request?: string };
const LEGACY: Record<string, ContentState> = { Idea: "Borrador", Brief: "Borrador", "En producción": "Producción de diseño", "En revisión": "Revisión interna del diseño", "En aprobación": "Aprobación final del cliente", "Cambios pedidos": "Ajustes", Programada: "Programado" };

/** Las ocho etapas visibles del flujo, con su equivalente en el tablero Monday de Avans. */
export const CONTENT_FLOW: { step: number; label: string; monday: string; states: ContentState[] }[] = [
  { step: 1, label: "Borrador", monday: "Borrador", states: ["Borrador"] },
  { step: 2, label: "Revisión interna de producción", monday: "Revisión de borrador interna", states: ["Revisión interna de producción"] },
  { step: 3, label: "Revisión preliminar del cliente", monday: "Revisión de borrador del cliente", states: ["Revisión preliminar del cliente", "Información del cliente"] },
  { step: 4, label: "Ajustes", monday: "Ajustes", states: ["Ajustes"] },
  { step: 5, label: "Producción de diseño", monday: "Aprobado · Producción", states: ["Preproducción", "Producción de diseño"] },
  { step: 6, label: "Revisión interna del diseño", monday: "Revisión de producción interna", states: ["Revisión interna del diseño"] },
  { step: 7, label: "Aprobación final del cliente", monday: "Revisión de producción del cliente", states: ["Aprobación final del cliente", "Aprobado"] },
  { step: 8, label: "Programado", monday: "Programado", states: ["Programado", "Publicada"] },
];
export const MONDAY_STATE: Record<ContentState, string> = {
  Borrador: "Borrador", "Revisión interna de producción": "Revisión de borrador interna", "Revisión preliminar del cliente": "Revisión de borrador del cliente", "Información del cliente": "Información del cliente", Ajustes: "Ajustes", Preproducción: "Aprobado", "Producción de diseño": "Producción", "Revisión interna del diseño": "Revisión de producción interna", "Aprobación final del cliente": "Revisión de producción del cliente", Aprobado: "Aprobado", Programado: "Programado", Publicada: "Programado",
};

/** Read compatibility only: old records and their history are never rewritten on mount. */
export function contentState(record: ModuleRecord): ContentState {
  const state = record.values.estado;
  return CONTENT_STATES.includes(state as ContentState) ? state as ContentState : LEGACY[state] ?? "Borrador";
}
export function contentFlowStep(state: ContentState) {
  return CONTENT_FLOW.find((step) => step.states.includes(state))?.step ?? 1;
}
export function contentTransitions(record: ModuleRecord): ContentTransition[] {
  return readArray<ContentTransition>(record.values.contentTransitions);
}
export function contentComments(record: ModuleRecord): ContentComment[] {
  return readArray<ContentComment>(record.values.contentComments);
}
export function contentChanges(record: ModuleRecord): ContentChange[] {
  return readArray<ContentChange>(record.values.contentChanges);
}
export function readArray<T>(raw?: string): T[] {
  try { const value: unknown = JSON.parse(raw || "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
}
export function safeContentUrl(value?: string) {
  if (!value) return false;
  try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; }
}
const DESIGN_STATES: ContentState[] = ["Revisión interna del diseño", "Aprobación final del cliente", "Aprobado", "Programado", "Publicada"];
/** Etapas en las que el material de trabajo es la pieza diseñada (y no la propuesta). */
export function isDesignReview(record: ModuleRecord, state = contentState(record)) {
  return DESIGN_STATES.includes(state) || (state === "Ajustes" && ["Revisión interna del diseño", "Aprobación final del cliente"].includes(record.values.returnState));
}
/** Cada reenvío de la propuesta a revisión interna después de ajustes genera una nueva versión. */
export function proposalVersion(record: ModuleRecord) {
  return Math.max(1, contentTransitions(record).filter((entry) => entry.action === "submit" || (entry.action === "resubmit" && entry.to === "Revisión interna de producción")).length);
}
export function contentVersionLabel(record: ModuleRecord, state = contentState(record)) {
  return isDesignReview(record, state) ? `Diseño ${record.values.version || "v1"}` : `Propuesta v${proposalVersion(record)}`;
}
export function reviewKind(state: ContentState, action?: ContentAction): ReviewKind {
  if (action === "approve-final") return "final-approval";
  if (action === "approve-preliminary") return "client-review";
  if (state === "Revisión interna de producción" || state === "Revisión interna del diseño") return "internal-review";
  if (state === "Revisión preliminar del cliente" || state === "Información del cliente") return "client-review";
  if (state === "Aprobación final del cliente") return "final-approval";
  if (state === "Ajustes") return "adjustment";
  return "comment";
}

/* «Qué necesitamos del cliente» como pedidos estructurados. */
export const CLIENT_REQUEST_TYPES = ["Fotografías", "Videos", "Información", "Testimonios", "Datos", "Aprobaciones", "Accesos", "Otros"] as const;
export type ClientRequestType = typeof CLIENT_REQUEST_TYPES[number];
export type ClientRequest = { id: string; type: ClientRequestType; detail: string; status: "Pendiente" | "Recibido"; responseAt?: string; responseBy?: string; response?: string; attachmentId?: string; attachmentName?: string; attachmentUrl?: string };
export function clientRequests(values: Record<string, string>): ClientRequest[] {
  const parsed = readArray<ClientRequest>(values.clientRequests).filter((item) => item && typeof item.detail === "string" && CLIENT_REQUEST_TYPES.includes(item.type));
  if (parsed.length || !values.necesitaCliente?.trim()) return parsed;
  // Registros anteriores: el texto libre se interpreta como un único pedido de información (solo lectura).
  return [{ id: "REQ-LEGACY", type: "Información", detail: values.necesitaCliente.trim(), status: "Pendiente" }];
}
/** Guarda los pedidos y mantiene el texto `necesitaCliente` para la compatibilidad con vistas anteriores. */
export function clientRequestValues(requests: ClientRequest[]) {
  const clean = requests.filter((item) => item.detail.trim()).map((item) => ({ ...item, detail: item.detail.trim() }));
  return { clientRequests: clean.length ? JSON.stringify(clean) : "", necesitaCliente: clean.map((item) => `${item.type}: ${item.detail}`).join("\n") };
}

/* Preproducción: todo lo que necesita el diseñador antes de recibir el pedido. */
export const PREPRODUCTION_FIELDS: { key: string; label: string; required?: boolean; video?: boolean; kind: "text" | "textarea" | "date"; hint?: string }[] = [
  { key: "preCopyFinal", label: "Copy definitivo", required: true, kind: "textarea" },
  { key: "preIndicaciones", label: "Indicaciones de diseño", required: true, kind: "textarea", hint: "Jerarquía, estilo, textos en placa y elementos obligatorios." },
  { key: "preDimensiones", label: "Dimensiones", required: true, kind: "text" },
  { key: "preWireframe", label: "Wireframe o boceto", kind: "textarea", hint: "Orden de láminas o escenas. Puede ser un enlace." },
  { key: "preGuion", label: "Guion", video: true, kind: "textarea" },
  { key: "preReferencias", label: "Referencias visuales", kind: "textarea" },
  { key: "preMaterial", label: "Material fotográfico", kind: "textarea" },
  { key: "preRecursos", label: "Recursos y piezas del Design System", kind: "textarea" },
  { key: "fechaEntregaDiseno", label: "Entrega del diseño", kind: "date" },
];
export const FORMAT_DIMENSIONS: Record<string, string> = { Carrusel: "1080 × 1350 px · hasta 10 láminas", Reel: "1080 × 1920 px · 9:16", "Video corto": "1080 × 1920 px · 9:16", "Post estático": "1080 × 1350 px · 4:5", Historia: "1080 × 1920 px · 9:16", Artículo: "Portada 1200 × 630 px", Newsletter: "600 px de ancho · cabecera 600 × 300 px", "Documento LinkedIn": "PDF 1080 × 1350 px" };
export const VIDEO_FORMATS = ["Reel", "Video corto", "Historia"];
export function preproductionChecklist(values: Record<string, string>) {
  const video = VIDEO_FORMATS.includes(values.formato);
  const items = PREPRODUCTION_FIELDS.filter((field) => !field.video || video).map((field) => ({ key: field.key, label: field.label, required: Boolean(field.required), done: Boolean(values[field.key]?.trim()) }));
  items.push({ key: "formato", label: "Formato y canal", required: true, done: Boolean(values.formato && values.canal) });
  const missing = items.filter((item) => item.required && !item.done).map((item) => item.label);
  return { items, done: items.filter((item) => item.done).length, total: items.length, missing, ready: missing.length === 0 };
}

export function contentTaskOwner(record: ModuleRecord, state = contentState(record)) {
  if (["Revisión preliminar del cliente", "Aprobación final del cliente", "Información del cliente"].includes(state)) return record.values.clienteResponsable || "Cliente";
  if (state === "Producción de diseño" || (state === "Ajustes" && ["Revisión interna del diseño", "Aprobación final del cliente"].includes(record.values.returnState))) return record.values.disenador || "Diseñador por asignar";
  if (state === "Revisión interna de producción") return record.values.revisor || "Responsable de contenidos";
  return record.values.responsable || "Content Manager por asignar";
}
const ACTION_LABELS: Record<ContentAction, string> = {
  submit: "Enviar a revisión interna", "approve-internal": "Enviar al cliente", "approve-preliminary": "Aprobar propuesta", "request-changes": "Solicitar ajustes", resubmit: "Reenviar a revisión", "request-information": "Solicitar información al cliente", "provide-information": "Enviar información", "send-to-design": "Enviar a diseño", "deliver-design": "Entregar diseño", "approve-design": "Solicitar aprobación final", "approve-final": "Aprobar pieza final", schedule: "Marcar programado",
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
  if (state === "Preproducción" && allowed("pm", "content")) actions = ["send-to-design", "request-information"];
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
  const state = contentState(record);
  // Cada comentario queda asociado a la versión y a la instancia de revisión vigentes.
  const comment: ContentComment = { version: contentVersionLabel(record, state), stage: state, kind: reviewKind(state), ...input, text: input.text.trim(), at, id: `COMMENT-${at}-${contentComments(record).length}` };
  return { ...record, user: input.actor, updatedAt: at, values: { ...record.values, contentComments: JSON.stringify([...contentComments(record), comment]) }, history: [{ at, user: input.actor, text: input.visibility === "client" ? "Agregó un comentario compartido con el cliente" : "Agregó un comentario interno" }, ...record.history] };
}

export const CONTENT_FIELD_LABELS: Record<string, string> = {
  titulo: "título", eje: "eje", plan: "plan", idea: "idea", bajada: "bajada", objetivo: "objetivo", mensaje: "mensaje", cta: "CTA", copy: "copy preliminar", canal: "canal", formato: "formato", fecha: "fecha", hora: "horario", referencia: "referencia", referencias: "referencias", materialNecesario: "material necesario", necesitaCliente: "pedidos al cliente", clientRequests: "pedidos al cliente", responsable: "responsable",
  preCopyFinal: "copy definitivo", preIndicaciones: "indicaciones de diseño", preDimensiones: "dimensiones", preWireframe: "wireframe", preGuion: "guion", preReferencias: "referencias visuales", preMaterial: "material fotográfico", preRecursos: "recursos", fechaEntregaDiseno: "entrega del diseño",
};
/** Registra qué cambió entre dos versiones y, si el contenido estaba en ajustes, quién lo pidió. */
export function recordContentChange(before: ModuleRecord, values: Record<string, string>, actor: string, at: string): Record<string, string> {
  const fields = Array.from(new Set(Object.keys(CONTENT_FIELD_LABELS).filter((key) => (before.values[key] || "") !== (values[key] || "")).map((key) => CONTENT_FIELD_LABELS[key])));
  if (!fields.length) return values;
  const request = [...contentTransitions(before)].reverse().find((entry) => entry.action === "request-changes" || entry.action === "request-information");
  const pending = contentState(before) === "Ajustes" || (request && contentTransitions(before).at(-1)?.id === request.id);
  const change: ContentChange = { id: `CHANGE-${at}-${contentChanges(before).length}`, at, actor, version: contentVersionLabel(before), fields, ...(pending && request ? { requestedBy: request.actor, request: request.comment } : {}) };
  return { ...values, contentChanges: JSON.stringify([...contentChanges(before), change]) };
}

export type ContentActionContext = { actor: string; role: ContentRole; comment?: string; at?: string; taskId?: string; responsible?: string; patch?: Record<string, string> };
const PUBLIC_FIELDS = ["titulo", "eje", "idea", "bajada", "objetivo", "necesitaCliente", "clientRequests", "copy", "cta", "canal", "formato", "fecha", "hora", "referencia"];
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
    const fields = [...PUBLIC_FIELDS];
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
    case "approve-preliminary":
      // La aprobación inicial abre la preproducción: se precargan los datos ya validados.
      values.preCopyFinal ||= values.copy || "";
      values.preDimensiones ||= FORMAT_DIMENSIONS[values.formato] || "";
      values.preReferencias ||= [values.referencia, values.referencias].filter(Boolean).join("\n");
      to = "Preproducción"; break;
    case "send-to-design": {
      const checklist = preproductionChecklist(values);
      if (!checklist.ready) throw new Error(`Completá ${checklist.missing.join(", ").toLowerCase()} antes de enviar a diseño.`);
      to = "Producción de diseño"; break;
    }
    case "request-changes":
      if (!comment) throw new Error("Explicá qué ajustes necesitás.");
      values.returnState = from;
      to = "Ajustes"; break;
    case "resubmit":
      // Every design change repeats internal design review, including a client's final rejection.
      to = ["Revisión interna del diseño", "Aprobación final del cliente"].includes(values.returnState) ? "Revisión interna del diseño" : "Revisión interna de producción";
      if (to === "Revisión interna del diseño" && !safeContentUrl(values.archivoDiseno)) throw new Error("Adjuntá un enlace válido a la versión del diseño.");
      // Un reenvío de diseño es siempre una versión nueva: si no se cambió el rótulo, se numera solo.
      // Así ningún comentario ni aprobación de la versión anterior queda pegado a la nueva.
      if (to === "Revisión interna del diseño" && (values.version || "") === (record.values.version || "")) values.version = nextDesignVersion(record);
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
  const version = contentVersionLabel(nextBase, from);
  const transition: ContentTransition = { id: `TRANSITION-${at}-${contentTransitions(record).length}`, from, to, actor: context.actor, at, comment, responsible: context.responsible || contentTaskOwner(nextBase, to), taskId: context.taskId || `CONTENT-${record.client}-${record.id}`, action, version };
  values.estado = to;
  if (["approve-internal", "approve-design", "request-information"].includes(action)) {
    const publicFields = [...PUBLIC_FIELDS];
    if (action === "approve-design") publicFields.push("archivoDiseno", "version");
    values.clientSnapshot = JSON.stringify(Object.fromEntries(publicFields.map((key) => [key, values[key] || ""])));
  }
  values.contentTransitions = JSON.stringify([...contentTransitions(record), transition]);
  values.tareaId = transition.taskId;
  if (action === "approve-preliminary") { values.preliminaryApprovedAt = at; values.preliminaryApprovedVersion = version; }
  if (action === "approve-final") { values.finalApprovedAt = at; values.finalApprovedVersion = version; }
  if (["request-changes", "resubmit"].includes(action)) { delete values.finalApprovedAt; delete values.finalApprovedVersion; }
  const next: ModuleRecord = { ...record, user: context.actor, updatedAt: at, values, history: [{ at, user: context.actor, text: `${from} → ${to}${comment ? ` · ${comment}` : ""} · ${transition.taskId}` }, ...record.history] };
  // El comentario de una transición pertenece a la versión revisada (no a la siguiente).
  if (comment) return addContentComment(next, { actor: context.actor, at, text: comment, visibility: context.role === "client" || action === "request-information" ? "client" : "internal", version, stage: from, kind: reviewKind(from, action) });
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

/** Próximo rótulo de versión de diseño (v1, v2, …) según las entregas registradas. */
export function nextDesignVersion(record: ModuleRecord) {
  const deliveries = contentTransitions(record).filter((entry) => entry.action === "deliver-design" || (entry.action === "resubmit" && entry.to === "Revisión interna del diseño")).length;
  const labelled = Number(/^v(\d+)$/i.exec(record.values.version || "")?.[1]) || 0;
  return `v${Math.max(deliveries, labelled, 1) + 1}`;
}

/* ───────── Aprobaciones atadas a la versión ─────────
 * Cada aprobación queda registrada en su transición con la versión revisada. Una aprobación vale
 * solo para esa versión: si después cambia la propuesta (Propuesta vN+1) o el diseño (Diseño vN+1),
 * o si se pidieron ajustes sobre esa misma versión, deja de contar para la versión vigente. */
export type ContentApprovalKind = "internal-proposal" | "client-proposal" | "internal-design" | "client-final";
export const APPROVAL_STEPS: { kind: ContentApprovalKind; action: ContentAction; label: string; who: string; phase: "proposal" | "design" }[] = [
  { kind: "internal-proposal", action: "approve-internal", label: "Revisión interna de la propuesta", who: "PM", phase: "proposal" },
  { kind: "client-proposal", action: "approve-preliminary", label: "Validación de la propuesta con el cliente", who: "Cliente", phase: "proposal" },
  { kind: "internal-design", action: "approve-design", label: "Revisión interna del diseño", who: "Responsable de Contenidos", phase: "design" },
  { kind: "client-final", action: "approve-final", label: "Aprobación final del cliente", who: "Cliente", phase: "design" },
];
export type ContentApproval = { id: string; kind: ContentApprovalKind; label: string; actor: string; at: string; version: string; comment: string; valid: boolean; reason?: string };
export function currentProposalVersion(record: ModuleRecord) {
  return `Propuesta v${proposalVersion(record)}`;
}
export function currentDesignVersion(record: ModuleRecord) {
  return `Diseño ${record.values.version || "v1"}`;
}
export function contentApprovals(record: ModuleRecord): ContentApproval[] {
  const transitions = contentTransitions(record);
  return transitions.flatMap((entry, index) => {
    const step = APPROVAL_STEPS.find((item) => item.action === entry.action);
    if (!step) return [];
    const version = entry.version || (step.phase === "proposal" ? "Propuesta v1" : "Diseño v1");
    const current = step.phase === "proposal" ? currentProposalVersion(record) : currentDesignVersion(record);
    const rejected = transitions.slice(index + 1).some((later) => later.action === "request-changes" && (later.version || "") === version);
    const valid = version === current && !rejected;
    const reason = version !== current ? `Corresponde a ${version}; la versión vigente es ${current}.` : rejected ? `Después se pidieron ajustes sobre ${version}.` : undefined;
    return [{ id: entry.id, kind: step.kind, label: step.label, actor: entry.actor, at: entry.at, version, comment: entry.comment, valid, reason }];
  });
}
/** Aprobación vigente (de la versión actual) para un paso, si existe. */
export function validApproval(record: ModuleRecord, kind: ContentApprovalKind) {
  return contentApprovals(record).filter((item) => item.kind === kind && item.valid).at(-1);
}

/* ───────── Programación y publicación ─────────
 * Metricool no está conectado: una fecha guardada en Avans nunca se presenta como programación
 * confirmada por el proveedor, y nada se muestra como publicado sin evidencia. */
export type ContentScheduleKind = "none" | "planned" | "local" | "confirmed" | "published-unverified" | "published";
export type ContentSchedule = { kind: ContentScheduleKind; label: string; short: string; detail: string };
export function contentSchedule(record: ModuleRecord): ContentSchedule {
  const state = contentState(record);
  const v = record.values;
  const when = v.fecha ? `${v.fecha}${v.hora ? ` · ${v.hora}` : ""}` : "";
  if (state === "Publicada") {
    if (v.publicacionProveedor === "metricool" && v.publicacionProveedorId && safeContentUrl(v.publicacionUrl)) return { kind: "published", label: "Publicación verificada por Metricool", short: "Publicada", detail: when };
    return { kind: "published-unverified", label: "Publicación sin verificar", short: "Sin verificar", detail: v.registroPublicacion || "Registrada a mano. No hay evidencia de la publicación: Metricool no está conectado." };
  }
  if (state === "Programado") {
    if (v.programacionProveedor === "metricool" && v.programacionProveedorId) return { kind: "confirmed", label: "Programación confirmada por Metricool", short: "Confirmada", detail: when };
    return { kind: "local", label: "Programación local", short: "Prog. local", detail: `${when ? `${when} · ` : ""}registrada en Avans por el equipo. Metricool no la confirmó (no conectado).` };
  }
  if (v.fecha) return { kind: "planned", label: "Fecha prevista", short: "Prevista", detail: `${when} · todavía no está programada.` };
  return { kind: "none", label: "Sin fecha", short: "Sin fecha", detail: "Asignale una fecha prevista desde la propuesta." };
}

/* Materiales vinculados desde «Archivos y documentos»: solo referencias, nunca copias. */
export type LinkedMaterial = { id: string; at: string; by: string };
export const MATERIALS_FIELD = "materialesVinculados";
export function linkedMaterials(values: Record<string, string>): LinkedMaterial[] {
  return readArray<LinkedMaterial>(values[MATERIALS_FIELD]).filter((item) => item && typeof item.id === "string" && Boolean(item.id));
}
