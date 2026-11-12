import { test, expect, type Page } from "@playwright/test";
test.use({ actionTimeout: 15000 });

/* Iteración 2: Operaciones unificada en Clientes. */

const WORKSPACE_KEY = "avans-os:preview:v1:workspace";

function errorsOf(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

function clientRows(page: Page) {
  return page.getByRole("table").locator("tbody > tr:not([id])");
}

async function tabCount(page: Page, label: string) {
  const text = await page.getByRole("tab", { name: new RegExp(`^${label}`) }).locator("span").textContent();
  return Number(text);
}

test("sidebar: Operaciones abre Clientes directo y no muestra «Vista general»", async ({ page }) => {
  const errors = errorsOf(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/v2");
  const sidebar = page.getByRole("navigation", { name: "Navegación principal" });
  await sidebar.getByRole("link", { name: "Operaciones", exact: true }).click();
  await expect(page).toHaveURL(/\/v2\/clientes$/);
  await expect(page.getByRole("heading", { name: "Clientes", exact: true })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Clientes", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(sidebar.getByRole("link", { name: "Vista general" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Ubicación" }).getByRole("link", { name: "Operaciones" })).toHaveAttribute("href", "/v2/clientes");

  // Las demás áreas conservan su «Vista general».
  await sidebar.getByRole("button", { name: "Ventas" }).click();
  await expect(sidebar.getByRole("link", { name: "Vista general" })).toHaveAttribute("href", "/v2/ventas");

  // En la ficha de un cliente sigue marcado Operaciones → Clientes.
  await page.goto("/v2/clientes/epsa");
  await expect(sidebar.getByRole("link", { name: "Clientes", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("navigation", { name: "Ubicación" }).getByRole("link", { name: "Operaciones" })).toHaveAttribute("href", "/v2/clientes");
  expect(errors).toEqual([]);
});

test("menú móvil: Operaciones solo lista Clientes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/v2/clientes");
  await page.getByRole("navigation", { name: "Navegación móvil" }).getByRole("button", { name: "Menú" }).click();
  const sheet = page.getByRole("dialog", { name: "Menú" });
  const operations = sheet.locator("details", { has: page.locator("summary", { hasText: "Operaciones" }) });
  await operations.locator("summary").click();
  await expect(operations.getByRole("link")).toHaveText(["Clientes"]);
  await expect(operations.getByRole("link", { name: "Clientes" })).toHaveAttribute("aria-current", "page");
  const sales = sheet.locator("details", { has: page.locator("summary", { hasText: "Ventas" }) });
  await sales.locator("summary").click();
  await expect(sales.getByRole("link", { name: "Vista general" })).toBeVisible();
});

test("/v2/operaciones redirige a /v2/clientes y conserva la query string", async ({ page, request }) => {
  const response = await request.get("/v2/operaciones?tab=all", { maxRedirects: 0 });
  expect([307, 308]).toContain(response.status());
  expect(response.headers().location).toMatch(/\/v2\/clientes\?tab=all$/);
  await page.goto("/v2/operaciones?tab=all");
  await expect(page).toHaveURL(/\/v2\/clientes\?tab=all$/);
  await expect(page.getByRole("tab", { name: /^Todos los clientes/ })).toHaveAttribute("aria-selected", "true");
  await page.goto("/v2/operaciones");
  await expect(page).toHaveURL(/\/v2\/clientes$/);
});

test("los cuatro segmentos de cartera filtran la lista", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/v2/clientes");
  await expect(page.getByRole("tab", { name: /^Tus clientes/ })).toHaveAttribute("aria-selected", "true");
  for (const label of ["Tus clientes", "Clientes activos", "Todos los clientes"]) {
    await page.getByRole("tab", { name: new RegExp(`^${label}`) }).click();
    const expected = await tabCount(page, label);
    expect(expected).toBeGreaterThan(0);
    await expect(clientRows(page)).toHaveCount(expected);
  }
  await page.getByRole("tab", { name: /^Clientes inactivos/ }).click();
  const inactive = await tabCount(page, "Clientes inactivos");
  if (inactive === 0) await expect(page.getByRole("heading", { name: "No hay clientes inactivos" })).toBeVisible();
  else await expect(clientRows(page)).toHaveCount(inactive);
  // Tus clientes es un subconjunto de Todos.
  expect(await tabCount(page, "Tus clientes")).toBeLessThanOrEqual(await tabCount(page, "Todos los clientes"));
});

