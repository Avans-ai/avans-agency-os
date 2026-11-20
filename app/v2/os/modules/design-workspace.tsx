"use client";

/* Diseño de marca · secciones de la Operación mensual (pedidos) y la Biblioteca de marca.
 * A. Lineamientos → design-guidelines.tsx · B. Operación → design-operation-view.tsx + pedidos
 * C. Biblioteca de marca → DesignLibrarySection. */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { OSSidePanel } from "../overlays";
import { Badge, buttonClass, OSEmptyState } from "../ui";
import { readLocalJson, writeLocalJson } from "../local-persistence";
import { previewActor } from "../preview-roles";
import { serviceHref } from "../service-workspace-data";
import { AssistedCreatePanel } from "../assistant/assisted-create";
import { assistantProfile } from "../assistant/profiles";
import { useKnowledge } from "../knowledge/use-knowledge";
import { materialOf } from "../knowledge/profile-model";
import { sourceVisible } from "../knowledge/sources";
import { collectionDef } from "./collections";
import { createDesignVersion, DESIGN_CATEGORIES, designCategory, safeDesignUrl } from "./design-model";
import { DESIGN_ORIGINS, DESIGN_STAGES, designStage, inBrandLibrary, latestVersions, libraryCategory, originLabel, versionsOf } from "./design-operation";
import { DesignGuidelines } from "./design-guidelines";
import { DesignPieceDetail, DesignRequestForm, EditRequest } from "./design-operation-view";
import { AssetEditor, AssetPreview, BrandScope, DemoTag, DesignDemoBanner, LinkedBrandMaterial, Person, SERVICE, useBrand } from "./design-shared";
import { partOfKind, validHex } from "./design-system-model";
import { formatDate, formatDateTime, Panel, StatusBadge, Strip } from "./module-ui";
import { moduleKey, useModuleRecords } from "./store";
import { useContentOperations } from "./use-content-operations";
import { useDesignDemoTasks, useDesignOperations } from "./use-design-operations";
import type { ModuleRecord } from "./types";
import m from "./modules.module.css";
import d from "./design-workspace.module.css";

export { DesignOperationSection } from "./design-operation-view";
type Props = { client: OsClient; editable: boolean };

/** Compatibilidad: el Design System ahora vive en el área de Lineamientos. */
export function BrandSystemSection(props: Props) {
  return <DesignGuidelines {...props} />;
}

