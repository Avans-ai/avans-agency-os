export type ArchitectureMetric = {
  label: string;
  value: string;
  detail: string;
};

export type ArchitectureModule = {
  title: string;
  meta: string;
  description: string;
  href?: string;
  status: "Disponible" | "En diseño" | "Siguiente etapa";
};

export type ArchitectureArea = {
  slug: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  objective: string;
  metrics: ArchitectureMetric[];
  modules: ArchitectureModule[];
  principles: string[];
  outputs: string[];
};

export const dashboardAreas = [
  {
    number: "01",
    label: "Clientes",
    href: "/v2/clientes",
    summary: "Conocimiento, documentos, proyectos, decisiones, reuniones e historial de cada cuenta en un solo lugar.",
  },
  {
    number: "02",
    label: "Operaciones",
    href: "/v2/operaciones",
    summary: "Procesos, proyectos, producción, reuniones, bloqueos, responsables y capacidad operativa.",
  },
  {
    number: "03",
    label: "Ventas",
    href: "/v2/ventas",
    summary: "Leads, discovery, oportunidades, propuestas, seguimientos y conversión a cliente.",
  },
  {
    number: "04",
    label: "Finanzas",
    href: "/v2/finanzas",
    summary: "Facturación, cobranzas, ingresos, gastos, costos y rentabilidad por cliente o proyecto.",
  },
  {
    number: "05",
    label: "RRHH",
    href: "/v2/rrhh",
    summary: "Equipo, roles, disponibilidad, asignaciones, ausencias y capacidad de cada área.",
  },
  {
    number: "06",
    label: "Gerencia",
    href: "/v2/gerencia",
    summary: "Indicadores transversales, alertas, riesgos, rentabilidad y decisiones prioritarias.",
  },
] as const;

