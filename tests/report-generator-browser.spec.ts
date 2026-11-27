import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { seedRecords } from "../app/v2/os/modules/store";

test.use({ actionTimeout: 15000 });
test.setTimeout(120000);
const KEY = "avans-os:preview:v1:";
const OUT = join(__dirname, "..", "test-results", "report-generator-browser");

function errorsOf(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}
async function setRole(page: Page, label: string) {
  await page.getByRole("button", { name: /^Perfil:/ }).click();
  await page.getByRole("group", { name: "Rol simulado" }).getByRole("button", { name: label, exact: true }).click();
  await page.getByRole("button", { name: /^Perfil:/ }).click();
}
async function noOverflow(page: Page, widths = [1440, 820, 390]) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `overflow at ${width}`).toBe(true);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}
function pdfText(path: string, name: string) {
  mkdirSync(OUT, { recursive: true });
  const file = join(OUT, name);
  writeFileSync(file, readFileSync(path));
  expect(readFileSync(file).subarray(0, 5).toString()).toBe("%PDF-");
  return execFileSync("pdftotext", ["-layout", file, "-"]).toString("utf8");
}
async function nextStep(page: Page) {
  await page.getByRole("button", { name: /^Siguiente:/ }).click();
}

/** Crea un reporte mensual con todos los servicios, completa el texto, revisa todas las partes como administrador y genera el PDF. */
async function generateReport(page: Page, slug: string, conclusions: string) {
  await page.goto(`/v2/clientes/${slug}?view=reportes`);
  await page.getByRole("button", { name: "Crear reporte" }).click();
  await expect(page.getByRole("heading", { name: "Paso 1 · Tipo" })).toBeVisible();
  await page.getByRole("radio", { name: /^Mensual/ }).check();
  await nextStep(page);
  await expect(page.getByRole("heading", { name: "Paso 2 · Período" })).toBeVisible();
  await page.getByLabel("Mes", { exact: true }).fill("2026-11");
  await expect(page.getByText("Período elegido: Noviembre 2026")).toBeVisible();
  await nextStep(page);
  await nextStep(page);
  await expect(page.getByRole("list", { name: "Datos reunidos por servicio" })).toBeVisible();
  await nextStep(page);
  await expect(page.getByRole("heading", { name: "Paso 5 · Indicadores" })).toBeVisible();
  await nextStep(page);
  await expect(page.getByRole("button", { name: "Redactar con IA" })).toBeDisabled();
  await page.getByRole("textbox", { name: "Conclusiones" }).fill(conclusions);
  await page.getByRole("textbox", { name: "Recomendaciones" }).fill("Acelerar las aprobaciones pendientes.");
  await page.getByRole("textbox", { name: "Próximos pasos" }).fill("Revisar el plan del mes siguiente.");
  await nextStep(page);
  const review = page.getByRole("region", { name: /^Circuito de revisión/ });
  for (const name of await review.getByRole("button", { name: /^Marcar revisada:/ }).evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")!))) {
    await review.getByRole("button", { name }).click();
  }
  await expect(review).toContainText("Listo para generar");
  await nextStep(page);
  await expect(page.getByRole("article", { name: /^Documento:/ })).toContainText(conclusions);
  await nextStep(page);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Generar PDF de la versión 1/ }).click()]);
  await expect(page).toHaveURL(/version=1/);
  return download;
}