export function DesignRequestsSection({ client, editable, supportOnly = false }: Props & { supportOnly?: boolean }) {
  useDesignDemoTasks(client);
  const params = useSearchParams();
  const def = collectionDef(SERVICE, "trabajos")!;
  const manualDef = { ...def, fields: def.fields.filter((field) => field.key !== "contenidoId") };
  const { data } = useModuleRecords(client.slug, SERVICE, ["trabajos", "biblioteca"]);
  const content = useModuleRecords(client.slug, "contenidos", ["piezas"]);
  const { role } = useOsStore();
  const { syncDesignRequest } = useDesignOperations(client);
  const { tokens, records: system } = useBrand(client);
  const [creating, setCreating] = useState(false);
  const [assisted, setAssisted] = useState(false);
  const [newRequestId, setNewRequestId] = useState("");
  const [saveError, setSaveError] = useState("");
  const [open, setOpen] = useState<string | null>(() => params.get("registro"));
  const [editing, setEditing] = useState<ModuleRecord | null>(null);
  const [status, setStatus] = useState("Todos");
  const [origin, setOrigin] = useState("");
  const records = (data.trabajos || []).filter((record) => !supportOnly || record.values.contenidoId);
  const contentOf = (r: ModuleRecord) => content.data.piezas?.find((p) => p.id === r.values.contenidoId);
  const selected = records.find((r) => r.id === open);
  const profile = assistantProfile(SERVICE, "trabajos");
  const visible = records.filter((r) => (status === "Todos" || designStage(r, contentOf(r)) === status) && (!origin || (r.values.servicioOrigen || "interno") === origin));
  function beginRequest(withAssistant = false) {
    setNewRequestId(`MAR-${crypto.randomUUID()}`); setSaveError("");
    if (withAssistant) setAssisted(true); else setCreating(true);
  }
  function saveRequest(values: Record<string, string>, note = ""): ModuleRecord | null {
    if (!editable) return null;
    const at = new Date().toISOString(), actor = previewActor(role);
    const record: ModuleRecord = { id: newRequestId, client: client.slug, module: SERVICE, collection: "trabajos", source: "manual", user: actor, createdAt: at, updatedAt: at,
      values: { etapa: "Brief", estado: "Planificado", operacion: "Pendientes", servicioOrigen: "interno", prioridad: "Media", ...values },
      history: [...(note ? [{ at, user: actor, text: note }] : []), { at, user: actor, text: "Creó el pedido de diseño y su tarea" }] };
    if (record.values.estado !== "Planificado") record.values.operacion = "";
    if (syncDesignRequest(record, { persistRecord: true })) { setCreating(false); setAssisted(false); setOpen(record.id); return record; }
    setSaveError("No se guardó el pedido ni su tarea. Conservamos el formulario para que puedas reintentar.");
    return null;
  }
  return <BrandScope client={client}>
    <div className={d.stack}>
      {!supportOnly ? <DesignDemoBanner client={client} editable={editable} /> : null}
      <Panel title="Pedidos de diseño" id="design-requests" description="Bandeja única de Contenidos, Publicidad Digital, Soporte, Estrategia y solicitudes internas. Cada pedido crea una sola tarea para el responsable." actions={!supportOnly ? <>{profile ? <button className={buttonClass("secondary", true)} disabled={!editable} onClick={() => beginRequest(true)}>Pedido con asistente</button> : null}<button className={buttonClass("primary", true)} disabled={!editable} onClick={() => beginRequest()}>Nuevo pedido de diseño</button></> : null}>
        <div className={d.toolbar}>
          <div className={d.chipFilter} role="group" aria-label="Origen del pedido">{[{ id: "", label: "Todos" }, ...DESIGN_ORIGINS].map((o) => <button key={o.id || "all"} type="button" aria-pressed={origin === o.id} onClick={() => setOrigin(o.id)}>{o.label} <em>{records.filter((r) => !o.id || (r.values.servicioOrigen || "interno") === o.id).length}</em></button>)}</div>
          <label><span>Estado del pedido</span><select value={status} onChange={(e) => setStatus(e.target.value)}>{["Todos", ...DESIGN_STAGES].map((v) => <option key={v}>{v}</option>)}</select></label>
        </div>
        {visible.length ? <div className={d.requestList}>{visible.map((record) => {
          const versions = latestVersions((data.biblioteca || []).filter((v) => v.values.pedidoId === record.id && v.client === client.slug));
          const latest = versions[0];
          return <article key={record.id} className={d.requestRow}>
            <span className={d.rowThumb}><AssetPreview values={latest?.values ?? { nombre: record.values.nombre, categoria: designCategory(record.values.tipoPieza) }} t={tokens} /></span>
            <div className={d.requestMain}>
              <button className={m.rowButton} onClick={() => setOpen(record.id)}>{record.values.nombre}</button>
              <small>{originLabel(record.values.servicioOrigen)} · {designCategory(record.values.tipoPieza || "Otros")} · {record.values.canal || "Sin canal"} · {formatDate(record.values.fechaObjetivo)}</small>
              {record.values.contenidoId ? <Link className={m.rowLink} href={`${serviceHref(client.slug, "contenidos")}?seccion=piezas&registro=${encodeURIComponent(record.values.contenidoId)}`}>Abrir contenido de origen</Link> : null}
            </div>
            <Person name={record.values.responsable} />
            <span className={d.prio} data-prio={record.values.prioridad || "Media"}>{record.values.prioridad || "Media"}</span>
            <div className={d.chips}><StatusBadge status={designStage(record, contentOf(record))} />{record.source === "demo" ? <DemoTag /> : null}</div>
          </article>;
        })}</div> : <OSEmptyState icon="registro" title="Sin pedidos de diseño">Los contenidos aprobados generan su pedido acá. También podés cargar pedidos internos, de soporte, de estrategia o de publicidad.</OSEmptyState>}
      </Panel>
    </div>
    {creating ? <DesignRequestForm client={client} title="Nuevo pedido de diseño" system={system} error={saveError} initial={{ servicioOrigen: "interno", prioridad: "Media" }} onClose={() => setCreating(false)} onSubmit={(values) => { saveRequest(values); }} /> : null}
    {assisted && profile && editable ? <AssistedCreatePanel client={client} serviceId={SERVICE} def={manualDef} profile={profile} refs={data} titleKeyOf={() => "nombre"} initial={{ etapa: "Diseño", estado: "Planificado", servicioOrigen: "interno" }} onCreate={saveRequest} onClose={() => setAssisted(false)} existingHref={(id) => `${serviceHref(client.slug, SERVICE)}?seccion=trabajos&registro=${encodeURIComponent(id)}`} /> : null}
    {selected ? <DesignPieceDetail client={client} request={selected} editable={editable} content={contentOf(selected)} onClose={() => setOpen(null)} onEdit={() => { setEditing(selected); setOpen(null); }} /> : null}
    {editing ? <EditRequest client={client} request={editing} onClose={() => { setOpen(editing.id); setEditing(null); }} /> : null}
  </BrandScope>;
}

