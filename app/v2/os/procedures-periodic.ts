/* Procedimientos periódicos del manual (DEMOSTRACIÓN).
 * Hasta que se cargue el manual oficial de Avans, cada módulo activo trae un set
 * mínimo de procedimientos con frecuencia, rol responsable y día de vencimiento.
 * La generación es pura e idempotente: el id de la tarea incluye el cliente, el
 * procedimiento y el período, así que generar dos veces no duplica nada.
 * No lee React ni localStorage: se prueba en dominio. */
import { osProjects, type OsClient, type OsTask, type Priority, type ServiceId } from "./os-data";
import { serviceForProject } from "./director-data";
import { dueKindForDate, workflowNotification, type WorkflowNotification } from "./workflow-tasks";

export const PROCEDURES_DEMO_LABEL = "Procedimientos de demostración";
export const PROCEDURES_DEMO_NOTE = "Se reemplazan por los procedimientos del manual oficial de Avans cuando se cargue. Hoy sirven para probar la generación automática.";

export type ProcedureRole = "pm" | "content" | "technical" | "designer";
export const PROCEDURE_ROLE_LABEL: Record<ProcedureRole, string> = { pm: "PM", content: "Content", technical: "Líder técnico", designer: "Diseño" };
export type ProcedureFrequency = "semanal" | "mensual";

export type PeriodicProcedure = {
  id: string;
  serviceId: ServiceId;
  title: string;
  frequency: ProcedureFrequency;
  ownerRole: ProcedureRole;
  /** Semanal: día de la semana (1 = lunes … 5 = viernes). Mensual: día del mes. */
  day: number;
  prio: Priority;
  detail: string;
};

export const PERIODIC_PROCEDURES: PeriodicProcedure[] = [
  { id: "estrategia-reporte-semanal", serviceId: "estrategia", title: "Revisar el reporte semanal antes de enviarlo", frequency: "semanal", ownerRole: "pm", day: 5, prio: "Media", detail: "Revisar el resumen y la parte de Estrategia del reporte semanal, confirmar que cada responsable revisó su parte y prepararlo para el cliente." },
  { id: "estrategia-reporte-mensual", serviceId: "estrategia", title: "Preparar la devolución mensual de resultados", frequency: "mensual", ownerRole: "pm", day: 5, prio: "Alta", detail: "Consolidar objetivos, resultados por módulo y próximos pasos del mes en el reporte mensual." },
  { id: "contenidos-plan-mensual", serviceId: "contenidos", title: "Armar el plan de contenidos del mes siguiente", frequency: "mensual", ownerRole: "content", day: 20, prio: "Alta", detail: "Definir ejes, cantidad, canales, formatos y fechas del próximo mes a partir del Plan de Marketing." },
  { id: "contenidos-reporte-mensual", serviceId: "contenidos", title: "Completar la parte de Contenidos del reporte mensual", frequency: "mensual", ownerRole: "content", day: 5, prio: "Media", detail: "Publicaciones con mejor rendimiento, evolución de seguidores y aprendizajes del mes." },
  { id: "publicidad-revision-semanal", serviceId: "publicidad-digital", title: "Revisar KPIs de pauta de la semana", frequency: "semanal", ownerRole: "technical", day: 4, prio: "Media", detail: "Leer gasto por canal, costo por resultado y alertas; completar la parte de Publicidad digital del reporte semanal." },
  { id: "publicidad-reporte-mensual", serviceId: "publicidad-digital", title: "Cerrar resultados mensuales de pauta", frequency: "mensual", ownerRole: "technical", day: 5, prio: "Media", detail: "Inversión, resultados y aprendizajes por campaña para el reporte mensual." },
  { id: "diseno-biblioteca-mensual", serviceId: "diseno-marca", title: "Actualizar la biblioteca de piezas del mes", frequency: "mensual", ownerRole: "designer", day: 28, prio: "Baja", detail: "Subir las versiones finales aprobadas y archivar las descartadas." },
  { id: "web-control-mensual", serviceId: "desarrollo-web", title: "Control mensual del sitio", frequency: "mensual", ownerRole: "technical", day: 10, prio: "Media", detail: "Formularios, velocidad, enlaces rotos y copias de seguridad." },
  { id: "audiovisuales-jornadas-mensual", serviceId: "audiovisuales", title: "Confirmar las jornadas audiovisuales del mes", frequency: "mensual", ownerRole: "content", day: 3, prio: "Media", detail: "Revisar jornadas usadas y disponibles según el alcance y agendar las próximas." },
  { id: "crm-embudo-mensual", serviceId: "crm", title: "Revisar el embudo del CRM y la calidad de los leads", frequency: "mensual", ownerRole: "technical", day: 12, prio: "Media", detail: "Etapas, conversiones y leads sin seguimiento." },
];

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_LONG = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const pad = (value: number) => String(value).padStart(2, "0");

export function isoToday(at: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(at));
}
function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function isoWeek(iso: string) {
  const date = new Date(`${iso}T12:00:00Z`);
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day + 3);
  const year = date.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4, 12));
  const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return { year, week };
}
/** «27 nov» a partir de AAAA-MM-DD. */
export function shortIsoDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
}

export type Occurrence = { period: string; periodLabel: string; due: string };

