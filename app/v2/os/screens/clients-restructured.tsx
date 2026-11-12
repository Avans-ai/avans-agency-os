"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import { AvansIcon } from "../brand";
import { clientOperation, plural, type ClientOperation } from "../client-operations";
import {
  canViewFinancials,
  directorMeta,
  isActiveClient,
  isAssignedClient,
} from "../director-data";
import { Glyph } from "../glyphs";
import { osClients, osProjects, serviceCatalog, serviceLabel, type ClientStatus, type OsClient, type ServiceId } from "../os-data";
import { useOsStore } from "../os-store";
import { dueLabel, formatMoney, STATUS_ORDER } from "../selectors";
import { Avatar, buttonClass, cx, OSEmptyState, OSStatus, PageHead, Progress } from "../ui";
import s from "../os.module.css";
import sc from "../screens.module.css";
import m from "./meeting-architecture.module.css";
import d from "./director-update.module.css";
import o from "./clients-operations.module.css";

type ClientTab = "mine" | "active" | "inactive" | "all";
type SortKey = "name" | "status" | "attention" | "fee" | "margin";
type ViewMode = "list" | "cards";

const TABS: { id: ClientTab; label: string }[] = [
  { id: "mine", label: "Tus clientes" },
  { id: "active", label: "Clientes activos" },
  { id: "inactive", label: "Clientes inactivos" },
  { id: "all", label: "Todos los clientes" },
];

const STATUS_OPTIONS: { value: "todos" | ClientStatus; label: string }[] = [
  { value: "todos", label: "Todos los estados" },
  { value: "al-dia", label: "Al día" },
  { value: "atencion", label: "Atención" },
  { value: "en-riesgo", label: "En riesgo" },
  { value: "onboarding", label: "Onboarding" },
  { value: "pausado", label: "Pausado" },
];

function validTab(value: string | null): ClientTab {
  return value === "active" || value === "inactive" || value === "all" || value === "mine" ? value : "mine";
}

function inTab(client: OsClient, tab: ClientTab) {
  if (tab === "mine") return isAssignedClient(client.slug);
  if (tab === "active") return isActiveClient(client);
  if (tab === "inactive") return !isActiveClient(client);
  return true;
}

function taskHref(task: { projectSlug: string; id: string }) {
  return `/v2/proyectos/${task.projectSlug}?task=${task.id}`;
}

/** Indicadores compactos de la operación: texto + forma, nunca solo color. */
function OperationIndicators({ op }: { op: ClientOperation }) {
  const clean = !op.overdue.length && !op.blockers.length;
  return (
    <span className={o.indicators}>
      <span className={o.indicatorMain}>{plural(op.projects.length, "proyecto activo", "proyectos activos")}</span>
      <span className={o.flags}>
        {op.overdue.length ? <span className={o.flag} data-tone="error"><span aria-hidden="true">■</span>{plural(op.overdue.length, "vencida", "vencidas")}</span> : null}
        {op.blockers.length ? <span className={o.flag} data-tone="warning"><span aria-hidden="true">▲</span>{plural(op.blockers.length, "bloqueo", "bloqueos")}</span> : null}
        {clean ? <span className={o.flag} data-tone="ok"><span aria-hidden="true">●</span>Sin vencidas ni bloqueos</span> : null}
      </span>
    </span>
  );
}

