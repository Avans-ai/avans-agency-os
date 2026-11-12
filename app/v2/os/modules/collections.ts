/* Definición de los objetos de trabajo propios de cada módulo.
 * Solo se modelan procesos que ya estaban definidos en el código o en los documentos:
 * - Publicidad digital, Contenidos, Estrategia, Desarrollo web y Audiovisuales tienen
 *   objetos específicos (pedido explícito de la reunión del 3 nov y DEFAULT_SCOPE).
 * - CRM, IA y automatizaciones, Diseño de marca, Soluciones gráficas y Mercado Libre usan
 *   un único objeto genérico cuyas etapas son las ya definidas en service-workspace-data.ts. */
import { people, serviceCatalog, type ServiceId } from "../os-data";
import { serviceWorkspaceById } from "../service-workspace-data";
import type { CollectionDef, FieldDef } from "./types";

export const PEOPLE = people.map((person) => person.name);

const owner = (label = "Responsable"): FieldDef => ({ key: "responsable", label, type: "person", list: true });

/* ───────── Publicidad digital ───────── */
export const CAMPAIGN_STATUSES = ["Borrador", "En preparación", "Activa", "Pausada", "Finalizada"] as const;
export const CAMPAIGN_PLATFORMS = ["Meta Ads", "Google Ads", "LinkedIn Ads", "TikTok Ads", "YouTube Ads", "Otra"] as const;
export const CAMPAIGN_OBJECTIVES = ["Generación de leads", "Alcance y reconocimiento", "Tráfico", "Conversiones", "Ventas ecommerce", "Remarketing"] as const;

const campaigns: CollectionDef = {
  id: "campanas",
  label: "Campañas",
  singular: "campaña",
  prefix: "CMP",
  description: "Campañas del cliente con objetivo, plataforma, audiencia, presupuesto, período y responsable.",
  titleKey: "nombre",
  statusKey: "estado",
  ownerKey: "responsable",
  dateKey: "inicio",
  linkTasks: true,
  empty: "Todavía no hay campañas cargadas para este cliente.",
  fields: [
    { key: "nombre", label: "Nombre", type: "text", required: true, list: true, placeholder: "Ej.: Lanzamiento · Generación de demanda" },
    { key: "objetivo", label: "Objetivo", type: "select", options: CAMPAIGN_OBJECTIVES, required: true, list: true },
    { key: "plataforma", label: "Plataforma", type: "select", options: CAMPAIGN_PLATFORMS, required: true, list: true },
    { key: "audiencia", label: "Audiencia", type: "textarea", placeholder: "Segmentos, intereses, cargos o listas" },
    { key: "presupuesto", label: "Presupuesto del período (ARS)", type: "number", required: true, list: true },
    { key: "estado", label: "Estado", type: "select", options: CAMPAIGN_STATUSES, required: true, list: true },
    owner(),
    { key: "inicio", label: "Inicio", type: "date", required: true },
    { key: "fin", label: "Fin", type: "date" },
    { key: "notas", label: "Notas", type: "textarea" },
  ],
};

const creatives: CollectionDef = {
  id: "creatividades",
  label: "Producción creativa",
  singular: "pieza creativa",
  prefix: "CRE",
  description: "Brief, piezas, copys, versiones, feedback y aprobación de las creatividades de pauta.",
  titleKey: "pieza",
  statusKey: "estado",
  ownerKey: "responsable",
  approval: { pending: "En aprobación", approved: "Aprobada", changes: "Cambios pedidos" },
  linkTasks: true,
  empty: "No hay piezas creativas para pauta todavía.",
  fields: [
    { key: "pieza", label: "Pieza", type: "text", required: true, list: true },
    { key: "campana", label: "Campaña", type: "ref", ref: "campanas", list: true },
    { key: "formato", label: "Formato", type: "select", options: ["Imagen", "Carrusel", "Video", "Historia", "Texto de búsqueda", "Banner"], list: true },
    { key: "brief", label: "Brief", type: "textarea" },
    { key: "copy", label: "Copy", type: "textarea" },
    { key: "version", label: "Versión", type: "text", list: true, placeholder: "v1" },
    { key: "estado", label: "Estado", type: "select", options: ["Brief", "En producción", "En revisión", "En aprobación", "Aprobada", "Cambios pedidos"], required: true, list: true },
    { key: "feedback", label: "Feedback", type: "textarea" },
    owner(),
  ],
};

