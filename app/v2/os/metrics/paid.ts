/* Publicidad digital · métricas desde campañas, pedidos de anuncio y optimizaciones.
 * Los semáforos semanales y el presupuesto del mes son los mismos del Inicio del módulo
 * (weeklyKpis, monthlyBudget de paid-metrics.ts). Los resultados del período suman las
 * semanas cuyo lunes cae dentro del período, con la misma fórmula (totalsOf).
 * Las cifras son de demostración: ninguna plataforma de anuncios está conectada. */
import { AD_STAGES, adHref, adState, campaignHref, campaignPlan, stageDue, type AdState } from "../modules/paid-model";
import { campaignWeeks, monthlyBudget, totalsOf, weeklyKpis, type Totals } from "../modules/paid-metrics";
import type { ModuleRecord } from "../modules/types";
import { PAID_WEEK_STARTS, PAID_WEEKS, paidDemoMetrics, type PaidWeek } from "../reports/demo-fixtures";
import { serviceHref } from "../service-workspace-data";
import { finishSnapshot, isUpcoming, money, moneyShort, number, periodComparisons, type SnapshotOptions } from "./common";
import { recordsOf, type MetricsInput } from "./input";
import { inPeriod, previousPeriod, shortDate, type MetricPeriod } from "./period";
import { serviceTasks, taskItems } from "./tasks";
import { countMetric, missingMetric, noDataMetric, originOfRecords, type ChartSpec, type ItemRef, type Metric, type ServiceSnapshot } from "./types";

const SERVICE = "publicidad-digital" as const;
export const AD_APPROVAL_STAGES: AdState[] = ["Validación del PM", "Validación del diseño", "Aprobación del cliente"];
const TERMINAL: AdState[] = ["En circulación", "Finalizado"];

export type PaidTotals = Totals & { reach: number; revenue: number; cpc: number; roas?: number };

/** Totales extendidos: los de paid-metrics (totalsOf) + alcance, ingresos, CPC y ROAS. */
export function paidTotals(weeks: PaidWeek[], model: "leads" | "ecommerce" = "leads"): PaidTotals {
  const base = totalsOf(weeks);
  const reach = weeks.reduce((sum, week) => sum + week.reach, 0);
  const revenue = weeks.reduce((sum, week) => sum + (week.revenue ?? 0), 0);
  return { ...base, reach, revenue, cpc: base.clicks ? base.spend / base.clicks : 0, roas: model === "ecommerce" ? (base.spend ? revenue / base.spend : 0) : undefined };
}

/** Semanas de una campaña dentro del período (por el lunes de inicio). */
export function weeksInPeriod(weeks: PaidWeek[], period: Pick<MetricPeriod, "start" | "end">, starts: readonly string[] = PAID_WEEK_STARTS) {
  return weeks.filter((_, index) => inPeriod(starts[index], period));
}

/** Semanas (por su lunes) del período que tienen datos en al menos una campaña. */
export function paidWeekCoverage(campaigns: ModuleRecord[], period: Pick<MetricPeriod, "start" | "end">, metrics: Record<string, PaidWeek[]> = paidDemoMetrics, starts: readonly string[] = PAID_WEEK_STARTS) {
  const series = campaigns.map((campaign) => campaignWeeks(campaign, metrics)).filter((weeks): weeks is PaidWeek[] => Boolean(weeks));
  return starts.filter((start, index) => inPeriod(start, period) && series.some((weeks) => (weeks[index]?.spend ?? 0) > 0)).length;
}

export function paidPeriodData(campaigns: ModuleRecord[], period: Pick<MetricPeriod, "start" | "end">, metrics: Record<string, PaidWeek[]> = paidDemoMetrics, starts: readonly string[] = PAID_WEEK_STARTS) {
  const rows = campaigns.map((campaign) => ({ campaign, weeks: weeksInPeriod(campaignWeeks(campaign, metrics) ?? [], period, starts).filter((week) => week.spend > 0) }));
  const withData = rows.filter((row) => row.weeks.length);
  return { rows, withData, weeks: withData.flatMap((row) => row.weeks) };
}

