"use client";

/* Panel del circuito de revisión de un reporte: partes por responsable, estado y comentarios,
 * exportación (archivo HTML descargable) y borrador del mail al cliente (sin envío real). */
import { useState } from "react";
import type { OsClient, ServiceId } from "../os-data";
import { useOsStore } from "../os-store";
import { readLocalJson, useLocalStorageState, writeLocalJson } from "../local-persistence";
import { previewActor } from "../preview-roles";
import { Avatar, Badge, buttonClass } from "../ui";
import { formatDateTime } from "../modules/module-ui";
import s from "../os.module.css";
import r from "./reports.module.css";
import {
  AI_DRAFTS_PENDING, buildEmailDraft, buildReportHtml, canReviewPart, canSendReport, EMAIL_NOT_CONNECTED, EMPTY_REVIEWS, exportFileName, markPart, PART_ROLE_LABEL, partReview,
  readReviews, recordEvent, reportParts, reportReviewsKey, REVIEW_KIND_LABEL, reviewId, reviewProgress, type EmailDraft, type PartStatus, type ReportPart, type ReportReviewsState, type ReviewKind,
} from "./review-circuit";

type ReviewableReport = { title: string; period: string; owner: string; summary: string[]; kpis: { label: string; value: string }[]; conclusion: string };
const STATUS_TONE: Record<PartStatus, "stone" | "cool" | "error"> = { Pendiente: "stone", Revisada: "cool", "Requiere ajustes": "error" };

