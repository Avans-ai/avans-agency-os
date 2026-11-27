/* Entrada única de las métricas: tareas del cliente + colecciones de cada módulo.
 * El Inicio y los Reportes leen exactamente las mismas colecciones; el reporte guarda
 * esta entrada (proyectada) junto con su instantánea para poder reproducirla. */
import { serviceForTask } from "../director-data";
import type { OsTask, ServiceId } from "../os-data";
import type { JornadaQuota } from "../modules/av-model";
import type { ModuleRecord } from "../modules/types";

/** Colecciones que alimentan las métricas de cada servicio. */
export const METRIC_COLLECTIONS: Record<ServiceId, string[]> = {
  estrategia: ["prioridades", "reuniones", "decisiones", "riesgos"],
  "diseno-marca": ["trabajos", "biblioteca"],
  "publicidad-digital": ["campanas", "anuncios", "optimizaciones"],
  contenidos: ["piezas", "planes", "ejes"],
  audiovisuales: ["jornadas"],
  "desarrollo-web": ["proyectos", "sitemap", "qa", "publicaciones"],
  crm: ["trabajos"],
  "ia-automatizaciones": ["trabajos"],
  "soluciones-graficas": ["trabajos"],
  "mercado-libre": ["trabajos"],
};

export type TaskLite = Pick<OsTask, "id" | "title" | "status" | "blocked" | "blockedSince" | "dueKind" | "due" | "owner" | "approver" | "serviceId" | "projectSlug" | "clientSlug" | "archivedAt" | "completedAt" | "prio"> & {
  workflowKind?: string;
  workflowHref?: string;
  workItemId?: string;
};

export type MetricsInput = {
  clientSlug: string;
  tasks: TaskLite[];
  records: Partial<Record<ServiceId, Record<string, ModuleRecord[]>>>;
  quota: JornadaQuota | null;
};

export function taskLite(task: OsTask): TaskLite {
  return {
    id: task.id, title: task.title, status: task.status, blocked: task.blocked, blockedSince: task.blockedSince, dueKind: task.dueKind, due: task.due,
    owner: task.owner, approver: task.approver, serviceId: task.serviceId ?? serviceForTask(task), projectSlug: task.projectSlug, clientSlug: task.clientSlug,
    archivedAt: task.archivedAt, completedAt: task.completedAt, prio: task.prio,
    workflowKind: task.workflow?.kind, workflowHref: task.workflow?.href, workItemId: task.workItem?.id,
  };
}

/* Campos de texto largo que ninguna métrica usa (historiales, comentarios, copys).
 * Se quitan de la entrada guardada con el reporte para que la instantánea no pese. */
const HEAVY_KEY = /(Comments|Transitions|Changes|Approvals|History|Snapshot|Checks)$|^(brief|copy|guion|planRodaje|descripcion|referencias|materiales|recursos|insight|respuesta|propuesta|rtb|acuerdos|proximosPasos|mitigacion|alcance|criterio|cambios|evidencia|objetivos|tematicas|feedback|clientSnapshot|guidelineChecks|plazosNotas|notas)$/;

export function stripRecord(record: ModuleRecord): ModuleRecord {
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(record.values)) if (!HEAVY_KEY.test(key)) values[key] = value;
  return { ...record, history: [], values };
}

/** Entrada mínima de los servicios incluidos: es la que se guarda con la versión del reporte. */
export function projectInput(input: MetricsInput, services: ServiceId[]): MetricsInput {
  const wanted = new Set(services);
  const records: MetricsInput["records"] = {};
  const keep = (list: ModuleRecord[]) => list.filter((record) => record.client === input.clientSlug).map(stripRecord);
  for (const serviceId of services) {
    const collections = input.records[serviceId] ?? {};
    records[serviceId] = Object.fromEntries(Object.entries(collections).map(([collection, list]) => [collection, keep(list)]));
  }
  // La etapa de un pedido de Diseño nacido en Contenidos depende del estado de su contenido.
  if (wanted.has("diseno-marca") && !wanted.has("contenidos")) records.contenidos = { piezas: keep(input.records.contenidos?.piezas ?? []) };
  return {
    clientSlug: input.clientSlug,
    tasks: input.tasks.filter((task) => wanted.has(task.serviceId ?? serviceForTask(task))),
    records,
    quota: wanted.has("audiovisuales") ? input.quota : null,
  };
}

export function recordsOf(input: MetricsInput, serviceId: ServiceId, collection: string): ModuleRecord[] {
  return (input.records[serviceId]?.[collection] ?? []).filter((record) => record.client === input.clientSlug);
}
