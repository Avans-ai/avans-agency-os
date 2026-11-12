/* Motor común del asistente (puro, sin red ni variables de entorno).
 * - validateRequest: schema + aislamiento por cliente.
 * - buildPrompt: instrucciones del especialista + contexto citado por ref.
 * - normalizeResult: schema de salida, campos permitidos, opciones válidas,
 *   fuentes verificables y similitud con trabajo existente. */
import { assistantRequestSchema, rawResultSchema, SOURCE_KIND_LABEL, type AssistantRequest, type AssistantResult, type ContextSource, type CreativeSuggestion } from "./types";
import { profileById, profileFields, type AssistantProfile } from "./profiles";

export class AssistantInputError extends Error {
  constructor(public code: "INVALID_REQUEST" | "UNKNOWN_PROFILE" | "CLIENT_MISMATCH", message: string) {
    super(message);
  }
}

export function validateRequest(input: unknown): { request: AssistantRequest; profile: AssistantProfile } {
  const parsed = assistantRequestSchema.safeParse(input);
  if (!parsed.success) throw new AssistantInputError("INVALID_REQUEST", "El pedido no tiene el formato esperado.");
  const request = parsed.data;
  const profile = profileById(request.profileId);
  if (!profile || profile.serviceId !== request.serviceId) throw new AssistantInputError("UNKNOWN_PROFILE", "No hay un asistente definido para este módulo.");
  // No se mezcla información de clientes: cada fuente debe pertenecer al cliente del pedido.
  if (request.sources.some((source) => source.clientSlug !== request.clientSlug)) throw new AssistantInputError("CLIENT_MISMATCH", "El contexto incluye información de otro cliente.");
  return { request, profile };
}

function sourceLine(source: ContextSource) {
  return `- ref: ${source.ref} | tipo: ${SOURCE_KIND_LABEL[source.kind]} | estado: ${source.status}${source.date ? ` | fecha: ${source.date}` : ""}\n  ${source.label}: ${source.text.replace(/\s+/g, " ").trim()}`;
}

export function buildPrompt(profile: AssistantProfile, request: AssistantRequest) {
  const fields = profileFields(profile)
    .map((field) => `- ${field.key} (${field.label})${field.options ? `: uno de [${field.options.join(" | ")}]` : ""}`)
    .join("\n");
  const order = new Map(profile.sources.map((kind, index) => [kind, index]));
  const sources = [...request.sources]
    .filter((source) => order.has(source.kind))
    .sort((a, b) => (order.get(a.kind) ?? 99) - (order.get(b.kind) ?? 99));
  const system = [
    profile.focus,
    "Trabajás para un único cliente por pedido. No uses conocimiento externo sobre el cliente ni sobre otras cuentas.",
    ...[...profile.rules, ...COMMON_RULES_TEXT].map((rule) => `• ${rule}`),
    `Devolvé como máximo ${profile.maxSuggestions} sugerencias de tipo: ${profile.suggestionTypes.join(", ")}.`,
    "En proposedFields usá solo estos campos (field = clave exacta; en campos con opciones, el valor debe ser una opción exacta):",
    fields,
  ].join("\n");
  const draft = Object.entries(request.draft).filter(([, value]) => value.trim());
  const user = [
    `Cliente: ${request.clientName} (${request.clientSlug}). Acción: ${request.operation}. Usuario: ${request.user.name} (${request.user.role}).`,
    request.brief ? `Pedido del usuario: ${request.brief}` : "",
    draft.length ? `Borrador actual del formulario:\n${draft.map(([key, value]) => `- ${key}: ${value}`).join("\n")}` : "El formulario está vacío.",
    sources.length ? `Fuentes disponibles (citá por ref):\n${sources.map(sourceLine).join("\n")}` : "No hay fuentes disponibles.",
  ].filter(Boolean).join("\n\n");
  return { system, user };
}

const COMMON_RULES_TEXT = [
  "Usá solo información presente en las fuentes. Si falta un dato, decilo en missingContext; no lo inventes.",
  "Cada sugerencia debe citar en sourceReferences los ref exactos de las fuentes usadas.",
  "Priorizá fuentes con estado «validado». Si usás una fuente «pendiente» o «demo», agregá una advertencia.",
  "No repitas trabajo existente: si una idea se parece a un ref de tipo «Trabajo existente» o «Campaña existente», indicá ese ref en similarTo y explicá la diferencia, o descartala.",
  "Menos ideas y mejor fundamentadas, con objetivos distintos entre sí.",
  "Escribí en español rioplatense profesional, sin exageraciones ni promesas de resultados.",
];

