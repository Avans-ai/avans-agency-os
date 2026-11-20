"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { OSModal } from "../overlays";
import { Badge, buttonClass, OSEmptyState } from "../ui";
import { readLocalJson, writeLocalJson } from "../local-persistence";
import { previewActor } from "../preview-roles";
import { serviceHref } from "../service-workspace-data";
import { AssistedCreatePanel } from "../assistant/assisted-create";
import { assistantProfile } from "../assistant/profiles";
import { useKnowledge } from "../knowledge/use-knowledge";
import { planBlueprints } from "../knowledge/blueprints";
import { glossaryOf, materialOf } from "../knowledge/profile-model";
import { getProfileFile } from "../knowledge/profile-files";
import { sourceVisible } from "../knowledge/sources";
import type { KnowledgeSource } from "../knowledge/types";
import { RecordForm, RecordPanel } from "./collection-view";
import { collectionDef, PEOPLE } from "./collections";
import { designSystemCollection } from "./design-collections";
import { createDesignVersion, DESIGN_CATEGORIES, DESIGN_KINDS, designImage, safeDesignUrl, validDesignValues } from "./design-model";
import { formatDateTime, Panel, StatusBadge, Strip } from "./module-ui";
import { moduleKey, useModuleRecords } from "./store";
import { useContentOperations } from "./use-content-operations";
import { useDesignOperations } from "./use-design-operations";
import type { ModuleRecord } from "./types";
import m from "./modules.module.css";
import d from "./design-workspace.module.css";

const SERVICE = "diseno-marca";
type Props = { client: OsClient; editable: boolean };

