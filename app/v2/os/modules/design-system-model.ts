/* Diseño de marca · modelo del Design System (lineamientos permanentes).
 * Funciones puras: color (HEX → RGB, contraste WCAG 2.x), tokens de marca derivados
 * de los recursos guardados y agrupación de recursos por parte del documento.
 * No hay persistencia acá: los recursos viven en client:<slug>:module:diseno-marca:sistema. */
import type { ModuleRecord } from "./types";

/** Partes del documento de lineamientos (área A). */
export const GUIDELINE_PARTS = [
  { id: "portada", label: "Resumen" },
  { id: "identidad", label: "Identidad" },
  { id: "color", label: "Sistema de color" },
  { id: "tipografia", label: "Tipografía" },
  { id: "recursos", label: "Recursos gráficos" },
  { id: "componentes", label: "Componentes" },
  { id: "tono", label: "Tono y comunicación" },
  { id: "moodboard", label: "Moodboard y referencias" },
] as const;
export type GuidelinePart = typeof GUIDELINE_PARTS[number]["id"];

/** Tipos de recurso del Design System que se muestran en cada parte. */
export const PART_KINDS: Record<Exclude<GuidelinePart, "portada">, string[]> = {
  identidad: ["Logo", "Aplicación"],
  color: ["Color"],
  tipografia: ["Tipografía"],
  recursos: ["Recurso gráfico"],
  componentes: ["Componente"],
  tono: ["Tono"],
  moodboard: ["Moodboard"],
};
export function partOfKind(kind: string): GuidelinePart {
  const found = (Object.entries(PART_KINDS) as [GuidelinePart, string[]][]).find(([, kinds]) => kinds.includes(kind));
  return found?.[0] ?? "portada";
}

export const LOGO_VARIANTS = ["Principal", "Secundario", "Isotipo", "Monocromático", "Negativo", "Uso incorrecto"] as const;
export const COLOR_GROUPS = ["Principal", "Secundario", "De apoyo"] as const;
export const TYPE_ROLES = ["Titulares", "Subtítulos", "Textos", "Alternativa"] as const;
export const GRAPHIC_KINDS = ["Iconografía", "Patrón", "Textura", "Ilustración", "Tratamiento fotográfico", "Estilo de imagen", "Elemento propio"] as const;
export const COMPONENT_KINDS = ["Botón", "Tarjeta", "Placa", "Carrusel", "Composición", "Plantilla", "Recurso para redes", "Banner", "Aplicación comercial"] as const;
export const TONE_KINDS = ["Personalidad", "Voz", "Ejemplo correcto", "Ejemplo a evitar"] as const;
export const MOOD_KINDS = ["Referencia de diseño", "Estilo", "Fotografía", "Tratamiento", "Composición", "Inspiración", "Aplicación"] as const;
/** Subtipo sugerido según el tipo de recurso. */
export function subtypesFor(kind: string): readonly string[] {
  switch (kind) {
    case "Logo": return LOGO_VARIANTS;
    case "Color": return COLOR_GROUPS;
    case "Tipografía": return TYPE_ROLES;
    case "Recurso gráfico": return GRAPHIC_KINDS;
    case "Componente": return COMPONENT_KINDS;
    case "Tono": return TONE_KINDS;
    case "Moodboard": return MOOD_KINDS;
    default: return [];
  }
}

