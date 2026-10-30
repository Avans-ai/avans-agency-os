export type HrSourceStatus = "Disponible" | "Parcial" | "Pendiente";
export type HrCapacityStatus = "Disponible" | "Vigilar" | "Sobrecarga";
export type HrAssignmentStatus = "Estable" | "Revisar" | "Sin cobertura";
export type HrAbsenceStatus = "Cubierta" | "Planificada" | "Requiere cobertura";
export type HrSkillStatus = "Cubierta" | "Concentrada" | "Brecha";

export type HrSource = {
  title: string;
  status: HrSourceStatus;
  detail: string;
  method: string;
  freshness: string;
  href: string;
};

export type HrTeamSeat = {
  id: string;
  seat: string;
  role: string;
  area: string;
  load: number;
  available: number;
  assignments: number;
  focus: string;
  nextMilestone: string;
  status: HrCapacityStatus;
  costCoverage: "Disponible" | "Parcial" | "Pendiente";
};

export type HrAreaCapacity = {
  area: string;
  load: number;
  detail: string;
  trend: "Sube" | "Estable" | "Baja";
  status: HrCapacityStatus;
};

export type HrAssignment = {
  id: string;
  client: string;
  workstream: string;
  team: string;
  plannedLoad: number;
  nextMilestone: string;
  risk: string;
  status: HrAssignmentStatus;
  href: string;
};

export type HrAbsence = {
  id: string;
  seat: string;
  period: string;
  type: string;
  affected: string;
  coverage: string;
  action: string;
  status: HrAbsenceStatus;
};

export type HrSkillCoverage = {
  capability: string;
  level: string;
  coverage: string;
  dependency: string;
  action: string;
  status: HrSkillStatus;
};

export const hrDemoPeriod = "Octubre 2026";

export const hrSources: HrSource[] = [
  {
    title: "Usuarios de Avans OS",
    status: "Disponible",
    detail: "Identidad, cuenta corporativa, área y estado de acceso.",
    method: "Dato nativo de la plataforma",
    freshness: "Continua",
    href: "/v2/usuarios",
  },
  {
    title: "Asignaciones operativas",
    status: "Disponible",
    detail: "Relación entre personas, clientes, proyectos, tareas y responsables.",
    method: "Operaciones + Cliente 360°",
    freshness: "Continua",
    href: "/v2/operaciones",
  },
  {
    title: "Calendarios y ausencias",
    status: "Parcial",
    detail: "Vacaciones, licencias, jornadas reducidas y cobertura prevista.",
    method: "Carga demo; integración con calendario pendiente",
    freshness: "Semanal",
    href: "/v2/integraciones",
  },
  {
    title: "Horas o esfuerzo real",
    status: "Pendiente",
    detail: "Tiempo o unidad de esfuerzo validada por cliente, proyecto y entregable.",
    method: "A definir: horas, bloques o unidades de trabajo",
    freshness: "Pendiente de decisión",
    href: "/v2/operaciones",
  },
  {
    title: "Bandas de costo interno",
    status: "Pendiente",
    detail: "Costo interno utilizable por Finanzas sin exponer remuneraciones individuales.",
    method: "Administración / Finanzas con permisos restringidos",
    freshness: "Mensual",
    href: "/v2/finanzas",
  },
  {
    title: "Habilidades y cobertura",
    status: "Parcial",
    detail: "Capacidades críticas, nivel de cobertura y dependencia de perfiles clave.",
    method: "Matriz inicial a validar por líderes de área",
    freshness: "Trimestral + cambios",
    href: "/v2/rrhh",
  },
];