const optimizations: CollectionDef = {
  id: "optimizaciones",
  label: "Optimización",
  singular: "optimización",
  prefix: "OPT",
  description: "Registro de hipótesis y cambios: qué se propuso, qué se hizo, cuándo, quién y qué resultado se esperaba y se observó.",
  titleKey: "hipotesis",
  statusKey: "estado",
  ownerKey: "responsable",
  dateKey: "fecha",
  empty: "Todavía no hay optimizaciones registradas.",
  fields: [
    { key: "hipotesis", label: "Hipótesis", type: "textarea", required: true, list: true },
    { key: "campana", label: "Campaña", type: "ref", ref: "campanas", list: true },
    { key: "cambioPropuesto", label: "Cambio propuesto", type: "textarea", required: true },
    { key: "cambioRealizado", label: "Cambio realizado", type: "textarea" },
    { key: "fecha", label: "Fecha", type: "date", list: true },
    owner(),
    { key: "resultadoEsperado", label: "Resultado esperado", type: "text", list: true },
    { key: "resultadoObservado", label: "Resultado observado", type: "text", list: true },
    { key: "estado", label: "Estado", type: "select", options: ["Propuesta", "Aplicada", "En evaluación", "Validada", "Descartada"], required: true, list: true },
  ],
};

const paidLearnings: CollectionDef = {
  id: "aprendizajes",
  label: "Aprendizajes",
  singular: "aprendizaje",
  prefix: "APR",
  description: "Lo que funcionó y lo que no, con evidencia y cómo aplicarlo.",
  titleKey: "aprendizaje",
  dateKey: "fecha",
  empty: "Sin aprendizajes registrados.",
  fields: [
    { key: "aprendizaje", label: "Aprendizaje", type: "text", required: true, list: true },
    { key: "evidencia", label: "Evidencia", type: "textarea", list: true },
    { key: "campana", label: "Campaña", type: "ref", ref: "campanas", list: true },
    { key: "fecha", label: "Fecha", type: "date", list: true },
    { key: "aplicar", label: "Cómo aplicarlo", type: "textarea" },
  ],
};

/* ───────── Contenidos ───────── */
export const PIECE_STATUSES = ["Idea", "Brief", "En producción", "En revisión", "En aprobación", "Cambios pedidos", "Programada", "Publicada"] as const;
export const PIECE_FORMATS = ["Carrusel", "Reel", "Video corto", "Post estático", "Historia", "Artículo", "Newsletter", "Documento LinkedIn"] as const;
export const PIECE_CHANNELS = ["Instagram", "LinkedIn", "Facebook", "YouTube", "TikTok", "Web", "Email"] as const;

const axes: CollectionDef = {
  id: "ejes",
  label: "Ejes temáticos",
  singular: "eje temático",
  prefix: "EJE",
  description: "Territorios editoriales vinculados a perfiles y objetivos.",
  titleKey: "nombre",
  statusKey: "estado",
  empty: "No hay ejes temáticos definidos.",
  fields: [
    { key: "nombre", label: "Eje", type: "text", required: true, list: true },
    { key: "descripcion", label: "Descripción", type: "textarea", list: true },
    { key: "perfil", label: "Perfil o audiencia", type: "text", list: true },
    { key: "participacion", label: "Participación objetivo (%)", type: "number", list: true },
    { key: "estado", label: "Estado", type: "select", options: ["Activo", "En revisión", "Pausado"], required: true, list: true },
  ],
};

