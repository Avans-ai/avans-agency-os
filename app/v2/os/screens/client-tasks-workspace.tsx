"use client";

/* «Tareas» del cliente: vista transversal de consulta y coordinación.
 * El Kanban operativo vive dentro de cada módulo; acá se ven todas las tareas
 * de la cuenta (mismo store único, sin duplicar) con resumen por módulo,
 * responsables, bloqueos, archivo y filtros, y enlaces al Kanban de cada módulo. */
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Glyph } from "../glyphs";
import { canEditService, canManageClient, isArchivedTask, serviceForTask, TASK_ARCHIVE_AFTER_DAYS, tasksForClient } from "../director-data";
import { PRIORITIES, TASK_STATUSES, serviceCatalog, serviceLabel, type OsClient, type Priority, type ServiceId, type TaskStatus } from "../os-data";
import { useOsStore } from "../os-store";
import { dueLabel, getProject } from "../selectors";
import { serviceHref } from "../service-workspace-data";
import { moduleTaskHref, NewTaskModal, TaskSidePanel } from "../task-blocks";
import { Badge, buttonClass, OSDue, OSEmptyState, OSPriority } from "../ui";
import s from "../os.module.css";
import d from "./director-update.module.css";
import m from "../modules/modules.module.css";
import { DATE_FILTERS, matchesDate, type DateFilter } from "../modules/module-task-board";
import { Panel, Strip } from "../modules/module-ui";
import { ClientOperationNav } from "./client-operation-nav";

