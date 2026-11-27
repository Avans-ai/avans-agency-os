import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readRenderDeck, slideTexts } from "../lib/pptx/render-model";

test.setTimeout(120000);
const outDir = process.env.PPTX_OUT_DIR ?? join("test-results", "pptx-browser");

async function openDocuments(page: Page, slug = "epsa") {
  await page.goto(`/v2/clientes/${slug}?view=documentos`);
  await page.getByRole("button", { name: "Presentaciones generadas", exact: true }).click();
}
async function generateDraft(page: Page) {
  await page.getByRole("button", { name: "Generar presentación" }).first().click();
  const studio = page.getByRole("dialog", { name: /Marketing Discovery/ });
  await studio.getByRole("button", { name: "Generar borrador" }).click();
  await expect(studio.getByRole("button", { name: "Descargar PPTX" })).toBeVisible({ timeout: 60000 });
  return studio;
}
async function noHorizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const overlay = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
    const doc = document.documentElement;
    return {
      page: doc.scrollWidth <= doc.clientWidth + 1,
      overlay: overlay ? overlay.scrollWidth <= overlay.clientWidth + 1 : true,
    };
  });
}
async function switchRole(page: Page, name: string) {
  await page.getByRole("button", { name: /^Perfil:/ }).click();
  await page.getByRole("group", { name: "Rol simulado" }).getByRole("button", { name, exact: true }).click();
  await page.getByRole("button", { name: /^Perfil:/ }).click();
}

test("Generar presentación builds the PPTX from the master, previews real slides and downloads it", async ({ page }) => {
  mkdirSync(outDir, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDocuments(page);

  // Generator: draft available, final blocked with its reason, Google disabled.
  await page.getByRole("button", { name: "Generar presentación" }).first().click();
  let studio = page.getByRole("dialog", { name: /Marketing Discovery/ });
  await expect(studio.getByRole("radio", { name: /Versión final para cliente/ })).toBeDisabled();
  await expect(studio.getByText(/Bloqueada: \d+ datos críticos/)).toBeVisible();
  await expect(studio.getByRole("button", { name: "Crear en Google Slides" })).toBeDisabled();
  await expect(studio.getByText(/Google Workspace no está conectado/)).toBeVisible();
  await studio.getByRole("button", { name: "Cancelar" }).click();
  await expect(studio).toHaveCount(0);

  studio = await generateDraft(page);
  await expect(studio.getByText("Borrador interno", { exact: true })).toBeVisible();
  const counter = studio.getByText(/^Slide 1 de \d+ ·/);
  await expect(counter).toBeVisible();
  const total = Number(/^Slide \d+ de (\d+)/.exec((await counter.textContent())!)![1]);
  expect(total).toBeGreaterThan(30);

  // The stage renders the objects of the generated file, with fonts and images.
  const stage = studio.locator("button[aria-label^='Ampliar slide']");
  await expect(stage.locator("[data-object]").first()).toBeVisible();
  expect(await stage.locator("[data-object]").count()).toBeGreaterThan(4);
  await expect(stage).toContainText("Marketing");
  await expect(stage).toContainText("EPSA / Line Up");
  await expect(stage).toContainText("BORRADOR INTERNO — NO ENVIAR AL CLIENTE");
  await expect
    .poll(() => stage.locator("img").evaluateAll((imgs) => imgs.every((i) => (i as HTMLImageElement).naturalWidth > 0)))
    .toBe(true);
  expect(await page.evaluate(() => document.fonts.check('40px "Syne"'))).toBe(true);
  await stage.screenshot({ path: join(outDir, "viewer-slide-1.png") });

  // Keyboard navigation and the thumbnail strip.
  await page.keyboard.press("ArrowRight");
  await expect(studio.getByText(/^Slide 2 de \d+ ·/)).toBeVisible();
  await page.keyboard.press("End");
  await expect(studio.getByText(new RegExp(`^Slide ${total} de ${total}`))).toBeVisible();
  await page.keyboard.press("Home");
  await studio.getByRole("button", { name: /^Ir a slide 5:/ }).click();
  await expect(studio.getByText(/^Slide 5 de \d+ ·/)).toBeVisible();
  await stage.screenshot({ path: join(outDir, "viewer-slide-5.png") });

  // One slide large; Escape closes only the enlarged slide.
  await stage.click();
  const zoom = page.getByRole("dialog", { name: "Slide 5 ampliada" });
  await expect(zoom).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog", { name: "Slide 6 ampliada" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /ampliada/ })).toHaveCount(0);
  await expect(studio).toBeVisible();

  // Pending data per slide, with the module where it is completed.
  await expect(studio.getByRole("complementary", { name: "Detalle de la slide" })).toContainText(/Slide 6/);
  await studio.getByRole("tab", { name: /Datos pendientes/ }).click();
  await expect(studio.getByRole("link", { name: "Completar" }).first()).toBeVisible();
  await expect(studio.getByText(/Discovery|Benchmark|Plan de Marketing/).first()).toBeVisible();

  // Whole document: one section per slide.
  await studio.getByRole("tab", { name: "Documento completo" }).click();
  await expect(studio.locator("section[aria-label^='Slide ']")).toHaveCount(total);

  // Download: a real, non-empty PPTX whose slides match the preview.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    studio.getByRole("button", { name: "Descargar PPTX" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^marketing-discovery-epsa-v1-borrador\.pptx$/);
  const file = join(outDir, download.suggestedFilename());
  await download.saveAs(file);
  const bytes = new Uint8Array(readFileSync(file));
  expect(bytes.length).toBeGreaterThan(100000);
  const deck = readRenderDeck(bytes);
  expect(deck.slides.length).toBe(total);
  const text = slideTexts(deck).flat().join("\n");
  expect(text).not.toMatch(/\[[^\]]*\]/);
  expect(text).not.toMatch(/PROJECT MANAGER|Duplicar esta slide|PÁGINA INTERNA/);

  // History: saved version, a second one, both kept.
  await studio.getByRole("button", { name: "Generar nueva versión" }).click();
  await studio.getByRole("button", { name: "Generar borrador" }).click();
  await expect(studio.getByText("Presentación generada · versión 2")).toBeVisible({ timeout: 60000 });
  await studio.getByRole("button", { name: "Cerrar presentación" }).click();
  await expect(page.getByRole("article", { name: "Versión 2" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Versión 1" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Versión 1" })).toContainText("Datos vigentes");
  expect(errors).toEqual([]);
});

