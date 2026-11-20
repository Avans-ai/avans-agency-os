/* Audiovisuales · procedimiento «Jornada audiovisual» del manual.
 * Una jornada (`audiovisuales/jornadas`) recorre seis etapas:
 *   1 Validación (PM, contra el cupo contratado) → 2 Agenda → 3 Brief y guiones (Content)
 *   → 4 Rodaje (proveedor) → 5 Edición (proveedor, plazo de 3 días) → 6 Cierre
 *   (Content valida · Diseño suma subtítulos y motion · el cliente aprueba desde su front).
 * Cada etapa reasigna LA tarea de la jornada (una sola, id estable) y notifica al responsable
 * siguiente. Funciones puras, sin acceso a localStorage: las usan la operación, el portal,
 * el espacio del proveedor y las pruebas de dominio. */
import { osProjects, type OsClient, type OsTask } from "../os-data";
import { dueKindForDate, workflowNotification, type WorkflowNotification } from "../workflow-tasks";
import type { ModuleRecord } from "./types";

export const JORNADA_STATES = ["Validación", "Agenda", "Brief y guiones", "Rodaje", "Edición", "Validación de Content", "Subtítulos y motion", "Aprobación del cliente", "Cerrada", "Cancelada"] as const;
export type JornadaState = typeof JORNADA_STATES[number];
export const CIERRE_STATES: JornadaState[] = ["Validación de Content", "Subtítulos y motion", "Aprobación del cliente", "Cerrada"];
export const EDITION_DAYS = 3;

export const JORNADA_STAGES: { step: number; label: string; who: string; states: JornadaState[]; detail: string }[] = [
  { step: 1, label: "Validación", who: "PM", states: ["Validación"], detail: "El PM confirma que queden jornadas disponibles según el alcance contratado." },
  { step: 2, label: "Agenda", who: "PM", states: ["Agenda"], detail: "Se coordina la fecha con el cliente y el proveedor." },
  { step: 3, label: "Brief y guiones", who: "Content", states: ["Brief y guiones"], detail: "El Content arma el brief y los guiones." },
  { step: 4, label: "Rodaje", who: "Proveedor", states: ["Rodaje"], detail: "El proveedor prepara el plan de rodaje, filma, sube el crudo a Drive y lo marca acá." },
  { step: 5, label: "Edición", who: "Proveedor", states: ["Edición"], detail: `El proveedor edita en ${EDITION_DAYS} días, sube la edición a Drive y la marca acá.` },
  { step: 6, label: "Cierre", who: "Content · Diseño · Cliente", states: CIERRE_STATES, detail: "El Content valida, el diseñador suma subtítulos y motion y el cliente aprueba desde su front." },
];

export type JornadaRole = "admin" | "pm" | "content" | "designer" | "provider" | "client";
export type JornadaAction = "validate" | "cancel" | "confirm-agenda" | "send-brief" | "mark-raw" | "mark-edit" | "approve-edit" | "request-edit-changes" | "deliver-design" | "client-approve" | "client-changes";
export type JornadaVisibility = "internal" | "provider" | "client";
export type JornadaTransition = { id: string; from: JornadaState; to: JornadaState; action: JornadaAction; actor: string; at: string; comment: string; responsible: string; taskId: string };
export type JornadaComment = { id: string; actor: string; at: string; text: string; visibility: JornadaVisibility; stage: JornadaState };
export type JornadaQuota = { version: 1; clientSlug: string; contracted: number; period: string; start: string; end: string; source: "demo" | "manual"; updatedAt: string; updatedBy: string; history: { at: string; actor: string; text: string }[] };
export type QuotaUsage = { contracted: number; used: number; pending: number; available: number; defined: boolean };

export const ACTION_LABELS: Record<JornadaAction, string> = {
  validate: "Confirmar jornada disponible",
  cancel: "Cancelar jornada",
  "confirm-agenda": "Confirmar agenda",
  "send-brief": "Enviar brief al proveedor",
  "mark-raw": "Marcar material subido",
  "mark-edit": "Marcar edición subida",
  "approve-edit": "Validar edición y pedir subtítulos",
  "request-edit-changes": "Pedir ajustes de edición",
  "deliver-design": "Entregar subtítulos y motion",
  "client-approve": "Aprobar jornada",
  "client-changes": "Pedir cambios",
};

