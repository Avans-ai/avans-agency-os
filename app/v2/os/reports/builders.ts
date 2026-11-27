/* Builders puros de reportes. Usan las MISMAS definiciones de métricas que el Inicio del
 * cliente (app/v2/os/metrics/**): la instantánea del generador llama a serviceSnapshot y los
 * reportes de resultados de Publicidad digital y Contenidos (embebidos en sus módulos) usan
 * paidTotals/weeksInPeriod y contentState. No leen React, localStorage ni la red. */
import { serviceSnapshots, METRICS_VERSION } from "../metrics";
import { isContentInReview } from "../metrics/content";
import type { MetricsInput } from "../metrics/input";
import { paidTotals, weeksInPeriod, type PaidTotals } from "../metrics/paid";
import { longDate, previousPeriod, type MetricPeriod } from "../metrics/period";
import { HEALTH_LABEL } from "../metrics/service-health";
import { mergeOrigins, type DataOrigin, type ServiceSnapshot } from "../metrics/types";
import { contentFlowStep, contentState } from "../modules/content-workflow";
import type { ModuleRecord } from "../modules/types";
import { serviceLabel, type OsClient, type ServiceId } from "../os-data";
import {
  PAID_PERIODS,
  PAID_WEEK_STARTS,
  type AudienceRow,
  type BusinessModel,
  type ContentMonth,
  type PaidWeek,
  type PieceMetric,
} from "./demo-fixtures";
import { REPORT_TYPE_LABEL, reportTitle, type ReportNarrative, type ReportType } from "./generator";

export type SourceOrigin = "tareas" | "objetos" | "demo" | "integracion" | "manual";
export const ORIGIN_LABEL: Record<SourceOrigin, string> = {
  tareas: "Tareas del módulo",
  objetos: "Objetos del módulo",
  demo: "Datos de demostración",
  integracion: "Integración",
  manual: "Carga manual",
};

export type ReportSource = { label: string; origin: SourceOrigin; detail: string; status?: "Conectada" | "No conectada" | "Activa" };
export type ReportKpi = { label: string; value: string; previous?: string; delta?: number; better?: "up" | "down"; origin: SourceOrigin; note?: string };
export type ReportLine = { title: string; detail?: string; serviceId?: ServiceId; taskId?: string; origin: SourceOrigin; tone?: "error" | "warning" | "info" };
export type ChartSeries = { label: string; values: number[]; tone: "ink" | "teal" | "accent" };
export type BarDatum = { label: string; value: number; secondary?: number; display?: string; secondaryDisplay?: string };

export type RecommendationInput = { id: string; title: string; rationale: string; serviceId: ServiceId; priority: "Alta" | "Media" | "Baja"; status: string; source: string };

