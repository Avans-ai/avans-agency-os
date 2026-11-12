"use client";

import { serviceLabel, type ServiceId } from "../os-data";
import { Badge } from "../ui";
import s from "../os.module.css";
import {
  formatMoneyShort,
  formatNumber,
  formatPercent,
  type ContentReport,
  type MonthlyReport,
  type PaidReport,
  type WeeklyReport,
} from "./builders";
import { BarChart, DeltaChart, LineChart } from "./charts";
import { Conclusion, DemoBand, Delta, KpiStrip, LineList, OriginTag, ReportDoc, ReportSection, SourcesList } from "./report-parts";
import r from "./reports.module.css";

function stateTone(state: string) {
  if (state === "Atención" || state === "En riesgo") return "error" as const;
  if (state === "Revisión" || state === "En curso") return "peach" as const;
  if (state === "Al día" || state === "Cumplido") return "cool" as const;
  return "stone" as const;
}

export function WeeklyReportView({
  report,
  clientSlug,
  onModuleChange,
}: {
  report: WeeklyReport;
  clientSlug: string;
  onModuleChange: (value: ServiceId | "todos") => void;
}) {
  return (
    <ReportDoc
      label={report.title}
      eyebrow={`Reporte semanal · ${report.clientName}`}
      title={report.title}
      meta={<><span>Cliente <strong>{report.clientName}</strong></span><span>Período <strong>{report.period}</strong></span><span>Responsable <strong>{report.owner}</strong></span><span>Alcance <strong>{report.moduleFilter === "todos" ? "Todos los módulos activos" : serviceLabel(report.moduleFilter)}</strong></span></>}
      tools={(
        <label className={s.field} style={{ minWidth: 220 }}>
          <span>Filtrar por módulo</span>
          <select className={`${s.input} ${s.inputSm}`} value={report.moduleFilter} onChange={(event) => onModuleChange(event.target.value as ServiceId | "todos")} aria-label="Filtrar reporte semanal por módulo">
            <option value="todos">Todos los módulos activos</option>
            {report.modules.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
      )}
    >
      <DemoBand />
      <KpiStrip kpis={report.kpis} label="Indicadores de la semana" />
      <ReportSection title="Resumen ejecutivo" id="weekly-summary">
        <ul className={r.summary}>{report.summary.map((item) => <li key={item}>{item}</li>)}</ul>
      </ReportSection>
      <ReportSection title="Servicios activos" description="Estado derivado de las tareas de cada módulo" id="weekly-services">
        <div className={r.grid2}>
          <div className={r.tableScroll}>
            <table className={r.dataTable}>
              <caption className={s.srOnly}>Estado de los servicios activos</caption>
              <thead><tr><th scope="col">Módulo</th><th scope="col" className={r.num}>Abiertas</th><th scope="col" className={r.num}>Hechas</th><th scope="col" className={r.num}>Bloqueos</th><th scope="col" className={r.num}>Aprobación</th><th scope="col">Estado</th></tr></thead>
              <tbody>{report.services.map((row) => <tr key={row.serviceId}><th scope="row">{row.label}</th><td className={r.num}>{row.open}</td><td className={r.num}>{row.done}</td><td className={r.num}>{row.blocked}</td><td className={r.num}>{row.approvals}</td><td><Badge tone={stateTone(row.state)}>{row.state}</Badge></td></tr>)}</tbody>
            </table>
          </div>
          <BarChart title="Tareas hechas vs. abiertas por módulo" data={report.chart} primaryLabel="Hechas" secondaryLabel="Abiertas" />
        </div>
      </ReportSection>
      <ReportSection title="Trabajo de la semana" id="weekly-work">
        <div className={r.grid3}>
          <LineList title="Tareas realizadas" lines={report.tasksDone} empty="Sin tareas cerradas en el alcance." clientSlug={clientSlug} />
          <LineList title="Entregables completados" lines={report.deliverablesDone} empty="Sin entregables completados." clientSlug={clientSlug} />
          <LineList title="Entregables demorados" lines={report.deliverablesLate} empty="Sin entregables demorados." clientSlug={clientSlug} />
        </div>
      </ReportSection>
      <ReportSection title="Bloqueos, aprobaciones y alertas" id="weekly-risks">
        <div className={r.grid3}>
          <LineList title="Bloqueos" lines={report.blockers} empty="Sin bloqueos activos." clientSlug={clientSlug} />
          <LineList title="Aprobaciones pendientes" lines={report.approvals} empty="Nada espera aprobación." clientSlug={clientSlug} />
          <LineList title="Alertas" lines={report.alerts} empty="Sin alertas." clientSlug={clientSlug} />
        </div>
      </ReportSection>
      <ReportSection title="Próximos pasos y acciones sugeridas" id="weekly-next">
        <div className={r.grid3}>
          <LineList title="Próximos pasos" lines={report.nextSteps} empty="Sin vencimientos en los próximos 7 días." clientSlug={clientSlug} />
          <LineList title="Acciones sugeridas" lines={report.actions} empty="Sin acciones sugeridas." clientSlug={clientSlug} />
          <LineList title="Recomendaciones" lines={report.recommendations} empty="Sin recomendaciones abiertas." clientSlug={clientSlug} />
        </div>
      </ReportSection>
      <Conclusion>{report.conclusion}</Conclusion>
      <ReportSection title="Fuentes" id="weekly-sources"><SourcesList sources={report.sources} /></ReportSection>
    </ReportDoc>
  );
}

export function MonthlyReportView({ report, clientSlug }: { report: MonthlyReport; clientSlug: string }) {
  return (
    <ReportDoc
      label={report.title}
      eyebrow={`Reporte mensual · ${report.clientName}`}
      title={report.title}
      meta={<><span>Cliente <strong>{report.clientName}</strong></span><span>Período <strong>{report.period}</strong></span><span>Comparado con <strong>{report.previousPeriod}</strong></span><span>Responsable <strong>{report.owner}</strong></span></>}
    >
      <DemoBand />
      <KpiStrip kpis={report.kpis} label="Indicadores del mes" />
      <ReportSection title="Resumen ejecutivo del mes" id="monthly-summary">
        <ul className={r.summary}>{report.summary.map((item) => <li key={item}>{item}</li>)}</ul>
      </ReportSection>
      <ReportSection title="Objetivos del cliente" id="monthly-objectives">
        <div>
          {report.objectives.map((item) => (
            <div className={r.objective} key={item.objective}>
              <strong>{item.objective}</strong>
              <Badge tone={stateTone(item.status)}>{item.status}</Badge>
              <small>{item.indicator} · meta {item.target} · actual {item.current}</small>
            </div>
          ))}
        </div>
      </ReportSection>
      <ReportSection title="Resultados por módulo" description={`Comparativa con ${report.previousPeriod}`} id="monthly-results">
        <div className={r.tableScroll}>
          <table className={r.dataTable}>
            <caption className={s.srOnly}>Indicadores por módulo</caption>
            <thead><tr><th scope="col">Módulo</th><th scope="col">Indicador</th><th scope="col" className={r.num}>{report.period}</th><th scope="col" className={r.num}>{report.previousPeriod}</th><th scope="col">Variación</th><th scope="col">Fuente</th></tr></thead>
            <tbody>
              {report.results.flatMap((result) => result.indicators.map((indicator, index) => (
                <tr key={`${result.serviceId}-${indicator.label}`}>
                  {index === 0 ? <th scope="rowgroup" rowSpan={result.indicators.length}>{result.label}</th> : null}
                  <td>{indicator.label}</td>
                  <td className={r.num}>{indicator.unit === "ARS" ? formatMoneyShort(indicator.current) : `${formatNumber(indicator.current, indicator.unit === "%" ? 1 : 0)}${indicator.unit === "%" ? " %" : ""}`}</td>
                  <td className={r.num}>{indicator.origin === "tareas" ? "—" : indicator.unit === "ARS" ? formatMoneyShort(indicator.previous) : `${formatNumber(indicator.previous, indicator.unit === "%" ? 1 : 0)}${indicator.unit === "%" ? " %" : ""}`}</td>
                  <td>{indicator.delta !== undefined ? <Delta value={indicator.delta} better={indicator.better} /> : "—"}</td>
                  <td><OriginTag origin={indicator.origin} /></td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
        {report.comparison.length ? <DeltaChart title="Variación frente al período anterior" data={report.comparison} /> : null}
      </ReportSection>
      <ReportSection title="Actividades realizadas" id="monthly-activities">
        <LineList title="Actividades" lines={report.activities} empty="Sin actividades registradas." clientSlug={clientSlug} />
      </ReportSection>
      <ReportSection title="Aprendizajes, oportunidades y recomendaciones" id="monthly-learnings">
        <div className={r.grid3}>
          <div className={r.block}><h5>Principales aprendizajes <em>{report.learnings.length}</em></h5><ul className={r.summary}>{report.learnings.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div className={r.block}><h5>Oportunidades <em>{report.opportunities.length}</em></h5><ul className={r.summary}>{report.opportunities.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <LineList title="Recomendaciones" lines={report.recommendations} empty="Sin recomendaciones." clientSlug={clientSlug} />
        </div>
      </ReportSection>
      <ReportSection title="Próximas acciones" id="monthly-next">
        <LineList title="Prioridades del próximo mes" lines={report.nextActions} empty="Sin acciones prioritarias abiertas." clientSlug={clientSlug} />
      </ReportSection>
      <Conclusion>{report.conclusion}</Conclusion>
      <ReportSection title="Fuentes" id="monthly-sources"><SourcesList sources={report.sources} /></ReportSection>
    </ReportDoc>
  );
}

export function PaidReportView({ report, clientSlug, embedded = false }: { report: PaidReport; clientSlug: string; embedded?: boolean }) {
  const top = report.campaigns.filter((row) => row.current && row.current.leads > 0).sort((a, b) => a.current!.cpl - b.current!.cpl);
  return (
    <ReportDoc
      label={report.title}
      eyebrow={`${embedded ? "Resultados" : "Reporte de módulo"} · ${report.clientName}`}
      title={report.title}
      meta={<><span>Cliente <strong>{report.clientName}</strong></span><span>Período <strong>{report.period}</strong></span><span>Comparado con <strong>{report.previousPeriod}</strong></span><span>Modelo <strong>{report.businessModel === "ecommerce" ? "Ecommerce" : "Generación de leads"}</strong></span></>}
    >
      <DemoBand>Las métricas son ficticias. Meta Ads, Google Ads y LinkedIn Ads figuran como «No conectada»: ninguna cifra proviene de una plataforma.</DemoBand>
      {report.hasData ? <KpiStrip kpis={report.kpis} label="Indicadores de pauta" /> : null}
      {!report.hasData ? (
        <ReportSection title="Sin resultados" id={`paid-empty-${clientSlug}`}>
          <p style={{ margin: 0, color: "var(--av-text-muted)" }}>Ninguna campaña tiene métricas en el período. Las plataformas no están conectadas; cuando se carguen resultados aparecerán aquí.</p>
        </ReportSection>
      ) : (
        <>
          <ReportSection title="Lectura del período" id={`paid-insights-${clientSlug}`}>
            <ul className={r.summary}>{report.insights.map((item) => <li key={item}>{item}</li>)}</ul>
          </ReportSection>
          <ReportSection title="Evolución" description="Ocho semanas: período anterior y actual" id={`paid-evolution-${clientSlug}`}>
            <div className={r.grid2}>
              <LineChart title="Inversión semanal (ARS)" labels={report.weeks} series={report.spendSeries} format={formatMoneyShort} />
              <LineChart title="Leads semanales" labels={report.weeks} series={report.leadsSeries} format={(value) => formatNumber(value)} />
            </div>
          </ReportSection>
          <ReportSection title="Comparación entre campañas" id={`paid-compare-${clientSlug}`}>
            <BarChart title="Leads por campaña: período actual y anterior" data={report.comparison} primaryLabel="Período actual" secondaryLabel="Período anterior" />
          </ReportSection>
        </>
      )}
      <ReportSection title="Campañas" description="Ordenadas como en el módulo" id={`paid-table-${clientSlug}`}>
        <div className={r.tableScroll}>
          <table className={r.dataTable}>
            <caption className={s.srOnly}>Resultados por campaña</caption>
            <thead><tr><th scope="col">Campaña</th><th scope="col">Plataforma</th><th scope="col">Estado</th><th scope="col" className={r.num}>Inversión</th><th scope="col" className={r.num}>Impresiones</th><th scope="col" className={r.num}>Clics</th><th scope="col" className={r.num}>CTR</th><th scope="col" className={r.num}>CPC</th><th scope="col" className={r.num}>Leads</th><th scope="col" className={r.num}>CPL</th><th scope="col" className={r.num}>Conv.</th>{report.businessModel === "ecommerce" ? <th scope="col" className={r.num}>ROAS</th> : null}<th scope="col">Fuente</th></tr></thead>
            <tbody>
              {report.campaigns.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.name}{top[0]?.id === row.id ? <> <Badge tone="peach">Más eficiente</Badge></> : null}</th>
                  <td>{row.platform}</td>
                  <td>{row.status}</td>
                  {row.current ? (
                    <>
                      <td className={r.num}>{formatMoneyShort(row.current.spend)}</td>
                      <td className={r.num}>{formatNumber(row.current.impressions)}</td>
                      <td className={r.num}>{formatNumber(row.current.clicks)}</td>
                      <td className={r.num}>{formatPercent(row.current.ctr, 2)}</td>
                      <td className={r.num}>$ {formatNumber(row.current.cpc)}</td>
                      <td className={r.num}>{formatNumber(row.current.leads)}</td>
                      <td className={r.num}>{row.current.leads ? `$ ${formatNumber(row.current.cpl)}` : "—"}</td>
                      <td className={r.num}>{formatNumber(row.current.conversions)}</td>
                      {report.businessModel === "ecommerce" ? <td className={r.num}>{formatNumber(row.current.roas ?? 0, 2)}x</td> : null}
                      <td><OriginTag origin="demo" /></td>
                    </>
                  ) : (
                    <td colSpan={report.businessModel === "ecommerce" ? 10 : 9}>Sin datos · {row.platform}: integración no conectada</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {report.businessModel !== "ecommerce" ? <p className={s.demoNote} style={{ margin: 0 }}>ROAS no aplica: el cliente trabaja con generación de leads. Se calcula solo para modelos ecommerce con ingresos atribuidos.</p> : null}
      </ReportSection>
      <ReportSection title="Recomendaciones" id={`paid-recs-${clientSlug}`}>
        <LineList title="Para el próximo período" lines={report.recommendations} empty="Sin recomendaciones derivadas." clientSlug={clientSlug} />
      </ReportSection>
      <Conclusion>{report.conclusion}</Conclusion>
      <ReportSection title="Fuentes" id={`paid-sources-${clientSlug}`}><SourcesList sources={report.sources} /></ReportSection>
    </ReportDoc>
  );
}

export function ContentReportView({ report, clientSlug, embedded = false }: { report: ContentReport; clientSlug: string; embedded?: boolean }) {
  return (
    <ReportDoc
      label={report.title}
      eyebrow={`${embedded ? "Resultados" : "Reporte de módulo"} · ${report.clientName}`}
      title={report.title}
      meta={<><span>Cliente <strong>{report.clientName}</strong></span><span>Período <strong>{report.period}</strong></span><span>Piezas registradas <strong>{report.published + report.pending}</strong></span></>}
    >
      <DemoBand>Alcance, interacciones y audiencia son ficticios. Las redes del cliente no están conectadas. El conteo de piezas sale del calendario del módulo.</DemoBand>
      <KpiStrip kpis={report.kpis} label="Indicadores de contenidos" />
      <ReportSection title="Evolución mensual" id={`content-evolution-${clientSlug}`}>
        <div className={r.grid2}>
          <LineChart title="Alcance e interacciones (×10) por mes" labels={report.series.labels} series={report.series.reach} format={(value) => formatNumber(value)} />
          <BarChart title="Piezas publicadas por mes" data={report.series.published} />
        </div>
      </ReportSection>
      <ReportSection title="Qué funcionó" description="Engagement = interacciones / alcance de piezas publicadas con métricas" id={`content-best-${clientSlug}`}>
        <div className={r.grid2}>
          {report.formats.length ? <BarChart title="Formatos más efectivos" data={report.formats} highlightFirst /> : <p className={r.linesEmpty}>Sin piezas publicadas con métricas.</p>}
          {report.themes.length ? <BarChart title="Temáticas destacadas (ejes)" data={report.themes} /> : <p className={r.linesEmpty}>Sin ejes con métricas.</p>}
        </div>
        {report.topPieces.length ? (
          <div className={r.tableScroll}>
            <table className={r.dataTable}>
              <caption className={s.srOnly}>Piezas con mejor engagement</caption>
              <thead><tr><th scope="col">Pieza</th><th scope="col">Formato</th><th scope="col">Canal</th><th scope="col" className={r.num}>Alcance</th><th scope="col" className={r.num}>Engagement</th></tr></thead>
              <tbody>{report.topPieces.map((piece) => <tr key={piece.title}><th scope="row">{piece.title}</th><td>{piece.format}</td><td>{piece.channel}</td><td className={r.num}>{formatNumber(piece.reach)}</td><td className={r.num}>{formatPercent(piece.engagement)}</td></tr>)}</tbody>
            </table>
          </div>
        ) : null}
      </ReportSection>
      <ReportSection title="Producción y audiencia" id={`content-production-${clientSlug}`}>
        <div className={r.grid2}>
          <BarChart title="Piezas por estado" data={report.statusBreakdown} />
          <div className={r.tableScroll}>
            <table className={r.dataTable}>
              <caption className={s.srOnly}>Crecimiento de audiencia</caption>
              <thead><tr><th scope="col">Canal</th><th scope="col" className={r.num}>Inicio</th><th scope="col" className={r.num}>Cierre</th><th scope="col" className={r.num}>Crecimiento</th></tr></thead>
              <tbody>{report.audience.length ? report.audience.map((row) => <tr key={row.channel}><th scope="row">{row.channel}</th><td className={r.num}>{formatNumber(row.start)}</td><td className={r.num}>{formatNumber(row.end)}</td><td className={r.num}><Delta value={row.growth} better="up" /></td></tr>) : <tr><td colSpan={4}>Sin datos de audiencia.</td></tr>}</tbody>
            </table>
          </div>
        </div>
      </ReportSection>
      <ReportSection title="Aprendizajes y propuestas para el próximo período" id={`content-next-${clientSlug}`}>
        <div className={r.grid2}>
          <div className={r.block}><h5>Aprendizajes <em>{report.learnings.length}</em></h5>{report.learnings.length ? <ul className={r.summary}>{report.learnings.map((item) => <li key={item}>{item}</li>)}</ul> : <p className={r.linesEmpty}>Sin aprendizajes registrados.</p>}</div>
          <div className={r.block}><h5>Propuestas <em>{report.proposals.length}</em></h5><ul className={r.summary}>{report.proposals.map((item) => <li key={item}>{item}</li>)}</ul></div>
        </div>
      </ReportSection>
      <Conclusion>{report.conclusion}</Conclusion>
      <ReportSection title="Fuentes" id={`content-sources-${clientSlug}`}><SourcesList sources={report.sources} /></ReportSection>
    </ReportDoc>
  );
}