const ideas: CollectionDef = {
  id: "ideas",
  label: "Ideas",
  singular: "idea",
  prefix: "IDE",
  description: "Banco de ideas antes de convertirse en brief o pieza.",
  titleKey: "idea",
  statusKey: "estado",
  empty: "Todavía no hay ideas cargadas.",
  fields: [
    { key: "idea", label: "Idea", type: "text", required: true, list: true },
    { key: "eje", label: "Eje", type: "ref", ref: "ejes", list: true },
    { key: "origen", label: "Origen", type: "select", options: ["Reunión", "Benchmark", "Resultados", "Cliente", "Equipo", "Tendencia"], list: true },
    { key: "detalle", label: "Detalle", type: "textarea" },
    { key: "estado", label: "Estado", type: "select", options: ["Nueva", "En evaluación", "Aprobada", "Descartada", "Convertida en pieza"], required: true, list: true },
  ],
};

const pieces: CollectionDef = {
  id: "piezas",
  label: "Piezas",
  singular: "pieza",
  prefix: "PZA",
  description: "Producción editorial: brief, copy, formato, canal, versión, feedback, aprobación y publicación.",
  titleKey: "titulo",
  statusKey: "estado",
  ownerKey: "responsable",
  dateKey: "fecha",
  approval: { pending: "En aprobación", approved: "Programada", changes: "Cambios pedidos" },
  linkTasks: true,
  empty: "No hay piezas en producción.",
  fields: [
    { key: "titulo", label: "Pieza", type: "text", required: true, list: true },
    { key: "eje", label: "Eje", type: "ref", ref: "ejes", list: true },
    { key: "formato", label: "Formato", type: "select", options: PIECE_FORMATS, required: true, list: true },
    { key: "canal", label: "Canal", type: "select", options: PIECE_CHANNELS, required: true, list: true },
    { key: "fecha", label: "Fecha de publicación", type: "date", required: true, list: true },
    { key: "estado", label: "Estado", type: "select", options: PIECE_STATUSES, required: true, list: true },
    owner(),
    { key: "brief", label: "Brief", type: "textarea" },
    { key: "copy", label: "Copy", type: "textarea" },
    { key: "version", label: "Versión", type: "text", placeholder: "v1" },
    { key: "feedback", label: "Feedback", type: "textarea" },
    { key: "enlace", label: "Enlace de publicación", type: "text", placeholder: "Se completa al publicar" },
  ],
};

const contentLearnings: CollectionDef = {
  ...paidLearnings,
  description: "Aprendizajes editoriales con evidencia y propuesta de aplicación.",
  fields: [
    { key: "aprendizaje", label: "Aprendizaje", type: "text", required: true, list: true },
    { key: "evidencia", label: "Evidencia", type: "textarea", list: true },
    { key: "eje", label: "Eje", type: "ref", ref: "ejes", list: true },
    { key: "fecha", label: "Fecha", type: "date", list: true },
    { key: "aplicar", label: "Propuesta para el próximo período", type: "textarea" },
  ],
};

/* ───────── Estrategia y coordinación ───────── */
const SERVICE_LABELS = serviceCatalog.map((service) => service.label);

const priorities: CollectionDef = {
  id: "prioridades",
  label: "Planificación",
  singular: "prioridad",
  prefix: "PRI",
  description: "Prioridades de la cuenta por horizonte, con módulo responsable y estado.",
  titleKey: "iniciativa",
  statusKey: "estado",
  ownerKey: "responsable",
  linkTasks: true,
  empty: "No hay prioridades planificadas.",
  fields: [
    { key: "iniciativa", label: "Prioridad", type: "text", required: true, list: true },
    { key: "modulo", label: "Módulo", type: "select", options: SERVICE_LABELS, list: true },
    { key: "horizonte", label: "Horizonte", type: "select", options: ["Esta semana", "Este mes", "Trimestre"], required: true, list: true },
    owner(),
    { key: "estado", label: "Estado", type: "select", options: ["Planificada", "En curso", "Bloqueada", "Cumplida"], required: true, list: true },
    { key: "detalle", label: "Detalle", type: "textarea" },
  ],
};

