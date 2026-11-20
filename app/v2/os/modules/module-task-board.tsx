"use client";

/* Kanban + lista de las tareas de UN módulo de un cliente.
 * Lee el store único de tareas (no hay otra base de tareas): una tarea creada
 * acá es la misma que aparece en «Tareas» del cliente y en su proyecto. */
import { useMemo, useState } from "react";
import { Glyph } from "../glyphs";
import { isArchivedTask, scopeDeliverables, TASK_ARCHIVE_AFTER_DAYS, tasksForService } from "../director-data";
import { PRIORITIES, TASK_STATUSES, serviceLabel, shortName, type OsClient, type OsTask, type Priority, type ServiceId, type TaskStatus, type TaskWorkItem } from "../os-data";
import { useOsStore } from "../os-store";
import { dueLabel, getProject } from "../selectors";
import { NewTaskModal, TaskSidePanel } from "../task-blocks";
import { Avatar, buttonClass, OSDue, OSEmptyState, OSPriority } from "../ui";
import s from "../os.module.css";
import { Strip } from "./module-ui";
import m from "./modules.module.css";

export type DateFilter = "todas" | "vencidas" | "hoy" | "semana" | "mas-adelante" | "completadas";

export function matchesDate(task: OsTask, date: DateFilter) {
  if (date === "todas") return true;
  if (date === "completadas") return task.status === "Hecho";
  if (task.status === "Hecho") return false;
  if (date === "vencidas") return task.dueKind === "late";
  if (date === "hoy") return task.dueKind === "today";
  if (date === "semana") return task.dueKind === "week";
  return task.dueKind === "later";
}

export const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: "todas", label: "Todas las fechas" },
  { id: "vencidas", label: "Vencidas" },
  { id: "hoy", label: "Vencen hoy" },
  { id: "semana", label: "Próximos 7 días" },
  { id: "mas-adelante", label: "Más adelante" },
  { id: "completadas", label: "Completadas" },
];

