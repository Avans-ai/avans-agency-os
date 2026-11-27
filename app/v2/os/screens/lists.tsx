"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { clientOfTask, isArchivedTask, serviceForTask } from "../director-data";
import { filterTasks, liveDueKind, ownersOf, TaskFilterBar, TasksByOwner, useTaskFilters } from "../task-lists";
import { isUnassigned, REMINDERS_NOTE } from "../workflow-tasks";
import { osClients, osProjects, serviceCatalog, type ClientStatus } from "../os-data";
import { useOsStore } from "../os-store";
import { previewActor } from "../preview-roles";
import { getClient, myApprovals, pendingApprovals, projectProgress, STATUS_ORDER, tasksOf, waitsForMe } from "../selectors";
import { ApprovalRow, NewTaskButton } from "../task-blocks";
import { cx, OSEmptyState, OSSkeletonRows, OSStatus, PageHead, Progress } from "../ui";
import s from "../os.module.css";
import sc from "../screens.module.css";

const STATUS_FILTERS: { id: "todos" | ClientStatus; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "en-riesgo", label: "En riesgo" },
  { id: "atencion", label: "Atención" },
  { id: "al-dia", label: "Al día" },
  { id: "onboarding", label: "Onboarding" },
];

export function ProjectsScreen() {
  const { tasks } = useOsStore();
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]["id"]>("todos");
  const rows = useMemo(() => osProjects
    .filter(project => filter === "todos" || project.status === filter)
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name, "es")), [filter]);

  return (
    <div className={s.page}>
      <PageHead rotulo="Operaciones" title="Proyectos y tareas" description="Todos los proyectos activos de la agencia. Cada proyecto pertenece a una ficha de cliente." actions={<NewTaskButton />} />
      <div className={sc.toolbar}>
        <div className={s.tagRow} role="group" aria-label="Estado del proyecto">
          {STATUS_FILTERS.map(item => <button key={item.id} type="button" className={s.tag} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}
        </div>
      </div>
      {rows.length ? (
        <section className={s.surface} aria-label="Listado de proyectos">
          <div className={cx(s.tableWrap, sc.desktopTable)}>
            <table className={s.table}>
              <caption>{rows.length} proyectos · datos de demostración</caption>
              <thead><tr><th scope="col" className={s.stickyCol}>Proyecto</th><th scope="col">Cliente</th><th scope="col">Responsable</th><th scope="col" className={s.num}>Tareas</th><th scope="col">Avance</th><th scope="col">Estado</th><th scope="col">Entrega</th></tr></thead>
              <tbody>
                {rows.map(project => (
                  <tr key={project.slug}>
                    <td className={s.stickyCol}><Link className={s.linkInk} href={`/v2/proyectos/${project.slug}`}>{project.name}</Link></td>
                    <td><Link className={s.linkInk} href={`/v2/clientes/${project.clientSlug}`}>{getClient(project.clientSlug)?.name}</Link></td>
                    <td>{project.owner}</td>
                    <td className={s.num}>{tasksOf(tasks, project.slug).length}</td>
                    <td style={{ minWidth: 150 }}><Progress value={projectProgress(project.slug, tasks)} label={`Avance de ${project.name}`} /></td>
                    <td><OSStatus status={project.status} /></td>
                    <td style={{ whiteSpace: "nowrap" }}>{project.delivery}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className={sc.mobileList}>
            {rows.map(project => (
              <li key={project.slug}>
                <Link href={`/v2/proyectos/${project.slug}`}>
                  <strong style={{ fontWeight: 500 }}>{project.name}</strong>
                  <OSStatus status={project.status} />
                  <small>{getClient(project.clientSlug)?.name} · Entrega {project.delivery}</small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : <OSEmptyState icon="busqueda" title="No hay proyectos con ese estado" actions={<button type="button" className={s.tag} onClick={() => setFilter("todos")}>Ver todos</button>} />}
    </div>
  );
}

export function ApprovalsScreen() {
  const { tasks, role } = useOsStore();
  const actor = previewActor(role);
  const all = pendingApprovals(tasks);
  const mine = myApprovals(tasks, actor);
  const others = all.filter(item => !waitsForMe(item, actor));
  return (
    <div className={s.page}>
      <PageHead rotulo="Operaciones" title="Aprobaciones" description="Entregas que esperan una decisión interna antes de avanzar o enviarse al cliente. Nada se envía automáticamente." />
      <section className={s.surface} aria-labelledby="mine-approvals">
        <div className={s.cardHead}><h2 id="mine-approvals">Esperan tu aprobación</h2><span className={s.cardMeta}>{mine.length}</span></div>
        {mine.length ? mine.map(item => <ApprovalRow key={item.id} item={item} actions="decide" />) : <OSEmptyState icon="chispa" title="Nada espera tu aprobación">Cuando alguien te pida revisar una entrega, aparece acá.</OSEmptyState>}
      </section>
      <section className={s.surface} aria-labelledby="agency-approvals">
        <div className={s.cardHead}><h2 id="agency-approvals">Resto de la agencia</h2><span className={s.cardMeta}>{others.length}</span></div>
        {others.length ? others.map(item => <ApprovalRow key={item.id} item={item} actions="decide" />) : <OSEmptyState icon="chispa" title="Sin otras aprobaciones pendientes" />}
      </section>
      <p className={s.demoNote}>Las decisiones se guardan en este navegador. Los contenidos se revisan desde su pieza vinculada; autenticación y sincronización multiusuario siguen pendientes.</p>
    </div>
  );
}

/** Inicio general · tareas y responsabilidades de la persona en todos los clientes.
 * Administrador: todo el equipo (puede acotar a las suyas). Otros perfiles: solo sus tareas
 * (asignadas o que esperan su aprobación) según el actor del perfil de vista previa.
 * Lee el mismo store que el módulo y la ficha del cliente: la misma tarea con el mismo id. */
export function MyTasksScreen() {
  return <Suspense fallback={<div className={s.page}><OSSkeletonRows rows={5} label="Cargando tareas…" /></div>}><MyTasksBody /></Suspense>;
}
const MY_DEFAULTS = {};
function MyTasksBody() {
  const { tasks, role, localHydrated } = useOsStore();
  const actor = previewActor(role);
  const admin = role === "admin";
  const { filters, set, clear, active } = useTaskFilters("", MY_DEFAULTS);
  const team = admin && filters.scope !== "mias";
  const now = useMemo(() => new Date().toISOString(), []);
  const mine = useMemo(() => tasks.filter((task) => task.owner === actor || waitsForMe(task, actor)), [actor, tasks]);
  const base = team ? tasks : mine;
  const current = base.filter((task) => !isArchivedTask(task));
  const archivedTasks = base.filter(isArchivedTask);
  const visible = filterTasks(filters.archived ? archivedTasks : current, filters, now);
  const open = current.filter((task) => task.status !== "Hecho");
  const late = open.filter((task) => liveDueKind(task, now) === "late").length;
  const unassigned = open.filter((task) => isUnassigned(task.owner)).length;
  const clientSlugs = new Set(base.map((task) => clientOfTask(task)?.slug).filter(Boolean));
  const clients = osClients.filter((client) => clientSlugs.has(client.slug)).map((client) => ({ slug: client.slug, name: client.name }));
  const modules = serviceCatalog.map((service) => service.id).filter((id) => base.some((task) => serviceForTask(task) === id));
  const createClient = filters.client !== "todos" ? filters.client : undefined;
  return (
    <div className={s.page}>
      <PageHead
        rotulo="Inicio · Tareas"
        title={team ? "Tareas del equipo" : "Mis tareas"}
        description={team
          ? "Responsabilidades de todo el equipo en todos los clientes, agrupadas por responsable. Es el mismo registro de tareas que se ve dentro de cada módulo y en «Tareas» de cada cliente."
          : `Tareas asignadas a ${actor} y aprobaciones que esperan su decisión, en todos los clientes.`}
        actions={<NewTaskButton clientSlug={createClient} />}
      />
      <section className={s.surface} aria-labelledby="my-tasks-title">
        <div className={s.cardHead}>
          <h2 id="my-tasks-title">{filters.archived ? "Tareas archivadas" : team ? "Por responsable" : "Tus tareas"}</h2>
          <span className={s.cardMeta}>{open.length} abiertas · {late} vencidas{team && unassigned ? ` · ${unassigned} pendientes de asignación` : ""}</span>
        </div>
        <div className={sc.taskTools}>
          {admin ? (
            <div className={s.segmented} role="group" aria-label="Alcance de las tareas">
              <button type="button" aria-pressed={team} onClick={() => set({ scope: "" })}>Todo el equipo</button>
              <button type="button" aria-pressed={!team} onClick={() => set({ scope: "mias" })}>Solo mías</button>
            </div>
          ) : null}
          <button type="button" className={s.tag} aria-pressed={filters.archived} onClick={() => set({ archived: !filters.archived })}>{filters.archived ? "Ver tareas activas" : `Archivadas (${archivedTasks.length})`}</button>
        </div>
        <TaskFilterBar filters={filters} set={set} clear={clear} active={active} label="Filtrar tareas" clients={clients} modules={modules} owners={team ? ownersOf(base) : undefined} />
        {!localHydrated ? <OSSkeletonRows rows={4} label="Cargando tareas guardadas en este navegador…" /> : (
          <TasksByOwner
            tasks={visible}
            label={team ? "Tareas del equipo por responsable" : `Tareas de ${actor}`}
            empty={<OSEmptyState icon="chispa" title={base.length ? "No hay tareas que coincidan" : "No tenés tareas asignadas"} actions={active ? <button type="button" className={s.tag} onClick={() => clear()}>Limpiar filtros</button> : undefined}>{filters.archived ? "Las tareas hechas hace más de 30 días se archivan y quedan acá." : "Las tareas nacen de las acciones de cada módulo (enviar a revisión, pedir diseño, pedir cambios…) o se crean a mano."}</OSEmptyState>}
          />
        )}
        <p className={s.demoNote} style={{ margin: 0, padding: "10px 16px" }}>Permisos de vista previa: el Administrador ve todo; cada perfil ve sus tareas y edita solo en los módulos que tiene permitidos. {REMINDERS_NOTE} Guardado en este navegador, sin sincronización entre usuarios.</p>
      </section>
    </div>
  );
}
