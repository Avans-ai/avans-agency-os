"use client";

/* Client artwork URLs can point to any client-owned host; loading them directly avoids a server image proxy. */
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AvansWordmark } from "../brand";
import { getProfileFile, putProfileFile, removeProfileFile } from "../knowledge/profile-files";
import { useLocalStorageState } from "../local-persistence";
import { getContentActions, type ContentAction } from "../modules/content-workflow";
import { useContentOperations } from "../modules/use-content-operations";
import { useModuleRecords } from "../modules/store";
import type { ModuleRecord } from "../modules/types";
import type { OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { OSSidePanel, OSToastViewport } from "../overlays";
import { buttonClass } from "../ui";
import { portalCalendarDays, portalDate, portalNoticeKey, portalSharedValues, projectPortalContent, type PortalContent } from "./portal-model";
import s from "./portal.module.css";

const collections = ["piezas", "ejes"];
const channels = ["Instagram", "Facebook", "LinkedIn", "TikTok", "YouTube", "Newsletter", "Blog"];
const weekday = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }

function PortalCalendar({ items, onOpen }: { items: PortalContent[]; onOpen: (id: string) => void }) {
  const [anchor, setAnchor] = useState(() => dateKey(new Date()));
  const [mode, setMode] = useState<"month" | "week" | "day">("month");
  const [channel, setChannel] = useState("");
  const days = portalCalendarDays(anchor, mode);
  const filtered = items.filter((item) => !channel || item.channel === channel);
  const title = new Date(`${anchor}T12:00:00`).toLocaleDateString("es-AR", mode === "month" ? { month: "long", year: "numeric" } : { day: "numeric", month: "long", year: "numeric" });
  function move(direction: number) {
    const date = new Date(`${anchor}T12:00:00`);
    if (mode === "month") date.setMonth(date.getMonth() + direction, 1);
    else date.setDate(date.getDate() + direction * (mode === "week" ? 7 : 1));
    setAnchor(dateKey(date));
  }
  return <section className={s.calendarSection} aria-label="Calendario de publicaciones">
    <div className={s.tools}>
      <div className={s.range}><button type="button" aria-label="Período anterior" onClick={() => move(-1)}>‹</button><h2>{title}</h2><button type="button" aria-label="Período siguiente" onClick={() => move(1)}>›</button></div>
      <label>Canal<select aria-label="Canal" value={channel} onChange={(event) => setChannel(event.target.value)}><option value="">Todos los canales</option>{Array.from(new Set([...channels, ...items.map((item) => item.channel).filter(Boolean)])).map((name) => <option key={name}>{name}</option>)}</select></label>
      <div className={s.segmented} role="group" aria-label="Vista del calendario">{([['month', 'Mes'], ['week', 'Semana'], ['day', 'Día']] as const).map(([value, label]) => <button type="button" aria-pressed={mode === value} key={value} onClick={() => setMode(value)}>{label}</button>)}</div>
    </div>
    <div className={s.calendarScroll}>
      <div className={s.calendar} data-mode={mode}>
        {mode !== "day" && weekday.map((name) => <div className={s.dayName} key={name}>{name}</div>)}
        {days.map((day) => <section className={s.day} key={day} data-outside={mode === "month" && day.slice(0, 7) !== anchor.slice(0, 7)} aria-label={portalDate(day)}>
          <h3>{mode === "day" ? portalDate(day) : Number(day.slice(-2))}</h3>
          {filtered.filter((item) => item.date === day).sort((a, b) => a.time.localeCompare(b.time)).map((item) => <button type="button" className={s.calendarItem} key={item.id} onClick={() => onOpen(item.id)} data-pending={item.pending}><small>{item.time || "Horario a confirmar"} · {item.channel}</small><strong>{item.title}</strong><span>{item.status}</span></button>)}
          {mode === "day" && !filtered.some((item) => item.date === day) && <p>Sin publicaciones para este día.</p>}
        </section>)}
      </div>
    </div>
    {filtered.some((item) => !item.date) && <p className={s.note}>Hay contenidos con fecha a confirmar. Podés revisarlos en Contenidos.</p>}
  </section>;
}

