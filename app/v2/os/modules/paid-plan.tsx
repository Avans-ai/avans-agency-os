"use client";

/* Plan de medios: plan general de pauta (consulta del Plan de Marketing, sin copiarlo)
 * y, debajo, el detalle del plan de cada campaña. */
import Link from "next/link";
import type { OsClient } from "../os-data";
import { Badge, buttonClass } from "../ui";
import { Panel, StatusBadge } from "./module-ui";
import { campaignPlan, mediaPlanFromKnowledge, type PaidChannel } from "./paid-model";
import { Bar, ChannelStack, DiscoveryLink, money, moneyShort, usePaidDiscovery } from "./paid-ui";
import { usePaidData } from "./use-paid-operations";
import type { ModuleRecord } from "./types";
import p from "./paid.module.css";

type Go = (section: string, extra?: Record<string, string>) => void;

export function CampaignPlanSummary({ client, campaign }: { client: OsClient; campaign: ModuleRecord }) {
  const discovery = usePaidDiscovery(client);
  const plan = campaignPlan(campaign);
  const icps = discovery.name(discovery.icps, plan.icpIds);
  const segments = discovery.name(discovery.segments, plan.segmentIds);
  const products = [...discovery.name(discovery.offerings, plan.productIds), ...(campaign.values.productosTexto ? [campaign.values.productosTexto] : [])];
  const row = (label: string, value: string, wide = false) => <div data-wide={wide || undefined}><dt>{label}</dt><dd>{value || "—"}</dd></div>;
  return <dl className={p.dl}>
    {row("Target · ICP y segmentos (Discovery)", [...icps, ...segments].join(" · ") || "Sin elegir del Discovery")}
    {row("Target · detalle", plan.audience)}
    {row("Productos o servicios", products.join(" · "))}
    {row("Presupuesto", plan.monthlyBudget ? `${money(plan.monthlyBudget)} por mes${plan.periodBudget ? ` · ${money(plan.periodBudget)} en el período` : ""}` : "")}
    <div data-wide><dt>Distribución por canal</dt><dd><ChannelStack channels={plan.channels} label={`Distribución de ${campaign.values.nombre}`} /></dd></div>
    {row("Enfoque publicitario", plan.focus, true)}
    {row("Mensaje principal", plan.message)}
    {row("Funnel", plan.funnel.join(" · "))}
    {row("Anuncios de Meta Ads", plan.metaAds, true)}
    {row("Anuncios de Google Ads", plan.googleAds, true)}
    {plan.otherAds ? row("Otros canales", plan.otherAds, true) : null}
    {row("Landing page", plan.landing, true)}
    {row("Estímulo · WhatsApp", plan.whatsapp)}
    {row("Estímulo · CRM", plan.crm)}
    {row("Estímulo · Email marketing", plan.email, true)}
  </dl>;
}

