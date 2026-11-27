"use client";

/* Reportes del cliente (Gestión y estrategia → Reportes): generador de reportes.
 * Pantalla principal: crear un reporte, continuar borradores y consultar los reportes
 * generados con sus versiones. El asistente recorre 9 pasos: tipo, período, servicios,
 * datos, indicadores, conclusiones, revisión, vista previa y generación del PDF.
 * Los indicadores salen de metrics/** (las mismas definiciones del Inicio del cliente). */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { canManageClient } from "../director-data";
import { useKnowledge } from "../knowledge/use-knowledge";
import { newId } from "../knowledge/types";
import { readLocalJson, useLocalStorageState, writeLocalJson } from "../local-persistence";
import { serviceSnapshots } from "../metrics";
import { METRIC_COLLECTIONS, projectInput, recordsOf, type MetricsInput } from "../metrics/input";
import { currentMonthPeriod, customPeriod, longDate, monthPeriod, previousPeriod, todayIso, weekPeriod, type MetricPeriod, type PeriodKind } from "../metrics/period";
import { ORIGIN_LABEL, originOfRecords, type ServiceSnapshot } from "../metrics/types";
import { useMetricsInput } from "../metrics/use-metrics-input";
import { collectionDef } from "../modules/collections";
import { formatDateTime } from "../modules/module-ui";
import { BackButton, useUnsavedChanges } from "../navigation/back";
import { serviceCatalog, serviceLabel, type OsClient, type ServiceId } from "../os-data";
import { useOsStore } from "../os-store";
import { previewActor } from "../preview-roles";
import { HealthChip, OriginTag, ServiceBlock } from "../screens/client-home-blocks";
import { buttonClass, OSEmptyState } from "../ui";
import s from "../os.module.css";
import sc from "../screens.module.css";
import { buildReportSnapshot, factualSummary, type ReportSnapshot } from "./builders";
import {
  createDraft, deleteDraft, EMPTY_NARRATIVE, issueVersion, readReports, recordReportEvent, REPORT_STEPS, REPORT_TYPE_LABEL, REPORT_TYPES, reportFileName, reportsKey, reportTitle,
  reviewReference, startNewVersion, updateDraft, type DraftPatch, type ReportNarrative, type ReportRecord, type ReportsState, type ReportType, type ReportVersion,
} from "./generator";
import { downloadBlob, loadPdfAssets, readReportPdf, removeReportPdf, sha256Hex, storeReportPdf } from "./report-files";
import { ReportDocument } from "./report-document";
import { ReportReviewPanel, useReportReview } from "./report-review";
import { withReportSource } from "./register";
import { buildEmailDraft, canSendReport, EMAIL_NOT_CONNECTED, type EmailDraft } from "./review-circuit";
import r from "./reports.module.css";

const NONE = null;
type Save = (update: (state: ReportsState) => ReportsState, message?: string) => boolean;

function defaultPeriod(type: ReportType, today: string): MetricPeriod {
  return type === "semanal" ? weekPeriod(today) : currentMonthPeriod(today);
}

