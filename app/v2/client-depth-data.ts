export type ClientKnowledgeItem = {
  label: string;
  detail: string;
  completeness: number;
  provenance: "Confirmado" | "Importado" | "Inferido" | "Aprendido";
  status: "Listo" | "Revisar";
};

export type ClientWorkstream = {
  title: string;
  area: string;
  owner: string;
  stage: string;
  next: string;
  status: "En curso" | "Atención" | "Aprobación" | "Planificado";
  href?: string;
};

export type ClientAction = {
  title: string;
  source: string;
  owner: string;
  due: string;
  priority: "Alta" | "Media";
};

export type ClientDecision = {
  date: string;
  title: string;
  detail: string;
  source: string;
};

export type ClientSource = {
  title: string;
  category: string;
  origin: string;
  updated: string;
};

export type ClientDepth = {
  slug: string;
  name: string;
  status: "Saludable" | "Atención";
  healthScore: number;
  context: number;
  attention: string;
  relationship: string;
  primaryObjective: string;
  accountOwner: string;
  nextMilestone: string;
  nextMilestoneDate: string;
  activeWorkstreams: number;
  openActions: number;
  services: string[];
  knowledge: ClientKnowledgeItem[];
  workstreams: ClientWorkstream[];
  actions: ClientAction[];
  decisions: ClientDecision[];
  sources: ClientSource[];
  commercial: {
    serviceStatus: string;
    billingStatus: string;
    nextReview: string;
    note: string;
  };
};

