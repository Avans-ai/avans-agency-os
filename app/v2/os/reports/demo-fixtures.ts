/* DATOS DE DEMOSTRACIÓN · métricas para los reportes de ejemplo.
 * Todas las cifras son ficticias y deterministas. No provienen de Meta Ads,
 * Google Ads, LinkedIn, Instagram ni de ningún sistema del cliente: ninguna
 * integración está conectada. Las claves de campañas y piezas coinciden con
 * los registros demo de app/v2/os/modules/demo-fixtures.ts. Cuando existan
 * integraciones, los builders recibirán estas mismas estructuras desde ellas. */
import type { ServiceId } from "../os-data";

export const REPORT_REFERENCE = {
  week: { label: "Semana 45 · 2 al 8 de noviembre de 2026", previous: "Semana 44" },
  month: { label: "Octubre 2026", previous: "Septiembre 2026" },
  paid: { label: "12 oct – 8 nov 2026 · 4 semanas", previous: "14 sep – 11 oct 2026" },
} as const;

/** Ocho semanas: las cuatro primeras son el período anterior y las cuatro últimas el actual. */
export const PAID_WEEKS = ["14 sep", "21 sep", "28 sep", "5 oct", "12 oct", "19 oct", "26 oct", "2 nov"] as const;

export type PaidWeek = { spend: number; impressions: number; reach: number; clicks: number; leads: number; conversions: number; revenue?: number };
export type BusinessModel = "leads" | "ecommerce";

type Base = { spend: number; impressions: number; reach: number; clicks: number; leads: number; conversions: number; revenue?: number };

function series(base: Base, factors: number[]): PaidWeek[] {
  return factors.map((factor) => factor === 0
    ? { spend: 0, impressions: 0, reach: 0, clicks: 0, leads: 0, conversions: 0, ...(base.revenue ? { revenue: 0 } : {}) }
    : {
      spend: Math.round(base.spend * factor),
      impressions: Math.round(base.impressions * factor),
      reach: Math.round(base.reach * Math.sqrt(factor)),
      clicks: Math.round(base.clicks * factor),
      leads: Math.round(base.leads * factor ** 1.4),
      conversions: Math.round(base.conversions * factor ** 1.3),
      ...(base.revenue ? { revenue: Math.round(base.revenue * factor ** 1.3) } : {}),
    });
}

export const paidDemoMetrics: Record<string, PaidWeek[]> = {
  "CMP-EPSA-01": series({ spend: 520000, impressions: 98000, reach: 41000, clicks: 1150, leads: 23, conversions: 9 }, [0, 0, 0, 0, 0.8, 1, 1.1, 1.15]),
  "CMP-EPSA-02": series({ spend: 190000, impressions: 120000, reach: 38000, clicks: 1400, leads: 9, conversions: 3 }, [0, 0, 0, 0, 0, 0.9, 1, 1.05]),
  "CMP-EPSA-04": series({ spend: 160000, impressions: 21000, reach: 15000, clicks: 940, leads: 6, conversions: 2 }, [1, 1.05, 0.95, 1, 0.9, 0.7, 0, 0]),
  "CMP-ACA-01": series({ spend: 410000, impressions: 210000, reach: 96000, clicks: 2900, leads: 64, conversions: 22 }, [0.9, 0.95, 1, 1, 1.05, 1.1, 1.08, 1.12]),
  "CMP-ACA-02": series({ spend: 350000, impressions: 46000, reach: 30000, clicks: 2300, leads: 58, conversions: 25 }, [1, 1, 0.98, 1.02, 1.05, 1.1, 1.15, 1.2]),
};

export const businessModelByClient: Record<string, BusinessModel> = {
  aca: "leads",
  edinovo: "leads",
  epsa: "leads",
  "grupo-portland": "leads",
  "lider-energy": "leads",
};

export type PieceMetric = { reach: number; interactions: number; saves: number; clicks: number };
export const contentDemoMetrics: Record<string, PieceMetric> = {
  "PZA-EPSA-05": { reach: 6200, interactions: 410, saves: 38, clicks: 120 },
  "PZA-EPSA-06": { reach: 4800, interactions: 520, saves: 141, clicks: 210 },
  "PZA-EPSA-07": { reach: 2100, interactions: 160, saves: 0, clicks: 260 },
  "PZA-ACA-02": { reach: 18400, interactions: 1320, saves: 210, clicks: 340 },
  "PZA-ACA-04": { reach: 7300, interactions: 380, saves: 44, clicks: 95 },
  "PZA-EDI-01": { reach: 3900, interactions: 290, saves: 31, clicks: 140 },
};

