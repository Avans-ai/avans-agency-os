"use client";

/* Recomendaciones por módulo.
 * - Manuales: se conservan en la clave que ya usaba la versión anterior
 *   (`client:<slug>:service:<serviceId>:recommendations`), sin migrar ni borrar nada.
 * - Demo: serviceRecommendations (service-workspace-data.ts), rotuladas como demostración.
 * - Cambios de estado/prioridad sobre cualquiera de ellas: `...:recommendation-status`.
 * - Asistidas por IA: no hay proveedor conectado; la interfaz lo dice y no genera nada. */
import { useMemo } from "react";
import { readLocalJson, writeLocalJson } from "../local-persistence";
import { CURRENT_USER, type ServiceId } from "../os-data";
import { recommendationsForClient, type RecommendationStatus, type ServiceRecommendation } from "../service-workspace-data";
import { readLocalValue, useLocalKeys } from "./store";

export type RecommendationPriority = ServiceRecommendation["priority"];
export type StoredRecommendation = ServiceRecommendation & { user?: string; updatedAt?: string; history?: { at: string; user: string; text: string }[] };
export type RecommendationOverride = { status?: RecommendationStatus; priority?: RecommendationPriority; updatedAt: string; user: string; history: { at: string; user: string; text: string }[] };
export type MergedRecommendation = StoredRecommendation & { origin: "manual" | "demo"; history: { at: string; user: string; text: string }[] };

export const RECOMMENDATION_STATUSES: RecommendationStatus[] = ["Nueva", "En evaluación", "Priorizada", "Descartada"];

export function manualRecommendationsKey(clientSlug: string, serviceId: ServiceId) {
  return `client:${clientSlug}:service:${serviceId}:recommendations`;
}
export function recommendationStatusKey(clientSlug: string, serviceId: ServiceId) {
  return `client:${clientSlug}:service:${serviceId}:recommendation-status`;
}

/** Lee manuales + overrides de varios módulos (p. ej. el centro consolidado de Estrategia o los reportes). */
export function useRecommendations(clientSlug: string, serviceIds: ServiceId[]) {
  const ids = serviceIds.join("|");
  const keys = useMemo(() => ids.split("|").filter(Boolean).flatMap((id) => [manualRecommendationsKey(clientSlug, id as ServiceId), recommendationStatusKey(clientSlug, id as ServiceId)]), [clientSlug, ids]);
  const { raws, hydrated } = useLocalKeys(keys);
  const items = useMemo<MergedRecommendation[]>(() => {
    const services = ids.split("|").filter(Boolean) as ServiceId[];
    return services.flatMap((serviceId, index) => {
      const manual = readLocalValue<StoredRecommendation[]>(raws[index * 2] ?? "", []);
      const overrides = readLocalValue<Record<string, RecommendationOverride>>(raws[index * 2 + 1] ?? "", {});
      const demo = recommendationsForClient(clientSlug, serviceId);
      const merged: MergedRecommendation[] = [
        ...(Array.isArray(manual) ? manual : []).filter((item) => item.serviceId === serviceId).map((item) => ({ ...item, origin: "manual" as const, history: item.history ?? [] })),
        ...demo.map((item) => ({ ...item, origin: "demo" as const, history: [] })),
      ];
      return merged.map((item) => {
        const override = overrides[item.id];
        return override ? { ...item, status: override.status ?? item.status, priority: override.priority ?? item.priority, history: [...override.history, ...item.history] } : item;
      });
    });
  }, [clientSlug, ids, raws]);
  return { items, hydrated };
}

export function addManualRecommendation(clientSlug: string, serviceId: ServiceId, input: { title: string; rationale: string; priority: RecommendationPriority; source: ServiceRecommendation["source"] }) {
  const stored = readLocalJson<StoredRecommendation[]>(manualRecommendationsKey(clientSlug, serviceId), []);
  const current = Array.isArray(stored) ? stored : [];
  const at = new Date().toISOString();
  const record: StoredRecommendation = {
    id: `MAN-${Date.now().toString(36).toUpperCase()}`,
    clientSlug,
    serviceId,
    title: input.title,
    rationale: input.rationale || "Sin fundamento cargado.",
    source: input.source,
    priority: input.priority,
    status: "Nueva",
    user: CURRENT_USER.name,
    updatedAt: at,
    history: [{ at, user: CURRENT_USER.name, text: "Creó la recomendación (manual)" }],
  };
  return writeLocalJson(manualRecommendationsKey(clientSlug, serviceId), [record, ...current]);
}

export function readManual(raw: string) {
  const value = readLocalValue<StoredRecommendation[]>(raw, []);
  return Array.isArray(value) ? value : [];
}

export function setRecommendationState(clientSlug: string, serviceId: ServiceId, id: string, patch: { status?: RecommendationStatus; priority?: RecommendationPriority }) {
  const currentOverrides = readLocalJson<Record<string, RecommendationOverride>>(recommendationStatusKey(clientSlug, serviceId), {});
  const at = new Date().toISOString();
  const previous = currentOverrides[id];
  const text = patch.status ? `Cambió el estado a ${patch.status}` : `Cambió la prioridad a ${patch.priority}`;
  const next: Record<string, RecommendationOverride> = {
    ...currentOverrides,
    [id]: { status: patch.status ?? previous?.status, priority: patch.priority ?? previous?.priority, updatedAt: at, user: CURRENT_USER.name, history: [{ at, user: CURRENT_USER.name, text }, ...(previous?.history ?? [])] },
  };
  return writeLocalJson(recommendationStatusKey(clientSlug, serviceId), next);
}