test("versions become outdated when data change, reopen from history, and responsive viewer", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDocuments(page, "aca");
  const studio = await generateDraft(page);
  await studio.getByRole("button", { name: "Cerrar presentación" }).click();
  // Change a Discovery field directly in the local state (same as editing it).
  await page.evaluate(() => {
    const key = "avans-os:preview:v1:client:aca:knowledge:v1";
    const env = JSON.parse(localStorage.getItem(key)!);
    env.value.discovery.companyProfile.coverage = "Cobertura actualizada QA";
    env.value.revision += 1;
    localStorage.setItem(key, JSON.stringify(env));
  });
  await openDocuments(page, "aca");
  const v1 = page.getByRole("article", { name: "Versión 1" });
  await expect(v1).toContainText("Desactualizada");
  await v1.getByRole("button", { name: "Abrir v1" }).click();
  const viewer = page.getByRole("dialog", { name: /Marketing Discovery/ });
  await expect(viewer.getByText("Desactualizada · los datos cambiaron")).toBeVisible();
  await expect(viewer.locator("button[aria-label^='Ampliar slide'] [data-object]").first()).toBeVisible();

  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.waitForTimeout(300);
    expect(await noHorizontalOverflow(page), `viewer at ${width}px`).toEqual({ page: true, overlay: true });
    const box = await viewer.locator("button[aria-label^='Ampliar slide']").boundingBox();
    expect(box!.width).toBeLessThanOrEqual(width);
    expect(box!.width).toBeGreaterThan(Math.min(300, width - 40));
    await page.screenshot({ path: join(outDir, `viewer-${width}.png`) });
  }
  await viewer.getByRole("tab", { name: "Documento completo" }).click();
  expect(await noHorizontalOverflow(page)).toEqual({ page: true, overlay: true });
  await viewer.getByRole("button", { name: "Cerrar presentación" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Generar presentación" }).first().click();
  expect(await noHorizontalOverflow(page)).toEqual({ page: true, overlay: true });
  await page.screenshot({ path: join(outDir, "generator-390.png") });
});

test("roles without client permission only get a draft that is not saved", async ({ page }) => {
  await openDocuments(page);
  await switchRole(page, "Ejecutiva de cuentas");
  await page.getByRole("button", { name: "Generar presentación" }).first().click();
  const studio = page.getByRole("dialog", { name: /Marketing Discovery/ });
  await expect(studio.getByText(/Solo administración o el PM asignado/)).toBeVisible();
  await expect(studio.getByRole("radio", { name: /Versión final para cliente/ })).toBeDisabled();
  await studio.getByRole("button", { name: "Generar borrador" }).click();
  await expect(studio.getByText("No guardada en el historial")).toBeVisible({ timeout: 60000 });
});
