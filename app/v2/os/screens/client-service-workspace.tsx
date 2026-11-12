"use client";

/* Compatibilidad: el espacio de cada servicio ahora vive en app/v2/os/modules.
 * Se eliminó el bloque genérico «Flujo del servicio»: cada módulo muestra sus
 * propios objetos de trabajo, tareas (Kanban), entregables, recomendaciones e historial. */
import type { OsClient } from "../os-data";
import type { ServiceWorkspaceConfig } from "../service-workspace-data";
import { ModuleWorkspace } from "../modules/module-workspace";

export function ClientServiceWorkspace({ client, service }: { client: OsClient; service: ServiceWorkspaceConfig }) {
  return <ModuleWorkspace client={client} service={service} />;
}
