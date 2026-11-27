/* Publicidad digital · modelo de dominio (Funcionalidades 2).
 * Funciones puras, sin React ni localStorage, para poder probarlas aisladas:
 * - Plan de la campaña (Instancia 1) con compatibilidad de lectura de campañas anteriores.
 * - Pedido de anuncio / landing / atención (Instancia 2) y su brief.
 * - Flujo del anuncio: Content → PM → Diseño → PM → Cliente → Puesta en circulación,
 *   con una sola tarea por pedido que se reasigna en cada etapa.
 * - Plazos por etapa calculados hacia atrás desde la fecha en que se necesita la pieza.
 * - Semáforos, presupuesto y gasto por canal a partir de métricas DE DEMOSTRACIÓN. */
import { canEditService } from "../director-data";
import { osProjects, type OsClient, type OsTask } from "../os-data";
import { previewActor, type PreviewRole } from "../preview-roles";
import { serviceHref } from "../service-workspace-data";
import { dueKindForDate, type WorkflowNotification } from "../workflow-tasks";
import type { ModuleRecord } from "./types";

export const PAID_SERVICE = "publicidad-digital" as const;

/* ───────── Canales ───────── */
/** Canales de pauta de la especificación. Ninguno está conectado en esta preview. */
export const SPEC_CHANNELS = ["Meta Ads", "Google Ads", "TikTok Ads", "ChatGPT Ads"] as const;
/** LinkedIn Ads se conserva porque ya lo usan campañas B2B guardadas (EPSA). */
export const PAID_CHANNELS = [...SPEC_CHANNELS, "LinkedIn Ads"] as const;
export type PaidChannel = typeof PAID_CHANNELS[number];

/* ───────── Plan de la campaña (Instancia 1) ───────── */
export const PLAN_STATES = ["Borrador", "En validación del PM", "Devuelta al Líder técnico", "Aprobada"] as const;
export type PlanState = typeof PLAN_STATES[number];
export const PLAN_STEPS = [
  { id: "target", label: "Target", hint: "ICP, segmento o target del Discovery" },
  { id: "productos", label: "Productos o servicios", hint: "Qué promociona, desde el Discovery" },
  { id: "presupuesto", label: "Presupuesto", hint: "Mensual y del período" },
  { id: "canales", label: "Canales", hint: "Distribución por canal (100 %)" },
  { id: "enfoque", label: "Enfoque publicitario", hint: "Mensaje, ángulo y funnel" },
  { id: "anuncios", label: "Anuncios", hint: "Meta Ads, Google Ads y otros" },
  { id: "landing", label: "Landing", hint: "Página de destino" },
  { id: "estimulos", label: "Estímulos posteriores", hint: "WhatsApp, CRM y email" },
] as const;
export type PlanStepId = typeof PLAN_STEPS[number]["id"];
export const FUNNEL_STAGES = ["Descubrimiento", "Retargeting", "Conversión", "Otra"] as const;

export type CampaignPlan = {
  state: PlanState;
  step: number;
  icpIds: string[];
  segmentIds: string[];
  productIds: string[];
  audience: string;
  monthlyBudget: number;
  periodBudget: number;
  channels: Partial<Record<PaidChannel, number>>;
  focus: string;
  message: string;
  funnel: string[];
  metaAds: string;
  googleAds: string;
  otherAds: string;
  landing: string;
  whatsapp: string;
  crm: string;
  email: string;
  /** La campaña se cargó antes del paso a paso (sin plan estructurado). */
  legacy: boolean;
};

const list = (value?: string) => (value || "").split(",").map((item) => item.trim()).filter(Boolean);
export const joinList = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).join(",");

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { const value: unknown = JSON.parse(raw); return (value ?? fallback) as T; } catch { return fallback; }
}

export function isPaidChannel(value: string): value is PaidChannel {
  return (PAID_CHANNELS as readonly string[]).includes(value);
}

/** Distribución por canal guardada como JSON. Campañas anteriores: 100 % al canal de «plataforma». */
export function channelShares(values: Record<string, string>): Partial<Record<PaidChannel, number>> {
  const stored = parseJson<Record<string, unknown>>(values.canales, {});
  const result: Partial<Record<PaidChannel, number>> = {};
  for (const [key, raw] of Object.entries(stored)) {
    const share = Number(raw);
    if (isPaidChannel(key) && Number.isFinite(share) && share > 0) result[key] = share;
  }
  if (Object.keys(result).length) return result;
  return isPaidChannel(values.plataforma || "") ? { [values.plataforma as PaidChannel]: 100 } : {};
}

