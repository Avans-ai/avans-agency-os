"use client";

/* Service modules of a client: which Avans services are active, whether each
 * one is contracted or only a demonstration, its scope, start date, leader and
 * history. Preview persistence: one localStorage key per client
 * (`avans-os:preview:v1:client:<slug>:service-modules`). Active ids remain in
 * the workspace store (`servicesOf`), which navigation, Plan and modules read.
 * Deactivating a module never deletes its data or history. */
import { useCallback, useMemo } from "react";
import { isAssignedClient } from "./director-data";
import { planBlueprints } from "./knowledge/blueprints";
import { CURRENT_USER, serviceCatalog, type OsClient, type ServiceId } from "./os-data";
import { useLocalStorageState } from "./local-persistence";
import type { PreviewRole } from "./os-store";

export type ModuleKind = "contracted" | "demo";
export type ModuleHistoryEntry = { at: string; actor: string; action: string };
export type ServiceModuleConfig = {
  serviceId: ServiceId;
  active: boolean;
  kind: ModuleKind;
  scope: string;
  startDate: string;
  leader: string;
  history: ModuleHistoryEntry[];
  updatedAt: string;
  updatedBy: string;
};
export type ServiceModuleState = { version: 1; clientSlug: string; modules: Partial<Record<ServiceId, ServiceModuleConfig>> };

export const SERVICE_DESCRIPTIONS: Record<ServiceId, string> = {
  estrategia: "Coordina prioridades, decisiones, reuniones y recomendaciones de todos los servicios activos de la cuenta.",
  "diseno-marca": "Identidad visual, look & feel, sistema de diseño y piezas de marca con versiones y aprobaciones.",
  "publicidad-digital": "Plan de medios, campañas, inversión por canal, optimización y resultados de la pauta.",
  contenidos: "Ejes temáticos, calendario editorial, producción, aprobación, publicación y aprendizajes.",
  audiovisuales: "Guiones, preproducción, rodajes, edición, versiones y entregas audiovisuales.",
  "desarrollo-web": "Sitio y landings: alcance, sitemap, diseño, desarrollo, QA, publicación y mantenimiento.",
  crm: "Embudo comercial, integraciones, automatizaciones y pruebas de operación del CRM.",
  "ia-automatizaciones": "Automatizaciones con aprobaciones, trazabilidad, límites y evidencia de ejecución.",
  "soluciones-graficas": "Pedidos, especificaciones, producción, proveedores y entrega de piezas gráficas y merchandising.",
  "mercado-libre": "Publicaciones, catálogo, pricing, campañas y reputación en Mercado Libre.",
};

/** How each module feeds or depends on the others (shown when activating). */
export const SERVICE_RELATIONS: Record<ServiceId, ServiceId[]> = {
  estrategia: ["diseno-marca", "publicidad-digital", "contenidos", "audiovisuales", "desarrollo-web"],
  "diseno-marca": ["estrategia", "contenidos", "audiovisuales", "publicidad-digital"],
  "publicidad-digital": ["estrategia", "contenidos", "desarrollo-web", "diseno-marca"],
  contenidos: ["estrategia", "audiovisuales", "publicidad-digital", "diseno-marca"],
  audiovisuales: ["contenidos", "publicidad-digital", "diseno-marca"],
  "desarrollo-web": ["publicidad-digital", "contenidos", "crm"],
  crm: ["desarrollo-web", "publicidad-digital", "ia-automatizaciones"],
  "ia-automatizaciones": ["crm", "estrategia"],
  "soluciones-graficas": ["diseno-marca"],
  "mercado-libre": ["publicidad-digital", "contenidos"],
};

/** Workspace areas prepared for every active module. */
export const MODULE_WORKSPACE_AREAS = ["Tareas y Kanban", "Entregables", "Archivos", "Recomendaciones", "Aprobaciones"];

export function planSectionsFor(serviceId: ServiceId) {
  return planBlueprints.filter((blueprint) => blueprint.service === serviceId).map((blueprint) => blueprint.label);
}

const LEADER_HINT: Partial<Record<ServiceId, RegExp>> = {
  estrategia: /estrategia|cuenta/i,
  "diseno-marca": /diseño/i,
  "publicidad-digital": /paid|performance/i,
  contenidos: /contenido/i,
  audiovisuales: /diseño|contenido/i,
  "desarrollo-web": /web|integracion/i,
  crm: /integracion|paid/i,
};

