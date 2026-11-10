"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Glyph } from "../glyphs";
import {
  canEditService,
  canManageClient,
  isArchivedTask,
  projectServiceLabel,
  serviceForTask,
  taskOwnerRole,
  tasksForClient,
} from "../director-data";
import {
  TASK_STATUSES,
  serviceCatalog,
  serviceLabel,
  shortName,
  type OsClient,
  type OsTask,
  type ServiceId,
  type TaskStatus,
} from "../os-data";
import { useOsStore } from "../os-store";
import { dueLabel, getProject } from "../selectors";
import { NewTaskModal } from "../task-blocks";
import { Avatar, Badge, buttonClass, cx, OSDue, OSEmptyState, OSPriority } from "../ui";
import s from "../os.module.css";
import sc from "../screens.module.css";
import d from "./director-update.module.css";
import { ClientOperationNav } from "./client-operation-nav";

type DateFilter = "todos" | "vencidas" | "hoy" | "semana" | "mas-adelante" | "completadas";
type ViewMode = "kanban" | "lista";

function matchesDate(task: OsTask, date: DateFilter) {
  if (date === "todos") return true;
  if (date === "completadas") return task.status === "Hecho";
  if (date === "vencidas") return task.dueKind === "late" && task.status !== "Hecho";
  if (date === "hoy") return task.dueKind === "today" && task.status !== "Hecho";
  if (date === "semana") return task.dueKind === "week" && task.status !== "Hecho";
  return task.dueKind === "later" && task.status !== "Hecho";
}

