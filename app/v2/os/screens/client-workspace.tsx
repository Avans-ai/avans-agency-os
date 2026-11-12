"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { ClientBenchmark } from "../../benchmark-data";
import { AvansModuleIcon } from "../brand";
import {
  canManageClient,
  clientAttention,
  directorMeta,
  serviceSummary,
  type ClientChannel,
} from "../director-data";
import { Glyph } from "../glyphs";
import { serviceCatalog, serviceLabel, type OsClient, type ServiceId } from "../os-data";
import { useOsStore } from "../os-store";
import { serviceHref } from "../service-workspace-data";
import { useLocalStorageState } from "../local-persistence";
import { Avatar, Badge, buttonClass, LinkButton, OSEmptyState, OSStatus } from "../ui";
import s from "../os.module.css";
import sc from "../screens.module.css";
import d from "./director-update.module.css";
import { ClientManagementContent, type ClientManagementView } from "./client-management-views";
import { ClientOperationNav } from "./client-operation-nav";
import { AddServiceModuleButton } from "./service-modules-dialog";

const MANAGEMENT_VIEWS: { id: ClientManagementView; label: string; description: string }[] = [
  { id: "ficha", label: "Ficha del cliente", description: "Alcance y negocio" },
  { id: "benchmark", label: "Benchmark", description: "Competidores e insights" },
  { id: "plan", label: "Plan de Marketing", description: "Plan por módulo" },
  { id: "reportes", label: "Reportes", description: "Semanal y mensual" },
  { id: "documentos", label: "Documentos", description: "Fuentes y actualizaciones" },
];

function requestedView(value: string | null): ClientManagementView | "inicio" {
  return MANAGEMENT_VIEWS.some((item) => item.id === value) ? value as ClientManagementView : "inicio";
}

function moduleTone(state: string) {
  if (state === "Al día") return "cool" as const;
  if (state === "Atención") return "error" as const;
  if (state === "Revisión") return "peach" as const;
  return "info" as const;
}

export function ClientWorkspace({ client, benchmark }: { client: OsClient; depth?: unknown; benchmark?: ClientBenchmark }) {
  const params = useSearchParams();
  const { role, tasks, notify, servicesOf } = useOsStore();
  const view = requestedView(params.get("view"));
  const meta = directorMeta(client.slug);
  const [channels, setChannels] = useLocalStorageState<ClientChannel[]>(`client:${client.slug}:channels`, meta?.channels ?? []);
  const [editingChannels, setEditingChannels] = useState(false);
  const canManage = canManageClient(role, client.slug);
  const activeServices = serviceCatalog.filter((service) => servicesOf(client.slug).includes(service.id));

  function updateChannel(id: string, field: "label" | "value", value: string) {
    setChannels((current) => current.map((channel) => channel.id === id ? { ...channel, [field]: value } : channel));
  }

  function saveChannels() {
    setEditingChannels(false);
    notify("Canales guardados en este navegador. La sincronización multiusuario todavía requiere Supabase.", "success");
  }

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

        <div className={d.bannerChannels}>
          <div className={d.channelList} aria-label="Canales y plataformas del plan">
            {channels.map((channel) => <span className={d.channel} key={channel.id}><strong>{channel.label}</strong><span>{channel.value}</span></span>)}
          </div>
          {canManage ? <button type="button" className={buttonClass("secondary", true)} aria-expanded={editingChannels} onClick={() => setEditingChannels((value) => !value)}>{editingChannels ? "Cerrar edición" : "Editar canales"}</button> : <Badge tone="stone">Canales en solo lectura</Badge>}
        </div>

        {editingChannels ? (
          <section className={s.surface} aria-label="Editar canales y plataformas">
            <div className={s.cardHead}><h2>Canales y plataformas</h2><span className={s.cardMeta}>Cambios de sesión</span></div>
            <div className={sc.cardBody}>
              {channels.map((channel) => (
                <div className={d.businessGrid} key={channel.id} style={{ marginBottom: 8 }}>
                  <label className={s.field} style={{ padding: 12 }}><span>Nombre</span><input className={s.input} value={channel.label} onChange={(event) => updateChannel(channel.id, "label", event.target.value)} /></label>
                  <label className={s.field} style={{ padding: 12 }}><span>Cuenta o URL</span><input className={s.input} value={channel.value} onChange={(event) => updateChannel(channel.id, "value", event.target.value)} /></label>
                </div>
              ))}
              <div className={s.actions} style={{ justifyContent: "flex-start" }}>
                <button type="button" className={buttonClass("ghost", true)} onClick={() => setChannels((current) => [...current, { id: `LOCAL-${Date.now()}`, label: "Nuevo canal", value: "Pendiente", kind: "platform" }])}>Sumar canal</button>
                <button type="button" className={buttonClass("dark", true)} onClick={saveChannels}>Guardar cambios</button>
              </div>
              <p className={s.demoNote}>Los cambios quedan guardados en este navegador. Todavía no se sincronizan entre usuarios ni reemplazan los permisos de backend.</p>
            </div>
          </section>
        ) : null}

        <div>
          <p className={d.managementLabel}>Gestión y estrategia</p>
          <nav className={d.managementActions} aria-label={`Gestión de ${client.name}`}>
            {MANAGEMENT_VIEWS.map((item) => (
              <Link key={item.id} href={`/v2/clientes/${client.slug}?view=${item.id}`} className={d.managementAction} data-active={view === item.id} aria-current={view === item.id ? "page" : undefined}>
                <strong>{item.label}</strong><span>{item.description}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <ClientOperationNav client={client} active="inicio" />

      <main className={d.clientBody}>
        {view === "inicio" ? <ClientDailyHome client={client} activeServices={activeServices.map((service) => service.id)} /> : <ClientManagementContent client={client} view={view} benchmark={benchmark} />}
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
