"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { serviceLabel } from "../os-data";
import { serviceHref } from "../service-workspace-data";
import { Badge } from "../ui";
import s from "../os.module.css";
import { formatNumber, ORIGIN_LABEL, type ReportKpi, type ReportLine, type ReportSource, type SourceOrigin } from "./builders";
import r from "./reports.module.css";

export function OriginTag({ origin }: { origin: SourceOrigin }) {
  return <span className={r.origin} data-origin={origin}>{ORIGIN_LABEL[origin]}</span>;
}

export function DemoBand({ children }: { children?: ReactNode }) {
  return (
    <div className={r.demoBand} role="note">
      <strong>Datos de demostración.</strong>
      <span>{children ?? "Las cifras de métricas son ficticias y no representan resultados reales del cliente. Las tareas, objetos y recomendaciones manuales provienen de lo guardado en este navegador."}</span>
    </div>
  );
}

export function Delta({ value, better }: { value?: number; better?: "up" | "down" }) {
  if (value === undefined || !Number.isFinite(value)) return null;
  const good = better === "down" ? value <= 0 : value >= 0;
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return <span className={`${r.delta} ${good ? r.deltaGood : r.deltaBad}`}>{sign}{formatNumber(Math.abs(value), 1)} %<span className={s.srOnly}>{good ? " (favorable)" : " (desfavorable)"}</span></span>;
}

export function KpiStrip({ kpis, label }: { kpis: ReportKpi[]; label: string }) {
  return (
    <section className={r.kpiStrip} aria-label={label}>
      {kpis.map((kpi) => (
        <div className={r.kpi} key={kpi.label}>
          <span>{kpi.label}</span>
          <strong>{kpi.value}</strong>
          <small>
            {kpi.delta !== undefined ? <><Delta value={kpi.delta} better={kpi.better} /> vs. {kpi.previous}</> : kpi.note ?? null}
            <OriginTag origin={kpi.origin} />
          </small>
        </div>
      ))}
    </section>
  );
}

export function ReportSection({ title, description, children, id }: { title: string; description?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className={r.section} aria-labelledby={id}>
      <div className={r.sectionHead}><h4 id={id}>{title}</h4>{description ? <p>{description}</p> : null}</div>
      {children}
    </section>
  );
}

export function LineList({ title, lines, empty, clientSlug }: { title: string; lines: ReportLine[]; empty: string; clientSlug: string }) {
  return (
    <div className={r.block}>
      <h5>{title} <em>{lines.length}</em></h5>
      {lines.length ? (
        <ul className={r.lines}>
          {lines.map((line, index) => (
            <li key={`${line.title}-${index}`} data-tone={line.tone}>
              <i aria-hidden="true" />
              <div>
                <strong>{line.taskId && line.serviceId ? <Link href={`${serviceHref(clientSlug, line.serviceId)}?seccion=tareas&task=${line.taskId}`}>{line.title}</Link> : line.title}</strong>
                <small>
                  {line.detail ? <span>{line.detail}</span> : null}
                  {line.serviceId ? <span>{serviceLabel(line.serviceId)}</span> : null}
                  <OriginTag origin={line.origin} />
                </small>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className={r.linesEmpty}>{empty}</p>}
    </div>
  );
}

export function SourcesList({ sources }: { sources: ReportSource[] }) {
  return (
    <div className={r.sources}>
      {sources.map((source) => (
        <div className={r.sourceRow} key={source.label}>
          <strong>{source.label}</strong>
          <p>{source.detail}</p>
          <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <OriginTag origin={source.origin} />
            {source.status ? <Badge tone={source.status === "No conectada" ? "stone" : "cool"}>{source.status}</Badge> : null}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Conclusion({ children }: { children: ReactNode }) {
  return <div className={r.conclusion}><span>Conclusión</span><p>{children}</p></div>;
}

export function ReportDoc({ title, eyebrow, meta, tools, children, label }: { title: string; eyebrow: string; meta: ReactNode; tools?: ReactNode; children: ReactNode; label: string }) {
  return (
    <article className={r.doc} aria-label={label}>
      <header className={r.docHead}>
        <div>
          <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--av-link)", fontWeight: 500 }}>{eyebrow}</span>
          <h3>{title}</h3>
          <div className={r.docMeta}>{meta}</div>
        </div>
        {tools ? <div className={r.docTools}>{tools}</div> : null}
      </header>
      {children}
    </article>
  );
}