export function ModuleTaskBoard({
  client,
  serviceId,
  editable,
  workItems,
  workItemLabel,
  selectedTaskId,
  onSelectTask,
}: {
  client: OsClient;
  serviceId: ServiceId;
  editable: boolean;
  workItems: TaskWorkItem[];
  workItemLabel: string;
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
}) {
  const { tasks } = useOsStore();
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("todos");
  const [owner, setOwner] = useState("todos");
  const [status, setStatus] = useState<"todos" | TaskStatus>("todos");
  const [date, setDate] = useState<DateFilter>("todas");
  const [prio, setPrio] = useState<"todas" | Priority>("todas");
  const [archived, setArchived] = useState(false);
  const [creating, setCreating] = useState(false);

  const own = useMemo(() => tasksForService(tasks, client.slug, serviceId), [client.slug, serviceId, tasks]);
  const active = own.filter((task) => !isArchivedTask(task));
  const archivedTasks = own.filter(isArchivedTask);
  const owners = Array.from(new Set(own.map((task) => task.owner))).sort((a, b) => a.localeCompare(b, "es"));
  const projects = Array.from(new Set(own.map((task) => task.projectSlug))).map((slug) => ({ id: `p:${slug}`, label: `Proyecto · ${getProject(slug)?.name ?? slug}` }));
  const items = [...workItems, ...own.map((task) => task.workItem).filter((item): item is TaskWorkItem => Boolean(item))]
    .filter((item, index, list) => list.findIndex((other) => other.id === item.id) === index)
    .map((item) => ({ id: `w:${item.id}`, label: `${workItemLabel} · ${item.label}` }));
  const normalized = query.trim().toLocaleLowerCase("es");

  const visible = (archived ? archivedTasks : active).filter((task) => {
    if (scope.startsWith("p:") && task.projectSlug !== scope.slice(2)) return false;
    if (scope.startsWith("w:") && task.workItem?.id !== scope.slice(2)) return false;
    if (owner !== "todos" && task.owner !== owner) return false;
    if (status !== "todos" && task.status !== status) return false;
    if (prio !== "todas" && task.prio !== prio) return false;
    if (!matchesDate(task, date)) return false;
    return !normalized || `${task.id} ${task.title} ${task.owner} ${task.workItem?.label ?? ""} ${task.deliverable ?? ""}`.toLocaleLowerCase("es").includes(normalized);
  });

  const open = active.filter((task) => task.status !== "Hecho");
  const selected = own.find((task) => task.id === selectedTaskId);

  function clear() {
    setQuery(""); setScope("todos"); setOwner("todos"); setStatus("todos"); setDate("todas"); setPrio("todas");
  }

  return (
    <div className={m.stack}>
      <Strip
        label={`Resumen de tareas de ${serviceLabel(serviceId)}`}
        items={[
          { label: "Abiertas", value: open.length },
          { label: "En aprobación", value: open.filter((task) => task.status === "En aprobación").length },
          { label: "Bloqueadas", value: open.filter((task) => task.blocked).length, alert: open.some((task) => task.blocked) },
          { label: "Vencidas", value: open.filter((task) => task.dueKind === "late").length, alert: open.some((task) => task.dueKind === "late") },
          { label: "Archivadas", value: archivedTasks.length, detail: `Hechas hace +${TASK_ARCHIVE_AFTER_DAYS} días` },
        ]}
      />

      <section className={m.panel} aria-labelledby="module-tasks-title">
        <div className={m.panelHead}>
          <div>
            <h2 id="module-tasks-title">Tareas de {serviceLabel(serviceId)}</h2>
            <p>Kanban operativo del módulo. Cada tarea pertenece solo a este módulo y también se consulta en «Tareas» del cliente.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className={buttonClass(archived ? "dark" : "secondary", true)} aria-pressed={archived} onClick={() => setArchived((value) => !value)}>
              <Glyph name="archive" size={16} />{archived ? "Ver tareas activas" : `Archivadas (${archivedTasks.length})`}
            </button>
            <button type="button" className={buttonClass("primary", true)} disabled={!editable} title={!editable ? "Tu rol puede ver este módulo, pero no crear tareas" : undefined} onClick={() => setCreating(true)}>Nueva tarea</button>
          </div>
        </div>
        <div className={m.toolbar} style={{ display: "block" }}>
          <div className={m.filters} role="search" aria-label="Filtrar tareas del módulo">
            <label className={m.filter}><span>Buscar</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tarea, responsable o entregable" /></label>
            <label className={m.filter}><span>Proyecto o {workItemLabel.toLowerCase()}</span>
              <select value={scope} onChange={(event) => setScope(event.target.value)}>
                <option value="todos">Todos</option>
                {projects.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                {items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className={m.filter}><span>Responsable</span>
              <select value={owner} onChange={(event) => setOwner(event.target.value)}>
                <option value="todos">Todos</option>
                {owners.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className={m.filter}><span>Estado</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as "todos" | TaskStatus)}>
                <option value="todos">Todos</option>
                {TASK_STATUSES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className={m.filter}><span>Fecha</span>
              <select value={date} onChange={(event) => setDate(event.target.value as DateFilter)}>
                {DATE_FILTERS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className={m.filter}><span>Prioridad</span>
              <select value={prio} onChange={(event) => setPrio(event.target.value as "todas" | Priority)}>
                <option value="todas">Todas</option>
                {PRIORITIES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className={m.toolbar}>
          <div className={s.segmented} role="group" aria-label="Formato de tareas">
            <button type="button" aria-pressed={view === "kanban"} onClick={() => setView("kanban")}><Glyph name="kanban" size={16} />Kanban</button>
            <button type="button" aria-pressed={view === "lista"} onClick={() => setView("lista")}><Glyph name="list" size={16} />Lista</button>
          </div>
          <span className={s.cardMeta}>{visible.length} {visible.length === 1 ? "tarea" : "tareas"}{archived ? " archivadas" : ""}</span>
        </div>
        <div className={m.panelBody}>
          {!visible.length ? (
            <OSEmptyState icon="busqueda" title={archived ? "No hay tareas archivadas que coincidan" : own.length ? "No hay tareas que coincidan" : "Este módulo todavía no tiene tareas"} actions={own.length ? <button type="button" className={buttonClass("secondary", true)} onClick={clear}>Limpiar filtros</button> : editable ? <button type="button" className={buttonClass("primary", true)} onClick={() => setCreating(true)}>Nueva tarea</button> : undefined}>
              {archived ? `Las tareas hechas hace más de ${TASK_ARCHIVE_AFTER_DAYS} días se archivan y quedan ocultas por defecto.` : "Probá con otro proyecto, responsable, estado, fecha o prioridad."}
            </OSEmptyState>
          ) : view === "kanban" ? (
            <div className={m.board} aria-label={`Kanban de ${serviceLabel(serviceId)}`}>
              {TASK_STATUSES.map((column) => {
                const cards = visible.filter((task) => task.status === column);
                return (
                  <section className={m.col} key={column} aria-label={`${column}: ${cards.length} tareas`}>
                    <div className={m.colHead}><h3>{column}</h3><span>{cards.length}</span></div>
                    {cards.length ? cards.map((task) => (
                      <button type="button" className={m.card} data-selected={task.id === selectedTaskId} data-done={task.status === "Hecho"} key={task.id} onClick={() => onSelectTask(task.id)} aria-label={`${task.id} ${task.title}. ${task.owner}. Prioridad ${task.prio}. Vence ${dueLabel(task)}${task.blocked ? ". Bloqueada" : ""}`}>
                        <span className={m.cardTop}><span>{task.id}</span>{task.blocked ? <span className={m.blocked}><Glyph name="blocked" size={11} />Bloqueada</span> : null}</span>
                        <span className={m.cardTitle}>{task.title}</span>
                        <span className={m.cardMeta}>
                          <span>{task.workItem?.label ?? getProject(task.projectSlug)?.name}</span>
                          {task.deliverable ? <span>Entregable: {task.deliverable}</span> : null}
                          {task.comments.length ? <span>{task.comments.length} coment.</span> : null}
                          {task.files.length ? <span>{task.files.length} {task.files.length === 1 ? "archivo" : "archivos"}</span> : null}
                        </span>
                        <span className={m.cardFoot}><span><Avatar name={task.owner} />{shortName(task.owner)}</span><OSPriority prio={task.prio} /><OSDue label={dueLabel(task)} kind={task.dueKind} status={task.status} /></span>
                      </button>
                    )) : <p className={m.colEmpty}>Sin tareas</p>}
                  </section>
                );
              })}
            </div>
          ) : (
            <div className={s.tableWrap}>
              <table className={`${s.table} ${m.dense}`}>
                <caption className={s.srOnly}>Tareas de {serviceLabel(serviceId)} · {client.name}</caption>
                <thead><tr><th scope="col">ID</th><th scope="col">Tarea</th><th scope="col">{workItemLabel} / proyecto</th><th scope="col">Entregable</th><th scope="col">Responsable</th><th scope="col">Prioridad</th><th scope="col">Vence</th><th scope="col">Estado</th></tr></thead>
                <tbody>
                  {visible.map((task) => (
                    <tr key={task.id}>
                      <td className={s.cellSub}>{task.id}</td>
                      <td style={{ minWidth: 220 }}><button type="button" className={m.rowButton} onClick={() => onSelectTask(task.id)}>{task.title}</button>{task.blocked ? <> <span className={m.blocked}><Glyph name="blocked" size={11} />Bloqueada</span></> : null}</td>
                      <td className={m.cellWrap}>{task.workItem?.label ?? getProject(task.projectSlug)?.name}</td>
                      <td>{task.deliverable ?? "—"}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{task.owner}</td>
                      <td><OSPriority prio={task.prio} /></td>
                      <td><OSDue label={dueLabel(task)} kind={task.dueKind} status={task.status} /></td>
                      <td style={{ whiteSpace: "nowrap" }}>{task.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className={m.panelFoot}>
          Entregables del alcance: {scopeDeliverables(serviceId).join(" · ")}. El estado se cambia desde el panel de la tarea (arrastrar tarjetas queda pendiente). Guardado en este navegador.
        </div>
      </section>

      {selected ? <TaskSidePanel key={selected.id} item={selected} readOnly={!editable} workItems={workItems} workItemLabel={workItemLabel} onClose={() => onSelectTask(null)} /> : null}
      {creating ? <NewTaskModal clientSlug={client.slug} serviceId={serviceId} workItems={workItems} workItemLabel={workItemLabel} onClose={() => setCreating(false)} onCreated={() => { clear(); setArchived(false); }} /> : null}
    </div>
  );
}

export function useModuleTaskStats(client: OsClient, serviceId: ServiceId) {
  const { tasks } = useOsStore();
  return useMemo(() => {
    const own = tasksForService(tasks, client.slug, serviceId);
    const active = own.filter((task) => !isArchivedTask(task));
    const open = active.filter((task) => task.status !== "Hecho");
    const rank = { late: 0, today: 1, week: 2, later: 3, past: 4 } as const;
    return {
      own,
      open,
      done: active.filter((task) => task.status === "Hecho"),
      blocked: open.filter((task) => task.blocked),
      approvals: open.filter((task) => task.status === "En aprobación"),
      late: open.filter((task) => task.dueKind === "late"),
      archived: own.filter(isArchivedTask),
      next: [...open].sort((a, b) => rank[a.dueKind] - rank[b.dueKind] || (a.prio === "Alta" ? -1 : 0)).slice(0, 6),
    };
  }, [client.slug, serviceId, tasks]);
}
