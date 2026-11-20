/* Perfiles del asistente: un especialista por módulo y acción, no un chat genérico.
 * Cada perfil define qué información necesita (en orden de prioridad), qué tipo de
 * recomendaciones produce, qué campos del formulario puede completar, sus límites
 * y validaciones. Los campos y sus opciones salen de la definición de la colección,
 * así el formulario y el asistente nunca divergen.
 * Solo hay perfiles para módulos con un proceso de IA definido. */
import type { ServiceId } from "../os-data";
import { collectionDef } from "../modules/collections";
import type { FieldDef } from "../modules/types";
import type { SourceKind } from "./types";

export type AssistantProfile = {
  id: string;
  serviceId: ServiceId;
  collection: string;
  operation: string;
  /** Título del panel. */
  title: string;
  /** Rol del especialista y qué debe proponer. */
  focus: string;
  /** Tipos de sugerencia esperados. */
  suggestionTypes: string[];
  /** Campos que el asistente puede completar (nunca estado, responsable ni fechas comprometidas). */
  fieldKeys: string[];
  /** Fuentes que necesita, en orden de prioridad. */
  sources: SourceKind[];
  /** Mínimo de contexto para que valga la pena pedir ideas. */
  required: { kinds: SourceKind[]; message: string }[];
  rules: string[];
  maxSuggestions: number;
  /** Cómo convertir una recomendación vigente en borrador (sin IA). */
  fromRecommendation: { titleField: string; detailField: string };
  /** Valores iniciales seguros del formulario asistido. */
  initial: Record<string, string>;
};

