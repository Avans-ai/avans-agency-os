/* Publicidad digital · definición de objetos (campañas, pedidos de piezas,
 * registro creativo anterior, optimizaciones y aprendizajes).
 * Los campos nuevos de Funcionalidades 2 son aditivos: los registros guardados
 * antes siguen leyéndose (ver `campaignPlan` y `adOf` en paid-model.ts). */
import type { CollectionDef, FieldDef } from "./types";

const owner = (label = "Responsable"): FieldDef => ({ key: "responsable", label, type: "person", list: true });

export const CAMPAIGN_STATUSES = ["Borrador", "En preparación", "Activa", "Pausada", "Finalizada"] as const;
/** Canales de la especificación + LinkedIn Ads (canal ya usado por cuentas B2B y conservado por compatibilidad). */
export const CAMPAIGN_PLATFORMS = ["Meta Ads", "Google Ads", "TikTok Ads", "ChatGPT Ads", "LinkedIn Ads", "YouTube Ads", "Otra"] as const;
export const CAMPAIGN_OBJECTIVES = ["Generación de leads", "Alcance y reconocimiento", "Tráfico", "Conversiones", "Ventas ecommerce", "Remarketing"] as const;

export const paidCampaigns: CollectionDef = {
  id: "campanas",
  label: "Campañas",
  singular: "campaña",
  prefix: "CMP",
  description: "Campañas de cara al cliente: plan, target del Discovery, presupuesto, canales, enfoque, anuncios, landing y estímulos posteriores.",
  titleKey: "nombre",
  statusKey: "estado",
  ownerKey: "responsable",
  dateKey: "inicio",
  linkTasks: true,
  empty: "Todavía no hay campañas cargadas para este cliente.",
  fields: [
    { key: "nombre", label: "Nombre", type: "text", required: true, list: true, placeholder: "Ej.: Lanzamiento · Generación de demanda" },
    { key: "objetivo", label: "Objetivo", type: "select", options: CAMPAIGN_OBJECTIVES, required: true, list: true },
    { key: "plataforma", label: "Plataforma", type: "select", options: CAMPAIGN_PLATFORMS, required: true, list: true, hint: "Canal principal. La distribución completa se define en la planificación (Instancia 1)." },
    { key: "audiencia", label: "Audiencia", type: "textarea", placeholder: "Segmentos, intereses, cargos o listas" },
    { key: "mensaje", label: "Mensaje principal", type: "textarea", group: "Propuesta", placeholder: "Problema, tensión o beneficio que comunica" },
    { key: "propuestaCreativa", label: "Propuesta creativa", type: "textarea", group: "Propuesta", placeholder: "Ángulo publicitario, concepto visual y formatos" },
    { key: "distribucion", label: "Distribución de inversión (orientativa)", type: "textarea", group: "Propuesta" },
    { key: "presupuesto", label: "Presupuesto del período (ARS)", type: "number", required: true, list: true },
    { key: "estado", label: "Estado", type: "select", options: CAMPAIGN_STATUSES, required: true, list: true },
    owner(),
    { key: "inicio", label: "Inicio", type: "date", required: true },
    { key: "fin", label: "Fin", type: "date" },
    { key: "notas", label: "Notas", type: "textarea" },
  ],
};

export const AD_TYPES = ["Anuncio", "Landing page", "Atención por mail", "Atención por WhatsApp"] as const;

/** Pedidos de piezas de una campaña (anuncios, landing y atención). El flujo vive en paid-model.ts. */
export const paidAds: CollectionDef = {
  id: "anuncios",
  label: "Anuncios y piezas",
  singular: "pedido de pieza",
  prefix: "ANU",
  description: "Pedidos de anuncio, landing y atención por mail o WhatsApp, con brief, plazos por etapa y flujo Content → PM → Diseño → PM → Cliente → Circulación.",
  titleKey: "nombre",
  statusKey: "etapa",
  ownerKey: "solicitadoPor",
  dateKey: "fechaNecesaria",
  empty: "Todavía no hay pedidos de piezas para esta campaña.",
  fields: [
    { key: "nombre", label: "Nombre del pedido", type: "text", required: true, list: true },
    { key: "campana", label: "Campaña", type: "ref", ref: "campanas", list: true },
    { key: "tipo", label: "Tipo", type: "select", options: AD_TYPES, list: true },
    { key: "canal", label: "Canal", type: "select", options: CAMPAIGN_PLATFORMS, list: true },
    { key: "etapa", label: "Etapa", type: "text", list: true },
    { key: "fechaNecesaria", label: "Fecha en que se necesita", type: "date", list: true },
    { key: "insight", label: "Insight a probar", type: "textarea" },
    { key: "respuesta", label: "Respuesta al insight", type: "textarea" },
    { key: "beneficio", label: "Beneficio para el cliente", type: "textarea" },
    { key: "propuesta", label: "Propuesta concreta", type: "textarea" },
    { key: "rtb", label: "Reason to believe", type: "textarea" },
    { key: "cta", label: "Call to action", type: "text" },
    { key: "funnel", label: "Etapa del funnel", type: "text" },
    { key: "piezas", label: "Piezas a generar", type: "text" },
    { key: "detalle", label: "Detalle", type: "textarea" },
    { key: "solicitadoPor", label: "Pedido por", type: "person" },
  ],
};

export const paidCreatives: CollectionDef = {
  id: "creatividades",
  label: "Registro creativo anterior",
  singular: "pieza creativa",
  prefix: "CRE",
  description: "Registro de piezas cargado antes del flujo de pedidos de anuncio. Se conserva como consulta; las piezas nuevas se piden desde cada campaña.",
  titleKey: "pieza",
  statusKey: "estado",
  ownerKey: "responsable",
  approval: { pending: "En aprobación", approved: "Aprobada", changes: "Cambios pedidos" },
  linkTasks: true,
  empty: "No hay piezas creativas en el registro anterior.",
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

export const paidOptimizations: CollectionDef = {
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

export const paidLearnings: CollectionDef = {
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

/** Orden de registro: la campaña sigue siendo la colección principal (linkTasks). */
export const paidCollections: CollectionDef[] = [paidCampaigns, paidAds, paidCreatives, paidOptimizations, paidLearnings];
