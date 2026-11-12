"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { AvansIcon } from "../brand";
import { Glyph } from "../glyphs";
import { CURRENT_USER, TASK_STATUSES, serviceLabel, shortName, type OsProject, type OsTask } from "../os-data";
import { serviceForTask } from "../director-data";
import { useOsStore } from "../os-store";
import { dueLabel, getClient, isSoon, projectProgress, tasksOf } from "../selectors";
import { NewTaskModal, TaskSidePanel } from "../task-blocks";
import { Avatar, buttonClass, cx, OSDue, OSEmptyState, OSPriority, OSStatus, Progress } from "../ui";
import s from "../os.module.css";
import sc from "../screens.module.css";

type Filter = "todas" | "mias" | "bloqueadas" | "pronto";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "mias", label: "Mis tareas" },
  { id: "bloqueadas", label: "Bloqueadas" },
  { id: "pronto", label: "Vencen en 7 días" },
];

export function ProjectScreen({ project }: { project: OsProject }) {
  const { tasks } = useOsStore();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [filter, setFilter] = useState<Filter>("todas");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);
  const view = params.get("view") === "lista" ? "lista" : "kanban";
  const selectedId = params.get("task");
  const client = getClient(project.clientSlug);
  const own = tasksOf(tasks, project.slug);
  const selected = own.find(item => item.id === selectedId);

  const setParam = useCallback((key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    const query = next.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }, [params, pathname, router]);

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("es");
    return own.filter(item => {
      if (filter === "mias" && item.owner !== CURRENT_USER.name && item.approver !== CURRENT_USER.name) return false;
      if (filter === "bloqueadas" && !item.blocked) return false;
      if (filter === "pronto" && !isSoon(item)) return false;
      return !q || `${item.id} ${item.title} ${item.owner}`.toLocaleLowerCase("es").includes(q);
    });
  }, [own, filter, query]);

  const done = own.filter(item => item.status === "Hecho").length;
  const blocked = own.filter(item => item.blocked && item.status !== "Hecho").length;
  const soon = own.filter(item => item.status !== "Hecho" && (item.dueKind === "today" || item.dueKind === "week")).length;
  const progress = projectProgress(project.slug, tasks);
  const openTask = (id: string) => setParam("task", id);

  return (
    <>
      <div className={sc.projectHead}>
        <div className={sc.projectHeadTop}>
          <div>
            <p className={sc.projectFrom}>Proyecto de <Link className={s.link} style={{ fontSize: 15, fontWeight: 500 }} href={`/v2/clientes/${project.clientSlug}`}>{client?.name}</Link></p>
            <h1>{project.name} <OSStatus status={project.status} /></h1>
          </div>
          <button type="button" className={buttonClass("primary")} onClick={() => setModal(true)}><AvansIcon name="chispa" size={18} />Nueva tarea</button>
        </div>
        <div className={sc.summary}>
          <div><span>Responsable</span><strong style={{ fontWeight: 500 }}>{project.owner}</strong></div>
          <div><span>Fechas</span><span>{project.dates}</span></div>
          <div><span>Avance</span><Progress value={progress} accent label={`Avance de ${project.name}`} /></div>
          <div><span>Tareas</span><span>{own.length ? `${done} de ${own.length} hechas` : "Sin tareas"}</span></div>
          <div><span>Alertas</span><span className={blocked || soon ? sc.alertText : undefined}>{blocked || soon ? [blocked ? `${blocked} bloqueada${blocked === 1 ? "" : "s"}` : null, soon ? `${soon} vencen en 7 días` : null].filter(Boolean).join(" · ") : "Sin alertas"}</span></div>
        </div>
      </div>

      <div className={s.page}>
        {own.length ? (
          <>
            <div className={sc.boardTools}>
              <div className={s.segmented} role="group" aria-label="Vista">
                <button type="button" aria-pressed={view === "kanban"} onClick={() => setParam("view", null)}><Glyph name="kanban" size={16} />Kanban</button>
                <button type="button" aria-pressed={view === "lista"} onClick={() => setParam("view", "lista")}><Glyph name="list" size={16} />Lista</button>
              </div>
              <div className={s.tagRow} role="group" aria-label="Filtrar tareas">
                {FILTERS.map(item => <button key={item.id} type="button" className={s.tag} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}
              </div>
              <label className={cx(s.searchField, s.searchFieldRaised, sc.grow)}>
                <Glyph name="search" size={16} />
                <span className={s.srOnly}>Buscar en este proyecto</span>
                <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar en este proyecto" />
              </label>
            </div>

            {!visible.length ? (
              <OSEmptyState icon="busqueda" title="No hay tareas que coincidan" actions={<button type="button" className={buttonClass("secondary", true)} onClick={() => { setFilter("todas"); setQuery(""); }}>Limpiar filtros</button>}>
                Probá con otro texto o quitá el filtro activo.
              </OSEmptyState>
            ) : view === "kanban" ? (
              <div className={sc.kanban}>
                {TASK_STATUSES.map(status => {
                  const cards = visible.filter(item => item.status === status);
                  return (
                    <section key={status} className={sc.kanbanCol} aria-label={`Columna ${status}, ${cards.length} tareas`}>
                      <div className={sc.kanbanHead}><h2>{status}</h2><span>{cards.length}</span></div>
                      {cards.length ? cards.map(item => <TaskCard key={item.id} item={item} selected={item.id === selectedId} onOpen={() => openTask(item.id)} />) : <p className={sc.colEmpty}>Sin tareas</p>}
                    </section>
                  );
                })}
              </div>
            ) : (
              <section className={s.surface}>
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <caption className={s.srOnly}>Tareas de {project.name}</caption>
                    <thead><tr><th scope="col">ID</th><th scope="col">Tarea</th><th scope="col">Responsable</th><th scope="col">Prioridad</th><th scope="col">Vence</th><th scope="col">Estado</th></tr></thead>
                    <tbody>
                      {visible.map(item => (
                        <tr key={item.id}>
                          <td className={s.cellSub}>{item.id}</td>
                          <td style={{ minWidth: 220 }}><button type="button" className={sc.listBtn} onClick={() => openTask(item.id)}>{item.title}</button>{item.blocked ? <> <span className={sc.blockedTag}><Glyph name="blocked" size={12} />Bloqueada</span></> : null}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{item.owner}</td>
                          <td><OSPriority prio={item.prio} /></td>
                          <td><OSDue label={dueLabel(item)} kind={item.dueKind} status={item.status} /></td>
                          <td style={{ whiteSpace: "nowrap" }}>{item.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            <p className={sc.footNote}>Arrastrar tarjetas entre columnas queda pendiente (con alternativa de teclado). Por ahora el estado se cambia desde el panel de la tarea. Cada tarea pertenece a un módulo y también se ve en su Kanban. Guardado en este navegador.</p>
          </>
        ) : (
          <OSEmptyState
            icon="registro"
            title="Este proyecto todavía no tiene tareas"
            actions={<><button type="button" className={buttonClass("primary", true)} onClick={() => setModal(true)}>Nueva tarea</button><UseTemplateButton /></>}
          >
            Creá la primera o importá la plantilla del tipo de proyecto (lanzamiento, always-on, sitio web).
          </OSEmptyState>
        )}
      </div>

      {selected ? <TaskSidePanel key={selected.id} item={selected} onClose={() => setParam("task", null)} /> : null}
      {modal ? <NewTaskModal projectSlug={project.slug} onClose={() => setModal(false)} onCreated={() => { setFilter("todas"); setQuery(""); }} /> : null}
    </>
  );
}

function UseTemplateButton() {
  const { notify } = useOsStore();
  return <button type="button" className={buttonClass("ghost")} onClick={() => notify("Usar plantilla: pendiente de implementación")}>Usar plantilla</button>;
}

function TaskCard({ item, selected, onOpen }: { item: OsTask; selected: boolean; onOpen: () => void }) {
  const due = dueLabel(item);
  return (
    <button
      type="button"
      className={cx(sc.card, selected && sc.cardSelected, item.status === "Hecho" && sc.cardDone)}
      onClick={onOpen}
      aria-label={`${item.id} ${item.title}. ${item.owner}. Prioridad ${item.prio}. Vence ${due}${item.blocked ? ". Bloqueada" : ""}`}
    >
      <span className={sc.cardTop}><span>{item.id}</span>{item.blocked ? <span className={sc.blockedTag}><Glyph name="blocked" size={12} />Bloqueada</span> : null}</span>
      <span className={sc.cardTitle}>{item.title}</span>
      <span className={sc.cardTop}><span>{serviceLabel(serviceForTask(item))}</span></span>
      <span className={sc.cardFoot}>
        <span className={sc.owner}><Avatar name={item.owner} />{shortName(item.owner)}</span>
        <OSPriority prio={item.prio} />
        <OSDue label={due} kind={item.dueKind} status={item.status} />
      </span>
    </button>
  );
}
