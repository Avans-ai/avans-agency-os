export type V2NavItem = { label: string; slug: string; href: string; children?: V2NavItem[] };
export type V2NavGroup = { group: string; items: V2NavItem[] };

/** Approved hierarchy: Operations > Clients > Benchmark.
 * Existing URLs stay unchanged; hierarchy does not require a route migration.
 */
export const v2NavGroups: V2NavGroup[] = [
  { group: "General", items: [
    { label: "Command Center", slug: "command-center", href: "/v2" },
    { label: "Bandeja", slug: "inbox", href: "/v2/inbox" },
  ] },
  { group: "Áreas de Avans", items: [
    { label: "Operaciones", slug: "operaciones", href: "/v2/operaciones", children: [
      { label: "Clientes", slug: "clientes", href: "/v2/clientes", children: [
        { label: "Benchmark", slug: "benchmark", href: "/v2/benchmark" },
      ] },
    ] },
    { label: "Ventas", slug: "ventas", href: "/v2/ventas" },
    { label: "Finanzas", slug: "finanzas", href: "/v2/finanzas" },
    { label: "RRHH", slug: "rrhh", href: "/v2/rrhh" },
    { label: "Gerencia", slug: "gerencia", href: "/v2/gerencia" },
  ] },
  { group: "Plataforma", items: [
    { label: "Usuarios y roles", slug: "usuarios", href: "/v2/usuarios" },
    { label: "Integraciones", slug: "integraciones", href: "/v2/integraciones" },
    { label: "Automatizaciones e IA", slug: "automatizaciones", href: "/v2/automatizaciones" },
    { label: "Seguridad", slug: "seguridad", href: "/v2/seguridad" },
    { label: "Auditoría", slug: "auditoria", href: "/v2/auditoria" },
    { label: "Salud del sistema", slug: "salud-sistema", href: "/v2/salud-sistema" },
  ] },
];

export const v2CapabilityItems: V2NavItem[] = [
  { label: "Clientes", slug: "clientes", href: "/v2/clientes" },
  { label: "Procesos", slug: "procesos", href: "/v2/procesos" },
  { label: "Proyectos", slug: "proyectos", href: "/v2/proyectos" },
  { label: "Reuniones", slug: "reuniones", href: "/v2/reuniones" },
  { label: "Insights", slug: "insights", href: "/v2/insights" },
  { label: "Oportunidades", slug: "oportunidades", href: "/v2/oportunidades" },
  { label: "Aprendizajes", slug: "aprendizajes", href: "/v2/aprendizajes" },
  { label: "Leads", slug: "leads", href: "/v2/leads" },
  { label: "Discovery", slug: "discovery", href: "/v2/discovery" },
  { label: "Propuestas", slug: "propuestas", href: "/v2/propuestas" },
  { label: "Contenido", slug: "contenido", href: "/v2/contenido" },
  { label: "Campañas", slug: "campanas", href: "/v2/campanas" },
  { label: "Reportes", slug: "reportes", href: "/v2/reportes" },
  { label: "Agentes", slug: "agentes", href: "/v2/agentes" },
  { label: "Workflows", slug: "workflows", href: "/v2/workflows" },
  { label: "Guardrails", slug: "guardrails", href: "/v2/guardrails" },
  { label: "Estado del producto", slug: "estado-producto", href: "/v2/estado-producto" },
];
const visibleItems = v2NavGroups.flatMap(group => group.items);
// Keep static route generation stable: /v2/benchmark has its own page.
export const v2NavItems = [...visibleItems, ...v2CapabilityItems].filter((item, index, items) => items.findIndex(candidate => candidate.slug === item.slug) === index);
export const v2ParentBySlug: Record<string, string> = {
  clientes: "operaciones", benchmark: "clientes",
  procesos: "operaciones", proyectos: "operaciones", reuniones: "operaciones", contenido: "operaciones", campanas: "operaciones",
  leads: "ventas", discovery: "ventas", oportunidades: "ventas", propuestas: "ventas",
  insights: "gerencia", reportes: "gerencia", aprendizajes: "gerencia",
  agentes: "automatizaciones", workflows: "automatizaciones", guardrails: "seguridad", "estado-producto": "salud-sistema",
};

function flattenNavigation(items: V2NavItem[]): V2NavItem[] {
  return items.flatMap(item => [item, ...flattenNavigation(item.children ?? [])]);
}
const navigationIndex = new Map<string, V2NavItem>([
  ...flattenNavigation(visibleItems), ...v2CapabilityItems,
].map(item => [item.slug, item]));

/** Root-first ancestor chain, used by both breadcrumbs and active navigation. */
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
