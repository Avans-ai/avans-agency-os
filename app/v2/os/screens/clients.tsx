"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AvansIcon } from "../brand";
import { Glyph } from "../glyphs";
import { osClients, type ClientStatus } from "../os-data";
import { useOsStore } from "../os-store";
import { formatMoney, projectsOf } from "../selectors";
import { buttonClass, cx, OSEmptyState, OSStatus, PageHead } from "../ui";
import s from "../os.module.css";
import sc from "../screens.module.css";

const FILTERS: { id: "todos" | ClientStatus; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "al-dia", label: "Al día" },
  { id: "atencion", label: "Atención" },
  { id: "en-riesgo", label: "En riesgo" },
  { id: "onboarding", label: "Onboarding" },
];
const BUBBLES = ["Todas", ...Array.from(new Set(osClients.map(client => client.bubble)))];
type SortKey = "name" | "projects" | "fee";

export function ClientsScreen() {
  const { role, notify } = useOsStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("todos");
  const [bubble, setBubble] = useState("Todas");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const showFee = role === "admin";

  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("es");
    return osClients
      .map(client => ({ client, projects: projectsOf(client.slug).length }))
      .filter(({ client }) => filter === "todos" || client.status === filter)
      .filter(({ client }) => bubble === "Todas" || client.bubble === bubble)
      .filter(({ client }) => !q || `${client.name} ${client.services.join(" ")} ${client.owner}`.toLocaleLowerCase("es").includes(q))
      .sort((a, b) => {
        const value = sort.key === "name" ? a.client.name.localeCompare(b.client.name, "es") : sort.key === "projects" ? a.projects - b.projects : a.client.feeMonthly - b.client.feeMonthly;
        return value * sort.dir;
      });
  }, [query, filter, bubble, sort]);

  function toggleSort(key: SortKey) {
    setSort(current => ({ key, dir: current.key === key ? (current.dir === 1 ? -1 : 1) : 1 }));
  }
  function ariaSort(key: SortKey) {
    return sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none";
  }
  function sortIcon(key: SortKey) {
    return sort.key === key ? <Glyph name={sort.dir === 1 ? "sort-up" : "sort-down"} size={13} /> : null;
  }
  function clear() { setQuery(""); setFilter("todos"); setBubble("Todas"); }

  return (
    <div className={s.page}>
      <PageHead
        rotulo="Operaciones"
        title="Clientes"
        description="Una sola ficha por cliente. Ventas, Finanzas y Gerencia leen esta misma ficha."
        actions={<>
          <button type="button" className={buttonClass("secondary")} onClick={() => notify("Exportar: pendiente de implementación")}><AvansIcon name="salida" size={18} />Exportar</button>
          <button type="button" className={buttonClass("primary")} onClick={() => notify("Nuevo cliente: pendiente de implementación (requiere persistencia)")}><AvansIcon name="persona" size={18} />Nuevo cliente</button>
        </>}
      />

      <div className={sc.toolbar} role="search" aria-label="Filtrar clientes">
        <label className={cx(s.searchField, sc.grow)}>
          <Glyph name="search" size={16} />
          <span className={s.srOnly}>Buscar por cliente, servicio o responsable</span>
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por cliente, servicio o responsable" />
        </label>
        <div className={s.tagRow} role="group" aria-label="Estado">
          {FILTERS.map(item => <button key={item.id} type="button" className={s.tag} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}
        </div>
        <label className={sc.selectWrap}>Burbuja
          <select value={bubble} onChange={event => setBubble(event.target.value)}>{BUBBLES.map(item => <option key={item}>{item}</option>)}</select>
        </label>
      </div>

      {rows.length ? (
        <section className={s.surface} aria-label="Listado de clientes">
          <div className={cx(s.tableWrap, sc.desktopTable)}>
            <table className={s.table}>
              <caption>Mostrando {rows.length} de {osClients.length} clientes activos · datos de demostración</caption>
              <thead>
                <tr>
                  <th scope="col" aria-sort={ariaSort("name")} className={s.stickyCol}><button type="button" className={s.sortBtn} onClick={() => toggleSort("name")}>Cliente {sortIcon("name")}</button></th>
                  <th scope="col">Servicios</th>
                  <th scope="col">Responsable · Burbuja</th>
                  <th scope="col" aria-sort={ariaSort("projects")} className={s.num}><button type="button" className={s.sortBtn} onClick={() => toggleSort("projects")}>Proyectos {sortIcon("projects")}</button></th>
                  <th scope="col">Estado</th>
                  <th scope="col">Próximo hito</th>
                  {showFee ? <th scope="col" aria-sort={ariaSort("fee")} className={s.num}><button type="button" className={s.sortBtn} onClick={() => toggleSort("fee")}><Glyph name="lock" size={12} label="Dato sensible" /> Fee mensual {sortIcon("fee")}</button></th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ client, projects }) => (
                  <tr key={client.slug}>
                    <td className={s.stickyCol}>
                      <div className={sc.clientCell}>
                        <span className={cx(sc.initials, client.status === "atencion" || client.status === "en-riesgo" ? sc.initialsAccent : undefined)} aria-hidden="true">{client.initials}</span>
                        <span className={s.cellMain}><Link href={`/v2/clientes/${client.slug}`} className={s.linkInk} style={{ fontSize: 16 }}>{client.name}</Link><span className={s.cellSub}>Cliente desde {client.since}</span></span>
                      </div>
                    </td>
                    <td>{client.services.join(" · ")}</td>
                    <td><span className={s.cellMain}><span>{client.owner}</span><span className={s.cellSub}>Burbuja {client.bubble}</span></span></td>
                    <td className={s.num}>{projects}</td>
                    <td><OSStatus status={client.status} /></td>
                    <td><span className={s.cellMain}><span>{client.nextMilestone.label}</span><span className={client.nextMilestone.overdue ? sc.overdue : s.cellSub}>{client.nextMilestone.date}</span></span></td>
                    {showFee ? <td className={s.num}>{formatMoney(client.feeMonthly)}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className={sc.mobileList} aria-label={`${rows.length} clientes`}>
            {rows.map(({ client }) => (
              <li key={client.slug}>
                <Link href={`/v2/clientes/${client.slug}`}>
                  <strong style={{ fontWeight: 500 }}>{client.name}</strong>
                  <OSStatus status={client.status} />
                  <small>Próximo hito: {client.nextMilestone.label} · <span className={client.nextMilestone.overdue ? sc.overdue : undefined}>{client.nextMilestone.date}</span></small>
                </Link>
              </li>
            ))}
          </ul>
          <div className={sc.tableFoot}>
            <span>{showFee ? "El fee mensual proviene de Finanzas y se muestra según rol." : "Columna «Fee mensual» oculta para tu rol (vista previa)."}</span>
            <span>Fecha de referencia: 30 oct 2026</span>
          </div>
        </section>
      ) : (
        <OSEmptyState icon="busqueda" title="No hay clientes que coincidan" actions={<button type="button" className={buttonClass("secondary", true)} onClick={clear}>Limpiar filtros</button>}>
          Probá con otro nombre, servicio o responsable, o quitá los filtros de estado y burbuja.
        </OSEmptyState>
      )}
    </div>
  );
}