export function MediaPlanSection({ client, go }: { client: OsClient; go: Go }) {
  const discovery = usePaidDiscovery(client);
  const { data } = usePaidData(client);
  const general = mediaPlanFromKnowledge(discovery.planItems as Parameters<typeof mediaPlanFromKnowledge>[0]);
  const campaigns = (data.campanas ?? []).filter((campaign) => campaign.values.estado !== "Finalizada");
  const approved = campaigns.filter((campaign) => campaignPlan(campaign).state === "Aprobada");
  const monthly = approved.reduce((sum, campaign) => sum + campaignPlan(campaign).monthlyBudget, 0);
  const weighted: Partial<Record<PaidChannel, number>> = {};
  for (const campaign of approved) {
    const plan = campaignPlan(campaign);
    const total = Object.values(plan.channels).reduce<number>((sum, value) => sum + (value ?? 0), 0) || 100;
    for (const [channel, share] of Object.entries(plan.channels) as [PaidChannel, number][]) weighted[channel] = (weighted[channel] || 0) + plan.monthlyBudget * (share / total);
  }
  const maxCampaign = Math.max(1, ...approved.map((campaign) => campaignPlan(campaign).monthlyBudget));
  return <div className={p.stack}>
    <Panel title="Plan general de pauta" id="paid-media-plan" description="Definido en el Marketing Discovery y el Plan de Marketing. Es una consulta del plan vigente: no se copia ni se edita acá." actions={<Link className={buttonClass("secondary", true)} href={`/v2/clientes/${client.slug}?view=plan#plan-publicidad-digital`}>Abrir Plan de Marketing</Link>}>
      <div className={p.body}>
        {!discovery.hydrated ? <p className={p.small} role="status">Cargando el Plan de Marketing…</p> : general.empty ? <div className={p.stack} style={{ gap: 8 }}>
          <p className={p.muted} role="status">El Plan de Marketing de {client.name} todavía no tiene cargado el bloque de Publicidad digital (plan de medios, inversión por canal y KPIs). Se completa en Gestión y estrategia → Plan de Marketing y aparece acá automáticamente.</p>
          <DiscoveryLink client={client}>Ver el Marketing Discovery de {client.name}</DiscoveryLink>
        </div> : <>
          {general.campaigns.length ? <div className={p.tableWrap}><table className={p.deadlines}><caption style={{ textAlign: "left", fontSize: 12, color: "var(--av-text-muted)", paddingBottom: 6 }}>Campañas del Plan de Marketing</caption><thead><tr><th scope="col">Campaña</th><th scope="col">Foco y objetivo</th><th scope="col">Plataformas</th><th scope="col">Inversión</th><th scope="col">Estado</th></tr></thead><tbody>{general.campaigns.map((campaign) => <tr key={campaign.id}><td><strong>{campaign.name}</strong><br /><span className={p.small}>{campaign.audience}</span></td><td>{[campaign.focus, campaign.objective, campaign.funnel].filter(Boolean).join(" · ")}</td><td>{campaign.allocations.length ? campaign.allocations.map((a) => `${a.channel} ${a.share} %`).join(" · ") : campaign.platforms}</td><td>{campaign.monthlyInvestment ? `${campaign.currency} ${campaign.monthlyInvestment.toLocaleString("es-AR")}` : "—"} {campaign.share ? `· ${campaign.share} %` : ""}</td><td><Badge tone={campaign.status === "Validado" ? "cool" : "stone"}>{campaign.approval || campaign.status}</Badge></td></tr>)}</tbody></table></div> : <p className={p.small}>El plan no tiene campañas cargadas.</p>}
          {general.kpis.length ? <div className={p.chips} aria-label="KPIs del plan">{general.kpis.map((kpi) => <span key={kpi.id} className={p.chip}>{kpi.indicator || "KPI"}{kpi.model ? ` · ${kpi.model}` : ""}</span>)}</div> : null}
          {general.visibility.length ? <p className={p.small}>Incluye consideraciones de anuncios y visibilidad en IA (a verificar con cada proveedor).</p> : null}
        </>}
      </div>
    </Panel>

    <Panel title="Pauta planificada en Publicidad digital" id="paid-planned" description={`${approved.length} campañas con planificación aprobada · ${moneyShort(monthly)} por mes`}>
      <div className={p.body}>
        {approved.length ? <>
          <ChannelStack channels={weighted} label="Inversión mensual planificada por canal" />
          <ul className={p.bars} aria-label="Inversión mensual por campaña">{approved.map((campaign) => { const plan = campaignPlan(campaign); return <Bar key={campaign.id} label={campaign.values.nombre} value={plan.monthlyBudget} max={maxCampaign} display={moneyShort(plan.monthlyBudget)} tone="accent" />; })}</ul>
        </> : <p className={p.muted}>Todavía no hay planificaciones aprobadas.</p>}
      </div>
    </Panel>

    <Panel title="Plan de cada campaña" id="paid-campaign-plans" description="Detalle de la Instancia 1 · Planificación general de cada campaña abierta">
      <div className={p.body}>
        {campaigns.length ? campaigns.map((campaign, index) => { const plan = campaignPlan(campaign); return <details key={campaign.id} className={p.section} open={index === 0}>
          <summary style={{ cursor: "pointer", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}><span aria-hidden="true" className={p.small}>Ver plan ▾</span><strong>{campaign.values.nombre}</strong><StatusBadge status={campaign.values.estado || "Borrador"} /><Badge tone={plan.state === "Aprobada" ? "cool" : plan.state === "Borrador" ? "stone" : "peach"}>Plan: {plan.state}</Badge>{plan.legacy ? <span className={p.small}>Cargada antes del paso a paso</span> : null}</summary>
          <CampaignPlanSummary client={client} campaign={campaign} />
          <div className={p.actions}><button type="button" className={buttonClass("ghost", true)} onClick={() => go("campanas", { campana: campaign.id })}>Abrir campaña</button></div>
        </details>; }) : <p className={p.muted}>Sin campañas abiertas.</p>}
      </div>
    </Panel>
  </div>;
}
