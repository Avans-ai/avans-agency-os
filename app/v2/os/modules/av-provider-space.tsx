"use client";

/* Espacio del proveedor externo · solo las jornadas asignadas a su estudio.
 * No muestra comentarios internos, datos de otras jornadas ni de otras cuentas: cada tarjeta
 * se arma con `providerProjection`. Son permisos visuales de vista previa (rol «Proveedor
 * externo» + proveedor elegido del catálogo), no seguridad de servidor. */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AvansWordmark } from "../brand";
import { osClients, type OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { OSToastViewport } from "../overlays";
import { useProviderCatalog, useProviderIdentity } from "../providers-store";
import { ProviderAvatar } from "../providers-ui";
import { buttonClass, OSSkeletonRows } from "../ui";
import { EDITION_DAYS, daysUntil, editableFields, JORNADA_STAGES, jornadaActions, jornadaKey, providerProjection, ACTION_LABELS, type ProviderJornada } from "./av-model";
import { useJornadaOperations } from "./av-operations";
import { DriveLink, StageFields, TypeTag } from "./av-jornadas";
import { formatDate, formatDateTime } from "./module-ui";
import { readLocalValue, seedRecords, useLocalKeys } from "./store";
import type { ModuleRecord } from "./types";
import a from "./av-jornadas.module.css";

function ProviderJornadaCard({ client, record, view, providerId, providerName, current, now }: { client: OsClient; record: ModuleRecord; view: ProviderJornada; providerId: string; providerName: string; current: boolean; now: string }) {
  const ops = useJornadaOperations(client);
  const { providers } = useProviderCatalog();
  const ctx = { role: "provider" as const, actor: providerName, client, providerId };
  const actions = jornadaActions(record, ctx);
  const fields = editableFields(record, ctx);
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((key) => [key, record.values[key] || ""])));
  const [comment, setComment] = useState("");
  const options = { role: "provider" as const, actor: providerName, providerId };
  const deadline = view.values.fechaLimiteEdicion;
  const days = deadline ? daysUntil(deadline, now) : null;
  const stage = JORNADA_STAGES.find((entry) => entry.step === view.step);
  const v = view.values;
  function send(event: FormEvent) {
    event.preventDefault();
    if (ops.comment(record, comment, "provider", options)) setComment("");
  }
  return (
    <li id={`jornada-${view.id}`} className={a.jcard} data-pending={actions.length > 0} data-current={current || undefined} aria-label={v.titulo}>
      <span className={a.between}><TypeTag tipo={v.tipo} /><span className={a.note}>Cliente: {client.name}{record.source === "demo" ? " · Demo" : ""}</span></span>
      <h3>{v.titulo}</h3>
      <span className={a.progress} aria-hidden="true">{JORNADA_STAGES.map((entry) => <i key={entry.step} data-done={entry.step < view.step || view.state === "Cerrada"} data-current={entry.step === view.step && view.state !== "Cerrada"} />)}</span>
      <p className={a.muted}><strong>{view.state === "Cancelada" ? "Cancelada" : view.state === "Cerrada" ? "Cerrada" : `Etapa ${view.step} · ${stage?.label}`}</strong> · {formatDate(v.fecha)}{v.horario ? ` · ${v.horario}` : ""}{v.locacion ? ` · ${v.locacion}` : ""}</p>
      {deadline && view.state === "Edición" ? <p className={a.callout} data-tone={days !== null && days < 0 ? "error" : undefined}>Plazo de edición: {EDITION_DAYS} días · {days === null ? formatDate(deadline) : days < 0 ? `vencido hace ${-days} ${-days === 1 ? "día" : "días"}` : days === 0 ? "vence hoy" : `vence el ${formatDate(deadline)}`}</p> : null}
      <p className={a.note}><DriveLink url={v.drive} /></p>
      {v.brief ? <p className={a.muted}><strong>Brief:</strong> {v.brief}</p> : view.step < 4 ? <p className={a.note}>El brief y el guion te llegan cuando el equipo los envía (etapa 3).</p> : null}
      {v.guion ? <p className={a.muted}><strong>Guion:</strong> {v.guion}</p> : null}
      {v.planRodaje && !fields.includes("planRodaje") ? <p className={a.muted}><strong>Plan de rodaje:</strong> {v.planRodaje}</p> : null}
      {v.materialSubidoAt ? <p className={a.note}>Material crudo marcado {formatDateTime(v.materialSubidoAt)}</p> : null}
      {v.edicionSubidaAt ? <p className={a.note}>Edición {v.edicionVersion} marcada {formatDateTime(v.edicionSubidaAt)}</p> : null}
      <StageFields fields={fields} values={draft} providers={providers} onChange={(key, value) => setDraft({ ...draft, [key]: value })} />
      {actions.length || fields.length ? (
        <div className={a.actions}>
          {actions.map((action) => <button key={action} type="button" className={buttonClass("primary", true)} onClick={() => ops.transition(record, action, { ...options, patch: draft })}>{ACTION_LABELS[action]}<span className={a.srOnly}> · {v.titulo}</span></button>)}
          {fields.length ? <button type="button" className={buttonClass("secondary", true)} disabled={!fields.some((key) => (draft[key] || "") !== (record.values[key] || ""))} onClick={() => ops.saveFields(record, draft, providers, options)}>Guardar borrador</button> : null}
        </div>
      ) : null}
      {view.comments.length ? <ul className={a.comments} aria-label="Comentarios con el equipo">{view.comments.map((item) => <li key={item.id}><small>{item.actor} · {formatDateTime(item.at)}</small><p>{item.text}</p></li>)}</ul> : null}
      {view.state !== "Cerrada" && view.state !== "Cancelada" ? (
        <details className={a.more}>
          <summary>Escribir al equipo</summary>
          <form className={a.commentForm} onSubmit={send}>
            <label className={a.field}><span>Mensaje al equipo</span><textarea rows={2} value={comment} onChange={(event) => setComment(event.target.value)} /></label>
            <button type="submit" className={buttonClass("secondary", true)}>Enviar mensaje</button>
          </form>
        </details>
      ) : null}
    </li>
  );
}

