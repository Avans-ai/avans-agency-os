"use client";
import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { serviceCatalog, type OsClient } from "../os-data";
import { OSSidePanel } from "../overlays";
import { buttonClass } from "../ui";
import { useKnowledge } from "./use-knowledge";
import { newId } from "./types";
import type { Offering } from "../discovery/model";
import { sourceVisible } from "./sources";
import { ExternalLink } from "./shared-ui";
import { ProfileChecks, MaterialPreview } from "./profile-library";
import { httpUrl, materialOf, newOffering, offeringProfile, saveOffering, type OfferingProfile } from "./profile-model";
import p from "./profile.module.css";
import m from "./knowledge.module.css";

export function ProfileProducts({ client }: { client: OsClient }) {
  const { k, editable } = useKnowledge(client);
  const [query, setQuery] = useState(""), [editing, setEditing] = useState<Offering | null>(null);
  const products = k.discovery.offerings.filter(o => o.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <section className={p.root} aria-label="Productos y servicios del cliente"><div className={p.head}><div><h3>Productos y servicios</h3><p>Oferta del Discovery · materiales, públicos y módulos relacionados</p></div>{editable && <button className={buttonClass("primary")} onClick={() => setEditing(newOffering(newId()))}>Crear producto o servicio</button>}</div>
    <label className={m.field}><span>Buscar producto</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} /></label>
    <div className={p.grid}>{products.map(o => { const profile = offeringProfile(o), sources = k.sources.filter(s => sourceVisible(s, editable) && (o.sourceIds.includes(s.id) || materialOf(s).productIds.includes(o.id))); const segments = k.discovery.targetSegments.filter(s => s.offeringIds.includes(o.id)); const photo = sources.find(s => ["Fotografías", "Logos"].includes(materialOf(s).category)); const imageUrl = httpUrl(o.image); return <article key={o.id} className={p.card} aria-label={o.name}>{photo ? <MaterialPreview source={photo} /> : <div className={p.preview}>{imageUrl ? <Image src={imageUrl} alt={o.name} width={400} height={240} unoptimized /> : <><Package size={34} /><span>{o.type}</span></>}</div>}<div className={p.body}><div className={p.meta}>{profile.category || "Sin categoría"} · {o.status}{o.demo ? " · DEMO" : ""}</div><h4>{o.name}</h4><p>{o.description || "Sin descripción"}</p><span className={p.meta}>{k.discovery.businessUnits.find(u => u.id === o.businessUnitId)?.name || "Sin unidad de negocio"}</span>
      {profile.benefits && <p><strong>Beneficios:</strong> {profile.benefits}</p>}{o.differentiators && <p><strong>Diferenciales:</strong> {o.differentiators}</p>}{profile.audience && <p><strong>Público:</strong> {profile.audience}</p>}
      <div className={p.actions}>{profile.icpIds.map(id => <span className={p.tag} key={id}>{[...k.discovery.b2bIcps, ...k.discovery.b2cIcps].find(i => i.id === id)?.name || "ICP pendiente"}</span>)}{segments.map(s => <span className={p.tag} key={s.id}>{s.name}</span>)}{profile.serviceIds.map(id => <span key={id} className={p.tag}>{serviceCatalog.find(s => s.id === id)?.label}</span>)}</div>
      <details><summary>{sources.length} materiales y fuentes</summary>{sources.map(s => <p key={s.id}>{s.title} · {materialOf(s).category} {s.externalUrl && <ExternalLink url={s.externalUrl} label="Abrir" />}</p>)}{o.catalog && <p><ExternalLink url={o.catalog} label="Catálogo o brochure" /></p>}<Link href={`/v2/clientes/${client.slug}?view=documentos&archivos=biblioteca`}>Ver en Archivos y documentos</Link></details>
      {profile.externalId && <span className={p.meta}>{profile.externalProvider} · ID {profile.externalId}{profile.variantId ? ` · Variante ${profile.variantId}` : ""} · Sin sincronización</span>}
      {editable && <button className={buttonClass("secondary", true)} onClick={() => setEditing(o)}>Editar producto</button>}</div></article>; })}</div>
    {!products.length && <div className={p.empty}>Creá la ficha de un producto o servicio y vinculá sus materiales. Los registros se comparten con el Discovery.</div>}
    {editing && <ProductEditor client={client} offering={editing} onClose={() => setEditing(null)} />}
  </section>;
}
function ProductEditor({ client, offering, onClose }: { client: OsClient; offering: Offering; onClose: () => void }) {
  const { k, mutate, editable } = useKnowledge(client), [revision] = useState(k.revision);
  const [draft, setDraft] = useState(offering), [profile, setProfile] = useState(offeringProfile(offering));
  const [segments, setSegments] = useState(k.discovery.targetSegments.filter(s => s.offeringIds.includes(offering.id)).map(s => s.id));
  const [error, setError] = useState("");
  const sourceOptions = k.sources.filter(s => sourceVisible(s, editable)).map(s => ({ id: s.id, label: `${s.title} · ${materialOf(s).category}` }));
  function field(key: keyof Offering, label: string, long = false) { return <label className={m.field} key={key}><span>{label}</span>{long ? <textarea value={String(draft[key] || "")} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /> : <input value={String(draft[key] || "")} onChange={e => setDraft({ ...draft, [key]: e.target.value })} />}</label>; }
  function profileField(key: keyof OfferingProfile, label: string, long = false) { return <label className={m.field}><span>{label}</span>{long ? <textarea value={String(profile[key] || "")} onChange={e => setProfile({ ...profile, [key]: e.target.value })} /> : <input value={String(profile[key] || "")} onChange={e => setProfile({ ...profile, [key]: e.target.value })} />}</label>; }
  function save() { if (mutate((state, ctx) => saveOffering(state, { ...draft, profile }, segments, ctx), revision)) onClose(); else setError("No se guardó. Revisá el aviso y completá o corregí los datos indicados."); }
  return <OSSidePanel label="Ficha de producto" heading={<h3>Ficha de producto o servicio</h3>} onClose={onClose} wide footer={<button className={buttonClass("primary")} onClick={save}>Guardar producto</button>} persistentFooter>
    {field("name", "Nombre del producto *")}<div className={p.fields}><label className={m.field}><span>Tipo</span><select aria-label="Tipo" value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })}><option>Producto</option><option>Servicio</option></select></label><label className={m.field}><span>Unidad de negocio</span><select aria-label="Unidad de negocio" value={draft.businessUnitId} onChange={e => setDraft({ ...draft, businessUnitId: e.target.value })}><option value="">Sin asignar</option>{k.discovery.businessUnits.map(u => <option value={u.id} key={u.id}>{u.name}</option>)}</select></label></div>
    {profileField("category", "Categoría del producto")}{field("description", "Descripción del producto", true)}{profileField("benefits", "Beneficios", true)}{field("differentiators", "Diferenciales", true)}{profileField("audience", "Público", true)}
    <details className={p.group}><summary>Detalle comercial y evidencia</summary>{field("includes", "Qué incluye", true)}{field("delivery", "Cómo se entrega")}{field("problem", "Problema que resuelve", true)}{field("reasonToBelieve", "Reason to believe / evidencia", true)}{field("strengths", "Fortalezas", true)}{field("evidence", "Evidencia y referencias", true)}{field("owner", "Responsable del producto")}{field("notes", "Notas", true)}<label className={m.field}><span>Estado del producto</span><select aria-label="Estado del producto" value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as Offering["status"] })}><option>Borrador</option><option>Requiere revisión</option><option>Validado</option></select></label>{draft.demo && <label><input type="checkbox" checked={draft.demo} onChange={e => setDraft({ ...draft, demo: e.target.checked })} /> Registro de demostración</label>}</details>
    <details className={p.group} open><summary>Materiales, catálogo y fotografías</summary><ProfileChecks label="Materiales y fuentes del producto" options={sourceOptions} value={draft.sourceIds} onChange={ids => setDraft({ ...draft, sourceIds: ids })} />{field("catalog", "Catálogo o brochure (URL)")}{field("image", "Fotografía o referencia visual (URL)")}{field("materials", "Material comercial complementario", true)}</details>
    <details className={p.group}><summary>Segmentos, ICP y módulos de servicio</summary><ProfileChecks label="Segmentos del producto" options={k.discovery.targetSegments.map(s => ({ id: s.id, label: s.name }))} value={segments} onChange={setSegments} /><ProfileChecks label="ICP del producto" options={[...k.discovery.b2bIcps, ...k.discovery.b2cIcps].map(i => ({ id: i.id, label: i.name }))} value={profile.icpIds} onChange={ids => setProfile({ ...profile, icpIds: ids })} /><ProfileChecks label="Módulos que utilizan el producto" options={serviceCatalog.map(s => ({ id: s.id, label: s.label }))} value={profile.serviceIds} onChange={ids => setProfile({ ...profile, serviceIds: ids as OfferingProfile["serviceIds"] })} /></details>
    <details className={p.group}><summary>Referencia de e-commerce</summary><p className={m.muted}>Conservá los identificadores para vincular el producto sin duplicarlo cuando exista una conexión validada. No sincroniza datos.</p>{profileField("externalProvider", "Plataforma de origen")}{profileField("externalId", "Identificador externo")}{profileField("variantId", "Identificador de variante")}</details>
    {error && <p className={m.error} role="alert">{error}</p>}
  </OSSidePanel>;
}
