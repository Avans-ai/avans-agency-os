"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { osProjects, type ClientStatus } from "../os-data";
import { useOsStore } from "../os-store";
import { DUE_GROUPS, getClient, myApprovals, myOpenWork, pendingApprovals, projectProgress, STATUS_ORDER, tasksOf, waitsForMe } from "../selectors";
import { ApprovalRow, MyTaskRow, NewTaskButton } from "../task-blocks";
import { cx, OSEmptyState, OSStatus, PageHead, Progress } from "../ui";
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
  const { tasks } = useOsStore();
  const all = pendingApprovals(tasks);
  const mine = myApprovals(tasks);
  const others = all.filter(item => !waitsForMe(item));
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
      <p className={s.demoNote}>Aprobar o pedir cambios actualiza la tarea solo en esta sesión (simulado). La persistencia y los permisos por rol quedan pendientes.</p>
    </div>
  );
}

export function MyTasksScreen() {
  const { tasks } = useOsStore();
  const [showDone, setShowDone] = useState(false);
  const open = myOpenWork(tasks);
  const done = tasks.filter(item => item.owner === "Nicolás Okro" && item.status === "Hecho");
  return (
    <div className={s.page}>
      <PageHead rotulo="Operaciones" title="Mis tareas" description="Tus tareas abiertas en todos los proyectos, ordenadas por vencimiento." actions={<NewTaskButton />} />
      <section className={s.surface} aria-label="Tareas abiertas">
        <div className={s.cardHead}><h2>Pendientes</h2><span className={s.cardMeta}>{open.length}</span></div>
        {open.length ? DUE_GROUPS.map(group => {
          const items = open.filter(item => item.dueKind === group.kind);
          if (!items.length) return null;
          return (
            <div key={group.kind} role="group" aria-label={group.label}>
              <p className={cx(s.rotulo, group.kind !== "late" && s.rotuloInk, sc.groupLabel)}>{group.label}</p>
              {items.map(item => <MyTaskRow key={item.id} item={item} />)}
            </div>
          );
        }) : <OSEmptyState icon="chispa" title="No tenés tareas pendientes" />}
      </section>
      <div>
        <button type="button" className={s.tag} aria-pressed={showDone} onClick={() => setShowDone(value => !value)}>{showDone ? "Ocultar" : "Mostrar"} tareas hechas ({done.length})</button>
      </div>
      {showDone ? (
        <section className={s.surface} aria-label="Tareas hechas">
          {done.length ? done.map(item => <MyTaskRow key={item.id} item={item} />) : <OSEmptyState icon="registro" title="Todavía no marcaste tareas como hechas" />}
        </section>
      ) : null}
    </div>
  );
}