export const clientDepthData: ClientDepth[] = [
  {
    slug: "epsa",
    name: "Epsa",
    status: "Saludable",
    healthScore: 91,
    context: 92,
    attention: "1 señal",
    relationship: "Cuenta activa",
    primaryObjective: "Centralizar la operación de marketing, automatización y reporting sobre una única memoria de cuenta.",
    accountOwner: "Cuentas + Performance",
    nextMilestone: "Validar la próxima optimización y registrar el resultado",
    nextMilestoneDate: "Esta semana",
    activeWorkstreams: 4,
    openActions: 2,
    services: ["Operación", "Campañas", "Contenido", "Reportes"],
    knowledge: [
      { label: "Negocio y objetivos", detail: "Servicios, prioridades comerciales, públicos y restricciones operativas.", completeness: 96, provenance: "Confirmado", status: "Listo" },
      { label: "Marca y comunicación", detail: "Tono, mensajes, criterios aprobados y referencias de comunicación.", completeness: 91, provenance: "Aprendido", status: "Listo" },
      { label: "Procesos de cuenta", detail: "Flujos, responsables, aprobaciones, SLA y dependencias recurrentes.", completeness: 88, provenance: "Importado", status: "Listo" },
      { label: "Resultados e histórico", detail: "Campañas, reportes, decisiones y medición posterior de recomendaciones.", completeness: 93, provenance: "Importado", status: "Listo" },
    ],
    workstreams: [
      { title: "Operación de cuenta", area: "Operaciones", owner: "Cuentas", stage: "Ejecución", next: "Cerrar insumos del próximo ciclo", status: "En curso", href: "/v2/proyectos" },
      { title: "Monitoreo de campañas", area: "Performance", owner: "Performance", stage: "Revisión", next: "Validar señal detectada", status: "Atención", href: "/v2/clientes/epsa/campanas" },
      { title: "Planificación de contenido", area: "Contenido", owner: "Contenido", stage: "Producción", next: "Revisión interna", status: "En curso", href: "/v2/clientes/epsa/contenido" },
      { title: "Cierre de reporting", area: "Gerencia", owner: "Cuentas", stage: "Normalización", next: "Completar lectura ejecutiva", status: "Planificado", href: "/v2/clientes/epsa/reportes" },
    ],
    actions: [
      { title: "Revisar variación de performance antes de modificar inversión", source: "Campañas", owner: "Performance", due: "Hoy", priority: "Alta" },
      { title: "Completar el insumo pendiente del próximo ciclo", source: "Operación", owner: "Cuentas", due: "Mañana", priority: "Media" },
    ],
    decisions: [
      { date: "Hoy", title: "Optimización derivada a revisión humana", detail: "La señal superó el umbral de autonomía y quedó pendiente de validación.", source: "Campañas" },
      { date: "3 días", title: "Criterio de comunicación actualizado", detail: "Un patrón de feedback validado se incorporó a la memoria activa.", source: "Aprendizajes" },
      { date: "7 días", title: "Nuevo workflow operativo aprobado", detail: "Se definieron responsables y condiciones para el próximo ciclo.", source: "Procesos" },
    ],
    sources: [
      { title: "Brief y lineamientos de cuenta", category: "Contexto", origin: "Drive", updated: "Actualizado esta semana" },
      { title: "Histórico de campañas", category: "Resultados", origin: "Plataforma publicitaria", updated: "Sincronización diaria" },
      { title: "Actas y compromisos", category: "Reuniones", origin: "Meeting Intelligence", updated: "Última reunión procesada" },
      { title: "Decisiones y aprendizajes", category: "Memoria", origin: "Avans OS", updated: "Versionado activo" },
    ],
    commercial: {
      serviceStatus: "Servicios activos y alcance confirmado",
      billingStatus: "Estado financiero a conectar",
      nextReview: "Revisión mensual de cuenta",
      note: "La información económica se mostrará según rol y se integrará sin reemplazar el sistema administrativo existente.",
    },
  },
  {
    slug: "aca",
    name: "ACA",
    status: "Atención",
    healthScore: 77,
    context: 81,
    attention: "2 pendientes",
    relationship: "Cuenta activa",
    primaryObjective: "Ordenar campañas, contenidos, entregables y decisiones alrededor de los objetivos de captación y comunicación.",
    accountOwner: "Cuentas + Estrategia",
    nextMilestone: "Resolver insumo pendiente para continuar el flujo",
    nextMilestoneDate: "Hoy",
    activeWorkstreams: 3,
    openActions: 3,
    services: ["Estrategia", "Contenido", "Campañas"],
    knowledge: [
      { label: "Negocio y objetivos", detail: "Propuesta de valor, públicos y objetivos de captación del período.", completeness: 86, provenance: "Confirmado", status: "Listo" },
      { label: "Marca y comunicación", detail: "Mensajes, tono, beneficios, referencias y restricciones institucionales.", completeness: 88, provenance: "Importado", status: "Listo" },
      { label: "Procesos de aprobación", detail: "Responsables, tiempos, dependencias e información requerida.", completeness: 71, provenance: "Inferido", status: "Revisar" },
      { label: "Resultados e histórico", detail: "Campañas, landing pages y decisiones anteriores.", completeness: 78, provenance: "Importado", status: "Revisar" },
    ],
    workstreams: [
      { title: "Campaña de captación", area: "Performance", owner: "Performance", stage: "Ejecución", next: "Validar pieza y destino", status: "Atención", href: "/v2/clientes/aca/campanas" },
      { title: "Producción de contenidos", area: "Contenido", owner: "Contenido", stage: "Aprobación", next: "Recibir feedback", status: "Aprobación", href: "/v2/clientes/aca/contenido" },
      { title: "Seguimiento de compromisos", area: "Operaciones", owner: "Cuentas", stage: "Bloqueado", next: "Solicitar dato faltante", status: "Atención", href: "/v2/reuniones" },
    ],
    actions: [
      { title: "Solicitar el insumo que bloquea el siguiente paso", source: "Proceso", owner: "Cuentas", due: "Hoy", priority: "Alta" },
      { title: "Validar la versión final de la pieza", source: "Contenido", owner: "Estrategia", due: "Hoy", priority: "Alta" },
      { title: "Actualizar el criterio de aprobación", source: "Memoria", owner: "Cuentas", due: "Esta semana", priority: "Media" },
    ],
    decisions: [
      { date: "Hoy", title: "Proceso detenido por precondición faltante", detail: "El sistema evitó continuar con información incompleta.", source: "Operaciones" },
      { date: "Ayer", title: "Versión de contenido derivada a aprobación", detail: "La pieza quedó vinculada a su objetivo y feedback previo.", source: "Contenido" },
      { date: "5 días", title: "Prioridad comercial actualizada", detail: "Se ajustó el foco del período según la reunión de seguimiento.", source: "Reuniones" },
    ],
    sources: [
      { title: "Lineamientos institucionales", category: "Marca", origin: "Drive", updated: "Versión vigente" },
      { title: "Landing y campañas", category: "Operación", origin: "Avans OS", updated: "Actualización semanal" },
      { title: "Actas de seguimiento", category: "Reuniones", origin: "Meeting Intelligence", updated: "Última reunión procesada" },
      { title: "Feedback y aprobaciones", category: "Memoria", origin: "Avans OS", updated: "2 pendientes" },
    ],
    commercial: {
      serviceStatus: "Alcance activo con dependencias operativas",
      billingStatus: "Estado financiero a conectar",
      nextReview: "Seguimiento de alcance y prioridades",
      note: "Los pendientes operativos deben resolverse antes de ampliar autonomía o incorporar nuevas automatizaciones.",
    },
  },
  {
    slug: "grupo-portland",
    name: "Grupo Portland",
    status: "Saludable",
    healthScore: 88,
    context: 88,
    attention: "1 aprobación",
    relationship: "Cuenta activa",
    primaryObjective: "Conectar diagnóstico, estrategia, producción y resultados en una operación con contexto compartido.",
    accountOwner: "Cuentas + Estrategia",
    nextMilestone: "Aprobar la propuesta de la siguiente etapa",
    nextMilestoneDate: "Esta semana",
    activeWorkstreams: 3,
    openActions: 2,
    services: ["Discovery", "Estrategia", "Contenido"],
    knowledge: [
      { label: "Negocio y objetivos", detail: "Unidades, prioridades, públicos y objetivos comerciales.", completeness: 92, provenance: "Confirmado", status: "Listo" },
      { label: "Marca y comunicación", detail: "Posicionamiento, tono, mensajes y referencias aprobadas.", completeness: 87, provenance: "Importado", status: "Listo" },
      { label: "Procesos de cuenta", detail: "Flujos de trabajo, responsables y puntos de validación.", completeness: 82, provenance: "Aprendido", status: "Listo" },
      { label: "Resultados e histórico", detail: "Propuestas, decisiones y entregables de etapas anteriores.", completeness: 89, provenance: "Importado", status: "Listo" },
    ],
    workstreams: [
      { title: "Propuesta de siguiente etapa", area: "Ventas", owner: "Dirección", stage: "Aprobación", next: "Validar alcance e inversión", status: "Aprobación", href: "/v2/propuestas" },
      { title: "Producción estratégica", area: "Operaciones", owner: "Estrategia", stage: "Planificación", next: "Definir entregables", status: "En curso", href: "/v2/proyectos" },
      { title: "Memoria de cuenta", area: "Clientes", owner: "Cuentas", stage: "Consolidación", next: "Validar nuevos aprendizajes", status: "Planificado", href: "/v2/aprendizajes" },
    ],
    actions: [
      { title: "Validar alcance e inversión de la propuesta", source: "Ventas", owner: "Dirección", due: "Hoy", priority: "Alta" },
      { title: "Confirmar los entregables de la nueva etapa", source: "Operaciones", owner: "Estrategia", due: "Esta semana", priority: "Media" },
    ],
    decisions: [
      { date: "Hoy", title: "Propuesta lista para validación", detail: "Diagnóstico, etapas y entregables quedaron conectados en una única versión.", source: "Ventas" },
      { date: "4 días", title: "Prioridades estratégicas confirmadas", detail: "La reunión actualizó el orden de oportunidades de la cuenta.", source: "Discovery" },
      { date: "9 días", title: "Contexto inicial consolidado", detail: "Documentos y entrevistas quedaron estructurados dentro de la ficha.", source: "Clientes" },
    ],
    sources: [
      { title: "Discovery y diagnóstico", category: "Estrategia", origin: "Avans OS", updated: "Completo" },
      { title: "Propuesta comercial", category: "Ventas", origin: "Avans OS", updated: "Pendiente de aprobación" },
      { title: "Documentación institucional", category: "Contexto", origin: "Drive", updated: "Versión vigente" },
      { title: "Historial de reuniones", category: "Reuniones", origin: "Meeting Intelligence", updated: "Sincronizado" },
    ],
    commercial: {
      serviceStatus: "Siguiente etapa pendiente de aprobación",
      billingStatus: "Estado financiero a conectar",
      nextReview: "Validación de propuesta",
      note: "El handoff comercial debe crear automáticamente la estructura de cliente, proyecto, responsables y próximos pasos.",
    },
  },
  {
    slug: "edinovo",
    name: "Edinovo",
    status: "Saludable",
    healthScore: 87,
    context: 86,
    attention: "2 aprendizajes",
    relationship: "Cuenta activa",
    primaryObjective: "Transformar feedback y resultados recurrentes en una memoria de marca que mejore la producción futura.",
    accountOwner: "Cuentas + Contenido",
    nextMilestone: "Validar dos aprendizajes antes del próximo ciclo",
    nextMilestoneDate: "Esta semana",
    activeWorkstreams: 3,
    openActions: 2,
    services: ["Contenido", "Marca", "Reportes"],
    knowledge: [
      { label: "Negocio y objetivos", detail: "Oferta, públicos, prioridades y objetivos de comunicación.", completeness: 84, provenance: "Confirmado", status: "Listo" },
      { label: "Marca y comunicación", detail: "Tono, estilo, piezas aprobadas, referencias y feedback recurrente.", completeness: 94, provenance: "Aprendido", status: "Listo" },
      { label: "Procesos de cuenta", detail: "Planificación, producción, revisión y aprobación.", completeness: 85, provenance: "Importado", status: "Listo" },
      { label: "Resultados e histórico", detail: "Rendimiento de contenidos, reportes y aprendizajes en medición.", completeness: 81, provenance: "Importado", status: "Revisar" },
    ],
    workstreams: [
      { title: "Planificación de contenido", area: "Contenido", owner: "Contenido", stage: "Planificación", next: "Validar territorios", status: "En curso", href: "/v2/clientes/edinovo/contenido" },
      { title: "Aprendizajes de marca", area: "Clientes", owner: "Estrategia", stage: "Validación", next: "Aceptar o descartar patrones", status: "Aprobación", href: "/v2/aprendizajes" },
      { title: "Reporte de ciclo", area: "Gerencia", owner: "Cuentas", stage: "Preparación", next: "Completar fuentes", status: "Planificado", href: "/v2/clientes/edinovo/reportes" },
    ],
    actions: [
      { title: "Validar el patrón detectado en feedback", source: "Aprendizajes", owner: "Estrategia", due: "Hoy", priority: "Alta" },
      { title: "Confirmar territorios del próximo ciclo", source: "Contenido", owner: "Contenido", due: "Esta semana", priority: "Media" },
    ],
    decisions: [
      { date: "Hoy", title: "Dos patrones listos para validación", detail: "Todavía no modifican el contexto crítico de la cuenta.", source: "Aprendizajes" },
      { date: "Ayer", title: "Planificación ajustada por feedback", detail: "Se priorizaron formatos compatibles con piezas aprobadas.", source: "Contenido" },
      { date: "6 días", title: "Criterio visual incorporado", detail: "La recurrencia fue confirmada por el equipo y quedó versionada.", source: "Memoria" },
    ],
    sources: [
      { title: "Manual y referencias", category: "Marca", origin: "Drive", updated: "Versión vigente" },
      { title: "Piezas y aprobaciones", category: "Contenido", origin: "Avans OS", updated: "Histórico activo" },
      { title: "Feedback recurrente", category: "Aprendizajes", origin: "Avans OS", updated: "2 por validar" },
      { title: "Reportes de ciclo", category: "Resultados", origin: "Avans OS", updated: "Último período cerrado" },
    ],
    commercial: {
      serviceStatus: "Servicios activos y operación estable",
      billingStatus: "Estado financiero a conectar",
      nextReview: "Revisión de aprendizajes y planificación",
      note: "El conocimiento aprendido conserva origen, versión y aprobación antes de condicionar nuevas producciones.",
    },
  },
  {
    slug: "lider-energy",
    name: "Lider Energy",
    status: "Atención",
    healthScore: 73,
    context: 76,
    attention: "3 pendientes",
    relationship: "Onboarding activo",
    primaryObjective: "Completar contexto, responsables y procesos mínimos antes de ampliar automatizaciones o autonomía.",
    accountOwner: "Cuentas + Operaciones",
    nextMilestone: "Cerrar onboarding y validar responsables",
    nextMilestoneDate: "Esta semana",
    activeWorkstreams: 3,
    openActions: 4,
    services: ["Onboarding", "Operación", "Contenido"],
    knowledge: [
      { label: "Negocio y objetivos", detail: "Oferta, públicos, objetivos y prioridades iniciales.", completeness: 78, provenance: "Confirmado", status: "Revisar" },
      { label: "Marca y comunicación", detail: "Tono, mensajes, referencias y restricciones.", completeness: 74, provenance: "Importado", status: "Revisar" },
      { label: "Procesos de cuenta", detail: "Responsables, aprobaciones, dependencias y canales.", completeness: 69, provenance: "Inferido", status: "Revisar" },
      { label: "Resultados e histórico", detail: "Información disponible para establecer una línea de base.", completeness: 63, provenance: "Importado", status: "Revisar" },
    ],
    workstreams: [
      { title: "Onboarding de cuenta", area: "Operaciones", owner: "Cuentas", stage: "Relevamiento", next: "Completar responsables", status: "Atención", href: "/v2/procesos" },
      { title: "Contexto de marca", area: "Clientes", owner: "Estrategia", stage: "Validación", next: "Confirmar tono y referencias", status: "Atención", href: "/v2/discovery" },
      { title: "Primer ciclo de contenido", area: "Contenido", owner: "Contenido", stage: "Planificado", next: "Esperar precondiciones", status: "Planificado", href: "/v2/clientes/lider-energy/contenido" },
    ],
    actions: [
      { title: "Confirmar responsables y aprobadores", source: "Onboarding", owner: "Cuentas", due: "Hoy", priority: "Alta" },
      { title: "Validar tono y referencias", source: "Contexto", owner: "Estrategia", due: "Mañana", priority: "Alta" },
      { title: "Completar accesos y fuentes", source: "Integraciones", owner: "Operaciones", due: "Esta semana", priority: "Media" },
      { title: "Definir línea de base de indicadores", source: "Reportes", owner: "Cuentas", due: "Esta semana", priority: "Media" },
    ],
    decisions: [
      { date: "Hoy", title: "Autonomía limitada durante onboarding", detail: "El sistema sólo prepara borradores hasta completar contexto y permisos.", source: "Seguridad" },
      { date: "2 días", title: "Primer workflow operativo definido", detail: "Se establecieron precondiciones y responsables iniciales.", source: "Procesos" },
      { date: "5 días", title: "Fuentes prioritarias identificadas", detail: "Quedaron pendientes accesos y validaciones para completar la memoria.", source: "Discovery" },
    ],
    sources: [
      { title: "Formulario de onboarding", category: "Contexto", origin: "Avans OS", updated: "76% completo" },
      { title: "Documentación de marca", category: "Marca", origin: "Drive", updated: "Pendiente de validación" },
      { title: "Accesos e integraciones", category: "Operación", origin: "Configuración", updated: "3 pendientes" },
      { title: "Acta de kickoff", category: "Reuniones", origin: "Meeting Intelligence", updated: "Procesada" },
    ],
    commercial: {
      serviceStatus: "Onboarding en curso",
      billingStatus: "Estado financiero a conectar",
      nextReview: "Cierre de onboarding",
      note: "La cuenta no debe pasar a operación autónoma hasta completar contexto, accesos, responsables y reglas mínimas.",
    },
  },
];

export function getClientDepth(slug: string) {
  return clientDepthData.find((client) => client.slug === slug);
}
