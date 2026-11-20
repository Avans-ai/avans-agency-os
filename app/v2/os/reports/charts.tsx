"use client";

/* Gráficos SVG escritos a mano (sin librerías). Cada gráfico:
 * - tiene role="img" con <title> y <desc> que resumen los valores;
 * - ofrece la tabla de datos en un <details> como alternativa accesible;
 * - se dibuja al ancho real del contenedor para que el texto no se achique en móvil.
 * Color: grafito para la serie principal, teal para comparación y coral solo como acento. */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { BarDatum, ChartSeries } from "./builders";
import r from "./reports.module.css";

const TONE: Record<ChartSeries["tone"], string> = {
  ink: "var(--av-text)",
  teal: "var(--av-teal-300)",
  accent: "var(--av-coral-300)",
};

function useMeasuredWidth(fallback = 640) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0]?.contentRect.width ?? fallback);
      if (next > 0) setWidth(next);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [fallback]);
  return [ref, width] as const;
}

function niceMax(value: number) {
  if (value <= 0) return 1;
  const exponent = 10 ** Math.floor(Math.log10(value));
  const fraction = value / exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * exponent;
}

function ChartFrame({ title, children, table }: { title: string; children: ReactNode; table: ReactNode }) {
  return (
    <figure className={r.chart}>
      <figcaption className={r.chartTitle}>{title}</figcaption>
      {children}
      <details className={r.chartData}>
        <summary>Ver datos del gráfico</summary>
        <div className={r.tableScroll}>{table}</div>
      </details>
    </figure>
  );
}