export function ClientTasksWorkspace({ client }: { client: OsClient }) {
  const { tasks, role, servicesOf } = useOsStore();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<"todos" | ServiceId>("todos");
  const [project, setProject] = useState("todos");
  const [owner, setOwner] = useState("todos");
  const [status, setStatus] = useState<"todos" | TaskStatus>("todos");
  const [prio, setPrio] = useState<"todas" | Priority>("todas");
  const [date, setDate] = useState<DateFilter>("todas");
  const [archived, setArchived] = useState(false);
  const [creating, setCreating] = useState(false);

  const activeIds = servicesOf(client.slug);
  const services = serviceCatalog.filter((service) => activeIds.includes(service.id));
  const all = useMemo(() => tasksForClient(tasks, client.slug), [client.slug, tasks]);
  const current = all.filter((task) => !isArchivedTask(task));
  const archivedTasks = all.filter(isArchivedTask);
  const open = current.filter((task) => task.status !== "Hecho");
  const owners = Array.from(new Set(all.map((task) => task.owner))).sort((a, b) => a.localeCompare(b, "es"));
  const projects = Array.from(new Set(all.map((task) => task.projectSlug)));
  const canCreate = canManageClient(role, client.slug) && activeIds.some((serviceId) => canEditService(role, client.slug, serviceId));
  const selected = all.find((task) => task.id === params.get("task"));
  const normalized = query.trim().toLocaleLowerCase("es");

  const visible = (archived ? archivedTasks : current).filter((task) => {
    const serviceId = serviceForTask(task);
    if (moduleFilter !== "todos" && serviceId !== moduleFilter) return false;
    if (project !== "todos" && task.projectSlug !== project) return false;
    if (owner !== "todos" && task.owner !== owner) return false;
    if (status !== "todos" && task.status !== status) return false;
    if (prio !== "todas" && task.prio !== prio) return false;
    if (!matchesDate(task, date)) return false;
    return !normalized || `${task.id} ${task.title} ${task.owner} ${getProject(task.projectSlug)?.name ?? ""} ${serviceLabel(serviceId)} ${task.workItem?.label ?? ""}`.toLocaleLowerCase("es").includes(normalized);
  });

  const byModule = [...services.map((service) => service.id), ...Array.from(new Set(all.map(serviceForTask))).filter((id) => !activeIds.includes(id))].map((serviceId) => {
    const own = all.filter((task) => serviceForTask(task) === serviceId);
    const ownCurrent = own.filter((task) => !isArchivedTask(task));
    const ownOpen = ownCurrent.filter((task) => task.status !== "Hecho");
    return {
      serviceId,
      active: activeIds.includes(serviceId),
      open: ownOpen.length,
      doing: ownOpen.filter((task) => task.status === "En curso").length,
      approvals: ownOpen.filter((task) => task.status === "En aprobación").length,
      blocked: ownOpen.filter((task) => task.blocked).length,
      late: ownOpen.filter((task) => task.dueKind === "late").length,
      done: ownCurrent.length - ownOpen.length,
      archived: own.length - ownCurrent.length,
    };
  });

  const people = owners.map((name) => {
    const own = open.filter((task) => task.owner === name);
    return { name, open: own.length, blocked: own.filter((task) => task.blocked).length, late: own.filter((task) => task.dueKind === "late").length, high: own.filter((task) => task.prio === "Alta").length };
  }).filter((row) => row.open).sort((a, b) => b.open - a.open);
  const blocked = open.filter((task) => task.blocked);

  function clear() {
    setQuery(""); setModuleFilter("todos"); setProject("todos"); setOwner("todos"); setStatus("todos"); setPrio("todas"); setDate("todas");
  }

  function closePanel() {
    const next = new URLSearchParams(params.toString());
    next.delete("task");
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  return (
    <>
      <header className={d.tasksHead}>
        <div>
          <span className={s.rotulo}>Operaciones · {client.name}</span>
          <h1>Tareas</h1>
          <p>Vista transversal para consultar y coordinar todas las tareas de la cuenta. El Kanban operativo de cada módulo vive dentro del módulo.</p>
        </div>
        <div className={s.actions}>
          <button type="button" className={buttonClass(archived ? "dark" : "secondary")} aria-pressed={archived} onClick={() => setArchived((value) => !value)}>
            <Glyph name="archive" size={17} />{archived ? "Volver a tareas activas" : `Archivadas (${archivedTasks.length})`}
          </button>
          <button type="button" className={buttonClass("primary")} onClick={() => setCreating(true)} disabled={!canCreate} title={!canCreate ? "Tu rol puede ver este espacio, pero no crear tareas en este cliente" : undefined}>Nueva tarea</button>
        </div>
      </header>

      <ClientOperationNav client={client} active="tareas" />

      <div className={d.tasksBody}>
        <Strip label="Resumen de tareas" items={[
          { label: "Abiertas", value: open.length },
          { label: "En aprobación", value: open.filter((task) => task.status === "En aprobación").length },
          { label: "Bloqueadas", value: blocked.length, alert: blocked.length > 0 },
          { label: "Vencidas", value: open.filter((task) => task.dueKind === "late").length, alert: open.some((task) => task.dueKind === "late") },
          { label: "Archivadas", value: archivedTasks.length, detail: `Hechas hace +${TASK_ARCHIVE_AFTER_DAYS} días` },
        ]} />

        <Panel title="Resumen por módulo" id="tasks-by-module" description="Cada tarea pertenece a un solo módulo. Abrí el Kanban del módulo para operar.">
          <div className={s.tableWrap}>
            <table className={`${s.table} ${m.dense}`}>
              <caption className={s.srOnly}>Tareas por módulo de {client.name}</caption>
              <thead><tr><th scope="col">Módulo</th><th scope="col" className={s.num}>Abiertas</th><th scope="col" className={s.num}>En curso</th><th scope="col" className={s.num}>Aprobación</th><th scope="col" className={s.num}>Bloqueadas</th><th scope="col" className={s.num}>Vencidas</th><th scope="col" className={s.num}>Hechas</th><th scope="col" className={s.num}>Archivadas</th><th scope="col">Kanban</th></tr></thead>
              <tbody>
                {byModule.map((row) => (
                  <tr key={row.serviceId}>
                    <td><strong style={{ fontWeight: 500 }}>{serviceLabel(row.serviceId)}</strong>{row.active ? null : <> <Badge tone="stone">Módulo inactivo</Badge></>}</td>
                    <td className={s.num}>{row.open}</td>
                    <td className={s.num}>{row.doing}</td>
                    <td className={s.num}>{row.approvals}</td>
                    <td className={s.num}>{row.blocked ? <span style={{ color: "var(--av-error)", fontWeight: 600 }}>{row.blocked}</span> : 0}</td>
                    <td className={s.num}>{row.late ? <span style={{ color: "var(--av-error)", fontWeight: 600 }}>{row.late}</span> : 0}</td>
                    <td className={s.num}>{row.done}</td>
                    <td className={s.num}>{row.archived}</td>
                    <td>{row.active ? <Link className={s.link} href={`${serviceHref(client.slug, row.serviceId)}?seccion=tareas`} aria-label={`Abrir Kanban de ${serviceLabel(row.serviceId)}`}>Abrir Kanban</Link> : <span className={s.cellSub}>No disponible</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className={m.grid2}>
          <Panel title="Responsables" id="tasks-owners" description="Carga abierta por persona">
            {people.length ? (
              <div className={s.tableWrap}>
                <table className={`${s.table} ${m.dense}`}>
                  <caption className={s.srOnly}>Tareas abiertas por responsable</caption>
                  <thead><tr><th scope="col">Responsable</th><th scope="col" className={s.num}>Abiertas</th><th scope="col" className={s.num}>Alta prioridad</th><th scope="col" className={s.num}>Bloqueadas</th><th scope="col" className={s.num}>Vencidas</th></tr></thead>
                  <tbody>{people.map((row) => <tr key={row.name}><td><button type="button" className={m.rowButton} onClick={() => { setOwner(row.name); setArchived(false); }}>{row.name}</button></td><td className={s.num}>{row.open}</td><td className={s.num}>{row.high}</td><td className={s.num}>{row.blocked}</td><td className={s.num}>{row.late}</td></tr>)}</tbody>
                </table>
              </div>
            ) : <div className={m.panelBody}><p className={s.cellSub} style={{ margin: 0 }}>Sin tareas abiertas.</p></div>}
          </Panel>
          <Panel title={`Bloqueos · ${blocked.length}`} id="tasks-blocked" description="Qué frena a cada módulo">
            {blocked.length ? <div className={m.rows}>{blocked.map((task) => <div className={m.markRow} key={task.id}><i className={m.mark} data-tone="error" /><div><Link className={m.rowLink} href={moduleTaskHref(task)}>{task.id} · {task.title}</Link><small>{serviceLabel(serviceForTask(task))} · {task.blocked}</small></div><span className={s.cellSub}>{task.owner}</span></div>)}</div> : <div className={m.panelBody}><p className={s.cellSub} style={{ margin: 0 }}>Sin bloqueos activos.</p></div>}
          </Panel>
        </div>

        <section className={m.panel} aria-labelledby="tasks-list-title">
          <div className={m.panelHead}>
            <div><h2 id="tasks-list-title">{archived ? "Tareas archivadas" : "Todas las tareas"}</h2><p>{archived ? `Completadas hace más de ${TASK_ARCHIVE_AFTER_DAYS} días. Se ocultan por defecto.` : "Consulta transversal. Cada fila abre la tarea en el Kanban de su módulo."}</p></div>
            <span className={s.cardMeta}>{visible.length} {visible.length === 1 ? "tarea" : "tareas"}</span>
          </div>
          <div className={m.toolbar} style={{ display: "block" }}>
            <div className={`${m.filters} ${m.filtersWide}`} role="search" aria-label="Filtrar tareas del cliente">
              <label className={m.filter}><span>Buscar</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tarea, proyecto, responsable o módulo" /></label>
              <label className={m.filter}><span>Módulo</span>
                <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value as "todos" | ServiceId)}>
                  <option value="todos">Todos los módulos</option>
                  {services.map((service) => <option value={service.id} key={service.id}>{service.label}</option>)}
                </select>
              </label>
              <label className={m.filter}><span>Proyecto</span>
                <select value={project} onChange={(event) => setProject(event.target.value)}>
                  <option value="todos">Todos</option>
                  {projects.map((slug) => <option value={slug} key={slug}>{getProject(slug)?.name ?? slug}</option>)}
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
              <label className={m.filter}><span>Prioridad</span>
                <select value={prio} onChange={(event) => setPrio(event.target.value as "todas" | Priority)}>
                  <option value="todas">Todas</option>
                  {PRIORITIES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className={m.filter}><span>Fecha</span>
                <select value={date} onChange={(event) => setDate(event.target.value as DateFilter)}>
                  {DATE_FILTERS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
            </div>
          </div>
          {visible.length ? (
            <div className={s.tableWrap}>
              <table className={`${s.table} ${m.dense}`}>
                <caption className={s.srOnly}>Tareas de {client.name}</caption>
                <thead><tr><th scope="col">ID</th><th scope="col">Tarea</th><th scope="col">Módulo</th><th scope="col">Proyecto / objeto</th><th scope="col">Responsable</th><th scope="col">Prioridad</th><th scope="col">Vence</th><th scope="col">Estado</th></tr></thead>
                <tbody>
                  {visible.map((task) => {
                    const serviceId = serviceForTask(task);
                    return (
                      <tr key={task.id} data-task-id={task.id}>
                        <td className={s.cellSub}>{task.id}</td>
                        <td style={{ minWidth: 240 }}>
                          <span className={s.cellMain}>
                            <Link className={s.linkInk} href={moduleTaskHref(task)}>{task.title}</Link>
                            {task.blocked ? <span className={m.blocked} style={{ alignSelf: "flex-start" }}><Glyph name="blocked" size={11} />Bloqueada</span> : null}
                          </span>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>{serviceLabel(serviceId)}</td>
                        <td className={m.cellWrap}><span className={s.cellMain}><span>{getProject(task.projectSlug)?.name}</span>{task.workItem ? <span className={s.cellSub}>{task.workItem.label}</span> : null}</span></td>
                        <td style={{ whiteSpace: "nowrap" }}>{task.owner}</td>
                        <td><OSPriority prio={task.prio} /></td>
                        <td><OSDue label={dueLabel(task)} kind={task.dueKind} status={task.status} /></td>
                        <td style={{ whiteSpace: "nowrap" }}>{task.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <OSEmptyState icon="busqueda" title={archived ? "No hay tareas archivadas que coincidan" : "No hay tareas que coincidan"} actions={<button type="button" className={buttonClass("secondary", true)} onClick={clear}>Limpiar filtros</button>}>
              Probá con otro módulo, proyecto, responsable, estado, prioridad o fecha.
            </OSEmptyState>
          )}
          <div className={m.panelFoot}>Guardado en este navegador: sin sincronización entre usuarios. Las tareas completadas se archivan a los {TASK_ARCHIVE_AFTER_DAYS} días; la automatización real requiere backend.</div>
        </section>
        {!canCreate ? <p className={s.demoNote}>Tu rol puede visualizar todas las tareas, pero solo modifica módulos permitidos de clientes asignados. Los permisos son visuales: todavía no se aplican en servidor.</p> : null}
      </div>

      {selected ? <TaskSidePanel key={selected.id} item={selected} readOnly onClose={closePanel} /> : null}
      {creating ? <NewTaskModal clientSlug={client.slug} serviceId={moduleFilter === "todos" ? undefined : moduleFilter} onClose={() => setCreating(false)} onCreated={() => { clear(); setArchived(false); }} /> : null}
    </>
  );
}
