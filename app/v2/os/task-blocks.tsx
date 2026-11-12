"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { AvansIcon } from "./brand";
import { isArchivedTask, scopeDeliverables, serviceForProject, serviceForTask, TASK_ARCHIVE_AFTER_DAYS } from "./director-data";
import { Glyph } from "./glyphs";
import {
  CURRENT_USER,
  people,
  PRIORITIES,
  TASK_STATUSES,
  osProjects,
  serviceLabel,
  type DueKind,
  type OsTask,
  type Priority,
  type ServiceId,
  type TaskStatus,
  type TaskWorkItem,
} from "./os-data";
import { useOsStore } from "./os-store";
import { OSModal, OSSidePanel } from "./overlays";
import { dueFull, dueLabel, getClient, getProject, waitsForMe } from "./selectors";
import { serviceHref } from "./service-workspace-data";
import { Avatar, Badge, buttonClass, cx, OSDue, OSPriority } from "./ui";
import s from "./os.module.css";
import sc from "./screens.module.css";

export function taskHref(item: Pick<OsTask, "id" | "projectSlug">) {
  return `/v2/proyectos/${item.projectSlug}?task=${item.id}`;
}

/** Enlace al Kanban del módulo dueño de la tarea, con el panel abierto. */
export function moduleTaskHref(item: Pick<OsTask, "id" | "projectSlug" | "serviceId">) {
  const project = getProject(item.projectSlug);
  if (!project) return taskHref(item);
  return `${serviceHref(project.clientSlug, serviceForTask(item))}?seccion=tareas&task=${item.id}`;
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

export function ApprovalRow({ item, actions = "review", href }: { item: OsTask; actions?: "review" | "decide"; href?: string }) {
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
        <Link href={href ?? taskHref(item)} className={buttonClass(actions === "decide" ? "secondary" : "dark", true)}>{actions === "decide" ? "Abrir" : "Revisar"}</Link>
      </div>
    </div>
  );
}

export const DUE_OPTIONS: { label: string; due: string; kind: DueKind }[] = [
  { label: "Hoy, vie 30 oct", due: "30 oct", kind: "today" },
  { label: "Lun 2 nov", due: "2 nov", kind: "week" },
  { label: "Mié 4 nov", due: "4 nov", kind: "week" },
  { label: "Vie 6 nov", due: "6 nov", kind: "week" },
  { label: "Mar 10 nov", due: "10 nov", kind: "later" },
  { label: "Vie 13 nov", due: "13 nov", kind: "later" },
  { label: "Lun 16 nov", due: "16 nov", kind: "later" },
  { label: "Lun 30 nov", due: "30 nov", kind: "later" },
];

/** OSModal «Nueva tarea» with validation.
 * - projectSlug fixes the project (página de proyecto).
 * - clientSlug scopes projects and modules to the client.
 * - serviceId locks the module (tareas creadas dentro de un módulo).
 * - workItems lets the task be linked to an object of that module (campaña, pieza, producción…). */