export type ContentMonth = { month: string; published: number; reach: number; interactions: number };
export const contentDemoSeries: Record<string, ContentMonth[]> = {
  epsa: [
    { month: "Jul", published: 8, reach: 9800, interactions: 610 },
    { month: "Ago", published: 9, reach: 10400, interactions: 700 },
    { month: "Sep", published: 10, reach: 11900, interactions: 820 },
    { month: "Oct", published: 12, reach: 14600, interactions: 1090 },
  ],
  aca: [
    { month: "Jul", published: 14, reach: 41000, interactions: 2300 },
    { month: "Ago", published: 15, reach: 43800, interactions: 2410 },
    { month: "Sep", published: 13, reach: 39500, interactions: 2280 },
    { month: "Oct", published: 16, reach: 48200, interactions: 2960 },
  ],
  edinovo: [
    { month: "Jul", published: 6, reach: 7400, interactions: 520 },
    { month: "Ago", published: 7, reach: 8100, interactions: 560 },
    { month: "Sep", published: 4, reach: 5200, interactions: 330 },
    { month: "Oct", published: 3, reach: 4900, interactions: 310 },
  ],
};

export type AudienceRow = { channel: string; start: number; end: number };
export const audienceDemo: Record<string, AudienceRow[]> = {
  epsa: [{ channel: "LinkedIn", start: 4820, end: 5110 }, { channel: "Instagram", start: 1900, end: 1960 }],
  aca: [{ channel: "Instagram", start: 38200, end: 39100 }, { channel: "Facebook", start: 61500, end: 61800 }],
  edinovo: [{ channel: "YouTube", start: 2600, end: 2650 }, { channel: "Instagram", start: 5400, end: 5430 }],
};

export type DemoLine = { title: string; serviceId: ServiceId; detail?: string };

/** Entregables cerrados o demorados que todavía no se registran como tareas. */
export const weeklyDemo: Record<string, { delivered: DemoLine[]; delayed: DemoLine[] }> = {
  epsa: {
    delivered: [
      { title: "Mapa de mensajes por segmento v2", serviceId: "estrategia", detail: "Aprobado por Marketing" },
      { title: "Carrusel de especificaciones técnicas v3", serviceId: "publicidad-digital", detail: "Aprobado para pauta" },
      { title: "Guía de repuestos (documento LinkedIn)", serviceId: "contenidos", detail: "Publicada" },
    ],
    delayed: [{ title: "Plan de pauta final", serviceId: "publicidad-digital", detail: "Falta cerrar la distribución de presupuesto" }],
  },
  aca: {
    delivered: [
      { title: "Separación de grupos de búsqueda", serviceId: "publicidad-digital", detail: "Aplicado el 20 oct" },
      { title: "Carrusel de beneficios de noviembre", serviceId: "contenidos", detail: "Programado" },
    ],
    delayed: [{ title: "Grilla de contenidos del período", serviceId: "contenidos", detail: "Definición comercial pendiente" }],
  },
  edinovo: {
    delivered: [{ title: "Cápsula de introducción al programa", serviceId: "contenidos", detail: "Publicada" }],
    delayed: [{ title: "Guiones episodios 1–4", serviceId: "audiovisuales", detail: "Aprobación vencida el 29 oct" }],
  },
  "grupo-portland": {
    delivered: [{ title: "Staging v0.9 con contenido marcado", serviceId: "desarrollo-web", detail: "Publicado en staging" }],
    delayed: [{ title: "Textos institucionales", serviceId: "desarrollo-web", detail: "Dependencia del cliente" }],
  },
  "lider-energy": {
    delivered: [{ title: "Propuesta de implementación de CRM", serviceId: "crm", detail: "Enviada para revisión" }],
    delayed: [],
  },
};

export type MonthlyIndicator = { label: string; current: number; previous: number; unit?: "%" | "ARS" | ""; better: "up" | "down" };
export type MonthlyObjective = { objective: string; indicator: string; target: string; current: string; status: "En curso" | "En riesgo" | "Cumplido" | "Sin datos" };
export type MonthlyDemo = {
  objectives: MonthlyObjective[];
  activities: DemoLine[];
  results: Partial<Record<ServiceId, MonthlyIndicator[]>>;
  learnings: string[];
  opportunities: string[];
};

