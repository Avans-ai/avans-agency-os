"use client";

/* Catálogo de proveedores · persistencia local (este navegador) e identidad de vista previa
 * del rol «Proveedor externo». No hay cuentas reales de proveedores ni seguridad de servidor. */
import { useCallback, useMemo } from "react";
import { readLocalJson, useLocalStorageState } from "./local-persistence";
import { osClients } from "./os-data";
import type { PreviewRole } from "./preview-roles";
import { DEMO_PROVIDERS, demoCatalog, normalizeCatalog, PROVIDER_IDENTITY_KEY, PROVIDERS_KEY, type ProviderCatalog } from "./providers-catalog";
import { jornadaKey } from "./modules/av-model";
import { seedRecords } from "./modules/store";
import type { ModuleRecord } from "./modules/types";

const DEMO = demoCatalog();

export function useProviderCatalog() {
  const [stored, setStored, hydrated] = useLocalStorageState<unknown>(PROVIDERS_KEY, DEMO);
  const catalog = useMemo(() => normalizeCatalog(stored), [stored]);
  const save = useCallback((next: ProviderCatalog) => setStored(next), [setStored]);
  return { catalog, providers: catalog.providers, save, hydrated };
}

/** Lo carga la responsable de Personas y Cultura. En la vista previa: rol Administrador. */
export function canManageProviders(role: PreviewRole) {
  return role === "admin";
}

/** Proveedor con el que se previsualiza el rol «Proveedor externo». */
export function useProviderIdentity() {
  const [id, setId] = useLocalStorageState<string>(PROVIDER_IDENTITY_KEY, DEMO_PROVIDERS[0].id);
  return [id, setId] as const;
}

/** Jornadas asignadas a un proveedor en todas las cuentas guardadas en este navegador. */
export function assignedJornadasCount(providerId: string) {
  return osClients.reduce((total, client) => total + readLocalJson<ModuleRecord[]>(jornadaKey(client.slug), seedRecords(client.slug, "audiovisuales", "jornadas"))
    .filter((record) => record.client === client.slug && record.values.proveedorId === providerId).length, 0);
}
