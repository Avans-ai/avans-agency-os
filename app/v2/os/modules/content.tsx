"use client";

/* Contenidos · secciones de la operación mensual.
 * La operación se concentra en dos herramientas:
 *   - ContentPlanSection (Plan de contenidos por período: objetivos, ejes, ideas y bajadas,
 *     canales y formatos, material del cliente; incluye el banco de ideas), y
 *   - ContentCalendarSection (Calendario de contenidos: todas las piezas, vistas mes/semana/
 *     día/lista/tablero, filtros y la ficha única de cada contenido).
 * Los nombres anteriores (PlansSection, AxesSection, IdeasSection, PiecesSection,
 * CalendarSection) siguen exportados como alias para los enlaces y secciones existentes. */
import type { OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { useReturnNavigation } from "../navigation/back";
import { serviceHref } from "../service-workspace-data";
import { buttonClass } from "../ui";
import { ContentReportView } from "../reports/report-views";
import { useContentReport } from "../reports/use-report-data";
import { CollectionView } from "./collection-view";
import { collectionDef } from "./collections";
import { ContentCalendarSection } from "./content-calendar";
import { pieceHref } from "./content-calendar-state";
import { ContentPlanSection, PlanSnapshot } from "./content-plan";
import { ChannelChip, CONTENT_PLANNERS, ContentDemoBanner, MetricoolNote, StagePill, Thumb, monthLabel, pickPlan, planPieces, shortDate, stateCount, useContentDemoTasks, useContentThumbs } from "./content-ui";
import { CONTENT_FLOW, contentState, type ContentState } from "./content-workflow";
import { TaskHealthStrip } from "./module-common";
import { Panel } from "./module-ui";
import { useModuleRecords } from "./store";
import m from "./modules.module.css";
import c from "./content.module.css";

const SERVICE = "contenidos" as const;
const learningsDef = collectionDef(SERVICE, "aprendizajes")!;
const REFERENCE = "2026-11-20";

/** Ids de sección y componentes que la navegación del módulo debe usar para Contenidos. */
export const CONTENT_OPERATION_SECTIONS = [
  { id: "planes", label: "Plan de contenidos" },
  { id: "calendario", label: "Calendario" },
  { id: "tareas", label: "Tareas" },
  { id: "resultados", label: "Resultados" },
] as const;
/** Secciones anteriores y a dónde llevan (conservando el resto de la query). */
export const CONTENT_LEGACY_SECTIONS: Record<string, { section: "planes" | "calendario"; params?: Record<string, string> }> = {
  ejes: { section: "planes", params: { bloque: "ejes" } },
  ideas: { section: "planes", params: { bloque: "ideas" } },
  piezas: { section: "calendario", params: { vista: "lista" } },
};

export { ContentPlanSection, ContentCalendarSection };
type SectionProps = { client: OsClient; editable: boolean };
/** @deprecated Usar ContentPlanSection (sección `planes`). */
export const PlansSection = (props: SectionProps) => <ContentPlanSection {...props} />;
/** @deprecated Los ejes viven en el Plan de contenidos (`?seccion=planes&bloque=ejes`). */
export const AxesSection = (props: SectionProps) => <ContentPlanSection {...props} defaultBlock="ejes" />;
/** @deprecated El banco de ideas vive en el Plan de contenidos (`?seccion=planes&bloque=ideas`). */
export const IdeasSection = (props: SectionProps) => <ContentPlanSection {...props} defaultBlock="ideas" />;
/** @deprecated Usar ContentCalendarSection (sección `calendario`). */
export const CalendarSection = (props: SectionProps) => <ContentCalendarSection {...props} />;
/** @deprecated La lista de piezas es la vista «Lista» del calendario (`?seccion=calendario&vista=lista`). */
export const PiecesSection = (props: SectionProps) => <ContentCalendarSection {...props} defaultView="lista" />;

/* ───────── Resumen ───────── */
export function ContentSummary({ client, go }: { client: OsClient; go: (section: string, extra?: Record<string, string>) => void }) {
  useContentDemoTasks(client);
  const { data } = useModuleRecords(client.slug, SERVICE, ["piezas", "ejes", "planes", "ideas"]);
  const { role } = useOsStore();
  const navigate = useReturnNavigation();
  const thumbs = useContentThumbs(client);
  const records = data.piezas || [];
  const pending = records.filter((record) => /Revisión|Aprobación/.test(contentState(record)));
  const plan = pickPlan(data.planes || []);
  const limit = new Date(`${REFERENCE}T12:00:00`); limit.setDate(limit.getDate() + 14);
  const until = limit.toISOString().slice(0, 10);
  const upcoming = records.filter((record) => record.values.fecha >= REFERENCE && record.values.fecha <= until).sort((a, b) => `${a.values.fecha}${a.values.hora}`.localeCompare(`${b.values.fecha}${b.values.hora}`));
  const base = serviceHref(client.slug, SERVICE);
  return <div className={m.stack}>
    <ContentDemoBanner client={client} records={records} editable={CONTENT_PLANNERS.includes(role)} />
    <TaskHealthStrip client={client} serviceId={SERVICE} extra={[{ label: "Contenidos", value: records.length }, { label: "En revisión", value: pending.length, alert: pending.length > 0 }, { label: "Planes mensuales", value: (data.planes || []).length }]} />
    <Panel title="Flujo editorial" id="content-production" description="Tocá una etapa para ver sus contenidos en el calendario." actions={<><button className={buttonClass("secondary", true)} onClick={() => go("planes")}>Plan de contenidos</button><button className={buttonClass("primary", true)} onClick={() => go("calendario")}>Abrir calendario</button></>}>
      <div className={c.flow}>{CONTENT_FLOW.map((step) => { const count = stateCount(records, step.states); return <button key={step.step} className={c.flowStep} data-step={step.step} data-active={count > 0} onClick={() => go("calendario", { vista: "lista", etapa: String(step.step) })}><span className={c.flowNum}>{step.step}</span><strong>{count}</strong><span>{step.label}</span><small>Monday · {step.monday}</small>{step.states.length > 1 ? <em>{step.states.map((state) => `${state} ${stateCount(records, [state])}`).join(" · ")}</em> : null}</button>; })}</div>
    </Panel>
    <div className={c.summaryGrid}>
      <Panel title={plan ? plan.values.nombre : "Plan del mes"} id="content-plan-snapshot" description={plan ? `${monthLabel(plan.values.mes)} · ${plan.values.estado}` : "Todavía no hay planes mensuales."} actions={<button className={buttonClass("secondary", true)} onClick={() => go("planes", plan ? { plan: plan.id } : {})}>Ver plan</button>}>
        {plan ? <PlanSnapshot plan={plan} pieces={planPieces(records, plan)} axes={data.ejes || []} /> : <p className={c.empty}>Creá el primer plan para ordenar el mes.</p>}
      </Panel>
      <Panel title="Próximas publicaciones" id="content-upcoming" description="Próximos 14 días" actions={<button className={buttonClass("ghost", true)} onClick={() => go("calendario")}>Calendario</button>}>
        <div className={c.upcoming}>{upcoming.length ? upcoming.slice(0, 7).map((record) => <button key={record.id} className={c.upcomingRow} onClick={() => navigate(pieceHref(base, record.id, record.values.fecha))}><Thumb src={thumbs(record.id)} title={record.values.titulo} channel={record.values.canal} size="sm" decorative /><span><strong>{record.values.titulo}</strong><small>{shortDate(record.values.fecha)}{record.values.hora ? ` · ${record.values.hora}` : ""}</small></span><ChannelChip channel={record.values.canal} /><StagePill state={contentState(record)} /></button>) : <p className={c.empty}>Sin publicaciones en los próximos 14 días.</p>}</div>
      </Panel>
    </div>
    <MetricoolNote />
  </div>;
}

export function ContentResultsSection({ client, editable }: { client: OsClient; editable: boolean }) {
  const report = useContentReport(client);
  return <div className={m.stack}><MetricoolNote /><ContentReportView report={report} clientSlug={client.slug} embedded /><CollectionView client={client} serviceId={SERVICE} def={learningsDef} editable={editable} /></div>;
}
export type { ContentState };
