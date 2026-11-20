"use client";

/* Sección Campañas: crear una campaña nueva (Instancia 1 paso a paso → validación del PM →
 * Instancia 2 brief y piezas) o entrar a las ya creadas. Vista de campaña con métricas DEMO. */
import Link from "next/link";
import { useState } from "react";
import { AssistedCreatePanel } from "../assistant/assisted-create";
import { assistantProfile } from "../assistant/profiles";
import { serviceForTask } from "../director-data";
import type { OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { dueLabel } from "../selectors";
import { NewTaskModal } from "../task-blocks";
import { Badge, buttonClass, OSDue } from "../ui";
import { sectionHref } from "./module-common";
import { formatDate, formatDateTime, Panel, StatusBadge, Strip } from "./module-ui";
import { CAMPAIGN_STATUSES, paidCampaigns } from "./paid-collections";
import { AD_STAGES, adState, campaignHref, campaignPlan, paidComments, PLAN_STATES, type AdType, type PlanState } from "./paid-model";
import { channelBreakdown } from "./paid-metrics";
import { AdCard, AdDetail, AdRequestPanel } from "./paid-ads";
import { CampaignCard } from "./paid-home";
import { CampaignPlanSummary } from "./paid-plan";
import { AiPending, DemoBar, money, moneyShort, PlatformsPanel } from "./paid-ui";
import { CampaignWizard } from "./paid-wizard";
import { usePaidData, usePaidDemoSetup, usePaidOperations } from "./use-paid-operations";
import type { ModuleRecord } from "./types";
import p from "./paid.module.css";

type Go = (section: string, extra?: Record<string, string>) => void;

export function CampaignsSection({ client, campaignId, go }: { client: OsClient; editable: boolean; campaignId: string | null; go: Go }) {
  usePaidDemoSetup(client);
  const { data } = usePaidData(client);
  const ops = usePaidOperations(client);
  const [wizard, setWizard] = useState<{ campaign?: ModuleRecord } | null>(null);
  const [assisted, setAssisted] = useState(false);
  const [filter, setFilter] = useState<PlanState | "">("");
  const campaigns = data.campanas ?? [];
  const ads = data.anuncios ?? [];
  const record = campaignId ? campaigns.find((item) => item.id === campaignId) : undefined;
  const profile = assistantProfile("publicidad-digital", "campanas");
  if (campaignId && record) return <CampaignView client={client} campaign={record} ads={ads.filter((ad) => ad.values.campana === record.id)} go={go} />;
  const visible = campaigns.filter((campaign) => !filter || campaignPlan(campaign).state === filter);
  return <div className={p.stack}>
    {campaignId ? <p className={p.errors} style={{ paddingLeft: 12 }} role="status">No se encontró la campaña {campaignId} para {client.name}.</p> : null}
    <Panel title="Campañas" id="paid-campaigns" description="Campañas de cara al cliente. Cada una se crea en dos instancias." actions={<>
      {profile ? <button type="button" className={buttonClass("secondary", true)} disabled={!ops.can("lt")} onClick={() => setAssisted(true)}>Nueva campaña con asistente</button> : null}
      <button type="button" className={buttonClass("primary", true)} disabled={!ops.can("lt")} onClick={() => setWizard({})}>Nueva campaña</button>
    </>}>
      <div className={p.body}>
        <div className={p.instances}>
          <div className={p.instance}><h3>Instancia 1 · Planificación general</h3><span className={p.small}>El Líder técnico ({ops.team.lt}) configura target, productos o servicios, presupuesto, canales, enfoque, anuncios, landing y estímulos, y la envía a validación del PM ({ops.team.pm}).</span></div>
          <div className={p.instance}><h3>Instancia 2 · Brief y desarrollo de piezas</h3><span className={p.small}>Con la planificación aprobada, se piden anuncios, landing y atención por mail o WhatsApp. Cada pedido genera un brief que llega al Content como tarea.</span></div>
        </div>
        {!ops.can("lt") ? <p className={p.small}>Tu rol de vista previa puede consultar las campañas; solo el Líder técnico asignado crea y planifica.</p> : null}
        <div className={p.chips} role="group" aria-label="Filtrar por estado de la planificación">{(["", ...PLAN_STATES] as const).map((state) => <button key={state || "all"} type="button" className={p.toggle} aria-pressed={filter === state} onClick={() => setFilter(state)}>{state || "Todas"} <em>{campaigns.filter((campaign) => !state || campaignPlan(campaign).state === state).length}</em></button>)}</div>
        {visible.length ? <div className={p.cards}>{visible.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} ads={ads} go={go} />)}</div> : <p className={p.muted}>{campaigns.length ? "Ninguna campaña en ese estado." : "Todavía no hay campañas para este cliente."}</p>}
      </div>
    </Panel>
    {wizard ? <CampaignWizard client={client} campaign={wizard.campaign} onClose={() => setWizard(null)} onDone={(saved) => { setWizard(null); go("campanas", { campana: saved.id }); }} /> : null}
    {assisted && profile ? <AssistedCreatePanel client={client} serviceId="publicidad-digital" def={paidCampaigns} profile={profile} refs={data} titleKeyOf={(collection) => (collection === "campanas" ? "nombre" : collection === "creatividades" ? "pieza" : "nombre")}
      initial={{ estado: "Borrador" }}
      onCreate={(values, note) => { const created = ops.savePlanDraft({ ...values, presupuestoMensual: values.presupuestoMensual || "" }, undefined, note || undefined); if (created) { setAssisted(false); setWizard({ campaign: created }); } return created; }}
      onClose={() => setAssisted(false)} existingHref={(id) => campaignHref(client.slug, id)} /> : null}
  </div>;
}