const meetings: CollectionDef = {
  id: "reuniones",
  label: "Reuniones",
  singular: "reunión",
  prefix: "REU",
  description: "Reuniones de coordinación con fecha, participantes, acuerdos y próximos pasos.",
  titleKey: "tema",
  statusKey: "estado",
  dateKey: "fecha",
  empty: "No hay reuniones registradas.",
  fields: [
    { key: "tema", label: "Tema", type: "text", required: true, list: true },
    { key: "fecha", label: "Fecha", type: "date", required: true, list: true },
    { key: "participantes", label: "Participantes", type: "text", list: true },
    { key: "acuerdos", label: "Acuerdos", type: "textarea" },
    { key: "proximosPasos", label: "Próximos pasos", type: "textarea" },
    { key: "estado", label: "Estado", type: "select", options: ["Programada", "Realizada", "Acta pendiente"], required: true, list: true },
  ],
};

const decisions: CollectionDef = {
  id: "decisiones",
  label: "Decisiones",
  singular: "decisión",
  prefix: "DEC",
  description: "Registro de decisiones con motivo, impacto y responsable.",
  titleKey: "decision",
  statusKey: "estado",
  ownerKey: "responsable",
  dateKey: "fecha",
  empty: "Todavía no hay decisiones registradas.",
  fields: [
    { key: "decision", label: "Decisión", type: "text", required: true, list: true },
    { key: "fecha", label: "Fecha", type: "date", list: true },
    { key: "motivo", label: "Motivo", type: "textarea" },
    { key: "impacto", label: "Módulos o entregables afectados", type: "text", list: true },
    owner(),
    { key: "estado", label: "Estado", type: "select", options: ["Propuesta", "Tomada", "Revisar"], required: true, list: true },
  ],
};

const risks: CollectionDef = {
  id: "riesgos",
  label: "Riesgos y bloqueos",
  singular: "riesgo",
  prefix: "RSG",
  description: "Riesgos, bloqueos y dependencias del cliente con mitigación y responsable.",
  titleKey: "riesgo",
  statusKey: "estado",
  ownerKey: "responsable",
  empty: "No hay riesgos registrados.",
  fields: [
    { key: "riesgo", label: "Riesgo", type: "text", required: true, list: true },
    { key: "tipo", label: "Tipo", type: "select", options: ["Riesgo", "Bloqueo", "Dependencia del cliente"], required: true, list: true },
    { key: "probabilidad", label: "Probabilidad", type: "select", options: ["Alta", "Media", "Baja"], list: true },
    { key: "impacto", label: "Impacto", type: "select", options: ["Alto", "Medio", "Bajo"], list: true },
    { key: "mitigacion", label: "Mitigación", type: "textarea" },
    owner(),
    { key: "estado", label: "Estado", type: "select", options: ["Abierto", "Mitigando", "Cerrado"], required: true, list: true },
  ],
};

/* ───────── Desarrollo web ───────── */
export const WEB_STAGES = ["Definición", "Arquitectura", "Diseño", "Desarrollo", "QA", "Publicación", "Mantenimiento"] as const;

