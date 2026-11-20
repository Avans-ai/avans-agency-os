import { z } from "zod";
import {
  questionnaireTemplate,
  answerPresent,
  type AnswerValue,
} from "../questionnaire";
import { newId, type KnowledgeState, type MutationContext } from "../types";
import { proposalImpact } from "../proposals";
import type {
  AnalysisInput,
  QuestionnaireAnalysisProvider,
  QuestionnaireAnswerSuggestion,
} from "./types";
const scalar = z.union([
  z.string().max(12000),
  z.number().finite(),
  z.boolean(),
  z.null(),
  z.array(z.string().max(2000)).max(100),
]);
export const analysisOutputSchema = z.object({
  suggestions: z
    .array(
      z.object({
        questionId: z.string().max(150),
        proposedValue: z.union([
          scalar,
          z.array(z.record(z.string().max(80), scalar)).max(40),
        ]),
        explanation: z.string().min(1).max(1200),
        confidence: z.number().min(0).max(1),
        evidence: z
          .array(
            z.object({
              sourceId: z.string().max(150),
              excerpt: z.string().min(4).max(1600),
              page: z.number().int().positive().optional(),
              paragraph: z.number().int().positive().optional(),
            }),
          )
          .min(1)
          .max(6),
      }),
    )
    .max(64),
});
export function analysisInput(
  k: KnowledgeState,
  sourceIds: string[],
): AnalysisInput {
  const sources = sourceIds.map((id) => {
    const s = k.sources.find(
      (s) => s.id === id && s.clientSlug === k.clientSlug,
    );
    if (!s || !s.rawText.trim())
      throw new Error("La fuente no tiene texto extraído en este cliente.");
    return { id: s.id, text: s.rawText, demo: s.demo };
  });
  if (sources.reduce((n, s) => n + s.text.length, 0) > 80000)
    throw new Error(
      "El análisis admite hasta 80.000 caracteres por solicitud. Seleccioná menos fuentes o fragmentos.",
    );
  return {
    clientSlug: k.clientSlug,
    sources,
    questions: questionnaireTemplate.sections.flatMap((s) =>
      s.questions.map((q) => ({
        id: q.id,
        targetFieldPath: q.targetFieldPath,
        label: q.label,
        fields: q.fields?.map((f) => ({ key: f.key, kind: f.kind ?? "text" })),
      })),
    ),
    maxSuggestions: 64,
    maxInputCharacters: 80000,
  };
}
export function validateAnswer(questionId: string, value: AnswerValue) {
  const q = questionnaireTemplate.sections
    .flatMap((s) => s.questions)
    .find((q) => q.id === questionId);
  if (!q) throw new Error("Pregunta inexistente.");
  if (!answerPresent(value))
    throw new Error(
      "La sugerencia está vacía; marcá la pregunta para consultar al cliente.",
    );
  if (q.responseType === "repeatable") {
    if (
      !Array.isArray(value) ||
      value.some((v) => !v || typeof v !== "object" || Array.isArray(v))
    )
      throw new Error(
        "Esta pregunta necesita una lista de registros estructurados.",
      );
    for (const row of value as Record<string, unknown>[])
      for (const [key, v] of Object.entries(row)) {
        if (["_id", "_source", "_permission"].includes(key)) continue;
        const f = q.fields?.find((f) => f.key === key);
        if (!f) throw new Error(`Campo no permitido: ${key}`);
        if (
          f.kind === "number" &&
          v !== null &&
          (typeof v !== "number" || !Number.isFinite(v))
        )
          throw new Error(`El campo ${key} debe ser numérico.`);
        if (f.kind === "boolean" && typeof v !== "boolean")
          throw new Error(`El campo ${key} debe ser sí/no.`);
        if (
          f.kind === "relations" &&
          (!Array.isArray(v) || v.some((x) => typeof x !== "string"))
        )
          throw new Error(`Las relaciones de ${key} no son válidas.`);
        if (
          !["number", "boolean", "relations"].includes(f.kind ?? "text") &&
          typeof v !== "string"
        )
          throw new Error(`El campo ${key} debe ser texto.`);
        if (f.kind === "select" && v && !f.options?.includes(String(v)))
          throw new Error(`Opción no válida para ${key}.`);
      }
  } else if (typeof value !== "string")
    throw new Error("Esta pregunta requiere una respuesta de texto.");
  return q;
}
const normalized = (text: string) => text.replace(/\s+/g, " ").trim();
export function mapAnalysisOutput(
  k: KnowledgeState,
  input: AnalysisInput,
  raw: unknown,
  provider: QuestionnaireAnalysisProvider,
  ctx: MutationContext,
): QuestionnaireAnswerSuggestion[] {
  if (input.clientSlug !== k.clientSlug)
    throw new Error("Cliente incompatible.");
  const output = analysisOutputSchema.parse(raw);
  return output.suggestions.map((s) => {
    const q = validateAnswer(s.questionId, s.proposedValue);
    if (!input.questions.some((x) => x.id === q.id))
      throw new Error("Pregunta fuera del contexto autorizado.");
    for (const e of s.evidence) {
      const source = input.sources.find((source) => source.id === e.sourceId);
      if (!source || !normalized(source.text).includes(normalized(e.excerpt)))
        throw new Error("La evidencia no existe en la fuente seleccionada.");
    }
    const sourceIds = Array.from(new Set(s.evidence.map((e) => e.sourceId)));
    return {
      id: newId(),
      clientSlug: k.clientSlug,
      sourceIds,
      sourceVersions: Object.fromEntries(
        sourceIds.map((id) => [
          id,
          k.sources.find((source) => source.id === id)!.version,
        ]),
      ),
      questionId: q.id,
      targetFieldPath: q.targetFieldPath,
      previousValue: structuredClone(
        k.questionnaire.responses[q.id]?.value ?? "",
      ),
      proposedValue: s.proposedValue,
      explanation: s.explanation,
      evidence: s.evidence,
      confidence: s.confidence,
      impact: proposalImpact("discovery", q.sectionId, q.targetFieldPath),
      status: "pending",
      provider: provider.id,
      demo: sourceIds.some(
        (id) => k.sources.find((s) => s.id === id)?.demo === true,
      ),
      createdAt: ctx.at,
    };
  });
}
export async function analyzeSources(
  k: KnowledgeState,
  sourceIds: string[],
  provider: QuestionnaireAnalysisProvider,
  ctx: MutationContext,
  signal: AbortSignal,
) {
  if (!provider.configured)
    throw new Error(
      "Motor de análisis no configurado. No se envió contenido a un proveedor.",
    );
  const input = analysisInput(k, sourceIds);
  const raw = await provider.analyze(input, signal);
  return mapAnalysisOutput(k, input, raw, provider, ctx);
}
export class UnconfiguredAnalysisProvider implements QuestionnaireAnalysisProvider {
  readonly id = "unconfigured";
  readonly label = "Motor de análisis no configurado";
  readonly configured = false;
  async analyze(): Promise<unknown> {
    throw new Error(this.label);
  }
}
export const demoSourceTexts = [
  "DEMO · Ficha de empresa ficticia\nNombre comercial: Empresa Ejemplo\nRazón social: Empresa Ejemplo SA\nCobertura: Argentina y Uruguay\nActividad: Distribución de insumos industriales",
  "DEMO · Reunión ficticia posterior\nCobertura: Solo Argentina\nTicket típico: Pendiente de consulta al cliente",
];
export class DemoAnalysisProvider implements QuestionnaireAnalysisProvider {
  readonly id = "demo-fixture-v1";
  readonly label = "Fixture DEMO · sin IA";
  readonly configured = true;
  async analyze(input: AnalysisInput, signal: AbortSignal) {
    if (signal.aborted) throw new Error("Análisis cancelado.");
    if (input.sources.some((s) => !s.demo))
      throw new Error(
        "El fixture DEMO solo admite fuentes identificadas como demostración.",
      );
    const labels: Record<string, string> = {
      "Nombre comercial": "companyProfile.name",
      "Razón social": "companyProfile.legalName",
      Cobertura: "companyProfile.coverage",
      Actividad: "companyProfile.activity",
    };
    return {
      suggestions: input.sources.flatMap((s) =>
        s.text.split("\n").flatMap((line, i) => {
          const pos = line.indexOf(":"),
            q = labels[line.slice(0, pos)];
          return q
            ? [
                {
                  questionId: q,
                  proposedValue: line.slice(pos + 1).trim(),
                  confidence: 0.96,
                  explanation:
                    "Ejemplo determinístico para probar el circuito de revisión. No es una respuesta de IA ni un dato real del cliente.",
                  evidence: [
                    { sourceId: s.id, excerpt: line, paragraph: i + 1 },
                  ],
                },
              ]
            : [];
        }),
      ),
    };
  }
}
