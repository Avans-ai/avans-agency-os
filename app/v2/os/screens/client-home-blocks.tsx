"use client";

/* Inicio del cliente · un bloque horizontal por servicio activo.
 * Todo sale de metrics/** (las mismas definiciones que usa Reportes). El semáforo siempre
 * lleva texto e ícono; los datos que faltan se muestran como «Sin datos», «Pendiente de
 * configurar» o «No conectado», nunca como cero. Los enlaces recuerdan el origen para que
 * «Volver» regrese al Inicio. */
import { AvansModuleIcon } from "../brand";
import { Glyph } from "../glyphs";
import { HEALTH_RULES, type HealthLevel, type HealthReading } from "../metrics/service-health";
import { ITEM_KIND_LABEL, lightText, ORIGIN_LABEL, type ChartSpec, type DataOrigin, type ItemRef, type Metric, type ServiceSnapshot } from "../metrics/types";
import { shortDate } from "../metrics/period";
import { ReturnLink } from "../navigation/back";
import { serviceCatalog } from "../os-data";
import h from "./client-home.module.css";

export function HealthChip({ health, compact = false }: { health: HealthReading; compact?: boolean }) {
  return (
    <span className={h.health} data-level={health.level}>
      <HealthIcon level={health.level} />
      <strong>{health.label}</strong>
      {compact ? null : <span className={h.healthReason}>{health.reason}</span>}
    </span>
  );
}

export function HealthIcon({ level }: { level: HealthLevel }) {
  if (level === "gris") return <svg className={h.healthIcon} viewBox="0 0 24 24" width={15} height={15} aria-hidden="true"><path d="M6 12h12" stroke="currentColor" strokeWidth={2.4} fill="none" /></svg>;
  return <span className={h.healthIcon} aria-hidden="true"><Glyph name={level === "verde" ? "check" : level === "amarillo" ? "alert" : "blocked"} size={15} /></span>;
}

export function OriginTag({ origin }: { origin: DataOrigin }) {
  if (origin === "real") return null;
  return <span className={h.origin} data-origin={origin}>{ORIGIN_LABEL[origin]}</span>;
}

function MetricTile({ metric }: { metric: Metric }) {
  const missing = metric.value === null && /Sin datos|Pendiente|No conectado/.test(metric.display);
  const body = (
    <>
      <span className={h.metricLabel}>{metric.label}</span>
      <strong className={h.metricValue} data-missing={missing || undefined}>
        {metric.light && metric.light !== "gris" && !missing ? <HealthIcon level={metric.light} /> : null}
        {metric.display}
      </strong>
      {metric.light && metric.light !== "gris" && !missing ? <small className={h.metricHint}>{lightText(metric)}</small> : null}
      {metric.hint ? <small className={h.metricHint}>{metric.hint}</small> : null}
      {missing && metric.origin !== "demo" ? null : <OriginTag origin={metric.origin} />}
    </>
  );
  return metric.href ? <ReturnLink href={metric.href} className={h.metric} data-light={metric.light}>{body}</ReturnLink> : <div className={h.metric} data-light={metric.light}>{body}</div>;
}

export function MiniChart({ chart }: { chart: ChartSpec }) {
  if (chart.kind === "line") {
    const max = Math.max(1, ...chart.values);
    const w = 260, hgt = 70, step = chart.values.length > 1 ? w / (chart.values.length - 1) : 0;
    const points = chart.values.map((value, index) => `${Math.round(index * step)},${Math.round(hgt - (value / max) * (hgt - 8) - 4)}`).join(" ");
    const summary = chart.labels.map((label, index) => `${label}: ${chart.values[index].toLocaleString("es-AR")}`).join(" · ");
    return (
      <figure className={h.chart}>
        <figcaption>{chart.title} <OriginTag origin={chart.origin} /></figcaption>
        <svg viewBox={`-4 0 ${w + 8} ${hgt}`} className={h.spark} role="img" aria-label={`${chart.title}. ${summary}`} preserveAspectRatio="none">
          <polyline points={points} fill="none" stroke="var(--av-text)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          {chart.values.map((value, index) => <circle key={index} cx={Math.round(index * step)} cy={Math.round(hgt - (value / max) * (hgt - 8) - 4)} r={2.6} fill={index === chart.values.length - 1 ? "var(--av-accent)" : "var(--av-text)"} />)}
        </svg>
        <div className={h.sparkAxis} aria-hidden="true"><span>{chart.labels[0]}</span><span>{chart.labels[chart.labels.length - 1]}: <b>{chart.values[chart.values.length - 1]?.toLocaleString("es-AR")}</b></span></div>
      </figure>
    );
  }
  const max = Math.max(1, ...chart.items.map((item) => item.value));
  const total = chart.items.reduce((sum, item) => sum + item.value, 0);
  return (
    <figure className={h.chart}>
      <figcaption>{chart.title} <OriginTag origin={chart.origin} /></figcaption>
      <ul className={h.bars} aria-label={`${chart.title}: ${total} en total`}>
        {chart.items.map((item) => (
          <li key={item.label}>
            <span className={h.barLabel}>{item.label}</span>
            <span className={h.barTrack} aria-hidden="true"><i style={{ width: `${(item.value / max) * 100}%` }} /></span>
            <b>{item.value}</b>
          </li>
        ))}
      </ul>
      {chart.href ? <ReturnLink href={chart.href} className={h.textLink}>Ver en el módulo</ReturnLink> : null}
    </figure>
  );
}