const STAGE_TITLE: Record<JornadaState, string> = {
  Validación: "Validar cupo de jornada", Agenda: "Coordinar agenda", "Brief y guiones": "Armar brief y guion", Rodaje: "Rodaje y material crudo",
  Edición: `Editar (plazo ${EDITION_DAYS} días)`, "Validación de Content": "Validar edición", "Subtítulos y motion": "Subtítulos y motion",
  "Aprobación del cliente": "Aprobación del cliente", Cerrada: "Jornada cerrada", Cancelada: "Jornada cancelada",
};

export const jornadaKey = (clientSlug: string) => `client:${clientSlug}:module:audiovisuales:jornadas`;
export const quotaKey = (clientSlug: string) => `client:${clientSlug}:audiovisuales:jornadas-cupo`;

export function readArray<T>(raw?: string): T[] {
  try { const value: unknown = JSON.parse(raw || "[]"); return Array.isArray(value) ? value as T[] : []; } catch { return []; }
}
export function jornadaState(record: ModuleRecord): JornadaState {
  return (JORNADA_STATES as readonly string[]).includes(record.values.estado) ? record.values.estado as JornadaState : "Validación";
}
export function jornadaStep(state: JornadaState) {
  return state === "Cancelada" ? 0 : JORNADA_STAGES.find((stage) => stage.states.includes(state))?.step ?? 1;
}
export const jornadaTransitions = (record: ModuleRecord) => readArray<JornadaTransition>(record.values.jornadaTransitions);
export const jornadaComments = (record: ModuleRecord) => readArray<JornadaComment>(record.values.jornadaComments);

export function safeUrl(value?: string) {
  if (!value?.trim()) return "";
  try { const url = new URL(value.trim()); return ["https:", "http:"].includes(url.protocol) ? url.href : ""; } catch { return ""; }
}
export function validDate(date?: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date;
}
/** Fecha local de Buenos Aires de un instante ISO. */
export function localDate(at: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(at));
}
export function addDays(date: string, days: number) {
  const base = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}
