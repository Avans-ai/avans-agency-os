import type { CollectionDef, FieldDef } from "./types";
import { CONTENT_STATES } from "./content-workflow";

export const PIECE_STATUSES = CONTENT_STATES;
export const PIECE_CHANNELS = ["Instagram", "Facebook", "LinkedIn", "TikTok", "YouTube", "Newsletter", "Blog"] as const;
export const PIECE_FORMATS = ["Carrusel", "Reel", "Video corto", "Post estático", "Historia", "Artículo", "Newsletter", "Documento LinkedIn"] as const;
/** Canales heredados que el calendario agrupa con los canales del filtro. */
export function channelGroup(channel: string) {
  return channel === "Web" ? "Blog" : channel === "Email" ? "Newsletter" : channel;
}
const owner: FieldDef = { key: "responsable", label: "Responsable", type: "person", list: true };
export const plans: CollectionDef = {
  id: "planes", label: "Planes mensuales", singular: "plan mensual", prefix: "PLAN", titleKey: "nombre", dateKey: "mes", ownerKey: "responsable", statusKey: "estado", empty: "Creá el plan del mes para organizar temáticas, canales y responsables.", description: "Planificación mensual y volumen acordado de contenidos.",
  fields: [
    { key: "nombre", label: "Nombre del plan", type: "text", required: true, list: true, group: "Período", placeholder: "Diciembre 2026 — Cliente" },
    { key: "mes", label: "Mes (AAAA-MM)", type: "text", required: true, list: true, placeholder: "2026-12", group: "Período" },
    { key: "estado", label: "Estado del plan", type: "select", options: ["Planificación", "En producción", "Cerrado"], required: true, list: true, group: "Período" },
    owner,
    { key: "objetivos", label: "Objetivos del mes", type: "textarea", group: "Foco del mes", placeholder: "Un objetivo por línea" },
    { key: "tematicas", label: "Temáticas del mes", type: "textarea", required: true, group: "Foco del mes" },
    { key: "ejes", label: "Ejes previstos", type: "textarea", hint: "Los ejes del plan se cargan en Ejes temáticos y se vinculan a este plan.", group: "Foco del mes" },
    { key: "cantidad", label: "Cantidad de contenidos", type: "number", required: true, list: true, group: "Volumen, canales y fechas" },
    { key: "canales", label: "Canales previstos", type: "text", group: "Volumen, canales y fechas", placeholder: "Instagram, Facebook, LinkedIn" },
    { key: "formatos", label: "Formatos previstos", type: "text", group: "Volumen, canales y fechas", placeholder: "Carrusel, Reel, Historia" },
    { key: "fechas", label: "Fechas e hitos tentativos", type: "textarea", group: "Volumen, canales y fechas" },
  ],
};
export const axes: CollectionDef = {
  id: "ejes", label: "Ejes temáticos", singular: "eje temático", prefix: "EJE", description: "Territorios editoriales vinculados a perfiles, ICP y objetivos del Plan de Marketing.", titleKey: "nombre", statusKey: "estado", empty: "No hay ejes temáticos definidos.",
  fields: [
    { key: "nombre", label: "Eje", type: "text", required: true, list: true },
    { key: "plan", label: "Plan mensual", type: "ref", ref: "planes", list: true },
    { key: "descripcion", label: "Descripción", type: "textarea", list: true },
    { key: "objetivo", label: "Objetivo del eje", type: "textarea" },
    { key: "perfil", label: "Perfil o audiencia", type: "text", list: true, hint: "Público al que se dirige el eje." },
    { key: "icp", label: "ICP relacionado", type: "text" },
    { key: "relacionPlan", label: "Relación con el Plan de Marketing", type: "textarea" },
    { key: "cantidad", label: "Cantidad de contenidos", type: "number" },
    { key: "participacion", label: "Participación objetivo (%)", type: "number", list: true },
    { key: "referencias", label: "Referencias", type: "textarea" },
    { key: "estado", label: "Estado", type: "select", options: ["Activo", "En revisión", "Pausado"], required: true, list: true },
  ],
};
export const ideas: CollectionDef = {
  id: "ideas", label: "Banco de ideas", singular: "idea", prefix: "IDE", description: "Oportunidades, referencias y contenidos futuros con origen; cada idea puede convertirse en contenido.", titleKey: "idea", statusKey: "estado", empty: "Todavía no hay ideas cargadas.",
  fields: [
    { key: "idea", label: "Idea", type: "text", required: true, list: true },
    { key: "eje", label: "Eje", type: "ref", ref: "ejes", list: true },
    { key: "tipo", label: "Tipo", type: "select", options: ["Oportunidad", "Referencia", "Contenido futuro"], list: true },
    { key: "origen", label: "Origen", type: "select", options: ["Reunión", "Benchmark", "Documento", "URL externa", "Resultados", "Cliente", "Equipo", "Tendencia"], list: true },
    { key: "detalle", label: "Por qué resulta interesante", type: "textarea" },
    { key: "url", label: "URL de referencia", type: "text" },
    { key: "captura", label: "Enlace a captura", type: "text" },
    { key: "mesSugerido", label: "Mes sugerido (AAAA-MM)", type: "text", placeholder: "2027-01" },
    { key: "estado", label: "Estado", type: "select", options: ["Nueva", "En evaluación", "Aprobada", "Descartada", "Convertida en pieza"], required: true, list: true },
  ],
};
export const pieces: CollectionDef = {
  id: "piezas", label: "Contenidos", singular: "contenido", prefix: "PZA", description: "Idea y copy se revisan juntos; después se prepara, produce y aprueba el diseño.", titleKey: "titulo", statusKey: "estado", ownerKey: "responsable", dateKey: "fecha", linkTasks: true, empty: "Todavía no hay contenidos planificados.",
  fields: [
    { key: "titulo", label: "Título", type: "text", required: true, list: true },
    { key: "plan", label: "Plan mensual", type: "ref", ref: "planes", list: true },
    { key: "eje", label: "Eje temático", type: "ref", ref: "ejes", list: true },
    { key: "idea", label: "Idea", type: "textarea" },
    { key: "bajada", label: "Bajada explicativa", type: "textarea" },
    { key: "objetivo", label: "Objetivo", type: "textarea" },
    { key: "mensaje", label: "Mensaje", type: "textarea" },
    { key: "cta", label: "CTA", type: "text" },
    { key: "necesitaCliente", label: "Qué necesitamos del cliente", type: "textarea" },
    { key: "formato", label: "Formato", type: "select", options: PIECE_FORMATS, list: true },
    { key: "canal", label: "Canal", type: "select", options: PIECE_CHANNELS, list: true },
    { key: "fecha", label: "Fecha prevista", type: "date", list: true },
    { key: "hora", label: "Horario (HH:MM)", type: "text", placeholder: "10:30" },
    { key: "referencia", label: "URL de referencia", type: "text" },
    { key: "referencias", label: "Otras referencias", type: "textarea" },
    { key: "materialNecesario", label: "Material necesario", type: "textarea" },
    { key: "copy", label: "Copy preliminar", type: "textarea" },
    owner,
    { key: "revisor", label: "Responsable de revisión interna", type: "person" },
    { key: "disenador", label: "Diseñador", type: "person" },
    { key: "clienteResponsable", label: "Contacto del cliente", type: "text" },
    { key: "estado", label: "Estado", type: "select", options: PIECE_STATUSES, list: true },
    { key: "archivoDiseno", label: "Enlace al diseño", type: "text" },
    { key: "version", label: "Versión", type: "text", placeholder: "v1" },
    { key: "brief", label: "Recursos y brief de diseño", type: "textarea" },
    { key: "icp", label: "ICP o segmento", type: "text", group: "Contexto creativo" },
    { key: "conceptoVisual", label: "Concepto visual", type: "textarea", group: "Contexto creativo" },
  ],
};