export function defaultLeader(client: OsClient, serviceId: ServiceId) {
  const hint = LEADER_HINT[serviceId];
  return (hint ? client.team.find((person) => hint.test(person.role))?.name : undefined) ?? client.owner;
}

function seed(client: OsClient, active: ServiceId[]): ServiceModuleState {
  const modules: ServiceModuleState["modules"] = {};
  for (const serviceId of active) {
    modules[serviceId] = {
      serviceId,
      active: true,
      kind: "demo",
      scope: "",
      startDate: "",
      leader: defaultLeader(client, serviceId),
      history: [],
      updatedAt: "",
      updatedBy: "",
    };
  }
  return { version: 1, clientSlug: client.slug, modules };
}

/** Admin, or the Project Manager assigned to the client. Preview roles are visual, not security. */
export function canManageModules(role: PreviewRole, clientSlug: string) {
  return role === "admin" || (role === "pm" && isAssignedClient(clientSlug));
}

export type ModuleDraft = Pick<ServiceModuleConfig, "serviceId" | "active" | "kind" | "scope" | "startDate" | "leader">;

/** Returns the configuration for every active service, completing missing entries
 * (services activated before this model existed) without overwriting stored ones. */
export function resolveModules(client: OsClient, stored: ServiceModuleState, active: ServiceId[]) {
  const base = seed(client, active).modules;
  const modules: ServiceModuleState["modules"] = {};
  for (const service of serviceCatalog) {
    const saved = stored.modules[service.id];
    const isActive = active.includes(service.id);
    if (saved) modules[service.id] = { ...saved, active: isActive };
    else if (isActive) modules[service.id] = base[service.id];
  }
  return modules;
}

export function applyModuleDrafts(
  current: ServiceModuleState["modules"],
  drafts: ModuleDraft[],
  actor = CURRENT_USER.name,
  at = new Date().toISOString(),
) {
  const next: ServiceModuleState["modules"] = { ...current };
  const changes: string[] = [];
  for (const draft of drafts) {
    const before = current[draft.serviceId];
    const label = serviceCatalog.find((service) => service.id === draft.serviceId)?.label ?? draft.serviceId;
    const actions: string[] = [];
    if (!before?.active && draft.active) actions.push(`Activado como ${draft.kind === "contracted" ? "contratado" : "demostración"}`);
    if (before?.active && !draft.active) actions.push("Desactivado (datos e historial conservados)");
    if (before && before.kind !== draft.kind && draft.active) actions.push(`Cambió a ${draft.kind === "contracted" ? "contratado" : "demostración"}`);
    if ((before?.scope ?? "") !== draft.scope && draft.active) actions.push("Alcance actualizado");
    if ((before?.startDate ?? "") !== draft.startDate && draft.active) actions.push("Fecha de inicio actualizada");
    if ((before?.leader ?? "") !== draft.leader && draft.active) actions.push(`Líder: ${draft.leader || "sin asignar"}`);
    if (!actions.length) continue;
    changes.push(`${label}: ${actions.join(", ")}`);
    next[draft.serviceId] = {
      ...(before ?? { history: [] as ModuleHistoryEntry[] }),
      ...draft,
      history: [...(before?.history ?? []), ...actions.map((action) => ({ at, actor, action }))],
      updatedAt: at,
      updatedBy: actor,
    };
  }
  return { modules: next, changes };
}

/** True when the change touches a contracted module (activation, deactivation, scope or start date). */
export function changesContract(current: ServiceModuleState["modules"], draft: ModuleDraft) {
  const before = current[draft.serviceId];
  const contracted = draft.kind === "contracted" || before?.kind === "contracted";
  if (!contracted) return false;
  return (
    !!before?.active !== draft.active ||
    (before?.kind ?? "demo") !== draft.kind ||
    (before?.scope ?? "") !== draft.scope ||
    (before?.startDate ?? "") !== draft.startDate
  );
}

export function useServiceModules(client: OsClient) {
  const empty = useMemo<ServiceModuleState>(() => ({ version: 1, clientSlug: client.slug, modules: {} }), [client.slug]);
  const [stored, setStored] = useLocalStorageState<ServiceModuleState>(`client:${client.slug}:service-modules`, empty);
  const valid = stored && stored.version === 1 && stored.clientSlug === client.slug && typeof stored.modules === "object";
  const save = useCallback(
    (modules: ServiceModuleState["modules"]) => setStored({ version: 1, clientSlug: client.slug, modules }),
    [client.slug, setStored],
  );
  return { stored: valid ? stored : empty, save, invalid: !valid };
}