test("report flow: real PDF with client, period and services; registered in Archivos y documentos; re-downloadable after reload; isolated per client", async ({ page }) => {
  const errors = errorsOf(page);
  const download = await generateReport(page, "aca", "Conclusión escrita por el equipo de ACA.");
  expect(download.suggestedFilename()).toBe("reporte-mensual-aca-noviembre-2026-v1.pdf");
  const text = pdfText((await download.path())!, "aca-mensual-v1.pdf");
  expect(text).toContain("ACA");
  expect(text).toContain("Noviembre 2026");
  expect(text).toContain("Publicidad digital");
  expect(text).toContain("Contenidos");
  expect(text).toContain("Conclusión escrita por el equipo de ACA.");
  expect(text).not.toMatch(/EPSA|Line Up|Edinovo|Portland/);

  // La versión emitida guarda la instantánea y queda registrada como fuente del cliente.
  const view = page.getByRole("article", { name: "Documento: Reporte mensual · Noviembre 2026" });
  await expect(view).toContainText("versión 1 emitida");
  const knowledge = await page.evaluate((prefix) => JSON.parse(localStorage.getItem(`${prefix}client:aca:knowledge:v1`)!).value, KEY);
  const source = knowledge.sources.find((item: { title: string }) => item.title === "Reporte mensual · Noviembre 2026 · v1");
  expect(source).toMatchObject({ type: "document", mimeType: "application/pdf", clientSlug: "aca" });
  expect(source.metadata.report).toMatchObject({ storedFile: true, recoverable: true, version: 1 });

  await page.goto("/v2/clientes/aca?view=documentos");
  await expect(page.getByText("Reporte mensual · Noviembre 2026 · v1").first()).toBeVisible();

  // Recuperable después de recargar: desde Reportes y desde la biblioteca de materiales de la Ficha.
  await page.goto("/v2/clientes/aca?view=reportes");
  await page.reload();
  const [again] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Descargar PDF: Reporte mensual · Noviembre 2026 versión 1/ }).click()]);
  expect(pdfText((await again.path())!, "aca-mensual-v1-redownload.pdf")).toContain("Conclusión escrita por el equipo de ACA.");
  await page.goto("/v2/clientes/aca?view=ficha&ficha=materiales");
  const material = page.getByRole("article").filter({ hasText: "Reporte mensual · Noviembre 2026 · v1" }).first();
  await expect(material).toBeVisible();

  // Aislamiento: EPSA no ve el reporte de ACA.
  await page.goto("/v2/clientes/epsa?view=reportes");
  await expect(page.getByText("Todavía no se generó ningún reporte para EPSA / Line Up.")).toBeVisible();
  await page.goto("/v2/clientes/epsa?view=documentos");
  await expect(page.getByText("Reporte mensual · Noviembre 2026 · v1")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("an issued version does not change when module data changes; the next version picks up the change", async ({ page }) => {
  await generateReport(page, "aca", "Primera versión.");
  const section = () => page.getByRole("article", { name: /^Documento:/ }).getByRole("region", { name: "Sección Contenidos" });
  const before = await section().innerText();
  // Cambia un dato del módulo: un contenido en revisión pasa a «Publicada».
  const changed = seedRecords("aca", "contenidos", "piezas").map((piece) => /Revisión|Aprobación/.test(piece.values.estado) ? { ...piece, values: { ...piece.values, estado: "Publicada" } } : piece);
  await page.evaluate(([prefix, value]) => {
    localStorage.setItem(`${prefix}client:aca:module:contenidos:piezas`, JSON.stringify({ version: 1, value, savedAt: new Date().toISOString() }));
  }, [KEY, changed] as const);
  await page.reload();
  expect(await section().innerText()).toBe(before);
  await page.getByRole("button", { name: "Nueva versión" }).click();
  await expect(page.getByRole("heading", { name: "Paso 4 · Datos" })).toBeVisible();
  await nextStep(page);
  const live = page.getByRole("article", { name: "Servicio Contenidos" }).getByRole("group", { name: "Indicadores de Contenidos" });
  await expect(live).toContainText("En revisión o aprobación0");
  expect(before).not.toContain("En revisión o aprobación\n0");
});

test("reports wizard has no horizontal overflow at 390 px", async ({ page }) => {
  await page.goto("/v2/clientes/epsa?view=reportes");
  await page.getByRole("button", { name: "Crear reporte" }).click();
  await expect(page.getByRole("heading", { name: "Paso 1 · Tipo" })).toBeVisible();
  for (const step of [5, 8]) {
    await page.getByRole("navigation", { name: "Pasos del reporte" }).getByRole("button", { name: new RegExp(`^Paso ${step}`) }).click();
    await noOverflow(page, [820, 390]);
  }
});

test("review per responsible gates generation; only the PM or admin generates", async ({ page }) => {
  await page.goto("/v2/clientes/epsa?view=reportes");
  await page.getByRole("button", { name: "Crear reporte" }).click();
  await page.getByRole("navigation", { name: "Pasos del reporte" }).getByRole("button", { name: /^Paso 7/ }).click();
  const review = page.getByRole("region", { name: "Circuito de revisión · Reporte mensual de resultados" });
  await expect(review).toContainText("0/3");
  await setRole(page, "Content Manager");
  await expect(review.getByRole("button", { name: /^Marcar revisada/ })).toHaveCount(1);
  await review.getByLabel("Comentario sobre Contenidos").fill("Piezas revisadas");
  await review.getByRole("button", { name: "Marcar revisada: Contenidos" }).click();
  await setRole(page, "Líder técnico");
  await review.getByRole("button", { name: "Marcar revisada: Publicidad digital" }).click();
  await setRole(page, "Project Manager · Valentina Ríos");
  await page.getByRole("navigation", { name: "Pasos del reporte" }).getByRole("button", { name: /^Paso 9/ }).click();
  await expect(page.getByRole("button", { name: /^Generar PDF/ })).toBeDisabled();
  await expect(page.getByText("Faltan 1 parte por revisar")).toBeVisible();
});
