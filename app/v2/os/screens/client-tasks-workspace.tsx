"use client";

/* «Tareas» del cliente: resumen de todas las tareas del proyecto y su estado.
 * Vista por defecto: tareas agrupadas por rol / persona. También por módulo de servicio
 * o en lista ordenada por prioridad o fecha límite (la elección se recuerda por perfil en
 * este navegador). Mismo store único de tareas: el Kanban operativo vive en cada módulo.
 * Las tareas nacen de tres formas: carga manual del PM, automáticas desde los módulos y
 * procedimientos periódicos del manual (hoy de demostración). */
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Glyph } from "../glyphs";
import { canEditService, canManageClient, isArchivedTask, serviceForTask, TASK_ARCHIVE_AFTER_DAYS, tasksForClient } from "../director-data";
import { people, PRIORITIES, TASK_STATUSES, serviceCatalog, serviceLabel, type OsClient, type OsTask, type Priority, type ServiceId, type TaskStatus } from "../os-data";
import { useOsStore } from "../os-store";
import { useLocalStorageState } from "../local-persistence";
import { previewActor } from "../preview-roles";
import { dueLabel, getProject } from "../selectors";
import { serviceHref } from "../service-workspace-data";
import { moduleTaskHref, NewTaskModal, TaskSidePanel } from "../task-blocks";
import { Avatar, Badge, buttonClass, OSDue, OSEmptyState, OSPriority } from "../ui";
import { generatePeriodicTasks, isProcedureTask, PROCEDURE_ROLE_LABEL, procedureRows, PROCEDURES_DEMO_LABEL, PROCEDURES_DEMO_NOTE, shortIsoDate } from "../procedures-periodic";
import s from "../os.module.css";
import d from "./director-update.module.css";
import m from "../modules/modules.module.css";
import t from "./client-tasks.module.css";
import { DATE_FILTERS, matchesDate, type DateFilter } from "../modules/module-task-board";
import { Panel, Strip } from "../modules/module-ui";
import { ClientOperationNav } from "./client-operation-nav";

export type TasksView = "persona" | "modulo" | "lista";
export type TasksSort = "prioridad" | "fecha";
type ViewPreference = { view: TasksView; sort: TasksSort };
const DEFAULT_PREFERENCE: ViewPreference = { view: "persona", sort: "prioridad" };
const VIEWS: { id: TasksView; label: string }[] = [{ id: "persona", label: "Por rol / persona" }, { id: "modulo", label: "Por módulo" }, { id: "lista", label: "Lista" }];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const PRIORITY_ORDER: Record<Priority, number> = { Alta: 0, Media: 1, Baja: 2 };
const CARDS_PER_COLUMN = 8;

/** Clave comparable para vencimientos con formatos mixtos («30 oct», «Mié 4 nov», AAAA-MM-DD, «Sin fecha»). */
export function dueSortKey(due: string) {
  if (/^\d{4}-\d{2}-\d{2}/.test(due)) return due.slice(0, 10);
  const match = due.toLocaleLowerCase("es").match(/(\d{1,2})\s+([a-zé]{3})/);
  const month = match ? MONTHS.indexOf(match[2]) : -1;
  return match && month >= 0 ? `2026-${String(month + 1).padStart(2, "0")}-${match[1].padStart(2, "0")}` : "9999-12-31";
}
function showDue(task: OsTask) {
  return /^\d{4}-\d{2}-\d{2}$/.test(task.due) ? { ...task, due: shortIsoDate(task.due) } : task;
}
function compareTasks(sort: TasksSort) {
  return (a: OsTask, b: OsTask) => {
    const done = Number(a.status === "Hecho") - Number(b.status === "Hecho");
    if (done) return done;
    const prio = PRIORITY_ORDER[a.prio] - PRIORITY_ORDER[b.prio];
    const due = dueSortKey(a.due).localeCompare(dueSortKey(b.due));
    return sort === "prioridad" ? prio || due : due || prio;
  };
}
function personRole(client: OsClient, owner: string) {
  if (owner.startsWith("Cliente ·")) return "Cliente";
  return client.team.find((person) => person.name === owner)?.role ?? people.find((person) => person.name === owner)?.role ?? "Rol sin definir";
}
function originOf(task: OsTask) {
  if (isProcedureTask(task)) return { kind: "procedure", label: "Procedimiento periódico" } as const;
  if (task.workflow) return { kind: "auto", label: task.workflow.kind === "design" ? "Automática · Diseño" : "Automática · Contenidos" } as const;
  return null;
}

