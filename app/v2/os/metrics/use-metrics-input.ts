"use client";

/* Lee, con los mismos hooks de los módulos, todas las colecciones que usan las métricas.
 * Solo lectura: no siembra tareas ni escribe nada. Se actualiza con cambios de esta pestaña
 * y de otras (useSyncExternalStore de cada colección). */
import { useMemo } from "react";
import { tasksForClient } from "../director-data";
import { useLocalStorageState } from "../local-persistence";
import type { OsClient, ServiceId } from "../os-data";
import { useOsStore } from "../os-store";
import { normalizeQuota, quotaKey } from "../modules/av-model";
import { defaultQuota } from "../modules/av-operations";
import { useModuleRecords } from "../modules/store";
import { withPaidDefaults } from "../modules/use-paid-operations";
import { METRIC_COLLECTIONS, taskLite, type MetricsInput } from "./input";

export function useMetricsInput(client: OsClient): { input: MetricsInput; hydrated: boolean } {
  const { tasks, localHydrated } = useOsStore();
  const slug = client.slug;
  const design = useModuleRecords(slug, "diseno-marca", METRIC_COLLECTIONS["diseno-marca"]);
  const content = useModuleRecords(slug, "contenidos", METRIC_COLLECTIONS.contenidos);
  const paid = useModuleRecords(slug, "publicidad-digital", METRIC_COLLECTIONS["publicidad-digital"]);
  const av = useModuleRecords(slug, "audiovisuales", METRIC_COLLECTIONS.audiovisuales);
  const strategy = useModuleRecords(slug, "estrategia", METRIC_COLLECTIONS.estrategia);
  const web = useModuleRecords(slug, "desarrollo-web", METRIC_COLLECTIONS["desarrollo-web"]);
  const crm = useModuleRecords(slug, "crm", METRIC_COLLECTIONS.crm);
  const ia = useModuleRecords(slug, "ia-automatizaciones", METRIC_COLLECTIONS["ia-automatizaciones"]);
  const graphic = useModuleRecords(slug, "soluciones-graficas", METRIC_COLLECTIONS["soluciones-graficas"]);
  const ml = useModuleRecords(slug, "mercado-libre", METRIC_COLLECTIONS["mercado-libre"]);
  const [rawQuota] = useLocalStorageState<unknown>(quotaKey(slug), null);

  const input = useMemo<MetricsInput>(() => {
    const paidData = Object.fromEntries(Object.entries(paid.data).map(([key, list]) => [key, list.map(withPaidDefaults)]));
    const records: MetricsInput["records"] = {
      "diseno-marca": design.data,
      contenidos: content.data,
      "publicidad-digital": paidData,
      audiovisuales: av.data,
      estrategia: strategy.data,
      "desarrollo-web": web.data,
      crm: crm.data,
      "ia-automatizaciones": ia.data,
      "soluciones-graficas": graphic.data,
      "mercado-libre": ml.data,
    } satisfies Partial<Record<ServiceId, Record<string, unknown>>>;
    return {
      clientSlug: slug,
      tasks: tasksForClient(tasks, slug).map(taskLite),
      records,
      quota: normalizeQuota(rawQuota, slug, defaultQuota(slug)),
    };
  }, [av.data, content.data, crm.data, design.data, graphic.data, ia.data, ml.data, paid.data, rawQuota, slug, strategy.data, tasks, web.data]);

  const hydrated = localHydrated && design.hydrated && content.hydrated && paid.hydrated && av.hydrated;
  return { input, hydrated };
}
