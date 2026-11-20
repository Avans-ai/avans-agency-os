"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { previewActor } from "../preview-roles";
import { OSModal } from "../overlays";
import { readLocalJson } from "../local-persistence";
import { buttonClass } from "../ui";
import s from "../os.module.css";
import { BarChart } from "../reports/charts";
import { ContentReportView } from "../reports/report-views";
import { useContentReport } from "../reports/use-report-data";
import { CollectionView, RecordForm, RecordPanel } from "./collection-view";
import { collectionDef } from "./collections";
import { axes, ideas, plans, PIECE_CHANNELS } from "./content-collections";
import { ContentDetail, ContentEditor, contentTitleKey } from "./content-detail";
import { CONTENT_STATES, contentState, ideaToContentValues, safeContentUrl } from "./content-workflow";
import { TaskHealthStrip } from "./module-common";
import { Panel, StatusBadge } from "./module-ui";
import { moduleKey, seedRecords, useModuleRecords } from "./store";
import type { ModuleRecord } from "./types";
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

function MetricoolNote() {
  return <div className={c.integration}><strong>Metricool · pendiente de conexión</strong><span>Este calendario muestra los contenidos guardados en Avans. La sincronización y programación requieren validar acceso y permisos de una cuenta de prueba.</span></div>;
}

export function ContentSummary({ client, go }: { client: OsClient; go: (section: string, extra?: Record<string, string>) => void }) {
  const { data } = useModuleRecords(client.slug, SERVICE, CONTENT_REFS);
  const records = data.piezas || [];
  const pending = records.filter((record) => /Revisión|Aprobación/.test(contentState(record)));
  return <div className={m.stack}>
    <TaskHealthStrip client={client} serviceId={SERVICE} extra={[{ label: "Contenidos", value: records.length }, { label: "En revisión", value: pending.length, alert: pending.length > 0 }, { label: "Planes mensuales", value: (data.planes || []).length }]} />
    <Panel title="Producción editorial" id="content-production" description="Propuesta preliminar → Diseño → Aprobación final → Programación" actions={<><button className={buttonClass("secondary", true)} onClick={() => go("planes")}>Plan mensual</button><button className={buttonClass("primary", true)} onClick={() => go("piezas")}>Abrir contenidos</button></>}>
      <div className={c.summaryStates}>{CONTENT_STATES.filter((state) => state !== "Publicada").map((state) => <button key={state} onClick={() => go("piezas", { estado: state })}><strong>{records.filter((record) => contentState(record) === state).length}</strong><span>{state}</span></button>)}</div>
    </Panel>
    <div className={c.summaryGrid}><Panel title="Próximas revisiones" id="content-pending"><div className={m.rows}>{pending.length ? pending.slice(0, 6).map((record) => <button className={c.recordRow} key={record.id} onClick={() => go("piezas", { registro: record.id })}><span><strong>{record.values.titulo}</strong><small>{record.values.canal} · {record.values.fecha || "Sin fecha"}</small></span><StatusBadge status={contentState(record)} /></button>) : <p className={c.empty}>No hay revisiones pendientes.</p>}</div></Panel><Panel title="Fuentes de trabajo" id="content-sources"><div className={c.quickLinks}><button onClick={() => go("ideas")}>Banco de ideas <strong>{(data.ideas || []).length}</strong></button><button onClick={() => go("ejes")}>Ejes temáticos <strong>{(data.ejes || []).length}</strong></button><button onClick={() => go("calendario")}>Calendario editorial →</button><Link href={`/v2/clientes/${client.slug}?view=ficha`}>Ficha, materiales y glosario →</Link></div></Panel></div>
    <MetricoolNote />
  </div>;
}