type Group = { id: string; title: string; subtitle: string; tasks: OsTask[]; href?: string; hrefLabel?: string; inactive?: boolean; person?: string };

export function ClientTasksWorkspace({ client }: { client: OsClient }) {
  const { tasks, role, servicesOf, commitTasks, notify, localHydrated } = useOsStore();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [preference, setPreference] = useLocalStorageState<ViewPreference>(`viewer:${role}:client-tasks-view`, DEFAULT_PREFERENCE);
  const view: TasksView = VIEWS.some((item) => item.id === preference?.view) ? preference.view : "persona";
  const sort: TasksSort = preference?.sort === "fecha" ? "fecha" : "prioridad";
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<"todos" | ServiceId>("todos");
  const [project, setProject] = useState("todos");
  const [owner, setOwner] = useState("todos");
  const [status, setStatus] = useState<"todos" | TaskStatus>("todos");
  const [prio, setPrio] = useState<"todas" | Priority>("todas");
  const [date, setDate] = useState<DateFilter>("todas");
  const [archived, setArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
  const now = new Date().toISOString();
  const rows = procedureRows(client, activeIds, all, now);
  const pendingProcedures = rows.filter((row) => !row.task).length;

  const visible = (archived ? archivedTasks : current).filter((task) => {
    const serviceId = serviceForTask(task);
    if (moduleFilter !== "todos" && serviceId !== moduleFilter) return false;
    if (project !== "todos" && task.projectSlug !== project) return false;
    if (owner !== "todos" && task.owner !== owner) return false;
    if (status !== "todos" && task.status !== status) return false;
    if (prio !== "todas" && task.prio !== prio) return false;
    if (!matchesDate(task, date)) return false;
    return !normalized || `${task.id} ${task.title} ${task.owner} ${getProject(task.projectSlug)?.name ?? ""} ${serviceLabel(serviceId)} ${task.workItem?.label ?? ""}`.toLocaleLowerCase("es").includes(normalized);
  }).sort(compareTasks(sort));

  const groups: Group[] = view === "modulo"
    ? [...services.map((service) => service.id), ...Array.from(new Set(visible.map(serviceForTask))).filter((id) => !activeIds.includes(id))].map((serviceId) => ({
      id: serviceId,
      title: serviceLabel(serviceId),
      subtitle: activeIds.includes(serviceId) ? "Módulo activo" : "Módulo inactivo",
      tasks: visible.filter((task) => serviceForTask(task) === serviceId),
      href: activeIds.includes(serviceId) ? `${serviceHref(client.slug, serviceId)}?seccion=tareas` : undefined,
      hrefLabel: `Abrir Kanban de ${serviceLabel(serviceId)}`,
      inactive: !activeIds.includes(serviceId),
    })).filter((group) => group.tasks.length || !group.inactive)
    : Array.from(new Set(visible.map((task) => task.owner))).map((name) => ({
      id: name,
      title: name,
      subtitle: personRole(client, name),
      tasks: visible.filter((task) => task.owner === name),
      person: name,
    })).sort((a, b) => b.tasks.filter((task) => task.status !== "Hecho").length - a.tasks.filter((task) => task.status !== "Hecho").length || a.title.localeCompare(b.title, "es"));
  const blocked = open.filter((task) => task.blocked);
  const activeFilters = [normalized, moduleFilter !== "todos", project !== "todos", owner !== "todos", status !== "todos", prio !== "todas", date !== "todas"].filter(Boolean).length;

  function setView(next: TasksView) { setPreference((value) => ({ ...DEFAULT_PREFERENCE, ...value, view: next })); }
  function setSort(next: TasksSort) { setPreference((value) => ({ ...DEFAULT_PREFERENCE, ...value, sort: next })); }
  function clear() {
    setQuery(""); setModuleFilter("todos"); setProject("todos"); setOwner("todos"); setStatus("todos"); setPrio("todas"); setDate("todas");
  }
  function closePanel() {
    const next = new URLSearchParams(params.toString());
    next.delete("task");
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }
  function generate() {
    if (!canCreate || !localHydrated) return;
    const at = new Date().toISOString();
    const actor = previewActor(role);
    const preview = generatePeriodicTasks(client, activeIds, tasks, actor, at);
    if (!preview.created.length) { notify("Las tareas periódicas de este período ya están generadas: no se duplicaron."); return; }
    let created = 0;
    const ok = commitTasks((latest) => { const result = generatePeriodicTasks(client, activeIds, latest, actor, at); created = result.created.length; return result.tasks; }, [], preview.notifications);
    if (ok) notify(created ? `${created} ${created === 1 ? "tarea periódica generada y asignada" : "tareas periódicas generadas y asignadas"} · guardado en este navegador` : "Las tareas periódicas ya estaban generadas.", "success");
  }

  const card = (task: OsTask) => {
    const serviceId = serviceForTask(task);
    const origin = originOf(task);
    const late = task.status !== "Hecho" && task.dueKind === "late";
    return (
      <li key={task.id} className={t.card} data-task-id={task.id} data-done={task.status === "Hecho" || undefined} data-late={late || undefined}>
        <Link className={t.cardTitle} href={moduleTaskHref(task)}>{task.title}</Link>
        <div className={t.cardMeta}>
          {view === "modulo" ? <span className={t.chip}><Avatar name={task.owner} />{task.owner}</span> : <span className={t.chip}>{serviceLabel(serviceId)}</span>}
          <OSPriority prio={task.prio} />
          <OSDue label={dueLabel(showDue(task))} kind={task.dueKind} status={task.status} />
          <span>{task.status}</span>
          {origin ? <span className={t.chip} data-kind={origin.kind}>{origin.label}</span> : null}
          {task.blocked ? <span className={m.blocked} title={task.blocked}><Glyph name="blocked" size={11} />Bloqueada</span> : null}
        </div>
      </li>
    );
  };

  return (
    <>
      <header className={d.tasksHead}>
        <div>
          <span className={s.rotulo}>Operaciones · {client.name}</span>
          <h1>Tareas</h1>
          <p>Resumen de todas las tareas de la cuenta, agrupadas por persona o por módulo. El Kanban operativo de cada módulo vive dentro del módulo.</p>
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

        <section className={m.panel} aria-labelledby="tasks-list-title">
          <div className={m.panelHead}>
            <div><h2 id="tasks-list-title">{archived ? "Tareas archivadas" : "Tareas de la cuenta"}</h2><p>{archived ? `Completadas hace más de ${TASK_ARCHIVE_AFTER_DAYS} días. Se ocultan por defecto.` : "Cada tarea abre su Kanban de módulo. La vista elegida se recuerda para tu perfil en este navegador."}</p></div>
            <span className={s.cardMeta}>{visible.length} {visible.length === 1 ? "tarea" : "tareas"}</span>
          </div>
          <div className={t.controls}>
            <div className={t.controlGroup}>
              <span id="tasks-view-label">Ver tareas</span>
              <div className={t.segmented} role="group" aria-labelledby="tasks-view-label">
                {VIEWS.map((item) => <button key={item.id} type="button" aria-pressed={view === item.id} onClick={() => setView(item.id)}>{item.label}</button>)}
              </div>
            </div>
            <label className={t.controlGroup}><span>Ordenar por</span>
              <select className={t.sort} value={sort} onChange={(event) => setSort(event.target.value as TasksSort)}>
                <option value="prioridad">Prioridad</option>
                <option value="fecha">Fecha límite</option>
              </select>
            </label>
          </div>
          <details className={t.filtersToggle}>
            <summary>Filtros{activeFilters ? ` · ${activeFilters} activos` : ""}</summary>
            <div className={t.filtersBody}>
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
          </details>

          {!visible.length ? (
            <OSEmptyState icon="busqueda" title={archived ? "No hay tareas archivadas que coincidan" : "No hay tareas que coincidan"} actions={<button type="button" className={buttonClass("secondary", true)} onClick={clear}>Limpiar filtros</button>}>
              Probá con otro módulo, proyecto, responsable, estado, prioridad o fecha.
            </OSEmptyState>
          ) : view === "lista" ? (
            <div className={s.tableWrap}>
              <table className={`${s.table} ${m.dense}`}>
                <caption className={s.srOnly}>Tareas de {client.name}</caption>
                <thead><tr><th scope="col">ID</th><th scope="col">Tarea</th><th scope="col">Módulo</th><th scope="col">Proyecto / objeto</th><th scope="col">Responsable</th><th scope="col">Prioridad</th><th scope="col">Vence</th><th scope="col">Estado</th></tr></thead>
                <tbody>
                  {visible.map((task) => {
                    const serviceId = serviceForTask(task);
                    const origin = originOf(task);
                    return (
                      <tr key={task.id} data-task-id={task.id}>
                        <td className={s.cellSub}>{task.id}</td>
                        <td style={{ minWidth: 240 }}>
                          <span className={s.cellMain}>
                            <Link className={s.linkInk} href={moduleTaskHref(task)}>{task.title}</Link>
                            {origin ? <span className={t.chip} data-kind={origin.kind} style={{ alignSelf: "flex-start" }}>{origin.label}</span> : null}
                            {task.blocked ? <span className={m.blocked} style={{ alignSelf: "flex-start" }}><Glyph name="blocked" size={11} />Bloqueada</span> : null}
                          </span>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>{serviceLabel(serviceId)}</td>
                        <td className={m.cellWrap}><span className={s.cellMain}><span>{getProject(task.projectSlug)?.name}</span>{task.workItem ? <span className={s.cellSub}>{task.workItem.label}</span> : null}</span></td>
                        <td style={{ whiteSpace: "nowrap" }}>{task.owner}</td>
                        <td><OSPriority prio={task.prio} /></td>
                        <td><OSDue label={dueLabel(showDue(task))} kind={task.dueKind} status={task.status} /></td>
                        <td style={{ whiteSpace: "nowrap" }}>{task.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={t.board} role="list" aria-label={view === "persona" ? `Tareas de ${client.name} por rol y persona` : `Tareas de ${client.name} por módulo`}>
              {groups.map((group) => {
                const groupOpen = group.tasks.filter((task) => task.status !== "Hecho");
                const late = groupOpen.filter((task) => task.dueKind === "late").length;
                const groupBlocked = groupOpen.filter((task) => task.blocked).length;
                const approvals = groupOpen.filter((task) => task.status === "En aprobación").length;
                const total = Math.max(1, group.tasks.length);
                const shown = expanded[group.id] ? group.tasks : group.tasks.slice(0, CARDS_PER_COLUMN);
                return (
                  <section key={group.id} className={t.column} role="listitem" aria-label={`${group.title} · ${groupOpen.length} abiertas`} data-group={group.id}>
                    <div className={t.colHead}>
                      {group.person ? <Avatar name={group.person} size="md" tone={group.person.startsWith("Cliente ·") ? "accent" : undefined} /> : <span className={t.stat}><Glyph name="kanban" size={13} /></span>}
                      <div><h3>{group.title}</h3><small>{group.subtitle}</small></div>
                      <div className={t.colStats}>
                        <span className={t.stat}><strong>{groupOpen.length}</strong> abiertas</span>
                        {approvals ? <span className={t.stat} data-tone="accent"><strong>{approvals}</strong> en aprobación</span> : null}
                        {late ? <span className={t.stat} data-tone="error"><strong>{late}</strong> vencidas</span> : null}
                        {groupBlocked ? <span className={t.stat} data-tone="error"><strong>{groupBlocked}</strong> bloqueadas</span> : null}
                      </div>
                      <div className={t.load} aria-hidden="true">{TASK_STATUSES.map((item) => { const count = group.tasks.filter((task) => task.status === item).length; return count ? <i key={item} data-status={item} style={{ width: `${(count / total) * 100}%` }} title={`${item}: ${count}`} /> : null; })}</div>
                      {group.href ? <Link className={`${s.link} ${t.colLink}`} href={group.href} aria-label={group.hrefLabel}>Abrir Kanban</Link> : group.inactive ? <span className={t.colLink}><Badge tone="stone">Módulo inactivo</Badge></span> : null}
                    </div>
                    {group.tasks.length ? <ul className={t.cards}>{shown.map(card)}</ul> : <p className={t.emptyCol}>Sin tareas en este módulo.</p>}
                    {group.tasks.length > CARDS_PER_COLUMN ? <button type="button" className={`${s.link} ${t.more}`} onClick={() => setExpanded((value) => ({ ...value, [group.id]: !value[group.id] }))}>{expanded[group.id] ? "Ver menos" : `Ver ${group.tasks.length - CARDS_PER_COLUMN} más`}</button> : null}
                  </section>
                );
              })}
            </div>
          )}
          <div className={m.panelFoot}>Guardado en este navegador: sin sincronización entre usuarios. Las tareas completadas se archivan a los {TASK_ARCHIVE_AFTER_DAYS} días. Avisos: al asignarse una tarea y cuando se acerca su vencimiento (campana de notificaciones).</div>
        </section>

        <>
          <Panel title="Procedimientos periódicos" id="tasks-procedures" description="Tareas que el sistema crea a partir de los procedimientos del manual, una por período y sin duplicados." actions={<><span className={t.demoTag}>{PROCEDURES_DEMO_LABEL}</span><button type="button" className={buttonClass("secondary", true)} onClick={generate} disabled={!canCreate || !localHydrated} title={!canCreate ? "Solo el PM o el administrador generan tareas periódicas" : undefined}>Generar tareas periódicas</button></>} footer={<>{PROCEDURES_DEMO_NOTE} {pendingProcedures ? `${pendingProcedures} pendientes de generar para el próximo período.` : "Todas las del próximo período ya están generadas."}</>}>
            {rows.length ? (
              <div className={t.procedures}>
                {rows.map((row) => (
                  <div className={t.procRow} key={row.procedure.id} data-procedure={row.procedure.id}>
                    <div><strong>{row.procedure.title}</strong><small>{serviceLabel(row.procedure.serviceId)} · {row.procedure.frequency === "semanal" ? "Semanal" : "Mensual"} · {row.occurrence.periodLabel}</small></div>
                    <div><span className={t.chip}>{PROCEDURE_ROLE_LABEL[row.procedure.ownerRole]}</span> <small style={{ display: "inline" }}>{row.owner}</small></div>
                    <div className={t.procState}>
                      <small>Vence {shortIsoDate(row.occurrence.due)}</small>
                      {row.task ? <Link className={s.link} href={moduleTaskHref(row.task)}>Tarea generada</Link> : <Badge tone="stone">Pendiente de generar</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className={m.panelBody}><p className={s.cellSub} style={{ margin: 0 }}>Activá módulos de servicio para ver sus procedimientos.</p></div>}
          </Panel>
          <Panel title={`Bloqueos · ${blocked.length}`} id="tasks-blocked" description="Qué frena a cada módulo">
            {blocked.length ? <div className={m.rows}>{blocked.map((task) => <div className={m.markRow} key={task.id}><i className={m.mark} data-tone="error" /><div><Link className={m.rowLink} href={moduleTaskHref(task)}>{task.id} · {task.title}</Link><small>{serviceLabel(serviceForTask(task))} · {task.blocked}</small></div><span className={s.cellSub}>{task.owner}</span></div>)}</div> : <div className={m.panelBody}><p className={s.cellSub} style={{ margin: 0 }}>Sin bloqueos activos.</p></div>}
          </Panel>
        </>
        {!canCreate ? <p className={s.demoNote}>Tu rol puede visualizar todas las tareas, pero solo modifica módulos permitidos de clientes asignados. Los permisos son visuales: todavía no se aplican en servidor.</p> : null}
      </div>

      {selected ? <TaskSidePanel key={selected.id} item={selected} readOnly onClose={closePanel} /> : null}
      {creating ? <NewTaskModal clientSlug={client.slug} serviceId={moduleFilter === "todos" ? undefined : moduleFilter} onClose={() => setCreating(false)} onCreated={() => { clear(); setArchived(false); }} /> : null}
    </>
  );
}