function ItemList({ title, items, empty, limit = 4 }: { title: string; items: ItemRef[]; empty: string; limit?: number }) {
  return (
    <div className={h.items}>
      <h4>{title} <span>{items.length}</span></h4>
      {items.length ? (
        <ul>
          {items.slice(0, limit).map((item) => (
            <li key={`${item.kind}-${item.id}`} data-kind={item.kind}>
              <span className={h.itemKind}>{ITEM_KIND_LABEL[item.kind]}{item.date && item.kind === "proximo" ? ` · ${shortDate(item.date)}` : ""}</span>
              <ReturnLink href={item.href} className={h.itemLink}>{item.title}</ReturnLink>
              <small>{item.detail}{item.origin === "demo" ? " · demo" : ""}</small>
            </li>
          ))}
        </ul>
      ) : <p className={h.empty}>{empty}</p>}
      {items.length > limit ? <small className={h.more}>y {items.length - limit} más en el módulo</small> : null}
    </div>
  );
}

export function ServiceBlock({ snapshot }: { snapshot: ServiceSnapshot }) {
  const definition = serviceCatalog.find((service) => service.id === snapshot.serviceId);
  const chart = snapshot.charts[0];
  return (
    <article className={h.block} data-health={snapshot.health.level} aria-label={`Servicio ${snapshot.label}`} data-service={snapshot.serviceId}>
      <header className={h.blockHead}>
        <div className={h.identity}>
          <span className={h.icon}>{definition ? <AvansModuleIcon name={definition.icon} size={28} /> : null}</span>
          <div>
            <h3>{snapshot.label}</h3>
            <HealthChip health={snapshot.health} />
          </div>
        </div>
        <ReturnLink href={snapshot.moduleHref} className={h.open}>Abrir {snapshot.label}<Glyph name="arrow-right" size={14} /></ReturnLink>
      </header>
      <div className={h.blockBody}>
        <div className={h.left}>
          <div className={h.metrics} aria-label={`Indicadores de ${snapshot.label}`} role="group">
            {snapshot.indicators.map((metric) => <MetricTile key={metric.id} metric={metric} />)}
          </div>
          {chart ? <MiniChart chart={chart} /> : null}
        </div>
        <div className={h.right}>
          <ItemList title="Pendientes, bloqueos y aprobaciones" items={snapshot.attention} empty={snapshot.configured ? "Nada pendiente para revisar." : "Sin datos del módulo."} />
          <ItemList title="Próximas fechas" items={snapshot.upcoming} empty={snapshot.configured ? "Sin fechas en los próximos 14 días." : "Sin datos del módulo."} limit={3} />
        </div>
      </div>
      <footer className={h.blockFoot}>
        <span>{snapshot.notes[0]}</span>
        <span className={h.footOrigin}>{snapshot.origin === "demo" ? "Incluye datos de demostración" : snapshot.origin === "real" ? "Datos registrados en el módulo" : snapshot.origin === "no-conectado" ? "Integración no conectada" : "Pendiente de configurar"}</span>
      </footer>
    </article>
  );
}

export function HealthRules() {
  return (
    <details className={h.rules}>
      <summary>Cómo se calcula el estado de cada servicio</summary>
      <ul>
        {HEALTH_RULES.map((rule) => <li key={rule.level}><span className={h.health} data-level={rule.level}><HealthIcon level={rule.level} /><strong>{rule.label}</strong></span> {rule.rule}</li>)}
      </ul>
      <p>Las métricas usan las mismas definiciones que Reportes. «Demo» = dato de demostración rotulado; «Pendiente de configurar» = el módulo no tiene esa información; «No conectado» = requiere una integración que no está conectada.</p>
    </details>
  );
}
