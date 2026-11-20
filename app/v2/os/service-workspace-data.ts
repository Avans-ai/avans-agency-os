import type { ServiceId } from "./os-data";

export type ServiceWorkspaceConfig = {
  id: ServiceId;
  route: string;
  label: string;
  description: string;
  createLabel: string;
  entityLabel: string;
  stages: string[];
  queue: { title: string; detail: string; status: string }[];
};

/**
 * Los módulos se abren siempre dentro de un cliente. `contenido` y `campanas`
 * conservan sus URLs anteriores para no romper enlaces compartidos.
 */
export const serviceWorkspaces: ServiceWorkspaceConfig[] = [
  {
    id: "estrategia",
    route: "estrategia",
    label: "Estrategia y coordinación",
    description: "Coordina prioridades, decisiones y recomendaciones de todos los servicios activos de la cuenta.",
    createLabel: "Nueva iniciativa",
    entityLabel: "iniciativa",
    stages: ["Detectar", "Priorizar", "Asignar", "Validar", "Cerrar aprendizaje"],
    queue: [
      { title: "Revisar prioridades de la semana", detail: "Cruzar próximos hitos, bloqueos y capacidad del equipo.", status: "Hoy" },
      { title: "Preparar agenda de coordinación", detail: "Consolidar decisiones pendientes de los módulos activos.", status: "En curso" },
    ],
  },
  {
    id: "diseno-marca",
    route: "diseno-marca",
    label: "Diseño de marca",
    description: "Gestiona identidad, piezas de marca, versiones y aprobaciones dentro del contexto del cliente.",
    createLabel: "Nueva pieza de marca",
    entityLabel: "pieza",
    stages: ["Brief", "Exploración", "Diseño", "Revisión", "Entrega"],
    queue: [
      { title: "Revisar brief visual", detail: "Validar objetivos, formatos y referencias antes de diseñar.", status: "Pendiente" },
      { title: "Ordenar versiones aprobadas", detail: "Mantener una única referencia vigente para el equipo.", status: "Planificado" },
    ],
  },
  {
    id: "publicidad-digital",
    route: "campanas",
    label: "Publicidad digital",
    description: "Planifica campañas, pauta, audiencias, medición y optimización sin mezclar cuentas.",
    createLabel: "Nueva campaña",
    entityLabel: "campaña",
    stages: ["Brief", "Plan de pauta", "Producción", "Configuración", "Optimización", "Reporte"],
    queue: [
      { title: "Control de campañas activas", detail: "Revisar presupuesto, entrega, alertas y conversiones.", status: "Hoy" },
      { title: "Próxima optimización", detail: "Registrar hipótesis, cambio aplicado y resultado esperado.", status: "Esta semana" },
    ],
  },
  {
    id: "contenidos",
    route: "contenido",
    label: "Contenidos",
    description: "Organiza calendario, briefs, producción, feedback, aprobación y publicación de cada cuenta.",
    createLabel: "Nuevo contenido",
    entityLabel: "contenido",
    stages: ["Idea", "Brief", "Producción", "Revisión", "Aprobación", "Publicación"],
    queue: [
      { title: "Calendario del período", detail: "Priorizar piezas próximas y detectar aprobaciones demoradas.", status: "En curso" },
      { title: "Feedback pendiente", detail: "Centralizar ajustes sin perder versiones ni contexto.", status: "Atención" },
    ],
  },
  {
    id: "audiovisuales",
    route: "audiovisuales",
    label: "Audiovisuales",
    description: "Gestiona guion, preproducción, rodaje, edición, revisión y entrega audiovisual.",
    createLabel: "Nueva producción",
    entityLabel: "producción",
    stages: ["Brief", "Guion", "Preproducción", "Rodaje", "Edición", "Aprobación"],
    queue: [
      { title: "Confirmar preproducción", detail: "Validar guion, locación, participantes y recursos.", status: "Pendiente" },
      { title: "Ordenar feedback de edición", detail: "Consolidar comentarios antes de una nueva versión.", status: "Planificado" },
    ],
  },
  {
    id: "desarrollo-web",
    route: "desarrollo-web",
    label: "Desarrollo web",
    description: "Gestiona proyectos web, landings, QA, aprobaciones, publicación y mantenimiento.",
    createLabel: "Nuevo proyecto web",
    entityLabel: "proyecto web",
    stages: ["Definición", "Arquitectura", "Diseño", "Desarrollo", "QA", "Publicación"],
    queue: [
      { title: "Revisar entregables activos", detail: "Confirmar alcance, dependencia y próximo hito por proyecto.", status: "Hoy" },
      { title: "QA previo a publicación", detail: "Validar responsive, formularios, medición y regresiones.", status: "Requerido" },
    ],
  },
  {
    id: "crm",
    route: "crm",
    label: "Implementación de CRM",
    description: "Define embudos, automatizaciones, integraciones, permisos y pruebas de operación del CRM.",
    createLabel: "Nueva implementación",
    entityLabel: "implementación",
    stages: ["Relevamiento", "Diseño", "Configuración", "Integración", "Pruebas", "Adopción"],
    queue: [
      { title: "Validar proceso comercial", detail: "Confirmar etapas, responsables y criterios antes de configurar.", status: "Pendiente" },
      { title: "Prueba punta a punta", detail: "Verificar ingreso, clasificación, derivación y seguimiento real.", status: "Requerido" },
    ],
  },
  {
    id: "ia-automatizaciones",
    route: "ia-automatizaciones",
    label: "IA y automatizaciones",
    description: "Diseña automatizaciones con aprobaciones, trazabilidad, límites y evidencia de ejecución.",
    createLabel: "Nueva automatización",
    entityLabel: "automatización",
    stages: ["Objetivo", "Diseño", "Guardrails", "Implementación", "Prueba", "Monitoreo"],
    queue: [
      { title: "Definir resultado observable", detail: "Acordar qué cambia, quién aprueba y cómo se mide.", status: "Pendiente" },
      { title: "Revisar fallos y excepciones", detail: "No ocultar ejecuciones incompletas ni falsos positivos.", status: "Continuo" },
    ],
  },
  {
    id: "soluciones-graficas",
    route: "soluciones-graficas",
    label: "Soluciones gráficas y merchandising",
    description: "Organiza pedidos, especificaciones, producción, proveedores, control y entrega.",
    createLabel: "Nuevo pedido gráfico",
    entityLabel: "pedido",
    stages: ["Pedido", "Especificación", "Presupuesto", "Producción", "Control", "Entrega"],
    queue: [
      { title: "Confirmar especificaciones", detail: "Validar medidas, materiales, cantidades y archivos finales.", status: "Pendiente" },
      { title: "Seguimiento de proveedor", detail: "Registrar fecha comprometida y evidencia de avance.", status: "Planificado" },
    ],
  },
  {
    id: "mercado-libre",
    route: "mercado-libre",
    label: "Mercado Libre",
    description: "Gestiona publicaciones, catálogo, pricing, campañas, reputación y oportunidades del canal.",
    createLabel: "Nueva iniciativa de canal",
    entityLabel: "iniciativa",
    stages: ["Diagnóstico", "Priorización", "Implementación", "Medición", "Optimización"],
    queue: [
      { title: "Revisar publicaciones prioritarias", detail: "Detectar problemas de contenido, precio o conversión.", status: "Esta semana" },
      { title: "Registrar oportunidad", detail: "Vincular hallazgo, impacto y acción propuesta.", status: "Planificado" },
    ],
  },
];

