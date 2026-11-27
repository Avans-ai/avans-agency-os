"use client";

/* Datos de los reportes de resultados que se muestran dentro de Publicidad digital y
 * Contenidos. Leen las mismas colecciones que metrics/** y usan sus definiciones
 * (paidTotals, weeksInPeriod, contentState) a través de los builders. */
import { useMemo } from "react";
import type { OsClient } from "../os-data";
import { useModuleRecords } from "../modules/store";
import { usePaidData } from "../modules/use-paid-operations";
import { axisInputs, campaignInputs, pieceInputs } from "./adapters";
import { buildContentReport, buildPaidMediaReport } from "./builders";
import {
  audienceDemo,
  businessModelByClient,
  contentDemoMetrics,
  contentDemoSeries,
  PAID_PERIODS,
  PAID_WEEKS,
  paidDemoMetrics,
  REPORT_REFERENCE,
} from "./demo-fixtures";

const CONTENT = ["piezas", "ejes", "aprendizajes"];

export function usePaidReport(client: OsClient) {
  const { data } = usePaidData(client);
  return useMemo(() => buildPaidMediaReport({
    clientName: client.name,
    campaigns: campaignInputs(data.campanas ?? []),
    metrics: paidDemoMetrics,
    weeks: PAID_WEEKS,
    businessModel: businessModelByClient[client.slug] ?? "leads",
    period: REPORT_REFERENCE.paid.label,
    previousPeriod: REPORT_REFERENCE.paid.previous,
    periods: PAID_PERIODS,
  }), [client.name, client.slug, data.campanas]);
}

export function useContentReport(client: OsClient) {
  const { data } = useModuleRecords(client.slug, "contenidos", CONTENT);
  return useMemo(() => buildContentReport({
    clientName: client.name,
    pieces: pieceInputs(data.piezas ?? []),
    axes: axisInputs(data.ejes ?? []),
    metrics: contentDemoMetrics,
    series: contentDemoSeries[client.slug] ?? [],
    audience: audienceDemo[client.slug] ?? [],
    learnings: (data.aprendizajes ?? []).map((record) => record.values.aprendizaje).filter(Boolean),
    period: REPORT_REFERENCE.month.label,
  }), [client.name, client.slug, data.aprendizajes, data.ejes, data.piezas]);
}
