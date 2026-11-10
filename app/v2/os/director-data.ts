import {
  CURRENT_USER,
  osClients,
  osProjects,
  people,
  serviceLabel,
  type OsClient,
  type OsTask,
  type ServiceId,
} from "./os-data";

export type ClientChannel = {
  id: string;
  label: string;
  value: string;
  kind: "web" | "social" | "platform";
};

export type ScopeCompliance = "Cumplido" | "Atención" | "Pendiente";
export type ServiceScope = {
  serviceId: ServiceId;
  summary: string;
  cadence: string;
  deliverables: string[];
  compliance: ScopeCompliance;
  alert?: string;
};

export type CompetitorSnapshot = {
  name: string;
  positioning: string;
  channels: string;
  lastScan: string;
  state: "Monitoreada" | "Nueva" | "Revisar";
};

export type ClientReport = {
  id: string;
  label: string;
  period: string;
  type: "Semanal" | "Mensual" | "Quincenal";
  state: "Listo" | "En preparación" | "Pendiente";
};

export type ClientDocument = {
  id: string;
  name: string;
  type: string;
  updated: string;
  source: string;
};

export type ClientInsight = {
  id: string;
  serviceId: ServiceId;
  title: string;
  detail: string;
  source: string;
};

export type ClientAttentionItem = {
  id: string;
  title: string;
  detail: string;
  tone: "error" | "warning" | "info";
  serviceId?: ServiceId;
};

export type ClientDirectorMeta = {
  active: boolean;
  assignedTo: string[];
  billingStatus: "Al día" | "Pendiente" | "Pausada";
  marginPercent: number;
  channels: ClientChannel[];
  business: {
    definition: string;
    units: string[];
    audiences: string[];
    offer: string;
    catalogState: string;
    tiendaNubeState: string;
  };
  competitors: CompetitorSnapshot[];
  reports: ClientReport[];
  documents: ClientDocument[];
  attention: ClientAttentionItem[];
  insights: ClientInsight[];
};

const DEFAULT_SCOPE: Record<ServiceId, Omit<ServiceScope, "serviceId" | "compliance" | "alert">> = {
  estrategia: {
    summary: "Coordinación general de la cuenta, prioridades, reuniones de seguimiento y actualización del plan.",
    cadence: "Seguimiento semanal",
    deliverables: ["Plan de trabajo", "Coordinación de líderes", "Recomendaciones y próximos pasos"],
  },
  "diseno-marca": {
    summary: "Desarrollo y evolución de identidad visual y piezas de marca.",
    cadence: "Según planificación",
    deliverables: ["Sistema visual", "Piezas de marca", "Control de versiones"],
  },
  "publicidad-digital": {
    summary: "Planificación, configuración, optimización y reporte de campañas pagas.",
    cadence: "Optimización semanal · reporte mensual",
    deliverables: ["Plan de pauta", "Gestión de campañas", "Optimización", "Reporte de resultados"],
  },
  contenidos: {
    summary: "Estrategia editorial, calendario, producción, revisión y publicación de contenidos.",
    cadence: "Calendario mensual · seguimiento semanal",
    deliverables: ["Calendario editorial", "Copys y piezas", "Aprobaciones", "Aprendizajes"],
  },
  audiovisuales: {
    summary: "Preproducción, producción, edición y entrega de contenidos audiovisuales.",
    cadence: "Por producción",
    deliverables: ["Guion", "Preproducción", "Rodaje", "Edición y versiones"],
  },
  "desarrollo-web": {
    summary: "Diseño, desarrollo, QA, publicación y mantenimiento de activos web.",
    cadence: "Por sprint y entregable",
    deliverables: ["Arquitectura", "Diseño", "Desarrollo", "QA y publicación"],
  },
  crm: {
    summary: "Diseño e implementación del proceso comercial dentro del CRM.",
    cadence: "Por etapa de implementación",
    deliverables: ["Mapa de proceso", "Configuración", "Integraciones", "Pruebas y adopción"],
  },
  "ia-automatizaciones": {
    summary: "Diseño, implementación y monitoreo de automatizaciones con IA.",
    cadence: "Por workflow",
    deliverables: ["Objetivo observable", "Guardrails", "Implementación", "Monitoreo"],
  },
  "soluciones-graficas": {
    summary: "Gestión de pedidos gráficos, proveedores, producción y entrega.",
    cadence: "Por pedido",
    deliverables: ["Especificación", "Presupuesto", "Producción", "Control y entrega"],
  },
  "mercado-libre": {
    summary: "Gestión de catálogo, publicaciones, campañas y oportunidades del canal.",
    cadence: "Seguimiento semanal",
    deliverables: ["Optimización de publicaciones", "Pricing", "Campañas", "Reporte del canal"],
  },
};

