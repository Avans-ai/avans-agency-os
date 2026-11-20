"use client";

/* Portal del cliente · Jornadas audiovisuales. Solo jornadas de ESTA cuenta, sin comentarios
 * internos ni del proveedor. El cliente aprueba o pide cambios en la etapa de cierre.
 * Vista previa local: sin acceso autenticado ni sincronización entre usuarios. */
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { buttonClass } from "../ui";
import { clientProjection, JORNADA_STAGES } from "./av-model";
import { AV_DEMO_LABEL } from "./av-demo";
import { useJornadaData, useJornadaOperations } from "./av-operations";
import { formatDate, formatDateTime } from "./module-ui";
import type { ModuleRecord } from "./types";
import a from "./av-jornadas.module.css";

type Item = NonNullable<ReturnType<typeof clientProjection>>;

function Progress({ step }: { step: number }) {
  return <span className={a.progress} aria-hidden="true">{JORNADA_STAGES.map((stage) => <i key={stage.step} data-done={stage.step < step} data-current={stage.step === step} />)}</span>;
}

function PortalJornada({ client, record, item, current }: { client: OsClient; record: ModuleRecord; item: Item; current: boolean }) {
  const ops = useJornadaOperations(client);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const actor = `Cliente · ${client.name}`;
  function act(action: "client-approve" | "client-changes") {
    setBusy(true);
    ops.transition(record, action, { role: "client", actor, comment: text });
    setBusy(false);
  }
  const stage = JORNADA_STAGES.find((entry) => entry.step === item.step);
  return (
    <li id={`jornada-${item.id}`} className={a.jcard} data-pending={item.pending} data-current={current || undefined} aria-label={item.titulo}>
      <span className={a.between}><span className={a.type} data-type={item.tipo}>{item.tipo}</span>{item.demo ? <span className={a.demoTag}>Demo</span> : null}</span>
      <h3>{item.titulo}</h3>
      <Progress step={item.state === "Cerrada" ? 7 : item.step} />
      <p className={a.muted}>{item.state === "Cerrada" ? `Aprobada ${formatDateTime(item.approvedAt)}` : item.pending ? "La pieza final está lista para tu aprobación." : `Etapa ${item.step} de 6 · ${stage?.label ?? item.state}`} · Jornada del {formatDate(item.fecha)}</p>
      {item.finalUrl ? <a className={a.textLink} href={item.finalUrl} target="_blank" rel="noreferrer">Ver la pieza final con subtítulos y motion</a> : null}
      {item.comments.length ? <ul className={a.comments} aria-label="Conversación">{item.comments.map((comment) => <li key={comment.id}><small>{comment.actor} · {formatDateTime(comment.at)}</small><p>{comment.text}</p></li>)}</ul> : null}
      {item.pending ? (
        <>
          <label className={a.field}><span>Comentario (obligatorio para pedir cambios)</span><textarea rows={2} value={text} onChange={(event) => setText(event.target.value)} /></label>
          <div className={a.actions}>
            <button type="button" className={buttonClass("primary", true)} disabled={busy} onClick={() => act("client-approve")}>Aprobar jornada<span className={a.srOnly}> {item.titulo}</span></button>
            <button type="button" className={buttonClass("secondary", true)} disabled={busy} onClick={() => act("client-changes")}>Pedir cambios<span className={a.srOnly}> en {item.titulo}</span></button>
          </div>
        </>
      ) : null}
    </li>
  );
}

export function AvPortalSection({ client }: { client: OsClient }) {
  const { servicesOf, localHydrated } = useOsStore();
  const { jornadas, hydrated } = useJornadaData(client);
  const focus = useSearchParams().get("jornada");
  const items = jornadas.map((record) => ({ record, item: clientProjection(record) })).filter((entry): entry is { record: ModuleRecord; item: Item } => entry.item !== null)
    .sort((x, y) => Number(y.item.pending) - Number(x.item.pending) || (y.item.fecha || "").localeCompare(x.item.fecha || ""));
  const pending = items.filter((entry) => entry.item.pending).length;
  const ready = localHydrated && hydrated && servicesOf(client.slug).includes("audiovisuales");
  useEffect(() => {
    if (ready && focus) document.getElementById(`jornada-${focus}`)?.scrollIntoView({ block: "center" });
  }, [focus, ready]);
  if (!ready || !items.length) return null;
  return (
    <section className={a.portalSection} aria-labelledby="portal-jornadas">
      <header>
        <span className={a.eyebrow}>Audiovisuales</span>
        <h2 id="portal-jornadas">{pending ? `${pending} ${pending === 1 ? "jornada espera" : "jornadas esperan"} tu aprobación` : "Tus jornadas audiovisuales"}</h2>
        <p>Seguí cada jornada y aprobá la pieza final cuando esté lista.{items.some((entry) => entry.item.demo) ? ` ${AV_DEMO_LABEL}: jornadas ficticias para mostrar el proceso.` : ""}</p>
      </header>
      <ul className={a.jgrid} aria-label="Jornadas audiovisuales">
        {items.map(({ record, item }) => <PortalJornada key={`${record.id}-${record.updatedAt}`} client={client} record={record} item={item} current={item.id === focus} />)}
      </ul>
    </section>
  );
}
