export type AccessSourceStatus = "Disponible" | "Parcial" | "Pendiente";
export type AccessUserStatus = "Activo" | "Invitación pendiente" | "Suspendido" | "En revisión";
export type AccessReviewStatus = "Abierta" | "Programada" | "Resuelta";
export type AccessRisk = "Baja" | "Media" | "Alta";
export type AccessLevel = "Total" | "Área" | "Asignado" | "Lectura" | "Sin acceso";
export type AccessSessionRisk = "Normal" | "Revisar" | "Bloqueada";

export type AccessSource = {
  title: string;
  status: AccessSourceStatus;
  detail: string;
  method: string;
  freshness: string;
  href: string;
};

export type AccessUser = {
  id: string;
  identity: string;
  email: string;
  area: string;
  organizationalRole: string;
  platformRole: string;
  scope: string;
  status: AccessUserStatus;
  lastAccess: string;
  authentication: string;
  review: string;
};

export type AccessRole = {
  id: string;
  title: string;
  users: number;
  defaultScope: string;
  capabilities: string;
  restrictions: string;
};

export type PermissionDomain = {
  module: string;
  detail: string;
  admin: AccessLevel;
  management: AccessLevel;
  lead: AccessLevel;
  team: AccessLevel;
  finance: AccessLevel;
};

export type AccessReview = {
  id: string;
  title: string;
  requester: string;
  scope: string;
  approver: string;
  expires: string;
  risk: AccessRisk;
  status: AccessReviewStatus;
  action: string;
};

export type AccessSession = {
  id: string;
  identity: string;
  device: string;
  location: string;
  lastActivity: string;
  authentication: string;
  risk: AccessSessionRisk;
  action: string;
};

export const accessDemoPeriod = "Octubre 2026";

export const accessSources: AccessSource[] = [
  {
    title: "Google Workspace",
    status: "Pendiente",
    detail: "Proveedor de identidad corporativo y dominio autorizado @avans.agency.",
    method: "OAuth/OIDC con validación de dominio en servidor",
    freshness: "Integración no activa en el demo",
    href: "/v2/integraciones",
  },
  {
    title: "Directorio de usuarios",
    status: "Disponible",
    detail: "Identidades, estados, área, rol de plataforma y alcance operativo.",
    method: "Modelo nativo de Avans OS",
    freshness: "Continua",
    href: "/v2/usuarios",
  },
  {
    title: "Estructura organizacional",
    status: "Disponible",
    detail: "Áreas, responsabilidades, líderes y relación con RRHH.",
    method: "RRHH + configuración de organización",
    freshness: "Ante cada cambio",
    href: "/v2/rrhh",
  },
  {
    title: "Asignaciones por cliente",
    status: "Disponible",
    detail: "Clientes, proyectos y frentes que delimitan el alcance de cada persona.",
    method: "Cliente 360° + Operaciones",
    freshness: "Continua",
    href: "/v2/operaciones",
  },
  {
    title: "Sesiones y auditoría de acceso",
    status: "Parcial",
    detail: "Modelo de sesiones, cambios de rol y eventos sensibles; persistencia real pendiente.",
    method: "Autenticación + Auditoría",
    freshness: "En tiempo real cuando se implemente",
    href: "/v2/auditoria",
  },
  {
    title: "Identidades de servicio y externos",
    status: "Pendiente",
    detail: "Cuentas técnicas, proveedores o invitados con alcance y vencimiento explícito.",
    method: "Invitación controlada y cuentas de servicio separadas",
    freshness: "Pendiente de política definitiva",
    href: "/v2/seguridad",
  },
];