const metaByClient: Record<string, ClientDirectorMeta> = {
  aca: {
    active: true,
    assignedTo: ["Nicolás Okro", "Sofía Ramírez", "Lucía Benítez"],
    billingStatus: "Al día",
    marginPercent: 36,
    channels: [
      { id: "aca-web", label: "Sitio web", value: "aca.org.ar", kind: "web" },
      { id: "aca-instagram", label: "Instagram", value: "@acaoficial", kind: "social" },
      { id: "aca-meta", label: "Meta Ads", value: "Cuenta publicitaria activa", kind: "platform" },
      { id: "aca-google", label: "Google Ads", value: "Campañas always-on", kind: "platform" },
    ],
    business: {
      definition: "Organización de servicios y beneficios para socios con cobertura nacional.",
      units: ["Socios", "Movilidad", "Turismo", "Servicios"],
      audiences: ["Socios actuales", "Potenciales socios +30", "Familias y viajeros"],
      offer: "Beneficios, asistencia y servicios integrados para acompañar la movilidad cotidiana.",
      catalogState: "Brochure institucional cargado · actualización pendiente",
      tiendaNubeState: "No aplica a esta cuenta",
    },
    competitors: [
      { name: "Club La Nación", positioning: "Beneficios y experiencias", channels: "Web · Email · Redes", lastScan: "3 nov", state: "Monitoreada" },
      { name: "YPF Serviclub", positioning: "Puntos y beneficios de movilidad", channels: "App · Web · Redes", lastScan: "3 nov", state: "Monitoreada" },
      { name: "Shell Box", positioning: "Beneficios transaccionales", channels: "App · Pauta · Redes", lastScan: "Pendiente", state: "Nueva" },
    ],
    reports: [
      { id: "ACA-R1", label: "Pulso operativo de campañas", period: "Semana 44", type: "Semanal", state: "Listo" },
      { id: "ACA-R2", label: "Devolución de performance y contenidos", period: "Octubre 2026", type: "Mensual", state: "En preparación" },
    ],
    documents: [
      { id: "ACA-D1", name: "Discovery ACA 2026", type: "Documento", updated: "22 oct", source: "Drive" },
      { id: "ACA-D2", name: "Resumen reunión campaña socios", type: "Reunión", updated: "3 nov", source: "Google Meet" },
    ],
    attention: [
      { id: "ACA-A1", title: "Reporte mensual próximo a vencer", detail: "Debe quedar validado antes del envío del 4 de noviembre.", tone: "warning", serviceId: "publicidad-digital" },
      { id: "ACA-A2", title: "Falta confirmar la grilla de contenidos", detail: "Hay piezas esperando definición del eje comercial.", tone: "info", serviceId: "contenidos" },
    ],
    insights: [
      { id: "ACA-I1", serviceId: "publicidad-digital", title: "Separar campañas por intención", detail: "El cruce de resultados sugiere diferenciar búsquedas de beneficios, asistencia y turismo para evitar competencia interna.", source: "Resultados de campañas" },
      { id: "ACA-I2", serviceId: "contenidos", title: "Transformar consultas frecuentes en contenidos", detail: "Las preguntas de socios pueden convertirse en una serie de piezas explicativas con acceso directo al beneficio.", source: "Discovery y reuniones" },
    ],
  },
  edinovo: {
    active: true,
    assignedTo: ["Lucía Benítez", "Tomás Aguirre"],
    billingStatus: "Pendiente",
    marginPercent: 24,
    channels: [
      { id: "edinovo-web", label: "Sitio web", value: "Sitio institucional", kind: "web" },
      { id: "edinovo-instagram", label: "Instagram", value: "Canal educativo", kind: "social" },
      { id: "edinovo-youtube", label: "YouTube", value: "Serie educativa", kind: "platform" },
    ],
    business: {
      definition: "Propuesta educativa enfocada en formación y contenidos especializados.",
      units: ["Cursos", "Programas", "Contenidos educativos"],
      audiences: ["Profesionales", "Estudiantes", "Instituciones"],
      offer: "Formación aplicable con especialistas y formatos digitales.",
      catalogState: "Oferta académica cargada parcialmente",
      tiendaNubeState: "Integración no configurada",
    },
    competitors: [
      { name: "Platzi", positioning: "Educación digital por suscripción", channels: "Web · YouTube · Pauta", lastScan: "29 oct", state: "Monitoreada" },
      { name: "Coderhouse", positioning: "Cursos en vivo y carreras", channels: "Web · Redes · Pauta", lastScan: "29 oct", state: "Monitoreada" },
    ],
    reports: [
      { id: "EDI-R1", label: "Estado de producción audiovisual", period: "Semana 44", type: "Semanal", state: "Pendiente" },
      { id: "EDI-R2", label: "Aprendizajes de contenidos", period: "Octubre 2026", type: "Mensual", state: "En preparación" },
    ],
    documents: [
      { id: "EDI-D1", name: "Guiones serie educativa v2", type: "Guiones", updated: "28 oct", source: "Drive" },
      { id: "EDI-D2", name: "Resumen de comité editorial", type: "Reunión", updated: "29 oct", source: "Google Meet" },
    ],
    attention: [
      { id: "EDI-A1", title: "Aprobación de guiones vencida", detail: "La grabación continúa bloqueada y ya fue reprogramada.", tone: "error", serviceId: "audiovisuales" },
      { id: "EDI-A2", title: "Definir plan alternativo de contenidos", detail: "Conviene sostener frecuencia mientras se destraba la serie principal.", tone: "warning", serviceId: "contenidos" },
    ],
    insights: [
      { id: "EDI-I1", serviceId: "contenidos", title: "Reutilizar episodios como cápsulas", detail: "Cada episodio puede generar piezas cortas, carruseles y clips para sostener frecuencia entre lanzamientos.", source: "Plan de contenidos" },
      { id: "EDI-I2", serviceId: "audiovisuales", title: "Validación de guiones por bloques", detail: "Aprobar episodios en tandas de dos reduce el riesgo de volver a postergar toda la producción.", source: "Historial de aprobaciones" },
    ],
  },
  epsa: {
    active: true,
    assignedTo: ["Nicolás Okro", "Valentina Ríos", "Martín Ledesma", "Lucía Benítez"],
    billingStatus: "Al día",
    marginPercent: 42,
    channels: [
      { id: "epsa-web", label: "Sitio web", value: "Web corporativa", kind: "web" },
      { id: "epsa-linkedin", label: "LinkedIn", value: "Canal B2B", kind: "social" },
      { id: "epsa-meta", label: "Meta Ads", value: "Lanzamiento Line Up", kind: "platform" },
      { id: "epsa-crm", label: "CRM", value: "Seguimiento comercial", kind: "platform" },
    ],
    business: {
      definition: "Empresa B2B con unidades industriales y una línea de producto en etapa de lanzamiento.",
      units: ["EPSA", "Line Up", "Servicios posventa"],
      audiences: ["Empresas", "Responsables de compras", "Dirección comercial"],
      offer: "Soluciones técnicas con acompañamiento comercial y posventa.",
      catalogState: "Catálogo Line Up cargado · fichas técnicas disponibles",
      tiendaNubeState: "No aplica a la operación actual",
    },
    competitors: [
      { name: "Competidor A", positioning: "Precio y disponibilidad", channels: "Web · LinkedIn · Google", lastScan: "2 nov", state: "Monitoreada" },
      { name: "Competidor B", positioning: "Asesoramiento técnico", channels: "Web · YouTube · Meta", lastScan: "2 nov", state: "Monitoreada" },
      { name: "Nueva marca regional", positioning: "Entrega rápida", channels: "Marketplace · Redes", lastScan: "Pendiente", state: "Nueva" },
    ],
    reports: [
      { id: "EPSA-R1", label: "Pulso del lanzamiento Line Up", period: "Semana 44", type: "Semanal", state: "En preparación" },
      { id: "EPSA-R2", label: "Devolución ejecutiva de cuenta", period: "Octubre 2026", type: "Mensual", state: "Pendiente" },
      { id: "EPSA-R3", label: "Insights competitivos", period: "1–15 noviembre", type: "Quincenal", state: "En preparación" },
    ],
    documents: [
      { id: "EPSA-D1", name: "Discovery EPSA / Line Up", type: "Discovery", updated: "22 oct", source: "Drive" },
      { id: "EPSA-D2", name: "Catálogo Line Up", type: "Catálogo", updated: "25 oct", source: "Drive" },
      { id: "EPSA-D3", name: "Resumen comité de marketing", type: "Reunión", updated: "3 nov", source: "Google Meet" },
    ],
    attention: [
      { id: "EPSA-A1", title: "Key visual esperando aprobación", detail: "Bloquea los copys y parte de la producción de lanzamiento.", tone: "error", serviceId: "contenidos" },
      { id: "EPSA-A2", title: "Plan de pauta incompleto", detail: "Falta cerrar la distribución final de presupuesto antes del comité.", tone: "warning", serviceId: "publicidad-digital" },
      { id: "EPSA-A3", title: "Benchmark con oportunidad de posventa", detail: "El diferencial aparece poco trabajado por las marcas analizadas.", tone: "info", serviceId: "estrategia" },
    ],
    insights: [
      { id: "EPSA-I1", serviceId: "publicidad-digital", title: "Campaña de posventa como diferencial", detail: "Ningún competidor comunica el servicio posventa con claridad; puede convertirse en un eje de captación B2B.", source: "Benchmark competitivo" },
      { id: "EPSA-I2", serviceId: "contenidos", title: "Serie de demostraciones cortas", detail: "Las piezas de producto con demostración directa pueden acompañar la pauta y nutrir a ventas.", source: "Plan de marketing" },
      { id: "EPSA-I3", serviceId: "estrategia", title: "Ordenar aprobación por comité", detail: "Definir una única instancia de consolidación evita feedback contradictorio entre Marketing y Dirección Comercial.", source: "Resúmenes de reuniones" },
    ],
  },
  "grupo-portland": {
    active: true,
    assignedTo: ["Nicolás Okro", "Julián Paz", "Valentina Ríos"],
    billingStatus: "Al día",
    marginPercent: 31,
    channels: [
      { id: "portland-web", label: "Sitio web", value: "Nuevo sitio en staging", kind: "web" },
      { id: "portland-linkedin", label: "LinkedIn", value: "Canal institucional", kind: "social" },
      { id: "portland-drive", label: "Repositorio", value: "Contenidos institucionales", kind: "platform" },
    ],
    business: {
      definition: "Grupo de empresas con comunicación corporativa y distintas unidades de negocio.",
      units: ["Corporativo", "Unidades operativas", "Servicios"],
      audiences: ["Clientes corporativos", "Proveedores", "Talento"],
      offer: "Capacidad operativa integrada y experiencia sectorial.",
      catalogState: "Presentación institucional cargada",
      tiendaNubeState: "No aplica",
    },
    competitors: [
      { name: "Grupo regional A", positioning: "Cobertura y escala", channels: "Web · LinkedIn", lastScan: "30 oct", state: "Monitoreada" },
      { name: "Grupo regional B", positioning: "Especialización técnica", channels: "Web · Prensa", lastScan: "30 oct", state: "Monitoreada" },
    ],
    reports: [
      { id: "POR-R1", label: "Estado del proyecto web", period: "Semana 44", type: "Semanal", state: "Listo" },
      { id: "POR-R2", label: "Devolución de avance", period: "Octubre 2026", type: "Mensual", state: "Listo" },
    ],
    documents: [
      { id: "POR-D1", name: "Arquitectura de contenidos", type: "Documento", updated: "27 oct", source: "Drive" },
      { id: "POR-D2", name: "Resumen reunión de avance", type: "Reunión", updated: "5 nov", source: "Google Meet" },
    ],
    attention: [
      { id: "POR-A1", title: "Faltan textos institucionales", detail: "El sitio puede avanzar a staging, pero no completar la revisión final.", tone: "warning", serviceId: "desarrollo-web" },
      { id: "POR-A2", title: "Validar arquitectura antes de cargar", detail: "Cerrar la estructura evita retrabajo cuando lleguen los contenidos definitivos.", tone: "info", serviceId: "estrategia" },
    ],
    insights: [
      { id: "POR-I1", serviceId: "desarrollo-web", title: "Publicar staging con contenido marcado", detail: "Permite validar estructura y responsive sin esperar el cierre de todos los textos.", source: "Estado del proyecto" },
      { id: "POR-I2", serviceId: "estrategia", title: "Guía de contenidos por unidad", detail: "Una plantilla por unidad puede acelerar la entrega del cliente y mejorar consistencia.", source: "Discovery" },
    ],
  },
  "lider-energy": {
    active: true,
    assignedTo: ["Martín Ledesma", "Julián Paz"],
    billingStatus: "Al día",
    marginPercent: 28,
    channels: [
      { id: "lider-web", label: "Sitio web", value: "Formularios de captación", kind: "web" },
      { id: "lider-linkedin", label: "LinkedIn", value: "Canal B2B", kind: "social" },
      { id: "lider-google", label: "Google Ads", value: "Cuenta en preparación", kind: "platform" },
      { id: "lider-crm", label: "CRM", value: "Implementación inicial", kind: "platform" },
    ],
    business: {
      definition: "Empresa de soluciones energéticas con proceso comercial B2B.",
      units: ["Soluciones energéticas", "Servicios", "Proyectos"],
      audiences: ["Industria", "Empresas", "Responsables de energía"],
      offer: "Soluciones técnicas orientadas a eficiencia, continuidad y acompañamiento comercial.",
      catalogState: "Presentación comercial cargada",
      tiendaNubeState: "No aplica",
    },
    competitors: [
      { name: "Proveedor energético A", positioning: "Eficiencia y ahorro", channels: "Web · LinkedIn · Google", lastScan: "Pendiente", state: "Revisar" },
      { name: "Integrador B", positioning: "Implementación llave en mano", channels: "Web · Casos", lastScan: "Pendiente", state: "Nueva" },
    ],
    reports: [
      { id: "LID-R1", label: "Estado de onboarding", period: "Semana 44", type: "Semanal", state: "En preparación" },
      { id: "LID-R2", label: "Primer reporte integrado", period: "Noviembre 2026", type: "Mensual", state: "Pendiente" },
    ],
    documents: [
      { id: "LID-D1", name: "Propuesta de implementación CRM", type: "Propuesta", updated: "30 oct", source: "Drive" },
      { id: "LID-D2", name: "Mapa comercial inicial", type: "Discovery", updated: "1 nov", source: "Relevamiento" },
    ],
    attention: [
      { id: "LID-A1", title: "Definir etapas del embudo", detail: "La integración de formularios depende de la validación del proceso comercial.", tone: "warning", serviceId: "crm" },
      { id: "LID-A2", title: "Alinear UTMs antes de lanzar pauta", detail: "La medición debe quedar resuelta antes de activar campañas.", tone: "info", serviceId: "publicidad-digital" },
    ],
    insights: [
      { id: "LID-I1", serviceId: "crm", title: "Empezar por un embudo mínimo validado", detail: "Configurar menos etapas y validarlas con casos reales reduce retrabajo durante el onboarding.", source: "Discovery comercial" },
      { id: "LID-I2", serviceId: "publicidad-digital", title: "Unificar UTMs con el CRM", detail: "La convención debe definirse antes de pautar para conservar la atribución punta a punta.", source: "Plan de medición" },
    ],
  },
};

