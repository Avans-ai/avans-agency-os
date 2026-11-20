"use client";

/* Piezas visuales compartidas de Contenidos: canal, eje, etapa, miniatura, flujo y avisos. */
/* Las miniaturas son data URI o URLs de imagen ya validadas; no pasan por el optimizador. */
/* eslint-disable @next/next/no-img-element */
import { useMemo } from "react";
import type { OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { buttonClass } from "../ui";
import { CONTENT_DEMO_LABEL } from "./content-demo";
import { hasContentDemo } from "./content-demo-tasks";
import { contentThumbnail } from "./content-design";
import { CONTENT_FLOW, MONDAY_STATE, contentFlowStep, contentState, type ContentState } from "./content-workflow";
import { channelGroup } from "./content-collections";
import { useModuleRecords } from "./store";
import type { ModuleRecord } from "./types";
import { useContentOperations } from "./use-content-operations";
import c from "./content.module.css";

const CHANNEL_CODE: Record<string, string> = { Instagram: "IG", Facebook: "FB", LinkedIn: "IN", TikTok: "TT", YouTube: "YT", Blog: "BL", Newsletter: "NL" };
export function ChannelChip({ channel, label = false }: { channel?: string; label?: boolean }) {
  const name = channelGroup(channel || "");
  return <span className={c.channel} data-channel={name || "none"} title={name || "Canal a definir"}><b aria-hidden="true">{CHANNEL_CODE[name] || "··"}</b>{label ? <span>{name || "Canal a definir"}</span> : <span className={c.srOnly}>{name || "Canal a definir"}</span>}</span>;
}
/** Color estable por eje (posición en la lista de ejes del cliente). */
export function axisTone(axes: ModuleRecord[], id?: string) {
  const index = axes.findIndex((axis) => axis.id === id);
  return index < 0 ? "none" : String(index % 6);
}
export function AxisTag({ axes, id }: { axes: ModuleRecord[]; id?: string }) {
  const axis = axes.find((item) => item.id === id);
  return <span className={c.axisTag} data-tone={axisTone(axes, id)}>{axis?.values.nombre || "Sin eje"}</span>;
}
export function StagePill({ state }: { state: ContentState }) {
  return <span className={c.stagePill} data-step={contentFlowStep(state)} data-state={state}><i aria-hidden="true">{contentFlowStep(state)}</i>{state}</span>;
}
/** Avance compacto en las 8 etapas. */
export function StageDots({ state }: { state: ContentState }) {
  const step = contentFlowStep(state);
  return <span className={c.dots} aria-label={`Etapa ${step} de 8`}>{CONTENT_FLOW.map((item) => <i key={item.step} data-done={item.step < step} data-current={item.step === step} />)}</span>;
}
/* Rótulos cortos del paso a paso (los nombres completos van en el title y en el resumen). */
export const STEP_SHORT = ["Borrador", "Rev. interna", "Rev. del cliente", "Ajustes", "Producción", "Rev. de diseño", "Aprob. final", "Programación"];
/** Línea de etapas del contenido con el equivalente de Monday. */
export function StageStepper({ state }: { state: ContentState }) {
  const step = contentFlowStep(state);
  return <ol className={c.stepper} aria-label="Etapas del contenido">{CONTENT_FLOW.map((item) => <li key={item.step} data-done={item.step < step} data-current={item.step === step} aria-current={item.step === step ? "step" : undefined} title={`${item.label} · Monday: ${item.monday}`}><i>{item.step < step ? "✓" : item.step}</i><span>{STEP_SHORT[item.step - 1]}</span></li>)}<li className={c.mondayNote}>Monday · {MONDAY_STATE[state]}</li></ol>;
}
export function Thumb({ src, title, channel, size = "md", decorative = false }: { src?: string; title: string; channel?: string; size?: "xs" | "sm" | "md" | "lg"; decorative?: boolean }) {
  return <span className={c.thumb} data-size={size}>{src ? <img src={src} alt={decorative ? "" : `Miniatura de ${title}`} /> : <span className={c.thumbEmpty} aria-hidden="true">{(CHANNEL_CODE[channelGroup(channel || "")] || title.slice(0, 2)).toUpperCase()}</span>}</span>;
}
/** Miniaturas por contenido desde la biblioteca de Diseño (última versión con imagen). */
export function useContentThumbs(client: OsClient) {
  const { data } = useModuleRecords(client.slug, "diseno-marca", ["biblioteca"]);
  return useMemo(() => {
    const library = data.biblioteca || [];
    const ids = Array.from(new Set(library.map((item) => item.values.contenidoId).filter(Boolean)));
    const map = new Map(ids.map((id) => [id, contentThumbnail(library, id)]));
    return (id: string) => map.get(id) || "";
  }, [data.biblioteca]);
}
export function MetricoolNote() {
  return <div className={c.integration} role="note"><strong><i className={c.offDot} aria-hidden="true" />Metricool no conectado</strong><span>El calendario muestra los contenidos guardados en Avans. No hay sincronización ni programación automática: «Programado» registra lo que el equipo programó en su plataforma.</span></div>;
}
/** Rótulo de demostración con reinicio que solo afecta registros `source: "demo"`. */
export function ContentDemoBanner({ client, records, editable }: { client: OsClient; records: ModuleRecord[]; editable: boolean }) {
  const { role } = useOsStore();
  const operations = useContentOperations(client);
  if (!hasContentDemo(client.slug) && !records.some((record) => record.source === "demo")) return null;
  const demo = records.filter((record) => record.source === "demo").length;
  const canReset = editable && hasContentDemo(client.slug) && ["admin", "pm", "content", "operativo"].includes(role);
  return <div className={c.demoBanner} role="note" aria-label={CONTENT_DEMO_LABEL}>
    <strong>{CONTENT_DEMO_LABEL}</strong>
    <span>{demo} contenidos ficticios para mostrar el proceso editorial. No son publicaciones ni datos reales de {client.name}. Todo se guarda en este navegador (vista previa local).</span>
    {canReset ? <button type="button" className={buttonClass("ghost", true)} onClick={() => { if (window.confirm("Se reemplazan solo los registros de demostración de Contenidos y sus pedidos de Diseño derivados. Los registros cargados a mano se conservan. ¿Continuar?")) operations.resetDemo(); }}>Reiniciar datos de demostración</button> : null}
  </div>;
}
export function stateCount(records: ModuleRecord[], states: ContentState[]) {
  return records.filter((record) => states.includes(contentState(record))).length;
}
