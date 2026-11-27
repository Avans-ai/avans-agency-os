"use client";

/* Paso «Revisión» del generador: cada responsable (PM, LT, Content) revisa su parte del
 * borrador antes de generar. Las revisiones se guardan en `client:<slug>:report-reviews`
 * con una referencia por versión del reporte; los roles son visuales, no permisos de servidor. */
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
  AI_DRAFTS_PENDING, canReviewPart, EMPTY_REVIEWS, markPart, PART_ROLE_LABEL, partReview, readReviews, reportParts, reportReviewsKey, REVIEW_KIND_LABEL, reviewId, reviewProgress,
  type PartStatus, type ReportPart, type ReportReviewsState, type ReviewKind,
} from "./review-circuit";
import type { ReportReviewLine } from "./builders";

const STATUS_TONE: Record<PartStatus, "stone" | "cool" | "error"> = { Pendiente: "stone", Revisada: "cool", "Requiere ajustes": "error" };

/** Estado de la revisión de una versión (lo usa el paso «Generar» para habilitar el PDF). */
export function useReportReview(client: OsClient, kind: ReviewKind, reference: string, services: ServiceId[]) {
  const [stored] = useLocalStorageState<unknown>(reportReviewsKey(client.slug), EMPTY_REVIEWS);
  const record = readReviews(stored).reports[reviewId(kind, reference)];
  const parts = reportParts(client, services);
  const progress = reviewProgress(record, parts);
  const lines: ReportReviewLine[] = parts.map((part) => {
    const review = partReview(record, part.id);
    return { part: part.label, role: PART_ROLE_LABEL[part.role], owner: part.owner, status: review.status, by: review.by, at: review.at, comment: review.comment };
  });
  return { record, parts, progress, lines };
}

export function ReportReviewPanel({ client, kind, reference, services, period }: { client: OsClient; kind: ReviewKind; reference: string; services: ServiceId[]; period: string }) {
  const { role, notify, localHydrated } = useOsStore();
  const key = reportReviewsKey(client.slug);
  const { record, parts, progress } = useReportReview(client, kind, reference, services);
  const [comments, setComments] = useState<Record<string, string>>({});
  const actor = previewActor(role);

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
    if (save((current) => markPart(current, { kind, period: reference, part, status, comment, actor, at: new Date().toISOString() }), status === "Revisada" ? `Parte «${part.label}» revisada` : `Ajustes pedidos en «${part.label}»`)) setComments((value) => ({ ...value, [part.id]: "" }));
  }

  return (
    <section className={r.review} aria-labelledby={`review-${kind}`}>
      <div className={r.reviewHead}>
        <div>
          <h3 id={`review-${kind}`}>Circuito de revisión · {REVIEW_KIND_LABEL[kind]}</h3>
          <p>{period} · Cada responsable revisa su parte; con todo revisado, el PM genera el PDF.</p>
        </div>
        <div className={r.reviewProgress}>
          <span><strong>{progress.reviewed}/{progress.total}</strong> partes revisadas</span>
          <span className={r.progressTrack} role="progressbar" aria-label="Partes revisadas" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${progress.percent}%` }} /></span>
          <Badge tone={progress.ready ? "cool" : "peach"}>{progress.ready ? "Listo para generar" : "En revisión"}</Badge>
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
      <div className={r.reviewFoot}>
        <span>{AI_DRAFTS_PENDING} Revisiones guardadas en este navegador; los roles son visuales, no permisos de servidor.</span>
        {record?.history.length ? <details><summary>Historial de revisión ({record.history.length})</summary><ul>{record.history.map((event, index) => <li key={`${event.at}-${index}`}>{event.actor} · {formatDateTime(event.at)} · {event.text}</li>)}</ul></details> : null}
      </div>
    </section>
  );
}
