"use client";

/* Publicidad digital · operaciones con persistencia local (este navegador).
 * Cada cambio guarda el registro, la tarea única (reasignada por etapa), el pedido de
 * diseño cuando corresponde y el aviso al próximo responsable en una sola escritura. */
import { useEffect, useMemo, useRef } from "react";
import { readLocalJson, writeLocalBatch } from "../local-persistence";
import type { OsClient, OsTask } from "../os-data";
import { useOsStore } from "../os-store";
import { previewActor } from "../preview-roles";
import { applyStageTask, chainBaseOf, isUnassigned, latestChainTask, type LocalWrite } from "../workflow-tasks";
import {
  AD_ACTIONS, PAID_SERVICE, adState, adTaskId, applyAdAction, applyPlanAction, addAdComment, buildAdTask, buildPlanTask, campaignPlan, canActPaid,
  createAdRecord, linkedDesignRequest, mainChannel, ownerFor, paidNotification, paidTeam, planStepErrors, planTaskId, STAGE_OWNER, upsertAdDesignRequest,
  type AdAction, type AdRequestInput, type PaidWho, type PlanAction,
} from "./paid-model";
import { paidDemoSeed } from "./paid-demo";
import { moduleKey, seedRecords, useModuleRecords } from "./store";
import type { ModuleRecord } from "./types";

export const PAID_COLLECTIONS = ["campanas", "anuncios", "creatividades", "optimizaciones", "aprendizajes"];

/** Compatibilidad de lectura: un registro demo guardado antes de los campos nuevos los toma de su semilla (sin reescribirlo). */
export function withPaidDefaults(record: ModuleRecord): ModuleRecord {
  if (record.source !== "demo") return record;
  const seed = paidDemoSeed(record.collection, record.client, record.id);
  if (!seed) return record;
  const missing = Object.fromEntries(Object.entries(seed).filter(([key]) => key !== "id" && !(key in record.values)));
  return Object.keys(missing).length ? { ...record, values: { ...missing, ...record.values } } : record;
}

/** Colecciones de Publicidad digital del cliente, con compatibilidad de lectura. */
export function usePaidData(client: OsClient) {
  const { data, hydrated } = useModuleRecords(client.slug, PAID_SERVICE, PAID_COLLECTIONS);
  const paid = useMemo(() => Object.fromEntries(Object.entries(data).map(([key, records]) => [key, records.filter((record) => record.client === client.slug).map(withPaidDefaults)])) as Record<string, ModuleRecord[]>, [client.slug, data]);
  return { data: paid, hydrated };
}

