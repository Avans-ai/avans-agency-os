import { osProjects, type DueKind, type OsClient, type OsTask, type ServiceId } from "./os-data";
import type { ModuleRecord } from "./modules/types";
import { serviceHref } from "./service-workspace-data";

export type WorkflowNotification = {
  id: string; clientSlug: string; taskId: string; recipient: string;
  kind: "assignment" | "due" | "changes" | "approval" | "blocked" | "owner" | "review" | "client-response";
  title: string; href: string; at: string; readAt?: string;
};
export type LocalWrite = { key: string; value: unknown };

export function dueKindForDate(date: string, at: string): DueKind {
  if (!/^\d{4}-\d{2}-\d{2}/.test(date)) return "later";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(at));
  const days = (Date.parse(`${date.slice(0, 10)}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000;
  return days < 0 ? "late" : days === 0 ? "today" : days <= 7 ? "week" : "later";
}
export function contentTaskId(clientSlug: string, record: ModuleRecord, tasks: OsTask[]) {
  return tasks.find((task) => task.workItem?.id === record.id && task.workItem.collection === "piezas" && (task.clientSlug ? task.clientSlug === clientSlug : osProjects.some((p) => p.slug === task.projectSlug && p.clientSlug === clientSlug)))?.id ?? `CONTENT-${clientSlug}-${record.id}`;
}
export function contentOwner(client: OsClient, record: ModuleRecord) {
  const state = record.values.estado;
  if (["Revisión preliminar del cliente", "Información del cliente", "Aprobación final del cliente"].includes(state)) return `Cliente · ${client.name}`;
  if (state === "Producción de diseño" || (state === "Ajustes" && ["Producción de diseño", "Revisión interna del diseño", "Aprobación final del cliente"].includes(record.values.returnState))) return record.values.disenador || client.team.find((p) => /Diseño/.test(p.role))?.name || "Diseñador por asignar";
  if (state === "Revisión interna de producción") return record.values.revisor || client.owner;
  return record.values.responsable || client.team.find((p) => /Contenido/.test(p.role))?.name || "Content por asignar";
}
export function buildContentTask(client: OsClient, record: ModuleRecord, tasks: OsTask[], actor: string, at: string): OsTask {
  const id = contentTaskId(client.slug, record, tasks);
  const previous = tasks.find((task) => task.id === id);
  const stage = record.values.estado || "Borrador";
  const done = ["Programado", "Publicada", "Publicado"].includes(stage);
  const design = stage === "Producción de diseño" || (stage === "Ajustes" && ["Producción de diseño", "Revisión interna del diseño", "Aprobación final del cliente"].includes(record.values.returnState));
  const serviceId: ServiceId = design ? "diseno-marca" : "contenidos";
  const owner = contentOwner(client, record);
  const review = /Revisión|Aprobación/.test(stage);
  const title = `${stage === "Aprobado" ? "Programar" : stage} · ${record.values.titulo || record.id}`;
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
export function workflowNotification(task: OsTask, eventId: string, at: string, kind: WorkflowNotification["kind"] = "review"): WorkflowNotification {
  const portal = task.owner.startsWith("Cliente ·");
  return { id: `WF-${task.clientSlug || "legacy"}-${task.id}-${eventId}`, clientSlug: task.clientSlug || "", taskId: task.id, recipient: task.owner, kind, title: task.title, href: portal ? `/v2/portal/${task.clientSlug}?contenido=${encodeURIComponent(task.workItem?.id || "")}` : task.workflow?.href || `/v2/proyectos/${task.projectSlug}?task=${task.id}`, at };
}
export function upcomingNotifications(tasks: OsTask[], at: string) {
  return tasks.filter((task) => task.status !== "Hecho" && task.clientSlug && /^\d{4}-\d{2}-\d{2}$/.test(task.due) && ["today", "week", "late"].includes(dueKindForDate(task.due, at))).map((task) => ({ ...workflowNotification(task, `DUE-${task.id}-${task.due}`, at, "due"), title: `${dueKindForDate(task.due, at) === "late" ? "Vencida" : "Próximo vencimiento"} · ${task.title}` }));
}
