"use client";
import { useState } from "react";
import type { OsClient } from "../os-data";
import { buttonClass } from "../ui";
import { OSSidePanel } from "../overlays";
import { fields, type EntityKind, type Field } from "../discovery/schema";
import { recordsOf } from "../discovery/model";
import {
  benchmarkBlueprints,
  planBlueprints,
  findingBlueprint,
  type KnowledgeField,
  type KnowledgeValue,
} from "./blueprints";
import { useKnowledge } from "./use-knowledge";
import {
  addProposals,
  editProposal,
  newProposal,
  proposalCurrent,
  reviewProposal,
} from "./proposals";
import { discoveryOf } from "./state";
import { FieldInput, formatValue, ExternalLink } from "./shared-ui";
import type {
  KnowledgeChangeProposal,
  KnowledgeModule,
  KnowledgeState,
} from "./types";
import m from "./knowledge.module.css";
const moduleLabels = {
  discovery: "Discovery",
  benchmark: "Benchmark",
  "marketing-plan": "Plan de Marketing",
};
export function proposalTargets(k: KnowledgeState, module: KnowledgeModule) {
  if (module === "discovery")
    return (Object.keys(fields) as EntityKind[]).flatMap((section) =>
      recordsOf(discoveryOf(k), section).map((row) => ({
        id: row.id,
        section,
        label: `${"name" in row ? row.name : section} · ${section}`,
        fields: fields[section] as readonly Field[],
      })),
    );
  if (module === "benchmark")
    return [
      ...k.benchmark.brands.flatMap((b) =>
        b.items.map((i) => ({
          id: i.id,
          section: i.section,
          label: `${b.name} · ${i.section}`,
          fields:
            benchmarkBlueprints.find((bp) => bp.id === i.section)?.fields ?? [],
        })),
      ),
      ...k.benchmark.findings.map((f) => ({
        id: f.id,
        section: "finding",
        label: String(f.values.statement || "Conclusión"),
        fields: findingBlueprint.fields,
      })),
    ];
  return Object.entries(k.plan.modules).flatMap(([service, items]) =>
    (items ?? []).map((i) => ({
      id: i.id,
      section: i.section,
      label: `${service} · ${i.section} · ${i.values.name || i.values.statement || i.id.slice(0, 6)}`,
      fields: planBlueprints.find((bp) => bp.id === i.section)?.fields ?? [],
    })),
  );
}
function asField(field: Field | KnowledgeField): KnowledgeField {
  return {
    ...field,
    kind:
      field.kind === "relation"
        ? "text"
        : field.kind === "date"
          ? "text"
          : (field.kind ?? "text"),
    options: field.options ? [...field.options] : undefined,
  } as KnowledgeField;
}
export function ProposalEditor({
  client,
  proposal,
  sourceId,
  onClose,
}: {
  client: OsClient;
  proposal?: KnowledgeChangeProposal;
  sourceId: string;
  onClose: () => void;
}) {
  const { k, editable, mutate } = useKnowledge(client);
  const [module, setModule] = useState<KnowledgeModule>(
    proposal?.targetModule ?? "discovery",
  );
  const [entity, setEntity] = useState(
    proposal?.targetEntityId ?? k.discovery.companyProfile.id,
  );
  const [section, setSection] = useState(
    proposal?.targetSection ?? "companyProfile",
  );
  const [path, setPath] = useState(proposal?.targetFieldPath ?? "definition");
  const [value, setValue] = useState<unknown>(proposal?.proposedValue ?? "");
  const [evidence, setEvidence] = useState(
    proposal?.evidence[0]?.excerpt ?? "",
  );
  const [error, setError] = useState("");
  const targets = proposalTargets(k, module);
  const target = targets.find((t) => t.id === entity && t.section === section);
  const selected = target?.fields.find((f) => f.key === path);
  const create = proposal?.operation === "create";
  return (
    <OSSidePanel
      persistentFooter
      label="Editar propuesta"
      heading={
        <h2>
          {proposal
            ? "Editar antes de aprobar"
            : "Crear propuesta con evidencia"}
        </h2>
      }
      onClose={onClose}
      footer={
        <button
          className={buttonClass("primary")}
          form="proposal-form"
          type="submit"
          disabled={!editable}
        >
          Guardar propuesta
        </button>
      }
    >
      <form
        id="proposal-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!evidence.trim()) {
            setError("Ingresá una cita textual de la fuente");
            return;
          }
          const ok = mutate((s, c) =>
            proposal
              ? editProposal(
                  s,
                  proposal.id,
                  {
                    targetModule: module,
                    targetSection: section,
                    targetEntityId: entity,
                    targetFieldPath: path,
                    proposedValue: value,
                  },
                  c,
                )
              : addProposals(s, [
                  newProposal(
                    s,
                    sourceId,
                    section,
                    path,
                    value,
                    evidence,
                    c,
                    entity,
                    module,
                  ),
                ]),
          );
          if (ok) onClose();
        }}
      >
        <p className={m.notice}>
          Cambiar el destino no aplica la propuesta. La aprobación del PM es un
          paso separado.
        </p>
        <label className={m.field}>
          Módulo de destino
          <select
            disabled={create}
            value={module}
            onChange={(e) => {
              const next = e.target.value as KnowledgeModule;
              const first = proposalTargets(k, next)[0];
              setModule(next);
              setEntity(first?.id ?? "");
              setSection(first?.section ?? "");
              setPath(first?.fields[0]?.key ?? "");
              setValue("");
            }}
          >
            {Object.entries(moduleLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {create ? (
          <p>Nuevo registro de {section}</p>
        ) : (
          <>
            <label className={m.field}>
              Registro de destino
              <select
                value={`${section}:${entity}`}
                onChange={(e) => {
                  const next = targets.find(
                    (t) => `${t.section}:${t.id}` === e.target.value,
                  );
                  if (next) {
                    setEntity(next.id);
                    setSection(next.section);
                    setPath(next.fields[0]?.key ?? "");
                    setValue("");
                  }
                }}
              >
                {targets.map((t) => (
                  <option
                    key={`${t.section}:${t.id}`}
                    value={`${t.section}:${t.id}`}
                  >
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={m.field}>
              Campo
              <select
                value={path}
                onChange={(e) => {
                  setPath(e.target.value);
                  setValue("");
                }}
              >
                {target?.fields.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {create && module === "discovery" ? (
          fields[section as EntityKind].map((f) => (
            <FieldInput
              key={f.key}
              field={asField(f)}
              value={(value as Record<string, KnowledgeValue>)?.[f.key]}
              onChange={(v) => setValue({ ...(value as object), [f.key]: v })}
              k={k}
            />
          ))
        ) : selected ? (
          <FieldInput
            field={{ ...asField(selected), label: "Valor propuesto" }}
            value={value as KnowledgeValue}
            onChange={setValue}
            k={k}
          />
        ) : (
          <p className={m.notice}>
            Primero agregá un registro en el módulo de destino.
          </p>
        )}
        <label className={m.field}>
          Evidencia textual
          <textarea
            disabled={!!proposal}
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
          />
        </label>
        {error ? (
          <p role="alert" className={m.error}>
            {error}
          </p>
        ) : null}
      </form>
    </OSSidePanel>
  );
}
export function ProposalsView({ client }: { client: OsClient }) {
  const { k, editable, mutate } = useKnowledge(client);
  const [status, setStatus] = useState("pending");
  const [source, setSource] = useState("");
  const [module, setModule] = useState("");
  const [section, setSection] = useState("");
  const [impact, setImpact] = useState("");
  const [confidence, setConfidence] = useState("");
  const [date, setDate] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [editor, setEditor] = useState<KnowledgeChangeProposal | null>(null);
  if (!editable)
    return (
      <p className={m.notice}>
        Las fuentes sensibles y la aprobación están disponibles para el
        administrador y el PM asignado.
      </p>
    );
  const filtered = k.proposals.filter(
    (p) =>
      (!status || p.status === status) &&
      (!source || p.sourceId === source) &&
      (!module || p.targetModule === module) &&
      (!section || p.targetSection === section) &&
      (!impact || p.impact === impact) &&
      (!confidence || p.confidence >= Number(confidence)) &&
      (!date || p.createdAt.slice(0, 10) >= date),
  );
  return (
    <div className={m.root}>
      <h3>Cambios para aprobar</h3>
      <div className={m.filters}>
        <label className={m.field}>
          Estado
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="applied">Aplicados</option>
            <option value="rejected">Rechazados</option>
          </select>
        </label>
        <label className={m.field}>
          Fuente o reunión
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">Todas</option>
            {k.sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <label className={m.field}>
          Módulo
          <select value={module} onChange={(e) => setModule(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(moduleLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={m.field}>
          Sección
          <select value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">Todas</option>
            {Array.from(new Set(k.proposals.map((p) => p.targetSection))).map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </select>
        </label>
        <label className={m.field}>
          Impacto
          <select value={impact} onChange={(e) => setImpact(e.target.value)}>
            <option value="">Todos</option>
            <option value="low">Bajo</option>
            <option value="medium">Medio</option>
            <option value="high">Alto</option>
          </select>
        </label>
        <label className={m.field}>
          Confianza mínima
          <select
            value={confidence}
            onChange={(e) => setConfidence(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="0.8">80%</option>
            <option value="0.95">95%</option>
          </select>
        </label>
        <label className={m.field}>
          Desde
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <button
        className={buttonClass("secondary", true)}
        disabled={
          !filtered.some(
            (p) =>
              p.status === "pending" &&
              p.impact === "low" &&
              selected.includes(p.id),
          )
        }
        onClick={() =>
          mutate((s, c) =>
            filtered
              .filter(
                (p) =>
                  p.status === "pending" &&
                  p.impact === "low" &&
                  selected.includes(p.id),
              )
              .reduce(
                (state, p) =>
                  reviewProposal(state, p.id, "approve", c, "", true),
                s,
              ),
          )
        }
      >
        Aprobar seleccionados de bajo riesgo
      </button>
      {!filtered.length ? (
        <p className={m.empty}>No hay propuestas con estos filtros.</p>
      ) : (
        filtered.map((p) => (
          <article className={m.card} key={p.id}>
            {p.status === "pending" ? (
              <label className={m.field}>
                <span>Seleccionar para aprobación en lote</span>
                <input
                  type="checkbox"
                  disabled={p.impact !== "low"}
                  checked={selected.includes(p.id)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, p.id]
                        : selected.filter((id) => id !== p.id),
                    )
                  }
                />
              </label>
            ) : null}
            <div className={m.head}>
              <h4>
                {moduleLabels[p.targetModule]} · {p.targetSection} ·{" "}
                {p.targetFieldPath || "Nuevo registro"}
              </h4>
              <span className={m.badge}>
                {p.status} · Impacto{" "}
                {p.impact === "high"
                  ? "alto"
                  : p.impact === "medium"
                    ? "medio"
                    : "bajo"}
              </span>
            </div>
            <p className={m.muted}>
              Fuente: {k.sources.find((s) => s.id === p.sourceId)?.title} ·
              Confianza: {Math.round(p.confidence * 100)}% ·{" "}
              {p.createdAt.slice(0, 10)}
            </p>
            <ExternalLink
              url={
                k.sources.find((s) => s.id === p.sourceId)?.externalUrl ?? ""
              }
              label="Abrir fuente original"
            />
            <div className={m.diff}>
              <div>
                <strong>Valor actual</strong>
                <pre className={m.pre}>
                  {formatValue(proposalCurrent(k, p))}
                </pre>
              </div>
              <div>
                <strong>Valor propuesto</strong>
                <pre className={m.pre}>{formatValue(p.proposedValue)}</pre>
              </div>
            </div>
            <p>
              {JSON.stringify(proposalCurrent(k, p) ?? null) ===
              JSON.stringify(p.proposedValue)
                ? "Sin diferencia con el valor actual"
                : "Diferencia: reemplaza o incorpora el contenido mostrado."}
            </p>
            <p>{p.explanation}</p>
            {p.evidence.map((e, i) => (
              <blockquote key={i}>
                {e.excerpt}
                {e.paragraph ? ` · Párrafo ${e.paragraph}` : ""}
              </blockquote>
            ))}
            <p>Módulos afectados: {p.affectedModules.join(" · ")}</p>
            {p.status === "pending" ? (
              <div className={m.actions}>
                <button
                  className={buttonClass("primary", true)}
                  onClick={() =>
                    mutate((s, c) => reviewProposal(s, p.id, "approve", c))
                  }
                >
                  Aprobar propuesta
                </button>
                <button
                  className={buttonClass("secondary", true)}
                  onClick={() => setEditor(p)}
                >
                  Editar o reasignar
                </button>
                <button
                  className={buttonClass("ghost", true)}
                  onClick={() =>
                    mutate((s, c) =>
                      reviewProposal(
                        s,
                        p.id,
                        "reject",
                        c,
                        "No relevante para el conocimiento del cliente",
                      ),
                    )
                  }
                >
                  Rechazar / no relevante
                </button>
              </div>
            ) : (
              <p className={m.muted}>
                Revisada por {p.reviewedBy} · {p.reviewedAt} {p.rejectionReason}
                {p.status === "applied"
                  ? ` · Campo actualizado · Versión ${k.versions.find((v) => v.id === p.versionId)?.version ?? "registrada"} · Revisión pendiente en módulos afectados`
                  : ""}
              </p>
            )}
          </article>
        ))
      )}
      {editor ? (
        <ProposalEditor
          client={client}
          proposal={editor}
          sourceId={editor.sourceId}
          onClose={() => setEditor(null)}
        />
      ) : null}
    </div>
  );
}