const SHORT_STAGE: Record<string, string> = { Pendientes: "Pend.", "En producción": "Prod.", "En revisión interna": "Rev.", Ajustes: "Ajus.", "Esperando aprobación": "Esp.", Aprobados: "Apr.", Entregados: "Entr." };
const LIBRARY_TABS = ["Piezas", "Recursos de marca", "Referencias", "Materiales de la Ficha"] as const;

function LibraryPieceDetail({ client, piece, all, requests, onClose, onNewVersion, editable }: { client: OsClient; piece: ModuleRecord; all: ModuleRecord[]; requests: ModuleRecord[]; onClose: () => void; onNewVersion: (r: ModuleRecord) => void; editable: boolean }) {
  const { tokens } = useBrand(client);
  const versions = versionsOf(all, piece);
  const latest = versions[0] ?? piece;
  const request = requests.find((r) => r.id === latest.values.pedidoId);
  const history = versions.flatMap((v) => v.history.map((h) => ({ ...h, version: v.values.version }))).sort((a, b) => b.at.localeCompare(a.at));
  return <OSSidePanel label={`Pieza ${latest.values.nombre}`} heading={<div className={d.detailHead}><h2 className={d.panelTitle}>{latest.values.nombre}</h2><div className={d.chips}><Badge tone="stone">{libraryCategory(latest)}</Badge><StatusBadge status={latest.values.estado} />{latest.source === "demo" ? <DemoTag /> : null}</div></div>} onClose={onClose} wide>
    <BrandScope client={client}>
      <div className={d.detailPreview}><AssetPreview values={latest.values} t={tokens} large /></div>
      <dl className={d.facts}>
        <div><dt>Versión vigente</dt><dd>Versión {latest.values.version}</dd></div><div><dt>Fecha</dt><dd>{formatDate(latest.values.fecha || latest.createdAt)}</dd></div>
        <div><dt>Responsable</dt><dd>{latest.values.responsable || latest.user}</dd></div><div><dt>Servicio de origen</dt><dd>{originLabel(latest.values.servicioOrigen)}</dd></div>
        {request ? <div><dt>Pedido</dt><dd><Link className={d.textLink} href={`${serviceHref(client.slug, SERVICE)}?seccion=trabajos&registro=${encodeURIComponent(request.id)}`}>{request.values.nombre}</Link></dd></div> : null}
        {latest.values.contenidoId ? <div><dt>Contenido</dt><dd><Link className={d.textLink} href={`${serviceHref(client.slug, "contenidos")}?seccion=piezas&registro=${encodeURIComponent(latest.values.contenidoId)}`}>{latest.values.contenidoId}</Link></dd></div> : null}
        {latest.values.campanaId || request?.values.campanaId ? <div><dt>Campaña</dt><dd>{latest.values.campanaId || request?.values.campanaId}</dd></div> : null}
        {latest.values.formato ? <div><dt>Formato</dt><dd>{latest.values.formato}</dd></div> : null}
      </dl>
      {latest.values.descripcion ? <p className={d.pre}>{latest.values.descripcion}</p> : null}
      <section className={d.block}><header><h3>Versiones ({versions.length})</h3>{editable ? <button className={buttonClass("secondary", true)} onClick={() => onNewVersion(latest)}>Subir nueva versión</button> : null}</header>
        <div className={d.versionStrip}>{versions.map((v) => <article key={v.id} className={d.versionItem}><AssetPreview values={v.values} t={tokens} /><div><strong>Versión {v.values.version}</strong><StatusBadge status={v.values.estado} /><small>{formatDate(v.values.fecha || v.createdAt)} · {v.values.responsable || v.user}</small>{safeDesignUrl(v.values.archivo) ? <a className={d.textLink} href={safeDesignUrl(v.values.archivo)} target="_blank" rel="noreferrer">Abrir archivo</a> : null}</div></article>)}</div>
      </section>
      <section className={d.block}><header><h3>Historial</h3></header><ul className={d.timeline}>{history.map((h, i) => <li key={i}><small>{formatDateTime(h.at)} · Versión {h.version}</small><span>{h.text} · {h.user}</span></li>)}</ul></section>
    </BrandScope>
  </OSSidePanel>;
}

