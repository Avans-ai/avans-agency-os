"use client";

/* Plan de contenidos (por período): objetivos, ejes temáticos, ideas y bajadas, canales y
 * formatos, y material que necesitamos del cliente. Reúne lo que antes eran Plan mensual,
 * Ejes temáticos, Banco de ideas y la lista de Piezas, sin perder datos ni funciones.
 * El período (`plan`) y la parte visible (`bloque`) viajan en la URL; un contenido se abre
 * en el Calendario con «Volver» a este plan. */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { previewActor } from "../preview-roles";
import { OSModal } from "../overlays";
import { readLocalJson } from "../local-persistence";
import { useKnowledge } from "../knowledge/use-knowledge";
import { ReturnLink, useReturnNavigation } from "../navigation/back";
import { serviceHref } from "../service-workspace-data";
import { buttonClass } from "../ui";
import s from "../os.module.css";
import { BarChart } from "../reports/charts";
import { RecordForm, RecordPanel } from "./collection-view";
import { axes as axesDef, channelGroup, ideas as ideasDef, plans as plansDef, PIECE_CHANNELS } from "./content-collections";
import { pieceHref } from "./content-calendar-state";
import { ContentEditor, contentTitleKey } from "./content-detail";
import { documentsHref } from "./content-materials";
import { AxisTag, ChannelChip, CONTENT_PLANNERS, ContentDemoBanner, StagePill, Thumb, axisTone, monthLabel, pickPlan, planPieces, shortDate, stateCount, useContentDemoTasks, useContentThumbs } from "./content-ui";
import { CONTENT_FLOW, clientRequests, contentFlowStep, contentState, ideaToContentValues, safeContentUrl } from "./content-workflow";
import { StatusBadge } from "./module-ui";
import { moduleKey, seedRecords, useModuleRecords, type ModuleData } from "./store";
import type { CollectionDef, ModuleRecord } from "./types";
import { useContentOperations } from "./use-content-operations";
import c from "./content.module.css";

const SERVICE = "contenidos" as const;
const REFERENCE = new Date(2026, 10, 20, 12);
export const PLAN_BLOCKS = [["objetivos", "Objetivos"], ["ejes", "Ejes temáticos"], ["ideas", "Ideas y bajadas"], ["canales", "Canales y formatos"], ["material", "Material del cliente"]] as const;
export type PlanBlock = typeof PLAN_BLOCKS[number][0];
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const lines = (value = "") => value.split("\n").map((item) => item.trim()).filter(Boolean);
const csv = (value = "") => value.split(/[,·]/).map((item) => item.trim()).filter(Boolean);

