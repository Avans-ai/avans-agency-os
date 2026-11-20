"use client";

import Link from "next/link";
import { useState } from "react";
import type { OsClient, ServiceId } from "../os-data";
import { scopeForService } from "../director-data";
import { canEditDiscovery } from "../discovery/permissions";
import { readLocalJson, useLocalStorageState, writeLocalJson } from "../local-persistence";
import { useOsStore } from "../os-store";
import { previewActor } from "../preview-roles";
import { resolveModules, useServiceModules } from "../service-modules";
import { useKnowledge } from "../knowledge/use-knowledge";
import { planBlueprints } from "../knowledge/blueprints";
import { Badge, buttonClass } from "../ui";
import { Panel, formatDateTime } from "./module-ui";
import d from "./design-workspace.module.css";
import m from "./modules.module.css";

const FIELDS = [
  ["procedures", "Procedimientos"], ["criteria", "Criterios de revisión"], ["restrictions", "Restricciones"],
  ["resources", "Recursos y accesos"], ["deliverables", "Entregables operativos"], ["indicators", "Indicadores de seguimiento"],
] as const;
type Guidelines = { values: Record<string, string>; history: { at: string; actor: string; text: string }[] };
const EMPTY: Guidelines = { values: {}, history: [] };

export function ServiceGuidelines({ client, serviceId, compact = false }: { client: OsClient; serviceId: ServiceId; compact?: boolean }) {
  const { k } = useKnowledge(client);
  const { role, servicesOf, notify } = useOsStore();
  const service = useServiceModules(client);
  const config = resolveModules(client, service.stored, servicesOf(client.slug))[serviceId];
  const scope = scopeForService(client, serviceId);
  const key = `client:${client.slug}:service-guidelines:${serviceId}`;
  const [saved] = useLocalStorageState<Guidelines>(key, EMPTY);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [baseline, setBaseline] = useState("");
  const editable = canEditDiscovery(role, client);
  const items = k.plan.modules[serviceId] || [];
  const objectives = (k.plan.modules.estrategia || []).filter((item) => item.section === "objectives");
  const defined = FIELDS.filter(([id]) => saved.values[id]);
  const links = <div className={d.guidelinesNav}>
    <Link className={buttonClass("ghost", true)} href={`/v2/clientes/${client.slug}?view=plan#plan-${serviceId}`}>Plan de Marketing</Link>
    <Link className={buttonClass("ghost", true)} href={`/v2/clientes/${client.slug}?view=ficha`}>Ficha del cliente</Link>
    <Link className={buttonClass("ghost", true)} href={`/v2/clientes/${client.slug}?view=ficha&ficha=glosario`}>Glosario</Link>
  </div>;
  if (compact) return <details className={d.context}><summary>Consultar lineamientos mientras trabajás</summary><p><strong>Alcance:</strong> {config?.scope || scope.summary}</p><p><strong>Responsable:</strong> {config?.leader || client.owner}</p>{defined.map(([id, label]) => <p key={id}><strong>{label}:</strong> {saved.values[id]}</p>)}{links}</details>;
  function save() {
    if (!editable || !draft) return;
    const fresh = readLocalJson<Guidelines>(key, EMPTY);
    if (JSON.stringify(fresh) !== baseline) { notify("Los lineamientos cambiaron en otra vista. Cerrá y volvé a editar.", "error"); return; }
    const next = { values: draft, history: [{ at: new Date().toISOString(), actor: previewActor(role), text: "Actualizó los procedimientos del servicio" }, ...fresh.history] };
    if (!writeLocalJson(key, next)) { notify("No se pudo guardar en este navegador.", "error"); return; }
    setDraft(null); notify("Lineamientos guardados", "success");
  }
  return <div className={m.stack}>
    <Panel title="Lineamientos del servicio" id="service-guidelines" description="Marco permanente del equipo, vinculado con el Plan de Marketing y la Ficha del cliente." actions={<Badge tone="stone">{config?.kind === "contracted" ? "Contratado" : "Demostración"}</Badge>}>
      <div className={d.plans}><article className={d.plan}><h3>Alcance contratado</h3><p>{config?.scope || scope.summary}</p><p><strong>Responsable:</strong> {config?.leader || client.owner}</p><p><strong>Entregables:</strong> {scope.deliverables.join(" · ")}</p></article>
        <article className={d.plan}><h3>Objetivos de la cuenta</h3>{objectives.length ? objectives.map((item) => <p key={item.id}>{String(item.values.statement || item.values.outcome || "")} {item.values.indicator ? `· ${item.values.indicator}` : ""}</p>) : <p>Los objetivos se completan en el Plan de Marketing.</p>}</article></div>{links}
    </Panel>
    <Panel title="Estrategia del servicio" id="service-strategy" description="Consulta directa del Plan vigente: no se copia en cada tarea."><div className={d.plans}>{items.length ? items.map((item) => {
      const bp = planBlueprints.find((b) => b.id === item.section);
      return <article className={d.plan} key={item.id}><h3>{bp?.label || item.section}</h3><Badge tone={item.status === "Validado" ? "cool" : "stone"}>{item.status}</Badge><dl>{bp?.fields.map((f) => item.values[f.key] ? <div key={f.key}><dt>{f.label}</dt><dd>{Array.isArray(item.values[f.key]) ? (item.values[f.key] as string[]).join(" · ") : String(item.values[f.key])}</dd></div> : null)}</dl></article>;
    }) : <p>La estrategia específica se completa desde Gestión y estrategia → Plan de Marketing.</p>}</div></Panel>
    <Panel title="Procedimientos y criterios" id="service-procedures" actions={editable && !draft ? <button className={buttonClass("secondary", true)} onClick={() => { setDraft({ ...saved.values }); setBaseline(JSON.stringify(saved)); }}>Editar procedimientos</button> : undefined}>
      <div className={m.panelBody}>{draft ? <><div className={d.fields}>{FIELDS.map(([id, label]) => <label key={id} data-wide><span>{label}</span><textarea rows={3} maxLength={3000} value={draft[id] || ""} onChange={(e) => setDraft({ ...draft, [id]: e.target.value })} /></label>)}</div><div className={d.actions}><button className={buttonClass("primary", true)} onClick={save}>Guardar procedimientos</button><button className={buttonClass("ghost", true)} onClick={() => setDraft(null)}>Cancelar</button></div></> : defined.length ? defined.map(([id, label]) => <div key={id}><strong>{label}</strong><p style={{ whiteSpace: "pre-wrap" }}>{saved.values[id]}</p></div>) : <p>Sin procedimientos adicionales. El PM puede completar los criterios que necesita el equipo.</p>}
        {saved.history.length ? <details><summary>Historial de lineamientos</summary>{saved.history.map((entry, i) => <p key={i}>{entry.text} · {entry.actor} · {formatDateTime(entry.at)}</p>)}</details> : null}
      </div>
    </Panel>
  </div>;
}
