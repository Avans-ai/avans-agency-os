"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { ClientBenchmark } from "../../benchmark-data";
import { AvansModuleIcon } from "../brand";
import {
  clientAttention,
  directorMeta,
  serviceSummary,
  tasksForClient,
} from "../director-data";
import { Glyph } from "../glyphs";
import { serviceCatalog, serviceLabel, type OsClient, type ServiceId } from "../os-data";
import { useOsStore } from "../os-store";
import { serviceHref } from "../service-workspace-data";
import { Avatar, Badge, LinkButton, OSEmptyState, OSStatus } from "../ui";
import s from "../os.module.css";
import sc from "../screens.module.css";
import d from "./director-update.module.css";
import { ClientManagementContent, type ClientManagementView } from "./client-management-views";
import { ClientOperationNav } from "./client-operation-nav";
import { ClientManagementHub, ManagementSubnav } from "./client-management-hub";
import { BannerModules } from "./client-banner";
import { AddServiceModuleButton } from "./service-modules-dialog";

const MANAGEMENT_VIEWS: ClientManagementView[] = ["ficha", "cuestionario", "benchmark", "plan", "reportes", "documentos"];

function requestedView(value: string | null): ClientManagementView | "inicio" | "gestion" {
  if (value === "gestion") return "gestion";
  return MANAGEMENT_VIEWS.includes(value as ClientManagementView) ? (value as ClientManagementView) : "inicio";
}

function moduleTone(state: string) {
  if (state === "Al día") return "cool" as const;
  if (state === "Atención") return "error" as const;
  if (state === "Revisión") return "peach" as const;
  return "info" as const;
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
        <BannerModules client={client} />
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
  const summaries = activeServices.map((serviceId) => serviceSummary(client.slug, serviceId, tasks));
  // Actividad relevante: el último movimiento de cada tarea del cliente (lo más reciente primero).
  const activity = useMemo(() => tasksForClient(tasks, client.slug)
    .filter((task) => !task.archivedAt && task.activity.length)
    .map((task) => ({ task, entry: task.activity[0] }))
    .sort((a, b) => Number(b.entry.when === "Ahora") - Number(a.entry.when === "Ahora"))
    .slice(0, 6), [client.slug, tasks]);

  function changeInsight(direction: -1 | 1) {
    if (!insights.length) return;
    setInsightIndex((current) => (current + direction + insights.length) % insights.length);
  }

  return (
    <div className={sc.stack}>
      <div className={d.dailyGrid}>
        <section className={sc.stack} aria-labelledby="modules-summary-title">
          <div className={s.pageHead}><div><h2 id="modules-summary-title" style={{ margin: 0, fontSize: 23, fontWeight: 500 }}>Resumen de módulos</h2><p>Los puntos más importantes de cada servicio contratado.</p></div><AddServiceModuleButton client={client} /></div>
          {!summaries.length ? <OSEmptyState icon="ajuste" title="Sin módulos de servicio activos">Agregá los módulos contratados para habilitar su navegación, su espacio de trabajo y sus secciones del Plan de Marketing.</OSEmptyState> : null}
          <div className={d.moduleGrid}>
            {summaries.map((summary) => {
              const definition = serviceCatalog.find((service) => service.id === summary.serviceId);
              return (
                <article className={d.moduleCard} key={summary.serviceId}>
                  <div className={d.moduleCardHead}>
                    <div className={d.moduleIdentity}><span className={d.moduleIcon}>{definition ? <AvansModuleIcon name={definition.icon} size={30} /> : null}</span><strong>{summary.label}</strong></div>
                    <Badge tone={moduleTone(summary.state)}>{summary.state}</Badge>
                  </div>
                  <div className={d.moduleStats}><div><span>Pendientes</span><strong>{summary.open}</strong></div><div><span>Bloqueos</span><strong>{summary.blocked}</strong></div><div><span>Aprobaciones</span><strong>{summary.approvals}</strong></div></div>
                  <div className={d.moduleNext}><strong>Próxima acción</strong>{summary.nextAction}</div>
                  <Link href={serviceHref(client.slug, summary.serviceId)}>Abrir {serviceLabel(summary.serviceId)}</Link>
                </article>
              );
            })}
          </div>
        </section>

        <aside className={s.surface} aria-labelledby="client-attention-title">
          <div className={s.cardHead}><h2 id="client-attention-title">Alertas y temas que requieren atención</h2><span className={s.cardMeta}>Según tu rol</span></div>
          {attention.length ? <div className={d.attentionList}>{attention.map((item) => (
            <article className={d.attentionItem} key={item.id}>
              <span className={d.attentionBar} data-tone={item.tone} aria-hidden="true" />
              <div><strong>{item.title}</strong><p>{item.detail}</p>{item.serviceId ? <Link className={s.link} href={serviceHref(client.slug, item.serviceId)}>Abrir {serviceLabel(item.serviceId)}</Link> : null}</div>
            </article>
          ))}</div> : <OSEmptyState icon="chispa" title="Sin temas pendientes">Los bloqueos y alertas del cliente aparecerán acá.</OSEmptyState>}
        </aside>
      </div>

      <section className={s.surface} aria-labelledby="client-activity-title">
        <div className={s.cardHead}><h2 id="client-activity-title">Actividad relevante</h2><span className={s.cardMeta}>Últimos movimientos de las tareas</span></div>
        {activity.length ? (
          <ol className={d.activityList}>
            {activity.map(({ task, entry }) => (
              <li key={task.id}>
                <span className={d.activityWhen}>{entry.when}</span>
                <span><strong>{task.title}</strong> · {entry.text}</span>
                {task.serviceId ? <Link className={s.link} href={`${serviceHref(client.slug, task.serviceId)}?seccion=tareas&task=${task.id}`}>{serviceLabel(task.serviceId)}</Link> : null}
              </li>
            ))}
          </ol>
        ) : <OSEmptyState icon="registro" title="Sin actividad reciente">Los movimientos de las tareas del cliente aparecerán acá.</OSEmptyState>}
      </section>

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
