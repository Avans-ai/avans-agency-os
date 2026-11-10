"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AvansIcon } from "../brand";
import {
  canViewFinancials,
  directorMeta,
  isActiveClient,
  isAssignedClient,
} from "../director-data";
import { Glyph } from "../glyphs";
import { osClients, serviceCatalog, serviceLabel, type ClientStatus, type ServiceId } from "../os-data";
import { useOsStore } from "../os-store";
import { formatMoney, projectsOf, STATUS_ORDER } from "../selectors";
import { Avatar, buttonClass, cx, OSEmptyState, OSStatus, PageHead } from "../ui";
import s from "../os.module.css";
import sc from "../screens.module.css";
import m from "./meeting-architecture.module.css";
import d from "./director-update.module.css";

type ClientTab = "mine" | "active" | "inactive" | "all";
type SortKey = "name" | "status" | "fee" | "margin";
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

export function ClientsRestructured() {
  const params = useSearchParams();
  const { role, notify, servicesOf } = useOsStore();
  const [tab, setTab] = useState<ClientTab>(() => validTab(params.get("tab")));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"todos" | ClientStatus>("todos");
  const [service, setService] = useState<"todos" | ServiceId>("todos");
  const [view, setView] = useState<ViewMode>("list");
  const [sort, setSort] = useState<SortKey>("name");
  const showFinancials = canViewFinancials(role);

  const tabCounts = useMemo(() => ({
    mine: osClients.filter((client) => isAssignedClient(client.slug)).length,
    active: osClients.filter(isActiveClient).length,
    inactive: osClients.filter((client) => !isActiveClient(client)).length,
    all: osClients.length,
  }), []);

  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return osClients
      .map((client) => ({
        client,
        meta: directorMeta(client.slug),
        projects: projectsOf(client.slug).length,
      }))
      .filter(({ client }) => {
        if (tab === "mine") return isAssignedClient(client.slug);
        if (tab === "active") return isActiveClient(client);
        if (tab === "inactive") return !isActiveClient(client);
        return true;
      })
      .filter(({ client }) => status === "todos" || client.status === status)
      .filter(({ client }) => service === "todos" || servicesOf(client.slug).includes(service))
      .filter(({ client }) => !normalized || `${client.name} ${client.owner} ${client.team.map((person) => person.name).join(" ")} ${servicesOf(client.slug).map(serviceLabel).join(" ")}`.toLocaleLowerCase("es").includes(normalized))
      .sort((a, b) => {
        if (sort === "status") return STATUS_ORDER[a.client.status] - STATUS_ORDER[b.client.status];
        if (sort === "fee") return b.client.feeMonthly - a.client.feeMonthly;
        if (sort === "margin") return (b.meta?.marginPercent ?? 0) - (a.meta?.marginPercent ?? 0);
        return a.client.name.localeCompare(b.client.name, "es");
      });
  }, [query, service, servicesOf, sort, status, tab]);

  function clearFilters() {
    setQuery("");
    setStatus("todos");
    setService("todos");
    setSort("name");
  }

  return (
    <div className={s.page}>
      <PageHead
        rotulo="Operaciones"
        title="Clientes"
        description="Todos pueden consultar la cartera completa. La edición queda limitada a los módulos y clientes asignados a cada rol."
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

      <div className={d.clientToolbar} role="search" aria-label="Filtrar y ordenar clientes">
        <label className={cx(s.searchField, s.searchFieldRaised)}>
          <Glyph name="search" size={16} />
          <span className={s.srOnly}>Buscar clientes</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, equipo o módulo" />
        </label>
        <label className={sc.selectWrap}>Estado
          <select value={status} onChange={(event) => setStatus(event.target.value as "todos" | ClientStatus)}>{STATUS_OPTIONS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select>
        </label>
        <label className={sc.selectWrap}>Módulo
          <select value={service} onChange={(event) => setService(event.target.value as "todos" | ServiceId)}>
            <option value="todos">Todos los módulos</option>
            {serviceCatalog.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className={sc.selectWrap}>Ordenar
          <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            <option value="name">Nombre</option>
            <option value="status">Estado de cuenta</option>
            {showFinancials ? <option value="fee">Facturación</option> : null}
            {showFinancials ? <option value="margin">Margen</option> : null}
          </select>
        </label>
      </div>

      {!rows.length ? (
        <OSEmptyState icon="busqueda" title={tab === "inactive" ? "No hay clientes inactivos" : "No hay clientes que coincidan"} actions={<button type="button" className={buttonClass("secondary", true)} onClick={clearFilters}>Limpiar filtros</button>}>
          {tab === "inactive" ? "Cuando una cuenta se pause o finalice aparecerá en esta pestaña." : "Probá con otro nombre, estado o módulo."}
        </OSEmptyState>
      ) : view === "cards" ? (
        <section className={d.clientGrid} aria-label={`${rows.length} clientes en grilla`}>
          {rows.map(({ client, meta, projects }) => (
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
              <div className={d.clientMetrics}>
                <div className={d.clientMetric}><span>Proyectos</span><strong>{projects}</strong></div>
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
          <div className={cx(s.tableWrap, sc.desktopTable)}>
            <table className={s.table}>
              <caption>Mostrando {rows.length} de {osClients.length} clientes · datos de demostración</caption>
              <thead><tr>
                <th>Cliente</th><th>Equipo</th><th>Módulos de servicio</th><th>Estado</th><th>Próximo hito</th>{showFinancials ? <><th>Facturación</th><th>Margen</th></> : null}
              </tr></thead>
              <tbody>{rows.map(({ client, meta }) => (
                <tr key={client.slug}>
                  <td><div className={sc.clientCell}><span className={d.clientMark} aria-hidden="true">{client.initials}</span><span className={s.cellMain}><Link href={`/v2/clientes/${client.slug}`} className={s.linkInk} style={{ fontSize: 16 }}>{client.name}</Link><span className={s.cellSub}>Cliente desde {client.since}</span></span></div></td>
                  <td><div className={d.tableTeam}><span className={d.teamStack}>{client.team.slice(0, 3).map((person) => <Avatar key={person.name} name={person.name} />)}</span><span className={d.tableTeamNames}><span>{client.owner}</span><small>{client.team.length} personas asignadas</small></span></div></td>
                  <td>{servicesOf(client.slug).map(serviceLabel).join(" · ")}</td>
                  <td><OSStatus status={client.status} /></td>
                  <td><span className={s.cellMain}><span>{client.nextMilestone.label}</span><span className={client.nextMilestone.overdue ? sc.overdue : s.cellSub}>{client.nextMilestone.date}</span></span></td>
                  {showFinancials ? <td><span className={d.financeCell}><strong>{formatMoney(client.feeMonthly)}</strong><small>{meta?.billingStatus}</small></span></td> : null}
                  {showFinancials ? <td><strong>{meta?.marginPercent ?? 0}%</strong></td> : null}
                </tr>
              ))}</tbody>
            </table>
          </div>
          <ul className={sc.mobileList} aria-label={`${rows.length} clientes`}>
            {rows.map(({ client }) => <li key={client.slug}><Link href={`/v2/clientes/${client.slug}`}><strong style={{ fontWeight: 500 }}>{client.name}</strong><OSStatus status={client.status} /><small>{servicesOf(client.slug).map(serviceLabel).join(" · ")}</small><small>Próximo hito: {client.nextMilestone.label} · {client.nextMilestone.date}</small></Link></li>)}
          </ul>
          <div className={sc.tableFoot}><span>{showFinancials ? "Facturación y margen visibles para la vista de socios/administración." : "Facturación y margen restringidos para este rol."}</span><span>Todos los usuarios pueden consultar la cartera.</span></div>
        </section>
      )}
    </div>
  );
}
