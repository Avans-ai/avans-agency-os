"use client";

/* Diseño de marca · piezas compartidas por las tres áreas (lineamientos, operación, biblioteca). */
import Link from "next/link";
import { Syne } from "next/font/google";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { OsClient } from "../os-data";
import { OSModal } from "../overlays";
import { Badge, buttonClass } from "../ui";
import { PEOPLE } from "./collections";
import { materialOf } from "../knowledge/profile-model";
import { getProfileFile } from "../knowledge/profile-files";
import type { KnowledgeSource } from "../knowledge/types";
import { ART_OPTIONS, artForCategory, BrandArt } from "./design-art";
import { ComponentPreview } from "./design-components";
import { DESIGN_CATEGORIES, DESIGN_KINDS, designCategory, designImage, validDesignValues } from "./design-model";
import { DESIGN_ORIGINS, LIBRARY_STATES } from "./design-operation";
import { brandTokens, fontStack, firstWeight, rgbLabel, subtypesFor, tokenStyle, validHex, type BrandTokens } from "./design-system-model";
import { useModuleRecords } from "./store";
import { useDesignOperations } from "./use-design-operations";
import { useOsStore } from "../os-store";
import type { ModuleRecord } from "./types";
import d from "./design-workspace.module.css";

export const SERVICE = "diseno-marca";
const syne = Syne({ subsets: ["latin", "latin-ext"], weight: ["400", "700"], display: "swap", variable: "--font-design-syne" });
export const brandFontClass = syne.variable;

/** Tokens del cliente y estilos CSS para renderizar visuales con su Design System. */
export function useBrand(client: OsClient) {
  const { data } = useModuleRecords(client.slug, SERVICE, ["sistema"]);
  const records = useMemo(() => data.sistema || [], [data.sistema]);
  const demo = records.some((record) => record.source === "demo");
  const tokens = useMemo(() => brandTokens(records, demo ? "ACA DEMO" : client.name), [client.name, demo, records]);
  return { records, tokens, style: tokenStyle(tokens) as React.CSSProperties };
}

/** Raíz visual de cada área: aplica la fuente Syne y los tokens del cliente. */
export function BrandScope({ client, children, className }: { client: OsClient; children: ReactNode; className?: string }) {
  const { style } = useBrand(client);
  return <div className={`${brandFontClass} ${d.scope} ${className || ""}`} style={style}>{children}</div>;
}

export function DemoTag() {
  return <span className={d.demoTag} title="Dato ficticio de demostración">Demo</span>;
}

/** Rótulo visible de datos ficticios, persistencia local y reinicio seguro. */
export function DesignDemoBanner({ client, editable }: { client: OsClient; editable: boolean }) {
  const { data } = useModuleRecords(client.slug, SERVICE, ["sistema", "trabajos", "biblioteca"]);
  const { resetDemo } = useDesignOperations(client);
  const [confirm, setConfirm] = useState(false);
  const demo = ["sistema", "trabajos", "biblioteca"].reduce((sum, key) => sum + (data[key] || []).filter((r) => r.source === "demo").length, 0);
  const manual = ["sistema", "trabajos", "biblioteca"].reduce((sum, key) => sum + (data[key] || []).filter((r) => r.source !== "demo").length, 0);
  const seeded = client.slug === "aca";
  if (!demo && !seeded) return <p className={d.storageNote}><span className={d.storageDot} aria-hidden="true" />Guardado en este navegador · sin sincronización con otros equipos</p>;
  return <section className={d.demoBanner} aria-label="Datos de demostración">
    <strong>DATOS DE DEMOSTRACIÓN</strong>
    <span>Escenario ficticio de la marca genérica «ACA DEMO». No es información real del cliente. {demo} registros de demostración · {manual} manuales · Guardado en este navegador.</span>
    {editable && seeded ? <button type="button" className={buttonClass("ghost", true)} onClick={() => setConfirm(true)}>Reiniciar datos de demostración</button> : null}
    {confirm ? <OSModal title="Reiniciar datos de demostración" titleId="design-demo-reset" onClose={() => setConfirm(false)} footer={<><button type="button" className={buttonClass("ghost")} onClick={() => setConfirm(false)}>Cancelar</button><button type="button" className={buttonClass("primary")} onClick={() => { if (resetDemo()) setConfirm(false); }}>Reiniciar demostración</button></>}>
      <p>Se reemplazan solo los registros marcados como demostración de Diseño de marca de {client.name}. Los {manual} registros manuales, sus versiones y las tareas creadas a mano se conservan.</p>
    </OSModal> : null}
  </section>;
}

