"use client";
/**
 * "Generar presentación": builds an editable PPTX from the official master
 * with the client's Discovery, Benchmark, Plan, active services and visual
 * resources, then shows the real slides of the generated file.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useOsStore } from "../../os-store";
import { buttonClass } from "../../ui";
import type { OsClient } from "../../os-data";
import { useKnowledge } from "../use-knowledge";
import { newId } from "../types";
import { readRenderDeck } from "../../../../../lib/pptx/render-model";
import type { GenerationReport, PendingItem } from "../../../../../lib/pptx/generate";
import { PPTX_MIME } from "../../../../../lib/pptx/zip";
import {
  assertExportAllowed,
  buildPresentationManifest,
  nextPresentationVersion,
  presentationIsStale,
  savePptxExport,
  MASTER_VERSION,
  MASTER_SHA256,
} from "./manifest";
import { buildPresentationFile } from "./pptx";
import {
  downloadBytes,
  getPresentationFile,
  loadTemplate,
  putPresentationFile,
} from "./presentation-files";
import { LazySlide, SlideCanvas, useMediaUrls } from "./slide-renderer";
import type { PresentationExport, PresentationManifest, PresentationMode } from "./types";
import s from "./presentation.module.css";

export type OpenedPresentation = {
  id: string;
  version: number;
  bytes: Uint8Array;
  report: GenerationReport;
  manifest: PresentationManifest;
  fileName: string;
  sha256: string;
  saved: boolean;
  rebuilt?: boolean;
};

export const GOOGLE_SLIDES_REASON =
  "Google Workspace no está conectado en esta vista previa. Crear la copia nativa en Google Slides requiere OAuth de la organización, la carpeta del cliente y el master importado y validado. No se genera ningún enlace.";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Full-screen dialog: focus trapped, Esc closes, focus returns to the trigger. */
function useFullscreenDialog(onClose: () => void, active = true) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const [trigger] = useState(() =>
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null),
  );
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (node && !node.contains(document.activeElement))
      (node.querySelector<HTMLElement>("[data-autofocus]") ?? node).focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (!node) return;
      // A nested dialog (the enlarged slide) handles its own Escape.
      const owner = (event.target as HTMLElement | null)?.closest('[role="dialog"]');
      if (event.key === "Escape") {
        if (owner && owner !== node) return;
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (item) => item.offsetParent !== null,
      );
      if (!items.length) return;
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    node?.addEventListener("keydown", onKey);
    return () => {
      node?.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      if (trigger && document.contains(trigger)) trigger.focus();
    };
  }, [active, trigger]);
  return ref;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
};
const formatSize = (n: number) =>
  n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;

function PendingEntry({ item, onNavigate }: { item: PendingItem; onNavigate: () => void }) {
  return (
    <li>
      <span>{item.label}</span>
      <small>
        {[item.kind === "image" ? "Imagen" : item.kind === "text" ? "Ajuste de texto" : null, item.module]
          .filter(Boolean)
          .join(" · ")}
        {item.href ? (
          <>
            {" · "}
            <Link href={item.href} onClick={onNavigate}>
              Completar
            </Link>
          </>
        ) : null}
      </small>
    </li>
  );
}

function Lightbox({
  deck,
  media,
  index,
  onIndex,
  onClose,
}: {
  deck: ReturnType<typeof readRenderDeck>;
  media: Map<string, string>;
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div
      ref={ref}
      className={s.lightbox}
      role="dialog"
      aria-modal="true"
      aria-label={`Slide ${index + 1} ampliada`}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
          onClose();
        } else if (e.key === "ArrowRight") onIndex(Math.min(deck.slides.length - 1, index + 1));
        else if (e.key === "ArrowLeft") onIndex(Math.max(0, index - 1));
      }}
    >
      <div className={s.lightboxBar}>
        <span>
          Slide {index + 1} de {deck.slides.length}
        </span>
        <span className={s.actionsRow}>
          <button
            type="button"
            className={s.close}
            onClick={() => onIndex(Math.max(0, index - 1))}
            disabled={index === 0}
            aria-label="Slide anterior"
          >
            ←
          </button>
          <button
            type="button"
            className={s.close}
            onClick={() => onIndex(Math.min(deck.slides.length - 1, index + 1))}
            disabled={index === deck.slides.length - 1}
            aria-label="Slide siguiente"
          >
            →
          </button>
          <button type="button" className={s.close} onClick={onClose} aria-label="Cerrar slide ampliada">
            ×
          </button>
        </span>
      </div>
      <div className={s.lightboxSlide}>
        <SlideCanvas deck={deck} slide={deck.slides[index]} media={media} />
      </div>
    </div>
  );
}

