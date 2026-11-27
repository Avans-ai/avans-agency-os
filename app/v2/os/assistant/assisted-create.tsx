"use client";

/* Formulario de creación asistido: configuración a la izquierda y asistente a la
 * derecha (en mobile, sección plegable). El asistente nunca crea ni activa nada:
 * completa campos del formulario y el usuario revisa, edita y confirma. */
import { useEffect, useMemo, useRef, useState } from "react";
import { CURRENT_USER, type OsClient, type ServiceId } from "../os-data";
import { useOsStore } from "../os-store";
import { OSSidePanel } from "../overlays";
import { Badge, buttonClass } from "../ui";
import { RecordForm } from "../modules/collection-view";
import { newLabel } from "../modules/collections";
import type { ModuleData } from "../modules/store";
import type { CollectionDef, ModuleRecord } from "../modules/types";
import s from "../os.module.css";
import a from "./assistant.module.css";
import { useAssistantContext, type AssistantContextData } from "./context";
import { similarWork } from "./engine";
import { profileFields, type AssistantProfile } from "./profiles";
import { useAssistantStatus, useSuggestionLog, type StoredSuggestion, type SuggestionChange } from "./store";
import { SOURCE_KIND_LABEL, type AssistantRequest, type AssistantResult } from "./types";

type Phase = "idle" | "generating" | "ready" | "error" | "not-configured";
type Candidate = StoredSuggestion & { live: boolean };

const ORIGIN_LABEL = { manual: "Recomendación manual", demo: "Recomendación de demostración", benchmark: "Hallazgo de Benchmark" } as const;

function recommendationCandidates(profile: AssistantProfile, client: OsClient, ctx: AssistantContextData): Candidate[] {
  const now = new Date().toISOString();
  return ctx.recommendations.map((item) => ({
    id: `REC-${item.id}`,
    type: ORIGIN_LABEL[item.origin],
    title: item.title,
    description: item.rationale,
    rationale: `${ORIGIN_LABEL[item.origin]} vigente para este módulo (origen: ${item.source}, estado: ${item.status}${item.date ? `, ${item.date}` : ""}). Se usa como punto de partida: no fue generada por IA.`,
    proposedFields: {
      [profile.fromRecommendation.titleField]: item.title,
      [profile.fromRecommendation.detailField]: [item.rationale, `Origen: ${item.source} · ${item.id}`].filter(Boolean).join("\n\n"),
    },
    sourceReferences: [item.ref],
    warnings: item.origin === "demo" ? ["Es una recomendación de demostración: validala antes de usarla."] : [],
    similarTo: [],
    clientSlug: client.slug,
    serviceId: profile.serviceId,
    profileId: profile.id,
    operation: profile.operation,
    origin: "recomendacion",
    recommendationId: item.id,
    recommendationSource: item.source,
    user: CURRENT_USER.name,
    createdAt: now,
    updatedAt: now,
    status: "suggested",
    appliedFields: [],
    changes: [],
    history: [],
    live: false,
  }));
}

