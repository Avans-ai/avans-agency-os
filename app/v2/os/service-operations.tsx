"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useOsStore } from "./os-store";
import type { OsClient } from "./os-data";
import { serviceProcesses, type WorkflowService } from "./service-process-data";
import styles from "./service-operations.module.css";

type StageStatus = "Pendiente" | "En preparación" | "En revisión" | "Validada en demo";
type StageEntry = { owner: string; reference: string; notes: string; checks: string[]; status: StageStatus };
const empty = (): StageEntry => ({ owner: "", reference: "", notes: "", checks: [], status: "Pendiente" });
const stages: StageStatus[] = ["Pendiente", "En preparación", "En revisión", "Validada en demo"];

export function ServiceOperations({ client, service }: { client: OsClient; service: WorkflowService }) {
  const { servicesOf } = useOsStore();
  const process = serviceProcesses[service];
  const contracted = servicesOf(client.slug).includes(service);
  const [selected, setSelected] = useState(0);
  const [entries, setEntries] = useState<Record<string, StageEntry>>({});
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const current = process.stages[selected];
  const entry = entries[current.id] ?? empty();
  const completed = confirmed.length;
  const previousComplete = selected === 0 || process.stages.slice(0, selected).every(s => confirmed.includes(s.id));

  function update(fields: Partial<StageEntry>) {
    if(fields.status === "Validada en demo" && (!previousComplete || !entry.owner.trim() || !entry.reference.trim() || current.checks.some(check => !entry.checks.includes(check)))) {
      setFeedback({type:"error", message:"No se puede validar: cerrá las etapas previas y completá responsable, evidencia y todos los controles."});
      return;
    }
    setConfirmed(list => list.filter(id => process.stages.findIndex(stage => stage.id === id) < selected));
    setEntries(p => {
      const old = p[current.id] ?? empty();
      // Editing an already validated stage invalidates its prior validation.
      const status = old.status === "Validada en demo" && (fields.owner !== undefined || fields.reference !== undefined || fields.checks !== undefined)
        ? "En revisión" : old.status;
      return { ...p, [current.id]: { ...old, ...fields, status: fields.status ?? status } };
    });
    setFeedback(null);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const stage = process.stages[selected];
    if (entry.status === "Pendiente" && !entry.owner.trim() && !entry.reference.trim() && !entry.notes.trim() && entry.checks.length === 0) {
      setFeedback({ type: "error", message: "No hay ningún avance para registrar. Agregá información o cambiá el estado a En preparación." });
      return;
    }
    if (entry.status === "Validada en demo") {
      if (!previousComplete) { setFeedback({ type: "error", message: "La etapa anterior sigue sin validar. No podés cerrar esta etapa fuera de secuencia." }); return; }
      if (!entry.owner.trim() || !entry.reference.trim() || stage.checks.some(c => !entry.checks.includes(c))) {
        setFeedback({ type: "error", message: "Para validar una etapa en la demo indicá responsable, referencia a la evidencia y completá todos los controles." }); return;
      }
      setConfirmed(prev => prev.includes(current.id) ? prev : [...prev,current.id]);
    } else {
      setConfirmed(prev => prev.filter(id => id !== current.id));
    }
    setFeedback({ type:"success", message:"Estado registrado únicamente en esta visita (demo). No se guardó ni se aprobó nada fuera de Avans OS." });
  }

  if (!contracted) {
    return <div className={styles.page}><p className={styles.eyebrow}>OPERACIONES · {client.name}</p><h1>{process.label}</h1><section className={styles.notice}><strong>Servicio no activo en esta cuenta (demo).</strong><p>El acceso al módulo se habilita desde la configuración de servicios contratados. Esta pantalla no reemplaza los permisos del backend que todavía faltan.</p><Link href={`/v2/clientes/${client.slug}?tab=servicios`}>Volver a servicios de la cuenta</Link></section></div>;
  }

  return <div className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="Ruta del módulo"><Link href="/v2/operaciones">Operaciones</Link><span>/</span><Link href="/v2/clientes">Clientes</Link><span>/</span><Link href={`/v2/clientes/${client.slug}?tab=servicios`}>{client.name}</Link><span>/</span><strong>{process.label}</strong></nav>
    <div className={styles.head}><p className={styles.eyebrow}>SERVICIO ACTIVO · PROPUESTA OPERATIVA</p><h1>{client.name} · {process.label}</h1><p>{process.scope}</p><div className={styles.summary}><div><strong>{completed} / {process.stages.length}</strong><span>Etapas validadas en demo</span></div><div><strong>{process.stages.length - completed}</strong><span>Sin validar</span></div><div><strong>Sin backend</strong><span>La información se pierde al recargar</span></div></div></div>
    <div className={styles.notice} role="note"><strong>{process.review}</strong><p>Base: {process.source}. El manual de procesos de Operaciones todavía no está disponible en esta conversación. No ejecutar ni comunicar este flujo como procedimiento aprobado.</p></div>
    <div className={styles.layout}>
      <nav className={styles.stageNav} aria-label={`Etapas de ${process.label}`}>
        {process.stages.map((step,index) => <button key={step.id} type="button" className={index===selected?styles.active:""} onClick={() => {setSelected(index);setFeedback(null);}} aria-current={index===selected?"step":undefined}>
          <span>{String(index+1).padStart(2,"0")}</span><strong>{step.title}</strong><small>{confirmed.includes(step.id) ? "Validada en demo" : entries[step.id]?.status === "Validada en demo" ? "Por registrar" : entries[step.id]?.status ?? "Pendiente"}</small>
        </button>)}
      </nav>
      <section className={styles.card} aria-labelledby="stage-title">
        <p className={styles.eyebrow}>ETAPA {String(selected+1).padStart(2,"0")} / {process.stages.length}</p>
        <h2 id="stage-title">{current.title}</h2><p>{current.goal}</p>
        <div className={styles.definition}><div><small>Responsabilidad propuesta</small><strong>{current.owner}</strong></div><div><small>Entregable esperado</small><strong>{current.deliverable}</strong></div></div>
        <form onSubmit={save}>
          <fieldset className={styles.checks}><legend>Controles previos a la validación</legend>{current.checks.map(check => <label key={check}><input type="checkbox" checked={entry.checks.includes(check)} onChange={e => update({ checks: e.target.checked ? [...entry.checks, check] : entry.checks.filter(x=>x!==check) })}/><span>{check}</span></label>)}</fieldset>
          <div className={styles.fields}>
            <label>Responsable de esta etapa<input value={entry.owner} maxLength={100} onChange={e=>update({ owner:e.target.value })} placeholder="Nombre o rol · demo"/></label>
            <label>Referencia o evidencia<input value={entry.reference} maxLength={240} onChange={e=>update({ reference:e.target.value })} placeholder="Documento, versión, acta o URL (no se envía)"/></label>
            <label className={styles.full}>Observaciones<textarea value={entry.notes} rows={3} maxLength={1000} onChange={e=>update({ notes:e.target.value })} placeholder="Cambios, dependencias y decisiones de ejemplo"/></label>
            <label>Estado dentro de esta demo<select value={entry.status} onChange={e=>update({ status:e.target.value as StageStatus })}>{stages.map(x=><option key={x}>{x}</option>)}</select></label>
          </div>
          <p className={styles.gate}><strong>Regla de control:</strong> {current.gate}</p>
          {feedback && <p className={feedback.type==="error"?styles.error:styles.success} role={feedback.type==="error"?"alert":"status"}>{feedback.message}</p>}
          <div className={styles.actions}><button type="submit" className={styles.primary}>Registrar avance en la demo</button>{selected < process.stages.length-1 && <button type="button" onClick={()=>{setSelected(i=>i+1);setFeedback(null);}}>Etapa siguiente</button>}</div>
        </form>
      </section>
    </div>
    <div className={styles.links}><Link href={`/v2/clientes/${client.slug}?tab=conocimiento`}>Discovery / conocimiento</Link><Link href={`/v2/clientes/${client.slug}?tab=estrategia`}>Estrategia y plan MKT</Link>{service==="contenidos" && <Link href={`/v2/clientes/${client.slug}/contenido`}>Espacio de producción anterior</Link>}<Link href={`/v2/clientes/${client.slug}?tab=servicios`}>Todos los servicios</Link></div>
  </div>;
}
