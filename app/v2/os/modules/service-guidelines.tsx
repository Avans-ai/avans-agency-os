"use client";

import Link from "next/link";
import type { OsClient, ServiceId } from "../os-data";
import { scopeForService } from "../director-data";
import { useLocalStorageState } from "../local-persistence";
import { useOsStore } from "../os-store";
import { resolveModules, useServiceModules } from "../service-modules";
import { useKnowledge } from "../knowledge/use-knowledge";
import { GENERAL_PLAN_ORDER, GENERAL_PLAN_SERVICE, planBlueprints } from "../knowledge/blueprints";
import type { KnowledgeItem } from "../knowledge/types";
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

function valueText(value: unknown) {
  if (Array.isArray(value)) return value.join(" · ");
  if (value === null || value === undefined) return "";
  return String(value);
}

/** Capítulo del Plan de marketing como referencia de un servicio (lectura; se edita en el Plan). */
export function PlanReference({ client, serviceId }: { client: OsClient; serviceId: ServiceId }) {
  const { k } = useKnowledge(client);
  const general = k.plan.modules[GENERAL_PLAN_SERVICE] || [];
  const items = serviceId === GENERAL_PLAN_SERVICE ? [] : k.plan.modules[serviceId] || [];
  const render = (item: KnowledgeItem) => {
    const bp = planBlueprints.find((b) => b.id === item.section);
    const fields = (bp?.fields ?? []).filter((f) => valueText(item.values[f.key]));
    return (
      <article className={d.plan} key={item.id}>
        <h3>{bp?.label || item.section}</h3>
        <Badge tone={item.status === "Validado" ? "cool" : item.status === "Requiere revisión" ? "error" : "stone"}>{item.status}{item.demo ? " · demo" : ""}</Badge>
        <dl>{fields.slice(0, 4).map((f) => <div key={f.key}><dt>{f.label}</dt><dd>{valueText(item.values[f.key])}</dd></div>)}</dl>
        {item.updatedAt ? <p className={m.muted}>Actualizado {formatDateTime(item.updatedAt)}{item.updatedBy ? ` · ${item.updatedBy}` : ""}</p> : null}
      </article>
    );
  };
  const ordered = GENERAL_PLAN_ORDER.flatMap((id) => general.filter((item) => item.section === id));
  return (
    <>
      <Panel title="Lineamientos generales de la cuenta" id="plan-general" description="Posicionamiento, storytelling, objetivos y ecosistema digital del Plan de marketing." actions={<Link className={buttonClass("ghost", true)} href={`/v2/clientes/${client.slug}?view=plan#plan-lineamientos-generales`}>Editar en el Plan</Link>}>
        <div className={d.plans}>{ordered.length ? ordered.map(render) : <p className={m.muted}>Sin lineamientos generales cargados en el Plan de marketing.</p>}</div>
      </Panel>
      {serviceId !== GENERAL_PLAN_SERVICE ? (
        <Panel title="Capítulo del servicio en el Plan" id="plan-service" description="Decisiones del Plan de marketing para este servicio." actions={<Link className={buttonClass("ghost", true)} href={`/v2/clientes/${client.slug}?view=plan#plan-${serviceId}`}>Editar en el Plan</Link>}>
          <div className={d.plans}>{items.length ? items.map(render) : <p className={m.muted}>Sin decisiones cargadas para este servicio en el Plan de marketing.</p>}</div>
        </Panel>
      ) : null}
    </>
  );
}

export function ServiceGuidelines({ client, serviceId, compact = false }: { client: OsClient; serviceId: ServiceId; compact?: boolean }) {
  const { servicesOf } = useOsStore();
  const service = useServiceModules(client);
  const config = resolveModules(client, service.stored, servicesOf(client.slug))[serviceId];
  const scope = scopeForService(client, serviceId);
  // Procedimientos guardados por la versión anterior: se conservan en modo lectura (no se editan aparte del Plan).
  const [saved] = useLocalStorageState<Guidelines>(`client:${client.slug}:service-guidelines:${serviceId}`, EMPTY);
  const defined = FIELDS.filter(([id]) => saved.values?.[id]);
  const links = <div className={d.guidelinesNav}>
    <Link className={buttonClass("ghost", true)} href={`/v2/clientes/${client.slug}?view=plan#plan-${serviceId}`}>Plan de marketing</Link>
    <Link className={buttonClass("ghost", true)} href={`/v2/clientes/${client.slug}?view=ficha`}>Ficha del cliente</Link>
  </div>;
  if (compact) return <details className={d.context}><summary>Consultar lineamientos mientras trabajás</summary><p><strong>Alcance:</strong> {config?.scope || scope.summary}</p><p><strong>Responsable:</strong> {config?.leader || "Pendiente de asignación"}</p>{links}</details>;
  return <div className={m.stack}>
    <Panel title="Alcance del servicio" id="service-guidelines" description="Lo contratado para este servicio. Los criterios estratégicos salen del Plan de marketing." actions={<Badge tone="stone">{config?.kind === "contracted" ? "Contratado" : "Demostración"}</Badge>}>
      <div className={d.plans}><article className={d.plan}><h3>Alcance</h3><p>{config?.scope || scope.summary}</p><p><strong>Responsable:</strong> {config?.leader || "Pendiente de asignación"}</p><p><strong>Entregables:</strong> {scope.deliverables.join(" · ")}</p></article></div>
    </Panel>
    <PlanReference client={client} serviceId={serviceId} />
    {defined.length ? (
      <Panel title="Notas operativas anteriores" id="service-procedures" description="Guardadas antes de que los lineamientos se leyeran del Plan. Se conservan sin cambios; para que rijan, cargalas en el Plan de marketing.">
        <div className={m.panelBody}>{defined.map(([id, label]) => <div key={id}><strong>{label}</strong><p style={{ whiteSpace: "pre-wrap" }}>{saved.values[id]}</p></div>)}
          {saved.history?.length ? <details><summary>Historial</summary>{saved.history.map((entry, i) => <p key={i}>{entry.text} · {entry.actor} · {formatDateTime(entry.at)}</p>)}</details> : null}
        </div>
      </Panel>
    ) : null}
  </div>;
}
