"use client";

/* Instancia 2 · pedido de anuncio, landing o atención → brief al Content, y flujo del anuncio:
 * Content → Validación del PM → Diseño → Validación del diseño → Cliente → Puesta en circulación. */
import Link from "next/link";
import { useMemo, useState } from "react";
import { OSSidePanel } from "../overlays";
import type { OsClient } from "../os-data";
import { serviceHref } from "../service-workspace-data";
import { Badge, buttonClass } from "../ui";
import { designStage } from "./design-operation";
import { formatDate, formatDateTime, Panel, StatusBadge } from "./module-ui";
import { AD_TYPES, paidCreatives } from "./paid-collections";
import {
  AD_ACTIONS, AD_STAGES, adActionsFor, adRequestErrors, adStages, adState, campaignPlan, composeAdBrief, computeAdDeadlines, deadlineHealth, FUNNEL_STAGES, linkedDesignRequest, ownerFor,
  paidComments, PAID_CHANNELS, PAID_STAGE_DAYS, PIECE_KINDS, STAGE_OWNER, stageDue, storedDeadlines, WHO_LABEL, type AdAction, type AdRequestInput, type AdState, type AdType,
} from "./paid-model";
import { AiPending, usePaidDiscovery } from "./paid-ui";
import { isLate } from "./paid-home";
import { useModuleRecords } from "./store";
import { usePaidData, usePaidDemoSetup, usePaidOperations } from "./use-paid-operations";
import { CollectionView } from "./collection-view";
import type { ModuleRecord } from "./types";
import p from "./paid.module.css";

const TODAY = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
const BLANK: Omit<AdRequestInput, "campana" | "tipo"> = { nombre: "", canal: "", funnel: "", piezas: [], insight: "", respuesta: "", beneficio: "", propuesta: "", rtb: "", cta: "", detalle: "", fechaNecesaria: "" };

