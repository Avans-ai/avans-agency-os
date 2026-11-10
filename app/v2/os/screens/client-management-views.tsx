"use client";

import Link from "next/link";
import { useState } from "react";
import type { ClientBenchmark } from "../../benchmark-data";
import {
  canManageClient,
  directorMeta,
  scopeForClient,
  type CompetitorSnapshot,
} from "../director-data";
import { serviceLabel, strategyByClient, type OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { serviceHref } from "../service-workspace-data";
import { Badge, buttonClass, cx, LinkButton, OSEmptyState } from "../ui";
import s from "../os.module.css";
import sc from "../screens.module.css";
import d from "./director-update.module.css";

export type ClientManagementView = "ficha" | "benchmark" | "plan" | "reportes" | "documentos";

function complianceTone(status: string) {
  if (status === "Cumplido") return "cool" as const;
  if (status === "Atención") return "peach" as const;
  return "stone" as const;
}

function reportTone(status: string) {
  if (status === "Listo") return "cool" as const;
  if (status === "En preparación") return "peach" as const;
  return "stone" as const;
}

export function ClientManagementContent({ client, view, benchmark }: { client: OsClient; view: ClientManagementView; benchmark?: ClientBenchmark }) {
  if (view === "ficha") return <ClientSheet client={client} />;
  if (view === "benchmark") return <ClientBenchmarkView client={client} benchmark={benchmark} />;
  if (view === "plan") return <ClientMarketingPlan client={client} />;
  if (view === "reportes") return <ClientReports client={client} />;
  return <ClientDocuments client={client} />;
}

function ClientSheet({ client }: { client: OsClient }) {
  const { notify } = useOsStore();
  const [tab, setTab] = useState<"scope" | "business">("scope");
  const meta = directorMeta(client.slug);
  const scope = scopeForClient(client);

  return (
    <div className={sc.stack}>
      <div className={s.pageHead}>
        <div><h2 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Ficha del cliente</h2><p>Alcance contratado e información estructurada del negocio según el modelo de Discovery.</p></div>
      </div>
      <div className={d.managementTabs} role="tablist" aria-label="Secciones de la ficha">
        <button type="button" role="tab" aria-selected={tab === "scope"} aria-pressed={tab === "scope"} onClick={() => setTab("scope")}>Alcance del servicio</button>
        <button type="button" role="tab" aria-selected={tab === "business"} aria-pressed={tab === "business"} onClick={() => setTab("business")}>Información del negocio</button>
      </div>

      {tab === "scope" ? (
        <>
          <section className={d.scopeGrid} aria-label="Alcance por módulo">
            {scope.map((item) => (
              <article className={d.scopeCard} key={item.serviceId}>
                <div className={d.scopeHead}><strong>{serviceLabel(item.serviceId)}</strong><Badge tone={complianceTone(item.compliance)}>{item.compliance}</Badge></div>
                <p>{item.summary}</p>
                <span className={s.cellSub}>{item.cadence}</span>
                <ul className={d.scopeList}>{item.deliverables.map((deliverable) => <li key={deliverable}>{deliverable}</li>)}</ul>
                {item.alert ? <div className={d.scopeAlert}><strong>Revisión de alcance:</strong> {item.alert}</div> : null}
                <Link className={s.link} href={serviceHref(client.slug, item.serviceId)}>Abrir módulo</Link>
              </article>
            ))}
          </section>
          <p className={s.demoNote}>La revisión periódica del alcance está representada con reglas y alertas de demostración. Para informar incumplimientos reales deberá comparar entregables persistidos, fechas y alcance contractual.</p>
        </>
      ) : (
        <>
          {meta ? (
            <section className={d.businessGrid} aria-label="Información estructurada del negocio">
              <div className={d.businessFact}><span>Definición del negocio</span><strong>{meta.business.definition}</strong></div>
              <div className={d.businessFact}><span>Propuesta de valor</span><strong>{meta.business.offer}</strong></div>
              <div className={d.businessFact}><span>Unidades de negocio</span><div className={d.chipList}>{meta.business.units.map((item) => <span className={d.chip} key={item}>{item}</span>)}</div></div>
              <div className={d.businessFact}><span>Públicos</span><div className={d.chipList}>{meta.business.audiences.map((item) => <span className={d.chip} key={item}>{item}</span>)}</div></div>
              <div className={d.businessFact}><span>Catálogos y brochures</span><strong>{meta.business.catalogState}</strong><button type="button" className={buttonClass("secondary", true)} onClick={() => notify("Carga de catálogo: todavía sin persistencia ni extracción automática")}>Cargar material</button></div>
              <div className={d.businessFact}><span>Tienda Nube</span><strong>{meta.business.tiendaNubeState}</strong><button type="button" className={buttonClass("secondary", true)} onClick={() => notify("Integración con Tienda Nube: pendiente de credenciales y alcance")}>Configurar integración</button></div>
            </section>
          ) : <OSEmptyState icon="registro" title="Sin información estructurada">Primero debe completarse el relevamiento del negocio.</OSEmptyState>}
          <p className={s.demoNote}>La carga y el escaneo de productos todavía no están conectados. Los botones muestran el flujo previsto sin afirmar una integración activa.</p>
        </>
      )}
    </div>
  );
}

function ClientBenchmarkView({ client, benchmark }: { client: OsClient; benchmark?: ClientBenchmark }) {
  const { notify } = useOsStore();
  const meta = directorMeta(client.slug);
  const [competitors, setCompetitors] = useState<CompetitorSnapshot[]>(meta?.competitors ?? []);
  const [name, setName] = useState("");

  function addCompetitor(event: React.FormEvent) {
    event.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    setCompetitors((current) => [{ name: clean, positioning: "Pendiente de analizar", channels: "Pendiente", lastScan: "Sin escanear", state: "Nueva" }, ...current]);
    setName("");
    notify(`${clean} agregada al benchmark solo en esta sesión (simulado)`);
  }

  return (
    <div className={sc.stack}>
      <div className={s.pageHead}>
        <div><h2 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Benchmark</h2><p>Competidores, posicionamiento, contenidos, anuncios y experiencia digital.</p></div>
        <button type="button" className={buttonClass("secondary")} onClick={() => notify("Escaneo periódico: requiere fuentes, scheduler y trazabilidad de ejecución")}>Solicitar escaneo</button>
      </div>

      <form className={s.actions} onSubmit={addCompetitor} style={{ justifyContent: "flex-start" }}>
        <label className={s.field} style={{ minWidth: 280 }}><span>Sumar marca manualmente</span><input className={s.input} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre de la marca" /></label>
        <button type="submit" className={buttonClass("dark", true)}>Agregar marca</button>
      </form>

      <section className={d.competitorGrid} aria-label="Marcas analizadas">
        {competitors.map((competitor) => (
          <article className={d.competitorCard} key={`${competitor.name}-${competitor.lastScan}`}>
            <div className={d.scopeHead}><h3>{competitor.name}</h3><Badge tone={competitor.state === "Monitoreada" ? "cool" : competitor.state === "Nueva" ? "info" : "peach"}>{competitor.state}</Badge></div>
            <p>{competitor.positioning}</p>
            <span className={s.cellSub}>{competitor.channels}</span>
            <span className={s.cellSub}>Último escaneo: {competitor.lastScan}</span>
          </article>
        ))}
      </section>

      {benchmark ? (
        <section className={s.surface}>
          <div className={s.cardHead}><h2>Lectura comparativa</h2><span className={s.cardMeta}>Último relevamiento: {benchmark.lastScan}</span></div>
          <div className={s.tableWrap}><table className={s.table}><thead><tr><th>Dimensión</th><th>{client.name}</th><th>Promedio</th><th>Insight</th></tr></thead><tbody>{benchmark.dimensions.map((item) => <tr key={item.label}><td>{item.label}</td><td>{item.clientScore}</td><td>{item.benchmarkScore}</td><td>{item.note}</td></tr>)}</tbody></table></div>
        </section>
      ) : null}

      <section className={s.surface}>
        <div className={s.cardHead}><h2>Reporte quincenal de insights</h2><span className={s.cardMeta}>Próxima salida: pendiente de automatización</span></div>
        <div className={sc.cardBody}><p style={{ margin: 0 }}>El reporte debe destacar acciones que funcionaron, nuevos competidores, lanzamientos y oportunidades aplicables a los módulos del cliente.</p></div>
      </section>
      <p className={s.demoNote}>No existe un escaneo automático activo en esta rama. Las marcas y fechas son datos de demostración y las altas manuales se pierden al recargar.</p>
    </div>
  );
}

function ClientMarketingPlan({ client }: { client: OsClient }) {
  const plan = strategyByClient[client.slug];
  const scope = scopeForClient(client);
  return (
    <div className={sc.stack}>
      <div className={s.pageHead}><div><h2 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Plan de Marketing</h2><p>Plan general y bajada por cada módulo de servicio contratado.</p></div></div>
      {plan ? (
        <section className={sc.commercial}>
          <p className={s.rotulo} style={{ color: "var(--av-coral-200)" }}>Posicionamiento · {plan.period}</p>
          <p style={{ fontSize: 18, lineHeight: 1.55 }}>{plan.positioning}</p>
          <div className={d.chipList}>{plan.pillars.map((pillar) => <span className={d.chip} key={pillar.title}>{pillar.title}</span>)}</div>
        </section>
      ) : <OSEmptyState icon="objetivo" title="Plan general pendiente">La estructura por módulo está lista para ser completada con el Discovery validado.</OSEmptyState>}

      <section className={d.scopeGrid} aria-label="Plan por módulo">
        {scope.map((item) => (
          <article className={d.scopeCard} key={item.serviceId}>
            <div className={d.scopeHead}><strong>{serviceLabel(item.serviceId)}</strong><Badge tone={complianceTone(item.compliance)}>{item.compliance}</Badge></div>
            <p>{item.summary}</p>
            <ul className={d.scopeList}>{item.deliverables.map((deliverable) => <li key={deliverable}>{deliverable}</li>)}</ul>
            <LinkButton href={serviceHref(client.slug, item.serviceId)} variant="secondary" small>Abrir plan operativo</LinkButton>
          </article>
        ))}
      </section>
    </div>
  );
}

function ClientReports({ client }: { client: OsClient }) {
  const meta = directorMeta(client.slug);
  return (
    <div className={sc.stack}>
      <div className={s.pageHead}><div><h2 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Reportes</h2><p>Pulsos semanales, devoluciones mensuales e insights quincenales generados desde la operación.</p></div></div>
      {meta?.reports.length ? (
        <section className={d.reportGrid} aria-label="Reportes de la cuenta">
          {meta.reports.map((report) => (
            <article className={d.reportCard} key={report.id}>
              <div className={d.scopeHead}><strong>{report.label}</strong><Badge tone={reportTone(report.state)}>{report.state}</Badge></div>
              <span className={s.cellSub}>{report.type} · {report.period}</span>
              <button type="button" className={buttonClass("secondary", true)} disabled={report.state !== "Listo"}>{report.state === "Listo" ? "Abrir reporte" : "Todavía no disponible"}</button>
            </article>
          ))}
        </section>
      ) : <OSEmptyState icon="datos" title="Sin reportes configurados" />}
      <p className={s.demoNote}>La generación automática necesita datos persistidos, una plantilla aprobada y evidencia de cada fuente. En esta etapa se representa la cadencia y el estado.</p>
    </div>
  );
}

function ClientDocuments({ client }: { client: OsClient }) {
  const { role, notify } = useOsStore();
  const meta = directorMeta(client.slug);
  const editable = canManageClient(role, client.slug);
  const [documents, setDocuments] = useState(meta?.documents ?? []);
  const [changes, setChanges] = useState([
    { id: "CH-1", title: "Actualizar objetivo del trimestre", detail: "El último resumen de reunión menciona priorizar calidad de leads por sobre volumen." },
    { id: "CH-2", title: "Agregar un decisor al proceso", detail: "El documento identifica a Dirección Comercial como nueva instancia de aprobación." },
  ]);

  function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setDocuments((current) => [{ id: `LOCAL-${Date.now()}`, name: file.name, type: "Documento nuevo", updated: "Ahora", source: "Carga local" }, ...current]);
    setChanges((current) => [{ id: `LOCAL-CHANGE-${Date.now()}`, title: `Revisar cambios sugeridos por ${file.name}`, detail: "Análisis de demostración: el backend deberá extraer, citar y comparar el contenido con la ficha vigente." }, ...current]);
    notify(`${file.name} cargado solo en esta sesión (simulado)`);
    event.target.value = "";
  }

  return (
    <div className={sc.stack}>
      <div className={s.pageHead}>
        <div><h2 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Documentos y actualizaciones</h2><p>Documentación, resúmenes de reuniones y cambios propuestos para retroalimentar el sistema.</p></div>
        <div className={s.actions}>
          <input id="client-document-upload" type="file" className={s.srOnly} onChange={upload} disabled={!editable} />
          <label htmlFor="client-document-upload" className={buttonClass(editable ? "primary" : "secondary")}>{editable ? "Cargar documento" : "Solo lectura"}</label>
        </div>
      </div>

      <section className={s.surface} aria-labelledby="documents-title">
        <div className={s.cardHead}><h2 id="documents-title">Fuentes de conocimiento</h2><span className={s.cardMeta}>{documents.length} documentos</span></div>
        {documents.map((document) => <div className={d.documentRow} key={document.id}><div><strong>{document.name}</strong><small>{document.type} · {document.source}</small></div><span>{document.updated}</span><button type="button" className={buttonClass("ghost", true)} onClick={() => notify("Vista de documento: pendiente de integración con almacenamiento")}>Ver</button></div>)}
      </section>

      <section className={s.surface} aria-labelledby="changes-title">
        <div className={s.cardHead}><h2 id="changes-title">Cambios sugeridos para aprobar</h2><span className={s.cardMeta}>Solo PMs</span></div>
        {changes.length ? <div className={d.changeList}>{changes.map((change) => <div className={d.changeItem} key={change.id}><div><strong>{change.title}</strong><p>{change.detail}</p></div><div className={s.actions}><button type="button" className={buttonClass("ghost", true)} disabled={!editable} onClick={() => setChanges((current) => current.filter((item) => item.id !== change.id))}>Descartar</button><button type="button" className={buttonClass("dark", true)} disabled={!editable} onClick={() => { setChanges((current) => current.filter((item) => item.id !== change.id)); notify("Cambio aprobado solo en esta sesión (simulado)", "success"); }}>Aprobar</button></div></div>)}</div> : <OSEmptyState icon="chispa" title="No hay cambios pendientes">Las sugerencias del próximo documento aparecerán acá.</OSEmptyState>}
      </section>
      <p className={s.demoNote}>El análisis automático todavía no está conectado. Una implementación real deberá guardar el archivo, citar fragmentos, mostrar diferencias y aplicar únicamente cambios aprobados.</p>
    </div>
  );
}
