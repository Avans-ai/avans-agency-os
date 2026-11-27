"use client";

/* Kanban + lista de las tareas de UN módulo de un cliente.
 * Lee el store único de tareas (no hay otra base de tareas): una tarea creada
 * acá es la misma que aparece en «Tareas» del cliente y en su proyecto. */
import { useMemo, useState } from "react";
import { filterTasks, ownersOf, TaskFilterBar, TasksByOwner, useTaskFilters } from "../task-lists";
import { ORIGIN_KIND_LABEL, REMINDERS_NOTE } from "../workflow-tasks";
import { Glyph } from "../glyphs";
import { isArchivedTask, scopeDeliverables, TASK_ARCHIVE_AFTER_DAYS, tasksForService } from "../director-data";
import { TASK_STATUSES, serviceLabel, shortName, type OsClient, type ServiceId, type TaskWorkItem } from "../os-data";
import { useOsStore } from "../os-store";
import { dueLabel, getProject } from "../selectors";
import { NewTaskModal, TaskSidePanel } from "../task-blocks";
import { Avatar, buttonClass, OSDue, OSEmptyState, OSPriority } from "../ui";
import s from "../os.module.css";
import { Strip } from "./module-ui";
import m from "./modules.module.css";

/* Filtros de fecha compartidos con las demás listas de tareas (se reexportan por compatibilidad). */
export { DATE_FILTERS, matchesDate, type DateFilter } from "../task-lists";

