/* PDF del reporte, generado en el navegador con pdf-lib (MIT) y la tipografía Figtree
 * embebida (OFL, public/fonts/figtree). Se dibuja a partir de la instantánea guardada:
 * el mismo snapshot produce siempre el mismo contenido. Gráficos vectoriales, A4 vertical,
 * saltos de página controlados y numeración «Página n de N». No envía nada. */
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import { longDate, shortDate } from "../metrics/period";
import { HEALTH_RULES, type HealthLevel } from "../metrics/service-health";
import { ITEM_KIND_LABEL, lightText, ORIGIN_LABEL, type ChartSpec, type DataOrigin, type ItemRef, type Metric, type ServiceSnapshot } from "../metrics/types";
import type { ReportSnapshot } from "./builders";

export type PdfAssets = { regular: Uint8Array; medium: Uint8Array; bold: Uint8Array; logo?: Uint8Array };

const hex = (value: string): RGB => rgb(parseInt(value.slice(1, 3), 16) / 255, parseInt(value.slice(3, 5), 16) / 255, parseInt(value.slice(5, 7), 16) / 255);
const C = {
  ink: hex("#15171a"), muted: hex("#4e4f4d"), line: hex("#dededa"), paper: hex("#f1f1ee"), white: hex("#ffffff"),
  coral: hex("#ff6c4c"), coralInk: hex("#7a2510"), coralSoft: hex("#ffe5d4"), teal: hex("#2f3b38"), tealSoft: hex("#e9edeb"), ash: hex("#adaeab"),
  success: hex("#3e7a5e"), warning: hex("#a8761f"), error: hex("#8c2b36"),
};
const LEVEL_COLOR: Record<HealthLevel, RGB> = { verde: C.success, amarillo: C.warning, rojo: C.error, gris: C.ash };
const W = 595.28, H = 841.89, M = 48, CW = W - 2 * M, TOP = H - 56, BOTTOM = 58;

type Fonts = { regular: PDFFont; medium: PDFFont; bold: PDFFont };

class Layout {
  page!: PDFPage;
  y = TOP;
  pages: PDFPage[] = [];
  constructor(private doc: PDFDocument, readonly fonts: Fonts, private onNewPage: (page: PDFPage, index: number) => void) {
    this.addPage();
  }
  addPage() {
    this.page = this.doc.addPage([W, H]);
    this.pages.push(this.page);
    this.y = TOP;
    this.onNewPage(this.page, this.pages.length - 1);
  }
  ensure(height: number) {
    if (this.y - height < BOTTOM) this.addPage();
  }
  gap(size: number) {
    this.y -= size;
  }
}