const scopeOverrides: Record<string, Partial<Record<ServiceId, Pick<ServiceScope, "compliance" | "alert">>>> = {
  aca: {
    "publicidad-digital": { compliance: "Cumplido" },
    contenidos: { compliance: "Atención", alert: "La grilla del período tiene una definición comercial pendiente." },
  },
  edinovo: {
    contenidos: { compliance: "Atención", alert: "La frecuencia prevista corre riesgo por la demora audiovisual." },
    audiovisuales: { compliance: "Atención", alert: "La aprobación de guiones está fuera del plazo acordado." },
  },
  epsa: {
    estrategia: { compliance: "Cumplido" },
    "publicidad-digital": { compliance: "Atención", alert: "El plan final de pauta todavía no está cerrado." },
    contenidos: { compliance: "Atención", alert: "El key visual bloquea piezas comprometidas." },
  },
  "grupo-portland": {
    estrategia: { compliance: "Cumplido" },
    "desarrollo-web": { compliance: "Atención", alert: "El alcance depende de contenidos que debe entregar el cliente." },
  },
  "lider-energy": {
    "publicidad-digital": { compliance: "Pendiente", alert: "La pauta se activa después de cerrar medición y CRM." },
    crm: { compliance: "Atención", alert: "Falta validar las etapas del proceso comercial." },
  },
};

