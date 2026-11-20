"use client";

/* Portal del cliente · anuncios para aprobar (etapa 5 del flujo del anuncio).
 * Aislado por cliente: solo lee los pedidos de Publicidad digital de esta cuenta. Vista previa
 * local, sin autenticación: la decisión se registra como «Cliente · <cuenta>». */
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { buttonClass } from "../ui";
import { formatDate } from "./module-ui";
import { adState, paidComments, PAID_SERVICE } from "./paid-model";
import { usePaidData, usePaidOperations } from "./use-paid-operations";
import type { ModuleRecord } from "./types";
import p from "./paid.module.css";

function PortalAd({ client, ad, campaignName, initiallyOpen }: { client: OsClient; ad: ModuleRecord; campaignName: string; initiallyOpen: boolean }) {
  const ops = usePaidOperations(client);
  const [open, setOpen] = useState(initiallyOpen);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const shared = paidComments(ad.values.comentarios).filter((item) => item.actor.startsWith("Cliente ·"));
  function decide(action: "client-approve" | "client-changes") {
    if (action === "client-changes" && !note.trim()) { setError("Contanos qué cambios necesitás."); return; }
    setError("");
    ops.adAction(ad, action, { comment: note, asClient: true });
  }
  return <article className={p.portalCard} aria-label={`Anuncio para aprobar: ${ad.values.nombre}`}>
    <span className={p.small}>{campaignName} · {ad.values.canal || "Canal a definir"}{ad.source === "demo" ? " · Demo" : ""}</span>
    <h3>{ad.values.nombre}</h3>
    {ad.values.copy ? <p className={p.muted}>{ad.values.copy}</p> : null}
    {ad.values.enlacePieza ? <a href={ad.values.enlacePieza} target="_blank" rel="noreferrer" style={{ color: "var(--av-link)", fontSize: 14 }}>Ver las piezas diseñadas</a> : null}
    <span className={p.small}>Se necesita en circulación el {formatDate(ad.values.fechaNecesaria)} · versión {ad.values.version || "1"}</span>
    {!open ? <div className={p.actions}><button type="button" className={buttonClass("primary", true)} onClick={() => setOpen(true)}>Revisar anuncio</button></div> : <div className={p.stack} style={{ gap: 8 }}>
      {ad.values.propuestaContent ? <p className={p.brief}>{ad.values.propuestaContent}</p> : null}
      {shared.length ? <ul className={p.comments}>{shared.map((item) => <li key={item.id}><div><strong>{item.actor}</strong><span>Versión {item.version || 1}</span></div><p>{item.text}</p></li>)}</ul> : null}
      <label className={p.field}><span>Comentario para el equipo</span><textarea rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      {error ? <p className={p.errors} style={{ paddingLeft: 12 }} role="alert">{error}</p> : null}
      <div className={p.actions}><button type="button" className={buttonClass("primary", true)} onClick={() => decide("client-approve")}>Aprobar anuncio</button><button type="button" className={buttonClass("secondary", true)} onClick={() => decide("client-changes")}>Pedir cambios</button></div>
    </div>}
  </article>;
}

export function PortalAdsSection({ client }: { client: OsClient }) {
  const { servicesOf, localHydrated } = useOsStore();
  const params = useSearchParams();
  const { data, hydrated } = usePaidData(client);
  if (!localHydrated || !hydrated || !servicesOf(client.slug).includes(PAID_SERVICE)) return null;
  const pending = (data.anuncios ?? []).filter((ad) => adState(ad) === "Aprobación del cliente");
  const circulating = (data.anuncios ?? []).filter((ad) => adState(ad) === "En circulación" && ad.values.tipo === "Anuncio");
  const campaignName = (ad: ModuleRecord) => (data.campanas ?? []).find((campaign) => campaign.id === ad.values.campana)?.values.nombre || "Campaña";
  const requested = params.get("anuncio");
  return <section className={p.portalAds} aria-label="Anuncios para aprobar">
    <h2>Anuncios para aprobar <span className={p.chip} data-tone="accent">{pending.length}</span></h2>
    <p className={p.muted}>Piezas de tus campañas de publicidad digital, ya validadas por el equipo. Vista previa local: sin acceso autenticado.</p>
    {pending.length ? <div className={p.cards}>{pending.map((ad) => <PortalAd key={`${ad.id}-${ad.updatedAt}`} client={client} ad={ad} campaignName={campaignName(ad)} initiallyOpen={requested === ad.id} />)}</div> : <p className={p.small}>No tenés anuncios pendientes de aprobación.</p>}
    {circulating.length ? <p className={p.small}>En circulación: {circulating.map((ad) => ad.values.nombre).join(" · ")}</p> : null}
  </section>;
}
