export type SecurityControlStatus = "Operativo" | "Parcial" | "Pendiente" | "Atención";
export type SecuritySeverity = "Baja" | "Media" | "Alta" | "Crítica";
export type SecurityEventStatus = "Nuevo" | "En revisión" | "Programado" | "Resuelto";

export type SecurityControl = {
  id: string;
  domain: string;
  status: SecurityControlStatus;
  coverage: string;
  evidence: string;
  owner: string;
  nextAction: string;
  href: string;
};

export type AuthenticationRequirement = {
  requirement: string;
  status: SecurityControlStatus;
  implementation: string;
  evidence: string;
};

export type DataClass = {
  name: string;
  level: string;
  examples: string;
  defaultAccess: string;
  controls: string;
};

export type SecurityEnvironment = {
  name: string;
  branch: string;
  data: string;
  secrets: string;
  deployment: string;
  status: SecurityControlStatus;
};

export type SecretSurface = {
  surface: string;
  scope: string;
  storage: string;
  rotation: string;
  status: SecurityControlStatus;
  action: string;
};

export type SecurityEvent = {
  id: string;
  severity: SecuritySeverity;
  title: string;
  source: string;
  detected: string;
  status: SecurityEventStatus;
  owner: string;
  action: string;
};

export const securityDemoPeriod = "Octubre 2026";

export const securityControls: SecurityControl[] = [
  {
    id: "control-identity",
    domain: "Identidad y autenticación",
    status: "Parcial",
    coverage: "Política corporativa definida; integración real con Google pendiente.",
    evidence: "Dominio permitido, flujo de invitación y estados de usuario modelados.",
    owner: "Plataforma",
    nextAction: "Implementar OAuth/OIDC y validar dominio del lado servidor.",
    href: "/v2/usuarios",
  },
  {
    id: "control-authorization",
    domain: "Autorización y RLS",
    status: "Pendiente",
    coverage: "Matriz de roles y alcance diseñada; enforcement de base todavía no implementado.",
    evidence: "Permisos por módulo, acción, área y cliente disponibles en el demo.",
    owner: "Plataforma + Datos",
    nextAction: "Traducir la matriz a políticas de Row Level Security y pruebas negativas.",
    href: "/v2/usuarios",
  },
  {
    id: "control-application",
    domain: "Aplicación y APIs",
    status: "Parcial",
    coverage: "Build, TypeScript y previews validados; controles de abuso y hardening pendientes.",
    evidence: "Deployments separados, checks de build y rutas prerenderizadas.",
    owner: "Desarrollo",
    nextAction: "Definir validación de entradas, rate limiting, cabeceras y pruebas de autorización.",
    href: "/v2/salud-sistema",
  },
  {
    id: "control-secrets",
    domain: "Secretos e integraciones",
    status: "Atención",
    coverage: "Principio server-side definido; inventario y rotación real todavía incompletos.",
    evidence: "Integraciones separadas conceptualmente de identidades humanas.",
    owner: "Plataforma",
    nextAction: "Crear inventario, propietarios, vencimientos y revocación por conexión.",
    href: "/v2/integraciones",
  },
  {
    id: "control-data",
    domain: "Datos, backups y recuperación",
    status: "Parcial",
    coverage: "Backup diario definido; estrategia de archivos y simulacro de restauración pendientes.",
    evidence: "Política de copia previa a migraciones y recuperación modelada.",
    owner: "Plataforma + Operaciones",
    nextAction: "Separar backup de base y storage, automatizar copia externa y probar restore.",
    href: "/v2/salud-sistema",
  },
  {
    id: "control-environments",
    domain: "Ambientes y despliegues",
    status: "Operativo",
    coverage: "Development, Preview/Staging y Production separados a nivel de código.",
    evidence: "Rama feature, Vercel Preview y main sin modificaciones durante la validación.",
    owner: "Desarrollo",
    nextAction: "Separar también datos, credenciales y migraciones por ambiente.",
    href: "/v2/salud-sistema",
  },
  {
    id: "control-audit",
    domain: "Auditoría e incidentes",
    status: "Parcial",
    coverage: "Eventos y decisiones modelados; retención, alertas y respuesta real pendientes.",
    evidence: "Quién, qué, cuándo, recurso, resultado y motivo definidos como campos mínimos.",
    owner: "Seguridad + Operaciones",
    nextAction: "Persistir eventos críticos y conectar alertas con una cola de incidentes.",
    href: "/v2/auditoria",
  },
];

