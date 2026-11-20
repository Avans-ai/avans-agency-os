"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { type OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { getProfileFile } from "../knowledge/profile-files";
import { OSModal, OSSidePanel } from "../overlays";
import { PEOPLE } from "./collections";
import { buttonClass } from "../ui";
import s from "../os.module.css";
import { PIECE_CHANNELS, PIECE_FORMATS } from "./content-collections";
import { AxisTag, ChannelChip, StageStepper, Thumb, useContentThumbs } from "./content-ui";
import { CLIENT_REQUEST_TYPES, CONTENT_STATES, MONDAY_STATE, PREPRODUCTION_FIELDS, REVIEW_KIND_LABEL, VIDEO_FORMATS, clientRequestValues, clientRequests, contentChanges, contentComments, contentState, contentTransitions, contentVersionLabel, getContentActions, isDesignReview, preproductionChecklist, safeContentUrl, validContentDate, type ClientRequest, type ContentAction, type ContentRole, type ContentState } from "./content-workflow";
import { checkContentGuidelines, GUIDELINE_AI_PENDING, GUIDELINE_OVERRIDE_FIELD, GUIDELINE_SOURCE_LABEL, guidelineOverrides, type GuidelineCheck } from "./content-guideline-check";
import { useGuidelineCheckSources } from "./content-guidelines";
import { formatDateTime, StatusBadge } from "./module-ui";
import { useModuleRecords, type ModuleData } from "./store";
import type { ModuleRecord } from "./types";
import { useContentOperations } from "./use-content-operations";
import c from "./content.module.css";

export function workflowRole(role: string): ContentRole {
  if (["admin", "pm", "designer", "client"].includes(role)) return role as ContentRole;
  return "content";
}
export const contentTitleKey = (collection: string) => collection === "piezas" ? "titulo" : collection === "ideas" ? "idea" : "nombre";
const newRequest = (index: number): ClientRequest => ({ id: `REQ-${Date.now().toString(36)}-${index}`, type: "Fotografías", detail: "", status: "Pendiente" });