const webProjects: CollectionDef = {
  id: "proyectos",
  label: "Proyectos web",
  singular: "proyecto web",
  prefix: "WEB",
  description: "Sitios, landings y micrositios con alcance, etapa, entorno y fecha objetivo.",
  titleKey: "nombre",
  statusKey: "estado",
  ownerKey: "responsable",
  dateKey: "fechaObjetivo",
  approval: { pending: "En aprobación", approved: "Aprobado", changes: "Cambios pedidos" },
  linkTasks: true,
  empty: "No hay proyectos web.",
  fields: [
    { key: "nombre", label: "Proyecto", type: "text", required: true, list: true },
    { key: "tipo", label: "Tipo", type: "select", options: ["Sitio institucional", "Landing", "Ecommerce", "Micrositio", "Mantenimiento"], required: true, list: true },
    { key: "alcance", label: "Alcance", type: "textarea" },
    { key: "etapa", label: "Etapa", type: "select", options: WEB_STAGES, required: true, list: true },
    { key: "entorno", label: "Entorno", type: "select", options: ["Local", "Staging", "Producción"], list: true },
    owner(),
    { key: "fechaObjetivo", label: "Fecha objetivo", type: "date", list: true },
    { key: "estado", label: "Estado", type: "select", options: ["Planificado", "En curso", "Bloqueado", "En aprobación", "Aprobado", "Cambios pedidos", "Publicado"], required: true, list: true },
  ],
};

const sitemap: CollectionDef = {
  id: "sitemap",
  label: "Sitemap",
  singular: "página",
  prefix: "PAG",
  description: "Árbol de páginas con ruta, plantilla, estado de contenido y avance.",
  titleKey: "pagina",
  statusKey: "estado",
  empty: "El sitemap todavía no tiene páginas.",
  fields: [
    { key: "pagina", label: "Página", type: "text", required: true, list: true },
    { key: "ruta", label: "Ruta", type: "text", list: true, placeholder: "/nosotros" },
    { key: "padre", label: "Página padre", type: "ref", ref: "sitemap", list: true },
    { key: "plantilla", label: "Plantilla", type: "text", list: true },
    { key: "contenido", label: "Contenido", type: "select", options: ["Pendiente del cliente", "En redacción", "Cargado"], list: true },
    { key: "estado", label: "Estado", type: "select", options: ["Planificada", "En diseño", "En desarrollo", "Lista", "Publicada"], required: true, list: true },
  ],
};

const requirements: CollectionDef = {
  id: "requisitos",
  label: "Requisitos",
  singular: "requisito",
  prefix: "REQ",
  description: "Requisitos funcionales, técnicos y de contenido con criterio de aceptación.",
  titleKey: "requisito",
  statusKey: "estado",
  empty: "No hay requisitos cargados.",
  fields: [
    { key: "requisito", label: "Requisito", type: "text", required: true, list: true },
    { key: "tipo", label: "Tipo", type: "select", options: ["Funcional", "Contenido", "Técnico", "Medición", "SEO", "Accesibilidad"], required: true, list: true },
    { key: "prioridad", label: "Prioridad", type: "select", options: ["Alta", "Media", "Baja"], list: true },
    { key: "proyecto", label: "Proyecto", type: "ref", ref: "proyectos", list: true },
    { key: "criterio", label: "Criterio de aceptación", type: "textarea" },
    { key: "estado", label: "Estado", type: "select", options: ["Pendiente", "En desarrollo", "Validado", "Descartado"], required: true, list: true },
  ],
};

const qa: CollectionDef = {
  id: "qa",
  label: "QA",
  singular: "caso de QA",
  prefix: "QA",
  description: "Casos de prueba previos a publicar: responsive, formularios, medición y regresiones.",
  titleKey: "caso",
  statusKey: "resultado",
  ownerKey: "responsable",
  dateKey: "fecha",
  empty: "No hay casos de QA.",
  fields: [
    { key: "caso", label: "Caso", type: "text", required: true, list: true },
    { key: "area", label: "Área", type: "select", options: ["Responsive", "Formularios", "Medición", "Accesibilidad", "Performance", "Contenido", "Regresión"], required: true, list: true },
    { key: "dispositivo", label: "Dispositivo o navegador", type: "text", list: true },
    { key: "resultado", label: "Resultado", type: "select", options: ["Pendiente", "Aprobado", "Falla", "Bloqueado"], required: true, list: true },
    owner(),
    { key: "evidencia", label: "Evidencia", type: "textarea" },
    { key: "fecha", label: "Fecha", type: "date" },
  ],
};