const STOPWORDS = new Set("de la el los las un una y o en con para por del al a que se su sus es lo como mas más sin sobre entre este esta estos estas the of and".split(" "));
function tokens(text: string) {
  return new Set(
    text
      .toLocaleLowerCase("es")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word)),
  );
}
/** Similitud léxica (Jaccard) entre dos textos, 0–1. */
export function similarity(a: string, b: string) {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / (left.size + right.size - shared);
}

export const SIMILARITY_THRESHOLD = 0.34;

/** Trabajo existente parecido a una idea (campañas, piezas, iniciativas…): compara títulos y textos completos. */
export function similarWork(title: string, text: string, work: { ref: string; label: string; text: string }[], threshold = SIMILARITY_THRESHOLD) {
  const full = `${title} ${text}`;
  return work
    .map((item) => ({ ...item, score: Math.max(similarity(title, item.label), similarity(full, item.label), similarity(full, `${item.label} ${item.text}`)) }))
    .filter((item) => item.score >= threshold)
    .sort((a, b) => b.score - a.score);
}

export function normalizeResult(
  profile: AssistantProfile,
  request: AssistantRequest,
  raw: unknown,
  meta: { provider: string; model: string; at?: string; id?: () => string },
): AssistantResult {
  const parsed = rawResultSchema.safeParse(raw);
  if (!parsed.success) throw new Error("La respuesta del proveedor no cumple el schema esperado.");
  const fields = new Map(profileFields(profile).map((field) => [field.key, field]));
  const refs = new Set(request.sources.map((source) => source.ref));
  const work = request.sources.filter((source) => source.kind === "trabajo" || source.kind === "campana").map((source) => ({ ref: source.ref, label: source.label, text: source.text }));
  const missing = [...parsed.data.missingContext];
  const suggestions: CreativeSuggestion[] = [];
  const seenTitles: string[] = [];
  parsed.data.suggestions.forEach((item, index) => {
    const warnings = [...item.warnings];
    const proposedFields: Record<string, string> = {};
    for (const { field, value } of item.proposedFields) {
      const def = fields.get(field);
      const clean = value.trim();
      if (!def || !clean) continue;
      if (def.options && !def.options.includes(clean)) {
        warnings.push(`«${def.label}» propuesto («${clean}») no es una opción válida; se omitió.`);
        continue;
      }
      if (def.type === "number" && Number.isNaN(Number(clean))) continue;
      proposedFields[field] = clean.slice(0, def.type === "textarea" ? 1200 : 200);
    }
    const sourceReferences = [...new Set(item.sourceReferences.filter((ref) => refs.has(ref)))];
    if (!sourceReferences.length) {
      missing.push(`Se descartó «${item.title}»: no citaba fuentes del cliente verificables.`);
      return;
    }
    const usesUnvalidated = request.sources.some((source) => sourceReferences.includes(source.ref) && source.status !== "validado");
    if (usesUnvalidated && !warnings.some((warning) => /validad|demo|pendiente/i.test(warning))) warnings.push("Usa fuentes pendientes de validación o de demostración: revisalas antes de decidir.");
    const body = `${item.description} ${Object.values(proposedFields).join(" ")}`;
    const text = `${item.title} ${body}`;
    // Evita varias propuestas con el mismo objetivo y nombres distintos.
    if (seenTitles.some((title) => similarity(title, text) >= 0.5)) return;
    seenTitles.push(text);
    const similarTo = [...new Set([...item.similarTo.filter((ref) => refs.has(ref)), ...similarWork(item.title, body, work).map((match) => match.ref)])];
    suggestions.push({
      id: meta.id ? meta.id() : `SUG-${Date.now().toString(36).toUpperCase()}-${index}`,
      type: item.type || profile.suggestionTypes[0],
      title: item.title.trim(),
      description: item.description.trim(),
      rationale: item.rationale.trim(),
      proposedFields,
      sourceReferences,
      warnings: [...new Set(warnings)],
      similarTo,
    });
  });
  return {
    suggestions: suggestions.slice(0, profile.maxSuggestions),
    missingContext: [...new Set(missing)],
    provider: meta.provider,
    model: meta.model,
    generatedAt: meta.at ?? new Date().toISOString(),
  };
}
