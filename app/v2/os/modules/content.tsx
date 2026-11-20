"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { previewActor } from "../preview-roles";
import { OSModal } from "../overlays";
import { readLocalJson } from "../local-persistence";
import { useKnowledge } from "../knowledge/use-knowledge";
import { buttonClass } from "../ui";
import s from "../os.module.css";
import { BarChart } from "../reports/charts";
import { ContentReportView } from "../reports/report-views";
import { useContentReport } from "../reports/use-report-data";
import { CollectionView, RecordForm, RecordPanel } from "./collection-view";
import { collectionDef } from "./collections";
import { axes, channelGroup, ideas, plans, PIECE_CHANNELS } from "./content-collections";
import { ContentDetail, ContentEditor, contentTitleKey } from "./content-detail";
import { contentRules, useContentGuidelines } from "./content-guidelines";
import { AxisTag, ChannelChip, ContentDemoBanner, useContentDemoTasks, MetricoolNote, StageDots, StagePill, Thumb, axisTone, stateCount, useContentThumbs } from "./content-ui";
import { CONTENT_FLOW, CONTENT_STATES, clientRequests, contentFlowStep, contentState, ideaToContentValues, safeContentUrl, type ContentState } from "./content-workflow";
import { TaskHealthStrip } from "./module-common";
import { Panel, StatusBadge } from "./module-ui";
import { moduleKey, seedRecords, useModuleRecords, type ModuleData } from "./store";
import type { CollectionDef, ModuleRecord } from "./types";
import { useContentOperations } from "./use-content-operations";
import m from "./modules.module.css";
import c from "./content.module.css";