const releases: CollectionDef = {
  id: "publicaciones",
  label: "Publicaciones",
  singular: "publicación",
  prefix: "REL",
  description: "Versiones publicadas en staging o producción con cambios y responsable.",
  titleKey: "version",
  statusKey: "estado",
  ownerKey: "responsable",
  dateKey: "fecha",
  empty: "Todavía no hay publicaciones.",
  fields: [
    { key: "version", label: "Versión", type: "text", required: true, list: true },
    { key: "entorno", label: "Entorno", type: "select", options: ["Staging", "Producción"], required: true, list: true },
    { key: "fecha", label: "Fecha", type: "date", list: true },
    { key: "cambios", label: "Cambios", type: "textarea", list: true },
    owner(),
    { key: "estado", label: "Estado", type: "select", options: ["Planificada", "Publicada", "Revertida"], required: true, list: true },
  ],
};

const maintenance: CollectionDef = {
  id: "mantenimiento",
  label: "Mantenimiento",
  singular: "solicitud",
  prefix: "MNT",
  description: "Solicitudes de corrección, actualización o mejora después de publicar.",
  titleKey: "solicitud",
  statusKey: "estado",
  ownerKey: "responsable",
  empty: "No hay solicitudes de mantenimiento: el sitio todavía no está en producción o no hay pedidos abiertos.",
  fields: [
    { key: "solicitud", label: "Solicitud", type: "text", required: true, list: true },
    { key: "tipo", label: "Tipo", type: "select", options: ["Corrección", "Actualización", "Mejora", "Seguridad"], required: true, list: true },
    { key: "prioridad", label: "Prioridad", type: "select", options: ["Alta", "Media", "Baja"], list: true },
    { key: "solicitante", label: "Solicitante", type: "text", list: true },
    owner(),
    { key: "estado", label: "Estado", type: "select", options: ["Abierta", "En curso", "Resuelta"], required: true, list: true },
  ],
};

/* ───────── Audiovisuales ───────── */
export const AV_STAGES = ["Brief", "Guion", "Preproducción", "Rodaje", "Edición", "Aprobación", "Entrega"] as const;

const productions: CollectionDef = {
  id: "producciones",
  label: "Producciones",
  singular: "producción",
  prefix: "PRD",
  description: "Producciones con formato, etapa, objetivo, responsable y entrega comprometida.",
  titleKey: "titulo",
  statusKey: "estado",
  ownerKey: "responsable",
  dateKey: "fechaEntrega",
  approval: { pending: "En aprobación", approved: "Aprobada", changes: "Cambios pedidos" },
  linkTasks: true,
  empty: "No hay producciones.",
  fields: [
    { key: "titulo", label: "Producción", type: "text", required: true, list: true },
    { key: "formato", label: "Formato", type: "select", options: ["Serie", "Video institucional", "Reel", "Spot", "Cápsula", "Entrevista"], required: true, list: true },
    { key: "etapa", label: "Etapa", type: "select", options: AV_STAGES, required: true, list: true },
    { key: "objetivo", label: "Objetivo", type: "textarea" },
    owner(),
    { key: "fechaEntrega", label: "Entrega comprometida", type: "date", list: true },
    { key: "estado", label: "Estado", type: "select", options: ["En curso", "Bloqueada", "En aprobación", "Aprobada", "Cambios pedidos", "Entregada"], required: true, list: true },
  ],
};