export const ASSISTANT_PROFILES: AssistantProfile[] = [
  {
    id: "publicidad-digital:campanas",
    serviceId: "publicidad-digital",
    collection: "campanas",
    operation: "crear-campana",
    title: "Asistente IA · Ideas para esta campaña",
    focus:
      "Sos estratega de Publicidad Digital de Avans. Proponé campañas pagas: concepto (nombre y enfoque), objetivo compatible con el Plan, público (ICP o segmento), plataforma justificada, mensaje principal, propuesta creativa (ángulo, concepto visual y formatos) y una distribución de inversión orientativa solo si hay presupuesto y datos que la respalden.",
    suggestionTypes: ["Concepto de campaña"],
    fieldKeys: ["nombre", "objetivo", "plataforma", "audiencia", "mensaje", "propuestaCreativa", "distribucion", "notas"],
    sources: ["discovery", "icp", "segmento", "benchmark", "conclusion", "plan", "objetivo", "campana", "resultado", "aprendizaje", "recomendacion", "reunion", "decision", "alcance"],
    required: [
      { kinds: ["icp", "segmento"], message: "No hay ICP ni segmentos cargados en el Discovery." },
      { kinds: ["plan", "objetivo", "decision"], message: "No hay objetivos del Plan ni decisiones aprobadas para Publicidad digital." },
    ],
    rules: ["Nunca propongas activar, publicar ni enviar la campaña: solo un borrador para revisar."],
    maxSuggestions: 3,
    fromRecommendation: { titleField: "nombre", detailField: "notas" },
    initial: { estado: "Borrador" },
  },
  {
    id: "contenidos:piezas",
    serviceId: "contenidos",
    collection: "piezas",
    operation: "crear-contenido",
    title: "Asistente IA · Ideas para este contenido",
    focus:
      "Sos estratega de Contenidos de Avans. Proponé publicaciones: idea, eje temático, ICP, mensaje, formato, canal, copy inicial, concepto visual, CTA y justificación estratégica. Revisá el calendario y las piezas recientes para no repetir temas ni ángulos.",
    suggestionTypes: ["Idea de publicación"],
    fieldKeys: ["titulo", "formato", "canal", "icp", "mensaje", "copy", "conceptoVisual", "cta", "brief"],
    sources: ["discovery", "icp", "segmento", "plan", "conclusion", "benchmark", "trabajo", "resultado", "aprendizaje", "recomendacion", "reunion", "decision", "alcance"],
    required: [{ kinds: ["icp", "segmento", "discovery"], message: "No hay información validada del negocio ni de sus audiencias." }],
    rules: ["El copy es un primer borrador para revisar, no un texto final."],
    maxSuggestions: 3,
    fromRecommendation: { titleField: "titulo", detailField: "brief" },
    initial: { estado: "Idea" },
  },
  {
    id: "diseno-marca:trabajos",
    serviceId: "diseno-marca",
    collection: "trabajos",
    operation: "crear-pieza-diseno",
    title: "Asistente IA · Ideas para esta pieza",
    focus:
      "Sos director de arte de Diseño de marca de Avans. Proponé la pieza o proyecto creativo: concepto visual, objetivo, público, referencias, lineamientos de marca aplicables, recursos disponibles, formatos y consideraciones de diseño. Respetá los lineamientos de marca del Plan (dirección visual, paleta, tipografía, tono) como restricciones.",
    suggestionTypes: ["Propuesta de pieza"],
    fieldKeys: ["nombre", "concepto", "objetivo", "publico", "referencias", "lineamientos", "recursos", "formatos", "consideraciones"],
    sources: ["plan", "discovery", "icp", "benchmark", "conclusion", "trabajo", "recomendacion", "decision", "reunion", "alcance"],
    required: [{ kinds: ["plan", "discovery"], message: "No hay lineamientos de marca en el Plan ni información validada del negocio." }],
    rules: ["No inventes colores, tipografías ni logos que no estén en las fuentes."],
    maxSuggestions: 3,
    fromRecommendation: { titleField: "nombre", detailField: "detalle" },
    initial: {},
  },
  {
    id: "audiovisuales:producciones",
    serviceId: "audiovisuales",
    collection: "producciones",
    operation: "crear-produccion",
    title: "Asistente IA · Ideas para esta producción",
    focus:
      "Sos productor audiovisual de Avans. Proponé producciones: concepto, objetivo, guion preliminar breve, protagonistas, locación, formato, duración, mensaje, estilo de edición, adaptaciones por canal y referencias. Considerá producciones en curso para no duplicarlas.",
    suggestionTypes: ["Propuesta de producción"],
    fieldKeys: ["titulo", "formato", "objetivo", "concepto", "mensaje", "guion", "protagonistas", "locacion", "duracion", "estiloEdicion", "adaptaciones", "referencias"],
    sources: ["discovery", "icp", "plan", "benchmark", "conclusion", "trabajo", "aprendizaje", "recomendacion", "reunion", "decision", "alcance"],
    required: [{ kinds: ["discovery", "icp", "plan"], message: "No hay información validada del negocio ni del Plan para orientar la producción." }],
    rules: ["Protagonistas y locaciones solo si surgen de las fuentes; si no, indicalo como dato a definir."],
    maxSuggestions: 3,
    fromRecommendation: { titleField: "titulo", detailField: "objetivo" },
    initial: { etapa: "Brief", estado: "En curso" },
  },
  {
    id: "desarrollo-web:proyectos",
    serviceId: "desarrollo-web",
    collection: "proyectos",
    operation: "crear-proyecto-web",
    title: "Asistente IA · Ideas para este proyecto web",
    focus:
      "Sos estratega web de Avans. Proponé el proyecto o landing: objetivo, público, propuesta principal, estructura y secciones sugeridas, CTA, requisitos, integraciones, criterios de conversión y consideraciones de SEO y visibilidad en buscadores con IA.",
    suggestionTypes: ["Propuesta de proyecto web"],
    fieldKeys: ["nombre", "tipo", "alcance", "objetivo", "publico", "propuesta", "estructura", "cta", "requisitosClave", "integraciones", "conversion", "seo"],
    sources: ["discovery", "icp", "segmento", "plan", "benchmark", "conclusion", "campana", "trabajo", "resultado", "recomendacion", "decision", "alcance"],
    required: [{ kinds: ["discovery", "icp", "segmento"], message: "No hay información validada del negocio ni de sus audiencias." }],
    rules: ["No prometas integraciones que no figuren en las fuentes; listalas como a validar."],
    maxSuggestions: 3,
    fromRecommendation: { titleField: "nombre", detailField: "alcance" },
    initial: { etapa: "Definición", estado: "Planificado" },
  },
  {
    id: "estrategia:prioridades",
    serviceId: "estrategia",
    collection: "prioridades",
    operation: "crear-iniciativa",
    title: "Asistente IA · Ideas para esta iniciativa",
    focus:
      "Sos estratega de cuenta de Avans. Proponé iniciativas: oportunidad detectada, objetivo, módulos involucrados, justificación, prioridad, impacto esperado, módulo responsable sugerido, dependencias y próximas acciones. Basate en hallazgos de Benchmark, decisiones, reuniones, bloqueos y resultados.",
    suggestionTypes: ["Iniciativa estratégica"],
    fieldKeys: ["iniciativa", "modulo", "horizonte", "oportunidad", "objetivo", "modulosInvolucrados", "prioridad", "impacto", "dependencias", "proximasAcciones", "detalle"],
    sources: ["conclusion", "benchmark", "discovery", "plan", "decision", "reunion", "resultado", "aprendizaje", "recomendacion", "trabajo", "alcance"],
    required: [{ kinds: ["conclusion", "benchmark", "decision", "reunion", "recomendacion"], message: "No hay hallazgos, decisiones, reuniones ni recomendaciones registradas." }],
    rules: ["Solo módulos contratados figuran como responsables; los demás, como oportunidad a conversar con el cliente."],
    maxSuggestions: 3,
    fromRecommendation: { titleField: "iniciativa", detailField: "detalle" },
    initial: { estado: "Planificada" },
  },
];

export function assistantProfile(serviceId: string, collection: string) {
  return ASSISTANT_PROFILES.find((profile) => profile.serviceId === serviceId && profile.collection === collection);
}
export function profileById(id: string) {
  return ASSISTANT_PROFILES.find((profile) => profile.id === id);
}

/** Definición de los campos que el perfil puede completar (fuente: la colección). */
export function profileFields(profile: AssistantProfile): FieldDef[] {
  const def = collectionDef(profile.serviceId, profile.collection);
  if (!def) return [];
  return profile.fieldKeys.map((key) => def.fields.find((field) => field.key === key)).filter((field): field is FieldDef => Boolean(field));
}
