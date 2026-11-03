"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { OsClient } from "./os-data";
import { useOsStore } from "./os-store";
import { marketingDiscoverySections, totalDiscoveryFields } from "./marketing-discovery-schema";
import styles from "./marketing-discovery.module.css";

export function MarketingDiscovery({client}:{client:OsClient}) {
  const {discoveryOf,saveDiscovery}=useOsStore();
  const [fields,setFields]=useState<Record<string,string>>(()=>({...discoveryOf(client.slug)}));
  const [error,setError]=useState("");
  const [saved,setSaved]=useState(false);
  const complete=marketingDiscoverySections.reduce((count,section)=>count+section.fields.filter(f=>Boolean(fields[f.key]?.trim())).length,0);

  const update=(key:string,value:string)=>{setFields(p=>({...p,[key]:value}));setError("");setSaved(false);};
  const save=(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    if(!complete){setError("Completá al menos un campo del Marketing Discovery para guardar un borrador.");return;}
    if(!fields.sourceKind?.trim()||!fields.sourceReference?.trim()){setError("Indicá la procedencia y referencia de la información antes de guardar.");return;}
    saveDiscovery(client.slug,Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.trim()])));
    setSaved(true);setError("");
  };

  return <section className={styles.root} aria-labelledby="marketing-discovery-title">
    <header className={styles.header}>
      <div><span className={styles.kicker}>MODELO OFICIAL · MARKETING DISCOVERY</span><h2 id="marketing-discovery-title">Conocimiento estructurado del negocio</h2><p>Adoptamos la estructura de la plantilla de Avans. El análisis del negocio vive acá; el benchmark y el plan de marketing siguen en sus secciones propias, sin duplicar información.</p></div>
      <div className={styles.coverage}><strong>{complete} / {totalDiscoveryFields}</strong><span>Campos con borrador en esta sesión</span></div>
    </header>
    <div className={styles.chain}>
      <div><strong>01 · Análisis del negocio</strong><small>Esta sección · editable en demo</small></div>
      <Link href={`/v2/clientes/${client.slug}?tab=benchmark`}><strong>02 · Benchmark</strong><small>Competencia, observación y evidencia</small></Link>
      <Link href={`/v2/clientes/${client.slug}?tab=estrategia`}><strong>03 · Plan MKT</strong><small>Objetivos, canales y lineamientos</small></Link>
    </div>
    <div className={styles.info}><strong>Borrador interno, no validado.</strong> Los datos que escribas se conservan únicamente durante esta sesión del navegador. Todavía no hay sincronización con Drive, documentos ni transcripciones; las propuestas de IA deberán ser revisadas antes de cambiar conocimiento vigente. No ingreses información sensible en este demo.</div>
    <details className={styles.context}>
      <summary>Contexto general de la cuenta existente en el demo (no validado)</summary>
      <p>{client.context.text}</p>
      <p><strong>Objetivo del ejemplo:</strong> {client.context.objective}</p>
    </details>
    <form onSubmit={save}>
      <div className={styles.source}>
        <label>Origen del dato
          <select value={fields.sourceKind??""} onChange={e=>update("sourceKind",e.target.value)}>
            <option value="">Seleccionar procedencia…</option><option>Relevamiento manual</option><option>Documento de origen</option><option>Minuta de reunión</option><option>Hipótesis por validar</option>
          </select>
        </label>
        <label>Referencia / versión de la fuente
          <input value={fields.sourceReference??""} onChange={e=>update("sourceReference",e.target.value)} maxLength={240} placeholder="Ej.: acta de reunión, brief v2 o archivo de origen"/>
        </label>
      </div>
      {marketingDiscoverySections.map(section=><fieldset className={styles.section} key={section.id}>
        <legend>{section.title}</legend><p>{section.description}</p>
        <div className={styles.fields}>{section.fields.map(field=><label key={field.key}>
          <span>{field.label}</span><small>{field.prompt}</small>
          <textarea rows={3} maxLength={1200} value={fields[field.key]??""} onChange={e=>update(field.key,e.target.value)} placeholder="Pendiente de relevar / validar"/>
        </label>)}</div>
      </fieldset>)}
      {error&&<p role="alert" className={styles.error}>{error}</p>}
      {saved&&<p role="status" className={styles.success}>Se guardó el borrador sólo en la sesión actual. No se actualizó ninguna fuente externa.</p>}
      <div className={styles.footer}><button type="submit">Guardar borrador en esta demo</button><span>La conformidad del responsable y el versionado persistente requieren backend.</span></div>
    </form>
  </section>;
}
