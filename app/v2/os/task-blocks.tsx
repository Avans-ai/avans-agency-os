"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { AvansIcon } from "./brand";
import { projectServiceLabel, serviceForProject } from "./director-data";
import { Glyph } from "./glyphs";
import { CURRENT_USER, people, PRIORITIES, osProjects, type DueKind, type OsTask, type Priority, type ServiceId } from "./os-data";
import { useOsStore } from "./os-store";
import { OSModal } from "./overlays";
import { dueLabel, getClient, getProject, waitsForMe } from "./selectors";
import { Badge, buttonClass, cx, OSDue, OSPriority } from "./ui";
import s from "./os.module.css";
import sc from "./screens.module.css";

export function taskHref(item: Pick<OsTask, "id" | "projectSlug">) {
  return `/v2/proyectos/${item.projectSlug}?task=${item.id}`;
}

export function taskContext(item: OsTask) {
  const project = getProject(item.projectSlug);
  const client = project ? getClient(project.clientSlug) : undefined;
  return { project, client, label: [client?.name, project?.name].filter(Boolean).join(" · ") };
}

/** Row of "Mis tareas". Checking it marks the task done (or approves it when it waits for me). */
export function MyTaskRow({ item }: { item: OsTask }) {
  const { toggleDone, approve } = useOsStore();
  const approval = waitsForMe(item);
  const title = approval ? item.approvalTitle ?? `Aprobar ${item.title}` : item.title;
  const { label } = taskContext(item);
  return (
    <div className={sc.taskRow}>
      <input
        type="checkbox"
        className={sc.check}
        checked={item.status === "Hecho"}
        onChange={() => (approval ? approve(item.id) : toggleDone(item.id))}
        aria-label={approval ? `Aprobar: ${title}` : `Marcar como hecha: ${title}`}
      />
      <span className={sc.taskTitle}><strong>{title}</strong><span>{label}</span></span>
      <span className={sc.taskSide}>
        <OSPriority prio={item.prio} />
        <span className={sc.dueCell}><OSDue label={dueLabel(item)} kind={item.dueKind} status={item.status} /></span>
      </span>
      <Link href={taskHref(item)} className={cx(s.link, sc.openLink)} aria-label={`Abrir ${title}`}>Abrir</Link>
    </div>
  );
}

