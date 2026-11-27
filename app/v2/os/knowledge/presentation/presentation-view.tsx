"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useOsStore } from "../../os-store";
import { buttonClass } from "../../ui";
import { OSSidePanel } from "../../overlays";
import { serviceLabel, type OsClient } from "../../os-data";
import { useKnowledge } from "../use-knowledge";
import { buildPresentationManifest, presentationIsStale, DRAFT_WATERMARK } from "./manifest";
import {
  GOOGLE_SLIDES_REASON,
  GeneratePresentationButton,
  PresentationStudio,
  VersionSummary,
  materializeExport,
  type OpenedPresentation,
} from "./presentation-studio";
import { downloadBytes } from "./presentation-files";
import { PPTX_MIME } from "../../../../../lib/pptx/zip";
import type { PresentationExport, PresentationManifest } from "./types";
import m from "../knowledge.module.css";
import s from "./presentation.module.css";

/** Readiness summary + "Generar presentación" (questionnaire screen). */
export function PresentationView({
  client,
  beforeGenerate,
}: {
  client: OsClient;
  beforeGenerate: () => boolean;
}) {
  const { k } = useKnowledge(client),
    { servicesOf } = useOsStore();
  const active = servicesOf(client.slug);
  const [open, setOpen] = useState(false);
  const prepared = useMemo(
    () =>
      buildPresentationManifest(k, client, active, "client", {
        actor: k.updatedBy,
        at: k.updatedAt,
      }),
    [k, client, active],
  );
  return (
    <>
      <details className={m.card} id="presentation-preparation">
        <summary>Preparación de la presentación</summary>
        <p>
          La presentación se genera como PowerPoint editable a partir del master oficial de 56 slides: se conservan
          diseño, tipografías, colores y recursos; se quitan instrucciones y módulos no contratados; los datos que
          faltan se informan como pendientes.
        </p>
        <div className={m.grid}>
          {prepared.preparation.map((block) => (
            <article className={m.card} key={block.id}>
              <h4>{block.label}</h4>
              <progress className={m.progress} max={100} value={block.percent} aria-label={`Preparación ${block.label}`} />
              <p>
                {block.percent}% · {block.slides} slides estimadas
              </p>
              <p>
                {block.unvalidated} registros por validar · {block.sourceIds.length} fuentes
              </p>
              <p className={m.muted}>
                Responsable: {block.owners.join(" · ") || "Pendiente"}
                <br />
                Actualización: {block.updatedAt || "Sin fecha"}
              </p>
              <details>
                <summary>{block.missing.length} campos faltantes</summary>
                <ul>
                  {block.missing.map((missing, i) => (
                    <li key={i}>{missing}</li>
                  ))}
                </ul>
              </details>
              <Link href={block.href}>Abrir faltantes</Link>
            </article>
          ))}
        </div>
        <p className={m.notice}>
          {prepared.missingFields.length
            ? `Versión para cliente bloqueada: ${prepared.missingFields.length} faltantes críticos o datos sin validar. Se puede generar un borrador interno con la marca «${DRAFT_WATERMARK}».`
            : "Contenido crítico completo. La versión para cliente pide confirmar las advertencias no críticas."}
        </p>
        <div className={m.actions}>
          <button
            type="button"
            className={buttonClass("primary")}
            onClick={() => {
              if (beforeGenerate()) setOpen(true);
            }}
          >
            Generar presentación
          </button>
          <button type="button" disabled className={buttonClass("secondary")} title={GOOGLE_SLIDES_REASON}>
            Crear en Google Slides
          </button>
        </div>
        <p className={m.muted}>{GOOGLE_SLIDES_REASON}</p>
      </details>
      <ExportHistory client={client} />
      {open ? <PresentationStudio client={client} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Documentos → Presentaciones generadas: versions, download, open, regenerate. */
export function ExportHistory({ client }: { client: OsClient }) {
  const { k, editable } = useKnowledge(client),
    { servicesOf, notify } = useOsStore();
  const [view, setView] = useState<PresentationManifest | null>(null);
  const [opened, setOpened] = useState<OpenedPresentation | null>(null);
  const [busy, setBusy] = useState("");
  const active = servicesOf(client.slug);
  const exports = (k.presentationExports ?? []).slice().reverse();
  async function open(e: PresentationExport, download = false) {
    setBusy(e.id);
    try {
      const file = await materializeExport(e);
      if (file.rebuilt && e.file && file.sha256 !== e.file.sha256)
        notify("El archivo se reconstruyó desde el snapshot; su huella difiere de la registrada.", "error");
      if (download) downloadBytes(file.bytes, file.fileName, PPTX_MIME);
      else setOpened(file);
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo abrir la versión", "error");
    } finally {
      setBusy("");
    }
  }
  return (
    <section className={s.history} aria-labelledby="presentation-history-title">
      <div className={s.historyHead}>
        <div>
          <h3 id="presentation-history-title">Presentaciones generadas</h3>
          <p className={m.muted}>
            Cada versión es un PPTX editable construido desde el master oficial. Las anteriores se conservan y se marcan
            como desactualizadas cuando cambian los datos.
          </p>
        </div>
        <GeneratePresentationButton client={client} />
      </div>
      {!editable ? (
        <p className={m.muted}>
          El historial y sus snapshots se guardan para el administrador y el PM asignado. Con tu rol podés generar un
          borrador para revisar sin guardarlo.
        </p>
      ) : !exports.length ? (
        <p>Todavía no hay versiones generadas.</p>
      ) : (
        exports.map((e) => {
          const stale = presentationIsStale(k, active, e);
          return (
            <article key={e.id} className={s.version} aria-label={`Versión ${e.version}`}>
              <VersionSummary record={e} stale={stale} />
              <div className={s.actionsRow}>
                {e.format === "pptx" && e.file ? (
                  <>
                    <button
                      type="button"
                      className={buttonClass("secondary", true)}
                      disabled={!!busy}
                      onClick={() => open(e)}
                    >
                      {busy === e.id ? "Abriendo…" : `Abrir v${e.version}`}
                    </button>
                    <button
                      type="button"
                      className={buttonClass("ghost", true)}
                      disabled={!!busy}
                      onClick={() => open(e, true)}
                    >
                      Descargar v{e.version} (PPTX)
                    </button>
                  </>
                ) : (
                  <button type="button" className={buttonClass("ghost", true)} onClick={() => setView(e.manifest)}>
                    Ver datos pendientes v{e.version}
                  </button>
                )}
              </div>
            </article>
          );
        })
      )}
      {view ? <ManifestPreview manifest={view} onClose={() => setView(null)} /> : null}
      {opened ? <PresentationStudio client={client} initial={opened} onClose={() => setOpened(null)} /> : null}
    </section>
  );
}

/** Secondary list of what a (legacy, manifest-only) version left pending. */
function ManifestPreview({ manifest, onClose }: { manifest: PresentationManifest; onClose: () => void }) {
  return (
    <OSSidePanel
      persistentFooter
      label="Datos pendientes de la presentación"
      heading={<h2>Datos pendientes · {manifest.clientName}</h2>}
      onClose={onClose}
      footer={
        <button className={buttonClass("secondary")} onClick={onClose}>
          Cerrar
        </button>
      }
    >
      <p>
        Versión anterior guardada solo como contenido (sin archivo). Para ver la presentación real, generá una nueva
        versión.
      </p>
      <p>
        Servicios: {manifest.includedServiceIds.map(serviceLabel).join(" · ") || "Ninguno"} · {manifest.slides.length}{" "}
        slides · {manifest.generatedAt}
      </p>
      <details open>
        <summary>Campos pendientes · {manifest.missingFields.length}</summary>
        <ul>
          {manifest.missingFields.map((field, i) => (
            <li key={i}>{field}</li>
          ))}
        </ul>
      </details>
      <details>
        <summary>Imágenes faltantes · {manifest.missingImages.length}</summary>
        <ul>
          {manifest.missingImages.map((field, i) => (
            <li key={i}>{field}</li>
          ))}
        </ul>
      </details>
      <details>
        <summary>Advertencias · {manifest.warnings.length}</summary>
        <ul>
          {manifest.warnings.map((warning, i) => (
            <li key={i}>{warning}</li>
          ))}
        </ul>
      </details>
    </OSSidePanel>
  );
}