export function ContentPlanSection({ client, editable, defaultBlock = "objetivos" }: { client: OsClient; editable: boolean; defaultBlock?: PlanBlock }) {
  useContentDemoTasks(client);
  const { notify, role } = useOsStore();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const navigate = useReturnNavigation();
  const canPlan = editable && CONTENT_PLANNERS.includes(role);
  const { data, create, update } = useModuleRecords(client.slug, SERVICE, ["planes", "piezas", "ejes", "ideas"]);
  const thumbs = useContentThumbs(client);
  const operations = useContentOperations(client);
  const [open, setOpen] = useState<ModuleRecord | "new" | null>(null);
  const [creating, setCreating] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState("");
  const list = [...(data.planes || [])].sort((a, b) => (a.values.mes || "").localeCompare(b.values.mes || ""));
  const plan = list.find((item) => item.id === params.get("plan")) || pickPlan(list);
  const requested = params.get("bloque");
  const block: PlanBlock = PLAN_BLOCKS.some(([id]) => id === requested) ? requested as PlanBlock : defaultBlock;
  const records = data.piezas || [];
  const axisList = data.ejes || [];
  const pieces = planPieces(records, plan).sort((a, b) => (a.values.fecha || "9999").localeCompare(b.values.fecha || "9999"));
  const base = serviceHref(client.slug, SERVICE);
  const openPiece = (record: ModuleRecord) => navigate(pieceHref(base, record.id, record.values.fecha || (plan?.values.mes ? `${plan.values.mes}-01` : "")));
  function setParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) { if (value) next.set(key, value); else next.delete(key); }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }
  const initial = open && open !== "new" ? open.values : { mes: iso(new Date(REFERENCE.getFullYear(), REFERENCE.getMonth() + 1, 1)).slice(0, 7), estado: "Planificación", responsable: client.team.find((member) => /Contenido/.test(member.role))?.name || "" };
  const pendingRequests = pieces.flatMap((record) => clientRequests(record.values)).filter((item) => item.status === "Pendiente").length;
  const periodIdeas = (data.ideas || []).filter((idea) => plan && idea.values.mesSugerido === plan.values.mes && !["Descartada", "Convertida en pieza"].includes(idea.values.estado)).length;
  return <div className={c.section}>
    <ContentDemoBanner client={client} records={records} editable={canPlan} />
    <section className={c.workPanel} aria-labelledby="content-plans">
      <header className={c.workHead}>
        <div><h2 id="content-plans">Plan de contenidos</h2><p>Qué vamos a contar en cada período y qué necesitamos para hacerlo.</p></div>
        <button className={buttonClass("primary", true)} disabled={!canPlan} onClick={() => { setOpen("new"); setError(""); }}>Nuevo plan mensual</button>
      </header>
      {list.length ? <div className={c.monthTabs} role="group" aria-label="Planes mensuales">{list.map((item) => <button key={item.id} type="button" aria-pressed={item.id === plan?.id} onClick={() => setParams({ plan: item.id })}><span>{monthLabel(item.values.mes)}</span><small>{planPieces(records, item).length}/{item.values.cantidad || "—"} · {item.values.estado}</small></button>)}</div> : <p className={c.empty}>{plansDef.empty}</p>}
      {plan ? <>
        <div className={c.planHead}>
          <div><span className={c.eyebrow}>{monthLabel(plan.values.mes)} · {plan.values.responsable || "Sin responsable"}</span><h3>{plan.values.nombre}</h3><StatusBadge status={plan.values.estado} /></div>
          <div className={c.actionRow}><ReturnLink className={buttonClass("secondary", true)} href={`${base}?seccion=calendario&mes=${plan.values.mes}`}>Ver en el calendario</ReturnLink><button className={buttonClass("secondary", true)} disabled={!canPlan} onClick={() => setCreating({ plan: plan.id, fecha: `${plan.values.mes}-01` })}>Nuevo contenido en el plan</button><button className={buttonClass("ghost", true)} disabled={!canPlan} onClick={() => { setOpen(plan); setError(""); }}>Editar plan</button></div>
        </div>
        <div className={c.kpis} aria-label="Resumen del período">
          <span><strong>{pieces.length}<small>/{plan.values.cantidad || "—"}</small></strong>contenidos</span>
          <span><strong>{stateCount(pieces, ["Revisión preliminar del cliente", "Aprobación final del cliente", "Información del cliente"])}</strong>esperan al cliente</span>
          <span><strong>{stateCount(pieces, ["Preproducción", "Producción de diseño", "Revisión interna del diseño"])}</strong>en producción</span>
          <span data-alert={pendingRequests > 0 || undefined}><strong>{pendingRequests}</strong>pedidos de material pendientes</span>
          <span><strong>{stateCount(pieces, ["Aprobado", "Programado", "Publicada"])}</strong>listos o programados</span>
        </div>
        <div className={c.tabs} role="group" aria-label="Partes del plan">{PLAN_BLOCKS.map(([id, label]) => <button key={id} type="button" aria-pressed={block === id} onClick={() => setParams({ bloque: id === defaultBlock ? null : id })}>{label}{id === "ideas" && periodIdeas ? <em className={c.count}>{periodIdeas}</em> : id === "material" && pendingRequests ? <em className={c.count}>{pendingRequests}</em> : null}</button>)}</div>
      </> : null}
      <div className={c.blockBody}>
        {plan && block === "objetivos" ? <ObjectivesBlock plan={plan} pieces={pieces} axes={axisList} /> : null}
        {block === "ejes" ? <AxesBlock client={client} plan={plan} records={records} axes={axisList} refs={data} thumbs={thumbs} canPlan={canPlan} /> : null}
        {block === "ideas" ? <IdeasBlock client={client} plan={plan} pieces={pieces} refs={data} thumbs={thumbs} canPlan={canPlan} editable={editable} onOpenPiece={openPiece} /> : null}
        {plan && block === "canales" ? <ChannelsBlock plan={plan} pieces={pieces} /> : null}
        {plan && block === "material" ? <MaterialBlock client={client} pieces={pieces} onOpenPiece={openPiece} /> : null}
      </div>
    </section>
    {open ? <OSModal title={open === "new" ? "Nuevo plan mensual" : "Editar plan mensual"} titleId="monthly-plan-title" onClose={() => setOpen(null)} footer={<><button className={buttonClass("ghost")} onClick={() => setOpen(null)}>Cancelar</button><button className={buttonClass("primary")} type="submit" form="monthly-plan-form">Guardar plan mensual</button></>}>
      {error ? <p role="alert" className={s.fieldError}>{error}</p> : null}<RecordForm def={plansDef} initial={initial} refs={data} titleKeyOf={contentTitleKey} formId="monthly-plan-form" onSubmit={(values) => {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(values.mes)) { setError("Ingresá un mes válido en formato AAAA-MM."); return; }
        if (!Number.isInteger(Number(values.cantidad)) || Number(values.cantidad) < 1) { setError("La cantidad debe ser un entero mayor que cero."); return; }
        if ((data.planes || []).some((item) => item.values.mes === values.mes && item.id !== (open === "new" ? "" : open.id))) { setError("Ya existe un plan para este mes. Editá ese plan."); return; }
        if (open === "new") { const record = create(plansDef, values); if (record) { setParams({ plan: record.id }); setOpen(null); notify("Plan mensual guardado", "success"); } else setError("No se pudo guardar. Revisá el almacenamiento del navegador."); return; }
        if (update("planes", open.id, values, "Actualizó la planificación mensual")) { setOpen(null); notify("Plan mensual guardado", "success"); } else setError("No se pudo guardar. Revisá el almacenamiento del navegador.");
      }} />
    </OSModal> : null}
    {creating ? <ContentEditor client={client} initial={creating} refs={data} onClose={() => setCreating(null)} onSave={(values) => { const record = operations.saveDraft(values); if (record) { setCreating(null); notify("Contenido y tarea guardados", "success"); } }} /> : null}
  </div>;
}

