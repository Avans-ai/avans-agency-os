"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { FileText, ImageIcon, Link2, Film, Download } from "lucide-react";
import type { OsClient } from "../os-data";
import { serviceCatalog } from "../os-data";
import { useOsStore } from "../os-store";
import { OSSidePanel } from "../overlays";
import { buttonClass } from "../ui";
import { useKnowledge } from "./use-knowledge";
import { sourceVisible, contentHash } from "./sources";
import { type KnowledgeSource, newId } from "./types";
import { ExternalLink } from "./shared-ui";
import { createMaterialSource, httpUrl, materialCategories, materialOf, saveMaterial, type BrandMaterial } from "./profile-model";
import { getProfileFile, putProfileFile, removeProfileFile, validateProfileFile } from "./profile-files";
import m from "./knowledge.module.css";
import p from "./profile.module.css";

export function ProfileChecks({ label, options, value, onChange }: { label: string; options: { id: string; label: string }[]; value: string[]; onChange: (ids: string[]) => void }) {
  return <fieldset className={p.checks}><legend>{label}</legend>{options.length ? options.map(option => <label key={option.id}><input type="checkbox" checked={value.includes(option.id)} onChange={e => onChange(e.target.checked ? [...value, option.id] : value.filter(id => id !== option.id))} />{option.label}</label>) : <small>Sin registros disponibles.</small>}</fieldset>;
}
export function MaterialPreview({ source }: { source: KnowledgeSource }) {
  const material = materialOf(source);
  const [local, setLocal] = useState("");
  const localFileId = material.file?.id;
  const isImage = /image\/(png|jpeg|webp|gif)/.test(material.file?.type || source.mimeType || "") || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(source.externalUrl);
  useEffect(() => {
    let alive = true, url = "";
    if (isImage && localFileId) getProfileFile(source.clientSlug, localFileId).then(blob => { if (alive && blob) { url = URL.createObjectURL(blob); setLocal(url); } }).catch(() => undefined);
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [source.clientSlug, localFileId, isImage]);
  const url = local || (isImage ? httpUrl(source.externalUrl) : null);
  return <div className={p.preview}>{url ? <Image src={url} alt={source.title} width={400} height={240} unoptimized /> : material.category === "Videos" ? <Film size={36} /> : material.category === "Fotografías" || material.category === "Logos" ? <ImageIcon size={36} /> : material.kind === "URL" ? <Link2 size={34} /> : <FileText size={36} />}</div>;
}
export function ProfileLibrary({ client }: { client: OsClient }) {
  const { k, editable, context } = useKnowledge(client);
  const { notify } = useOsStore();
  const [category, setCategory] = useState("Todas"), [query, setQuery] = useState("");
  const [editing, setEditing] = useState<KnowledgeSource | null>(null);
  const sources = k.sources.filter(s => sourceVisible(s, editable));
  const filtered = sources.filter(s => (category === "Todas" || materialOf(s).category === category) && `${s.title} ${materialOf(s).description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  // Qué está realmente disponible: archivo recuperable en este navegador, enlace externo o solo metadatos.
  const [available, setAvailable] = useState<Record<string, boolean>>({});
  const fileKeys = sources.map(source => materialOf(source).file?.id).filter(Boolean).join("|");
  useEffect(() => {
    let alive = true;
    const ids = fileKeys.split("|").filter(Boolean);
    Promise.all(ids.map(id => getProfileFile(client.slug, id).then(blob => [id, Boolean(blob)] as const).catch(() => [id, false] as const)))
      .then(entries => { if (alive) setAvailable(Object.fromEntries(entries)); });
    return () => { alive = false; };
  }, [client.slug, fileKeys]);
  function storage(source: KnowledgeSource) {
    const file = materialOf(source).file;
    if (file) return available[file.id] === undefined ? { label: "Verificando archivo…", tone: "pending" } : available[file.id] ? { label: "Archivo guardado · recuperable en este navegador", tone: "stored" } : { label: "Archivo no disponible en este navegador", tone: "missing" };
    if (source.externalUrl) return { label: "Enlace externo", tone: "link" };
    return { label: "Solo metadatos (sin archivo)", tone: "meta" };
  }
  async function download(source: KnowledgeSource) {
    try {
      const file = materialOf(source).file;
      if (!file) return;
      const blob = await getProfileFile(client.slug, file.id);
      if (!blob) throw new Error("El archivo no está en este navegador. Adjuntalo nuevamente desde Editar material.");
      const url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { notify(error instanceof Error ? error.message : "No se pudo descargar", "error"); }
  }
  return <section className={p.root} aria-label="Biblioteca de archivos">
    <div className={p.head}><div><h3>Biblioteca de archivos</h3><p>{sources.length} recursos · negocio, catálogos, marca, presentaciones, minutas, reportes y archivos de contenidos y pedidos</p></div>{editable && <button className={buttonClass("primary")} onClick={() => setEditing(createMaterialSource(client.slug, context()))}>Agregar archivo</button>}</div>
    <label className={m.field}><span>Buscar archivo</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Nombre o descripción" /></label>
    <div className={p.filters} aria-label="Categorías de materiales">{["Todas", ...materialCategories].map(c => <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>{c} <span>{c === "Todas" ? sources.length : sources.filter(s => materialOf(s).category === c).length}</span></button>)}</div>
    <div className={p.grid}>{filtered.map(source => { const material = materialOf(source); return <article className={p.card} key={source.id} aria-label={source.title}>
      <MaterialPreview source={source} /><div className={p.body}><div className={p.meta}><span>{material.category}</span><span>· {material.kind}</span>{source.demo && <span>· DEMO</span>}</div><span className={p.storage} data-tone={storage(source).tone}>{storage(source).label}</span><h4>{source.title || "Sin título"}</h4><p>{material.description || "Sin descripción"}</p><div className={p.meta}><span>{source.validationStatus}</span><span>· {source.owner || "Sin responsable"}</span><span>· {(source.occurredAt || source.importedAt).slice(0, 10)}</span></div>
      <div className={p.actions}>{material.productIds.map(id => <span className={p.tag} key={id}>{k.discovery.offerings.find(o => o.id === id)?.name || "Producto pendiente de revisión"}</span>)}{material.serviceIds.map(id => <span className={p.tag} key={id}>{serviceCatalog.find(s => s.id === id)?.label}</span>)}</div>
      <div className={p.actions}>{source.externalUrl && <ExternalLink url={source.externalUrl} label="Abrir enlace" />}{material.file && <button className={buttonClass("secondary", true)} onClick={() => download(source)}><Download size={14} /> Descargar</button>}{editable && <button className={buttonClass("secondary", true)} onClick={() => setEditing(source)}>Editar material</button>}</div></div>
    </article>; })}</div>
    {!filtered.length && <div className={p.empty}>No hay materiales en esta categoría. Agregá archivos, enlaces o texto y vinculalos a los productos que los utilizan.</div>}
    <p className={m.muted}>Los archivos adjuntos quedan en este navegador (máximo 20 MB por archivo). Los enlaces se abren en su plataforma de origen. Sin sincronización entre usuarios.</p>
    {editing && <MaterialEditor client={client} source={editing} onClose={() => setEditing(null)} />}
  </section>;
}
function MaterialEditor({ client, source, onClose }: { client: OsClient; source: KnowledgeSource; onClose: () => void }) {
  const { k, mutate } = useKnowledge(client), [revision] = useState(k.revision);
  const [draft, setDraft] = useState(source), [material, setMaterial] = useState(materialOf(source));
  const [file, setFile] = useState<File | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const update = (patch: Partial<KnowledgeSource>) => setDraft(value => ({ ...value, ...patch }));
  async function save() {
    setError(""); setBusy(true); let uploadedId = "";
    try {
      let next = draft, asset = material;
      if (file && material.kind === "Archivo") {
        validateProfileFile(file);
        const bytes = new Uint8Array(await file.arrayBuffer());
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
        uploadedId = newId();
        const meta = await putProfileFile(client.slug, uploadedId, file);
        asset = { ...asset, file: { id: uploadedId, ...meta } };
        next = { ...next, contentHash: hash, mimeType: file.type };
      } else if (material.kind === "Texto") next = { ...next, contentHash: await contentHash(next.rawText) };
      // Validate inside mutate against latest canonical state. A stale editor never overwrites another tab.
      const ok = mutate((state, ctx) => saveMaterial(state, next, asset, ctx), revision);
      if (!ok) { if (uploadedId) await removeProfileFile(client.slug, uploadedId); setError("No se guardó. Revisá el aviso y volvé a abrir el material si los datos cambiaron."); return; }
      onClose();
    } catch (error) {
      if (uploadedId) await removeProfileFile(client.slug, uploadedId).catch(() => undefined);
      setError(error instanceof Error ? error.message : "No se pudo guardar el material.");
    } finally { setBusy(false); }
  }
  return <OSSidePanel label="Ficha de material" heading={<h3>Ficha de material</h3>} onClose={() => { if (!busy) onClose(); }} wide footer={<button disabled={busy} className={buttonClass("primary")} onClick={save}>{busy ? "Guardando…" : "Guardar material"}</button>} persistentFooter>
    <div className={p.fields}><label className={`${m.field} ${p.full}`}><span>Nombre del material *</span><input value={draft.title} onChange={e => update({ title: e.target.value })} /></label>
    <label className={m.field}><span>Categoría</span><select aria-label="Categoría" value={material.category} onChange={e => setMaterial({ ...material, category: e.target.value as BrandMaterial["category"] })}>{materialCategories.map(c => <option key={c}>{c}</option>)}</select></label>
    <label className={m.field}><span>Tipo de material</span><select aria-label="Tipo de material" value={material.kind} onChange={e => setMaterial({ ...material, kind: e.target.value as BrandMaterial["kind"] })}>{["Archivo", "URL", "Texto"].map(c => <option key={c}>{c}</option>)}</select></label>
    {material.kind === "Archivo" && <label className={`${m.field} ${p.full}`}><span>Adjuntar archivo</span><input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} /><small>{material.file ? `Guardado: ${material.file.name}` : "Hasta 20 MB. Queda guardado en este navegador."}</small></label>}
    <label className={`${m.field} ${p.full}`}><span>{material.kind === "URL" ? "URL del material *" : "URL de origen (opcional)"}</span><input type="url" value={draft.externalUrl} onChange={e => update({ externalUrl: e.target.value })} placeholder="https://" /></label>
    {material.kind === "Texto" && <label className={`${m.field} ${p.full}`}><span>Texto del material *</span><textarea value={draft.rawText} onChange={e => update({ rawText: e.target.value })} /></label>}
    <label className={`${m.field} ${p.full}`}><span>Descripción</span><textarea value={material.description} onChange={e => setMaterial({ ...material, description: e.target.value })} /></label>
    <label className={m.field}><span>Fecha del material</span><input type="date" value={draft.occurredAt.slice(0, 10)} onChange={e => update({ occurredAt: e.target.value })} /></label><label className={m.field}><span>Responsable del material</span><input value={draft.owner} onChange={e => update({ owner: e.target.value })} /></label>
    <label className={m.field}><span>Estado del material</span><select aria-label="Estado del material" value={draft.validationStatus} onChange={e => update({ validationStatus: e.target.value as KnowledgeSource["validationStatus"] })}>{["Borrador", "Requiere revisión", "Validado"].map(c => <option key={c}>{c}</option>)}</select></label><label className={m.field}><span>Visibilidad</span><select aria-label="Visibilidad" value={draft.visibility} onChange={e => update({ visibility: e.target.value as KnowledgeSource["visibility"] })}><option value="team">Equipo</option><option value="managers">PM y Administración</option></select></label>
    <div className={p.full}><ProfileChecks label="Productos relacionados" value={material.productIds} options={k.discovery.offerings.map(o => ({ id: o.id, label: o.name }))} onChange={ids => setMaterial({ ...material, productIds: ids })} /><ProfileChecks label="Servicios que utilizan el material" value={material.serviceIds} options={serviceCatalog.map(s => ({ id: s.id, label: s.label }))} onChange={ids => setMaterial({ ...material, serviceIds: ids as BrandMaterial["serviceIds"] })} /></div></div>
    {error && <p role="alert" className={m.error}>{error}</p>}
  </OSSidePanel>;
}