export const authenticationRequirements: AuthenticationRequirement[] = [
  {
    requirement: "Proveedor de identidad",
    status: "Pendiente",
    implementation: "Google Workspace mediante OAuth/OIDC.",
    evidence: "La política está definida, pero el demo todavía no exige login real.",
  },
  {
    requirement: "Dominio permitido",
    status: "Parcial",
    implementation: "Aceptar sólo cuentas @avans.agency y verificar el dominio en servidor.",
    evidence: "Regla visible en arquitectura y usuarios; enforcement pendiente.",
  },
  {
    requirement: "Registro público",
    status: "Operativo",
    implementation: "Deshabilitado por diseño; altas sólo mediante invitación.",
    evidence: "No existe flujo de autoservicio en el demo.",
  },
  {
    requirement: "Segundo factor",
    status: "Pendiente",
    implementation: "Delegado a la política corporativa de Google Workspace.",
    evidence: "Debe verificarse y documentarse en la consola de administración.",
  },
  {
    requirement: "Sesiones",
    status: "Parcial",
    implementation: "Inventario, revocación, vencimiento y alerta por dispositivo nuevo.",
    evidence: "La interfaz y los estados están modelados; persistencia pendiente.",
  },
  {
    requirement: "Acceso de emergencia",
    status: "Pendiente",
    implementation: "Cuenta break-glass separada, protegida y con uso auditado.",
    evidence: "Política y custodios todavía por definir.",
  },
];

export const authorizationLayers = [
  {
    number: "01",
    title: "Identidad",
    detail: "Quién inicia sesión y si pertenece al dominio corporativo autorizado.",
  },
  {
    number: "02",
    title: "Rol organizacional",
    detail: "Qué responsabilidad real tiene dentro de Avans.",
  },
  {
    number: "03",
    title: "Rol de plataforma",
    detail: "Qué módulos y acciones tiene habilitados por defecto.",
  },
  {
    number: "04",
    title: "Alcance",
    detail: "Área, clientes, proyectos y tipos de datos sobre los que puede actuar.",
  },
  {
    number: "05",
    title: "Política de datos",
    detail: "RLS y reglas server-side verifican cada lectura o escritura.",
  },
  {
    number: "06",
    title: "Guardrail",
    detail: "Las acciones sensibles requieren confirmación, aprobación o bloqueo.",
  },
];

export const dataClasses: DataClass[] = [
  {
    name: "Operativo interno",
    level: "Interno",
    examples: "Tareas, hitos, estados, reuniones y responsables.",
    defaultAccess: "Equipo asignado y líderes relacionados.",
    controls: "Permisos por cliente/proyecto y trazabilidad de cambios.",
  },
  {
    name: "Cliente confidencial",
    level: "Confidencial",
    examples: "Briefs, estrategia, accesos, documentos y resultados.",
    defaultAccess: "Personas asignadas a la cuenta.",
    controls: "RLS por cliente, descarga controlada y registros de acceso.",
  },
  {
    name: "Financiero restringido",
    level: "Restringido",
    examples: "Facturación, cobranzas, costos, margen y cuentas bancarias.",
    defaultAccess: "Gerencia y Finanzas según función.",
    controls: "Permiso explícito, cifrado, auditoría y exportación limitada.",
  },
  {
    name: "Laboral restringido",
    level: "Restringido",
    examples: "Remuneraciones, documentación personal y evaluaciones.",
    defaultAccess: "RRHH/Administración y responsables autorizados.",
    controls: "Separación lógica, mínimo privilegio y retención definida.",
  },
  {
    name: "Secreto crítico",
    level: "Crítico",
    examples: "Tokens, claves, credenciales, webhooks y llaves de servicio.",
    defaultAccess: "Sólo procesos y administradores técnicos necesarios.",
    controls: "Nunca en cliente o logs; rotación, revocación y storage seguro.",
  },
];

export const securityEnvironments: SecurityEnvironment[] = [
  {
    name: "Development",
    branch: "Ramas locales o feature",
    data: "Datos sintéticos o sandbox",
    secrets: "Credenciales de desarrollo separadas",
    deployment: "Sin tráfico de usuarios",
    status: "Parcial",
  },
  {
    name: "Preview / Staging",
    branch: "Pull Request y preview URL",
    data: "Base o esquema de staging independiente",
    secrets: "Variables de preview limitadas",
    deployment: "QA y aprobación antes de producción",
    status: "Parcial",
  },
  {
    name: "Production",
    branch: "main aprobada",
    data: "Fuente operativa real",
    secrets: "Credenciales productivas aisladas",
    deployment: "Backup, migración controlada, smoke test y rollback",
    status: "Parcial",
  },
];