/* ───────── Color ───────── */
export function validHex(value?: string): value is string {
  return /^#[a-f\d]{6}$/i.test(value ?? "");
}
export function hexToRgb(hex: string): [number, number, number] | null {
  if (!validHex(hex)) return null;
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbLabel(hex: string) {
  const rgb = hexToRgb(hex);
  return rgb ? `RGB ${rgb.join(", ")}` : "";
}
/** Luminancia relativa según WCAG 2.x. */
export function relativeLuminance(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** Relación de contraste WCAG (1 a 21), redondeada a dos decimales. */
export function contrastRatio(a: string, b: string) {
  const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
}
export type WcagLevel = "AAA" | "AA" | "AA grande" | "No apto";
export function wcagLevel(ratio: number): WcagLevel {
  return ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA grande" : "No apto";
}
/** Texto legible (negro o blanco) sobre un fondo. */
export function readableInk(bg: string) {
  return contrastRatio(bg, "#000000") >= contrastRatio(bg, "#ffffff") ? "#111111" : "#ffffff";
}

export type ColorPair = { bg: string; fg: string; bgName: string; fgName: string; ratio: number; level: WcagLevel };
/** Combinaciones entre colores de la paleta, ordenadas de mayor a menor contraste. */
export function colorPairs(colors: { name: string; hex: string }[]): ColorPair[] {
  const valid = colors.filter((c) => validHex(c.hex));
  const pairs: ColorPair[] = [];
  valid.forEach((bg, i) => valid.forEach((fg, j) => {
    if (i === j || bg.hex.toLowerCase() === fg.hex.toLowerCase()) return;
    const ratio = contrastRatio(bg.hex, fg.hex);
    pairs.push({ bg: bg.hex, fg: fg.hex, bgName: bg.name, fgName: fg.name, ratio, level: wcagLevel(ratio) });
  }));
  return pairs.sort((a, b) => b.ratio - a.ratio);
}

/* ───────── Tokens de marca ───────── */
export type BrandTokens = {
  primary: string; secondary: string; accent: string; ink: string; paper: string;
  heading: string; body: string; headingWeight: number; brandName: string;
};
const DEFAULT_TOKENS: BrandTokens = {
  primary: "#1e1e1e", secondary: "#ff897a", accent: "#ffd2c4", ink: "#1e1e1e", paper: "#f6f4ee",
  heading: "var(--av-font-body)", body: "var(--av-font-body)", headingWeight: 600, brandName: "Marca",
};

/** Familias tipográficas seguras: solo las cargadas por la app o pilas del sistema. */
export function fontStack(family?: string) {
  const name = (family || "").trim();
  if (/^figtree$/i.test(name)) return 'var(--font-figtree), "Figtree", system-ui, sans-serif';
  if (/^syne$/i.test(name)) return 'var(--font-design-syne), "Syne", var(--font-figtree), system-ui, sans-serif';
  if (/^(georgia|serif)$/i.test(name)) return 'Georgia, "Times New Roman", serif';
  if (/^(mono|monospace)$/i.test(name)) return 'ui-monospace, "SFMono-Regular", Menlo, monospace';
  if (/^(arial|helvetica|system-ui)$/i.test(name)) return `${name}, system-ui, sans-serif`;
  return /^[\w\s-]{1,60}$/.test(name) && name ? `"${name}", var(--font-figtree), system-ui, sans-serif` : "var(--font-figtree), system-ui, sans-serif";
}
export function firstWeight(value?: string) {
  const match = (value || "").match(/\b([1-9]00)\b/g);
  return match ? Number(match[match.length - 1]) : 400;
}

const active = (r: ModuleRecord) => r.values.estado !== "Archivado";
/** Tokens derivados de los recursos aprobados o en borrador del Design System. */
export function brandTokens(records: ModuleRecord[], brandName = "Marca"): BrandTokens {
  const colors = records.filter((r) => r.values.tipo === "Color" && active(r) && validHex(r.values.valor));
  const byGroup = (group: string) => colors.filter((r) => (r.values.grupo || r.values.subtipo) === group);
  const principal = byGroup("Principal"), secondary = byGroup("Secundario"), support = byGroup("De apoyo");
  const ordered = [...principal, ...secondary, ...support, ...colors.filter((c) => !principal.includes(c) && !secondary.includes(c) && !support.includes(c))];
  const hex = (r?: ModuleRecord) => r?.values.valor;
  const darkest = [...colors].sort((a, b) => relativeLuminance(a.values.valor) - relativeLuminance(b.values.valor))[0];
  const lightest = [...colors].sort((a, b) => relativeLuminance(b.values.valor) - relativeLuminance(a.values.valor))[0];
  const fonts = records.filter((r) => r.values.tipo === "Tipografía" && active(r));
  const heading = fonts.find((r) => (r.values.subtipo || r.values.funcion || "").includes("Titular")) ?? fonts[0];
  const body = fonts.find((r) => (r.values.subtipo || r.values.funcion || "").includes("Texto")) ?? fonts[1] ?? heading;
  return {
    primary: hex(ordered[0]) ?? DEFAULT_TOKENS.primary,
    secondary: hex(ordered[1]) ?? DEFAULT_TOKENS.secondary,
    accent: hex(ordered[2]) ?? hex(ordered[1]) ?? DEFAULT_TOKENS.accent,
    ink: darkest && relativeLuminance(darkest.values.valor) < 0.08 ? darkest.values.valor : DEFAULT_TOKENS.ink,
    paper: lightest && relativeLuminance(lightest.values.valor) > 0.7 ? lightest.values.valor : DEFAULT_TOKENS.paper,
    heading: heading ? fontStack(heading.values.valor) : DEFAULT_TOKENS.heading,
    body: body ? fontStack(body.values.valor) : DEFAULT_TOKENS.body,
    headingWeight: heading ? firstWeight(heading.values.variante) : DEFAULT_TOKENS.headingWeight,
    brandName,
  };
}
/** Variables CSS para renderizar componentes con los tokens del cliente. */
export function tokenStyle(t: BrandTokens): Record<string, string | number> {
  return {
    "--b-primary": t.primary, "--b-secondary": t.secondary, "--b-accent": t.accent, "--b-ink": t.ink, "--b-paper": t.paper,
    "--b-on-primary": readableInk(t.primary), "--b-on-secondary": readableInk(t.secondary), "--b-on-accent": readableInk(t.accent),
    "--b-heading": t.heading, "--b-body": t.body, "--b-heading-weight": t.headingWeight,
  };
}

/** Lista separada por comas, punto y coma o saltos de línea. */
export function splitList(value?: string) {
  return (value || "").split(/[\n;,]+/).map((item) => item.trim()).filter(Boolean);
}
