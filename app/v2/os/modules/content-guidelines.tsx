"use client";

/* A · Lineamientos del servicio de Contenidos: marco permanente (objetivos, estrategia, ejes,
 * tono, canales, frecuencia, formatos, Do's & Don'ts, KPIs, restricciones y referencias).
 * Se guardan en la misma clave de lineamientos del servicio, sin pisar los procedimientos. */

import { useState } from "react";
import { canEditService } from "../director-data";
import { readLocalJson, useLocalStorageState, writeLocalJson } from "../local-persistence";
import type { OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { OSModal } from "../overlays";
import { previewActor } from "../preview-roles";
import { buttonClass } from "../ui";
import { CONTENT_DEMO_GUIDELINES, CONTENT_DEMO_LABEL } from "./content-demo";
import { AxisTag, ChannelChip } from "./content-ui";
import { formatDateTime, Panel } from "./module-ui";
import { ServiceGuidelines } from "./service-guidelines";
import { useModuleRecords } from "./store";
import s from "../os.module.css";
import m from "./modules.module.css";
import c from "./content.module.css";

type Guidelines = { values: Record<string, string>; history: { at: string; actor: string; text: string }[] };
const EMPTY: Guidelines = { values: {}, history: [] };
export const EDITORIAL_FIELDS = [
  ["objetivos", "Objetivos"], ["estrategia", "Estrategia"], ["tono", "Tono y estilo"], ["canales", "Canales"], ["frecuencia", "Frecuencia"], ["formatos", "Formatos"],
  ["dos", "Do's"], ["donts", "Don'ts"], ["kpis", "KPIs"], ["restricciones", "Restricciones"], ["referencias", "Referencias"],
] as const;
const key = (slug: string) => `client:${slug}:service-guidelines:contenidos`;
const lines = (value = "") => value.split(/\n|·|,/).map((item) => item.trim()).filter(Boolean);

/** Lineamientos editoriales guardados o, si todavía no hay, los de demostración rotulados. */
export function useContentGuidelines(client: OsClient) {
  const [saved] = useLocalStorageState<Guidelines>(key(client.slug), EMPTY);
  const own = EDITORIAL_FIELDS.some(([id]) => saved.values[id]);
  const demo = CONTENT_DEMO_GUIDELINES[client.slug];
  return { values: own ? saved.values : demo || saved.values, demo: !own && Boolean(demo), saved };
}

export function ContentGuidelines({ client }: { client: OsClient }) {
  const { role, notify } = useOsStore();
  const { values, demo, saved } = useContentGuidelines(client);
  const { data } = useModuleRecords(client.slug, "contenidos", ["ejes"]);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [baseline, setBaseline] = useState("");
  const editable = canEditService(role, client.slug, "contenidos") && ["admin", "pm", "content", "operativo"].includes(role);
  const axes = (data.ejes || []).filter((axis) => axis.values.estado !== "Pausado");
  function save() {
    if (!draft) return;
    const fresh = readLocalJson<Guidelines>(key(client.slug), EMPTY);
    if (JSON.stringify(fresh) !== baseline) { notify("Los lineamientos cambiaron en otra vista. Cerrá y volvé a editar.", "error"); return; }
    const next: Guidelines = { values: { ...fresh.values, ...draft }, history: [{ at: new Date().toISOString(), actor: previewActor(role), text: "Actualizó los lineamientos editoriales" }, ...fresh.history] };
    if (!writeLocalJson(key(client.slug), next)) { notify("No se pudo guardar en este navegador.", "error"); return; }
    setDraft(null); notify("Lineamientos editoriales guardados", "success");
  }
  const card = (id: string, label: string, body: React.ReactNode, wide = false) => <article className={c.guide} data-wide={wide || undefined} key={id}><h3>{label}</h3>{body}</article>;
  const text = (id: string) => values[id] ? <p>{values[id]}</p> : <p className={c.muted}>Sin definir.</p>;
  return <div className={m.stack}>
    <Panel title="Lineamientos editoriales" id="content-guidelines" description="Marco permanente del servicio: se consulta en cada plan, contenido y pedido de diseño." actions={<>{demo ? <span className={c.demoTag}>{CONTENT_DEMO_LABEL}</span> : null}{editable ? <button className={buttonClass("secondary", true)} onClick={() => { setDraft({ ...Object.fromEntries(EDITORIAL_FIELDS.map(([id]) => [id, values[id] || ""])) }); setBaseline(JSON.stringify(readLocalJson<Guidelines>(key(client.slug), EMPTY))); }}>Editar lineamientos</button> : null}</>}>
      <div className={c.guides}>
        {card("objetivos", "Objetivos", values.objetivos ? <ol className={c.goalList}>{values.objetivos.split("\n").map((item) => item.trim()).filter(Boolean).map((item) => <li key={item}>{item}</li>)}</ol> : text("objetivos"), true)}
        {card("estrategia", "Estrategia", text("estrategia"))}
        {card("tono", "Tono y estilo", text("tono"))}
        {card("ejes", "Ejes temáticos", axes.length ? <div className={c.tagWrap}>{axes.map((axis) => <AxisTag key={axis.id} axes={data.ejes || []} id={axis.id} />)}</div> : <p className={c.muted}>Definilos en Ejes temáticos.</p>)}
        {card("canales", "Canales", values.canales ? <div className={c.tagWrap}>{lines(values.canales).map((item) => <ChannelChip key={item} channel={item} label />)}</div> : text("canales"))}
        {card("frecuencia", "Frecuencia", values.frecuencia ? <ul className={c.plainList}>{lines(values.frecuencia.replace(/,/g, "·")).map((item) => <li key={item}>{item}</li>)}</ul> : text("frecuencia"))}
        {card("formatos", "Formatos", values.formatos ? <div className={c.tagWrap}>{lines(values.formatos).map((item) => <span key={item} className={c.chip}>{item}</span>)}</div> : text("formatos"))}
        {card("dosdonts", "Do's & Don'ts", <div className={c.dosDonts}><ul data-tone="do">{lines((values.dos || "").replace(/[,·]/g, "\n")).map((item) => <li key={item}>{item}</li>)}</ul><ul data-tone="dont">{lines((values.donts || "").replace(/[,·]/g, "\n")).map((item) => <li key={item}>{item}</li>)}</ul></div>, true)}
        {card("kpis", "KPIs", <>{text("kpis")}<p className={c.offline}><i className={c.offDot} aria-hidden="true" />Metricool no conectado</p></>)}
        {card("restricciones", "Restricciones", text("restricciones"))}
        {card("referencias", "Referencias", text("referencias"))}
      </div>
      {saved.history.length ? <p className={c.muted} style={{ padding: "0 20px 18px", margin: 0 }}>Última edición: {saved.history[0].actor} · {formatDateTime(saved.history[0].at)}</p> : null}
    </Panel>
    <ServiceGuidelines client={client} serviceId="contenidos" />
    {draft ? <OSModal title="Editar lineamientos editoriales" titleId="content-guidelines-title" onClose={() => setDraft(null)} footer={<><button className={buttonClass("ghost")} onClick={() => setDraft(null)}>Cancelar</button><button className={buttonClass("primary")} onClick={save}>Guardar lineamientos</button></>}>
      <div className={c.editor}><fieldset><legend>Marco editorial</legend>{EDITORIAL_FIELDS.map(([id, label]) => <label key={id} className={c.formField} data-wide="true"><span>{label}</span><textarea className={s.input} rows={2} maxLength={2000} value={draft[id] || ""} onChange={(event) => setDraft({ ...draft, [id]: event.target.value })} /></label>)}</fieldset></div>
    </OSModal> : null}
  </div>;
}

