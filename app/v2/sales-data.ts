export type SalesStageKey = "nuevo" | "calificado" | "discovery" | "propuesta" | "negociacion" | "ganado";

export type SalesStage = {
  key: SalesStageKey;
  label: string;
  count: number;
  description: string;
  items: { name: string; detail: string; due: string }[];
};

export type SalesOpportunity = {
  id: string;
  name: string;
  sector: string;
  source: string;
  stage: SalesStageKey;
  owner: string;
  fit: number;
  nextAction: string;
  due: string;
  status: "En curso" | "Atención" | "Aprobación";
  potential: string;
};

export type SalesFollowUp = {
  title: string;
  account: string;
  owner: string;
  due: string;
  priority: "Alta" | "Media";
  href: string;
};

export const salesStages: SalesStage[] = [
  {
    key: "nuevo",
    label: "Nuevo",
    count: 5,
    description: "Ingresos sin diagnóstico completo.",
    items: [
      { name: "Prospecto industrial A", detail: "Formulario web · interés en automatización", due: "Hoy" },
      { name: "Prospecto servicios B", detail: "Referido · reunión pendiente", due: "Mañana" },
    ],
  },
  {
    key: "calificado",
    label: "Calificado",
    count: 4,
    description: "Fit, necesidad y contacto confirmados.",
    items: [
      { name: "Prospecto movilidad C", detail: "Problema operativo identificado", due: "Hoy" },
      { name: "Prospecto educación D", detail: "Volumen y decisor confirmados", due: "Esta semana" },
    ],
  },
  {
    key: "discovery",
    label: "Discovery",
    count: 3,
    description: "Diagnóstico, contexto y oportunidad.",
    items: [
      { name: "Prospecto energía E", detail: "Mapa de procesos en elaboración", due: "Jueves" },
      { name: "Prospecto retail F", detail: "Entrevista con operación", due: "Viernes" },
    ],
  },
  {
    key: "propuesta",
    label: "Propuesta",
    count: 3,
    description: "Alcance, etapas e inversión enviados.",
    items: [
      { name: "Prospecto industria G", detail: "Versión 2 lista para validar", due: "Hoy" },
      { name: "Prospecto salud H", detail: "Pendiente de dato técnico", due: "Mañana" },
    ],
  },
  {
    key: "negociacion",
    label: "Negociación",
    count: 2,
    description: "Ajustes finales y decisión comercial.",
    items: [
      { name: "Prospecto logística I", detail: "Revisión de alcance y tiempos", due: "Hoy" },
      { name: "Prospecto consumo J", detail: "Validación administrativa", due: "Esta semana" },
    ],
  },
  {
    key: "ganado",
    label: "Ganado / Handoff",
    count: 1,
    description: "Alta y transferencia a operación.",
    items: [
      { name: "Nuevo cliente demo", detail: "Crear ficha, proyecto y responsables", due: "Hoy" },
    ],
  },
];

export const salesOpportunities: SalesOpportunity[] = [
  {
    id: "opp-001",
    name: "Prospecto industria G",
    sector: "Industria",
    source: "Inbound",
    stage: "propuesta",
    owner: "Comercial + Estrategia",
    fit: 91,
    nextAction: "Validar alcance e inversión de la versión 2",
    due: "Hoy",
    status: "Aprobación",
    potential: "Alto",
  },
  {
    id: "opp-002",
    name: "Prospecto energía E",
    sector: "Energía",
    source: "Referido",
    stage: "discovery",
    owner: "Comercial + Operaciones",
    fit: 86,
    nextAction: "Cerrar mapa de procesos y prioridades",
    due: "Jueves",
    status: "En curso",
    potential: "Alto",
  },
  {
    id: "opp-003",
    name: "Prospecto logística I",
    sector: "Logística",
    source: "Outbound",
    stage: "negociacion",
    owner: "Dirección",
    fit: 84,
    nextAction: "Confirmar etapa inicial y cronograma",
    due: "Hoy",
    status: "Atención",
    potential: "Alto",
  },
  {
    id: "opp-004",
    name: "Prospecto educación D",
    sector: "Educación",
    source: "Evento",
    stage: "calificado",
    owner: "Comercial",
    fit: 77,
    nextAction: "Agendar discovery con decisor y operación",
    due: "Esta semana",
    status: "En curso",
    potential: "Medio",
  },
  {
    id: "opp-005",
    name: "Prospecto salud H",
    sector: "Salud",
    source: "Inbound",
    stage: "propuesta",
    owner: "Comercial + Tecnología",
    fit: 73,
    nextAction: "Resolver dato técnico antes de reenviar propuesta",
    due: "Mañana",
    status: "Atención",
    potential: "Medio",
  },
];

export const salesFollowUps: SalesFollowUp[] = [
  { title: "Revisar propuesta antes de enviar versión final", account: "Prospecto industria G", owner: "Dirección", due: "Hoy · 15:00", priority: "Alta", href: "/v2/propuestas" },
  { title: "Confirmar participantes del discovery", account: "Prospecto energía E", owner: "Comercial", due: "Hoy · 17:00", priority: "Alta", href: "/v2/discovery" },
  { title: "Retomar oportunidad sin actividad reciente", account: "Prospecto movilidad C", owner: "Comercial", due: "Mañana", priority: "Media", href: "/v2/oportunidades" },
  { title: "Completar información técnica faltante", account: "Prospecto salud H", owner: "Tecnología", due: "Mañana", priority: "Media", href: "/v2/propuestas" },
];

export const handoffSteps = [
  { number: "01", title: "Cerrar acuerdo", detail: "Alcance, etapas, inversión, responsables y condiciones confirmadas." },
  { number: "02", title: "Crear Cliente 360°", detail: "Alta de la cuenta con todo el contexto acumulado durante ventas." },
  { number: "03", title: "Crear operación", detail: "Proyecto inicial, proceso, hitos, responsables y dependencias." },
  { number: "04", title: "Transferir conocimiento", detail: "Discovery, propuesta, decisiones, documentos y riesgos disponibles para el equipo." },
  { number: "05", title: "Activar seguimiento", detail: "Próximos pasos, reuniones, indicadores y revisión de onboarding." },
];

export function salesStageLabel(stage: SalesStageKey) {
  return salesStages.find((item) => item.key === stage)?.label ?? stage;
}
