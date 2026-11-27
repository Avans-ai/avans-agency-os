"use client";

/* Listas de tareas agrupadas por responsable (estilo Monday) y filtros compartidos.
 * Las usan los tres niveles de visualización —dentro de cada módulo, «Tareas» del cliente
 * e Inicio / Mis tareas—, y todas leen el MISMO store `workspace.tasks`: no copian tareas.
 * Los filtros viajan en la URL para que «Volver» desde una tarea o su origen recupere la
 * lista exacta (navigation/back.tsx). */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { clientOfTask, serviceForTask } from "./director-data";
import { Glyph } from "./glyphs";
import { ReturnLink } from "./navigation/back";
import { osClients, people, PRIORITIES, serviceLabel, TASK_STATUSES, type OsTask, type Priority, type ServiceId, type TaskStatus, type DueKind } from "./os-data";
import { dueSortKey, isProcedureTask, shortIsoDate } from "./procedures-periodic";
import { dueLabel } from "./selectors";
import { moduleTaskHref } from "./task-blocks";
import { Avatar, OSDue, OSPriority } from "./ui";
import { dueKindForDate, isUnassigned, taskOrigin, UNASSIGNED_OWNER } from "./workflow-tasks";
import t from "./task-lists.module.css";

export type DateFilter = "todas" | "vencidas" | "hoy" | "semana" | "mas-adelante" | "completadas";
export const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: "todas", label: "Todas las fechas" },
  { id: "vencidas", label: "Vencidas" },
  { id: "hoy", label: "Vencen hoy" },
  { id: "semana", label: "Próximos 7 días" },
  { id: "mas-adelante", label: "Más adelante" },
  { id: "completadas", label: "Completadas" },
];

/** Vencimiento al día de hoy: las fechas ISO se recalculan; las etiquetas de la demo usan el valor guardado. */
export function liveDueKind(task: Pick<OsTask, "due" | "dueKind" | "status">, at = new Date().toISOString()): DueKind {
  if (task.status === "Hecho") return "past";
  return /^\d{4}-\d{2}-\d{2}$/.test(task.due) ? dueKindForDate(task.due, at) : task.dueKind;
}
export function matchesDate(task: OsTask, date: DateFilter, at?: string) {
  if (date === "todas") return true;
  if (date === "completadas") return task.status === "Hecho";
  if (task.status === "Hecho") return false;
  const kind = liveDueKind(task, at);
  if (date === "vencidas") return kind === "late";
  if (date === "hoy") return kind === "today";
  if (date === "semana") return kind === "week";
  return kind === "later";
}
function displayTask(task: OsTask, at?: string) {
  const due = /^\d{4}-\d{2}-\d{2}$/.test(task.due) ? shortIsoDate(task.due) : task.due;
  return { ...task, due, dueKind: liveDueKind(task, at) };
}

export type TaskFilters = { q: string; client: string; module: "todos" | ServiceId; status: "todos" | TaskStatus; date: DateFilter; prio: "todas" | Priority; owner: string; archived: boolean; view: string; scope: string };
const DEFAULTS: TaskFilters = { q: "", client: "todos", module: "todos", status: "todos", date: "todas", prio: "todas", owner: "todos", archived: false, view: "", scope: "" };
const PARAM: Record<keyof TaskFilters, string> = { q: "q", client: "cliente", module: "modulo", status: "estado", date: "fecha", prio: "prioridad", owner: "responsable", archived: "archivadas", view: "vista", scope: "alcance" };

