"use client";

/* Publicidad digital · Inicio: alertas, semáforos de KPIs semanales, presupuesto mensual,
 * gasto por canal y campañas abiertas. Métricas DE DEMOSTRACIÓN. */
import { Badge, buttonClass } from "../ui";
import type { OsClient } from "../os-data";
import { Panel, StatusBadge } from "./module-ui";
import { adState, campaignPlan, stageDue, WHO_LABEL, STAGE_OWNER, AD_STAGES, type AdState } from "./paid-model";
import { channelSpend, monthlyBudget, paidAlerts, weeklyKpis } from "./paid-metrics";
import { Bar, ChannelStack, CHANNEL_COLOR, DemoBar, LightDot, money, moneyShort, PlatformsPanel } from "./paid-ui";
import { usePaidData, usePaidDemoSetup } from "./use-paid-operations";
import type { ModuleRecord } from "./types";
import p from "./paid.module.css";

type Go = (section: string, extra?: Record<string, string>) => void;
const TODAY = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

export function isLate(ad: ModuleRecord, today = TODAY()) {
  const state = adState(ad);
  if (state === "En circulación" || state === "Finalizado") return false;
  const due = stageDue(ad, state);
  return Boolean(due) && due < today;
}

export function CampaignCard({ campaign, ads, go }: { campaign: ModuleRecord; ads: ModuleRecord[]; go: Go }) {
  const plan = campaignPlan(campaign);
  const mine = ads.filter((ad) => ad.values.campana === campaign.id);
  const circulating = mine.filter((ad) => adState(ad) === "En circulación").length;
  const inFlow = mine.filter((ad) => (AD_STAGES as readonly string[]).includes(adState(ad))).length;
  return <article className={p.card} data-state={plan.state} aria-label={`Campaña ${campaign.values.nombre}`}>
    <div className={p.cardMeta}><StatusBadge status={campaign.values.estado || "Borrador"} /><Badge tone={plan.state === "Aprobada" ? "cool" : plan.state === "En validación del PM" ? "peach" : plan.state === "Borrador" ? "stone" : "error"}>Plan: {plan.state}</Badge>{campaign.source === "demo" ? <span className={p.demoTag}>Demo</span> : null}</div>
    <button type="button" className={p.cardTitle} onClick={() => go("campanas", { campana: campaign.id })}>{campaign.values.nombre || campaign.id}</button>
    <span className={p.small}>{campaign.values.objetivo || "Sin objetivo"} · {plan.monthlyBudget ? `${moneyShort(plan.monthlyBudget)} por mes` : "Sin presupuesto"}</span>
    <ChannelStack channels={plan.channels} label={`Canales de ${campaign.values.nombre}`} />
    <div className={p.chips}><span className={p.chip}>{circulating} en circulación</span><span className={p.chip} data-tone={inFlow ? "accent" : undefined}>{inFlow} en flujo</span>{plan.state === "Borrador" ? <span className={p.chip}>Paso {plan.step + 1} de 8</span> : null}</div>
  </article>;
}