export const accessUsers: AccessUser[] = [
  {
    id: "identity-direction-01",
    identity: "Dirección 01",
    email: "direccion.01@avans.agency",
    area: "Dirección",
    organizationalRole: "Dirección general",
    platformRole: "Gerencia",
    scope: "Toda la organización",
    status: "Activo",
    lastAccess: "Hoy · 09:18",
    authentication: "Google Workspace",
    review: "Al día · próxima revisión trimestral",
  },
  {
    id: "identity-platform-01",
    identity: "Plataforma 01",
    email: "plataforma.01@avans.agency",
    area: "Operaciones",
    organizationalRole: "Operaciones y automatización",
    platformRole: "Administrador",
    scope: "Configuración técnica y plataforma",
    status: "Activo",
    lastAccess: "Hoy · 10:42",
    authentication: "Google Workspace",
    review: "Acceso privilegiado · revisión mensual",
  },
  {
    id: "identity-admin-01",
    identity: "Administración 01",
    email: "administracion.01@avans.agency",
    area: "Administración",
    organizationalRole: "Administración y Finanzas",
    platformRole: "Finanzas / Administración",
    scope: "Finanzas, cobranzas y fuentes",
    status: "Activo",
    lastAccess: "Hoy · 08:51",
    authentication: "Google Workspace",
    review: "Al día · datos sensibles habilitados",
  },
  {
    id: "identity-account-01",
    identity: "Cuenta 01",
    email: "cuenta.01@avans.agency",
    area: "Cuentas",
    organizationalRole: "Liderazgo de Cuentas",
    platformRole: "Líder de área",
    scope: "Epsa · ACA · Lider Energy",
    status: "En revisión",
    lastAccess: "Hoy · 11:07",
    authentication: "Google Workspace",
    review: "Elevación temporal financiera abierta",
  },
  {
    id: "identity-account-02",
    identity: "Cuenta 02",
    email: "cuenta.02@avans.agency",
    area: "Cuentas",
    organizationalRole: "Ejecutivo/a de Cuenta",
    platformRole: "Equipo",
    scope: "Grupo Portland · Edinovo",
    status: "Activo",
    lastAccess: "Ayer · 17:36",
    authentication: "Google Workspace",
    review: "Al día",
  },
  {
    id: "identity-strategy-01",
    identity: "Estrategia 01",
    email: "estrategia.01@avans.agency",
    area: "Estrategia",
    organizationalRole: "Estrategia Senior",
    platformRole: "Líder de área",
    scope: "Discovery, benchmark y aprobaciones asignadas",
    status: "Activo",
    lastAccess: "Hoy · 09:54",
    authentication: "Google Workspace",
    review: "Al día · acceso por área",
  },
  {
    id: "identity-content-01",
    identity: "Contenido 01",
    email: "contenido.01@avans.agency",
    area: "Contenido",
    organizationalRole: "Contenido y Marca",
    platformRole: "Equipo",
    scope: "Clientes y ciclos asignados",
    status: "Activo",
    lastAccess: "Hoy · 10:11",
    authentication: "Google Workspace",
    review: "Al día",
  },
  {
    id: "identity-design-01",
    identity: "Diseño 01",
    email: "diseno.01@avans.agency",
    area: "Diseño",
    organizationalRole: "Diseño",
    platformRole: "Equipo",
    scope: "Entregables y clientes asignados",
    status: "Activo",
    lastAccess: "Ayer · 18:02",
    authentication: "Google Workspace",
    review: "Al día",
  },
  {
    id: "identity-performance-01",
    identity: "Performance 01",
    email: "performance.01@avans.agency",
    area: "Performance",
    organizationalRole: "Performance",
    platformRole: "Equipo",
    scope: "Campañas y cuentas asignadas",
    status: "Invitación pendiente",
    lastAccess: "Nunca",
    authentication: "Aún no autenticado",
    review: "Invitación vence en 5 días",
  },
];

export const accessRoles: AccessRole[] = [
  {
    id: "role-admin",
    title: "Administrador",
    users: 1,
    defaultScope: "Configuración completa de la plataforma",
    capabilities: "Usuarios, permisos, integraciones, entornos y configuración.",
    restrictions: "No obtiene por defecto acceso a remuneraciones o información personal sensible.",
  },
  {
    id: "role-management",
    title: "Gerencia",
    users: 1,
    defaultScope: "Lectura transversal y decisiones ejecutivas",
    capabilities: "KPIs, riesgos, prioridades, aprobaciones y contexto consolidado.",
    restrictions: "La información financiera o laboral restringida requiere permiso explícito.",
  },
  {
    id: "role-lead",
    title: "Líder de área",
    users: 2,
    defaultScope: "Su área, equipo y clientes relacionados",
    capabilities: "Asignar, editar, aprobar y revisar dentro de su responsabilidad.",
    restrictions: "Sin administración global ni acceso automático a otras áreas.",
  },
  {
    id: "role-team",
    title: "Equipo",
    users: 4,
    defaultScope: "Clientes, proyectos y tareas asignadas",
    capabilities: "Ver y editar información necesaria para ejecutar el trabajo.",
    restrictions: "Sin acceso a datos económicos, laborales o credenciales por defecto.",
  },
  {
    id: "role-finance",
    title: "Finanzas / Administración",
    users: 1,
    defaultScope: "Facturación, cobranzas, costos y conciliaciones",
    capabilities: "Gestionar fuentes económicas y acciones administrativas auditadas.",
    restrictions: "No administra permisos técnicos ni ve información no necesaria para su función.",
  },
];

export const permissionDomains: PermissionDomain[] = [
  { module: "Clientes", detail: "Contexto, documentos, decisiones y actividad", admin: "Total", management: "Lectura", lead: "Área", team: "Asignado", finance: "Lectura" },
  { module: "Operaciones", detail: "Procesos, proyectos, tareas y aprobaciones", admin: "Total", management: "Lectura", lead: "Área", team: "Asignado", finance: "Lectura" },
  { module: "Ventas", detail: "Leads, discovery, propuestas y handoff", admin: "Total", management: "Total", lead: "Área", team: "Asignado", finance: "Lectura" },
  { module: "Finanzas", detail: "Facturación, cobranzas, costos y margen", admin: "Lectura", management: "Lectura", lead: "Lectura", team: "Sin acceso", finance: "Total" },
  { module: "RRHH", detail: "Capacidad, ausencias y estructura de equipo", admin: "Lectura", management: "Lectura", lead: "Área", team: "Asignado", finance: "Lectura" },
  { module: "Gerencia", detail: "KPIs, riesgos y cola ejecutiva", admin: "Lectura", management: "Total", lead: "Lectura", team: "Sin acceso", finance: "Lectura" },
  { module: "Plataforma", detail: "Usuarios, integraciones, seguridad y salud", admin: "Total", management: "Lectura", lead: "Sin acceso", team: "Sin acceso", finance: "Asignado" },
  { module: "Auditoría", detail: "Eventos, cambios y evidencia", admin: "Total", management: "Lectura", lead: "Área", team: "Asignado", finance: "Área" },
];

