/* Resumen operativo por cliente (iteración 2: Operaciones unificada en Clientes).
 * Selectores puros: reciben las tareas del store vivo (incluye las creadas en
 * este navegador) y derivan proyectos activos, vencidas, bloqueos, próxima
 * entrega y alertas. Sin estado propio: la fuente sigue siendo os-data + os-store. */
import { clientAttention, isArchivedTask, serviceForProject, type ClientAttentionItem } from "./director-data";
import type { ClientStatus, DueKind, OsClient, OsProject, OsTask, ServiceId } from "./os-data";
import { projectProgress, projectsOf, STATUS_ORDER, tasksOf } from "./selectors";

const DUE_RANK: Record<DueKind, number> = { late: 0, today: 1, week: 2, past: 3, later: 4 };

export type ProjectOperation = {
  project: OsProject;
  serviceId: ServiceId;
  progress: number;
  open: number;
  overdue: number;
  blockers: number;
};

export type ClientOperation = {
  projects: ProjectOperation[];
  openTasks: number;
  overdue: OsTask[];
  blockers: OsTask[];
  approvals: number;
  /** Próxima tarea abierta con fecha (no vencida): la siguiente entrega del equipo. */
  nextDelivery?: OsTask;
  alerts: ClientAttentionItem[];
  /** Promedio simple del avance de los proyectos activos. */
  progress: number;
  needsAttention: boolean;
  /** Mayor = más urgente. Ordena «Requieren atención». */
  attentionScore: number;
};

const STATUS_WEIGHT: Record<ClientStatus, number> = { "en-riesgo": 4, atencion: 1, onboarding: 0, "al-dia": 0, pausado: 0 };

function isOpen(task: OsTask) {
  return task.status !== "Hecho" && !isArchivedTask(task);
}

export function clientOperation(client: OsClient, tasks: OsTask[]): ClientOperation {
  const projects = projectsOf(client.slug)
    .filter((project) => project.status !== "pausado")
    .map((project) => {
      const open = tasksOf(tasks, project.slug).filter(isOpen);
      return {
        project,
        serviceId: serviceForProject(project.slug),
        progress: projectProgress(project.slug, tasks),
        open: open.length,
        overdue: open.filter((task) => task.dueKind === "late").length,
        blockers: open.filter((task) => task.blocked).length,
      };
    })
    .sort((a, b) => STATUS_ORDER[a.project.status] - STATUS_ORDER[b.project.status] || a.project.name.localeCompare(b.project.name, "es"));
  const projectSlugs = new Set(projects.map((item) => item.project.slug));
  const open = tasks.filter((task) => projectSlugs.has(task.projectSlug) && isOpen(task));
  const overdue = open.filter((task) => task.dueKind === "late");
  const blockers = open.filter((task) => task.blocked);
  const nextDelivery = open
    .filter((task) => task.dueKind !== "late")
    .map((task, index) => ({ task, index }))
    .sort((a, b) => DUE_RANK[a.task.dueKind] - DUE_RANK[b.task.dueKind] || a.index - b.index)[0]?.task;
  const progress = projects.length ? Math.round(projects.reduce((sum, item) => sum + item.progress, 0) / projects.length) : 0;
  const needsAttention = overdue.length > 0 || blockers.length > 0 || client.status === "en-riesgo";
  return {
    projects,
    openTasks: open.length,
    overdue,
    blockers,
    approvals: open.filter((task) => task.status === "En aprobación").length,
    nextDelivery,
    alerts: clientAttention(client.slug, tasks).filter((item) => item.tone !== "info").slice(0, 3),
    progress,
    needsAttention,
    attentionScore: overdue.length * 3 + blockers.length * 2 + STATUS_WEIGHT[client.status],
  };
}

export function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}
