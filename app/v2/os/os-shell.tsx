"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { ThemeSync, ThemeToggle } from "../components/theme-toggle";
import { osAreas, osSettingsItems, type OsNavArea } from "../navigation";
import { AvansIcon, AvansIsotipo, AvansWordmark } from "./brand";
import { Glyph } from "./glyphs";
import { CURRENT_USER, notifications, osClients, osProjects, serviceLabel } from "./os-data";
import { useOsStore } from "./os-store";
import { OSToastViewport } from "./overlays";
import { myApprovals, pendingApprovals } from "./selectors";
import { cx, OSRestricted, buttonClass } from "./ui";
import s from "./os.module.css";

export type Crumb = { label: string; href?: string };
const RESTRICTED_FOR_OPERATIVE = new Set(["finanzas", "gerencia"]);

function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) { if (ref.current && !ref.current.contains(event.target as Node)) close(); }
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") close(); }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open, close]);
  return ref;
}

function SidebarArea({ area, active, root, approvals, onNavigate }: { area: OsNavArea; active: string; root: string; approvals: number; onNavigate: () => void }) {
  const isActiveArea = root === area.slug;
  const [open, setOpen] = useState(isActiveArea || area.slug === "operaciones");
  const listId = useId();
  return (
    <div className={cx(s.group, isActiveArea && s.groupActive)}>
      <button type="button" className={s.groupBtn} aria-expanded={open} aria-controls={listId} onClick={() => setOpen(value => !value)} title={area.label}>
        <AvansIcon name={area.icon} size={20} />
        <span className={s.groupLabel}>{area.label}</span>
        {area.restricted ? <span className={s.lockIcon}><Glyph name="lock" size={14} label="Acceso según rol" /></span> : null}
        <span className={cx(s.chev, open && s.chevOpen)}><Glyph name="chevron-right" size={14} /></span>
      </button>
      {open ? (
        <ul className={s.subList} id={listId}>
          <li><Link href={area.href} className={cx(s.subLink, active === area.slug && s.subActive)} aria-current={active === area.slug ? "page" : undefined} onClick={onNavigate}><span className={s.subLabel}>Vista general</span></Link></li>
          {area.items.map(item => {
            const current = item.slug !== undefined && item.slug !== area.slug && item.slug === active;
            const badge = item.badge === "approvals" && approvals > 0 ? approvals : null;
            return (
              <li key={item.href}>
                <Link href={item.href} className={cx(s.subLink, current && s.subActive)} aria-current={current ? "page" : undefined} onClick={onNavigate}>
                  <span className={s.subLabel}>{item.label}</span>
                  {badge ? <span className={s.countBadge} aria-label={`${badge} pendientes`}>{badge}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function GlobalSearch() {
  const { tasks } = useOsStore();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useOutsideClose(open, () => setOpen(false));
  const listId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); inputRef.current?.focus(); setOpen(true); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("es");
    if (!q) return [];
    const match = (text: string) => text.toLocaleLowerCase("es").includes(q);
    const modules = [...osAreas.flatMap(area => [{ label: area.label, href: area.href, type: "Área" }, ...area.items.map(item => ({ label: item.label, href: item.href, type: area.label }))]), ...osSettingsItems.map(item => ({ label: item.label, href: item.href, type: "Configuración" }))];
    return [
      ...osClients.filter(client => match(`${client.name} ${client.owner} ${client.services.map(serviceLabel).join(" ")}`)).map(client => ({ label: client.name, href: `/v2/clientes/${client.slug}`, type: "Cliente" })),
      ...osProjects.filter(project => match(project.name)).map(project => ({ label: project.name, href: `/v2/proyectos/${project.slug}`, type: "Proyecto" })),
      ...tasks.filter(item => match(`${item.id} ${item.title} ${item.owner}`)).map(item => ({ label: `${item.id} ${item.title}`, href: `/v2/proyectos/${item.projectSlug}?task=${item.id}`, type: "Tarea" })),
      ...modules.filter(item => match(item.label)),
    ].slice(0, 8);
  }, [query, tasks]);

  function go(href: string) { setOpen(false); setQuery(""); router.push(href); }

  return (
    <div className={s.search} ref={wrapRef}>
      <form role="search" className={s.searchBox} onSubmit={event => { event.preventDefault(); if (results[cursor]) go(results[cursor].href); }}>
        <Glyph name="search" size={16} />
        <label htmlFor="os-global-search" className={s.srOnly}>Buscar en Avans OS</label>
        <input
          ref={inputRef}
          id="os-global-search"
          type="search"
          autoComplete="off"
          placeholder="Buscar clientes, proyectos, tareas, módulos…"
          value={query}
          role="combobox"
          aria-expanded={open && query.trim().length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          onFocus={() => setOpen(true)}
          onChange={event => { setQuery(event.target.value); setCursor(0); setOpen(true); }}
          onKeyDown={event => {
            if (event.key === "ArrowDown") { event.preventDefault(); setCursor(value => Math.min(value + 1, Math.max(results.length - 1, 0))); }
            if (event.key === "ArrowUp") { event.preventDefault(); setCursor(value => Math.max(value - 1, 0)); }
          }}
        />
        <span className={s.kbd} aria-hidden="true">Ctrl K</span>
      </form>
      {open && query.trim() ? (
        <ul className={s.searchResults} id={listId} role="listbox" aria-label="Resultados">
          {results.length ? results.map((result, index) => (
            <li key={result.href + result.label} role="option" aria-selected={index === cursor}>
              <a href={result.href} onClick={event => { event.preventDefault(); go(result.href); }}>
                <span>{result.label}</span><small>{result.type}</small>
              </a>
            </li>
          )) : <li className={s.searchEmpty}>Sin resultados para «{query.trim()}». Probá con un cliente, proyecto o ID de tarea.</li>}
        </ul>
      ) : null}
    </div>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  return (
    <div className={s.popWrap} ref={ref}>
      <button type="button" className={s.iconBtn} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(value => !value)} aria-label={`Notificaciones, ${notifications.length} sin leer`}>
        <Glyph name="bell" size={18} strokeWidth={2} />
        <span className={s.bellCount} aria-hidden="true">{notifications.length}</span>
      </button>
      {open ? (
        <div className={s.popover} role="dialog" aria-label="Notificaciones">
          <div className={s.popHead}><span>Notificaciones</span><button type="button" className={buttonClass("ghost")} onClick={() => setOpen(false)}>Cerrar</button></div>
          <ul className={s.popList}>
            {notifications.map(item => (
              <li key={item.text}><Link href={item.href} onClick={() => setOpen(false)}>{item.strong ? <strong>{item.strong} </strong> : null}{item.text}<small>{item.when}</small></Link></li>
            ))}
          </ul>
          <Link className={s.popFoot} href="/v2/inbox" onClick={() => setOpen(false)}>Abrir bandeja de excepciones</Link>
        </div>
      ) : null}
    </div>
  );
}

function ProfileMenu() {
  const { role, setRole } = useOsStore();
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const roleLabel = role === "admin" ? CURRENT_USER.role : "Vista: Ejecutiva de cuentas";
  return (
    <div className={s.popWrap} ref={ref}>
      <button type="button" className={s.profileBtn} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(value => !value)} aria-label={`Perfil: ${CURRENT_USER.name}, ${roleLabel}`}>
        <span className={cx(s.avatar, s.avatarMd, s.avatarDark)} aria-hidden="true">{CURRENT_USER.initials}</span>
        <span className={s.profileText}><strong>{CURRENT_USER.name}</strong><span>{roleLabel}</span></span>
      </button>
      {open ? (
        <div className={s.popover} role="dialog" aria-label="Perfil y preferencias">
          <div className={s.menuSection}>
            <strong>Vista previa de rol</strong>
            <div className={s.segmented} role="group" aria-label="Rol simulado">
              <button type="button" aria-pressed={role === "admin"} onClick={() => setRole("admin")}>Administrador</button>
              <button type="button" aria-pressed={role === "operativo"} onClick={() => setRole("operativo")}>Ejecutiva de cuentas</button>
            </div>
            <p>Simulación visual de permisos. El control real se resolverá en el servidor cuando exista autenticación.</p>
          </div>
          <div className={s.menuSection}>
            <ThemeToggle className={s.themeBtn} />
          </div>
          <div className={s.menuSection}>
            <p>Acceso previsto con Google @avans.agency. El inicio de sesión todavía no está implementado.</p>
            <Link className={s.link} href="/v2/configuracion" onClick={() => setOpen(false)}>Configuración</Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MobileSheet({ onClose, active }: { onClose: () => void; active: string }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div className={s.sheetVeil} onClick={onClose} aria-hidden="true" />
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label="Menú">
        <div className={s.sheetHead}><span>Menú</span><button type="button" className={s.closeBtn} onClick={onClose} aria-label="Cerrar menú" autoFocus><Glyph name="close" size={16} /></button></div>
        {osAreas.map(area => (
          <details key={area.slug}>
            <summary><AvansIcon name={area.icon} size={20} /><span>{area.label}</span>{area.restricted ? <Glyph name="lock" size={14} label="Acceso según rol" /> : null}<span className={s.chev} style={{ flex: "none" }}><Glyph name="chevron-right" size={14} /></span></summary>
            <ul>
              <li><Link href={area.href} onClick={onClose}>Vista general</Link></li>
              {area.items.map(item => <li key={item.href}><Link href={item.href} onClick={onClose} aria-current={item.slug === active ? "page" : undefined}>{item.label}</Link></li>)}
            </ul>
          </details>
        ))}
        <Link className={s.sheetLink} href="/v2/configuracion" onClick={onClose}><AvansIcon name="ajuste" size={20} />Configuración</Link>
      </div>
    </>
  );
}

export function OsShell({ active, root, title, crumbs, children }: { active: string; root: string; title: string; crumbs: Crumb[]; children: ReactNode }) {
  const { tasks, role, notify } = useOsStore();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [sheet, setSheet] = useState(false);
  const approvals = pendingApprovals(tasks).length;
  const mine = myApprovals(tasks).length;
  const restricted = role === "operativo" && RESTRICTED_FOR_OPERATIVE.has(root);
  const restrictedArea = osAreas.find(area => area.slug === root)?.label ?? title;
  const bottom = [
    { href: "/v2", label: "Inicio", icon: "nucleo" as const, current: pathname === "/v2" },
    { href: "/v2/mis-tareas", label: "Mis tareas", icon: "registro" as const, current: pathname === "/v2/mis-tareas" },
    { href: "/v2/aprobaciones", label: "Aprobaciones", icon: "falla" as const, current: pathname === "/v2/aprobaciones" },
  ];

  return (
    <div className={cx(s.shell, expanded && s.shellExpanded)}>
      <a href="#contenido" className={s.skip}>Saltar al contenido</a>
      <nav className={s.sidebar} aria-label="Navegación principal">
        <div className={s.brand}>
          <Link href="/v2" aria-label="Avans OS — Inicio"><AvansWordmark width={104} variant="light" /></Link>
          <span className={s.brandOs}>OS</span>
          <Link href="/v2" className={s.brandIso} aria-label="Avans OS — Inicio"><AvansIsotipo size={28} /></Link>
        </div>
        <button type="button" className={s.railToggle} aria-expanded={expanded} onClick={() => setExpanded(value => !value)} aria-label={expanded ? "Contraer menú" : "Expandir menú"}>
          <Glyph name={expanded ? "chevron-left" : "menu"} size={20} />
        </button>
        <Link href="/v2" className={cx(s.navTop, root === "command-center" && s.navTopActive)} aria-current={active === "command-center" ? "page" : undefined} title="Inicio">
          <AvansIcon name="nucleo" size={20} /><span>Inicio</span>
        </Link>
        <div className={s.divider} />
        {osAreas.map(area => <SidebarArea key={area.slug} area={area} active={active} root={root} approvals={approvals} onNavigate={() => setExpanded(false)} />)}
        <div className={s.sidebarFoot}>
          <div className={s.divider} />
          <Link href="/v2/configuracion" className={cx(s.settingsLink, root === "configuracion" && s.settingsActive)} aria-current={active === "configuracion" ? "page" : undefined} title="Configuración">
            <AvansIcon name="ajuste" size={20} /><span>Configuración</span>
          </Link>
          <p className={s.footNote}>Vista: {role === "admin" ? "Administrador" : "Ejecutiva de cuentas (simulada)"}. Finanzas y Gerencia se muestran según rol.</p>
        </div>
      </nav>

      <div className={s.main}>
        <header className={s.header}>
          <nav className={s.crumbs} aria-label="Ubicación">
            <ol>
              {crumbs.map((crumb, index) => {
                const last = index === crumbs.length - 1;
                return (
                  <li key={`${crumb.label}-${index}`}>
                    {last ? <span className={s.crumbCurrent} aria-current="page">{crumb.label}</span> : crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : <span className={s.cellSub}>{crumb.label}</span>}
                    {last ? null : <span className={s.crumbSep} aria-hidden="true">/</span>}
                  </li>
                );
              })}
            </ol>
          </nav>
          <GlobalSearch />
          <div className={s.headerTools}>
            <span className={s.demoBadge} title="Toda la información que ves es simulada: no hay base de datos conectada">Datos de demostración</span>
            <Notifications />
            <ProfileMenu />
          </div>
        </header>
        <header className={s.mobileHeader}>
          <Link href="/v2" aria-label="Avans OS — Inicio"><AvansIsotipo size={28} /></Link>
          <p className={s.mobileTitle}>{title}</p>
          <span className={s.demoBadge} title="Datos de demostración">Demo</span>
          <Notifications />
        </header>

        <main id="contenido" className={s.content} tabIndex={-1}>
          {restricted ? (
            <div className={s.page}>
              <OSRestricted
                title={`No tenés acceso a ${restrictedArea}`}
                actions={<><button type="button" className={buttonClass("secondary", true)} onClick={() => notify("Pedir acceso: pendiente de implementación (requiere roles reales)")}>Pedir acceso</button><Link className={s.link} href="/v2">Volver a Inicio</Link></>}
              >
                Tu rol (Ejecutiva de cuentas) ve Clientes y Proyectos. {restrictedArea} es visible para Administración y Gerencia. Vista previa simulada: cambiá el rol desde tu perfil.
              </OSRestricted>
            </div>
          ) : children}
        </main>
      </div>

      <nav className={s.bottomNav} aria-label="Navegación móvil">
        {bottom.map(item => (
          <Link key={item.href} href={item.href} className={s.bottomItem} aria-current={item.current ? "page" : undefined}>
            <AvansIcon name={item.icon} size={22} />
            {item.label}
            {item.href === "/v2/aprobaciones" && mine ? <span className={s.srOnly}>, {mine} esperan tu aprobación</span> : null}
          </Link>
        ))}
        <button type="button" className={s.bottomItem} aria-expanded={sheet} onClick={() => setSheet(true)}><Glyph name="menu" size={22} />Menú</button>
      </nav>
      {sheet ? <MobileSheet active={active} onClose={() => setSheet(false)} /> : null}
      <OSToastViewport />
      <ThemeSync />
    </div>
  );
}