export const architectureAreas: Record<string, ArchitectureArea> = {
  operaciones: {
    slug: "operaciones",
    label: "Operaciones",
    eyebrow: "ÁREA 02 · CENTRALIZACIÓN OPERATIVA",
    title: "Operaciones",
    description: "El lugar desde donde Avans organiza la ejecución diaria sin adaptar su forma de trabajo a un tablero genérico.",
    objective: "Centralizar procesos, responsables, fechas, entregables, bloqueos y aprobaciones en una única capa operativa.",
    metrics: [
      { label: "Proyectos activos", value: "12", detail: "En seguimiento" },
      { label: "Bloqueos", value: "2", detail: "Requieren intervención" },
      { label: "Capacidad", value: "78%", detail: "Promedio del equipo" },
    ],
    modules: [
      { title: "Procesos", meta: "Cómo trabaja Avans", description: "Eventos, reglas, responsables, precondiciones y automatizaciones modeladas a medida.", href: "/v2/procesos", status: "Disponible" },
      { title: "Proyectos", meta: "Ejecución", description: "Hitos, tareas, responsables, dependencias, fechas y riesgo operativo.", href: "/v2/proyectos", status: "Disponible" },
      { title: "Reuniones", meta: "Decisiones y compromisos", description: "Convierte conversaciones en decisiones, pendientes y actualizaciones de contexto.", href: "/v2/reuniones", status: "Disponible" },
      { title: "Contenido", meta: "Producción", description: "Planificación, generación, revisión, versiones y aprobación por cliente.", href: "/v2/contenido", status: "Disponible" },
      { title: "Campañas", meta: "Activación", description: "Ejecución, alertas, performance y decisiones con trazabilidad.", href: "/v2/campanas", status: "Disponible" },
      { title: "Bandeja operativa", meta: "Excepciones", description: "Aprobaciones, alertas, bloqueos y decisiones que requieren intervención humana.", href: "/v2/inbox", status: "Disponible" },
    ],
    principles: ["El proceso define la interfaz", "Una fuente de verdad", "Responsables y fechas visibles", "Aprobación en puntos sensibles"],
    outputs: ["Estado operativo", "Próximas acciones", "Bloqueos", "Capacidad", "Historial de decisiones"],
  },
  ventas: {
    slug: "ventas",
    label: "Ventas",
    eyebrow: "ÁREA 03 · DESARROLLO COMERCIAL",
    title: "Ventas",
    description: "Un flujo comercial conectado desde el primer contacto hasta el alta del cliente y el inicio de la operación.",
    objective: "Evitar seguimientos dispersos y convertir cada oportunidad en un proceso comercial medible y trazable.",
    metrics: [
      { label: "Pipeline", value: "18", detail: "Oportunidades abiertas" },
      { label: "Propuestas", value: "6", detail: "2 esperan validación" },
      { label: "Conversión", value: "31%", detail: "Período actual" },
    ],
    modules: [
      { title: "Leads", meta: "Captación", description: "Origen, clasificación, fit, prioridad y siguiente acción comercial.", href: "/v2/leads", status: "Disponible" },
      { title: "Discovery", meta: "Diagnóstico", description: "Problemas, riesgos, oportunidades y preguntas pendientes estructuradas.", href: "/v2/discovery", status: "Disponible" },
      { title: "Oportunidades", meta: "Priorización", description: "Señales comerciales y de crecimiento ordenadas por impacto y probabilidad.", href: "/v2/oportunidades", status: "Disponible" },
      { title: "Propuestas", meta: "Conversión", description: "Alcance, etapas, entregables, inversión y versiones conectadas al diagnóstico.", href: "/v2/propuestas", status: "Disponible" },
      { title: "Alta de cliente", meta: "Handoff", description: "Convierte una propuesta aprobada en cliente, proyecto, responsables y próximos pasos.", href: "/v2/clientes", status: "Siguiente etapa" },
    ],
    principles: ["Una oportunidad, un historial", "No repetir información", "Seguimiento con próxima acción", "Handoff sin pérdida de contexto"],
    outputs: ["Pipeline", "Forecast", "Tasa de cierre", "Tiempo de conversión", "Valor de oportunidades"],
  },
  finanzas: {
    slug: "finanzas",
    label: "Finanzas",
    eyebrow: "ÁREA 04 · CONTROL ECONÓMICO",
    title: "Finanzas",
    description: "Una capa de gestión para entender ingresos, costos, cobranzas y rentabilidad sin reemplazar obligatoriamente al sistema contable.",
    objective: "Relacionar la información financiera con clientes, proyectos, servicios y capacidad operativa.",
    metrics: [
      { label: "Facturación", value: "$ —", detail: "A conectar" },
      { label: "Cobranzas", value: "—", detail: "Vencimientos y estado" },
      { label: "Margen", value: "—", detail: "Por cliente y proyecto" },
    ],
    modules: [
      { title: "Facturación", meta: "Ingresos", description: "Comprobantes, períodos, clientes, servicios y estado de emisión.", status: "En diseño" },
      { title: "Cobranzas", meta: "Seguimiento", description: "Vencimientos, pagos, saldos, alertas y responsables.", status: "En diseño" },
      { title: "Ingresos y gastos", meta: "Flujo", description: "Movimientos operativos vinculados a áreas, clientes y proyectos.", status: "En diseño" },
      { title: "Rentabilidad", meta: "Decisión", description: "Margen por cliente, servicio, proyecto y período.", status: "En diseño" },
      { title: "Costos tecnológicos", meta: "Infraestructura", description: "Hosting, bases, IA, integraciones y consumos variables por cuenta.", status: "Siguiente etapa" },
    ],
    principles: ["Integrar antes que reemplazar", "Datos vinculados a la operación", "Permisos restringidos", "Trazabilidad de cambios"],
    outputs: ["Facturación", "Cobranzas", "Flujo", "Rentabilidad", "Costos por cliente"],
  },
  rrhh: {
    slug: "rrhh",
    label: "RRHH",
    eyebrow: "ÁREA 05 · PERSONAS Y CAPACIDAD",
    title: "RRHH",
    description: "Una visión operativa del equipo para distribuir trabajo, anticipar saturación y organizar disponibilidad.",
    objective: "Conectar personas, roles, habilidades, asignaciones y capacidad con la planificación real de la agencia.",
    metrics: [
      { label: "Equipo", value: "—", detail: "Usuarios activos" },
      { label: "Capacidad", value: "—", detail: "Por área y persona" },
      { label: "Ausencias", value: "—", detail: "Próximos 30 días" },
    ],
    modules: [
      { title: "Equipo y roles", meta: "Estructura", description: "Personas, áreas, responsabilidades y niveles de acceso.", href: "/v2/usuarios", status: "En diseño" },
      { title: "Disponibilidad", meta: "Capacidad", description: "Carga actual, horas disponibles y saturación por persona o área.", status: "En diseño" },
      { title: "Asignaciones", meta: "Operación", description: "Relación entre personas, clientes, proyectos y tareas.", status: "En diseño" },
      { title: "Ausencias", meta: "Planificación", description: "Vacaciones, licencias y cobertura operativa.", status: "Siguiente etapa" },
      { title: "Indicadores de equipo", meta: "Gerencia", description: "Capacidad, distribución, tiempos y cuellos de botella.", status: "Siguiente etapa" },
    ],
    principles: ["Acceso según rol", "Capacidad visible", "Datos sensibles restringidos", "Planificación antes de asignar"],
    outputs: ["Disponibilidad", "Carga", "Asignaciones", "Ausencias", "Necesidades de capacidad"],
  },
  gerencia: {
    slug: "gerencia",
    label: "Gerencia",
    eyebrow: "ÁREA 06 · VISIÓN TRANSVERSAL",
    title: "Gerencia",
    description: "Una vista consolidada para entender qué está pasando, qué necesita atención y dónde tomar decisiones.",
    objective: "Convertir la actividad de todas las áreas en indicadores, alertas y prioridades ejecutivas.",
    metrics: [
      { label: "Alertas", value: "7", detail: "3 de alta prioridad" },
      { label: "Áreas", value: "5", detail: "Estado consolidado" },
      { label: "Indicadores", value: "24", detail: "Operativos y comerciales" },
    ],
    modules: [
      { title: "Indicadores", meta: "KPIs", description: "Operación, ventas, finanzas, clientes y equipo en una única vista.", href: "/v2/reportes", status: "Disponible" },
      { title: "Insights", meta: "Análisis", description: "Señales explicables con fuente, contexto y recomendación.", href: "/v2/insights", status: "Disponible" },
      { title: "Aprendizajes", meta: "Memoria", description: "Patrones, feedback y resultados convertidos en conocimiento validado.", href: "/v2/aprendizajes", status: "Disponible" },
      { title: "Oportunidades", meta: "Crecimiento", description: "Oportunidades comerciales, operativas y estratégicas priorizadas.", href: "/v2/oportunidades", status: "Disponible" },
      { title: "Command Center", meta: "Prioridades", description: "Excepciones, bloqueos, decisiones y próximos pasos de toda la agencia.", href: "/v2", status: "Disponible" },
    ],
    principles: ["Una lectura ejecutiva", "Indicadores con origen", "Prioridad antes que volumen", "Decisiones trazables"],
    outputs: ["KPIs", "Alertas", "Riesgos", "Rentabilidad", "Prioridades ejecutivas"],
  },
  usuarios: {
    slug: "usuarios",
    label: "Usuarios y roles",
    eyebrow: "PLATAFORMA · ACCESO Y PERMISOS",
    title: "Usuarios, roles y niveles",
    description: "Acceso privado con Google Workspace y permisos definidos según área, rol y acción.",
    objective: "Permitir el ingreso únicamente a cuentas autorizadas de @avans.agency y limitar cada acción al mínimo permiso necesario.",
    metrics: [
      { label: "Dominio", value: "@avans.agency", detail: "Único dominio habilitado" },
      { label: "Roles", value: "5", detail: "Base inicial" },
      { label: "Registro público", value: "OFF", detail: "Sólo invitación" },
    ],
    modules: [
      { title: "Login con Google", meta: "Autenticación", description: "Ingreso mediante Google Workspace sin registro público.", status: "En diseño" },
      { title: "Roles", meta: "Nivel", description: "Administrador, Gerencia, Líder de área, Equipo y Finanzas/Administración.", status: "En diseño" },
      { title: "Permisos", meta: "Acciones", description: "Ver, crear, editar, aprobar, eliminar y administrar por módulo.", status: "En diseño" },
      { title: "Auditoría de acceso", meta: "Trazabilidad", description: "Sesiones, cambios de permisos y acciones sensibles registradas.", href: "/v2/auditoria", status: "Siguiente etapa" },
    ],
    principles: ["Sin registro público", "Mínimo privilegio", "Permisos por acción", "Acciones sensibles auditadas"],
    outputs: ["Usuarios activos", "Roles", "Permisos", "Sesiones", "Historial de cambios"],
  },
  automatizaciones: {
    slug: "automatizaciones",
    label: "Automatizaciones e IA",
    eyebrow: "PLATAFORMA · EJECUCIÓN ASISTIDA",
    title: "Automatizaciones e IA",
    description: "Las capacidades existentes se organizan como una capa transversal que asiste a todas las áreas del sistema.",
    objective: "Automatizar lo determinístico, utilizar agentes donde hace falta criterio y conservar aprobación humana en acciones sensibles.",
    metrics: [
      { label: "Procesos", value: "18", detail: "Activos en demo" },
      { label: "Acciones", value: "42", detail: "Automáticas hoy" },
      { label: "Errores críticos", value: "0", detail: "Última ejecución" },
    ],
    modules: [
      { title: "Process Engine", meta: "Reglas", description: "Eventos, condiciones, responsables, salidas y escalamiento.", href: "/v2/procesos", status: "Disponible" },
      { title: "Workflows", meta: "Orquestación", description: "Secuencias de tareas y handoffs entre personas, sistemas e IA.", href: "/v2/workflows", status: "Disponible" },
      { title: "Agentes", meta: "Criterio", description: "Asistentes especializados con herramientas, contexto y límites definidos.", href: "/v2/agentes", status: "Disponible" },
      { title: "Integraciones", meta: "Conectividad", description: "APIs, webhooks y conectores con sistemas existentes.", href: "/v2/integraciones", status: "Disponible" },
      { title: "Aprobaciones", meta: "Control humano", description: "Validación de decisiones o acciones que superan límites definidos.", href: "/v2/inbox", status: "Disponible" },
    ],
    principles: ["Automatización antes que autonomía", "Agentes con objetivo y límites", "Aprobación por impacto", "Toda acción deja registro"],
    outputs: ["Runs", "Aprobaciones", "Errores", "Resultados", "Aprendizajes"],
  },
  seguridad: {
    slug: "seguridad",
    label: "Seguridad",
    eyebrow: "PLATAFORMA · CONTROL Y PROTECCIÓN",
    title: "Seguridad de la plataforma",
    description: "La seguridad forma parte de la arquitectura inicial y no se agrega después del desarrollo.",
    objective: "Proteger accesos, datos, integraciones y acciones mediante identidad corporativa, permisos, auditoría y separación de ambientes.",
    metrics: [
      { label: "Acceso", value: "Google", detail: "Dominio corporativo" },
      { label: "Ambientes", value: "3", detail: "Dev · Staging · Prod" },
      { label: "Acciones sensibles", value: "Auditadas", detail: "Con confirmación" },
    ],
    modules: [
      { title: "Guardrails", meta: "Límites", description: "Reglas, umbrales, aprobaciones y acciones que no pueden ejecutarse automáticamente.", href: "/v2/guardrails", status: "Disponible" },
      { title: "Auditoría", meta: "Registro", description: "Quién hizo qué, cuándo, desde dónde y con qué resultado.", href: "/v2/auditoria", status: "Disponible" },
      { title: "Usuarios y roles", meta: "Acceso", description: "Identidad, permisos y separación de información por responsabilidad.", href: "/v2/usuarios", status: "En diseño" },
      { title: "Integraciones", meta: "Credenciales", description: "Secretos del lado servidor, permisos mínimos y conexiones revocables.", href: "/v2/integraciones", status: "Disponible" },
    ],
    principles: ["Mínimo privilegio", "Secretos sólo en servidor", "Separación de ambientes", "Auditoría de acciones sensibles"],
    outputs: ["Accesos", "Eventos", "Cambios", "Alertas", "Evidencia de auditoría"],
  },
  "salud-sistema": {
    slug: "salud-sistema",
    label: "Salud del sistema",
    eyebrow: "PLATAFORMA · CONTINUIDAD OPERATIVA",
    title: "Backups y salud del sistema",
    description: "Una capa para saber si la plataforma, sus datos y sus integraciones están funcionando correctamente.",
    objective: "Detectar fallas temprano, respaldar información y contar con procedimientos claros de recuperación.",
    metrics: [
      { label: "Aplicación", value: "Operativa", detail: "Último chequeo: ahora" },
      { label: "Backup", value: "Diario", detail: "Base de datos" },
      { label: "Incidentes", value: "0", detail: "Críticos abiertos" },
    ],
    modules: [
      { title: "Estado de aplicación", meta: "Uptime", description: "Disponibilidad, tiempos de respuesta y errores de frontend/backend.", status: "En diseño" },
      { title: "Base de datos", meta: "Datos", description: "Conectividad, errores, capacidad y respaldo diario automático.", status: "En diseño" },
      { title: "Integraciones y APIs", meta: "Conexiones", description: "Autorizaciones vencidas, webhooks fallidos y servicios externos.", status: "En diseño" },
      { title: "Jobs y automatizaciones", meta: "Ejecución", description: "Runs detenidos, reintentos, errores y tiempos fuera de rango.", status: "En diseño" },
      { title: "Backups", meta: "Recuperación", description: "Backups automáticos, copias previas a cambios críticos y estrategia para archivos.", status: "Siguiente etapa" },
    ],
    principles: ["Backup automático diario", "Copia antes de cambios críticos", "Alertas accionables", "Procedimiento de recuperación"],
    outputs: ["Uptime", "Estado de servicios", "Último backup", "Errores", "Incidentes abiertos"],
  },
};