const projectService: Record<string, ServiceId> = {
  "lanzamiento-line-up-2027": "publicidad-digital",
  "contenidos-always-on-q4": "contenidos",
  "benchmark-competitivo-2026": "estrategia",
  "serie-educativa-2026": "audiovisuales",
  "contenidos-institucionales": "contenidos",
  "performance-always-on": "publicidad-digital",
  "grilla-de-contenidos-aca": "contenidos",
  "sitio-web-corporativo": "desarrollo-web",
  "onboarding-crm": "crm",
};

const taskServiceOverrides: Record<string, ServiceId> = {
  "T-140": "estrategia",
  "T-141": "estrategia",
  "T-142": "contenidos",
  "T-143": "publicidad-digital",
  "T-144": "contenidos",
  "T-145": "desarrollo-web",
  "T-146": "publicidad-digital",
  "T-147": "contenidos",
  "T-149": "estrategia",
  "T-201": "contenidos",
  "T-202": "contenidos",
  "T-203": "audiovisuales",
  "T-301": "desarrollo-web",
  "T-302": "desarrollo-web",
  "T-303": "desarrollo-web",
  "T-401": "publicidad-digital",
  "T-402": "publicidad-digital",
  "T-501": "crm",
};

const archivedTaskIds = new Set(["T-140"]);
const operativeServiceAccess = new Set<ServiceId>(["estrategia", "contenidos", "publicidad-digital"]);

