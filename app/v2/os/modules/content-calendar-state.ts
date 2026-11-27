/* Estado del Calendario de contenidos en la URL (search params).
 * Vista, mes, fecha seleccionada, filtros y búsqueda viajan en la URL para que «Volver»
 * desde un contenido recupere el calendario exactamente como estaba. El contenido abierto
 * se indica con `pieza` (se acepta `registro`, de enlaces anteriores y notificaciones).
 * Puro: sin React ni almacenamiento. */

export const CALENDAR_VIEWS = ["mes", "semana", "dia", "lista", "tablero"] as const;
export type CalendarView = typeof CALENDAR_VIEWS[number];
export const CALENDAR_VIEW_LABEL: Record<CalendarView, string> = { mes: "Mes", semana: "Semana", dia: "Día", lista: "Lista", tablero: "Tablero" };
/** Fecha de referencia de la vista previa (los datos demo están armados alrededor de ella). */
export const CALENDAR_REFERENCE = "2026-11-20";
export type CalendarState = {
  view: CalendarView;
  /** Día de referencia (AAAA-MM-DD) para mes, semana y día. */
  date: string;
  channel: string;
  /** "todos", número de etapa (1–8) o nombre de estado. */
  stage: string;
  axis: string;
  owner: string;
  plan: string;
  /** Lista y tablero: "todos", "sin-fecha" o AAAA-MM. */
  period: string;
  query: string;
  piece: string | null;
};
const PARAM: Record<Exclude<keyof CalendarState, "piece">, string> = { view: "vista", date: "fecha", channel: "canal", stage: "etapa", axis: "eje", owner: "resp", plan: "plan", period: "periodo", query: "q" };
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function isoDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function validDay(value?: string | null): value is string {
  if (!value || !DAY.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00`);
  return !Number.isNaN(parsed.valueOf()) && isoDay(parsed) === value;
}
const clean = (value: string | null, max = 120) => (value || "").replace(/[\u0000-\u001f]/g, "").slice(0, max);

export function readCalendarState(params: URLSearchParams, defaultView: CalendarView = "mes"): CalendarState {
  const view = (CALENDAR_VIEWS as readonly string[]).includes(params.get("vista") || "") ? params.get("vista") as CalendarView : defaultView;
  const month = params.get("mes") || "";
  const day = params.get("fecha");
  const date = validDay(day) ? day : MONTH.test(month) ? (month === CALENDAR_REFERENCE.slice(0, 7) ? CALENDAR_REFERENCE : `${month}-01`) : CALENDAR_REFERENCE;
  const legacyStep = params.get("paso");
  const stage = clean(params.get("etapa")) || (legacyStep && /^[1-8]$/.test(legacyStep) ? legacyStep : "") || clean(params.get("estado")) || "todos";
  const period = params.get("periodo") || "";
  return {
    view, date,
    channel: clean(params.get("canal")) || "todos",
    stage,
    axis: clean(params.get("eje")) || "todos",
    owner: clean(params.get("resp")) || "todos",
    plan: clean(params.get("plan")) || "todos",
    period: period === "sin-fecha" || MONTH.test(period) ? period : "todos",
    query: clean(params.get("q"), 80),
    piece: clean(params.get("pieza")) || clean(params.get("registro")) || null,
  };
}

/** Nueva query con los cambios pedidos; conserva los parámetros ajenos al calendario (p. ej. `seccion`). */
export function calendarQuery(params: URLSearchParams, patch: Partial<CalendarState>, defaultView: CalendarView = "mes") {
  const next = new URLSearchParams(params.toString());
  // Los alias anteriores se normalizan al escribir.
  for (const legacy of ["paso", "estado", "registro"]) next.delete(legacy);
  const current = readCalendarState(params, defaultView);
  const state: CalendarState = { ...current, ...patch };
  for (const [key, name] of Object.entries(PARAM) as [Exclude<keyof CalendarState, "piece">, string][]) {
    const value = state[key];
    const isDefault = key === "view" ? value === defaultView : key === "date" ? false : key === "query" ? !value : value === "todos" || !value;
    if (isDefault) next.delete(name); else next.set(name, String(value));
  }
  next.set("mes", state.date.slice(0, 7));
  // `fecha` solo se escribe cuando no se deduce del mes (primer día o día de referencia).
  const implied = state.date.slice(0, 7) === CALENDAR_REFERENCE.slice(0, 7) ? CALENDAR_REFERENCE : `${state.date.slice(0, 7)}-01`;
  if (state.date === implied) next.delete("fecha");
  if (state.piece) next.set("pieza", state.piece); else next.delete("pieza");
  if (!state.piece) next.delete("volver");
  return next;
}

export function calendarHref(pathname: string, params: URLSearchParams, patch: Partial<CalendarState>, defaultView: CalendarView = "mes") {
  const query = calendarQuery(params, patch, defaultView).toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}

/** Ruta de un contenido abierto desde otra sección (plan, resumen): el calendario del mes con la pieza. */
export function pieceHref(base: string, id: string, date?: string) {
  const params = new URLSearchParams();
  params.set("seccion", "calendario");
  if (date && validDay(date)) params.set("mes", date.slice(0, 7));
  params.set("pieza", id);
  return `${base}?${params.toString()}`;
}

/** Días visibles para la vista (lunes a domingo). */
export function calendarDays(date: string, view: CalendarView) {
  const anchor = new Date(`${date}T12:00:00`);
  if (view === "dia") return [isoDay(anchor)];
  const start = new Date(anchor);
  if (view === "mes") start.setDate(1);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const count = view === "mes" ? 42 : 7;
  const days = Array.from({ length: count }, (_, index) => { const day = new Date(start); day.setDate(day.getDate() + index); return isoDay(day); });
  // Un mes que entra en cinco semanas no muestra una sexta fila vacía.
  return view === "mes" && days.slice(35).every((day) => day.slice(0, 7) !== date.slice(0, 7)) ? days.slice(0, 35) : days;
}

export function shiftDate(date: string, view: CalendarView, direction: number) {
  const next = new Date(`${date}T12:00:00`);
  if (view === "mes" || view === "lista" || view === "tablero") next.setMonth(next.getMonth() + direction, 1);
  else next.setDate(next.getDate() + direction * (view === "semana" ? 7 : 1));
  return isoDay(next);
}
