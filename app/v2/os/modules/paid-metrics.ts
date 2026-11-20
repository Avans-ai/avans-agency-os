/* Publicidad digital · lectura de métricas DE DEMOSTRACIÓN.
 * No hay Meta Ads, Google Ads, TikTok Ads, ChatGPT Ads ni LinkedIn Ads conectados:
 * todo sale de reports/demo-fixtures.ts y de paid-demo.ts. Funciones puras. */
import { paidDemoMetrics, type PaidWeek } from "../reports/demo-fixtures";
import { budgetPacing, campaignPlan, lightFor, sharesTotal, spendByChannel, type Light, type PaidChannel } from "./paid-model";
import { PAID_DEMO_CHANNEL_EFFICIENCY, PAID_DEMO_MONTH, PAID_DEMO_TARGETS } from "./paid-demo";
import type { ModuleRecord } from "./types";

export type Totals = { spend: number; impressions: number; clicks: number; leads: number; conversions: number; cpl: number; ctr: number };
const ZERO: Totals = { spend: 0, impressions: 0, clicks: 0, leads: 0, conversions: 0, cpl: 0, ctr: 0 };

export function totalsOf(weeks: PaidWeek[]): Totals {
  const t = weeks.reduce((acc, week) => ({ ...acc, spend: acc.spend + week.spend, impressions: acc.impressions + week.impressions, clicks: acc.clicks + week.clicks, leads: acc.leads + week.leads, conversions: acc.conversions + week.conversions }), { ...ZERO });
  return { ...t, cpl: t.leads ? t.spend / t.leads : 0, ctr: t.impressions ? (t.clicks / t.impressions) * 100 : 0 };
}

export function campaignWeeks(campaign: ModuleRecord, metrics: Record<string, PaidWeek[]> = paidDemoMetrics) {
  const weeks = metrics[campaign.id];
  return weeks?.some((week) => week.spend > 0) ? weeks : null;
}

/** Campañas que cuentan para el mes: activas (las pausadas o en preparación no suman presupuesto esperado). */
export function isRunning(campaign: ModuleRecord) { return campaign.values.estado === "Activa"; }

export type Kpi = { id: string; label: string; value: number; display: string; target: number; targetDisplay: string; light: Light; better: "higher" | "lower"; previous: number };

const money = (value: number) => `$ ${Math.round(value).toLocaleString("es-AR")}`;

/** Semáforos de KPIs semanales: última semana con datos demo vs. objetivo de demostración. */
export function weeklyKpis(clientSlug: string, campaigns: ModuleRecord[], metrics: Record<string, PaidWeek[]> = paidDemoMetrics) {
  const rows = campaigns.map((campaign) => campaignWeeks(campaign, metrics)).filter((weeks): weeks is PaidWeek[] => Boolean(weeks));
  const week = totalsOf(rows.map((weeks) => weeks[weeks.length - 1]));
  const previous = totalsOf(rows.map((weeks) => weeks[weeks.length - 2]).filter(Boolean));
  const target = PAID_DEMO_TARGETS[clientSlug];
  const kpi = (id: string, label: string, value: number, prev: number, goal: number, better: "higher" | "lower", format: (n: number) => string): Kpi => ({
    id, label, value, previous: prev, display: format(value), target: goal, targetDisplay: goal ? format(goal) : "Sin objetivo", better, light: rows.length && goal ? lightFor(value, goal, better) : "gris",
  });
  const kpis: Kpi[] = rows.length ? [
    kpi("leads", "Leads de la semana", week.leads, previous.leads, target?.leads ?? 0, "higher", (n) => Math.round(n).toLocaleString("es-AR")),
    kpi("cpl", "Costo por lead", week.cpl, previous.cpl, target?.cpl ?? 0, "lower", money),
    kpi("ctr", "CTR", week.ctr, previous.ctr, target?.ctr ?? 0, "higher", (n) => `${n.toFixed(2).replace(".", ",")} %`),
    kpi("conversions", "Conversiones", week.conversions, previous.conversions, target?.conversions ?? 0, "higher", (n) => Math.round(n).toLocaleString("es-AR")),
  ] : [];
  return { hasData: rows.length > 0, week, previous, kpis, weekLabel: PAID_DEMO_MONTH.weekLabel };
}

/** Gasto del mes a la fecha (demo): última semana × días transcurridos / 7. */
export function monthToDate(weeks: PaidWeek[] | null) {
  if (!weeks) return 0;
  return Math.round((weeks[weeks.length - 1]?.spend ?? 0) * (PAID_DEMO_MONTH.day / 7));
}

