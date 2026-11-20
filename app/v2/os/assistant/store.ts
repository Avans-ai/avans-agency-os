"use client";

/* Trazabilidad de sugerencias del asistente (persistencia de la preview).
 * Clave nueva por cliente y módulo, sin tocar claves existentes:
 *   avans-os:preview:v1:client:<slug>:assistant:<serviceId>
 * Cada sugerencia guarda cliente, módulo, acción, usuario, fecha, origen,
 * proveedor y modelo (si hubo IA real), estado, campos aplicados, cambios
 * realizados y la relación con el registro creado. Local a este navegador:
 * no hay sincronización multiusuario. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { readLocalJson, useLocalStorageState, writeLocalJson } from "../local-persistence";
import { CURRENT_USER, type ServiceId } from "../os-data";
import type { AssistantStatus, CreativeSuggestion } from "./types";

export type SuggestionOrigin = "ia" | "recomendacion";
export type SuggestionStatus = "suggested" | "applied" | "dismissed";
export type SuggestionChange = { field: string; before: string; after: string };
export type StoredSuggestion = CreativeSuggestion & {
  clientSlug: string;
  serviceId: ServiceId;
  profileId: string;
  operation: string;
  origin: SuggestionOrigin;
  /** Para recomendaciones: id de la recomendación o hallazgo de origen. */
  recommendationId?: string;
  recommendationSource?: string;
  provider?: string;
  model?: string;
  user: string;
  createdAt: string;
  updatedAt: string;
  status: SuggestionStatus;
  appliedFields: string[];
  changes: SuggestionChange[];
  /** Registro creado a partir de la sugerencia (campaña, pieza, proyecto…). */
  linkedRecordId?: string;
  history: { at: string; user: string; text: string }[];
};
export type SuggestionLog = { version: 1; clientSlug: string; items: StoredSuggestion[] };

export function suggestionsKey(clientSlug: string, serviceId: ServiceId) {
  return `client:${clientSlug}:assistant:${serviceId}`;
}

const MAX_KEPT = 200;

export function useSuggestionLog(clientSlug: string, serviceId: ServiceId) {
  const key = suggestionsKey(clientSlug, serviceId);
  const empty = useMemo<SuggestionLog>(() => ({ version: 1, clientSlug, items: [] }), [clientSlug]);
  const [stored, , hydrated] = useLocalStorageState<SuggestionLog>(key, empty);
  const log = stored?.version === 1 && stored.clientSlug === clientSlug && Array.isArray(stored.items) ? stored : empty;

  /** Escritura sobre el valor actual guardado (evita pisar cambios de otra pestaña). */
  const write = useCallback(
    (update: (items: StoredSuggestion[]) => StoredSuggestion[]) => {
      const current = readLocalJson<SuggestionLog>(key, empty);
      const items = current?.version === 1 && current.clientSlug === clientSlug && Array.isArray(current.items) ? current.items : [];
      return writeLocalJson<SuggestionLog>(key, { version: 1, clientSlug, items: update(items).slice(0, MAX_KEPT) });
    },
    [clientSlug, empty, key],
  );

  const upsert = useCallback(
    (item: StoredSuggestion, text: string) => {
      const at = new Date().toISOString();
      return write((items) => {
        const previous = items.find((entry) => entry.id === item.id);
        const next: StoredSuggestion = { ...item, updatedAt: at, history: [{ at, user: CURRENT_USER.name, text }, ...(previous?.history ?? item.history ?? [])] };
        return previous ? items.map((entry) => (entry.id === item.id ? next : entry)) : [next, ...items];
      });
    },
    [write],
  );

  return { items: log.items, hydrated, upsert, write };
}

let statusCache: Promise<AssistantStatus> | null = null;
/** Estado del proveedor, consultado al servidor (nunca se exponen claves). */
export function useAssistantStatus() {
  const [state, setState] = useState<{ status: AssistantStatus | null; error: boolean }>({ status: null, error: false });
  useEffect(() => {
    let alive = true;
    statusCache ??= fetch("/api/assistant/status", { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json() as Promise<AssistantStatus>;
    });
    statusCache
      .then((status) => alive && setState({ status, error: false }))
      .catch(() => {
        statusCache = null;
        if (alive) setState({ status: null, error: true });
      });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