const BOARD_DEFAULTS = { view: "kanban" };

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
  // Filtros y vista en la URL: «Volver» desde una tarea o su origen recupera esta misma lista.
  const { filters, set, clear: clearFilters, active } = useTaskFilters("t-", BOARD_DEFAULTS);
  const view = (["kanban", "lista", "responsable"] as const).find((item) => item === filters.view) ?? "kanban";
  const scope = filters.scope || "todos";
  const archived = filters.archived;
  const [creating, setCreating] = useState(false);

  const own = useMemo(() => tasksForService(tasks, client.slug, serviceId), [client.slug, serviceId, tasks]);
  const current = own.filter((task) => !isArchivedTask(task));
  const archivedTasks = own.filter(isArchivedTask);
  const owners = ownersOf(own);
  const projects = Array.from(new Set(own.map((task) => task.projectSlug))).map((slug) => ({ id: `p:${slug}`, label: `Proyecto · ${getProject(slug)?.name ?? slug}` }));
  const items = [...workItems, ...own.map((task) => task.workItem).filter((item): item is TaskWorkItem => Boolean(item))]
    .filter((item, index, list) => list.findIndex((other) => other.id === item.id) === index)
    .map((item) => ({ id: `w:${item.id}`, label: `${workItemLabel} · ${item.label}` }));
  const visible = filterTasks(archived ? archivedTasks : current, filters).filter((task) => {
    if (scope.startsWith("p:") && task.projectSlug !== scope.slice(2)) return false;
    if (scope.startsWith("w:") && task.workItem?.id !== scope.slice(2)) return false;
    return true;
  });

  const open = current.filter((task) => task.status !== "Hecho");
  const selected = own.find((task) => task.id === selectedTaskId);

  function clear() {
    clearFilters({ scope: "" });
  }

  return (
    <div className={m.stack}>
      {/* «Volver» lo ofrece la cabecera del módulo (mismo origen). */}
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
            <p>Kanban operativo del módulo y lista por responsable. Es el mismo store de tareas que se ve en «Tareas» del cliente y en Inicio: cada tarea conserva su identidad en todas las vistas.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className={buttonClass(archived ? "dark" : "secondary", true)} aria-pressed={archived} onClick={() => set({ archived: !archived })}>
              <Glyph name="archive" size={16} />{archived ? "Ver tareas activas" : `Archivadas (${archivedTasks.length})`}
            </button>
            <button type="button" className={buttonClass("primary", true)} disabled={!editable} title={!editable ? "Tu rol puede ver este módulo, pero no crear tareas" : undefined} onClick={() => setCreating(true)}>Nueva tarea</button>
          </div>
        </div>
        <TaskFilterBar
          filters={filters} set={set} clear={clear} active={active + (scope !== "todos" ? 1 : 0)} label="Filtrar tareas del módulo" owners={owners}
          extra={(
            <label className={m.filter}><span>Proyecto o {workItemLabel.toLowerCase()}</span>
              <select value={scope} onChange={(event) => set({ scope: event.target.value === "todos" ? "" : event.target.value })}>
                <option value="todos">Todos</option>
                {projects.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                {items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
          )}
        />
        <div className={m.toolbar}>
          <div className={s.segmented} role="group" aria-label="Formato de tareas">
            <button type="button" aria-pressed={view === "kanban"} onClick={() => set({ view: "kanban" })}><Glyph name="kanban" size={16} />Kanban</button>
            <button type="button" aria-pressed={view === "responsable"} onClick={() => set({ view: "responsable" })}><Glyph name="list" size={16} />Por responsable</button>
            <button type="button" aria-pressed={view === "lista"} onClick={() => set({ view: "lista" })}><Glyph name="list" size={16} />Lista</button>
          </div>
          <span className={s.cardMeta}>{visible.length} {visible.length === 1 ? "tarea" : "tareas"}{archived ? " archivadas" : ""}</span>
        </div>
        <div className={m.panelBody}>
          {!visible.length ? (
            <OSEmptyState icon="busqueda" title={archived ? "No hay tareas archivadas que coincidan" : own.length ? "No hay tareas que coincidan" : "Este módulo todavía no tiene tareas"} actions={own.length ? <button type="button" className={buttonClass("secondary", true)} onClick={clear}>Limpiar filtros</button> : editable ? <button type="button" className={buttonClass("primary", true)} onClick={() => setCreating(true)}>Nueva tarea</button> : undefined}>
              {archived ? `Las tareas hechas hace más de ${TASK_ARCHIVE_AFTER_DAYS} días se archivan y quedan ocultas por defecto.` : "Probá con otro proyecto, responsable, estado, fecha o prioridad."}
            </OSEmptyState>
          ) : view === "responsable" ? (
            <TasksByOwner tasks={visible} label={`Tareas de ${serviceLabel(serviceId)} por responsable`} showModule={false} showClient={false} onOpen={(task) => onSelectTask(task.id)} />
          ) : view === "kanban" ? (
            <div className={m.board} aria-label={`Kanban de ${serviceLabel(serviceId)}`}>
              {TASK_STATUSES.map((column) => {
                const cards = visible.filter((task) => task.status === column);
                return (
                  <section className={m.col} key={column} aria-label={`${column}: ${cards.length} tareas`}>
                    <div className={m.colHead}><h3>{column}</h3><span>{cards.length}</span></div>
                    {cards.length ? cards.map((task) => (
                      <button type="button" className={m.card} data-selected={task.id === selectedTaskId} data-done={task.status === "Hecho"} data-task-id={task.id} key={task.id} onClick={() => onSelectTask(task.id)} aria-label={`${task.id} ${task.title}. ${task.owner}. Prioridad ${task.prio}. Vence ${dueLabel(task)}${task.blocked ? ". Bloqueada" : ""}`}>
                        <span className={m.cardTop}><span>{task.workItem ? `${ORIGIN_KIND_LABEL[task.workItem.collection] ?? workItemLabel} · ${task.id}` : task.id}</span>{task.blocked ? <span className={m.blocked}><Glyph name="blocked" size={11} />Bloqueada</span> : null}</span>
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
                <thead><tr><th scope="col">Tarea</th><th scope="col">{workItemLabel} / proyecto</th><th scope="col">Entregable</th><th scope="col">Responsable</th><th scope="col">Prioridad</th><th scope="col">Vence</th><th scope="col">Estado</th><th scope="col">ID</th></tr></thead>
                <tbody>
                  {visible.map((task) => (
                    <tr key={task.id} data-task-id={task.id}>
                      <td style={{ minWidth: 220 }}><button type="button" className={m.rowButton} onClick={() => onSelectTask(task.id)}>{task.title}</button>{task.blocked ? <> <span className={m.blocked}><Glyph name="blocked" size={11} />Bloqueada</span></> : null}</td>
                      <td className={m.cellWrap}>{task.workItem?.label ?? getProject(task.projectSlug)?.name}</td>
                      <td>{task.deliverable ?? "—"}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{task.owner}</td>
                      <td><OSPriority prio={task.prio} /></td>
                      <td><OSDue label={dueLabel(task)} kind={task.dueKind} status={task.status} /></td>
                      <td style={{ whiteSpace: "nowrap" }}>{task.status}</td>
                      <td className={s.cellSub}>{task.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className={m.panelFoot}>
          Entregables del alcance: {scopeDeliverables(serviceId).join(" · ")}. El estado se cambia desde el panel de la tarea (arrastrar tarjetas queda pendiente). Guardado en este navegador. {REMINDERS_NOTE}
        </div>
      </section>

      {selected ? <TaskSidePanel key={selected.id} item={selected} readOnly={!editable} workItems={workItems} workItemLabel={workItemLabel} onClose={() => onSelectTask(null)} /> : null}
      {creating ? <NewTaskModal clientSlug={client.slug} serviceId={serviceId} workItems={workItems} workItemLabel={workItemLabel} onClose={() => setCreating(false)} onCreated={() => clearFilters({ scope: "", archived: false })} /> : null}
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