export function approvalLabel(item: OsTask) {
  const raw = (item.approvalTitle ?? item.title).replace(/^Aprobar /, "");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function ApprovalRow({ item, actions = "review" }: { item: OsTask; actions?: "review" | "decide" }) {
  const { approve, requestChanges } = useOsStore();
  const { client } = taskContext(item);
  const mine = waitsForMe(item);
  const urgency = item.dueKind === "late" ? <Badge tone="error"><span aria-hidden="true">■</span>Vencida {item.due === "29 oct" ? "ayer" : item.due}</Badge>
    : item.dueKind === "today" ? <Badge tone="peach"><span aria-hidden="true">▲</span>Vence hoy</Badge>
    : <Badge tone="stone">Vence {item.due}</Badge>;
  const meta = [client?.name, item.sentBy ? `Enviado por ${item.sentBy}${item.sentWhen ? ` ${item.sentWhen}` : ""}` : null, item.approvalNote].filter(Boolean).join(" · ");
  return (
    <div className={sc.approvalRow}>
      <div className={sc.approvalMain}>
        <strong>{approvalLabel(item)}</strong>
        <span>{meta}{mine ? null : ` · Aprueba ${item.approver ?? "por asignar"}`}</span>
      </div>
      <div className={sc.approvalActions}>
        {urgency}
        {actions === "decide" && mine ? (
          <>
            <button type="button" className={buttonClass("secondary", true)} onClick={() => requestChanges(item.id)}>Pedir cambios</button>
            <button type="button" className={buttonClass("primary", true)} onClick={() => approve(item.id)}>Aprobar</button>
          </>
        ) : null}
        <Link href={taskHref(item)} className={buttonClass(actions === "decide" ? "secondary" : "dark", true)}>{actions === "decide" ? "Abrir" : "Revisar"}</Link>
      </div>
    </div>
  );
}

const DUE_OPTIONS: { label: string; due: string; kind: DueKind }[] = [
  { label: "Hoy, vie 30 oct", due: "30 oct", kind: "today" },
  { label: "Lun 2 nov", due: "2 nov", kind: "week" },
  { label: "Mié 4 nov", due: "4 nov", kind: "week" },
  { label: "Vie 6 nov", due: "6 nov", kind: "week" },
  { label: "Mar 10 nov", due: "10 nov", kind: "later" },
];

/** OSModal «Nueva tarea» with validation. projectSlug fixes the project; client/service scope the available projects. */
export function NewTaskModal({
  projectSlug,
  clientSlug,
  serviceId,
  onClose,
  onCreated,
}: {
  projectSlug?: string;
  clientSlug?: string;
  serviceId?: ServiceId;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { createTask } = useOsStore();
  const titleRef = useRef<HTMLInputElement>(null);
  const availableProjects = useMemo(() => {
    let items = clientSlug ? osProjects.filter((item) => item.clientSlug === clientSlug) : osProjects;
    if (serviceId) {
      const scoped = items.filter((item) => serviceForProject(item.slug) === serviceId);
      if (scoped.length) items = scoped;
    }
    return items.length ? items : osProjects;
  }, [clientSlug, serviceId]);
  const initialProject = projectSlug ?? availableProjects[0]?.slug ?? osProjects[0].slug;
  const [title, setTitle] = useState("");
  const [project, setProject] = useState(initialProject);
  const [owner, setOwner] = useState(projectSlug ? getProject(projectSlug)?.owner ?? CURRENT_USER.name : CURRENT_USER.name);
  const [prio, setPrio] = useState<Priority>("Media");
  const [due, setDue] = useState(DUE_OPTIONS[3].due);
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) { setError("Escribí un título para la tarea"); titleRef.current?.focus(); return; }
    const option = DUE_OPTIONS.find(item => item.due === due) ?? DUE_OPTIONS[3];
    const id = createTask({ projectSlug: project, title: title.trim(), owner, prio, due: option.due, dueKind: option.kind });
    onCreated?.(id);
    onClose();
  }

  return (
    <OSModal
      title="Nueva tarea"
      titleId="new-task-title"
      onClose={onClose}
      footer={<><button type="button" className={buttonClass("ghost")} onClick={onClose}>Cancelar</button><button type="submit" form="new-task-form" className={buttonClass("primary")}>Crear tarea</button></>}
    >
      <form id="new-task-form" onSubmit={submit} noValidate style={{ display: "contents" }}>
        <label className={s.field}>
          <span>Título <span className={s.req} aria-hidden="true">*</span></span>
          <input ref={titleRef} className={s.input} value={title} placeholder="Qué hay que hacer" required aria-required="true" aria-invalid={Boolean(error)} aria-describedby={error ? "new-task-error" : undefined} maxLength={140} autoFocus onChange={event => { setTitle(event.target.value); setError(""); }} />
          {error ? <span className={s.fieldError} id="new-task-error"><Glyph name="alert" size={15} />{error}</span> : null}
        </label>
        {projectSlug ? null : (
          <label className={s.field}>
            <span>Proyecto</span>
            <select className={s.input} value={project} onChange={event => setProject(event.target.value)}>
              {availableProjects.map(item => <option key={item.slug} value={item.slug}>{getClient(item.clientSlug)?.name} · {projectServiceLabel(item.slug)} · {item.name}</option>)}
            </select>
          </label>
        )}
        <div className={sc.modalGrid}>
          <label className={s.field}>
            <span>Responsable</span>
            <select className={s.input} value={owner} onChange={event => setOwner(event.target.value)}>
              {people.map(person => <option key={person.name}>{person.name}</option>)}
            </select>
          </label>
          <label className={s.field}>
            <span>Prioridad</span>
            <select className={s.input} value={prio} onChange={event => setPrio(event.target.value as Priority)}>
              {PRIORITIES.map(item => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>
        <label className={s.field}>
          <span>Vencimiento</span>
          <select className={s.input} value={due} onChange={event => setDue(event.target.value)}>
            {DUE_OPTIONS.map(option => <option key={option.due} value={option.due}>{option.label}</option>)}
          </select>
          <span className={s.hint}>En la implementación con backend: selector de fecha completo.</span>
        </label>
        <p className={s.demoNote} style={{ margin: 0 }}>La tarea se crea solo en esta sesión del navegador: todavía no hay base de datos conectada.</p>
      </form>
    </OSModal>
  );
}

export function NewTaskButton({
  projectSlug,
  clientSlug,
  serviceId,
  onCreated,
}: {
  projectSlug?: string;
  clientSlug?: string;
  serviceId?: ServiceId;
  onCreated?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={buttonClass("primary")} onClick={() => setOpen(true)}><AvansIcon name="chispa" size={18} />Nueva tarea</button>
      {open ? <NewTaskModal projectSlug={projectSlug} clientSlug={clientSlug} serviceId={serviceId} onClose={() => setOpen(false)} onCreated={onCreated} /> : null}
    </>
  );
}