/** Ficha del contenido agrupada: propuesta, canal y fecha, copy, pedidos al cliente; lo secundario se despliega. */
export function ContentEditor({ client, initial, refs, title = "Nuevo contenido", onClose, onSave }: { client: OsClient; initial: Record<string, string>; refs: ModuleData; title?: string; onClose: () => void; onSave: (values: Record<string, string>) => void }) {
  const [values, setValues] = useState<Record<string, string>>(() => ({ responsable: client.team.find((member) => member.role.includes("Contenidos"))?.name || "", revisor: client.owner, disenador: client.team.find((member) => member.role.includes("Diseño"))?.name || "", clienteResponsable: client.contacts[0]?.name || "", ...initial }));
  const [requests, setRequests] = useState<ClientRequest[]>(() => clientRequests(initial).map((item) => item.id === "REQ-LEGACY" ? { ...item, id: newRequest(0).id } : item));
  const [error, setError] = useState("");
  const guideSources = useGuidelineCheckSources(client);
  const [review, setReview] = useState<GuidelineCheck | null>(null);
  const set = (key: string) => (event: { target: { value: string } }) => { setReview(null); setValues((current) => ({ ...current, [key]: event.target.value })); };
  const field = (key: string, label: string, kind: "text" | "textarea" | "date" = "text", wide = false, placeholder?: string) => <div className={c.formField} data-wide={wide || kind === "textarea" || undefined}><label htmlFor={`content-${key}`}>{label}</label>{kind === "textarea" ? <textarea id={`content-${key}`} className={s.input} rows={3} maxLength={1500} value={values[key] || ""} onChange={set(key)} placeholder={placeholder} /> : <input id={`content-${key}`} className={s.input} type={kind} value={values[key] || ""} onChange={set(key)} placeholder={placeholder} maxLength={200} />}</div>;
  const select = (key: string, label: string, options: readonly { value: string; label: string }[], empty = "Elegir…") => <div className={c.formField}><label htmlFor={`content-${key}`}>{label}</label><select id={`content-${key}`} className={s.input} value={values[key] || ""} onChange={set(key)}><option value="">{empty}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>;
  const opts = (list: readonly string[]) => list.map((value) => ({ value, label: value }));
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!values.titulo?.trim()) { setError("Completá el título del contenido."); return; }
    if (values.fecha && !validContentDate(values.fecha)) { setError("Revisá la fecha prevista."); return; }
    if (values.hora && !/^([01]\d|2[0-3]):[0-5]\d$/.test(values.hora)) { setError("El horario debe tener el formato HH:MM."); return; }
    if (values.referencia && !safeContentUrl(values.referencia)) { setError("La URL de referencia debe empezar con http o https."); return; }
    setError("");
    const clean = cleanValues();
    // Revisión de lineamientos sin IA: glosario de la Ficha y don'ts de Contenidos.
    const check = checkContentGuidelines(clean, guideSources);
    if (check.warnings.length) { setReview(check); return; }
    onSave(clean);
  }
  function cleanValues() {
    return { ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])), ...clientRequestValues(requests) };
  }
  function adjustByHand() {
    const field = review?.warnings[0]?.field;
    setReview(null);
    if (field) setTimeout(() => document.getElementById(`content-${field}`)?.focus(), 0);
  }
  return <OSModal title={title} titleId="content-editor-title" onClose={onClose} footer={<><button className={buttonClass("ghost")} onClick={onClose}>Cancelar</button><button type="submit" form="content-editor-form" className={buttonClass("primary")}>Guardar borrador</button></>}>
    <form id="content-editor-form" className={c.editor} onSubmit={submit} noValidate>
      {error ? <p role="alert" className={s.fieldError}>{error}</p> : null}
      {review ? <GuidelineReview check={review} actionLabel="Guardar igual" onProceed={() => { const warnings = review.warnings; setReview(null); onSave({ ...cleanValues(), [GUIDELINE_OVERRIDE_FIELD]: JSON.stringify(warnings) }); }} onAdjust={adjustByHand} /> : null}
      <fieldset><legend>Propuesta</legend>
        {field("titulo", "Título *", "text", true)}
        {select("plan", "Plan mensual", (refs.planes || []).map((item) => ({ value: item.id, label: item.values.nombre || item.id })), "Sin vincular")}
        {select("eje", "Eje temático", (refs.ejes || []).map((item) => ({ value: item.id, label: item.values.nombre || item.id })), "Sin vincular")}
        {field("idea", "Idea", "textarea")}
        {field("bajada", "Bajada explicativa", "textarea")}
        {field("objetivo", "Objetivo", "textarea")}
        {field("mensaje", "Mensaje", "text", true)}
      </fieldset>
      <fieldset><legend>Canal y fecha tentativa</legend>
        {select("canal", "Canal", opts(PIECE_CHANNELS))}
        {select("formato", "Formato", opts(PIECE_FORMATS))}
        {field("fecha", "Fecha prevista", "date")}
        {field("hora", "Horario (HH:MM)", "text", false, "10:30")}
      </fieldset>
      <fieldset><legend>Copy</legend>
        {field("copy", "Copy preliminar", "textarea")}
        {field("cta", "CTA", "text", true, "Guardalo para tu próximo viaje")}
      </fieldset>
      <fieldset aria-describedby="content-requests-hint"><legend>Qué necesitamos del cliente</legend>
        <p id="content-requests-hint" className={c.hint} data-wide="true">El cliente los ve junto con la propuesta y puede responder o adjuntar material en el portal.</p>
        <div className={c.requestRows} data-wide="true">{requests.map((request, index) => <div className={c.requestRow} key={request.id}>
          <select aria-label={`Tipo de pedido ${index + 1}`} className={s.input} value={request.type} onChange={(event) => setRequests((list) => list.map((item) => item.id === request.id ? { ...item, type: event.target.value as ClientRequest["type"] } : item))}>{CLIENT_REQUEST_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
          <input aria-label={`Detalle del pedido ${index + 1}`} className={s.input} value={request.detail} maxLength={300} placeholder="Qué necesitamos y para cuándo" onChange={(event) => setRequests((list) => list.map((item) => item.id === request.id ? { ...item, detail: event.target.value } : item))} />
          <button type="button" className={buttonClass("ghost", true)} aria-label={`Quitar pedido ${index + 1}`} onClick={() => setRequests((list) => list.filter((item) => item.id !== request.id))}>Quitar</button>
        </div>)}
          <button type="button" className={buttonClass("secondary", true)} onClick={() => setRequests((list) => [...list, newRequest(list.length)])}>Agregar pedido al cliente</button>
        </div>
      </fieldset>
      <details className={c.more}><summary>Referencias y material necesario</summary><div className={c.moreBody}>
        {field("referencia", "URL de referencia", "text", true, "https://…")}
        {field("referencias", "Otras referencias", "textarea")}
        {field("materialNecesario", "Material necesario", "textarea")}
      </div></details>
      <details className={c.more}><summary>Responsables</summary><div className={c.moreBody}>
        {select("responsable", "Responsable", opts(PEOPLE), "Sin asignar")}
        {select("revisor", "Responsable de revisión interna", opts(PEOPLE), "Sin asignar")}
        {select("disenador", "Diseñador", opts(PEOPLE), "Sin asignar")}
        {field("clienteResponsable", "Contacto del cliente")}
      </div></details>
    </form>
  </OSModal>;
}