/** Filtros de una lista de tareas guardados en la URL (con prefijo para no chocar con otros parámetros de la página). */
export function useTaskFilters(prefix = "", defaults: Partial<TaskFilters> = {}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const base = useMemo(() => ({ ...DEFAULTS, ...defaults }), [defaults]);
  const filters = useMemo<TaskFilters>(() => {
    const read = (key: keyof TaskFilters) => params.get(`${prefix}${PARAM[key]}`);
    const date = read("date") as DateFilter | null;
    const status = read("status") as TaskStatus | null;
    const prio = read("prio") as Priority | null;
    return {
      q: read("q") ?? base.q,
      client: read("client") ?? base.client,
      module: (read("module") as ServiceId | null) ?? base.module,
      status: status && TASK_STATUSES.includes(status) ? status : base.status,
      date: date && DATE_FILTERS.some((item) => item.id === date) ? date : base.date,
      prio: prio && PRIORITIES.includes(prio) ? prio : base.prio,
      owner: read("owner") ?? base.owner,
      archived: read("archived") === "1",
      view: read("view") ?? base.view,
      scope: read("scope") ?? base.scope,
    };
  }, [base, params, prefix]);
  const set = useCallback((patch: Partial<TaskFilters>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch) as [keyof TaskFilters, TaskFilters[keyof TaskFilters]][]) {
      const name = `${prefix}${PARAM[key]}`;
      const text = typeof value === "boolean" ? (value ? "1" : "") : String(value ?? "");
      if (!text || text === String(base[key] === false ? "" : base[key])) next.delete(name); else next.set(name, text);
    }
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [base, params, pathname, prefix, router]);
  /** Limpia los filtros (no la vista) en una sola navegación; `extra` agrega otros cambios al mismo paso. */
  const clear = useCallback((extra: Partial<TaskFilters> = {}) => set({ q: base.q, client: base.client, module: base.module, status: base.status, date: base.date, prio: base.prio, owner: base.owner, ...extra }), [base, set]);
  const active = [filters.q.trim(), filters.client !== base.client, filters.module !== base.module, filters.status !== base.status, filters.date !== base.date, filters.prio !== base.prio, filters.owner !== base.owner].filter(Boolean).length;
  return { filters, set, clear, active };
}

export function filterTasks(tasks: OsTask[], filters: TaskFilters, at?: string) {
  const normalized = filters.q.trim().toLocaleLowerCase("es");
  return tasks.filter((task) => {
    if (filters.client !== "todos" && clientOfTask(task)?.slug !== filters.client) return false;
    if (filters.module !== "todos" && serviceForTask(task) !== filters.module) return false;
    if (filters.status !== "todos" && task.status !== filters.status) return false;
    if (filters.prio !== "todas" && task.prio !== filters.prio) return false;
    if (filters.owner !== "todos" && (filters.owner === UNASSIGNED_OWNER ? !isUnassigned(task.owner) : task.owner !== filters.owner)) return false;
    if (!matchesDate(task, filters.date, at)) return false;
    return !normalized || `${task.id} ${task.title} ${task.owner} ${task.workItem?.label ?? ""} ${serviceLabel(serviceForTask(task))} ${clientOfTask(task)?.name ?? ""} ${task.workflow?.stage ?? ""}`.toLocaleLowerCase("es").includes(normalized);
  });
}

const PRIORITY_ORDER: Record<Priority, number> = { Alta: 0, Media: 1, Baja: 2 };
export function compareByDue(a: OsTask, b: OsTask) {
  return Number(a.status === "Hecho") - Number(b.status === "Hecho") || dueSortKey(a.due).localeCompare(dueSortKey(b.due)) || PRIORITY_ORDER[a.prio] - PRIORITY_ORDER[b.prio] || a.title.localeCompare(b.title, "es");
}

