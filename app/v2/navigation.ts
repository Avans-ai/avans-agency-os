import type { AvansIconName } from "./os/brand";

export type V2NavItem = { label: string; slug: string; href: string; children?: V2NavItem[] };

/** Sidebar leaf. `slug` is the route section that marks it active; hash links never do. */
export type OsNavLeaf = { label: string; href: string; slug?: string; badge?: "approvals" };
export type OsNavArea = {
  slug: "operaciones" | "ventas" | "finanzas" | "rrhh" | "gerencia";
  label: string;
  icon: AvansIconName;
  href: string;
  /** Lock = visibility depends on role (Finanzas y Gerencia). */
  restricted?: boolean;
  items: OsNavLeaf[];
};

/**
 * Actualización del director: Operaciones reúne todos los proyectos y Clientes
 * organiza la ejecución diaria dentro de cada cuenta y módulo de servicio.
 */
export const osAreas: OsNavArea[] = [
  { slug: "operaciones", label: "Operaciones", icon: "flujo", href: "/v2/operaciones", items: [
    { label: "Clientes", href: "/v2/clientes", slug: "clientes" },
  ] },
  { slug: "ventas", label: "Ventas", icon: "embudo", href: "/v2/ventas", items: [
    { label: "Prospectos", href: "/v2/leads", slug: "leads" },
    { label: "Discovery", href: "/v2/discovery", slug: "discovery" },
    { label: "Oportunidades", href: "/v2/oportunidades", slug: "oportunidades" },
    { label: "Propuestas", href: "/v2/propuestas", slug: "propuestas" },
    { label: "Seguimiento comercial", href: "/v2/ventas", slug: "ventas" },
  ] },
  { slug: "finanzas", label: "Finanzas", icon: "cartera", href: "/v2/finanzas", restricted: true, items: [
    { label: "Ingresos y gastos", href: "/v2/finanzas#costos" },
    { label: "Facturación y cobranzas", href: "/v2/finanzas#cobranzas" },
    { label: "Rentabilidad", href: "/v2/finanzas#rentabilidad" },
    { label: "Forecast", href: "/v2/finanzas#forecast" },
  ] },
  { slug: "rrhh", label: "RRHH", icon: "grupo", href: "/v2/rrhh", items: [
    { label: "Equipo", href: "/v2/rrhh#equipo" },
    { label: "Roles y habilidades", href: "/v2/rrhh#habilidades" },
    { label: "Burbujas de trabajo", href: "/v2/rrhh#burbujas" },
    { label: "Contractors", href: "/v2/rrhh#contractors" },
    { label: "Talento", href: "/v2/rrhh#talentos" },
    { label: "Disponibilidad", href: "/v2/rrhh#capacidad" },
  ] },
  { slug: "gerencia", label: "Gerencia", icon: "objetivo", href: "/v2/gerencia", restricted: true, items: [
    { label: "Planificación", href: "/v2/gerencia#planificacion" },
    { label: "Indicadores generales", href: "/v2/gerencia" },
    { label: "Decisiones", href: "/v2/gerencia#decisiones" },
    { label: "Insights", href: "/v2/insights", slug: "insights" },
    { label: "Aprendizajes", href: "/v2/aprendizajes", slug: "aprendizajes" },
    { label: "Uso y eficiencia de IA", href: "/v2/automatizaciones" },
  ] },
];

/** Configuración (utility, not an area): platform modules kept from the previous demo. */
export const osSettingsItems: V2NavItem[] = [
  { label: "Usuarios y roles", slug: "usuarios", href: "/v2/usuarios" },
  { label: "Integraciones", slug: "integraciones", href: "/v2/integraciones" },
  { label: "Automatizaciones e IA", slug: "automatizaciones", href: "/v2/automatizaciones" },
  { label: "Seguridad", slug: "seguridad", href: "/v2/seguridad" },
  { label: "Auditoría", slug: "auditoria", href: "/v2/auditoria" },
  { label: "Salud del sistema", slug: "salud-sistema", href: "/v2/salud-sistema" },
  { label: "Estado del producto", slug: "estado-producto", href: "/v2/estado-producto" },
];

