/* Builders puros de reportes. Reciben tareas, objetos de los módulos y métricas
 * (hoy fixtures DEMO, mañana integraciones) y devuelven view models listos para
 * presentar. No leen React, localStorage ni la red: se prueban en dominio. */
import { isArchivedTask, serviceForTask, tasksForClient, type ClientAttentionItem } from "../director-data";
import { serviceLabel, type OsClient, type OsTask, type ServiceId } from "../os-data";
import type {
  AudienceRow,
  BusinessModel,
  ContentMonth,
  DemoLine,
  MonthlyDemo,
  MonthlyIndicator,
  PaidWeek,
  PieceMetric,
} from "./demo-fixtures";

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

type ModuleScope = { activeServices: ServiceId[]; moduleFilter?: ServiceId | "todos" };
function inScope(serviceId: ServiceId | undefined, scope: ModuleScope) {
  if (!serviceId) return !scope.moduleFilter || scope.moduleFilter === "todos";
  if (!scope.activeServices.includes(serviceId)) return false;
  return !scope.moduleFilter || scope.moduleFilter === "todos" || scope.moduleFilter === serviceId;
}

/* ───────── Reporte semanal operativo ───────── */
export type WeeklyInput = {
  client: OsClient;
  activeServices: ServiceId[];
  moduleFilter?: ServiceId | "todos";
  tasks: OsTask[];
  period: string;
  owner: string;
  demo?: { delivered: DemoLine[]; delayed: DemoLine[] };
  attention: ClientAttentionItem[];
  recommendations: RecommendationInput[];
};

export type WeeklyServiceRow = { serviceId: ServiceId; label: string; open: number; done: number; blocked: number; approvals: number; late: number; state: "Atención" | "Revisión" | "En curso" | "Al día" };

export type WeeklyReport = {
  kind: "semanal";
  title: string;
  clientName: string;
  period: string;
  owner: string;
  moduleFilter: ServiceId | "todos";
  modules: { id: ServiceId; label: string }[];
  summary: string[];
  kpis: ReportKpi[];
  services: WeeklyServiceRow[];
  tasksDone: ReportLine[];
  deliverablesDone: ReportLine[];
  deliverablesLate: ReportLine[];
  blockers: ReportLine[];
  approvals: ReportLine[];
  nextSteps: ReportLine[];
  alerts: ReportLine[];
  recommendations: ReportLine[];
  actions: ReportLine[];
  chart: BarDatum[];
  conclusion: string;
  sources: ReportSource[];
};