export function LinkedBrandMaterial({ source }: { source: KnowledgeSource }) {
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
  return <article className={d.tile}>{imageUrl ? <div className={d.thumb}>
    {/* eslint-disable-next-line @next/next/no-img-element -- Blob stored in the local material library. */}
    <img src={imageUrl} alt={source.title} /></div> : <div className={d.thumb}><span className={d.muted}>{material.category}</span></div>}
    <div className={d.tileBody}><h3>{source.title}</h3><Badge tone="stone">{material.category}</Badge><Link className={d.textLink} href={`/v2/clientes/${source.clientSlug}?view=documentos&archivos=biblioteca`}>Abrir en Archivos y documentos</Link></div>
  </article>;
}

/** Miniatura de un recurso o pieza: imagen cargada, visual generado, color, tipografía o componente. */
export function AssetPreview({ values, t, large = false }: { values: Record<string, string>; t: BrandTokens; large?: boolean }) {
  const img = designImage(values.archivo || "");
  const label = values.nombre || values.tipo || "Visual";
  const cls = `${d.thumb} ${large ? d.thumbLarge : ""}`;
  if (img) return <div className={cls}>
    {/* eslint-disable-next-line @next/next/no-img-element -- Preview of user-provided local and external design assets. */}
    <img src={img} alt={label} />
  </div>;
  if (values.tipo === "Color" && validHex(values.valor)) return <div className={cls} style={{ background: values.valor }}><span className={d.colorLabel}>{values.valor.toLowerCase()}</span></div>;
  if (values.tipo === "Tipografía") return <div className={cls}><span className={d.sample} style={{ fontFamily: fontStack(values.valor), fontWeight: firstWeight(values.variante) }}>Aa<small>{values.valor}</small></span></div>;
  if (values.tipo === "Componente") return <div className={`${cls} ${d.thumbComponent}`}><ComponentPreview kind={values.subtipo || ""} t={t} name={values.nombre} /></div>;
  const art = values.arte || (values.categoria ? artForCategory(designCategory(values.categoria)) : "");
  if (art) return <div className={cls} data-generated={!values.arte || undefined}><BrandArt art={art} t={t} label={values.arte ? label : `Miniatura generada · ${label}`} title={values.nombre} variant={Number(values.version) || 1} /></div>;
  return <div className={cls}><span className={d.muted}>{values.tipo || "Recurso"} · sin miniatura</span></div>;
}

export function ColorFacts({ hex }: { hex: string }) {
  return <span className={d.mono}>{hex.toLowerCase()} · {rgbLabel(hex)}</span>;
}