export function directorMeta(clientSlug: string) {
  return metaByClient[clientSlug];
}

export function isAssignedClient(clientSlug: string, userName = CURRENT_USER.name) {
  return Boolean(metaByClient[clientSlug]?.assignedTo.includes(userName));
}

export function assignedClients(userName = CURRENT_USER.name) {
  return osClients.filter((client) => isAssignedClient(client.slug, userName));
}

export function isActiveClient(client: OsClient) {
  return Boolean(metaByClient[client.slug]?.active) && client.status !== "pausado";
}

export function canViewFinancials(role: "admin" | "operativo") {
  return role === "admin";
}

export function canManageClient(role: "admin" | "operativo", clientSlug: string) {
  return role === "admin" || isAssignedClient(clientSlug);
}

export function canEditService(role: "admin" | "operativo", clientSlug: string, serviceId: ServiceId) {
  if (role === "admin") return true;
  return isAssignedClient(clientSlug) && operativeServiceAccess.has(serviceId);
}

export function scopeForClient(client: OsClient): ServiceScope[] {
  return client.services.map((serviceId) => {
    const base = DEFAULT_SCOPE[serviceId];
    const override = scopeOverrides[client.slug]?.[serviceId];
    return {
      serviceId,
      ...base,
      compliance: override?.compliance ?? "Pendiente",
      alert: override?.alert,
    };
  });
}