/* ───────── utilidades ───────── */
export function formatNumber(value: number, digits = 0) {
  return value.toLocaleString("es-AR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
export function formatMoneyShort(value: number) {
  if (Math.abs(value) >= 1_000_000) return `$ ${formatNumber(value / 1_000_000, 2)} M`;
  if (Math.abs(value) >= 10_000) return `$ ${formatNumber(Math.round(value / 1000))} mil`;
  return `$ ${formatNumber(Math.round(value))}`;
}
export function formatPercent(value: number, digits = 1) {
  return `${formatNumber(value, digits)} %`;
}
export function percentChange(current: number, previous: number) {
  if (!previous) return undefined;
  return ((current - previous) / previous) * 100;
}
function sum<T>(items: T[], pick: (item: T) => number) {
  return items.reduce((total, item) => total + pick(item), 0);
}
function safeDivide(a: number, b: number) {
  return b ? a / b : 0;
}

/* ───────── Publicidad digital ───────── */
export type CampaignInput = { id: string; name: string; platform: string; objective: string; status: string; budget: number; source: "manual" | "demo" | "integration" };

export type CampaignRow = CampaignInput & { hasData: boolean; current?: PaidTotals; previous?: PaidTotals; spendShare: number };

export type PaidReport = {
  kind: "publicidad";
  title: string;
  clientName: string;
  period: string;
  previousPeriod: string;
  businessModel: BusinessModel;
  totals: PaidTotals;
  previousTotals: PaidTotals;
  kpis: ReportKpi[];
  campaigns: CampaignRow[];
  weeks: string[];
  spendSeries: ChartSeries[];
  leadsSeries: ChartSeries[];
  comparison: BarDatum[];
  insights: string[];
  recommendations: ReportLine[];
  conclusion: string;
  sources: ReportSource[];
  hasData: boolean;
};

/** Mismos totales que metrics/paid.ts (paidTotals → totalsOf de paid-metrics). */
export function totalsOf(weeks: PaidWeek[], model: BusinessModel): PaidTotals {
  return paidTotals(weeks, model);
}
export type { PaidTotals };

export function buildPaidMediaReport(input: {
  clientName: string;
  campaigns: CampaignInput[];
  metrics: Record<string, PaidWeek[]>;
  weeks: readonly string[];
  businessModel: BusinessModel;
  period: string;
  previousPeriod: string;
  /** Períodos medidos (por el lunes de cada semana). Por defecto, los del reporte de demostración. */
  periods?: { current: Pick<MetricPeriod, "start" | "end">; previous: Pick<MetricPeriod, "start" | "end"> };
  weekStarts?: readonly string[];
}): PaidReport {
  const periods = input.periods ?? PAID_PERIODS;
  const starts = input.weekStarts ?? PAID_WEEK_STARTS;
  const withData = input.campaigns.filter((campaign) => input.metrics[campaign.id]?.some((week) => week.spend > 0));
  const currentWeeks = (id: string) => weeksInPeriod(input.metrics[id] ?? [], periods.current, starts);
  const previousWeeks = (id: string) => weeksInPeriod(input.metrics[id] ?? [], periods.previous, starts);
  const allCurrent = withData.flatMap((campaign) => currentWeeks(campaign.id));
  const allPrevious = withData.flatMap((campaign) => previousWeeks(campaign.id));
  const totals = totalsOf(allCurrent, input.businessModel);
  const previousTotals = totalsOf(allPrevious, input.businessModel);

  const campaigns: CampaignRow[] = input.campaigns.map((campaign) => {
    const hasData = withData.includes(campaign);
    const current = hasData ? totalsOf(currentWeeks(campaign.id), input.businessModel) : undefined;
    return {
      ...campaign,
      hasData,
      current,
      previous: hasData ? totalsOf(previousWeeks(campaign.id), input.businessModel) : undefined,
      spendShare: current ? safeDivide(current.spend, totals.spend) * 100 : 0,
    };
  });

  const weekTotals = input.weeks.map((_, index) => withData.reduce((acc, campaign) => {
    const week = input.metrics[campaign.id]?.[index];
    return week ? { spend: acc.spend + week.spend, leads: acc.leads + week.leads } : acc;
  }, { spend: 0, leads: 0 }));

  const kpi = (label: string, current: number, previous: number, format: (value: number) => string, better: "up" | "down"): ReportKpi => ({
    label,
    value: format(current),
    previous: previous ? format(previous) : undefined,
    delta: percentChange(current, previous),
    better,
    origin: "demo",
  });
  const kpis: ReportKpi[] = [
    kpi("Inversión", totals.spend, previousTotals.spend, formatMoneyShort, "up"),
    kpi("Alcance", totals.reach, previousTotals.reach, (value) => formatNumber(value), "up"),
    kpi("Impresiones", totals.impressions, previousTotals.impressions, (value) => formatNumber(value), "up"),
    kpi("Clics", totals.clicks, previousTotals.clicks, (value) => formatNumber(value), "up"),
    kpi("CTR", totals.ctr, previousTotals.ctr, (value) => formatPercent(value, 2), "up"),
    kpi("CPC", totals.cpc, previousTotals.cpc, (value) => `$ ${formatNumber(value)}`, "down"),
    kpi("Leads", totals.leads, previousTotals.leads, (value) => formatNumber(value), "up"),
    kpi("CPL", totals.cpl, previousTotals.cpl, (value) => `$ ${formatNumber(value)}`, "down"),
    kpi("Conversiones", totals.conversions, previousTotals.conversions, (value) => formatNumber(value), "up"),
  ];
  if (input.businessModel === "ecommerce") kpis.push(kpi("ROAS", totals.roas ?? 0, previousTotals.roas ?? 0, (value) => `${formatNumber(value, 2)}x`, "up"));

  const ranked = campaigns.filter((row) => row.current && row.current.leads > 0).sort((a, b) => (a.current!.cpl) - (b.current!.cpl));
  const best = ranked[0];
  const worst = ranked.length > 1 ? ranked[ranked.length - 1] : undefined;
  const lowCtr = campaigns.filter((row) => row.current && row.current.ctr < 1);
  const noData = campaigns.filter((row) => !row.hasData);
  const cplDelta = percentChange(totals.cpl, previousTotals.cpl);

  const insights = [
    withData.length
      ? `La inversión del período fue ${formatMoneyShort(totals.spend)} en ${withData.length} ${withData.length === 1 ? "campaña con datos" : "campañas con datos"}, con ${formatNumber(totals.leads)} leads a un CPL de $ ${formatNumber(totals.cpl)}${cplDelta !== undefined ? ` (${cplDelta <= 0 ? "" : "+"}${formatNumber(cplDelta, 1)} % vs. período anterior)` : ""}.`
      : "No hay campañas con resultados en el período.",
    best ? `${best.name} es la campaña más eficiente: CPL $ ${formatNumber(best.current!.cpl)} y CTR ${formatPercent(best.current!.ctr, 2)}.` : "",
    worst && best && worst !== best ? `${worst.name} tiene el CPL más alto ($ ${formatNumber(worst.current!.cpl)}); revisar audiencia y creatividades.` : "",
    input.businessModel === "ecommerce" ? `ROAS del período: ${formatNumber(totals.roas ?? 0, 2)}x.` : "ROAS no aplica: el modelo del cliente es generación de leads, no venta online.",
  ].filter(Boolean);

  const recommendations: ReportLine[] = [
    ...(best && worst && best !== worst ? [{ title: `Reasignar presupuesto hacia ${best.name}`, detail: `Mover parte de la inversión de ${worst.name} mientras el CPL se mantenga por debajo del promedio.`, serviceId: "publicidad-digital" as const, origin: "demo" as const }] : []),
    ...lowCtr.map((row) => ({ title: `Renovar creatividades de ${row.name}`, detail: `CTR ${formatPercent(row.current!.ctr, 2)}: por debajo del 1 %.`, serviceId: "publicidad-digital" as const, origin: "demo" as const })),
    ...noData.filter((row) => row.status === "Activa").map((row) => ({ title: `Cargar resultados de ${row.name}`, detail: `${row.platform}: integración no conectada. Sin datos no se puede evaluar la campaña.`, serviceId: "publicidad-digital" as const, origin: "objetos" as const, tone: "warning" as const })),
  ].slice(0, 5);

  return {
    kind: "publicidad",
    title: "Reporte de Publicidad digital",
    clientName: input.clientName,
    period: input.period,
    previousPeriod: input.previousPeriod,
    businessModel: input.businessModel,
    totals,
    previousTotals,
    kpis,
    campaigns,
    weeks: [...input.weeks],
    spendSeries: [{ label: "Inversión semanal", values: weekTotals.map((week) => week.spend), tone: "ink" }],
    leadsSeries: [{ label: "Leads semanales", values: weekTotals.map((week) => week.leads), tone: "accent" }],
    comparison: campaigns.filter((row) => row.current).map((row) => ({ label: row.name, value: row.current!.leads, secondary: row.previous?.leads ?? 0, display: `${formatNumber(row.current!.leads)} leads`, secondaryDisplay: `${formatNumber(row.previous?.leads ?? 0)} antes` })),
    insights,
    recommendations,
    conclusion: withData.length
      ? `El período ${cplDelta !== undefined && cplDelta < 0 ? "mejora la eficiencia" : "sostiene la inversión"} y concentra el aprendizaje en ${best?.name ?? "las campañas activas"}. Próximo foco: ${recommendations[0]?.title.toLocaleLowerCase("es") ?? "sostener la optimización semanal"}.`
      : "Sin resultados para concluir. Conectar las plataformas o cargar resultados manuales antes del próximo reporte.",
    sources: [
      { label: "Campañas", origin: "objetos", detail: "Listado de campañas del módulo (demo + altas manuales guardadas en este navegador)." },
      { label: "Métricas de pauta", origin: "demo", detail: "Cifras ficticias por semana. No provienen de ninguna plataforma." },
      { label: "Meta Ads", origin: "integracion", detail: "Inversión, alcance, impresiones, clics, leads y conversiones.", status: "No conectada" },
      { label: "Google Ads", origin: "integracion", detail: "Búsqueda: clics, CPC, conversiones.", status: "No conectada" },
      { label: "LinkedIn Ads", origin: "integracion", detail: "Generación de demanda B2B.", status: "No conectada" },
    ],
    hasData: withData.length > 0,
  };
}

/* ───────── Contenidos ───────── */
export type PieceInput = { id: string; title: string; format: string; channel: string; axisId: string; status: string; date: string; source: "manual" | "demo" | "integration" };
export type AxisInput = { id: string; name: string };

export type ContentReport = {
  kind: "contenidos";
  title: string;
  clientName: string;
  period: string;
  produced: number;
  published: number;
  pending: number;
  totals: { reach: number; interactions: number; engagement: number; saves: number; clicks: number };
  previousMonth?: ContentMonth;
  currentMonth?: ContentMonth;
  kpis: ReportKpi[];
  series: { labels: string[]; reach: ChartSeries[]; published: BarDatum[] };
  audience: (AudienceRow & { growth: number })[];
  formats: BarDatum[];
  themes: BarDatum[];
  topPieces: { title: string; format: string; channel: string; reach: number; engagement: number }[];
  statusBreakdown: BarDatum[];
  learnings: string[];
  proposals: string[];
  conclusion: string;
  sources: ReportSource[];
};

/** Estado del flujo editorial de una pieza (misma lectura que el módulo, con compatibilidad de estados anteriores). */
function pieceState(piece: PieceInput) {
  return contentState({ values: { estado: piece.status } } as unknown as ModuleRecord);
}

export function buildContentReport(input: {
  clientName: string;
  pieces: PieceInput[];
  axes: AxisInput[];
  metrics: Record<string, PieceMetric>;
  series: ContentMonth[];
  audience: AudienceRow[];
  learnings: string[];
  period: string;
}): ContentReport {
  const published = input.pieces.filter((piece) => pieceState(piece) === "Publicada");
  const measured = published.filter((piece) => input.metrics[piece.id]);
  const reach = sum(measured, (piece) => input.metrics[piece.id].reach);
  const interactions = sum(measured, (piece) => input.metrics[piece.id].interactions);
  const engagement = safeDivide(interactions, reach) * 100;
  const currentMonth = input.series[input.series.length - 1];
  const previousMonth = input.series[input.series.length - 2];

  const groupBy = (key: (piece: PieceInput) => string) => {
    const groups = new Map<string, { reach: number; interactions: number; count: number }>();
    for (const piece of measured) {
      const metric = input.metrics[piece.id];
      const name = key(piece) || "Sin clasificar";
      const current = groups.get(name) ?? { reach: 0, interactions: 0, count: 0 };
      groups.set(name, { reach: current.reach + metric.reach, interactions: current.interactions + metric.interactions, count: current.count + 1 });
    }
    return [...groups.entries()]
      .map(([label, value]) => ({ label, value: Number((safeDivide(value.interactions, value.reach) * 100).toFixed(2)), secondary: value.reach, display: formatPercent(safeDivide(value.interactions, value.reach) * 100), secondaryDisplay: `${formatNumber(value.reach)} de alcance · ${value.count} ${value.count === 1 ? "pieza" : "piezas"}` }))
      .sort((a, b) => b.value - a.value);
  };
  const axisName = (id: string) => input.axes.find((axis) => axis.id === id)?.name ?? "";
  const formats = groupBy((piece) => piece.format);
  const themes = groupBy((piece) => axisName(piece.axisId));
  const statusCounts = new Map<string, number>();
  input.pieces.forEach((piece) => statusCounts.set(pieceState(piece), (statusCounts.get(pieceState(piece)) ?? 0) + 1));
  const pendingApproval = input.pieces.filter((piece) => isContentInReview(pieceState(piece))).length;

  const kpi = (label: string, current: number, previous: number | undefined, format: (value: number) => string, origin: SourceOrigin = "demo"): ReportKpi => ({
    label,
    value: format(current),
    previous: previous !== undefined ? format(previous) : undefined,
    delta: previous !== undefined ? percentChange(current, previous) : undefined,
    better: "up",
    origin,
  });

  // Producidas: desde «Producción de diseño» (etapa 5 del flujo) en adelante.
  const produced = input.pieces.filter((piece) => contentFlowStep(pieceState(piece)) >= 5).length;
  const audience = input.audience.map((row) => ({ ...row, growth: percentChange(row.end, row.start) ?? 0 }));

  return {
    kind: "contenidos",
    title: "Reporte de Contenidos",
    clientName: input.clientName,
    period: input.period,
    produced,
    published: published.length,
    pending: input.pieces.length - published.length,
    totals: { reach, interactions, engagement, saves: sum(measured, (piece) => input.metrics[piece.id].saves), clicks: sum(measured, (piece) => input.metrics[piece.id].clicks) },
    previousMonth,
    currentMonth,
    kpis: [
      kpi("Piezas producidas", produced, undefined, (value) => String(value), "objetos"),
      kpi("Publicadas", published.length, undefined, (value) => String(value), "objetos"),
      kpi("Pendientes", input.pieces.length - published.length, undefined, (value) => String(value), "objetos"),
      kpi("Alcance del mes", currentMonth?.reach ?? 0, previousMonth?.reach, (value) => formatNumber(value)),
      kpi("Interacciones", currentMonth?.interactions ?? 0, previousMonth?.interactions, (value) => formatNumber(value)),
      kpi("Engagement", safeDivide(currentMonth?.interactions ?? 0, currentMonth?.reach ?? 0) * 100, previousMonth ? safeDivide(previousMonth.interactions, previousMonth.reach) * 100 : undefined, (value) => formatPercent(value)),
    ],
    series: {
      labels: input.series.map((month) => month.month),
      reach: [
        { label: "Alcance", values: input.series.map((month) => month.reach), tone: "ink" },
        { label: "Interacciones × 10", values: input.series.map((month) => month.interactions * 10), tone: "teal" },
      ],
      published: input.series.map((month) => ({ label: month.month, value: month.published, display: `${month.published} piezas` })),
    },
    audience,
    formats,
    themes,
    topPieces: measured
      .map((piece) => ({ title: piece.title, format: piece.format, channel: piece.channel, reach: input.metrics[piece.id].reach, engagement: safeDivide(input.metrics[piece.id].interactions, input.metrics[piece.id].reach) * 100 }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 5),
    statusBreakdown: [...statusCounts.entries()].map(([label, value]) => ({ label, value, display: String(value) })),
    learnings: input.learnings,
    proposals: [
      formats[0] ? `Sumar más ${formats[0].label.toLocaleLowerCase("es")}: es el formato con mejor engagement (${formats[0].display}).` : "",
      themes[0] ? `Profundizar el eje «${themes[0].label}», el de mejor respuesta del período.` : "",
      pendingApproval ? `Acelerar ${pendingApproval} ${pendingApproval === 1 ? "aprobación pendiente" : "aprobaciones pendientes"} para no perder fechas del calendario.` : "",
      "Definir una pieza de prueba por mes para validar un formato nuevo.",
    ].filter(Boolean),
    conclusion: measured.length
      ? `El mes cierra con ${published.length} piezas publicadas registradas y un engagement de ${formatPercent(engagement)} sobre las piezas medidas. ${themes[0] ? `«${themes[0].label}» lidera la respuesta.` : ""}`
      : "No hay piezas publicadas con métricas. Las métricas reales requieren conectar las redes del cliente.",
    sources: [
      { label: "Piezas y ejes", origin: "objetos", detail: "Calendario editorial del módulo (demo + altas manuales en este navegador)." },
      { label: "Métricas por pieza y serie mensual", origin: "demo", detail: "Alcance, interacciones y audiencia ficticios." },
      { label: "Aprendizajes", origin: "objetos", detail: "Registros del módulo." },
      { label: "Meta (Instagram / Facebook)", origin: "integracion", detail: "Alcance, interacciones y seguidores.", status: "No conectada" },
      { label: "LinkedIn Pages", origin: "integracion", detail: "Impresiones, interacciones y seguidores.", status: "No conectada" },
    ],
  };
}


/* ───────── Generador de reportes: instantánea reproducible ───────── */
export type ReportReviewLine = { part: string; role: string; owner: string; status: string; by: string; at: string; comment: string };

export type ReportSnapshot = {
  schema: 1;
  metricsVersion: string;
  clientSlug: string;
  clientName: string;
  type: ReportType;
  typeLabel: string;
  title: string;
  period: MetricPeriod;
  previousPeriod: MetricPeriod;
  /** Fecha de corte de los estados operativos (AAAA-MM-DD). */
  asOf: string;
  generatedAt: string;
  generatedBy: string;
  version: number;
  services: { id: ServiceId; label: string }[];
  sections: ServiceSnapshot[];
  /** Resumen automático de los datos (sin IA): una línea por servicio. */
  summary: string[];
  narrative: ReportNarrative;
  review: ReportReviewLine[];
  origins: Record<DataOrigin, number>;
  origin: DataOrigin;
  /** SHA-256 de la entrada de métricas usada. */
  inputDigest: string;
};

export function factualSummary(sections: ServiceSnapshot[]) {
  return sections.map((section) => `${section.label}: ${HEALTH_LABEL[section.health.level].toLocaleLowerCase("es")}. ${section.health.reason}`);
}

/** Instantánea del reporte: misma función de métricas que el Inicio, con el período elegido. */
export function buildReportSnapshot(input: {
  client: Pick<OsClient, "slug" | "name">;
  report: { type: ReportType; period: MetricPeriod; services: ServiceId[]; narrative: ReportNarrative };
  metrics: MetricsInput;
  asOf: string;
  generatedAt: string;
  generatedBy: string;
  version: number;
  review: ReportReviewLine[];
  inputDigest: string;
}): ReportSnapshot {
  if (input.metrics.clientSlug !== input.client.slug) throw new Error("Los datos pertenecen a otro cliente.");
  const sections = serviceSnapshots(input.report.services, input.metrics, { period: input.report.period, asOf: input.asOf, compare: true });
  const all = sections.flatMap((section) => [...section.indicators.map((metric) => metric.origin), ...section.results.map((metric) => metric.origin)]);
  const origins: Record<DataOrigin, number> = { real: 0, demo: 0, pendiente: 0, "no-conectado": 0 };
  for (const origin of all) origins[origin] += 1;
  return {
    schema: 1,
    metricsVersion: METRICS_VERSION,
    clientSlug: input.client.slug,
    clientName: input.client.name,
    type: input.report.type,
    typeLabel: REPORT_TYPE_LABEL[input.report.type],
    title: reportTitle(input.report, serviceLabel),
    period: input.report.period,
    previousPeriod: previousPeriod(input.report.period),
    asOf: input.asOf,
    generatedAt: input.generatedAt,
    generatedBy: input.generatedBy,
    version: input.version,
    services: input.report.services.map((id) => ({ id, label: serviceLabel(id) })),
    sections,
    summary: factualSummary(sections),
    narrative: { conclusions: input.report.narrative.conclusions.trim(), recommendations: input.report.narrative.recommendations.trim(), nextSteps: input.report.narrative.nextSteps.trim() },
    review: input.review,
    origins,
    origin: mergeOrigins(sections.map((section) => section.origin)),
    inputDigest: input.inputDigest,
  };
}

/** Texto plano del reporte (se conserva en la fuente de «Archivos y documentos»). */
export function snapshotText(snapshot: ReportSnapshot) {
  const lines = [
    `${snapshot.title} · ${snapshot.clientName}`,
    `Período: ${snapshot.period.label} · Generado el ${longDate(snapshot.generatedAt.slice(0, 10))} por ${snapshot.generatedBy} · Versión ${snapshot.version}`,
    `Servicios: ${snapshot.services.map((service) => service.label).join(", ")}`,
    "",
    ...snapshot.summary,
  ];
  for (const section of snapshot.sections) {
    lines.push("", `${section.label} · ${section.health.label}`, ...[...section.indicators, ...section.results].map((metric) => `- ${metric.label}: ${metric.display}${metric.origin === "real" ? "" : ` (${metric.origin})`}`));
  }
  if (snapshot.narrative.conclusions) lines.push("", "Conclusiones", snapshot.narrative.conclusions);
  if (snapshot.narrative.recommendations) lines.push("", "Recomendaciones", snapshot.narrative.recommendations);
  if (snapshot.narrative.nextSteps) lines.push("", "Próximos pasos", snapshot.narrative.nextSteps);
  return lines.join("\n");
}
