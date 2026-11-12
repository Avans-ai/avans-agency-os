"use client";

/* Persistencia local de los objetos de cada módulo.
 * Usa el mismo sobre { version: 1, value, savedAt } y el mismo prefijo que
 * local-persistence.ts (writeLocalJson), así que convive con el resto de la
 * preview. Lee varias claves con un único useSyncExternalStore para que una
 * vista pueda combinar colecciones (p. ej. optimizaciones + campañas). */
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { writeLocalJson } from "../local-persistence";
import { CURRENT_USER, type ServiceId } from "../os-data";
import { collectionDef } from "./collections";
import { DEMO_SEED_DATE, demoSeedsFor } from "./demo-fixtures";
import type { CollectionDef, ModuleRecord, RecordHistoryEntry } from "./types";

/* Deben coincidir con local-persistence.ts (no se exportan desde allí). */
const PREFIX = "avans-os:preview:v1";
const LOCAL_EVENT = "avans-os-local-storage";
const SERVER = "__server__";
const SEP = "\u001f";

export function moduleKey(clientSlug: string, serviceId: ServiceId, collection: string) {
  return `client:${clientSlug}:module:${serviceId}:${collection}`;
}

export function seedRecords(clientSlug: string, serviceId: ServiceId, collection: string): ModuleRecord[] {
  return demoSeedsFor(clientSlug, serviceId, collection).map(({ id, ...values }) => ({
    id,
    client: clientSlug,
    module: serviceId,
    collection,
    user: CURRENT_USER.name,
    source: "demo",
    createdAt: DEMO_SEED_DATE,
    updatedAt: DEMO_SEED_DATE,
    history: [{ at: DEMO_SEED_DATE, user: "Sistema", text: "Precargado como dato de demostración" }],
    values,
  }));
}

function readRaw(key: string) {
  try {
    return window.localStorage.getItem(`${PREFIX}:${key}`) ?? "";
  } catch {
    return "";
  }
}

function parseEnvelope<T>(raw: string): T | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { version?: number; value?: T };
    return parsed.version === 1 ? parsed.value : undefined;
  } catch {
    return undefined;
  }
}

/** Lee varias claves locales a la vez y se actualiza con cambios de esta pestaña y de otras. */
export function useLocalKeys(keys: string[]) {
  const signature = keys.join(SEP);
  const subscribe = useCallback((onChange: () => void) => {
    const watched = new Set(signature.split(SEP));
    function onStorage(event: StorageEvent) {
      if (event.key === null || [...watched].some((key) => event.key === `${PREFIX}:${key}`)) onChange();
    }
    function onLocal(event: Event) {
      const detail = (event as CustomEvent<{ key: string }>).detail;
      if (detail && watched.has(detail.key)) onChange();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(LOCAL_EVENT, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LOCAL_EVENT, onLocal);
    };
  }, [signature]);
  const getSnapshot = useCallback(() => signature.split(SEP).map(readRaw).join(SEP), [signature]);
  const getServerSnapshot = useCallback(() => SERVER, []);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = snapshot !== SERVER;
  const raws = useMemo(() => (hydrated ? snapshot.split(SEP) : signature.split(SEP).map(() => "")), [hydrated, signature, snapshot]);
  return { raws, hydrated };
}

export function readLocalValue<T>(raw: string, fallback: T): T {
  const value = parseEnvelope<T>(raw);
  return value === undefined ? fallback : value;
}

function now() {
  return new Date().toISOString();
}

export function historyEntry(text: string): RecordHistoryEntry {
  return { at: now(), user: CURRENT_USER.name, text };
}

export type ModuleData = Record<string, ModuleRecord[]>;

/** Colecciones de un cliente y módulo, con altas y ediciones guardadas en este navegador. */
export function useModuleRecords(clientSlug: string, serviceId: ServiceId, collections: string[]) {
  const ids = collections.join("|");
  const keys = useMemo(() => ids.split("|").filter(Boolean).map((id) => moduleKey(clientSlug, serviceId, id)), [clientSlug, ids, serviceId]);
  const { raws, hydrated } = useLocalKeys(keys);
  const data = useMemo<ModuleData>(() => {
    const result: ModuleData = {};
    ids.split("|").filter(Boolean).forEach((id, index) => {
      const stored = readLocalValue<ModuleRecord[] | null>(raws[index] ?? "", null);
      result[id] = Array.isArray(stored) ? stored : seedRecords(clientSlug, serviceId, id);
    });
    return result;
  }, [clientSlug, ids, raws, serviceId]);

  const current = useCallback((collection: string) => {
    const stored = readLocalValue<ModuleRecord[] | null>(readRaw(moduleKey(clientSlug, serviceId, collection)), null);
    return Array.isArray(stored) ? stored : seedRecords(clientSlug, serviceId, collection);
  }, [clientSlug, serviceId]);

  const create = useCallback((def: CollectionDef, values: Record<string, string>, note?: string) => {
    const at = now();
    const id = `${def.prefix}-${Date.now().toString(36).toUpperCase()}`;
    const record: ModuleRecord = {
      id,
      client: clientSlug,
      module: serviceId,
      collection: def.id,
      user: CURRENT_USER.name,
      source: "manual",
      createdAt: at,
      updatedAt: at,
      history: [...(note ? [{ at, user: CURRENT_USER.name, text: note }] : []), { at, user: CURRENT_USER.name, text: `Creó ${def.singular}` }],
      values,
    };
    const ok = writeLocalJson(moduleKey(clientSlug, serviceId, def.id), [record, ...current(def.id)]);
    return ok ? record : null;
  }, [clientSlug, current, serviceId]);

  const update = useCallback((collection: string, id: string, patch: Record<string, string>, text: string) => {
    const at = now();
    const next = current(collection).map((record) => record.id === id ? {
      ...record,
      user: CURRENT_USER.name,
      updatedAt: at,
      values: { ...record.values, ...patch },
      history: [{ at, user: CURRENT_USER.name, text }, ...record.history],
    } : record);
    return writeLocalJson(moduleKey(clientSlug, serviceId, collection), next);
  }, [clientSlug, current, serviceId]);

  return { data, hydrated, create, update };
}

export function recordTitle(record: ModuleRecord, serviceId: ServiceId) {
  const def = collectionDef(serviceId, record.collection);
  return (def ? record.values[def.titleKey] : undefined) || record.id;
}

/** Diferencias legibles entre dos versiones de valores, para el historial. */
export function describeChanges(def: CollectionDef, before: Record<string, string>, after: Record<string, string>) {
  const changed = def.fields.filter((field) => (before[field.key] ?? "") !== (after[field.key] ?? ""));
  if (!changed.length) return "";
  return `Editó ${changed.map((field) => field.label.toLowerCase()).join(", ")}`;
}
