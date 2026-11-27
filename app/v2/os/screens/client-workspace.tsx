"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { ClientBenchmark } from "../../benchmark-data";
import { clientAttention, directorMeta } from "../director-data";
import { serviceSnapshots } from "../metrics";
import { currentMonthPeriod, longDate, todayIso } from "../metrics/period";
import { useMetricsInput } from "../metrics/use-metrics-input";
import { ReturnLink } from "../navigation/back";
import { Glyph } from "../glyphs";
import { serviceCatalog, serviceLabel, type OsClient, type ServiceId } from "../os-data";
import { useOsStore } from "../os-store";
import { serviceHref } from "../service-workspace-data";
import { Avatar, LinkButton, OSEmptyState, OSStatus } from "../ui";
import s from "../os.module.css";
import sc from "../screens.module.css";
import d from "./director-update.module.css";
import h from "./client-home.module.css";
import { HealthRules, ServiceBlock } from "./client-home-blocks";
import { ClientManagementContent, type ClientManagementView } from "./client-management-views";
import { ClientOperationNav } from "./client-operation-nav";
import { ClientManagementHub, ManagementSubnav } from "./client-management-hub";
import { AddServiceModuleButton } from "./service-modules-dialog";

const MANAGEMENT_VIEWS: ClientManagementView[] = ["ficha", "cuestionario", "benchmark", "plan", "reportes", "documentos"];

function requestedView(value: string | null): ClientManagementView | "inicio" | "gestion" {
  if (value === "gestion") return "gestion";
  return MANAGEMENT_VIEWS.includes(value as ClientManagementView) ? (value as ClientManagementView) : "inicio";
}

export function ClientWorkspace({ client, benchmark }: { client: OsClient; depth?: unknown; benchmark?: ClientBenchmark }) {
  const params = useSearchParams();
  const { servicesOf } = useOsStore();
  const view = requestedView(params.get("view"));
  const activeServices = serviceCatalog.filter((service) => servicesOf(client.slug).includes(service.id));

  return (
    <>
      <header className={d.clientBanner}>
        <div className={d.bannerMain}>
          <span className={d.bannerLogo} aria-hidden="true">{client.initials}</span>
          <div className={d.bannerIdentity}>
            <div className={d.bannerTitle}><h1>{client.name}</h1><OSStatus status={client.status} /></div>
            <p>Cliente desde {client.since} · Burbuja {client.bubble} · Responsable <strong>{client.owner}</strong> · {activeServices.length} {activeServices.length === 1 ? "módulo activo" : "módulos activos"}</p>
          </div>
          <div className={d.bannerTeam}>
            <span>Equipo asignado</span>
            <div className={d.teamStack} aria-label={client.team.map((person) => person.name).join(", ")}>{client.team.slice(0, 5).map((person) => <Avatar key={person.name} name={person.name} size="md" />)}<span className={d.teamText}>{client.team.length}</span></div>
          </div>
        </div>
      </header>

      <ClientOperationNav client={client} active={view === "inicio" ? "inicio" : "gestion"} />
      {view !== "inicio" ? <ManagementSubnav client={client} view={view} /> : null}

      <main className={d.clientBody}>
        {view === "inicio" ? (
          <ClientDailyHome client={client} activeServices={activeServices.map((service) => service.id)} />
        ) : view === "gestion" ? (
          <ClientManagementHub client={client} />
        ) : (
          <ClientManagementContent client={client} view={view} benchmark={benchmark} />
        )}
      </main>
    </>
  );
}