/** Formulario corto por tipo de recurso. Conserva las etiquetas que usa el equipo desde la primera versión. */
export function AssetEditor({ initial, library, onSave, onClose, requests, t }: {
  initial: Record<string, string>; library: boolean; onSave: (values: Record<string, string>) => boolean; onClose: () => void; requests: ModuleRecord[]; t: BrandTokens;
}) {
  const [v, set] = useState<Record<string, string>>({ estado: "Borrador", tipo: "Logo", ...initial, categoria: initial.categoria ? designCategory(initial.categoria) : library ? "Redes sociales" : "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const change = (key: string, val: string) => set((before) => ({ ...before, [key]: val }));
  const subtypes = subtypesFor(v.tipo);
  function field(key: string, label: string, options?: readonly string[], wide = false, required = false) {
    return <label key={key} data-wide={wide}><span>{label}</span>{options
      ? <select aria-label={label} value={v[key] || ""} onChange={(e) => change(key, e.target.value)}><option value="">Elegir…</option>{options.map((o) => <option key={o}>{o}</option>)}</select>
      : wide ? <textarea rows={2} maxLength={3000} required={required} value={v[key] || ""} onChange={(e) => change(key, e.target.value)} />
      : <input required={key === "nombre" || required} value={v[key] || ""} maxLength={300} onChange={(e) => change(key, e.target.value)} />}</label>;
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
    const problem = validDesignValues(v);
    if (problem) { setError(problem); return; }
    if (library && !v.archivo) { setError("Agregá un archivo o enlace de la pieza."); return; }
    if (!library && v.tipo === "Moodboard" && !v.justificacion?.trim()) { setError("Explicá por qué esta referencia sirve a la marca."); return; }
    const clean = { ...v, ...(v.tipo === "Color" ? { valor: v.valor.toLowerCase(), grupo: v.grupo || v.subtipo || "" } : {}) };
    if (!onSave(clean)) setError("No se pudo guardar. Conservamos el formulario para reintentar.");
  }
  const showUses = ["Logo", "Color", "Tipografía", "Recurso gráfico", "Componente", "Aplicación"].includes(v.tipo);
  return <OSModal title={library ? initial.piezaId ? "Nueva versión de la pieza" : "Agregar pieza a biblioteca" : "Editar recurso de marca"} titleId="design-editor-title" onClose={onClose}
    footer={<><button type="button" className={buttonClass("ghost")} onClick={onClose}>Cancelar</button><button type="submit" form="design-resource-form" className={buttonClass("primary")} disabled={loading}>Guardar recurso</button></>}>
    <form id="design-resource-form" className={d.form} onSubmit={submit}>
      <div className={d.editorPreview}><AssetPreview values={v} t={t} /></div>
      {error ? <p role="alert" className={d.formError}>{error}</p> : null}
      <div className={d.fields}>
        {field("nombre", "Nombre")}
        {library ? field("categoria", "Categoría", DESIGN_CATEGORIES) : <label><span>Tipo</span><select aria-label="Tipo" value={v.tipo} onChange={(e) => set((before) => ({ ...before, tipo: e.target.value, subtipo: "" }))}>{DESIGN_KINDS.map((o) => <option key={o}>{o}</option>)}</select></label>}
        {!library && v.tipo === "Color" ? <><label><span>Color</span><input aria-label="Selector de color" type="color" value={validHex(v.valor) ? v.valor : "#ff897a"} onChange={(e) => change("valor", e.target.value)} /></label>{field("valor", "Hex")}{field("grupo", "Grupo", subtypes)}</> : null}
        {!library && v.tipo !== "Color" && subtypes.length ? field("subtipo", v.tipo === "Tipografía" ? "Jerarquía" : v.tipo === "Logo" ? "Variante" : "Clase", subtypes) : null}
        {!library && v.tipo === "Tipografía" ? <>{field("valor", "Familia tipográfica")}{field("variante", "Peso / variante")}{field("tamano", "Tamaño / interlineado")}<p className={d.muted} data-wide>Figtree y Syne están disponibles en la app; otras familias usan la fuente instalada en este equipo, sin descargas externas.</p></> : null}
        {!library ? field("funcion", v.tipo === "Tono" ? "Descripción o ejemplo" : "Función / jerarquía", undefined, v.tipo === "Tono") : null}
        {!library && v.tipo === "Moodboard" ? <>{field("descripcion", "Descripción", undefined, true)}{field("justificacion", "Justificación", undefined, true)}</> : null}
        {!library && showUses ? <>{field("usos", "Usos correctos", undefined, true)}{field("evitar", "Usos incorrectos", undefined, true)}</> : null}
        {!library && ["Logo", "Recurso gráfico", "Moodboard", "Aplicación"].includes(v.tipo) ? <label><span>Visual generado</span><select aria-label="Visual generado" value={v.arte || ""} onChange={(e) => change("arte", e.target.value)}>{ART_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label> : null}
        {v.tipo !== "Color" || library ? <>
          <label data-wide><span>Archivo o enlace</span><input type="url" value={v.archivo?.startsWith("data:") ? "" : v.archivo || ""} onChange={(e) => change("archivo", e.target.value)} placeholder={v.archivo?.startsWith("data:") ? "Imagen guardada; pegá una URL para reemplazarla" : "https://…"} /></label>
          <label data-wide><span>Cargar imagen</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => void upload(e.target.files?.[0])} /></label>
        </> : null}
        {library ? <>{field("responsable", "Responsable", PEOPLE)}<label><span>Fecha</span><input type="date" value={v.fecha || ""} onChange={(e) => change("fecha", e.target.value)} /></label>
          <label><span>Servicio de origen</span><select aria-label="Servicio de origen" value={v.servicioOrigen || ""} onChange={(e) => change("servicioOrigen", e.target.value)}><option value="">Elegir…</option>{[...DESIGN_ORIGINS, { id: "diseno-marca", label: "Diseño de marca" }].map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
          <label><span>Pedido relacionado</span><select aria-label="Pedido relacionado" value={v.pedidoId || ""} onChange={(e) => { const request = requests.find((r) => r.id === e.target.value); set((before) => ({ ...before, pedidoId: request?.id || "", contenidoId: request?.values.contenidoId || "", campanaId: request?.values.campanaId || "", servicioOrigen: request?.values.servicioOrigen || before.servicioOrigen || "" })); }}><option value="">Sin pedido</option>{requests.map((r) => <option key={r.id} value={r.id}>{r.values.nombre}</option>)}</select></label>{field("descripcion", "Descripción", undefined, true)}</> : null}
        {library && v.contenidoId ? <p className={d.muted} data-wide>El estado se actualiza desde el flujo de aprobación del contenido. Las nuevas versiones se guardan como borrador.</p> : field("estado", "Estado", library ? LIBRARY_STATES : ["Borrador", "Aprobado", "Requiere revisión"])}
      </div>
      <p className={d.muted}>Imágenes de hasta 1 MB guardadas en este navegador. Los archivos externos permanecen en su plataforma de origen.</p>
    </form>
  </OSModal>;
}

export function Person({ name }: { name?: string }) {
  const value = name || "Sin asignar";
  const initials = value.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <span className={d.person} title={value}><i aria-hidden="true">{initials}</i>{value}</span>;
}

export function useCanEditDesign(editable: boolean) {
  const { localHydrated } = useOsStore();
  return editable && localHydrated;
}