export function monthlyBudget(campaigns: ModuleRecord[], metrics: Record<string, PaidWeek[]> = paidDemoMetrics) {
  const rows = campaigns.filter(isRunning).map((campaign) => {
    const plan = campaignPlan(campaign);
    const spent = monthToDate(campaignWeeks(campaign, metrics));
    return { campaign, plan, monthly: plan.monthlyBudget, spent, ...budgetPacing(plan.monthlyBudget, spent, PAID_DEMO_MONTH.day, PAID_DEMO_MONTH.days) };
  });
  const monthly = rows.reduce((sum, row) => sum + row.monthly, 0);
  const spent = rows.reduce((sum, row) => sum + row.spent, 0);
  return { rows, monthly, spent, ...budgetPacing(monthly, spent, PAID_DEMO_MONTH.day, PAID_DEMO_MONTH.days), month: PAID_DEMO_MONTH };
}

/** Gasto del mes por canal, repartido según la distribución planificada de cada campaña. */
export function channelSpend(campaigns: ModuleRecord[], metrics: Record<string, PaidWeek[]> = paidDemoMetrics) {
  return spendByChannel(campaigns.filter(isRunning).map((campaign) => ({ channels: campaignPlan(campaign).channels, spend: monthToDate(campaignWeeks(campaign, metrics)) })));
}

/** Resumen por canal de una campaña (últimas 4 semanas demo), con eficiencia relativa de demostración. */
export function channelBreakdown(campaign: ModuleRecord, metrics: Record<string, PaidWeek[]> = paidDemoMetrics) {
  const weeks = campaignWeeks(campaign, metrics);
  const channels = campaignPlan(campaign).channels;
  const total = sharesTotal(channels) || 100;
  const entries = Object.entries(channels) as [PaidChannel, number][];
  if (!weeks) return { hasData: false, rows: entries.map(([channel, share]) => ({ channel, share: (share / total) * 100, spend: 0, impressions: 0, clicks: 0, leads: 0, cpl: 0 })), totals: { ...ZERO } };
  const totals = totalsOf(weeks.slice(-4));
  const weight = entries.reduce((sum, [channel, share]) => sum + share * (PAID_DEMO_CHANNEL_EFFICIENCY[channel] ?? 1), 0) || 1;
  const rows = entries.map(([channel, share]) => {
    const part = share / total;
    const leads = Math.round(totals.leads * ((share * (PAID_DEMO_CHANNEL_EFFICIENCY[channel] ?? 1)) / weight));
    const spend = totals.spend * part;
    return { channel, share: part * 100, spend, impressions: Math.round(totals.impressions * part), clicks: Math.round(totals.clicks * part), leads, cpl: leads ? spend / leads : 0 };
  });
  return { hasData: true, rows, totals };
}

export type PaidAlert = { id: string; light: Light; text: string; href?: string };
/** Alertas del Inicio: semáforos en rojo o amarillo, ritmo de gasto y pedidos con plazo comprometido. */
export function paidAlerts(input: { kpis: Kpi[]; budget: ReturnType<typeof monthlyBudget>; lateAds: { id: string; name: string; stage: string }[]; pendingPlans: { id: string; name: string }[] }) {
  const alerts: PaidAlert[] = [];
  for (const kpi of input.kpis.filter((item) => item.light === "rojo" || item.light === "amarillo")) {
    alerts.push({ id: `kpi-${kpi.id}`, light: kpi.light, text: `${kpi.label}: ${kpi.display} vs. objetivo ${kpi.targetDisplay}.` });
  }
  for (const row of input.budget.rows.filter((item) => item.light === "rojo" || item.light === "amarillo")) {
    const pct = Math.round(row.pacing * 100);
    alerts.push({ id: `pace-${row.campaign.id}`, light: row.light, text: `${row.campaign.values.nombre}: gasto al ${pct} % del ritmo esperado del mes${pct > 100 ? " (sobre-ejecución)" : " (sub-ejecución)"}.` });
  }
  for (const ad of input.lateAds) alerts.push({ id: `late-${ad.id}`, light: "rojo", text: `${ad.name}: «${ad.stage}» venció.` });
  for (const plan of input.pendingPlans) alerts.push({ id: `plan-${plan.id}`, light: "amarillo", text: `${plan.name}: planificación esperando validación del PM.` });
  return alerts;
}