const SERVICE = "contenidos" as const;
const CONTENT_REFS = ["piezas", "ejes", "planes", "ideas"];
const learningsDef = collectionDef(SERVICE, "aprendizajes")!;
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const startOfWeek = (date: Date) => { const result = new Date(date); result.setDate(result.getDate() - ((result.getDay() + 6) % 7)); return result; };
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const REFERENCE = new Date(2026, 10, 20, 12);
const PLANNERS = ["admin", "pm", "content", "operativo"];
const monthLabel = (month = "") => /^\d{4}-\d{2}$/.test(month) ? new Date(`${month}-01T12:00:00`).toLocaleDateString("es-AR", { month: "long", year: "numeric" }) : month || "Mes a definir";
const shortDate = (date = "") => /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00`).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" }) : "Sin fecha";

/** Plan de trabajo vigente: el último no cerrado (o el último cargado). */
function pickPlan(list: ModuleRecord[]) {
  const sorted = [...list].sort((a, b) => (b.values.mes || "").localeCompare(a.values.mes || ""));
  return sorted.find((plan) => plan.values.estado !== "Cerrado") || sorted[0];
}
function planPieces(records: ModuleRecord[], plan?: ModuleRecord) {
  return plan ? records.filter((record) => record.values.plan === plan.id) : [];
}

/* ───────── Resumen ───────── */
export function ContentSummary({ client, go }: { client: OsClient; go: (section: string, extra?: Record<string, string>) => void }) {
  useContentDemoTasks(client);
  const { data } = useModuleRecords(client.slug, SERVICE, CONTENT_REFS);
  const { role } = useOsStore();
  const thumbs = useContentThumbs(client);
  const guidelines = useContentGuidelines(client);
  const { k } = useKnowledge(client);
  const planItems = (k.plan.modules.contenidos || []).length;
  const rules = contentRules(k);
  const records = data.piezas || [];
  const pending = records.filter((record) => /Revisión|Aprobación/.test(contentState(record)));
  const waitingClient = stateCount(records, ["Revisión preliminar del cliente", "Aprobación final del cliente", "Información del cliente"]);
  const plan = pickPlan(data.planes || []);
  const reference = iso(REFERENCE), limit = iso(new Date(REFERENCE.getTime() + 14 * 86400000));
  const upcoming = records.filter((record) => record.values.fecha >= reference && record.values.fecha <= limit).sort((a, b) => `${a.values.fecha}${a.values.hora}`.localeCompare(`${b.values.fecha}${b.values.hora}`));
  const ideasList = data.ideas || [];
  return <div className={m.stack}>
    <ContentDemoBanner client={client} records={records} editable={PLANNERS.includes(role)} />
    <TaskHealthStrip client={client} serviceId={SERVICE} extra={[{ label: "Contenidos", value: records.length }, { label: "En revisión", value: pending.length, alert: pending.length > 0 }, { label: "Planes mensuales", value: (data.planes || []).length }]} />
    <Panel title="Flujo editorial" id="content-production" description="Ocho etapas, con su equivalente en el tablero Monday de Avans. Tocá una etapa para ver sus contenidos." actions={<><button className={buttonClass("secondary", true)} onClick={() => go("planes")}>Plan mensual</button><button className={buttonClass("primary", true)} onClick={() => go("piezas")}>Abrir contenidos</button></>}>
      <div className={c.flow}>{CONTENT_FLOW.map((step) => { const count = stateCount(records, step.states); return <button key={step.step} className={c.flowStep} data-step={step.step} data-active={count > 0} onClick={() => go("piezas", { paso: String(step.step) })}><span className={c.flowNum}>{step.step}</span><strong>{count}</strong><span>{step.label}</span><small>Monday · {step.monday}</small>{step.states.length > 1 ? <em>{step.states.map((state) => `${state} ${stateCount(records, [state])}`).join(" · ")}</em> : null}</button>; })}</div>
    </Panel>
    <div className={c.summaryGrid}>
      <Panel title={plan ? plan.values.nombre : "Plan del mes"} id="content-plan-snapshot" description={plan ? `${monthLabel(plan.values.mes)} · ${plan.values.estado}` : "Todavía no hay planes mensuales."} actions={<button className={buttonClass("secondary", true)} onClick={() => go("planes", plan ? { plan: plan.id } : {})}>Ver plan</button>}>
        {plan ? <PlanSnapshot plan={plan} records={records} axes={data.ejes || []} /> : <p className={c.empty}>Creá el primer plan para ordenar el mes.</p>}
      </Panel>
      <Panel title="Próximas publicaciones" id="content-upcoming" description="Próximos 14 días" actions={<button className={buttonClass("ghost", true)} onClick={() => go("calendario")}>Calendario</button>}>
        <div className={c.upcoming}>{upcoming.length ? upcoming.slice(0, 7).map((record) => <button key={record.id} className={c.upcomingRow} onClick={() => go("piezas", { registro: record.id })}><Thumb src={thumbs(record.id)} title={record.values.titulo} channel={record.values.canal} size="sm" decorative /><span><strong>{record.values.titulo}</strong><small>{shortDate(record.values.fecha)}{record.values.hora ? ` · ${record.values.hora}` : ""}</small></span><ChannelChip channel={record.values.canal} /><StagePill state={contentState(record)} /></button>) : <p className={c.empty}>Sin publicaciones en los próximos 14 días.</p>}</div>
      </Panel>
    </div>
    <div className={c.triad}>
      <article className={c.triadCard}><span className={c.eyebrow}>A · Plan de contenidos</span><h3>{planItems ? `${planItems} definiciones en el Plan` : "Consulta del Plan de Marketing"}</h3><p>{rules.length ? `${rules.filter((rule) => rule.type === "Siempre").length} do's y ${rules.filter((rule) => rule.type === "Nunca").length} don'ts de Contenidos.` : guidelines.values.tono || "Ejes, do's & don'ts y KPIs de Contenidos se definen en el Plan de Marketing."}</p><Link className={s.link} href={`/v2/clientes/${client.slug}/contenido?area=lineamientos`}>Ver plan de contenidos</Link></article>
      <article className={c.triadCard}><span className={c.eyebrow}>B · Operación mensual</span><h3>{waitingClient} esperan al cliente</h3><div className={c.miniStats}><span><strong>{stateCount(records, ["Preproducción"])}</strong> en preproducción</span><span><strong>{stateCount(records, ["Producción de diseño", "Revisión interna del diseño"])}</strong> en diseño</span><span><strong>{stateCount(records, ["Aprobado", "Programado"])}</strong> listos o programados</span></div><button className={s.link} onClick={() => go("calendario")}>Abrir calendario →</button></article>
      <article className={c.triadCard}><span className={c.eyebrow}>C · Banco de ideas</span><h3>{ideasList.filter((idea) => !["Descartada", "Convertida en pieza"].includes(idea.values.estado)).length} ideas abiertas</h3><ul className={c.plainList}>{ideasList.filter((idea) => !["Descartada", "Convertida en pieza"].includes(idea.values.estado)).slice(0, 3).map((idea) => <li key={idea.id}>{idea.values.idea}</li>)}</ul><button className={s.link} onClick={() => go("ideas")}>Abrir banco de ideas →</button></article>
    </div>
    <MetricoolNote />
  </div>;
}

function PlanSnapshot({ plan, records, axes: axisList }: { plan: ModuleRecord; records: ModuleRecord[]; axes: ModuleRecord[] }) {
  const list = planPieces(records, plan);
  const target = Math.max(Number(plan.values.cantidad) || 0, list.length, 1);
  const byChannel = PIECE_CHANNELS.map((channel) => ({ channel, count: list.filter((record) => channelGroup(record.values.canal) === channel).length })).filter((item) => item.count);
  const max = Math.max(1, ...byChannel.map((item) => item.count));
  return <div className={c.snapshot}>
    <div className={c.gauge}><strong>{list.length}<small>/{plan.values.cantidad || "—"}</small></strong><span>contenidos planificados</span><div className={c.stack} aria-label="Contenidos por etapa">{CONTENT_FLOW.map((step) => { const count = stateCount(list, step.states); return count ? <i key={step.step} data-step={step.step} style={{ width: `${(count / target) * 100}%` }} title={`${step.label}: ${count}`} /> : null; })}</div><small className={c.muted}>{stateCount(list, ["Programado", "Publicada"])} programados · {stateCount(list, ["Revisión preliminar del cliente", "Aprobación final del cliente", "Información del cliente"])} esperan al cliente</small></div>
    <div className={c.bars} aria-label="Contenidos por canal">{byChannel.map((item) => <div key={item.channel} className={c.barRow}><ChannelChip channel={item.channel} label /><span className={c.bar}><i style={{ width: `${(item.count / max) * 100}%` }} /></span><b>{item.count}</b></div>)}</div>
    <div className={c.tagWrap}>{axisList.filter((axis) => list.some((record) => record.values.eje === axis.id)).map((axis) => <AxisTag key={axis.id} axes={axisList} id={axis.id} />)}</div>
  </div>;
}

/* ───────── Planificación mensual ───────── */
export function PlansSection({ client, editable }: { client: OsClient; editable: boolean }) {
  useContentDemoTasks(client);
  const { notify, role } = useOsStore();
  const params = useSearchParams();
  const canPlan = editable && PLANNERS.includes(role);
  const { data, create, update } = useModuleRecords(client.slug, SERVICE, ["planes", "piezas", "ejes"]);
  const thumbs = useContentThumbs(client);
  const operations = useContentOperations(client);
  const [open, setOpen] = useState<ModuleRecord | "new" | null>(null);
  const [axisFor, setAxisFor] = useState<string | null>(null);
  const [creating, setCreating] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState("");
  const list = [...(data.planes || [])].sort((a, b) => (a.values.mes || "").localeCompare(b.values.mes || ""));
  const [selectedId, setSelectedId] = useState<string | null>(params.get("plan"));
  const plan = list.find((item) => item.id === selectedId) || pickPlan(list);
  const records = data.piezas || [];
  const axisList = data.ejes || [];
  const initial = open && open !== "new" ? open.values : { mes: iso(new Date(REFERENCE.getFullYear(), REFERENCE.getMonth() + 1, 1)).slice(0, 7), estado: "Planificación", responsable: client.team.find((member) => /Contenido/.test(member.role))?.name || "" };
  return <>
    <Panel title="Planificación mensual" id="content-plans" description="Objetivos, ejes, volumen, canales, formatos, fechas y responsables de cada mes." actions={<button className={buttonClass("primary", true)} disabled={!canPlan} onClick={() => { setOpen("new"); setError(""); }}>Nuevo plan mensual</button>}>
      {list.length ? <div className={c.monthTabs} role="group" aria-label="Planes mensuales">{list.map((item) => <button key={item.id} type="button" aria-pressed={item.id === plan?.id} onClick={() => setSelectedId(item.id)}><span>{monthLabel(item.values.mes)}</span><small>{planPieces(records, item).length}/{item.values.cantidad || "—"} · {item.values.estado}</small></button>)}</div> : <p className={c.empty}>{plans.empty}</p>}
      {plan ? <PlanDetail client={client} plan={plan} records={records} axes={axisList} thumbs={thumbs} canPlan={canPlan} onEdit={() => { setOpen(plan); setError(""); }} onAddAxis={() => setAxisFor(plan.id)} onAddContent={() => setCreating({ plan: plan.id, fecha: `${plan.values.mes}-01` })} /> : null}
    </Panel>
    {open ? <OSModal title={open === "new" ? "Nuevo plan mensual" : "Editar plan mensual"} titleId="monthly-plan-title" onClose={() => setOpen(null)} footer={<><button className={buttonClass("ghost")} onClick={() => setOpen(null)}>Cancelar</button><button className={buttonClass("primary")} type="submit" form="monthly-plan-form">Guardar plan mensual</button></>}>
      {error ? <p role="alert" className={s.fieldError}>{error}</p> : null}<RecordForm def={plans} initial={initial} refs={data} titleKeyOf={contentTitleKey} formId="monthly-plan-form" onSubmit={(values) => { if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(values.mes)) { setError("Ingresá un mes válido en formato AAAA-MM."); return; } if (!Number.isInteger(Number(values.cantidad)) || Number(values.cantidad) < 1) { setError("La cantidad debe ser un entero mayor que cero."); return; } if ((data.planes || []).some((item) => item.values.mes === values.mes && item.id !== (open === "new" ? "" : open.id))) { setError("Ya existe un plan para este mes. Editá ese plan."); return; } if (open === "new") { const record = create(plans, values); if (record) { setSelectedId(record.id); setOpen(null); notify("Plan mensual guardado", "success"); } else setError("No se pudo guardar. Revisá el almacenamiento del navegador."); return; } if (update("planes", open.id, values, "Actualizó la planificación mensual")) { setOpen(null); notify("Plan mensual guardado", "success"); } else setError("No se pudo guardar. Revisá el almacenamiento del navegador."); }} />
    </OSModal> : null}
    {axisFor ? <AxisEditor client={client} refs={data} initial={{ plan: axisFor, estado: "Activo" }} onClose={() => setAxisFor(null)} /> : null}
    {creating ? <ContentEditor client={client} initial={creating} refs={data} onClose={() => setCreating(null)} onSave={(values) => { if (operations.saveDraft(values)) { setCreating(null); notify("Contenido y tarea guardados", "success"); } }} /> : null}
  </>;
}

function PlanDetail({ client, plan, records, axes: axisList, thumbs, canPlan, onEdit, onAddAxis, onAddContent }: { client: OsClient; plan: ModuleRecord; records: ModuleRecord[]; axes: ModuleRecord[]; thumbs: (id: string) => string; canPlan: boolean; onEdit: () => void; onAddAxis: () => void; onAddContent: () => void }) {
  const list = planPieces(records, plan);
  const planAxes = axisList.filter((axis) => axis.values.plan === plan.id || list.some((record) => record.values.eje === axis.id));
  const [year, month] = (plan.values.mes || "").split("-").map(Number);
  const days = year && month ? new Date(year, month, 0).getDate() : 0;
  const goals = (plan.values.objetivos || "").split("\n").map((item) => item.trim()).filter(Boolean);
  const formats = Array.from(new Set(list.map((record) => record.values.formato).filter(Boolean)));
  return <div className={c.planDetail}>
    <div className={c.planHead}>
      <div><span className={c.eyebrow}>{monthLabel(plan.values.mes)} · {plan.values.responsable || "Sin responsable"}</span><h3>{plan.values.nombre}</h3><StatusBadge status={plan.values.estado} /></div>
      <div className={c.actionRow}><Link className={s.link} href={`/v2/clientes/${client.slug}/contenido?seccion=piezas&plan=${plan.id}`}>Ver contenidos</Link><button className={buttonClass("secondary", true)} disabled={!canPlan} onClick={onAddAxis}>Agregar eje</button><button className={buttonClass("secondary", true)} disabled={!canPlan} onClick={onAddContent}>Nuevo contenido en el plan</button><button className={buttonClass("ghost", true)} disabled={!canPlan} onClick={onEdit}>Editar plan</button></div>
    </div>
    <div className={c.planGrid}>
      <PlanSnapshot plan={plan} records={records} axes={axisList} />
      <div className={c.planGoals}><h4>Objetivos del mes</h4>{goals.length ? <ol className={c.goalList}>{goals.map((goal) => <li key={goal}>{goal}</li>)}</ol> : <p className={c.muted}>Sin objetivos cargados.</p>}<h4>Temáticas</h4><p>{plan.values.tematicas || "—"}</p><h4>Formatos</h4><div className={c.tagWrap}>{(formats.length ? formats : (plan.values.formatos || "").split(",").map((item) => item.trim()).filter(Boolean)).map((item) => <span key={item} className={c.chip}>{item}</span>)}</div>{plan.values.fechas ? <><h4>Fechas e hitos</h4><p>{plan.values.fechas}</p></> : null}</div>
    </div>
    {days ? <div className={c.timeline30} aria-label={`Publicaciones de ${monthLabel(plan.values.mes)}`} style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}>{Array.from({ length: days }, (_, index) => { const date = `${plan.values.mes}-${String(index + 1).padStart(2, "0")}`; const items = list.filter((record) => record.values.fecha === date); const weekday = new Date(year, month - 1, index + 1).getDay(); return <div key={date} className={c.tlDay} data-weekend={weekday === 0 || weekday === 6} title={items.map((item) => item.values.titulo).join(" · ")}><span>{index + 1}</span>{items.map((item) => <i key={item.id} data-step={contentFlowStep(contentState(item))}><ChannelChip channel={item.values.canal} /></i>)}</div>; })}</div> : null}
    <h4 className={c.subhead}>Ejes del plan · {planAxes.length}</h4>
    <div className={c.axisCards}>{planAxes.map((axis) => { const assigned = list.filter((record) => record.values.eje === axis.id); const target = Number(axis.values.cantidad) || 0; return <article key={axis.id} className={c.axisCard} data-tone={axisTone(axisList, axis.id)}><h5>{axis.values.nombre}</h5><p>{axis.values.objetivo || axis.values.descripcion}</p><div className={c.axisMeta}><span>{axis.values.perfil || "Público a definir"}</span><span>{axis.values.icp ? `ICP · ${axis.values.icp}` : "Sin ICP vinculado"}</span></div><div className={c.meter}><progress value={assigned.length} max={Math.max(target, assigned.length, 1)} aria-label={`Contenidos de ${axis.values.nombre}`} /><span>{assigned.length}/{target || "—"}</span></div><div className={c.thumbRow}>{assigned.slice(0, 5).map((record) => <Thumb key={record.id} src={thumbs(record.id)} title={record.values.titulo} channel={record.values.canal} size="xs" decorative />)}</div></article>; })}{!planAxes.length ? <p className={c.empty}>Este plan todavía no tiene ejes. Agregá al menos uno.</p> : null}</div>
  </div>;
}

/* ───────── Ejes temáticos ───────── */
function useIcpOptions(client: OsClient) {
  const { k } = useKnowledge(client);
  return useMemo(() => [...(k.discovery.b2bIcps || []), ...(k.discovery.b2cIcps || [])].map((item) => String((item as { name?: unknown }).name || "")).filter(Boolean), [k]);
}
function AxisEditor({ client, refs, initial, record, onClose }: { client: OsClient; refs: ModuleData; initial?: Record<string, string>; record?: ModuleRecord; onClose: () => void }) {
  const { notify } = useOsStore();
  const { create, update } = useModuleRecords(client.slug, SERVICE, ["ejes"]);
  const icps = useIcpOptions(client);
  const current = record?.values.icp;
  const def: CollectionDef = { ...axes, fields: axes.fields.map((field) => field.key === "icp" ? icps.length ? { ...field, type: "select", options: Array.from(new Set([...icps, ...(current ? [current] : [])])), hint: "ICP cargados en Discovery." } : { ...field, hint: "Discovery no tiene ICP cargados para esta cuenta: describí el perfil o completalo en Discovery." } : field) };
  const title = record ? "Editar eje temático" : "Nuevo eje temático";
  return <OSModal title={title} titleId="content-axis-title" onClose={onClose} footer={<><button className={buttonClass("ghost")} onClick={onClose}>Cancelar</button><button type="submit" form="content-axis-form" className={buttonClass("primary")}>Guardar en este navegador</button></>}>
    <RecordForm def={def} initial={record?.values || initial || { estado: "Activo" }} refs={refs} titleKeyOf={contentTitleKey} formId="content-axis-form" onSubmit={(values) => { const ok = record ? update("ejes", record.id, values, "Actualizó el eje temático") : create(axes, values); if (ok) { notify("Eje temático guardado en este navegador", "success"); onClose(); } else notify("No se pudo guardar en este navegador", "error"); }} />
  </OSModal>;
}

export function AxesSection({ client, editable }: { client: OsClient; editable: boolean }) {
  const { role } = useOsStore();
  const { data } = useModuleRecords(client.slug, SERVICE, ["ejes", "piezas", "planes"]);
  const icps = useIcpOptions(client);
  const canEdit = editable && PLANNERS.includes(role);
  const [open, setOpen] = useState<ModuleRecord | "new" | null>(null);
  const list = data.ejes || [];
  const chart = list.map((axis) => { const count = (data.piezas || []).filter((piece) => piece.values.eje === axis.id).length; return { label: axis.values.nombre || axis.id, value: Number(axis.values.participacion) || 0, secondary: count, display: `${axis.values.participacion || 0} % objetivo`, secondaryDisplay: `${count} contenidos` }; });
  return <div className={m.stack}>
    <Panel title="Ejes temáticos" id="content-axes-list" description="Cada eje con objetivo, público, ICP de Discovery, relación con el Plan de Marketing y cantidad de contenidos." actions={<button className={buttonClass("primary", true)} disabled={!canEdit} onClick={() => setOpen("new")}>Nuevo eje temático</button>}>
      <div className={c.axisCards} data-wide="true">{list.map((axis) => { const assigned = (data.piezas || []).filter((piece) => piece.values.eje === axis.id); const plan = (data.planes || []).find((item) => item.id === axis.values.plan); const linked = axis.values.icp && icps.includes(axis.values.icp); return <article key={axis.id} className={c.axisCard} data-tone={axisTone(list, axis.id)}>
        <div className={c.axisTop}><button className={c.titleButton} onClick={() => setOpen(axis)}>{axis.values.nombre}</button><StatusBadge status={axis.values.estado} /></div>
        <p>{axis.values.descripcion}</p>
        <dl className={c.axisFacts}><div><dt>Objetivo</dt><dd>{axis.values.objetivo || "—"}</dd></div><div><dt>Público</dt><dd>{axis.values.perfil || "—"}</dd></div><div><dt>ICP</dt><dd>{axis.values.icp || "Sin ICP"} <small className={c.muted}>{axis.values.icp ? linked ? "· vinculado a Discovery" : "· no vinculado a Discovery" : ""}</small></dd></div><div><dt>Plan de Marketing</dt><dd>{axis.values.relacionPlan || "—"}</dd></div>{axis.values.referencias ? <div><dt>Referencias</dt><dd>{axis.values.referencias}</dd></div> : null}</dl>
        <div className={c.meter}><progress value={assigned.length} max={Math.max(Number(axis.values.cantidad) || 0, assigned.length, 1)} aria-label={`Contenidos de ${axis.values.nombre}`} /><span>{assigned.length}/{axis.values.cantidad || "—"} contenidos · {axis.values.participacion || 0} %</span></div>
        <small className={c.muted}>{plan ? plan.values.nombre : "Eje permanente"}</small>
      </article>; })}{!list.length ? <p className={c.empty}>{axes.empty}</p> : null}</div>
    </Panel>
    {chart.length ? <Panel title="Distribución por eje" id="content-axes"><div className={m.panelBody}><BarChart title="Participación objetivo por eje temático" data={chart} primaryLabel="Participación objetivo" secondaryLabel="Contenidos" /></div></Panel> : null}
    {open ? <AxisEditor client={client} refs={data} record={open === "new" ? undefined : open} onClose={() => setOpen(null)} /> : null}
  </div>;
}

/* ───────── Contenidos: lista y Kanban ───────── */
export function PiecesSection({ client, editable }: { client: OsClient; editable: boolean }) {
  useContentDemoTasks(client);
  const { notify, role } = useOsStore();
  const canPlan = editable && PLANNERS.includes(role);
  const params = useSearchParams();
  const { data } = useModuleRecords(client.slug, SERVICE, CONTENT_REFS);
  const thumbs = useContentThumbs(client);
  const operations = useContentOperations(client);
  const router = useRouter();
  const pathname = usePathname();
  const openId = params.get("registro");
  const setOpenId = (id: string | null) => { const next = new URLSearchParams(params.toString()); if (id) next.set("registro", id); else next.delete("registro"); router.replace(`${pathname}?${next.toString()}`, { scroll: false }); };
  const [creating, setCreating] = useState(false);
  const [state, setState] = useState(params.get("paso") ? `paso:${params.get("paso")}` : params.get("estado") || "todos");
  const [plan, setPlan] = useState(params.get("plan") || "todos");
  const [axis, setAxis] = useState("todos");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"lista" | "kanban">("lista");
  const records = data.piezas || [];
  const axisList = data.ejes || [];
  const matchesState = (record: ModuleRecord) => state === "todos" || (state.startsWith("paso:") ? String(contentFlowStep(contentState(record))) === state.slice(5) : contentState(record) === state);
  const shown = records.filter((record) => matchesState(record) && (plan === "todos" || record.values.plan === plan) && (axis === "todos" || record.values.eje === axis) && `${record.values.titulo} ${record.values.idea}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es"))).sort((a, b) => (a.values.fecha || "9999").localeCompare(b.values.fecha || "9999"));
  const open = records.find((record) => record.id === openId);
  const card = (record: ModuleRecord) => { const st = contentState(record); const pendingRequests = clientRequests(record.values).filter((item) => item.status === "Pendiente").length; return <button className={c.kanbanCard} key={record.id} onClick={() => setOpenId(record.id)} data-tone={axisTone(axisList, record.values.eje)}><Thumb src={thumbs(record.id)} title={record.values.titulo} channel={record.values.canal} size="sm" decorative /><span className={c.cardBody}><strong>{record.values.titulo}</strong><span className={c.cardMeta}><ChannelChip channel={record.values.canal} /><small>{record.values.formato}</small><small>{record.values.fecha ? shortDate(record.values.fecha) : "Sin fecha"}</small></span>{CONTENT_FLOW.find((step) => step.states.includes(st))!.states.length > 1 || st === "Publicada" ? <small className={c.subState}>{st}</small> : null}{pendingRequests ? <small className={c.alertText}>{pendingRequests} pedido{pendingRequests > 1 ? "s" : ""} al cliente</small> : null}</span></button>; };
  return <>
    <ContentDemoBanner client={client} records={records} editable={canPlan} />
    <Panel title="Contenidos del cliente" id="content-pieces" actions={<button className={buttonClass("primary", true)} disabled={!canPlan} onClick={() => setCreating(true)}>Nuevo contenido</button>}>
      <div className={c.toolbar}><label>Buscar contenido<input className={s.input} type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label>Estado<select className={s.input} value={state} onChange={(event) => setState(event.target.value)}><option value="todos">Todos</option><optgroup label="Etapas">{CONTENT_FLOW.map((step) => <option key={step.step} value={`paso:${step.step}`}>{step.step}. {step.label}</option>)}</optgroup><optgroup label="Estados">{CONTENT_STATES.map((item) => <option key={item}>{item}</option>)}</optgroup></select></label><label>Plan mensual<select className={s.input} value={plan} onChange={(event) => setPlan(event.target.value)}><option value="todos">Todos</option>{(data.planes || []).map((item) => <option value={item.id} key={item.id}>{item.values.nombre}</option>)}</select></label><label>Eje<select className={s.input} value={axis} onChange={(event) => setAxis(event.target.value)}><option value="todos">Todos</option>{axisList.map((item) => <option value={item.id} key={item.id}>{item.values.nombre}</option>)}</select></label><div className={s.segmented} role="group" aria-label="Vista de contenidos"><button aria-pressed={view === "lista"} onClick={() => setView("lista")}>Lista</button><button aria-pressed={view === "kanban"} onClick={() => setView("kanban")}>Kanban</button></div></div>
      {view === "kanban" ? <div className={c.kanban} aria-label="Kanban de contenidos">{CONTENT_FLOW.map((step) => { const items = shown.filter((item) => step.states.includes(contentState(item))); return <section className={c.kanbanColumn} key={step.step} data-step={step.step}><h3><span><i>{step.step}</i>{step.label}</span><b>{items.length}</b></h3><small className={c.muted}>Monday · {step.monday}</small>{items.map(card)}</section>; })}</div>
        : <div className={c.rows} role="list" aria-label="Contenidos planificados">{shown.map((record) => { const st = contentState(record); const pendingRequests = clientRequests(record.values).filter((item) => item.status === "Pendiente").length; return <div role="listitem" className={c.row} key={record.id}>
          <Thumb src={thumbs(record.id)} title={record.values.titulo} channel={record.values.canal} size="sm" decorative />
          <span className={c.rowMain}><button className={c.titleButton} onClick={() => setOpenId(record.id)}>{record.values.titulo}</button><span className={c.cardMeta}><ChannelChip channel={record.values.canal} label /><small>{record.values.formato || "Formato a definir"}</small><AxisTag axes={axisList} id={record.values.eje} />{record.source === "demo" ? <span className={c.demoTag}>Demo</span> : null}</span></span>
          <span className={c.rowState}><StagePill state={st} /><StageDots state={st} /></span>
          <span className={c.rowDate}><strong>{shortDate(record.values.fecha)}</strong><small>{record.values.hora || "Sin hora"}</small></span>
          <span className={c.rowOwner}><small>{record.values.responsable || "Sin asignar"}</small>{pendingRequests ? <small className={c.alertText}>{pendingRequests} pedido{pendingRequests > 1 ? "s" : ""} al cliente</small> : null}</span>
        </div>; })}{!shown.length ? <p className={c.empty}>No hay contenidos con estos filtros.</p> : null}</div>}
    </Panel>
    {creating ? <ContentEditor client={client} initial={{ plan: plan === "todos" ? "" : plan }} refs={data} onClose={() => setCreating(false)} onSave={(values) => { const record = operations.saveDraft(values); if (record) { setCreating(false); setOpenId(record.id); notify("Contenido y tarea guardados", "success"); } }} /> : null}
    {open ? <ContentDetail key={open.id} client={client} record={open} editable={editable} onClose={() => setOpenId(null)} /> : null}
  </>;
}