/** Próxima ocurrencia con vencimiento hoy o más adelante (nunca una ya vencida). */
export function nextOccurrence(procedure: PeriodicProcedure, at: string): Occurrence {
  const today = isoToday(at);
  if (procedure.frequency === "semanal") {
    const weekday = ((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
    let due = addDays(today, procedure.day - weekday);
    if (due < today) due = addDays(due, 7);
    const { year, week } = isoWeek(due);
    return { period: `${year}-W${pad(week)}`, periodLabel: `semana ${week}`, due };
  }
  let year = Number(today.slice(0, 4));
  let month = Number(today.slice(5, 7));
  const dueIn = (y: number, m: number) => `${y}-${pad(m)}-${pad(Math.min(procedure.day, new Date(Date.UTC(y, m, 0)).getUTCDate()))}`;
  let due = dueIn(year, month);
  if (due < today) {
    month += 1;
    if (month > 12) { month = 1; year += 1; }
    due = dueIn(year, month);
  }
  return { period: `${year}-${pad(month)}`, periodLabel: `${MONTHS_LONG[month - 1]} ${year}`, due };
}

/** Persona del equipo del cliente que cumple el rol del procedimiento. Sin match, el responsable de la cuenta. */
export function procedureOwner(client: OsClient, role: ProcedureRole) {
  const find = (pattern: RegExp) => client.team.find((person) => pattern.test(person.role))?.name;
  if (role === "pm") return client.owner;
  if (role === "content") return find(/Contenido/) ?? client.owner;
  if (role === "designer") return find(/Diseño/) ?? client.owner;
  return find(/Paid media|Performance|Desarrollo|Integraciones/) ?? client.owner;
}

export function proceduresFor(services: ServiceId[]) {
  return PERIODIC_PROCEDURES.filter((procedure) => services.includes(procedure.serviceId));
}

export function procedureTaskId(clientSlug: string, procedureId: string, period: string) {
  return `PROC-${clientSlug}-${procedureId}-${period}`;
}

export type ProcedureRow = { procedure: PeriodicProcedure; owner: string; occurrence: Occurrence; taskId: string; task?: OsTask };

/** Estado de cada procedimiento activo: próxima ocurrencia y si su tarea ya existe. */
export function procedureRows(client: OsClient, services: ServiceId[], tasks: OsTask[], at: string): ProcedureRow[] {
  return proceduresFor(services).map((procedure) => {
    const occurrence = nextOccurrence(procedure, at);
    const taskId = procedureTaskId(client.slug, procedure.id, occurrence.period);
    return { procedure, owner: procedureOwner(client, procedure.ownerRole), occurrence, taskId, task: tasks.find((task) => task.id === taskId) };
  });
}

function projectFor(client: OsClient, serviceId: ServiceId) {
  const own = osProjects.filter((project) => project.clientSlug === client.slug);
  return own.find((project) => serviceForProject(project.slug) === serviceId)?.slug ?? own[0]?.slug ?? "";
}

export function buildProcedureTask(client: OsClient, row: ProcedureRow, actor: string, at: string): OsTask {
  const { procedure, occurrence } = row;
  return {
    id: row.taskId,
    clientSlug: client.slug,
    projectSlug: projectFor(client, procedure.serviceId),
    serviceId: procedure.serviceId,
    workItem: { collection: "procedimientos", id: procedure.id, label: `Procedimiento ${procedure.frequency} · ${occurrence.periodLabel}` },
    title: `${procedure.title} · ${occurrence.periodLabel}`,
    owner: row.owner,
    prio: procedure.prio,
    due: occurrence.due,
    dueKind: dueKindForDate(occurrence.due, at),
    status: "Por hacer",
    desc: `${procedure.detail}\n\nProcedimiento periódico (${procedure.frequency}, responsable ${PROCEDURE_ROLE_LABEL[procedure.ownerRole]}). ${PROCEDURES_DEMO_LABEL}: ${PROCEDURES_DEMO_NOTE}`,
    files: [],
    comments: [],
    activity: [{ text: `${actor} generó la tarea periódica (${occurrence.period})`, when: at }],
  };
}

/** Genera la próxima ocurrencia de cada procedimiento activo que todavía no tiene tarea.
 * Idempotente: una tarea por procedimiento y período, aunque se ejecute varias veces. */
export function generatePeriodicTasks(client: OsClient, services: ServiceId[], tasks: OsTask[], actor: string, at: string) {
  const created = procedureRows(client, services, tasks, at).filter((row) => !row.task).map((row) => buildProcedureTask(client, row, actor, at));
  const notifications: WorkflowNotification[] = created.map((task) => workflowNotification(task, `PROC-${task.id}`, at, "assignment"));
  return { tasks: [...tasks, ...created], created, notifications };
}

export function isProcedureTask(task: Pick<OsTask, "id" | "workItem">) {
  return task.id.startsWith("PROC-") && task.workItem?.collection === "procedimientos";
}

/** Clave comparable para vencimientos con formatos mixtos («30 oct», «Mié 4 nov», AAAA-MM-DD, «Sin fecha»). */
export function dueSortKey(due: string) {
  if (/^\d{4}-\d{2}-\d{2}/.test(due)) return due.slice(0, 10);
  const match = due.toLocaleLowerCase("es").match(/(\d{1,2})\s+([a-zé]{3})/);
  const month = match ? MONTHS.indexOf(match[2]) : -1;
  return match && month >= 0 ? `2026-${String(month + 1).padStart(2, "0")}-${match[1].padStart(2, "0")}` : "9999-12-31";
}