/** Meses (redondeados hacia arriba, mínimo 1) entre inicio y fin, para derivar el presupuesto mensual de campañas anteriores. */
export function monthsBetween(start?: string, end?: string) {
  const a = Date.parse(`${(start || "").slice(0, 10)}T12:00:00Z`);
  const b = Date.parse(`${(end || "").slice(0, 10)}T12:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 1;
  return Math.max(1, Math.ceil((b - a) / (86400000 * 30.4)));
}

/** Lee el plan con compatibilidad: una campaña activa, pausada o finalizada de antes del paso a paso cuenta como aprobada. */
export function campaignPlan(record: ModuleRecord): CampaignPlan {
  const v = record.values;
  const legacy = !v.planEstado;
  const state: PlanState = (PLAN_STATES as readonly string[]).includes(v.planEstado)
    ? v.planEstado as PlanState
    : ["Activa", "Pausada", "Finalizada"].includes(v.estado) ? "Aprobada" : "Borrador";
  const periodBudget = Number(v.presupuesto) || 0;
  return {
    state,
    step: Math.min(PLAN_STEPS.length - 1, Math.max(0, Number(v.pasoPlan) || 0)),
    icpIds: list(v.icpIds),
    segmentIds: list(v.segmentoIds),
    productIds: list(v.productoIds),
    audience: v.audiencia || "",
    monthlyBudget: Number(v.presupuestoMensual) || (periodBudget ? Math.round(periodBudget / monthsBetween(v.inicio, v.fin)) : 0),
    periodBudget,
    channels: channelShares(v),
    focus: v.enfoque || v.propuestaCreativa || "",
    message: v.mensaje || "",
    funnel: list(v.funnel),
    metaAds: v.metaAds || "",
    googleAds: v.googleAds || "",
    otherAds: v.otrosCanales || "",
    landing: v.landing || "",
    whatsapp: v.estimuloWhatsapp || "",
    crm: v.estimuloCrm || "",
    email: v.estimuloEmail || "",
    legacy,
  };
}

export function sharesTotal(channels: Partial<Record<PaidChannel, number>>) {
  return Object.values(channels).reduce<number>((sum, value) => sum + (Number(value) || 0), 0);
}

/** Canal con mayor participación: se guarda en «plataforma» para que reportes anteriores sigan funcionando. */
export function mainChannel(channels: Partial<Record<PaidChannel, number>>) {
  return (Object.entries(channels) as [PaidChannel, number][]).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

/** Errores que impiden avanzar desde un paso (o enviar a validación si se pasa «all»). */
export function planStepErrors(values: Record<string, string>, step: PlanStepId | "all"): string[] {
  const errors: string[] = [];
  const check = (id: PlanStepId) => step === "all" || step === id;
  if (check("target")) {
    if (!values.nombre?.trim()) errors.push("Completá el nombre de la campaña.");
    if (!values.objetivo?.trim()) errors.push("Elegí el objetivo.");
    if (!list(values.icpIds).length && !list(values.segmentoIds).length && !values.audiencia?.trim()) errors.push("Indicá a qué ICP, segmento o target apunta.");
    if (!values.inicio) errors.push("Indicá la fecha de inicio.");
    if (values.fin && values.inicio && values.fin < values.inicio) errors.push("La fecha de fin no puede ser anterior al inicio.");
  }
  if (check("productos") && !list(values.productoIds).length && !values.productosTexto?.trim()) errors.push("Elegí al menos un producto o servicio (o describilo si el Discovery no tiene ofertas cargadas).");
  if (check("presupuesto")) {
    const monthly = Number(values.presupuestoMensual);
    if (!Number.isFinite(monthly) || monthly <= 0) errors.push("Indicá el presupuesto mensual (mayor a 0).");
    if (values.presupuesto && (!Number.isFinite(Number(values.presupuesto)) || Number(values.presupuesto) < 0)) errors.push("El presupuesto del período debe ser un número.");
  }
  if (check("canales")) {
    const shares = parseJson<Record<string, unknown>>(values.canales, {});
    const total = Object.values(shares).reduce<number>((sum, value) => sum + (Number(value) || 0), 0);
    if (!Object.values(shares).some((value) => Number(value) > 0)) errors.push("Asigná al menos un canal.");
    else if (Math.abs(total - 100) > 0.001) errors.push(`La distribución por canal debe sumar 100 % (hoy suma ${Math.round(total * 10) / 10} %).`);
  }
  if (check("enfoque") && !values.enfoque?.trim()) errors.push("Describí el enfoque publicitario.");
  return errors;
}

export type PlanAction = "submit" | "approve" | "return";
export type PaidContext = { actor: string; at: string; comment?: string };
export type PaidComment = { id: string; actor: string; at: string; text: string; version?: number; stage?: string; kind?: "comentario" | "devolucion" | "aprobacion" };

export function paidComments(raw?: string) {
  const value = parseJson<unknown>(raw, []);
  return Array.isArray(value) ? value as PaidComment[] : [];
}

function pushComment(raw: string | undefined, comment: Omit<PaidComment, "id">) {
  const all = paidComments(raw);
  return JSON.stringify([...all, { id: `COM-${Date.parse(comment.at).toString(36)}-${all.length + 1}`, ...comment }]);
}

/** Envío a validación del PM, aprobación o devolución con comentario. */
export function applyPlanAction(campaign: ModuleRecord, action: PlanAction, ctx: PaidContext): ModuleRecord {
  const plan = campaignPlan(campaign);
  const note = ctx.comment?.trim() || "";
  let patch: Record<string, string>;
  let text: string;
  if (action === "submit") {
    if (!["Borrador", "Devuelta al Líder técnico"].includes(plan.state)) throw new Error("La planificación ya fue enviada.");
    const errors = planStepErrors(campaign.values, "all");
    if (errors.length) throw new Error(errors[0]);
    patch = { planEstado: "En validación del PM", enviadoEn: ctx.at };
    text = "Envió la planificación a validación del PM";
  } else if (action === "approve") {
    if (plan.state !== "En validación del PM") throw new Error("Solo se aprueba una planificación en validación.");
    patch = { planEstado: "Aprobada", aprobadoPor: ctx.actor, aprobadoEn: ctx.at, estado: campaign.values.estado === "Borrador" || !campaign.values.estado ? "En preparación" : campaign.values.estado };
    text = "Aprobó la planificación · se habilita la Instancia 2 (brief y desarrollo de piezas)";
  } else {
    if (plan.state !== "En validación del PM") throw new Error("Solo se devuelve una planificación en validación.");
    if (!note) throw new Error("Escribí qué hay que ajustar antes de devolver la planificación.");
    patch = { planEstado: "Devuelta al Líder técnico" };
    text = "Devolvió la planificación al Líder técnico";
  }
  const comments = note || action !== "submit" ? pushComment(campaign.values.planComentarios, { actor: ctx.actor, at: ctx.at, text: note || (action === "approve" ? "Planificación aprobada." : ""), kind: action === "return" ? "devolucion" : action === "approve" ? "aprobacion" : "comentario" }) : campaign.values.planComentarios || "";
  return {
    ...campaign, user: ctx.actor, updatedAt: ctx.at,
    values: { ...campaign.values, ...patch, planComentarios: comments },
    history: [{ at: ctx.at, user: ctx.actor, text: note ? `${text} · ${note}` : text }, ...campaign.history],
  };
}

/* ───────── Pedidos de piezas y flujo del anuncio ───────── */
export const PIECE_KINDS = ["Reel", "Carrusel", "Placa", "Historia", "Video", "Texto de búsqueda", "Banner", "Landing"] as const;
export type AdType = "Anuncio" | "Landing page" | "Atención por mail" | "Atención por WhatsApp";

export const AD_STAGES = ["Opciones de Content", "Validación del PM", "Diseño", "Validación del diseño", "Aprobación del cliente", "Puesta en circulación"] as const;
export type AdStage = typeof AD_STAGES[number];
export const AD_TERMINAL = ["En circulación", "Finalizado"] as const;
export type AdState = AdStage | typeof AD_TERMINAL[number];
export type PaidWho = "lt" | "pm" | "content" | "designer" | "client";

export const STAGE_OWNER: Record<AdState, PaidWho> = {
  "Opciones de Content": "content",
  "Validación del PM": "pm",
  Diseño: "designer",
  "Validación del diseño": "pm",
  "Aprobación del cliente": "client",
  "Puesta en circulación": "lt",
  "En circulación": "lt",
  Finalizado: "lt",
};
export const WHO_LABEL: Record<PaidWho, string> = { lt: "Líder técnico", pm: "PM", content: "Content", designer: "Diseño", client: "Cliente" };

/** Plazos por etapa en días hábiles. A DEFINIR con Avans: la especificación dice que «los plazos concretos se definen más adelante». */
export const PAID_STAGE_DAYS: Record<AdStage, number> = {
  "Opciones de Content": 3,
  "Validación del PM": 1,
  Diseño: 3,
  "Validación del diseño": 1,
  "Aprobación del cliente": 2,
  "Puesta en circulación": 1,
};
/** Agrupación de plazos de la especificación: Content y validación por un lado, diseño por otro. */
export const STAGE_GROUP: Record<AdStage, string> = {
  "Opciones de Content": "Content y validación",
  "Validación del PM": "Content y validación",
  Diseño: "Diseño",
  "Validación del diseño": "Diseño",
  "Aprobación del cliente": "Cliente y circulación",
  "Puesta en circulación": "Cliente y circulación",
};

/** La atención por mail o WhatsApp no pasa por diseño. */
export function adStages(type?: string): AdStage[] {
  return type === "Atención por mail" || type === "Atención por WhatsApp"
    ? ["Opciones de Content", "Validación del PM", "Aprobación del cliente", "Puesta en circulación"]
    : [...AD_STAGES];
}

export function isAdState(value?: string): value is AdState {
  return (AD_STAGES as readonly string[]).includes(value || "") || (AD_TERMINAL as readonly string[]).includes(value || "");
}

export function adState(record: ModuleRecord): AdState {
  return isAdState(record.values.etapa) ? record.values.etapa : "Opciones de Content";
}

/* Fechas en días hábiles (lunes a viernes; feriados a definir). */
function toDate(value: string) { return new Date(`${value.slice(0, 10)}T12:00:00Z`); }
function isoDate(date: Date) { return date.toISOString().slice(0, 10); }
export function isBusinessDay(value: string) { const day = toDate(value).getUTCDay(); return day !== 0 && day !== 6; }
export function addBusinessDays(value: string, days: number) {
  const date = toDate(value);
  const step = days < 0 ? -1 : 1;
  let left = Math.abs(days);
  while (left > 0) {
    date.setUTCDate(date.getUTCDate() + step);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) left -= 1;
  }
  return isoDate(date);
}
/** Último día hábil igual o anterior a la fecha. */
export function previousBusinessDay(value: string) {
  const date = toDate(value);
  while ([0, 6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() - 1);
  return isoDate(date);
}
export function businessDaysBetween(from: string, to: string) {
  if (from === to) return 0;
  const sign = to > from ? 1 : -1;
  let count = 0;
  let cursor = from.slice(0, 10);
  while (cursor !== to.slice(0, 10) && Math.abs(count) < 400) { cursor = addBusinessDays(cursor, sign); count += sign; if (sign > 0 ? cursor > to : cursor < to) break; }
  return count;
}

export type StageDeadline = { stage: AdStage; start: string; due: string; days: number; group: string };
/**
 * Plazos hacia atrás desde la fecha en que se necesita la pieza en circulación:
 * la última etapa vence ese día y cada etapa anterior vence cuando empieza la siguiente.
 */
export function computeAdDeadlines(neededDate: string, type?: string, durations: Record<AdStage, number> = PAID_STAGE_DAYS): StageDeadline[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(neededDate)) return [];
  const stages = adStages(type);
  const result: StageDeadline[] = [];
  let due = previousBusinessDay(neededDate);
  for (const stage of [...stages].reverse()) {
    const days = Math.max(0, durations[stage] ?? 0);
    const start = addBusinessDays(due, -days);
    result.unshift({ stage, start, due, days, group: STAGE_GROUP[stage] });
    due = start;
  }
  return result;
}

/** Diagnóstico de plazos: si el pedido llega tarde para cumplir la fecha necesaria. */
export function deadlineHealth(deadlines: StageDeadline[], today: string) {
  if (!deadlines.length) return { ok: false, late: 0, message: "Sin fecha necesaria: no se calcularon plazos." };
  const start = deadlines[0].start;
  if (start >= today) return { ok: true, late: 0, message: `Hay margen: el Content puede empezar hasta el ${start}.` };
  const late = businessDaysBetween(start, today);
  return { ok: false, late, message: `Plazo comprometido: el pedido llega ${late} ${late === 1 ? "día hábil" : "días hábiles"} tarde para la fecha necesaria.` };
}

export function storedDeadlines(record: ModuleRecord): StageDeadline[] {
  const stored = parseJson<unknown>(record.values.plazos, null);
  if (Array.isArray(stored) && stored.every((item) => item && typeof item === "object" && "stage" in item && "due" in item)) return stored as StageDeadline[];
  return computeAdDeadlines(record.values.fechaNecesaria || "", record.values.tipo);
}

export function stageDue(record: ModuleRecord, stage: AdState) {
  return storedDeadlines(record).find((item) => item.stage === stage)?.due || record.values.fechaNecesaria || "";
}

export type AdRequestInput = {
  nombre: string; campana: string; tipo: AdType; canal: string; funnel: string; piezas: string[];
  insight: string; respuesta: string; beneficio: string; propuesta: string; rtb: string; cta: string;
  detalle?: string; fechaNecesaria: string; origen?: string;
};

export function adRequestErrors(input: AdRequestInput) {
  const errors: string[] = [];
  if (!input.nombre.trim()) errors.push("Poné un nombre al pedido.");
  if (!input.campana) errors.push("El pedido tiene que pertenecer a una campaña.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fechaNecesaria)) errors.push("Indicá para cuándo se necesita (AAAA-MM-DD).");
  if (input.tipo === "Anuncio") {
    if (!input.insight.trim()) errors.push("Completá qué insight querés probar.");
    if (!input.respuesta.trim()) errors.push("Completá la respuesta al insight.");
    if (!input.beneficio.trim()) errors.push("Completá el beneficio para el cliente.");
    if (!input.propuesta.trim()) errors.push("Completá la propuesta concreta.");
    if (!input.rtb.trim()) errors.push("Completá el reason to believe.");
    if (!input.cta.trim()) errors.push("Completá el call to action.");
    if (!input.funnel) errors.push("Elegí la etapa del funnel.");
    if (!input.piezas.length) errors.push("Elegí qué piezas querés que se generen.");
  } else if (!input.detalle?.trim() && !input.propuesta.trim()) errors.push("Describí qué necesitás en el brief.");
  return errors;
}

/** Brief que recibe el Content como tarea (texto legible, se guarda con el pedido). */
export function composeAdBrief(input: AdRequestInput, campaign?: ModuleRecord, discovery?: { icps: string[]; products: string[] }) {
  const plan = campaign ? campaignPlan(campaign) : undefined;
  const lines = [
    `Brief de ${input.tipo.toLowerCase()} · ${input.nombre}`,
    campaign ? `Campaña: ${campaign.values.nombre || campaign.id}${campaign.values.objetivo ? ` · objetivo ${campaign.values.objetivo.toLowerCase()}` : ""}` : "",
    discovery?.icps.length ? `Target (Discovery): ${discovery.icps.join(" · ")}` : plan?.audience ? `Target: ${plan.audience}` : "",
    discovery?.products.length ? `Productos o servicios: ${discovery.products.join(" · ")}` : "",
    plan?.focus ? `Enfoque de la campaña: ${plan.focus}` : "",
    input.canal ? `Canal: ${input.canal}` : "",
    input.funnel ? `Etapa del funnel: ${input.funnel}` : "",
    input.insight ? `Insight a probar: ${input.insight}` : "",
    input.respuesta ? `Respuesta al insight: ${input.respuesta}` : "",
    input.beneficio ? `Beneficio para el cliente: ${input.beneficio}` : "",
    input.propuesta ? `Propuesta concreta: ${input.propuesta}` : "",
    input.rtb ? `Reason to believe: ${input.rtb}` : "",
    input.cta ? `Call to action: ${input.cta}` : "",
    input.piezas.length ? `Piezas a generar: ${input.piezas.join(", ")}` : "",
    input.detalle ? `Detalle: ${input.detalle}` : "",
    `Se necesita en circulación el ${input.fechaNecesaria}.`,
  ];
  return lines.filter(Boolean).join("\n");
}

/** Crea el registro del pedido (sin guardar). La tarea se arma con buildAdTask. */
export function createAdRecord(clientSlug: string, id: string, input: AdRequestInput, ctx: PaidContext & { brief: string }): ModuleRecord {
  const errors = adRequestErrors(input);
  if (errors.length) throw new Error(errors[0]);
  const deadlines = computeAdDeadlines(input.fechaNecesaria, input.tipo);
  return {
    id, client: clientSlug, module: PAID_SERVICE, collection: "anuncios", source: "manual", user: ctx.actor, createdAt: ctx.at, updatedAt: ctx.at,
    values: {
      nombre: input.nombre.trim(), campana: input.campana, tipo: input.tipo, canal: input.canal, funnel: input.funnel, piezas: joinList(input.piezas),
      insight: input.insight.trim(), respuesta: input.respuesta.trim(), beneficio: input.beneficio.trim(), propuesta: input.propuesta.trim(), rtb: input.rtb.trim(), cta: input.cta.trim(),
      detalle: input.detalle?.trim() || "", fechaNecesaria: input.fechaNecesaria, plazos: JSON.stringify(deadlines), etapa: "Opciones de Content", version: "1",
      brief: ctx.brief, solicitadoPor: ctx.actor, origen: input.origen || "Instancia 2", comentarios: "[]",
    },
    history: [{ at: ctx.at, user: ctx.actor, text: `Pidió ${input.tipo === "Anuncio" ? "un anuncio" : input.tipo === "Landing page" ? "una landing page" : "un brief de atención"} · el brief llegó al Content` }],
  };
}

export type AdAction = "send-to-pm" | "pm-approve" | "pm-return" | "design-ready" | "pm-approve-design" | "pm-return-design" | "client-approve" | "client-changes" | "launch" | "finish";
export const AD_ACTIONS: Record<AdAction, { label: string; from: AdState; who: PaidWho; needsComment?: boolean }> = {
  "send-to-pm": { label: "Enviar a validación del PM", from: "Opciones de Content", who: "content" },
  "pm-approve": { label: "Aprobar y pasar a la etapa siguiente", from: "Validación del PM", who: "pm" },
  "pm-return": { label: "Devolver al Content", from: "Validación del PM", who: "pm", needsComment: true },
  "design-ready": { label: "Enviar piezas a validación del PM", from: "Diseño", who: "designer" },
  "pm-approve-design": { label: "Aprobar diseño y enviar al cliente", from: "Validación del diseño", who: "pm" },
  "pm-return-design": { label: "Pedir ajustes de diseño", from: "Validación del diseño", who: "pm", needsComment: true },
  "client-approve": { label: "Aprobar anuncio", from: "Aprobación del cliente", who: "client" },
  "client-changes": { label: "Pedir cambios", from: "Aprobación del cliente", who: "client", needsComment: true },
  launch: { label: "Marcar en circulación", from: "Puesta en circulación", who: "lt" },
  finish: { label: "Finalizar · pasa a anuncios anteriores", from: "En circulación", who: "lt" },
};

export function adActionsFor(record: ModuleRecord): AdAction[] {
  const state = adState(record);
  return (Object.keys(AD_ACTIONS) as AdAction[]).filter((action) => AD_ACTIONS[action].from === state);
}

function nextStage(type: string | undefined, from: AdState): AdState {
  if (from === "Puesta en circulación") return "En circulación";
  if (from === "En circulación") return "Finalizado";
  const stages = adStages(type);
  const index = stages.indexOf(from as AdStage);
  return stages[index + 1] ?? "En circulación";
}

/** Etapa a la que vuelve un pedido cuando el PM o el cliente piden cambios. */
export function returnStage(type: string | undefined, action: AdAction): AdState {
  if (action === "pm-return") return "Opciones de Content";
  if (action === "pm-return-design") return "Diseño";
  // Cliente: si la pieza tiene diseño vuelve a Diseño; la atención por mail o WhatsApp vuelve al Content.
  return adStages(type).includes("Diseño") ? "Diseño" : "Opciones de Content";
}

export function safeHttpUrl(value: string) {
  try { const url = new URL(value.trim()); return ["https:", "http:"].includes(url.protocol) ? url.href : ""; } catch { return ""; }
}

/** Transición del flujo del anuncio. Valida etapa, comentario obligatorio en devoluciones y datos mínimos de cada etapa. */
export function applyAdAction(record: ModuleRecord, action: AdAction, ctx: PaidContext & { patch?: Record<string, string> }): ModuleRecord {
  const def = AD_ACTIONS[action];
  const state = adState(record);
  if (!def) throw new Error("Acción desconocida.");
  if (def.from !== state) throw new Error(`El pedido está en «${state}»: no se puede «${def.label.toLowerCase()}».`);
  const note = ctx.comment?.trim() || "";
  if (def.needsComment && !note) throw new Error("Escribí el comentario con los cambios pedidos.");
  if (note.length > 2000) throw new Error("El comentario supera los 2000 caracteres.");
  const values = { ...record.values, ...(ctx.patch || {}) };
  if (action === "send-to-pm" && !values.propuestaContent?.trim()) throw new Error("Elegí y ajustá la opción que vas a enviar al PM.");
  if (action === "design-ready") {
    const link = safeHttpUrl(values.enlacePieza || "");
    if (!link) throw new Error("Agregá el enlace (http/https) a las piezas diseñadas.");
    values.enlacePieza = link;
  }
  const returning = action === "pm-return" || action === "pm-return-design" || action === "client-changes";
  const to = returning ? returnStage(values.tipo, action) : nextStage(values.tipo, state);
  const version = Number(values.version) || 1;
  if (returning) values.version = String(version + 1);
  if (action === "launch") values.fechaCirculacion = ctx.at.slice(0, 10);
  if (action === "finish") values.fechaFin = ctx.at.slice(0, 10);
  values.etapa = to;
  values.devuelto = returning ? note : "";
  const kind: PaidComment["kind"] = returning ? "devolucion" : action.includes("approve") ? "aprobacion" : "comentario";
  if (note || returning || action.includes("approve")) values.comentarios = pushComment(record.values.comentarios, { actor: ctx.actor, at: ctx.at, text: note || `${def.label}.`, version, stage: state, kind });
  return {
    ...record, user: ctx.actor, updatedAt: ctx.at, values,
    history: [{ at: ctx.at, user: ctx.actor, text: `${def.label} · ${state} → ${to}${returning ? ` · versión ${version + 1}` : ""}${note ? ` · ${note}` : ""}` }, ...record.history],
  };
}

export function addAdComment(record: ModuleRecord, text: string, ctx: PaidContext): ModuleRecord {
  const clean = text.trim();
  if (!clean) throw new Error("Escribí un comentario.");
  if (clean.length > 2000) throw new Error("El comentario supera los 2000 caracteres.");
  return {
    ...record, user: ctx.actor, updatedAt: ctx.at,
    values: { ...record.values, comentarios: pushComment(record.values.comentarios, { actor: ctx.actor, at: ctx.at, text: clean, version: Number(record.values.version) || 1, stage: adState(record), kind: "comentario" }) },
    history: [{ at: ctx.at, user: ctx.actor, text: "Comentó en el pedido" }, ...record.history],
  };
}

/* ───────── Equipo, permisos, tareas y notificaciones ───────── */
export type PaidTeam = Record<Exclude<PaidWho, "client">, string>;
/** Responsables de cada rol en la cuenta, según el equipo cargado. Los nombres son datos de la preview. */
export function paidTeam(client: OsClient): PaidTeam {
  const by = (pattern: RegExp) => client.team.find((person) => pattern.test(person.role))?.name;
  return {
    // Sin el rol en el equipo de la cuenta, el responsable queda pendiente: no se asigna a otra persona.
    lt: by(/Paid|Performance/i) || "Pendiente de asignación",
    pm: by(/Estrategia|Responsable de cuenta/i) || client.owner,
    content: by(/Contenido/i) || "Pendiente de asignación",
    designer: by(/Diseño/i) || "Pendiente de asignación",
  };
}

const ROLE_WHO: Partial<Record<PreviewRole, PaidWho>> = { technical: "lt", pm: "pm", content: "content", designer: "designer", client: "client" };

/** Permiso visual (no de servidor) para actuar en una etapa. El cliente aprueba desde su portal. */
export function canActPaid(role: PreviewRole, client: OsClient, who: PaidWho) {
  if (who === "client") return false;
  if (role === "admin") return true;
  if (role === "operativo") return canEditService(role, client.slug, PAID_SERVICE) && (who === "lt" || who === "pm");
  if (ROLE_WHO[role] !== who) return false;
  return client.team.some((person) => person.name === previewActor(role));
}

export function ownerFor(client: OsClient, state: AdState) {
  const who = STAGE_OWNER[state];
  return who === "client" ? `Cliente · ${client.name}` : paidTeam(client)[who];
}

export function adTaskId(clientSlug: string, adId: string) { return `PAID-${clientSlug}-${adId}`; }
export function planTaskId(clientSlug: string, campaignId: string) { return `PAID-PLAN-${clientSlug}-${campaignId}`; }
export function adHref(clientSlug: string, adId: string) { return `${serviceHref(clientSlug, PAID_SERVICE)}?seccion=anuncios&anuncio=${encodeURIComponent(adId)}`; }
export function campaignHref(clientSlug: string, campaignId: string) { return `${serviceHref(clientSlug, PAID_SERVICE)}?seccion=campanas&campana=${encodeURIComponent(campaignId)}`; }

function projectFor(clientSlug: string, previous?: OsTask) {
  return previous?.projectSlug || osProjects.find((p) => p.clientSlug === clientSlug && /pauta|campa|lanzamiento/i.test(`${p.slug} ${p.name}`))?.slug || osProjects.find((p) => p.clientSlug === clientSlug)?.slug || "";
}

/** Tarea única del pedido: la misma entidad se reasigna en cada etapa. En Diseño vive en el módulo de Diseño de marca. */
export function buildAdTask(client: OsClient, ad: ModuleRecord, previous: OsTask | undefined, actor: string, at: string, campaignName = ""): OsTask {
  const state = adState(ad);
  const done = state === "En circulación" || state === "Finalizado";
  const owner = ownerFor(client, state);
  const review = state === "Validación del PM" || state === "Validación del diseño" || state === "Aprobación del cliente";
  const verb: Record<AdState, string> = {
    "Opciones de Content": "Trabajar opciones", "Validación del PM": "Validar propuesta", Diseño: "Diseñar piezas", "Validación del diseño": "Validar diseño",
    "Aprobación del cliente": "Aprobar anuncio", "Puesta en circulación": "Poner en circulación", "En circulación": "En circulación", Finalizado: "Finalizado",
  };
  const title = `${verb[state]} · ${ad.values.nombre || ad.id}`;
  const due = done ? ad.values.fechaCirculacion || ad.values.fechaNecesaria || "Sin fecha" : stageDue(ad, state) || "Sin fecha";
  return {
    ...previous,
    id: previous?.id || adTaskId(client.slug, ad.id), clientSlug: client.slug, projectSlug: projectFor(client.slug, previous),
    serviceId: state === "Diseño" ? "diseno-marca" : PAID_SERVICE,
    workItem: { collection: "anuncios", id: ad.id, label: ad.values.nombre || ad.id },
    workflow: { kind: "paid", stage: state, href: adHref(client.slug, ad.id) },
    title, owner, approver: review ? owner : undefined, approvalTitle: review ? title : undefined,
    status: done ? "Hecho" : review ? "En aprobación" : "Por hacer",
    prio: previous?.prio || "Media", due, dueKind: done ? "past" : dueKindForDate(due, at),
    desc: [campaignName ? `Campaña: ${campaignName}` : "", ad.values.brief, ad.values.propuestaContent ? `Opción elegida por Content:\n${ad.values.propuestaContent}` : "", ad.values.devuelto ? `Cambios pedidos: ${ad.values.devuelto}` : ""].filter(Boolean).join("\n\n"),
    files: previous?.files || [], comments: previous?.comments || [],
    activity: [{ text: `${actor}: ${state} · responsable ${owner}`, when: at }, ...(previous?.activity || [])],
    completedAt: done ? previous?.completedAt || at : undefined, archivedAt: undefined,
  };
}

/** Tarea de validación de la planificación (Instancia 1): PM mientras valida, Líder técnico si se devuelve. */
export function buildPlanTask(client: OsClient, campaign: ModuleRecord, previous: OsTask | undefined, actor: string, at: string): OsTask {
  const plan = campaignPlan(campaign);
  const team = paidTeam(client);
  const validating = plan.state === "En validación del PM";
  const done = plan.state === "Aprobada";
  const owner = validating || done ? team.pm : team.lt;
  const name = campaign.values.nombre || campaign.id;
  const title = validating ? `Validar planificación · ${name}` : done ? `Planificación aprobada · ${name}` : `Ajustar planificación · ${name}`;
  const due = campaign.values.inicio || "Sin fecha";
  return {
    ...previous,
    id: previous?.id || planTaskId(client.slug, campaign.id), clientSlug: client.slug, projectSlug: projectFor(client.slug, previous), serviceId: PAID_SERVICE,
    workItem: { collection: "campanas", id: campaign.id, label: name },
    workflow: { kind: "paid", stage: plan.state, href: campaignHref(client.slug, campaign.id) },
    title, owner, approver: validating ? owner : undefined, approvalTitle: validating ? title : undefined,
    status: done ? "Hecho" : validating ? "En aprobación" : "Por hacer",
    prio: previous?.prio || "Alta", due, dueKind: done ? "past" : dueKindForDate(due, at),
    deliverable: previous?.deliverable,
    desc: `Instancia 1 · Planificación general de la campaña «${name}»: target, productos o servicios, presupuesto, canales, enfoque, anuncios, landing y secuencia de estímulos.`,
    files: previous?.files || [], comments: previous?.comments || [],
    activity: [{ text: `${actor}: ${plan.state} · responsable ${owner}`, when: at }, ...(previous?.activity || [])],
    completedAt: done ? previous?.completedAt || at : undefined, archivedAt: undefined,
  };
}

/** Aviso al próximo responsable. El cliente recibe un enlace a su portal. */
export function paidNotification(task: OsTask, recipient: string, eventId: string, at: string, kind: WorkflowNotification["kind"], title = task.title): WorkflowNotification {
  const portal = recipient.startsWith("Cliente ·");
  return {
    id: `WF-${task.clientSlug || "paid"}-${task.id}-${eventId}`, clientSlug: task.clientSlug || "", taskId: task.id, recipient, kind, title,
    href: portal ? `/v2/portal/${task.clientSlug}?anuncio=${encodeURIComponent(task.workItem?.id || "")}` : task.workflow?.href || "",
    at,
  };
}

/* ───────── Pedido de diseño (reutiliza Diseño de marca · trabajos) ───────── */
const DESIGN_PATCH: Partial<Record<AdState, Record<string, string>>> = {
  Diseño: { operacion: "En producción", estado: "En curso", etapa: "Diseño" },
  "Validación del diseño": { operacion: "En revisión interna", estado: "En curso", etapa: "Revisión" },
  "Aprobación del cliente": { operacion: "Esperando aprobación", estado: "En aprobación", etapa: "Revisión" },
  "Puesta en circulación": { operacion: "Aprobados", estado: "Aprobado", etapa: "Entrega" },
  "En circulación": { operacion: "Aprobados", estado: "Aprobado", etapa: "Entrega" },
  Finalizado: { operacion: "Entregados", estado: "Cerrado", etapa: "Entrega" },
};
export function designPatchForAd(ad: ModuleRecord): Record<string, string> | null {
  const state = adState(ad);
  if (state === "Diseño" && ad.values.devuelto) return { operacion: "Ajustes", estado: "Cambios pedidos", etapa: "Diseño" };
  return DESIGN_PATCH[state] ?? null;
}

export function linkedDesignRequest(records: ModuleRecord[], ad: ModuleRecord) {
  return records.find((record) => record.client === ad.client && (record.values.anuncioId === ad.id || (!!ad.values.pedidoDisenoId && record.id === ad.values.pedidoDisenoId)));
}

/** Un único pedido de diseño por pieza (id DIS-<anuncio>): se crea al entrar en Diseño y se actualiza en cada etapa siguiente. */
export function upsertAdDesignRequest(records: ModuleRecord[], ad: ModuleRecord, ctx: PaidContext & { taskId: string; designer: string; reviewer: string; campaignName?: string; seed?: boolean }) {
  const previous = linkedDesignRequest(records, ad);
  const patch = designPatchForAd(ad);
  // Se crea al pasar a Diseño. Las semillas de demostración ya avanzadas lo crean una sola vez (seed).
  if (!previous && (ad.values.previoAlFlujo === "true" || !adStages(ad.values.tipo).includes("Diseño") || (adState(ad) !== "Diseño" && !(ctx.seed && patch)))) return { records, request: undefined, created: false };
  const base = {
    nombre: `${ad.values.tipo === "Landing page" ? "Landing" : "Anuncio"} · ${ad.values.nombre || ad.id}`,
    objetivo: ad.values.propuesta || ad.values.beneficio || "",
    detalle: [ad.values.propuestaContent, ad.values.copy].filter(Boolean).join("\n\n") || ad.values.brief || "",
    tipoPieza: "Publicidad", canal: ad.values.canal || "", formatos: ad.values.piezas || "",
    referencias: ad.values.brief || "", fechaObjetivo: stageDue(ad, "Diseño"), responsable: ad.values.disenador || ctx.designer, revisor: ctx.reviewer,
    prioridad: "Alta", servicioOrigen: PAID_SERVICE, campanaId: ad.values.campana || "", anuncioId: ad.id, tareaId: ctx.taskId,
    lineamientos: `/v2/clientes/${ad.client}/diseno-marca?area=lineamientos`,
  };
  if (previous) {
    const values = { ...previous.values, ...(previous.values.anuncioId === ad.id ? base : {}), ...(patch || {}), ...(ad.values.enlacePieza ? { archivo: ad.values.enlacePieza } : {}) };
    if (JSON.stringify(values) === JSON.stringify(previous.values)) return { records, request: previous, created: false };
    const request = { ...previous, values, updatedAt: ctx.at, user: ctx.actor, history: [{ at: ctx.at, user: ctx.actor, text: `Actualizado desde el anuncio · ${adState(ad)}` }, ...previous.history] };
    return { records: records.map((record) => record.id === request.id && record.client === request.client ? request : record), request, created: false };
  }
  const request: ModuleRecord = {
    id: `DIS-${ad.id}`, client: ad.client, module: "diseno-marca", collection: "trabajos", source: ad.source,
    user: ctx.actor, createdAt: ctx.at, updatedAt: ctx.at, values: { ...base, ...(patch || {}) },
    history: [{ at: ctx.at, user: ctx.actor, text: `Pedido creado desde Publicidad digital${ctx.campaignName ? ` · campaña ${ctx.campaignName}` : ""} (validación del PM)` }],
  };
  return { records: [request, ...records], request, created: true };
}

/* ───────── Métricas DE DEMOSTRACIÓN: semáforos, presupuesto y gasto por canal ───────── */
export type Light = "verde" | "amarillo" | "rojo" | "gris";
export type WeekMetrics = { spend: number; impressions: number; clicks: number; leads: number; conversions: number };

/** Semáforo genérico: dentro del objetivo = verde, hasta 15 % fuera = amarillo, más = rojo. */
export function lightFor(value: number, target: number, better: "higher" | "lower", tolerance = 0.15): Light {
  if (!target || !Number.isFinite(value)) return "gris";
  const ratio = better === "higher" ? value / target : target / Math.max(value, 0.0001);
  return ratio >= 1 ? "verde" : ratio >= 1 - tolerance ? "amarillo" : "rojo";
}

/** Ritmo de gasto: 90–110 % del esperado a la fecha = verde, 75–125 % = amarillo. */
export function pacingLight(pacing: number): Light {
  if (!Number.isFinite(pacing) || pacing <= 0) return "gris";
  if (pacing >= 0.9 && pacing <= 1.1) return "verde";
  if (pacing >= 0.75 && pacing <= 1.25) return "amarillo";
  return "rojo";
}

export function budgetPacing(monthlyBudget: number, spentToDate: number, dayOfMonth: number, daysInMonth: number) {
  const expected = monthlyBudget * (dayOfMonth / daysInMonth);
  const pacing = expected ? spentToDate / expected : 0;
  const projected = dayOfMonth ? spentToDate * (daysInMonth / dayOfMonth) : 0;
  return { expected, pacing, projected, light: pacingLight(pacing), remaining: Math.max(0, monthlyBudget - spentToDate) };
}

/** Reparte el gasto de cada campaña según su distribución por canal. */
export function spendByChannel(rows: { channels: Partial<Record<PaidChannel, number>>; spend: number }[]) {
  const totals: Partial<Record<PaidChannel, number>> = {};
  for (const row of rows) {
    const total = sharesTotal(row.channels) || 100;
    for (const [channel, share] of Object.entries(row.channels) as [PaidChannel, number][]) totals[channel] = (totals[channel] || 0) + row.spend * (share / total);
  }
  return totals;
}

/* ───────── Plan de Marketing (consulta del bloque de Publicidad digital) ───────── */
type PlanItem = { id: string; section: string; status: string; values: Record<string, unknown> };
/** Lee los bloques del Plan de Marketing sin copiarlos: campañas con su distribución por canal y KPIs. */
export function mediaPlanFromKnowledge(items: PlanItem[]) {
  const text = (value: unknown) => Array.isArray(value) ? value.join(" · ") : value === undefined || value === null ? "" : String(value);
  const campaigns = items.filter((item) => item.section === "campaigns").map((item) => ({
    id: item.id, status: item.status, name: text(item.values.name) || "Campaña sin nombre", focus: text(item.values.focus), objective: text(item.values.objective),
    platforms: text(item.values.platforms), share: Number(item.values.share) || 0, audience: text(item.values.audience), funnel: text(item.values.funnel),
    monthlyInvestment: Number(item.values.monthlyInvestment) || 0, currency: text(item.values.currency) || "ARS", approval: text(item.values.approval),
    allocations: items.filter((a) => a.section === "allocations" && Array.isArray(a.values.campaignIds) && (a.values.campaignIds as string[]).includes(item.id)).map((a) => ({ channel: text(a.values.channel), share: Number(a.values.share) || 0 })),
  }));
  const kpis = items.filter((item) => item.section === "paidKpis").map((item) => ({ id: item.id, indicator: text(item.values.indicator), model: text(item.values.businessModel), values: item.values }));
  const visibility = items.filter((item) => item.section === "adVisibility");
  return { campaigns, kpis, visibility, total: campaigns.reduce((sum, campaign) => sum + campaign.monthlyInvestment, 0), empty: !items.length };
}