/** Detalle desplegable: proyectos activos, próxima entrega, alertas y accesos a la operación del cliente. */
function OperationPanel({ client, op }: { client: OsClient; op: ClientOperation }) {
  return (
    <div className={o.panel}>
      <section className={o.panelProjects} aria-label={`Proyectos activos de ${client.name}`}>
        <p className={o.panelMeta}>Cliente desde {client.since} · Burbuja {client.bubble} · {plural(op.openTasks, "tarea abierta", "tareas abiertas")}{op.approvals ? ` · ${op.approvals} en aprobación` : ""}</p>
        <h3 className={o.panelTitle}>Proyectos activos · {op.projects.length}</h3>
        {op.projects.length ? (
          <ul className={o.projectList}>
            {op.projects.map(({ project, serviceId, progress, overdue, blockers }) => (
              <li className={o.projectRow} key={project.slug}>
                <div className={o.projectName}>
                  <Link className={s.linkInk} href={`/v2/proyectos/${project.slug}`}>{project.name}</Link>
                  <small>{serviceLabel(serviceId)}{overdue || blockers ? ` · ${[overdue ? plural(overdue, "vencida", "vencidas") : "", blockers ? plural(blockers, "bloqueo", "bloqueos") : ""].filter(Boolean).join(" · ")}` : ""}</small>
                </div>
                <div className={o.projectField}><small>Responsable</small><span>{project.owner}</span></div>
                <div className={o.projectField}><small>Estado</small><OSStatus status={project.status} /></div>
                <div className={o.projectField}><small>Avance</small><Progress value={progress} accent label={`Avance de ${project.name}`} /></div>
                <div className={o.projectField}><small>Próximo hito</small><span>{project.delivery}</span>{project.alert ? <small className={o.projectAlert}>{project.alert}</small> : null}</div>
              </li>
            ))}
          </ul>
        ) : <p className={o.panelEmpty}>Sin proyectos activos en este momento.</p>}
      </section>
      <aside className={o.panelSide} aria-label={`Resumen operativo de ${client.name}`}>
        <div className={o.sideBlock}>
          <h3 className={o.panelTitle}>Próxima entrega</h3>
          {op.nextDelivery ? (
            <p className={o.sideText}>
              <Link className={s.linkInk} href={taskHref(op.nextDelivery)}>{op.nextDelivery.id} · {op.nextDelivery.deliverable ?? op.nextDelivery.title}</Link>
              <small>{op.nextDelivery.deliverable ? `${op.nextDelivery.title} · ` : ""}{dueLabel(op.nextDelivery)} · {op.nextDelivery.owner}</small>
            </p>
          ) : <p className={o.sideText}><small>Sin entregas abiertas.</small></p>}
        </div>
        <div className={o.sideBlock}>
          <h3 className={o.panelTitle}>Alertas</h3>
          {op.overdue.length || op.alerts.length ? (
            <ul className={o.alertList}>
              {op.overdue.slice(0, 2).map((task) => (
                <li key={`late-${task.id}`} data-tone="error"><Link className={s.linkInk} href={taskHref(task)}>{task.id} · {task.title}</Link><small>{dueLabel(task)} · {task.owner}</small></li>
              ))}
              {op.alerts.slice(0, 3).map((alert) => (
                <li key={alert.id} data-tone={alert.tone}><strong>{alert.title}</strong><small>{alert.detail}</small></li>
              ))}
            </ul>
          ) : <p className={o.sideText}><small>Sin alertas activas.</small></p>}
        </div>
        <div className={o.quickLinks}>
          <Link className={buttonClass("secondary", true)} href={`/v2/clientes/${client.slug}`}>Abrir cliente</Link>
          <Link className={buttonClass("secondary", true)} href={`/v2/clientes/${client.slug}/tareas`}>Tareas · {op.openTasks}</Link>
        </div>
      </aside>
    </div>
  );
}

function ExpandButton({ client, open, controls, onToggle }: { client: OsClient; open: boolean; controls: string; onToggle: () => void }) {
  return (
    <button type="button" className={o.expandBtn} aria-expanded={open} aria-controls={controls} onClick={onToggle} aria-label={`${open ? "Ocultar" : "Ver"} operación de ${client.name}`} title={`${open ? "Ocultar" : "Ver"} operación`}>
      <span className={cx(o.expandChev, open && o.expandChevOpen)}><Glyph name="chevron-right" size={16} /></span>
    </button>
  );
}

