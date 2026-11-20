"use client";

/* Diseño de marca · B. Operación mensual.
 * Pedido = unidad de producción con una sola tarea central. Las versiones se guardan en la
 * biblioteca vinculadas por pedidoId; al aprobar o entregar, la misma versión pasa a la
 * Biblioteca de marca sin copiar archivos ni registros. */
import Link from "next/link";
import { useMemo, useState, type DragEvent, type FormEvent } from "react";
import { readLocalJson, writeLocalJson } from "../local-persistence";
import type { OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { OSSidePanel } from "../overlays";
import { previewActor } from "../preview-roles";
import { serviceHref } from "../service-workspace-data";
import { Badge, buttonClass, OSEmptyState } from "../ui";
import { Glyph } from "../glyphs";
import { AvansIcon } from "../brand";
import { PEOPLE } from "./collections";
import { createDesignVersion, DESIGN_CATEGORIES, designCategory, safeDesignUrl } from "./design-model";
import { addDesignComment, DESIGN_ORIGINS, DESIGN_PRIORITIES, DESIGN_STAGES, designApprovals, designComments, designStage, isDesignStage, libraryAfterMove, moveDesignRequest, originLabel, requestVersions, type DesignStage } from "./design-operation";
import { LinkedResources } from "./design-guidelines";
import { AssetEditor, AssetPreview, BrandScope, DemoTag, DesignDemoBanner, Person, SERVICE, useBrand } from "./design-shared";
import { splitList } from "./design-system-model";
import { formatDate, formatDateTime, Panel, StatusBadge } from "./module-ui";
import { moduleKey, useModuleRecords } from "./store";
import { designRequestTask, useDesignDemoTasks, useDesignOperations } from "./use-design-operations";
import type { ModuleRecord } from "./types";
import d from "./design-workspace.module.css";

type Props = { client: OsClient; editable: boolean };
const NEXT_ACTIONS: Partial<Record<DesignStage, { to: DesignStage; label: string }[]>> = {
  Pendientes: [{ to: "En producción", label: "Empezar producción" }],
  "En producción": [{ to: "En revisión interna", label: "Enviar a revisión interna" }],
  "En revisión interna": [{ to: "Esperando aprobación", label: "Pedir aprobación" }, { to: "Ajustes", label: "Pedir ajustes" }],
  Ajustes: [{ to: "En revisión interna", label: "Reenviar a revisión" }],
  "Esperando aprobación": [{ to: "Aprobados", label: "Registrar aprobación" }, { to: "Ajustes", label: "Pedir ajustes" }],
  Aprobados: [{ to: "Entregados", label: "Marcar entregado" }],
};

/** Acciones de la operación: mover, comentar, subir versión y guardar pedido. */
export function useDesignActions(client: OsClient) {
  const store = useOsStore();
  const { syncDesignRequest } = useDesignOperations(client);
  const libraryKey = moduleKey(client.slug, SERVICE, "biblioteca");
  const ctx = () => ({ actor: previewActor(store.role), at: new Date().toISOString() });
  function move(request: ModuleRecord, to: DesignStage, note = "") {
    try {
      const library = readLocalJson<ModuleRecord[]>(libraryKey, []);
      const c = ctx();
      const next = moveDesignRequest(request, to, { ...c, versions: requestVersions(library, request).length, note });
      if (next === request) return true;
      const lib = libraryAfterMove(library, next, to, c);
      const ok = syncDesignRequest(next, { persistRecord: true, expectedUpdatedAt: request.updatedAt, extraWrites: lib.changed.length ? [{ key: libraryKey, value: lib.records }] : [] });
      if (ok) store.notify(to === "Aprobados" || to === "Entregados" ? `${request.values.nombre}: ${to.toLowerCase()} · disponible en la Biblioteca de marca` : `${request.values.nombre} pasó a ${to}`, "success");
      return ok;
    } catch (error) { store.notify(error instanceof Error ? error.message : "No se pudo mover la pieza.", "error"); return false; }
  }
  function comment(request: ModuleRecord, text: string) {
    try { return syncDesignRequest(addDesignComment(request, text, ctx()), { persistRecord: true, expectedUpdatedAt: request.updatedAt }); }
    catch (error) { store.notify(error instanceof Error ? error.message : "No se pudo comentar.", "error"); return false; }
  }
  function saveVersion(values: Record<string, string>, previousId?: string) {
    try {
      const current = readLocalJson<ModuleRecord[]>(libraryKey, []);
      const next = createDesignVersion(current, { client: client.slug, id: `PIE-${crypto.randomUUID()}`, values: values.contenidoId ? { ...values, estado: "Borrador" } : values, previousId }, ctx());
      if (!writeLocalJson(libraryKey, next.records)) return false;
      store.notify(`Versión ${next.record.values.version} guardada`, "success"); return true;
    } catch (error) { store.notify(error instanceof Error ? error.message : "No se pudo guardar", "error"); return false; }
  }
  return { move, comment, saveVersion, syncDesignRequest };
}

/** Pedido de diseño en un formulario corto y agrupado. */
export function DesignRequestForm({ client, initial, title, onSubmit, onClose, error, system }: {
  client: OsClient; initial: Record<string, string>; title: string; error: string; system: ModuleRecord[];
  onSubmit: (values: Record<string, string>) => void; onClose: () => void;
}) {
  const { tokens } = useBrand(client);
  const [v, set] = useState<Record<string, string>>(initial);
  const change = (key: string, value: string) => set((before) => ({ ...before, [key]: value }));
  const linked = splitList(v.recursosDS);
  const toggle = (id: string) => change("recursosDS", (linked.includes(id) ? linked.filter((x) => x !== id) : [...linked, id]).join(","));
  const text = (key: string, label: string, required = false, type = "text") => <label key={key}><span>{label}</span><input type={type} required={required} maxLength={300} value={v[key] || ""} onChange={(e) => change(key, e.target.value)} /></label>;
  const area = (key: string, label: string) => <label key={key} data-wide><span>{label}</span><textarea rows={2} maxLength={3000} value={v[key] || ""} onChange={(e) => change(key, e.target.value)} /></label>;
  const select = (key: string, label: string, options: readonly (string | { id: string; label: string })[]) => <label key={key}><span>{label}</span><select value={v[key] || ""} onChange={(e) => change(key, e.target.value)}><option value="">Elegir…</option>{options.map((o) => typeof o === "string" ? <option key={o}>{o}</option> : <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>;
  function submit(e: FormEvent) { e.preventDefault(); onSubmit(v); }
  const pickable = system.filter((r) => ["Logo", "Color", "Tipografía", "Recurso gráfico", "Componente", "Moodboard"].includes(r.values.tipo) && r.values.subtipo !== "Uso incorrecto");
  return <OSSidePanel label={title} heading={<h2 className={d.panelTitle}>{title}</h2>} onClose={onClose} wide persistentFooter footer={<><button type="button" className={buttonClass("ghost")} onClick={onClose}>Cancelar</button><button type="submit" form="design-request-form" className={buttonClass("primary")}>{initial.nombre ? "Guardar pedido" : "Crear pedido y tarea"}</button></>}>
    <form id="design-request-form" className={d.requestForm} onSubmit={submit}>
      {error ? <p role="alert" className={d.formError}>{error}</p> : null}
      <fieldset><legend>Pedido</legend><div className={d.fields}>
        <label data-wide><span>Pieza de marca</span><input required maxLength={300} value={v.nombre || ""} onChange={(e) => change("nombre", e.target.value)} placeholder="Ej.: Placa de beneficios de diciembre" /></label>
        {select("servicioOrigen", "Origen", DESIGN_ORIGINS)}{select("tipoPieza", "Tipo de pieza", DESIGN_CATEGORIES)}{select("prioridad", "Prioridad", DESIGN_PRIORITIES)}{text("canal", "Canal")}
      </div></fieldset>
      <fieldset><legend>Brief</legend><div className={d.fields}>{area("objetivo", "Objetivo")}{area("detalle", "Descripción")}{text("formatos", "Formato")}{text("medidas", "Medidas")}</div></fieldset>
      <fieldset><legend>Recursos</legend><div className={d.fields}>{area("referencias", "Referencias")}{area("materiales", "Materiales")}</div>
        {pickable.length ? <div className={d.pick} role="group" aria-label="Recursos del Design System">{pickable.map((r) => <button type="button" key={r.id} aria-pressed={linked.includes(r.id)} onClick={() => toggle(r.id)} title={r.values.nombre}><span className={d.pickThumb}><AssetPreview values={r.values} t={tokens} /></span><small>{r.values.nombre}</small></button>)}</div> : <p className={d.muted}>El Design System todavía no tiene recursos para vincular.</p>}
      </fieldset>
      <fieldset><legend>Asignación</legend><div className={d.fields}>
        <label><span>Responsable</span><select value={v.responsable || ""} onChange={(e) => change("responsable", e.target.value)}><option value="">Sin asignar</option>{PEOPLE.map((p) => <option key={p}>{p}</option>)}</select></label>
        <label><span>Revisor</span><select value={v.revisor || ""} onChange={(e) => change("revisor", e.target.value)}><option value="">Sin asignar</option>{PEOPLE.map((p) => <option key={p}>{p}</option>)}</select></label>
        {text("fechaObjetivo", "Fecha objetivo", false, "date")}
      </div></fieldset>
      <p className={d.muted}>Al crear el pedido se genera una sola tarea para el responsable, con el brief y los recursos vinculados. Guardado en este navegador.</p>
    </form>
  </OSSidePanel>;
}

function Facts({ items }: { items: [string, string | undefined][] }) {
  const shown = items.filter(([, value]) => value);
  return shown.length ? <dl className={d.facts}>{shown.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : null;
}

/** Detalle de una pieza en producción: brief, recursos, versiones, comentarios, aprobaciones e historial. */
export function DesignPieceDetail({ client, request, editable, onClose, content, onEdit }: Props & { request: ModuleRecord; onClose: () => void; content?: ModuleRecord; onEdit: () => void }) {
  const { tasks } = useOsStore();
  const { tokens, records: system } = useBrand(client);
  const { data } = useModuleRecords(client.slug, SERVICE, ["biblioteca", "trabajos"]);
  const { move, comment, saveVersion } = useDesignActions(client);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const fresh = (data.trabajos || []).find((r) => r.id === request.id) ?? request;
  const stage = designStage(fresh, content);
  const versions = requestVersions(data.biblioteca || [], fresh);
  const latest = versions[0];
  const comments = designComments(fresh), approvals = designApprovals(fresh);
  const task = fresh.values.contenidoId ? tasks.find((t) => t.workItem?.collection === "piezas" && t.workItem.id === fresh.values.contenidoId) : designRequestTask(tasks, fresh);
  const manual = !fresh.values.contenidoId;
  const files = [...versions.filter((v) => safeDesignUrl(v.values.archivo)).map((v) => ({ name: `Versión ${v.values.version}`, href: safeDesignUrl(v.values.archivo) })), ...splitList(fresh.values.referencias).filter(safeDesignUrl).map((href, i) => ({ name: `Referencia ${i + 1}`, href: safeDesignUrl(href) }))];
  const timeline = [...fresh.history.map((h) => ({ ...h, scope: "Pedido" })), ...versions.flatMap((v) => v.history.map((h) => ({ ...h, scope: `Versión ${v.values.version}` })))].sort((a, b) => b.at.localeCompare(a.at));
  return <OSSidePanel label={fresh.values.nombre} heading={<div className={d.detailHead}><h2 className={d.panelTitle}>{fresh.values.nombre}</h2><div className={d.chips}><StatusBadge status={stage} /><Badge tone="stone">{originLabel(fresh.values.servicioOrigen)}</Badge>{fresh.source === "demo" ? <DemoTag /> : null}</div></div>} onClose={onClose} extraWide>
    <BrandScope client={client} className={d.detail}>
      <div className={d.detailMain}>
        <div className={d.detailPreview}>{latest ? <AssetPreview values={latest.values} t={tokens} large /> : <AssetPreview values={{ nombre: fresh.values.nombre, categoria: designCategory(fresh.values.tipoPieza) }} t={tokens} large />}{!latest ? <span className={d.generated}>Sin versiones · boceto generado</span> : null}</div>
        {editable && manual ? <div className={d.actionBar}>
          {(NEXT_ACTIONS[stage] || []).map((action) => <button key={action.to} className={buttonClass(action.to === "Ajustes" ? "ghost" : "primary", true)} onClick={() => { if (move(fresh, action.to, note)) setNote(""); }}>{action.label}</button>)}
          <label className={d.moveSelect}><span>Mover a</span><select aria-label={`Estado de ${fresh.values.nombre}`} value={stage} onChange={(e) => isDesignStage(e.target.value) && move(fresh, e.target.value, note)}>{DESIGN_STAGES.map((s) => <option key={s}>{s}</option>)}</select></label>
          <input className={d.noteInput} aria-label="Nota de la revisión" placeholder="Nota para la revisión (opcional)" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
        </div> : !manual ? <p className={d.notice}>Este pedido avanza desde el contenido de origen (revisión de Contenidos y aprobación del cliente). <Link className={d.textLink} href={`${serviceHref(client.slug, "contenidos")}?seccion=piezas&registro=${encodeURIComponent(fresh.values.contenidoId)}`}>Abrir contenido de origen</Link></p> : null}
        <section className={d.block}><header><h3>Versiones ({versions.length})</h3>{editable ? <button className={buttonClass("secondary", true)} onClick={() => setUploading(true)}>Subir versión</button> : null}</header>
          {versions.length ? <div className={d.versionStrip}>{versions.map((v) => <article key={v.id} className={d.versionItem}><AssetPreview values={v.values} t={tokens} /><div><strong>Versión {v.values.version}</strong><StatusBadge status={v.values.estado} /><small>{formatDate(v.values.fecha || v.createdAt)} · {v.values.responsable || v.user}</small>{safeDesignUrl(v.values.archivo) ? <a className={d.textLink} href={safeDesignUrl(v.values.archivo)} target="_blank" rel="noreferrer">Abrir archivo</a> : null}</div></article>)}</div> : <p className={d.muted}>Todavía no hay versiones. La primera versión habilita la revisión interna.</p>}
        </section>
        <section className={d.block}><header><h3>Comentarios ({comments.length})</h3></header>
          {comments.length ? <ul className={d.comments}>{comments.map((c) => <li key={c.id}><Person name={c.actor} /><p>{c.text}</p><small>{formatDateTime(c.at)}</small></li>)}</ul> : <p className={d.muted}>Sin comentarios.</p>}
          {editable ? <form className={d.commentForm} onSubmit={(e) => { e.preventDefault(); if (comment(fresh, text)) setText(""); }}><label><span className={d.srOnly}>Comentario</span><textarea rows={2} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribí un comentario para el equipo" /></label><button type="submit" className={buttonClass("secondary", true)} disabled={!text.trim()}>Comentar</button></form> : null}
        </section>
        <section className={d.block}><header><h3>Aprobaciones ({approvals.length})</h3></header>
          {approvals.length ? <ul className={d.approvals}>{approvals.map((a) => <li key={a.id} data-decision={a.decision}><strong>{a.decision}</strong><span>{a.actor} · {formatDateTime(a.at)}</span>{a.note ? <p>{a.note}</p> : null}</li>)}</ul> : <p className={d.muted}>Sin aprobaciones registradas.</p>}
        </section>
        <section className={d.block}><details><summary>Historial ({timeline.length})</summary><ul className={d.timeline}>{timeline.map((entry, i) => <li key={i}><small>{formatDateTime(entry.at)} · {entry.scope}</small><span>{entry.text} · {entry.user}</span></li>)}</ul></details></section>
      </div>
      <aside className={d.detailSide}>
        <section className={d.block}><header><h3>Brief</h3>{editable && manual ? <button className={buttonClass("ghost", true)} onClick={onEdit}>Editar pedido</button> : null}</header>
          {fresh.values.objetivo ? <p><strong>Objetivo:</strong> {fresh.values.objetivo}</p> : null}
          {fresh.values.detalle ? <p className={d.pre}>{fresh.values.detalle}</p> : null}
          <Facts items={[["Tipo de pieza", designCategory(fresh.values.tipoPieza || "Otros")], ["Canal", fresh.values.canal], ["Formato", fresh.values.formatos], ["Medidas", fresh.values.medidas], ["Referencias", fresh.values.referencias], ["Materiales", fresh.values.materiales || fresh.values.recursos], ["Prioridad", fresh.values.prioridad]]} />
        </section>
        <section className={d.block}><header><h3>Design System vinculado</h3></header><LinkedResources client={client} ids={splitList(fresh.values.recursosDS)} t={tokens} records={system} /></section>
        <section className={d.block}><header><h3>Responsables y fechas</h3></header>
          <div className={d.people}><span>Diseño</span><Person name={fresh.values.responsable} /><span>Revisión</span><Person name={fresh.values.revisor} /></div>
          <Facts items={[["Entrega", formatDate(fresh.values.fechaObjetivo)], ["Creado", formatDate(fresh.createdAt)], ["Entregado", fresh.values.fechaEntrega ? formatDate(fresh.values.fechaEntrega) : undefined], ["Campaña", fresh.values.campanaId], ["Contenido", fresh.values.contenidoId]]} />
        </section>
        <section className={d.block}><header><h3>Tarea vinculada</h3></header>{task ? <p className={d.taskLine}><Glyph name="check" size={14} /> <span>{task.title}</span> · {task.owner} · {task.status} <Link className={d.textLink} href={`/v2/clientes/${client.slug}/diseno-marca?seccion=tareas&task=${encodeURIComponent(task.id)}`}>Abrir tarea</Link></p> : <p className={d.muted}>{manual ? "Sin tarea vinculada." : "La tarea central vive en Contenidos."}</p>}</section>
        {files.length ? <section className={d.block}><header><h3>Archivos</h3></header><ul className={d.files}>{files.map((f) => <li key={f.href}><a className={d.textLink} href={f.href} target="_blank" rel="noreferrer">{f.name}</a></li>)}</ul></section> : null}
      </aside>
    </BrandScope>
    {uploading ? <AssetEditor library t={tokens} requests={data.trabajos || []} initial={{ nombre: fresh.values.nombre, categoria: designCategory(fresh.values.tipoPieza || "Otros"), pedidoId: fresh.id, contenidoId: fresh.values.contenidoId || "", campanaId: fresh.values.campanaId || "", servicioOrigen: fresh.values.servicioOrigen || "interno", responsable: fresh.values.responsable || "", fecha: new Date().toISOString().slice(0, 10), estado: "Borrador", ...(latest ? { piezaId: latest.values.piezaId || latest.id } : {}) }} onSave={(values) => { const ok = saveVersion(values, latest?.id); if (ok) setUploading(false); return ok; }} onClose={() => setUploading(false)} /> : null}
  </OSSidePanel>;
}

function PieceCard({ request, stage, versions, t, editable, onOpen, onMove, dragging }: { request: ModuleRecord; stage: DesignStage; versions: ModuleRecord[]; t: ReturnType<typeof useBrand>["tokens"]; editable: boolean; onOpen: () => void; onMove: (to: DesignStage) => void; dragging: (id: string) => void }) {
  const latest = versions[0];
  const manual = !request.values.contenidoId;
  const comments = designComments(request).length;
  return <article className={d.card} draggable={editable && manual} onDragStart={(e: DragEvent) => { e.dataTransfer.setData("text/plain", request.id); dragging(request.id); }} data-prio={request.values.prioridad || "Media"}>
    <button type="button" className={d.cardOpen} onClick={onOpen} aria-label={`Abrir ${request.values.nombre}`}>
      <div className={d.cardThumb}>{latest ? <AssetPreview values={latest.values} t={t} /> : <div className={d.cardEmpty}><AssetPreview values={{ nombre: request.values.nombre, categoria: designCategory(request.values.tipoPieza) }} t={t} /></div>}</div>
      <strong>{request.values.nombre}</strong>
    </button>
    <div className={d.cardMeta}><Badge tone="stone">{designCategory(request.values.tipoPieza || "Otros")}</Badge><span>{originLabel(request.values.servicioOrigen)}</span>{request.source === "demo" ? <DemoTag /> : null}</div>
    <div className={d.cardFoot}><Person name={request.values.responsable} /><span title="Entrega">{formatDate(request.values.fechaObjetivo)}</span><span title="Versiones">v{latest?.values.version || 0}</span>{comments ? <span title="Comentarios" className={d.iconCount}><AvansIcon name="mensaje" size={13} /> {comments}</span> : null}</div>
    {editable && manual ? <label className={d.cardMove}><span className={d.srOnly}>Mover {request.values.nombre}</span><select aria-label={`Mover ${request.values.nombre}`} value={stage} onChange={(e) => isDesignStage(e.target.value) && onMove(e.target.value)}>{DESIGN_STAGES.map((s) => <option key={s}>{s}</option>)}</select></label> : !manual ? <small className={d.flowNote}>Avanza desde Contenidos</small> : null}
  </article>;
}

export function DesignOperationSection({ client, editable }: Props) {
  useDesignDemoTasks(client);
  const { data } = useModuleRecords(client.slug, SERVICE, ["trabajos", "biblioteca"]);
  const content = useModuleRecords(client.slug, "contenidos", ["piezas"]);
  const { tokens } = useBrand(client);
  const { move } = useDesignActions(client);
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [origin, setOrigin] = useState("");
  const [owner, setOwner] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<ModuleRecord | null>(null);
  const [dragId, setDragId] = useState("");
  const [over, setOver] = useState("");
  const requests = useMemo(() => data.trabajos || [], [data.trabajos]);
  const library = data.biblioteca || [];
  const contentOf = (r: ModuleRecord) => content.data.piezas?.find((p) => p.id === r.values.contenidoId);
  const rows = useMemo(() => requests.filter((r) => (!origin || (r.values.servicioOrigen || "interno") === origin) && (!owner || r.values.responsable === owner) && (!query || r.values.nombre.toLowerCase().includes(query.toLowerCase()))), [owner, origin, query, requests]);
  const staged = rows.map((r) => ({ r, stage: designStage(r, contentOf(r)), versions: requestVersions(library, r) }));
  const selected = requests.find((r) => r.id === open);
  const owners = [...new Set(requests.map((r) => r.values.responsable).filter(Boolean))];
  function drop(stage: DesignStage) {
    const request = requests.find((r) => r.id === dragId);
    setDragId(""); setOver("");
    if (request && !request.values.contenidoId) move(request, stage);
  }
  return <BrandScope client={client}>
    <div className={d.stack}>
      <DesignDemoBanner client={client} editable={editable} />
      <Panel title="Producción del mes" id="design-operation" description="Piezas en curso de todos los orígenes. Las aprobadas y entregadas pasan solas a la Biblioteca de marca." actions={<div className={d.viewToggle} role="group" aria-label="Vista de la operación"><button type="button" aria-pressed={view === "kanban"} onClick={() => setView("kanban")}><Glyph name="kanban" size={15} /> Kanban</button><button type="button" aria-pressed={view === "lista"} onClick={() => setView("lista")}><Glyph name="list" size={15} /> Lista</button></div>}>
        <div className={d.toolbar}>
          <label><span>Origen</span><select value={origin} onChange={(e) => setOrigin(e.target.value)}><option value="">Todos</option>{DESIGN_ORIGINS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
          <label><span>Responsable</span><select value={owner} onChange={(e) => setOwner(e.target.value)}><option value="">Todos</option>{owners.map((o) => <option key={o}>{o}</option>)}</select></label>
          <label><span>Buscar</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre de la pieza" /></label>
          {view === "lista" ? <div className={d.counters} aria-label="Piezas por estado">{DESIGN_STAGES.map((s) => <span key={s} title={s}>{s} <b>{staged.filter((x) => x.stage === s).length}</b></span>)}</div> : null}
        </div>
        {!requests.length ? <OSEmptyState icon="registro" title="Sin piezas en producción">Creá un pedido de diseño o aprobá un contenido para que aparezca acá.</OSEmptyState>
          : view === "kanban" ? <div className={d.board} aria-label="Kanban de diseño">{DESIGN_STAGES.map((stage) => {
            const items = staged.filter((x) => x.stage === stage);
            return <section key={stage} className={d.column} aria-label={stage} data-over={over === stage || undefined} onDragOver={(e) => { if (editable && dragId) { e.preventDefault(); setOver(stage); } }} onDragLeave={() => setOver("")} onDrop={(e) => { e.preventDefault(); drop(stage); }}>
              <header><h3>{stage}</h3><em>{items.length}</em></header>
              {items.length ? items.map(({ r, stage: s, versions }) => <PieceCard key={r.id} request={r} stage={s} versions={versions} t={tokens} editable={editable} onOpen={() => setOpen(r.id)} onMove={(to) => move(r, to)} dragging={setDragId} />) : <p className={d.colEmpty}>Sin piezas</p>}
            </section>;
          })}</div>
          : <div className={d.tableWrap}><table className={d.table}><thead><tr><th>Pieza</th><th>Estado</th><th>Tipo</th><th>Origen</th><th>Responsable</th><th>Entrega</th><th>Prioridad</th><th>Versión</th></tr></thead><tbody>
            {staged.map(({ r, stage, versions }) => <tr key={r.id}>
              <td><button type="button" className={d.rowPiece} onClick={() => setOpen(r.id)}><span className={d.rowThumb}><AssetPreview values={versions[0]?.values ?? { nombre: r.values.nombre, categoria: designCategory(r.values.tipoPieza) }} t={tokens} /></span>{r.values.nombre}</button></td>
              <td>{editable && !r.values.contenidoId ? <select aria-label={`Estado de ${r.values.nombre} en la lista`} value={stage} onChange={(e) => isDesignStage(e.target.value) && move(r, e.target.value)}>{DESIGN_STAGES.map((s) => <option key={s}>{s}</option>)}</select> : <StatusBadge status={stage} />}</td>
              <td>{designCategory(r.values.tipoPieza || "Otros")}</td><td>{originLabel(r.values.servicioOrigen)}</td><td>{r.values.responsable || "Sin asignar"}</td><td>{formatDate(r.values.fechaObjetivo)}</td><td>{r.values.prioridad || "Media"}</td><td>v{versions[0]?.values.version || 0}</td>
            </tr>)}
          </tbody></table></div>}
      </Panel>
    </div>
    {selected ? <DesignPieceDetail client={client} request={selected} editable={editable} content={contentOf(selected)} onClose={() => setOpen(null)} onEdit={() => { setEditing(selected); setOpen(null); }} /> : null}
    {editing ? <EditRequest client={client} request={editing} onClose={() => { setOpen(editing.id); setEditing(null); }} /> : null}
  </BrandScope>;
}

export function EditRequest({ client, request, onClose }: { client: OsClient; request: ModuleRecord; onClose: () => void }) {
  const { role } = useOsStore();
  const { syncDesignRequest } = useDesignOperations(client);
  const { records } = useBrand(client);
  const [error, setError] = useState("");
  return <DesignRequestForm client={client} title="Editar pedido de diseño" system={records} initial={request.values} error={error} onClose={onClose} onSubmit={(values) => {
    const at = new Date().toISOString(), actor = previewActor(role);
    if (syncDesignRequest({ ...request, updatedAt: at, user: actor, values: { ...request.values, ...values }, history: [{ at, user: actor, text: "Editó el brief del pedido" }, ...request.history] }, { persistRecord: true, expectedUpdatedAt: request.updatedAt })) onClose();
    else setError("No se guardó el pedido. Conservamos el formulario para reintentar.");
  }} />;
}
