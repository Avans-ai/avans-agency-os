import { test, expect, type Page } from "@playwright/test";

/* Navegación del cliente según «Avans OS – Funcionalidades 2». */
const mainNav = (page: Page, name = "ACA") => page.getByRole("navigation", { name: `Navegación de ${name}` });
const strategyNav = (page: Page, name = "ACA") => page.getByRole("navigation", { name: `Estrategia de ${name}`, exact: true });
const shortcuts = (page: Page, name = "ACA") => page.getByRole("navigation", { name: `Accesos directos de ${name}` });

async function switchRole(page: Page, name: string) {
  await page.getByRole("button", { name: /^Perfil:/ }).click();
  await page.getByRole("group", { name: "Rol simulado" }).getByRole("button", { name, exact: true }).click();
  await page.getByRole("button", { name: /^Perfil:/ }).click();
}

test("section bar is Inicio · Tareas · Estrategia · contracted modules", async ({ page }) => {
  await page.goto("/v2/clientes/aca");
  await expect(mainNav(page).getByRole("link")).toHaveText(["Inicio", "Tareas", "Estrategia", "Publicidad digital", "Contenidos"]);
  await expect(mainNav(page).getByRole("link", { name: "Inicio" })).toHaveAttribute("aria-current", "page");
  await mainNav(page).getByRole("link", { name: "Contenidos" }).click();
  await expect(page).toHaveURL(/\/v2\/clientes\/aca\/contenido/);
  await expect(mainNav(page).getByRole("link", { name: "Contenidos" })).toHaveAttribute("aria-current", "page");
  await mainNav(page).getByRole("link", { name: "Tareas" }).click();
  await expect(page).toHaveURL(/\/v2\/clientes\/aca\/tareas/);
  await expect(mainNav(page).getByRole("link", { name: "Tareas" })).toHaveAttribute("aria-current", "page");
});

test("banner shows contracted modules that open their scope", async ({ page }) => {
  await page.goto("/v2/clientes/aca");
  const modules = page.getByLabel("Módulos de servicio contratados");
  await expect(modules.getByRole("button")).toHaveText(["Publicidad digital", "Contenidos"]);
  await modules.getByRole("button", { name: "Contenidos" }).click();
  const panel = page.getByRole("dialog", { name: "Alcance de Contenidos" });
  await expect(panel.getByRole("heading", { name: "Entregables comprometidos" })).toBeVisible();
  await expect(panel.getByText(/Revisión periódica|revisión periódica/).first()).toBeVisible();
  await panel.getByRole("link", { name: "Abrir Contenidos" }).click();
  await expect(page).toHaveURL(/\/contenido/);
  // Los canales ya no están en el banner.
  await page.goto("/v2/clientes/aca");
  await expect(page.getByText("aca.org.ar")).toHaveCount(0);
});

test("three floating shortcuts accompany every client section", async ({ page }) => {
  for (const url of ["/v2/clientes/aca", "/v2/clientes/aca/tareas", "/v2/clientes/aca/contenido", "/v2/clientes/aca?view=plan"]) {
    await page.goto(url);
    await expect(shortcuts(page).getByRole("link")).toHaveText(["Ficha del cliente", "Benchmark", "Cargar documentos"]);
  }
  await shortcuts(page).getByRole("link", { name: "Benchmark" }).click();
  await expect(page).toHaveURL(/view=benchmark/);
  await shortcuts(page).getByRole("link", { name: "Cargar documentos" }).click();
  await expect(page).toHaveURL(/view=documentos/);
  await shortcuts(page).getByRole("link", { name: "Ficha del cliente" }).click();
  await expect(page).toHaveURL(/view=ficha/);
});

test("Estrategia groups Ficha, Benchmark, Plan, Reportes and Documentos; channels live in the Ficha", async ({ page }) => {
  await page.goto("/v2/clientes/aca");
  await mainNav(page).getByRole("link", { name: "Estrategia" }).click();
  await expect(page).toHaveURL(/view=gestion/);
  await expect(strategyNav(page).getByRole("link")).toHaveText(["Resumen", "Ficha del cliente", "Benchmark", "Plan de Marketing", "Reportes", "Documentos"]);
  for (const [label, url] of [["Benchmark", /view=benchmark/], ["Plan de Marketing", /view=plan/], ["Reportes", /view=reportes/], ["Documentos", /view=documentos/], ["Ficha del cliente", /view=ficha/]] as const) {
    await strategyNav(page).getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(url);
    await expect(mainNav(page).getByRole("link", { name: "Estrategia" })).toHaveAttribute("data-active", "true");
  }
  // Canales y plataformas dentro de la Ficha, editables por el PM/administrador.
  await expect(page.getByRole("heading", { name: "Canales y plataformas" })).toBeVisible();
  await page.getByRole("button", { name: "Editar canales" }).click();
  const add = page.getByRole("form", { name: "Agregar canal" });
  await add.getByLabel("Tipo").selectOption("LinkedIn");
  await add.getByLabel("Cuenta, URL o detalle").fill("linkedin.com/company/demo-qa");
  await add.getByRole("button", { name: "Agregar canal" }).click();
  await page.getByRole("button", { name: "Listo" }).click();
  await page.reload();
  await expect(page.getByText("linkedin.com/company/demo-qa")).toBeVisible();
  await page.goto("/v2/clientes/epsa?view=ficha");
  await expect(page.getByText("linkedin.com/company/demo-qa")).toHaveCount(0);
  await switchRole(page, "Diseñador");
  await expect(page.getByText("Canales en solo lectura")).toBeVisible();
});

test("an inactive module can be activated as a demonstration by authorized roles only", async ({ page }) => {
  await page.goto("/v2/clientes/epsa/diseno-marca");
  await switchRole(page, "Ejecutiva de cuentas");
  await expect(page.getByRole("button", { name: "Activar como demostración" })).toHaveCount(0);
  await switchRole(page, "Administrador");
  await page.getByRole("button", { name: "Activar como demostración" }).click();
  await expect(page.getByRole("heading", { name: "Diseño de marca", level: 1 })).toBeVisible();
  await expect(mainNav(page, "EPSA / Line Up").getByRole("link", { name: "Diseño de marca" })).toBeVisible();
});

test("mobile: bar scrolls inside itself and shortcuts stay reachable without page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const url of ["/v2/clientes/aca", "/v2/clientes/aca?view=gestion", "/v2/clientes/aca/contenido"]) {
    await page.goto(url);
    await expect(shortcuts(page).getByRole("link", { name: "Cargar documentos" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  }
});