export const hrTeamSeats: HrTeamSeat[] = [
  {
    id: "seat-cuentas-01",
    seat: "Cuenta 01",
    role: "Liderazgo de Cuentas",
    area: "Cuentas",
    load: 84,
    available: 16,
    assignments: 3,
    focus: "Clientes en atención y próximos hitos",
    nextMilestone: "Resolver cobertura de ACA y Lider Energy",
    status: "Vigilar",
    costCoverage: "Parcial",
  },
  {
    id: "seat-cuentas-02",
    seat: "Cuenta 02",
    role: "Ejecutivo/a de Cuenta",
    area: "Cuentas",
    load: 76,
    available: 24,
    assignments: 2,
    focus: "Seguimiento y coordinación de entregables",
    nextMilestone: "Dejar handoff antes de ausencia planificada",
    status: "Disponible",
    costCoverage: "Parcial",
  },
  {
    id: "seat-estrategia-01",
    seat: "Estrategia 01",
    role: "Estrategia Senior",
    area: "Estrategia",
    load: 89,
    available: 11,
    assignments: 4,
    focus: "Aprobaciones, discovery y benchmark",
    nextMilestone: "Redistribuir dos revisiones de esta semana",
    status: "Sobrecarga",
    costCoverage: "Pendiente",
  },
  {
    id: "seat-contenido-01",
    seat: "Contenido 01",
    role: "Contenido y Marca",
    area: "Contenido",
    load: 74,
    available: 26,
    assignments: 3,
    focus: "Planificación, producción y aprendizaje",
    nextMilestone: "Cerrar ciclo de Edinovo",
    status: "Disponible",
    costCoverage: "Pendiente",
  },
  {
    id: "seat-diseno-01",
    seat: "Diseño 01",
    role: "Diseño",
    area: "Diseño",
    load: 71,
    available: 29,
    assignments: 3,
    focus: "Producción y adaptaciones aprobadas",
    nextMilestone: "Cubrir media jornada planificada",
    status: "Disponible",
    costCoverage: "Pendiente",
  },
  {
    id: "seat-performance-01",
    seat: "Performance 01",
    role: "Performance",
    area: "Performance",
    load: 69,
    available: 31,
    assignments: 2,
    focus: "Campañas, alertas y validaciones",
    nextMilestone: "Reprogramar revisión durante ausencia",
    status: "Disponible",
    costCoverage: "Parcial",
  },
  {
    id: "seat-operaciones-01",
    seat: "Operaciones 01",
    role: "Operaciones y Automatización",
    area: "Operaciones",
    load: 79,
    available: 21,
    assignments: 4,
    focus: "Procesos, integraciones y bloqueos",
    nextMilestone: "Completar precondiciones de onboarding",
    status: "Vigilar",
    costCoverage: "Parcial",
  },
  {
    id: "seat-admin-01",
    seat: "Administración 01",
    role: "Administración y Finanzas",
    area: "Administración",
    load: 63,
    available: 37,
    assignments: 5,
    focus: "Facturación, cobranzas y fuentes",
    nextMilestone: "Definir criterio de bandas de costo",
    status: "Disponible",
    costCoverage: "Disponible",
  },
];

export const hrAreaCapacity: HrAreaCapacity[] = [
  { area: "Cuentas", load: 80, detail: "2 clientes requieren atención", trend: "Sube", status: "Vigilar" },
  { area: "Estrategia", load: 89, detail: "4 frentes y 2 aprobaciones", trend: "Sube", status: "Sobrecarga" },
  { area: "Contenido", load: 74, detail: "3 ciclos activos", trend: "Estable", status: "Disponible" },
  { area: "Diseño", load: 71, detail: "Cobertura de una ausencia breve", trend: "Estable", status: "Disponible" },
  { area: "Performance", load: 69, detail: "1 revisión crítica", trend: "Baja", status: "Disponible" },
  { area: "Operaciones", load: 79, detail: "Onboarding e integraciones", trend: "Sube", status: "Vigilar" },
  { area: "Administración", load: 63, detail: "Capacidad para integración financiera", trend: "Estable", status: "Disponible" },
];

export const hrAssignments: HrAssignment[] = [
  {
    id: "assignment-epsa",
    client: "Epsa",
    workstream: "Operación, campañas y reporting",
    team: "Cuenta 01 · Performance 01 · Contenido 01",
    plannedLoad: 76,
    nextMilestone: "Validar optimización y cerrar ciclo",
    risk: "Revisión de inversión requiere aprobación",
    status: "Revisar",
    href: "/v2/clientes/epsa",
  },
  {
    id: "assignment-aca",
    client: "ACA",
    workstream: "Campaña y contenidos",
    team: "Cuenta 01 · Estrategia 01 · Diseño 01",
    plannedLoad: 83,
    nextMilestone: "Resolver insumo y aprobar pieza",
    risk: "Dependencia de Estrategia y dato pendiente",
    status: "Revisar",
    href: "/v2/clientes/aca",
  },
  {
    id: "assignment-portland",
    client: "Grupo Portland",
    workstream: "Siguiente etapa estratégica",
    team: "Cuenta 02 · Estrategia 01 · Operaciones 01",
    plannedLoad: 68,
    nextMilestone: "Aprobar propuesta y preparar handoff",
    risk: "La aprobación puede aumentar carga la próxima semana",
    status: "Estable",
    href: "/v2/clientes/grupo-portland",
  },
  {
    id: "assignment-edinovo",
    client: "Edinovo",
    workstream: "Contenido y aprendizaje",
    team: "Cuenta 02 · Contenido 01 · Diseño 01",
    plannedLoad: 62,
    nextMilestone: "Validar aprendizajes y planificar ciclo",
    risk: "Sin riesgo de cobertura inmediato",
    status: "Estable",
    href: "/v2/clientes/edinovo",
  },
  {
    id: "assignment-lider",
    client: "Lider Energy",
    workstream: "Onboarding y primera operación",
    team: "Cuenta 01 · Operaciones 01 · Estrategia 01",
    plannedLoad: 85,
    nextMilestone: "Completar responsables, accesos y contexto",
    risk: "Tres perfiles críticos comparten otros hitos",
    status: "Sin cobertura",
    href: "/v2/clientes/lider-energy",
  },
];