type Tab = "slides" | "document" | "pending";

export function PresentationViewer({
  opened,
  stale,
  onClose,
  onNewVersion,
  canGenerate,
}: {
  opened: OpenedPresentation;
  stale: boolean;
  onClose: () => void;
  onNewVersion: () => void;
  canGenerate: boolean;
}) {
  const deck = useMemo(() => readRenderDeck(opened.bytes), [opened.bytes]);
  const media = useMediaUrls(deck);
  const [tab, setTab] = useState<Tab>("slides");
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // The generator's controls are gone: move focus into the viewer.
    downloadRef.current?.focus();
  }, [opened]);
  const report = opened.report;
  const pendingTotal = report.slides.reduce((n, r) => n + r.pending.length, 0);
  const draft = opened.manifest.mode !== "client";
  const go = useCallback(
    (i: number) => setIndex(Math.max(0, Math.min(deck.slides.length - 1, i))),
    [deck.slides.length],
  );
  useEffect(() => {
    // Keep the active thumbnail visible by scrolling the strip only.
    const strip = stripRef.current;
    const thumb = strip?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (!strip || !thumb) return;
    const left = thumb.offsetLeft - strip.offsetLeft;
    if (left < strip.scrollLeft || left + thumb.offsetWidth > strip.scrollLeft + strip.clientWidth)
      strip.scrollTo({ left: Math.max(0, left - strip.clientWidth / 2 + thumb.offsetWidth / 2) });
  }, [index]);
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (tab !== "slides" || zoom) return;
    const target = e.target as HTMLElement;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") {
      e.preventDefault();
      go(index + 1);
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      go(index - 1);
    } else if (e.key === "Home") go(0);
    else if (e.key === "End") go(deck.slides.length - 1);
  };
  const current = report.slides[index];
  return (
    <div onKeyDown={onKeyDown} className={s.viewer}>
      <header className={s.bar}>
        <div className={s.barTitle}>
          <p className={s.rotulo}>Presentación generada · versión {opened.version}</p>
          <h2 id="presentation-viewer-title">{opened.manifest.clientName} · Marketing Discovery</h2>
          <div className={s.badges}>
            {draft ? (
              <span className={`${s.badge} ${s.badgeDraft}`}>Borrador interno</span>
            ) : (
              <span className={`${s.badge} ${s.badgeFinal}`}>Versión para cliente</span>
            )}
            {stale ? <span className={`${s.badge} ${s.badgeStale}`}>Desactualizada · los datos cambiaron</span> : null}
            {!opened.saved ? <span className={s.badge}>No guardada en el historial</span> : null}
          </div>
          <p className={s.meta}>
            {deck.slides.length} slides · {pendingTotal} datos pendientes · {formatSize(opened.bytes.length)} ·{" "}
            {formatDate(opened.manifest.generatedAt)} · {opened.manifest.generatedBy}
          </p>
        </div>
        <div className={s.barSide}>
        <div className={s.barActions}>
          <button
            ref={downloadRef}
            type="button"
            data-autofocus
            className={buttonClass("primary", true)}
            onClick={() => downloadBytes(opened.bytes, opened.fileName, PPTX_MIME)}
          >
            Descargar PPTX
          </button>
          {canGenerate ? (
            <button type="button" className={buttonClass("secondary", true)} onClick={onNewVersion}>
              Generar nueva versión
            </button>
          ) : null}
          <button
            type="button"
            className={buttonClass("secondary", true)}
            disabled
            aria-describedby="google-slides-reason"
          >
            Crear en Google Slides
          </button>
          <button type="button" className={s.close} onClick={onClose} aria-label="Cerrar presentación">
            ×
          </button>
        </div>
        <p id="google-slides-reason" className={s.reason}>
          Google Slides no disponible: Google Workspace no está conectado en esta vista previa. No se generan enlaces.
        </p>
        </div>
      </header>
      <div className={s.tabs} role="tablist" aria-label="Vistas de la presentación">
        {(
          [
            ["slides", "Diapositivas"],
            ["document", "Documento completo"],
            ["pending", `Datos pendientes (${pendingTotal})`],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            className={s.tab}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={s.body} role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "slides" ? (
          <div className={s.slides}>
            <div className={s.stageCol}>
              <button
                type="button"
                className={s.mainSlide}
                onClick={() => setZoom(true)}
                aria-label={`Ampliar slide ${index + 1}: ${current?.title ?? ""}`}
              >
                <SlideCanvas
                  deck={deck}
                  slide={deck.slides[index]}
                  media={media}
                  label={`Slide ${index + 1} de ${deck.slides.length}: ${current?.title ?? ""}`}
                />
              </button>
              <div className={s.nav}>
                <button type="button" className={buttonClass("secondary", true)} onClick={() => go(index - 1)} disabled={index === 0}>
                  ← Anterior
                </button>
                <span aria-live="polite">
                  Slide {index + 1} de {deck.slides.length} · {current?.title}
                </span>
                <button
                  type="button"
                  className={buttonClass("secondary", true)}
                  onClick={() => go(index + 1)}
                  disabled={index === deck.slides.length - 1}
                >
                  Siguiente →
                </button>
              </div>
              <div className={s.strip} ref={stripRef} aria-label="Miniaturas">
                {deck.slides.map((slide, i) => (
                  <button
                    key={i}
                    type="button"
                    className={s.thumb}
                    data-index={i}
                    aria-current={i === index}
                    aria-label={`Ir a slide ${i + 1}: ${report.slides[i]?.title ?? ""}${report.slides[i]?.pending.length ? ` · ${report.slides[i].pending.length} pendientes` : ""}`}
                    onClick={() => go(i)}
                  >
                    <LazySlide deck={deck} slide={slide} media={media} label={`Miniatura ${i + 1}`} />
                    <span className={s.thumbMeta}>
                      <span>{i + 1}</span>
                      {report.slides[i]?.pending.length ? (
                        <span className={s.dot}>{report.slides[i].pending.length} pend.</span>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <aside className={s.side} aria-label="Detalle de la slide">
              <div className={s.sideCard}>
                <p className={s.rotulo}>
                  Slide {index + 1} · página {current?.template} del master
                </p>
                <h3>{current?.title}</h3>
                {current?.pending.length ? (
                  <>
                    <p>Datos sin completar en esta slide (se dejaron fuera del archivo):</p>
                    <ul className={s.pendingList}>
                      {current.pending.map((p, i) => (
                        <PendingEntry key={i} item={p} onNavigate={onClose} />
                      ))}
                    </ul>
                  </>
                ) : (
                  <p>Sin datos pendientes en esta slide.</p>
                )}
              </div>
              <div className={s.sideCard}>
                <h3>Cómo se generó</h3>
                <p>
                  Construida desde el master oficial {MASTER_VERSION} ({MASTER_SHA256.slice(0, 12)}): texto editable,
                  tipografías Figtree y Syne, colores, logos y recursos originales.
                  {opened.rebuilt ? " Archivo reconstruido desde el snapshot guardado." : ""}
                </p>
                <p>
                  Se eliminaron instrucciones internas, roles al pie y placeholders; se duplicaron productos, perfiles,
                  marcas y campañas; se quitaron los módulos no contratados ({report.removedTemplateSlides.length}{" "}
                  páginas del master no usadas).
                </p>
                <p>Usá ← → para recorrer. Enter o clic amplía la slide.</p>
              </div>
            </aside>
          </div>
        ) : tab === "document" ? (
          <div className={s.document}>
            {deck.slides.map((slide, i) => (
              <section key={i} className={s.docSlide} aria-label={`Slide ${i + 1}`}>
                <div className={s.docHead}>
                  <span>
                    {i + 1}. {report.slides[i]?.title}
                  </span>
                  <span>
                    {report.slides[i]?.pending.length ? `${report.slides[i].pending.length} datos pendientes` : "Completa"}
                  </span>
                </div>
                <LazySlide deck={deck} slide={slide} media={media} label={`Slide ${i + 1}`} />
              </section>
            ))}
          </div>
        ) : (
          <div className={s.pendingView}>
            <p className={`${s.notice} ${s.noticeMuted}`}>
              Los campos sin dato no muestran texto de plantilla: se retiraron del archivo y se listan acá con el módulo
              donde se completan. Al completar los datos, generá una nueva versión.
            </p>
            {opened.manifest.warnings.length ? (
              <section className={s.pendingGroup}>
                <h3>Advertencias</h3>
                <ul>
                  {opened.manifest.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            {report.slides
              .filter((r) => r.pending.length)
              .map((r) => (
                <section key={r.index} className={s.pendingGroup}>
                  <h3>
                    Slide {r.index} · {r.title}
                  </h3>
                  <ul className={s.pendingList}>
                    {r.pending.map((p, i) => (
                      <PendingEntry key={i} item={p} onNavigate={onClose} />
                    ))}
                  </ul>
                  <button
                    type="button"
                    className={s.linkButton}
                    onClick={() => {
                      setIndex(r.index - 1);
                      setTab("slides");
                    }}
                  >
                    Ver slide {r.index}
                  </button>
                </section>
              ))}
            {!pendingTotal ? <p>No hay datos pendientes.</p> : null}
          </div>
        )}
      </div>
      {zoom ? (
        <Lightbox deck={deck} media={media} index={index} onIndex={go} onClose={() => setZoom(false)} />
      ) : null}
    </div>
  );
}

function GeneratorOptions({
  client,
  onGenerated,
  onCancel,
}: {
  client: OsClient;
  onGenerated: (opened: OpenedPresentation) => void;
  onCancel: () => void;
}) {
  const { k, editable, mutate, latest, context } = useKnowledge(client);
  const { servicesOf } = useOsStore();
  const active = servicesOf(client.slug);
  const [chosenMode, setMode] = useState<PresentationMode>("internal-draft");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const preview = useMemo(
    () => buildPresentationManifest(k, client, active, "client", { actor: k.updatedBy, at: k.updatedAt }),
    [k, client, active],
  );
  const finalBlocked = !editable
    ? "Solo administración o el PM asignado a la cuenta pueden generar la versión final para el cliente."
    : preview.missingFields.length
      ? `Bloqueada: ${preview.missingFields.length} datos críticos faltan o están sin validar (incluye registros DEMO). Generá un borrador o completá los datos.`
      : "";
  const mode: PresentationMode = finalBlocked ? "internal-draft" : chosenMode;
  const historyFull = (k.presentationExports ?? []).length >= 10;
  async function generate() {
    setBusy(true);
    setError("");
    try {
      const base = editable ? latest() : k;
      const ctx = context();
      const manifest = {
        ...buildPresentationManifest(base, client, active, mode, ctx),
        warningsConfirmed: mode === "client" ? confirmed : false,
      };
      assertExportAllowed(manifest);
      const version = nextPresentationVersion(base);
      const id = newId();
      const template = await loadTemplate();
      const file = await buildPresentationFile(template, manifest, version, id);
      let saved = false;
      if (editable && !historyFull) {
        saved = mutate((state, c) => savePptxExport(state, manifest, file.info, version, id, c));
        if (saved)
          await putPresentationFile(id, {
            bytes: file.bytes,
            report: file.report,
            savedAt: ctx.at,
          });
      }
      onGenerated({
        id,
        version,
        bytes: file.bytes,
        report: file.report,
        manifest,
        fileName: file.info.fileName,
        sha256: file.info.sha256,
        saved,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar la presentación.");
      setBusy(false);
    }
  }
  return (
    <div className={s.body}>
      <header className={s.bar}>
        <div className={s.barTitle}>
          <p className={s.rotulo}>Generar presentación</p>
          <h2 id="presentation-generator-title">{client.name} · Marketing Discovery</h2>
          <p className={s.meta}>
            PowerPoint editable construido sobre el master oficial ({MASTER_VERSION}) con los datos de Discovery,
            Benchmark, Plan de Marketing, servicios activos y recursos visuales cargados.
          </p>
        </div>
        <div className={s.barActions}>
          <button type="button" className={s.close} onClick={onCancel} aria-label="Cerrar">
            ×
          </button>
        </div>
      </header>
      <div className={s.generator}>
        <div className={s.blocks}>
          {preview.preparation.map((b) => (
            <article key={b.id} className={s.block}>
              <h3>{b.label}</h3>
              <div className={s.meter} aria-hidden="true">
                <span style={{ width: `${Math.max(0, Math.min(100, b.percent))}%` }} />
              </div>
              <p className={s.meta}>
                {b.percent}% completo · {b.slides} slides · {b.missing.length} faltantes · {b.unvalidated} sin validar
              </p>
              <Link href={b.href} onClick={onCancel}>
                Completar
              </Link>
            </article>
          ))}
        </div>
        <fieldset className={s.modes}>
          <legend className={s.rotulo} style={{ marginBottom: 8 }}>
            Tipo de archivo
          </legend>
          <label className={s.mode}>
            <input
              type="radio"
              name="presentation-mode"
              value="internal-draft"
              checked={mode === "internal-draft"}
              onChange={() => setMode("internal-draft")}
            />
            <strong>Borrador interno</strong>
            <small>
              Incluye lo que hay. Cada slide lleva la marca «BORRADOR INTERNO — NO ENVIAR AL CLIENTE» y los datos que
              faltan se listan como pendientes.
            </small>
          </label>
          <label className={s.mode}>
            <input
              type="radio"
              name="presentation-mode"
              value="client"
              checked={mode === "client"}
              disabled={!!finalBlocked}
              onChange={() => setMode("client")}
              aria-describedby="final-reason"
            />
            <strong>Versión final para cliente</strong>
            <small id="final-reason">
              {finalBlocked || "Sin marca de borrador. Requiere datos completos y validados."}
            </small>
          </label>
        </fieldset>
        {mode === "client" && preview.warnings.length ? (
          <div className={s.notice}>
            <p style={{ margin: "0 0 8px" }}>Advertencias no críticas:</p>
            <ul>
              {preview.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
            <label>
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> Revisé y
              acepto las advertencias para esta versión
            </label>
          </div>
        ) : null}
        {!editable ? (
          <p className={`${s.notice} ${s.noticeMuted}`}>
            Tu rol puede generar y descargar un borrador para revisar, pero no se guarda en el historial del cliente.
          </p>
        ) : historyFull ? (
          <p className={s.notice}>
            El historial local llegó a 10 versiones: la nueva se puede ver y descargar, pero no se guarda. Ninguna
            versión anterior se borra.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className={s.error}>
            {error}
          </p>
        ) : null}
        <div className={s.actionsRow}>
          <button
            type="button"
            data-autofocus
            className={buttonClass("primary")}
            disabled={busy || (mode === "client" && preview.warnings.length > 0 && !confirmed)}
            onClick={generate}
          >
            {busy ? "Generando…" : mode === "client" ? "Generar versión para cliente" : "Generar borrador"}
          </button>
          <button type="button" className={buttonClass("secondary")} onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className={buttonClass("secondary")} disabled aria-describedby="google-reason-gen">
            Crear en Google Slides
          </button>
        </div>
        <p id="google-reason-gen" className={s.reason}>
          {GOOGLE_SLIDES_REASON}
        </p>
        {busy ? (
          <p className={s.progress} role="status">
            Descargando el master, aplicando los datos y armando el archivo…
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** The full-screen studio: options → generated file viewer. */
export function PresentationStudio({
  client,
  initial,
  onClose,
}: {
  client: OsClient;
  initial?: OpenedPresentation | null;
  onClose: () => void;
}) {
  const { k } = useKnowledge(client);
  const { servicesOf } = useOsStore();
  const active = servicesOf(client.slug);
  const [opened, setOpened] = useState<OpenedPresentation | null>(initial ?? null);
  const ref = useFullscreenDialog(onClose);
  const stale = useMemo(() => {
    if (!opened) return false;
    const record: PresentationExport = {
      id: opened.id,
      clientSlug: client.slug,
      format: "pptx",
      mode: opened.manifest.mode,
      version: opened.version,
      status: "ready",
      manifest: opened.manifest,
    };
    return presentationIsStale(k, active, record);
  }, [opened, k, active, client.slug]);
  return (
    <div
      ref={ref}
      className={s.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={opened ? "presentation-viewer-title" : "presentation-generator-title"}
      tabIndex={-1}
    >
      {opened ? (
        <PresentationViewer
          opened={opened}
          stale={stale}
          onClose={onClose}
          onNewVersion={() => setOpened(null)}
          canGenerate
        />
      ) : (
        <GeneratorOptions client={client} onGenerated={setOpened} onCancel={onClose} />
      )}
    </div>
  );
}

/** Self-contained trigger for document headers (Discovery, Benchmark, Plan, Documentos). */
export function GeneratePresentationButton({
  client,
  label = "Generar presentación",
  variant = "primary",
  small = false,
}: {
  client: OsClient;
  label?: string;
  variant?: "primary" | "secondary" | "dark";
  small?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={buttonClass(variant, small)} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open ? <PresentationStudio client={client} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Rebuilds the bytes of a saved version: IndexedDB first, then from its snapshot. */
export async function materializeExport(record: PresentationExport): Promise<OpenedPresentation> {
  if (record.format !== "pptx" || !record.file)
    throw new Error("Esta versión es una vista previa anterior sin archivo PPTX.");
  const stored = await getPresentationFile(record.file.storageKey);
  if (stored)
    return {
      id: record.id,
      version: record.version,
      bytes: stored.bytes,
      report: stored.report,
      manifest: record.manifest,
      fileName: record.file.fileName,
      sha256: record.file.sha256,
      saved: true,
    };
  const template = await loadTemplate();
  const file = await buildPresentationFile(template, record.manifest, record.version, record.file.storageKey);
  await putPresentationFile(record.file.storageKey, {
    bytes: file.bytes,
    report: file.report,
    savedAt: new Date().toISOString(),
  });
  return {
    id: record.id,
    version: record.version,
    bytes: file.bytes,
    report: file.report,
    manifest: record.manifest,
    fileName: record.file.fileName,
    sha256: file.info.sha256,
    saved: true,
    rebuilt: true,
  };
}

export function VersionSummary({ record, stale }: { record: PresentationExport; stale: boolean }): ReactNode {
  const draft = record.mode !== "client";
  return (
    <>
      <div className={s.versionThumb} aria-hidden="true">
        v{record.version} · {record.format === "pptx" ? "PPTX" : "Datos"}
      </div>
      <div>
        <p>
          <strong>
            Versión {record.version} · {draft ? "Borrador interno" : "Para cliente"}
          </strong>
        </p>
        <p>
          {record.format === "pptx" && record.file
            ? `PPTX editable · ${record.file.slideCount} slides · ${record.file.pendingCount} datos pendientes · ${formatSize(record.file.size)}`
            : "Vista previa de contenido anterior (sin archivo)"}
        </p>
        <p className={s.meta}>
          {formatDate(record.generatedAt ?? record.manifest.generatedAt)} · {record.generatedBy ?? record.manifest.generatedBy}
        </p>
        <div className={s.badges}>
          {draft ? <span className={`${s.badge} ${s.badgeDraft}`}>Borrador</span> : <span className={`${s.badge} ${s.badgeFinal}`}>Final</span>}
          {stale ? <span className={`${s.badge} ${s.badgeStale}`}>Desactualizada</span> : <span className={s.badge}>Datos vigentes</span>}
        </div>
      </div>
    </>
  );
}