export function buildWeeklyReport(input: WeeklyInput): WeeklyReport {
  const scope = { activeServices: input.activeServices, moduleFilter: input.moduleFilter };
  const all = tasksForClient(input.tasks, input.client.slug).filter((task) => inScope(serviceForTask(task), scope));
  const current = all.filter((task) => !isArchivedTask(task));
  const open = current.filter((task) => task.status !== "Hecho");
  const done = current.filter((task) => task.status === "Hecho");
  const blocked = open.filter((task) => task.blocked);
  const approvals = open.filter((task) => task.status === "En aprobación");
  const late = open.filter((task) => task.dueKind === "late");
  const upcoming = open.filter((task) => task.dueKind === "today" || task.dueKind === "week");
  const line = (task: OsTask, detail?: string, tone?: ReportLine["tone"]): ReportLine => ({ title: `${task.id} · ${task.title}`, detail, serviceId: serviceForTask(task), taskId: task.id, origin: "tareas", tone });

  const demoDelivered = (input.demo?.delivered ?? []).filter((item) => inScope(item.serviceId, scope));
  const demoDelayed = (input.demo?.delayed ?? []).filter((item) => inScope(item.serviceId, scope));
  const deliverablesDone: ReportLine[] = [
    ...done.filter((task) => task.deliverable).map((task) => line(task, `Entregable: ${task.deliverable}`)),
    ...demoDelivered.map((item) => ({ title: item.title, detail: item.detail, serviceId: item.serviceId, origin: "demo" as const })),
  ];
  const deliverablesLate: ReportLine[] = [
    ...late.map((task) => line(task, `Vencida ${task.due}${task.deliverable ? ` · ${task.deliverable}` : ""}`, "error")),
    ...demoDelayed.map((item) => ({ title: item.title, detail: item.detail, serviceId: item.serviceId, origin: "demo" as const, tone: "warning" as const })),
  ];

  const services: WeeklyServiceRow[] = input.activeServices
    .filter((serviceId) => inScope(serviceId, scope))
    .map((serviceId) => {
      const own = current.filter((task) => serviceForTask(task) === serviceId);
      const ownOpen = own.filter((task) => task.status !== "Hecho");
      const row = {
        serviceId,
        label: serviceLabel(serviceId),
        open: ownOpen.length,
        done: own.length - ownOpen.length,
        blocked: ownOpen.filter((task) => task.blocked).length,
        approvals: ownOpen.filter((task) => task.status === "En aprobación").length,
        late: ownOpen.filter((task) => task.dueKind === "late").length,
      };
      const state: WeeklyServiceRow["state"] = row.blocked || row.late ? "Atención" : row.approvals ? "Revisión" : row.open ? "En curso" : "Al día";
      return { ...row, state };
    });

  const alerts: ReportLine[] = input.attention
    .filter((item) => inScope(item.serviceId, scope))
    .map((item) => ({ title: item.title, detail: item.detail, serviceId: item.serviceId, origin: item.id.startsWith("TASK-") ? "tareas" : "demo", tone: item.tone }));

  const recommendations: ReportLine[] = input.recommendations
    .filter((item) => inScope(item.serviceId, scope) && item.status !== "Descartada")
    .sort((a, b) => ["Alta", "Media", "Baja"].indexOf(a.priority) - ["Alta", "Media", "Baja"].indexOf(b.priority))
    .slice(0, 5)
    .map((item) => ({ title: item.title, detail: `${item.rationale} · Prioridad ${item.priority} · ${item.status}`, serviceId: item.serviceId, origin: item.source === "Carga manual" ? "manual" : "demo" }));

  const actions: ReportLine[] = [
    ...blocked.map((task) => ({ title: `Destrabar ${task.id}`, detail: `${task.title}: ${task.blocked}`, serviceId: serviceForTask(task), taskId: task.id, origin: "tareas" as const, tone: "error" as const })),
    ...approvals.filter((task) => task.dueKind === "late" || task.dueKind === "today").map((task) => ({ title: `Pedir decisión sobre ${task.id}`, detail: `${task.title} · aprueba ${task.approver ?? "por asignar"}`, serviceId: serviceForTask(task), taskId: task.id, origin: "tareas" as const, tone: "warning" as const })),
    ...late.filter((task) => task.status !== "En aprobación").map((task) => ({ title: `Reprogramar o cerrar ${task.id}`, detail: `${task.title} venció el ${task.due}`, serviceId: serviceForTask(task), taskId: task.id, origin: "tareas" as const })),
  ].slice(0, 6);

  const scopeLabel = input.moduleFilter && input.moduleFilter !== "todos" ? serviceLabel(input.moduleFilter) : `${services.length} ${services.length === 1 ? "módulo activo" : "módulos activos"}`;
  const summary = [
    `${input.client.name} cierra la semana con ${open.length} tareas abiertas en ${scopeLabel}: ${done.length} realizadas, ${approvals.length} esperando aprobación y ${blocked.length} bloqueadas.`,
    blocked.length ? `El principal freno es ${blocked[0].id} (${blocked[0].title.toLocaleLowerCase("es")}): ${blocked[0].blocked}` : "No hay bloqueos activos registrados en las tareas.",
    late.length ? `${late.length} ${late.length === 1 ? "entrega está vencida" : "entregas están vencidas"} y requieren reprogramación o decisión.` : "No hay tareas vencidas.",
  ];

  const kpis: ReportKpi[] = [
    { label: "Tareas realizadas", value: String(done.length), origin: "tareas", note: "Hechas y no archivadas" },
    { label: "Entregables completados", value: String(deliverablesDone.length), origin: demoDelivered.length ? "demo" : "tareas", note: "Tareas con entregable + registros demo" },
    { label: "Entregables demorados", value: String(deliverablesLate.length), origin: demoDelayed.length ? "demo" : "tareas" },
    { label: "Bloqueos", value: String(blocked.length), origin: "tareas" },
    { label: "Aprobaciones pendientes", value: String(approvals.length), origin: "tareas" },
  ];

  const conclusion = blocked.length || late.length
    ? `La prioridad de la próxima semana es destrabar ${blocked.length + late.length} ${blocked.length + late.length === 1 ? "frente" : "frentes"} antes de sumar trabajo nuevo; el resto del plan avanza según lo previsto.`
    : approvals.length
      ? "La operación avanza sin bloqueos; conviene acelerar las aprobaciones pendientes para no demorar entregas."
      : "La operación está al día. Mantener el ritmo y revisar recomendaciones abiertas.";

  return {
    kind: "semanal",
    title: "Reporte semanal operativo",
    clientName: input.client.name,
    period: input.period,
    owner: input.owner,
    moduleFilter: input.moduleFilter ?? "todos",
    modules: input.activeServices.map((id) => ({ id, label: serviceLabel(id) })),
    summary,
    kpis,
    services,
    tasksDone: done.map((task) => line(task, task.completedAt ? `Completada · ${task.owner}` : task.owner)),
    deliverablesDone,
    deliverablesLate,
    blockers: blocked.map((task) => line(task, `${task.blocked}${task.blockedSince ? ` · hace ${task.blockedSince}` : ""}`, "error")),
    approvals: approvals.map((task) => line(task, `Aprueba ${task.approver ?? "por asignar"} · vence ${task.due}`, task.dueKind === "late" ? "error" : "warning")),
    nextSteps: upcoming.slice(0, 8).map((task) => line(task, `${task.owner} · ${task.dueKind === "today" ? "hoy" : task.due}`)),
    alerts,
    recommendations,
    actions,
    chart: services.map((row) => ({ label: row.label, value: row.done, secondary: row.open, display: `${row.done} hechas`, secondaryDisplay: `${row.open} abiertas` })),
    conclusion,
    sources: [
      { label: "Tareas del store único", origin: "tareas", detail: "Estados, bloqueos, aprobaciones, vencimientos y entregables por módulo. Guardado en este navegador." },
      { label: "Entregables sin tarea", origin: "demo", detail: "Entregas cerradas o demoradas cargadas como fixtures de ejemplo." },
      { label: "Alertas de la cuenta", origin: "demo", detail: "Tareas bloqueadas + alertas de demostración de la ficha." },
      { label: "Recomendaciones", origin: "demo", detail: "Precargadas como demostración y manuales guardadas en este navegador. Sin IA conectada." },
      { label: "Gestor de tareas externo / calendario", origin: "integracion", detail: "Alimentaría fechas reales de cierre y reuniones.", status: "No conectada" },
    ],
  };
}