export const hrAbsences: HrAbsence[] = [
  {
    id: "absence-cuenta-02",
    seat: "Cuenta 02",
    period: "17–21 oct",
    type: "Vacaciones",
    affected: "Grupo Portland · Edinovo",
    coverage: "Cuenta 01 + Operaciones 01",
    action: "Cerrar handoff y responsables antes del 16/10",
    status: "Planificada",
  },
  {
    id: "absence-diseno-01",
    seat: "Diseño 01",
    period: "22 oct · media jornada",
    type: "Ausencia breve",
    affected: "ACA · Edinovo",
    coverage: "Reprogramación de entregables aprobada",
    action: "Sin acción adicional",
    status: "Cubierta",
  },
  {
    id: "absence-performance-01",
    seat: "Performance 01",
    period: "28 oct",
    type: "Día personal",
    affected: "Epsa",
    coverage: "Sin reemplazo operativo definido",
    action: "Anticipar revisión o asignar respaldo",
    status: "Requiere cobertura",
  },
];

export const hrSkillCoverage: HrSkillCoverage[] = [
  {
    capability: "Gestión de cuentas",
    level: "Crítica",
    coverage: "2 perfiles activos",
    dependency: "Distribuida",
    action: "Documentar handoffs y criterios por cuenta",
    status: "Cubierta",
  },
  {
    capability: "Estrategia y discovery",
    level: "Crítica",
    coverage: "1 perfil principal + apoyo parcial",
    dependency: "Alta concentración",
    action: "Formar respaldo y limitar aprobaciones simultáneas",
    status: "Concentrada",
  },
  {
    capability: "Performance",
    level: "Crítica",
    coverage: "1 perfil principal",
    dependency: "Cobertura puntual",
    action: "Definir protocolo de reemplazo para campañas activas",
    status: "Concentrada",
  },
  {
    capability: "Contenido y marca",
    level: "Alta",
    coverage: "1 perfil + criterios documentados",
    dependency: "Memoria de cliente disponible",
    action: "Mantener lineamientos y aprendizajes actualizados",
    status: "Cubierta",
  },
  {
    capability: "Automatización e integraciones",
    level: "Crítica",
    coverage: "1 perfil principal",
    dependency: "Conocimiento técnico concentrado",
    action: "Documentar runbooks y sumar revisión cruzada",
    status: "Brecha",
  },
  {
    capability: "Administración y costos",
    level: "Alta",
    coverage: "1 perfil",
    dependency: "Fuentes todavía no integradas",
    action: "Definir respaldo y procedimiento mensual",
    status: "Concentrada",
  },
];

export const hrPlatformRoles = [
  {
    title: "Administrador",
    scope: "Configuración completa, usuarios, permisos e integraciones.",
    sensitive: "Puede administrar accesos; no implica acceso automático a remuneraciones.",
  },
  {
    title: "Gerencia",
    scope: "Indicadores, capacidad, riesgos, decisiones y datos consolidados.",
    sensitive: "Costos y margen según permiso explícito.",
  },
  {
    title: "Líder de área",
    scope: "Equipo, asignaciones, capacidad y aprobaciones de su área.",
    sensitive: "Ve bandas o costos sólo cuando la función lo requiere.",
  },
  {
    title: "Equipo",
    scope: "Clientes, proyectos, tareas y documentación asignada.",
    sensitive: "Sin acceso a información económica o personal sensible por defecto.",
  },
  {
    title: "Finanzas / Administración",
    scope: "Facturación, cobranzas, costos, conciliación y fuentes.",
    sensitive: "Acciones sensibles registradas y auditables.",
  },
];

export const hrLifecycleSteps = [
  {
    number: "01",
    title: "Alta corporativa",
    detail: "Invitación con cuenta @avans.agency, identidad verificada y sin registro público.",
  },
  {
    number: "02",
    title: "Rol organizacional",
    detail: "Área, posición, líder, jornada y responsabilidades reales.",
  },
  {
    number: "03",
    title: "Rol de plataforma",
    detail: "Permisos para ver, crear, editar, aprobar o administrar cada módulo.",
  },
  {
    number: "04",
    title: "Asignación operativa",
    detail: "Clientes, proyectos, frentes, capacidad prevista y próximos hitos.",
  },
  {
    number: "05",
    title: "Cambios y ausencias",
    detail: "Cobertura, reemplazos, reasignaciones y trazabilidad de decisiones.",
  },
  {
    number: "06",
    title: "Baja segura",
    detail: "Revocar sesiones, accesos, integraciones y propiedad de información sin perder historial.",
  },
];