function ClientDailyHome({ client, activeServices }: { client: OsClient; activeServices: ServiceId[] }) {
  const { tasks } = useOsStore();
  const meta = directorMeta(client.slug);
  const attention = clientAttention(client.slug, tasks);
  const insights = meta?.insights ?? [];
  const [insightIndex, setInsightIndex] = useState(0);
  const insight = insights[insightIndex];
  const { input, hydrated } = useMetricsInput(client);
  // Período de las métricas: el mes en curso; los estados operativos se leen a hoy.
  const asOf = todayIso();
  const period = useMemo(() => currentMonthPeriod(asOf), [asOf]);
  const snapshots = useMemo(() => serviceSnapshots(activeServices, input, { period, asOf }), [activeServices, asOf, input, period]);

  function changeInsight(direction: -1 | 1) {
    if (!insights.length) return;
    setInsightIndex((current) => (current + direction + insights.length) % insights.length);
  }

  return (
    <div className={sc.stack}>
      <div className={h.layout}>
        <section className={h.main} aria-labelledby="modules-summary-title">
          <div className={h.head}>
            <div>
              <h2 id="modules-summary-title">Resumen de módulos</h2>
              <p>Estado, indicadores, pendientes y próximas fechas de cada servicio activo.</p>
              <p className={h.period}><span>Período de las métricas: <strong>{period.label}</strong></span><span>Estados al <strong>{longDate(asOf)}</strong></span>{hydrated ? null : <span>Cargando datos guardados…</span>}</p>
            </div>
            <AddServiceModuleButton client={client} />
          </div>
          {!snapshots.length ? <OSEmptyState icon="ajuste" title="Sin módulos de servicio activos">Agregá los módulos contratados para habilitar su navegación, su espacio de trabajo y sus secciones del Plan de Marketing.</OSEmptyState> : (
            <ol className={h.blocks} aria-label="Servicios activos">
              {snapshots.map((snapshot) => <li key={snapshot.serviceId}><ServiceBlock snapshot={snapshot} /></li>)}
            </ol>
          )}
          {snapshots.length ? <HealthRules /> : null}
        </section>

        <aside className={`${s.surface} ${h.aside}`} aria-labelledby="client-attention-title">
          <div className={s.cardHead}><h2 id="client-attention-title">Alertas y temas que requieren atención</h2><span className={s.cardMeta}>Según tu rol</span></div>
          {attention.length ? <div className={d.attentionList}>{attention.map((item) => (
            <article className={d.attentionItem} key={item.id}>
              <span className={d.attentionBar} data-tone={item.tone} aria-hidden="true" />
              <div><strong>{item.title}</strong><p>{item.detail}</p>{item.serviceId ? <ReturnLink className={s.link} href={serviceHref(client.slug, item.serviceId)}>Abrir {serviceLabel(item.serviceId)}</ReturnLink> : null}</div>
            </article>
          ))}</div> : <OSEmptyState icon="chispa" title="Sin temas pendientes">Los bloqueos y alertas del cliente aparecerán acá.</OSEmptyState>}
        </aside>
      </div>

      {insight ? (
        <section className={d.insight} aria-label="Insight y recomendación de IA">
          <div className={d.insightMain}>
            <span className={d.insightEyebrow}>Insight para {serviceLabel(insight.serviceId)} · {insightIndex + 1} de {insights.length}</span>
            <h3>{insight.title}</h3>
            <p>{insight.detail}</p>
            <span className={s.cellSub} style={{ color: "var(--av-ash)" }}>Fuente: {insight.source} · Dato de demostración, no generado por una IA activa.</span>
          </div>
          <div className={d.insightActions}>
            <div className={d.insightNav}>
              <button type="button" onClick={() => changeInsight(-1)} aria-label="Insight anterior"><Glyph name="chevron-left" size={16} /></button>
              <button type="button" onClick={() => changeInsight(1)} aria-label="Insight siguiente"><Glyph name="chevron-right" size={16} /></button>
            </div>
            <LinkButton href={serviceHref(client.slug, insight.serviceId)} variant="primary" small>Ver más</LinkButton>
          </div>
        </section>
      ) : <OSEmptyState icon="idea" title="Todavía no hay insights">Las recomendaciones aparecerán segmentadas por módulo.</OSEmptyState>}
    </div>
  );
}