/** Every section rendered by app/v2/[section]. Dedicated folders (clientes,
 * proyectos, aprobaciones, mis-tareas, configuracion, benchmark) are excluded. */
export const v2NavItems: V2NavItem[] = [
  { label: "Bandeja de excepciones", slug: "inbox", href: "/v2/inbox" },
  ...osAreas.map(area => ({ label: area.label, slug: area.slug, href: area.href })),
  ...osSettingsItems,
  { label: "Procesos", slug: "procesos", href: "/v2/procesos" },
  { label: "Reuniones", slug: "reuniones", href: "/v2/reuniones" },
  { label: "Insights", slug: "insights", href: "/v2/insights" },
  { label: "Oportunidades", slug: "oportunidades", href: "/v2/oportunidades" },
  { label: "Aprendizajes", slug: "aprendizajes", href: "/v2/aprendizajes" },
  { label: "Prospectos", slug: "leads", href: "/v2/leads" },
  { label: "Discovery", slug: "discovery", href: "/v2/discovery" },
  { label: "Propuestas", slug: "propuestas", href: "/v2/propuestas" },
  { label: "Producción", slug: "contenido", href: "/v2/contenido" },
  { label: "Campañas", slug: "campanas", href: "/v2/campanas" },
  { label: "Reportes operativos", slug: "reportes", href: "/v2/reportes" },
  { label: "Agentes", slug: "agentes", href: "/v2/agentes" },
  { label: "Workflows", slug: "workflows", href: "/v2/workflows" },
  { label: "Guardrails", slug: "guardrails", href: "/v2/guardrails" },
];

const structuralItems: V2NavItem[] = [
  { label: "Inicio", slug: "command-center", href: "/v2" },
  { label: "Configuración", slug: "configuracion", href: "/v2/configuracion" },
  { label: "Clientes", slug: "clientes", href: "/v2/clientes" },
  { label: "Proyectos y tareas", slug: "proyectos", href: "/v2/proyectos" },
  { label: "Aprobaciones", slug: "aprobaciones", href: "/v2/aprobaciones" },
  { label: "Mis tareas", slug: "mis-tareas", href: "/v2/mis-tareas" },
  { label: "Benchmark", slug: "benchmark", href: "/v2/benchmark" },
];

export const v2ParentBySlug: Record<string, string> = {
  clientes: "operaciones", proyectos: "operaciones", contenido: "operaciones", campanas: "operaciones",
  aprobaciones: "operaciones", reportes: "operaciones", procesos: "operaciones", reuniones: "operaciones",
  inbox: "operaciones", "mis-tareas": "operaciones", benchmark: "clientes",
  leads: "ventas", discovery: "ventas", oportunidades: "ventas", propuestas: "ventas",
  insights: "gerencia", aprendizajes: "gerencia",
  usuarios: "configuracion", integraciones: "configuracion", automatizaciones: "configuracion",
  seguridad: "configuracion", auditoria: "configuracion", "salud-sistema": "configuracion", "estado-producto": "configuracion",
  agentes: "automatizaciones", workflows: "automatizaciones", guardrails: "seguridad",
};

const navigationIndex = new Map<string, V2NavItem>(
  [...structuralItems, ...v2NavItems].map(item => [item.slug, item]),
);

export function getV2NavItem(slug: string) {
  return navigationIndex.get(slug);
}

/** Root-first ancestor chain, shared by breadcrumbs and the active sidebar area. */
export function getV2Ancestors(slug: string): V2NavItem[] {
  const ancestors: V2NavItem[] = [];
  const visited = new Set<string>([slug]);
  let parentSlug = v2ParentBySlug[slug];
  while (parentSlug && !visited.has(parentSlug)) {
    visited.add(parentSlug);
    const parent = navigationIndex.get(parentSlug);
    if (!parent) break;
    ancestors.unshift(parent);
    parentSlug = v2ParentBySlug[parentSlug];
  }
  return ancestors;
}

/** Area slug (or "command-center" / "configuracion") that owns a section. */
export function getV2RootSlug(slug: string) {
  return getV2Ancestors(slug)[0]?.slug ?? slug;
}