function CampaignView({ client, campaign, ads, go }: { client: OsClient; campaign: ModuleRecord; ads: ModuleRecord[]; go: Go }) {
  const { tasks } = useOsStore();
  const ops = usePaidOperations(client);
  const { data } = usePaidData(client);
  const plan = campaignPlan(campaign);
  const [wizard, setWizard] = useState(false);
  const [request, setRequest] = useState<AdType | null>(null);
  const [openAd, setOpenAd] = useState<string | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [note, setNote] = useState("");
  const breakdown = channelBreakdown(campaign);
  const circulating = ads.filter((ad) => adState(ad) === "En circulación" && ad.values.tipo !== "Landing page" && !String(ad.values.tipo).startsWith("Atención"));
  const inFlow = ads.filter((ad) => (AD_STAGES as readonly string[]).includes(adState(ad)));
  const previous = ads.filter((ad) => adState(ad) === "Finalizado");
  const landings = ads.filter((ad) => ad.values.tipo === "Landing page");
  const stimuli = ads.filter((ad) => String(ad.values.tipo).startsWith("Atención"));
  const optimizations = (data.optimizaciones ?? []).filter((item) => item.values.campana === campaign.id);
  const linked = tasks.filter((task) => task.workItem?.id === campaign.id && serviceForTask(task) === "publicidad-digital");
  const planComments = paidComments(campaign.values.planComentarios);
  const selectedAd = ads.find((ad) => ad.id === openAd);
  const approved = plan.state === "Aprobada";
  const canEditPlan = ops.can("lt") && (plan.state === "Borrador" || plan.state === "Devuelta al Líder técnico");
  const adList = (list: ModuleRecord[], empty: string) => list.length ? <div className={p.cards}>{list.map((ad) => <AdCard key={ad.id} ad={ad} campaign={campaign} onOpen={() => setOpenAd(ad.id)} />)}</div> : <p className={p.small}>{empty}</p>;

  return <div className={p.stack}>
    <button type="button" onClick={() => go("campanas")} style={{ border: 0, background: "transparent", padding: 0, cursor: "pointer", alignSelf: "flex-start", color: "var(--av-link)", font: "inherit", fontSize: 13 }}>← Volver a campañas</button>
    <section className={p.card} aria-labelledby="campaign-title" style={{ padding: 16 }}>
      <span className={p.small}>Campaña · {campaign.id}</span>
      <h2 id="campaign-title" style={{ fontSize: 24, fontWeight: 500, margin: 0 }}>{campaign.values.nombre}</h2>
      <div className={p.cardMeta}><StatusBadge status={campaign.values.estado || "Borrador"} /><Badge tone={approved ? "cool" : plan.state === "En validación del PM" ? "peach" : plan.state === "Borrador" ? "stone" : "error"}>Plan: {plan.state}</Badge>{campaign.source === "demo" ? <span className={p.demoTag}>Demo</span> : null}<span className={p.chip}>{campaign.values.objetivo || "Sin objetivo"}</span><span className={p.chip}>{formatDate(campaign.values.inicio)} → {formatDate(campaign.values.fin)}</span></div>
      <div className={p.actions}>
        <button type="button" className={buttonClass(canEditPlan ? "primary" : "secondary", true)} onClick={() => setWizard(true)}>{canEditPlan ? "Continuar planificación" : "Ver planificación paso a paso"}</button>
        {approved ? <label className={p.field} style={{ minWidth: 180 }}><span>Estado de la campaña</span><select value={campaign.values.estado || "En preparación"} disabled={!ops.can("lt")} onChange={(e) => ops.setCampaignStatus(campaign, e.target.value)}>{CAMPAIGN_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label> : null}
        <button type="button" className={buttonClass("ghost", true)} disabled={!ops.can("lt") && !ops.can("pm")} onClick={() => setTaskOpen(true)}>Nueva tarea vinculada</button>
      </div>
    </section>

    <div className={p.instances} aria-label="Instancias de la campaña">
      <section className={p.instance} data-active={!approved} aria-label="Instancia 1 · Planificación general">
        <h3>Instancia 1 · Planificación general</h3>
        <span className={p.small}>{plan.state === "Borrador" ? `Borrador · paso ${plan.step + 1} de 8 · ${ops.team.lt}` : plan.state === "En validación del PM" ? `Esperando la validación de ${ops.team.pm}` : plan.state === "Devuelta al Líder técnico" ? `Devuelta a ${ops.team.lt} para ajustar` : `Aprobada${campaign.values.aprobadoPor ? ` por ${campaign.values.aprobadoPor}` : ""}${campaign.values.aprobadoEn ? ` · ${formatDateTime(campaign.values.aprobadoEn)}` : ""}`}</span>
        {plan.state === "En validación del PM" ? <div className={p.stack} style={{ gap: 8 }}>
          <label className={p.field}><span>Comentario del PM</span><textarea rows={2} maxLength={2000} value={note} disabled={!ops.can("pm")} onChange={(e) => setNote(e.target.value)} /></label>
          <div className={p.actions}><button type="button" className={buttonClass("primary", true)} disabled={!ops.can("pm")} onClick={() => { if (ops.planAction(campaign, "approve", note)) setNote(""); }}>Aprobar planificación</button><button type="button" className={buttonClass("secondary", true)} disabled={!ops.can("pm")} onClick={() => { if (ops.planAction(campaign, "return", note)) setNote(""); }}>Devolver con comentarios</button></div>
          {!ops.can("pm") ? <p className={p.small}>La valida {ops.team.pm} (PM).</p> : null}
        </div> : null}
        {planComments.length ? <ul className={p.comments}>{planComments.map((item) => <li key={item.id} data-kind={item.kind}><div><strong>{item.actor}</strong><span>{formatDateTime(item.at)}</span></div>{item.text ? <p>{item.text}</p> : null}</li>)}</ul> : null}
      </section>
      <section className={p.instance} data-active={approved} aria-label="Instancia 2 · Brief y desarrollo de piezas">
        <h3>Instancia 2 · Brief y desarrollo de piezas</h3>
        {approved ? <>
          <span className={p.small}>Nuevas piezas: cada una repite el proceso (formulario, brief, Content, PM, diseño, PM, cliente).</span>
          <div className={p.actions}>
            <button type="button" className={buttonClass("primary", true)} disabled={!ops.can("lt")} onClick={() => setRequest("Anuncio")}>Pedir anuncio</button>
            <button type="button" className={buttonClass("secondary", true)} disabled={!ops.can("lt")} onClick={() => setRequest("Landing page")}>Brief de landing</button>
            <button type="button" className={buttonClass("secondary", true)} disabled={!ops.can("lt")} onClick={() => setRequest("Atención por WhatsApp")}>Brief de atención por mail o WhatsApp</button>
          </div>
        </> : <span className={p.small}>Se habilita cuando el PM aprueba la planificación.</span>}
      </section>
    </div>

    <Panel title="Desglose de métricas" id="campaign-metrics" description={breakdown.hasData ? "Últimas 4 semanas por canal · datos de demostración (reparto según la distribución planificada)" : "Sin métricas: las plataformas no están conectadas y no hay datos de demostración para esta campaña."}>
      <div className={p.body}>
        <DemoBar>Las cifras de esta campaña son ficticias. Meta Ads, Google Ads, TikTok Ads y ChatGPT Ads figuran como «No conectada»: no hay sincronización.</DemoBar>
        {breakdown.hasData ? <>
          <Strip label="Totales de la campaña (demo)" items={[
            { label: "Inversión", value: moneyShort(breakdown.totals.spend) },
            { label: "Impresiones", value: breakdown.totals.impressions.toLocaleString("es-AR") },
            { label: "Clics", value: breakdown.totals.clicks.toLocaleString("es-AR"), detail: `CTR ${breakdown.totals.ctr.toFixed(2).replace(".", ",")} %` },
            { label: "Leads", value: breakdown.totals.leads.toLocaleString("es-AR") },
            { label: "CPL", value: money(breakdown.totals.cpl) },
          ]} />
          <div className={p.tableWrap}><table className={p.deadlines}><caption style={{ textAlign: "left", fontSize: 12, color: "var(--av-text-muted)", paddingBottom: 6 }}>Resumen por canal (demo)</caption><thead><tr><th scope="col">Canal</th><th scope="col">Participación</th><th scope="col">Inversión</th><th scope="col">Clics</th><th scope="col">Leads</th><th scope="col">CPL</th><th scope="col">Conexión</th></tr></thead><tbody>{breakdown.rows.map((row) => <tr key={row.channel}><td>{row.channel}</td><td>{Math.round(row.share)} %</td><td>{moneyShort(row.spend)}</td><td>{row.clicks.toLocaleString("es-AR")}</td><td>{row.leads}</td><td>{row.cpl ? money(row.cpl) : "—"}</td><td><Badge tone="stone">No conectada</Badge></td></tr>)}</tbody></table></div>
        </> : <PlatformsPanel extra={Object.keys(plan.channels)} />}
      </div>
    </Panel>

    <Panel title="Plan de campaña" id="campaign-plan" description={plan.legacy ? "Campaña cargada antes del paso a paso: se muestran los datos disponibles." : "Desarrollo de campaña según el documento de Avans"}>
      <div className={p.body}><CampaignPlanSummary client={client} campaign={campaign} /></div>
    </Panel>

    <div className={p.cols2}>
      <Panel title={`Anuncios circulando · ${circulating.length}`} id="campaign-circulating"><div className={p.body}>{adList(circulating, "Ningún anuncio en circulación.")}</div></Panel>
      <Panel title={`Piezas en flujo · ${inFlow.length}`} id="campaign-flow" actions={approved ? <button type="button" className={buttonClass("secondary", true)} disabled={!ops.can("lt")} onClick={() => setRequest("Anuncio")}>Nuevas piezas</button> : undefined}><div className={p.body}>{adList(inFlow, "Sin pedidos en curso.")}</div></Panel>
      <Panel title={`Anuncios anteriores · ${previous.length}`} id="campaign-previous"><div className={p.body}>{adList(previous, "Sin anuncios anteriores.")}</div></Panel>
      <Panel title="Landing final" id="campaign-landing"><div className={p.body}>{adList(landings.filter((ad) => adState(ad) === "En circulación"), "Todavía no hay una landing publicada.")}{landings.filter((ad) => adState(ad) !== "En circulación" && adState(ad) !== "Finalizado").map((ad) => <p key={ad.id} className={p.small}>En desarrollo: {ad.values.nombre} · {adState(ad)}</p>)}<p className={p.small}>Plan: {plan.landing || "sin landing definida"}</p></div></Panel>
      <Panel title="Estímulos posteriores" id="campaign-stimuli"><div className={p.body}>
        {stimuli.length ? adList(stimuli, "") : null}
        <ul className={p.legend} style={{ display: "grid", gap: 4 }}><li><strong>WhatsApp:</strong> {plan.whatsapp || "—"}</li><li><strong>CRM:</strong> {plan.crm || "—"}</li><li><strong>Email:</strong> {plan.email || "—"}</li></ul>
      </div></Panel>
      <Panel title="Seguimiento y optimización" id="campaign-optimization"><div className={p.body}>
        <AiPending what="Sugerencias de optimización" />
        {optimizations.length ? <ul className={p.comments}>{optimizations.map((item) => <li key={item.id}><div><strong>{item.values.hipotesis}</strong><StatusBadge status={item.values.estado ?? ""} /></div><p>Esperado {item.values.resultadoEsperado || "—"} · observado {item.values.resultadoObservado || "—"}</p></li>)}</ul> : <p className={p.small}>Sin optimizaciones registradas para esta campaña.</p>}
        <Link href={sectionHref(client.slug, "publicidad-digital", "optimizacion")} style={{ color: "var(--av-link)", fontSize: 13 }}>Abrir registro de optimización</Link>
      </div></Panel>
    </div>

    <div className={p.cols2}>
      <Panel title={`Tareas vinculadas · ${linked.length}`} id="campaign-tasks">{linked.length ? <div className={p.body}><ul className={p.comments}>{linked.map((task) => <li key={task.id}><div><Link href={sectionHref(client.slug, "publicidad-digital", "tareas", `&task=${task.id}`)} style={{ color: "var(--av-link)" }}>{task.id} · {task.title}</Link><OSDue label={dueLabel(task)} kind={task.dueKind} status={task.status} /></div><p>{task.owner} · {task.status}</p></li>)}</ul></div> : <div className={p.body}><p className={p.small}>Sin tareas vinculadas.</p></div>}</Panel>
      <Panel title="Historial" id="campaign-history"><div className={p.body}><ul className={p.history}>{campaign.history.map((entry, index) => <li key={`${entry.at}-${index}`}>{entry.text} · {entry.user} · {formatDateTime(entry.at)}</li>)}</ul></div></Panel>
    </div>

    {wizard ? <CampaignWizard client={client} campaign={campaign} onClose={() => setWizard(false)} onDone={() => setWizard(false)} /> : null}
    {request ? <AdRequestPanel client={client} campaign={campaign} initialType={request} origin={ads.length ? "Nuevas piezas" : "Instancia 2"} onClose={() => setRequest(null)} onCreated={(ad) => { setRequest(null); setOpenAd(ad.id); }} /> : null}
    {selectedAd ? <AdDetail key={`${selectedAd.id}-${selectedAd.updatedAt}`} client={client} ad={selectedAd} campaign={campaign} onClose={() => setOpenAd(null)} /> : null}
    {taskOpen ? <NewTaskModal clientSlug={client.slug} serviceId="publicidad-digital" workItems={[{ collection: "campanas", id: campaign.id, label: campaign.values.nombre || campaign.id }]} workItemLabel="Campaña" defaultWorkItemId={campaign.id} onClose={() => setTaskOpen(false)} /> : null}
  </div>;
}