const NEXT_STEP: Record<ContentState, string> = {
  Borrador: "Completá la propuesta y enviala a revisión interna.",
  "Revisión interna de producción": "Revisión interna: enviá al cliente o pedí ajustes.",
  "Revisión preliminar del cliente": "El cliente valida idea, título, bajada, copy, formato y pedidos en una sola instancia.",
  "Información del cliente": "Esperando la información o el material pedido al cliente.",
  Ajustes: "Aplicá los ajustes pedidos y reenviá a revisión.",
  Preproducción: "Reuní todo lo que necesita el diseñador y enviá a diseño.",
  "Producción de diseño": "El diseñador trabaja con el pedido vinculado; no necesita volver a cargar datos.",
  "Revisión interna del diseño": "Revisá la pieza antes de pedir la aprobación final.",
  "Aprobación final del cliente": "El cliente aprueba la pieza final o pide ajustes.",
  Aprobado: "Programá la publicación en tu plataforma y registrala acá.",
  Programado: "Registro local de la programación. Metricool no conectado.",
  Publicada: "Publicación registrada.",
};
type Tab = "propuesta" | "preproduccion" | "revisiones" | "historial";

export function ContentDetail({ client, record, editable, onClose }: { client: OsClient; record: ModuleRecord; editable: boolean; onClose: () => void }) {
  const { role, notify } = useOsStore();
  const { data } = useModuleRecords(client.slug, "contenidos", ["piezas", "ejes", "planes"]);
  const { data: designData } = useModuleRecords(client.slug, "diseno-marca", ["trabajos"]);
  const thumbs = useContentThumbs(client);
  const designRequest = (designData.trabajos || []).find((request) => request.values.contenidoId === record.id);
  const operations = useContentOperations(client);
  const state = contentState(record);
  const [tab, setTab] = useState<Tab>(state === "Preproducción" ? "preproduccion" : "propuesta");
  const [editing, setEditing] = useState<ModuleRecord | null>(null);
  const [comment, setComment] = useState("");
  const [attachment, setAttachment] = useState("");
  const [visibility, setVisibility] = useState<"internal" | "client">("internal");
  const [designUrl, setDesignUrl] = useState(record.values.archivoDiseno || "");
  const [version, setVersion] = useState(record.values.version || "v1");
  const [date, setDate] = useState(record.values.fecha || "");
  const [time, setTime] = useState(record.values.hora || "");
  const [schedulingUrl, setSchedulingUrl] = useState(record.values.enlaceMetricool || "");
  const actions = editable ? getContentActions(record, workflowRole(role)) : [];
  const canEdit = editable && role !== "designer" && role !== "client" && ["Borrador", "Ajustes"].includes(state);
  const designAction = actions.some((action) => action.id === "deliver-design") || (state === "Ajustes" && ["Revisión interna del diseño", "Aprobación final del cliente"].includes(record.values.returnState));
  const comments = contentComments(record);
  const axes = data.ejes || [];
  const plan = (data.planes || []).find((item) => item.id === record.values.plan);
  const requests = clientRequests(record.values);
  const checklist = preproductionChecklist(record.values);
  const lastRequest = [...contentTransitions(record)].reverse().find((entry) => entry.action === "request-changes" || entry.action === "request-information");
  const taskId = record.values.tareaId || `CONTENT-${client.slug}-${record.id}`;
  const guideSources = useGuidelineCheckSources(client);
  const [pendingCheck, setPendingCheck] = useState<{ action: ContentAction; check: GuidelineCheck } | null>(null);
  function runAction(action: ContentAction, override?: GuidelineCheck) {
    // Antes de enviar la propuesta a revisión del PM, se revisa contra los lineamientos (sin IA).
    if (!override && (action === "submit" || (action === "resubmit" && !isDesignReview(record)))) {
      const check = checkContentGuidelines(record.values, guideSources);
      if (check.warnings.length) { setPendingCheck({ action, check }); return; }
    }
    setPendingCheck(null);
    const patch: Record<string, string> = action === "schedule" ? { fecha: date, hora: time, enlaceMetricool: schedulingUrl } : { archivoDiseno: designUrl, version };
    if (operations.transition(record, action, { comment, patch, guidelineOverride: override?.warnings })) setComment("");
  }

  return <>
    <OSSidePanel label={`Contenido: ${record.values.titulo}`} heading={<><h2>{record.values.titulo}</h2><div className={c.headMeta}><StatusBadge status={state} /><span className={c.muted}>{contentVersionLabel(record)}</span>{record.source === "demo" ? <span className={c.demoTag}>Demo</span> : null}</div></>} onClose={onClose} wide>
      <div className={c.detail}>
        <div className={c.metaRow}><ChannelChip channel={record.values.canal} label /><span>{record.values.formato || "Formato pendiente"}</span><span>{record.values.fecha || "Sin fecha"}{record.values.hora ? ` · ${record.values.hora}` : ""}</span><AxisTag axes={axes} id={record.values.eje} />{plan ? <span>{plan.values.nombre}</span> : null}<span>{record.values.responsable || "Sin responsable"}</span></div>
        <StageStepper state={state} />
        <section className={c.nextStep} aria-label="Próximo paso">
          <div className={c.nextHead}><strong>Próximo paso</strong><span>{NEXT_STEP[state]}</span>{state === "Ajustes" && lastRequest ? <span className={c.requestNote}>Pedido por {lastRequest.actor}: «{lastRequest.comment}»</span> : null}</div>
          {state === "Preproducción" ? <div className={c.meter}><progress value={checklist.done} max={checklist.total} aria-label="Preproducción completa" /><span>{checklist.done}/{checklist.total} listo{checklist.missing.length ? ` · falta: ${checklist.missing.join(", ").toLowerCase()}` : " · listo para diseño"}</span></div> : null}
          {designAction && editable ? <div className={c.fieldGrid}><label>Enlace a la versión de diseño<input className={s.input} type="url" value={designUrl} onChange={(event) => setDesignUrl(event.target.value)} placeholder="https://…" /></label><label>Versión del diseño<input className={s.input} value={version} onChange={(event) => setVersion(event.target.value)} /></label></div> : null}
          {state === "Aprobado" && editable ? <div className={c.fieldGrid}><label>Fecha de programación<input className={s.input} type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Hora de programación<input className={s.input} type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label><label data-wide="true">Enlace de programación (opcional)<input className={s.input} type="url" value={schedulingUrl} onChange={(event) => setSchedulingUrl(event.target.value)} /></label></div> : null}
          {editable ? <div className={c.commentBox}><label>Comentario o devolución<textarea className={s.input} rows={2} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Indicá ajustes, información o decisiones…" /></label><details className={c.more}><summary>Visibilidad y material</summary><div className={c.fieldGrid}><label>Visibilidad del comentario<select className={s.input} value={visibility} onChange={(event) => setVisibility(event.target.value as "internal" | "client")}><option value="internal">Solo equipo interno</option><option value="client">Compartido con el cliente</option></select></label><label>Enlace a material (opcional)<input className={s.input} type="url" value={attachment} onChange={(event) => setAttachment(event.target.value)} /></label></div></details>
            {pendingCheck ? <GuidelineReview check={pendingCheck.check} actionLabel="Enviar igual" onProceed={() => runAction(pendingCheck.action, pendingCheck.check)} onAdjust={() => { setPendingCheck(null); if (canEdit) setEditing(record); }} adjustLabel={canEdit ? "Ajustar a mano" : "Cancelar"} /> : null}
            <div className={c.actionRow}>{actions.map((action) => <button key={action.id} className={buttonClass(action.id === "request-changes" || action.id === "request-information" ? "secondary" : "primary", true)} onClick={() => runAction(action.id)}>{action.label}</button>)}<button className={buttonClass("ghost", true)} disabled={!comment.trim() && !attachment} onClick={() => { if (operations.comment(record, { text: comment, visibility, attachmentUrl: attachment || undefined })) { setComment(""); setAttachment(""); } }}>Guardar comentario</button></div></div> : <p className={c.muted}>Vista de consulta: tu rol no modifica este contenido.</p>}
        </section>
        <div className={c.linkRow}>{canEdit ? <button className={buttonClass("secondary", true)} onClick={() => setEditing(record)}>Editar propuesta</button> : null}<Link className={s.link} href={`/v2/clientes/${client.slug}/contenido?seccion=tareas&task=${taskId}`}>Ver tarea vinculada</Link>{designRequest ? <Link className={s.link} href={`/v2/clientes/${client.slug}/diseno-marca?seccion=trabajos&registro=${designRequest.id}`}>Abrir pedido de diseño</Link> : null}<Link className={s.link} href={`/v2/clientes/${client.slug}/contenido?area=lineamientos`}>Consultar lineamientos</Link></div>
        <div className={c.tabs} role="group" aria-label="Secciones del contenido">{([["propuesta", "Propuesta"], ["preproduccion", "Preproducción"], ["revisiones", `Revisiones · ${comments.length}`], ["historial", "Historial"]] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</div>
        {tab === "propuesta" ? <ProposalTab client={client} record={record} thumb={thumbs(record.id)} requests={requests} /> : null}
        {tab === "preproduccion" ? <PreproductionTab key={record.updatedAt} client={client} record={record} editable={editable && ["admin", "pm", "content", "operativo"].includes(role) && ["Preproducción", "Producción de diseño", "Información del cliente"].includes(state)} designRequest={designRequest} /> : null}
        {tab === "revisiones" ? <ReviewsTab client={client} record={record} notify={notify} /> : null}
        {tab === "historial" ? <HistoryTab record={record} /> : null}
      </div>
    </OSSidePanel>
    {editing ? <ContentEditor client={client} title="Editar propuesta" initial={editing.values} refs={data} onClose={() => setEditing(null)} onSave={(values) => { if (operations.saveDraft(values, editing)) { setEditing(null); notify("Propuesta y tarea actualizadas", "success"); } }} /> : null}
  </>;
}

function ProposalTab({ client, record, thumb, requests }: { client: OsClient; record: ModuleRecord; thumb: string; requests: ClientRequest[] }) {
  const v = record.values;
  const rows = [["Idea", v.idea || v.brief], ["Bajada", v.bajada], ["Objetivo", v.objetivo], ["Mensaje", v.mensaje], ["Referencias", v.referencias], ["Material necesario", v.materialNecesario]].filter(([, value]) => value);
  return <div className={c.proposal}>
    <article className={c.postPreview} aria-label="Vista previa de la publicación">
      <header><ChannelChip channel={v.canal} /><strong>{client.name}</strong><small>{v.formato}</small></header>
      <Thumb src={thumb} title={v.titulo} channel={v.canal} size="lg" />
      {v.copy ? <p>{v.copy}</p> : <p className={c.muted}>Copy preliminar pendiente.</p>}
      {v.cta ? <span className={c.cta}>{v.cta}</span> : null}
      {safeContentUrl(v.archivoDiseno) ? <a className={s.link} href={v.archivoDiseno} target="_blank" rel="noreferrer">Abrir diseño {v.version || ""}</a> : null}
    </article>
    <div className={c.proposalInfo}>
      <dl className={c.description}>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}{!rows.length ? <div><dt>Propuesta</dt><dd>Sin completar</dd></div> : null}</dl>
      {safeContentUrl(v.referencia) ? <a className={s.link} href={v.referencia} target="_blank" rel="noreferrer">Abrir referencia</a> : null}
      <section aria-label="Qué necesitamos del cliente"><h3>Qué necesitamos del cliente</h3>{requests.length ? <ul className={c.requestList}>{requests.map((item) => <li key={item.id} data-status={item.status}><b>{item.type}</b><span>{item.detail}</span><em>{item.status}{item.responseAt ? ` · ${formatDateTime(item.responseAt)}` : ""}</em></li>)}</ul> : <p className={c.muted}>Sin pedidos al cliente.</p>}</section>
      {v.ideaId ? <p className={s.demoNote}>Origen: {v.origen || "Banco de ideas"} · {v.ideaId}</p> : null}
    </div>
  </div>;
}

function PreproductionTab({ client, record, editable, designRequest }: { client: OsClient; record: ModuleRecord; editable: boolean; designRequest?: ModuleRecord }) {
  const operations = useContentOperations(client);
  const [values, setValues] = useState(() => Object.fromEntries(PREPRODUCTION_FIELDS.map((field) => [field.key, record.values[field.key] || ""])));
  const checklist = preproductionChecklist({ ...record.values, ...values });
  const video = VIDEO_FORMATS.includes(record.values.formato);
  const fields = PREPRODUCTION_FIELDS.filter((field) => !field.video || video);
  return <div className={c.preproduction}>
    <ul className={c.checklist} aria-label="Checklist de preproducción">{checklist.items.map((item) => <li key={item.key} data-done={item.done}><i aria-hidden="true">{item.done ? "✓" : ""}</i>{item.label}{item.required ? <small> · obligatorio</small> : null}</li>)}</ul>
    <p className={c.muted}>{record.values.formato || "Formato a definir"} · {record.values.canal || "Canal a definir"} · {checklist.done}/{checklist.total} listo</p>
    {editable ? <form className={c.editor} onSubmit={(event) => { event.preventDefault(); operations.savePreproduction(record, values); }}>
      <fieldset><legend>Preproducción</legend>{fields.map((field) => <div key={field.key} className={c.formField} data-wide={field.kind === "textarea" || undefined}><label htmlFor={`pre-${field.key}`}>{field.label}{field.required ? " *" : ""}</label>{field.kind === "textarea" ? <textarea id={`pre-${field.key}`} className={s.input} rows={2} maxLength={1500} value={values[field.key]} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} /> : <input id={`pre-${field.key}`} className={s.input} type={field.kind === "date" ? "date" : "text"} value={values[field.key]} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} />}{field.hint ? <small className={c.hint}>{field.hint}</small> : null}</div>)}</fieldset>
      <div className={c.actionRow}><button type="submit" className={buttonClass("secondary", true)}>Guardar preproducción</button></div>
    </form> : <dl className={c.description}>{fields.map((field) => <div key={field.key}><dt>{field.label}</dt><dd>{record.values[field.key] || "Sin completar"}</dd></div>)}</dl>}
    {designRequest ? <div className={c.delivery}><strong>Pedido de diseño {designRequest.id}</strong><span>{designRequest.values.estado} · {designRequest.values.responsable || "Diseñador por asignar"} · entrega {designRequest.values.fechaObjetivo || "a definir"}</span><span className={c.muted}>Incluye propuesta aprobada, preproducción, pedidos al cliente, lineamientos y recursos del Design System.</span></div> : <p className={c.muted}>Al enviar a diseño se genera un único pedido vinculado con toda esta información.</p>}
  </div>;
}

