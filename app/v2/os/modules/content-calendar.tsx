"use client";

/* Calendario de contenidos: la herramienta operativa principal de Contenidos.
 * Todas las piezas del período con etapa, fechas y responsables; vistas mes, semana, día,
 * lista y tablero; filtros por canal, etapa, eje, responsable y búsqueda. Todo el estado
 * vive en la URL: abrir un contenido agrega `pieza` (y `volver`), y «Volver» o cerrar el
 * panel recuperan el calendario tal como estaba, con el foco en la pieza que se abrió. */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { confirmDiscardChanges, useReturnNavigation, useReturnPath } from "../navigation/back";
import { buttonClass } from "../ui";
import s from "../os.module.css";
import { channelGroup, PIECE_CHANNELS } from "./content-collections";
import { CALENDAR_VIEW_LABEL, CALENDAR_VIEWS, calendarDays, calendarHref, isoDay, readCalendarState, shiftDate, type CalendarState, type CalendarView } from "./content-calendar-state";
import { ContentDetail, ContentEditor } from "./content-detail";
import { AxisTag, ChannelChip, CONTENT_PLANNERS, ContentDemoBanner, MetricoolNote, ScheduleTag, StageDots, StagePill, Thumb, axisTone, monthLabel, pickPlan, shortDate, useContentDemoTasks, useContentThumbs } from "./content-ui";
import { CONTENT_FLOW, CONTENT_STATES, clientRequests, contentFlowStep, contentSchedule, contentState } from "./content-workflow";
import { useModuleRecords } from "./store";
import { TaskHealthStrip } from "./module-common";
import type { ModuleRecord } from "./types";
import { useContentOperations } from "./use-content-operations";
import c from "./content.module.css";

const SERVICE = "contenidos" as const;
const REFS = ["piezas", "ejes", "planes", "ideas"];
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const todayIso = () => isoDay(new Date());