export function usePaidOperations(client: OsClient) {
  const store = useOsStore();
  const actor = previewActor(store.role);
  const team = paidTeam(client);
  const can = (who: PaidWho) => canActPaid(store.role, client, who);
  const read = (collection: string) => readLocalJson<ModuleRecord[]>(moduleKey(client.slug, PAID_SERVICE, collection), seedRecords(client.slug, PAID_SERVICE, collection)).map(withPaidDefaults);
  const readDesign = () => readLocalJson<ModuleRecord[]>(moduleKey(client.slug, "diseno-marca", "trabajos"), seedRecords(client.slug, "diseno-marca", "trabajos"));
  const tasks = () => readLocalJson<{ tasks: OsTask[] }>("workspace", { tasks: store.tasks }).tasks;
  const fail = (message: string) => { store.notify(message, "error"); return null; };
  const replace = (records: ModuleRecord[], record: ModuleRecord) => records.some((item) => item.id === record.id) ? records.map((item) => item.id === record.id ? record : item) : [record, ...records];

  function fresh(collection: string, record: ModuleRecord) {
    if (!store.localHydrated) throw new Error("Esperá a que termine de cargar la cuenta.");
    if (record.client !== client.slug) throw new Error("El registro no pertenece a esta cuenta.");
    const records = read(collection);
    const current = records.find((item) => item.id === record.id);
    if (!current) throw new Error("No se encontró el registro. Volvé a abrirlo.");
    if (current.updatedAt !== record.updatedAt) throw new Error("El registro cambió en otra vista. Revisá la versión actual antes de continuar.");
    return { records, current };
  }

  /** Instancia 1: guarda el borrador del paso a paso (crea la campaña la primera vez). */
  function savePlanDraft(values: Record<string, string>, existing?: ModuleRecord, note?: string): ModuleRecord | null {
    if (!can("lt")) return fail("Solo el Líder técnico configura la planificación de la campaña.");
    if (!values.nombre?.trim()) return fail("Poné un nombre a la campaña para guardar el borrador.");
    const at = new Date().toISOString();
    try {
      const channels = campaignPlan({ id: "", client: client.slug, module: PAID_SERVICE, collection: "campanas", user: actor, source: "manual", createdAt: at, updatedAt: at, history: [], values }).channels;
      const derived = { plataforma: mainChannel(channels) || values.plataforma || "", presupuesto: values.presupuesto || values.presupuestoMensual || "", responsable: values.responsable || team.lt };
      if (existing) {
        const { records, current } = fresh("campanas", existing);
        const plan = campaignPlan(current);
        if (plan.state === "En validación del PM" || plan.state === "Aprobada") throw new Error("La planificación ya fue enviada: el PM la tiene que devolver para editarla.");
        const record: ModuleRecord = { ...current, user: actor, updatedAt: at, values: { ...current.values, ...values, ...derived, planEstado: plan.state === "Devuelta al Líder técnico" ? plan.state : "Borrador" }, history: [{ at, user: actor, text: note || "Guardó el borrador de la planificación" }, ...current.history] };
        if (!writeLocalBatch([{ key: moduleKey(client.slug, PAID_SERVICE, "campanas"), value: replace(records, record) }])) throw new Error("No se pudo guardar en este navegador.");
        return record;
      }
      const record: ModuleRecord = {
        id: `CMP-${Date.now().toString(36).toUpperCase()}`, client: client.slug, module: PAID_SERVICE, collection: "campanas", source: "manual", user: actor, createdAt: at, updatedAt: at,
        values: { estado: "Borrador", ...values, ...derived, planEstado: "Borrador" },
        history: [...(note ? [{ at, user: actor, text: note }] : []), { at, user: actor, text: "Creó la campaña · Instancia 1 (planificación general)" }],
      };
      if (!writeLocalBatch([{ key: moduleKey(client.slug, PAID_SERVICE, "campanas"), value: [record, ...read("campanas")] }])) throw new Error("No se pudo guardar en este navegador.");
      return record;
    } catch (error) { return fail(error instanceof Error ? error.message : "No se pudo guardar."); }
  }

  /** Envío a validación, aprobación o devolución de la planificación, con tarea y aviso. */
  function planAction(campaign: ModuleRecord, action: PlanAction, comment = ""): ModuleRecord | null {
    if (action === "submit" ? !can("lt") : !can("pm")) return fail(action === "submit" ? "Solo el Líder técnico envía la planificación." : "Solo el PM valida la planificación.");
    try {
      const { records, current } = fresh("campanas", campaign);
      if (action === "submit") { const errors = planStepErrors(current.values, "all"); if (errors.length) throw new Error(errors[0]); }
      const at = new Date().toISOString();
      const next = applyPlanAction(current, action, { actor, at, comment });
      const all = tasks();
      // Cadena de la planificación: validación del PM → (devuelta) ajuste del Líder técnico → nueva validación…
      const base = planTaskId(client.slug, current.id);
      const stage = applyStageTask(all, buildPlanTask(client, next, latestChainTask(all, base), actor, at), { base, at, actor, stageKey: (value) => value === "Borrador" ? "Devuelta al Líder técnico" : value });
      const task = stage.current;
      next.values.tareaPlanId = task.id;
      const recipient = action === "approve" ? team.lt : task.owner;
      const kind = action === "submit" ? "approval" : action === "approve" ? "approval" : "changes";
      const title = action === "submit" ? `Validar planificación · ${next.values.nombre}` : action === "approve" ? `Planificación aprobada · ${next.values.nombre}: armá los briefs` : `Planificación devuelta · ${next.values.nombre}`;
      const ok = store.commitWorkflow(stage.changed, isUnassigned(recipient) ? undefined : paidNotification(task, recipient, `${action}-${at}`, at, kind, title), [{ key: moduleKey(client.slug, PAID_SERVICE, "campanas"), value: replace(records, next) }]);
      if (!ok) return null;
      store.notify(action === "submit" ? `Enviada a validación de ${team.pm}` : action === "approve" ? "Planificación aprobada · Instancia 2 habilitada" : `Devuelta a ${team.lt}`, "success");
      return next;
    } catch (error) { return fail(error instanceof Error ? error.message : "No se pudo guardar."); }
  }

  function setCampaignStatus(campaign: ModuleRecord, estado: string) {
    if (!can("lt")) return fail("Solo el Líder técnico cambia el estado de la campaña.");
    try {
      const { records, current } = fresh("campanas", campaign);
      const at = new Date().toISOString();
      const next = { ...current, user: actor, updatedAt: at, values: { ...current.values, estado }, history: [{ at, user: actor, text: `Cambió el estado de la campaña a ${estado}` }, ...current.history] };
      if (!writeLocalBatch([{ key: moduleKey(client.slug, PAID_SERVICE, "campanas"), value: replace(records, next) }])) throw new Error("No se pudo guardar en este navegador.");
      return next;
    } catch (error) { return fail(error instanceof Error ? error.message : "No se pudo guardar."); }
  }

  /** Instancia 2: pedido de anuncio / landing / atención → brief y tarea al Content. */
  function createAd(input: AdRequestInput, brief: string): ModuleRecord | null {
    if (!can("lt")) return fail("Solo el Líder técnico hace el pedido de piezas.");
    try {
      const campaign = read("campanas").find((item) => item.id === input.campana);
      if (!campaign) throw new Error("La campaña no pertenece a esta cuenta.");
      if (campaignPlan(campaign).state !== "Aprobada") throw new Error("La planificación de la campaña tiene que estar aprobada por el PM (Instancia 1).");
      const at = new Date().toISOString();
      const ad = createAdRecord(client.slug, `ANU-${Date.now().toString(36).toUpperCase()}`, input, { actor, at, brief });
      const stage = applyStageTask(tasks(), buildAdTask(client, ad, undefined, actor, at, campaign.values.nombre), { base: adTaskId(client.slug, ad.id), at, actor });
      const task = stage.current;
      ad.values.tareaId = task.id;
      const ok = store.commitWorkflow(stage.changed, isUnassigned(task.owner) ? undefined : paidNotification(task, task.owner, `create-${at}`, at, "assignment", `Nuevo brief · ${ad.values.nombre}`), [{ key: moduleKey(client.slug, PAID_SERVICE, "anuncios"), value: [ad, ...read("anuncios")] }]);
      if (!ok) return null;
      store.notify(`Brief enviado a ${task.owner} como tarea`, "success");
      return ad;
    } catch (error) { return fail(error instanceof Error ? error.message : "No se pudo guardar el pedido."); }
  }

  function canAct(action: AdAction, asClient = false) {
    const who = AD_ACTIONS[action].who;
    return who === "client" ? asClient : can(who);
  }

  /** Guarda el trabajo de la etapa sin avanzar (opciones del Content, enlace del diseñador). */
  function saveAdWork(ad: ModuleRecord, patch: Record<string, string>): ModuleRecord | null {
    const who = STAGE_OWNER[adState(ad)];
    if (who === "client" || !can(who)) return fail("Tu rol no trabaja en esta etapa del pedido.");
    try {
      const { records, current } = fresh("anuncios", ad);
      const at = new Date().toISOString();
      const next = { ...current, user: actor, updatedAt: at, values: { ...current.values, ...patch }, history: [{ at, user: actor, text: `Guardó avances · ${adState(current)}` }, ...current.history] };
      if (!writeLocalBatch([{ key: moduleKey(client.slug, PAID_SERVICE, "anuncios"), value: replace(records, next) }])) throw new Error("No se pudo guardar en este navegador.");
      store.notify("Avance guardado", "success");
      return next;
    } catch (error) { return fail(error instanceof Error ? error.message : "No se pudo guardar."); }
  }

  /** Flujo del anuncio: misma tarea reasignada, pedido de diseño único y aviso al próximo responsable. */
  function adAction(ad: ModuleRecord, action: AdAction, options: { comment?: string; patch?: Record<string, string>; asClient?: boolean } = {}): ModuleRecord | null {
    if (!canAct(action, options.asClient)) return fail(AD_ACTIONS[action].who === "client" ? "La aprobación del cliente se hace desde su portal." : "Tu rol no puede actuar en esta etapa.");
    try {
      const { records, current } = fresh("anuncios", ad);
      const at = new Date().toISOString();
      const who = options.asClient ? `Cliente · ${client.name}` : actor;
      const next = applyAdAction(current, action, { actor: who, at, comment: options.comment, patch: options.patch });
      const campaign = read("campanas").find((item) => item.id === next.values.campana);
      const all = tasks();
      // Cada etapa del pedido es una tarea de su cadena: se completa la vigente y se crea la siguiente.
      const linked = all.find((task) => task.id === (current.values.tareaId || adTaskId(client.slug, current.id)));
      const base = linked ? chainBaseOf(linked) : adTaskId(client.slug, current.id);
      const stage = applyStageTask(all, buildAdTask(client, next, latestChainTask(all, base), who, at, campaign?.values.nombre), { base, at, actor: who });
      const task = stage.current;
      next.values.tareaId = task.id;
      const writes: LocalWrite[] = [];
      const design = upsertAdDesignRequest(readDesign(), next, { actor: who, at, taskId: task.id, designer: team.designer, reviewer: team.pm, campaignName: campaign?.values.nombre });
      if (design.request) {
        next.values.pedidoDisenoId = design.request.id;
        writes.push({ key: moduleKey(client.slug, "diseno-marca", "trabajos"), value: design.records });
      }
      writes.push({ key: moduleKey(client.slug, PAID_SERVICE, "anuncios"), value: replace(records, next) });
      const state = adState(next);
      const returning = AD_ACTIONS[action].needsComment;
      const recipient = state === "En circulación" || state === "Finalizado" ? team.lt : ownerFor(client, state);
      const title = returning ? `Cambios pedidos · ${next.values.nombre}` : `${state} · ${next.values.nombre}`;
      const ok = store.commitWorkflow(stage.changed, isUnassigned(recipient) ? undefined : paidNotification(task, recipient, `${action}-${at}`, at, returning ? "changes" : state === "Aprobación del cliente" || state.startsWith("Validación") ? "review" : "owner", title), writes);
      if (!ok) return null;
      store.notify(design.created ? `Pedido de diseño creado para ${team.designer}` : `${state} · responsable ${recipient}`, "success");
      return next;
    } catch (error) { return fail(error instanceof Error ? error.message : "No se pudo guardar."); }
  }

  function adComment(ad: ModuleRecord, text: string, asClient = false): ModuleRecord | null {
    if (!asClient && !(["lt", "pm", "content", "designer"] as PaidWho[]).some((who) => can(who))) return fail("Tu rol puede consultar, pero no comentar.");
    try {
      const { records, current } = fresh("anuncios", ad);
      const at = new Date().toISOString();
      const next = addAdComment(current, text, { actor: asClient ? `Cliente · ${client.name}` : actor, at });
      if (!writeLocalBatch([{ key: moduleKey(client.slug, PAID_SERVICE, "anuncios"), value: replace(records, next) }])) throw new Error("No se pudo guardar en este navegador.");
      return next;
    } catch (error) { return fail(error instanceof Error ? error.message : "No se pudo guardar."); }
  }

  return { actor, team, can, canAct, savePlanDraft, planAction, setCampaignStatus, createAd, saveAdWork, adAction, adComment };
}