/* ───────── Pedido de anuncio / landing / atención ───────── */
export function AdRequestPanel({ client, campaign, initialType = "Anuncio", origin = "Instancia 2", onClose, onCreated }: { client: OsClient; campaign: ModuleRecord; initialType?: AdType; origin?: string; onClose: () => void; onCreated: (ad: ModuleRecord) => void }) {
  const ops = usePaidOperations(client);
  const discovery = usePaidDiscovery(client);
  const plan = campaignPlan(campaign);
  const [type, setType] = useState<AdType>(initialType);
  const [input, setInput] = useState({ ...BLANK, canal: Object.keys(plan.channels)[0] || "" });
  const [errors, setErrors] = useState<string[]>([]);
  const editable = ops.can("lt");
  const set = (key: keyof typeof BLANK, value: string | string[]) => setInput((before) => ({ ...before, [key]: value }));
  const full: AdRequestInput = { ...input, tipo: type, campana: campaign.id, origen: origin };
  const deadlines = computeAdDeadlines(input.fechaNecesaria, type);
  const health = deadlineHealth(deadlines, TODAY());
  const brief = composeAdBrief(full, campaign, { icps: discovery.name(discovery.icps, plan.icpIds), products: [...discovery.name(discovery.offerings, plan.productIds), ...(campaign.values.productosTexto ? [campaign.values.productosTexto] : [])] });
  const ad = type === "Anuncio";
  const text = (key: keyof typeof BLANK, label: string, rows = 2, wide = false) => <label data-wide={wide || undefined}><span>{label}</span><textarea rows={rows} maxLength={800} value={String(input[key])} disabled={!editable} onChange={(e) => set(key, e.target.value)} /></label>;
  function submit() {
    const problems = adRequestErrors(full);
    setErrors(problems);
    if (problems.length) return;
    const created = ops.createAd(full, brief);
    if (created) onCreated(created);
  }
  return <OSSidePanel label={`Pedido de pieza · ${campaign.values.nombre}`} heading={<span>Instancia 2 · Brief y desarrollo de piezas · {client.name}</span>} onClose={onClose} extraWide>
    <div className={p.stack} style={{ gap: 14 }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{ad ? "Pedido de anuncio" : type === "Landing page" ? "Brief de landing page" : `Brief de ${type.toLowerCase()}`}</h2>
      <p className={p.muted}>Campaña «{campaign.values.nombre}». El formulario genera un brief que le llega a {ops.team.content} (Content) como tarea, con plazos por etapa calculados desde la fecha en que se necesita.</p>
      {!editable ? <p className={p.errors} style={{ paddingLeft: 12 }} role="status">Solo el Líder técnico de la cuenta hace pedidos de piezas. Tu rol puede consultar.</p> : null}
      <div className={p.chips} role="group" aria-label="Tipo de pedido">{AD_TYPES.map((item) => <button key={item} type="button" className={p.toggle} aria-pressed={type === item} disabled={!editable} onClick={() => setType(item)}>{item}</button>)}</div>
      <div className={p.fields}>
        <label data-wide><span>Nombre del pedido</span><input value={input.nombre} maxLength={120} disabled={!editable} onChange={(e) => set("nombre", e.target.value)} placeholder={ad ? "Ej.: Placa · entrega en plazo" : "Ej.: Landing de la campaña"} /></label>
        <label><span>Canal</span><select value={input.canal} disabled={!editable} onChange={(e) => set("canal", e.target.value)}><option value="">Elegir…</option>{PAID_CHANNELS.map((channel) => <option key={channel}>{channel}</option>)}</select></label>
        <label><span>Fecha en que se necesita</span><input type="date" value={input.fechaNecesaria} disabled={!editable} onChange={(e) => set("fechaNecesaria", e.target.value)} /></label>
        {ad ? <>
          {text("insight", "Qué insight querés probar")}
          {text("respuesta", "Qué respuesta le das a ese insight")}
          {text("beneficio", "Beneficio para el cliente")}
          {text("propuesta", "Propuesta concreta")}
          {text("rtb", "Reason to believe")}
          <label><span>Call to action</span><input value={input.cta} maxLength={120} disabled={!editable} onChange={(e) => set("cta", e.target.value)} /></label>
          <fieldset className={p.fieldset} data-wide><legend>Etapa del funnel</legend><div className={p.chips}>{FUNNEL_STAGES.map((stage) => <button type="button" key={stage} className={p.toggle} aria-pressed={input.funnel === stage} disabled={!editable} onClick={() => set("funnel", stage)}>{stage}</button>)}</div></fieldset>
          <fieldset className={p.fieldset} data-wide><legend>Piezas a generar</legend><div className={p.chips}>{PIECE_KINDS.map((kind) => { const on = input.piezas.includes(kind); return <button type="button" key={kind} className={p.toggle} aria-pressed={on} disabled={!editable} onClick={() => set("piezas", on ? input.piezas.filter((item) => item !== kind) : [...input.piezas, kind])}>{kind}</button>; })}</div></fieldset>
        </> : <>
          {text("beneficio", "Beneficio o resultado esperado")}
          {text("propuesta", type === "Landing page" ? "Propuesta de la landing" : "Propuesta de la atención")}
          <label><span>Call to action</span><input value={input.cta} maxLength={120} disabled={!editable} onChange={(e) => set("cta", e.target.value)} /></label>
          {text("detalle", type === "Landing page" ? "Secciones, formulario y conexión con el CRM" : "Disparador, mensajes y tiempos", 3, true)}
        </>}
      </div>
      <section className={p.section} aria-label="Plazos por etapa">
        <h3>Plazos por etapa</h3>
        {deadlines.length ? <>
          <DeadlineTable deadlines={deadlines} client={client} />
          <p className={health.ok ? p.ok : p.errors} style={{ paddingLeft: 12 }} role="status">{health.message}</p>
        </> : <p className={p.small}>Indicá la fecha en que se necesita para calcular las fechas límite. Duraciones por etapa (a definir con Avans): {Object.entries(PAID_STAGE_DAYS).map(([stage, days]) => `${stage} ${days} d`).join(" · ")}.</p>}
      </section>
      <section className={p.section} aria-label="Brief generado"><h3>Brief que recibe el Content</h3><pre className={p.brief}>{brief}</pre></section>
      {errors.length ? <ul className={p.errors} role="alert">{errors.map((error) => <li key={error}>{error}</li>)}</ul> : null}
      <div className={p.actions}><button type="button" className={buttonClass("primary")} disabled={!editable} onClick={submit}>Generar brief y enviar al Content</button><button type="button" className={buttonClass("ghost")} onClick={onClose}>Cancelar</button></div>
    </div>
  </OSSidePanel>;
}

export function DeadlineTable({ deadlines, client, current }: { deadlines: ReturnType<typeof computeAdDeadlines>; client: OsClient; current?: AdState }) {
  const today = TODAY();
  return <div className={p.tableWrap}><table className={p.deadlines}>
    <caption className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Fechas límite por etapa</caption>
    <thead><tr><th scope="col">Etapa</th><th scope="col">Grupo</th><th scope="col">Responsable</th><th scope="col">Desde</th><th scope="col">Vence</th></tr></thead>
    <tbody>{deadlines.map((row) => <tr key={row.stage} data-current={row.stage === current || undefined}><td>{row.stage}</td><td>{row.group}</td><td>{ownerFor(client, row.stage)}</td><td>{formatDate(row.start)}</td><td>{formatDate(row.due)}{row.stage === current && row.due < today ? <> · <Badge tone="error">Vencida</Badge></> : null}</td></tr>)}</tbody>
  </table></div>;
}

/* ───────── Flujo visual ───────── */
export function AdFlow({ ad, client }: { ad: ModuleRecord; client: OsClient }) {
  const state = adState(ad);
  const stages = [...adStages(ad.values.tipo), "En circulación"] as AdState[];
  const index = state === "Finalizado" ? stages.length : stages.indexOf(state);
  const today = TODAY();
  return <ol className={p.flow} aria-label={`Flujo de ${ad.values.nombre}`}>{stages.map((stage, i) => {
    const due = stage === "En circulación" ? ad.values.fechaCirculacion || ad.values.fechaNecesaria : stageDue(ad, stage);
    const current = i === index;
    return <li key={stage} data-state={i < index ? "done" : current ? "current" : undefined} data-late={current && stage !== "En circulación" && Boolean(due) && due < today ? "true" : undefined} aria-current={current ? "step" : undefined}>
      <b>{i + 1}. {stage}</b><span>{WHO_LABEL[STAGE_OWNER[stage]]} · {ownerFor(client, stage).replace(/^Cliente · /, "")}</span><em>{due ? `${stage === "En circulación" ? "Desde" : "Vence"} ${formatDate(due)}` : "Sin fecha"}</em>
    </li>;
  })}</ol>;
}

/* ───────── Detalle del pedido ───────── */
export function AdDetail({ client, ad, campaign, onClose }: { client: OsClient; ad: ModuleRecord; campaign?: ModuleRecord; onClose: () => void }) {
  const ops = usePaidOperations(client);
  const design = useModuleRecords(client.slug, "diseno-marca", ["trabajos"]);
  const state = adState(ad);
  const request = linkedDesignRequest(design.data.trabajos || [], ad);
  const [work, setWork] = useState({ opciones: ad.values.opciones || "", propuestaContent: ad.values.propuestaContent || "", copy: ad.values.copy || "", enlacePieza: ad.values.enlacePieza || "" });
  const [comment, setComment] = useState("");
  const [note, setNote] = useState("");
  const actions = adActionsFor(ad);
  const who = STAGE_OWNER[state];
  const comments = paidComments(ad.values.comentarios);
  const versions = Array.from(new Set(comments.map((item) => item.version || 1))).sort((a, b) => b - a);
  const deadlines = storedDeadlines(ad);
  const canWork = who !== "client" && ops.can(who);
  function run(action: AdAction) {
    const patch: Record<string, string> | undefined = state === "Opciones de Content" ? { opciones: work.opciones, propuestaContent: work.propuestaContent, copy: work.copy } : state === "Diseño" ? { enlacePieza: work.enlacePieza } : undefined;
    const next = ops.adAction(ad, action, { comment: note, patch });
    if (next) { setNote(""); }
  }
  return <OSSidePanel label={`Pedido: ${ad.values.nombre}`} heading={<span>{ad.id} · {campaign?.values.nombre || "Campaña"} · {client.name}</span>} onClose={onClose} extraWide>
    <div className={p.stack} style={{ gap: 14 }}>
      <div className={p.chips}><Badge tone="stone">{ad.values.tipo || "Anuncio"}</Badge>{ad.values.canal ? <span className={p.chip}>{ad.values.canal}</span> : null}{ad.values.funnel ? <span className={p.chip}>{ad.values.funnel}</span> : null}<StatusBadge status={state} /><span className={p.chip}>Versión {ad.values.version || "1"}</span>{ad.source === "demo" ? <span className={p.demoTag}>Demo</span> : null}{isLate(ad) ? <span className={p.chip} data-tone="error">Etapa vencida</span> : null}</div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{ad.values.nombre}</h2>
      <AdFlow ad={ad} client={client} />
      <p className={p.muted}>Responsable de la etapa: <strong>{ownerFor(client, state)}</strong> ({WHO_LABEL[who]}). Una sola tarea por pedido que se reasigna en cada etapa{ad.values.tareaId ? ` · ${ad.values.tareaId}` : ""}.</p>
      {ad.values.devuelto ? <p className={p.errors} style={{ paddingLeft: 12 }} role="status">Cambios pedidos: {ad.values.devuelto}</p> : null}

      <section className={p.section} aria-label="Trabajo de la etapa">
        <h3>{state}</h3>
        {state === "Opciones de Content" ? <div className={p.fields}>
          <div data-wide><AiPending what="Opciones de piezas a partir del brief" /></div>
          <label data-wide><span>Opciones trabajadas</span><textarea rows={3} maxLength={3000} value={work.opciones} disabled={!canWork} onChange={(e) => setWork({ ...work, opciones: e.target.value })} placeholder="Ideas de reel, carrusel, placas o landing" /></label>
          <label data-wide><span>Opción elegida y ajustes</span><textarea rows={3} maxLength={3000} value={work.propuestaContent} disabled={!canWork} onChange={(e) => setWork({ ...work, propuestaContent: e.target.value })} /></label>
          <label data-wide><span>Copy</span><textarea rows={2} maxLength={2000} value={work.copy} disabled={!canWork} onChange={(e) => setWork({ ...work, copy: e.target.value })} /></label>
          <div data-wide className={p.actions}><button type="button" className={buttonClass("secondary", true)} disabled={!canWork} onClick={() => ops.saveAdWork(ad, { opciones: work.opciones, propuestaContent: work.propuestaContent, copy: work.copy })}>Guardar avance</button></div>
        </div> : null}
        {state !== "Opciones de Content" && (ad.values.propuestaContent || ad.values.copy) ? <dl className={p.dl}><div data-wide><dt>Opción elegida por Content</dt><dd>{ad.values.propuestaContent || "—"}</dd></div>{ad.values.copy ? <div data-wide><dt>Copy</dt><dd>{ad.values.copy}</dd></div> : null}</dl> : null}
        {adStages(ad.values.tipo).includes("Diseño") && ["Diseño", "Validación del diseño", "Aprobación del cliente", "Puesta en circulación", "En circulación", "Finalizado"].includes(state) ? <div className={p.stack} style={{ gap: 8 }}>
          {request ? <p className={p.muted}>Pedido de diseño <strong>{request.id}</strong> · {designStage(request)} · {request.values.responsable || "Diseñador por asignar"} · <Link href={`${serviceHref(client.slug, "diseno-marca")}?seccion=trabajos&registro=${encodeURIComponent(request.id)}`} style={{ color: "var(--av-link)" }}>Abrir en Diseño de marca</Link></p> : ad.values.previoAlFlujo === "true" ? <p className={p.small}>Pieza anterior al flujo del OS: no tiene pedido de diseño registrado.</p> : <p className={p.small}>Todavía no hay pedido de diseño.</p>}
          {state === "Diseño" ? <label className={p.field}><span>Enlace a las piezas diseñadas (http/https)</span><input value={work.enlacePieza} disabled={!canWork} onChange={(e) => setWork({ ...work, enlacePieza: e.target.value })} placeholder="https://drive.google.com/…" /></label> : ad.values.enlacePieza ? <p className={p.small}>Piezas: <a href={ad.values.enlacePieza} target="_blank" rel="noreferrer" style={{ color: "var(--av-link)" }}>{ad.values.enlacePieza}</a></p> : null}
        </div> : null}
        {state === "Aprobación del cliente" ? <p className={p.ok} role="status">Esperando la aprobación del cliente desde su portal. <Link href={`/v2/portal/${client.slug}?anuncio=${encodeURIComponent(ad.id)}`} style={{ color: "var(--av-link)" }}>Abrir el portal del cliente</Link></p> : null}
        {state === "En circulación" ? <p className={p.ok}>En circulación desde el {formatDate(ad.values.fechaCirculacion)}.</p> : null}
        {state === "Finalizado" ? <p className={p.small}>Finalizado el {formatDate(ad.values.fechaFin)} · figura en anuncios anteriores.</p> : null}
        {actions.filter((action) => AD_ACTIONS[action].who !== "client").length ? <div className={p.stack} style={{ gap: 8 }}>
          {actions.some((action) => AD_ACTIONS[action].needsComment) ? <label className={p.field}><span>Comentario o devolución</span><textarea rows={2} maxLength={2000} value={note} disabled={!canWork} onChange={(e) => setNote(e.target.value)} /></label> : null}
          <div className={p.actions}>{actions.filter((action) => AD_ACTIONS[action].who !== "client").map((action) => <button key={action} type="button" className={buttonClass(AD_ACTIONS[action].needsComment ? "secondary" : "primary", true)} disabled={!ops.canAct(action)} onClick={() => run(action)}>{action === "pm-approve" ? (adStages(ad.values.tipo).includes("Diseño") ? "Aprobar y enviar a diseño" : "Aprobar y enviar al cliente") : AD_ACTIONS[action].label}</button>)}</div>
          {!canWork ? <p className={p.small}>Esta etapa la resuelve {ownerFor(client, state)} ({WHO_LABEL[who]}). Tu rol puede consultar.</p> : null}
        </div> : null}
      </section>

      <section className={p.section} aria-label="Plazos"><h3>Plazos por etapa</h3><DeadlineTable deadlines={deadlines} client={client} current={state} /><p className={p.small}>Calculados hacia atrás desde el {formatDate(ad.values.fechaNecesaria)} en días hábiles. Duraciones a definir con Avans.</p></section>
      <section className={p.section} aria-label="Brief"><h3>Brief</h3><pre className={p.brief}>{ad.values.brief || [ad.values.insight && `Insight: ${ad.values.insight}`, ad.values.propuesta && `Propuesta: ${ad.values.propuesta}`, ad.values.cta && `CTA: ${ad.values.cta}`, ad.values.detalle].filter(Boolean).join("\n") || "Sin brief"}</pre></section>
      <section className={p.section} aria-label="Comentarios por versión">
        <h3>Comentarios por versión</h3>
        {versions.length ? versions.map((version) => <div key={version} className={p.stack} style={{ gap: 6 }}><span className={p.small}>Versión {version}</span><ul className={p.comments}>{comments.filter((item) => (item.version || 1) === version).map((item) => <li key={item.id} data-kind={item.kind}><div><strong>{item.actor}</strong><span>{item.stage ? `${item.stage} · ` : ""}{formatDateTime(item.at)}</span></div><p>{item.text}</p></li>)}</ul></div>) : <p className={p.small}>Sin comentarios todavía.</p>}
        <label className={p.field}><span>Nuevo comentario</span><textarea rows={2} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} /></label>
        <div className={p.actions}><button type="button" className={buttonClass("secondary", true)} onClick={() => { if (ops.adComment(ad, comment)) setComment(""); }}>Comentar</button></div>
      </section>
      <section className={p.section} aria-label="Historial del pedido"><h3>Historial</h3><ul className={p.history}>{ad.history.map((entry, i) => <li key={`${entry.at}-${i}`}>{entry.text} · {entry.user} · {formatDateTime(entry.at)}</li>)}</ul></section>
    </div>
  </OSSidePanel>;
}

