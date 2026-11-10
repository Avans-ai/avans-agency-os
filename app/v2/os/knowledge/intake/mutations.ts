import {
  answerPresent,
  questionnaireTemplate,
  type AnswerValue,
} from "../questionnaire";
import { versionChange } from "../state";
import {
  newId,
  type KnowledgeState,
  type KnowledgeSource,
  type MutationContext,
} from "../types";
import { INTAKE_LIMITS } from "./extraction";
import { validateAnswer } from "./analysis";
import type { QuestionnaireAnswerSuggestion } from "./types";
export function addIntakeSource(
  k: KnowledgeState,
  source: KnowledgeSource,
  ctx: MutationContext,
) {
  if (source.clientSlug !== k.clientSlug)
    throw new Error("Fuente de otro cliente.");
  if (
    source.contentHash &&
    k.sources.some((s) => s.contentHash === source.contentHash)
  )
    throw new Error(
      "Archivo o contenido duplicado: ya existe una fuente idéntica en este cliente.",
    );
  const total =
    k.sources
      .filter((s) => !!s.intake)
      .reduce((n, s) => n + s.rawText.length, 0) + source.rawText.length;
  if (total > INTAKE_LIMITS.totalTextCharacters)
    throw new Error(
      "Se alcanzó el límite local de 600.000 caracteres de fuentes. No se guardó el archivo.",
    );
  return {
    ...k,
    sources: [...k.sources, source],
    audit: [
      ...k.audit,
      {
        id: newId(),
        at: ctx.at,
        actor: ctx.actor,
        sourceId: source.id,
        action: "Fuente registrada para cuestionario · original no almacenado",
      },
    ],
  };
}
export function addSuggestions(
  k: KnowledgeState,
  suggestions: QuestionnaireAnswerSuggestion[],
  ctx: MutationContext,
) {
  for (const s of suggestions) {
    if (
      s.clientSlug !== k.clientSlug ||
      s.sourceIds.some((id) => !k.sources.some((source) => source.id === id))
    )
      throw new Error("Sugerencia o fuente ajena al cliente.");
    validateAnswer(s.questionId, s.proposedValue);
  }
  const key = (s: QuestionnaireAnswerSuggestion) =>
    JSON.stringify([
      s.questionId,
      s.sourceIds.slice().sort(),
      s.proposedValue,
      s.evidence,
    ]);
  const keys = new Set((k.answerSuggestions ?? []).map(key));
  const unique = suggestions.filter((s) => {
    const id = key(s);
    if (keys.has(id)) return false;
    keys.add(id);
    return true;
  });
  const ids = new Set(suggestions.flatMap((s) => s.sourceIds));
  return {
    ...k,
    answerSuggestions: [...(k.answerSuggestions ?? []), ...unique],
    sources: k.sources.map((s) =>
      ids.has(s.id) && s.intake
        ? {
            ...s,
            intake: {
              ...s.intake,
              status: "suggested" as const,
              provider: suggestions[0]?.provider,
            },
            status: "needs-review" as const,
          }
        : s,
    ),
    audit: [
      ...k.audit,
      {
        id: newId(),
        at: ctx.at,
        actor: ctx.actor,
        action: `Respuestas sugeridas generadas: ${unique.length} · requieren revisión`,
      },
    ],
  };
}
export function suggestionConflicts(
  k: KnowledgeState,
  s: QuestionnaireAnswerSuggestion,
) {
  const current = k.questionnaire.responses[s.questionId]?.value ?? "";
  return {
    missingSource: s.sourceIds.some(
      (id) => !k.sources.some((source) => source.id === id),
    ),
    sourceChanged: s.sourceIds.some((id) => {
      const source = k.sources.find((source) => source.id === id);
      if (!source) return true;
      const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
      return (
        (s.sourceVersions?.[id] !== undefined &&
          source.version !== s.sourceVersions[id]) ||
        s.evidence
          .filter((e) => e.sourceId === id)
          .some(
            (e) => !normalize(source.rawText).includes(normalize(e.excerpt)),
          )
      );
    }),
    currentChanged: JSON.stringify(current) !== JSON.stringify(s.previousValue),
    existingAnswer:
      answerPresent(current) &&
      JSON.stringify(current) !== JSON.stringify(s.proposedValue),
    alternatives: (k.answerSuggestions ?? []).filter(
      (other) =>
        other.id !== s.id &&
        other.questionId === s.questionId &&
        other.status === "pending" &&
        JSON.stringify(other.proposedValue) !== JSON.stringify(s.proposedValue),
    ),
  };
}
export function reviewSuggestions(
  k: KnowledgeState,
  ids: string[],
  decision: "approve" | "reject" | "ask",
  ctx: MutationContext,
  options: {
    explicitReview?: boolean;
    highConfidenceOnly?: boolean;
    batch?: boolean;
  } = {},
) {
  const selected = Array.from(new Set(ids))
    .map((id) => {
      const s = k.answerSuggestions?.find((s) => s.id === id);
      if (!s) throw new Error("Sugerencia inexistente.");
      return s;
    })
    .filter(
      (s) =>
        s.status === "pending" &&
        !(
          decision === "approve" &&
          options.highConfidenceOnly &&
          s.confidence < 0.9
        ),
    );
  if (!selected.length) return k;
  if (
    new Set(selected.map((s) => s.questionId)).size !== selected.length &&
    decision === "approve"
  )
    throw new Error(
      "No se pueden aplicar dos respuestas distintas a la misma pregunta.",
    );
  let next = k;
  for (const s of selected) {
    if (s.clientSlug !== k.clientSlug) throw new Error("Cliente incompatible.");
    const conflicts = suggestionConflicts(k, s),
      hasConflict =
        conflicts.sourceChanged ||
        conflicts.currentChanged ||
        conflicts.existingAnswer ||
        conflicts.alternatives.length > 0;
    if (decision === "approve") {
      validateAnswer(s.questionId, s.proposedValue);
      if (conflicts.missingSource || conflicts.sourceChanged)
        throw new Error(
          "La fuente cambió o ya no está disponible. Revisala y generá una nueva sugerencia antes de aprobar.",
        );
      if (
        (options.batch || selected.length > 1) &&
        (s.impact === "high" || hasConflict)
      )
        throw new Error(
          "Los cambios de alto impacto o en conflicto requieren revisión individual explícita.",
        );
      if ((s.impact === "high" || hasConflict) && !options.explicitReview)
        throw new Error(
          "Confirmá que revisaste el cambio y sus fuentes antes de aprobar.",
        );
      const before = next.questionnaire.responses[s.questionId];
      const value = Array.isArray(s.proposedValue)
        ? (s.proposedValue.map((row) =>
            typeof row === "object" && row !== null
              ? { ...row, _id: String(row._id || newId()) }
              : row,
          ) as AnswerValue)
        : s.proposedValue;
      const response = {
        questionId: s.questionId,
        value,
        status: "answered" as const,
        sourceId: s.sourceIds[0],
        sourceIds: s.sourceIds,
        sourceReference: s.sourceIds
          .map(
            (id) => k.sources.find((source) => source.id === id)?.title ?? id,
          )
          .join(" · "),
        permission: before?.permission ?? ("pending" as const),
        clarification: "",
        updatedAt: ctx.at,
        updatedBy: ctx.actor,
        origin: "source" as const,
        suggestionId: s.id,
        demo: s.demo,
      };
      next = {
        ...versionChange(
          next,
          "questionnaire-response",
          s.questionId,
          before,
          response,
          ctx,
          s.sourceIds[0],
          s.id,
        ),
        questionnaire: {
          ...next.questionnaire,
          responses: {
            ...next.questionnaire.responses,
            [s.questionId]: response,
          },
        },
      };
    } else if (decision === "ask") {
      const before = next.questionnaire.responses[s.questionId];
      const response = {
        ...(before ?? {
          questionId: s.questionId,
          value: "",
          status: "unanswered" as const,
          sourceReference: "",
          permission: "pending" as const,
        }),
        updatedAt: ctx.at,
        updatedBy: ctx.actor,
        clarification:
          "Requiere consulta al cliente: revisar evidencia y confirmar la respuesta.",
      };
      next = {
        ...next,
        questionnaire: {
          ...next.questionnaire,
          responses: {
            ...next.questionnaire.responses,
            [s.questionId]: response,
          },
        },
      };
    }
    next = {
      ...next,
      answerSuggestions: (next.answerSuggestions ?? []).map((p) =>
        p.id === s.id
          ? {
              ...p,
              status:
                decision === "approve"
                  ? ("applied" as const)
                  : ("rejected" as const),
              reviewedAt: ctx.at,
              reviewedBy: ctx.actor,
              decisionNote:
                decision === "ask"
                  ? "Preguntar al cliente"
                  : decision === "approve"
                    ? "Aprobación explícita del PM"
                    : "Rechazada por el PM",
            }
          : p,
      ),
      audit: [
        ...next.audit,
        {
          id: newId(),
          at: ctx.at,
          actor: ctx.actor,
          sourceId: s.sourceIds[0],
          action: `Sugerencia ${s.id}: ${decision}`,
        },
      ],
    };
  }
  return {
    ...next,
    sources: next.sources.map((source) =>
      source.intake?.status === "suggested" &&
      !(next.answerSuggestions ?? []).some(
        (s) => s.status === "pending" && s.sourceIds.includes(source.id),
      )
        ? {
            ...source,
            intake: { ...source.intake, status: "processed" as const },
            status: "processed" as const,
          }
        : source,
    ),
  };
}
export function editSuggestion(
  k: KnowledgeState,
  id: string,
  value: AnswerValue,
  ctx: MutationContext,
) {
  const s = k.answerSuggestions?.find((s) => s.id === id);
  if (!s || s.status !== "pending")
    throw new Error("Solo se editan sugerencias pendientes.");
  validateAnswer(s.questionId, value);
  const after = {
    ...s,
    proposedValue: value,
    editedAt: ctx.at,
    explanation: `${s.explanation}\nEditada por ${ctx.actor}.`,
  };
  return {
    ...versionChange(k, "answer-suggestion", id, s, after, ctx, s.sourceIds[0]),
    answerSuggestions: (k.answerSuggestions ?? []).map((p) =>
      p.id === id ? after : p,
    ),
  };
}
export function questionnaireSourceCoverage(k: KnowledgeState) {
  const questions = questionnaireTemplate.sections.flatMap((s) => s.questions),
    answers = k.questionnaire.responses,
    pending = (k.answerSuggestions ?? []).filter((s) => s.status === "pending");
  return {
    manual: questions.filter(
      (q) =>
        answerPresent(answers[q.id]?.value ?? "") &&
        answers[q.id]?.origin !== "source",
    ).length,
    fromSources: questions.filter(
      (q) =>
        answerPresent(answers[q.id]?.value ?? "") &&
        answers[q.id]?.origin === "source",
    ).length,
    pending: pending.length,
    withoutEvidence: questions.filter(
      (q) =>
        !answers[q.id]?.sourceId &&
        !answers[q.id]?.sourceReference &&
        !pending.some((s) => s.questionId === q.id),
    ).length,
    ask: questions.filter((q) => !!answers[q.id]?.clarification).length,
    conflicts: new Set(
      pending
        .filter((s) => {
          const c = suggestionConflicts(k, s);
          return (
            c.sourceChanged ||
            c.currentChanged ||
            c.existingAnswer ||
            c.alternatives.length
          );
        })
        .map((s) => s.questionId),
    ).size,
  };
}