const scripts: CollectionDef = {
  id: "guiones",
  label: "Guiones",
  singular: "guion",
  prefix: "GUI",
  description: "Versiones de guion con revisión interna, aprobación del cliente y feedback.",
  titleKey: "titulo",
  statusKey: "estado",
  ownerKey: "responsable",
  approval: { pending: "En aprobación", approved: "Aprobado", changes: "Cambios pedidos" },
  empty: "No hay guiones.",
  fields: [
    { key: "titulo", label: "Guion", type: "text", required: true, list: true },
    { key: "produccion", label: "Producción", type: "ref", ref: "producciones", list: true },
    { key: "version", label: "Versión", type: "text", list: true },
    { key: "estado", label: "Estado", type: "select", options: ["Borrador", "En revisión interna", "En aprobación", "Aprobado", "Cambios pedidos"], required: true, list: true },
    { key: "feedback", label: "Feedback", type: "textarea" },
    owner(),
    { key: "enlace", label: "Enlace al documento", type: "text" },
  ],
};

const shoots: CollectionDef = {
  id: "rodajes",
  label: "Preproducción y rodajes",
  singular: "jornada",
  prefix: "ROD",
  description: "Plan de rodaje: fecha, locación, equipo y recursos (equipamiento, permisos, participantes).",
  titleKey: "jornada",
  statusKey: "estado",
  dateKey: "fecha",
  empty: "No hay jornadas planificadas.",
  fields: [
    { key: "jornada", label: "Jornada", type: "text", required: true, list: true },
    { key: "produccion", label: "Producción", type: "ref", ref: "producciones", list: true },
    { key: "fecha", label: "Fecha", type: "date", required: true, list: true },
    { key: "locacion", label: "Locación", type: "text", list: true },
    { key: "equipo", label: "Equipo", type: "text" },
    { key: "recursos", label: "Recursos", type: "textarea", hint: "Equipamiento, permisos, participantes" },
    { key: "estado", label: "Estado", type: "select", options: ["Por confirmar", "Confirmado", "Realizado", "Reprogramado"], required: true, list: true },
  ],
};

const cuts: CollectionDef = {
  id: "versiones",
  label: "Edición y versiones",
  singular: "versión",
  prefix: "VER",
  description: "Cortes de edición con duración, feedback consolidado y aprobación.",
  titleKey: "version",
  statusKey: "estado",
  ownerKey: "responsable",
  dateKey: "fecha",
  approval: { pending: "En aprobación", approved: "Aprobada", changes: "Cambios pedidos" },
  empty: "Todavía no hay versiones de edición.",
  fields: [
    { key: "version", label: "Versión", type: "text", required: true, list: true },
    { key: "produccion", label: "Producción", type: "ref", ref: "producciones", list: true },
    { key: "fecha", label: "Fecha", type: "date", list: true },
    { key: "duracion", label: "Duración", type: "text", list: true },
    { key: "feedback", label: "Feedback", type: "textarea" },
    { key: "estado", label: "Estado", type: "select", options: ["En edición", "En revisión", "En aprobación", "Aprobada", "Cambios pedidos"], required: true, list: true },
    owner(),
  ],
};

const deliveries: CollectionDef = {
  id: "entregas",
  label: "Entregas",
  singular: "entrega",
  prefix: "ENT",
  description: "Masters y adaptaciones entregadas, con formato, destino y confirmación.",
  titleKey: "entregable",
  statusKey: "estado",
  dateKey: "fecha",
  empty: "Todavía no hay entregas.",
  fields: [
    { key: "entregable", label: "Entregable", type: "text", required: true, list: true },
    { key: "produccion", label: "Producción", type: "ref", ref: "producciones", list: true },
    { key: "formato", label: "Formato", type: "select", options: ["Master", "Redes 9:16", "Redes 1:1", "Subtitulado", "Crudos"], list: true },
    { key: "fecha", label: "Fecha", type: "date", list: true },
    { key: "destino", label: "Destino", type: "select", options: ["Drive", "YouTube", "Cliente", "Otro"], list: true },
    { key: "estado", label: "Estado", type: "select", options: ["Pendiente", "Entregado", "Confirmado"], required: true, list: true },
  ],
};

