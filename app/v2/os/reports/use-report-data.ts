"use client";

import { useMemo } from "react";
import { clientAttention } from "../director-data";
import { serviceCatalog, type OsClient, type ServiceId } from "../os-data";
import { useOsStore } from "../os-store";
import { useRecommendations } from "../modules/recommendations";
import { useModuleRecords } from "../modules/store";
import { axisInputs, campaignInputs, pieceInputs, recommendationInputs } from "./adapters";
import { buildContentReport, buildMonthlyReport, buildPaidMediaReport, buildWeeklyReport } from "./builders";
import {
  audienceDemo,
  businessModelByClient,
  contentDemoMetrics,
  contentDemoSeries,
  monthlyDemo,
  PAID_WEEKS,
  paidDemoMetrics,
  REPORT_REFERENCE,
  weeklyDemo,
} from "./demo-fixtures";

const PAID = ["campanas"];
const CONTENT = ["piezas", "ejes", "aprendizajes"];

export function usePaidReport(client: OsClient) {
  const { data } = useModuleRecords(client.slug, "publicidad-digital", PAID);
  return useMemo(() => buildPaidMediaReport({
    clientName: client.name,
    campaigns: campaignInputs(data.campanas ?? []),
    metrics: paidDemoMetrics,
    weeks: PAID_WEEKS,
    businessModel: businessModelByClient[client.slug] ?? "leads",
    period: REPORT_REFERENCE.paid.label,
    previousPeriod: REPORT_REFERENCE.paid.previous,
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

export function useClientReports(client: OsClient, moduleFilter: ServiceId | "todos") {
  const { tasks, servicesOf } = useOsStore();
  const active = servicesOf(client.slug);
  const activeServices = useMemo(() => serviceCatalog.map((service) => service.id).filter((id) => active.includes(id)), [active]);
  const { items: recommendations } = useRecommendations(client.slug, activeServices);
  const paid = usePaidReport(client);
  const content = useContentReport(client);
  const recInputs = useMemo(() => recommendationInputs(recommendations), [recommendations]);
  const filter = moduleFilter !== "todos" && !activeServices.includes(moduleFilter) ? "todos" : moduleFilter;

  const weekly = useMemo(() => buildWeeklyReport({
    client,
    activeServices,
    moduleFilter: filter,
    tasks,
    period: REPORT_REFERENCE.week.label,
    owner: client.owner,
    demo: weeklyDemo[client.slug],
    attention: clientAttention(client.slug, tasks),
    recommendations: recInputs,
  }), [activeServices, client, filter, recInputs, tasks]);

  const monthly = useMemo(() => buildMonthlyReport({
    client,
    activeServices,
    tasks,
    demo: monthlyDemo[client.slug],
    paid: activeServices.includes("publicidad-digital") ? paid : undefined,
    content: activeServices.includes("contenidos") ? content : undefined,
    recommendations: recInputs,
    period: REPORT_REFERENCE.month.label,
    previousPeriod: REPORT_REFERENCE.month.previous,
    owner: client.owner,
  }), [activeServices, client, content, paid, recInputs, tasks]);

  return { activeServices, weekly, monthly, paid, content };
}