export function serviceForProject(projectSlug: string): ServiceId {
  return projectService[projectSlug] ?? "estrategia";
}

export function serviceForTask(task: Pick<OsTask, "id" | "projectSlug">): ServiceId {
  return taskServiceOverrides[task.id] ?? serviceForProject(task.projectSlug);
}

export function taskOwnerRole(task: Pick<OsTask, "owner">) {
  return people.find((person) => person.name === task.owner)?.role ?? "Rol sin definir";
}

export function clientOfTask(task: Pick<OsTask, "projectSlug">) {
  const project = osProjects.find((item) => item.slug === task.projectSlug);
  return project ? osClients.find((client) => client.slug === project.clientSlug) : undefined;
}

export function tasksForClient(tasks: OsTask[], clientSlug: string) {
  const projectSlugs = new Set(osProjects.filter((project) => project.clientSlug === clientSlug).map((project) => project.slug));
  return tasks.filter((task) => projectSlugs.has(task.projectSlug));
}

export function isArchivedTask(task: OsTask) {
  return archivedTaskIds.has(task.id);
}

export function serviceSummary(clientSlug: string, serviceId: ServiceId, tasks: OsTask[]) {
  const own = tasksForClient(tasks, clientSlug).filter((task) => serviceForTask(task) === serviceId && !isArchivedTask(task));
  const open = own.filter((task) => task.status !== "Hecho");
  const blocked = open.filter((task) => task.blocked).length;
  const approvals = open.filter((task) => task.status === "En aprobación").length;
  const next = open.find((task) => task.dueKind === "late") ?? open.find((task) => task.dueKind === "today") ?? open[0];
  return {
    serviceId,
    label: serviceLabel(serviceId),
    open: open.length,
    blocked,
    approvals,
    nextAction: next ? `${next.id} · ${next.title}` : "Sin acciones pendientes",
    state: blocked ? "Atención" : approvals ? "Revisión" : open.length ? "En curso" : "Al día",
  } as const;
}

export function clientAttention(clientSlug: string, tasks: OsTask[]) {
  const meta = metaByClient[clientSlug];
  const taskAlerts: ClientAttentionItem[] = tasksForClient(tasks, clientSlug)
    .filter((task) => task.blocked && task.status !== "Hecho" && !isArchivedTask(task))
    .slice(0, 3)
    .map((task) => ({
      id: `TASK-${task.id}`,
      title: `${task.id} · ${task.title}`,
      detail: task.blocked ?? "Tarea bloqueada",
      tone: "error" as const,
      serviceId: serviceForTask(task),
    }));
  return [...taskAlerts, ...(meta?.attention ?? [])].slice(0, 6);
}

export function projectServiceLabel(projectSlug: string) {
  return serviceLabel(serviceForProject(projectSlug));
}