/* ───────── Tablero de anuncios y piezas ───────── */
export function AdCard({ ad, campaign, onOpen }: { ad: ModuleRecord; campaign?: ModuleRecord; onOpen: () => void }) {
  const state = adState(ad);
  const due = state === "En circulación" ? ad.values.fechaCirculacion : stageDue(ad, state);
  const late = isLate(ad);
  return <article className={p.adCard} data-late={late || undefined}>
    <button type="button" onClick={onOpen}>{ad.values.nombre || ad.id}</button>
    <span className={p.small}>{campaign?.values.nombre || "Sin campaña"}</span>
    <div className={p.chips}><span className={p.chip}>{ad.values.tipo || "Anuncio"}</span>{ad.values.canal ? <span className={p.chip}>{ad.values.canal}</span> : null}{state === "Finalizado" ? <span className={p.chip}>Finalizó {formatDate(ad.values.fechaFin)}</span> : late ? <span className={p.chip} data-tone="error">Vencida</span> : due ? <span className={p.chip}>{state === "En circulación" ? "Desde" : "Vence"} {formatDate(due)}</span> : null}{ad.source === "demo" ? <span className={p.demoTag}>Demo</span> : null}</div>
  </article>;
}

export function AdsSection({ client, editable, adId, go }: { client: OsClient; editable: boolean; adId: string | null; go: (section: string, extra?: Record<string, string>) => void }) {
  usePaidDemoSetup(client);
  const { data } = usePaidData(client);
  const [campaignFilter, setCampaignFilter] = useState("");
  const campaigns = data.campanas ?? [];
  const ads = useMemo(() => (data.anuncios ?? []).filter((ad) => !campaignFilter || ad.values.campana === campaignFilter), [campaignFilter, data.anuncios]);
  const selected = adId ? (data.anuncios ?? []).find((ad) => ad.id === adId) : undefined;
  const columns = [...AD_STAGES, "En circulación"] as AdState[];
  const previous = ads.filter((ad) => adState(ad) === "Finalizado");
  const campaignOf = (ad: ModuleRecord) => campaigns.find((campaign) => campaign.id === ad.values.campana);
  return <div className={p.stack}>
    <Panel title="Anuncios y piezas" id="paid-ads" description="Pedidos de anuncio, landing y atención de todas las campañas, por etapa del flujo. Para pedir piezas nuevas, entrá a la campaña." actions={<label className={p.field} style={{ minWidth: 220 }}><span>Campaña</span><select value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)}><option value="">Todas las campañas</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.values.nombre}</option>)}</select></label>}>
      <div className={p.body}>
        {adId && !selected ? <p className={p.errors} style={{ paddingLeft: 12 }} role="status">No se encontró el pedido {adId} en {client.name}.</p> : null}
        <div className={p.board} aria-label="Tablero de anuncios por etapa">{columns.map((stage) => {
          const list = ads.filter((ad) => adState(ad) === stage);
          return <section key={stage} className={p.column} data-who={STAGE_OWNER[stage]} aria-label={stage}>
            <h3>{stage} <small>{list.length}</small></h3>
            <span className={p.small}>{WHO_LABEL[STAGE_OWNER[stage]]}</span>
            {list.length ? list.map((ad) => <AdCard key={ad.id} ad={ad} campaign={campaignOf(ad)} onOpen={() => go("anuncios", { anuncio: ad.id })} />) : <p className={p.emptyCol}>Sin pedidos</p>}
          </section>;
        })}</div>
        {previous.length ? <div className={p.stack} style={{ gap: 6 }}><h3 style={{ margin: 0, fontSize: 15 }}>Anuncios anteriores · {previous.length}</h3><div className={p.cards}>{previous.map((ad) => <AdCard key={ad.id} ad={ad} campaign={campaignOf(ad)} onOpen={() => go("anuncios", { anuncio: ad.id })} />)}</div></div> : null}
      </div>
    </Panel>
    <details className={p.section} style={{ border: "1px solid var(--av-border)", padding: 12, background: "var(--av-bg-raised)" }}>
      <summary style={{ cursor: "pointer", fontSize: 14 }}>Registro creativo anterior (consulta)</summary>
      <CollectionView client={client} serviceId="publicidad-digital" def={paidCreatives} editable={editable} />
    </details>
    {selected ? <AdDetail key={`${selected.id}-${selected.updatedAt}`} client={client} ad={selected} campaign={campaignOf(selected)} onClose={() => go("anuncios")} /> : null}
  </div>;
}
