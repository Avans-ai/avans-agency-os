"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useOsStore } from "../../os-store";
import { buttonClass } from "../../ui";
import { OSSidePanel } from "../../overlays";
import { serviceLabel, type OsClient } from "../../os-data";
import { useKnowledge } from "../use-knowledge";
import { ExternalLink } from "../shared-ui";
import {
  presentationBlockers,
  presentationSettings,
} from "../../../../../lib/presentations/readiness";
import {
  buildPresentationManifest,
  saveManifestPreview,
  presentationIsStale,
  DRAFT_WATERMARK,
} from "./manifest";
import type { PresentationManifest, PresentationMode } from "./types";
import m from "../knowledge.module.css";
export function PresentationView({
  client,
  beforeGenerate,
}: {
  client: OsClient;
  beforeGenerate: () => boolean;
}) {
  const { k, editable, mutate, latest, context } = useKnowledge(client),
    { servicesOf } = useOsStore();
  const active = servicesOf(client.slug);
  const [mode, setMode] = useState<PresentationMode>("internal-draft"),
    [preview, setPreview] = useState<PresentationManifest | null>(null),
    [error, setError] = useState("");
  const prepared = useMemo(
    () =>
      buildPresentationManifest(k, client, active, mode, {
        actor: k.updatedBy,
        at: k.updatedAt,
      }),
    [k, client, active, mode],
  );
  return (
    <>
      <details className={m.card} id="presentation-preparation">
        <summary>Preparación de la presentación</summary>
        <p>
          Basada en las 56 slides del master oficial. Primero revisá el
          contenido y las páginas incluidas; los archivos requieren la plantilla
          convertida y validada en Google Slides.
        </p>
        <div className={m.grid}>
          {prepared.preparation.map((block) => (
            <article className={m.card} key={block.id}>
              <h4>{block.label}</h4>
              <progress
                className={m.progress}
                max={100}
                value={block.percent}
                aria-label={`Preparación ${block.label}`}
              />
              <p>
                {block.percent}% · {block.slides} slides estimadas
              </p>
              <p>
                {block.unvalidated} registros por validar ·{" "}
                {block.sourceIds.length} fuentes
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
        <label className={m.field}>
          Modo de presentación
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as PresentationMode)}
          >
            <option value="internal-draft">Borrador interno</option>
            <option value="client">Versión para cliente</option>
          </select>
        </label>
        {mode === "internal-draft" ? (
          <p className={m.notice}>{DRAFT_WATERMARK}</p>
        ) : prepared.missingFields.length ? (
          <p className={m.notice}>
            Versión para cliente bloqueada: {prepared.missingFields.length}{" "}
            faltantes críticos o datos sin validar. Podés revisar el manifest,
            pero no exportarlo para envío.
          </p>
        ) : (
          <p className={m.notice}>
            Contenido crítico completo. Confirmá las advertencias no críticas
            antes de exportar.
          </p>
        )}
        <button
          disabled={!editable}
          className={buttonClass("primary")}
          onClick={() => {
            if (!beforeGenerate()) return;
            const manifest = buildPresentationManifest(
              latest(),
              client,
              active,
              mode,
              context(),
            );
            if (mutate((s, c) => saveManifestPreview(s, manifest, c)))
              setPreview(manifest);
          }}
        >
          Generar manifest y vista previa
        </button>
        <div className={m.notice}>
          <strong>Google Workspace no conectado</strong>
          <p>
            Exportación PPTX bloqueada: falta importar y validar el master en
            Google Slides, conectar OAuth y habilitar persistencia segura. El
            manifest está disponible; no se creó un archivo.
          </p>
          <details>
            <summary>Ver configuración pendiente</summary>
            <ul>
              {presentationBlockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <p>{presentationSettings.join(" · ")}</p>
            <Link href="/v2/integraciones">Abrir Integraciones</Link>
          </details>
        </div>
        <div className={m.actions}>
          <button
            className={buttonClass("secondary")}
            disabled={!editable}
            onClick={() =>
              setError(
                "Exportar PPT: bloqueado por Google no conectado y fidelidad de la conversión del master sin validar. No se generó ningún archivo.",
              )
            }
          >
            Exportar PPT
          </button>
          <button disabled className={buttonClass("secondary")}>
            Crear en Google Slides
          </button>
        </div>
        {error ? (
          <p role="alert" className={m.error}>
            {error}
          </p>
        ) : null}
      </details>
      <ExportHistory client={client} onOpen={setPreview} />
      {preview ? (
        <ManifestPreview
          manifest={preview}
          onChange={setPreview}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </>
  );
}
export function ExportHistory({
  client,
  onOpen,
}: {
  client: OsClient;
  onOpen?: (m: PresentationManifest) => void;
}) {
  const { k, editable } = useKnowledge(client),
    { servicesOf, notify } = useOsStore();
  const [view, setView] = useState<PresentationManifest | null>(null);
  const active = servicesOf(client.slug);
  if (!editable)
    return (
      <p>
        Las presentaciones generadas y sus snapshots están disponibles para el
        administrador y el PM asignado.
      </p>
    );
  return (
    <>
      <details className={m.card}>
        <summary>
          Exportaciones anteriores · {(k.presentationExports ?? []).length}
        </summary>
        <p className={m.muted}>
          Los manifests son vistas previas de contenido. Solo una exportación
          confirmada puede mostrar un archivo o enlace generado.
        </p>
        {!(k.presentationExports ?? []).length ? (
          <p>No hay versiones guardadas.</p>
        ) : (
          (k.presentationExports ?? [])
            .slice()
            .reverse()
            .map((e) => (
              <article key={e.id} className={m.row}>
                <div>
                  <strong>
                    Versión {e.version} ·{" "}
                    {e.mode === "client" ? "Para cliente" : "Borrador interno"}
                  </strong>
                  <p>
                    {e.status === "preview"
                      ? "Vista previa guardada · archivo no generado"
                      : e.status === "ready"
                        ? "Archivo generado"
                        : e.status === "failed"
                          ? "Falló la exportación"
                          : "Generación pendiente"}{" "}
                    · {e.generatedAt}
                  </p>
                  {presentationIsStale(k, active, e) ? (
                    <p className={m.notice}>
                      Existe una versión más reciente de los datos
                    </p>
                  ) : null}
                  {e.error ? <p role="alert">{e.error}</p> : null}
                </div>
                <div className={m.actions}>
                  <button
                    className={buttonClass("ghost", true)}
                    onClick={() =>
                      onOpen ? onOpen(e.manifest) : setView(e.manifest)
                    }
                  >
                    Ver manifest v{e.version}
                  </button>
                  {e.status === "ready" && e.googleSlidesUrl ? (
                    <>
                      <ExternalLink
                        url={e.googleSlidesUrl}
                        label="Abrir en Google Slides"
                      />
                      <button
                        className={buttonClass("ghost", true)}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              e.googleSlidesUrl!,
                            );
                            notify("Enlace copiado");
                          } catch {
                            notify("No se pudo copiar el enlace", "error");
                          }
                        }}
                      >
                        Copiar enlace
                      </button>
                    </>
                  ) : null}
                  {e.status === "ready" && e.downloadUrl ? (
                    <ExternalLink url={e.downloadUrl} label="Descargar PPTX" />
                  ) : null}
                  <Link href={`/v2/clientes/${client.slug}?view=ficha`}>
                    Crear nueva versión desde Cuestionario
                  </Link>
                </div>
              </article>
            ))
        )}
      </details>
      {view ? (
        <ManifestPreview
          manifest={view}
          onChange={setView}
          onClose={() => setView(null)}
        />
      ) : null}
    </>
  );
}
function ManifestPreview({
  manifest,
  onClose,
  onChange,
}: {
  manifest: PresentationManifest;
  onClose: () => void;
  onChange: (m: PresentationManifest) => void;
}) {
  const repeats = manifest.slides.filter(
    (s, i) =>
      manifest.slides.findIndex(
        (other) => other.templateSlideNumber === s.templateSlideNumber,
      ) < i,
  );
  return (
    <OSSidePanel
      persistentFooter
      label="Vista previa de la presentación"
      heading={<h2>Manifest · {manifest.clientName}</h2>}
      onClose={onClose}
      footer={
        <button className={buttonClass("secondary")} onClick={onClose}>
          Volver al cuestionario
        </button>
      }
    >
      {manifest.mode === "internal-draft" ? (
        <p className={m.notice}>{DRAFT_WATERMARK}</p>
      ) : null}
      <p>
        Vista previa de contenido y estructura. No es una simulación visual del
        PPT ni un archivo generado.
      </p>
      <p>
        Plantilla: {manifest.templateVersion} · Datos:{" "}
        {manifest.discoveryVersion} · {manifest.generatedAt}
      </p>
      <p>
        Servicios activos:{" "}
        {manifest.includedServiceIds.map(serviceLabel).join(" · ") || "Ninguno"}
      </p>
      <p>
        {manifest.slides.length} slides incluidas ·{" "}
        {manifest.removedSlides.length} originales eliminadas · {repeats.length}{" "}
        duplicaciones
      </p>
      <details>
        <summary>Slides eliminadas</summary>
        <ul>
          {manifest.removedSlides.map((s) => (
            <li key={s.slide}>
              Página {s.slide}: {s.reason}
            </li>
          ))}
        </ul>
      </details>
      <details>
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
        <summary>Advertencias no críticas · {manifest.warnings.length}</summary>
        <ul>
          {manifest.warnings.map((warning, i) => (
            <li key={i}>{warning}</li>
          ))}
        </ul>
      </details>
      {manifest.mode === "client" ? (
        <label className={m.field}>
          <span>
            <input
              type="checkbox"
              checked={manifest.warningsConfirmed}
              disabled={manifest.missingFields.length > 0}
              onChange={(e) =>
                onChange({ ...manifest, warningsConfirmed: e.target.checked })
              }
            />{" "}
            Revisé y acepto las advertencias no críticas para esta versión
          </span>
        </label>
      ) : null}
      <ol className={m.manifestList}>
        {manifest.slides.map((slide) => (
          <li className={m.card} key={slide.outputOrder}>
            <h3>
              {slide.outputOrder}. {slide.title}
            </h3>
            <p className={m.muted}>
              Master: página {slide.templateSlideNumber}
              {slide.repeatEntityId
                ? ` · Registro ${slide.repeatEntityId}`
                : ""}{" "}
              · Instrucciones y roles eliminados
            </p>
            <details>
              <summary>Ver contenido de la slide</summary>
              {Object.entries(slide.replacements).map(([key, value]) => (
                <p key={key}>{value || "Sin contenido"}</p>
              ))}
              {slide.images.map((image) => (
                <p className={m.muted} key={image.templateObjectKey}>
                  {image.action === "keep"
                    ? "Conservar"
                    : image.action === "replace"
                      ? "Reemplazar"
                      : "Eliminar recuadro"}
                  : {image.description}
                </p>
              ))}
            </details>
          </li>
        ))}
      </ol>
    </OSSidePanel>
  );
}
