/* Períodos de medición. Fechas en texto AAAA-MM-DD (hora de Buenos Aires) para que las
 * instantáneas de reportes sean reproducibles y comparables sin depender de la zona horaria. */

export type PeriodKind = "semana" | "mes" | "personalizado";
export type MetricPeriod = { kind: PeriodKind; start: string; end: string; label: string };

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value?: string): value is string {
  if (!value || !ISO.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function toDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`);
}
function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}
export function addDays(iso: string, days: number) {
  const date = toDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}
export function daysBetween(from: string, to: string) {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86400000);
}

/** Fecha de hoy en Buenos Aires (AAAA-MM-DD). */
export function todayIso(now: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(now);
}

function capitalize(text: string) {
  return text.charAt(0).toLocaleUpperCase("es") + text.slice(1);
}
function day(iso: string) {
  return Number(iso.slice(8, 10));
}
function month(iso: string) {
  return MONTHS[Number(iso.slice(5, 7)) - 1];
}
function year(iso: string) {
  return iso.slice(0, 4);
}

/** «12 de octubre al 8 de noviembre de 2026» (agrupa mes y año cuando coinciden). */
export function rangeLabel(start: string, end: string) {
  if (start === end) return `${day(start)} de ${month(start)} de ${year(start)}`;
  if (year(start) !== year(end)) return `${day(start)} de ${month(start)} de ${year(start)} al ${day(end)} de ${month(end)} de ${year(end)}`;
  if (month(start) !== month(end)) return `${day(start)} de ${month(start)} al ${day(end)} de ${month(end)} de ${year(end)}`;
  return `${day(start)} al ${day(end)} de ${month(end)} de ${year(end)}`;
}
export function shortDate(iso?: string) {
  if (!isIsoDate(iso)) return "Sin fecha";
  return `${day(iso)} ${month(iso).slice(0, 3)}`;
}
export function longDate(iso?: string) {
  if (!isIsoDate(iso)) return "Sin fecha";
  return `${day(iso)} de ${month(iso)} de ${year(iso)}`;
}

export function monthPeriod(yearMonth: string): MetricPeriod {
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) throw new Error("Mes inválido: usá AAAA-MM.");
  const start = `${yearMonth}-01`;
  const next = toDate(start);
  next.setUTCMonth(next.getUTCMonth() + 1);
  next.setUTCDate(0);
  return { kind: "mes", start, end: toIso(next), label: `${capitalize(month(start))} ${year(start)}` };
}

/** Semana de lunes a domingo que contiene la fecha. */
export function weekPeriod(iso: string): MetricPeriod {
  if (!isIsoDate(iso)) throw new Error("Fecha inválida.");
  const date = toDate(iso);
  const offset = (date.getUTCDay() + 6) % 7;
  const start = addDays(iso, -offset);
  const end = addDays(start, 6);
  return { kind: "semana", start, end, label: `Semana del ${rangeLabel(start, end)}` };
}

export function customPeriod(start: string, end: string): MetricPeriod {
  if (!isIsoDate(start) || !isIsoDate(end)) throw new Error("Completá las fechas de inicio y cierre.");
  if (start > end) throw new Error("La fecha de inicio tiene que ser anterior o igual al cierre.");
  if (daysBetween(start, end) > 400) throw new Error("El período no puede superar los 400 días.");
  return { kind: "personalizado", start, end, label: capitalize(rangeLabel(start, end)) };
}

/** Período inmediatamente anterior y de igual extensión (mes anterior para un mes). */
export function previousPeriod(period: MetricPeriod): MetricPeriod {
  if (period.kind === "mes") return monthPeriod(addDays(period.start, -1).slice(0, 7));
  if (period.kind === "semana") return weekPeriod(addDays(period.start, -7));
  const length = daysBetween(period.start, period.end);
  const end = addDays(period.start, -1);
  return customPeriod(addDays(end, -length), end);
}

export function inPeriod(iso: string | undefined, period: Pick<MetricPeriod, "start" | "end">) {
  return isIsoDate(iso) && iso >= period.start && iso <= period.end;
}

export function currentMonthPeriod(today: string = todayIso()) {
  return monthPeriod(today.slice(0, 7));
}

export function isPeriod(value: unknown): value is MetricPeriod {
  const period = value as MetricPeriod;
  return Boolean(period) && ["semana", "mes", "personalizado"].includes(period.kind) && isIsoDate(period.start) && isIsoDate(period.end) && period.start <= period.end && typeof period.label === "string";
}