export function LineChart({
  title,
  labels,
  series,
  format = (value) => String(value),
  height = 220,
}: {
  title: string;
  labels: string[];
  series: ChartSeries[];
  format?: (value: number) => string;
  height?: number;
}) {
  const id = useId();
  const [ref, width] = useMeasuredWidth();
  const padding = { top: 16, right: 16, bottom: 30, left: 64 };
  const innerW = Math.max(width - padding.left - padding.right, 40);
  const innerH = height - padding.top - padding.bottom;
  const max = niceMax(Math.max(0, ...series.flatMap((item) => item.values)));
  const x = (index: number) => padding.left + (labels.length <= 1 ? innerW / 2 : (index / (labels.length - 1)) * innerW);
  const y = (value: number) => padding.top + innerH - (value / max) * innerH;
  const ticks = [0, max / 2, max];
  const step = width < 420 ? Math.ceil(labels.length / 4) : 1;
  const description = series.map((item) => `${item.label}: ${item.values.map((value, index) => `${labels[index]} ${format(value)}`).join(", ")}`).join(". ");

  return (
    <ChartFrame
      title={title}
      table={(
        <table className={r.dataTable}>
          <thead><tr><th scope="col">Período</th>{series.map((item) => <th scope="col" key={item.label}>{item.label}</th>)}</tr></thead>
          <tbody>{labels.map((label, index) => <tr key={label}><th scope="row">{label}</th>{series.map((item) => <td key={item.label}>{format(item.values[index] ?? 0)}</td>)}</tr>)}</tbody>
        </table>
      )}
    >
      <div ref={ref} className={r.chartCanvas}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-t ${id}-d`}>
          <title id={`${id}-t`}>{title}</title>
          <desc id={`${id}-d`}>{description}</desc>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} stroke="var(--av-border)" strokeWidth={1} />
              <text x={padding.left - 8} y={y(tick) + 4} textAnchor="end" className={r.axisText}>{format(tick)}</text>
            </g>
          ))}
          {labels.map((label, index) => (index % step === 0 || index === labels.length - 1) ? (
            <text key={label} x={x(index)} y={height - 8} textAnchor="middle" className={r.axisText}>{label}</text>
          ) : null)}
          {series.map((item) => (
            <g key={item.label}>
              <polyline fill="none" stroke={TONE[item.tone]} strokeWidth={item.tone === "teal" ? 2 : 2.5} strokeDasharray={item.tone === "teal" ? "5 4" : undefined} points={item.values.map((value, index) => `${x(index)},${y(value)}`).join(" ")} />
              {item.values.map((value, index) => <rect key={index} x={x(index) - 3} y={y(value) - 3} width={6} height={6} fill={TONE[item.tone]} />)}
            </g>
          ))}
        </svg>
      </div>
      <ul className={r.legend} aria-hidden="true">
        {series.map((item) => <li key={item.label}><i style={{ background: TONE[item.tone] }} data-dashed={item.tone === "teal"} />{item.label}</li>)}
      </ul>
    </ChartFrame>
  );
}

/** Barras horizontales; `secondary` dibuja el período anterior como barra fina en teal. */
export function BarChart({
  title,
  data,
  primaryLabel = "Actual",
  secondaryLabel,
  highlightFirst = false,
}: {
  title: string;
  data: BarDatum[];
  primaryLabel?: string;
  secondaryLabel?: string;
  highlightFirst?: boolean;
}) {
  const id = useId();
  const [ref, width] = useMeasuredWidth();
  const rowH = secondaryLabel ? 50 : 40;
  const height = Math.max(data.length * rowH, rowH);
  const valueW = width < 420 ? 96 : 150;
  const barW = Math.max(width - valueW - 8, 40);
  const max = Math.max(1, ...data.map((item) => Math.max(item.value, item.secondary ?? 0)));
  const description = data.map((item) => `${item.label}: ${item.display ?? item.value}${secondaryLabel ? `; ${secondaryLabel} ${item.secondaryDisplay ?? item.secondary ?? 0}` : ""}`).join(". ");

  return (
    <ChartFrame
      title={title}
      table={(
        <table className={r.dataTable}>
          <thead><tr><th scope="col">Elemento</th><th scope="col">{primaryLabel}</th>{secondaryLabel ? <th scope="col">{secondaryLabel}</th> : null}</tr></thead>
          <tbody>{data.map((item) => <tr key={item.label}><th scope="row">{item.label}</th><td>{item.display ?? item.value}</td>{secondaryLabel ? <td>{item.secondaryDisplay ?? item.secondary ?? 0}</td> : null}</tr>)}</tbody>
        </table>
      )}
    >
      <div ref={ref} className={r.chartCanvas}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-t ${id}-d`}>
          <title id={`${id}-t`}>{title}</title>
          <desc id={`${id}-d`}>{description}</desc>
          {data.map((item, index) => {
            const top = index * rowH;
            const w = (item.value / max) * barW;
            const fill = highlightFirst && index === 0 ? "var(--av-coral-300)" : "var(--av-text)";
            return (
              <g key={item.label}>
                <text x={0} y={top + 13} className={r.barLabel}>{item.label.length > 48 ? `${item.label.slice(0, 46)}…` : item.label}</text>
                <rect x={0} y={top + 19} width={Math.max(w, item.value > 0 ? 2 : 0)} height={10} fill={fill} />
                <text x={barW + 8} y={top + 28} className={r.barValue}>{item.display ?? item.value}</text>
                {secondaryLabel ? (
                  <>
                    <rect x={0} y={top + 32} width={Math.max(((item.secondary ?? 0) / max) * barW, (item.secondary ?? 0) > 0 ? 2 : 0)} height={5} fill="var(--av-teal-300)" />
                    <text x={barW + 8} y={top + 41} className={r.axisText}>{item.secondaryDisplay ?? item.secondary}</text>
                  </>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      {secondaryLabel ? (
        <ul className={r.legend} aria-hidden="true">
          <li><i style={{ background: highlightFirst ? "var(--av-coral-300)" : "var(--av-text)" }} />{primaryLabel}</li>
          <li><i style={{ background: "var(--av-teal-300)" }} />{secondaryLabel}</li>
        </ul>
      ) : null}
    </ChartFrame>
  );
}

/** Variación porcentual alrededor de cero. `secondary === 1` indica que el cambio es favorable. */
export function DeltaChart({ title, data }: { title: string; data: BarDatum[] }) {
  const id = useId();
  const [ref, width] = useMeasuredWidth();
  const rowH = 40;
  const height = Math.max(data.length * rowH, rowH);
  const valueW = 72;
  const usable = Math.max(width - valueW - 8, 60);
  const mid = usable / 2;
  const max = Math.max(1, ...data.map((item) => Math.abs(item.value)));
  const description = data.map((item) => `${item.label}: ${item.display} (${item.secondary === 1 ? "favorable" : "desfavorable"})`).join(". ");
  return (
    <ChartFrame
      title={title}
      table={(
        <table className={r.dataTable}>
          <thead><tr><th scope="col">Indicador</th><th scope="col">Variación</th><th scope="col">Lectura</th></tr></thead>
          <tbody>{data.map((item) => <tr key={item.label}><th scope="row">{item.label}</th><td>{item.display}</td><td>{item.secondary === 1 ? "Favorable" : "Desfavorable"}</td></tr>)}</tbody>
        </table>
      )}
    >
      <div ref={ref} className={r.chartCanvas}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-t ${id}-d`}>
          <title id={`${id}-t`}>{title}</title>
          <desc id={`${id}-d`}>{description}</desc>
          <line x1={mid} x2={mid} y1={0} y2={height} stroke="var(--av-border-strong)" />
          {data.map((item, index) => {
            const top = index * rowH;
            const w = (Math.abs(item.value) / max) * (mid - 4);
            const x = item.value >= 0 ? mid : mid - w;
            return (
              <g key={item.label}>
                <text x={0} y={top + 13} className={r.barLabel}>{item.label.length > 52 ? `${item.label.slice(0, 50)}…` : item.label}</text>
                <rect x={x} y={top + 19} width={Math.max(w, 2)} height={10} fill={item.secondary === 1 ? "var(--av-teal-400)" : "var(--av-coral-300)"} />
                <text x={usable + 8} y={top + 28} className={r.barValue}>{item.display}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <ul className={r.legend} aria-hidden="true">
        <li><i style={{ background: "var(--av-teal-400)" }} />Favorable</li>
        <li><i style={{ background: "var(--av-coral-300)" }} />Desfavorable</li>
      </ul>
    </ChartFrame>
  );
}
