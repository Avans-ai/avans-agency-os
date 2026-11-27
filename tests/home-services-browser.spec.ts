import { test, expect, type Page } from "@playwright/test";
import { serviceSnapshot } from "../app/v2/os/metrics";
import { currentMonthPeriod, todayIso } from "../app/v2/os/metrics/period";
import { seedMetricsInput } from "./metrics-fixtures";

/* Inicio del cliente: bloques de servicio con las mismas definiciones de métricas que Reportes. */
test.use({ actionTimeout: 15000 });
const KEY = "avans-os:preview:v1:";

function errorsOf(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}
async function noOverflow(page: Page, widths = [1440, 820, 390]) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `overflow at ${width}`).toBe(true);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}
const tile = (group: ReturnType<Page["getByRole"]>, label: string) => group.locator(":scope > *").filter({ hasText: label }).first().locator("strong").first();

test("home: one full-width block per service stacked, alerts on the right at 1440, no «Actividad relevante», deep links come back", async ({ page }) => {
  const errors = errorsOf(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/v2/clientes/aca");
  const summary = page.getByRole("region", { name: "Resumen de módulos" });
  const blocks = summary.getByRole("article", { name: /^Servicio / });
  await expect(blocks).toHaveCount(2);
  await expect(page.getByText("Actividad relevante")).toHaveCount(0);
  await expect(summary).toContainText("Período de las métricas");
  await expect(summary).not.toContainText("Cargando datos guardados");
  const [first, second] = [await blocks.nth(0).boundingBox(), await blocks.nth(1).boundingBox()];
  const main = (await summary.boundingBox())!;
  const aside = (await page.getByRole("complementary", { name: "Alertas y temas que requieren atención" }).boundingBox())!;
  expect(Math.abs(first!.width - main.width)).toBeLessThan(2);
  expect(second!.y).toBeGreaterThan(first!.y + first!.height - 1);
  expect(Math.abs(second!.x - first!.x)).toBeLessThan(2);
  expect(aside.x).toBeGreaterThan(main.x + main.width);
  // Semáforo con texto (nunca solo color).
  await expect(blocks.first().getByText(/^(En orden|Requiere atención|En riesgo|Sin datos)$/)).toBeVisible();
  await expect(summary.getByRole("button", { name: "+ Agregar módulo de servicio" })).toBeVisible();

  // Enlace a un elemento concreto con «Volver» al Inicio.
  const paid = summary.getByRole("article", { name: "Servicio Publicidad digital" });
  const link = paid.getByRole("link", { name: "Asistencia 24 h · variante B" }).first();
  await link.click();
  await expect(page).toHaveURL(/anuncio=/);
  // El detalle recibe el origen: «Volver» (BackButton) regresa al Inicio del cliente.
  expect(new URL(page.url()).searchParams.get("volver")).toBe("/v2/clientes/aca");
  await page.goBack();
  await expect(page).toHaveURL(/\/v2\/clientes\/aca$/);

  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("home: missing module data shows «Sin datos» or «Pendiente de configurar», never zero", async ({ page }) => {
  await page.goto("/v2/clientes/aca");
  await page.evaluate((prefix) => {
    const empty = JSON.stringify({ version: 1, value: [], savedAt: new Date().toISOString() });
    localStorage.setItem(`${prefix}client:aca:module:publicidad-digital:campanas`, empty);
    localStorage.setItem(`${prefix}client:aca:module:publicidad-digital:anuncios`, empty);
    localStorage.setItem(`${prefix}client:aca:module:contenidos:planes`, empty);
  }, KEY);
  await page.reload();
  const paid = page.getByRole("article", { name: "Servicio Publicidad digital" });
  await expect(paid.getByRole("group", { name: "Indicadores de Publicidad digital" })).toContainText("CampañasSin datos");
  await expect(paid).not.toContainText("Campañas activas0");
  const content = page.getByRole("article", { name: "Servicio Contenidos" });
  await expect(content.getByRole("group", { name: "Indicadores de Contenidos" })).toContainText("Pendiente de configurar");
});

test("home indicators equal the module data (same definitions as the module and as Reportes)", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto("/v2/clientes/aca");
  const asOf = todayIso();
  const options = { period: currentMonthPeriod(asOf), asOf };
  const content = page.getByRole("group", { name: "Indicadores de Contenidos" });
  const expectedContent = serviceSnapshot("contenidos", seedMetricsInput("aca"), options);
  const review = expectedContent.indicators.find((metric) => metric.id === "revision")!.display;
  await expect(tile(content, "En revisión o aprobación")).toHaveText(review);
  await expect(tile(content, "Próximas publicaciones")).toHaveText(expectedContent.indicators.find((metric) => metric.id === "proximas")!.display);
  const paid = page.getByRole("group", { name: "Indicadores de Publicidad digital" });
  const expectedPaid = serviceSnapshot("publicidad-digital", seedMetricsInput("aca"), options);
  const leads = expectedPaid.indicators.find((metric) => metric.id === "kpi-leads")!.display;
  await expect(tile(paid, "Leads de la semana")).toHaveText(leads);
  await expect(tile(paid, "Campañas activas")).toHaveText(expectedPaid.indicators.find((metric) => metric.id === "activas")!.display);

  // El módulo muestra los mismos valores.
  await page.goto("/v2/clientes/aca/contenido");
  await expect(tile(page.getByRole("region", { name: "Resumen operativo" }), "En revisión")).toHaveText(review);
  await page.goto("/v2/clientes/aca/campanas");
  await expect(tile(page.getByRole("region", { name: "Semáforos de KPIs semanales" }), "Leads de la semana")).toHaveText(leads);
  expect(errors).toEqual([]);
});

test("home stacks blocks and alerts vertically on small screens (820 and 390) without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 900 });
  await page.goto("/v2/clientes/epsa");
  const summary = page.getByRole("region", { name: "Resumen de módulos" });
  await expect(summary.getByRole("article", { name: /^Servicio / })).toHaveCount(3);
  const main = (await summary.boundingBox())!;
  const aside = (await page.getByRole("complementary", { name: "Alertas y temas que requieren atención" }).boundingBox())!;
  expect(aside.y).toBeGreaterThan(main.y + main.height - 1);
  await noOverflow(page, [820, 390]);
});
