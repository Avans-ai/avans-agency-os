/* Señales que salen de las tareas del módulo (mismo modelo que «Tareas»).
 * Las tareas espejo de un flujo (diseño, contenido, pauta, jornada) no se cuentan dos veces:
 * esos flujos aportan sus señales desde la entidad; de las tareas solo se toman los bloqueos
 * (que viven en la tarea) y los vencimientos/aprobaciones de tareas sueltas. */
import { isArchivedTaskAt, serviceForTask } from "../director-data";
import type { ServiceId } from "../os-data";
import { serviceHref } from "../service-workspace-data";
import type { TaskLite } from "./input";
import type { DataOrigin, ItemRef } from "./types";

export function taskHref(clientSlug: string, task: TaskLite) {
  if (task.workflowHref && task.workflowHref.startsWith("/v2/")) return task.workflowHref;
  return `${serviceHref(clientSlug, serviceForTask(task))}?seccion=tareas&task=${encodeURIComponent(task.id)}`;
}

export function serviceTasks(tasks: TaskLite[], serviceId: ServiceId, asOf: string) {
  const now = Date.parse(`${asOf}T23:59:59Z`);
  const own = tasks.filter((task) => serviceForTask(task) === serviceId && !isArchivedTaskAt(task, now));
  const open = own.filter((task) => task.status !== "Hecho");
  const standalone = open.filter((task) => !task.workflowKind);
  return {
    open,
    blocked: open.filter((task) => Boolean(task.blocked)),
    late: standalone.filter((task) => task.dueKind === "late"),
    approvals: standalone.filter((task) => task.status === "En aprobación"),
  };
}

/** Las tareas de la vista previa son demo cuando vienen de los datos iniciales (T-…) o de un flujo demo. */
export function taskOrigin(task: TaskLite): DataOrigin {
  return /^T-\d+$/.test(task.id) || /-(ACA|EPSA|EDI|POR|LID)-/.test(task.id) ? "demo" : "real";
}

export function taskItems(clientSlug: string, signals: ReturnType<typeof serviceTasks>): ItemRef[] {
  return [
    ...signals.blocked.map((task): ItemRef => ({ id: `task-${task.id}`, title: task.title, detail: `Bloqueo: ${task.blocked}${task.blockedSince ? ` · hace ${task.blockedSince}` : ""}`, kind: "bloqueo", href: taskHref(clientSlug, task), origin: taskOrigin(task) })),
    ...signals.late.filter((task) => !task.blocked).map((task): ItemRef => ({ id: `task-${task.id}`, title: task.title, detail: `Tarea vencida · ${task.due} · ${task.owner}`, kind: "vencido", href: taskHref(clientSlug, task), origin: taskOrigin(task) })),
    ...signals.approvals.filter((task) => !task.blocked && task.dueKind !== "late").map((task): ItemRef => ({ id: `task-${task.id}`, title: task.title, detail: `Aprueba ${task.approver ?? "por asignar"} · ${task.due}`, kind: "aprobacion", href: taskHref(clientSlug, task), origin: taskOrigin(task) })),
  ];
}