/** Solo caracteres que la fuente puede dibujar (el resto se reemplaza) y sin saltos internos. */
function clean(font: PDFFont, text: string) {
  const set = new Set(font.getCharacterSet());
  return Array.from(text.replace(/[\t\r]/g, " ")).map((char) => (set.has(char.codePointAt(0)!) ? char : char === "\n" ? " " : "?")).join("");
}
export function wrapText(font: PDFFont, text: string, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = clean(font, paragraph).split(/\s+/).filter(Boolean);
    let line = "";
    for (const raw of words) {
      let word = raw;
      while (font.widthOfTextAtSize(word, size) > width) {
        let cut = word.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(word.slice(0, cut), size) > width) cut -= 1;
        if (line) { lines.push(line); line = ""; }
        lines.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) { lines.push(line); line = word; } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

function text(l: Layout, value: string, options: { x?: number; size?: number; font?: PDFFont; color?: RGB; width?: number; lineGap?: number } = {}) {
  const size = options.size ?? 10;
  const font = options.font ?? l.fonts.regular;
  const width = options.width ?? CW;
  const leading = size * (options.lineGap ?? 1.38);
  for (const line of wrapText(font, value, size, width)) {
    l.ensure(leading);
    l.page.drawText(line, { x: options.x ?? M, y: l.y - size, size, font, color: options.color ?? C.ink });
    l.y -= leading;
  }
}
function measure(font: PDFFont, value: string, size: number, width: number, lineGap = 1.38) {
  return wrapText(font, value, size, width).length * size * lineGap;
}

function heading(l: Layout, value: string, size = 15, keepWith = 60) {
  l.ensure(size * 1.6 + keepWith);
  l.page.drawText(clean(l.fonts.bold, value), { x: M, y: l.y - size, size, font: l.fonts.bold, color: C.ink });
  l.y -= size * 1.6;
}
function eyebrow(l: Layout, value: string, keepWith = 40) {
  l.ensure(16 + keepWith);
  l.page.drawText(clean(l.fonts.medium, value.toLocaleUpperCase("es")), { x: M, y: l.y - 8, size: 8, font: l.fonts.medium, color: C.muted });
  l.y -= 16;
}
function rule(l: Layout, color = C.line) {
  l.page.drawLine({ start: { x: M, y: l.y }, end: { x: W - M, y: l.y }, thickness: 0.7, color });
}

function healthBadge(page: PDFPage, fonts: Fonts, level: HealthLevel, label: string, x: number, y: number) {
  const color = LEVEL_COLOR[level];
  page.drawCircle({ x: x + 4, y: y + 3.4, size: 4, color });
  // Ícono además del color: ✓ verde, ! amarillo, × rojo, – gris.
  const glyph = level === "verde" ? "✓" : level === "amarillo" ? "!" : level === "rojo" ? "×" : "–";
  const set = new Set(fonts.bold.getCharacterSet());
  const mark = set.has(glyph.codePointAt(0)!) ? glyph : level === "verde" ? "v" : level === "rojo" ? "x" : glyph;
  page.drawText(mark, { x: x + 12, y, size: 9, font: fonts.bold, color });
  page.drawText(clean(fonts.bold, label), { x: x + 22, y, size: 9, font: fonts.bold, color });
  return 22 + fonts.bold.widthOfTextAtSize(clean(fonts.bold, label), 9);
}

type Column = { title: string; width: number; align?: "right" };
function table(l: Layout, columns: Column[], rows: { cells: string[]; muted?: boolean[]; bold?: boolean }[], options: { size?: number } = {}) {
  const size = options.size ?? 9;
  const pad = 5;
  const drawHeader = () => {
    l.ensure(20);
    l.page.drawRectangle({ x: M, y: l.y - 16, width: CW, height: 16, color: C.paper });
    let x = M;
    for (const column of columns) {
      const label = clean(l.fonts.medium, column.title);
      const w = l.fonts.medium.widthOfTextAtSize(label, 8);
      l.page.drawText(label, { x: column.align === "right" ? x + column.width - pad - w : x + pad, y: l.y - 11, size: 8, font: l.fonts.medium, color: C.muted });
      x += column.width;
    }
    l.y -= 16;
  };
  drawHeader();
  for (const row of rows) {
    const font = row.bold ? l.fonts.medium : l.fonts.regular;
    // Primera línea del texto con el tamaño de la tabla; el detalle («\n…») más chico y atenuado.
    const wrapped = row.cells.map((cell, index) => {
      const [main, ...rest] = cell.split("\n");
      const width = columns[index].width - pad * 2;
      return [
        ...wrapText(font, main, size, width).map((line) => ({ line, size, muted: Boolean(row.muted?.[index]) })),
        ...(rest.length ? wrapText(l.fonts.regular, rest.join("\n"), size - 1, width).map((line) => ({ line, size: size - 1, muted: true })) : []),
      ];
    });
    const height = Math.max(...wrapped.map((lines) => lines.reduce((sum, item) => sum + item.size * 1.3, 0))) + pad * 2 - 2;
    if (l.y - height < BOTTOM) { l.addPage(); drawHeader(); }
    let x = M;
    wrapped.forEach((lines, index) => {
      const column = columns[index];
      let offset = 0;
      for (const item of lines) {
        const useFont = item.size < size ? l.fonts.regular : font;
        const w = useFont.widthOfTextAtSize(item.line, item.size);
        l.page.drawText(item.line, { x: column.align === "right" ? x + column.width - pad - w : x + pad, y: l.y - pad - item.size - offset + 2, size: item.size, font: useFont, color: item.muted ? C.muted : C.ink });
        offset += item.size * 1.3;
      }
      x += column.width;
    });
    l.y -= height;
    rule(l);
  }
  l.gap(10);
}

const originText = (origin: DataOrigin) => (origin === "real" ? "Real" : ORIGIN_LABEL[origin]);

function metricRows(metrics: Metric[]) {
  return metrics.map((metric) => {
    const missing = metric.value === null && /Sin datos|Pendiente|No conectado/.test(metric.display);
    return { cells: [metric.label + (metric.hint ? `\n${metric.hint}` : ""), metric.display + (metric.light && metric.light !== "gris" && !missing ? `\n${lightText(metric)}` : ""), originText(metric.origin)], muted: [false, missing, metric.origin !== "real"] };
  });
}

function chart(l: Layout, spec: ChartSpec) {
  if (spec.kind === "bars") {
    const items = spec.items;
    const rowH = 15;
    const height = 22 + items.length * rowH + 8;
    l.ensure(height);
    l.page.drawText(clean(l.fonts.medium, `${spec.title}${spec.origin === "demo" ? " · demo" : ""}`), { x: M, y: l.y - 10, size: 9.5, font: l.fonts.medium, color: C.ink });
    l.y -= 20;
    const labelW = 150, valueW = 30, barW = CW - labelW - valueW - 10;
    const max = Math.max(1, ...items.map((item) => item.value));
    for (const item of items) {
      const label = wrapText(l.fonts.regular, item.label, 8.5, labelW - 6)[0];
      l.page.drawText(label, { x: M, y: l.y - 10, size: 8.5, font: l.fonts.regular, color: C.muted });
      l.page.drawRectangle({ x: M + labelW, y: l.y - 11, width: barW, height: 8, color: C.tealSoft });
      if (item.value > 0) l.page.drawRectangle({ x: M + labelW, y: l.y - 11, width: Math.max(1.5, (item.value / max) * barW), height: 8, color: C.teal });
      const value = String(item.value);
      l.page.drawText(value, { x: W - M - l.fonts.medium.widthOfTextAtSize(value, 9), y: l.y - 10, size: 9, font: l.fonts.medium, color: C.ink });
      l.y -= rowH;
    }
    l.gap(8);
    return;
  }
  const height = 150;
  l.ensure(height + 20);
  l.page.drawText(clean(l.fonts.medium, `${spec.title}${spec.origin === "demo" ? " · demo" : ""}`), { x: M, y: l.y - 10, size: 9.5, font: l.fonts.medium, color: C.ink });
  l.y -= 22;
  const left = M + 40, right = W - M - 10, top = l.y - 4, bottom = l.y - height + 24;
  const max = niceMax(Math.max(1, ...spec.values));
  for (let i = 0; i <= 4; i++) {
    const y = bottom + ((top - bottom) * i) / 4;
    l.page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: C.line });
    const label = formatValue((max * i) / 4, spec.format);
    l.page.drawText(label, { x: left - 6 - l.fonts.regular.widthOfTextAtSize(label, 7.5), y: y - 2.5, size: 7.5, font: l.fonts.regular, color: C.muted });
  }
  const step = spec.values.length > 1 ? (right - left) / (spec.values.length - 1) : 0;
  const point = (index: number) => ({ x: left + index * step, y: bottom + (spec.values[index] / max) * (top - bottom) });
  for (let i = 1; i < spec.values.length; i++) l.page.drawLine({ start: point(i - 1), end: point(i), thickness: 1.6, color: C.ink });
  spec.values.forEach((value, index) => {
    const p = point(index);
    l.page.drawCircle({ x: p.x, y: p.y, size: 2.6, color: index === spec.values.length - 1 ? C.coral : C.ink });
    const label = clean(l.fonts.regular, spec.labels[index]);
    l.page.drawText(label, { x: p.x - l.fonts.regular.widthOfTextAtSize(label, 7.5) / 2, y: bottom - 12, size: 7.5, font: l.fonts.regular, color: C.muted });
    const v = formatValue(value, spec.format);
    l.page.drawText(v, { x: p.x - l.fonts.medium.widthOfTextAtSize(v, 7.5) / 2, y: p.y + 5, size: 7.5, font: l.fonts.medium, color: C.ink });
  });
  l.y -= height;
}
function niceMax(value: number) {
  const exponent = 10 ** Math.floor(Math.log10(value));
  const fraction = value / exponent;
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * exponent;
}
function formatValue(value: number, format: "money" | "number") {
  const rounded = Math.round(value).toLocaleString("es-AR");
  return format === "money" ? `$ ${rounded}` : rounded;
}

