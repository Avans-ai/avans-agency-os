"use client";

/* Documento del reporte en pantalla (vista previa del borrador y versiones emitidas).
 * Se dibuja SOLO desde la instantánea: una versión emitida se ve igual aunque cambien
 * los datos de los módulos. Mismo contenido que el PDF. */
import Image from "next/image";
import { HEALTH_RULES } from "../metrics/service-health";
import { ITEM_KIND_LABEL, lightText, ORIGIN_LABEL, type ItemRef, type Metric } from "../metrics/types";
import { longDate, shortDate } from "../metrics/period";
import { ReturnLink } from "../navigation/back";
import { HealthChip, MiniChart, OriginTag } from "../screens/client-home-blocks";
import type { ReportSnapshot } from "./builders";
import r from "./reports.module.css";

function MetricTable({ caption, metrics }: { caption: string; metrics: Metric[] }) {
  return (
    <div className={r.tableScroll}>
      <table className={r.dataTable}>
        <caption className={r.docCaption}>{caption}</caption>
        <thead><tr><th scope="col">Indicador</th><th scope="col">Valor</th><th scope="col">Origen</th></tr></thead>
        <tbody>
          {metrics.map((metric) => (
            <tr key={metric.id}>
              <th scope="row">{metric.label}{metric.hint ? <small className={r.docHint}>{metric.hint}</small> : null}</th>
              <td data-missing={metric.value === null && /Sin datos|Pendiente|No conectado/.test(metric.display) ? true : undefined}>{metric.display}{metric.light && metric.light !== "gris" && metric.value !== null ? <small className={r.docHint}>{lightText(metric)}</small> : null}</td>
              <td>{metric.origin === "real" ? "Real" : ORIGIN_LABEL[metric.origin]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Items({ title, items, empty, live }: { title: string; items: ItemRef[]; empty: string; live: boolean }) {
  return (
    <div className={r.docItems}>
      <h5>{title} <em>{items.length}</em></h5>
      {items.length ? (
        <ul>
          {items.slice(0, 10).map((item) => (
            <li key={`${item.kind}-${item.id}`} data-kind={item.kind}>
              <span>{ITEM_KIND_LABEL[item.kind]}{item.date ? ` · ${shortDate(item.date)}` : ""}</span>
              {live ? <ReturnLink href={item.href}>{item.title}</ReturnLink> : <strong>{item.title}</strong>}
              <small>{item.detail}{item.origin === "demo" ? " · demo" : ""}</small>
            </li>
          ))}
        </ul>
      ) : <p className={r.linesEmpty}>{empty}</p>}
      {items.length > 10 ? <small className={r.docHint}>y {items.length - 10} más en el módulo</small> : null}
    </div>
  );
}

export function ReportDocument({ snapshot, mode }: { snapshot: ReportSnapshot; mode: "preview" | "issued" }) {
  const live = mode === "preview";
  return (
    <article className={r.genDoc} aria-label={`Documento: ${snapshot.title}`}>
      <header className={r.genHead}>
        <Image src="/avans-master-logo.png" alt="Avans" width={96} height={32} className={r.docLogo} />
        <span className={r.docEyebrow}>{snapshot.typeLabel} · {mode === "preview" ? `vista previa de la versión ${snapshot.version}` : `versión ${snapshot.version} emitida`}</span>
        <h3>{snapshot.title}</h3>
        <p className={r.docClient}>{snapshot.clientName}</p>
        <dl className={r.genMeta}>
          <div><dt>Período</dt><dd>{snapshot.period.label} ({longDate(snapshot.period.start)} al {longDate(snapshot.period.end)})</dd></div>
          <div><dt>Comparado con</dt><dd>{snapshot.previousPeriod.label}</dd></div>
          <div><dt>Estados al</dt><dd>{longDate(snapshot.asOf)}</dd></div>
          <div><dt>{mode === "preview" ? "Se generará" : "Generado"}</dt><dd>{mode === "preview" ? "Al confirmar el paso «Generar»" : `${new Date(snapshot.generatedAt).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" })} · ${snapshot.generatedBy}`}</dd></div>
          <div><dt>Servicios incluidos</dt><dd>{snapshot.services.map((service) => service.label).join(", ")}</dd></div>
        </dl>
        <p className={r.docLegend} data-origin={snapshot.origin}>Los indicadores salen de los módulos con las mismas definiciones del Inicio. «Demo» = dato de demostración rotulado · «Pendiente de configurar» = el módulo no tiene esa información · «No conectado» = requiere una integración no conectada. Un dato faltante nunca se muestra como cero.{snapshot.origin === "demo" ? " Este reporte incluye datos de demostración." : ""}</p>
      </header>

      <section className={r.docSection} aria-label="Resumen del período">
        <h4>Resumen del período</h4>
        <p className={r.docHint}>Resumen automático de los datos (sin IA).</p>
        <ul className={r.docSummary}>
          {snapshot.sections.map((section) => <li key={section.serviceId}><strong>{section.label}</strong><HealthChip health={section.health} /></li>)}
        </ul>
      </section>

      {snapshot.sections.map((section) => (
        <section key={section.serviceId} className={r.docSection} data-health={section.health.level} aria-label={`Sección ${section.label}`}>
          <div className={r.docSectionHead}><h4>{section.label}</h4>{live ? <ReturnLink href={section.moduleHref}>Abrir {section.label}</ReturnLink> : null}</div>
          <HealthChip health={section.health} />
          {section.notes.map((note) => <p key={note} className={r.docHint}>{note}</p>)}
          <div className={r.grid2}>
            <MetricTable caption={`Indicadores al ${longDate(section.asOf)}`} metrics={section.indicators} />
            <MetricTable caption={`Resultados de ${snapshot.period.label}`} metrics={section.results} />
          </div>
          {section.comparisons.length ? (
            <div className={r.tableScroll}>
              <table className={r.dataTable}>
                <caption className={r.docCaption}>Comparación con {snapshot.previousPeriod.label}</caption>
                <thead><tr><th scope="col">Indicador</th><th scope="col" className={r.num}>{snapshot.period.label}</th><th scope="col" className={r.num}>{snapshot.previousPeriod.label}</th><th scope="col" className={r.num}>Variación</th></tr></thead>
                <tbody>{section.comparisons.map((item) => <tr key={item.id}><th scope="row">{item.label} <OriginTag origin={item.origin} /></th><td className={r.num}>{item.currentDisplay}</td><td className={r.num}>{item.previousDisplay}</td><td className={r.num}>{item.delta === null ? "Sin base" : `${item.delta > 0 ? "+" : ""}${item.delta.toLocaleString("es-AR", { maximumFractionDigits: 1 })} % · ${(item.better === "up" ? item.delta >= 0 : item.delta <= 0) ? "mejora" : "empeora"}`}</td></tr>)}</tbody>
              </table>
            </div>
          ) : <p className={r.docHint}>Sin comparación con {snapshot.previousPeriod.label}: no hay datos comparables en ambos períodos.</p>}
          {section.charts.length ? <div className={r.grid2}>{section.charts.map((chart) => <MiniChart key={chart.id} chart={chart} />)}</div> : null}
          <div className={r.grid2}>
            <Items title="Pendientes, bloqueos y aprobaciones" items={section.attention} empty={section.configured ? "Nada pendiente para revisar." : "Sin datos del módulo."} live={live} />
            <Items title="Próximas fechas (14 días)" items={section.upcoming} empty={section.configured ? "Sin fechas próximas." : "Sin datos del módulo."} live={live} />
          </div>
        </section>
      ))}

      <section className={r.docSection} aria-label="Conclusiones del equipo">
        <h4>Conclusiones, recomendaciones y próximos pasos</h4>
        <p className={r.docHint}>Texto escrito y revisado por el equipo. Borradores con IA: pendientes de conexión.</p>
        {([["Conclusiones", snapshot.narrative.conclusions, "Sin conclusiones cargadas."], ["Recomendaciones", snapshot.narrative.recommendations, "Sin recomendaciones cargadas."], ["Próximos pasos", snapshot.narrative.nextSteps, "Sin próximos pasos cargados."]] as const).map(([title, body, empty]) => (
          <div key={title} className={r.docNarrative}><h5>{title}</h5><p data-empty={body ? undefined : true}>{body || empty}</p></div>
        ))}
      </section>

      {snapshot.review.length ? (
        <section className={r.docSection} aria-label="Revisión por responsable">
          <h4>Revisión por responsable</h4>
          <ul className={r.docSummary}>{snapshot.review.map((line) => <li key={line.part}><strong>{line.part}</strong><span>{line.role} · {line.owner}</span><span>{line.status}{line.by ? ` por ${line.by}` : ""}{line.comment ? ` · «${line.comment}»` : ""}</span></li>)}</ul>
        </section>
      ) : null}

      <footer className={r.docFoot}>
        <details><summary>Cómo se calcula el estado</summary><ul>{HEALTH_RULES.map((rule) => <li key={rule.level}><strong>{rule.label}:</strong> {rule.rule}</li>)}</ul></details>
        <p>Definiciones {snapshot.metricsVersion} · huella de los datos (SHA-256) {snapshot.inputDigest || "se calcula al generar"}. {mode === "issued" ? "Esta versión no cambia aunque cambien los módulos: los cambios se emiten como versión nueva." : "Vista previa con los datos actuales: se congelan al generar."} Generar no envía el reporte.</p>
      </footer>
    </article>
  );
}
