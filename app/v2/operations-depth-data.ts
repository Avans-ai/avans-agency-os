export type OperationsLane = {
  label: string;
  description: string;
  count: number;
  items: { title: string; client: string; status: string; href: string }[];
};

export type OperationsPortfolioRow = {
  client: string;
  workstream: string;
  owner: string;
  stage: string;
  next: string;
  status: "Saludable" | "Atención" | "Aprobación";
  href: string;
};

export const operationsMetrics = [
  { label: "Proyectos activos", value: "12", detail: "5 clientes" },
  { label: "Entregables próximos", value: "8", detail: "Próximos 7 días" },
  { label: "Bloqueos", value: "2", detail: "Requieren intervención" },
  { label: "Capacidad", value: "78%", detail: "Promedio del equipo" },
];

export const operationsLanes: OperationsLane[] = [
  {
    label: "Entrada y preparación",
    description: "Información, brief, reuniones y precondiciones antes de ejecutar.",
    count: 4,
    items: [
      { title: "Cerrar onboarding", client: "Lider Energy", status: "3 pendientes", href: "/v2/clientes/lider-energy" },
      { title: "Validar alcance", client: "Grupo Portland", status: "Aprobación", href: "/v2/propuestas" },
    ],
  },
  {
    label: "En ejecución",
    description: "Procesos, producción y campañas con responsables y próximos pasos.",
    count: 7,
    items: [
      { title: "Operación de cuenta", client: "Epsa", status: "En curso", href: "/v2/clientes/epsa" },
      { title: "Planificación de contenido", client: "Edinovo", status: "En curso", href: "/v2/clientes/edinovo/contenido" },
    ],
  },
  {
    label: "Revisión y aprobación",
    description: "Puntos de control humano antes de publicar, ejecutar o comprometer alcance.",
    count: 5,
    items: [
      { title: "Señal de performance", client: "Epsa", status: "Revisar", href: "/v2/clientes/epsa/campanas" },
      { title: "Pieza final", client: "ACA", status: "Aprobación", href: "/v2/clientes/aca/contenido" },
    ],
  },
  {
    label: "Entrega y medición",
    description: "Cierre, entrega, reporting y aprendizaje posterior.",
    count: 4,
    items: [
      { title: "Reporte de ciclo", client: "Edinovo", status: "Preparar", href: "/v2/clientes/edinovo/reportes" },
      { title: "Medición de optimización", client: "Epsa", status: "Midiendo", href: "/v2/reportes" },
    ],
  },
];

export const operationsPortfolio: OperationsPortfolioRow[] = [
  { client: "Epsa", workstream: "Operación y campañas", owner: "Cuentas + Performance", stage: "Ejecución", next: "Validar señal y cerrar ciclo", status: "Atención", href: "/v2/clientes/epsa" },
  { client: "ACA", workstream: "Campaña y contenidos", owner: "Cuentas + Estrategia", stage: "Aprobación", next: "Resolver insumo y aprobar pieza", status: "Atención", href: "/v2/clientes/aca" },
  { client: "Grupo Portland", workstream: "Siguiente etapa", owner: "Estrategia + Dirección", stage: "Aprobación", next: "Validar propuesta", status: "Aprobación", href: "/v2/clientes/grupo-portland" },
  { client: "Edinovo", workstream: "Contenido y aprendizaje", owner: "Contenido + Estrategia", stage: "Planificación", next: "Validar patrones", status: "Saludable", href: "/v2/clientes/edinovo" },
  { client: "Lider Energy", workstream: "Onboarding", owner: "Cuentas + Operaciones", stage: "Preparación", next: "Completar responsables y accesos", status: "Atención", href: "/v2/clientes/lider-energy" },
];

export const operationsCapacity = [
  { area: "Cuentas", load: 82, detail: "2 hitos próximos" },
  { area: "Contenido", load: 74, detail: "3 piezas en revisión" },
  { area: "Performance", load: 69, detail: "1 señal prioritaria" },
  { area: "Estrategia", load: 86, detail: "2 aprobaciones" },
  { area: "Diseño", load: 71, detail: "Capacidad disponible" },
];

export const operationsExceptions = [
  { priority: "Alta", client: "ACA", title: "Proceso bloqueado por información pendiente", owner: "Cuentas", due: "Hoy", href: "/v2/inbox" },
  { priority: "Alta", client: "Epsa", title: "Optimización requiere revisión antes de ejecutar", owner: "Performance", due: "Hoy", href: "/v2/clientes/epsa/campanas" },
  { priority: "Media", client: "Grupo Portland", title: "Propuesta espera validación de Dirección", owner: "Dirección", due: "Esta semana", href: "/v2/propuestas" },
];

export const operationsCapabilities = [
  { label: "Procesos", detail: "Eventos, reglas, responsables y precondiciones", href: "/v2/procesos" },
  { label: "Proyectos", detail: "Hitos, fechas, dependencias y responsables", href: "/v2/proyectos" },
  { label: "Reuniones", detail: "Decisiones, compromisos y cambios de contexto", href: "/v2/reuniones" },
  { label: "Contenido", detail: "Planificación, producción, revisión y aprobación", href: "/v2/contenido" },
  { label: "Campañas", detail: "Monitoreo, recomendaciones, ejecución y medición", href: "/v2/campanas" },
  { label: "Bandeja", detail: "Alertas, bloqueos, decisiones y aprobaciones", href: "/v2/inbox" },
];
