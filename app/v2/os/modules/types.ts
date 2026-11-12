/* Avans OS · modelo de objetos de trabajo por módulo de servicio.
 * Cada registro vive en una colección local por cliente y módulo:
 *   avans-os:preview:v1:client:<slug>:module:<serviceId>:<collection>
 * Es persistencia de vista previa (este navegador). No hay sincronización
 * multiusuario ni permisos de servidor: ver docs/MODULES_REPORTS_TASKS.md. */
import type { ServiceId } from "../os-data";

export type RecordSource = "manual" | "demo" | "integration";
export type RecordHistoryEntry = { at: string; user: string; text: string };

export type ModuleRecord = {
  id: string;
  client: string;
  module: ServiceId;
  collection: string;
  /** Usuario que creó o modificó por última vez el registro (CURRENT_USER en la preview). */
  user: string;
  source: RecordSource;
  createdAt: string;
  updatedAt: string;
  history: RecordHistoryEntry[];
  /** Valores del formulario. Los números se guardan como texto y se interpretan al leer. */
  values: Record<string, string>;
};

export type FieldType = "text" | "textarea" | "select" | "date" | "number" | "person" | "ref";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  options?: readonly string[];
  /** Para type "ref": colección del mismo módulo a la que apunta (guarda el id). */
  ref?: string;
  required?: boolean;
  /** Se muestra como columna en la tabla del listado. */
  list?: boolean;
  placeholder?: string;
  hint?: string;
};

export type CollectionDef = {
  id: string;
  label: string;
  singular: string;
  /** Prefijo de los ids creados manualmente. */
  prefix: string;
  description: string;
  fields: FieldDef[];
  titleKey: string;
  statusKey?: string;
  ownerKey?: string;
  dateKey?: string;
  /** Valores de estado que conectan el objeto con la bandeja de aprobaciones del módulo. */
  approval?: { pending: string; approved: string; changes: string };
  /** Permite crear tareas vinculadas (workItem) desde el detalle del registro. */
  linkTasks?: boolean;
  empty: string;
};

export type DemoSeed = Record<string, string> & { id: string };