function LinkedBrandMaterial({ source }: { source: KnowledgeSource }) {
  const material = materialOf(source);
  const [imageUrl, setImageUrl] = useState("");
  const fileId = material.file?.id;
  const imageFile = /^image\/(png|jpeg|webp|gif)$/.test(material.file?.type || "");
  useEffect(() => {
    if (!fileId || !imageFile || !source.clientSlug) return;
    let active = true, url = "";
    getProfileFile(source.clientSlug, fileId).then((blob) => {
      if (!active || !blob) return;
      url = URL.createObjectURL(blob); setImageUrl(url);
    }).catch(() => { /* The original remains available from the materials library. */ });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [fileId, imageFile, source.clientSlug]);
  return <article className={d.asset}>{imageUrl ? <div className={d.preview}>
    {/* eslint-disable-next-line @next/next/no-img-element -- Blob stored in the local material library. */}
    <img src={imageUrl} alt={source.title} /></div> : <AssetPreview values={{ nombre: source.title, tipo: material.category, archivo: source.externalUrl }} />}
    <div className={d.assetBody}><h3>{source.title}</h3><Badge tone="stone">{material.category}</Badge><p>{material.description}</p><Link className={buttonClass("ghost", true)} href={`/v2/clientes/${source.clientSlug}?view=ficha&ficha=materiales`}>Abrir en materiales</Link></div>
  </article>;
}

function AssetPreview({ values }: { values: Record<string, string> }) {
  const img = designImage(values.archivo || "");
  const color = /^#[a-f\d]{6}$/i.test(values.valor || "") ? values.valor : "#eeeeee";
  return <div className={d.preview} style={values.tipo === "Color" ? { background: color } : undefined}>
    {values.tipo === "Color" ? <span className={d.colorLabel}>{values.valor}</span>
      : values.tipo === "Tipografía" ? <span className={d.sample} style={{ fontFamily: /^[\w\s-]+$/.test(values.valor || "") ? `${values.valor}, sans-serif` : "sans-serif", fontWeight: /^\d{3}$/.test(values.variante || "") ? Number(values.variante) : 400 }}>Aa<br />{values.nombre}</span>
      : img ? /* eslint-disable-next-line @next/next/no-img-element -- Preview of user-provided local and external design assets. */
        <img src={img} alt={values.nombre} />
      : values.tipo === "Componente" ? <div className={d.component}><strong>{values.nombre}</strong><small>{values.funcion || "Estructura reutilizable"}</small><span>Aplicación de ejemplo</span></div>
      : <span className={d.muted}>{values.tipo || values.categoria || "Pieza"} · sin miniatura</span>}
  </div>;
}

function AssetEditor({ initial, library, onSave, onClose, requests }: {
  initial: Record<string, string>; library: boolean; onSave: (values: Record<string, string>) => boolean; onClose: () => void; requests: ModuleRecord[];
}) {
  const [v, set] = useState({ estado: "Borrador", tipo: "Logo", categoria: "Redes", ...initial });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const value = v as Record<string, string>;
  const change = (key: string, val: string) => set((before) => ({ ...before, [key]: val }));
  function field(key: string, label: string, options?: readonly string[], wide = false) {
    return <label key={key} data-wide={wide}><span>{label}</span>{options
      ? <select value={value[key] || ""} onChange={(e) => change(key, e.target.value)}><option value="">Elegir…</option>{options.map((o) => <option key={o}>{o}</option>)}</select>
      : wide ? <textarea rows={3} maxLength={3000} value={value[key] || ""} onChange={(e) => change(key, e.target.value)} />
      : <input required={key === "nombre"} value={value[key] || ""} maxLength={300} onChange={(e) => change(key, e.target.value)} />}</label>;
  }
  async function upload(file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type) || file.size > 1_000_000) {
      setError("Usá una imagen PNG, JPG, WebP o GIF de hasta 1 MB. Para otros archivos, agregá su enlace."); return;
    }
    setLoading(true); setError("");
    const reader = new FileReader();
    reader.onload = () => { change("archivo", String(reader.result)); setLoading(false); };
    reader.onerror = () => { setError("No se pudo leer la imagen."); setLoading(false); };
    reader.readAsDataURL(file);
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    const problem = validDesignValues(value);
    if (problem) { setError(problem); return; }
    if (library && !value.archivo) { setError("Agregá un archivo o enlace de la pieza."); return; }
    if (!onSave(value)) setError("No se pudo guardar. Conservamos el formulario para reintentar.");
  }
  return <OSModal title={library ? initial.piezaId ? "Nueva versión de la pieza" : "Agregar pieza a biblioteca" : "Editar recurso de marca"} titleId="design-editor-title" onClose={onClose}
    footer={<><button type="button" className={buttonClass("ghost")} onClick={onClose}>Cancelar</button><button type="submit" form="design-resource-form" className={buttonClass("primary")} disabled={loading}>Guardar recurso</button></>}>
    <form id="design-resource-form" className={d.form} onSubmit={submit}>
      <AssetPreview values={value} />
      {error ? <p role="alert">{error}</p> : null}
      <div className={d.fields}>
        {field("nombre", "Nombre")}
        {library ? field("categoria", "Categoría", DESIGN_CATEGORIES) : field("tipo", "Tipo", DESIGN_KINDS)}
        {!library && value.tipo === "Color" ? <><label><span>Color</span><input aria-label="Selector de color" type="color" value={/^#[a-f\d]{6}$/i.test(value.valor || "") ? value.valor : "#ff897a"} onChange={(e) => change("valor", e.target.value)} /></label>{field("valor", "Hex")}</> : null}
        {!library && value.tipo === "Tipografía" ? <>{field("valor", "Familia tipográfica")}{field("variante", "Peso / variante")}<p className={d.muted} data-wide>La muestra utiliza la fuente si está instalada en este equipo; no descarga archivos tipográficos externos.</p></> : null}
        {!library ? <>{field("funcion", "Función / jerarquía")}{value.tipo !== "Tipografía" ? field("variante", "Variante / versión") : null}{field("usos", "Usos correctos", undefined, true)}{field("evitar", "Usos incorrectos", undefined, true)}</> : null}
        <label data-wide><span>Archivo o enlace</span><input type="url" value={value.archivo?.startsWith("data:") ? "" : value.archivo || ""} onChange={(e) => change("archivo", e.target.value)} placeholder={value.archivo?.startsWith("data:") ? "Imagen guardada; pegá una URL para reemplazarla" : "https://…"} /></label>
        <label data-wide><span>Cargar imagen</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => void upload(e.target.files?.[0])} /></label>
        {library ? <>{field("responsable", "Responsable", PEOPLE)}<label><span>Fecha</span><input type="date" value={value.fecha || ""} onChange={(e) => change("fecha", e.target.value)} /></label>{field("servicioOrigen", "Servicio de origen", ["contenidos", "publicidad-digital", "diseno-marca", "soporte", "interno"])}
          <label><span>Pedido relacionado</span><select value={value.pedidoId || ""} onChange={(e) => { const request = requests.find((r) => r.id === e.target.value); set((before) => ({ ...before, pedidoId: request?.id || "", contenidoId: request?.values.contenidoId || "", servicioOrigen: request?.values.servicioOrigen || "" })); }}><option value="">Sin pedido</option>{requests.map((r) => <option key={r.id} value={r.id}>{r.values.nombre}</option>)}</select></label>{field("descripcion", "Descripción", undefined, true)}</> : null}
        {library && value.contenidoId ? <p className={d.muted} data-wide>El estado se actualiza desde el flujo de aprobación del contenido. Las nuevas versiones se guardan como borrador.</p> : field("estado", "Estado", library ? ["Borrador", "En revisión", "Aprobado", "Cambios pedidos"] : ["Borrador", "Aprobado", "Requiere revisión"])}
      </div>
      <p className={d.muted}>Imágenes de hasta 1 MB guardadas en este navegador. Los archivos externos permanecen en su plataforma de origen.</p>
    </form>
  </OSModal>;
}

