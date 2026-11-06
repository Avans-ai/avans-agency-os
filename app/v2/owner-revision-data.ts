export type RevisionArea = "operaciones" | "finanzas" | "rrhh" | "gerencia";
export type RevisionField = { key: string; label: string; type?: "text" | "date" | "select"; required?: boolean; options?: string[] };
export type RevisionRow = { id: string; [key: string]: string };
export type RevisionModule = { id: string; label: string; description: string; note: string; fields: RevisionField[]; columns: string[]; states: string[]; rows: RevisionRow[] };
export const ownerRevisionTabs: Record<RevisionArea, { id: string; label: string }[]> = {
  operaciones: [{ id: "general", label: "Ejecución y procesos" }, { id: "clientes", label: "Clientes y conocimiento" }],
  finanzas: [{ id: "general", label: "Gestión financiera" }, { id: "forecast", label: "Forecast" }],
  rrhh: [{ id: "general", label: "Equipo, capacidad y continuidad" }, { id: "burbujas", label: "Burbujas" }, { id: "contractors", label: "Contractors" }, { id: "talentos", label: "Pull de talentos" }],
  gerencia: [{ id: "general", label: "Visión ejecutiva" }, { id: "planificacion", label: "Planificación" }],
};
export function isRevisionArea(area: string): area is RevisionArea { return Object.prototype.hasOwnProperty.call(ownerRevisionTabs, area); }
export const revisionClients = ["Epsa", "ACA", "Grupo Portland", "Edinovo", "Lider Energy"];
export const revisionModules: Record<string, RevisionModule> = {
  burbujas: {
    id: "burbujas", label: "Burbujas", description: "Equipos y clientes vinculados en un mismo espacio de trabajo.",
    note: "La revisión define Burbujas como equipos y clientes. Los campos de esta demo son una propuesta para validar; no sustituyen capacidad, asignaciones ni permisos.",
    states: ["En diseño", "Activa", "Requiere cobertura"], columns: ["title", "clients", "team", "owner", "status"],
    fields: [{ key: "title", label: "Burbuja", required: true }, { key: "clients", label: "Clientes relacionados", required: true }, { key: "team", label: "Equipo / perfiles", required: true }, { key: "owner", label: "Responsable", required: true }, { key: "backup", label: "Cobertura / respaldo" }, { key: "status", label: "Estado", type: "select", required: true, options: ["En diseño", "Activa", "Requiere cobertura"] }],
    rows: [
      { id: "burbuja-01", title: "Burbuja 01 · demo", clients: "Epsa · ACA", team: "Cuenta 01 · Diseño 01 · Performance 01", owner: "Operaciones 01", backup: "Cuenta 02 · cobertura por validar", status: "Activa" },
      { id: "burbuja-02", title: "Burbuja 02 · demo", clients: "Grupo Portland · Edinovo", team: "Cuenta 02 · Estrategia 01 · Contenido 01", owner: "Operaciones 01", backup: "Especialista de respaldo pendiente", status: "Requiere cobertura" },
      { id: "burbuja-03", title: "Burbuja 03 · demo", clients: "Lider Energy", team: "Cuenta 01 · Contenido 01", owner: "Operaciones 01", backup: "Asignaciones a revisar", status: "En diseño" },
    ],
  },
  contractors: {
    id: "contractors", label: "Contractors", description: "Gestión de contratos, CDC, valores medulares y ausencias programadas.",
    note: "Se conservan los términos del mapa. El significado y los criterios de CDC y valores medulares todavía no están definidos: no se calculan puntajes ni se infiere información laboral.",
    states: ["Borrador", "En revisión", "Vigente", "Finalizado"], columns: ["title", "specialty", "contract", "absenceStart", "status"],
    fields: [{ key: "title", label: "Perfil / contractor", required: true }, { key: "specialty", label: "Especialidad", required: true }, { key: "contract", label: "Referencia de contrato", required: true }, { key: "cdc", label: "CDC · definición pendiente" }, { key: "values", label: "Valores medulares · criterios pendientes" }, { key: "absenceStart", label: "Ausencia programada · desde", type: "date" }, { key: "absenceEnd", label: "Ausencia programada · hasta", type: "date" }, { key: "backup", label: "Cobertura prevista" }, { key: "status", label: "Estado del contrato", type: "select", required: true, options: ["Borrador", "En revisión", "Vigente", "Finalizado"] }],
    rows: [
      { id: "contractor-01", title: "Especialista 01 · demo", specialty: "Diseño", contract: "CT-DEMO-001 · documento ficticio", cdc: "Por definir con Avans", values: "Criterios por definir", absenceStart: "", absenceEnd: "", backup: "Asignar respaldo", status: "En revisión" },
      { id: "contractor-02", title: "Especialista 02 · demo", specialty: "Performance", contract: "CT-DEMO-002 · documento ficticio", cdc: "Por definir con Avans", values: "Criterios por definir", absenceStart: "", absenceEnd: "", backup: "Performance 01", status: "Vigente" },
    ],
  },
  talentos: {
    id: "talentos", label: "Pull de talentos", description: "Formularios y perfiles para organizar la disponibilidad de talento.",
    note: "Nombre conservado tal como figura en la revisión. El formulario es una simulación interna: no publica una convocatoria, no recibe postulaciones reales ni envía mensajes.",
    states: ["Recibido", "Por revisar", "En conversación", "Disponible", "Archivado"], columns: ["title", "specialty", "availability", "origin", "status"],
    fields: [{ key: "title", label: "Nombre del perfil demo", required: true }, { key: "specialty", label: "Especialidad", required: true }, { key: "skills", label: "Habilidades / experiencia" }, { key: "availability", label: "Disponibilidad", required: true }, { key: "origin", label: "Origen / formulario" }, { key: "owner", label: "Responsable de revisión", required: true }, { key: "status", label: "Estado", type: "select", required: true, options: ["Recibido", "Por revisar", "En conversación", "Disponible", "Archivado"] }],
    rows: [
      { id: "talento-01", title: "Perfil A · ficticio", specialty: "Contenido", skills: "Redacción · edición", availability: "Por confirmar", origin: "Formulario demo", owner: "RRHH 01", status: "Recibido" },
      { id: "talento-02", title: "Perfil B · ficticio", specialty: "Desarrollo web", skills: "WordPress · interfaces", availability: "Parcial · ejemplo", origin: "Referencia demo", owner: "RRHH 01", status: "Disponible" },
    ],
  },
  planificacion: {
    id: "planificacion", label: "Planificación", description: "Prioridades, riesgos, responsables y plazos conectados con la ejecución.",
    note: "La revisión incorpora Planificación a Gerencia. Este tablero propone una forma de organizar iniciativas; no modifica presupuestos, proyectos o compromisos externos.",
    states: ["Propuesta", "Priorizada", "En ejecución", "Bloqueada", "Cerrada"], columns: ["title", "area", "priority", "owner", "due", "status"],
    fields: [{ key: "title", label: "Iniciativa / objetivo", required: true }, { key: "area", label: "Área", type: "select", required: true, options: ["Operaciones", "Ventas", "Finanzas", "RRHH", "Gerencia"] }, { key: "priority", label: "Prioridad", type: "select", options: ["Alta", "Media", "Baja"], required: true }, { key: "owner", label: "Responsable", required: true }, { key: "due", label: "Plazo objetivo", type: "date" }, { key: "risk", label: "Riesgo / dependencia" }, { key: "outcome", label: "Resultado esperado" }, { key: "status", label: "Estado", type: "select", required: true, options: ["Propuesta", "Priorizada", "En ejecución", "Bloqueada", "Cerrada"] }],
    rows: [
      { id: "plan-01", title: "Validar arquitectura del demo", area: "Gerencia", priority: "Alta", owner: "Dirección · demo", due: "", risk: "Revisión del equipo pendiente", outcome: "Alcance funcional aprobado", status: "En ejecución" },
      { id: "plan-02", title: "Revisar cobertura por burbuja", area: "RRHH", priority: "Media", owner: "Operaciones 01", due: "", risk: "Dependencia de perfiles críticos", outcome: "Equipos y clientes con cobertura", status: "Propuesta" },
      { id: "plan-03", title: "Preparar traspaso a la agencia", area: "Operaciones", priority: "Alta", owner: "Plataforma · demo", due: "", risk: "Requiere aprobación y accesos de destino", outcome: "Código y checklist de traspaso", status: "Propuesta" },
    ],
  },
};

export type ForecastInputs = { invoiced: number; collected: number; overdue: number; possible: number; probability: number; costs: number };
export function calculateRevisionForecast(input: ForecastInputs) {
  const values = Object.values(input);
  if (values.some(value => !Number.isFinite(value) || value < 0)) return { error: "Completá todos los importes con números válidos no negativos." } as const;
  if (input.probability > 100) return { error: "La probabilidad debe estar entre 0 y 100." } as const;
  if (input.collected > input.invoiced) return { error: "En este ejemplo simplificado, lo cobrado no puede superar lo facturado." } as const;
  const balance = input.invoiced - input.collected;
  if (input.overdue > balance) return { error: "La deuda vencida es parte del saldo; no puede superarlo." } as const;
  const weighted = input.possible * input.probability / 100;
  return { balance, weighted, projected: input.invoiced + weighted, contribution: input.invoiced + weighted - input.costs } as const;
}
