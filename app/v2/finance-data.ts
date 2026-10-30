export type FinanceDataStatus = "Disponible" | "Parcial" | "Pendiente";
export type FinanceCollectionStatus = "Por vencer" | "Vencida" | "En revisión";
export type FinanceMarginState = "Sano" | "Vigilar" | "Revisar";

export type FinanceClientRow = {
  clientSlug: string;
  client: string;
  billed: number;
  collected: number;
  deliveryCost: number;
  technologyCost: number;
  openBalance: number;
  nextAction: string;
  state: FinanceMarginState;
};

export type FinanceReceivable = {
  id: string;
  clientSlug: string;
  client: string;
  concept: string;
  amount: number;
  due: string;
  days: string;
  status: FinanceCollectionStatus;
  owner: string;
};

export type FinanceCostBucket = {
  label: string;
  amount: number;
  share: number;
  source: string;
  detail: string;
};

export type FinanceTechnologyCost = {
  label: string;
  amount: number;
  behavior: "Fijo" | "Variable" | "Mixto";
  allocation: string;
  detail: string;
};

export type FinanceSource = {
  name: string;
  status: FinanceDataStatus;
  role: string;
  method: string;
  update: string;
  href: string;
};

export const financePeriod = {
  label: "Septiembre 2026",
  currency: "ARS",
  mode: "Datos sintéticos para validar la arquitectura",
};

export const financeClientRows: FinanceClientRow[] = [
  {
    clientSlug: "epsa",
    client: "Epsa",
    billed: 3_100_000,
    collected: 2_450_000,
    deliveryCost: 1_350_000,
    technologyCost: 180_000,
    openBalance: 650_000,
    nextAction: "Conciliar saldo en revisión y validar imputación tecnológica",
    state: "Sano",
  },
  {
    clientSlug: "aca",
    client: "ACA",
    billed: 2_700_000,
    collected: 1_600_000,
    deliveryCost: 1_550_000,
    technologyCost: 120_000,
    openBalance: 1_100_000,
    nextAction: "Confirmar fecha de cobro y revisar esfuerzo operativo del período",
    state: "Vigilar",
  },
  {
    clientSlug: "grupo-portland",
    client: "Grupo Portland",
    billed: 2_400_000,
    collected: 1_650_000,
    deliveryCost: 1_000_000,
    technologyCost: 80_000,
    openBalance: 750_000,
    nextAction: "Vincular la siguiente etapa aprobada con forecast y capacidad",
    state: "Sano",
  },
  {
    clientSlug: "edinovo",
    client: "Edinovo",
    billed: 2_000_000,
    collected: 2_000_000,
    deliveryCost: 930_000,
    technologyCost: 90_000,
    openBalance: 0,
    nextAction: "Cerrar el período y registrar aprendizajes sobre horas imputadas",
    state: "Sano",
  },
  {
    clientSlug: "lider-energy",
    client: "Lider Energy",
    billed: 2_600_000,
    collected: 1_700_000,
    deliveryCost: 1_150_000,
    technologyCost: 160_000,
    openBalance: 900_000,
    nextAction: "Resolver saldo vencido antes de ampliar el alcance del onboarding",
    state: "Vigilar",
  },
];

export const financeReceivables: FinanceReceivable[] = [
  {
    id: "fc-aca-0926",
    clientSlug: "aca",
    client: "ACA",
    concept: "Servicio mensual · septiembre",
    amount: 1_100_000,
    due: "Hoy",
    days: "0 días",
    status: "Por vencer",
    owner: "Administración",
  },
  {
    id: "fc-lider-0926",
    clientSlug: "lider-energy",
    client: "Lider Energy",
    concept: "Onboarding y operación inicial",
    amount: 900_000,
    due: "Venció hace 8 días",
    days: "8 días",
    status: "Vencida",
    owner: "Administración + Cuentas",
  },
  {
    id: "fc-portland-0926",
    clientSlug: "grupo-portland",
    client: "Grupo Portland",
    concept: "Estrategia y producción",
    amount: 750_000,
    due: "En 5 días",
    days: "En término",
    status: "Por vencer",
    owner: "Administración",
  },
  {
    id: "fc-epsa-ajuste",
    clientSlug: "epsa",
    client: "Epsa",
    concept: "Ajuste de alcance y consumos",
    amount: 650_000,
    due: "Pendiente de conciliación",
    days: "Sin vencimiento confirmado",
    status: "En revisión",
    owner: "Finanzas + Cuentas",
  },
];