/** Resultados del período (demo). null cuando ninguna campaña tiene semanas con datos en el período. */
export function paidResults(input: MetricsInput, period: MetricPeriod, metrics: Record<string, PaidWeek[]> = paidDemoMetrics): Metric[] {
  const campaigns = recordsOf(input, SERVICE, "campanas");
  const data = paidPeriodData(campaigns, period, metrics);
  if (!data.weeks.length) {
    const why = campaigns.length ? "Sin resultados en el período: plataformas de anuncios no conectadas." : "Sin campañas cargadas.";
    return ["inversion", "leads", "cpl", "ctr", "conversiones"].map((id) => missingMetric(id, LABEL[id], "no-conectado", why));
  }
  const totals = paidTotals(data.weeks);
  const hint = `${data.withData.length} ${data.withData.length === 1 ? "campaña" : "campañas"} con datos · ${data.weeks.length} ${data.weeks.length === 1 ? "semana" : "semanas-campaña"} · demo`;
  return [
    { id: "inversion", label: LABEL.inversion, value: totals.spend, display: moneyShort(totals.spend), origin: "demo", hint },
    { id: "leads", label: LABEL.leads, value: totals.leads, display: number(totals.leads), origin: "demo", hint },
    totals.leads ? { id: "cpl", label: LABEL.cpl, value: totals.cpl, display: money(totals.cpl), origin: "demo", hint: "Inversión / leads." } : noDataMetric("cpl", LABEL.cpl, "demo", "Sin leads en el período."),
    totals.impressions ? { id: "ctr", label: LABEL.ctr, value: totals.ctr, display: `${number(totals.ctr, 2)} %`, origin: "demo", hint: "Clics / impresiones." } : noDataMetric("ctr", LABEL.ctr, "demo"),
    { id: "conversiones", label: LABEL.conversiones, value: totals.conversions, display: number(totals.conversions), origin: "demo" },
  ];
}
const LABEL: Record<string, string> = { inversion: "Inversión del período", leads: "Leads del período", cpl: "Costo por lead", ctr: "CTR", conversiones: "Conversiones" };

/** Pedidos con la etapa vencida (misma regla que el Inicio del módulo, con fecha de corte). */
export function lateAds(ads: ModuleRecord[], asOf: string) {
  return ads.filter((ad) => {
    const state = adState(ad);
    if (TERMINAL.includes(state)) return false;
    const due = stageDue(ad, state);
    return Boolean(due) && due < asOf;
  });
}