export function ReportReviewPanel({ client, kind, report, activeServices }: { client: OsClient; kind: ReviewKind; report: ReviewableReport; activeServices: ServiceId[] }) {
  const { role, notify, localHydrated } = useOsStore();
  const key = reportReviewsKey(client.slug);
  const [stored] = useLocalStorageState<unknown>(key, EMPTY_REVIEWS);
  const state = readReviews(stored);
  const record = state.reports[reviewId(kind, report.period)];
  const parts = reportParts(client, activeServices);
  const progress = reviewProgress(record, parts);
  const canSend = canSendReport(role, client);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const actor = previewActor(role);
  const fileName = exportFileName(client.slug, kind, report.period);

  function save(update: (current: ReportReviewsState) => ReportReviewsState, message: string) {
    try {
      const next = update(readReviews(readLocalJson<unknown>(key, EMPTY_REVIEWS)));
      if (!writeLocalJson(key, next)) throw new Error("No se pudo guardar en este navegador.");
      notify(`${message} · guardado en este navegador`, "success");
      return true;
    } catch (error) { notify(error instanceof Error ? error.message : "No se pudo guardar la revisión.", "error"); return false; }
  }
  function mark(part: ReportPart, status: PartStatus) {
    if (!localHydrated || !canReviewPart(role, client, part)) return;
    const comment = comments[part.id] ?? "";
    if (save((current) => markPart(current, { kind, period: report.period, part, status, comment, actor, at: new Date().toISOString() }), status === "Revisada" ? `Parte «${part.label}» revisada` : `Ajustes pedidos en «${part.label}»`)) setComments((value) => ({ ...value, [part.id]: "" }));
  }
  function exportReport() {
    if (!progress.ready || !canSend) return;
    const at = new Date().toISOString();
    const html = buildReportHtml({ clientName: client.name, kind, title: report.title, period: report.period, owner: report.owner, summary: report.summary, kpis: report.kpis, conclusion: report.conclusion, parts: parts.map((part) => ({ part, review: partReview(record, part.id) })), generatedAt: at, generatedBy: actor });
    try {
      const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url; link.download = fileName; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { notify("El navegador no permitió descargar el archivo.", "error"); return; }
    save((current) => recordEvent(current, kind, report.period, { at, actor, text: `Exportó el reporte (${fileName})` }, { exportedAt: at, exportedBy: actor, exportName: fileName }), "Reporte exportado");
  }
  function prepareEmail() {
    if (!progress.ready || !canSend) return;
    const at = new Date().toISOString();
    setDraft(buildEmailDraft({ client, kind, period: report.period, sender: actor, summary: report.summary, fileName }));
    save((current) => recordEvent(current, kind, report.period, { at, actor, text: "Preparó el borrador del mail al cliente (sin envío)" }, { emailPreparedAt: at, emailPreparedBy: actor }), "Borrador de mail listo para copiar");
  }
  async function copyDraft() {
    if (!draft) return;
    try { await navigator.clipboard.writeText(`Para: ${draft.to.join("; ")}\nAsunto: ${draft.subject}\n\n${draft.body}`); notify("Borrador copiado", "success"); }
    catch { notify("No se pudo copiar automáticamente: seleccioná el texto y copialo.", "error"); }
  }

  const blockedReason = !canSend ? "Solo el PM de la cuenta (o el administrador) exporta y envía el reporte." : !progress.ready ? `Faltan ${progress.total - progress.reviewed} ${progress.total - progress.reviewed === 1 ? "parte por revisar" : "partes por revisar"}.` : undefined;
  return (
    <section className={r.review} aria-labelledby={`review-${kind}`}>
      <div className={r.reviewHead}>
        <div>
          <h3 id={`review-${kind}`}>Circuito de revisión · {REVIEW_KIND_LABEL[kind]}</h3>
          <p>{report.period} · Cada responsable revisa su parte; con todo revisado, el PM exporta y prepara el mail al cliente.</p>
        </div>
        <div className={r.reviewProgress}>
          <span><strong>{progress.reviewed}/{progress.total}</strong> partes revisadas</span>
          <span className={r.progressTrack} role="progressbar" aria-label="Partes revisadas" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${progress.percent}%` }} /></span>
          <Badge tone={progress.ready ? "cool" : "peach"}>{progress.ready ? "Listo para exportar" : "En revisión"}</Badge>
        </div>
      </div>
      <div className={r.parts}>
        {parts.map((part) => {
          const review = partReview(record, part.id);
          const allowed = canReviewPart(role, client, part) && localHydrated;
          return (
            <article key={part.id} className={r.part} data-status={review.status} aria-label={`Parte ${part.label}`}>
              <div className={r.partHead}>
                <span className={r.roleChip}>{PART_ROLE_LABEL[part.role]}</span>
                <Badge tone={STATUS_TONE[review.status]}>{review.status}</Badge>
              </div>
              <strong className={r.partTitle}>{part.label}</strong>
              <small className={r.partDetail}>{part.detail}</small>
              <span className={r.partOwner}><Avatar name={part.owner} />{part.owner}</span>
              {review.by ? <small className={r.partDetail}>{review.status} por {review.by} · {formatDateTime(review.at)}</small> : null}
              {review.comment ? <p className={r.partComment}>«{review.comment}»</p> : null}
              {allowed ? (
                <div className={r.partForm}>
                  <label className={s.srOnly} htmlFor={`review-${kind}-${part.id}`}>Comentario sobre {part.label}</label>
                  <textarea id={`review-${kind}-${part.id}`} className={s.input} rows={2} maxLength={600} placeholder="Comentario (opcional para revisar, obligatorio para pedir ajustes)" value={comments[part.id] ?? ""} onChange={(event) => setComments((value) => ({ ...value, [part.id]: event.target.value }))} />
                  <div className={r.partActions}>
                    <button type="button" className={buttonClass("primary", true)} onClick={() => mark(part, "Revisada")} aria-label={`Marcar revisada: ${part.label}`}>Marcar revisada</button>
                    <button type="button" className={buttonClass("ghost", true)} onClick={() => mark(part, "Requiere ajustes")} aria-label={`Pedir ajustes: ${part.label}`}>Pedir ajustes</button>
                  </div>
                </div>
              ) : <small className={r.partDetail}>La revisa {part.owner} ({PART_ROLE_LABEL[part.role]}).</small>}
            </article>
          );
        })}
      </div>
      <div className={r.reviewActions}>
        <button type="button" className={buttonClass("primary", true)} onClick={exportReport} disabled={Boolean(blockedReason)} title={blockedReason}>Exportar</button>
        <button type="button" className={buttonClass("secondary", true)} onClick={prepareEmail} disabled={Boolean(blockedReason)} title={blockedReason}>Preparar envío por mail</button>
        <span className={r.reviewNote}>{blockedReason ?? (record?.exportedAt ? `Exportado por ${record.exportedBy} · ${formatDateTime(record.exportedAt)}` : "Listo: exportá el archivo y prepará el mail.")}</span>
      </div>
      {draft ? (
        <div className={r.emailDraft} role="region" aria-label="Borrador del mail al cliente">
          <p className={r.reviewNote}><strong>{EMAIL_NOT_CONNECTED}</strong></p>
          <dl>
            <div><dt>Para</dt><dd>{draft.to.length ? draft.to.join("; ") : "Sin contactos cargados en la ficha"}</dd></div>
            <div><dt>Asunto</dt><dd>{draft.subject}</dd></div>
            <div><dt>Adjunto</dt><dd>{fileName}</dd></div>
          </dl>
          <label className={s.srOnly} htmlFor={`email-${kind}`}>Cuerpo del mail</label>
          <textarea id={`email-${kind}`} className={s.input} rows={10} readOnly value={draft.body} />
          <div className={r.partActions}><button type="button" className={buttonClass("secondary", true)} onClick={copyDraft}>Copiar borrador</button><button type="button" className={buttonClass("ghost", true)} onClick={() => setDraft(null)}>Cerrar borrador</button></div>
        </div>
      ) : null}
      <div className={r.reviewFoot}>
        <span>{AI_DRAFTS_PENDING} Revisiones guardadas en este navegador; los roles son visuales, no permisos de servidor.</span>
        {record?.history.length ? <details><summary>Historial de revisión ({record.history.length})</summary><ul>{record.history.map((event, index) => <li key={`${event.at}-${index}`}>{event.actor} · {formatDateTime(event.at)} · {event.text}</li>)}</ul></details> : null}
      </div>
    </section>
  );
}