export const financeCostStructure: FinanceCostBucket[] = [
  {
    label: "Equipo interno asignado",
    amount: 4_000_000,
    share: 61,
    source: "Operaciones + RRHH",
    detail: "Costo imputado según asignaciones, capacidad y horas o unidades de trabajo validadas.",
  },
  {
    label: "Proveedores y especialistas",
    amount: 1_550_000,
    share: 23,
    source: "Comprobantes y proyectos",
    detail: "Freelancers, producción externa, licencias específicas y servicios vinculados a entregables.",
  },
  {
    label: "Tecnología e infraestructura",
    amount: 630_000,
    share: 10,
    source: "Plataformas y consumos",
    detail: "Hosting, base de datos, IA, mensajería, email, monitoreo e integraciones.",
  },
  {
    label: "Otros costos directos",
    amount: 430_000,
    share: 6,
    source: "Administración",
    detail: "Gastos reembolsables, traslados, producción menor y otros costos atribuibles al servicio.",
  },
];

export const financeTechnologyCosts: FinanceTechnologyCost[] = [
  {
    label: "Hosting y base de datos",
    amount: 210_000,
    behavior: "Mixto",
    allocation: "Base compartida + consumo por cliente",
    detail: "Aplicaciones, almacenamiento, transferencia, backups y entornos de prueba.",
  },
  {
    label: "IA y procesamiento",
    amount: 190_000,
    behavior: "Variable",
    allocation: "Uso medido por workflow, agente y cliente",
    detail: "Tokens, procesamiento, transcripción, embeddings y ejecuciones especializadas.",
  },
  {
    label: "Mensajería y email",
    amount: 120_000,
    behavior: "Variable",
    allocation: "Conversaciones, envíos y volumen",
    detail: "WhatsApp, proveedores de email, notificaciones y canales transaccionales.",
  },
  {
    label: "Integraciones y monitoreo",
    amount: 110_000,
    behavior: "Fijo",
    allocation: "Infraestructura común o contrato específico",
    detail: "Conectores, observabilidad, uptime, automatizadores y servicios auxiliares.",
  },
];

export const financeSources: FinanceSource[] = [
  {
    name: "Cliente 360°",
    status: "Disponible",
    role: "Clientes, servicios, alcance y responsables",
    method: "Dato nativo de Avans OS",
    update: "Continua",
    href: "/v2/clientes",
  },
  {
    name: "Operaciones y proyectos",
    status: "Disponible",
    role: "Asignaciones, frentes, entregables y esfuerzo",
    method: "Dato nativo de Avans OS",
    update: "Continua",
    href: "/v2/operaciones",
  },
  {
    name: "RRHH y capacidad",
    status: "Parcial",
    role: "Costo interno, disponibilidad y horas imputables",
    method: "Asignaciones disponibles; horas reales pendientes",
    update: "A definir",
    href: "/v2/rrhh",
  },
  {
    name: "Sistema administrativo / contable",
    status: "Pendiente",
    role: "Facturas, notas de crédito, cobranzas y comprobantes",
    method: "API, exportación o conector autorizado",
    update: "Prioridad de integración",
    href: "/v2/integraciones",
  },
  {
    name: "Banco y medios de cobro",
    status: "Pendiente",
    role: "Movimientos, conciliación y fecha efectiva de cobro",
    method: "API bancaria, extracto o importación controlada",
    update: "A definir",
    href: "/v2/integraciones",
  },
  {
    name: "Plataformas tecnológicas",
    status: "Parcial",
    role: "Consumos, planes, límites y costos por cliente",
    method: "API o exportación de billing",
    update: "Mensual + alertas",
    href: "/v2/integraciones",
  },
];

export const financeAccessModel = [
  {
    role: "Dirección / Gerencia",
    access: "Vista consolidada, margen, proyección, riesgos y decisiones.",
    restriction: "No modifica comprobantes de origen.",
  },
  {
    role: "Finanzas / Administración",
    access: "Facturación, cobranzas, conciliación, costos, ajustes y fuentes.",
    restriction: "Acciones sensibles auditadas y con trazabilidad.",
  },
  {
    role: "Líder de cuenta",
    access: "Estado de facturación, cobro y alcance de sus clientes.",
    restriction: "Margen y estructura de costos según permiso específico.",
  },
  {
    role: "Equipo",
    access: "Sólo asignaciones o datos necesarios para ejecutar el trabajo.",
    restriction: "Sin acceso a montos sensibles por defecto.",
  },
];
