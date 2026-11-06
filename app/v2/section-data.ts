export type ModuleRow = {
  title: string;
  meta: string;
  detail: string;
  status: string;
};

export type SectionConfig = {
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  metrics: { label: string; value: string; detail: string }[];
  rows: ModuleRow[];
  sideTitle: string;
  sideItems: string[];
};

const standardMetrics = [
  { label: "Activos", value: "12", detail: "En seguimiento" },
  { label: "Atención", value: "3", detail: "Requieren intervención" },
  { label: "Automático", value: "68%", detail: "Dentro de reglas" },
];

export const sectionData: Record<string, SectionConfig> = {
  inbox: {
    eyebrow: "BANDEJA TRANSVERSAL",
    title: "Atención requerida",
    description: "Aprobaciones, bloqueos, alertas, decisiones y aprendizajes que necesitan intervención humana en una sola bandeja.",
    action: "Priorizar bandeja",
    metrics: [
      { label: "Pendientes", value: "7", detail: "3 de alta prioridad" },
      { label: "Aprobaciones", value: "2", detail: "Esperando decisión" },
      { label: "Bloqueos", value: "2", detail: "Con impacto operativo" },
    ],
    rows: [
      { title: "Epsa · Campaña requiere revisión", meta: "Alerta · Performance", detail: "Variación relevante detectada. Requiere criterio antes de modificar inversión.", status: "Crítica" },
      { title: "ACA · Proceso bloqueado por información pendiente", meta: "Bloqueo · Proceso", detail: "El workflow quedó detenido hasta completar una precondición necesaria.", status: "Alta" },
      { title: "Grupo Portland · Propuesta lista para validar", meta: "Aprobación · Comercial", detail: "Alcance e inversión esperan decisión de Dirección.", status: "Alta" },
      { title: "Edinovo · Nuevo aprendizaje para validar", meta: "Aprendizaje · Memoria", detail: "Nuevo patrón detectado listo para validación antes de incorporarse al contexto.", status: "Media" },
    ],
    sideTitle: "Criterio de prioridad",
    sideItems: ["Impacto en negocio", "Urgencia y deadline", "Dependencias bloqueadas", "Riesgo de ejecución", "Responsable humano"],
  },
  clientes: {
    eyebrow: "CLIENTES · CONTEXTO 360°",
    title: "Clientes",
    description: "Una vista 360° por cuenta: contexto, servicios, proyectos, documentos, decisiones, feedback, resultados y memoria operativa.",
    action: "Nuevo cliente",
    metrics: [
      { label: "Cuentas", value: "5", detail: "Demo Avans" },
      { label: "Con atención", value: "2", detail: "Señales activas" },
      { label: "Contexto validado", value: "84%", detail: "Promedio de completitud" },
    ],
    rows: [
      { title: "Epsa", meta: "Cliente activo", detail: "Contexto estratégico, procesos, entregables, aprobaciones e histórico centralizados.", status: "Saludable" },
      { title: "ACA", meta: "Cliente activo", detail: "Cuenta con dependencias operativas pendientes y próximos hitos en seguimiento.", status: "Atención" },
      { title: "Grupo Portland", meta: "Cliente activo", detail: "Discovery, propuesta, proyectos y memoria disponibles desde una única ficha.", status: "Saludable" },
      { title: "Edinovo", meta: "Cliente activo", detail: "Feedback y aprendizajes recientes listos para consolidarse en contexto.", status: "Saludable" },
      { title: "Lider Energy", meta: "Cliente activo", detail: "Onboarding y procesos operativos con seguimiento automatizado.", status: "Atención" },
    ],
    sideTitle: "La ficha concentra",
    sideItems: ["Contexto confirmado", "Documentos y fuentes", "Proyectos y responsables", "Aprobaciones y decisiones", "Aprendizajes versionados"],
  },
  procesos: {
    eyebrow: "OPERACIONES · PROCESOS",
    title: "Procesos",
    description: "Eventos, reglas, precondiciones, responsables y automatizaciones modeladas como procesos de negocio reutilizables.",
    action: "Nuevo proceso",
    metrics: standardMetrics,
    rows: [
      { title: "Alta inteligente de cliente", meta: "Evento: propuesta aceptada", detail: "Verifica requisitos, crea estructura operativa y deriva pendientes sin depender de recordatorios manuales.", status: "Activo" },
      { title: "Seguimiento de compromisos", meta: "Evento: reunión procesada", detail: "Convierte compromisos en tareas, controla vencimientos y escala excepciones.", status: "Activo" },
      { title: "Cierre de reporting", meta: "Evento: fin de período", detail: "Consolida fuentes, detecta faltantes y prepara una versión para revisión humana.", status: "Activo" },
    ],
    sideTitle: "Contrato de proceso",
    sideItems: ["Evento de inicio", "Datos requeridos", "Reglas y umbrales", "Responsable", "Salida esperada", "Escalamiento"],
  },
  proyectos: {
    eyebrow: "OPERATIONS",
    title: "Proyectos",
    description: "Seguimiento de ejecución, bloqueos, responsables, hitos y riesgo sin convertir Avans en otro gestor de tareas genérico.",
    action: "Nuevo proyecto",
    metrics: standardMetrics,
    rows: [
      { title: "Epsa · Operación activa", meta: "Proyecto", detail: "Hitos, dependencias y próximas acciones visibles desde la capa operativa.", status: "En curso" },
      { title: "ACA · Implementación", meta: "Proyecto", detail: "Una dependencia pendiente mantiene una etapa en atención.", status: "Atención" },
      { title: "Lider Energy · Activación", meta: "Proyecto", detail: "Checklist y responsables sincronizados con el Process Engine.", status: "En curso" },
    ],
    sideTitle: "Avans observa",
    sideItems: ["Hitos próximos", "Tareas sin owner", "Dependencias", "Bloqueos", "Desvíos de fecha", "Próxima mejor acción"],
  },
  reuniones: {
    eyebrow: "OPERACIONES · REUNIONES",
    title: "Reuniones",
    description: "De la conversación al dato operativo: decisiones, compromisos, señales y actualizaciones de contexto vinculadas a cada cuenta.",
    action: "Procesar reunión",
    metrics: [
      { label: "Procesadas", value: "9", detail: "Este período" },
      { label: "Compromisos", value: "17", detail: "6 abiertos" },
      { label: "Señales", value: "4", detail: "Para revisar" },
    ],
    rows: [
      { title: "ACA · Seguimiento", meta: "Reunión procesada", detail: "3 compromisos detectados y una actualización de contexto pendiente de validación.", status: "Revisar" },
      { title: "Edinovo · Revisión mensual", meta: "Reunión procesada", detail: "Decisiones y próximos pasos convertidos en tareas con origen trazable.", status: "Completa" },
      { title: "Grupo Portland · Kickoff", meta: "Reunión procesada", detail: "Responsables, dependencias y preguntas abiertas consolidadas automáticamente.", status: "Completa" },
    ],
    sideTitle: "Salida automática",
    sideItems: ["Resumen estructurado", "Decisiones", "Compromisos", "Pendientes", "Señales de cuenta", "Cambios de contexto a validar"],
  },
  insights: {
    eyebrow: "GERENCIA · INSIGHTS",
    title: "Insights",
    description: "Análisis explicables sobre operación y performance. Cada insight conserva fuente, contexto y motivo de la recomendación.",
    action: "Generar análisis",
    metrics: [
      { label: "Nuevos", value: "11", detail: "Últimos 7 días" },
      { label: "Validados", value: "6", detail: "Por especialistas" },
      { label: "En medición", value: "3", detail: "Resultado posterior" },
    ],
    rows: [
      { title: "Epsa · Desvío de performance", meta: "Campañas", detail: "La señal combina variación de métricas e histórico antes de sugerir una intervención.", status: "Revisar" },
      { title: "ACA · Riesgo de demora", meta: "Operación", detail: "Una dependencia repetida aparece como principal origen del riesgo actual.", status: "Validado" },
      { title: "Lider Energy · Mejora de proceso", meta: "Operación", detail: "El sistema detectó un paso manual frecuente que puede convertirse en regla automática.", status: "Propuesto" },
    ],
    sideTitle: "Cada insight explica",
    sideItems: ["Qué cambió", "Desde cuándo", "Qué datos usa", "Por qué importa", "Acción sugerida", "Nivel de confianza"],
  },
  oportunidades: {
    eyebrow: "GERENCIA / VENTAS · OPORTUNIDADES",
    title: "Oportunidades",
    description: "Cruza señales externas e internas para detectar oportunidades comerciales, de marketing, operación o eficiencia.",
    action: "Explorar oportunidades",
    metrics: [
      { label: "Detectadas", value: "8", detail: "Este mes" },
      { label: "Priorizadas", value: "3", detail: "Alta relevancia" },
      { label: "En seguimiento", value: "2", detail: "Resultado pendiente" },
    ],
    rows: [
      { title: "Grupo Portland · Oportunidad comercial", meta: "Comercial", detail: "Señal relevante detectada al cruzar contexto de cuenta con información disponible.", status: "Alta" },
      { title: "Edinovo · Oportunidad de contenido", meta: "Marketing", detail: "Tema compatible con objetivos y memoria aprobada de la cuenta.", status: "Media" },
      { title: "Epsa · Oportunidad operativa", meta: "Eficiencia", detail: "Paso repetitivo candidato a automatización controlada.", status: "Media" },
    ],
    sideTitle: "Tipos de oportunidad",
    sideItems: ["Comercial", "Marketing", "Operativa", "Financiera", "Competitiva", "Estratégica"],
  },
  aprendizajes: {
    eyebrow: "GERENCIA · MEMORIA Y APRENDIZAJE",
    title: "Aprendizajes",
    description: "Feedback, decisiones y resultados se convierten en conocimiento versionado. Nada modifica el contexto crítico sin validación.",
    action: "Revisar aprendizajes",
    metrics: [
      { label: "Nuevos", value: "8", detail: "3 por validar" },
      { label: "Aplicados", value: "24", detail: "En contexto activo" },
      { label: "Descartados", value: "5", detail: "Con motivo registrado" },
    ],
    rows: [
      { title: "Edinovo · Patrón de feedback", meta: "Origen: aprobaciones", detail: "Patrón detectado a partir de correcciones recurrentes; todavía no modifica el contexto.", status: "Validar" },
      { title: "Lider Energy · Dependencia recurrente", meta: "Origen: procesos", detail: "La misma precondición aparece en múltiples ejecuciones y puede anticiparse.", status: "Propuesto" },
      { title: "Epsa · Resultado de recomendación", meta: "Origen: medición", detail: "El sistema compara el resultado posterior con la hipótesis que originó la acción.", status: "Midiendo" },
    ],
    sideTitle: "Estados de conocimiento",
    sideItems: ["Inferido", "Propuesto", "Validado", "Aplicado", "En medición", "Descartado"],
  },
  leads: {
    eyebrow: "VENTAS · FLUJO COMERCIAL",
    title: "Leads",
    description: "Captación y priorización comercial de Avans como capacidad vertical conectada a Avans OS.",
    action: "Nuevo lead",
    metrics: standardMetrics,
    rows: [
      { title: "Nueva oportunidad", meta: "Lead entrante", detail: "Clasificación, origen, fit y siguiente acción listos para revisión comercial.", status: "Nuevo" },
      { title: "Discovery pendiente", meta: "Lead calificado", detail: "La información disponible permite iniciar relevamiento estructurado.", status: "Calificado" },
      { title: "Seguimiento comercial", meta: "Lead activo", detail: "Próximo contacto sugerido a partir del estado del pipeline.", status: "Seguimiento" },
    ],
    sideTitle: "Avans OS aporta",
    sideItems: ["Contexto unificado", "Priorización", "Próxima acción", "Trazabilidad", "Automatización de seguimiento"],
  },
  discovery: {
    eyebrow: "VENTAS · DIAGNÓSTICO",
    title: "Discovery",
    description: "Relevamiento estructurado que transforma respuestas, reuniones y documentos en diagnóstico, preguntas pendientes y oportunidades.",
    action: "Nuevo discovery",
    metrics: standardMetrics,
    rows: [
      { title: "Grupo Portland · Discovery", meta: "Diagnóstico", detail: "Información estructurada y preguntas pendientes separadas de hipótesis IA.", status: "Revisión" },
      { title: "Epsa · Discovery", meta: "Diagnóstico", detail: "Contexto confirmado y oportunidades iniciales disponibles para validación.", status: "Completo" },
      { title: "Lider Energy · Discovery", meta: "Diagnóstico", detail: "Datos importados, confirmados e inferidos identificados por procedencia.", status: "En curso" },
    ],
    sideTitle: "Salida del Discovery",
    sideItems: ["Situación actual", "Problemas", "Riesgos", "Oportunidades", "Preguntas pendientes", "Brief interno"],
  },
  propuestas: {
    eyebrow: "VENTAS · FLUJO COMERCIAL",
    title: "Propuestas",
    description: "La IA estructura alcance y entregables; precio, exclusiones y compromisos sensibles permanecen bajo validación humana.",
    action: "Nueva propuesta",
    metrics: standardMetrics,
    rows: [
      { title: "Grupo Portland · Propuesta", meta: "Borrador asistido", detail: "Diagnóstico, solución, etapas y entregables conectados al Discovery de origen.", status: "Revisión" },
      { title: "ACA · Ampliación", meta: "Borrador asistido", detail: "Alcance preparado; requiere validación comercial antes de generar versión cliente.", status: "Borrador" },
      { title: "Edinovo · Propuesta", meta: "Versión cliente", detail: "Historial de ajustes y decisiones conservado para trazabilidad.", status: "Aprobada" },
    ],
    sideTitle: "Control humano",
    sideItems: ["Precio", "Alcance", "Exclusiones", "Plazos", "Compromisos", "Versión final"],
  },
  contenido: {
    eyebrow: "OPERACIONES · CONTENIDO",
    title: "Contenido",
    description: "Planificación y producción asistidas por contexto, performance, memoria de marca y aprobación antes de publicación.",
    action: "Nueva pieza",
    metrics: standardMetrics,
    rows: [
      { title: "Epsa · Pieza en revisión", meta: "Contenido", detail: "Generada con contexto aprobado y lista para revisión interna.", status: "Revisión" },
      { title: "Edinovo · Planificación", meta: "Contenido", detail: "Territorios, ángulos y formatos propuestos antes de producción.", status: "Planificación" },
      { title: "ACA · Pieza aprobada", meta: "Contenido", detail: "Feedback registrado como evidencia para futuras generaciones.", status: "Aprobada" },
    ],
    sideTitle: "Flujo",
    sideItems: ["Contexto", "Investigación", "Planificación", "Producción", "Revisión", "Aprobación", "Medición"],
  },
  campanas: {
    eyebrow: "OPERACIONES · CAMPAÑAS",
    title: "Campañas",
    description: "Gestión por excepción: reglas detectan anomalías, la IA interpreta contexto y el especialista decide qué acción aplicar.",
    action: "Revisar alertas",
    metrics: standardMetrics,
    rows: [
      { title: "Epsa · Señal de performance", meta: "Ads", detail: "Variación detectada frente a umbrales definidos; no se ejecutan cambios sensibles sin autorización.", status: "Atención" },
      { title: "Grupo Portland · Seguimiento", meta: "Ads", detail: "Campaña dentro de comportamiento esperado, sin intervención requerida.", status: "Saludable" },
      { title: "Lider Energy · Recomendación", meta: "Ads", detail: "Hipótesis preparada para validación y posterior medición del resultado.", status: "Revisar" },
    ],
    sideTitle: "Gestión por excepción",
    sideItems: ["Regla detecta", "IA interpreta", "Especialista valida", "Avans ejecuta si está habilitado", "Resultado se mide"],
  },
  reportes: {
    eyebrow: "GERENCIA · REPORTES",
    title: "Reportes",
    description: "Fuentes conectadas y datos propios se convierten en interpretación, decisiones y próximos pasos, no sólo en gráficos.",
    action: "Nuevo reporte",
    metrics: standardMetrics,
    rows: [
      { title: "Epsa · Reporte", meta: "Período actual", detail: "Métricas consolidadas y principales variaciones listas para revisión.", status: "Revisión" },
      { title: "ACA · Reporte", meta: "Período actual", detail: "Un dato faltante mantiene el cierre en atención antes de generar conclusiones.", status: "Atención" },
      { title: "Edinovo · Reporte", meta: "Período anterior", detail: "Insights y próximos pasos aprobados y enviados al histórico de aprendizaje.", status: "Completo" },
    ],
    sideTitle: "Capas del reporte",
    sideItems: ["Datos", "Evolución", "Interpretación", "Insight", "Próxima acción", "Aprendizaje"],
  },
  integraciones: {
    eyebrow: "PLATAFORMA · INTEGRACIONES",
    title: "Integraciones",
    description: "Avans conecta herramientas existentes y normaliza la información necesaria sin obligar a reemplazar sistemas que ya funcionan.",
    action: "Nueva integración",
    metrics: [
      { label: "Conectadas", value: "9", detail: "Fuentes activas" },
      { label: "Con error", value: "0", detail: "Últimas 24 h" },
      { label: "Por configurar", value: "3", detail: "Según alcance" },
    ],
    rows: [
      { title: "Google Workspace", meta: "Productividad", detail: "Documentos, reuniones y administración de accesos según permisos disponibles.", status: "Disponible" },
      { title: "CRM", meta: "Comercial", detail: "Leads, oportunidades, clientes y eventos comerciales normalizados en la capa de datos.", status: "Disponible" },
      { title: "Ads & Analytics", meta: "Performance", detail: "Métricas e histórico utilizados por reglas, reporting  y análisis del sistema.", status: "Disponible" },
    ],
    sideTitle: "Principio",
    sideItems: ["Integrar antes de reconstruir", "Guardar histórico propio", "Normalizar datos", "Registrar procedencia", "Respetar permisos del origen"],
  },
  agentes: {
    eyebrow: "AUTOMATIZACIONES E IA · AGENTES",
    title: "Agentes",
    description: "Capacidades internas vinculadas a procesos. El usuario ve resultados y decisiones; los agentes quedan como infraestructura observable.",
    action: "Configurar agente",
    metrics: [
      { label: "Activos", value: "10", detail: "Ligados a procesos" },
      { label: "Éxito", value: "94%", detail: "Ejecuciones válidas" },
      { label: "Revisión", value: "7", detail: "Outputs sensibles" },
    ],
    rows: [
      { title: "Discovery Strategist", meta: "Discovery", detail: "Estructura información, detecta faltantes y propone diagnóstico.", status: "Activo" },
      { title: "Process Analyst", meta: "Operación", detail: "Detecta bloqueos, excepciones y siguiente acción sobre procesos.", status: "Activo" },
      { title: "Learning Agent", meta: "Memoria", detail: "Propone aprendizajes a partir de feedback y resultados, sin aplicarlos sin validación.", status: "Activo" },
    ],
    sideTitle: "Cada agente define",
    sideItems: ["Objetivo", "Fuentes", "Herramientas", "Acciones permitidas", "Guardrails", "Aprobaciones", "Coste y trazabilidad"],
  },
  workflows: {
    eyebrow: "AUTOMATIZACIONES E IA · WORKFLOWS",
    title: "Workflows",
    description: "Orquestación entre sistemas, reglas, agentes y personas. El workflow representa el proceso; la herramienta es intercambiable.",
    action: "Nuevo workflow",
    metrics: standardMetrics,
    rows: [
      { title: "Cliente ganado → activación", meta: "Workflow", detail: "Valida requisitos, crea estructura y deriva tareas pendientes.", status: "Activo" },
      { title: "Reunión → compromisos", meta: "Workflow", detail: "Procesa la reunión, crea compromisos y controla seguimiento.", status: "Activo" },
      { title: "Anomalía → decisión", meta: "Workflow", detail: "Detecta excepción, genera recomendación y espera autorización cuando corresponde.", status: "Activo" },
    ],
    sideTitle: "Bloques",
    sideItems: ["Trigger", "Condición", "Acción de sistema", "Agente", "Aprobación", "Ejecución", "Medición"],
  },
  guardrails: {
    eyebrow: "SYSTEM · GOVERNANCE",
    title: "Guardrails",
    description: "Políticas de autonomía por proceso: qué puede ejecutar Avans, hasta dónde, con qué aprobación y bajo qué límites.",
    action: "Nueva política",
    metrics: [
      { label: "Políticas", value: "14", detail: "Activas" },
      { label: "Con aprobación", value: "7", detail: "Acciones sensibles" },
      { label: "Autonomy Score", value: "62%", detail: "Promedio actual" },
    ],
    rows: [
      { title: "Cambios de presupuesto", meta: "Campañas", detail: "Requiere aprobación y límite porcentual antes de ejecutar en la plataforma.", status: "Supervisado" },
      { title: "Actualización de memoria", meta: "Learning", detail: "Un aprendizaje propuesto nunca modifica contexto crítico sin validación.", status: "Supervisado" },
      { title: "Creación de tareas", meta: "Operación", detail: "Puede ejecutarse automáticamente cuando origen, responsable y regla están definidos.", status: "Automático" },
    ],
    sideTitle: "Una política controla",
    sideItems: ["Acción permitida", "Umbral", "Responsable", "Aprobación", "Límite económico", "Reversión", "Evidencia"],
  },
  auditoria: {
    eyebrow: "SYSTEM · AUDIT",
    title: "Auditoría",
    description: "Registro transversal de recomendaciones, aprobaciones, ejecuciones, cambios de estado y resultados posteriores.",
    action: "Exportar registro",
    metrics: [
      { label: "Eventos", value: "248", detail: "Últimos 30 días" },
      { label: "Ejecuciones", value: "96", detail: "Con resultado" },
      { label: "Errores críticos", value: "0", detail: "Período actual" },
    ],
    rows: [
      { title: "Acción automática completada", meta: "Process Engine", detail: "Origen, regla, hora y resultado guardados para trazabilidad.", status: "OK" },
      { title: "Recomendación aprobada", meta: "Bandeja · decisión", detail: "Se conserva quién aprobó, qué se autorizó y qué ocurrió después.", status: "OK" },
      { title: "Aprendizaje aplicado", meta: "Learning Engine", detail: "Versión anterior y nueva del contexto quedan disponibles para auditoría.", status: "OK" },
    ],
    sideTitle: "Trazabilidad",
    sideItems: ["Quién", "Qué", "Cuándo", "Por qué", "Antes / después", "Resultado", "Fuente"],
  },
};
