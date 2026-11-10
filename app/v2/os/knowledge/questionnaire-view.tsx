"use client";
import { useState } from "react";
import { newId } from "./types";
import type { OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { buttonClass } from "../ui";
import { recordsOf } from "../discovery/model";
import type { Field } from "../discovery/schema";
import {
  questionnaireTemplate,
  questionnaireProgress,
  questionnaireText,
  type QuestionnaireResponse,
  type AnswerValue,
} from "./questionnaire";
import { questionnaireToProposals } from "./proposals";
import { useKnowledge } from "./use-knowledge";
import m from "./knowledge.module.css";
type Row = Record<string, string | number | boolean | null | string[]>;
function AnswerField({
  field,
  value,
  onChange,
  disabled,
  options,
}: {
  field: Field;
  value: Row[string] | undefined;
  onChange: (v: Row[string]) => void;
  disabled: boolean;
  options: { id: string; label: string }[];
}) {
  return (
    <label className={m.field}>
      <span>{field.label}</span>
      {field.kind === "boolean" ? (
        <select
          value={value === undefined ? "" : String(value)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === "true")}
        >
          <option value="">Sin responder</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>
      ) : field.kind === "select" || field.kind === "relation" ? (
        <select
          disabled={disabled}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Seleccionar</option>
          {field.kind === "select"
            ? field.options?.map((o) => <option key={o}>{o}</option>)
            : options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
        </select>
      ) : field.kind === "relations" ? (
        <select
          multiple
          disabled={disabled}
          value={Array.isArray(value) ? value : []}
          onChange={(e) =>
            onChange(Array.from(e.target.selectedOptions, (o) => o.value))
          }
        >
          {options.map((o) => (
            <option value={o.id} key={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.kind === "number" ? (
        <input
          type="number"
          min="0"
          max="100"
          step="any"
          disabled={disabled}
          value={typeof value === "number" ? value : ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
        />
      ) : (
        <textarea
          disabled={disabled}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
export function QuestionnaireView({ client }: { client: OsClient }) {
  const { k, d, editable, mutate } = useKnowledge(client);
  const { notify } = useOsStore();
  const [responses, setResponses] = useState(k.questionnaire.responses);
  const [revision, setRevision] = useState(k.revision);
  const [active, setActive] = useState(questionnaireTemplate.sections[0].id);
  const [share, setShare] = useState(false);
  const [filter, setFilter] = useState("all");
  const instance = { ...k.questionnaire, responses };
  const progress = questionnaireProgress(instance);
  function change(id: string, patch: Partial<QuestionnaireResponse>) {
    setResponses((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? {
          questionId: id,
          value: "",
          status: "draft",
          sourceReference: "",
          permission: "pending",
          clarification: "",
          updatedAt: "",
          updatedBy: "",
        }),
        ...patch,
      },
    }));
  }
  function save() {
    return mutate(
      (state, ctx) => ({
        ...state,
        questionnaire: {
          ...state.questionnaire,
          responses: Object.fromEntries(
            Object.entries(responses).map(([id, r]) => [
              id,
              {
                ...r,
                status: r.status,
                updatedAt: ctx.at,
                updatedBy: ctx.actor,
              },
            ]),
          ),
        },
      }),
      revision,
    );
  }
  const sections = share
    ? questionnaireTemplate.sections
    : questionnaireTemplate.sections.filter((s) => s.id === active);
  return (
    <div className={`${m.root} ${share ? `${m.share} ${m.printable}` : ""}`}>
      <div className={m.head}>
        <div>
          <h2>Cuestionario inicial · {client.name}</h2>
          <p>
            Una conversación para entender tu negocio, tus clientes y los
            materiales disponibles.
          </p>
        </div>
        <div className={`${m.actions} ${m.noPrint}`}>
          <button
            className={buttonClass("secondary", true)}
            onClick={() => setShare(!share)}
          >
            {share ? "Volver a vista interna" : "Para compartir con el cliente"}
          </button>
          <button
            className={buttonClass("secondary", true)}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(questionnaireText());
                notify("Preguntas copiadas");
              } catch {
                notify(
                  "El navegador no permitió copiar las preguntas",
                  "error",
                );
              }
            }}
          >
            Copiar preguntas
          </button>
          <button
            className={buttonClass("secondary", true)}
            onClick={() => {
              setShare(true);
              requestAnimationFrame(() =>
                requestAnimationFrame(() => window.print()),
              );
            }}
          >
            Imprimir
          </button>
        </div>
      </div>
      <div>
        <strong>
          Progreso general: {progress.percent}% · {progress.answered} de{" "}
          {progress.total}
        </strong>
        <progress className={m.progress} max={100} value={progress.percent} />
      </div>
      <p className={m.muted}>
        Esta vista permanece dentro de la sesión de Avans OS. No genera un
        enlace público ni envía mensajes.
      </p>
      <div className={share ? m.root : m.twoCol}>
        {!share ? (
          <nav className={m.side} aria-label="Bloques del cuestionario">
            {progress.sections.map((s) => (
              <button
                key={s.id}
                aria-current={active === s.id ? "page" : undefined}
                onClick={() => setActive(s.id)}
              >
                {s.label} · {s.percent}%
                {s.clarification ? ` · ${s.clarification} aclaraciones` : ""}
              </button>
            ))}
            <label className={m.field}>
              Mostrar
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">Todas las preguntas</option>
                <option value="pending">Preguntas pendientes</option>
                <option value="clarify">Requieren aclaración</option>
              </select>
            </label>
          </nav>
        ) : null}
        <div className={m.root}>
          {sections.map((section) => (
            <section className={m.card} key={section.id}>
              <h3>{section.label}</h3>
              {section.questions
                .filter(
                  (q) =>
                    filter === "all" ||
                    share ||
                    (filter === "pending" &&
                      (!responses[q.id] ||
                        responses[q.id].status === "unanswered" ||
                        responses[q.id].status === "draft")) ||
                    (filter === "clarify" && !!responses[q.id]?.clarification),
                )
                .map((q) => {
                  const response = responses[q.id];
                  const rows =
                    q.responseType === "repeatable" &&
                    Array.isArray(response?.value)
                      ? (response.value as Row[])
                      : [];
                  return (
                    <div key={q.id} className={m.card}>
                      <h4>{q.label}</h4>
                      <p className={m.muted}>{q.helpText}</p>
                      {q.responseType === "repeatable" ? (
                        <>
                          {rows.map((row, i) => (
                            <fieldset key={i}>
                              <legend>Respuesta {i + 1}</legend>
                              {q.fields?.map((f) => (
                                <AnswerField
                                  key={f.key}
                                  field={f}
                                  value={row[f.key]}
                                  onChange={(v) =>
                                    change(q.id, {
                                      value: rows.map((r, j) =>
                                        j === i ? { ...r, [f.key]: v } : r,
                                      ),
                                      status: "draft",
                                    })
                                  }
                                  disabled={!editable}
                                  options={
                                    f.collection
                                      ? recordsOf(d, f.collection).map((r) => ({
                                          id: r.id,
                                          label: r.name || r.id,
                                        }))
                                      : []
                                  }
                                />
                              ))}
                              <label className={m.field}>
                                Fuente de este dato
                                <input
                                  disabled={!editable}
                                  value={String(row._source ?? "")}
                                  onChange={(e) =>
                                    change(q.id, {
                                      value: rows.map((r, j) =>
                                        i === j
                                          ? { ...r, _source: e.target.value }
                                          : r,
                                      ),
                                    })
                                  }
                                />
                              </label>
                              <label className={m.field}>
                                Autorización de uso de este dato
                                <select
                                  disabled={!editable}
                                  value={String(row._permission ?? "pending")}
                                  onChange={(e) =>
                                    change(q.id, {
                                      value: rows.map((r, j) =>
                                        i === j
                                          ? {
                                              ...r,
                                              _permission: e.target.value,
                                            }
                                          : r,
                                      ),
                                    })
                                  }
                                >
                                  <option value="pending">Por confirmar</option>
                                  <option value="public">
                                    Puede comunicarse públicamente
                                  </option>
                                  <option value="confidential">
                                    Confidencial
                                  </option>
                                </select>
                              </label>
                              <button
                                disabled={!editable}
                                className={buttonClass("ghost", true)}
                                onClick={() =>
                                  change(q.id, {
                                    value: rows.filter((_, j) => j !== i),
                                  })
                                }
                              >
                                Quitar respuesta {i + 1}
                              </button>
                            </fieldset>
                          ))}
                          <button
                            disabled={!editable}
                            className={buttonClass("secondary", true)}
                            onClick={() =>
                              change(q.id, {
                                value: [...rows, {_id:newId()}] as AnswerValue,
                              })
                            }
                          >
                            Agregar respuesta
                          </button>
                        </>
                      ) : (
                        <label className={m.field}>
                          <span className={m.srOnly}>{q.label}</span>
                          <textarea
                            disabled={!editable}
                            value={String(response?.value ?? "")}
                            onChange={(e) =>
                              change(q.id, {
                                value: e.target.value,
                                status: "draft",
                              })
                            }
                          />
                        </label>
                      )}
                      {!share ? (
                        <>
                          <label className={m.field}>
                            Estado de respuesta
                            <select
                              disabled={!editable}
                              value={response?.status ?? "unanswered"}
                              onChange={(e) =>
                                change(q.id, {
                                  status: e.target
                                    .value as QuestionnaireResponse["status"],
                                })
                              }
                            >
                              <option value="unanswered">Sin responder</option>
                              <option value="draft">Borrador</option>
                              <option value="answered">Respondida</option>
                              <option value="validated">
                                Validada con el cliente
                              </option>
                            </select>
                          </label>
                          <label className={m.field}>
                            Fuente o referencia
                            <input
                              disabled={!editable}
                              value={response?.sourceReference ?? ""}
                              onChange={(e) =>
                                change(q.id, {
                                  sourceReference: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label className={m.field}>
                            Permiso de publicación
                            <select
                              disabled={!editable}
                              value={response?.permission ?? "pending"}
                              onChange={(e) =>
                                change(q.id, {
                                  permission: e.target
                                    .value as QuestionnaireResponse["permission"],
                                })
                              }
                            >
                              <option value="pending">Por confirmar</option>
                              <option value="public">Público</option>
                              <option value="confidential">Confidencial</option>
                            </select>
                          </label>
                        </>
                      ) : null}
                      <label className={m.field}>
                        Necesitamos aclarar
                        <input
                          disabled={!editable}
                          value={response?.clarification ?? ""}
                          onChange={(e) =>
                            change(q.id, { clarification: e.target.value })
                          }
                        />
                      </label>
                    </div>
                  );
                })}
            </section>
          ))}
        </div>
      </div>
      <div className={`${m.actions} ${m.noPrint}`}>
        <button
          disabled={!editable}
          className={buttonClass("secondary")}
          onClick={() => {
            if (save()) setRevision(revision + 1);
          }}
        >
          Guardar borrador
        </button>
        <button
          disabled={!editable}
          className={buttonClass("primary")}
          onClick={() => {
            if (save()) setRevision(revision + 1);
          }}
        >
          Guardar respuestas
        </button>
        {!share ? (
          <button
            disabled={!editable}
            className={buttonClass("secondary")}
            onClick={() => {
              if (
                mutate(
                  (s, c) =>
                    questionnaireToProposals(
                      { ...s, questionnaire: instance },
                      c,
                    ),
                  revision,
                )
              ) {
                setRevision(revision + 1);
                notify(
                  "Propuestas disponibles en Documentos → Cambios para aprobar",
                );
              }
            }}
          >
            Generar propuestas desde respuestas
          </button>
        ) : null}
      </div>
    </div>
  );
}
