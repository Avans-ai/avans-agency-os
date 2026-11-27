/* Tareas operativas generadas por los flujos de los módulos (Contenidos, Diseño de marca,
 * Publicidad digital y Audiovisuales).
 *
 * Modelo: una CADENA de tareas por objeto de origen (contenido, pedido, anuncio, planificación
 * o jornada). Cada etapa del flujo tiene su propia tarea; al cambiar de etapa la tarea vigente se
 * completa (Hecho + completedAt) y se crea —o se reabre— la de la etapa siguiente, siempre de
 * forma idempotente:
 *   - la primera tarea conserva el id histórico del flujo (`CONTENT-<cliente>-<contenido>`,
 *     `DESIGN-…`, `PAID-…`, `PAID-PLAN-…`, `AV-…`): las tareas únicas guardadas antes de este
 *     modelo siguen siendo válidas y quedan como primera tarea de su cadena;
 *   - las siguientes usan `<id base>-<etapa>-<ciclo>` (p. ej. `CONTENT-aca-PZA-1-ajustes-2`);
 *   - repetir la misma etapa actualiza la tarea vigente: nunca crea otra.
 * Todas viven en el store único `workspace.tasks`; las vistas (módulo, cliente, Inicio) solo leen. */
import { osProjects, type DueKind, type OsClient, type OsTask, type ServiceId } from "./os-data";
import type { ModuleRecord } from "./modules/types";
import { serviceHref } from "./service-workspace-data";

export type WorkflowNotification = {
  id: string; clientSlug: string; taskId: string; recipient: string;
  kind: "assignment" | "due" | "changes" | "approval" | "blocked" | "owner" | "review" | "client-response";
  title: string; href: string; at: string; readAt?: string;
};
export type LocalWrite = { key: string; value: unknown };

/** Responsable que todavía no está definido en la configuración ni en el proceso. Nunca se inventa una persona. */
export const UNASSIGNED_OWNER = "Pendiente de asignación";
const PLACEHOLDER_OWNER = /(por asignar|sin asignar)$/i;
export function ownerOrPending(name?: string) {
  const value = (name || "").trim();
  return !value || PLACEHOLDER_OWNER.test(value) || value === UNASSIGNED_OWNER ? UNASSIGNED_OWNER : value;
}
export function isUnassigned(name?: string) {
  return ownerOrPending(name) === UNASSIGNED_OWNER;
}

