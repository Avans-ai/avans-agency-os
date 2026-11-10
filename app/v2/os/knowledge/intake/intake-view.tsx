"use client";
import { useEffect, useRef, useState } from "react";
import type { OsClient } from "../../os-data";
import { buttonClass } from "../../ui";
import { useOsStore } from "../../os-store";
import { OSSidePanel } from "../../overlays";
import { useKnowledge } from "../use-knowledge";
import { newSource, contentHash } from "../sources";
import { newId, type KnowledgeSource } from "../types";
import { ExternalLink, formatValue } from "../shared-ui";
import { questionnaireTemplate, type AnswerValue } from "../questionnaire";
import {
  extractSource,
  bytesHash,
  validateFile,
  INTAKE_LIMITS,
  intakeAccept,
  sanitizeFileName,
} from "./extraction";
import { extractPdf } from "./pdf-browser";
import {
  addIntakeSource,
  addSuggestions,
  editSuggestion,
  reviewSuggestions,
  suggestionConflicts,
  questionnaireSourceCoverage,
} from "./mutations";
import {
  analyzeSources,
  DemoAnalysisProvider,
  demoSourceTexts,
  analysisInput,
  mapAnalysisOutput,
  UnconfiguredAnalysisProvider,
} from "./analysis";
import {
  processingLabels,
  type ProcessingStatus,
  type QuestionnaireAnswerSuggestion,
} from "./types";
import m from "../knowledge.module.css";
const questions = questionnaireTemplate.sections.flatMap((s) => s.questions);
export function IntakeView({
  client,
  beforeReview,
  onResponsesChanged,
}: {
  client: OsClient;
  beforeReview: () => boolean;
  onResponsesChanged: () => void;
}) {
  const { k, editable, mutate, context, latest } = useKnowledge(client);
  const { notify } = useOsStore();
  const [jobs, setJobs] = useState<
    { id: string; name: string; status: ProcessingStatus; error?: string }[]
  >([]);
  const [busy, setBusy] = useState(false),
    [title, setTitle] = useState(""),
    [text, setText] = useState(""),
    [url, setUrl] = useState("");
  const [kind, setKind] = useState<KnowledgeSource["type"]>("document");
  const [sourceModal, setSourceModal] = useState<KnowledgeSource | null>(null);
  const [manual, setManual] = useState<KnowledgeSource | null>(null),
    [editing, setEditing] = useState<QuestionnaireAnswerSuggestion | null>(
      null,
    );
  const [selected, setSelected] = useState<string[]>([]),
    [reviewed, setReviewed] = useState<string[]>([]),
    [showAll, setShowAll] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const coverage = questionnaireSourceCoverage(k),
    sources = k.sources.filter((s) => !!s.intake);
  const suggestions = (k.answerSuggestions ?? []).filter(
    (s) => showAll || s.status === "pending",
  );
  async function files(list: File[]) {
    if (!editable || busy) return;
    if (list.length > INTAKE_LIMITS.files) {
      notify("El lote admite hasta 6 archivos.", "error");
      return;
    }
    setBusy(true);
    const batch = list.map((file) => ({
      file,
      id: newId(),
      name: sanitizeFileName(file.name),
      status: "pending" as ProcessingStatus,
    }));
    setJobs(batch);
    const status = (id: string, value: ProcessingStatus, error?: string) =>
      setJobs((rows) =>
        rows.map((r) => (r.id === id ? { ...r, status: value, error } : r)),
      );
    for (const job of batch) {
      if (!alive.current) break;
      let source: KnowledgeSource = {
        ...newSource(client.slug, context()),
        id: job.id,
        title: job.name,
        type: kind,
        mimeType: job.file.type,
        visibility: "managers" as const,
        intake: {
          status: "pending" as ProcessingStatus,
          fileName: job.name,
          size: job.file.size,
          warnings: [] as string[],
          originalStored: false as const,
        },
      };
      try {
        validateFile(job.file);
        status(job.id, "extracting");
        const bytes = new Uint8Array(await job.file.arrayBuffer());
        const hash = await bytesHash(bytes);
        if (latest().sources.some((s) => s.contentHash === hash))
          throw new Error("Archivo duplicado: ya existe en este cliente.");
        const result = await extractSource(
          source.id,
          job.file,
          bytes,
          extractPdf,
        );
        if (!alive.current) break;
        source = {
          ...source,
          contentHash: hash,
          rawText: result.rawText,
          metadata: result.metadata,
          status: result.warnings.length ? "needs-review" : "imported",
          intake: {
            ...source.intake!,
            status: result.warnings.length ? "needs-review" : "ready",
            warnings: result.warnings,
            extractedAt: context().at,
          },
        };
        if (mutate((s, c) => addIntakeSource(s, source, c)))
          status(job.id, source.intake!.status);
        else
          status(
            job.id,
            "failed",
            "No se pudo guardar la fuente; revisá el aviso de almacenamiento.",
          );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo extraer el contenido del archivo.";
        status(job.id, "failed", message);
        if (!/duplicad/i.test(message) && alive.current)
          mutate((s, c) =>
            addIntakeSource(
              s,
              {
                ...source,
                error: message,
                status: "failed",
                intake: { ...source.intake!, status: "failed" },
              },
              c,
            ),
          );
      }
    }
    if (alive.current) setBusy(false);
  }
  async function register() {
    if (!editable || busy) return;
    try {
      if (!title.trim()) throw new Error("Ingresá el título de la fuente.");
      if (!text.trim() && !url.trim())
        throw new Error("Pegá contenido o agregá una URL.");
      if (text.length > INTAKE_LIMITS.textCharacters)
        throw new Error("El texto supera el límite de 120.000 caracteres.");
      let externalUrl = "";
      if (url) {
        const parsed = new URL(url);
        if (
          !["https:", "http:"].includes(parsed.protocol) ||
          parsed.username ||
          parsed.password
        )
          throw new Error("Ingresá una URL HTTP/HTTPS sin credenciales.");
        externalUrl = parsed.href;
      }
      const source = {
        ...newSource(client.slug, context()),
        title: title.trim(),
        type: externalUrl ? ("website" as const) : kind,
        rawText: text.trim(),
        externalUrl,
        contentHash: await contentHash(text.trim() || externalUrl),
        visibility: "managers" as const,
        status: text.trim() ? ("imported" as const) : ("needs-review" as const),
        intake: {
          status: text.trim() ? ("ready" as const) : ("needs-review" as const),
          warnings: text.trim()
            ? []
            : [
                "La URL se registró como referencia. La extracción web no está configurada; pegá el texto autorizado.",
              ],
          originalStored: false as const,
        },
      };
      if (mutate((s, c) => addIntakeSource(s, source, c))) {
        setTitle("");
        setText("");
        setUrl("");
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "URL no válida", "error");
    }
  }
  async function demo() {
    if (!editable || !beforeReview()) return;
    setBusy(true);
    const ids: string[] = [];
    try {
      for (const [i, rawText] of demoSourceTexts.entries()) {
        const id = `intake-demo-${i}`,
          existing = latest().sources.find((s) => s.id === id);
        ids.push(id);
        if (existing) continue;
        const source = {
          ...newSource(client.slug, context()),
          id,
          title: `DEMO · ${i ? "Reunión con información en conflicto" : "Ficha de empresa"}`,
          rawText,
          contentHash: await contentHash(rawText),
          demo: true,
          visibility: "managers" as const,
          intake: {
            status: "ready" as const,
            warnings: [
              "Fuente ficticia para probar el flujo. No representa datos del cliente.",
            ],
            originalStored: false as const,
          },
        };
        if (!mutate((s, c) => addIntakeSource(s, source, c))) return;
      }
      mutate((s) => ({
        ...s,
        sources: s.sources.map((source) =>
          ids.includes(source.id) && source.intake
            ? {
                ...source,
                intake: { ...source.intake!, status: "analyzing" as const },
              }
            : source,
        ),
      }));
      const result = await analyzeSources(
        latest(),
        ids,
        new DemoAnalysisProvider(),
        context(),
        AbortSignal.timeout(15000),
      );
      if (alive.current) mutate((s, c) => addSuggestions(s, result, c));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falló el análisis DEMO";
      if (alive.current)
        mutate((s, c) => ({
          ...s,
          sources: s.sources.map((source) =>
            ids.includes(source.id) && source.intake
              ? {
                  ...source,
                  error: message,
                  intake: { ...source.intake, status: "failed" as const },
                }
              : source,
          ),
          audit: [
            ...s.audit,
            {
              id: newId(),
              at: c.at,
              actor: c.actor,
              action: `Falló el análisis DEMO: ${message}`,
            },
          ],
        }));
      notify(message, "error");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  function review(
    ids: string[],
    decision: "approve" | "reject" | "ask",
    batch = false,
    highConfidenceOnly = false,
  ) {
    if (!beforeReview()) return;
    if (
      mutate((s, c) =>
        reviewSuggestions(s, ids, decision, c, {
          batch,
          highConfidenceOnly,
          explicitReview: ids.length === 1 && reviewed.includes(ids[0]),
        }),
      )
    ) {
      setSelected([]);
      onResponsesChanged();
    }
  }
  return (
    <div className={m.root}>
      <div className={m.metrics} aria-label="Cobertura por fuentes">
        {[
          [coverage.manual, "Manuales"],
          [coverage.fromSources, "Desde fuentes"],
          [coverage.pending, "Sugerencias pendientes"],
          [coverage.withoutEvidence, "Sin evidencia"],
          [coverage.ask, "Consultar al cliente"],
          [coverage.conflicts, "Conflictos"],
        ].map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <details className={`${m.card} ${m.intakeHero}`} id="company-intake">
        <summary>Cargar información de la empresa</summary>
        <p>
          Reuní el material disponible. El contenido extraído queda en este
          navegador; los originales no están almacenados ni sincronizados.
        </p>
        <div
          className={m.dropzone}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void files(Array.from(e.dataTransfer.files));
          }}
        >
          <strong>Arrastrá tus archivos acá</strong>
          <label className={m.field}>
            O seleccioná varios archivos
            <input
              type="file"
              multiple
              accept={intakeAccept}
              disabled={!editable || busy}
              onChange={(e) => {
                void files(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
          </label>
          <small>
            Hasta 6 archivos por lote · 10 MB por archivo · PDF hasta 100
            páginas · 120.000 caracteres por fuente · 600.000 por cliente. PDF,
            DOCX, PPTX, XLSX, CSV, TXT, Markdown, PNG, JPG y WEBP.
          </small>
        </div>
        <label className={m.field}>
          Tipo de material
          <select
            disabled={!editable}
            value={kind}
            onChange={(e) => setKind(e.target.value as KnowledgeSource["type"])}
          >
            <option value="document">Documento o presentación</option>
            <option value="catalog">Catálogo / ficha de producto</option>
            <option value="brochure">Brochure</option>
            <option value="meeting-manual-note">Resumen de reunión</option>
            <option value="manual">Fuente manual</option>
          </select>
        </label>
        {jobs.length ? (
          <ul aria-live="polite">
            {jobs.map((j) => (
              <li key={j.id}>
                {j.name}: {processingLabels[j.status]}
                {j.error ? ` · ${j.error}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
        <details>
          <summary>Pegar texto, agregar URL o registrar fuente manual</summary>
          <label className={m.field}>
            Título de la fuente
            <input
              value={title}
              disabled={!editable}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className={m.field}>
            Texto disponible
            <textarea
              value={text}
              disabled={!editable}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <label className={m.field}>
            URL de referencia
            <input
              type="url"
              value={url}
              disabled={!editable}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <button
            className={buttonClass("primary")}
            disabled={!editable || busy}
            onClick={register}
          >
            Registrar fuente
          </button>
        </details>
        <p className={m.muted}>
          Google Drive y Google Meet: Google Workspace no conectado. Las URLs se
          registran como referencia, sin extracción web automática. OCR de
          imágenes no configurado.
        </p>
      </details>
      <details className={m.card} id="processed-sources">
        <summary>Fuentes procesadas · {sources.length}</summary>
        <div className={m.notice}>
          <strong>Motor de análisis no configurado</strong>
          <p>
            No hay un proveedor de IA conectado. Podés revisar el texto y
            proponer respuestas manualmente con evidencia.
          </p>
          <button disabled className={buttonClass("secondary", true)}>
            Analizar con IA
          </button>
        </div>
        <button
          disabled={!editable || busy}
          className={buttonClass("secondary", true)}
          onClick={demo}
        >
          Probar sugerencias DEMO
        </button>
        {!sources.length ? (
          <p>Sin material cargado todavía.</p>
        ) : (
          sources.map((s) => (
            <article className={m.row} key={s.id}>
              <div>
                <strong>{s.title}</strong>
                <p>
                  {processingLabels[s.intake!.status]} ·{" "}
                  {s.rawText.length.toLocaleString("es-AR")} caracteres
                  {s.demo ? " · DEMO" : ""}
                </p>
                {s.error ? (
                  <p role="alert" className={m.error}>
                    {s.error}
                  </p>
                ) : null}
                {s.intake!.warnings.map((w) => (
                  <p className={m.muted} key={w}>
                    {w}
                  </p>
                ))}
              </div>
              <div className={m.actions}>
                <button
                  className={buttonClass("ghost", true)}
                  onClick={() => setSourceModal(s)}
                >
                  Abrir fuente
                </button>
                <button
                  className={buttonClass("secondary", true)}
                  disabled={!editable || !s.rawText}
                  onClick={() => setManual(s)}
                >
                  Proponer respuesta manual
                </button>
              </div>
            </article>
          ))
        )}
      </details>
      <details className={m.card} id="answer-suggestions">
        <summary>Respuestas sugeridas · {coverage.pending} pendientes</summary>
        <p>
          Una aprobación completa el cuestionario. Después podés generar
          propuestas para Discovery y revisar su impacto en Benchmark y Plan.
        </p>
        <div className={m.actions}>
          <button
            className={buttonClass("secondary", true)}
            disabled={!editable || !selected.length}
            onClick={() => review(selected, "approve", true)}
          >
            Aprobar seleccionadas
          </button>
          <button
            className={buttonClass("secondary", true)}
            disabled={!editable || !selected.length}
            onClick={() => review(selected, "approve", true, true)}
          >
            Aplicar seleccionadas de alta confianza
          </button>
          <label>
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />{" "}
            Mostrar historial
          </label>
        </div>
        {!suggestions.length ? (
          <p>
            Sin sugerencias pendientes. Las preguntas sin evidencia quedan
            disponibles para consultar al cliente.
          </p>
        ) : (
          suggestions.map((s) => {
            const conflict = suggestionConflicts(k, s),
              hasConflict = !!(
                conflict.sourceChanged ||
                conflict.currentChanged ||
                conflict.existingAnswer ||
                conflict.alternatives.length
              ),
              canBatch =
                s.status === "pending" && s.impact !== "high" && !hasConflict;
            return (
              <article className={m.card} key={s.id}>
                <h4>{questions.find((q) => q.id === s.questionId)?.label}</h4>
                <p>
                  {s.demo ? "DEMO · " : ""}
                  {Math.round(s.confidence * 100)}% de confianza · Impacto{" "}
                  {{ high: "alto", medium: "medio", low: "bajo" }[s.impact]} ·{" "}
                  {s.status === "applied"
                    ? "Aplicada al cuestionario"
                    : s.status === "rejected"
                      ? "Rechazada"
                      : s.status === "approved"
                        ? "Aprobada"
                        : "Pendiente"}
                </p>
                <div className={m.diff}>
                  <div>
                    <strong>Respuesta actual</strong>
                    <pre className={m.pre}>
                      {formatValue(
                        k.questionnaire.responses[s.questionId]?.value,
                      )}
                    </pre>
                  </div>
                  <div>
                    <strong>Respuesta propuesta</strong>
                    <pre className={m.pre}>{formatValue(s.proposedValue)}</pre>
                  </div>
                </div>
                <p>{s.explanation}</p>
                <details>
                  <summary>Ver evidencia</summary>
                  {s.evidence.map((e, i) => (
                    <div key={i}>
                      <p>
                        {
                          k.sources.find((source) => source.id === e.sourceId)
                            ?.title
                        }{" "}
                        ·{" "}
                        {k.sources.find((source) => source.id === e.sourceId)
                          ?.occurredAt ||
                          k.sources.find((source) => source.id === e.sourceId)
                            ?.importedAt}
                        {e.page ? ` · Página ${e.page}` : ""}
                      </p>
                      <blockquote>{e.excerpt}</blockquote>
                      <button
                        className={buttonClass("ghost", true)}
                        onClick={() =>
                          setSourceModal(
                            k.sources.find(
                              (source) => source.id === e.sourceId,
                            ) ?? null,
                          )
                        }
                      >
                        Abrir fuente
                      </button>
                    </div>
                  ))}
                </details>
                {hasConflict ? (
                  <div className={m.notice}>
                    <strong>Conflicto: requiere decisión del PM</strong>
                    {conflict.sourceChanged ? (
                      <p>
                        La fuente cambió. Revisala y generá una nueva sugerencia
                        antes de aprobar.
                      </p>
                    ) : null}
                    {conflict.existingAnswer || conflict.currentChanged ? (
                      <p>
                        La respuesta vigente es diferente o cambió desde el
                        análisis.
                      </p>
                    ) : null}
                    {conflict.alternatives.map((other) => (
                      <p key={other.id}>
                        {formatValue(other.proposedValue)} ·{" "}
                        {other.sourceIds
                          .map(
                            (id) =>
                              k.sources.find((source) => source.id === id)
                                ?.title,
                          )
                          .join(" · ")}{" "}
                        · {other.createdAt}
                      </p>
                    ))}
                  </div>
                ) : null}
                {s.status === "pending" ? (
                  <>
                    <label>
                      <input
                        type="checkbox"
                        disabled={!canBatch || !editable}
                        checked={selected.includes(s.id)}
                        onChange={(e) =>
                          setSelected((ids) =>
                            e.target.checked
                              ? [...ids, s.id]
                              : ids.filter((id) => id !== s.id),
                          )
                        }
                      />{" "}
                      Seleccionar para lote
                    </label>
                    {s.impact === "high" || hasConflict ? (
                      <label className={m.field}>
                        <span>
                          <input
                            type="checkbox"
                            disabled={!editable}
                            checked={reviewed.includes(s.id)}
                            onChange={(e) =>
                              setReviewed((ids) =>
                                e.target.checked
                                  ? [...ids, s.id]
                                  : ids.filter((id) => id !== s.id),
                              )
                            }
                          />{" "}
                          Revisé este cambio y las fuentes en conflicto o de
                          alto impacto
                        </span>
                      </label>
                    ) : null}
                    <div className={m.actions}>
                      <button
                        className={buttonClass("primary", true)}
                        disabled={!editable}
                        onClick={() => review([s.id], "approve")}
                      >
                        Aprobar respuesta
                      </button>
                      <button
                        className={buttonClass("secondary", true)}
                        disabled={!editable}
                        onClick={() => setEditing(s)}
                      >
                        Editar antes de aprobar
                      </button>
                      <button
                        className={buttonClass("ghost", true)}
                        disabled={!editable}
                        onClick={() => review([s.id], "reject")}
                      >
                        Rechazar respuesta
                      </button>
                      <button
                        className={buttonClass("ghost", true)}
                        disabled={!editable}
                        onClick={() => review([s.id], "ask")}
                      >
                        Preguntar al cliente
                      </button>
                    </div>
                  </>
                ) : (
                  <p>
                    {s.decisionNote} · {s.reviewedBy} · {s.reviewedAt}
                  </p>
                )}
              </article>
            );
          })
        )}
      </details>
      {sourceModal ? (
        <OSSidePanel
          persistentFooter
          label="Fuente de información"
          heading={<h2>{sourceModal.title}</h2>}
          onClose={() => setSourceModal(null)}
        >
          <p>
            {sourceModal.demo ? "DEMO · " : ""}Original no almacenado. Texto
            extraído conservado localmente.
          </p>
          {sourceModal.externalUrl ? (
            <ExternalLink url={sourceModal.externalUrl} />
          ) : null}
          <pre className={m.pre}>
            {sourceModal.rawText || sourceModal.error || "Sin texto extraíble"}
          </pre>
        </OSSidePanel>
      ) : null}
      {manual || editing ? (
        <SuggestionEditor
          source={manual}
          suggestion={editing}
          onClose={() => {
            setManual(null);
            setEditing(null);
          }}
          onSave={(questionId, value, excerpt) => {
            if (!beforeReview()) return false;
            try {
              let ok = false;
              if (editing)
                ok = mutate((s, c) => editSuggestion(s, editing.id, value, c));
              else if (manual) {
                const state = latest(),
                  provider = {
                    ...new UnconfiguredAnalysisProvider(),
                    id: "manual-pm",
                    label: "Propuesta manual del PM",
                    configured: true,
                    analyze: async () => ({}),
                  };
                const input = analysisInput(state, [manual.id]);
                const mapped = mapAnalysisOutput(
                  state,
                  input,
                  {
                    suggestions: [
                      {
                        questionId,
                        proposedValue: value,
                        explanation:
                          "Respuesta propuesta manualmente por el PM a partir de la fuente citada.",
                        confidence: 1,
                        evidence: [{ sourceId: manual.id, excerpt }],
                      },
                    ],
                  },
                  provider,
                  context(),
                );
                ok = mutate((s, c) => addSuggestions(s, mapped, c));
              }
              return ok;
            } catch (error) {
              notify(
                error instanceof Error
                  ? error.message
                  : "No se pudo proponer la respuesta",
                "error",
              );
              return false;
            }
          }}
        />
      ) : null}
    </div>
  );
}
function SuggestionEditor({
  source,
  suggestion,
  onClose,
  onSave,
}: {
  source: KnowledgeSource | null;
  suggestion: QuestionnaireAnswerSuggestion | null;
  onClose: () => void;
  onSave: (questionId: string, value: AnswerValue, excerpt: string) => boolean;
}) {
  const [questionId, setQuestionId] = useState(
    suggestion?.questionId ?? questions[0].id,
  );
  const [value, setValue] = useState(
    suggestion
      ? typeof suggestion.proposedValue === "string"
        ? suggestion.proposedValue
        : JSON.stringify(suggestion.proposedValue, null, 2)
      : "",
  );
  const [excerpt, setExcerpt] = useState(
      suggestion?.evidence[0]?.excerpt ?? "",
    ),
    [error, setError] = useState("");
  const q = questions.find((q) => q.id === questionId)!;
  return (
    <OSSidePanel
      persistentFooter
      label="Editar respuesta sugerida"
      heading={
        <h2>
          {suggestion
            ? "Editar antes de aprobar"
            : "Proponer respuesta con evidencia"}
        </h2>
      }
      onClose={onClose}
      footer={
        <button className={buttonClass("primary")} form="suggestion-form">
          Guardar sugerencia
        </button>
      }
    >
      <form
        id="suggestion-form"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const parsed =
              q.responseType === "repeatable" ? JSON.parse(value) : value;
            if (onSave(questionId, parsed, excerpt)) onClose();
          } catch {
            setError(
              "La colección debe ser un JSON válido: una lista de registros.",
            );
          }
        }}
      >
        <label className={m.field}>
          Pregunta
          <select
            value={questionId}
            disabled={!!suggestion}
            onChange={(e) => {
              setQuestionId(e.target.value);
              setValue("");
            }}
          >
            {questions.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>
        </label>
        <label className={m.field}>
          Respuesta propuesta
          <textarea
            aria-label="Respuesta propuesta"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        {q.responseType === "repeatable" ? (
          <p className={m.muted}>
            Lista JSON. Campos admitidos:{" "}
            {q.fields?.map((f) => f.key).join(", ")}. Los vínculos usan IDs de
            registros existentes.
          </p>
        ) : null}
        {!suggestion ? (
          <>
            <label className={m.field}>
              Fragmento exacto de evidencia
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
              />
            </label>
            <details>
              <summary>Texto de la fuente</summary>
              <pre className={m.pre}>{source?.rawText}</pre>
            </details>
          </>
        ) : null}
        {error ? <p role="alert">{error}</p> : null}
      </form>
    </OSSidePanel>
  );
}