export function ClientsRestructured() {
  const params = useSearchParams();
  const { role, notify, servicesOf, tasks } = useOsStore();
  const [tab, setTab] = useState<ClientTab>(() => validTab(params.get("tab")));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"todos" | ClientStatus>("todos");
  const [service, setService] = useState<"todos" | ServiceId>("todos");
  const [attentionOnly, setAttentionOnly] = useState(() => params.get("atencion") === "1");
  const [view, setView] = useState<ViewMode>("list");
  const [sort, setSort] = useState<SortKey>(() => (params.get("orden") === "atencion" ? "attention" : "name"));
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const showFinancials = canViewFinancials(role);
  const activeSort: SortKey = !showFinancials && (sort === "fee" || sort === "margin") ? "name" : sort;

  const operations = useMemo(() => new Map(osClients.map((client) => [client.slug, clientOperation(client, tasks)])), [tasks]);

  const tabCounts = useMemo(() => ({
    mine: osClients.filter((client) => inTab(client, "mine")).length,
    active: osClients.filter((client) => inTab(client, "active")).length,
    inactive: osClients.filter((client) => inTab(client, "inactive")).length,
    all: osClients.length,
  }), []);

  const { rows, attentionCount } = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    const base = osClients
      .map((client) => ({ client, meta: directorMeta(client.slug), op: operations.get(client.slug)! }))
      .filter(({ client }) => inTab(client, tab))
      .filter(({ client }) => status === "todos" || client.status === status)
      .filter(({ client }) => service === "todos" || servicesOf(client.slug).includes(service))
      .filter(({ client }) => !normalized || [
        client.name, client.owner,
        ...client.team.map((person) => person.name),
        ...servicesOf(client.slug).map(serviceLabel),
        ...osProjects.filter((project) => project.clientSlug === client.slug).map((project) => project.name),
      ].join(" ").toLocaleLowerCase("es").includes(normalized));
    const filtered = base
      .filter(({ op }) => !attentionOnly || op.needsAttention)
      .sort((a, b) => {
        if (activeSort === "status") return STATUS_ORDER[a.client.status] - STATUS_ORDER[b.client.status];
        if (activeSort === "attention") return b.op.attentionScore - a.op.attentionScore || STATUS_ORDER[a.client.status] - STATUS_ORDER[b.client.status] || a.client.name.localeCompare(b.client.name, "es");
        if (activeSort === "fee") return b.client.feeMonthly - a.client.feeMonthly;
        if (activeSort === "margin") return (b.meta?.marginPercent ?? 0) - (a.meta?.marginPercent ?? 0);
        return a.client.name.localeCompare(b.client.name, "es");
      });
    return { rows: filtered, attentionCount: base.filter(({ op }) => op.needsAttention).length };
  }, [activeSort, attentionOnly, operations, query, service, servicesOf, status, tab]);

  function clearFilters() {
    setQuery("");
    setStatus("todos");
    setService("todos");
    setAttentionOnly(false);
    setSort("name");
  }

  function toggle(slug: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  }

  const columns = 6 + (showFinancials ? 1 : 0);

  return (
    <div className={s.page}>
      <PageHead
        rotulo="Operaciones"
        title="Clientes"
        description="La operación de la agencia, organizada por cuenta: proyectos activos, próximas entregas, vencidas y bloqueos. Todos pueden consultar la cartera; la edición queda limitada a los módulos y clientes asignados a cada rol."
        actions={<>
          <div className={m.viewToggle} role="group" aria-label="Formato de vista">
            <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} title="Vista de lista"><Glyph name="list" size={18} label="Vista de lista" /></button>
            <button type="button" aria-pressed={view === "cards"} onClick={() => setView("cards")} title="Vista de grilla"><Glyph name="kanban" size={18} label="Vista de grilla" /></button>
          </div>
          {role === "admin" ? <button type="button" className={buttonClass("primary")} onClick={() => notify("Alta de cliente: requiere persistencia, permisos y definición del alcance contratado")}><AvansIcon name="persona" size={18} />Nuevo cliente</button> : null}
        </>}
      />

      <div className={d.clientTabs} role="tablist" aria-label="Segmentos de clientes">
        {TABS.map((item) => <button type="button" key={item.id} role="tab" aria-selected={tab === item.id} aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>{item.label}<span>{tabCounts[item.id]}</span></button>)}
      </div>

      <div className={o.toolbar} role="search" aria-label="Filtrar y ordenar clientes">
        <label className={cx(s.searchField, s.searchFieldRaised, o.toolbarSearch)}>
          <Glyph name="search" size={16} />
          <span className={s.srOnly}>Buscar clientes</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, proyecto, equipo o módulo" />
        </label>
        <label className={o.toolbarSelect}>Estado
          <select value={status} onChange={(event) => setStatus(event.target.value as "todos" | ClientStatus)}>{STATUS_OPTIONS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select>
        </label>
        <label className={o.toolbarSelect}>Módulo
          <select value={service} onChange={(event) => setService(event.target.value as "todos" | ServiceId)}>
            <option value="todos">Todos los módulos</option>
            {serviceCatalog.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className={o.toolbarSelect}>Ordenar
          <select value={activeSort} onChange={(event) => setSort(event.target.value as SortKey)}>
            <option value="name">Nombre</option>
            <option value="status">Estado de cuenta</option>
            <option value="attention">Requieren atención</option>
            {showFinancials ? <option value="fee">Facturación</option> : null}
            {showFinancials ? <option value="margin">Margen</option> : null}
          </select>
        </label>
        <button type="button" className={o.attentionToggle} aria-pressed={attentionOnly} onClick={() => setAttentionOnly((value) => !value)} title="Clientes con tareas vencidas, bloqueos o semáforo en riesgo">
          <span aria-hidden="true">▲</span>Requieren atención<span className={o.attentionCount}>{attentionCount}</span>
        </button>
      </div>

      {!rows.length ? (
        <OSEmptyState icon="busqueda" title={tab === "inactive" && !attentionOnly ? "No hay clientes inactivos" : "No hay clientes que coincidan"} actions={<button type="button" className={buttonClass("secondary", true)} onClick={clearFilters}>Limpiar filtros</button>}>
          {tab === "inactive" && !attentionOnly ? "Cuando una cuenta se pause o finalice aparecerá en esta pestaña." : attentionOnly ? "Ningún cliente de este segmento tiene tareas vencidas, bloqueos o semáforo en riesgo." : "Probá con otro nombre, estado o módulo."}
        </OSEmptyState>
      ) : view === "cards" ? (
        <section className={d.clientGrid} aria-label={`${rows.length} clientes en grilla`}>
          {rows.map(({ client, meta, op }) => (
            <Link href={`/v2/clientes/${client.slug}`} className={d.clientCard} key={client.slug}>
              <div className={d.clientCardTop}>
                <div className={d.clientIdentity}>
                  <span className={d.clientMark} aria-hidden="true">{client.initials}</span>
                  <div><strong>{client.name}</strong><small>{client.owner} · Burbuja {client.bubble}</small></div>
                </div>
                <OSStatus status={client.status} />
              </div>
              <div className={d.teamStack} aria-label={`Equipo: ${client.team.map((person) => person.name).join(", ")}`}>
                {client.team.slice(0, 4).map((person) => <Avatar key={person.name} name={person.name} />)}
                <span className={d.teamText}>{client.team.length} en el equipo</span>
              </div>
              <div className={d.clientServices}>{servicesOf(client.slug).map((serviceId) => <span className={d.clientService} key={serviceId}>{serviceLabel(serviceId)}</span>)}</div>
              <div className={o.cardOps}>
                <OperationIndicators op={op} />
                <Progress value={op.progress} label={`Avance promedio de ${client.name}`} />
                {op.nextDelivery ? <small>Próxima entrega: {op.nextDelivery.deliverable ?? op.nextDelivery.title} · {dueLabel(op.nextDelivery)}</small> : null}
              </div>
              <div className={d.clientMetrics}>
                <div className={d.clientMetric}><span>Proyectos</span><strong>{op.projects.length}</strong></div>
                <div className={d.clientMetric}><span>Facturación</span><strong>{showFinancials ? formatMoney(client.feeMonthly) : "Restringida"}</strong></div>
                <div className={d.clientMetric}><span>Estado factura</span><strong>{showFinancials ? meta?.billingStatus ?? "Sin dato" : "Restringido"}</strong></div>
                <div className={d.clientMetric}><span>Margen</span><strong>{showFinancials ? `${meta?.marginPercent ?? 0}%` : "Restringido"}</strong></div>
              </div>
              <div className={d.clientMilestone}><span>Próximo hito</span><strong>{client.nextMilestone.label} · {client.nextMilestone.date}</strong></div>
            </Link>
          ))}
        </section>
      ) : (
        <section className={s.surface} aria-label="Listado de clientes">
          <div className={cx(s.tableWrap, o.tableWrap)}>
            <table className={cx(s.table, o.table)}>
              <caption>Mostrando {rows.length} de {osClients.length} clientes · datos de demostración</caption>
              <thead><tr>
                <th className={o.expandCol}><span className={s.srOnly}>Detalle de la operación</span></th>
                <th>Cliente y módulos</th><th>Equipo</th><th>Estado</th><th>Operación</th><th>Próximo hito</th>{showFinancials ? <th>Facturación y margen</th> : null}
              </tr></thead>
              <tbody>{rows.map(({ client, meta, op }) => {
                const open = expanded.has(client.slug);
                const panelId = `operacion-${client.slug}`;
                return (
                  <Fragment key={client.slug}>
                    <tr className={cx(open && o.rowOpen)}>
                      <td className={o.expandCol}><ExpandButton client={client} open={open} controls={panelId} onToggle={() => toggle(client.slug)} /></td>
                      <td><div className={sc.clientCell}><span className={d.clientMark} aria-hidden="true">{client.initials}</span><span className={s.cellMain}><Link href={`/v2/clientes/${client.slug}`} className={s.linkInk} style={{ fontSize: 16 }}>{client.name}</Link><span className={o.servicesLine}>{servicesOf(client.slug).map(serviceLabel).join(" · ")}</span></span></div></td>
                      <td><div className={o.teamCell} title={`Equipo: ${client.team.map((person) => person.name).join(", ")}`}><span className={d.teamStack}>{client.team.slice(0, 3).map((person) => <Avatar key={person.name} name={person.name} />)}</span><span>{client.owner}</span><small>{plural(client.team.length, "persona asignada", "personas asignadas")}</small></div></td>
                      <td><OSStatus status={client.status} /></td>
                      <td><OperationIndicators op={op} /></td>
                      <td><span className={s.cellMain}><span>{client.nextMilestone.label}</span><span className={client.nextMilestone.overdue ? sc.overdue : s.cellSub}>{client.nextMilestone.date}</span></span></td>
                      {showFinancials ? <td><span className={d.financeCell}><strong>{formatMoney(client.feeMonthly)}</strong><small>Factura {meta?.billingStatus?.toLocaleLowerCase("es") ?? "sin dato"} · Margen {meta?.marginPercent ?? 0}%</small></span></td> : null}
                    </tr>
                    {open ? (
                      <tr className={o.detailRow} id={panelId}>
                        <td colSpan={columns}><div className={o.panelSticky}><OperationPanel client={client} op={op} /></div></td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}</tbody>
            </table>
          </div>
          <ul className={o.mobileList} aria-label={`${rows.length} clientes`}>
            {rows.map(({ client, meta, op }) => {
              const open = expanded.has(client.slug);
              const panelId = `operacion-movil-${client.slug}`;
              return (
                <li key={client.slug}>
                  <Link className={o.mobileLink} href={`/v2/clientes/${client.slug}`}><strong style={{ fontWeight: 500 }}>{client.name}</strong><OSStatus status={client.status} /><small>{servicesOf(client.slug).map(serviceLabel).join(" · ")}</small><small>Equipo: {client.owner} · {plural(client.team.length, "persona asignada", "personas asignadas")}</small><small>Próximo hito: {client.nextMilestone.label} · {client.nextMilestone.date}</small>{showFinancials ? <small>Facturación {formatMoney(client.feeMonthly)} · Factura {meta?.billingStatus?.toLocaleLowerCase("es") ?? "sin dato"} · Margen {meta?.marginPercent ?? 0}%</small> : null}</Link>
                  <div className={o.mobileOps}>
                    <OperationIndicators op={op} />
                    <button type="button" className={o.mobileToggle} aria-expanded={open} aria-controls={panelId} onClick={() => toggle(client.slug)} aria-label={`${open ? "Ocultar" : "Ver"} operación de ${client.name}`}>
                      {open ? "Ocultar" : "Ver operación"}<span className={cx(o.expandChev, open && o.expandChevOpen)}><Glyph name="chevron-right" size={14} /></span>
                    </button>
                  </div>
                  {open ? <div id={panelId} className={o.mobilePanel}><OperationPanel client={client} op={op} /></div> : null}
                </li>
              );
            })}
          </ul>
          <div className={sc.tableFoot}><span>{showFinancials ? "Facturación y margen visibles para la vista de socios/administración." : "Facturación y margen restringidos para este rol."}</span><span>Operación calculada con las tareas vivas: {operationSummaryTotals(rows.map((row) => row.op))}.</span></div>
        </section>
      )}
    </div>
  );
}

function operationSummaryTotals(ops: ClientOperation[]) {
  const overdue = ops.reduce((sum, op) => sum + op.overdue.length, 0);
  const blockers = ops.reduce((sum, op) => sum + op.blockers.length, 0);
  const projects = ops.reduce((sum, op) => sum + op.projects.length, 0);
  return [plural(projects, "proyecto activo", "proyectos activos"), plural(overdue, "vencida", "vencidas"), plural(blockers, "bloqueo", "bloqueos")].join(" · ");
}