export function dueKindForDate(date: string, at: string): DueKind {
  if (!/^\d{4}-\d{2}-\d{2}/.test(date)) return "later";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(at));
  const days = (Date.parse(`${date.slice(0, 10)}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000;
  return days < 0 ? "late" : days === 0 ? "today" : days <= 7 ? "week" : "later";
}

/* ───────── Cadena de tareas por etapa (helper compartido por todos los flujos) ───────── */

export function stageSlug(stage: string) {
  return stage.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "etapa";
}
/** Tareas de una cadena (la primera tiene el id base; las demás, `chainId` = id base), en orden de creación. */
export function chainTasks(tasks: OsTask[], base: string) {
  return tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => task.id === base || task.chainId === base)
    .sort((a, b) => (a.task.id === base ? -1 : b.task.id === base ? 1 : 0) || (a.task.createdAt || "").localeCompare(b.task.createdAt || "") || a.index - b.index)
    .map(({ task }) => task);
}
/** Tarea vigente de la cadena: la última creada (abierta o, si el flujo terminó, la última completada). */
export function latestChainTask(tasks: OsTask[], base: string) {
  return chainTasks(tasks, base).at(-1);
}
/** Id base de la cadena a la que pertenece una tarea. */
export function chainBaseOf(task: Pick<OsTask, "id" | "chainId">) {
  return task.chainId || task.id;
}

export type StageTaskResult = {
  /** Tarea de la etapa actual (la que se vincula al objeto de origen). */
  current: OsTask;
  /** Tareas a guardar: la etapa anterior completada (si hubo cambio de etapa) y la actual. */
  changed: OsTask[];
  /** Tarea completada por el cambio de etapa. */
  completed?: OsTask;
  /** true cuando se creó (o reabrió) una tarea nueva para esta etapa. */
  created: boolean;
};

/**
 * Aplica a la cadena la tarea que el flujo calculó para la etapa actual (`built`).
 * - Misma etapa que la tarea vigente → se actualiza esa tarea (mismo id).
 * - Etapa nueva → se completa la vigente y se crea la de esta etapa (id determinístico con ciclo).
 * - Etapa final (`built.status === "Hecho"`) → se completa la vigente y queda un registro de cierre ya completado.
 * Idempotente: aplicar dos veces la misma etapa no crea tareas.
 */
export function applyStageTask(tasks: OsTask[], built: OsTask, ctx: { base: string; at: string; actor: string; /** Agrupa etapas que son el mismo trabajo (p. ej. Pendientes y En producción). */ stageKey?: (stage: string) => string }): StageTaskResult {
  const chain = chainTasks(tasks, ctx.base);
  const latest = chain.at(-1);
  const stage = built.workflow?.stage ?? "";
  const key = ctx.stageKey ?? ((value: string) => value);
  const tidy = (task: OsTask): OsTask => ({ ...task, owner: ownerOrPending(task.owner), approver: task.approver ? ownerOrPending(task.approver) : undefined, ...(task.id === ctx.base ? {} : { chainId: ctx.base }) });
  if (!latest) {
    const current = tidy({ ...built, id: ctx.base, cycle: 1, createdAt: built.createdAt || ctx.at });
    return { current, changed: [current], created: true };
  }
  if (key(latest.workflow?.stage ?? "") === key(stage)) {
    const current = tidy({ ...built, id: latest.id, cycle: latest.cycle ?? 1, createdAt: latest.createdAt ?? built.createdAt, previousTaskId: latest.previousTaskId });
    return { current, changed: [current], created: false };
  }
  if (built.status === "Hecho" && latest.status === "Hecho") {
    // De una etapa final a otra (p. ej. Aprobados → Entregados): se actualiza el registro de cierre, sin crear otro.
    const current = tidy({ ...built, id: latest.id, cycle: latest.cycle ?? 1, createdAt: latest.createdAt, previousTaskId: latest.previousTaskId, completedAt: latest.completedAt ?? built.completedAt });
    return { current, changed: [current], created: false };
  }
  // Etapa final (programado, en circulación, cerrada…): la tarea vigente se completa y queda un registro de
  // cierre ya completado con el responsable final (no pide trabajo, no genera aviso de asignación).
  const completed = latest.status === "Hecho" ? undefined : completeStageTask(latest, ctx.at, ctx.actor, stage);
  const cycle = chain.filter((task) => key(task.workflow?.stage ?? "") === key(stage)).length + 1;
  const id = `${ctx.base}-${stageSlug(key(stage))}-${cycle}`;
  const existing = tasks.find((task) => task.id === id);
  const owner = ownerOrPending(built.owner);
  const current = tidy({
    ...built, id, chainId: ctx.base, cycle, createdAt: existing?.createdAt ?? ctx.at, previousTaskId: latest.id,
    prio: built.prio || latest.prio, comments: existing?.comments ?? [], files: existing?.files ?? [],
    activity: [{ text: `${ctx.actor}: ${existing ? "reabrió" : "creó"} la tarea al pasar de «${latest.workflow?.stage ?? "inicio"}» a «${stage}» · responsable ${owner}`, when: ctx.at }, ...(existing?.activity ?? [])],
    archivedAt: undefined,
  });
  return { current, changed: completed ? [completed, current] : [current], completed, created: true };
}
function completeStageTask(task: OsTask, at: string, actor: string, nextStage: string): OsTask {
  return {
    ...task, status: "Hecho", completedAt: task.completedAt ?? at, dueKind: "past", blocked: undefined, archivedAt: undefined,
    activity: [{ text: `${actor}: completó la etapa «${task.workflow?.stage ?? ""}» · sigue «${nextStage}»`, when: at }, ...task.activity],
  };
}
/** Reemplaza (o agrega) varias tareas por id en una sola pasada. */
export function upsertTasks(tasks: OsTask[], changed: OsTask[]) {
  const byId = new Map(changed.map((task) => [task.id, task]));
  const next = tasks.map((task) => byId.get(task.id) ?? task);
  for (const task of changed) if (!tasks.some((item) => item.id === task.id)) next.push(task);
  return next;
}

/** Origen de una tarea para mostrarlo en las listas (título del objeto + tipo + enlace directo). */
export const ORIGIN_KIND_LABEL: Record<string, string> = {
  piezas: "Contenido", trabajos: "Pedido de diseño", anuncios: "Anuncio", campanas: "Campaña", jornadas: "Jornada audiovisual", procedimientos: "Procedimiento periódico",
};
export function taskOrigin(task: Pick<OsTask, "workItem" | "workflow">) {
  if (!task.workItem && !task.workflow) return null;
  const kind = task.workItem ? ORIGIN_KIND_LABEL[task.workItem.collection] ?? "Objeto del módulo" : "Flujo";
  return { kind, label: task.workItem?.label ?? "", href: task.workflow?.href, stage: task.workflow?.stage };
}

/* ───────── Contenidos ───────── */

function sameClient(task: OsTask, clientSlug: string) {
  return task.clientSlug ? task.clientSlug === clientSlug : osProjects.some((p) => p.slug === task.projectSlug && p.clientSlug === clientSlug);
}
/** Id base de la cadena de un contenido: la tarea que ya estaba vinculada (dato anterior) o `CONTENT-<cliente>-<contenido>`. */
export function contentChainBase(clientSlug: string, record: ModuleRecord, tasks: OsTask[]) {
  const linked = tasks.filter((task) => task.workItem?.id === record.id && task.workItem.collection === "piezas" && sameClient(task, clientSlug));
  return linked.find((task) => task.chainId)?.chainId ?? linked[0]?.id ?? `CONTENT-${clientSlug}-${record.id}`;
}
/** Tarea vigente del contenido (la de su etapa actual) o, si todavía no tiene, el id que tendrá. */
export function contentTaskId(clientSlug: string, record: ModuleRecord, tasks: OsTask[]) {
  const base = contentChainBase(clientSlug, record, tasks);
  return latestChainTask(tasks, base)?.id ?? base;
}
export function contentOwner(client: OsClient, record: ModuleRecord) {
  const state = record.values.estado;
  if (["Revisión preliminar del cliente", "Información del cliente", "Aprobación final del cliente"].includes(state)) return `Cliente · ${client.name}`;
  if (state === "Producción de diseño" || (state === "Ajustes" && ["Producción de diseño", "Revisión interna del diseño", "Aprobación final del cliente"].includes(record.values.returnState))) return record.values.disenador || client.team.find((p) => /Diseño/.test(p.role))?.name || UNASSIGNED_OWNER;
  if (state === "Revisión interna de producción") return record.values.revisor || client.owner || UNASSIGNED_OWNER;
  return record.values.responsable || client.team.find((p) => /Contenido/.test(p.role))?.name || UNASSIGNED_OWNER;
}
const DESIGN_RETURN = ["Producción de diseño", "Revisión interna del diseño", "Aprobación final del cliente"];
/** Verbo de la tarea de cada etapa: el título se entiende sin conocer los estados internos. */
export function contentTaskVerb(stage: string, returnState?: string) {
  switch (stage) {
    case "Borrador": return "Preparar propuesta";
    case "Revisión interna de producción": return "Revisar propuesta";
    case "Revisión preliminar del cliente": return "Aprobar propuesta (cliente)";
    case "Información del cliente": return "Enviar información pedida (cliente)";
    case "Ajustes": return DESIGN_RETURN.includes(returnState || "") ? "Ajustar diseño" : "Ajustar propuesta";
    case "Preproducción": return "Completar preproducción";
    case "Producción de diseño": return "Diseñar pieza";
    case "Revisión interna del diseño": return "Revisar diseño";
    case "Aprobación final del cliente": return "Aprobar pieza final (cliente)";
    case "Aprobado": return "Programar publicación";
    case "Programado": return "Publicación programada";
    case "Publicada": case "Publicado": return "Publicado";
    default: return stage;
  }
}
export function buildContentTask(client: OsClient, record: ModuleRecord, tasks: OsTask[], actor: string, at: string): OsTask {
  const id = contentTaskId(client.slug, record, tasks);
  const previous = tasks.find((task) => task.id === id);
  const stage = record.values.estado || "Borrador";
  const done = ["Programado", "Publicada", "Publicado"].includes(stage);
  const design = stage === "Producción de diseño" || (stage === "Ajustes" && DESIGN_RETURN.includes(record.values.returnState));
  const serviceId: ServiceId = design ? "diseno-marca" : "contenidos";
  const owner = ownerOrPending(contentOwner(client, record));
  const review = /Revisión|Aprobación/.test(stage);
  const title = `${contentTaskVerb(stage, record.values.returnState)} · ${record.values.titulo || record.id}`;
  const due = record.values.fecha || record.values.fechaPublicacion || "Sin fecha";
  return {
    ...previous, id, clientSlug: client.slug,
    projectSlug: previous?.projectSlug || osProjects.find((p) => p.clientSlug === client.slug && /contenido/i.test(p.slug))?.slug || osProjects.find((p) => p.clientSlug === client.slug)?.slug || "",
    serviceId, workItem: { collection: "piezas", id: record.id, label: record.values.titulo || record.id },
    workflow: { kind: "content", stage, href: `${serviceHref(client.slug, "contenidos")}?seccion=piezas&registro=${encodeURIComponent(record.id)}` },
    title, owner, approver: review ? owner : undefined, approvalTitle: review ? title : undefined,
    status: done ? "Hecho" : review ? "En aprobación" : "Por hacer",
    prio: previous?.prio || "Media", due, dueKind: done ? "past" : dueKindForDate(due, at),
    blocked: stage === "Información del cliente" ? record.values.necesitaCliente || record.values.necesidadCliente || "Esperando información del cliente" : undefined,
    desc: [record.values.idea, record.values.bajada, record.values.objetivo, record.values.copy, record.values.referencia].filter(Boolean).join("\n\n"),
    files: previous?.files || [], comments: previous?.comments || [],
    activity: [{ text: `${actor}: ${stage} · responsable ${owner}`, when: at }, ...(previous?.activity || [])],
    completedAt: done ? previous?.completedAt || at : undefined, archivedAt: undefined,
  };
}
/** Tarea de la etapa actual del contenido aplicada a su cadena (completa la anterior y crea la siguiente). */
export function contentStageTasks(client: OsClient, record: ModuleRecord, tasks: OsTask[], actor: string, at: string): StageTaskResult {
  return applyStageTask(tasks, buildContentTask(client, record, tasks, actor, at), { base: contentChainBase(client.slug, record, tasks), at, actor });
}

/* ───────── Avisos ───────── */

export function workflowNotification(task: OsTask, eventId: string, at: string, kind: WorkflowNotification["kind"] = "review"): WorkflowNotification {
  const portal = task.owner.startsWith("Cliente ·");
  return { id: `WF-${task.clientSlug || "legacy"}-${task.id}-${eventId}`, clientSlug: task.clientSlug || "", taskId: task.id, recipient: task.owner, kind, title: task.title, href: portal ? `/v2/portal/${task.clientSlug}?contenido=${encodeURIComponent(task.workItem?.id || "")}` : task.workflow?.href || `/v2/proyectos/${task.projectSlug}?task=${task.id}`, at };
}
/** Aviso de asignación de una tarea nueva de la cadena. Id estable por tarea: repetir la acción no lo duplica. */
export function assignmentNotification(task: OsTask, at: string): WorkflowNotification | undefined {
  if (isUnassigned(task.owner) || task.status === "Hecho") return undefined;
  return { ...workflowNotification(task, "asignada", at, "assignment"), title: `Nueva tarea asignada · ${task.title}` };
}
/**
 * Recordatorios de vencimiento (hoy, próximos 7 días o vencidas). Se CALCULAN al abrir la app en este
 * navegador: no hay un servicio en segundo plano, así que no llegan con la app cerrada.
 * Id estable por tarea y fecha: recargar no los duplica.
 */
export function upcomingNotifications(tasks: OsTask[], at: string) {
  return tasks.filter((task) => task.status !== "Hecho" && task.clientSlug && !isUnassigned(task.owner) && /^\d{4}-\d{2}-\d{2}$/.test(task.due) && ["today", "week", "late"].includes(dueKindForDate(task.due, at))).map((task) => ({ ...workflowNotification(task, `DUE-${task.id}-${task.due}`, at, "due"), title: `${dueKindForDate(task.due, at) === "late" ? "Vencida" : "Próximo vencimiento"} · ${task.title}` }));
}
export const REMINDERS_NOTE = "Los recordatorios de vencimiento se calculan cuando abrís Avans OS en este navegador: no hay un servicio en segundo plano, así que no llegan con la app cerrada.";