export const accessReviews: AccessReview[] = [
  {
    id: "review-finance-epsa",
    title: "Acceso temporal a lectura financiera de Epsa",
    requester: "Cuenta 01",
    scope: "Margen y saldo del cliente Epsa",
    approver: "Gerencia + Finanzas",
    expires: "09 oct · 18:00",
    risk: "Media",
    status: "Abierta",
    action: "Aprobar, limitar alcance o rechazar antes de habilitar.",
  },
  {
    id: "review-quarterly",
    title: "Recertificación trimestral de roles y clientes",
    requester: "Sistema",
    scope: "Todas las identidades activas",
    approver: "Líderes + Gerencia",
    expires: "15 oct",
    risk: "Baja",
    status: "Programada",
    action: "Confirmar que cada acceso sigue siendo necesario.",
  },
  {
    id: "review-invitation",
    title: "Invitación no aceptada de Performance 01",
    requester: "Usuarios y roles",
    scope: "Cuenta corporativa pendiente",
    approver: "Administrador",
    expires: "En 5 días",
    risk: "Baja",
    status: "Programada",
    action: "Reenviar o revocar automáticamente al vencer.",
  },
  {
    id: "review-revoked",
    title: "Revocación de acceso externo de producción",
    requester: "Operaciones",
    scope: "Carpeta y proyecto finalizados",
    approver: "Líder de área",
    expires: "Resuelto ayer",
    risk: "Media",
    status: "Resuelta",
    action: "Permisos removidos y evidencia registrada.",
  },
];

export const accessSessions: AccessSession[] = [
  {
    id: "session-direction",
    identity: "Dirección 01",
    device: "Chrome · Windows",
    location: "Red habitual",
    lastActivity: "Ahora",
    authentication: "Google Workspace",
    risk: "Normal",
    action: "Sin acción",
  },
  {
    id: "session-platform",
    identity: "Plataforma 01",
    device: "Chrome · Windows",
    location: "Red habitual",
    lastActivity: "Hace 6 min",
    authentication: "Google Workspace",
    risk: "Normal",
    action: "Acceso privilegiado monitoreado",
  },
  {
    id: "session-account",
    identity: "Cuenta 01",
    device: "Chrome · dispositivo nuevo",
    location: "Ubicación no reconocida en el demo",
    lastActivity: "Hace 42 min",
    authentication: "Google Workspace",
    risk: "Revisar",
    action: "Confirmar dispositivo o revocar sesión",
  },
  {
    id: "session-admin",
    identity: "Administración 01",
    device: "Chrome · macOS",
    location: "Red habitual",
    lastActivity: "Hace 1 h",
    authentication: "Google Workspace",
    risk: "Normal",
    action: "Sin acción",
  },
];

export const accessLifecycleSteps = [
  {
    number: "01",
    title: "Invitar",
    detail: "Sólo una persona autorizada inicia el alta; no existe registro público.",
  },
  {
    number: "02",
    title: "Verificar identidad",
    detail: "Google Workspace, dominio @avans.agency y estado corporativo válido.",
  },
  {
    number: "03",
    title: "Asignar roles",
    detail: "Responsabilidad organizacional y rol de plataforma se configuran por separado.",
  },
  {
    number: "04",
    title: "Delimitar alcance",
    detail: "Área, clientes, proyectos, datos sensibles y acciones permitidas.",
  },
  {
    number: "05",
    title: "Revisar",
    detail: "Accesos temporales, recertificación y alertas por cambios o inactividad.",
  },
  {
    number: "06",
    title: "Revocar",
    detail: "Sesiones, permisos e integraciones se eliminan sin borrar el historial.",
  },
];

export const accessPolicies = [
  {
    title: "Autenticación corporativa",
    state: "Definida · implementación pendiente",
    detail: "Google Workspace como único proveedor para personas internas.",
  },
  {
    title: "Mínimo privilegio",
    state: "Modelo disponible",
    detail: "El rol otorga un punto de partida; el alcance limita área, cliente y acción.",
  },
  {
    title: "Elevación temporal",
    state: "Diseñada",
    detail: "Permisos sensibles requieren motivo, aprobador y vencimiento automático.",
  },
  {
    title: "Baja segura",
    state: "Diseñada",
    detail: "Revocación inmediata de sesiones y reasignación de propiedad antes del cierre.",
  },
];