export function NewTaskModal({
  projectSlug,
  clientSlug,
  serviceId,
  workItems = [],
  workItemLabel = "Objeto del módulo",
  defaultWorkItemId,
  onClose,
  onCreated,
}: {
  projectSlug?: string;
  clientSlug?: string;
  serviceId?: ServiceId;
  workItems?: TaskWorkItem[];
  workItemLabel?: string;
  defaultWorkItemId?: string;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { createTask, servicesOf } = useOsStore();
  const titleRef = useRef<HTMLInputElement>(null);
  const fixedClient = clientSlug ?? (projectSlug ? getProject(projectSlug)?.clientSlug : undefined);
  const availableProjects = useMemo(() => {
    const items = fixedClient ? osProjects.filter((item) => item.clientSlug === fixedClient) : osProjects;
    return items.length ? items : osProjects;
  }, [fixedClient]);
  const initialProject = projectSlug
    ?? (serviceId ? availableProjects.find((item) => serviceForProject(item.slug) === serviceId)?.slug : undefined)
    ?? availableProjects[0]?.slug
    ?? osProjects[0].slug;
  const [title, setTitle] = useState("");
  const [project, setProject] = useState(initialProject);
  const projectClient = getProject(project)?.clientSlug ?? fixedClient ?? "";
  const moduleOptions = servicesOf(projectClient);
  const projectService = serviceForProject(project);
  const [chosenService, setChosenService] = useState<ServiceId | "">("");
  const targetService: ServiceId | undefined = serviceId
    ?? (chosenService && moduleOptions.includes(chosenService) ? chosenService : undefined)
    ?? (moduleOptions.includes(projectService) ? projectService : moduleOptions[0]);
  const [workItemId, setWorkItemId] = useState(defaultWorkItemId ?? "");
  const [deliverable, setDeliverable] = useState("");
  const [owner, setOwner] = useState(projectSlug ? getProject(projectSlug)?.owner ?? CURRENT_USER.name : CURRENT_USER.name);
  const [prio, setPrio] = useState<Priority>("Media");
  const [due, setDue] = useState(DUE_OPTIONS[3].due);
  const [desc, setDesc] = useState("");
  const [error, setError] = useState("");
  const deliverables = targetService ? scopeDeliverables(targetService) : [];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) { setError("Escribí un título para la tarea"); titleRef.current?.focus(); return; }
    if (!targetService) { setError("Este cliente no tiene módulos activos para asignar la tarea"); return; }
    const option = DUE_OPTIONS.find(item => item.due === due) ?? DUE_OPTIONS[3];
    const workItem = serviceId ? workItems.find((item) => item.id === workItemId) : undefined;
    const id = createTask({
      projectSlug: project,
      title: title.trim(),
      owner,
      prio,
      due: option.due,
      dueKind: option.kind,
      serviceId: targetService,
      workItem,
      deliverable: deliverables.includes(deliverable) ? deliverable : undefined,
      desc,
    });
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
        <div className={sc.modalGrid}>
          {serviceId ? (
            <div className={s.field}>
              <span>Módulo</span>
              <strong style={{ color: "var(--av-text)", fontWeight: 500, padding: "12px 0" }}>{serviceLabel(serviceId)}</strong>
            </div>
          ) : (
            <label className={s.field}>
              <span>Módulo</span>
              <select className={s.input} value={targetService ?? ""} onChange={event => { setChosenService(event.target.value as ServiceId); setDeliverable(""); }} disabled={!moduleOptions.length}>
                {moduleOptions.map(item => <option key={item} value={item}>{serviceLabel(item)}</option>)}
              </select>
            </label>
          )}
          {projectSlug ? (
            <div className={s.field}>
              <span>Proyecto</span>
              <strong style={{ color: "var(--av-text)", fontWeight: 500, padding: "12px 0" }}>{getProject(projectSlug)?.name}</strong>
            </div>
          ) : (
            <label className={s.field}>
              <span>Proyecto</span>
              <select className={s.input} value={project} onChange={event => { setProject(event.target.value); setChosenService(""); }}>
                {availableProjects.map(item => <option key={item.slug} value={item.slug}>{fixedClient ? item.name : `${getClient(item.clientSlug)?.name} · ${item.name}`}</option>)}
              </select>
            </label>
          )}
        </div>
        {serviceId && workItems.length ? (
          <label className={s.field}>
            <span>{workItemLabel} (opcional)</span>
            <select className={s.input} value={workItemId} onChange={event => setWorkItemId(event.target.value)}>
              <option value="">Sin vincular</option>
              {workItems.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
        ) : null}
        {deliverables.length ? (
          <label className={s.field}>
            <span>Entregable del alcance (opcional)</span>
            <select className={s.input} value={deliverable} onChange={event => setDeliverable(event.target.value)}>
              <option value="">Sin entregable asociado</option>
              {deliverables.map(item => <option key={item}>{item}</option>)}
            </select>
          </label>
        ) : null}
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
          <span className={s.hint}>Fechas relativas a la demo (viernes 30 oct). El selector completo llega con el backend.</span>
        </label>
        <label className={s.field}>
          <span>Descripción (opcional)</span>
          <textarea className={s.input} rows={3} value={desc} maxLength={1000} onChange={event => setDesc(event.target.value)} placeholder="Contexto, criterio de terminado o dependencia" />
        </label>
        <p className={s.demoNote} style={{ margin: 0 }}>La tarea se guarda en este navegador (sin sincronización entre usuarios) y pertenece a un solo módulo.</p>
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

/** Panel lateral de una tarea. Lo usan la página de proyecto y el Kanban de cada módulo:
 * es la misma tarea del store único, abierta desde dos lugares. */
export function TaskSidePanel({
  item,
  onClose,
  readOnly = false,
  workItems = [],
  workItemLabel = "Objeto del módulo",
}: {
  item: OsTask;
  onClose: () => void;
  readOnly?: boolean;
  workItems?: TaskWorkItem[];
  workItemLabel?: string;
}) {
  const { setStatus, setPriority, addComment, unblock, approve, requestChanges, editTask, addFileRef } = useOsStore();
  const [draft, setDraft] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileOpen, setFileOpen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const mine = waitsForMe(item) && !readOnly;
  const project = getProject(item.projectSlug);
  const client = project ? getClient(project.clientSlug) : undefined;
  const service = serviceForTask(item);
  const deliverables = scopeDeliverables(service);
  const archived = isArchivedTask(item);
  const decision = mine ? (
    <>
      <button type="button" className={buttonClass("secondary")} onClick={() => { requestChanges(item.id, draft.trim() || undefined); setDraft(""); }}>Pedir cambios</button>
      <button type="button" className={buttonClass("primary")} onClick={() => approve(item.id)}>Aprobar</button>
    </>
  ) : null;

  function changeDue(value: string) {
    const option = DUE_OPTIONS.find((entry) => entry.due === value);
    if (option) editTask(item.id, { due: option.due, dueKind: option.kind }, `cambió el vencimiento a ${option.label}`);
  }

  function changeWorkItem(value: string) {
    const next = workItems.find((entry) => entry.id === value);
    editTask(item.id, { workItem: next }, next ? `vinculó la tarea a «${next.label}»` : "quitó el vínculo con el objeto del módulo");
  }

  return (
    <OSSidePanel
      label={`${item.id} ${item.title}`}
      onClose={onClose}
      titleRef={titleRef}
      heading={<span>{item.id} · {serviceLabel(service)} · {project?.name}<span className={s.srOnly}> · {client?.name}</span></span>}
      footer={decision}
    >
      <h2 className={sc.panelTitle} ref={titleRef} tabIndex={-1}>{item.title}</h2>

      {archived ? <p className={s.demoNote} style={{ marginTop: -8 }}><Glyph name="archive" size={14} /> Archivada: completada hace más de {TASK_ARCHIVE_AFTER_DAYS} días.</p> : null}
      {readOnly ? <p className={s.demoNote} style={{ marginTop: -8 }}>Solo lectura: tu rol de vista previa no puede modificar este módulo.</p> : null}

      {mine ? (
        <div className={sc.approveBox}>
          <div className={cx(s.alert, s.alertPeach)} role="status"><span aria-hidden="true">▲</span><span>Espera tu aprobación · {item.dueKind === "late" ? `vencida ${item.due}` : item.dueKind === "today" ? "vence hoy" : `vence ${item.due}`}</span></div>
          <div className={sc.approveInline}>{decision}</div>
        </div>
      ) : null}

      {item.blocked ? (
        <div className={sc.blockedBox} role="status">
          <span><Glyph name="blocked" size={16} /> Bloqueada: {item.blocked}</span>
          {!readOnly ? <button type="button" className={buttonClass("ghost")} onClick={() => unblock(item.id)}>Quitar bloqueo</button> : null}
        </div>
      ) : null}

      <div className={sc.panelGrid}>
        <label>
          <span className={s.cellSub}>Estado</span>
          <select className={cx(s.input, s.inputSm)} value={item.status} disabled={readOnly} onChange={event => setStatus(item.id, event.target.value as TaskStatus)}>
            {TASK_STATUSES.map(status => <option key={status}>{status}</option>)}
          </select>
        </label>
        <label>
          <span className={s.cellSub}>Prioridad</span>
          <select className={cx(s.input, s.inputSm)} value={item.prio} disabled={readOnly} onChange={event => setPriority(item.id, event.target.value as Priority)}>
            {PRIORITIES.map(prio => <option key={prio}>{prio}</option>)}
          </select>
        </label>
        <label>
          <span className={s.cellSub}>Responsable</span>
          <select className={cx(s.input, s.inputSm)} value={item.owner} disabled={readOnly} onChange={event => editTask(item.id, { owner: event.target.value }, `asignó la tarea a ${event.target.value}`)}>
            {people.map(person => <option key={person.name}>{person.name}</option>)}
            {people.some(person => person.name === item.owner) ? null : <option>{item.owner}</option>}
          </select>
        </label>
        <label>
          <span className={s.cellSub}>Vencimiento</span>
          {readOnly || item.status === "Hecho" ? <OSDue label={dueFull(item)} kind={item.dueKind} status={item.status} /> : (
            <select className={cx(s.input, s.inputSm)} value={DUE_OPTIONS.some(option => option.due === item.due) ? item.due : ""} onChange={event => changeDue(event.target.value)}>
              {DUE_OPTIONS.some(option => option.due === item.due) ? null : <option value="">{dueFull(item)}</option>}
              {DUE_OPTIONS.map(option => <option key={option.due} value={option.due}>{option.label}</option>)}
            </select>
          )}
        </label>
        <label>
          <span className={s.cellSub}>Aprueba</span>
          <select className={cx(s.input, s.inputSm)} value={item.approver ?? ""} disabled={readOnly} onChange={event => editTask(item.id, { approver: event.target.value || undefined }, event.target.value ? `definió a ${event.target.value} como aprobador` : "quitó el aprobador")}>
            <option value="">Sin aprobación</option>
            {people.map(person => <option key={person.name} value={person.name}>{person.name}{person.name === CURRENT_USER.name ? " (vos)" : ""}</option>)}
          </select>
        </label>
        <div><span>Módulo</span><span>{project ? <Link className={s.link} href={`${serviceHref(project.clientSlug, service)}?seccion=tareas`}>{serviceLabel(service)}</Link> : serviceLabel(service)}</span></div>
        <div><span>Proyecto</span><span>{project ? <Link className={s.link} href={taskHref(item)}>{project.name}</Link> : "Sin proyecto"}</span></div>
        <label>
          <span className={s.cellSub}>Entregable</span>
          <select className={cx(s.input, s.inputSm)} value={item.deliverable ?? ""} disabled={readOnly} onChange={event => editTask(item.id, { deliverable: event.target.value || undefined }, event.target.value ? `asoció el entregable «${event.target.value}»` : "quitó el entregable")}>
            <option value="">Sin entregable</option>
            {deliverables.map(entry => <option key={entry}>{entry}</option>)}
            {item.deliverable && !deliverables.includes(item.deliverable) ? <option>{item.deliverable}</option> : null}
          </select>
        </label>
        {workItems.length || item.workItem ? (
          <label style={{ gridColumn: "1 / -1" }}>
            <span className={s.cellSub}>{workItemLabel}</span>
            {workItems.length && !readOnly ? (
              <select className={cx(s.input, s.inputSm)} value={item.workItem?.id ?? ""} onChange={event => changeWorkItem(event.target.value)}>
                <option value="">Sin vincular</option>
                {workItems.map(entry => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
                {item.workItem && !workItems.some(entry => entry.id === item.workItem?.id) ? <option value={item.workItem.id}>{item.workItem.label}</option> : null}
              </select>
            ) : <span>{item.workItem?.label ?? "Sin vincular"}</span>}
          </label>
        ) : null}
      </div>

      <section className={sc.panelSection} aria-label="Descripción">
        <p className={cx(s.rotulo, s.rotuloInk)}>Descripción</p>
        <p>{item.desc}</p>
      </section>

      <section className={sc.panelSection} aria-label="Archivos">
        <div className={sc.sectionHead}><p className={cx(s.rotulo, s.rotuloInk)}>Archivos · {item.files.length}</p>{!readOnly ? <button type="button" className={buttonClass("ghost")} aria-expanded={fileOpen} onClick={() => setFileOpen(value => !value)}>Registrar referencia</button> : null}</div>
        {fileOpen && !readOnly ? (
          <form style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }} onSubmit={event => { event.preventDefault(); const name = fileName.trim(); if (!name) return; addFileRef(item.id, name, "Referencia manual · sin archivo subido"); setFileName(""); setFileOpen(false); }}>
            <label className={s.field} style={{ flex: "1 1 220px" }}><span>Nombre o enlace del archivo</span><input className={cx(s.input, s.inputSm)} value={fileName} onChange={event => setFileName(event.target.value)} placeholder="Ej.: Key visual v3 (Drive)" /></label>
            <button type="submit" className={buttonClass("dark", true)} disabled={!fileName.trim()}>Registrar</button>
          </form>
        ) : null}
        {item.files.length ? (
          <ul className={sc.fileList}>{item.files.map((file, index) => <li key={`${file.name}-${index}`}><span>{file.ext}</span><span>{file.name}</span><span>{file.meta}</span></li>)}</ul>
        ) : <p className={s.cellSub}>Sin archivos adjuntos.</p>}
        <p className={s.demoNote} style={{ margin: 0 }}>La carga de binarios a Drive/Storage no está conectada: se registra solo el nombre o enlace.</p>
      </section>

      <section className={sc.panelSection} aria-label="Comentarios">
        <p className={cx(s.rotulo, s.rotuloInk)}>Comentarios · {item.comments.length}</p>
        {item.comments.map((comment, index) => (
          <div className={sc.comment} key={`${comment.who}-${index}`}>
            <Avatar name={comment.who} size="md" />
            <div><strong style={{ fontWeight: 600 }}>{comment.who}</strong> <small>{comment.when}</small><p>{comment.text}</p></div>
          </div>
        ))}
        {!readOnly ? (
          <form onSubmit={event => { event.preventDefault(); const text = draft.trim(); if (!text) return; addComment(item.id, text); setDraft(""); }} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className={s.field}>
              <span>Nuevo comentario</span>
              <textarea className={s.input} rows={3} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Escribí un comentario" maxLength={1000} />
            </label>
            <div className={sc.commentActions}><button type="submit" className={buttonClass("dark", true)} disabled={!draft.trim()}>Comentar</button></div>
          </form>
        ) : null}
      </section>

      <section className={sc.panelSection} aria-label="Actividad">
        <p className={cx(s.rotulo, s.rotuloInk)}>Actividad · {item.activity.length}</p>
        {item.activity.length ? <ul className={sc.activity}>{item.activity.map((entry, index) => <li key={`${entry.text}-${index}`}>{entry.text} <span>· {entry.when}</span></li>)}</ul> : <p className={s.cellSub}>Sin actividad registrada.</p>}
      </section>
    </OSSidePanel>
  );
}