export function DesignLibrarySection({ client, editable }: Props) {
  const { data } = useModuleRecords(client.slug, SERVICE, ["biblioteca", "trabajos", "sistema"]);
  const content = useModuleRecords(client.slug, "contenidos", ["piezas"]);
  const { transition } = useContentOperations(client);
  const { k, editable: canManageSources } = useKnowledge(client);
  const { role, notify } = useOsStore();
  const { tokens } = useBrand(client);
  const { update } = useModuleRecords(client.slug, SERVICE, ["biblioteca"]);
  const [tab, setTab] = useState<typeof LIBRARY_TABS[number]>("Piezas");
  const [editor, setEditor] = useState<ModuleRecord | "new" | null>(null);
  const [category, setCategory] = useState("Todas");
  const [state, setState] = useState<"todas" | "biblioteca" | "produccion">("todas");
  const [allVersions, setAllVersions] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<ModuleRecord | null>(null);
  const records = useMemo(() => data.biblioteca || [], [data.biblioteca]);
  const requests = data.trabajos || [];
  const latest = useMemo(() => latestVersions(records), [records]);
  const requestOf = (r: ModuleRecord) => requests.find((x) => x.id === r.values.pedidoId);
  const contentOf = (id?: string) => content.data.piezas?.find((p) => p.id === id);
  const inLibrary = (r: ModuleRecord) => inBrandLibrary(r, requestOf(r), contentOf(r.values.contenidoId));
  const base = (allVersions ? records : latest).filter((r) => state === "todas" || (state === "biblioteca" ? inLibrary(r) : !inLibrary(r))).filter((r) => !query || r.values.nombre?.toLowerCase().includes(query.toLowerCase()));
  const visible = base.filter((r) => category === "Todas" || libraryCategory(r) === category);
  const system = data.sistema || [];
  const brandMaterials = k.sources.filter((source) => sourceVisible(source, canManageSources) && ["Identidad de marca", "Logos", "Manuales", "Tipografías", "Colores", "Fotografías"].includes(materialOf(source).category));
  function save(values: Record<string, string>) {
    if (!editable) return false;
    try {
      const current = readLocalJson<ModuleRecord[]>(moduleKey(client.slug, SERVICE, "biblioteca"), records);
      const next = createDesignVersion(current, { client: client.slug, id: `PIE-${crypto.randomUUID()}`, values: values.contenidoId ? { ...values, estado: "Borrador" } : values, previousId: editor && editor !== "new" ? editor.id : undefined }, { actor: previewActor(role), at: new Date().toISOString() });
      if (!writeLocalJson(moduleKey(client.slug, SERVICE, "biblioteca"), next.records)) return false;
      setEditor(null); setOpen(null); notify(`Versión ${next.record.values.version} guardada`, "success"); return true;
    } catch (error) { notify(error instanceof Error ? error.message : "No se pudo guardar", "error"); return false; }
  }
  function deliver(record: ModuleRecord) {
    const piece = content.data.piezas?.find((p) => p.id === record.values.contenidoId);
    if (!piece) { notify("No se encontró el contenido de este cliente.", "error"); return; }
    if (!safeDesignUrl(record.values.archivo)) { notify("Para enviar al cliente, agregá un enlace https/http accesible a la pieza.", "error"); return; }
    if (transition(piece, "deliver-design", { patch: { archivoDiseno: record.values.archivo, version: record.values.version } })) {
      update("biblioteca", record.id, { estado: "En revisión" }, "Entregó a revisión interna del diseño");
    }
  }
  const resources = system.filter((r) => !["Moodboard", "Tono"].includes(r.values.tipo) && r.values.subtipo !== "Uso incorrecto" && (r.values.archivo || r.values.arte || r.values.tipo === "Color" || r.values.tipo === "Tipografía"));
  const references = system.filter((r) => r.values.tipo === "Moodboard");
  return <BrandScope client={client}>
    <div className={d.stack}>
      <DesignDemoBanner client={client} editable={editable} />
      <Panel title="Biblioteca de marca" id="design-library" description="Repositorio central: piezas producidas con sus versiones, recursos de marca, referencias y materiales del cliente. Cada pieza aparece una sola vez." actions={tab === "Piezas" ? <button className={buttonClass("primary", true)} disabled={!editable} onClick={() => setEditor("new")}>Agregar pieza a biblioteca</button> : undefined}>
        <div className={d.partNav} role="group" aria-label="Contenido de la biblioteca">{LIBRARY_TABS.map((item) => <button key={item} type="button" aria-pressed={tab === item} onClick={() => setTab(item)}>{item}<em>{item === "Piezas" ? latest.length : item === "Recursos de marca" ? resources.length : item === "Referencias" ? references.length : brandMaterials.length}</em></button>)}</div>
        {tab === "Piezas" ? <>
          <div className={d.toolbar}>
            <div className={d.segmented} role="group" aria-label="Estado en la biblioteca">{([["todas", "Todas"], ["biblioteca", "Aprobadas y entregadas"], ["produccion", "En producción"]] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={state === id} onClick={() => setState(id)}>{label}</button>)}</div>
            <label><span>Buscar</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre de la pieza" /></label>
            <label className={d.inlineCheck}><input type="checkbox" checked={allVersions} onChange={(e) => setAllVersions(e.target.checked)} /> Ver versiones anteriores</label>
          </div>
          <div className={d.chipFilter} role="group" aria-label="Categoría de pieza">{["Todas", ...DESIGN_CATEGORIES].map((c) => { const n = base.filter((r) => c === "Todas" || libraryCategory(r) === c).length; return <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} disabled={!n && c !== "Todas" && category !== c}>{c} <em>{n}</em></button>; })}</div>
          {visible.length ? <div className={d.libraryGrid}>{visible.map((record) => { const request = requestOf(record); return <article key={record.id} className={d.pieceCard} data-library={inLibrary(record) || undefined}>
            <button type="button" className={d.pieceOpen} onClick={() => setOpen(record)} aria-label={`Ver detalle de ${record.values.nombre}`}><AssetPreview values={record.values} t={tokens} /></button>
            <div className={d.tileBody}>
              <div className={d.tileHead}><h3>{record.values.nombre}</h3>{record.source === "demo" ? <DemoTag /> : null}</div>
              <div className={d.chips}><Badge tone="stone">Versión {record.values.version}</Badge><StatusBadge status={record.values.estado} />{inLibrary(record) ? <span className={d.inLib}>En biblioteca</span> : null}</div>
              <p className={d.meta}><span>{libraryCategory(record)}</span><span>{formatDate(record.values.fecha || record.createdAt.slice(0, 10))}</span><span>{record.values.responsable || record.user}</span><span>{originLabel(record.values.servicioOrigen)}</span></p>
              {request || record.values.contenidoId || record.values.campanaId ? <p className={d.relation}>{request ? <>Pedido: {request.values.nombre}</> : null}{record.values.contenidoId ? <> · Contenido {record.values.contenidoId}</> : null}{record.values.campanaId ? <> · Campaña {record.values.campanaId}</> : null}</p> : null}
              {record.values.descripcion ? <p>{record.values.descripcion}</p> : null}
              <div className={d.actions}>{safeDesignUrl(record.values.archivo) ? <a className={buttonClass("ghost", true)} href={safeDesignUrl(record.values.archivo)} target="_blank" rel="noreferrer">Abrir pieza</a> : null}
                {editable ? <button className={buttonClass("secondary", true)} onClick={() => setEditor(record)}>Nueva versión</button> : null}
                {editable && record.values.contenidoId && content.data.piezas?.some((p) => p.id === record.values.contenidoId && p.values.estado === "Producción de diseño") ? <button className={buttonClass("primary", true)} onClick={() => deliver(record)}>Entregar a revisión</button> : null}
              </div>
            </div>
          </article>; })}</div> : <OSEmptyState icon="registro" title="Sin piezas en esta categoría">Las piezas aprobadas o entregadas en la operación aparecen acá automáticamente. También podés cargar una entrega o plantilla.</OSEmptyState>}
        </> : tab === "Recursos de marca" ? (resources.length ? <div className={d.libraryGrid}>{resources.map((r) => <article key={r.id} className={d.pieceCard}><AssetPreview values={r.values} t={tokens} /><div className={d.tileBody}><div className={d.tileHead}><h3>{r.values.nombre}</h3>{r.source === "demo" ? <DemoTag /> : null}</div><p className={d.meta}><span>{r.values.tipo}</span>{r.values.subtipo || r.values.grupo ? <span>{r.values.subtipo || r.values.grupo}</span> : null}{validHex(r.values.valor) ? <span className={d.mono}>{r.values.valor}</span> : null}</p><div className={d.actions}>{safeDesignUrl(r.values.archivo) ? <a className={buttonClass("ghost", true)} href={safeDesignUrl(r.values.archivo)} target="_blank" rel="noreferrer">Descargar</a> : null}<Link className={d.textLink} href={`${serviceHref(client.slug, SERVICE)}?area=lineamientos&parte=${partOfKind(r.values.tipo)}`}>Ver en lineamientos</Link></div></div></article>)}</div> : <OSEmptyState icon="identidad" title="Sin recursos de marca">Los logos, colores y recursos del Design System aparecen acá.</OSEmptyState>)
          : tab === "Referencias" ? (references.length ? <div className={d.libraryGrid}>{references.map((r) => <article key={r.id} className={d.pieceCard}><AssetPreview values={r.values} t={tokens} /><div className={d.tileBody}><div className={d.tileHead}><h3>{r.values.nombre}</h3>{r.source === "demo" ? <DemoTag /> : null}</div><p className={d.meta}><span>{r.values.subtipo || "Referencia"}</span></p>{r.values.justificacion ? <p className={d.why}><strong>Por qué:</strong> {r.values.justificacion}</p> : null}<Link className={d.textLink} href={`${serviceHref(client.slug, SERVICE)}?area=lineamientos&parte=moodboard`}>Ver en el moodboard</Link></div></article>)}</div> : <OSEmptyState icon="idea" title="Sin referencias">Agregá referencias desde Lineamientos → Moodboard.</OSEmptyState>)
          : (brandMaterials.length ? <div className={d.libraryGrid}>{brandMaterials.map((source) => <LinkedBrandMaterial key={`${source.id}-${source.version}`} source={source} />)}</div> : <OSEmptyState icon="registro" title="Sin materiales en la Ficha">Los logos, manuales y fotografías se cargan una vez en la Ficha del cliente y se consultan acá sin duplicarlos.</OSEmptyState>)}
      </Panel>
    </div>
    {open ? <LibraryPieceDetail client={client} piece={open} all={records} requests={requests} editable={editable} onClose={() => setOpen(null)} onNewVersion={(r) => setEditor(r)} /> : null}
    {editor ? <AssetEditor key={editor === "new" ? "new" : editor.id} library t={tokens} initial={editor === "new" ? { fecha: new Date().toISOString().slice(0, 10) } : { ...editor.values, estado: "Borrador", archivo: "" }} requests={requests} onSave={save} onClose={() => setEditor(null)} /> : null}
  </BrandScope>;
}