test("fila desplegable: proyectos activos, próxima entrega y accesos a la operación", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/v2/clientes?tab=all");
  const row = page.getByRole("row", { name: /EPSA \/ Line Up/ });
  await expect(row).toContainText("3 proyectos activos");
  await expect(row).toContainText("1 bloqueo");
  const toggle = page.getByRole("button", { name: "Ver operación de EPSA / Line Up" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(page.getByRole("button", { name: "Ocultar operación de EPSA / Line Up" })).toHaveAttribute("aria-expanded", "true");
  const projects = page.getByRole("region", { name: "Proyectos activos de EPSA / Line Up" });
  await expect(projects.getByRole("listitem")).toHaveCount(3);
  await expect(projects).toContainText("Valentina Ríos");
  await expect(projects.getByRole("progressbar", { name: "Avance de Lanzamiento Line Up 2027" })).toBeVisible();
  const summary = page.getByRole("complementary", { name: "Resumen operativo de EPSA / Line Up" });
  await expect(summary).toContainText("Próxima entrega");
  await expect(summary.getByRole("link", { name: "Abrir cliente" })).toHaveAttribute("href", "/v2/clientes/epsa");
  await expect(summary.getByRole("link", { name: /^Tareas/ })).toHaveAttribute("href", "/v2/clientes/epsa/tareas");
  await projects.getByRole("link", { name: "Lanzamiento Line Up 2027" }).click();
  await expect(page).toHaveURL(/\/v2\/proyectos\/lanzamiento-line-up-2027$/);
  await expect(page.getByRole("heading", { name: "Lanzamiento Line Up 2027" }).first()).toBeVisible();
});

test("«Requieren atención» filtra y ordena por urgencia", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/v2/clientes?tab=all");
  const toggle = page.getByRole("button", { name: /Requieren atención/ });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(clientRows(page)).toHaveCount(4);
  await expect(page.getByRole("row", { name: /Lider Energy/ })).toHaveCount(0);
  await page.getByRole("combobox", { name: /^Ordenar/ }).selectOption("attention");
  await expect(clientRows(page).first()).toContainText("Edinovo");
  await toggle.click();
  await expect(clientRows(page)).toHaveCount(5);
  await expect(clientRows(page).last()).toContainText("Lider Energy");
});

test("vencidas y bloqueos se calculan con el store vivo de tareas", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/v2/clientes?tab=all");
  const lider = page.getByRole("row", { name: /Lider Energy/ });
  await expect(lider).toContainText("Sin vencidas ni bloqueos");
  await expect.poll(() => page.evaluate((key) => Boolean(localStorage.getItem(key)), WORKSPACE_KEY)).toBe(true);
  await page.evaluate((key) => {
    const envelope = JSON.parse(localStorage.getItem(key)!);
    envelope.value.tasks.push({
      id: "T-990", projectSlug: "onboarding-crm", serviceId: "crm", title: "Mapa de integraciones (prueba)", owner: "Martín Ledesma",
      prio: "Alta", due: "28 oct", dueKind: "late", status: "En curso", blocked: "espera accesos del cliente.", blockedSince: "2 días",
      desc: "Tarea creada localmente para la prueba.", files: [], comments: [], activity: [],
    });
    localStorage.setItem(key, JSON.stringify(envelope));
  }, WORKSPACE_KEY);
  await page.reload();
  await expect(lider).toContainText("1 vencida");
  await expect(lider).toContainText("1 bloqueo");
  await expect(page.getByRole("button", { name: /Requieren atención/ })).toContainText("5");
  await page.getByRole("button", { name: "Ver operación de Lider Energy" }).click();
  await expect(page.getByRole("complementary", { name: "Resumen operativo de Lider Energy" })).toContainText("T-990 · Mapa de integraciones (prueba)");
});

test("facturación y margen solo para socios autorizados", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/v2/clientes?tab=all");
  await expect(page.getByRole("columnheader", { name: "Facturación y margen" })).toBeVisible();
  await expect(page.getByRole("row", { name: /ACA/ })).toContainText("Margen");
  await page.getByRole("button", { name: /^Perfil:/ }).click();
  await page.getByRole("group", { name: "Rol simulado" }).getByRole("button", { name: "Ejecutiva de cuentas" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("columnheader", { name: "Facturación y margen" })).toHaveCount(0);
  await expect(page.getByRole("row", { name: /ACA/ })).not.toContainText("Margen");
  await expect(page.getByRole("row", { name: /ACA/ })).not.toContainText("$");
  await expect(page.getByRole("combobox", { name: /^Ordenar/ }).locator("option")).toHaveText(["Nombre", "Estado de cuenta", "Requieren atención"]);
  await expect(page.getByText("Facturación y margen restringidos para este rol.")).toBeVisible();
  // La columna de operación sigue visible para todos los roles.
  await expect(page.getByRole("columnheader", { name: "Operación", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Vista de grilla" }).click();
  await expect(page.getByRole("region", { name: /clientes en grilla/ })).toContainText("Restringida");
  await expect(page.getByRole("region", { name: /clientes en grilla/ })).not.toContainText("$ ");
});

test("sin desborde horizontal a 390 px, con detalle abierto y en grilla", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/v2/clientes?tab=all");
  await noOverflow(page);
  await page.getByRole("button", { name: "Ver operación de EPSA / Line Up" }).click();
  await expect(page.getByRole("region", { name: "Proyectos activos de EPSA / Line Up" })).toBeVisible();
  await noOverflow(page);
  await page.getByRole("button", { name: /Requieren atención/ }).click();
  await noOverflow(page);
  await page.getByRole("button", { name: "Vista de grilla" }).click();
  await expect(page.getByRole("region", { name: /clientes en grilla/ })).toContainText("proyecto");
  await noOverflow(page);
});