function ContentCard({ item, onOpen }: { item: PortalContent; onOpen: (id: string) => void }) {
  return <article className={s.card} data-pending={item.pending}>
    <div className={s.cardTop}><span>{item.channel || "Canal a definir"} · {item.format || "Propuesta"}</span><span className={s.status}>{item.status}</span></div>
    <h2>{item.title}</h2><p>{item.description || item.idea || item.copy || "Abrí el contenido para revisar la propuesta."}</p>
    <div className={s.cardBottom}><span>{portalDate(item.date)}{item.time ? ` · ${item.time}` : ""}</span><button type="button" className={buttonClass(item.pending ? "primary" : "secondary", true)} onClick={() => onOpen(item.id)}>{item.pending ? "Revisar" : "Ver contenido"}<span className={s.srOnly}> {item.title}</span></button></div>
  </article>;
}

function ReviewPanel({ client, record, item, onClose }: { client: OsClient; record: ModuleRecord; item: PortalContent; onClose: () => void }) {
  const operations = useContentOperations(client);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const actions = getContentActions(record, "client");
  const actor = `Cliente · ${client.name}`;

  async function saveComment() {
    setError(""); setMessage(""); setBusy(true);
    let attachmentId: string | undefined;
    try {
      if (!text.trim() && !file) throw new Error("Escribí un comentario o adjuntá un material.");
      if (file) {
        attachmentId = `portal-${record.id}-${crypto.randomUUID()}`;
        await putProfileFile(client.slug, attachmentId, file);
      }
      const saved = operations.comment(record, { text: text.trim() || `Material adjunto: ${file!.name}`, actor, role: "client", visibility: "client", attachmentId, attachmentName: file?.name });
      if (!saved) throw new Error("No se pudo guardar el comentario. Conservá el material y volvé a intentar.");
      setText(""); setFile(null); setInputKey((value) => value + 1); setMessage("Comentario enviado.");
    } catch (cause) {
      if (attachmentId) await removeProfileFile(client.slug, attachmentId).catch(() => undefined);
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el comentario.");
    } finally { setBusy(false); }
  }

  function act(action: ContentAction) {
    setError(""); setMessage("");
    if (file) { setError("Publicá primero el material adjunto con el botón Enviar comentario."); return; }
    try {
      if (["request-changes", "provide-information"].includes(action) && !text.trim()) throw new Error(action === "request-changes" ? "Contanos qué cambios necesitás en el comentario." : "Detallá la información que estás aportando en el comentario.");
      if (!operations.transition(record, action, { actor, role: "client", comment: text.trim() })) throw new Error("No se pudo guardar la respuesta. Volvé a intentar.");
      setText(""); setMessage(action === "request-changes" ? "Recibimos tus ajustes." : action === "provide-information" ? "Información enviada." : "Aprobación registrada.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar la respuesta."); }
  }

  async function download(id: string, name: string) {
    try {
      const blob = await getProfileFile(client.slug, id);
      if (!blob) throw new Error("Este archivo no está disponible en este navegador.");
      const url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url; link.download = name; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo abrir el archivo."); }
  }

  return <OSSidePanel label={`Revisar ${item.title}`} heading={<h2>{item.title}</h2>} wide onClose={onClose} persistentFooter footer={<div className={s.actions}>{actions.map((action) => <button type="button" key={action.id} className={buttonClass(action.id === "request-changes" ? "secondary" : "primary")} disabled={busy} onClick={() => act(action.id)}>{action.label}</button>)}<button type="button" className={buttonClass("ghost")} onClick={onClose}>Cerrar</button></div>}>
    <div className={s.review}>
      <div className={s.reviewMeta}><span className={s.status}>{item.status}</span><span>{item.channel} · {item.format}</span><span>{portalDate(item.date)}{item.time && ` · ${item.time}`}</span></div>
      {item.review === "preliminary" && <p className={s.callout}>Revisá la idea y el copy juntos. Esta aprobación permite avanzar con el diseño.</p>}
      {item.review === "final" && <p className={s.callout}>Revisá el diseño y el copy final. Cuando los apruebes, podremos programar la publicación.</p>}
      {item.review === "information" && <p className={s.callout}>Completá la información solicitada para que podamos seguir con este contenido.</p>}
      {item.artwork && <div className={s.artwork}>{/\.(png|jpe?g|webp|gif)(\?|$)/i.test(item.artwork) && <img src={item.artwork} alt={`Diseño de ${item.title}`} />}<a href={item.artwork} target="_blank" rel="noreferrer">Abrir pieza final {item.version}</a></div>}
      <dl className={s.fields}>
        {([['Eje temático', item.axis], ['Idea', item.idea], ['Bajada', item.description], ['Objetivo', item.objective], ['Copy', item.copy], ['Qué necesitamos de vos', item.requestedMaterial]] as const).filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        {item.reference && <div><dt>Referencia</dt><dd><a href={item.reference} target="_blank" rel="noreferrer">Abrir referencia</a></dd></div>}
      </dl>
      <section className={s.conversation} aria-label="Comentarios compartidos"><h3>Conversación</h3>{item.comments.length ? item.comments.map((comment) => <article key={comment.id}><div><strong>{comment.author}</strong><time>{comment.at && !Number.isNaN(new Date(comment.at).valueOf()) ? new Date(comment.at).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short" }) : ""}</time></div><p>{comment.text}</p>{comment.attachmentId ? <button type="button" className={buttonClass("ghost", true)} onClick={() => download(comment.attachmentId!, comment.attachmentName || "Material")}>Descargar {comment.attachmentName || "material"}</button> : comment.attachmentUrl ? <a href={comment.attachmentUrl} target="_blank" rel="noreferrer">{comment.attachmentName || "Abrir material"}</a> : null}</article>) : <p>Todavía no hay comentarios compartidos.</p>}</section>
      <form className={s.commentForm} onSubmit={(event) => { event.preventDefault(); void saveComment(); }}>
        <label htmlFor="portal-comment">Tu comentario o información<textarea id="portal-comment" rows={4} value={text} onChange={(event) => setText(event.target.value)} placeholder="Contanos tu devolución o agregá la información que falta" /></label>
        <label htmlFor="portal-file">Adjuntar material <small>Hasta 20 MB</small><input key={inputKey} id="portal-file" type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
        <button type="submit" className={buttonClass("secondary")} disabled={busy}>{busy ? "Guardando…" : "Enviar comentario"}</button>
      </form>
      {error && <p className={s.error} role="alert">{error}</p>}{message && <p className={s.success} role="status">{message}</p>}
    </div>
  </OSSidePanel>;
}

function PortalWorkspace({ client, initialRecordId }: { client: OsClient; initialRecordId: string | null }) {
  const { data, hydrated } = useModuleRecords(client.slug, "contenidos", collections);
  const { servicesOf, localHydrated } = useOsStore();
  const [view, setView] = useState<"pending" | "calendar" | "content">("pending");
  const [selected, setSelected] = useState<string | null>(initialRecordId);
  const [read, setRead] = useLocalStorageState<string[]>(`client:${client.slug}:portal:read`, []);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const items = useMemo(() => (data.piezas || []).map((record) => projectPortalContent(record, client.slug, (data.ejes || []).find((axis) => axis.id === portalSharedValues(record).eje)?.values.nombre)).filter((item): item is PortalContent => item !== null), [client.slug, data]);
  const pending = items.filter((item) => item.pending);
  const unread = pending.filter((item) => { const record = (data.piezas || []).find((entry) => entry.id === item.id); return record && !read.includes(portalNoticeKey(record)); });
  const selectedItem = items.find((item) => item.id === selected);
  const selectedRecord = selectedItem ? (data.piezas || []).find((record) => record.id === selectedItem.id) : undefined;
  function open(id: string) {
    const item = items.find((entry) => entry.id === id);
    const record = (data.piezas || []).find((entry) => entry.id === id);
    if (!item || !record) return;
    setSelected(id); setNoticesOpen(false);
    const key = portalNoticeKey(record);
    setRead((previous) => previous.includes(key) ? previous : [...previous, key]);
  }
  const active = servicesOf(client.slug).includes("contenidos");
  return <div className={s.portal}>
    <header className={s.header}><AvansWordmark width={104} /><div><span>Tu espacio de contenidos</span><strong>{client.name}</strong></div><button type="button" className={buttonClass("secondary", true)} onClick={() => setNoticesOpen((value) => !value)} aria-expanded={noticesOpen}>Avisos {unread.length > 0 && <span className={s.count}>{unread.length}</span>}</button></header>
    <p className={s.preview}>Vista previa local · Todavía sin acceso autenticado ni sincronización entre usuarios.</p>
    <main className={s.main}>
      {!hydrated || !localHydrated ? <p role="status">Cargando tus contenidos…</p> : !active ? <section className={s.empty}><h1>Sin contenidos para revisar</h1><p>El servicio de contenidos no está activo para esta cuenta.</p></section> : <>
        {noticesOpen && <section className={s.notices} aria-label="Tus avisos"><h2>Avisos</h2>{pending.length ? pending.map((item) => <button type="button" key={item.id} onClick={() => open(item.id)}><strong>{item.title}</strong><span>{item.status}</span></button>) : <p>Estás al día. Te avisaremos cuando haya algo para revisar.</p>}</section>}
        <div className={s.heading}><div><span className={s.eyebrow}>Avancemos juntos</span><h1>{pending.length ? `${pending.length} ${pending.length === 1 ? "contenido espera" : "contenidos esperan"} tu respuesta` : "Tus contenidos, en un solo lugar"}</h1><p>Revisá las propuestas, compartí materiales y seguí las próximas publicaciones.</p></div><div className={s.total}><strong>{items.length}</strong><span>contenidos compartidos</span></div></div>
        <nav className={s.tabs} aria-label="Secciones del portal"><button type="button" aria-current={view === "pending" ? "page" : undefined} onClick={() => setView("pending")}>Pendientes <span>{pending.length}</span></button><button type="button" aria-current={view === "calendar" ? "page" : undefined} onClick={() => setView("calendar")}>Calendario</button><button type="button" aria-current={view === "content" ? "page" : undefined} onClick={() => setView("content")}>Contenidos</button></nav>
        {view === "calendar" ? <PortalCalendar items={items} onOpen={open} /> : (view === "pending" ? pending : items).length ? <div className={s.cards}>{(view === "pending" ? pending : items).map((item) => <ContentCard key={item.id} item={item} onOpen={open} />)}</div> : <section className={s.empty}><h2>{view === "pending" ? "Estás al día" : "Todavía no hay contenidos compartidos"}</h2><p>{view === "pending" ? "No tenés propuestas ni piezas pendientes de revisión." : "Acá vas a encontrar las propuestas que el equipo te envíe para revisar."}</p></section>}
      </>}
    </main>
    <footer className={s.footer}>Avans · Marketing que funciona</footer>
    {active && selectedItem && selectedRecord && <ReviewPanel key={selectedRecord.id} client={client} record={selectedRecord} item={selectedItem} onClose={() => setSelected(null)} />}
    <OSToastViewport />
  </div>;
}

export function ClientPortal({ client }: { client: OsClient }) {
  const params = useSearchParams();
  const recordId = params.get("contenido");
  return <PortalWorkspace key={`${client.slug}:${recordId || ""}`} client={client} initialRecordId={recordId} />;
}