export function ClientReports({ client }: { client: OsClient }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { role, servicesOf, notify, localHydrated } = useOsStore();
  const key = reportsKey(client.slug);
  const [stored] = useLocalStorageState<unknown>(key, NONE);
  const state = useMemo(() => readReports(stored, client.slug), [client.slug, stored]);
  const active = servicesOf(client.slug);
  const activeServices = useMemo(() => serviceCatalog.map((service) => service.id).filter((id) => active.includes(id)), [active]);
  const canEdit = localHydrated && canManageClient(role, client.slug);
  const actor = previewActor(role);
  const openId = params.get("reporte");
  const versionParam = Number(params.get("version") || 0);
  const report = state.reports.find((item) => item.id === openId);

  const save: Save = (update, message) => {
    try {
      const next = update(readReports(readLocalJson<unknown>(key, null), client.slug));
      if (!writeLocalJson(key, next)) throw new Error("No se pudo guardar en este navegador (revisá el espacio disponible).");
      if (message) notify(`${message} · guardado en este navegador`, "success");
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo guardar el reporte.", "error");
      return false;
    }
  };
  function go(id: string | null, version?: number) {
    const next = new URLSearchParams(params.toString());
    next.delete("reporte");
    next.delete("version");
    if (id) next.set("reporte", id);
    if (id && version) next.set("version", String(version));
    router.push(`${pathname}?${next.toString()}`, { scroll: true });
  }
  function create() {
    if (!canEdit || !activeServices.length) return;
    const id = `REP-${Date.now().toString(36).toUpperCase()}`;
    const at = new Date().toISOString();
    if (save((current) => createDraft(current, { id, type: "mensual", period: currentMonthPeriod(todayIso()), services: activeServices, actor, at }, activeServices), "Borrador de reporte creado")) go(id);
  }

  if (openId && !report) {
    return <div className={sc.stack}><OSEmptyState icon="datos" title="No encontramos ese reporte" actions={<button type="button" className={buttonClass("secondary", true)} onClick={() => go(null)}>Volver a Reportes</button>}>Puede que se haya borrado o que pertenezca a otro navegador.</OSEmptyState></div>;
  }
  if (report && (versionParam || report.status === "Emitido")) {
    const version = report.versions.find((item) => item.version === (versionParam || report.versions.length));
    if (version) return <VersionView client={client} report={report} version={version} save={save} go={go} canEdit={canEdit} />;
  }
  if (report) return <ReportWizard key={`${report.id}-${report.versions.length}`} client={client} report={report} activeServices={activeServices} save={save} go={go} canEdit={canEdit} />;

  const drafts = state.reports.filter((item) => item.status === "Borrador");
  const issued = state.reports.filter((item) => item.versions.length);
  return (
    <div className={r.genHome}>
      <div className={s.pageHead}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Reportes</h2>
          <p>Generá reportes con los datos de los módulos: elegí tipo, período y servicios, revisá indicadores, escribí conclusiones y descargá un PDF que queda guardado en Archivos y documentos. Generar un reporte no lo envía.</p>
        </div>
        {canEdit ? <button type="button" className={buttonClass("primary")} onClick={create} disabled={!activeServices.length}>Crear reporte</button> : null}
      </div>
      {!canEdit ? <p className={r.blocked}>Tu rol puede consultar los reportes y revisar su parte, pero solo el PM de la cuenta o el administrador crean y generan reportes.</p> : null}

      <section className={r.genPanel} aria-labelledby="report-drafts">
        <div className={r.genPanelHead}><div><h3 id="report-drafts">Borradores</h3><p>Reportes en preparación: continuá donde quedaste.</p></div></div>
        {drafts.length ? (
          <ul className={r.genList}>
            {drafts.map((item) => (
              <li key={item.id} className={r.genRow}>
                <div>
                  <strong>{reportTitle(item, serviceLabel)}</strong>
                  <small>{item.versions.length ? `Borrador de la versión ${item.versions.length + 1} · ` : ""}Paso {item.step} de {REPORT_STEPS.length}: {REPORT_STEPS[item.step - 1]} · {item.services.map(serviceLabel).join(", ")} · actualizado {formatDateTime(item.updatedAt)} por {item.updatedBy}</small>
                </div>
                <div className={r.genActions}>
                  <button type="button" className={buttonClass("primary", true)} onClick={() => go(item.id)} aria-label={`Continuar ${reportTitle(item, serviceLabel)}`}>Continuar</button>
                  {canEdit && !item.versions.length ? <button type="button" className={buttonClass("ghost", true)} onClick={() => { if (window.confirm("¿Borrar este borrador? No tiene versiones emitidas.")) save((current) => deleteDraft(current, item.id), "Borrador eliminado"); }}>Borrar</button> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : <p className={r.genEmpty}>No hay borradores. {canEdit ? "Creá un reporte para empezar." : ""}</p>}
      </section>

      <section className={r.genPanel} aria-labelledby="report-issued">
        <div className={r.genPanelHead}><div><h3 id="report-issued">Reportes generados</h3><p>Cada versión conserva el PDF y la instantánea de datos con la que se generó.</p></div></div>
        {issued.length ? (
          <ul className={r.genList}>
            {issued.map((item) => (
              <li key={item.id} className={r.genRow} aria-label={`Reporte ${reportTitle(item, serviceLabel)}`}>
                <div>
                  <strong>{reportTitle(item, serviceLabel)}</strong>
                  <small>{REPORT_TYPE_LABEL[item.type]} · {item.services.map(serviceLabel).join(", ")} · {item.versions.length} {item.versions.length === 1 ? "versión" : "versiones"}</small>
                </div>
                <div className={r.genActions}>
                  {canEdit && item.status === "Emitido" ? <button type="button" className={buttonClass("secondary", true)} onClick={() => { if (save((current) => startNewVersion(current, item.id, { actor, at: new Date().toISOString() }), `Borrador de la versión ${item.versions.length + 1}`)) go(item.id); }}>Nueva versión</button> : null}
                </div>
                <ul className={r.versions}>
                  {[...item.versions].reverse().map((version) => (
                    <li key={version.version}>
                      <span><strong>Versión {version.version}</strong> · {formatDateTime(version.generatedAt)} · {version.generatedBy} · {version.fileName} · {Math.max(1, Math.round(version.fileSize / 1024))} KB · {version.registered ? "En Archivos y documentos" : "Sin registrar en Archivos y documentos"}</span>
                      <span className={r.genActions}>
                        <DownloadButton client={client} report={item} version={version} />
                        <button type="button" className={buttonClass("ghost", true)} onClick={() => go(item.id, version.version)} aria-label={`Ver versión ${version.version} de ${reportTitle(item, serviceLabel)}`}>Ver versión</button>
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : <p className={r.genEmpty}>Todavía no se generó ningún reporte para {client.name}.</p>}
      </section>
      <p className={r.genNote}>Los reportes, sus versiones y los PDF se guardan en este navegador (sin sincronización multiusuario). El envío por mail no está conectado: el borrador del mail se copia y se envía desde tu correo.</p>
    </div>
  );
}

/* ───────── Descarga (del almacenamiento local o regenerado desde la instantánea) ───────── */
function DownloadButton({ client, report, version, label = "Descargar PDF" }: { client: OsClient; report: ReportRecord; version: ReportVersion; label?: string }) {
  const { notify } = useOsStore();
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try {
      const blob = await readReportPdf(client.slug, version.fileId).catch(() => null);
      if (blob) { downloadBlob(blob, version.fileName); return; }
      // El archivo no está en este navegador: se vuelve a dibujar desde la instantánea guardada (mismo contenido).
      const { renderReportPdf } = await import("./pdf");
      const bytes = await renderReportPdf(version.snapshot, await loadPdfAssets());
      downloadBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), version.fileName);
      notify("El PDF no estaba en este navegador: se regeneró desde la instantánea de la versión.", "default");
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo descargar el PDF.", "error");
    } finally { setBusy(false); }
  }
  return <button type="button" className={buttonClass("secondary", true)} onClick={download} disabled={busy} aria-label={`${label}: ${reportTitle(report, serviceLabel)} versión ${version.version}`}>{busy ? "Preparando…" : label}</button>;
}

/* ───────── Versión emitida (solo lectura) ───────── */
function VersionView({ client, report, version, save, go, canEdit }: { client: OsClient; report: ReportRecord; version: ReportVersion; save: Save; go: (id: string | null, version?: number) => void; canEdit: boolean }) {
  const { role, notify } = useOsStore();
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const actor = previewActor(role);
  const canSend = canSendReport(role, client);
  function prepareEmail() {
    const email = buildEmailDraft({ client, kind: report.type, period: version.snapshot.period.label, sender: actor, summary: version.snapshot.summary, fileName: version.fileName });
    setDraft(email);
    save((current) => recordReportEvent(current, report.id, { at: new Date().toISOString(), actor, text: `Preparó el borrador del mail de la versión ${version.version} (sin envío)` }), "Borrador de mail listo para copiar");
  }
  async function copy() {
    if (!draft) return;
    try { await navigator.clipboard.writeText(`Para: ${draft.to.join("; ")}\nAsunto: ${draft.subject}\n\n${draft.body}`); notify("Borrador copiado", "success"); }
    catch { notify("No se pudo copiar automáticamente: seleccioná el texto y copialo.", "error"); }
  }
  return (
    <div className={r.wizard}>
      <div className={r.wizardHead}>
        <div>
          <button type="button" className={buttonClass("ghost", true)} onClick={() => go(null)}>← Reportes</button>
          <h3>{reportTitle(report, serviceLabel)} · versión {version.version}</h3>
          <p>Emitida {formatDateTime(version.generatedAt)} por {version.generatedBy}. Esta versión no cambia aunque cambien los datos de los módulos. {version.registered ? "Registrada en Archivos y documentos." : "No quedó registrada en Archivos y documentos (tu rol no podía modificar el conocimiento del cliente)."}</p>
        </div>
        <div className={r.genActions}>
          <DownloadButton client={client} report={report} version={version} />
          {canSend ? <button type="button" className={buttonClass("secondary", true)} onClick={prepareEmail}>Preparar borrador de mail</button> : null}
          {canEdit && report.status === "Emitido" && version.version === report.versions.length ? <button type="button" className={buttonClass("ghost", true)} onClick={() => { if (save((current) => startNewVersion(current, report.id, { actor, at: new Date().toISOString() }), `Borrador de la versión ${report.versions.length + 1}`)) go(report.id); }}>Nueva versión</button> : null}
        </div>
      </div>
      {report.versions.length > 1 ? <div className={r.genActions} style={{ justifyContent: "flex-start" }} role="group" aria-label="Versiones">{report.versions.map((item) => <button key={item.version} type="button" className={buttonClass(item.version === version.version ? "primary" : "ghost", true)} aria-pressed={item.version === version.version} onClick={() => go(report.id, item.version)}>v{item.version}</button>)}</div> : null}
      {draft ? (
        <div className={r.emailDraft} role="region" aria-label="Borrador del mail al cliente">
          <p className={r.reviewNote}><strong>{EMAIL_NOT_CONNECTED}</strong></p>
          <dl>
            <div><dt>Para</dt><dd>{draft.to.length ? draft.to.join("; ") : "Sin contactos cargados en la ficha"}</dd></div>
            <div><dt>Asunto</dt><dd>{draft.subject}</dd></div>
            <div><dt>Adjunto</dt><dd>{version.fileName}</dd></div>
          </dl>
          <label className={s.srOnly} htmlFor="report-email-body">Cuerpo del mail</label>
          <textarea id="report-email-body" className={s.input} rows={10} readOnly value={draft.body} />
          <div className={r.partActions}><button type="button" className={buttonClass("secondary", true)} onClick={copy}>Copiar borrador</button><button type="button" className={buttonClass("ghost", true)} onClick={() => setDraft(null)}>Cerrar borrador</button></div>
        </div>
      ) : null}
      <ReportDocument snapshot={version.snapshot} mode="issued" />
      {report.history.length ? <details className={r.genPanel} style={{ padding: "10px 14px", fontSize: 13 }}><summary>Historial del reporte ({report.history.length})</summary><ul>{report.history.map((event, index) => <li key={`${event.at}-${index}`}>{formatDateTime(event.at)} · {event.actor} · {event.text}</li>)}</ul></details> : null}
    </div>
  );
}

/* ───────── Asistente de 9 pasos ───────── */
function ReportWizard({ client, report, activeServices, save, go, canEdit }: { client: OsClient; report: ReportRecord; activeServices: ServiceId[]; save: Save; go: (id: string | null, version?: number) => void; canEdit: boolean }) {
  const { role, notify } = useOsStore();
  const { mutate } = useKnowledge(client);
  const actor = previewActor(role);
  const [localStep, setLocalStep] = useState<number | null>(null);
  const step = canEdit ? report.step : localStep ?? report.step;
  const [narrative, setNarrative] = useState<ReportNarrative>(report.narrative ?? EMPTY_NARRATIVE);
  const dirty = JSON.stringify(narrative) !== JSON.stringify(report.narrative ?? EMPTY_NARRATIVE);
  useUnsavedChanges(`report-${report.id}`, canEdit && dirty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { input, hydrated } = useMetricsInput(client);
  const asOf = todayIso();
  const version = report.versions.length + 1;
  const reference = reviewReference(report);
  const review = useReportReview(client, report.type, reference, report.services);
  const canSend = canSendReport(role, client);
  const sections = useMemo(() => serviceSnapshots(report.services, input, { period: report.period, asOf, compare: true }), [asOf, input, report.period, report.services]);
  const preview = useMemo<ReportSnapshot>(() => buildReportSnapshot({ client, report: { ...report, narrative }, metrics: projectInput(input, report.services), asOf, generatedAt: new Date(`${asOf}T12:00:00Z`).toISOString(), generatedBy: actor, version, review: review.lines, inputDigest: "" }), [actor, asOf, client, input, narrative, report, review.lines, version]);

  function patch(update: DraftPatch, message?: string) {
    if (!canEdit) return false;
    setError("");
    try {
      return save((current) => updateDraft(current, report.id, update, { actor, at: new Date().toISOString() }, activeServices), message);
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Revisá los datos."); return false; }
  }
  function goTo(next: number) {
    const target = Math.max(1, Math.min(REPORT_STEPS.length, next));
    if (!canEdit) { setLocalStep(target); return; }
    patch(dirty ? { step: target, narrative } : { step: target });
  }
  function setType(type: ReportType) {
    const services = type === "servicio" ? [report.services[0] ?? activeServices[0]].filter(Boolean) : activeServices;
    patch({ type, services, period: defaultPeriod(type, asOf) });
  }

  async function generate() {
    if (!canSend || !review.progress.ready || busy) return;
    setBusy(true);
    setError("");
    const at = new Date().toISOString();
    const fileId = newId();
    try {
      if (dirty && !patch({ narrative })) throw new Error("No se pudo guardar el texto del reporte.");
      const metrics = projectInput(input, report.services);
      const inputDigest = await sha256Hex(JSON.stringify(metrics));
      const snapshot = buildReportSnapshot({ client, report: { ...report, narrative }, metrics, asOf: todayIso(), generatedAt: at, generatedBy: actor, version, review: review.lines, inputDigest });
      const { renderReportPdf } = await import("./pdf");
      const bytes = await renderReportPdf(snapshot, await loadPdfAssets());
      const fileName = reportFileName(client.slug, report, version);
      const sha256 = await sha256Hex(bytes);
      await storeReportPdf(client.slug, fileId, bytes, fileName);
      const sourceId = newId();
      const registered = mutate((k, ctx) => withReportSource(k, snapshot, { sourceId, reportId: report.id, fileId, fileName, fileSize: bytes.byteLength, sha256 }, ctx));
      const entry: ReportVersion = { version, generatedAt: at, generatedBy: actor, fileName, fileId, fileSize: bytes.byteLength, sha256, sourceId: registered ? sourceId : undefined, registered, snapshot, input: metrics };
      if (!save((current) => issueVersion(current, report.id, entry), `Versión ${version} generada${registered ? " y registrada en Archivos y documentos" : ""}`)) {
        await removeReportPdf(client.slug, fileId);
        throw new Error("No se pudo guardar la versión del reporte.");
      }
      downloadBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), fileName);
      go(report.id, version);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "No se pudo generar el PDF.");
      notify("No se pudo generar el reporte.", "error");
    } finally { setBusy(false); }
  }

  const title = reportTitle(report, serviceLabel);
  return (
    <div className={r.wizard}>
      <div className={r.wizardHead}>
        <div>
          <button type="button" className={buttonClass("ghost", true)} onClick={() => { if (!dirty || window.confirm("Hay texto sin guardar. ¿Salir igual?")) go(null); }}>← Reportes</button>
          <h3>{title}</h3>
          <p>{report.versions.length ? `Borrador de la versión ${version} · ` : "Borrador · "}{client.name} · {report.services.map(serviceLabel).join(", ")}{canEdit ? "" : " · solo lectura para tu rol"}</p>
        </div>
        {canEdit && dirty ? <button type="button" className={buttonClass("secondary", true)} onClick={() => patch({ narrative }, "Texto guardado")}>Guardar borrador</button> : null}
      </div>
      <nav aria-label="Pasos del reporte">
        <ol className={r.steps}>
          {REPORT_STEPS.map((label, index) => (
            <li key={label}><button type="button" aria-current={step === index + 1 ? "step" : undefined} onClick={() => goTo(index + 1)}><b>Paso {index + 1}</b><span>{label}</span></button></li>
          ))}
        </ol>
      </nav>
      {error ? <p className={r.blocked} role="alert">{error}</p> : null}
      <section className={r.stepBody} aria-labelledby="report-step-title">
        <h4 id="report-step-title">Paso {step} · {REPORT_STEPS[step - 1]}</h4>
        <fieldset disabled={!canEdit && step <= 6} style={{ border: 0, margin: 0, padding: 0, minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {step === 1 ? <TypeStep report={report} activeServices={activeServices} onType={setType} onService={(service) => patch({ services: [service] })} /> : null}
          {step === 2 ? <PeriodStep report={report} asOf={asOf} onPeriod={(period) => patch({ period })} onError={setError} /> : null}
          {step === 3 ? <ServicesStep report={report} activeServices={activeServices} onChange={(services) => patch({ services })} /> : null}
          {step === 4 ? <DataStep input={input} hydrated={hydrated} report={report} sections={sections} /> : null}
          {step === 5 ? <IndicatorsStep sections={sections} period={report.period} /> : null}
          {step === 6 ? <NarrativeStep sections={sections} narrative={narrative} onChange={setNarrative} onBlur={() => { if (dirty) patch({ narrative }); }} /> : null}
        </fieldset>
        {step === 7 ? <ReportReviewPanel client={client} kind={report.type} reference={reference} services={report.services} period={report.period.label} /> : null}
        {step === 8 ? <><p>Vista previa con los datos actuales de los módulos. Al generar, los datos se congelan en una instantánea guardada con la versión {version}.</p><ReportDocument snapshot={preview} mode="preview" /></> : null}
        {step === 9 ? (
          <div className={sc.stack}>
            <p>Se genera un PDF con identidad Avans, se descarga en este equipo y se registra en Archivos y documentos del cliente como archivo guardado y recuperable. Generar no envía el reporte.</p>
            <ul className={r.factList}>
              <li>Período: {report.period.label} · estados al {longDate(asOf)}</li>
              <li>Servicios: {report.services.map(serviceLabel).join(", ")}</li>
              <li>Revisión: {review.progress.reviewed}/{review.progress.total} partes revisadas</li>
              <li>Texto del equipo: {[narrative.conclusions, narrative.recommendations, narrative.nextSteps].filter((value) => value.trim()).length} de 3 apartados completos</li>
            </ul>
            {!canSend ? <p className={r.blocked}>Solo el PM de la cuenta (o el administrador) genera el reporte.</p> : !review.progress.ready ? <p className={r.blocked}>Faltan {review.progress.total - review.progress.reviewed} {review.progress.total - review.progress.reviewed === 1 ? "parte por revisar" : "partes por revisar"} en el paso «Revisión».</p> : null}
            <div className={r.genActions} style={{ justifyContent: "flex-start" }}>
              <button type="button" className={buttonClass("primary")} onClick={generate} disabled={!canSend || !review.progress.ready || busy || !hydrated}>{busy ? "Generando PDF…" : `Generar PDF de la versión ${version}`}</button>
            </div>
          </div>
        ) : null}
      </section>
      <div className={r.stepFoot}>
        <BackButton fallback={`/v2/clientes/${client.slug}?view=reportes`} label="Volver" className={buttonClass("ghost", true)} />
        <div>
          {step > 1 ? <button type="button" className={buttonClass("secondary", true)} onClick={() => goTo(step - 1)}>Anterior</button> : null}
          {step < REPORT_STEPS.length ? <button type="button" className={buttonClass("primary", true)} onClick={() => goTo(step + 1)}>Siguiente: {REPORT_STEPS[step]}</button> : null}
        </div>
      </div>
    </div>
  );
}

function TypeStep({ report, activeServices, onType, onService }: { report: ReportRecord; activeServices: ServiceId[]; onType: (type: ReportType) => void; onService: (service: ServiceId) => void }) {
  return (
    <>
      <p>Elegí qué reporte vas a armar. {report.versions.length ? "El tipo de un reporte ya emitido no cambia." : ""}</p>
      <div className={r.choices} role="radiogroup" aria-label="Tipo de reporte">
        {REPORT_TYPES.map((type) => (
          <label key={type.id} className={r.choice}>
            <input type="radio" name="report-type" checked={report.type === type.id} disabled={Boolean(report.versions.length)} onChange={() => onType(type.id)} />
            <span><strong>{type.label}</strong><small>{type.detail}</small></span>
          </label>
        ))}
      </div>
      {report.type === "servicio" ? (
        <label className={r.field} style={{ maxWidth: 360 }}><span>Servicio del reporte</span>
          <select className={s.input} value={report.services[0] ?? ""} onChange={(event) => onService(event.target.value as ServiceId)}>{activeServices.map((id) => <option key={id} value={id}>{serviceLabel(id)}</option>)}</select>
        </label>
      ) : null}
    </>
  );
}

function PeriodStep({ report, asOf, onPeriod, onError }: { report: ReportRecord; asOf: string; onPeriod: (period: MetricPeriod) => void; onError: (message: string) => void }) {
  const [kind, setKind] = useState<PeriodKind>(report.period.kind);
  const [start, setStart] = useState(report.period.start);
  const [end, setEnd] = useState(report.period.end);
  function apply(nextKind: PeriodKind, nextStart: string, nextEnd: string) {
    try {
      const period = nextKind === "mes" ? monthPeriod(nextStart.slice(0, 7)) : nextKind === "semana" ? weekPeriod(nextStart) : customPeriod(nextStart, nextEnd);
      onPeriod(period);
    } catch (problem) { onError(problem instanceof Error ? problem.message : "Período inválido."); }
  }
  return (
    <>
      <p>Las entregas, publicaciones y resultados se miden dentro del período. Los estados operativos (pendientes, bloqueos, aprobaciones) se leen al {longDate(asOf)}.</p>
      <div className={r.fields}>
        <label className={r.field}><span>Tipo de período</span>
          <select className={s.input} value={kind} onChange={(event) => { const next = event.target.value as PeriodKind; setKind(next); apply(next, start, end); }}>
            <option value="semana">Semana (lunes a domingo)</option>
            <option value="mes">Mes calendario</option>
            <option value="personalizado">Personalizado</option>
          </select>
        </label>
        {kind === "mes" ? (
          <label className={r.field}><span>Mes</span><input className={s.input} type="month" value={start.slice(0, 7)} onChange={(event) => { if (!event.target.value) return; setStart(`${event.target.value}-01`); apply("mes", `${event.target.value}-01`, end); }} /></label>
        ) : kind === "semana" ? (
          <label className={r.field}><span>Un día de la semana</span><input className={s.input} type="date" value={start} onChange={(event) => { if (!event.target.value) return; setStart(event.target.value); apply("semana", event.target.value, end); }} /></label>
        ) : (
          <>
            <label className={r.field}><span>Desde</span><input className={s.input} type="date" value={start} onChange={(event) => { setStart(event.target.value); apply("personalizado", event.target.value, end); }} /></label>
            <label className={r.field}><span>Hasta</span><input className={s.input} type="date" value={end} onChange={(event) => { setEnd(event.target.value); apply("personalizado", start, event.target.value); }} /></label>
          </>
        )}
      </div>
      <p className={r.periodNote} aria-live="polite">Período elegido: <strong>{report.period.label}</strong> ({longDate(report.period.start)} al {longDate(report.period.end)}). Comparación: {previousPeriod(report.period).label}, solo si hay datos comparables.</p>
    </>
  );
}

function ServicesStep({ report, activeServices, onChange }: { report: ReportRecord; activeServices: ServiceId[]; onChange: (services: ServiceId[]) => void }) {
  if (report.type === "servicio") return <p>Este reporte incluye un solo servicio: <strong>{serviceLabel(report.services[0])}</strong>. Cambialo en el paso «Tipo».</p>;
  return (
    <>
      <p>Elegí los servicios activos que entran en el reporte.</p>
      <div className={r.choices} role="group" aria-label="Servicios incluidos">
        {activeServices.map((id) => (
          <label key={id} className={r.choice}>
            <input type="checkbox" checked={report.services.includes(id)} onChange={(event) => onChange(event.target.checked ? activeServices.filter((service) => service === id || report.services.includes(service)) : report.services.filter((service) => service !== id))} />
            <span><strong>{serviceLabel(id)}</strong></span>
          </label>
        ))}
      </div>
    </>
  );
}

function DataStep({ input, hydrated, report, sections }: { input: MetricsInput; hydrated: boolean; report: ReportRecord; sections: ServiceSnapshot[] }) {
  return (
    <>
      <p>Estos son los datos que existen hoy en los módulos incluidos. El reporte no inventa resultados: lo que falta se muestra como «Sin datos», «Pendiente de configurar» o «No conectado».{hydrated ? "" : " Cargando datos guardados…"}</p>
      <ul className={r.gatherList} aria-label="Datos reunidos por servicio">
        {report.services.map((serviceId) => {
          const section = sections.find((item) => item.serviceId === serviceId);
          const tasks = input.tasks.filter((task) => task.serviceId === serviceId && task.status !== "Hecho");
          return (
            <li key={serviceId}>
              <strong>{serviceLabel(serviceId)}</strong>
              <ul className={r.gatherSources}>
                {METRIC_COLLECTIONS[serviceId].map((collection) => {
                  const records = recordsOf(input, serviceId, collection);
                  const label = serviceId === "audiovisuales" && collection === "jornadas" ? "Jornadas" : collectionDef(serviceId, collection)?.label ?? collection;
                  return <li key={collection}>{label}: <b>{records.length}</b> {records.length ? <OriginTag origin={originOfRecords(records)} /> : <span>({ORIGIN_LABEL.pendiente.toLocaleLowerCase("es")})</span>}</li>;
                })}
                <li>Tareas abiertas: <b>{tasks.length}</b></li>
                {serviceId === "publicidad-digital" ? <li>Plataformas de anuncios: <b>no conectadas</b> · métricas de demostración</li> : null}
                {serviceId === "contenidos" ? <li>Redes del cliente: <b>no conectadas</b> · alcance de demostración</li> : null}
                {serviceId === "audiovisuales" ? <li>Cupo de jornadas: <b>{input.quota && input.quota.contracted > 0 ? `${input.quota.contracted} · ${input.quota.period}` : "sin configurar"}</b></li> : null}
              </ul>
              {section ? <HealthChip health={section.health} /> : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function IndicatorsStep({ sections, period }: { sections: ServiceSnapshot[]; period: MetricPeriod }) {
  return (
    <>
      <p>Indicadores, gráficos y resultados de {period.label} con las mismas definiciones del Inicio del cliente. Los enlaces abren cada elemento en su módulo.</p>
      {sections.map((section) => (
        <div key={section.serviceId} className={sc.stack}>
          <ServiceBlock snapshot={section} />
          <div className={r.tableScroll}>
            <table className={r.dataTable} aria-label={`Resultados de ${section.label}`}>
              <thead><tr><th scope="col">Resultado de {period.label}</th><th scope="col">Valor</th><th scope="col">Origen</th><th scope="col">Comparación</th></tr></thead>
              <tbody>
                {section.results.map((metric) => {
                  const comparison = section.comparisons.find((item) => item.id === metric.id);
                  return <tr key={metric.id}><th scope="row">{metric.label}</th><td>{metric.display}</td><td>{metric.origin === "real" ? "Real" : ORIGIN_LABEL[metric.origin]}</td><td>{comparison ? `${comparison.previousDisplay} en el período anterior${comparison.delta === null ? "" : ` (${comparison.delta > 0 ? "+" : ""}${comparison.delta.toLocaleString("es-AR", { maximumFractionDigits: 1 })} %)`}` : "Sin datos comparables"}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}

function NarrativeStep({ sections, narrative, onChange, onBlur }: { sections: ServiceSnapshot[]; narrative: ReportNarrative; onChange: (value: ReportNarrative) => void; onBlur: () => void }) {
  return (
    <>
      <p>Escribí las conclusiones, recomendaciones y próximos pasos. Los indicadores no se editan acá: salen de los módulos.</p>
      <div className={r.aiPending}><button type="button" className={buttonClass("ghost", true)} disabled>Redactar con IA</button><span>Borradores con IA: pendientes de conexión. No hay un modelo conectado; el texto lo escribe el equipo.</span></div>
      <div>
        <strong style={{ fontSize: 13 }}>Resumen automático de los datos (sin IA)</strong>
        <ul className={r.factList}>{factualSummary(sections).map((line) => <li key={line}>{line}</li>)}</ul>
      </div>
      {([["conclusions", "Conclusiones"], ["recommendations", "Recomendaciones"], ["nextSteps", "Próximos pasos"]] as const).map(([key, label]) => (
        <label key={key} className={r.field}><span>{label}</span>
          <textarea className={s.input} rows={4} maxLength={4000} value={narrative[key]} onChange={(event) => onChange({ ...narrative, [key]: event.target.value })} onBlur={onBlur} />
        </label>
      ))}
    </>
  );
}