export function PlansSection({ client, editable }: { client: OsClient; editable: boolean }) {
  const { notify, role } = useOsStore();
  const canPlan = editable && ["admin", "pm", "content", "operativo"].includes(role);
  const { data, create, update } = useModuleRecords(client.slug, SERVICE, ["planes", "piezas", "ejes"]);
  const [open, setOpen] = useState<ModuleRecord | "new" | null>(null);
  const [error, setError] = useState("");
  const initial = open && open !== "new" ? open.values : { mes: iso(REFERENCE).slice(0, 7), estado: "Planificación", responsable: client.team.find((member) => /Contenido/.test(member.role))?.name || "" };
  return <>
    <Panel title="Planificación mensual" id="content-plans" description="Temáticas, volumen, canales, fechas y responsables del mes." actions={<button className={buttonClass("primary", true)} disabled={!canPlan} onClick={() => { setOpen("new"); setError(""); }}>Nuevo plan mensual</button>}>
      <div className={c.cards}>{(data.planes || []).map((plan) => { const assigned = (data.piezas || []).filter((record) => record.values.plan === plan.id); const done = assigned.filter((record) => ["Programado", "Publicada"].includes(contentState(record))).length; return <article className={c.planCard} key={plan.id}><div className={c.meta}><strong>{plan.values.mes}</strong><StatusBadge status={plan.values.estado} /></div><h3>{plan.values.nombre}</h3><p>{plan.values.tematicas}</p><div className={c.planProgress}><strong>{assigned.length} / {plan.values.cantidad || "—"}</strong><span>contenidos planificados · {done} programados</span><progress value={assigned.length} max={Math.max(Number(plan.values.cantidad) || 1, assigned.length)} /></div><p className={s.cellSub}>{plan.values.canales || "Canales pendientes"} · {plan.values.formatos || "Formatos pendientes"}</p><p className={s.cellSub}>{plan.values.responsable || "Sin responsable"}</p><div className={c.actionRow}><Link className={s.link} href={`/v2/clientes/${client.slug}/contenido?seccion=piezas&plan=${plan.id}`}>Ver contenidos</Link><button className={buttonClass("secondary", true)} disabled={!canPlan} onClick={() => { setOpen(plan); setError(""); }}>Editar plan</button></div></article>; })}{!(data.planes || []).length ? <p className={c.empty}>{plans.empty}</p> : null}</div>
    </Panel>
    {open ? <OSModal title={open === "new" ? "Nuevo plan mensual" : "Editar plan mensual"} titleId="monthly-plan-title" onClose={() => setOpen(null)} footer={<><button className={buttonClass("ghost")} onClick={() => setOpen(null)}>Cancelar</button><button className={buttonClass("primary")} type="submit" form="monthly-plan-form">Guardar plan mensual</button></>}>
      {error ? <p role="alert" className={s.fieldError}>{error}</p> : null}<RecordForm def={plans} initial={initial} refs={data} titleKeyOf={contentTitleKey} formId="monthly-plan-form" onSubmit={(values) => { if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(values.mes)) { setError("Ingresá un mes válido en formato AAAA-MM."); return; } if (!Number.isInteger(Number(values.cantidad)) || Number(values.cantidad) < 1) { setError("La cantidad debe ser un entero mayor que cero."); return; } if ((data.planes || []).some((plan) => plan.values.mes === values.mes && plan.id !== (open === "new" ? "" : open.id))) { setError("Ya existe un plan para este mes. Editá ese plan."); return; } const ok = open === "new" ? create(plans, values) : update("planes", open.id, values, "Actualizó la planificación mensual"); if (ok) { setOpen(null); notify("Plan mensual guardado", "success"); } else setError("No se pudo guardar. Revisá el almacenamiento del navegador."); }} />
    </OSModal> : null}
  </>;
}

