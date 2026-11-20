"use client";

import Link from "next/link";
import { useState } from "react";
import { type OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { getProfileFile } from "../knowledge/profile-files";
import { OSModal, OSSidePanel } from "../overlays";
import { buttonClass } from "../ui";
import s from "../os.module.css";
import { RecordForm } from "./collection-view";
import { pieces } from "./content-collections";
import { contentComments, contentState, contentTransitions, getContentActions, safeContentUrl, type ContentRole } from "./content-workflow";
import { formatDateTime, StatusBadge } from "./module-ui";
import { useModuleRecords, type ModuleData } from "./store";
import type { ModuleRecord } from "./types";
import { useContentOperations } from "./use-content-operations";
import c from "./content.module.css";

export function workflowRole(role: string): ContentRole {
  if (["admin", "pm", "designer", "client"].includes(role)) return role as ContentRole;
  return "content";
}
const draftFields = { ...pieces, fields: pieces.fields.filter((field) => !["estado", "archivoDiseno", "version", "icp", "mensaje", "conceptoVisual", "cta"].includes(field.key)) };
export const contentTitleKey = (collection: string) => collection === "piezas" ? "titulo" : collection === "ideas" ? "idea" : "nombre";

export function ContentEditor({ client, initial, refs, title = "Nuevo contenido", onClose, onSave }: { client: OsClient; initial: Record<string, string>; refs: ModuleData; title?: string; onClose: () => void; onSave: (values: Record<string, string>) => void }) {
  const defaults = { responsable: client.team.find((member) => member.role.includes("Contenidos"))?.name || "", revisor: client.owner, disenador: client.team.find((member) => member.role.includes("Diseño"))?.name || "", clienteResponsable: client.contacts[0]?.name || "", ...initial };
  return <OSModal title={title} titleId="content-editor-title" onClose={onClose} footer={<><button className={buttonClass("ghost")} onClick={onClose}>Cancelar</button><button type="submit" form="content-editor-form" className={buttonClass("primary")}>Guardar borrador</button></>}>
    <RecordForm def={draftFields} initial={defaults} refs={refs} titleKeyOf={contentTitleKey} formId="content-editor-form" onSubmit={onSave} />
  </OSModal>;
}

export function ContentDetail({ client, record, editable, onClose }: { client: OsClient; record: ModuleRecord; editable: boolean; onClose: () => void }) {
  const { role, notify } = useOsStore();
  const { data } = useModuleRecords(client.slug, "contenidos", ["piezas", "ejes", "planes"]);
  const { data: designData } = useModuleRecords(client.slug, "diseno-marca", ["trabajos"]);
  const designRequest = (designData.trabajos || []).find((request) => request.values.contenidoId === record.id);
  const operations = useContentOperations(client);
  const [editing, setEditing] = useState<ModuleRecord | null>(null);
  const [comment, setComment] = useState("");
  const [attachment, setAttachment] = useState("");
  const [visibility, setVisibility] = useState<"internal" | "client">("internal");
  const [designUrl, setDesignUrl] = useState(record.values.archivoDiseno || "");
  const [version, setVersion] = useState(record.values.version || "v1");
  const [date, setDate] = useState(record.values.fecha || "");
  const [time, setTime] = useState(record.values.hora || "");
  const [schedulingUrl, setSchedulingUrl] = useState(record.values.enlaceMetricool || "");
  const state = contentState(record);
  const actions = editable ? getContentActions(record, workflowRole(role)) : [];
  const canEdit = editable && role !== "designer" && role !== "client" && ["Borrador", "Ajustes"].includes(state);
  const designAction = actions.some((action) => action.id === "deliver-design") || (state === "Ajustes" && ["Revisión interna del diseño", "Aprobación final del cliente"].includes(record.values.returnState));
  const comments = contentComments(record);
  const events = contentTransitions(record);
  const axis = (data.ejes || []).find((item) => item.id === record.values.eje);
  const plan = (data.planes || []).find((item) => item.id === record.values.plan);
  const fields = [["Eje temático", axis?.values.nombre || record.values.eje], ["Idea", record.values.idea || record.values.brief], ["Bajada", record.values.bajada], ["Objetivo", record.values.objetivo], ["Qué necesitamos del cliente", record.values.necesitaCliente], ["Copy preliminar", record.values.copy], ["Recursos y brief", record.values.brief]];

  return <>
    <OSSidePanel label={`Contenido: ${record.values.titulo}`} heading={<><h2>{record.values.titulo}</h2><StatusBadge status={state} /></>} onClose={onClose} wide>
      <div className={c.detail}>
        <div className={c.meta}><span>{record.values.canal || "Canal pendiente"} · {record.values.formato || "Formato pendiente"}</span><span>{record.values.fecha || "Sin fecha"} {record.values.hora}</span>{plan ? <span>{plan.values.nombre}</span> : null}</div>
        <div className={c.actionRow}>{canEdit ? <button className={buttonClass("secondary", true)} onClick={() => setEditing(record)}>Editar propuesta</button> : null}<Link className={s.link} href={`/v2/clientes/${client.slug}/contenido?seccion=tareas&task=${record.values.tareaId || `CONTENT-${client.slug}-${record.id}`}`}>Ver tarea vinculada</Link><Link className={s.link} href={`/v2/clientes/${client.slug}/contenido?area=lineamientos`}>Consultar lineamientos</Link>{designRequest ? <Link className={s.link} href={`/v2/clientes/${client.slug}/diseno-marca?seccion=trabajos&registro=${designRequest.id}`}>Abrir pedido de diseño</Link> : null}</div>
        <dl className={c.description}>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Sin completar"}</dd></div>)}</dl>
        {["icp", "mensaje", "conceptoVisual", "cta"].some((key) => record.values[key]) ? <details><summary>Contexto creativo previo</summary><dl className={c.description}>{pieces.fields.filter((field) => ["icp", "mensaje", "conceptoVisual", "cta"].includes(field.key) && record.values[field.key]).map((field) => <div key={field.key}><dt>{field.label}</dt><dd>{record.values[field.key]}</dd></div>)}</dl></details> : null}
        {safeContentUrl(record.values.referencia) ? <a className={s.link} href={record.values.referencia} target="_blank" rel="noreferrer">Abrir referencia</a> : null}
        {safeContentUrl(record.values.archivoDiseno) ? <div className={c.delivery}><strong>Diseño · {record.values.version || "Versión sin indicar"}</strong><a className={s.link} href={record.values.archivoDiseno} target="_blank" rel="noreferrer">Abrir pieza para revisar</a></div> : null}
        {record.values.ideaId ? <p className={s.demoNote}>Origen: {record.values.origen || "Banco de ideas"} · {record.values.ideaId}</p> : null}
        {designAction && editable ? <div className={c.fieldGrid}><label>Enlace a la versión de diseño<input className={s.input} type="url" value={designUrl} onChange={(event) => setDesignUrl(event.target.value)} placeholder="https://…" /></label><label>Versión del diseño<input className={s.input} value={version} onChange={(event) => setVersion(event.target.value)} /></label></div> : null}
        {state === "Aprobado" && editable ? <div className={c.fieldGrid}><label>Fecha de programación<input className={s.input} type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Hora de programación<input className={s.input} type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label><label>Enlace de programación (opcional)<input className={s.input} type="url" value={schedulingUrl} onChange={(event) => setSchedulingUrl(event.target.value)} /></label><p className={s.demoNote}>Registrá la programación realizada en tu plataforma. Metricool todavía no está conectado.</p></div> : null}
        {editable ? <section className={c.commentBox} aria-label="Comentario y revisión"><label>Comentario o devolución<textarea className={s.input} rows={3} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Indicá ajustes, información o decisiones…" /></label><div className={c.fieldGrid}><label>Visibilidad del comentario<select className={s.input} value={visibility} onChange={(event) => setVisibility(event.target.value as "internal" | "client")}><option value="internal">Solo equipo interno</option><option value="client">Compartido con el cliente</option></select></label><label>Enlace a material (opcional)<input className={s.input} type="url" value={attachment} onChange={(event) => setAttachment(event.target.value)} /></label></div><div className={c.actionRow}><button className={buttonClass("secondary", true)} disabled={!comment.trim() && !attachment} onClick={() => { if (operations.comment(record, { text: comment, visibility, attachmentUrl: attachment || undefined })) { setComment(""); setAttachment(""); } }}>Guardar comentario</button>{actions.map((action) => <button key={action.id} className={buttonClass(action.id === "request-changes" || action.id === "request-information" ? "secondary" : "primary", true)} onClick={() => { const patch: Record<string, string> = action.id === "schedule" ? { fecha: date, hora: time, enlaceMetricool: schedulingUrl } : { archivoDiseno: designUrl, version }; if (operations.transition(record, action.id, { comment, patch })) setComment(""); }}>{action.label}</button>)}</div></section> : null}
        <section aria-label="Comentarios del contenido"><h3>Comentarios y materiales</h3>{comments.length ? comments.map((entry) => <article key={entry.id} className={c.comment}><div><strong>{entry.actor}</strong><small>{formatDateTime(entry.at)} · {entry.visibility === "client" ? "Compartido con el cliente" : "Interno"}</small></div><p>{entry.text}</p>{safeContentUrl(entry.attachmentUrl) ? <a className={s.link} href={entry.attachmentUrl} target="_blank" rel="noreferrer">{entry.attachmentName || "Abrir material"}</a> : entry.attachmentId ? <button className={s.link} onClick={async () => { try { const blob = await getProfileFile(client.slug, entry.attachmentId!); if (!blob) throw new Error("El archivo no está disponible en este navegador."); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = entry.attachmentName || "material"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (error) { notify(error instanceof Error ? error.message : "No se pudo abrir el material", "error"); } }}>{entry.attachmentName || "Descargar archivo local"}</button> : null}</article>) : <p className={s.cellSub}>Sin comentarios todavía.</p>}</section>
        <section aria-label="Historial del contenido"><h3>Historial de revisiones</h3>{events.length ? <ol className={c.timeline}>{[...events].reverse().map((event) => <li key={event.id}><strong>{event.from} → {event.to}</strong><span>{event.actor} · {formatDateTime(event.at)}</span><span>{event.responsible} · {event.taskId}</span>{event.comment ? <p>{event.comment}</p> : null}</li>)}</ol> : <p className={s.cellSub}>Las próximas transiciones quedarán registradas con usuario, responsable y tarea.</p>}<details><summary>Actividad anterior y ediciones</summary>{record.history.map((entry, index) => <p key={`${entry.at}-${index}`} className={s.demoNote}>{entry.user} · {formatDateTime(entry.at)} · {entry.text}</p>)}</details></section>
      </div>
    </OSSidePanel>
    {editing ? <ContentEditor client={client} title="Editar propuesta" initial={editing.values} refs={data} onClose={() => setEditing(null)} onSave={(values) => { if (operations.saveDraft(values, editing)) { setEditing(null); notify("Propuesta y tarea actualizadas", "success"); } }} /> : null}
  </>;
}
