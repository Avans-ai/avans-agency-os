export type AttentionKind = "decision" | "blocker" | "alert" | "approval" | "learning";

export type AttentionItem = {
  id: string;
  kind: AttentionKind;
  priority: "Crítica" | "Alta" | "Media";
  title: string;
  context: string;
  reason: string;
  recommendation: string;
  owner: string;
  due: string;
};

export const avansClients = ["Epsa", "ACA", "Grupo Portland", "Edinovo", "Lider Energy"];

export const attentionItems: AttentionItem[] = [
  {
    id: "att-001",
    kind: "alert",
    priority: "Crítica",
    title: "Epsa · Campaña requiere revisión",
    context: "Campaign Intelligence · Performance",
    reason: "El sistema detectó una variación relevante frente al comportamiento esperado y abrió una excepción para revisión humana.",
    recommendation: "Revisar la causa antes de modificar inversión y dejar registrada la decisión para medir el resultado.",
    owner: "Performance",
    due: "Hoy · 12:30",
  },
  {
    id: "att-002",
    kind: "blocker",
    priority: "Alta",
    title: "ACA · Proceso bloqueado por información pendiente",
    context: "Process Engine · Operación de cuenta",
    reason: "Falta un insumo requerido para continuar el siguiente paso del workflow y el sistema evitó avanzar con datos incompletos.",
    recommendation: "Solicitar el dato faltante y continuar automáticamente cuando se cumpla la precondición.",
    owner: "Cuenta",
    due: "Hoy · 14:00",
  },
  {
    id: "att-003",
    kind: "approval",
    priority: "Alta",
    title: "Grupo Portland · Propuesta lista para validar",
    context: "Decision Center · Propuesta comercial",
    reason: "Diagnóstico, etapas y entregables están completos; inversión y alcance final requieren validación humana.",
    recommendation: "Validar alcance e inversión antes de generar la versión final para el cliente.",
    owner: "Dirección",
    due: "Hoy · 16:00",
  },
  {
    id: "att-004",
    kind: "learning",
    priority: "Media",
    title: "Edinovo · Nuevo aprendizaje para validar",
    context: "Learning Engine · Client Intelligence",
    reason: "El sistema encontró un patrón consistente entre piezas aprobadas y feedback reciente de la cuenta.",
    recommendation: "Validar el patrón antes de incorporarlo como criterio persistente del cliente.",
    owner: "Estrategia",
    due: "Mañana",
  },
];

export const stats = [
  { label: "Requieren atención", value: "7", detail: "3 de alta prioridad" },
  { label: "Procesos activos", value: "18", detail: "2 con bloqueo" },
  { label: "Acciones automáticas", value: "42", detail: "Hoy · sin errores críticos" },
  { label: "Aprendizajes nuevos", value: "8", detail: "3 esperan validación" },
];

export const automaticActivity = [
  ["09:42", "Onboarding", "Se verificaron requisitos de Lider Energy", "Completado"],
  ["09:35", "Reporting", "Se consolidaron métricas para Epsa", "Completado"],
  ["09:21", "Workflow", "Se creó una tarea desde un compromiso de ACA", "Completado"],
  ["08:58", "Campaign", "Se detectó una anomalía y se abrió una alerta para Grupo Portland", "Derivado"],
];

export const learningSignals = [
  {
    client: "Edinovo",
    signal: "Se detectó un patrón recurrente en feedback y aprobaciones que puede transformarse en una regla de contexto.",
    status: "Validar",
  },
  {
    client: "Lider Energy",
    signal: "Una dependencia operativa aparece repetidamente antes de determinados entregables y puede anticiparse desde el workflow.",
    status: "Propuesto",
  },
  {
    client: "Epsa",
    signal: "El sistema está midiendo el resultado posterior de una recomendación aprobada para definir si el criterio se conserva.",
    status: "Midiendo",
  },
];

export const intelligenceLoop = [
  "Observar",
  "Detectar",
  "Entender",
  "Recomendar",
  "Aprobar",
  "Ejecutar",
  "Medir",
  "Aprender",
];