const byId = new Map(serviceWorkspaces.map((service) => [service.id, service]));
const byRoute = new Map(serviceWorkspaces.map((service) => [service.route, service]));

export function serviceWorkspaceById(id: ServiceId) {
  return byId.get(id);
}

export function serviceWorkspaceByRoute(route: string) {
  return byRoute.get(route);
}

export function serviceHref(clientSlug: string, serviceId: ServiceId) {
  const workspace = serviceWorkspaceById(serviceId);
  return workspace ? `/v2/clientes/${clientSlug}/${workspace.route}` : `/v2/clientes/${clientSlug}`;
}

export type RecommendationStatus = "Nueva" | "En evaluación" | "Priorizada" | "Descartada";
export type ServiceRecommendation = {
  id: string;
  clientSlug: string;
  serviceId: ServiceId;
  title: string;
  rationale: string;
  source: "Discovery" | "Benchmark" | "Reunión" | "Resultados" | "Carga manual";
  priority: "Alta" | "Media" | "Baja";
  status: RecommendationStatus;
};

/** Datos de demostración. No representan una ejecución real de IA. */
export const serviceRecommendations: ServiceRecommendation[] = [
  { id: "REC-101", clientSlug: "epsa", serviceId: "publicidad-digital", title: "Campaña de posventa como diferencial", rationale: "El benchmark detecta que ningún competidor comunica el servicio posventa con claridad.", source: "Benchmark", priority: "Alta", status: "Priorizada" },
  { id: "REC-102", clientSlug: "epsa", serviceId: "contenidos", title: "Serie de videos cortos de producto", rationale: "Las piezas breves duplicaron el CTR en el último aprendizaje registrado.", source: "Resultados", priority: "Media", status: "En evaluación" },
  { id: "REC-103", clientSlug: "epsa", serviceId: "estrategia", title: "Alinear aprobaciones del comité antes del lanzamiento", rationale: "Marketing y Dirección Comercial intervienen en momentos distintos y hoy generan retrabajo.", source: "Reunión", priority: "Alta", status: "Priorizada" },
  { id: "REC-201", clientSlug: "aca", serviceId: "publicidad-digital", title: "Separar campañas por segmento", rationale: "El objetivo trimestral exige bajar CPL sin perder volumen; hoy los mensajes compiten entre públicos.", source: "Resultados", priority: "Alta", status: "En evaluación" },
  { id: "REC-202", clientSlug: "aca", serviceId: "contenidos", title: "Convertir preguntas frecuentes en piezas", rationale: "La ficha registra consultas repetidas que pueden anticiparse desde contenidos.", source: "Discovery", priority: "Media", status: "Nueva" },
  { id: "REC-301", clientSlug: "edinovo", serviceId: "audiovisuales", title: "Cerrar guiones antes de reprogramar rodaje", rationale: "La producción ya se reprogramó una vez por falta de aprobación.", source: "Reunión", priority: "Alta", status: "Priorizada" },
  { id: "REC-302", clientSlug: "edinovo", serviceId: "contenidos", title: "Reutilizar episodios como cápsulas", rationale: "Permite sostener frecuencia mientras se destraba la serie principal.", source: "Resultados", priority: "Media", status: "Nueva" },
  { id: "REC-401", clientSlug: "grupo-portland", serviceId: "desarrollo-web", title: "Publicar staging con contenido marcado", rationale: "El desarrollo está listo pero los textos institucionales siguen bloqueando la revisión.", source: "Reunión", priority: "Alta", status: "En evaluación" },
  { id: "REC-402", clientSlug: "grupo-portland", serviceId: "estrategia", title: "Validar arquitectura antes del cierre de contenidos", rationale: "Reduce cambios tardíos y separa una decisión estratégica de la carga editorial.", source: "Discovery", priority: "Media", status: "Nueva" },
  { id: "REC-501", clientSlug: "lider-energy", serviceId: "crm", title: "Definir etapas y responsables antes de conectar formularios", rationale: "La medición punta a punta depende de que el proceso comercial esté validado.", source: "Discovery", priority: "Alta", status: "Priorizada" },
  { id: "REC-502", clientSlug: "lider-energy", serviceId: "publicidad-digital", title: "Unificar UTMs con el nuevo CRM", rationale: "Evita perder atribución al comenzar las campañas de adquisición.", source: "Benchmark", priority: "Media", status: "En evaluación" },
];

export function recommendationsForClient(clientSlug: string, serviceId?: ServiceId) {
  return serviceRecommendations.filter((recommendation) => recommendation.clientSlug === clientSlug && (!serviceId || recommendation.serviceId === serviceId));
}