function items(l: Layout, title: string, list: ItemRef[], empty: string, limit: number) {
  l.ensure(40);
  l.page.drawText(clean(l.fonts.medium, `${title} (${list.length})`), { x: M, y: l.y - 10, size: 9.5, font: l.fonts.medium, color: C.ink });
  l.y -= 18;
  if (!list.length) { text(l, empty, { size: 9, color: C.muted }); l.gap(6); return; }
  for (const item of list.slice(0, limit)) {
    const kind = `${ITEM_KIND_LABEL[item.kind]}${item.date ? ` · ${shortDate(item.date)}` : ""}`.toLocaleUpperCase("es");
    const body = `${item.title} — ${item.detail}${item.origin === "demo" ? " (demo)" : ""}`;
    const h = 11 + measure(l.fonts.regular, body, 9, CW - 12);
    l.ensure(h + 4);
    const color = item.kind === "bloqueo" || item.kind === "vencido" ? C.error : item.kind === "proximo" ? C.teal : C.warning;
    l.page.drawRectangle({ x: M, y: l.y - h, width: 2.5, height: h, color });
    l.page.drawText(clean(l.fonts.medium, kind), { x: M + 9, y: l.y - 8, size: 7, font: l.fonts.medium, color: C.muted });
    l.y -= 11;
    text(l, body, { x: M + 9, size: 9, width: CW - 12 });
    l.gap(4);
  }
  if (list.length > limit) text(l, `y ${list.length - limit} más en el módulo.`, { size: 8.5, color: C.muted });
  l.gap(6);
}