export const monthlyDemo: Record<string, MonthlyDemo> = {
  epsa: {
    objectives: [
      { objective: "Lanzar Line Up con 300 leads calificados", indicator: "Leads calificados", target: "300", current: "Lanzamiento 12 nov", status: "En curso" },
      { objective: "Costo por lead", indicator: "CPL", target: "≤ USD 45", current: "Sin datos aún", status: "Sin datos" },
      { objective: "Aprobación al primer envío", indicator: "Tasa", target: "≥ 70 %", current: "58 %", status: "En riesgo" },
    ],
    activities: [
      { title: "Kickoff con el comité de marketing", serviceId: "estrategia" },
      { title: "Benchmark competitivo con oportunidad de posventa", serviceId: "estrategia" },
      { title: "Activación de la campaña de generación de demanda", serviceId: "publicidad-digital" },
      { title: "Tres rutas de key visual", serviceId: "contenidos" },
    ],
    results: {
      estrategia: [
        { label: "Decisiones cerradas", current: 6, previous: 4, better: "up" },
        { label: "Días promedio de aprobación", current: 4, previous: 5, better: "down" },
      ],
      contenidos: [
        { label: "Piezas publicadas", current: 12, previous: 10, better: "up" },
        { label: "Engagement promedio", current: 7.5, previous: 6.9, unit: "%", better: "up" },
      ],
    },
    learnings: ["Los videos cortos de producto duplican el CTR frente a imágenes.", "Las aprobaciones por comité demoran cuatro días hábiles en promedio."],
    opportunities: ["Posventa como territorio libre frente a la competencia.", "Webinar técnico con clientes actuales para compras industriales."],
  },
  aca: {
    objectives: [
      { objective: "Reducir 15 % el costo por lead", indicator: "CPL", target: "−15 %", current: "−11 %", status: "En curso" },
      { objective: "Sostener la grilla de contenidos", indicator: "Piezas publicadas", target: "16", current: "16", status: "Cumplido" },
    ],
    activities: [
      { title: "Separación de campañas de búsqueda por intención", serviceId: "publicidad-digital" },
      { title: "Reel de asistencia en ruta", serviceId: "contenidos" },
    ],
    results: {
      contenidos: [
        { label: "Piezas publicadas", current: 16, previous: 13, better: "up" },
        { label: "Engagement promedio", current: 6.1, previous: 5.8, unit: "%", better: "up" },
      ],
    },
    learnings: ["Las búsquedas de asistencia convierten mejor de noche.", "Asistencia funciona como puerta de entrada a beneficios."],
    opportunities: ["Landing de captación por segmento.", "Serie sobre beneficios poco conocidos."],
  },
  edinovo: {
    objectives: [{ objective: "Publicar 4 episodios antes de diciembre", indicator: "Episodios publicados", target: "4", current: "0", status: "En riesgo" }],
    activities: [{ title: "Guiones de los episodios 1 y 2", serviceId: "audiovisuales" }, { title: "Cápsula de introducción", serviceId: "contenidos" }],
    results: {
      audiovisuales: [{ label: "Guiones aprobados", current: 0, previous: 0, better: "up" }, { label: "Días de demora de aprobación", current: 14, previous: 3, better: "down" }],
      contenidos: [{ label: "Piezas publicadas", current: 3, previous: 4, better: "up" }],
    },
    learnings: ["Aprobar guiones por tandas reduce el riesgo de reprogramar toda la producción."],
    opportunities: ["Reutilizar episodios como cápsulas para sostener la frecuencia."],
  },
  "grupo-portland": {
    objectives: [{ objective: "Publicar el sitio nuevo en noviembre", indicator: "Avance del sitio", target: "100 %", current: "72 %", status: "En riesgo" }],
    activities: [{ title: "Staging v0.9 con plantillas completas", serviceId: "desarrollo-web" }, { title: "Arquitectura de contenidos", serviceId: "estrategia" }],
    results: {
      "desarrollo-web": [{ label: "Páginas listas", current: 3, previous: 1, better: "up" }, { label: "Casos de QA aprobados", current: 1, previous: 0, better: "up" }],
    },
    learnings: ["Publicar staging con contenido marcado permite validar estructura antes del cierre de textos."],
    opportunities: ["Plantilla de contenidos por unidad de negocio."],
  },
  "lider-energy": {
    objectives: [{ objective: "CRM operativo antes de diciembre", indicator: "Etapas configuradas", target: "6", current: "0", status: "En curso" }],
    activities: [{ title: "Propuesta de implementación de CRM", serviceId: "crm" }],
    results: { crm: [{ label: "Etapas validadas", current: 0, previous: 0, better: "up" }] },
    learnings: ["Conviene empezar por un embudo mínimo validado."],
    opportunities: ["Unificar UTMs con el CRM antes de pautar."],
  },
};