export function ContentCalendarSection({ client, editable, defaultView = "mes" }: { client: OsClient; editable: boolean; defaultView?: CalendarView }) {
  useContentDemoTasks(client);
  const { role } = useOsStore();
  const canPlan = editable && CONTENT_PLANNERS.includes(role);
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const navigate = useReturnNavigation();
  const origin = useReturnPath();
  const { data } = useModuleRecords(client.slug, SERVICE, REFS);
  const thumbs = useContentThumbs(client);
  const operations = useContentOperations(client);
  const state = readCalendarState(params, defaultView);
  const [query, setQuery] = useState(state.query);
  const [creating, setCreating] = useState<Record<string, string> | null>(null);
  const lastOpened = useRef<string | null>(null);
  const records = data.piezas || [];
  const axisList = data.ejes || [];
  const owners = Array.from(new Set(records.map((record) => record.values.responsable).filter(Boolean))).sort();
  const replace = (patch: Partial<CalendarState>) => router.replace(calendarHref(pathname, params, patch, defaultView), { scroll: false });

  // La búsqueda se escribe en la URL con una pequeña demora para no recargar en cada tecla.
  useEffect(() => {
    if (query === state.query) return;
    const timer = window.setTimeout(() => router.replace(calendarHref(pathname, params, { query }, defaultView), { scroll: false }), 250);
    return () => window.clearTimeout(timer);
  }, [query, state.query, pathname, params, router, defaultView]);

  const matchesStage = (record: ModuleRecord) => state.stage === "todos" || (/^[1-8]$/.test(state.stage) ? String(contentFlowStep(contentState(record))) === state.stage : contentState(record) === state.stage);
  const needle = query.trim().toLocaleLowerCase("es");
  const filtered = records.filter((record) => (state.channel === "todos" || channelGroup(record.values.canal) === state.channel)
    && matchesStage(record)
    && (state.axis === "todos" || record.values.eje === state.axis)
    && (state.owner === "todos" || record.values.responsable === state.owner)
    && (state.plan === "todos" || record.values.plan === state.plan)
    && (!needle || `${record.values.titulo} ${record.values.idea} ${record.values.bajada} ${record.values.copy}`.toLocaleLowerCase("es").includes(needle)));
  const byDate = new Map<string, ModuleRecord[]>();
  for (const record of filtered) { const key = record.values.fecha?.slice(0, 10); if (key) byDate.set(key, [...(byDate.get(key) || []), record].sort((a, b) => (a.values.hora || "99").localeCompare(b.values.hora || "99"))); }
  const calendarView = ["mes", "semana", "dia"].includes(state.view);
  const days = calendarView ? calendarDays(state.date, state.view) : [];
  const month = state.date.slice(0, 7);
  const anchor = new Date(`${state.date}T12:00:00`);
  const title = state.view === "semana" ? `Semana del ${days[0]}` : state.view === "dia" ? anchor.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }) : anchor.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const plan = pickPlan(data.planes || []);
  const planMonth = plan?.values.mes && /^\d{4}-\d{2}$/.test(plan.values.mes) ? plan.values.mes : "";
  const listed = state.view === "lista" || state.view === "tablero" ? filtered.filter((record) => state.period === "todos" || (state.period === "sin-fecha" ? !record.values.fecha : record.values.fecha?.startsWith(state.period))).sort((a, b) => `${a.values.fecha || "9999"}${a.values.hora || ""}`.localeCompare(`${b.values.fecha || "9999"}${b.values.hora || ""}`)) : [];
  const undated = filtered.filter((record) => !record.values.fecha);
  const hours = Array.from(new Set([...Array.from({ length: 16 }, (_, index) => index + 7), ...days.flatMap((day) => (byDate.get(day) || []).map((record) => Number((record.values.hora || "").split(":")[0])).filter((hour) => Number.isInteger(hour)))])).sort((a, b) => a - b);
  const counts = (name: string) => records.filter((record) => (name === "todos" || channelGroup(record.values.canal) === name) && (state.view !== "mes" || record.values.fecha?.startsWith(month))).length;
  const filtersOn = state.stage !== "todos" || state.axis !== "todos" || state.owner !== "todos" || state.plan !== "todos" || state.channel !== "todos" || Boolean(query);
  const open = state.piece ? records.find((record) => record.id === state.piece && record.client === client.slug) : undefined;
  const periods = Array.from(new Set(records.map((record) => record.values.fecha?.slice(0, 7)).filter(Boolean))).sort();

  function openPiece(record: ModuleRecord) {
    lastOpened.current = record.id;
    navigate(calendarHref(pathname, params, { piece: record.id }, defaultView));
  }
  const closeTarget = origin ?? calendarHref(pathname, params, { piece: null }, defaultView);
  function closePiece() {
    if (!confirmDiscardChanges()) return;
    const id = state.piece;
    router.replace(closeTarget, { scroll: false });
    // Si el foco no volvió solo al disparador, se devuelve a la pieza en el calendario.
    window.setTimeout(() => {
      if (document.activeElement && document.activeElement !== document.body) return;
      document.querySelector<HTMLElement>(`[data-piece="${CSS.escape(lastOpened.current || id || "")}"]`)?.focus();
    }, 120);
  }
  function item(record: ModuleRecord, large = false) {
    const st = contentState(record);
    return <button type="button" className={c.calendarItem} data-large={large || undefined} key={record.id} data-piece={record.id} data-step={contentFlowStep(st)} data-state={st} onClick={() => openPiece(record)}>
      <Thumb src={thumbs(record.id)} title={record.values.titulo} channel={record.values.canal} size={large ? "md" : "xs"} decorative />
      <span className={c.calText}><strong>{record.values.hora || "Sin hora"} · {record.values.titulo}</strong><span><ChannelChip channel={record.values.canal} />{st}<ScheduleTag record={record} compact /></span>{large ? <><AxisTag axes={axisList} id={record.values.eje} /><small className={c.muted}>{record.values.responsable || "Sin responsable"}</small></> : <i className={c.axisDot} data-tone={axisTone(axisList, record.values.eje)} title={axisList.find((axis) => axis.id === record.values.eje)?.values.nombre || "Sin eje"} />}</span>
    </button>;
  }
  const pendingOf = (record: ModuleRecord) => clientRequests(record.values).filter((entry) => entry.status === "Pendiente").length;
  const card = (record: ModuleRecord) => { const st = contentState(record); const pending = pendingOf(record); return <button type="button" className={c.kanbanCard} key={record.id} data-piece={record.id} onClick={() => openPiece(record)} data-tone={axisTone(axisList, record.values.eje)}><Thumb src={thumbs(record.id)} title={record.values.titulo} channel={record.values.canal} size="sm" decorative /><span className={c.cardBody}><strong>{record.values.titulo}</strong><span className={c.cardMeta}><ChannelChip channel={record.values.canal} /><small>{record.values.formato}</small><small>{shortDate(record.values.fecha)}</small></span>{CONTENT_FLOW.find((step) => step.states.includes(st))!.states.length > 1 || st === "Publicada" ? <small className={c.subState}>{st}</small> : null}<small className={c.muted}>{record.values.responsable || "Sin responsable"}</small>{pending ? <small className={c.alertText}>{pending} pedido{pending > 1 ? "s" : ""} al cliente</small> : null}</span></button>; };

  // Indicadores del módulo (misma definición que el Inicio del cliente y Reportes).
  const inReview = records.filter((record) => /Revisión|Aprobación/.test(contentState(record))).length;
  return <div className={c.section}>
    <ContentDemoBanner client={client} records={records} editable={canPlan} />
    <TaskHealthStrip client={client} serviceId={SERVICE} extra={[{ label: "Contenidos", value: records.length }, { label: "En revisión", value: inReview, alert: inReview > 0 }, { label: "Planes mensuales", value: (data.planes || []).length }]} />
    <section className={c.workPanel} aria-labelledby="content-calendar">
      <header className={c.workHead}>
        <div><h2 id="content-calendar">Calendario de contenidos</h2><p>Todas las piezas con su etapa, fecha y responsable. Abrí una para avanzarla.</p></div>
        <button className={buttonClass("primary", true)} disabled={!canPlan} onClick={() => setCreating({ fecha: calendarView ? state.date : "", ...(state.plan !== "todos" ? { plan: state.plan } : {}) })}>Nuevo contenido</button>
      </header>
      <div className={c.toolbar}>
        {calendarView ? <div className={c.calNavigation}><button className={buttonClass("secondary", true)} aria-label={state.view === "mes" ? "Mes anterior" : state.view === "semana" ? "Semana anterior" : "Día anterior"} onClick={() => replace({ date: shiftDate(state.date, state.view, -1) })}>‹</button><strong aria-live="polite">{title}</strong><button className={buttonClass("secondary", true)} aria-label={state.view === "mes" ? "Mes siguiente" : state.view === "semana" ? "Semana siguiente" : "Día siguiente"} onClick={() => replace({ date: shiftDate(state.date, state.view, 1) })}>›</button><button className={buttonClass("ghost", true)} onClick={() => replace({ date: todayIso() })}>Hoy</button>{planMonth && planMonth !== month ? <button className={buttonClass("ghost", true)} onClick={() => replace({ date: `${planMonth}-01` })}>Ir a {plan!.values.nombre}</button> : null}</div>
          : <label className={c.periodSelect}>Período<select className={s.input} value={state.period} onChange={(event) => replace({ period: event.target.value })}><option value="todos">Todos los meses</option>{periods.map((period) => <option key={period} value={period}>{monthLabel(period)}</option>)}<option value="sin-fecha">Sin fecha</option></select></label>}
        <div className={s.segmented} role="group" aria-label="Vista del calendario">{CALENDAR_VIEWS.map((id) => <button key={id} type="button" aria-pressed={state.view === id} onClick={() => replace({ view: id })}>{CALENDAR_VIEW_LABEL[id]}</button>)}</div>
      </div>
      <div className={c.filters}>
        <label>Buscar contenido<input className={s.input} type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label>Estado<select className={s.input} value={state.stage} onChange={(event) => replace({ stage: event.target.value })}><option value="todos">Todos</option><optgroup label="Etapas">{CONTENT_FLOW.map((step) => <option key={step.step} value={String(step.step)}>{step.step}. {step.label}</option>)}</optgroup><optgroup label="Estados">{CONTENT_STATES.map((name) => <option key={name}>{name}</option>)}</optgroup></select></label>
        <label>Eje<select className={s.input} value={state.axis} onChange={(event) => replace({ axis: event.target.value })}><option value="todos">Todos</option>{axisList.map((axis) => <option value={axis.id} key={axis.id}>{axis.values.nombre}</option>)}</select></label>
        <label>Responsable<select className={s.input} value={state.owner} onChange={(event) => replace({ owner: event.target.value })}><option value="todos">Todos</option>{owners.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label>Plan mensual<select className={s.input} value={state.plan} onChange={(event) => replace({ plan: event.target.value })}><option value="todos">Todos</option>{(data.planes || []).map((item) => <option value={item.id} key={item.id}>{item.values.nombre}</option>)}</select></label>
        {filtersOn ? <button type="button" className={buttonClass("ghost", true)} onClick={() => { setQuery(""); replace({ stage: "todos", axis: "todos", owner: "todos", plan: "todos", channel: "todos", query: "" }); }}>Limpiar filtros</button> : null}
      </div>
      <div className={c.channelFilter} role="group" aria-label="Canal">{["todos", ...PIECE_CHANNELS].map((name) => <button key={name} type="button" aria-pressed={state.channel === name} onClick={() => replace({ channel: name })}>{name === "todos" ? <span>Todos</span> : <ChannelChip channel={name} label />}<em>{counts(name)}</em></button>)}</div>
      <div className={c.calendarScroll} data-mode={state.view}>
        {state.view === "mes" ? <div className={c.calendar} role="grid" aria-label={`Calendario editorial · ${title}`}>
          {WEEKDAYS.map((day) => <div className={c.dayHeading} key={day} role="columnheader">{day}</div>)}{days.map((day) => { const list = byDate.get(day) || []; const date = new Date(`${day}T12:00:00`); return <div className={c.monthDay} key={day} data-outside={day.slice(0, 7) !== month} data-empty={!list.length} data-today={day === todayIso()} role="gridcell" aria-label={`${day}: ${list.length} contenidos`}><button className={c.dayNumber} disabled={!canPlan} onClick={() => setCreating({ fecha: day })} aria-label={`Crear contenido el ${day}`}><span>{date.getDate()}<small className={c.mobileOnly}> {date.toLocaleDateString("es-AR", { weekday: "short" })}</small></span><span aria-hidden="true">+</span></button>{list.map((record) => item(record))}</div>; })}
        </div> : state.view === "semana" ? <div className={c.agenda} style={{ gridTemplateColumns: `54px repeat(${days.length}, minmax(120px, 1fr))` }} aria-label="Agenda semanal"><div className={c.dayHeading}>Hora</div>{days.map((day) => <div className={c.dayHeading} key={day} data-today={day === todayIso()}>{new Date(`${day}T12:00:00`).toLocaleDateString("es-AR", { weekday: "short", day: "numeric" })}</div>)}<div className={c.hour}>Sin hora</div>{days.map((day) => <div className={c.hourCell} key={`undated-${day}`}>{(byDate.get(day) || []).filter((record) => !record.values.hora).map((record) => item(record))}</div>)}{hours.map((hour) => <div className={c.agendaRow} key={hour}><div className={c.hour}>{String(hour).padStart(2, "0")}:00</div>{days.map((day) => <div className={c.hourCell} key={day}>{(byDate.get(day) || []).filter((record) => record.values.hora && Number(record.values.hora.split(":")[0]) === hour).map((record) => item(record))}{canPlan ? <button className={c.addSlot} aria-label={`Crear contenido el ${day} a las ${hour}:00`} onClick={() => setCreating({ fecha: day, hora: `${String(hour).padStart(2, "0")}:00` })}>+</button> : null}</div>)}</div>)}</div>
        : state.view === "dia" ? <div className={c.dayView} aria-label="Agenda diaria">{(byDate.get(state.date) || []).length ? (byDate.get(state.date) || []).map((record) => item(record, true)) : <p className={c.empty}>Sin publicaciones para este día.</p>}{canPlan ? <button className={buttonClass("ghost", true)} onClick={() => setCreating({ fecha: state.date })}>Crear contenido el {state.date}</button> : null}</div>
        : state.view === "tablero" ? <div className={c.kanban} aria-label="Tablero por etapa">{CONTENT_FLOW.map((step) => { const items = listed.filter((entry) => step.states.includes(contentState(entry))); return <section className={c.kanbanColumn} key={step.step} data-step={step.step}><h3><span><i>{step.step}</i>{step.label}</span><b>{items.length}</b></h3><small className={c.muted}>Monday · {step.monday}</small>{items.map(card)}</section>; })}</div>
        : <div className={c.rows} role="list" aria-label="Contenidos planificados">{listed.map((record) => { const st = contentState(record); const pending = pendingOf(record); return <div role="listitem" className={c.row} key={record.id}>
          <Thumb src={thumbs(record.id)} title={record.values.titulo} channel={record.values.canal} size="sm" decorative />
          <span className={c.rowMain}><button type="button" className={c.titleButton} data-piece={record.id} onClick={() => openPiece(record)}>{record.values.titulo}</button><span className={c.cardMeta}><ChannelChip channel={record.values.canal} label /><small>{record.values.formato || "Formato a definir"}</small><AxisTag axes={axisList} id={record.values.eje} />{record.source === "demo" ? <span className={c.demoTag}>Demo</span> : null}</span></span>
          <span className={c.rowState}><StagePill state={st} /><StageDots state={st} /></span>
          <span className={c.rowDate}><strong>{shortDate(record.values.fecha)}</strong><small>{record.values.hora || "Sin hora"} · {contentSchedule(record).label}</small></span>
          <span className={c.rowOwner}><small>{record.values.responsable || "Sin asignar"}</small>{pending ? <small className={c.alertText}>{pending} pedido{pending > 1 ? "s" : ""} al cliente</small> : null}</span>
        </div>; })}{!listed.length ? <p className={c.empty}>No hay contenidos con estos filtros.</p> : null}</div>}
      </div>
      <div className={c.legend} role="group" aria-label="Etapas">{CONTENT_FLOW.map((step) => <button type="button" key={step.step} data-step={step.step} aria-pressed={state.stage === String(step.step)} onClick={() => replace({ stage: state.stage === String(step.step) ? "todos" : String(step.step) })}><i />{step.label}</button>)}</div>
      {calendarView && undated.length ? <p className={c.empty}>{undated.length} contenidos sin fecha. <button type="button" className={c.linkButton} onClick={() => replace({ view: "lista", period: "sin-fecha" })}>Verlos en la lista</button></p> : null}
    </section>
    <MetricoolNote />
    {creating ? <ContentEditor client={client} initial={creating} refs={data} onClose={() => setCreating(null)} onSave={(values) => { const record = operations.saveDraft(values); if (record) { setCreating(null); openPiece(record); } }} /> : null}
    {open ? <ContentDetail key={open.id} client={client} record={open} editable={editable} onClose={closePiece} backFallback={calendarHref(pathname, params, { piece: null }, defaultView)} /> : null}
  </div>;
}