export function PiecesSection({ client, editable }: { client: OsClient; editable: boolean }) {
  const { notify, role } = useOsStore();
  const canPlan = editable && ["admin", "pm", "content", "operativo"].includes(role);
  const params = useSearchParams();
  const { data } = useModuleRecords(client.slug, SERVICE, CONTENT_REFS);
  const operations = useContentOperations(client);
  const router = useRouter();
  const pathname = usePathname();
  const openId = params.get("registro");
  const setOpenId = (id: string | null) => { const next = new URLSearchParams(params.toString()); if (id) next.set("registro", id); else next.delete("registro"); router.replace(`${pathname}?${next.toString()}`, { scroll: false }); };
  const [creating, setCreating] = useState(false);
  const [state, setState] = useState(params.get("estado") || "todos");
  const [plan, setPlan] = useState(params.get("plan") || "todos");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"lista" | "kanban">("lista");
  const records = data.piezas || [];
  const shown = records.filter((record) => (state === "todos" || contentState(record) === state) && (plan === "todos" || record.values.plan === plan) && `${record.values.titulo} ${record.values.idea}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")));
  const open = records.find((record) => record.id === openId);
  const card = (record: ModuleRecord) => <button className={c.kanbanCard} key={record.id} onClick={() => setOpenId(record.id)}><strong>{record.values.titulo}</strong><span>{record.values.canal} · {record.values.formato}</span><span>{record.values.fecha || "Sin fecha"} {record.values.hora}</span><small>{record.values.responsable || "Sin responsable"}</small></button>;
  return <>
    <Panel title="Contenidos del cliente" id="content-pieces" actions={<button className={buttonClass("primary", true)} disabled={!canPlan} onClick={() => setCreating(true)}>Nuevo contenido</button>}>
      <div className={c.toolbar}><label>Buscar contenido<input className={s.input} type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label>Estado<select className={s.input} value={state} onChange={(event) => setState(event.target.value)}><option value="todos">Todos</option>{CONTENT_STATES.map((item) => <option key={item}>{item}</option>)}</select></label><label>Plan mensual<select className={s.input} value={plan} onChange={(event) => setPlan(event.target.value)}><option value="todos">Todos</option>{(data.planes || []).map((item) => <option value={item.id} key={item.id}>{item.values.nombre}</option>)}</select></label><div className={s.segmented} role="group" aria-label="Vista de contenidos"><button aria-pressed={view === "lista"} onClick={() => setView("lista")}>Lista</button><button aria-pressed={view === "kanban"} onClick={() => setView("kanban")}>Kanban</button></div></div>
      {view === "kanban" ? <div className={c.kanban} aria-label="Kanban de contenidos">{CONTENT_STATES.map((status) => <section className={c.kanbanColumn} key={status}><h3>{status} <span>{shown.filter((item) => contentState(item) === status).length}</span></h3>{shown.filter((item) => contentState(item) === status).map(card)}</section>)}</div> : <div className={c.tableWrap}><table className={c.table} aria-label="Contenidos planificados"><thead><tr><th>Contenido</th><th>Eje</th><th>Canal / formato</th><th>Estado</th><th>Publicación</th><th>Responsable</th></tr></thead><tbody>{shown.map((record) => <tr key={record.id}><td><button className={c.titleButton} onClick={() => setOpenId(record.id)}>{record.values.titulo}</button></td><td>{(data.ejes || []).find((axis) => axis.id === record.values.eje)?.values.nombre || "Sin eje"}</td><td>{record.values.canal}<small>{record.values.formato}</small></td><td><StatusBadge status={contentState(record)} /></td><td>{record.values.fecha || "Sin fecha"}<small>{record.values.hora}</small></td><td>{record.values.responsable || "Sin asignar"}</td></tr>)}</tbody></table>{!shown.length ? <p className={c.empty}>No hay contenidos con estos filtros.</p> : null}</div>}
    </Panel>
    {creating ? <ContentEditor client={client} initial={{ plan: plan === "todos" ? "" : plan }} refs={data} onClose={() => setCreating(false)} onSave={(values) => { const record = operations.saveDraft(values); if (record) { setCreating(false); setOpenId(record.id); notify("Contenido y tarea guardados", "success"); } }} /> : null}
    {open ? <ContentDetail key={open.id} client={client} record={open} editable={editable} onClose={() => setOpenId(null)} /> : null}
  </>;
}

export function CalendarSection({ client, editable }: { client: OsClient; editable: boolean }) {
  const { role } = useOsStore();
  const canPlan = editable && ["admin", "pm", "content", "operativo"].includes(role);
  const { data } = useModuleRecords(client.slug, SERVICE, CONTENT_REFS);
  const operations = useContentOperations(client);
  const [mode, setMode] = useState<"mes" | "semana" | "dia">("mes");
  const [anchor, setAnchor] = useState(REFERENCE);
  const [channel, setChannel] = useState("todos");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState<Record<string, string> | null>(null);
  const records = data.piezas || [];
  const filtered = records.filter((record) => channel === "todos" || record.values.canal === channel || (channel === "Blog" && record.values.canal === "Web") || (channel === "Newsletter" && record.values.canal === "Email"));
  const byDate = useMemo(() => { const map = new Map<string, ModuleRecord[]>(); for (const record of filtered) { const key = record.values.fecha?.slice(0, 10); if (key) map.set(key, [...(map.get(key) || []), record]); } return map; }, [filtered]);
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
  const begin = mode === "mes" ? startOfWeek(monthStart) : mode === "semana" ? startOfWeek(anchor) : anchor;
  const days = Array.from({ length: mode === "mes" ? 42 : mode === "semana" ? 7 : 1 }, (_, index) => { const day = new Date(begin); day.setDate(day.getDate() + index); return day; });
  const visibleDays = mode === "mes" && days.slice(35).every((day) => day.getMonth() !== anchor.getMonth()) ? days.slice(0, 35) : days;
  const title = mode === "mes" ? anchor.toLocaleDateString("es-AR", { month: "long", year: "numeric" }) : mode === "semana" ? `Semana del ${iso(days[0])}` : anchor.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  const open = records.find((record) => record.id === openId);
  const undated = filtered.filter((record) => !record.values.fecha).length;
  function shift(direction: number) { const next = new Date(anchor); if (mode === "mes") next.setMonth(next.getMonth() + direction, 1); else next.setDate(next.getDate() + direction * (mode === "semana" ? 7 : 1)); setAnchor(next); }
  function item(record: ModuleRecord) { return <button className={c.calendarItem} key={record.id} data-state={contentState(record)} onClick={() => setOpenId(record.id)}><strong>{record.values.hora || "Sin hora"} · {record.values.titulo}</strong><span>{record.values.canal} · {contentState(record)}</span></button>; }
  return <div className={m.stack}>
    <Panel title="Calendario editorial" id="content-calendar" actions={<button className={buttonClass("primary", true)} disabled={!canPlan} onClick={() => setCreating({ fecha: iso(anchor) })}>Nuevo contenido</button>}>
      <div className={c.toolbar}><div className={c.calNavigation}><button className={buttonClass("secondary", true)} aria-label={mode === "mes" ? "Mes anterior" : mode === "semana" ? "Semana anterior" : "Día anterior"} onClick={() => shift(-1)}>‹</button><strong aria-live="polite">{title}</strong><button className={buttonClass("secondary", true)} aria-label={mode === "mes" ? "Mes siguiente" : mode === "semana" ? "Semana siguiente" : "Día siguiente"} onClick={() => shift(1)}>›</button><button className={buttonClass("ghost", true)} onClick={() => setAnchor(new Date())}>Hoy</button></div><label>Canal<select aria-label="Canal" className={s.input} value={channel} onChange={(event) => setChannel(event.target.value)}><option value="todos">Todos</option>{PIECE_CHANNELS.map((item) => <option key={item}>{item}</option>)}</select></label><div className={s.segmented} role="group" aria-label="Vista del calendario">{([['mes','Mes'],['semana','Semana'],['dia','Día']] as const).map(([id,label]) => <button key={id} aria-pressed={mode === id} onClick={() => setMode(id)}>{label}</button>)}</div></div>
      <div className={c.calendarScroll}>{mode === "mes" ? <div className={c.calendar} role="grid" aria-label={`Calendario editorial · ${title}`}>
        {WEEKDAYS.map((day) => <div className={c.dayHeading} key={day} role="columnheader">{day}</div>)}{visibleDays.map((day) => <div className={c.monthDay} key={iso(day)} data-outside={day.getMonth() !== anchor.getMonth()} role="gridcell" aria-label={`${iso(day)}: ${(byDate.get(iso(day)) || []).length} contenidos`}><button className={c.dayNumber} disabled={!canPlan} onClick={() => setCreating({ fecha: iso(day) })} aria-label={`Crear contenido el ${iso(day)}`}>{day.getDate()}<span>+</span></button>{(byDate.get(iso(day)) || []).map(item)}</div>)}
      </div> : <div className={c.agenda} style={{ gridTemplateColumns: `54px repeat(${days.length}, minmax(${mode === "dia" ? "220" : "120"}px, 1fr))` }} aria-label={mode === "dia" ? "Agenda diaria" : "Agenda semanal"}><div className={c.dayHeading}>Hora</div>{days.map((day) => <div className={c.dayHeading} key={iso(day)}>{day.toLocaleDateString("es-AR", { weekday: "short", day: "numeric" })}</div>)}<div className={c.hour}>Sin hora</div>{days.map((day) => <div className={c.hourCell} key={`undated-${iso(day)}`}>{(byDate.get(iso(day)) || []).filter((record) => !record.values.hora).map(item)}</div>)}{Array.from({ length: 24 }, (_, hour) => <div className={c.agendaRow} key={hour}><div className={c.hour}>{String(hour).padStart(2, "0")}:00</div>{days.map((day) => <div className={c.hourCell} key={iso(day)}>{(byDate.get(iso(day)) || []).filter((record) => record.values.hora && Number(record.values.hora.split(":")[0]) === hour).map(item)}{canPlan ? <button className={c.addSlot} aria-label={`Crear contenido el ${iso(day)} a las ${hour}:00`} onClick={() => setCreating({ fecha: iso(day), hora: `${String(hour).padStart(2, "0")}:00` })}>+</button> : null}</div>)}</div>)}</div>}</div>
      {undated ? <p className={c.empty}>{undated} contenidos sin fecha. Asignales una fecha desde su propuesta.</p> : null}
    </Panel><MetricoolNote />
    {creating ? <ContentEditor client={client} initial={creating} refs={data} onClose={() => setCreating(null)} onSave={(values) => { const record = operations.saveDraft(values); if (record) { setCreating(null); setOpenId(record.id); } }} /> : null}
    {open ? <ContentDetail key={open.id} client={client} record={open} editable={editable} onClose={() => setOpenId(null)} /> : null}
  </div>;
}

export function AxesSection({ client, editable }: { client: OsClient; editable: boolean }) {
  const { role } = useOsStore();
  const { data } = useModuleRecords(client.slug, SERVICE, ["ejes", "piezas"]);
  const chart = (data.ejes || []).map((axis) => { const count = (data.piezas || []).filter((piece) => piece.values.eje === axis.id).length; return { label: axis.values.nombre || axis.id, value: Number(axis.values.participacion) || 0, secondary: count, display: `${axis.values.participacion || 0} % objetivo`, secondaryDisplay: `${count} contenidos` }; });
  return <div className={m.stack}>{chart.length ? <Panel title="Distribución por eje" id="content-axes"><div className={m.panelBody}><BarChart title="Participación objetivo por eje temático" data={chart} primaryLabel="Participación objetivo" secondaryLabel="Contenidos" /></div></Panel> : null}<CollectionView client={client} serviceId={SERVICE} def={axes} editable={editable && ["admin", "pm", "content", "operativo"].includes(role)} /></div>;
}

export function IdeasSection({ client, editable }: { client: OsClient; editable: boolean }) {
  const { notify, role } = useOsStore();
  const { data, update } = useModuleRecords(client.slug, SERVICE, CONTENT_REFS);
  const operations = useContentOperations(client);
  const [openId, setOpenId] = useState<string | null>(null);
  const [convertId, setConvertId] = useState<string | null>(null);
  const open = (data.ideas || []).find((record) => record.id === openId);
  const convert = (data.ideas || []).find((record) => record.id === convertId);
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
  return <div className={m.stack}>
    <CollectionView client={client} serviceId={SERVICE} def={ideas} editable={editable} onOpenRecord={(record) => setOpenId(record.id)} />
    <Panel title="De idea a contenido" id="idea-conversion"><div className={c.cards}>{(data.ideas || []).map((idea) => <article className={c.ideaCard} key={idea.id}><span className={c.eyebrow}>{idea.values.origen || "Equipo"}</span><h3>{idea.values.idea}</h3><p>{idea.values.detalle}</p>{safeContentUrl(idea.values.url) ? <a href={idea.values.url} className={s.link} target="_blank" rel="noreferrer">Ver referencia</a> : null}<div className={c.actionRow}>{idea.values.contenidoId ? <Link className={s.link} href={`/v2/clientes/${client.slug}/contenido?seccion=piezas&registro=${idea.values.contenidoId}`}>Abrir contenido</Link> : <button className={buttonClass("secondary", true)} disabled={!editable || !["admin", "pm", "content", "operativo"].includes(role) || idea.values.estado === "Descartada"} onClick={() => setConvertId(idea.id)}>Planificar contenido</button>}<StatusBadge status={idea.values.estado} /></div></article>)}</div></Panel>
    {open ? <RecordPanel client={client} serviceId={SERVICE} def={ideas} record={open} refs={data} titleKeyOf={contentTitleKey} editable={editable} onClose={() => setOpenId(null)} onSave={(values, text) => update("ideas", open.id, values, text)} /> : null}
    {convert ? <ContentEditor client={client} title="Planificar idea como contenido" initial={ideaToContentValues(convert)} refs={data} onClose={() => setConvertId(null)} onSave={convertIdea} /> : null}
  </div>;
}

export function ContentResultsSection({ client, editable }: { client: OsClient; editable: boolean }) {
  const report = useContentReport(client);
  return <div className={m.stack}><ContentReportView report={report} clientSlug={client.slug} embedded /><CollectionView client={client} serviceId={SERVICE} def={learningsDef} editable={editable} /></div>;
}
