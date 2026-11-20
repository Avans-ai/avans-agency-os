/* Revisión de lineamientos SIN IA (antes de guardar el borrador o enviarlo a revisión del PM).
 * Compara los textos del contenido (título, idea, bajada, copy y CTA) con:
 * - el glosario de marca de la Ficha (palabras a evitar y a usar), y
 * - los don'ts de Contenidos (Plan de Marketing y, si existen, notas operativas anteriores).
 * Es una comparación literal y por palabras clave: no interpreta sentido. El ajuste automático
 * con IA queda pendiente de conexión. Puro: sin React ni almacenamiento. */
import { readArray } from "./content-workflow";

export type GuidelineSourceKind = "glossary" | "plan" | "notes";
export const GUIDELINE_SOURCE_LABEL: Record<GuidelineSourceKind, string> = {
  glossary: "Glosario de la Ficha",
  plan: "Do's & don'ts de Contenidos · Plan de Marketing",
  notes: "Notas operativas anteriores de Contenidos",
};
export const GUIDELINE_AI_PENDING = "Ajuste automático con IA: pendiente de conexión.";
export const CHECK_FIELDS = [["titulo", "Título"], ["idea", "Idea"], ["bajada", "Bajada"], ["copy", "Copy"], ["cta", "CTA"]] as const;

export type GuidelineDont = { text: string; source: Exclude<GuidelineSourceKind, "glossary">; examples?: string };
export type GuidelineSources = { avoid: string[]; use: string[]; donts: GuidelineDont[] };
export type GuidelineWarning = { id: string; field: string; fieldLabel: string; term: string; rule: string; source: GuidelineSourceKind; sourceLabel: string; message: string; severity: "avoid" | "dont" };
export type GuidelineCheck = { warnings: GuidelineWarning[]; suggestions: string[] };
/** Registro de una decisión del Content sobre advertencias: queda en el historial del contenido. */
export type GuidelineOverride = { id: string; at: string; actor: string; stage: string; decision: "Enviado igual"; warnings: { term: string; field: string; source: GuidelineSourceKind; message: string }[] };

const STOPWORDS = new Set(["sobre", "entre", "desde", "hasta", "porque", "cuando", "donde", "nunca", "siempre", "todas", "todos", "tienen", "puede", "pueden", "nuestro", "nuestra", "nuestros", "nuestras", "usar", "evitar", "hacer", "contenido", "contenidos", "publicar", "mostrar"]);
export function normalizeText(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es");
}
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function termPattern(term: string) {
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escape(normalizeText(term.trim()))}(?=$|[^\\p{L}\\p{N}])`, "u");
}
function quoted(text: string) {
  return Array.from(text.matchAll(/[«"“]([^»"”]{3,80})[»"”]/g)).map((match) => match[1].trim()).filter(Boolean);
}
function stems(text: string) {
  return Array.from(new Set(normalizeText(text).split(/[^\p{L}\p{N}]+/u).filter((word) => word.length >= 5 && !STOPWORDS.has(word)).map((word) => word.slice(0, 5))));
}

export function checkContentGuidelines(values: Record<string, string | undefined>, sources: GuidelineSources): GuidelineCheck {
  const warnings: GuidelineWarning[] = [];
  const fields = CHECK_FIELDS.map(([key, label]) => ({ key, label, text: values[key]?.trim() || "" })).filter((field) => field.text);
  for (const term of sources.avoid.map((item) => item.trim()).filter(Boolean)) {
    const pattern = termPattern(term);
    for (const field of fields) {
      if (!pattern.test(normalizeText(field.text))) continue;
      warnings.push({ id: `avoid:${normalizeText(term)}:${field.key}`, field: field.key, fieldLabel: field.label, term, rule: term, source: "glossary", sourceLabel: GUIDELINE_SOURCE_LABEL.glossary,
        message: `Estás usando «${term}», que el cliente pidió evitar`, severity: "avoid" });
    }
  }
  for (const dont of sources.donts) {
    const phrases = quoted(`${dont.text} ${dont.examples || ""}`);
    const ruleStems = stems(dont.text);
    for (const field of fields) {
      const text = normalizeText(field.text);
      const phrase = phrases.find((item) => termPattern(item).test(text));
      const fieldStems = new Set(stems(field.text));
      const hits = ruleStems.filter((stem) => fieldStems.has(stem));
      if (!phrase && hits.length < Math.min(2, ruleStems.length || 2)) continue;
      const id = `dont:${normalizeText(dont.text)}:${field.key}`;
      if (warnings.some((item) => item.id === id)) continue;
      warnings.push({ id, field: field.key, fieldLabel: field.label, term: phrase || dont.text, rule: dont.text, source: dont.source, sourceLabel: GUIDELINE_SOURCE_LABEL[dont.source],
        message: phrase ? `Usás «${phrase}», que aparece en un don't del cliente: «${dont.text}»` : `Puede contradecir un don't del cliente: «${dont.text}»`, severity: "dont" });
    }
  }
  const allText = normalizeText(fields.map((field) => field.text).join(" "));
  const use = sources.use.map((item) => item.trim()).filter(Boolean);
  const suggestions = warnings.length && use.length && !use.some((term) => termPattern(term).test(allText))
    ? [`Podés sumar vocabulario de marca: ${use.slice(0, 5).map((term) => `«${term}»`).join(", ")} · ${GUIDELINE_SOURCE_LABEL.glossary}`]
    : [];
  return { warnings, suggestions };
}

export function guidelineOverrides(raw?: string) {
  return readArray<GuidelineOverride>(raw);
}
export function buildGuidelineOverride(warnings: GuidelineWarning[], actor: string, at: string, stage: string, previous: GuidelineOverride[]): GuidelineOverride {
  return { id: `GUIDE-${at}-${previous.length}`, at, actor, stage, decision: "Enviado igual", warnings: warnings.map((item) => ({ term: item.term, field: item.fieldLabel, source: item.source, message: item.message })) };
}
/** Clave transitoria con la que el editor pide registrar una decisión «guardar igual». Nunca se persiste como valor. */
export const GUIDELINE_OVERRIDE_FIELD = "__guidelineOverride";