function ReviewsTab({ client, record, notify }: { client: OsClient; record: ModuleRecord; notify: (message: string, tone?: "default" | "success" | "error") => void }) {
  const comments = contentComments(record);
  const groups = Array.from(new Set(comments.map((entry) => entry.version || "Sin versión")));
  return <section aria-label="Comentarios del contenido" className={c.reviews}>{comments.length ? groups.reverse().map((group) => <div key={group} className={c.versionGroup}><h3>{group}</h3>{comments.filter((entry) => (entry.version || "Sin versión") === group).reverse().map((entry) => <article key={entry.id} className={c.comment} data-kind={entry.kind || "comment"}><div><span className={c.kind}>{REVIEW_KIND_LABEL[entry.kind || "comment"]}</span><strong>{entry.actor}</strong><small>{formatDateTime(entry.at)} · {entry.visibility === "client" ? "Compartido con el cliente" : "Interno"}</small></div><p>{entry.text}</p>{safeContentUrl(entry.attachmentUrl) ? <a className={s.link} href={entry.attachmentUrl} target="_blank" rel="noreferrer">{entry.attachmentName || "Abrir material"}</a> : entry.attachmentId ? <button className={s.link} onClick={async () => { try { const blob = await getProfileFile(client.slug, entry.attachmentId!); if (!blob) throw new Error("El archivo no está disponible en este navegador."); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = entry.attachmentName || "material"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (error) { notify(error instanceof Error ? error.message : "No se pudo abrir el material", "error"); } }}>{entry.attachmentName || "Descargar archivo local"}</button> : null}</article>)}</div>) : <p className={s.cellSub}>Sin comentarios todavía.</p>}</section>;
}

function HistoryTab({ record }: { record: ModuleRecord }) {
  type Entry = { id: string; at: string; title: string; meta: string; note?: string; kind: "transition" | "change" | "guideline" };
  const entries: Entry[] = [
    ...contentTransitions(record).map((event) => ({ id: event.id, at: event.at, kind: "transition" as const, title: `${event.from} → ${event.to}`, meta: `${event.actor} · ${formatDateTime(event.at)} · ${event.version || ""} · Monday: ${MONDAY_STATE[(CONTENT_STATES as readonly string[]).includes(event.to) ? event.to : "Borrador"]} · responsable ${event.responsible} · ${event.taskId}`, note: event.comment })),
    ...contentChanges(record).map((change) => ({ id: change.id, at: change.at, kind: "change" as const, title: `Cambió ${change.fields.join(", ")}`, meta: `${change.actor} · ${formatDateTime(change.at)} · ${change.version}${change.requestedBy ? ` · a pedido de ${change.requestedBy}` : ""}`, note: change.request })),
    ...guidelineOverrides(record.values.guidelineChecks).map((entry) => ({ id: entry.id, at: entry.at, kind: "guideline" as const, title: `Advertencias de lineamientos · ${entry.decision}`, meta: `${entry.actor} · ${formatDateTime(entry.at)} · ${entry.stage}`, note: entry.warnings.map((warning) => `${warning.message} (${warning.field}) · ${GUIDELINE_SOURCE_LABEL[warning.source]}`).join("\n") })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return <section aria-label="Historial del contenido">{entries.length ? <ol className={c.timeline}>{entries.map((entry) => <li key={entry.id} data-kind={entry.kind}><strong>{entry.title}</strong><span>{entry.meta}</span>{entry.note ? <p>{entry.note}</p> : null}</li>)}</ol> : <p className={s.cellSub}>Las próximas transiciones quedarán registradas con usuario, responsable y tarea.</p>}<details><summary>Actividad anterior y ediciones</summary>{record.history.map((entry, index) => <p key={`${entry.at}-${index}`} className={s.demoNote}>{entry.user} · {formatDateTime(entry.at)} · {entry.text}</p>)}</details></section>;
}

/** Advertencias de la revisión de lineamientos (sin IA). El Content decide: seguir igual (queda registrado) o ajustar a mano. */
function GuidelineReview({ check, actionLabel, onProceed, onAdjust, adjustLabel = "Ajustar a mano" }: { check: GuidelineCheck; actionLabel: string; onProceed: () => void; onAdjust: () => void; adjustLabel?: string }) {
  // Aparece donde el usuario no está mirando (arriba del formulario): se lleva a la vista.
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { ref.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" }); }, [check]);
  return <section ref={ref} className={c.guideCheck} aria-label="Revisión de lineamientos" aria-live="polite" data-wide="true">
    <h3>Revisión de lineamientos · {check.warnings.length} {check.warnings.length === 1 ? "advertencia" : "advertencias"}</h3>
    <ul>{check.warnings.map((warning) => <li key={warning.id} data-severity={warning.severity}><span>{warning.message} · {warning.sourceLabel}</span><small>En {warning.fieldLabel.toLowerCase()}</small></li>)}</ul>
    {check.suggestions.map((item) => <small key={item}>{item}</small>)}
    <div className={c.guideActions}>
      <button type="button" className={buttonClass("secondary", true)} onClick={onAdjust}>{adjustLabel}</button>
      <button type="button" className={buttonClass("primary", true)} onClick={onProceed}>{actionLabel}</button>
      <button type="button" className={buttonClass("ghost", true)} disabled title={GUIDELINE_AI_PENDING}>Ajustar con IA</button>
      <em>{GUIDELINE_AI_PENDING} Si seguís igual, la decisión queda en el historial.</em>
    </div>
  </section>;
}