export function ProviderSpace() {
  const store = useOsStore();
  const { providers, hydrated } = useProviderCatalog();
  const [identity, setIdentity] = useProviderIdentity();
  const focus = useSearchParams().get("jornada");
  const [now] = useState(() => new Date().toISOString());
  const clients = osClients.filter((client) => store.servicesOf(client.slug).includes("audiovisuales"));
  const { raws, hydrated: keysHydrated } = useLocalKeys(clients.map((client) => jornadaKey(client.slug)));
  const provider = providers.find((item) => item.id === identity) ?? providers[0];
  const allowed = store.role === "provider" || store.role === "admin";
  const assigned = provider ? clients.flatMap((client, index) => (readLocalValue<ModuleRecord[] | null>(raws[index] ?? "", null) ?? seedRecords(client.slug, "audiovisuales", "jornadas"))
    .filter((record) => record.client === client.slug && record.values.proveedorId === provider.id)
    .map((record) => ({ client, record, view: providerProjection(record, provider.id)! }))) : [];
  const groups = [
    { id: "now", title: "Para hacer ahora", hint: "Rodaje y edición: marcá acá cuando el material esté en Drive.", list: assigned.filter((entry) => entry.view.state === "Rodaje" || entry.view.state === "Edición") },
    { id: "next", title: "Próximas jornadas", hint: "Validación, agenda y brief a cargo del equipo de Avans.", list: assigned.filter((entry) => entry.view.step >= 1 && entry.view.step <= 3) },
    { id: "done", title: "Entregadas", hint: "Edición entregada: el equipo valida, suma subtítulos y el cliente aprueba.", list: assigned.filter((entry) => entry.view.step === 6 || entry.view.state === "Cancelada") },
  ];
  const notices = provider ? store.notifications.filter((item) => item.recipient === provider.nombre) : [];
  const ready = hydrated && keysHydrated && store.localHydrated;
  useEffect(() => {
    if (ready && focus) document.getElementById(`jornada-${focus}`)?.scrollIntoView({ block: "center" });
  }, [focus, ready]);
  return (
    <div className={a.space}>
      <header className={a.spaceHeader}>
        <AvansWordmark width={104} />
        <div><span>Espacio del proveedor · Audiovisuales</span><strong>{provider ? provider.nombre : "Proveedor"}</strong></div>
        {allowed && providers.length ? (
          <label className={a.field} style={{ minWidth: 200 }}><span>Ver como (vista previa)</span>
            <select value={provider?.id ?? ""} onChange={(event) => setIdentity(event.target.value)}>{providers.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>
          </label>
        ) : null}
        {store.identity ? null : <button type="button" className={buttonClass("secondary", true)} onClick={() => store.setRole(store.role === "provider" ? "admin" : "provider")}>{store.role === "provider" ? "Volver a la vista del equipo" : "Ver como proveedor externo"}</button>}
      </header>
      <p className={a.spaceNotice}>Vista previa local · permisos visuales del rol «Proveedor externo», no seguridad de servidor. Todavía no hay acceso autenticado para proveedores. Google Drive no está conectado: el material se sube a la carpeta y se marca acá.</p>
      <main className={a.spaceMain}>
        {!ready ? <OSSkeletonRows rows={4} label="Cargando tus jornadas…" /> : !allowed ? (
          <section className={a.work}><h2 style={{ margin: 0 }}>Este espacio es para proveedores externos</h2><p className={a.muted}>Cambiá al rol «Proveedor externo» para previsualizar qué ve un proveedor: solo sus jornadas, sin comentarios internos ni datos de otras cuentas.</p><div className={a.actions}>{store.identity ? null : <button type="button" className={buttonClass("primary", true)} onClick={() => store.setRole("provider")}>Ver como proveedor externo</button>}<Link className={buttonClass("ghost")} href="/v2">Volver a Inicio</Link></div></section>
        ) : !provider ? <p className={a.muted}>El catálogo no tiene proveedores cargados.</p> : (
          <>
            <section aria-label="Tu estudio" className={a.row}>
              <ProviderAvatar name={provider.nombre} foto={provider.foto} size={48} />
              <div><strong>{provider.nombre}</strong><p className={a.note}>{assigned.length} {assigned.length === 1 ? "jornada asignada" : "jornadas asignadas"}{store.role === "admin" ? " · estás previsualizando como Administrador" : ""}</p></div>
            </section>
            {notices.length ? (
              <section aria-labelledby="provider-notices">
                <h2 id="provider-notices">Avisos <span className={a.count}>{notices.filter((item) => !item.readAt).length}</span></h2>
                <ul className={a.notices}>{notices.slice(0, 6).map((item) => <li key={item.id}><Link href={item.href.startsWith("/v2/proveedor") ? item.href : "/v2/proveedor"} data-read={Boolean(item.readAt)} onClick={() => store.markNotificationRead(item.id)}><span>{item.title}</span><small>{formatDateTime(item.at)}</small></Link></li>)}</ul>
              </section>
            ) : null}
            {groups.map((group) => (
              <section key={group.id} aria-labelledby={`provider-${group.id}`}>
                <h2 id={`provider-${group.id}`}>{group.title} <span className={a.count}>{group.list.length}</span></h2>
                <p className={a.note} style={{ marginBottom: 10 }}>{group.hint}</p>
                {group.list.length ? <ul className={a.jgrid}>{group.list.map(({ client, record, view }) => <ProviderJornadaCard key={`${record.id}-${record.updatedAt}`} client={client} record={record} view={view} providerId={provider.id} providerName={provider.nombre} current={view.id === focus} now={now} />)}</ul> : <p className={a.muted}>Sin jornadas en este grupo.</p>}
              </section>
            ))}
          </>
        )}
      </main>
      <OSToastViewport />
    </div>
  );
}
