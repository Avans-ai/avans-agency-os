"use client";

/* Materiales vinculados a un contenido desde el repositorio común del cliente
 * («Archivos y documentos»: fuentes de conocimiento y archivos locales en IndexedDB).
 * El contenido guarda solo referencias (`values.materialesVinculados`): nunca copia el archivo
 * ni su texto. Abrir un material lo consulta en su origen. */
import Link from "next/link";
import { useMemo, useState } from "react";
import type { OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { previewActor } from "../preview-roles";
import { OSModal } from "../overlays";
import { buttonClass } from "../ui";
import s from "../os.module.css";
import { getProfileFile } from "../knowledge/profile-files";
import { materialCategories, materialOf } from "../knowledge/profile-model";
import { sourceVisible } from "../knowledge/sources";
import type { KnowledgeSource } from "../knowledge/types";
import { useKnowledge } from "../knowledge/use-knowledge";
import { linkedMaterials, MATERIALS_FIELD, safeContentUrl, type LinkedMaterial } from "./content-workflow";
import { formatDateTime } from "./module-ui";
import { useModuleRecords } from "./store";
import type { ModuleRecord } from "./types";
import c from "./content.module.css";

export const documentsHref = (slug: string) => `/v2/clientes/${slug}?view=documentos`;

export function MaterialLinks({ client, record, canLink }: { client: OsClient; record: ModuleRecord; canLink: boolean }) {
  const { notify } = useOsStore();
  const { k, editable: canManage } = useKnowledge(client);
  const { update } = useModuleRecords(client.slug, "contenidos", ["piezas"]);
  const [picking, setPicking] = useState(false);
  const [reading, setReading] = useState<string | null>(null);
  const links = linkedMaterials(record.values);
  const sources = useMemo(() => k.sources.filter((source) => source.clientSlug === client.slug && sourceVisible(source, canManage)), [k.sources, client.slug, canManage]);
  function save(next: LinkedMaterial[], text: string) {
    if (update("piezas", record.id, { [MATERIALS_FIELD]: next.length ? JSON.stringify(next) : "" }, text)) { notify(text, "success"); return true; }
    notify("No se pudo guardar en este navegador", "error");
    return false;
  }
  async function open(source: KnowledgeSource) {
    const material = materialOf(source);
    try {
      if (!material.file) return;
      const blob = await getProfileFile(client.slug, material.file.id);
      if (!blob) throw new Error("El archivo no está en este navegador. Volvé a adjuntarlo en Archivos y documentos.");
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (win) win.opener = null;
      else { const link = document.createElement("a"); link.href = url; link.download = material.file.name; link.click(); }
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) { notify(error instanceof Error ? error.message : "No se pudo abrir el material", "error"); }
  }
  return <section className={c.materials} aria-label="Materiales vinculados">
    <div className={c.blockHead}><h3>Materiales vinculados</h3>{canLink ? <button type="button" className={buttonClass("secondary", true)} onClick={() => setPicking(true)}>Vincular material</button> : null}</div>
    {links.length ? <ul className={c.materialList}>{links.map((link) => {
      const source = sources.find((item) => item.id === link.id);
      if (!source) return <li key={link.id} data-missing="true"><span><strong>Material no disponible</strong><small>Ya no está en Archivos y documentos o no tenés acceso.</small></span>{canLink ? <button type="button" className={buttonClass("ghost", true)} onClick={() => save(links.filter((item) => item.id !== link.id), "Quitó un material vinculado")}>Quitar</button> : null}</li>;
      const material = materialOf(source);
      const url = safeContentUrl(source.externalUrl) ? source.externalUrl : "";
      return <li key={link.id}>
        <span><strong>{source.title || "Material sin título"}</strong><small>{material.category} · {material.file ? material.file.name : material.kind}{source.demo ? " · Demo" : ""} · vinculado por {link.by}</small></span>
        <span className={c.materialActions}>
          {material.file ? <button type="button" className={buttonClass("ghost", true)} onClick={() => open(source)}>Abrir<span className={c.srOnly}> {source.title}</span></button> : null}
          {url ? <a className={s.link} href={url} target="_blank" rel="noopener noreferrer">Abrir enlace<span className={c.srOnly}> de {source.title}</span></a> : null}
          {!material.file && !url && source.rawText ? <button type="button" className={buttonClass("ghost", true)} aria-expanded={reading === source.id} onClick={() => setReading(reading === source.id ? null : source.id)}>{reading === source.id ? "Ocultar texto" : "Ver texto"}</button> : null}
          {canLink ? <button type="button" className={buttonClass("ghost", true)} onClick={() => save(links.filter((item) => item.id !== link.id), `Quitó el material «${source.title}»`)}>Quitar<span className={c.srOnly}> {source.title}</span></button> : null}
        </span>
        {reading === source.id ? <p className={c.materialText}>{source.rawText.slice(0, 2000)}</p> : null}
      </li>;
    })}</ul> : <p className={c.muted}>Sin materiales vinculados. Elegilos del repositorio del cliente: no se copian, se consultan en su origen.</p>}
    <Link className={s.link} href={documentsHref(client.slug)}>Ir a Archivos y documentos</Link>
    {picking ? <MaterialPicker sources={sources} linked={links.map((item) => item.id)} onClose={() => setPicking(false)} onPick={(ids, by) => {
      const at = new Date().toISOString();
      const next = [...links, ...ids.filter((id) => !links.some((item) => item.id === id)).map((id) => ({ id, at, by }))];
      if (save(next, ids.length === 1 ? `Vinculó el material «${sources.find((item) => item.id === ids[0])?.title || ids[0]}»` : `Vinculó ${ids.length} materiales`)) setPicking(false);
    }} /> : null}
  </section>;
}

function MaterialPicker({ sources, linked, onPick, onClose }: { sources: KnowledgeSource[]; linked: string[]; onPick: (ids: string[], by: string) => void; onClose: () => void }) {
  const { role } = useOsStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [selected, setSelected] = useState<string[]>([]);
  const available = sources.filter((source) => !linked.includes(source.id));
  const shown = available.filter((source) => (category === "Todas" || materialOf(source).category === category) && `${source.title} ${materialOf(source).description}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")));
  const categories = Array.from(new Set(available.map((source) => materialOf(source).category))).sort((a, b) => materialCategories.indexOf(a) - materialCategories.indexOf(b));
  return <OSModal title="Vincular material" titleId="content-material-picker" onClose={onClose} footer={<><button type="button" className={buttonClass("ghost")} onClick={onClose}>Cancelar</button><button type="button" className={buttonClass("primary")} disabled={!selected.length} onClick={() => onPick(selected, previewActor(role))}>Vincular {selected.length ? `(${selected.length})` : ""}</button></>}>
    <div className={c.picker}>
      <p className={c.hint}>Materiales de Archivos y documentos del cliente. Se guarda solo la referencia.</p>
      <div className={c.pickerTools}><label>Buscar material<input className={s.input} type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label>Categoría<select className={s.input} value={category} onChange={(event) => setCategory(event.target.value)}><option>Todas</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label></div>
      {shown.length ? <ul className={c.pickerList}>{shown.map((source) => { const material = materialOf(source); return <li key={source.id}><label><input type="checkbox" checked={selected.includes(source.id)} onChange={(event) => setSelected((list) => event.target.checked ? [...list, source.id] : list.filter((id) => id !== source.id))} /><span><strong>{source.title || "Material sin título"}</strong><small>{material.category} · {material.file ? material.file.name : material.kind}{source.demo ? " · Demo" : ""}{source.importedAt ? ` · ${formatDateTime(source.importedAt)}` : ""}</small></span></label></li>; })}</ul> : <p className={c.muted}>{available.length ? "Ningún material coincide con la búsqueda." : "No hay más materiales disponibles. Cargalos en Archivos y documentos."}</p>}
    </div>
  </OSModal>;
}
