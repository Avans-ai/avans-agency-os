"use client";

/* Personas y Cultura · Catálogo de proveedores audiovisuales.
 * Lo carga la responsable del área (en la vista previa: rol Administrador). Audiovisuales
 * elige de acá el proveedor de cada jornada. Guardado en este navegador. */
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useOsStore } from "./os-store";
import { OSSidePanel } from "./overlays";
import { previewActor } from "./preview-roles";
import { JORNADA_TYPES, PROVIDERS_DEMO_LABEL, removeProvider, safeProviderUrl, setProviderActive, upsertProvider, type AudiovisualProvider, type JornadaType, type ProviderDraft, type ProviderLink } from "./providers-catalog";
import { assignedJornadasCount, canManageProviders, useProviderCatalog } from "./providers-store";
import { ProviderAvatar, ProviderDemoTag, ProviderTypes } from "./providers-ui";
import { buttonClass, OSSkeletonRows } from "./ui";
import p from "./providers-catalog.module.css";

const MAX_PHOTO = 600 * 1024;
const emptyDraft = (): ProviderDraft => ({ nombre: "", contacto: "", foto: "", links: [{ label: "Portfolio", url: "" }, { label: "Instagram", url: "" }], descripcion: "", tipos: [] });

export function ProvidersCatalogScreen() {
  const { role, notify, localHydrated } = useOsStore();
  const { catalog, providers, save, hydrated } = useProviderCatalog();
  const [filter, setFilter] = useState<JornadaType | "">("");
  const [editing, setEditing] = useState<AudiovisualProvider | "new" | null>(null);
  const [assigned, setAssigned] = useState<Record<string, number>>({});
  const canEdit = canManageProviders(role);
  const actor = previewActor(role);
  // El conteo lee las jornadas guardadas de todas las cuentas: se calcula en el navegador.
  useEffect(() => {
    if (!hydrated) return;
    const frame = window.requestAnimationFrame(() => setAssigned(Object.fromEntries(providers.map((item) => [item.id, assignedJornadasCount(item.id)]))));
    return () => window.cancelAnimationFrame(frame);
  }, [hydrated, providers]);
  const visible = providers.filter((item) => !filter || item.tipos.includes(filter));
  function toggle(item: AudiovisualProvider) {
    save(setProviderActive(catalog, item.id, !item.activo, { actor, at: new Date().toISOString() }));
    notify(item.activo ? `${item.nombre} quedó dado de baja. Sus jornadas se conservan.` : `${item.nombre} vuelve a estar disponible.`, "success");
  }
  function remove(item: AudiovisualProvider) {
    try { save(removeProvider(catalog, item.id, assignedJornadasCount(item.id))); notify(`${item.nombre} se eliminó del catálogo.`, "success"); }
    catch (error) { notify(error instanceof Error ? error.message : "No se pudo eliminar.", "error"); }
  }
  if (!hydrated || !localHydrated) return <div className={p.page}><OSSkeletonRows rows={4} label="Cargando el catálogo…" /></div>;
  return (
    <div className={p.page}>
      <header className={p.head}>
        <div>
          <span className={p.eyebrow}>Personas y Cultura · RRHH</span>
          <h1>Catálogo de proveedores</h1>
          <p>Proveedores audiovisuales con foto, redes o portfolio y para qué jornadas se recomiendan. Desde Audiovisuales se elige el proveedor de cada jornada. Se guarda en este navegador; los marcados «Demo» son {PROVIDERS_DEMO_LABEL.toLowerCase()} ficticios.</p>
        </div>
        <button type="button" className={buttonClass("primary", true)} disabled={!canEdit} onClick={() => setEditing("new")}>Nuevo proveedor</button>
      </header>
      {!canEdit ? <p className={p.note}>Lo carga la responsable de Personas y Cultura (en la vista previa, el rol Administrador). Tu rol puede consultarlo. Los permisos son visuales: todavía no se aplican en servidor.</p> : null}
      <div className={p.filters} role="group" aria-label="Filtrar por tipo de jornada">
        <button type="button" aria-pressed={!filter} onClick={() => setFilter("")}>Todos<em>{providers.length}</em></button>
        {JORNADA_TYPES.map((tipo) => <button key={tipo} type="button" aria-pressed={filter === tipo} onClick={() => setFilter(tipo)}>{tipo}<em>{providers.filter((item) => item.tipos.includes(tipo)).length}</em></button>)}
      </div>
      {visible.length ? (
        <ul className={p.grid} aria-label="Proveedores audiovisuales">
          {visible.map((item) => (
            <li key={item.id} className={p.card} data-inactive={!item.activo || undefined} aria-label={item.nombre}>
              <div className={p.cardTop}>
                <ProviderAvatar name={item.nombre} foto={item.foto} size={56} />
                <div><h2>{item.nombre}</h2><small>{item.contacto ? `Contacto: ${item.contacto}` : "Sin contacto cargado"}{item.activo ? "" : " · Dado de baja"}</small></div>
              </div>
              <ProviderTypes provider={item} />
              <p>{item.descripcion}</p>
              <div className={p.links}>{item.links.map((link) => <a key={link.url} href={safeProviderUrl(link.url)} target="_blank" rel="noreferrer">{link.label}</a>)}</div>
              <div className={p.stats}>{item.source === "demo" ? <ProviderDemoTag /> : <span>Cargado a mano</span>}<span>{assigned[item.id] ?? 0} {assigned[item.id] === 1 ? "jornada asignada" : "jornadas asignadas"}</span></div>
              {canEdit ? (
                <div className={p.cardActions}>
                  <button type="button" className={buttonClass("secondary", true)} onClick={() => setEditing(item)}>Editar<span className={p.srOnly}> {item.nombre}</span></button>
                  <button type="button" className={buttonClass("ghost")} onClick={() => toggle(item)}>{item.activo ? "Dar de baja" : "Reactivar"}</button>
                  {item.source === "manual" && !assigned[item.id] ? <button type="button" className={buttonClass("ghost")} onClick={() => remove(item)}>Eliminar</button> : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : <p className={p.note}>No hay proveedores para este tipo de jornada.</p>}
      <p className={p.note}>¿Buscás las jornadas? Se gestionan dentro de cada cliente, en <Link href="/v2/clientes/edinovo/audiovisuales?seccion=jornadas">Audiovisuales</Link>.</p>
      {editing ? <ProviderForm provider={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSave={(draft) => {
        try {
          const result = upsertProvider(catalog, draft, { actor, at: new Date().toISOString(), id: editing === "new" ? undefined : editing.id });
          save(result.catalog);
          notify(`${result.provider.nombre} guardado en el catálogo (este navegador).`, "success");
          setEditing(null);
          return "";
        } catch (error) { return error instanceof Error ? error.message : "No se pudo guardar."; }
      }} /> : null}
    </div>
  );
}

function ProviderForm({ provider, onClose, onSave }: { provider: AudiovisualProvider | null; onClose: () => void; onSave: (draft: ProviderDraft) => string }) {
  const [draft, setDraft] = useState<ProviderDraft>(() => provider ? { nombre: provider.nombre, contacto: provider.contacto, foto: provider.foto, links: [...provider.links, { label: "", url: "" }].slice(0, 4), descripcion: provider.descripcion, tipos: provider.tipos } : emptyDraft());
  const [error, setError] = useState("");
  function setLink(index: number, patch: Partial<ProviderLink>) {
    setDraft({ ...draft, links: draft.links.map((link, i) => i === index ? { ...link, ...patch } : link) });
  }
  function photo(file?: File) {
    setError("");
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return setError("La foto tiene que ser PNG, JPG, WEBP o GIF.");
    if (file.size > MAX_PHOTO) return setError("La foto supera los 600 KB. Usá una imagen más liviana.");
    const reader = new FileReader();
    reader.onload = () => setDraft((current) => ({ ...current, foto: String(reader.result || "") }));
    reader.readAsDataURL(file);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    setError(onSave({ ...draft, links: draft.links.filter((link) => link.url.trim()) }));
  }
  return (
    <OSSidePanel label={provider ? `Editar ${provider.nombre}` : "Nuevo proveedor"} heading={<h2 style={{ margin: 0 }}>{provider ? `Editar ${provider.nombre}` : "Nuevo proveedor"}</h2>} wide onClose={onClose} persistentFooter
      footer={<div className={p.cardActions} style={{ borderTop: 0, padding: 0 }}><button type="submit" form="provider-form" className={buttonClass("primary")}>Guardar proveedor</button><button type="button" className={buttonClass("ghost")} onClick={onClose}>Cancelar</button></div>}>
      <form id="provider-form" className={p.form} onSubmit={submit} noValidate>
        <div className={p.photoRow}>
          <ProviderAvatar name={draft.nombre || "Nuevo"} foto={draft.foto} size={64} />
          <label className={p.field}><span>Foto (opcional)</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => photo(event.target.files?.[0])} /><small>Imagen desde tu equipo, hasta 600 KB. Sin foto se usan las iniciales.</small></label>
        </div>
        {draft.foto ? <button type="button" className={buttonClass("ghost")} onClick={() => setDraft({ ...draft, foto: "" })}>Quitar foto</button> : null}
        <div className={p.fields}>
          <label className={p.field}><span>Nombre del proveedor</span><input required value={draft.nombre} onChange={(event) => setDraft({ ...draft, nombre: event.target.value })} /></label>
          <label className={p.field}><span>Contacto</span><input value={draft.contacto} onChange={(event) => setDraft({ ...draft, contacto: event.target.value })} /></label>
        </div>
        <fieldset className={p.fieldset}>
          <legend>Tipos de jornada recomendados</legend>
          <div className={p.checks}>{JORNADA_TYPES.map((tipo) => <label key={tipo}><input type="checkbox" checked={draft.tipos.includes(tipo)} onChange={(event) => setDraft({ ...draft, tipos: event.target.checked ? [...draft.tipos, tipo] : draft.tipos.filter((item) => item !== tipo) })} />{tipo}</label>)}</div>
        </fieldset>
        <label className={p.field}><span>Descripción</span><textarea required value={draft.descripcion} placeholder="Para qué jornadas se recomienda, equipo, tiempos de entrega" onChange={(event) => setDraft({ ...draft, descripcion: event.target.value })} /></label>
        <fieldset className={p.fieldset}>
          <legend>Redes sociales o portfolio</legend>
          <div style={{ display: "grid", gap: 8 }}>
            {draft.links.map((link, index) => (
              <div key={index} className={p.linkRow}>
                <label className={p.field}><span className={p.srOnly}>Nombre del enlace {index + 1}</span><input aria-label={`Nombre del enlace ${index + 1}`} value={link.label} placeholder="Portfolio" onChange={(event) => setLink(index, { label: event.target.value })} /></label>
                <label className={p.field}><span className={p.srOnly}>URL del enlace {index + 1}</span><input aria-label={`URL del enlace ${index + 1}`} type="url" value={link.url} placeholder="https://" onChange={(event) => setLink(index, { url: event.target.value })} /></label>
              </div>
            ))}
            {draft.links.length < 4 ? <button type="button" className={buttonClass("ghost")} onClick={() => setDraft({ ...draft, links: [...draft.links, { label: "", url: "" }] })}>Agregar enlace</button> : null}
          </div>
        </fieldset>
        {error ? <p className={p.error} role="alert">{error}</p> : null}
        {provider?.history.length ? <ul className={p.history} aria-label="Historial del proveedor">{provider.history.slice(0, 5).map((entry) => <li key={`${entry.at}-${entry.text}`}>{new Date(entry.at).toLocaleDateString("es-AR")} · {entry.actor}: {entry.text}</li>)}</ul> : null}
      </form>
    </OSSidePanel>
  );
}