export function ClientTasksWorkspace({
  client,
  lockedServiceId,
  title,
}: {
  client: OsClient;
  lockedServiceId?: ServiceId;
  title?: string;
}) {
  const { tasks, role } = useOsStore();
  const [view, setView] = useState<ViewMode>("lista");
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<"todos" | ServiceId>(lockedServiceId ?? "todos");
  const [roleFilter, setRoleFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | TaskStatus>("todos");
  const [dateFilter, setDateFilter] = useState<DateFilter>("todos");
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const allClientTasks = tasksForClient(tasks, client.slug);
  const activeTasks = allClientTasks.filter((task) => !isArchivedTask(task));
  const archivedTasks = allClientTasks.filter(isArchivedTask);
  const roles = Array.from(new Set(allClientTasks.map(taskOwnerRole))).sort((a, b) => a.localeCompare(b, "es"));
  const availableServices = serviceCatalog.filter((service) => client.services.includes(service.id));
  const canCreate = lockedServiceId
    ? canEditService(role, client.slug, lockedServiceId)
    : canManageClient(role, client.slug) && client.services.some((serviceId) => canEditService(role, client.slug, serviceId));

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    const source = showArchived ? archivedTasks : activeTasks;
    return source.filter((task) => {
      const serviceId = serviceForTask(task);
      if (lockedServiceId && serviceId !== lockedServiceId) return false;
      if (!lockedServiceId && moduleFilter !== "todos" && serviceId !== moduleFilter) return false;
      if (roleFilter !== "todos" && taskOwnerRole(task) !== roleFilter) return false;
      if (statusFilter !== "todos" && task.status !== statusFilter) return false;
      if (!matchesDate(task, dateFilter)) return false;
      const project = getProject(task.projectSlug);
      return !normalized || `${task.id} ${task.title} ${task.owner} ${taskOwnerRole(task)} ${project?.name ?? ""} ${serviceLabel(serviceId)}`.toLocaleLowerCase("es").includes(normalized);
    });
  }, [activeTasks, archivedTasks, dateFilter, lockedServiceId, moduleFilter, query, roleFilter, showArchived, statusFilter]);

  const open = activeTasks.filter((task) => task.status !== "Hecho").length;
  const blocked = activeTasks.filter((task) => task.blocked && task.status !== "Hecho").length;
  const approvals = activeTasks.filter((task) => task.status === "En aprobación").length;
  const heading = title ?? "Tareas";
  const selectedCreateService = lockedServiceId ?? (moduleFilter === "todos" ? undefined : moduleFilter);

  function clearFilters() {
    setQuery("");
    if (!lockedServiceId) setModuleFilter("todos");
    setRoleFilter("todos");
    setStatusFilter("todos");
    setDateFilter("todos");
  }

  return (
    <>
      <header className={d.tasksHead}>
        <div>
          <span className={s.rotulo}>Operaciones · {client.name}</span>
          <h1>{heading}</h1>
          <p>{lockedServiceId ? `Trabajo del módulo ${serviceLabel(lockedServiceId)} con responsables, estados, vencimientos y archivo.` : "Resumen de todas las tareas de la cuenta, sin perder el módulo y proyecto al que pertenecen."}</p>
        </div>
        <div className={s.actions}>
          <button type="button" className={buttonClass(showArchived ? "dark" : "secondary")} onClick={() => setShowArchived((value) => !value)}>
            <Glyph name="archive" size={17} />{showArchived ? "Volver a tareas activas" : `Archivadas (${archivedTasks.length})`}
          </button>
          <button type="button" className={buttonClass("primary")} onClick={() => setModalOpen(true)} disabled={!canCreate} title={!canCreate ? "Tu rol puede ver este espacio, pero no crear tareas en este cliente o módulo" : undefined}>
            Nueva tarea
          </button>
        </div>
      </header>

      <ClientOperationNav client={client} active={lockedServiceId ?? "tareas"} />

      <div className={d.tasksBody}>
        <section className={d.tasksSummary} aria-label="Resumen de tareas">
          <div><span>Pendientes</span><strong>{open}</strong></div>
          <div><span>Bloqueadas</span><strong>{blocked}</strong></div>
          <div><span>En aprobación</span><strong>{approvals}</strong></div>
          <div><span>Archivadas</span><strong>{archivedTasks.length}</strong></div>
        </section>

        <div className={d.tasksToolbar} role="search" aria-label="Filtrar tareas">
          <label className={cx(s.searchField, s.searchFieldRaised)}>
            <Glyph name="search" size={16} />
            <span className={s.srOnly}>Buscar tareas</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar tarea, proyecto o responsable" />
          </label>
          {!lockedServiceId ? (
            <label className={sc.selectWrap}>Módulo
              <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value as "todos" | ServiceId)}>
                <option value="todos">Todos los módulos</option>
                {availableServices.map((service) => <option value={service.id} key={service.id}>{service.label}</option>)}
              </select>
            </label>
          ) : null}
          <label className={sc.selectWrap}>Rol
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="todos">Todos los roles</option>
              {roles.map((item) => <option value={item} key={item}>{item}</option>)}
            </select>
          </label>
          <label className={sc.selectWrap}>Estado
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "todos" | TaskStatus)}>
              <option value="todos">Todos los estados</option>
              {TASK_STATUSES.map((item) => <option value={item} key={item}>{item}</option>)}
            </select>
          </label>
          <label className={sc.selectWrap}>Finalización
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)}>
              <option value="todos">Todas las fechas</option>
              <option value="vencidas">Vencidas</option>
              <option value="hoy">Finalizan hoy</option>
              <option value="semana">Próximos 7 días</option>
              <option value="mas-adelante">Más adelante</option>
              <option value="completadas">Completadas</option>
            </select>
          </label>
        </div>

        <div className={sc.boardTools}>
          <div className={s.segmented} role="group" aria-label="Formato de tareas">
            <button type="button" aria-pressed={view === "lista"} onClick={() => setView("lista")}><Glyph name="list" size={16} />Lista</button>
            <button type="button" aria-pressed={view === "kanban"} onClick={() => setView("kanban")}><Glyph name="kanban" size={16} />Kanban</button>
          </div>
          <span className={s.cardMeta}>{visible.length} {visible.length === 1 ? "tarea" : "tareas"}</span>
        </div>

        {!visible.length ? (
          <OSEmptyState icon="busqueda" title={showArchived ? "No hay tareas archivadas que coincidan" : "No hay tareas que coincidan"} actions={<button type="button" className={buttonClass("secondary", true)} onClick={clearFilters}>Limpiar filtros</button>}>
            Probá con otro módulo, rol, estado o fecha de finalización.
          </OSEmptyState>
        ) : view === "lista" ? (
          <section className={s.surface}>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <caption className={s.srOnly}>Tareas de {client.name}</caption>
                <thead><tr><th>ID</th><th>Tarea</th><th>Módulo</th><th>Responsable y rol</th><th>Prioridad</th><th>Finalización</th><th>Estado</th></tr></thead>
                <tbody>{visible.map((task) => {
                  const project = getProject(task.projectSlug);
                  const serviceId = serviceForTask(task);
                  return (
                    <tr key={task.id}>
                      <td className={s.cellSub}>{task.id}</td>
                      <td style={{ minWidth: 250 }}><span className={s.cellMain}><Link className={s.linkInk} href={`/v2/proyectos/${task.projectSlug}?task=${task.id}`}>{task.title}</Link><span className={s.cellSub}>{project?.name}</span></span>{task.blocked ? <Badge tone="error">Bloqueada</Badge> : null}</td>
                      <td>{serviceLabel(serviceId)}</td>
                      <td><span className={s.cellMain}><span>{task.owner}</span><span className={s.cellSub}>{taskOwnerRole(task)}</span></span></td>
                      <td><OSPriority prio={task.prio} /></td>
                      <td><OSDue label={dueLabel(task)} kind={task.dueKind} status={task.status} /></td>
                      <td>{task.status}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          </section>
        ) : (
          <div className={sc.kanban}>
            {TASK_STATUSES.map((status) => {
              const cards = visible.filter((task) => task.status === status);
              return (
                <section className={sc.kanbanCol} key={status} aria-label={`${status}: ${cards.length} tareas`}>
                  <div className={sc.kanbanHead}><h2>{status}</h2><span>{cards.length}</span></div>
                  {cards.length ? cards.map((task) => (
                    <Link className={cx(sc.card, task.status === "Hecho" && sc.cardDone)} href={`/v2/proyectos/${task.projectSlug}?task=${task.id}`} key={task.id}>
                      <span className={sc.cardTop}><span>{task.id}</span>{task.blocked ? <Badge tone="error">Bloqueada</Badge> : null}</span>
                      <span className={sc.cardTitle}>{task.title}</span>
                      <span className={d.taskCardMeta}><span>{serviceLabel(serviceForTask(task))}</span><span>{projectServiceLabel(task.projectSlug)}</span></span>
                      <span className={sc.cardFoot}><span className={sc.owner}><Avatar name={task.owner} />{shortName(task.owner)}</span><OSPriority prio={task.prio} /><OSDue label={dueLabel(task)} kind={task.dueKind} status={task.status} /></span>
                    </Link>
                  )) : <p className={sc.colEmpty}>Sin tareas</p>}
                </section>
              );
            })}
          </div>
        )}

        <p className={d.archiveNote}>Las tareas completadas se archivan a los 30 días para mantener limpia la operación. En esta iteración el archivo está representado con datos de demostración; la automatización real requiere persistencia y una tarea programada en backend.</p>
        {!canCreate ? <p className={s.demoNote}>Tu rol puede visualizar todas las tareas, pero las modificaciones quedan limitadas a módulos permitidos dentro de clientes asignados. El control real todavía debe aplicarse en servidor y base de datos.</p> : null}
      </div>

      {modalOpen ? <NewTaskModal clientSlug={client.slug} serviceId={selectedCreateService} onClose={() => setModalOpen(false)} /> : null}
    </>
  );
}