/* ───────── Objetivos del período ───────── */
export function PlanSnapshot({ plan, pieces, axes: axisList }: { plan: ModuleRecord; pieces: ModuleRecord[]; axes: ModuleRecord[] }) {
  const target = Math.max(Number(plan.values.cantidad) || 0, pieces.length, 1);
  const byChannel = PIECE_CHANNELS.map((channel) => ({ channel, count: pieces.filter((record) => channelGroup(record.values.canal) === channel).length })).filter((item) => item.count);
  const max = Math.max(1, ...byChannel.map((item) => item.count));
  return <div className={c.snapshot}>
    <div className={c.gauge}><strong>{pieces.length}<small>/{plan.values.cantidad || "—"}</small></strong><span>contenidos planificados</span><div className={c.stack} aria-label="Contenidos por etapa">{CONTENT_FLOW.map((step) => { const count = stateCount(pieces, step.states); return count ? <i key={step.step} data-step={step.step} style={{ width: `${(count / target) * 100}%` }} title={`${step.label}: ${count}`} /> : null; })}</div><small className={c.muted}>{stateCount(pieces, ["Programado", "Publicada"])} programados · {stateCount(pieces, ["Revisión preliminar del cliente", "Aprobación final del cliente", "Información del cliente"])} esperan al cliente</small></div>
    <div className={c.bars} aria-label="Contenidos por canal">{byChannel.map((item) => <div key={item.channel} className={c.barRow}><ChannelChip channel={item.channel} label /><span className={c.bar}><i style={{ width: `${(item.count / max) * 100}%` }} /></span><b>{item.count}</b></div>)}</div>
    <div className={c.tagWrap}>{axisList.filter((axis) => pieces.some((record) => record.values.eje === axis.id)).map((axis) => <AxisTag key={axis.id} axes={axisList} id={axis.id} />)}</div>
  </div>;
}
function ObjectivesBlock({ plan, pieces, axes: axisList }: { plan: ModuleRecord; pieces: ModuleRecord[]; axes: ModuleRecord[] }) {
  const [year, month] = (plan.values.mes || "").split("-").map(Number);
  const days = year && month ? new Date(year, month, 0).getDate() : 0;
  const goals = lines(plan.values.objetivos);
  return <div className={c.planDetail}>
    <div className={c.planGrid}>
      <div className={c.planGoals}><h4>Objetivos del período</h4>{goals.length ? <ol className={c.goalList}>{goals.map((goal) => <li key={goal}>{goal}</li>)}</ol> : <p className={c.muted}>Sin objetivos cargados.</p>}<h4>Temáticas</h4><p>{plan.values.tematicas || "—"}</p>{plan.values.fechas ? <><h4>Fechas e hitos</h4><p>{plan.values.fechas}</p></> : null}</div>
      <PlanSnapshot plan={plan} pieces={pieces} axes={axisList} />
    </div>
    {days ? <div className={c.timeline30} aria-label={`Publicaciones de ${monthLabel(plan.values.mes)}`} style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}>{Array.from({ length: days }, (_, index) => { const date = `${plan.values.mes}-${String(index + 1).padStart(2, "0")}`; const items = pieces.filter((record) => record.values.fecha === date); const weekday = new Date(year, month - 1, index + 1).getDay(); return <div key={date} className={c.tlDay} data-weekend={weekday === 0 || weekday === 6} title={items.map((item) => item.values.titulo).join(" · ")}><span>{index + 1}</span>{items.map((item) => <i key={item.id} data-step={contentFlowStep(contentState(item))}><ChannelChip channel={item.values.canal} /></i>)}</div>; })}</div> : null}
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
  const def: CollectionDef = { ...axesDef, fields: axesDef.fields.map((field) => field.key === "icp" ? icps.length ? { ...field, type: "select", options: Array.from(new Set([...icps, ...(current ? [current] : [])])), hint: "ICP cargados en Discovery." } : { ...field, hint: "Discovery no tiene ICP cargados para esta cuenta: describí el perfil o completalo en Discovery." } : field) };
  const title = record ? "Editar eje temático" : "Nuevo eje temático";
  return <OSModal title={title} titleId="content-axis-title" onClose={onClose} footer={<><button className={buttonClass("ghost")} onClick={onClose}>Cancelar</button><button type="submit" form="content-axis-form" className={buttonClass("primary")}>Guardar en este navegador</button></>}>
    <RecordForm def={def} initial={record?.values || initial || { estado: "Activo" }} refs={refs} titleKeyOf={contentTitleKey} formId="content-axis-form" onSubmit={(values) => { const ok = record ? update("ejes", record.id, values, "Actualizó el eje temático") : create(axesDef, values); if (ok) { notify("Eje temático guardado en este navegador", "success"); onClose(); } else notify("No se pudo guardar en este navegador", "error"); }} />
  </OSModal>;
}
function AxesBlock({ client, plan, records, axes: axisList, refs, thumbs, canPlan }: { client: OsClient; plan?: ModuleRecord; records: ModuleRecord[]; axes: ModuleRecord[]; refs: ModuleData; thumbs: (id: string) => string; canPlan: boolean }) {
  const icps = useIcpOptions(client);
  const [open, setOpen] = useState<ModuleRecord | "new" | null>(null);
  const pieces = planPieces(records, plan);
  const inPlan = axisList.filter((axis) => (plan && axis.values.plan === plan.id) || pieces.some((record) => record.values.eje === axis.id));
  const others = axisList.filter((axis) => !inPlan.includes(axis));
  const card = (axis: ModuleRecord, scoped: boolean) => {
    const assigned = (scoped ? pieces : records).filter((record) => record.values.eje === axis.id);
    const target = Number(axis.values.cantidad) || 0;
    const linked = axis.values.icp && icps.includes(axis.values.icp);
    return <article key={axis.id} className={c.axisCard} data-tone={axisTone(axisList, axis.id)}>
      <div className={c.axisTop}><h4><button className={c.titleButton} disabled={!canPlan} onClick={() => setOpen(axis)}>{axis.values.nombre}</button></h4><StatusBadge status={axis.values.estado} /></div>
      <p>{axis.values.objetivo || axis.values.descripcion}</p>
      <dl className={c.axisFacts}><div><dt>Público</dt><dd>{axis.values.perfil || "—"}</dd></div><div><dt>ICP</dt><dd>{axis.values.icp || "Sin ICP"} <small className={c.muted}>{axis.values.icp ? linked ? "· vinculado a Discovery" : "· no vinculado a Discovery" : ""}</small></dd></div>{axis.values.relacionPlan ? <div><dt>Plan de Marketing</dt><dd>{axis.values.relacionPlan}</dd></div> : null}</dl>
      <div className={c.meter}><progress value={assigned.length} max={Math.max(target, assigned.length, 1)} aria-label={`Contenidos de ${axis.values.nombre}`} /><span>{assigned.length}/{target || "—"} · {axis.values.participacion || 0} %</span></div>
      <div className={c.thumbRow}>{assigned.slice(0, 6).map((record) => <Thumb key={record.id} src={thumbs(record.id)} title={record.values.titulo} channel={record.values.canal} size="xs" decorative />)}</div>
    </article>;
  };
  const chart = inPlan.map((axis) => { const count = pieces.filter((piece) => piece.values.eje === axis.id).length; return { label: axis.values.nombre || axis.id, value: Number(axis.values.participacion) || 0, secondary: count, display: `${axis.values.participacion || 0} % objetivo`, secondaryDisplay: `${count} contenidos` }; });
  return <div className={c.blockStack}>
    <div className={c.blockHead}><h3>Ejes del período · {inPlan.length}</h3><button className={buttonClass("secondary", true)} disabled={!canPlan} onClick={() => setOpen("new")}>Nuevo eje temático</button></div>
    <div className={c.axisCards}>{inPlan.map((axis) => card(axis, true))}{!inPlan.length ? <p className={c.empty}>{plan ? "Este período todavía no tiene ejes. Agregá al menos uno." : axesDef.empty}</p> : null}</div>
    {chart.length ? <div className={c.chartBox}><BarChart title="Participación objetivo por eje temático" data={chart} primaryLabel="Participación objetivo" secondaryLabel="Contenidos" /></div> : null}
    {others.length ? <details className={c.more} open={!plan}><summary>Ejes permanentes y de otros períodos · {others.length}</summary><div className={c.axisCards}>{others.map((axis) => card(axis, false))}</div></details> : null}
    {open ? <AxisEditor client={client} refs={refs} record={open === "new" ? undefined : open} initial={{ plan: plan?.id || "", estado: "Activo" }} onClose={() => setOpen(null)} /> : null}
  </div>;
}

