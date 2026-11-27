"use client";

/* «Lineamientos de Contenidos» (área de lineamientos del servicio): VISTA DE CONSULTA.
 * No confundir con el «Plan de contenidos» por período (content-plan.tsx, operación mensual).
 * Trae la parte de Contenidos del Plan de Marketing (Gestión y estrategia) y los do's & don'ts
 * de Contenidos, más el glosario de marca de la Ficha. No se edita acá: el plan se edita en el
 * Plan de Marketing. Los lineamientos editoriales que se guardaron antes en esta pestaña
 * (`client:<slug>:service-guidelines:contenidos`) se conservan como «Notas operativas anteriores»
 * (solo lectura) y se pueden enviar a Documentos para proponerlos al Plan. */

import Link from "next/link";
import { useMemo } from "react";
import { canEditDiscovery } from "../discovery/permissions";
import { planBlueprints } from "../knowledge/blueprints";
import { glossaryOf } from "../knowledge/profile-model";
import { newSource } from "../knowledge/sources";
import type { KnowledgeItem, KnowledgeState } from "../knowledge/types";
import { useKnowledge } from "../knowledge/use-knowledge";
import { useLocalStorageState } from "../local-persistence";
import type { OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { Badge, buttonClass } from "../ui";
import { CONTENT_DEMO_GUIDELINES, CONTENT_DEMO_LABEL } from "./content-demo";
import { GUIDELINE_AI_PENDING, GUIDELINE_SOURCE_LABEL, type GuidelineSources } from "./content-guideline-check";
import { formatDateTime, Panel } from "./module-ui";
import { ServiceGuidelines } from "./service-guidelines";
import m from "./modules.module.css";
import c from "./content.module.css";

type Guidelines = { values: Record<string, string>; history: { at: string; actor: string; text: string }[] };
const EMPTY: Guidelines = { values: {}, history: [] };
export const EDITORIAL_FIELDS = [
  ["objetivos", "Objetivos"], ["estrategia", "Estrategia"], ["tono", "Tono y estilo"], ["canales", "Canales"], ["frecuencia", "Frecuencia"], ["formatos", "Formatos"],
  ["dos", "Do's"], ["donts", "Don'ts"], ["kpis", "KPIs"], ["restricciones", "Restricciones"], ["referencias", "Referencias"],
] as const;
const key = (slug: string) => `client:${slug}:service-guidelines:contenidos`;
const lines = (value = "") => value.split(/\n|·/).map((item) => item.trim()).filter(Boolean);
export const planHref = (slug: string) => `/v2/clientes/${slug}?view=plan#plan-contenidos`;
const NOTES_ORIGIN = "content-guidelines-notes";

/** Notas editoriales guardadas antes (se conservan) o, si no hay, la referencia de demostración rotulada. */
export function useContentGuidelines(client: OsClient) {
  const [saved] = useLocalStorageState<Guidelines>(key(client.slug), EMPTY);
  const own = EDITORIAL_FIELDS.some(([id]) => saved.values?.[id]);
  const demo = CONTENT_DEMO_GUIDELINES[client.slug];
  return { values: own ? saved.values : demo || saved.values || {}, demo: !own && Boolean(demo), own, saved };
}

export type ContentRule = { id: string; type: "Siempre" | "Nunca"; rule: string; basis: string; examples: string; status: string };
export function contentRules(k: KnowledgeState): ContentRule[] {
  return (k.plan.modules.contenidos || []).filter((item) => item.section === "contentRules").map((item): ContentRule => ({
    id: item.id, type: item.values.type === "Nunca" ? "Nunca" : "Siempre", rule: String(item.values.rule || ""), basis: String(item.values.basis || ""), examples: String(item.values.examples || ""), status: item.status,
  })).filter((item) => item.rule.trim());
}

/** Fuentes de la revisión de lineamientos sin IA: glosario de la Ficha + don'ts del Plan + notas anteriores guardadas. */
export function useGuidelineCheckSources(client: OsClient): GuidelineSources {
  const { k } = useKnowledge(client);
  const notes = useContentGuidelines(client);
  return useMemo(() => {
    const glossary = glossaryOf(k);
    return {
      avoid: glossary.avoid,
      use: glossary.use,
      donts: [
        ...contentRules(k).filter((rule) => rule.type === "Nunca").map((rule) => ({ text: rule.rule, examples: rule.examples, source: "plan" as const })),
        ...(notes.own ? lines(notes.saved.values.donts).map((text) => ({ text, source: "notes" as const })) : []),
      ],
    };
  }, [k, notes.own, notes.saved.values.donts]);
}

function itemValue(item: KnowledgeItem, fieldKey: string) {
  const value = item.values[fieldKey];
  if (value === null || value === undefined || value === "") return "";
  return Array.isArray(value) ? value.join(" · ") : String(value);
}

export function ContentGuidelines({ client }: { client: OsClient }) {
  const { role } = useOsStore();
  const { k, editable, mutate } = useKnowledge(client);
  const notes = useContentGuidelines(client);
  const glossary = glossaryOf(k);
  const items = k.plan.modules.contenidos || [];
  const rules = contentRules(k);
  const sections = planBlueprints.filter((bp) => bp.service === "contenidos" && bp.id !== "contentRules");
  const canPropose = editable && canEditDiscovery(role, client);
  const notesText = EDITORIAL_FIELDS.filter(([id]) => notes.saved.values?.[id]).map(([id, label]) => `${label}: ${notes.saved.values[id]}`).join("\n\n");
  const proposed = k.sources.find((source) => source.metadata?.origin === NOTES_ORIGIN && source.rawText === notesText);

  function proposeNotes() {
    if (!canPropose || !notesText) return;
    mutate((state, ctx) => state.sources.some((source) => source.metadata?.origin === NOTES_ORIGIN && source.rawText === notesText) ? state : {
      ...state,
      sources: [...state.sources, { ...newSource(client.slug, ctx), type: "document", title: "Notas operativas anteriores · Contenidos", rawText: notesText, status: "needs-review", metadata: { origin: NOTES_ORIGIN }, notes: "Lineamientos editoriales guardados antes en Contenidos. Revisalos y proponé los cambios al Plan de Marketing.", impactedModules: ["Plan de Marketing"] }],
      audit: [...state.audit, { id: `audit-${ctx.at}`, at: ctx.at, actor: ctx.actor, action: "Notas operativas anteriores de Contenidos enviadas a Documentos para proponer al Plan" }],
    });
  }

  const card = (id: string, label: string, body: React.ReactNode, wide = false) => <article className={c.guide} data-wide={wide || undefined} key={id}><h3>{label}</h3>{body}</article>;
  const previous = EDITORIAL_FIELDS.filter(([id]) => notes.values[id]);
  return <div className={m.stack}>
    <Panel title="Lineamientos de Contenidos" id="content-plan-consult" description="Consulta de la parte de Contenidos del Plan de Marketing, para tener los lineamientos a mano mientras trabajás. El plan se edita en Gestión y estrategia." actions={<><Badge tone="stone">Vista de consulta</Badge><Link className={buttonClass("secondary", true)} href={planHref(client.slug)}>Editar en el Plan de Marketing</Link></>}>
      <div className={c.guides}>
        {sections.map((bp) => {
          const own = items.filter((item) => item.section === bp.id);
          return card(bp.id, bp.label, own.length ? <ul className={c.planList}>{own.map((item) => <li key={item.id}>
            <strong>{itemValue(item, bp.fields[0].key) || "Sin título"}</strong>
            {bp.fields.slice(1).filter((field) => field.kind !== "relations" && itemValue(item, field.key)).map((field) => <span key={field.key}><em>{field.label}:</em> {itemValue(item, field.key)}</span>)}
            <small>{item.status}{item.demo ? " · demostración" : ""}</small>
          </li>)}</ul> : <p className={c.muted}>Todavía no se cargó en el Plan de Marketing.</p>, bp.id === "contentAxes");
        })}
      </div>
    </Panel>

    <Panel title="Do's & don'ts de Contenidos" id="content-dos-donts" description="Qué hacer siempre y qué evitar, definidos en el Marketing Discovery y guardados en el Plan de Marketing.">
      {rules.length ? <div className={c.dosDonts} style={{ padding: 16 }}>
        {(["Siempre", "Nunca"] as const).map((type) => <div key={type}><h3 className={c.eyebrow}>{type === "Siempre" ? "Qué hacer siempre" : "Qué evitar"}</h3><ul data-tone={type === "Siempre" ? "do" : "dont"}>{rules.filter((rule) => rule.type === type).map((rule) => <li key={rule.id}>{rule.rule}{rule.basis ? <small className={c.muted}> · {rule.basis}</small> : null}{rule.examples ? <small className={c.muted}> · Ej.: {rule.examples}</small> : null}</li>)}</ul></div>)}
      </div> : <div className={m.panelBody}><p className={c.muted} style={{ margin: 0 }}>{"Sin do's & don'ts cargados en el Plan."} <Link className={c.inlineLink} href={planHref(client.slug)}>Cargalos en el Plan de Marketing</Link>.</p></div>}
    </Panel>

    <Panel title="Glosario de marca" id="content-glossary" description="Palabras que usamos y que evitamos, desde la Ficha del cliente." actions={<Link className={buttonClass("ghost", true)} href={`/v2/clientes/${client.slug}?view=ficha&ficha=glosario`}>Ver en la Ficha</Link>}>
      <div className={c.dosDonts} style={{ padding: 16 }}>
        <div><h3 className={c.eyebrow}>Palabras que usamos</h3>{glossary.use.length ? <ul data-tone="do">{glossary.use.map((word) => <li key={word}>{word}</li>)}</ul> : <p className={c.muted}>Sin palabras definidas.</p>}</div>
        <div><h3 className={c.eyebrow}>Palabras que evitamos</h3>{glossary.avoid.length ? <ul data-tone="dont">{glossary.avoid.map((word) => <li key={word}>{word}</li>)}</ul> : <p className={c.muted}>Sin palabras definidas.</p>}</div>
      </div>
      <div className={m.panelFoot}>Antes de guardar un borrador o enviarlo a revisión del PM, el sistema compara título, idea, bajada, copy y CTA con el {GUIDELINE_SOURCE_LABEL.glossary}{" y los don'ts de Contenidos (sin IA). "}{GUIDELINE_AI_PENDING}</div>
    </Panel>

    {previous.length ? <Panel title={notes.demo ? "Lineamientos de demostración anteriores" : "Notas operativas anteriores"} id="content-previous-notes" description={notes.demo ? "Referencia de demostración que se mostraba antes en esta pestaña. Solo lectura: el marco vigente es el Plan de Marketing." : "Lineamientos editoriales que se guardaron antes en esta pestaña. Se conservan en solo lectura; el marco vigente es el Plan de Marketing."} actions={notes.demo ? <span className={c.demoTag}>{CONTENT_DEMO_LABEL}</span> : canPropose ? (proposed ? <Link className={buttonClass("ghost", true)} href={`/v2/clientes/${client.slug}?view=documentos`}>Ver en Documentos</Link> : <button type="button" className={buttonClass("secondary", true)} onClick={proposeNotes}>Proponer al Plan de Marketing</button>) : undefined}>
      <div className={c.guides}>
        {previous.map(([id, label]) => card(id, label, <p>{notes.values[id]}</p>, id === "objetivos" || id === "dos" || id === "donts"))}
      </div>
      {notes.own ? <div className={m.panelFoot}>{proposed ? "Enviadas a Documentos como fuente para proponer cambios al Plan (el PM las revisa y aprueba). " : ""}{notes.saved.history?.length ? `Última edición: ${notes.saved.history[0].actor} · ${formatDateTime(notes.saved.history[0].at)}.` : ""}{" Los don'ts de estas notas también se usan en la revisión de lineamientos."}</div> : null}
    </Panel> : null}

    <details className={c.serviceMore}><summary>Alcance, procedimientos y criterios del servicio</summary><ServiceGuidelines client={client} serviceId="contenidos" /></details>
  </div>;
}