function section(l: Layout, s: ServiceSnapshot, snapshot: ReportSnapshot, detailed: boolean) {
  l.ensure(150);
  l.gap(4);
  l.page.drawRectangle({ x: M, y: l.y - 3, width: CW, height: 3, color: LEVEL_COLOR[s.health.level] });
  l.gap(14);
  heading(l, s.label, 16, 80);
  const used = healthBadge(l.page, l.fonts, s.health.level, s.health.label, M, l.y - 9);
  const reasonLines = wrapText(l.fonts.regular, s.health.reason, 9, CW - used - 8);
  reasonLines.forEach((line, index) => l.page.drawText(line, { x: M + used + 8, y: l.y - 9 - index * 12, size: 9, font: l.fonts.regular, color: C.muted }));
  l.y -= Math.max(1, reasonLines.length) * 12 + 8;
  for (const note of s.notes) text(l, note, { size: 8.5, color: C.muted });
  l.gap(6);
  eyebrow(l, `Indicadores al ${longDate(s.asOf)}`);
  table(l, [{ title: "Indicador", width: CW * 0.52 }, { title: "Valor", width: CW * 0.3 }, { title: "Origen", width: CW * 0.18 }], metricRows(s.indicators));
  eyebrow(l, `Resultados de ${snapshot.period.label}`);
  table(l, [{ title: "Resultado", width: CW * 0.52 }, { title: "Valor", width: CW * 0.3 }, { title: "Origen", width: CW * 0.18 }], metricRows(s.results));
  if (s.comparisons.length) {
    eyebrow(l, `Comparación con ${snapshot.previousPeriod.label}`);
    table(l, [{ title: "Indicador", width: CW * 0.34 }, { title: snapshot.period.label, width: CW * 0.22, align: "right" }, { title: snapshot.previousPeriod.label, width: CW * 0.22, align: "right" }, { title: "Variación", width: CW * 0.22, align: "right" }],
      s.comparisons.map((item) => ({ cells: [item.label + (item.origin === "demo" ? " (demo)" : ""), item.currentDisplay, item.previousDisplay, item.delta === null ? "Sin base" : `${item.delta > 0 ? "+" : ""}${item.delta.toLocaleString("es-AR", { maximumFractionDigits: 1 })} %${(item.better === "up" ? item.delta >= 0 : item.delta <= 0) ? " · mejora" : " · empeora"}`] })));
  } else {
    text(l, `Sin comparación con ${snapshot.previousPeriod.label}: no hay datos comparables en ambos períodos.`, { size: 8.5, color: C.muted });
    l.gap(8);
  }
  for (const spec of s.charts) chart(l, spec);
  items(l, "Pendientes, bloqueos y aprobaciones", s.attention, s.configured ? "Nada pendiente para revisar." : "Sin datos del módulo.", detailed ? 14 : 8);
  items(l, "Próximas fechas (14 días)", s.upcoming, s.configured ? "Sin fechas próximas." : "Sin datos del módulo.", detailed ? 10 : 6);
}