/** Plazo de edición: 3 días corridos desde que el proveedor marca el material crudo (o desde el pedido de ajustes). */
export function editionDeadline(at: string) {
  return addDays(localDate(at), EDITION_DAYS);
}
/** Días que faltan (negativo = vencido) hasta una fecha, contados en Buenos Aires. */
export function daysUntil(date: string, at: string) {
  if (!validDate(date)) return null;
  return Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${localDate(at)}T12:00:00Z`)) / 86400000);
}

/* ───────── Cupo contratado ───────── */
export function emptyQuota(clientSlug: string): JornadaQuota {
  return { version: 1, clientSlug, contracted: 0, period: "", start: "", end: "", source: "manual", updatedAt: "", updatedBy: "", history: [] };
}
export function normalizeQuota(value: unknown, clientSlug: string, fallback: JornadaQuota): JornadaQuota {
  const raw = value as Partial<JornadaQuota> | null;
  if (!raw || raw.version !== 1 || raw.clientSlug !== clientSlug || !Number.isFinite(Number(raw.contracted))) return fallback;
  return { ...fallback, ...raw, contracted: Math.max(0, Math.floor(Number(raw.contracted))), history: Array.isArray(raw.history) ? raw.history : [] } as JornadaQuota;
}
function inPeriod(record: ModuleRecord, quota: JornadaQuota) {
  const date = record.values.fecha;
  if (!validDate(date)) return true;
  if (validDate(quota.start) && date < quota.start) return false;
  if (validDate(quota.end) && date > quota.end) return false;
  return true;
}
/** Usadas = validadas por el PM (no canceladas) dentro del período. Pendientes = esperando validación. */
export function quotaUsage(quota: JornadaQuota, jornadas: ModuleRecord[]): QuotaUsage {
  const live = jornadas.filter((record) => record.client === quota.clientSlug && jornadaState(record) !== "Cancelada" && inPeriod(record, quota));
  const used = live.filter((record) => Boolean(record.values.validadaAt)).length;
  const pending = live.filter((record) => !record.values.validadaAt && jornadaState(record) === "Validación").length;
  return { contracted: quota.contracted, used, pending, available: Math.max(0, quota.contracted - used), defined: quota.contracted > 0 };
}
export function updateQuota(quota: JornadaQuota, patch: { contracted: number; period: string; start: string; end: string }, ctx: { actor: string; at: string }): JornadaQuota {
  if (!Number.isInteger(patch.contracted) || patch.contracted < 0 || patch.contracted > 99) throw new Error("Ingresá una cantidad de jornadas entre 0 y 99.");
  if (!patch.period.trim()) throw new Error("Indicá el período del cupo (por ejemplo, «Trimestre oct–dic 2026»).");
  if ((patch.start && !validDate(patch.start)) || (patch.end && !validDate(patch.end))) throw new Error("Revisá las fechas del período.");
  if (patch.start && patch.end && patch.start > patch.end) throw new Error("La fecha de inicio tiene que ser anterior al cierre del período.");
  const text = `Cupo: ${patch.contracted} jornadas · ${patch.period.trim()}`;
  return { ...quota, contracted: patch.contracted, period: patch.period.trim(), start: patch.start, end: patch.end, source: "manual", updatedAt: ctx.at, updatedBy: ctx.actor, history: [{ at: ctx.at, actor: ctx.actor, text }, ...quota.history] };
}

/* ───────── Responsables ───────── */
/** PM de la cuenta: la persona del equipo marcada como «Responsable de cuenta». */
export function accountLead(client: OsClient) {
  return client.team.find((person) => person.role.startsWith("Responsable de cuenta"))?.name || client.owner;
}
export function contentLead(client: OsClient) {
  return client.team.find((person) => /Contenido/.test(person.role))?.name || "Content por asignar";
}
export function designLead(client: OsClient) {
  return client.team.find((person) => /Diseño/.test(person.role))?.name || "Diseñador por asignar";
}
export const clientRecipient = (client: OsClient) => `Cliente · ${client.name}`;
export function jornadaOwner(client: OsClient, record: ModuleRecord, state = jornadaState(record)) {
  switch (state) {
    case "Validación": case "Agenda": return record.values.pm || accountLead(client);
    case "Brief y guiones": case "Validación de Content": case "Cerrada": case "Cancelada": return record.values.content || contentLead(client);
    case "Rodaje": case "Edición": return record.values.proveedor || "Proveedor por asignar";
    case "Subtítulos y motion": return record.values.disenador || designLead(client);
    case "Aprobación del cliente": return clientRecipient(client);
  }
}

/* ───────── Acciones por etapa y rol (vista previa: permisos visuales) ───────── */
export type ActionContext = { role: JornadaRole; actor: string; client: OsClient; providerId?: string };
export function jornadaActions(record: ModuleRecord, ctx: ActionContext): JornadaAction[] {
  const state = jornadaState(record);
  const { role } = ctx;
  const admin = role === "admin";
  const lead = ctx.actor === accountLead(ctx.client);
  const team = admin || role === "pm" || lead;
  const assignedProvider = role === "provider" && Boolean(ctx.providerId) && ctx.providerId === record.values.proveedorId;
  const list: JornadaAction[] = [];
  if (state === "Validación" && team) list.push("validate");
  if (state === "Agenda" && (team || role === "content")) list.push("confirm-agenda");
  if (state === "Brief y guiones" && (team || role === "content")) list.push("send-brief");
  if (state === "Rodaje" && (admin || assignedProvider)) list.push("mark-raw");
  if (state === "Edición" && (admin || assignedProvider)) list.push("mark-edit");
  if (state === "Validación de Content" && (team || role === "content")) list.push("approve-edit", "request-edit-changes");
  if (state === "Subtítulos y motion" && (admin || role === "designer")) list.push("deliver-design");
  if (state === "Aprobación del cliente" && role === "client") list.push("client-approve", "client-changes");
  if (["Validación", "Agenda", "Brief y guiones"].includes(state) && (team || role === "content")) list.push("cancel");
  return list;
}

/** Campos que cada rol puede guardar en cada etapa (sin avanzar). */
export function editableFields(record: ModuleRecord, ctx: ActionContext): string[] {
  const state = jornadaState(record);
  const internal = ctx.role === "admin" || ctx.role === "pm" || ctx.role === "content" || ctx.actor === accountLead(ctx.client);
  const provider = ctx.role === "admin" || (ctx.role === "provider" && ctx.providerId === record.values.proveedorId);
  if (state === "Validación" && internal) return ["proveedorId", "fecha", "drive", "brief"];
  if (state === "Agenda" && internal) return ["fecha", "horario", "locacion", "agendaNota", "proveedorId"];
  if (state === "Brief y guiones" && internal) return ["brief", "guion", "guionUrl", "drive", "horario", "locacion"];
  if (state === "Rodaje" && provider) return ["planRodaje", "materialNota"];
  if (state === "Edición" && provider) return ["edicionUrl", "edicionNota"];
  if (state === "Subtítulos y motion" && (ctx.role === "admin" || ctx.role === "designer")) return ["finalUrl"];
  return [];
}

export type TransitionInput = ActionContext & { at?: string; comment?: string; patch?: Record<string, string>; available?: number; taskId: string };
const PATCH_KEYS: Partial<Record<JornadaAction, string[]>> = {
  "confirm-agenda": ["fecha", "horario", "locacion", "agendaNota"],
  "send-brief": ["brief", "guion", "guionUrl"],
  "mark-raw": ["planRodaje", "materialNota"],
  "mark-edit": ["edicionUrl", "edicionNota"],
  "deliver-design": ["finalUrl"],
};

export function applyJornadaAction(record: ModuleRecord, action: JornadaAction, input: TransitionInput): ModuleRecord {
  if (record.module !== "audiovisuales" || record.collection !== "jornadas") throw new Error("El registro no es una jornada audiovisual.");
  if (record.client !== input.client.slug) throw new Error("La jornada no pertenece a esta cuenta.");
  if (!jornadaActions(record, input).includes(action)) throw new Error("La acción no está disponible para esta etapa y este rol.");
  const from = jornadaState(record);
  const at = input.at || new Date().toISOString();
  const comment = input.comment?.trim() || "";
  const patch = Object.fromEntries(Object.entries(input.patch || {}).filter(([key]) => (PATCH_KEYS[action] || []).includes(key)).map(([key, value]) => [key, value.trim()]));
  const values: Record<string, string> = { ...record.values, ...patch };
  let to: JornadaState;
  switch (action) {
    case "validate":
      if ((input.available ?? 0) < 1) throw new Error("No quedan jornadas disponibles en el cupo contratado. Ampliá el alcance o reprogramá la jornada para el próximo período.");
      values.validadaAt = at; values.validadaPor = input.actor;
      to = "Agenda"; break;
    case "confirm-agenda":
      if (!validDate(values.fecha)) throw new Error("Confirmá una fecha válida para la jornada.");
      values.agendaConfirmadaAt = at;
      to = "Brief y guiones"; break;
    case "send-brief":
      if (!values.brief?.trim()) throw new Error("Completá el brief de la jornada.");
      if (!values.guion?.trim() && !safeUrl(values.guionUrl)) throw new Error("Escribí el guion o pegá un enlace válido al documento.");
      if (values.guionUrl && !safeUrl(values.guionUrl)) throw new Error("El enlace del guion tiene que empezar con http:// o https://.");
      values.briefEnviadoAt = at;
      to = "Rodaje"; break;
    case "mark-raw":
      if (!values.planRodaje?.trim()) throw new Error("Cargá el plan de rodaje antes de marcar el material como subido.");
      values.materialSubidoAt = at;
      values.fechaLimiteEdicion = editionDeadline(at);
      to = "Edición"; break;
    case "mark-edit": {
      if (values.edicionUrl && !safeUrl(values.edicionUrl)) throw new Error("El enlace a la edición tiene que empezar con http:// o https://.");
      const versions = jornadaTransitions(record).filter((entry) => entry.action === "mark-edit").length + 1;
      values.edicionSubidaAt = at; values.edicionVersion = `v${versions}`;
      to = "Validación de Content"; break;
    }
    case "approve-edit":
      values.contentValidadaAt = at;
      to = "Subtítulos y motion"; break;
    case "request-edit-changes":
      if (!comment) throw new Error("Contale al proveedor qué ajustes necesitás.");
      values.fechaLimiteEdicion = editionDeadline(at);
      to = "Edición"; break;
    case "deliver-design":
      if (!safeUrl(values.finalUrl)) throw new Error("Pegá el enlace a la versión final con subtítulos y motion (http:// o https://).");
      values.disenoEntregadoAt = at;
      to = "Aprobación del cliente"; break;
    case "client-approve":
      values.clienteAprobadaAt = at; values.cerradaAt = at;
      to = "Cerrada"; break;
    case "client-changes":
      if (!comment) throw new Error("Contanos qué cambios necesitás.");
      to = "Subtítulos y motion"; break;
    case "cancel":
      values.canceladaDesde = from; values.canceladaAt = at;
      to = "Cancelada"; break;
  }
  values.estado = to;
  values.tareaId = input.taskId;
  const next: ModuleRecord = { ...record, values, user: input.actor, updatedAt: at };
  const transition: JornadaTransition = { id: `JTR-${Date.parse(at).toString(36)}-${jornadaTransitions(record).length + 1}`, from, to, action, actor: input.actor, at, comment, responsible: jornadaOwner(input.client, next, to), taskId: input.taskId };
  values.jornadaTransitions = JSON.stringify([...jornadaTransitions(record), transition]);
  const result: ModuleRecord = { ...next, values, history: [{ at, user: input.actor, text: `${from} → ${to}${comment ? ` · ${comment}` : ""}` }, ...record.history] };
  if (!comment) return result;
  // Visibilidad del comentario: ajustes de edición → proveedor; cambios del cliente → compartido con el cliente.
  const visibility: JornadaVisibility = action === "request-edit-changes" ? "provider" : action.startsWith("client") ? "client" : "internal";
  return addJornadaComment(result, { actor: input.actor, text: comment, visibility, at, stage: from });
}

export function addJornadaComment(record: ModuleRecord, input: { actor: string; text: string; visibility: JornadaVisibility; at: string; stage?: JornadaState }): ModuleRecord {
  const text = input.text.trim();
  if (!text) throw new Error("Escribí un comentario.");
  if (text.length > 2000) throw new Error("El comentario supera los 2000 caracteres.");
  const comment: JornadaComment = { id: `JCM-${Date.parse(input.at).toString(36)}-${jornadaComments(record).length + 1}`, actor: input.actor, at: input.at, text, visibility: input.visibility, stage: input.stage || jornadaState(record) };
  return { ...record, user: input.actor, updatedAt: input.at, values: { ...record.values, jornadaComments: JSON.stringify([...jornadaComments(record), comment]) }, history: [{ at: input.at, user: input.actor, text: input.visibility === "internal" ? "Agregó un comentario interno" : input.visibility === "provider" ? "Comentó con el proveedor" : "Comentó con el cliente" }, ...record.history] };
}

/** Comentarios que puede leer cada audiencia (el proveedor nunca ve los internos ni los del cliente). */
export function visibleComments(record: ModuleRecord, audience: "team" | "provider" | "client") {
  return jornadaComments(record).filter((comment) => audience === "team" || comment.visibility === audience);
}

/* ───────── Alta ───────── */
export type NewJornada = { titulo: string; tipo: string; proveedorId: string; proveedor: string; fecha: string; drive: string; brief: string };
export function validateNewJornada(input: NewJornada, types: readonly string[]) {
  if (!types.includes(input.tipo)) return "Elegí el tipo de jornada.";
  if (!input.proveedorId || !input.proveedor) return "Elegí un proveedor del catálogo.";
  if (!validDate(input.fecha)) return "Elegí la fecha de la jornada.";
  if (!safeUrl(input.drive)) return "Pegá el enlace de la carpeta de Google Drive (tiene que empezar con https://).";
  return "";
}
export function createJornada(input: NewJornada & { id: string; client: OsClient; actor: string; at: string; types: readonly string[] }): ModuleRecord {
  const error = validateNewJornada(input, input.types);
  if (error) throw new Error(error);
  const titulo = input.titulo.trim() || `${input.tipo} · ${input.proveedor}`;
  return {
    id: input.id, client: input.client.slug, module: "audiovisuales", collection: "jornadas", user: input.actor, source: "manual", createdAt: input.at, updatedAt: input.at,
    history: [{ at: input.at, user: input.actor, text: "Creó la jornada" }],
    values: {
      titulo, tipo: input.tipo, proveedorId: input.proveedorId, proveedor: input.proveedor, fecha: input.fecha, drive: safeUrl(input.drive), brief: input.brief.trim(),
      estado: "Validación", creadaPor: input.actor, solicitadaAt: input.at, pm: accountLead(input.client), content: contentLead(input.client), disenador: designLead(input.client),
    },
  };
}

/* ───────── Tarea única y notificaciones ───────── */
export const jornadaTaskId = (clientSlug: string, record: ModuleRecord) => `AV-${clientSlug}-${record.id}`;
export function jornadaHref(clientSlug: string, id: string) {
  return `/v2/clientes/${clientSlug}/audiovisuales?seccion=jornadas&jornada=${encodeURIComponent(id)}`;
}
function stageDue(record: ModuleRecord, state: JornadaState) {
  const v = record.values;
  const plus = (iso: string | undefined, days: number) => (iso ? addDays(localDate(iso), days) : "");
  switch (state) {
    case "Validación": { const due = plus(v.solicitadaAt || record.createdAt, 2); return validDate(v.fecha) && v.fecha < due ? v.fecha : due; }
    case "Agenda": case "Brief y guiones": case "Rodaje": return v.fecha || "Sin fecha";
    case "Edición": return v.fechaLimiteEdicion || "Sin fecha";
    case "Validación de Content": return plus(v.edicionSubidaAt, 1);
    case "Subtítulos y motion": return plus(v.contentValidadaAt, 3);
    case "Aprobación del cliente": return plus(v.disenoEntregadoAt, 3);
    default: return v.fecha || "Sin fecha";
  }
}
/** Entregable del alcance (DEFAULT_SCOPE de Audiovisuales) al que aporta cada etapa. */
const DELIVERABLE_OF: Partial<Record<JornadaState, string>> = { Validación: "Preproducción", Agenda: "Preproducción", "Brief y guiones": "Guion", Rodaje: "Rodaje", Edición: "Edición y versiones", "Validación de Content": "Edición y versiones", "Subtítulos y motion": "Edición y versiones", "Aprobación del cliente": "Edición y versiones", Cerrada: "Edición y versiones" };
export function buildJornadaTask(client: OsClient, record: ModuleRecord, tasks: OsTask[], actor: string, at: string, usage?: QuotaUsage): OsTask {
  const id = jornadaTaskId(client.slug, record);
  const previous = tasks.find((task) => task.id === id);
  const state = jornadaState(record);
  const done = state === "Cerrada" || state === "Cancelada";
  const review = state === "Validación" || state === "Validación de Content" || state === "Aprobación del cliente";
  const owner = jornadaOwner(client, record, state);
  const title = `${STAGE_TITLE[state]} · ${record.values.titulo || record.id}`;
  const due = stageDue(record, state) || "Sin fecha";
  const blocked = state === "Validación" && usage && usage.available < 1 ? "Sin jornadas disponibles en el cupo contratado" : undefined;
  return {
    ...previous, id, clientSlug: client.slug,
    projectSlug: previous?.projectSlug || osProjects.find((project) => project.clientSlug === client.slug)?.slug || "",
    serviceId: "audiovisuales",
    workItem: { collection: "jornadas", id: record.id, label: record.values.titulo || record.id },
    workflow: { kind: "jornada", stage: state, href: jornadaHref(client.slug, record.id) },
    deliverable: DELIVERABLE_OF[state] ?? previous?.deliverable,
    title, owner, approver: review ? owner : undefined, approvalTitle: review ? title : undefined,
    status: done ? "Hecho" : review ? "En aprobación" : ["Rodaje", "Edición", "Subtítulos y motion"].includes(state) ? "En curso" : "Por hacer",
    prio: previous?.prio || "Media", due, dueKind: done ? "past" : dueKindForDate(due, at), blocked,
    desc: [`Jornada ${record.values.tipo || ""} con ${record.values.proveedor || "proveedor por asignar"}${record.values.fecha ? ` · ${record.values.fecha}` : ""}.`, record.values.brief, record.values.drive ? `Carpeta de Drive (sin conexión): ${record.values.drive}` : ""].filter(Boolean).join("\n\n"),
    files: previous?.files || [], comments: previous?.comments || [],
    activity: [{ text: `${actor}: ${state} · responsable ${owner}`, when: at }, ...(previous?.activity || [])],
    completedAt: done ? previous?.completedAt || at : undefined, archivedAt: undefined,
  };
}
/** Notificación al nuevo responsable, con el enlace que corresponde a su espacio (equipo, proveedor o portal). */
export function jornadaNotification(task: OsTask, record: ModuleRecord, eventId: string, at: string, kind: WorkflowNotification["kind"]): WorkflowNotification {
  const base = workflowNotification(task, eventId, at, kind);
  const state = jornadaState(record);
  const href = state === "Aprobación del cliente" ? `/v2/portal/${record.client}?jornada=${encodeURIComponent(record.id)}`
    : state === "Rodaje" || state === "Edición" ? `/v2/proveedor?jornada=${encodeURIComponent(record.id)}`
      : jornadaHref(record.client, record.id);
  return { ...base, href };
}
export function notificationKind(action: JornadaAction): WorkflowNotification["kind"] {
  if (action === "client-approve" || action === "client-changes") return "client-response";
  if (action === "request-edit-changes") return "changes";
  if (action === "validate" || action === "approve-edit") return "approval";
  return "review";
}

/* ───────── Cierre: un único pedido a Diseño (subtítulos y motion) ───────── */
export function upsertJornadaDesignRequest(records: ModuleRecord[], jornada: ModuleRecord, ctx: { actor: string; at: string; taskId: string; designer: string; stage: "En producción" | "Esperando aprobación" | "Ajustes" | "Aprobados" }): { records: ModuleRecord[]; request: ModuleRecord } {
  const previous = records.find((record) => record.client === jornada.client && record.values.jornadaId === jornada.id);
  const ESTADO = { "En producción": "En curso", "Esperando aprobación": "En aprobación", Ajustes: "Cambios pedidos", Aprobados: "Aprobado" } as const;
  const ETAPA = { "En producción": "Diseño", "Esperando aprobación": "Revisión", Ajustes: "Diseño", Aprobados: "Entrega" } as const;
  const v = jornada.values;
  const values: Record<string, string> = {
    ...previous?.values,
    nombre: `Subtítulos y motion · ${v.titulo || jornada.id}`,
    servicioOrigen: "audiovisuales", jornadaId: jornada.id, tipoPieza: "Motion", canal: "Video", prioridad: previous?.values.prioridad || "Media",
    detalle: [`Sumar subtítulos y motion a la edición ${v.edicionVersion || ""} validada por Content.`.replace("  ", " "), v.brief && `Brief de la jornada: ${v.brief}`].filter(Boolean).join("\n\n"),
    recursos: [v.drive && `Carpeta de Google Drive (sin conexión con el OS): ${v.drive}`, v.edicionUrl && `Edición del proveedor: ${v.edicionUrl}`].filter(Boolean).join("\n"),
    consideraciones: "Subtítulos legibles en 9:16 y 16:9, motion con los lineamientos de marca del cliente.",
    lineamientos: `/v2/clientes/${jornada.client}/diseno-marca?area=lineamientos`,
    responsable: ctx.designer, fechaObjetivo: v.contentValidadaAt ? addDays(localDate(v.contentValidadaAt), 3) : previous?.values.fechaObjetivo || "",
    operacion: ctx.stage, estado: ESTADO[ctx.stage], etapa: ETAPA[ctx.stage], tareaId: ctx.taskId,
    ...(v.finalUrl ? { archivo: v.finalUrl } : {}),
  };
  const text = previous ? `Jornada ${jornada.id}: ${ctx.stage}` : "Pedido creado al validar la edición de la jornada audiovisual";
  const request: ModuleRecord = previous
    ? { ...previous, values, updatedAt: ctx.at, user: ctx.actor, history: [{ at: ctx.at, user: ctx.actor, text }, ...previous.history] }
    : { id: `DIS-${jornada.id}`, client: jornada.client, module: "diseno-marca", collection: "trabajos", source: jornada.source, user: ctx.actor, createdAt: ctx.at, updatedAt: ctx.at, values, history: [{ at: ctx.at, user: ctx.actor, text }] };
  return { request, records: previous ? records.map((record) => record.id === request.id && record.client === request.client ? request : record) : [request, ...records] };
}
/** Entrega registrada al aprobar el cliente (reutiliza el objeto «Entregas»), sin duplicar. */
export function upsertJornadaDelivery(records: ModuleRecord[], jornada: ModuleRecord, ctx: { actor: string; at: string }) {
  const id = `ENT-${jornada.id}`;
  const previous = records.find((record) => record.id === id && record.client === jornada.client);
  const values = { ...previous?.values, entregable: `Edición final · ${jornada.values.titulo}`, formato: "Subtitulado", fecha: localDate(ctx.at), destino: "Drive", estado: "Confirmado", jornada: jornada.id, enlace: jornada.values.finalUrl || "" };
  const record: ModuleRecord = previous
    ? { ...previous, values, updatedAt: ctx.at, user: ctx.actor, history: [{ at: ctx.at, user: ctx.actor, text: "El cliente volvió a aprobar la jornada" }, ...previous.history] }
    : { id, client: jornada.client, module: "audiovisuales", collection: "entregas", source: jornada.source, user: ctx.actor, createdAt: ctx.at, updatedAt: ctx.at, values, history: [{ at: ctx.at, user: ctx.actor, text: "Entrega confirmada por el cliente desde su portal" }] };
  return previous ? records.map((item) => item.id === id && item.client === jornada.client ? record : item) : [record, ...records];
}

/* ───────── Vistas acotadas ───────── */
const PROVIDER_FIELDS = ["titulo", "tipo", "fecha", "horario", "locacion", "drive", "brief", "guion", "guionUrl", "planRodaje", "materialNota", "materialSubidoAt", "fechaLimiteEdicion", "edicionUrl", "edicionNota", "edicionSubidaAt", "edicionVersion", "estado", "proveedorId", "proveedor"];
/** Lo que ve un proveedor de SU jornada: sin comentarios internos, sin datos del cliente ni de otras jornadas.
 * El brief y el guion se comparten recién cuando el Content los envía (etapa Rodaje en adelante). */
export function providerProjection(record: ModuleRecord, providerId: string) {
  if (record.values.proveedorId !== providerId) return null;
  const state = jornadaState(record);
  const briefShared = jornadaStep(state) >= 4 || state === "Cerrada";
  const values = Object.fromEntries(PROVIDER_FIELDS.filter((key) => record.values[key] && (briefShared || !["brief", "guion", "guionUrl"].includes(key))).map((key) => [key, record.values[key]]));
  return { id: record.id, client: record.client, state, step: jornadaStep(state), values, comments: visibleComments(record, "provider") };
}
export type ProviderJornada = NonNullable<ReturnType<typeof providerProjection>>;
/** Lo que ve el cliente: estado general y, al cierre, la pieza final con su conversación compartida. */
export function clientProjection(record: ModuleRecord) {
  const state = jornadaState(record);
  if (state === "Cancelada") return null;
  const v = record.values;
  return { id: record.id, state, step: jornadaStep(state), titulo: v.titulo, tipo: v.tipo, fecha: v.fecha, proveedor: v.proveedor, finalUrl: jornadaStep(state) === 6 && ["Aprobación del cliente", "Cerrada"].includes(state) ? v.finalUrl || "" : "", pending: state === "Aprobación del cliente", approvedAt: v.clienteAprobadaAt || "", comments: visibleComments(record, "client"), demo: record.source === "demo" };
}