/* ───────── Ideas y bajadas (contenidos del período + banco de ideas) ───────── */
const IDEA_TYPES = [["Oportunidad", "Oportunidades"], ["Referencia", "Referencias"], ["Contenido futuro", "Contenidos futuros"]] as const;
const IDEA_SCOPES = [["todas", "Todas"], ["periodo", "Para este período"], ["futuras", "Futuras"]] as const;
function IdeasBlock({ client, plan, pieces, refs, thumbs, canPlan, editable, onOpenPiece }: { client: OsClient; plan?: ModuleRecord; pieces: ModuleRecord[]; refs: ModuleData; thumbs: (id: string) => string; canPlan: boolean; editable: boolean; onOpenPiece: (record: ModuleRecord) => void }) {
  const { notify, role } = useOsStore();
  const { create, update } = useModuleRecords(client.slug, SERVICE, ["ideas"]);
  const operations = useContentOperations(client);
  const base = serviceHref(client.slug, SERVICE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [convertId, setConvertId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [hideClosed, setHideClosed] = useState(false);
  const [scope, setScope] = useState<typeof IDEA_SCOPES[number][0]>("todas");
  const allIdeas = refs.ideas || [];
  const month = plan?.values.mes || "";
  const inScope = (idea: ModuleRecord) => scope === "todas" || (scope === "periodo" ? idea.values.mesSugerido === month || (!idea.values.mesSugerido && !idea.values.contenidoId) : Boolean(idea.values.mesSugerido) && idea.values.mesSugerido > month);
  const list = allIdeas.filter((idea) => inScope(idea) && (!hideClosed || !["Descartada", "Convertida en pieza"].includes(idea.values.estado)) && Object.values(idea.values).join(" ").toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")));
  const open = allIdeas.find((record) => record.id === openId);
  const convert = allIdeas.find((record) => record.id === convertId);
  function convertIdea(values: Record<string, string>) {
    if (!convert) return;
    const ideaKey = moduleKey(client.slug, SERVICE, "ideas");
    const pieceKey = moduleKey(client.slug, SERVICE, "piezas");
    const freshIdeas = readLocalJson<ModuleRecord[]>(ideaKey, seedRecords(client.slug, SERVICE, "ideas"));
    const freshPieces = readLocalJson<ModuleRecord[]>(pieceKey, seedRecords(client.slug, SERVICE, "piezas"));
    const source = freshIdeas.find((record) => record.id === convert.id);
    if (!source || source.updatedAt !== convert.updatedAt) { notify("La idea cambió. Volvé a abrirla antes de convertirla.", "error"); return; }
    if (freshPieces.some((record) => record.values.ideaId === source.id)) { notify("Esta idea ya tiene un contenido planificado.", "error"); return; }
    const actor = previewActor(role);
    const record = operations.saveDraft(ideaToContentValues(source, values), undefined, (created) => {
      const linked = { ...source, user: actor, updatedAt: created.updatedAt, values: { ...source.values, estado: "Convertida en pieza", contenidoId: created.id }, history: [{ at: created.updatedAt, user: actor, text: `Convertida en contenido ${created.id}` }, ...source.history] };
      return [{ key: ideaKey, value: freshIdeas.map((idea) => idea.id === source.id ? linked : idea) }];
    });
    if (record) { setConvertId(null); notify("Idea convertida; origen y referencia conservados", "success"); }
  }
  const ideaCard = (idea: ModuleRecord) => <article className={c.ideaCard} key={idea.id} data-state={idea.values.estado}><div className={c.ideaTop}><span className={c.eyebrow}>{idea.values.origen || "Equipo"}{idea.values.mesSugerido ? ` · ${monthLabel(idea.values.mesSugerido)}` : ""}</span><StatusBadge status={idea.values.estado} /></div><h3>{idea.values.idea}</h3>{idea.values.detalle ? <p>{idea.values.detalle}</p> : null}<AxisTag axes={refs.ejes || []} id={idea.values.eje} />{safeContentUrl(idea.values.url) ? <a href={idea.values.url} className={s.link} target="_blank" rel="noreferrer">Ver referencia</a> : null}<div className={c.actionRow}>{idea.values.contenidoId ? <ReturnLink className={s.link} href={pieceHref(base, idea.values.contenidoId)}>Abrir contenido</ReturnLink> : <button className={buttonClass("secondary", true)} disabled={!canPlan || idea.values.estado === "Descartada"} onClick={() => setConvertId(idea.id)}>Planificar contenido</button>}<button className={buttonClass("ghost", true)} onClick={() => setOpenId(idea.id)}>Detalle</button></div></article>;
  const untyped = list.filter((idea) => !IDEA_TYPES.some(([type]) => type === idea.values.tipo));
  return <div className={c.blockStack}>
    {plan ? <section aria-label="Contenidos del período">
      <div className={c.blockHead}><h3>Contenidos del período · {pieces.length}</h3><small className={c.muted}>Idea y bajada de cada contenido. Tocá uno para abrir su ficha.</small></div>
      {pieces.length ? <ul className={c.storyList}>{pieces.map((record) => <li key={record.id} data-tone={axisTone(refs.ejes || [], record.values.eje)}>
        <Thumb src={thumbs(record.id)} title={record.values.titulo} channel={record.values.canal} size="sm" decorative />
        <span className={c.storyMain}><button type="button" className={c.titleButton} onClick={() => onOpenPiece(record)}>{record.values.titulo}</button><span>{record.values.idea || "Idea pendiente"}</span>{record.values.bajada ? <small>{record.values.bajada}</small> : <small className={c.alertText}>Bajada pendiente</small>}</span>
        <span className={c.storyMeta}><StagePill state={contentState(record)} /><span className={c.cardMeta}><ChannelChip channel={record.values.canal} /><small>{record.values.formato || "Formato a definir"}</small><small>{shortDate(record.values.fecha)}</small></span><AxisTag axes={refs.ejes || []} id={record.values.eje} /></span>
      </li>)}</ul> : <p className={c.empty}>Este período todavía no tiene contenidos.</p>}
    </section> : null}
    <section aria-label="Banco de ideas" className={c.ideaBank}>
      <div className={c.blockHead}><h3>Banco de ideas</h3><button className={buttonClass("primary", true)} disabled={!editable} onClick={() => setCreating(true)}>Nueva idea</button></div>
      <div className={c.toolbar}><label>Buscar idea<input className={s.input} type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className={s.segmented} role="group" aria-label="Ideas por período">{IDEA_SCOPES.map(([id, label]) => <button key={id} type="button" aria-pressed={scope === id} onClick={() => setScope(id)}>{label}</button>)}</div><label className={c.check}><input type="checkbox" checked={hideClosed} onChange={(event) => setHideClosed(event.target.checked)} /> Ocultar convertidas y descartadas</label></div>
      <div className={c.ideaBoard}>{IDEA_TYPES.map(([type, label]) => { const items = list.filter((idea) => idea.values.tipo === type); return <section key={type} className={c.ideaColumn} aria-label={label}><h3>{label} <b>{items.length}</b></h3>{items.map(ideaCard)}</section>; })}{untyped.length ? <section className={c.ideaColumn} aria-label="Sin clasificar"><h3>Sin clasificar <b>{untyped.length}</b></h3>{untyped.map(ideaCard)}</section> : null}</div>
      {!list.length ? <p className={c.empty}>{ideasDef.empty}</p> : null}
    </section>
    {creating ? <OSModal title="Nueva idea" titleId="content-idea-title" onClose={() => setCreating(false)} footer={<><button className={buttonClass("ghost")} onClick={() => setCreating(false)}>Cancelar</button><button type="submit" form="content-idea-form" className={buttonClass("primary")}>Guardar en este navegador</button></>}><RecordForm def={ideasDef} initial={{ estado: "Nueva", tipo: "Oportunidad", ...(scope === "periodo" && month ? { mesSugerido: month } : {}) }} refs={refs} titleKeyOf={contentTitleKey} formId="content-idea-form" onSubmit={(values) => { if (values.url && !safeContentUrl(values.url)) { notify("La URL de referencia debe empezar con http o https.", "error"); return; } if (create(ideasDef, values)) { setCreating(false); notify("Idea guardada en este navegador", "success"); } else notify("No se pudo guardar en este navegador", "error"); }} /></OSModal> : null}
    {open ? <RecordPanel client={client} serviceId={SERVICE} def={ideasDef} record={open} refs={refs} titleKeyOf={contentTitleKey} editable={editable} onClose={() => setOpenId(null)} onSave={(values, text) => update("ideas", open.id, values, text)} /> : null}
    {convert ? <ContentEditor client={client} title="Planificar idea como contenido" initial={ideaToContentValues(convert, plan ? { plan: plan.id } : {})} refs={refs} onClose={() => setConvertId(null)} onSave={convertIdea} /> : null}
  </div>;
}

/* ───────── Canales y formatos ───────── */
function ChannelsBlock({ plan, pieces }: { plan: ModuleRecord; pieces: ModuleRecord[] }) {
  const planned = csv(plan.values.canales);
  const plannedFormats = csv(plan.values.formatos);
  const channels = Array.from(new Set([...planned.map(channelGroup), ...pieces.map((record) => channelGroup(record.values.canal)).filter(Boolean)]));
  const max = Math.max(1, ...channels.map((channel) => pieces.filter((record) => channelGroup(record.values.canal) === channel).length));
  return <div className={c.blockStack}>
    <div className={c.channelGrid} role="list" aria-label="Canales del período">{channels.map((channel) => {
      const items = pieces.filter((record) => channelGroup(record.values.canal) === channel);
      const formats = Array.from(new Set(items.map((record) => record.values.formato).filter(Boolean)));
      const next = items.map((record) => record.values.fecha).filter(Boolean).sort()[0];
      return <article role="listitem" key={channel} className={c.channelCard} data-planned={planned.map(channelGroup).includes(channel) || undefined}>
        <header><ChannelChip channel={channel} label /><b>{items.length}</b></header>
        <span className={c.bar}><i style={{ width: `${(items.length / max) * 100}%` }} /></span>
        <div className={c.tagWrap}>{formats.length ? formats.map((format) => <span key={format} className={c.chip}>{format} · {items.filter((record) => record.values.formato === format).length}</span>) : <small className={c.muted}>Sin contenidos todavía</small>}</div>
        <small className={c.muted}>{next ? `Primera fecha: ${shortDate(next)}` : planned.map(channelGroup).includes(channel) ? "Previsto en el plan" : ""}</small>
      </article>;
    })}</div>
    {plannedFormats.length ? <div className={c.plannedRow}><span className={c.eyebrow}>Formatos previstos</span><div className={c.tagWrap}>{plannedFormats.map((format) => <span key={format} className={c.chip} data-used={pieces.some((record) => record.values.formato === format) || undefined}>{format}</span>)}</div></div> : null}
  </div>;
}

/* ───────── Material del cliente ───────── */
function MaterialBlock({ client, pieces, onOpenPiece }: { client: OsClient; pieces: ModuleRecord[]; onOpenPiece: (record: ModuleRecord) => void }) {
  const rows = pieces.flatMap((record) => clientRequests(record.values).map((request) => ({ record, request })));
  const pending = rows.filter((row) => row.request.status === "Pendiente");
  const received = rows.filter((row) => row.request.status === "Recibido");
  const needs = pieces.filter((record) => record.values.materialNecesario);
  const row = ({ record, request }: (typeof rows)[number]) => <li key={`${record.id}-${request.id}`} data-status={request.status}><b>{request.type}</b><span>{request.detail}<button type="button" className={c.linkButton} onClick={() => onOpenPiece(record)}>{record.values.titulo}</button></span><em>{request.status}{request.attachmentName ? ` · ${request.attachmentName}` : ""}</em></li>;
  return <div className={c.blockStack}>
    <div className={c.blockHead}><h3>Qué necesitamos del cliente · {pending.length} pendientes</h3><ReturnLink className={s.link} href={documentsHref(client.slug)}>Archivos y documentos del cliente</ReturnLink></div>
    {pending.length ? <ul className={c.requestList} aria-label="Pedidos pendientes">{pending.map(row)}</ul> : <p className={c.muted}>No hay pedidos pendientes en este período.</p>}
    {received.length ? <details className={c.more}><summary>Recibidos · {received.length}</summary><ul className={c.requestList} aria-label="Pedidos recibidos">{received.map(row)}</ul></details> : null}
    {needs.length ? <><h4 className={c.subhead}>Material necesario anotado en los contenidos</h4><ul className={c.plainList}>{needs.map((record) => <li key={record.id}><button type="button" className={c.linkButton} onClick={() => onOpenPiece(record)}>{record.values.titulo}</button>: {record.values.materialNecesario}</li>)}</ul></> : null}
  </div>;
}