export function paidSnapshot(input: MetricsInput, options: SnapshotOptions, metrics: Record<string, PaidWeek[]> = paidDemoMetrics): ServiceSnapshot {
  const { asOf, period } = options;
  const campaigns = recordsOf(input, SERVICE, "campanas");
  const ads = recordsOf(input, SERVICE, "anuncios");
  const optimizations = recordsOf(input, SERVICE, "optimizaciones");
  const origin = originOfRecords([...campaigns, ...ads]);
  const tasks = serviceTasks(input.tasks, SERVICE, asOf);
  const base = serviceHref(input.clientSlug, SERVICE);
  const active = campaigns.filter((campaign) => campaign.values.estado === "Activa");
  const weekly = weeklyKpis(input.clientSlug, campaigns, metrics);
  const budget = monthlyBudget(campaigns, metrics);
  const late = lateAds(ads, asOf);
  const pendingPlans = campaigns.filter((campaign) => campaignPlan(campaign).state === "En validación del PM");
  const inApproval = ads.filter((ad) => AD_APPROVAL_STAGES.includes(adState(ad)) && !late.includes(ad));
  const toReview = optimizations.filter((item) => ["Propuesta", "En evaluación"].includes(item.values.estado));
  const configured = campaigns.length > 0 || ads.length > 0 || tasks.open.length > 0;
  const has = campaigns.length > 0;

  const indicators: Metric[] = has ? [
    countMetric("activas", "Campañas activas", active.length, originOfRecords(campaigns), { href: `${base}?seccion=campanas` }),
    budget.rows.length && budget.rows.some((row) => row.spent > 0)
      ? { id: "gasto-mes", label: "Inversión del mes a la fecha", value: budget.spent, display: moneyShort(budget.spent), origin: "demo", light: budget.light, hint: `${budget.month.label} · día ${budget.month.day} de ${budget.month.days} · presupuesto ${moneyShort(budget.monthly)} · ritmo ${Math.round(budget.pacing * 100)} %` }
      : missingMetric("gasto-mes", "Inversión del mes a la fecha", active.length ? "no-conectado" : "pendiente", active.length ? "Las campañas activas no tienen gasto medido." : "No hay campañas activas."),
    ...(weekly.hasData
      ? weekly.kpis.map((kpi): Metric => ({ id: `kpi-${kpi.id}`, label: kpi.label, value: kpi.value, display: kpi.display, origin: "demo", light: kpi.light, hint: `${weekly.weekLabel} · objetivo ${kpi.targetDisplay}` }))
      : [missingMetric("kpis", "Resultados semanales", "no-conectado", "Sin métricas: plataformas de anuncios no conectadas.")]),
  ] : [noDataMetric("campanas", "Campañas", "pendiente", "Todavía no hay campañas cargadas.")];

  const attention: ItemRef[] = [
    ...late.map((ad): ItemRef => ({ id: ad.id, title: ad.values.nombre || ad.id, detail: `«${adState(ad)}» vencida el ${shortDate(stageDue(ad, adState(ad)))}`, kind: "vencido", href: adHref(input.clientSlug, ad.id), date: stageDue(ad, adState(ad)), origin: originOfRecords([ad]) })),
    ...weekly.kpis.filter((kpi) => kpi.light === "rojo").map((kpi): ItemRef => ({ id: `kpi-${kpi.id}`, title: kpi.label, detail: `${kpi.display} vs. objetivo ${kpi.targetDisplay} · ${weekly.weekLabel}`, kind: "revision", href: `${base}?seccion=resultados`, origin: "demo" })),
    ...pendingPlans.map((campaign): ItemRef => ({ id: campaign.id, title: campaign.values.nombre || campaign.id, detail: "Planificación esperando validación del PM", kind: "aprobacion", href: campaignHref(input.clientSlug, campaign.id), origin: originOfRecords([campaign]) })),
    ...inApproval.map((ad): ItemRef => ({ id: ad.id, title: ad.values.nombre || ad.id, detail: `${adState(ad)} · vence ${shortDate(stageDue(ad, adState(ad)))}`, kind: "aprobacion", href: adHref(input.clientSlug, ad.id), date: stageDue(ad, adState(ad)), origin: originOfRecords([ad]) })),
    ...toReview.map((item): ItemRef => ({ id: item.id, title: item.values.hipotesis || item.id, detail: `Ajuste ${item.values.estado?.toLocaleLowerCase("es")}${item.values.fecha ? ` · ${shortDate(item.values.fecha)}` : ""}`, kind: "revision", href: `${base}?seccion=optimizacion`, date: item.values.fecha, origin: originOfRecords([item]) })),
    ...taskItems(input.clientSlug, tasks),
  ];
  const upcoming = ads.filter((ad) => !TERMINAL.includes(adState(ad)) && isUpcoming(ad.values.fechaNecesaria, asOf)).map((ad): ItemRef => ({ id: ad.id, title: ad.values.nombre || ad.id, detail: `Salida prevista · ${adState(ad)}`, kind: "proximo", href: adHref(input.clientSlug, ad.id), date: ad.values.fechaNecesaria, origin: originOfRecords([ad]) }));

  const charts: ChartSpec[] = [];
  const trendWindow = { start: previousPeriod(period).start, end: period.end };
  const trendIndexes = PAID_WEEK_STARTS.map((start, index) => ({ start, index })).filter((item) => inPeriod(item.start, trendWindow));
  const series = campaigns.map((campaign) => campaignWeeks(campaign, metrics)).filter((weeks): weeks is PaidWeek[] => Boolean(weeks));
  if (series.length && trendIndexes.length) {
    charts.push({ kind: "line", id: "paid-leads", title: "Leads por semana", labels: trendIndexes.map((item) => PAID_WEEKS[item.index]), values: trendIndexes.map((item) => series.reduce((sum, weeks) => sum + (weeks[item.index]?.leads ?? 0), 0)), format: "number", origin: "demo" });
  }
  if (ads.length) charts.push({ kind: "bars", id: "paid-ads", title: "Pedidos de anuncio por etapa", items: [...AD_STAGES, ...TERMINAL].map((stage) => ({ label: stage, value: ads.filter((ad) => adState(ad) === stage).length })).filter((item) => item.value > 0), href: `${base}?seccion=anuncios`, origin: originOfRecords(ads) });

  const coverage = { current: paidWeekCoverage(campaigns, period, metrics), previous: paidWeekCoverage(campaigns, previousPeriod(period), metrics) };
  const kpiRed = weekly.kpis.filter((kpi) => kpi.light === "rojo").length;
  const kpiYellow = weekly.kpis.filter((kpi) => kpi.light === "amarillo").length;
  return finishSnapshot({
    serviceId: SERVICE, options, configured, clientSlug: input.clientSlug,
    signals: { hasData: configured, blocked: tasks.blocked.length, overdue: late.length + tasks.late.length, kpiRed, kpiYellow, pacing: budget.rows.some((row) => row.spent > 0) ? budget.light : undefined, approvals: pendingPlans.length + inApproval.length + tasks.approvals.length, clientPending: 0, pendingReview: toReview.length },
    indicators,
    results: paidResults(input, period, metrics),
    // Comparables solo si ambos períodos tienen la misma cantidad de semanas con datos.
    comparisons: coverage.current && coverage.current === coverage.previous ? periodComparisons((current) => paidResults(input, current, metrics), options, { inversion: "up", leads: "up", cpl: "down", ctr: "up", conversiones: "up" }) : [],
    charts,
    attention,
    upcoming,
    notes: [
      weekly.hasData ? `Semáforos: ${weekly.weekLabel} vs. objetivo semanal · presupuesto: ${budget.month.label} (día ${budget.month.day} de ${budget.month.days}). Métricas de demostración: Meta, Google, TikTok, ChatGPT y LinkedIn Ads no están conectados.` : "Sin métricas de pauta: las plataformas de anuncios no están conectadas y no hay datos de demostración para esta cuenta.",
      `Resultados del período (${period.label}): semanas cuyo lunes cae dentro del período (${coverage.current} con datos).${options.compare && coverage.current && coverage.current !== coverage.previous ? ` Sin comparación: el período anterior tiene ${coverage.previous} ${coverage.previous === 1 ? "semana" : "semanas"} con datos.` : ""}`,
    ],
    origins: [origin, ...(weekly.hasData ? ["demo" as const] : [])],
  });
}