export function PaidHome({ client, go }: { client: OsClient; go: Go }) {
  usePaidDemoSetup(client);
  const { data } = usePaidData(client);
  const campaigns = data.campanas ?? [];
  const ads = data.anuncios ?? [];
  const weekly = weeklyKpis(client.slug, campaigns);
  const budget = monthlyBudget(campaigns);
  const spend = channelSpend(campaigns);
  const spendRows = Object.entries(spend).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)) as [string, number][];
  const maxSpend = Math.max(1, ...spendRows.map(([, value]) => value));
  const lateAds = ads.filter((ad) => isLate(ad)).map((ad) => ({ id: ad.id, name: ad.values.nombre, stage: adState(ad) }));
  const pendingPlans = campaigns.filter((campaign) => campaignPlan(campaign).state === "En validación del PM").map((campaign) => ({ id: campaign.id, name: campaign.values.nombre }));
  const alerts = paidAlerts({ kpis: weekly.kpis, budget, lateAds, pendingPlans });
  const open = campaigns.filter((campaign) => campaign.values.estado !== "Finalizada");
  const flowCounts = (AD_STAGES as readonly AdState[]).map((stage) => ({ stage, count: ads.filter((ad) => adState(ad) === stage).length }));
  const usedChannels = Array.from(new Set(campaigns.flatMap((campaign) => Object.keys(campaignPlan(campaign).channels))));
  const maxBudget = Math.max(1, ...budget.rows.map((row) => Math.max(row.monthly, row.spent)));

  return <div className={p.stack}>
    <DemoBar />
    <Panel title="Alertas" id="paid-alerts" description={`${alerts.length ? `${alerts.length} para revisar` : "Sin alertas"} · semáforos, ritmo de gasto, plazos y validaciones`}>
      <div className={p.body}>
        {alerts.length ? <ul className={p.alerts} aria-label="Alertas de Publicidad digital">{alerts.map((alert) => <li key={alert.id} data-light={alert.light}><span className={p.dot} data-light={alert.light} aria-hidden="true" /><span>{alert.text}</span><span className={p.small}>{alert.light === "rojo" ? "Urgente" : "Revisar"}</span></li>)}</ul> : <p className={p.muted}>Todo dentro de los objetivos de demostración.</p>}
      </div>
    </Panel>

    <Panel title="KPIs semanales" id="paid-kpis" description={weekly.hasData ? `${weekly.weekLabel} vs. objetivo semanal · datos de demostración` : "Sin métricas: no hay plataformas conectadas ni datos de demostración para esta cuenta."}>
      {weekly.hasData ? <section className={p.lights} aria-label="Semáforos de KPIs semanales">
        {weekly.kpis.map((kpi) => <div className={p.light} key={kpi.id} data-light={kpi.light}>
          <span>{kpi.label}</span>
          <strong>{kpi.display}</strong>
          <LightDot light={kpi.light} />
          <small>Objetivo {kpi.targetDisplay} · semana anterior {kpi.id === "cpl" ? money(kpi.previous) : kpi.id === "ctr" ? `${kpi.previous.toFixed(2).replace(".", ",")} %` : Math.round(kpi.previous).toLocaleString("es-AR")}</small>
        </div>)}
      </section> : <div className={p.body}><p className={p.muted}>Los semáforos aparecen cuando haya métricas. No se simulan.</p></div>}
    </Panel>

    <div className={p.cols2}>
      <Panel title="Presupuesto mensual" id="paid-budget" description={`${budget.month.label} · día ${budget.month.day} de ${budget.month.days} · campañas activas · demo`}>
        <div className={p.body}>
          <div className={p.light} data-light={budget.light} style={{ borderTopWidth: 4 }}>
            <span>Gastado a la fecha</span>
            <strong>{moneyShort(budget.spent)} <small>de {moneyShort(budget.monthly)}</small></strong>
            <LightDot light={budget.light} />
            <small>Ritmo {Math.round(budget.pacing * 100)} % del esperado ({moneyShort(budget.expected)}) · proyección {moneyShort(budget.projected)}</small>
          </div>
          <ul className={p.bars} aria-label="Presupuesto vs. gasto por campaña">
            {budget.rows.map((row) => <Bar key={row.campaign.id} label={row.campaign.values.nombre} value={row.spent} max={maxBudget} marker={row.expected} light={row.light} display={`${Math.round(row.pacing * 100)} %`} title={`Gastado ${money(row.spent)} de ${money(row.monthly)} · esperado ${money(row.expected)}`} />)}
          </ul>
          <p className={p.small}>Barra: gasto a la fecha · línea: gasto esperado a hoy. Verde 90–110 % del ritmo, amarillo 75–125 %, rojo fuera de ese rango.</p>
        </div>
      </Panel>
      <Panel title="Gasto por canal" id="paid-channels" description="Mes a la fecha, según la distribución planificada de cada campaña · demo">
        <div className={p.body}>
          {spendRows.length ? <ul className={p.bars} aria-label="Gasto por canal">{spendRows.map(([channel, value]) => <li className={p.barRow} key={channel}><span><span className={p.swatch} style={{ background: CHANNEL_COLOR[channel] }} /> {channel}</span><span className={p.track}><span className={p.fill} style={{ width: `${(value / maxSpend) * 100}%`, background: CHANNEL_COLOR[channel] }} /></span><span className={p.num}>{moneyShort(value)}</span></li>)}</ul> : <p className={p.muted}>Sin gasto registrado.</p>}
          <PlatformsPanel extra={usedChannels} />
        </div>
      </Panel>
    </div>

    <Panel title={`Campañas abiertas · ${open.length}`} id="paid-open" description="Campañas de cara al cliente (no campañas técnicas de cada plataforma)" actions={<button type="button" className={buttonClass("secondary", true)} onClick={() => go("campanas")}>Ver campañas</button>}>
      <div className={p.body}>
        {open.length ? <div className={p.cards}>{open.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} ads={ads} go={go} />)}</div> : <p className={p.muted}>Sin campañas abiertas. Creá la primera desde «Campañas».</p>}
      </div>
    </Panel>

    <Panel title="Piezas en flujo" id="paid-flow" description="Una tarea por pieza que se reasigna en cada etapa" actions={<button type="button" className={buttonClass("secondary", true)} onClick={() => go("anuncios")}>Abrir anuncios</button>}>
      <div className={p.body}>
        <ol className={p.flow} aria-label="Pedidos por etapa">{flowCounts.map(({ stage, count }) => <li key={stage} data-state={count ? "current" : undefined}><b>{count}</b><span>{stage}</span><em>{WHO_LABEL[STAGE_OWNER[stage]]}</em></li>)}</ol>
        {lateAds.length ? <p className={p.small}>{lateAds.length} con la etapa vencida · ver plazos en cada pedido.</p> : null}
      </div>
    </Panel>
  </div>;
}