/**
 * Datos de demostración: crea una sola vez la tarea central de cada pedido demo abierto,
 * la tarea de validación de las planificaciones demo en revisión y el pedido de diseño
 * de los anuncios demo que ya pasaron por Diseño. Nunca duplica ni pisa lo existente.
 */
export function usePaidDemoSetup(client: OsClient) {
  const store = useOsStore();
  const done = useRef(false);
  const ready = store.localHydrated && store.servicesOf(client.slug).includes(PAID_SERVICE);
  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    const at = "2026-11-20T12:00:00.000Z";
    const team = paidTeam(client);
    const campaignsKey = moduleKey(client.slug, PAID_SERVICE, "campanas");
    const adsKey = moduleKey(client.slug, PAID_SERVICE, "anuncios");
    const designKey = moduleKey(client.slug, "diseno-marca", "trabajos");
    const readAll = (key: string, collection: string, service: typeof PAID_SERVICE | "diseno-marca" = PAID_SERVICE) => readLocalJson<ModuleRecord[]>(key, seedRecords(client.slug, service, collection)).map(withPaidDefaults);
    const existing = () => readLocalJson<{ tasks: OsTask[] }>("workspace", { tasks: store.tasks }).tasks;
    for (const campaign of readAll(campaignsKey, "campanas").filter((item) => item.source === "demo" && campaignPlan(item).state === "En validación del PM")) {
      if (existing().some((task) => task.id === planTaskId(client.slug, campaign.id))) continue;
      const task = { ...buildPlanTask(client, campaign, undefined, "Sistema", at), activity: [{ text: "Tarea de demostración creada con la planificación", when: at }] };
      if (!store.commitWorkflow(task, undefined, [])) return;
    }
    for (const ad of readAll(adsKey, "anuncios").filter((item) => item.source === "demo" && item.values.previoAlFlujo !== "true")) {
      const state = adState(ad);
      const taskId = adTaskId(client.slug, ad.id);
      const writes: LocalWrite[] = [];
      const design = readLocalJson<ModuleRecord[]>(designKey, seedRecords(client.slug, "diseno-marca", "trabajos"));
      if (!linkedDesignRequest(design, ad)) {
        const result = upsertAdDesignRequest(design, ad, { actor: "Sistema", at, taskId, designer: team.designer, reviewer: team.pm, seed: true });
        if (result.created) writes.push({ key: designKey, value: result.records });
      }
      const hasTask = existing().some((task) => task.id === taskId);
      if (hasTask && !writes.length) continue;
      if (state === "En circulación" || state === "Finalizado") { if (writes.length) writeLocalBatch(writes); continue; }
      const campaign = readAll(campaignsKey, "campanas").find((item) => item.id === ad.values.campana);
      const task = hasTask ? existing().find((item) => item.id === taskId)! : { ...buildAdTask(client, ad, undefined, "Sistema", at, campaign?.values.nombre), activity: [{ text: "Tarea de demostración creada con el pedido", when: at }] };
      if (!store.commitWorkflow(task, undefined, writes)) return;
    }
  });
}