export async function renderReportPdf(snapshot: ReportSnapshot, assets: PdfAssets): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fonts: Fonts = {
    regular: await doc.embedFont(assets.regular, { subset: false }),
    medium: await doc.embedFont(assets.medium, { subset: false }),
    bold: await doc.embedFont(assets.bold, { subset: false }),
  };
  let logo: PDFImage | undefined;
  if (assets.logo) { try { logo = await doc.embedPng(assets.logo); } catch { logo = undefined; } }
  const generated = new Date(snapshot.generatedAt);
  doc.setTitle(`${snapshot.title} · ${snapshot.clientName}`);
  doc.setAuthor(`Avans · ${snapshot.generatedBy}`);
  doc.setSubject(`${snapshot.typeLabel} de ${snapshot.clientName} · ${snapshot.period.label}`);
  doc.setKeywords(["Avans", snapshot.clientName, snapshot.period.label, ...snapshot.services.map((service) => service.label)]);
  doc.setCreator("Avans OS");
  doc.setProducer("Avans OS · pdf-lib");
  doc.setLanguage("es-AR");
  doc.setCreationDate(generated);
  doc.setModificationDate(generated);

  const header = (page: PDFPage, index: number) => {
    if (index === 0) return;
    if (logo) page.drawImage(logo, { x: M, y: H - 38, width: 48, height: 48 * (logo.height / logo.width) });
    else page.drawText("Avans", { x: M, y: H - 36, size: 12, font: fonts.bold, color: C.ink });
    const label = clean(fonts.regular, `${snapshot.clientName} · ${snapshot.title}`);
    const size = 8;
    const shown = wrapText(fonts.regular, label, size, CW - 70)[0];
    page.drawText(shown, { x: W - M - fonts.regular.widthOfTextAtSize(shown, size), y: H - 33, size, font: fonts.regular, color: C.muted });
    page.drawLine({ start: { x: M, y: H - 44 }, end: { x: W - M, y: H - 44 }, thickness: 0.6, color: C.line });
  };
  const l = new Layout(doc, fonts, header);

  /* Portada */
  if (logo) l.page.drawImage(logo, { x: M, y: H - 70, width: 96, height: 96 * (logo.height / logo.width) });
  else l.page.drawText("Avans", { x: M, y: H - 64, size: 24, font: fonts.bold, color: C.ink });
  l.y = H - 100;
  eyebrow(l, `${snapshot.typeLabel} · versión ${snapshot.version}`);
  text(l, snapshot.title, { size: 22, font: fonts.bold, lineGap: 1.2 });
  l.gap(2);
  text(l, snapshot.clientName, { size: 15, font: fonts.medium, color: C.coralInk });
  l.gap(12);
  const meta: [string, string][] = [
    ["Cliente", snapshot.clientName],
    ["Período", `${snapshot.period.label} (${longDate(snapshot.period.start)} al ${longDate(snapshot.period.end)})`],
    ["Comparado con", snapshot.previousPeriod.label],
    ["Estados operativos al", longDate(snapshot.asOf)],
    ["Fecha de generación", `${longDate(snapshot.generatedAt.slice(0, 10))} · ${generated.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" })} h · ${snapshot.generatedBy}`],
    ["Servicios incluidos", snapshot.services.map((service) => service.label).join(", ")],
  ];
  table(l, [{ title: "Dato", width: CW * 0.3 }, { title: "Detalle", width: CW * 0.7 }], meta.map(([key, value]) => ({ cells: [key, value], muted: [true, false] })));

  /* Lectura de los datos */
  l.ensure(70);
  const legend = `Cómo leer este reporte: los indicadores salen de los módulos de Avans OS con las mismas definiciones que el Inicio del cliente. «Real» = registrado en el módulo; «Demo» = dato de demostración rotulado; «Pendiente de configurar» = el módulo no tiene esa información; «No conectado» = requiere una integración que no está conectada. Un dato faltante nunca se muestra como cero. Este reporte ${snapshot.origin === "demo" ? "incluye datos de demostración" : "usa datos registrados en los módulos"}.`;
  const lh = measure(fonts.regular, legend, 8.5, CW - 20);
  l.page.drawRectangle({ x: M, y: l.y - lh - 14, width: CW, height: lh + 14, color: snapshot.origin === "demo" ? C.coralSoft : C.tealSoft });
  l.gap(7);
  text(l, legend, { x: M + 10, size: 8.5, width: CW - 20, color: C.ink });
  l.gap(14);

  /* Resumen */
  heading(l, "Resumen del período", 15, 80);
  text(l, "Resumen automático de los datos (sin IA). El estado de cada servicio sigue reglas fijas: ver «Cómo se calcula el estado» al final.", { size: 8.5, color: C.muted });
  l.gap(4);
  for (const s of snapshot.sections) {
    const reasonH = measure(fonts.regular, s.health.reason, 9, CW * 0.5);
    const h = Math.max(22, reasonH + 10);
    l.ensure(h);
    l.page.drawText(clean(fonts.medium, s.label), { x: M, y: l.y - 13, size: 10, font: fonts.medium, color: C.ink });
    healthBadge(l.page, fonts, s.health.level, s.health.label, M + CW * 0.3, l.y - 13);
    wrapText(fonts.regular, s.health.reason, 9, CW * 0.5).forEach((line, index) => l.page.drawText(line, { x: M + CW * 0.5, y: l.y - 13 - index * 12, size: 9, font: fonts.regular, color: C.muted }));
    l.y -= h;
    rule(l);
  }
  l.gap(14);

  /* Servicios */
  for (const s of snapshot.sections) section(l, s, snapshot, snapshot.type === "servicio");

  /* Conclusiones del equipo */
  l.ensure(120);
  heading(l, "Conclusiones, recomendaciones y próximos pasos", 15, 60);
  text(l, "Texto escrito y revisado por el equipo de Avans. Borradores con IA: pendientes de conexión (no se usaron).", { size: 8.5, color: C.muted });
  l.gap(6);
  for (const [title, body, empty] of [["Conclusiones", snapshot.narrative.conclusions, "Sin conclusiones cargadas."], ["Recomendaciones", snapshot.narrative.recommendations, "Sin recomendaciones cargadas."], ["Próximos pasos", snapshot.narrative.nextSteps, "Sin próximos pasos cargados."]] as const) {
    eyebrow(l, title, 30);
    text(l, body || empty, { size: 10, color: body ? C.ink : C.muted });
    l.gap(8);
  }

  /* Revisión */
  if (snapshot.review.length) {
    heading(l, "Revisión por responsable", 13, 50);
    table(l, [{ title: "Parte", width: CW * 0.24 }, { title: "Responsable", width: CW * 0.24 }, { title: "Estado", width: CW * 0.24 }, { title: "Comentario", width: CW * 0.28 }],
      snapshot.review.map((line) => ({ cells: [`${line.part}\n${line.role}`, line.owner, `${line.status}${line.by ? ` por ${line.by}` : ""}${line.at ? ` · ${shortDate(line.at.slice(0, 10))}` : ""}`, line.comment || "—"] })));
  }

  /* Reglas e integridad */
  heading(l, "Cómo se calcula el estado", 13, 60);
  for (const rule of HEALTH_RULES) {
    const used = 30 + fonts.bold.widthOfTextAtSize(rule.label, 9);
    const lines = wrapText(fonts.regular, rule.rule, 8.5, CW - used - 6);
    l.ensure(lines.length * 11.5 + 6);
    healthBadge(l.page, fonts, rule.level, rule.label, M, l.y - 9);
    lines.forEach((line, index) => l.page.drawText(line, { x: M + used + 6, y: l.y - 9 - index * 11.5, size: 8.5, font: fonts.regular, color: C.muted }));
    l.y -= lines.length * 11.5 + 6;
  }
  l.gap(8);
  heading(l, "Instantánea de datos", 12, 40);
  text(l, `Este documento se generó a partir de una instantánea guardada con la versión ${snapshot.version} del reporte. Si los datos de los módulos cambian, esta versión no se modifica: se emite una versión nueva. Definiciones: ${snapshot.metricsVersion}. Huella de los datos (SHA-256): ${snapshot.inputDigest}. Generar el reporte no lo envía a nadie.`, { size: 8.5, color: C.muted });

  /* Pie con numeración */
  const total = l.pages.length;
  l.pages.forEach((page, index) => {
    page.drawLine({ start: { x: M, y: 40 }, end: { x: W - M, y: 40 }, thickness: 0.6, color: C.line });
    const left = clean(fonts.regular, `Avans · ${snapshot.clientName} · ${snapshot.period.label} · v${snapshot.version}`);
    page.drawText(wrapText(fonts.regular, left, 7.5, CW - 80)[0], { x: M, y: 28, size: 7.5, font: fonts.regular, color: C.muted });
    const pageLabel = `Página ${index + 1} de ${total}`;
    page.drawText(pageLabel, { x: W - M - fonts.medium.widthOfTextAtSize(pageLabel, 7.5), y: 28, size: 7.5, font: fonts.medium, color: C.muted });
  });
  return doc.save({ useObjectStreams: true });
}