/** Barra de filtros: cliente (si corresponde), módulo, responsable, estado, fecha y prioridad. */
export function TaskFilterBar({ filters, set, clear, active, label, clients, modules, owners, extra }: {
  filters: TaskFilters; set: (patch: Partial<TaskFilters>) => void; clear: () => void; active: number; label: string;
  clients?: { slug: string; name: string }[]; modules?: ServiceId[]; owners?: string[]; extra?: ReactNode;
}) {
  return (
    <div className={t.filters} role="search" aria-label={label}>
      <label className={t.filter}><span>Buscar</span><input type="search" value={filters.q} onChange={(event) => set({ q: event.target.value })} placeholder="Tarea, origen o responsable" /></label>
      {clients ? (
        <label className={t.filter}><span>Cliente</span>
          <select value={filters.client} onChange={(event) => set({ client: event.target.value })}>
            <option value="todos">Todos los clientes</option>
            {clients.map((client) => <option key={client.slug} value={client.slug}>{client.name}</option>)}
          </select>
        </label>
      ) : null}
      {modules ? (
        <label className={t.filter}><span>Módulo</span>
          <select value={filters.module} onChange={(event) => set({ module: event.target.value as ServiceId | "todos" })}>
            <option value="todos">Todos los módulos</option>
            {modules.map((id) => <option key={id} value={id}>{serviceLabel(id)}</option>)}
          </select>
        </label>
      ) : null}
      {owners ? (
        <label className={t.filter}><span>Responsable</span>
          <select value={filters.owner} onChange={(event) => set({ owner: event.target.value })}>
            <option value="todos">Todas las personas</option>
            {owners.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      ) : null}
      <label className={t.filter}><span>Estado</span>
        <select value={filters.status} onChange={(event) => set({ status: event.target.value as TaskStatus | "todos" })}>
          <option value="todos">Todos</option>
          {TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}
        </select>
      </label>
      <label className={t.filter}><span>Fecha</span>
        <select value={filters.date} onChange={(event) => set({ date: event.target.value as DateFilter })}>
          {DATE_FILTERS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <label className={t.filter}><span>Prioridad</span>
        <select value={filters.prio} onChange={(event) => set({ prio: event.target.value as Priority | "todas" })}>
          <option value="todas">Todas</option>
          {PRIORITIES.map((prio) => <option key={prio}>{prio}</option>)}
        </select>
      </label>
      {extra}
      {active ? <button type="button" className={t.clear} onClick={() => clear()}>Limpiar filtros ({active})</button> : null}
    </div>
  );
}

function roleOf(name: string) {
  if (isUnassigned(name)) return "Sin responsable definido en la configuración ni en el proceso";
  if (name.startsWith("Cliente ·")) return "Cliente (responde desde su portal)";
  return people.find((person) => person.name === name)?.role
    ?? osClients.flatMap((client) => client.team).find((person) => person.name === name)?.role
    ?? "Rol sin definir";
}
export function ownersOf(tasks: OsTask[]) {
  const names = Array.from(new Set(tasks.map((task) => isUnassigned(task.owner) ? UNASSIGNED_OWNER : task.owner)));
  return names.sort((a, b) => Number(b === UNASSIGNED_OWNER) - Number(a === UNASSIGNED_OWNER) || a.localeCompare(b, "es"));
}

/** Fila de una tarea: título comprensible, origen (objeto + módulo + cliente), estado, fecha y prioridad. */
export function TaskRow({ task, showClient = true, showModule = true, onOpen, now }: { task: OsTask; showClient?: boolean; showModule?: boolean; onOpen?: (task: OsTask) => void; now?: string }) {
  const origin = taskOrigin(task);
  const client = clientOfTask(task);
  const shown = displayTask(task, now);
  const late = task.status !== "Hecho" && shown.dueKind === "late";
  const context = [origin ? `${origin.kind}: ${origin.label}` : isProcedureTask(task) ? "Procedimiento periódico" : null, showModule ? serviceLabel(serviceForTask(task)) : null, showClient ? client?.name : null].filter(Boolean).join(" · ");
  return (
    <li className={t.row} data-task-id={task.id} data-status={task.status} data-late={late || undefined}>
      <div className={t.main}>
        {onOpen ? <button type="button" className={t.title} onClick={() => onOpen(task)}>{task.title}</button>
          : <ReturnLink className={t.title} href={moduleTaskHref(task)}>{task.title}</ReturnLink>}
        <span className={t.context}>{context || "Tarea manual"}{origin?.stage ? <> · etapa «{origin.stage}»</> : null}</span>
        <span className={t.code}>{task.id}{task.cycle && task.cycle > 1 ? ` · ${task.cycle}.ª vez` : ""}{task.blocked ? <span className={t.blocked}><Glyph name="blocked" size={11} />Bloqueada</span> : null}</span>
      </div>
      <span className={t.status} data-status={task.status}>{task.status}</span>
      <span className={t.due}><OSDue label={dueLabel(shown)} kind={shown.dueKind} status={task.status} /></span>
      <span className={t.prio}><OSPriority prio={task.prio} /></span>
      <span className={t.links}>
        {origin?.href ? <ReturnLink className={t.link} href={origin.href} aria-label={`Abrir origen: ${origin.kind} ${origin.label}`}>Abrir {origin.kind.toLowerCase()}</ReturnLink> : null}
      </span>
    </li>
  );
}

/** Lista agrupada por responsable: encabezado por persona con cantidad y filas claras. */
export function TasksByOwner({ tasks, label, showClient = true, showModule = true, onOpen, empty }: {
  tasks: OsTask[]; label: string; showClient?: boolean; showModule?: boolean; onOpen?: (task: OsTask) => void; empty?: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const now = useMemo(() => new Date().toISOString(), []);
  const groups = useMemo(() => ownersOf(tasks).map((owner) => ({ owner, tasks: tasks.filter((task) => (isUnassigned(task.owner) ? UNASSIGNED_OWNER : task.owner) === owner).sort(compareByDue) }))
    .sort((a, b) => Number(b.owner === UNASSIGNED_OWNER) - Number(a.owner === UNASSIGNED_OWNER) || b.tasks.filter((task) => task.status !== "Hecho").length - a.tasks.filter((task) => task.status !== "Hecho").length || a.owner.localeCompare(b.owner, "es")), [tasks]);
  if (!tasks.length) return <>{empty}</>;
  return (
    <div className={t.groups} aria-label={label} role="list">
      {groups.map((group) => {
        const open = group.tasks.filter((task) => task.status !== "Hecho");
        const late = open.filter((task) => liveDueKind(task, now) === "late").length;
        const id = `owner-${group.owner.replace(/[^a-zA-Z0-9]+/g, "-")}`;
        const isCollapsed = Boolean(collapsed[group.owner]);
        return (
          <section key={group.owner} className={t.group} role="listitem" aria-label={`${group.owner} · ${open.length} ${open.length === 1 ? "abierta" : "abiertas"}`} data-owner={group.owner} data-unassigned={group.owner === UNASSIGNED_OWNER || undefined}>
            <button type="button" className={t.groupHead} aria-expanded={!isCollapsed} aria-controls={`${id}-rows`} onClick={() => setCollapsed((value) => ({ ...value, [group.owner]: !value[group.owner] }))}>
              <Glyph name={isCollapsed ? "chevron-right" : "chevron-down"} size={16} />
              {group.owner === UNASSIGNED_OWNER ? <span className={t.pending} aria-hidden="true">?</span> : <Avatar name={group.owner} size="md" tone={group.owner.startsWith("Cliente ·") ? "accent" : undefined} />}
              <span className={t.who}><strong id={`${id}-title`}>{group.owner}</strong><small>{roleOf(group.owner)}</small></span>
              <span className={t.counts}>
                <span className={t.count}><strong>{open.length}</strong> {open.length === 1 ? "abierta" : "abiertas"}</span>
                {late ? <span className={t.count} data-tone="error"><strong>{late}</strong> {late === 1 ? "vencida" : "vencidas"}</span> : null}
                <span className={t.count} data-tone="muted"><strong>{group.tasks.length}</strong> en total</span>
              </span>
            </button>
            {isCollapsed ? null : (
              <ul className={t.rows} id={`${id}-rows`}>
                <li className={t.rowHead} aria-hidden="true"><span>Tarea y origen</span><span>Estado</span><span>Vence</span><span>Prioridad</span><span /></li>
                {group.tasks.map((task) => <TaskRow key={task.id} task={task} showClient={showClient} showModule={showModule} onOpen={onOpen} now={now} />)}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