/* ───────── Publicidad digital ───────── */
export type CampaignInput = { id: string; name: string; platform: string; objective: string; status: string; budget: number; source: "manual" | "demo" | "integration" };

export type PaidTotals = { spend: number; reach: number; impressions: number; clicks: number; leads: number; conversions: number; revenue: number; ctr: number; cpc: number; cpl: number; roas?: number };
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

export function totalsOf(weeks: PaidWeek[], model: BusinessModel): PaidTotals {
  const spend = sum(weeks, (week) => week.spend);
  const impressions = sum(weeks, (week) => week.impressions);
  const clicks = sum(weeks, (week) => week.clicks);
  const leads = sum(weeks, (week) => week.leads);
  const conversions = sum(weeks, (week) => week.conversions);
  const revenue = sum(weeks, (week) => week.revenue ?? 0);
  return {
    spend,
    reach: sum(weeks, (week) => week.reach),
    impressions,
    clicks,
    leads,
    conversions,
    revenue,
    ctr: safeDivide(clicks, impressions) * 100,
    cpc: safeDivide(spend, clicks),
    cpl: safeDivide(spend, leads),
    roas: model === "ecommerce" ? safeDivide(revenue, spend) : undefined,
  };
}

export function buildPaidMediaReport(input: {
  clientName: string;
  campaigns: CampaignInput[];
  metrics: Record<string, PaidWeek[]>;
  weeks: readonly string[];
  businessModel: BusinessModel;
  period: string;
  previousPeriod: string;
}): PaidReport {
  const half = Math.floor(input.weeks.length / 2);
  const withData = input.campaigns.filter((campaign) => input.metrics[campaign.id]?.some((week) => week.spend > 0));
  const currentWeeks = (id: string) => (input.metrics[id] ?? []).slice(half);
  const previousWeeks = (id: string) => (input.metrics[id] ?? []).slice(0, half);
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

const PRODUCED = new Set(["En producción", "En revisión", "En aprobación", "Cambios pedidos", "Programada", "Publicada"]);

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
  const published = input.pieces.filter((piece) => piece.status === "Publicada");
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
  input.pieces.forEach((piece) => statusCounts.set(piece.status, (statusCounts.get(piece.status) ?? 0) + 1));
  const pendingApproval = input.pieces.filter((piece) => piece.status === "En aprobación").length;

  const kpi = (label: string, current: number, previous: number | undefined, format: (value: number) => string, origin: SourceOrigin = "demo"): ReportKpi => ({
    label,
    value: format(current),
    previous: previous !== undefined ? format(previous) : undefined,
    delta: previous !== undefined ? percentChange(current, previous) : undefined,
    better: "up",
    origin,
  });

  const produced = input.pieces.filter((piece) => PRODUCED.has(piece.status)).length;
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

/* ───────── Reporte mensual de resultados ───────── */
export type MonthlyReport = {
  kind: "mensual";
  title: string;
  clientName: string;
  period: string;
  previousPeriod: string;
  owner: string;
  summary: string[];
  objectives: MonthlyDemo["objectives"];
  activities: ReportLine[];
  results: { serviceId: ServiceId; label: string; indicators: (MonthlyIndicator & { origin: SourceOrigin; delta?: number })[] }[];
  kpis: ReportKpi[];
  comparison: BarDatum[];
  learnings: string[];
  opportunities: string[];
  recommendations: ReportLine[];
  nextActions: ReportLine[];
  conclusion: string;
  sources: ReportSource[];
};

export function buildMonthlyReport(input: {
  client: OsClient;
  activeServices: ServiceId[];
  tasks: OsTask[];
  demo?: MonthlyDemo;
  paid?: PaidReport;
  content?: ContentReport;
  recommendations: RecommendationInput[];
  period: string;
  previousPeriod: string;
  owner: string;
}): MonthlyReport {
  const scope = { activeServices: input.activeServices };
  const tasks = tasksForClient(input.tasks, input.client.slug).filter((task) => inScope(serviceForTask(task), scope));
  const current = tasks.filter((task) => !isArchivedTask(task));
  const open = current.filter((task) => task.status !== "Hecho");
  const done = tasks.filter((task) => task.status === "Hecho");

  const results = input.activeServices.map((serviceId) => {
    const indicators: (MonthlyIndicator & { origin: SourceOrigin; delta?: number })[] = [];
    if (serviceId === "publicidad-digital" && input.paid?.hasData) {
      const { totals, previousTotals } = input.paid;
      indicators.push(
        { label: "Inversión", current: totals.spend, previous: previousTotals.spend, unit: "ARS", better: "up", origin: "demo" },
        { label: "Leads", current: totals.leads, previous: previousTotals.leads, better: "up", origin: "demo" },
        { label: "CPL", current: Math.round(totals.cpl), previous: Math.round(previousTotals.cpl), unit: "ARS", better: "down", origin: "demo" },
      );
    }
    if (serviceId === "contenidos" && input.content?.currentMonth && input.content.previousMonth) {
      indicators.push({ label: "Alcance orgánico", current: input.content.currentMonth.reach, previous: input.content.previousMonth.reach, better: "up", origin: "demo" });
    }
    for (const indicator of input.demo?.results[serviceId] ?? []) indicators.push({ ...indicator, origin: "demo" });
    const ownOpen = open.filter((task) => serviceForTask(task) === serviceId).length;
    const ownDone = done.filter((task) => serviceForTask(task) === serviceId).length;
    indicators.push({ label: "Tareas cerradas", current: ownDone, previous: 0, better: "up", origin: "tareas" });
    indicators.push({ label: "Tareas abiertas", current: ownOpen, previous: 0, better: "down", origin: "tareas" });
    return {
      serviceId,
      label: serviceLabel(serviceId),
      indicators: indicators.map((indicator) => ({ ...indicator, delta: indicator.origin === "tareas" ? undefined : percentChange(indicator.current, indicator.previous) })),
    };
  });

  const comparison: BarDatum[] = results.flatMap((result) => result.indicators
    .filter((indicator) => indicator.delta !== undefined)
    .map((indicator) => {
      const delta = indicator.delta ?? 0;
      const good = indicator.better === "up" ? delta >= 0 : delta <= 0;
      return { label: `${indicator.label} · ${result.label}`, value: Number(delta.toFixed(1)), secondary: good ? 1 : 0, display: `${delta > 0 ? "+" : ""}${formatNumber(delta, 1)} %` };
    }));

  const better = comparison.filter((item) => item.secondary === 1).length;
  const recommendations: ReportLine[] = input.recommendations
    .filter((item) => input.activeServices.includes(item.serviceId) && item.status !== "Descartada")
    .slice(0, 5)
    .map((item) => ({ title: item.title, detail: item.rationale, serviceId: item.serviceId, origin: item.source === "Carga manual" ? "manual" : "demo" }));

  return {
    kind: "mensual",
    title: "Reporte mensual de resultados",
    clientName: input.client.name,
    period: input.period,
    previousPeriod: input.previousPeriod,
    owner: input.owner,
    summary: [
      `${input.period}: ${better} de ${comparison.length} indicadores comparables mejoraron frente a ${input.previousPeriod}.`,
      input.paid?.hasData ? `Publicidad digital generó ${formatNumber(input.paid.totals.leads)} leads con un CPL de $ ${formatNumber(input.paid.totals.cpl)}.` : "",
      input.content ? `Contenidos publicó ${input.content.currentMonth?.published ?? input.content.published} piezas con ${formatNumber(input.content.currentMonth?.reach ?? input.content.totals.reach)} de alcance.` : "",
      `Quedan ${open.length} tareas abiertas y ${open.filter((task) => task.blocked).length} bloqueos para el próximo mes.`,
    ].filter(Boolean),
    objectives: input.demo?.objectives ?? [{ objective: input.client.context.objective, indicator: "Objetivo de la ficha", target: "—", current: "Sin medición cargada", status: "Sin datos" }],
    activities: [
      ...done.slice(0, 6).map((task) => ({ title: `${task.id} · ${task.title}`, detail: task.owner, serviceId: serviceForTask(task), taskId: task.id, origin: "tareas" as const })),
      ...(input.demo?.activities ?? []).filter((item) => input.activeServices.includes(item.serviceId)).map((item) => ({ title: item.title, serviceId: item.serviceId, origin: "demo" as const })),
    ],
    results,
    kpis: [
      { label: "Indicadores que mejoraron", value: `${better}/${comparison.length}`, origin: "demo" },
      { label: "Tareas cerradas", value: String(done.length), origin: "tareas", note: "Incluye archivadas" },
      { label: "Tareas abiertas", value: String(open.length), origin: "tareas" },
      { label: "Objetivos en riesgo", value: String((input.demo?.objectives ?? []).filter((item) => item.status === "En riesgo").length), origin: "demo" },
    ],
    comparison,
    learnings: input.demo?.learnings ?? [],
    opportunities: input.demo?.opportunities ?? [],
    recommendations,
    nextActions: open
      .filter((task) => task.prio === "Alta" || task.blocked || task.dueKind === "late")
      .slice(0, 6)
      .map((task) => ({ title: `${task.id} · ${task.title}`, detail: `${task.owner} · ${task.dueKind === "late" ? `vencida ${task.due}` : task.due}`, serviceId: serviceForTask(task), taskId: task.id, origin: "tareas" as const, tone: task.blocked ? "error" as const : undefined })),
    conclusion: better >= comparison.length / 2
      ? "El mes muestra una mejora general. El próximo período debe consolidar lo que funcionó y cerrar los bloqueos abiertos."
      : "El mes tiene más indicadores en retroceso que en mejora. Priorizar las acciones de destrabe y revisar el plan con el cliente.",
    sources: [
      { label: "Tareas del store único", origin: "tareas", detail: "Actividades realizadas, tareas abiertas y próximas acciones." },
      { label: "Objetivos, indicadores y aprendizajes", origin: "demo", detail: "Fixtures de ejemplo por cliente." },
      { label: "Reportes de Publicidad digital y Contenidos", origin: "demo", detail: "Se reutilizan sus totales cuando el módulo está activo." },
      { label: "Plan de Marketing", origin: "integracion", detail: "Objetivos validados del plan (otro equipo lo está reorganizando).", status: "No conectada" },
    ],
  };
}