export function BrandSystemSection({ client, editable }: Props) {
  const { data, create, update } = useModuleRecords(client.slug, SERVICE, ["sistema"]);
  const { k, editable: canManageSources } = useKnowledge(client);
  const [kind, setKind] = useState("Todos");
  const [editor, setEditor] = useState<ModuleRecord | "new" | null>(null);
  const records = data.sistema || [];
  const visualPlan = (k.plan.modules[SERVICE] || []).filter((item) => ["colors", "visualSystem", "lookFeel", "visualDirection"].includes(item.section));
  const glossary = glossaryOf(k);
  const brandMaterials = k.sources.filter((source) => sourceVisible(source, canManageSources) && ["Identidad de marca", "Logos", "Manuales", "Tipografías", "Colores", "Fotografías"].includes(materialOf(source).category));
  const visible = records.filter((r) => kind === "Todos" || r.values.tipo === kind);
  function save(values: Record<string, string>) {
    const ok = editor === "new" ? !!create(designSystemCollection, values) : !!editor && update("sistema", editor.id, values, "Actualizó el recurso de marca");
    if (ok) setEditor(null); return ok;
  }
  return <div className={m.stack}>
    <Panel title="Design System" id="brand-system" description="Logos, variantes, colores, tipografías y recursos reutilizables." actions={<button className={buttonClass("primary", true)} disabled={!editable} onClick={() => setEditor("new")}>Agregar recurso de marca</button>}>
      <div className={d.subnav}>{["Todos", ...DESIGN_KINDS].map((item) => <button key={item} className={buttonClass(kind === item ? "dark" : "ghost", true)} aria-pressed={kind === item} onClick={() => setKind(item)}>{item}</button>)}</div>
      {visible.length ? <div className={d.gallery}>{visible.map((record) => <article className={d.asset} key={record.id}>
        <AssetPreview values={record.values} /><div className={d.assetBody}><h3>{record.values.nombre}</h3><StatusBadge status={record.values.estado} /><p>{record.values.funcion} {record.values.variante}</p>{record.values.usos ? <p><strong>Usar:</strong> {record.values.usos}</p> : null}{record.values.evitar ? <p><strong>Evitar:</strong> {record.values.evitar}</p> : null}
          <div className={d.actions}>{safeDesignUrl(record.values.archivo) ? <a className={buttonClass("ghost", true)} href={safeDesignUrl(record.values.archivo)} target="_blank" rel="noreferrer">Abrir recurso</a> : null}{editable ? <button className={buttonClass("secondary", true)} onClick={() => setEditor(record)}>Editar recurso</button> : null}</div>
          <details><summary>Historial</summary>{record.history.map((entry, index) => <p key={index}>{entry.text} · {entry.user} · {formatDateTime(entry.at)}</p>)}</details>
        </div></article>)}</div> : <OSEmptyState icon="registro" title="Sin recursos en esta categoría">Agregá los recursos aprobados de la marca para que el equipo pueda usarlos.</OSEmptyState>}
    </Panel>
    {visualPlan.length ? <Panel title="Definiciones del Plan de Marketing" id="brand-plan" description="Consulta de la fuente estratégica vigente; se edita en Gestión y estrategia."><div className={d.plans}>{visualPlan.map((item) => {
      const bp = planBlueprints.find((b) => b.id === item.section);
      return <article key={item.id} className={d.plan}><h3>{bp?.label || item.section}</h3>{item.section === "colors" && /^#[a-f\d]{6}$/i.test(String(item.values.hex)) ? <AssetPreview values={{ tipo: "Color", valor: String(item.values.hex) }} /> : null}<dl>{bp?.fields.map((f) => item.values[f.key] ? <div key={f.key}><dt>{f.label}</dt><dd>{String(item.values[f.key])}</dd></div> : null)}</dl></article>;
    })}</div></Panel> : null}
    {brandMaterials.length ? <Panel title="Materiales de identidad del cliente" id="brand-materials" description="Recursos de la biblioteca central de la Ficha, disponibles sin duplicarlos."><div className={d.gallery}>{brandMaterials.map((source) => <LinkedBrandMaterial key={`${source.id}-${source.version}`} source={source} />)}</div></Panel> : null}
    <div className={d.context}><strong>Tono y glosario de marca</strong>{glossary.tone ? <p><strong>Tono:</strong> {glossary.tone}</p> : <p>Consultá la voz, las palabras permitidas y las que debemos evitar en la Ficha del cliente.</p>}{glossary.use.length ? <p><strong>Usar:</strong> {glossary.use.join(" · ")}</p> : null}{glossary.avoid.length ? <p><strong>Evitar:</strong> {glossary.avoid.join(" · ")}</p> : null}{glossary.approvedMessages.length ? <p><strong>Mensajes aprobados:</strong> {glossary.approvedMessages.join(" · ")}</p> : null}<Link className={buttonClass("secondary", true)} href={`/v2/clientes/${client.slug}?view=ficha&ficha=glosario`}>Abrir glosario de marca</Link></div>
    {editor ? <AssetEditor key={editor === "new" ? "new" : editor.id} library={false} initial={editor === "new" ? {} : editor.values} requests={[]} onSave={save} onClose={() => setEditor(null)} /> : null}
  </div>;
}

export function DesignRequestsSection({ client, editable, supportOnly = false }: Props & { supportOnly?: boolean }) {
  const params = useSearchParams();
  const def = collectionDef(SERVICE, "trabajos")!;
  const manualDef = { ...def, fields: def.fields.filter((field) => field.key !== "contenidoId") };
  const { data } = useModuleRecords(client.slug, SERVICE, ["trabajos"]);
  const { role } = useOsStore();
  const { syncDesignRequest } = useDesignOperations(client);
  const [creating, setCreating] = useState(false);
  const [assisted, setAssisted] = useState(false);
  const [newRequestId, setNewRequestId] = useState("");
  const [saveError, setSaveError] = useState("");
  const [open, setOpen] = useState<string | null>(() => params.get("registro"));
  const [status, setStatus] = useState("Todos");
  const records = (data.trabajos || []).filter((record) => !supportOnly || record.values.contenidoId);
  const selected = records.find((r) => r.id === open);
  const profile = assistantProfile(SERVICE, "trabajos");
  function beginRequest(withAssistant = false) {
    setNewRequestId(`MAR-${crypto.randomUUID()}`); setSaveError("");
    if (withAssistant) setAssisted(true); else setCreating(true);
  }
  function saveRequest(values: Record<string, string>, note = ""): ModuleRecord | null {
    if (!editable) return null;
    const at = new Date().toISOString(), actor = previewActor(role);
    const record: ModuleRecord = { id: newRequestId, client: client.slug, module: SERVICE, collection: "trabajos", source: "manual", user: actor, createdAt: at, updatedAt: at, values, history: [...(note ? [{ at, user: actor, text: note }] : []), { at, user: actor, text: "Creó el pedido de diseño y su tarea" }] };
    if (syncDesignRequest(record, { persistRecord: true })) { setCreating(false); setAssisted(false); setOpen(record.id); return record; }
    setSaveError("No se guardó el pedido ni su tarea. Conservamos el formulario para que puedas reintentar.");
    return null;
  }
  return <Panel title="Pedidos de diseño" id="design-requests" description="Cada pedido conserva su brief, recursos, historial y tarea vinculada." actions={!supportOnly ? <>{profile ? <button className={buttonClass("secondary", true)} disabled={!editable} onClick={() => beginRequest(true)}>Pedido con asistente</button> : null}<button className={buttonClass("primary", true)} disabled={!editable} onClick={() => beginRequest()}>Nuevo pedido de diseño</button></> : null}>
    <div className={m.toolbar}><label className={m.filter}><span>Estado del pedido</span><select value={status} onChange={(e) => setStatus(e.target.value)}>{["Todos", "Planificado", "En curso", "Bloqueado", "En aprobación", "Cambios pedidos", "Aprobado", "Cerrado"].map((v) => <option key={v}>{v}</option>)}</select></label></div>
    {records.length ? <div className={m.rows}>{records.filter((r) => status === "Todos" || r.values.estado === status).map((record) => <article key={record.id} className={m.row}>
      <div><button className={m.rowButton} onClick={() => setOpen(record.id)}>{record.values.nombre}</button><small>{record.values.servicioOrigen || "Interno"} · {record.values.responsable || "Sin asignar"} · {record.values.fechaObjetivo || "Sin fecha"}</small>{record.values.contenidoId ? <Link className={m.rowLink} href={`${serviceHref(client.slug, "contenidos")}?seccion=piezas&registro=${encodeURIComponent(record.values.contenidoId)}`}>Abrir contenido de origen</Link> : null}</div><StatusBadge status={record.values.estado} />
    </article>)}</div> : <OSEmptyState icon="registro" title="Sin pedidos de diseño">Los contenidos aprobados generan su pedido acá. También podés cargar pedidos internos o de soporte.</OSEmptyState>}
    {creating ? <OSModal title="Nuevo pedido de diseño" titleId="design-request-title" onClose={() => setCreating(false)} footer={<><button className={buttonClass("ghost")} onClick={() => setCreating(false)}>Cancelar</button><button type="submit" form="design-request-form" className={buttonClass("primary")}>Crear pedido y tarea</button></>}>
      {saveError ? <p role="alert">{saveError}</p> : null}
      <RecordForm def={manualDef} initial={{ etapa: "Diseño", estado: "Planificado", servicioOrigen: "interno" }} refs={data} titleKeyOf={() => "nombre"} formId="design-request-form" onSubmit={saveRequest} />
    </OSModal> : null}
    {assisted && profile && editable ? <AssistedCreatePanel client={client} serviceId={SERVICE} def={manualDef} profile={profile} refs={data} titleKeyOf={() => "nombre"} initial={{ etapa: "Diseño", estado: "Planificado", servicioOrigen: "interno" }} onCreate={saveRequest} onClose={() => setAssisted(false)} existingHref={(id) => `${serviceHref(client.slug, SERVICE)}?seccion=trabajos&registro=${encodeURIComponent(id)}`} /> : null}
    {selected ? <RecordPanel client={client} serviceId={SERVICE} def={selected.values.contenidoId ? def : manualDef} record={selected} taskRecordId={selected.values.contenidoId || undefined} refs={data} titleKeyOf={() => "nombre"} editable={editable && !selected.values.contenidoId} onClose={() => setOpen(null)} onSave={(values, text) => {
      const at = new Date().toISOString(), actor = previewActor(role);
      return syncDesignRequest({ ...selected, updatedAt: at, user: actor, values: { ...selected.values, ...values }, history: [{ at, user: actor, text }, ...selected.history] }, { persistRecord: true, expectedUpdatedAt: selected.updatedAt });
    }} /> : null}
  </Panel>;
}

export function DesignLibrarySection({ client, editable }: Props) {
  const { data, update } = useModuleRecords(client.slug, SERVICE, ["biblioteca", "trabajos"]);
  const content = useModuleRecords(client.slug, "contenidos", ["piezas"]);
  const { transition } = useContentOperations(client);
  const { role, notify } = useOsStore();
  const [editor, setEditor] = useState<ModuleRecord | "new" | null>(null);
  const [category, setCategory] = useState("Todas");
  const [allVersions, setAllVersions] = useState(false);
  const records = data.biblioteca || [];
  const latest = records.filter((record) => !records.some((other) => other.values.piezaId === record.values.piezaId && Number(other.values.version) > Number(record.values.version)));
  const visible = (allVersions ? records : latest).filter((r) => category === "Todas" || r.values.categoria === category);
  function save(values: Record<string, string>) {
    if (!editable) return false;
    try {
      const current = readLocalJson<ModuleRecord[]>(moduleKey(client.slug, SERVICE, "biblioteca"), records);
      const next = createDesignVersion(current, { client: client.slug, id: `PIE-${crypto.randomUUID()}`, values: values.contenidoId ? { ...values, estado: "Borrador" } : values, previousId: editor && editor !== "new" ? editor.id : undefined }, { actor: previewActor(role), at: new Date().toISOString() });
      if (!writeLocalJson(moduleKey(client.slug, SERVICE, "biblioteca"), next.records)) return false;
      setEditor(null); notify(`Versión ${next.record.values.version} guardada`, "success"); return true;
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
  return <Panel title="Biblioteca de piezas" id="design-library" description="Cada nueva versión conserva el archivo y los datos de las anteriores." actions={<button className={buttonClass("primary", true)} disabled={!editable} onClick={() => setEditor("new")}>Agregar pieza a biblioteca</button>}>
    <div className={m.toolbar}><label className={m.filter}><span>Categoría de pieza</span><select value={category} onChange={(e) => setCategory(e.target.value)}>{["Todas", ...DESIGN_CATEGORIES].map((c) => <option key={c}>{c}</option>)}</select></label><label className={d.muted}><input type="checkbox" checked={allVersions} onChange={(e) => setAllVersions(e.target.checked)} /> Ver versiones anteriores</label></div>
    {visible.length ? <div className={d.gallery}>{visible.map((record) => <article key={record.id} className={d.asset}><AssetPreview values={record.values} /><div className={d.assetBody}>
      <h3>{record.values.nombre}</h3><div className={d.actions}><Badge tone="stone">Versión {record.values.version}</Badge><StatusBadge status={record.values.estado} /></div><p>{record.values.responsable || record.user} · {record.values.fecha || record.createdAt.slice(0, 10)}</p><p>{record.values.servicioOrigen} {record.values.contenidoId}</p><p>{record.values.descripcion}</p>
      <div className={d.actions}>{safeDesignUrl(record.values.archivo) ? <a className={buttonClass("ghost", true)} href={safeDesignUrl(record.values.archivo)} target="_blank" rel="noreferrer">Abrir pieza</a> : null}
        {editable ? <button className={buttonClass("secondary", true)} onClick={() => setEditor(record)}>Nueva versión</button> : null}
        {editable && record.values.contenidoId && content.data.piezas?.some((p) => p.id === record.values.contenidoId && p.values.estado === "Producción de diseño") ? <button className={buttonClass("primary", true)} onClick={() => deliver(record)}>Entregar a revisión</button> : null}
      </div><details><summary>Historial de la versión</summary>{record.history.map((entry, index) => <p key={index}>{entry.text} · {entry.user} · {formatDateTime(entry.at)}</p>)}</details>
    </div></article>)}</div> : <OSEmptyState icon="registro" title="Sin piezas en esta categoría">Cargá una entrega o plantilla y vinculala al pedido que la originó.</OSEmptyState>}
    {editor ? <AssetEditor key={editor === "new" ? "new" : editor.id} library initial={editor === "new" ? { fecha: new Date().toISOString().slice(0, 10) } : { ...editor.values, estado: "Borrador" }} requests={data.trabajos || []} onSave={save} onClose={() => setEditor(null)} /> : null}
  </Panel>;
}

export function BrandSummary({ client, editable }: Props) {
  const { data } = useModuleRecords(client.slug, SERVICE, ["sistema", "biblioteca", "trabajos"]);
  return <div className={m.stack}><Strip label="Diseño de marca" items={[
    { label: "Recursos de marca", value: data.sistema?.length || 0, href: `?seccion=sistema` },
    { label: "Pedidos abiertos", value: data.trabajos?.filter((r) => !["Aprobado", "Cerrado"].includes(r.values.estado)).length || 0, href: `?seccion=trabajos` },
    { label: "Versiones guardadas", value: data.biblioteca?.length || 0, href: `?seccion=biblioteca` },
  ]} /><BrandSystemSection client={client} editable={editable} /></div>;
}
