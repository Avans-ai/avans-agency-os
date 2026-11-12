/* Avans OS · capa común del asistente creativo.
 * Tipos y schemas compartidos por el cliente (contexto, panel) y por el
 * servidor (route handler, proveedores). Sin dependencias de navegador. */
import { z } from "zod";

/** Origen de cada pieza de contexto, en orden de prioridad para los asistentes. */
export const SOURCE_KINDS = [
  "discovery",
  "icp",
  "segmento",
  "benchmark",
  "conclusion",
  "plan",
  "objetivo",
  "campana",
  "resultado",
  "aprendizaje",
  "recomendacion",
  "reunion",
  "decision",
  "alcance",
  "trabajo",
] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  discovery: "Discovery",
  icp: "ICP",
  segmento: "Segmento prioritario",
  benchmark: "Benchmark",
  conclusion: "Conclusión competitiva",
  plan: "Plan de Marketing",
  objetivo: "Objetivo comercial",
  campana: "Campaña existente",
  resultado: "Resultado",
  aprendizaje: "Aprendizaje",
  recomendacion: "Recomendación",
  reunion: "Reunión",
  decision: "Decisión aprobada",
  alcance: "Alcance contratado",
  trabajo: "Trabajo existente",
};

/** Estado de validación de la fuente: la IA solo debe apoyarse en validadas o, si no hay, decirlo. */
export type SourceStatus = "validado" | "pendiente" | "demo" | "manual";

export const contextSourceSchema = z.object({
  ref: z.string().min(1).max(120),
  kind: z.enum(SOURCE_KINDS),
  label: z.string().max(200),
  text: z.string().max(1200),
  status: z.enum(["validado", "pendiente", "demo", "manual"]),
  clientSlug: z.string().min(1).max(60),
  date: z.string().max(40).optional(),
});
export type ContextSource = z.infer<typeof contextSourceSchema>;

export const assistantRequestSchema = z.object({
  profileId: z.string().min(1).max(80),
  clientSlug: z.string().min(1).max(60),
  clientName: z.string().max(120),
  serviceId: z.string().max(60),
  operation: z.string().max(60),
  user: z.object({ name: z.string().max(120), role: z.string().max(40) }),
  /** Valores que el usuario ya cargó en el formulario. */
  draft: z.record(z.string(), z.string().max(1200)),
  /** Pedido libre del usuario («¿Qué buscás con esta campaña?»). */
  brief: z.string().max(600).optional(),
  sources: z.array(contextSourceSchema).max(120),
});
export type AssistantRequest = z.infer<typeof assistantRequestSchema>;

/** Lo que devuelve el modelo, antes de normalizar. proposedFields como lista para schemas estrictos. */
export const rawSuggestionSchema = z.object({
  type: z.string().max(80),
  title: z.string().min(1).max(160),
  description: z.string().max(1200),
  rationale: z.string().max(1500),
  proposedFields: z.array(z.object({ field: z.string().max(60), value: z.string().max(1500) })).max(20),
  sourceReferences: z.array(z.string().max(120)).max(20),
  warnings: z.array(z.string().max(300)).max(8),
  similarTo: z.array(z.string().max(120)).max(5),
});
export const rawResultSchema = z.object({
  suggestions: z.array(rawSuggestionSchema).max(6),
  missingContext: z.array(z.string().max(300)).max(10),
});
export type RawAssistantResult = z.infer<typeof rawResultSchema>;

/** JSON Schema equivalente (proveedores con salida estructurada estricta). */
export const RAW_RESULT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["suggestions", "missingContext"],
  properties: {
    suggestions: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "title", "description", "rationale", "proposedFields", "sourceReferences", "warnings", "similarTo"],
        properties: {
          type: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          rationale: { type: "string" },
          proposedFields: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["field", "value"],
              properties: { field: { type: "string" }, value: { type: "string" } },
            },
          },
          sourceReferences: { type: "array", items: { type: "string" } },
          warnings: { type: "array", items: { type: "string" } },
          similarTo: { type: "array", items: { type: "string" } },
        },
      },
    },
    missingContext: { type: "array", items: { type: "string" } },
  },
} as const;

/** Sugerencia normalizada que recibe la interfaz. */
export type CreativeSuggestion = {
  id: string;
  type: string;
  title: string;
  description: string;
  rationale: string;
  proposedFields: Record<string, string>;
  sourceReferences: string[];
  warnings: string[];
  similarTo: string[];
};

export type AssistantResult = {
  suggestions: CreativeSuggestion[];
  missingContext: string[];
  provider: string;
  model: string;
  generatedAt: string;
};

export type AssistantStatus = {
  configured: boolean;
  provider: string | null;
  model: string | null;
  /** Motivo legible cuando no está configurado. */
  reason: string;
};