/* ───────── Calendario ───────── */
export function CalendarSection({ client, editable }: { client: OsClient; editable: boolean }) {
  useContentDemoTasks(client);
  const { role } = useOsStore();
  const canPlan = editable && PLANNERS.includes(role);
  const { data } = useModuleRecords(client.slug, SERVICE, CONTENT_REFS);
  const thumbs = useContentThumbs(client);
  const operations = useContentOperations(client);
  const [mode, setMode] = useState<"mes" | "semana" | "dia">("mes");
  const [anchor, setAnchor] = useState(REFERENCE);
  const [channel, setChannel] = useState("todos");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState<Record<string, string> | null>(null);
  const records = data.piezas || [];
  const axisList = data.ejes || [];
  const filtered = records.filter((record) => channel === "todos" || channelGroup(record.values.canal) === channel);
  const byDate = useMemo(() => { const map = new Map<string, ModuleRecord[]>(); for (const record of filtered) { const key = record.values.fecha?.slice(0, 10); if (key) map.set(key, [...(map.get(key) || []), record].sort((a, b) => (a.values.hora || "99").localeCompare(b.values.hora || "99"))); } return map; }, [filtered]);
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
  const begin = mode === "mes" ? startOfWeek(monthStart) : mode === "semana" ? startOfWeek(anchor) : anchor;
  const days = Array.from({ length: mode === "mes" ? 42 : mode === "semana" ? 7 : 1 }, (_, index) => { const day = new Date(begin); day.setDate(day.getDate() + index); return day; });
  const visibleDays = mode === "mes" && days.slice(35).every((day) => day.getMonth() !== anchor.getMonth()) ? days.slice(0, 35) : days;
  const title = mode === "mes" ? anchor.toLocaleDateString("es-AR", { month: "long", year: "numeric" }) : mode === "semana" ? `Semana del ${iso(days[0])}` : anchor.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  const open = records.find((record) => record.id === openId);
  const undated = filtered.filter((record) => !record.values.fecha).length;
  const plan = pickPlan(data.planes || []);
  const planMonth = plan?.values.mes && /^\d{4}-\d{2}$/.test(plan.values.mes) ? plan.values.mes : "";
  const hours = Array.from(new Set([...Array.from({ length: 16 }, (_, index) => index + 7), ...days.flatMap((day) => (byDate.get(iso(day)) || []).map((record) => Number((record.values.hora || "").split(":")[0])).filter((hour) => Number.isInteger(hour)))])).sort((a, b) => a - b);
  function shift(direction: number) { const next = new Date(anchor); if (mode === "mes") next.setMonth(next.getMonth() + direction, 1); else next.setDate(next.getDate() + direction * (mode === "semana" ? 7 : 1)); setAnchor(next); }
  function item(record: ModuleRecord, large = false) { const st = contentState(record); return <button className={c.calendarItem} data-large={large || undefined} key={record.id} data-step={contentFlowStep(st)} data-state={st} onClick={() => setOpenId(record.id)}><Thumb src={thumbs(record.id)} title={record.values.titulo} channel={record.values.canal} size={large ? "md" : "xs"} decorative /><span className={c.calText}><strong>{record.values.hora || "Sin hora"} · {record.values.titulo}</strong><span><ChannelChip channel={record.values.canal} />{st}</span>{large ? <AxisTag axes={axisList} id={record.values.eje} /> : <i className={c.axisDot} data-tone={axisTone(axisList, record.values.eje)} title={axisList.find((axis) => axis.id === record.values.eje)?.values.nombre || "Sin eje"} />}</span></button>; }
  const counts = (name: string) => records.filter((record) => (name === "todos" || channelGroup(record.values.canal) === name) && (mode !== "mes" || record.values.fecha?.startsWith(iso(anchor).slice(0, 7)))).length;
  return <div className={m.stack}>
    <Panel title="Calendario editorial" id="content-calendar" actions={<button className={buttonClass("primary", true)} disabled={!canPlan} onClick={() => setCreating({ fecha: iso(anchor) })}>Nuevo contenido</button>}>
      <div className={c.toolbar}><div className={c.calNavigation}><button className={buttonClass("secondary", true)} aria-label={mode === "mes" ? "Mes anterior" : mode === "semana" ? "Semana anterior" : "Día anterior"} onClick={() => shift(-1)}>‹</button><strong aria-live="polite">{title}</strong><button className={buttonClass("secondary", true)} aria-label={mode === "mes" ? "Mes siguiente" : mode === "semana" ? "Semana siguiente" : "Día siguiente"} onClick={() => shift(1)}>›</button><button className={buttonClass("ghost", true)} onClick={() => setAnchor(new Date())}>Hoy</button>{planMonth && planMonth !== iso(anchor).slice(0, 7) ? <button className={buttonClass("ghost", true)} onClick={() => { const [y, mth] = planMonth.split("-").map(Number); setAnchor(new Date(y, mth - 1, 1, 12)); }}>Ir a {plan!.values.nombre}</button> : null}</div><div className={s.segmented} role="group" aria-label="Vista del calendario">{([['mes','Mes'],['semana','Semana'],['dia','Día']] as const).map(([id,label]) => <button key={id} aria-pressed={mode === id} onClick={() => setMode(id)}>{label}</button>)}</div></div>
      <div className={c.channelFilter} role="group" aria-label="Canal">{["todos", ...PIECE_CHANNELS].map((name) => <button key={name} type="button" aria-pressed={channel === name} onClick={() => setChannel(name)}>{name === "todos" ? <span>Todos</span> : <ChannelChip channel={name} label />}<em>{counts(name)}</em></button>)}</div>
      <div className={c.calendarScroll} data-mode={mode}>{mode === "mes" ? <div className={c.calendar} role="grid" aria-label={`Calendario editorial · ${title}`}>
        {WEEKDAYS.map((day) => <div className={c.dayHeading} key={day} role="columnheader">{day}</div>)}{visibleDays.map((day) => { const list = byDate.get(iso(day)) || []; return <div className={c.monthDay} key={iso(day)} data-outside={day.getMonth() !== anchor.getMonth()} data-empty={!list.length} data-today={iso(day) === iso(new Date())} role="gridcell" aria-label={`${iso(day)}: ${list.length} contenidos`}><button className={c.dayNumber} disabled={!canPlan} onClick={() => setCreating({ fecha: iso(day) })} aria-label={`Crear contenido el ${iso(day)}`}><span>{day.getDate()}<small className={c.mobileOnly}> {day.toLocaleDateString("es-AR", { weekday: "short" })}</small></span><span aria-hidden="true">+</span></button>{list.map((record) => item(record))}</div>; })}
      </div> : mode === "semana" ? <div className={c.agenda} style={{ gridTemplateColumns: `54px repeat(${days.length}, minmax(120px, 1fr))` }} aria-label="Agenda semanal"><div className={c.dayHeading}>Hora</div>{days.map((day) => <div className={c.dayHeading} key={iso(day)} data-today={iso(day) === iso(new Date())}>{day.toLocaleDateString("es-AR", { weekday: "short", day: "numeric" })}</div>)}<div className={c.hour}>Sin hora</div>{days.map((day) => <div className={c.hourCell} key={`undated-${iso(day)}`}>{(byDate.get(iso(day)) || []).filter((record) => !record.values.hora).map((record) => item(record))}</div>)}{hours.map((hour) => <div className={c.agendaRow} key={hour}><div className={c.hour}>{String(hour).padStart(2, "0")}:00</div>{days.map((day) => <div className={c.hourCell} key={iso(day)}>{(byDate.get(iso(day)) || []).filter((record) => record.values.hora && Number(record.values.hora.split(":")[0]) === hour).map((record) => item(record))}{canPlan ? <button className={c.addSlot} aria-label={`Crear contenido el ${iso(day)} a las ${hour}:00`} onClick={() => setCreating({ fecha: iso(day), hora: `${String(hour).padStart(2, "0")}:00` })}>+</button> : null}</div>)}</div>)}</div>
        : <div className={c.dayView} aria-label="Agenda diaria">{(byDate.get(iso(anchor)) || []).length ? (byDate.get(iso(anchor)) || []).map((record) => item(record, true)) : <p className={c.empty}>Sin publicaciones para este día.</p>}{canPlan ? <button className={buttonClass("ghost", true)} onClick={() => setCreating({ fecha: iso(anchor) })}>Crear contenido el {iso(anchor)}</button> : null}</div>}</div>
      <div className={c.legend} aria-label="Referencias de etapa">{CONTENT_FLOW.map((step) => <span key={step.step} data-step={step.step}><i />{step.label}</span>)}</div>
      {undated ? <p className={c.empty}>{undated} contenidos sin fecha. Asignales una fecha desde su propuesta.</p> : null}
    </Panel><MetricoolNote />
    {creating ? <ContentEditor client={client} initial={creating} refs={data} onClose={() => setCreating(null)} onSave={(values) => { const record = operations.saveDraft(values); if (record) { setCreating(null); setOpenId(record.id); } }} /> : null}
    {open ? <ContentDetail key={open.id} client={client} record={open} editable={editable} onClose={() => setOpenId(null)} /> : null}
  </div>;
}