/* ───────── Módulos con proceso genérico ───────── */
const GENERIC_LABELS: Partial<Record<ServiceId, { label: string; singular: string; prefix: string }>> = {
  crm: { label: "Implementaciones", singular: "implementación", prefix: "CRM" },
  "ia-automatizaciones": { label: "Automatizaciones", singular: "automatización", prefix: "AUT" },
  "diseno-marca": { label: "Piezas de marca", singular: "pieza de marca", prefix: "MAR" },
  "soluciones-graficas": { label: "Pedidos gráficos", singular: "pedido", prefix: "GRA" },
  "mercado-libre": { label: "Iniciativas del canal", singular: "iniciativa", prefix: "MEL" },
};

function genericWork(serviceId: ServiceId): CollectionDef {
  const workspace = serviceWorkspaceById(serviceId);
  const names = GENERIC_LABELS[serviceId] ?? { label: "Trabajos", singular: "trabajo", prefix: "TRB" };
  return {
    id: "trabajos",
    label: names.label,
    singular: names.singular,
    prefix: names.prefix,
    description: `Seguimiento por etapa según el proceso ya definido para ${workspace?.label ?? "el módulo"}: ${workspace?.stages.join(" → ") ?? "sin etapas"}.`,
    titleKey: "nombre",
    statusKey: "estado",
    ownerKey: "responsable",
    dateKey: "fechaObjetivo",
    approval: { pending: "En aprobación", approved: "Aprobado", changes: "Cambios pedidos" },
    linkTasks: true,
    empty: `Todavía no hay ${names.label.toLowerCase()}.`,
    fields: [
      { key: "nombre", label: names.singular.charAt(0).toUpperCase() + names.singular.slice(1), type: "text", required: true, list: true },
      { key: "etapa", label: "Etapa", type: "select", options: workspace?.stages ?? [], required: true, list: true },
      owner(),
      { key: "fechaObjetivo", label: "Fecha objetivo", type: "date", list: true },
      { key: "estado", label: "Estado", type: "select", options: ["Planificado", "En curso", "Bloqueado", "En aprobación", "Aprobado", "Cambios pedidos", "Cerrado"], required: true, list: true },
      { key: "detalle", label: "Detalle", type: "textarea" },
    ],
  };
}

export const moduleCollections: Record<ServiceId, CollectionDef[]> = {
  "publicidad-digital": [campaigns, creatives, optimizations, paidLearnings],
  contenidos: [axes, ideas, pieces, contentLearnings],
  estrategia: [priorities, meetings, decisions, risks],
  "desarrollo-web": [webProjects, sitemap, requirements, qa, releases, maintenance],
  audiovisuales: [productions, scripts, shoots, cuts, deliveries],
  crm: [genericWork("crm")],
  "ia-automatizaciones": [genericWork("ia-automatizaciones")],
  "diseno-marca": [genericWork("diseno-marca")],
  "soluciones-graficas": [genericWork("soluciones-graficas")],
  "mercado-libre": [genericWork("mercado-libre")],
};

export function collectionDef(serviceId: ServiceId, collectionId: string) {
  return moduleCollections[serviceId].find((def) => def.id === collectionId);
}

/** Colección cuyos registros se pueden vincular a tareas (campaña, pieza, producción…). */
export function primaryWorkCollection(serviceId: ServiceId) {
  return moduleCollections[serviceId].find((def) => def.linkTasks);
}

const MASCULINE = new Set(["aprendizaje", "eje temático", "riesgo", "proyecto web", "requisito", "caso de QA", "guion", "pedido", "trabajo"]);
/** «Nuevo/Nueva» según el género del objeto. */
export function newLabel(def: CollectionDef) {
  return `${MASCULINE.has(def.singular) ? "Nuevo" : "Nueva"} ${def.singular}`;
}
