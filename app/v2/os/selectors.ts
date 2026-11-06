import {
  CURRENT_USER, osClients, osProjects,
  type ClientStatus, type DueKind, type OsTask, type TaskStatus,
} from "./os-data";

const PROGRESS_WEIGHT: Record<TaskStatus, number> = { "Hecho": 1, "En aprobación": 0.75, "En curso": 0.5, "Por hacer": 0.36 };
/** Tracked projects derive progress from their tasks (same rule as the prototype). */
const MIN_TRACKED_TASKS = 5;

export function getClient(slug: string) {
  return osClients.find(client => client.slug === slug);
}
export function getProject(slug: string) {
  return osProjects.find(project => project.slug === slug);
}
export function projectsOf(clientSlug: string) {
  return osProjects.filter(project => project.clientSlug === clientSlug);
}
export function tasksOf(tasks: OsTask[], projectSlug: string) {
  return tasks.filter(item => item.projectSlug === projectSlug);
}

export function projectProgress(projectSlug: string, tasks: OsTask[]) {
  const project = getProject(projectSlug);
  const own = tasksOf(tasks, projectSlug);
  if (own.length < MIN_TRACKED_TASKS) return project?.progress ?? 0;
  return Math.round(own.reduce((sum, item) => sum + PROGRESS_WEIGHT[item.status], 0) / own.length * 100);
}

export function isMine(item: OsTask) {
  return item.owner === CURRENT_USER.name;
}
export function waitsForMe(item: OsTask) {
  return item.status === "En aprobación" && item.approver === CURRENT_USER.name;
}

/** "Mis tareas": own open tasks plus approvals assigned to me that are tracked as a task. */
export function myOpenWork(tasks: OsTask[]) {
  return tasks.filter(item => (isMine(item) && item.status !== "Hecho") || (waitsForMe(item) && item.approvalTitle));
}
export function pendingApprovals(tasks: OsTask[]) {
  return tasks.filter(item => item.status === "En aprobación");
}
export function myApprovals(tasks: OsTask[]) {
  return tasks.filter(waitsForMe);
}
export function activeBlockers(tasks: OsTask[]) {
  return tasks.filter(item => item.blocked && item.status !== "Hecho");
}

export const DUE_GROUPS: { kind: DueKind; label: string }[] = [
  { kind: "late", label: "Vencidas" },
  { kind: "today", label: "Hoy" },
  { kind: "week", label: "Esta semana" },
  { kind: "later", label: "Más adelante" },
];

export function dueLabel(item: Pick<OsTask, "due" | "dueKind" | "status">) {
  if (item.status === "Hecho") return item.due;
  if (item.dueKind === "today") return "Hoy";
  if (item.dueKind === "late") return `Vencida ${item.due}`;
  return item.due;
}
export function dueFull(item: Pick<OsTask, "due" | "dueKind" | "status">) {
  if (item.status === "Hecho") return `${item.due} · completada`;
  if (item.dueKind === "today") return "Hoy, viernes 30 oct";
  if (item.dueKind === "late") return `Vencida · ${item.due}`;
  return `${item.due} 2026`;
}
export function isSoon(item: OsTask) {
  return item.status !== "Hecho" && (item.dueKind === "today" || item.dueKind === "week" || item.dueKind === "late");
}

export const STATUS_ORDER: Record<ClientStatus, number> = { "en-riesgo": 0, atencion: 1, onboarding: 2, "al-dia": 3, pausado: 4 };

export function projectsNeedingAttention() {
  return osProjects
    .filter(project => project.status === "en-riesgo" || project.status === "atencion")
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name, "es"))
    .sort((a, b) => (a.slug === "lanzamiento-line-up-2027" ? -1 : b.slug === "lanzamiento-line-up-2027" ? 1 : 0));
}

export function formatMoney(value: number) {
  return `$ ${value.toLocaleString("es-AR")}`;
}
