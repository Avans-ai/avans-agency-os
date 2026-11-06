export const avansClients = [
  { slug: "epsa", name: "Epsa", health: "Saludable", context: 92, attention: "1 señal" },
  { slug: "aca", name: "ACA", health: "Atención", context: 81, attention: "2 pendientes" },
  { slug: "grupo-portland", name: "Grupo Portland", health: "Saludable", context: 88, attention: "1 aprobación" },
  { slug: "edinovo", name: "Edinovo", health: "Saludable", context: 86, attention: "2 aprendizajes" },
  { slug: "lider-energy", name: "Lider Energy", health: "Atención", context: 76, attention: "3 pendientes" },
] as const;

export type AgencyModuleSlug = "contenido" | "campanas" | "reportes";

export const agencyModuleConfig: Record<AgencyModuleSlug, {
  label: string;
  eyebrow: string;
  description: string;
  startAction: string;
  preflightTitle: string;
  preflight: { title: string; detail: string; state: "Listo" | "Revisar" }[];
  stages: string[];
  queue: { title: string; detail: string; status: string }[];
}> = {
  contenido: {
    label: "Contenido",
    eyebrow: "OPERACIONES · CONTENIDO",
    description: "La producción empieza dentro del contexto de una cuenta. Antes de generar una pieza, Avans consulta memoria, objetivos, fuentes, performance y criterios aprobados.",
    startAction: "Crear tarea de contenido",
    preflightTitle: "Antes de producir",
    preflight: [
      { title: "Contexto de cuenta", detail: "Brief, posicionamiento, tono, referencias y restricciones disponibles.", state: "Listo" },
      { title: "Objetivo del período", detail: "Validar qué resultado busca la planificación antes de proponer temas o formatos.", state: "Listo" },
      { title: "Fuentes y memoria", detail: "Histórico, piezas aprobadas, feedback y aprendizajes vinculados a la cuenta.", state: "Listo" },
      { title: "Pendientes críticos", detail: "Confirmar que no haya información faltante que vuelva inválida la propuesta.", state: "Revisar" },
    ],
    stages: ["Contexto", "Investigación", "Territorios", "Ángulos", "Formatos", "Calendario", "Aprobación", "Producción"],
    queue: [
      { title: "Planificación del próximo ciclo", detail: "Territorios, ángulos y formatos preparados desde el contexto validado.", status: "Preparar" },
      { title: "Piezas en revisión", detail: "Outputs que ya pasaron generación IA y esperan criterio humano.", status: "Revisión" },
      { title: "Feedback para memoria", detail: "Correcciones recurrentes candidatas a convertirse en aprendizaje de cuenta.", status: "Validar" },
    ],
  },
  campanas: {
    label: "Campañas",
    eyebrow: "OPERACIONES · CAMPAÑAS",
    description: "Cada análisis de campaña parte de una cuenta seleccionada, sus objetivos, histórico y reglas. Avans detecta excepciones antes de recomendar o ejecutar cambios.",
    startAction: "Analizar campaña",
    preflightTitle: "Antes de recomendar",
    preflight: [
      { title: "Objetivo y KPI", detail: "Objetivo comercial, KPI principal y umbrales definidos para esta cuenta.", state: "Listo" },
      { title: "Fuentes conectadas", detail: "Plataformas publicitarias y fuentes de conversión disponibles para el análisis.", state: "Listo" },
      { title: "Histórico comparable", detail: "Períodos y decisiones anteriores listos para interpretar el desvío actual.", state: "Listo" },
      { title: "Guardrails", detail: "Revisar límites de presupuesto y acciones que requieren aprobación humana.", state: "Revisar" },
    ],
    stages: ["Datos", "Reglas", "Anomalía", "Interpretación", "Recomendación", "Aprobación", "Ejecución", "Medición"],
    queue: [
      { title: "Atención requerida", detail: "Campañas fuera de los umbrales definidos para la cuenta.", status: "2 señales" },
      { title: "Recomendaciones abiertas", detail: "Hipótesis listas para revisión antes de modificar plataformas externas.", status: "Revisar" },
      { title: "Acciones en medición", detail: "Cambios ya aplicados cuyo resultado todavía se está evaluando.", status: "Midiendo" },
    ],
  },
  reportes: {
    label: "Reportes",
    eyebrow: "GERENCIA · REPORTES",
    description: "El reporte se construye desde la ficha del cliente para combinar fuentes, objetivos, decisiones y contexto. No es una exportación genérica de métricas.",
    startAction: "Generar reporte",
    preflightTitle: "Antes de generar",
    preflight: [
      { title: "Período y objetivo", detail: "Rango de análisis y objetivos de cuenta definidos para interpretar resultados.", state: "Listo" },
      { title: "Fuentes completas", detail: "Datos internos y externos necesarios para cerrar el período.", state: "Listo" },
      { title: "Normalización", detail: "Métricas homologadas para conservar histórico comparable.", state: "Listo" },
      { title: "Incidencias y decisiones", detail: "Validar eventos del período que deben explicar cambios en los resultados.", state: "Revisar" },
    ],
    stages: ["Fuentes", "Normalizar", "Comparar", "Interpretar", "Insights", "Borrador", "Validación", "Entrega"],
    queue: [
      { title: "Cierre del período", detail: "Estado de fuentes, faltantes y consistencia antes de generar narrativa.", status: "Preparar" },
      { title: "Insights sugeridos", detail: "Cambios relevantes explicados con contexto e histórico de la cuenta.", status: "Revisar" },
      { title: "Versión cliente", detail: "Reporte listo para validación final y entrega.", status: "Borrador" },
    ],
  },
};