export const secretSurfaces: SecretSurface[] = [
  {
    surface: "Base de datos y backend",
    scope: "Lectura/escritura según servicio y ambiente",
    storage: "Variables server-side o vault",
    rotation: "Calendario + evento de seguridad",
    status: "Parcial",
    action: "Separar claves públicas, servidor y administración.",
  },
  {
    surface: "Google Workspace / OAuth",
    scope: "Autenticación y datos autorizados",
    storage: "Configuración de proveedor + secretos server-side",
    rotation: "Al cambio de aplicación o incidente",
    status: "Pendiente",
    action: "Crear credenciales por ambiente y dominios de redirect controlados.",
  },
  {
    surface: "Proveedores de IA",
    scope: "Modelos, archivos y ejecuciones autorizadas",
    storage: "Servidor; nunca en navegador",
    rotation: "Por proyecto, exposición o baja de proveedor",
    status: "Atención",
    action: "Separar consumo por entorno y limitar presupuesto/acciones.",
  },
  {
    surface: "Integraciones de clientes",
    scope: "API, webhook o cuenta técnica específica",
    storage: "Vault cifrado con propietario y vencimiento",
    rotation: "Según proveedor + revocación al cerrar el servicio",
    status: "Pendiente",
    action: "Inventariar conexión, permisos, responsable y procedimiento de baja.",
  },
];

export const securityEvents: SecurityEvent[] = [
  {
    id: "event-domain-attempt",
    severity: "Alta",
    title: "Intento de acceso con dominio no autorizado",
    source: "Autenticación · simulación",
    detected: "Hoy · 10:26",
    status: "En revisión",
    owner: "Plataforma",
    action: "Bloquear, registrar y confirmar que no se creó sesión.",
  },
  {
    id: "event-new-device",
    severity: "Media",
    title: "Sesión de Cuenta 01 desde dispositivo nuevo",
    source: "Sesiones · demo",
    detected: "Hoy · 09:48",
    status: "Nuevo",
    owner: "Administrador",
    action: "Solicitar confirmación o revocar la sesión.",
  },
  {
    id: "event-secret-review",
    severity: "Media",
    title: "Credencial de proveedor de IA sin propietario confirmado",
    source: "Inventario de secretos · demo",
    detected: "Ayer · 16:20",
    status: "Programado",
    owner: "Operaciones",
    action: "Asignar propietario, alcance y próxima rotación.",
  },
  {
    id: "event-role-change",
    severity: "Baja",
    title: "Cambio de alcance de Cuenta 02 completado",
    source: "Usuarios y roles · demo",
    detected: "Ayer · 12:04",
    status: "Resuelto",
    owner: "Cuentas",
    action: "Evidencia registrada y permisos anteriores revocados.",
  },
];

export const continuityChecks = [
  {
    title: "Backup de base de datos",
    status: "Política definida",
    detail: "Automático diario con retención mínima; proveedor real a configurar.",
    href: "/v2/salud-sistema",
  },
  {
    title: "Backup de archivos / storage",
    status: "Pendiente",
    detail: "Debe tratarse por separado de la base de datos.",
    href: "/v2/salud-sistema",
  },
  {
    title: "Copia previa a cambios críticos",
    status: "Definida",
    detail: "Antes de migraciones, importaciones o modificaciones masivas.",
    href: "/v2/salud-sistema",
  },
  {
    title: "Prueba de restauración",
    status: "Pendiente",
    detail: "Un backup no se considera confiable hasta comprobar su recuperación.",
    href: "/v2/salud-sistema",
  },
  {
    title: "Rollback de aplicación",
    status: "Disponible",
    detail: "Deployments previos conservados; migraciones requieren estrategia compatible.",
    href: "/v2/salud-sistema",
  },
];

export const incidentResponseSteps = [
  { number: "01", title: "Detectar", detail: "Alerta, reporte o anomalía con evidencia inicial." },
  { number: "02", title: "Clasificar", detail: "Severidad, alcance, datos afectados y responsable." },
  { number: "03", title: "Contener", detail: "Revocar sesión o secreto, limitar acceso y preservar registros." },
  { number: "04", title: "Recuperar", detail: "Restaurar servicio o datos y validar el flujo principal." },
  { number: "05", title: "Aprender", detail: "Causa raíz, acciones correctivas y actualización de controles." },
];