/* ───────── C · Banco de ideas ───────── */
const IDEA_TYPES = [["Oportunidad", "Oportunidades"], ["Referencia", "Referencias"], ["Contenido futuro", "Contenidos futuros"]] as const;
export function IdeasSection({ client, editable }: { client: OsClient; editable: boolean }) {
  const { notify, role } = useOsStore();
  const { data, create, update } = useModuleRecords(client.slug, SERVICE, CONTENT_REFS);
  const operations = useContentOperations(client);
  const [openId, setOpenId] = useState<string | null>(null);
  const [convertId, setConvertId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [hideClosed, setHideClosed] = useState(false);
  const list = (data.ideas || []).filter((idea) => (!hideClosed || !["Descartada", "Convertida en pieza"].includes(idea.values.estado)) && Object.values(idea.values).join(" ").toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")));
  const open = (data.ideas || []).find((record) => record.id === openId);
  const convert = (data.ideas || []).find((record) => record.id === convertId);
  const canPlan = editable && PLANNERS.includes(role);
  function convertIdea(values: Record<string, string>) {
    if (!convert) return;
    const ideaKey = moduleKey(client.slug, SERVICE, "ideas");
    const pieceKey = moduleKey(client.slug, SERVICE, "piezas");
    const freshIdeas = readLocalJson<ModuleRecord[]>(ideaKey, seedRecords(client.slug, SERVICE, "ideas"));
    const freshPieces = readLocalJson<ModuleRecord[]>(pieceKey, seedRecords(client.slug, SERVICE, "piezas"));
    const source = freshIdeas.find((record) => record.id === convert.id);
    if (!source || source.updatedAt !== convert.updatedAt) { notify("La idea cambió. Volvé a abrirla antes de convertirla.", "error"); return; }
    const existing = freshPieces.find((record) => record.values.ideaId === source.id);
    if (existing) { notify("Esta idea ya tiene un contenido planificado.", "error"); return; }
    const actor = previewActor(role);
    const record = operations.saveDraft(ideaToContentValues(source, values), undefined, (created) => {
      const linked = { ...source, user: actor, updatedAt: created.updatedAt, values: { ...source.values, estado: "Convertida en pieza", contenidoId: created.id }, history: [{ at: created.updatedAt, user: actor, text: `Convertida en contenido ${created.id}` }, ...source.history] };
      return [{ key: ideaKey, value: freshIdeas.map((idea) => idea.id === source.id ? linked : idea) }];
    });
    if (record) { setConvertId(null); notify("Idea convertida; origen y referencia conservados", "success"); }
  }
  const ideaCard = (idea: ModuleRecord) => <article className={c.ideaCard} key={idea.id} data-state={idea.values.estado}><div className={c.ideaTop}><span className={c.eyebrow}>{idea.values.origen || "Equipo"}{idea.values.mesSugerido ? ` · ${monthLabel(idea.values.mesSugerido)}` : ""}</span><StatusBadge status={idea.values.estado} /></div><h3>{idea.values.idea}</h3>{idea.values.detalle ? <p>{idea.values.detalle}</p> : null}<AxisTag axes={data.ejes || []} id={idea.values.eje} />{safeContentUrl(idea.values.url) ? <a href={idea.values.url} className={s.link} target="_blank" rel="noreferrer">Ver referencia</a> : null}<div className={c.actionRow}>{idea.values.contenidoId ? <Link className={s.link} href={`/v2/clientes/${client.slug}/contenido?seccion=piezas&registro=${idea.values.contenidoId}`}>Abrir contenido</Link> : <button className={buttonClass("secondary", true)} disabled={!canPlan || idea.values.estado === "Descartada"} onClick={() => setConvertId(idea.id)}>Planificar contenido</button>}<button className={buttonClass("ghost", true)} onClick={() => setOpenId(idea.id)}>Detalle</button></div></article>;
  const untyped = list.filter((idea) => !IDEA_TYPES.some(([type]) => type === idea.values.tipo));
  return <div className={m.stack}>
    <Panel title="Banco de ideas" id="idea-conversion" description="Oportunidades, referencias y contenidos futuros. Cada idea conserva su origen y puede pasar al plan." actions={<button className={buttonClass("primary", true)} disabled={!editable} onClick={() => setCreating(true)}>Nueva idea</button>}>
      <div className={c.toolbar}><label>Buscar idea<input className={s.input} type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label className={c.check}><input type="checkbox" checked={hideClosed} onChange={(event) => setHideClosed(event.target.checked)} /> Ocultar convertidas y descartadas</label></div>
      <div className={c.ideaBoard}>{IDEA_TYPES.map(([type, label]) => { const items = list.filter((idea) => idea.values.tipo === type); return <section key={type} className={c.ideaColumn} aria-label={label}><h3>{label} <b>{items.length}</b></h3>{items.map(ideaCard)}</section>; })}{untyped.length ? <section className={c.ideaColumn} aria-label="Sin clasificar"><h3>Sin clasificar <b>{untyped.length}</b></h3>{untyped.map(ideaCard)}</section> : null}</div>
      {!list.length ? <p className={c.empty}>{ideas.empty}</p> : null}
    </Panel>
    {creating ? <OSModal title="Nueva idea" titleId="content-idea-title" onClose={() => setCreating(false)} footer={<><button className={buttonClass("ghost")} onClick={() => setCreating(false)}>Cancelar</button><button type="submit" form="content-idea-form" className={buttonClass("primary")}>Guardar en este navegador</button></>}><RecordForm def={ideas} initial={{ estado: "Nueva", tipo: "Oportunidad" }} refs={data} titleKeyOf={contentTitleKey} formId="content-idea-form" onSubmit={(values) => { if (values.url && !safeContentUrl(values.url)) { notify("La URL de referencia debe empezar con http o https.", "error"); return; } if (create(ideas, values)) { setCreating(false); notify("Idea guardada en este navegador", "success"); } else notify("No se pudo guardar en este navegador", "error"); }} /></OSModal> : null}
    {open ? <RecordPanel client={client} serviceId={SERVICE} def={ideas} record={open} refs={data} titleKeyOf={contentTitleKey} editable={editable} onClose={() => setOpenId(null)} onSave={(values, text) => update("ideas", open.id, values, text)} /> : null}
    {convert ? <ContentEditor client={client} title="Planificar idea como contenido" initial={ideaToContentValues(convert)} refs={data} onClose={() => setConvertId(null)} onSave={convertIdea} /> : null}
  </div>;
}

export function ContentResultsSection({ client, editable }: { client: OsClient; editable: boolean }) {
  const report = useContentReport(client);
  return <div className={m.stack}><MetricoolNote /><ContentReportView report={report} clientSlug={client.slug} embedded /><CollectionView client={client} serviceId={SERVICE} def={learningsDef} editable={editable} /></div>;
}
export type { ContentState };