export function BrandSummary({ client, editable }: Props) {
  useDesignDemoTasks(client);
  const { data } = useModuleRecords(client.slug, SERVICE, ["sistema", "biblioteca", "trabajos"]);
  const content = useModuleRecords(client.slug, "contenidos", ["piezas"]);
  const { tokens } = useBrand(client);
  const system = data.sistema || [], library = data.biblioteca || [], requests = data.trabajos || [];
  const stageOf = (r: ModuleRecord) => designStage(r, content.data.piezas?.find((p) => p.id === r.values.contenidoId));
  const open = requests.filter((r) => !["Aprobados", "Entregados"].includes(stageOf(r)));
  const logo = system.find((r) => r.values.tipo === "Logo" && r.values.subtipo === "Principal") ?? system.find((r) => r.values.tipo === "Logo");
  const colors = system.filter((r) => r.values.tipo === "Color" && validHex(r.values.valor));
  const recent = latestVersions(library).filter((r) => inBrandLibrary(r, requests.find((x) => x.id === r.values.pedidoId))).sort((a, b) => (b.values.fecha || "").localeCompare(a.values.fecha || "")).slice(0, 4);
  const base = serviceHref(client.slug, SERVICE);
  return <BrandScope client={client}>
    <div className={d.stack}>
      <DesignDemoBanner client={client} editable={editable} />
      <Strip label="Diseño de marca" items={[
        { label: "Recursos de marca", value: system.length, href: `${base}?area=lineamientos` },
        { label: "Pedidos abiertos", value: open.length, href: `?seccion=trabajos` },
        { label: "Versiones guardadas", value: library.length, href: `?seccion=biblioteca` },
      ]} />
      <div className={d.areas}>
        <Link href={`${base}?area=lineamientos`} className={d.area}>
          <span className={d.areaKey}>A</span><h2>Lineamientos del servicio</h2><p>Design System permanente: identidad, color, tipografía, recursos, componentes, tono y moodboard.</p>
          <div className={d.areaVisual}>{logo ? <div className={d.areaLogo}><AssetPreview values={logo.values} t={tokens} /></div> : null}<div className={d.areaSwatches}>{colors.slice(0, 6).map((c) => <i key={c.id} style={{ background: c.values.valor }} />)}</div></div>
        </Link>
        <Link href={`?seccion=operacion`} className={d.area}>
          <span className={d.areaKey}>B</span><h2>Operación mensual</h2><p>Pedidos, producción, revisión y entregas del mes, con una tarea por pieza.</p>
          <div className={d.areaBars} aria-label="Piezas por estado">{DESIGN_STAGES.map((s) => { const n = requests.filter((r) => stageOf(r) === s).length; return <div key={s} title={`${s}: ${n}`}><i style={{ height: `${Math.min(100, 12 + n * 22)}%` }} /><small>{n}</small><small className={d.barLabel}>{SHORT_STAGE[s]}</small></div>; })}</div>
        </Link>
        <Link href={`?seccion=biblioteca`} className={d.area}>
          <span className={d.areaKey}>C</span><h2>Biblioteca de marca</h2><p>Piezas aprobadas y entregadas, versiones, recursos y referencias.</p>
          <div className={d.areaThumbs}>{recent.map((r) => <div key={r.id}><AssetPreview values={r.values} t={tokens} /></div>)}</div>
        </Link>
      </div>
    </div>
  </BrandScope>;
}
