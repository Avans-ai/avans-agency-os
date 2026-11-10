"use client";
import { useMemo } from "react";
import { sourceVisible } from "./sources";
import {
  useLocalStorageState,
  readLocalJson,
  writeLocalJson,
} from "../local-persistence";
import { useOsStore } from "../os-store";
import { canEditDiscovery, discoveryActor } from "../discovery/permissions";
import { discoveryKey, type MarketingDiscovery } from "../discovery/model";
import type { OsClient } from "../os-data";
import type { ClientDocument, CompetitorSnapshot } from "../director-data";
import {
  discoveryOf,
  isKnowledge,
  knowledgeKey,
  replaceDiscovery,
  seedKnowledge,
} from "./state";
import type { KnowledgeState, MutationContext } from "./types";
export function useKnowledge(client: OsClient) {
  const { role, localHydrated, notify } = useOsStore();
  const key = knowledgeKey(client.slug);
  const [stored, , hydrated] = useLocalStorageState<unknown>(key, null);
  const [legacy] = useLocalStorageState<unknown>(
    discoveryKey(client.slug),
    null,
  );
  const [docs] = useLocalStorageState<ClientDocument[] | undefined>(
    `client:${client.slug}:documents`,
    undefined,
  );
  const [competitors] = useLocalStorageState<CompetitorSnapshot[] | undefined>(
    `client:${client.slug}:competitors`,
    undefined,
  );
  const invalid = stored !== null && !isKnowledge(stored, client.slug);
  const k = useMemo(
    () =>
      isKnowledge(stored, client.slug)
        ? stored
        : seedKnowledge(client, legacy, docs, competitors),
    [stored, client, legacy, docs, competitors],
  );
  const editable =
    hydrated && localHydrated && !invalid && canEditDiscovery(role, client);
  const context = (): MutationContext => ({
    actor: discoveryActor(role),
    at: new Date().toISOString(),
  });
  function latest() {
    const value = readLocalJson<unknown>(key, null);
    if (value === null)
      return seedKnowledge(
        client,
        readLocalJson(discoveryKey(client.slug), legacy),
        readLocalJson(`client:${client.slug}:documents`, docs),
        readLocalJson(`client:${client.slug}:competitors`, competitors),
      );
    if (!isKnowledge(value, client.slug))
      throw new Error(
        "El formato almacenado no es compatible. Se conservó sin cambios.",
      );
    return value;
  }
  function mutate(
    update: (state: KnowledgeState, ctx: MutationContext) => KnowledgeState,
    expectedRevision?: number,
  ) {
    if (!editable || !canEditDiscovery(role, client)) {
      notify(
        "Este rol no puede modificar el conocimiento del cliente.",
        "error",
      );
      return false;
    }
    try {
      const previous = latest();
      if (
        expectedRevision !== undefined &&
        previous.revision !== expectedRevision
      )
        throw new Error(
          "Los datos cambiaron en otra pestaña. Cerrá y reabrí el formulario.",
        );
      const ctx = context();
      const next = update(previous, ctx);
      if (next === previous) return true;
      if (next.clientSlug !== client.slug)
        throw new Error("Cliente incompatible");
      if (
        !writeLocalJson(key, {
          ...next,
          revision: previous.revision + 1,
          updatedAt: ctx.at,
          updatedBy: ctx.actor,
        })
      )
        throw new Error(
          "No se pudo guardar en este navegador. El formulario sigue abierto.",
        );
      notify(
        "Guardado en este navegador · Pendiente de sincronización multiusuario",
      );
      return true;
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "No se pudo guardar",
        "error",
      );
      return false;
    }
  }
  function persistDiscovery(d: MarketingDiscovery) {
    return mutate((state, ctx) =>
      replaceDiscovery(
        state,
        { ...d, updatedAt: ctx.at, updatedBy: ctx.actor },
        ctx,
      ),
    );
  }
  return {
    k,
    d: {
      ...discoveryOf(k),
      sources: discoveryOf(k).sources.filter((source) =>
        k.sources.some(
          (s) =>
            s.id === source.id &&
            sourceVisible(s, canEditDiscovery(role, client)),
        ),
      ),
    },
    editable,
    invalid,
    hydrated,
    context,
    latest,
    mutate,
    persistDiscovery,
  };
}