export function AssistedCreatePanel({
  client,
  serviceId,
  def,
  profile,
  refs,
  titleKeyOf,
  initial,
  onCreate,
  onClose,
  existingHref,
}: {
  client: OsClient;
  serviceId: ServiceId;
  def: CollectionDef;
  profile: AssistantProfile;
  refs: ModuleData;
  titleKeyOf: (collection: string) => string;
  initial?: Record<string, string>;
  onCreate: (values: Record<string, string>, note: string) => ModuleRecord | null;
  onClose: () => void;
  /** Enlace al registro existente (se abre en otra pestaña para no perder el borrador). */
  existingHref?: (recordId: string) => string;
}) {
  const { notify, role, servicesOf } = useOsStore();
  const activeServices = servicesOf(client.slug);
  const ctx = useAssistantContext(client, profile, activeServices);
  const { status, error: statusError } = useAssistantStatus();
  const log = useSuggestionLog(client.slug, serviceId);
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...profile.initial, ...initial }));
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [batch, setBatch] = useState<string[]>([]);
  const [missingFromAi, setMissingFromAi] = useState<string[]>([]);
  const [brief, setBrief] = useState("");
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [confirm, setConfirm] = useState<{ id: string; fields: string[]; conflicts: string[] } | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);
  // En mobile el asistente arranca plegado para no tapar el formulario (el panel solo se monta en el cliente).
  const [assistantOpen, setAssistantOpen] = useState(() => typeof window === "undefined" || !window.matchMedia?.("(max-width: 1023px)").matches);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const controller = useRef<AbortController | null>(null);
  const fields = useMemo(() => new Map(profileFields(profile).map((field) => [field.key, field])), [profile]);
  const labelOf = (key: string) => fields.get(key)?.label ?? def.fields.find((field) => field.key === key)?.label ?? key;
  const sourceByRef = useMemo(() => new Map(ctx.sources.map((source) => [source.ref, source])), [ctx.sources]);

  useEffect(() => () => controller.current?.abort(), []);

  const stored = new Map(log.items.map((item) => [item.id, item]));
  const aiCandidates: Candidate[] = batch.map((id) => stored.get(id)).filter((item): item is StoredSuggestion => Boolean(item)).map((item) => ({ ...item, live: true }));
  const recCandidates = recommendationCandidates(profile, client, ctx).map((candidate) => {
    const saved = stored.get(candidate.id);
    return saved ? { ...candidate, ...saved, live: false } : candidate;
  });
  const all = [...aiCandidates, ...recCandidates];
  const visible = all.filter((item) => showDismissed || item.status !== "dismissed");
  const dismissedCount = all.filter((item) => item.status === "dismissed").length;

  function isApplied(item: StoredSuggestion) {
    return item.status === "applied" && item.appliedFields.length > 0 && item.appliedFields.every((key) => (values[key] ?? "") === item.proposedFields[key]);
  }
  const appliedNow = all.filter(isApplied);

  async function generate() {
    if (!status?.configured) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setPhase("generating");
    setMessage("");
    const request: AssistantRequest = {
      profileId: profile.id,
      clientSlug: client.slug,
      clientName: client.name,
      serviceId,
      operation: profile.operation,
      user: { name: CURRENT_USER.name, role },
      draft: Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim())),
      brief: brief.trim() || undefined,
      sources: ctx.sources,
    };
    try {
      const response = await fetch("/api/assistant/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request), signal: abort.signal });
      const body = (await response.json().catch(() => ({}))) as Partial<AssistantResult> & { error?: string; message?: string };
      if (response.status === 503 && body.error === "AI_NOT_CONFIGURED") {
        setPhase("not-configured");
        return;
      }
      if (!response.ok || !Array.isArray(body.suggestions)) {
        setPhase("error");
        setMessage(body.message ?? `El asistente no respondió (${response.status}).`);
        return;
      }
      const at = new Date().toISOString();
      const items: StoredSuggestion[] = body.suggestions
        .filter((item) => item && typeof item.id === "string")
        .map((item) => ({ ...item, clientSlug: client.slug, serviceId, profileId: profile.id, operation: profile.operation, origin: "ia", provider: body.provider, model: body.model, user: CURRENT_USER.name, createdAt: at, updatedAt: at, status: "suggested", appliedFields: [], changes: [], history: [{ at, user: CURRENT_USER.name, text: `Generada por ${body.provider ?? "IA"} · ${body.model ?? ""}`.trim() }] }));
      log.write((current) => [...items, ...current.filter((entry) => !items.some((item) => item.id === entry.id))]);
      setBatch(items.map((item) => item.id));
      setMissingFromAi(body.missingContext ?? []);
      setPhase("ready");
      if (!items.length) setMessage("El asistente no encontró ideas con fuentes suficientes. Revisá el contexto faltante.");
    } catch (error) {
      if (abort.signal.aborted) return;
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "Error de conexión con el asistente.");
    }
  }

  function apply(item: Candidate, keys: string[], mode: "replace" | "fill-empty" | "ask") {
    const usable = keys.filter((key) => item.proposedFields[key] !== undefined && def.fields.some((field) => field.key === key));
    if (!usable.length) return;
    const conflicts = usable.filter((key) => (values[key] ?? "").trim() && values[key] !== item.proposedFields[key] && values[key] !== profile.initial[key]);
    if (mode === "ask" && conflicts.length) {
      setConfirm({ id: item.id, fields: usable, conflicts });
      return;
    }
    const targets = mode === "fill-empty" ? usable.filter((key) => !conflicts.includes(key)) : usable;
    const changes: SuggestionChange[] = targets.map((key) => ({ field: key, before: values[key] ?? "", after: item.proposedFields[key] }));
    const next = { ...values };
    for (const key of targets) next[key] = item.proposedFields[key];
    setValues(next);
    setConfirm(null);
    const { live: _live, ...plain } = item;
    void _live;
    log.upsert({ ...plain, status: "applied", appliedFields: [...new Set([...item.appliedFields, ...targets])], changes: [...changes, ...item.changes] }, `Aplicó al formulario: ${targets.map(labelOf).join(", ")}`);
    notify(`Campos completados: ${targets.map(labelOf).join(", ")}. Revisalos antes de guardar.`);
  }

  function dismiss(item: Candidate) {
    const { live: _live, ...plain } = item;
    void _live;
    log.upsert({ ...plain, status: "dismissed" }, "Descartó la sugerencia");
  }

  function submit(next: Record<string, string>) {
    const used = all.filter((item) => item.status === "applied" && item.appliedFields.some((key) => next[key] === item.proposedFields[key]));
    const note = used.length
      ? `Creó ${def.singular} con sugerencias: ${used.map((item) => (item.origin === "ia" ? `${item.title} (IA · ${item.model ?? item.provider ?? ""})` : `${item.title} (${item.recommendationSource ?? "recomendación"} · ${item.recommendationId})`)).join("; ")}`
      : "";
    const record = onCreate(next, note);
    if (!record) return;
    for (const item of used) {
      const { live: _live, ...plain } = item;
      void _live;
      log.upsert({ ...plain, linkedRecordId: record.id }, `Convertida en ${def.singular} ${record.id}`);
    }
  }

  const statusLabel = !ctx.hydrated
    ? "Preparando contexto"
    : phase === "generating"
      ? "Generando sugerencia"
      : phase === "error"
        ? "Error"
        : phase === "not-configured" || (status && !status.configured)
          ? "Proveedor no configurado"
          : appliedNow.length
            ? "Sugerencia aplicada"
            : visible.length
              ? "Sugerencia disponible"
              : ctx.missing.length
                ? "Falta información"
                : "Listo para generar";
  const connected = Boolean(status?.configured) && phase !== "not-configured";
  const missing = [...new Set([...ctx.missing, ...missingFromAi])];
  const validatedCount = ctx.sources.filter((source) => source.status === "validado").length;
  const kinds = [...new Set(ctx.sources.map((source) => SOURCE_KIND_LABEL[source.kind]))];

  return (
    <OSSidePanel
      label={newLabel(def)}
      extraWide
      titleRef={titleRef}
      onClose={onClose}
      persistentFooter
      heading={<h2 ref={titleRef} tabIndex={-1} style={{ margin: 0, fontSize: 22, fontWeight: 500, color: "var(--av-text)" }}>{newLabel(def)}</h2>}
      footer={
        <>
          <button type="button" className={buttonClass("ghost")} onClick={onClose}>Cancelar</button>
          <button type="submit" form={`${def.id}-assisted-form`} className={buttonClass("primary")}>{values.estado === "Borrador" ? "Guardar borrador" : "Guardar en este navegador"}</button>
        </>
      }
    >
      <div className={a.grid}>
        <section className={a.formColumn} aria-labelledby={`${def.id}-config-title`}>
          <h3 id={`${def.id}-config-title`} className={a.columnTitle}>Configuración de {def.singular}</h3>
          <RecordForm def={def} initial={values} values={values} onValuesChange={setValues} refs={refs} titleKeyOf={titleKeyOf} formId={`${def.id}-assisted-form`} onSubmit={submit} />
          <p className={s.demoNote}>Se guarda en este navegador con cliente, módulo, usuario, fecha e historial (y las sugerencias usadas). Nada se publica ni se activa en plataformas externas. Sin sincronización entre usuarios.</p>
        </section>

        <aside className={a.assistant} aria-label={profile.title}>
          <details open={assistantOpen} onToggle={(event) => setAssistantOpen((event.target as HTMLDetailsElement).open)} className={a.assistantDetails}>
            <summary className={a.summary}>
              <span>{profile.title}</span>
              <Badge tone={statusLabel === "Error" ? "error" : statusLabel === "Sugerencia aplicada" ? "cool" : statusLabel === "Proveedor no configurado" || statusLabel === "Falta información" ? "peach" : "stone"}>{statusLabel}</Badge>
            </summary>
            <div className={a.assistantBody}>
              <header className={a.assistantHead}>
                <h3>{profile.title}</h3>
                <p role="status" aria-live="polite" className={a.state} data-state={statusLabel}>{statusLabel}</p>
              </header>

              {!connected ? (
                <div className={a.notice}>
                  <strong>Asistente IA pendiente de conexión</strong>
                  <p>{statusError ? "No se pudo consultar el estado del asistente." : status?.reason || (phase === "not-configured" ? "El servidor no tiene un proveedor de IA configurado." : "Consultando estado del proveedor…")} No se muestran ideas generadas por IA. Abajo figuran las recomendaciones vigentes del módulo, identificadas por su origen; podés usarlas como punto de partida o completar el formulario a mano.</p>
                </div>
              ) : (
                <div className={a.generate}>
                  <label className={s.field}>
                    <span>¿Qué buscás? (opcional)</span>
                    <input className={`${s.input} ${s.inputSm}`} value={brief} maxLength={600} onChange={(event) => setBrief(event.target.value)} placeholder="Ej.: generar demanda para la línea nueva en el segmento prioritario" />
                  </label>
                  <div className={a.row}>
                    <button type="button" className={buttonClass("dark", true)} onClick={generate} disabled={!ctx.hydrated || phase === "generating"}>{phase === "ready" || batch.length ? "Regenerar propuestas" : "Generar ideas"}</button>
                    {phase === "generating" ? <button type="button" className={buttonClass("ghost", true)} onClick={() => { controller.current?.abort(); setPhase("idle"); }}>Cancelar</button> : null}
                    <span className={s.demoNote}>{status?.provider} · {status?.model}</span>
                  </div>
                </div>
              )}

              {phase === "error" ? (
                <div className={a.error} role="alert">
                  <strong>El asistente no pudo responder.</strong> {message} Podés reintentar o seguir completando el formulario.
                  <div><button type="button" className={buttonClass("secondary", true)} onClick={generate}>Reintentar</button></div>
                </div>
              ) : message ? <p className={s.demoNote}>{message}</p> : null}

              <details className={a.context}>
                <summary>Contexto utilizado · {ctx.sources.length} fuentes ({validatedCount} validadas)</summary>
                <p className={s.demoNote}>Solo información de {client.name}. {kinds.join(" · ")}</p>
                <ul>
                  {ctx.sources.slice(0, 40).map((source) => (
                    <li key={source.ref}><span>{SOURCE_KIND_LABEL[source.kind]}</span> {source.label} <em>· {source.status}</em></li>
                  ))}
                </ul>
              </details>

              {missing.length ? (
                <div className={a.missing}>
                  <strong>Contexto faltante</strong>
                  <ul>{missing.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              ) : null}

              <div className={a.listHead}>
                <strong>{aiCandidates.length ? "Ideas sugeridas y recomendaciones vigentes" : "Recomendaciones vigentes del módulo"}</strong>
                {dismissedCount ? <button type="button" className={a.linkButton} onClick={() => setShowDismissed(!showDismissed)}>{showDismissed ? "Ocultar descartadas" : `Ver descartadas (${dismissedCount})`}</button> : null}
              </div>
              {visible.length ? (
                <ol className={a.list}>
                  {visible.map((item) => {
                    const keys = Object.keys(item.proposedFields);
                    const chosen = selected[item.id] ?? keys;
                    const applied = isApplied(item);
                    const edited = item.status === "applied" && !applied;
                    const similar = [
                      ...item.similarTo.map((ref) => ctx.existingWork.find((work) => work.ref === ref)).filter((work): work is AssistantContextData["existingWork"][number] => Boolean(work)),
                      ...similarWork(item.title, item.description, ctx.existingWork).map((match) => ctx.existingWork.find((work) => work.ref === match.ref)!),
                    ].filter((work, index, list) => list.findIndex((other) => other.ref === work.ref) === index && work.recordId !== item.linkedRecordId);
                    return (
                      <li key={item.id} className={a.card} data-status={item.status}>
                        <div className={a.cardHead}>
                          <div>
                            <span className={a.origin}>{item.origin === "ia" ? `Generada por IA · ${item.model ?? item.provider}` : item.type}</span>
                            <h4>{item.title}</h4>
                          </div>
                          {applied ? <Badge tone="cool">Sugerencia aplicada</Badge> : edited ? <Badge tone="peach">Aplicada · editada</Badge> : item.status === "dismissed" ? <Badge>Descartada</Badge> : null}
                        </div>
                        {item.description ? <p>{item.description}</p> : null}
                        {similar.length ? (
                          <div className={a.similar}>
                            <strong>Esta idea es similar a una iniciativa existente.</strong>
                            {similar.slice(0, 2).map((work) => (
                              <span key={work.ref}>
                                {work.label}
                                {existingHref ? <a className={a.linkButton} href={existingHref(work.recordId)} target="_blank" rel="noopener">Abrir<span className={s.srOnly}> {work.label} en otra pestaña</span></a> : null}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {item.warnings.length ? <ul className={a.warnings}>{item.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}
                        <details className={a.more}>
                          <summary>Ver fundamento</summary>
                          <p>{item.rationale || "Sin fundamento informado."}</p>
                        </details>
                        <details className={a.more}>
                          <summary>Ver fuentes ({item.sourceReferences.length})</summary>
                          <ul>
                            {item.sourceReferences.map((ref) => {
                              const source = sourceByRef.get(ref);
                              return <li key={ref}>{source ? <><span>{SOURCE_KIND_LABEL[source.kind]}</span> {source.label} <em>· {source.status}</em></> : ref}</li>;
                            })}
                          </ul>
                        </details>
                        <fieldset className={a.fields}>
                          <legend>Campos que completa</legend>
                          {keys.map((key) => (
                            <label key={key}>
                              <input
                                type="checkbox"
                                checked={chosen.includes(key)}
                                onChange={(event) => setSelected((current) => ({ ...current, [item.id]: event.target.checked ? [...chosen, key] : chosen.filter((entry) => entry !== key) }))}
                              />
                              <span><strong>{labelOf(key)}:</strong> {item.proposedFields[key].length > 140 ? `${item.proposedFields[key].slice(0, 139)}…` : item.proposedFields[key]}</span>
                            </label>
                          ))}
                        </fieldset>
                        {confirm?.id === item.id ? (
                          <div className={a.confirm} role="alertdialog" aria-label="Confirmar reemplazo">
                            <p>Vas a reemplazar valores que cargaste a mano: {confirm.conflicts.map(labelOf).join(", ")}.</p>
                            <div className={a.row}>
                              <button type="button" className={buttonClass("dark", true)} onClick={() => apply(item, confirm.fields, "replace")}>Reemplazar</button>
                              <button type="button" className={buttonClass("secondary", true)} onClick={() => apply(item, confirm.fields, "fill-empty")}>Solo completar vacíos</button>
                              <button type="button" className={buttonClass("ghost", true)} onClick={() => setConfirm(null)}>Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <div className={a.row}>
                            <button type="button" className={buttonClass("primary", true)} onClick={() => apply(item, keys, "ask")}>Aplicar sugerencia</button>
                            <button type="button" className={buttonClass("secondary", true)} disabled={!chosen.length} onClick={() => apply(item, chosen, "ask")}>Aplicar campos seleccionados</button>
                            {item.status !== "dismissed" ? <button type="button" className={buttonClass("ghost", true)} onClick={() => dismiss(item)}>Descartar sugerencia</button> : null}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className={s.demoNote}>{connected ? "Generá ideas para ver propuestas fundamentadas con las fuentes del cliente." : "No hay recomendaciones vigentes para este módulo."}</p>
              )}
            </div>
          </details>
        </aside>
      </div>
    </OSSidePanel>
  );
}
