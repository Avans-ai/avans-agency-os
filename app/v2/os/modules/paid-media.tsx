"use client";

/* Publicidad digital: espacio operativo completo.
 * Sin «Flujo del servicio» genérico. Las campañas y sus métricas de ejemplo son
 * DEMO; Meta Ads, Google Ads y LinkedIn Ads figuran como «No conectada». */
import Link from "next/link";
import { useMemo, useState } from "react";
import { serviceForTask } from "../director-data";
import type { OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { dueLabel } from "../selectors";
import { NewTaskModal } from "../task-blocks";
import { Badge, buttonClass, OSDue, OSEmptyState } from "../ui";
import s from "../os.module.css";
import { formatMoneyShort, formatNumber, formatPercent } from "../reports/builders";
import { LineChart } from "../reports/charts";
import { PAID_WEEKS, paidDemoMetrics } from "../reports/demo-fixtures";
import { PaidReportView } from "../reports/report-views";
import { usePaidReport } from "../reports/use-report-data";
import { CollectionView, displayValue, RecordPanel } from "./collection-view";
import { collectionDef } from "./collections";
import { AttentionPanel, ApprovalsPanel, DocsPanel, NextActionsPanel, ScopePanel, sectionHref, TaskHealthStrip } from "./module-common";
import { formatDateTime, Panel, SourceTag, StatusBadge, Strip } from "./module-ui";
import { useModuleRecords } from "./store";
import type { ModuleRecord } from "./types";
import m from "./modules.module.css";

const SERVICE = "publicidad-digital" as const;
const campaignsDef = collectionDef(SERVICE, "campanas")!;
const creativesDef = collectionDef(SERVICE, "creatividades")!;
const optimizationsDef = collectionDef(SERVICE, "optimizaciones")!;
const learningsDef = collectionDef(SERVICE, "aprendizajes")!;
const ALL = ["campanas", "creatividades", "optimizaciones"];

export function IntegrationsPanel() {
  const rows = [
    { name: "Meta Ads", detail: "Inversión, alcance, impresiones, clics, leads y conversiones" },
    { name: "Google Ads", detail: "Búsqueda: clics, CPC y conversiones" },
    { name: "LinkedIn Ads", detail: "Generación de demanda B2B" },
  ];
  return (
    <Panel title="Integraciones" id="paid-integrations" description="Motivo: no hay credenciales ni conector configurado en esta preview. Las cifras visibles son datos de demostración.">
      <div className={m.rows}>
        {rows.map((row) => <div className={m.integration} key={row.name}><div><strong>{row.name}</strong><small>{row.detail}</small></div><Badge tone="stone">No conectada</Badge></div>)}
      </div>
    </Panel>
  );
}

export function PaidSummary({ client, go }: { client: OsClient; go: (section: string, extra?: Record<string, string>) => void }) {
  const report = usePaidReport(client);
  const { data } = useModuleRecords(client.slug, SERVICE, ALL);
  const campaigns = data.campanas ?? [];
  const active = campaigns.filter((record) => record.values.estado === "Activa");
  const pendingCreatives = (data.creatividades ?? []).filter((record) => record.values.estado === "En aprobación");
  const proposals = (data.optimizaciones ?? []).filter((record) => record.values.estado === "Propuesta" || record.values.estado === "En evaluación");
  return (
    <div className={m.stack}>
      <TaskHealthStrip
        client={client}
        serviceId={SERVICE}
        extra={[
          { label: "Campañas activas", value: active.length, detail: `${campaigns.length} en total`, href: sectionHref(client.slug, SERVICE, "campanas") },
          { label: "Inversión 4 sem.", value: report.hasData ? formatMoneyShort(report.totals.spend) : "—", detail: "Demo" },
          { label: "Leads 4 sem.", value: report.hasData ? formatNumber(report.totals.leads) : "—", detail: report.hasData ? `CPL $ ${formatNumber(report.totals.cpl)} · demo` : "Sin datos" },
        ]}
      />
      <div className={m.grid}>
        <div className={m.stack}>
          <Panel title="Campañas" id="paid-summary-campaigns" description="Estado, presupuesto y resultado del período (demo)" actions={<button type="button" className={buttonClass("secondary", true)} onClick={() => go("campanas")}>Ver todas</button>}>
            {campaigns.length ? (
              <div className={s.tableWrap}>
                <table className={`${s.table} ${m.dense}`}>
                  <caption className={s.srOnly}>Campañas de {client.name}</caption>
                  <thead><tr><th scope="col">Campaña</th><th scope="col">Plataforma</th><th scope="col">Estado</th><th scope="col" className={s.num}>Presupuesto</th><th scope="col" className={s.num}>Leads</th><th scope="col" className={s.num}>CPL</th></tr></thead>
                  <tbody>
                    {report.campaigns.map((row) => (
                      <tr key={row.id}>
                        <td><button type="button" className={m.rowButton} onClick={() => go("campanas", { campana: row.id })}>{row.name}</button></td>
                        <td>{row.platform}</td>
                        <td><StatusBadge status={row.status} /></td>
                        <td className={s.num}>{formatMoneyShort(row.budget)}</td>
                        <td className={s.num}>{row.current ? formatNumber(row.current.leads) : "—"}</td>
                        <td className={s.num}>{row.current?.leads ? `$ ${formatNumber(row.current.cpl)}` : "Sin datos"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <OSEmptyState icon="objetivo" title="Sin campañas">Creá la primera desde «Campañas».</OSEmptyState>}
          </Panel>
          <NextActionsPanel client={client} serviceId={SERVICE} />
          <ApprovalsPanel client={client} serviceId={SERVICE} />
          <Panel title="Optimizaciones en curso" id="paid-summary-opt" actions={<button type="button" className={buttonClass("secondary", true)} onClick={() => go("optimizacion")}>Abrir registro</button>}>
            {proposals.length ? <div className={m.rows}>{proposals.map((record) => <div className={m.row} key={record.id}><div><strong>{record.values.hipotesis}</strong><small>{record.values.cambioPropuesto} · esperado {record.values.resultadoEsperado || "—"}</small></div><StatusBadge status={record.values.estado} /></div>)}</div> : <div className={m.panelBody}><p className={s.cellSub} style={{ margin: 0 }}>Sin optimizaciones abiertas.</p></div>}
          </Panel>
        </div>
        <aside className={m.stack}>
          <IntegrationsPanel />
          <AttentionPanel client={client} serviceId={SERVICE} />
          {pendingCreatives.length ? <Panel title="Piezas para aprobar" id="paid-summary-creatives">{pendingCreatives.map((record) => <div className={m.row} key={record.id}><div><button type="button" className={m.rowButton} onClick={() => go("produccion")}>{record.values.pieza}</button><small>Versión {record.values.version || "—"} · {record.values.responsable}</small></div><SourceTag source={record.source} /></div>)}</Panel> : null}
          <ScopePanel client={client} serviceId={SERVICE} />
          <DocsPanel client={client} />
        </aside>
      </div>
    </div>
  );
}

export function CampaignsSection({ client, editable, campaignId, go }: { client: OsClient; editable: boolean; campaignId: string | null; go: (section: string, extra?: Record<string, string>) => void }) {
  const { data } = useModuleRecords(client.slug, SERVICE, ["campanas"]);
  const record = campaignId ? (data.campanas ?? []).find((item) => item.id === campaignId) : undefined;
  if (campaignId && record) return <CampaignDetail client={client} record={record} editable={editable} onBack={() => go("campanas")} />;
  return (
    <div className={m.stack}>
      {campaignId ? <p className={s.demoNote} role="status" style={{ margin: 0 }}>No se encontró la campaña {campaignId} para {client.name}.</p> : null}
      <CollectionView client={client} serviceId={SERVICE} def={campaignsDef} editable={editable} onOpenRecord={(item) => go("campanas", { campana: item.id })} />
    </div>
  );
}

function CampaignDetail({ client, record, editable, onBack }: { client: OsClient; record: ModuleRecord; editable: boolean; onBack: () => void }) {
  const { tasks } = useOsStore();
  const report = usePaidReport(client);
  const { data, update } = useModuleRecords(client.slug, SERVICE, ALL);
  const [editing, setEditing] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const row = report.campaigns.find((item) => item.id === record.id);
  const weeks = paidDemoMetrics[record.id];
  const creatives = (data.creatividades ?? []).filter((item) => item.values.campana === record.id);
  const optimizations = (data.optimizaciones ?? []).filter((item) => item.values.campana === record.id);
  const linked = tasks.filter((task) => task.workItem?.id === record.id && serviceForTask(task) === SERVICE);
  const titleKeyOf = (collection: string) => (collection === "campanas" ? "nombre" : collection === "creatividades" ? "pieza" : "hipotesis");
  const series = useMemo(() => weeks ? [{ label: "Leads", values: weeks.map((week) => week.leads), tone: "accent" as const }, { label: "Clics ÷ 10", values: weeks.map((week) => Math.round(week.clicks / 10)), tone: "teal" as const }] : [], [weeks]);

  return (
    <div className={m.stack}>
      <button type="button" className={m.back} onClick={onBack} style={{ border: 0, background: "transparent", padding: 0, cursor: "pointer", alignSelf: "flex-start" }}>← Volver a campañas</button>
      <section className={m.panel} aria-labelledby="campaign-title">
        <div className={m.panelHead}>
          <div>
            <span className={s.rotulo}>Campaña · {record.id}</span>
            <h2 id="campaign-title" style={{ fontSize: 24, fontWeight: 500, margin: "4px 0" }}>{record.values.nombre}</h2>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><StatusBadge status={record.values.estado ?? ""} /><SourceTag source={record.source} /><Badge tone="stone">{record.values.plataforma}: No conectada</Badge></div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className={buttonClass("secondary", true)} disabled={!editable} onClick={() => setEditing(true)}>Editar campaña</button>
            <button type="button" className={buttonClass("primary", true)} disabled={!editable} onClick={() => setTaskOpen(true)}>Nueva tarea vinculada</button>
          </div>
        </div>
        <div className={m.panelBody}>
          <div className={m.detailGrid}>
            {campaignsDef.fields.filter((field) => field.key !== "nombre").map((field) => (
              <div key={field.key} data-wide={field.type === "textarea" ? "true" : undefined}><span>{field.label}</span><p>{displayValue(field, record.values[field.key] ?? "", data, titleKeyOf)}</p></div>
            ))}
            <div><span>Última modificación</span><p>{formatDateTime(record.updatedAt)} · {record.user}</p></div>
          </div>
        </div>
      </section>

      <Panel title="Resultados" id="campaign-results" description={row?.current ? "Últimas 4 semanas vs. 4 anteriores · datos de demostración" : undefined}>
        {row?.current ? (
          <div className={m.panelBody}>
            <Strip label="Resultados de la campaña" items={[
              { label: "Inversión", value: formatMoneyShort(row.current.spend), detail: row.previous?.spend ? `antes ${formatMoneyShort(row.previous.spend)}` : "sin período anterior" },
              { label: "Impresiones", value: formatNumber(row.current.impressions) },
              { label: "Clics", value: formatNumber(row.current.clicks), detail: `CTR ${formatPercent(row.current.ctr, 2)}` },
              { label: "Leads", value: formatNumber(row.current.leads), detail: row.previous?.leads ? `antes ${formatNumber(row.previous.leads)}` : undefined },
              { label: "CPL", value: `$ ${formatNumber(row.current.cpl)}`, detail: `CPC $ ${formatNumber(row.current.cpc)}` },
            ]} />
            <LineChart title={`Evolución semanal · ${record.values.nombre}`} labels={[...PAID_WEEKS]} series={series} format={(value) => formatNumber(value)} />
          </div>
        ) : (
          <div className={m.panelBody}>
            <div className={m.notice} role="status"><div><strong>Sin resultados.</strong> {record.values.plataforma || "La plataforma"} no está conectada a esta preview y no hay métricas de demostración para esta campaña. Los resultados aparecerán cuando exista la integración; no se simulan.</div></div>
          </div>
        )}
      </Panel>

      <div className={m.grid2}>
        <Panel title={`Producción creativa · ${creatives.length}`} id="campaign-creatives">
          {creatives.length ? <div className={m.rows}>{creatives.map((item) => <div className={m.row} key={item.id}><div><Link className={m.rowLink} href={sectionHref(client.slug, SERVICE, "produccion")}>{item.values.pieza}</Link><small>{item.values.formato} · versión {item.values.version || "—"}</small></div><StatusBadge status={item.values.estado ?? ""} /></div>)}</div> : <div className={m.panelBody}><p className={s.cellSub} style={{ margin: 0 }}>Sin piezas vinculadas.</p></div>}
        </Panel>
        <Panel title={`Optimizaciones · ${optimizations.length}`} id="campaign-optimizations">
          {optimizations.length ? <div className={m.rows}>{optimizations.map((item) => <div className={m.row} key={item.id}><div><strong>{item.values.hipotesis}</strong><small>Esperado {item.values.resultadoEsperado || "—"} · observado {item.values.resultadoObservado || "—"}</small></div><StatusBadge status={item.values.estado ?? ""} /></div>)}</div> : <div className={m.panelBody}><p className={s.cellSub} style={{ margin: 0 }}>Sin optimizaciones registradas.</p></div>}
        </Panel>
      </div>

      <div className={m.grid2}>
        <Panel title={`Tareas vinculadas · ${linked.length}`} id="campaign-tasks">
          {linked.length ? <div className={m.rows}>{linked.map((task) => <div className={m.row} key={task.id}><div><Link className={m.rowLink} href={sectionHref(client.slug, SERVICE, "tareas", `&task=${task.id}`)}>{task.id} · {task.title}</Link><small>{task.owner} · {task.status}</small></div><OSDue label={dueLabel(task)} kind={task.dueKind} status={task.status} /></div>)}</div> : <div className={m.panelBody}><p className={s.cellSub} style={{ margin: 0 }}>Sin tareas vinculadas.</p></div>}
        </Panel>
        <Panel title="Historial" id="campaign-history">
          <div className={m.panelBody}><ul className={m.history}>{record.history.map((entry, index) => <li key={`${entry.at}-${index}`}>{entry.text} <span>· {entry.user} · {formatDateTime(entry.at)}</span></li>)}</ul></div>
        </Panel>
      </div>

      {editing ? <RecordPanel client={client} serviceId={SERVICE} def={campaignsDef} record={record} refs={data} titleKeyOf={titleKeyOf} editable={editable} onClose={() => setEditing(false)} onSave={(values, text) => update("campanas", record.id, values, text)} /> : null}
      {taskOpen ? <NewTaskModal clientSlug={client.slug} serviceId={SERVICE} workItems={[{ collection: "campanas", id: record.id, label: record.values.nombre || record.id }]} workItemLabel="Campaña" defaultWorkItemId={record.id} onClose={() => setTaskOpen(false)} /> : null}
    </div>
  );
}

export function CreativeSection({ client, editable }: { client: OsClient; editable: boolean }) {
  return <CollectionView client={client} serviceId={SERVICE} def={creativesDef} editable={editable} intro={<div className={m.panelBody} style={{ paddingBottom: 0 }}><p className={s.demoNote} style={{ margin: 0 }}>Brief → producción → revisión → aprobación. Al pasar una pieza a «En aprobación» aparece en Entregables y aprobaciones; desde su detalle se aprueba o se piden cambios con comentario.</p></div>} />;
}

export function OptimizationSection({ client, editable }: { client: OsClient; editable: boolean }) {
  const { data } = useModuleRecords(client.slug, SERVICE, ["optimizaciones"]);
  const records = data.optimizaciones ?? [];
  const count = (state: string) => records.filter((record) => record.values.estado === state).length;
  return (
    <div className={m.stack}>
      <Strip label="Estado del registro de optimización" items={[
        { label: "Propuestas", value: count("Propuesta") },
        { label: "Aplicadas", value: count("Aplicada") },
        { label: "En evaluación", value: count("En evaluación") },
        { label: "Validadas", value: count("Validada") },
        { label: "Descartadas", value: count("Descartada") },
      ]} />
      <CollectionView client={client} serviceId={SERVICE} def={optimizationsDef} editable={editable} />
    </div>
  );
}

export function PaidResultsSection({ client, editable }: { client: OsClient; editable: boolean }) {
  const report = usePaidReport(client);
  return (
    <div className={m.stack}>
      <PaidReportView report={report} clientSlug={client.slug} embedded />
      <CollectionView client={client} serviceId={SERVICE} def={learningsDef} editable={editable} />
    </div>
  );
}
