import { test, expect, type Page } from "@playwright/test";

const mainNav = (page: Page, name = "ACA") => page.getByRole("navigation", { name: `Navegación de ${name}` });
const managementNav = (page: Page, name = "ACA") => page.getByRole("navigation", { name: `Gestión de ${name}`, exact: true });

async function switchRole(page: Page, name: string) {
  await page.getByRole("button", { name: /^Perfil:/ }).click();
  await page.getByRole("group", { name: "Rol simulado" }).getByRole("button", { name, exact: true }).click();
  await page.getByRole("button", { name: /^Perfil:/ }).click();
}

test("client navigation is Inicio | Tareas | Gestión y estrategia with a compact header", async ({ page }) => {
  await page.goto("/v2/clientes/aca");
  await expect(mainNav(page).getByRole("link")).toHaveText(["Inicio", "Tareas", "Gestión y estrategia"]);
  const header = page.locator("header").filter({ has: page.getByRole("heading", { name: "ACA", level: 1 }) });
  await expect(header).toContainText("Cliente desde ago 2023");
  await expect(header).toContainText("Burbuja Norte");
  await expect(header).toContainText("Responsable Sofía Ramírez");
  await expect(header).toContainText("Equipo asignado");
  // Canales y accesos estratégicos ya no están en la cabecera ni en Inicio.
  await expect(page.getByText("aca.org.ar")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Editar canales" })).toHaveCount(0);
  for (const name of ["Ficha del cliente", "Benchmark", "Plan de Marketing", "Documentos"]) await expect(page.getByRole("link", { name: new RegExp(`^${name}`) })).toHaveCount(0);
  const modules = page.getByRole("region", { name: "Resumen de módulos" });
  await expect(modules.getByRole("link", { name: "Abrir Contenidos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Agregar módulo de servicio" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Actividad relevante" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Alertas y temas que requieren atención" })).toBeVisible();

  await mainNav(page).getByRole("link", { name: "Tareas" }).click();
  await expect(page).toHaveURL(/\/v2\/clientes\/aca\/tareas/);
  await expect(mainNav(page).getByRole("link", { name: "Tareas" })).toHaveAttribute("aria-current", "page");
});

test("Gestión y estrategia holds channels, the five accesses and recent updates", async ({ page }) => {
  await page.goto("/v2/clientes/aca");
  await mainNav(page).getByRole("link", { name: "Gestión y estrategia" }).click();
  await expect(page).toHaveURL(/view=gestion/);
  await expect(managementNav(page).getByRole("link")).toHaveText(["Resumen", "Ficha del cliente", "Benchmark", "Plan de Marketing", "Reportes", "Documentos"]);
  await expect(page.getByRole("heading", { name: "Información de la cuenta y canales" })).toBeVisible();
  await expect(page.getByText("aca.org.ar")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Estado y actualizaciones relevantes" })).toBeVisible();

  const access = page.getByRole("navigation", { name: "Accesos de gestión de ACA" });
  const expected: [string, RegExp][] = [
    ["Ficha del cliente", /view=ficha/],
    ["Benchmark", /view=benchmark/],
    ["Plan de Marketing", /view=plan/],
    ["Reportes", /view=reportes/],
    ["Documentos", /view=documentos/],
  ];
  for (const [label, url] of expected) {
    await page.goto("/v2/clientes/aca?view=gestion");
    await access.getByRole("link", { name: new RegExp(`^${label}`) }).click();
    await expect(page).toHaveURL(url);
    await expect(mainNav(page).getByRole("link", { name: "Gestión y estrategia" })).toHaveAttribute("data-active", "true");
    await expect(managementNav(page).getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
  }
  await expect(page.getByRole("heading", { name: "Fuentes y actualizaciones" })).toBeVisible();

  // Editar y agregar canales.
  await page.goto("/v2/clientes/aca?view=gestion");
  await page.getByRole("button", { name: "Editar canales" }).click();
  const add = page.getByRole("form", { name: "Agregar canal" });
  await add.getByLabel("Tipo").selectOption("LinkedIn");
  await add.getByLabel("Cuenta, URL o detalle").fill("linkedin.com/company/demo-qa");
  await add.getByRole("button", { name: "Agregar canal" }).click();
  await page.getByLabel("Nombre de Instagram").fill("Instagram institucional");
  await page.getByRole("button", { name: "Listo" }).click();
  await page.reload();
  await expect(page.getByText("linkedin.com/company/demo-qa")).toBeVisible();
  await expect(page.getByText("Instagram institucional")).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("avans-os:preview:v1:client:aca:channels") || "null")?.value);
  expect(stored.find((channel: { value: string }) => channel.value === "linkedin.com/company/demo-qa")).toMatchObject({ type: "LinkedIn" });
  // Aislamiento: EPSA conserva sus canales.
  await page.goto("/v2/clientes/epsa?view=gestion");
  await expect(page.getByText("linkedin.com/company/demo-qa")).toHaveCount(0);

  // Un rol sin gestión de la cuenta ve los canales en solo lectura.
  await switchRole(page, "Diseñador");
  await expect(page.getByText("Canales en solo lectura")).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar canales" })).toHaveCount(0);
});

test("legacy management URLs still open inside Gestión y estrategia", async ({ page }) => {
  await page.goto("/v2/clientes/aca?view=ficha");
  await expect(mainNav(page).getByRole("link", { name: "Gestión y estrategia" })).toHaveAttribute("data-active", "true");
  await expect(page.getByRole("heading", { name: "Ficha del cliente" })).toBeVisible();
  await page.goto("/v2/clientes/aca?view=cuestionario");
  await expect(managementNav(page).getByRole("link", { name: "Ficha del cliente", exact: true })).toHaveAttribute("aria-current", "page");
});

test("service modules keep their workspace without a second main navigation", async ({ page }) => {
  await page.goto("/v2/clientes/aca/contenido");
  await expect(mainNav(page).getByRole("link")).toHaveText(["Inicio", "Tareas", "Gestión y estrategia"]);
  await expect(mainNav(page)).toContainText("Contenidos");
  await expect(mainNav(page).getByRole("link", { name: /Publicidad digital/ })).toHaveCount(0);
  await page.getByText("Cambiar módulo").click();
  await page.getByRole("link", { name: "Publicidad digital" }).click();
  await expect(page).toHaveURL(/\/v2\/clientes\/aca\/campanas/);
});

test("an inactive module can be activated as a demonstration by authorized roles only", async ({ page }) => {
  await page.goto("/v2/clientes/aca/diseno-marca");
  await switchRole(page, "Ejecutiva de cuentas");
  await expect(page.getByRole("button", { name: "Activar como demostración" })).toHaveCount(0);
  await switchRole(page, "Administrador");
  await page.getByRole("button", { name: "Activar como demostración" }).click();
  await expect(page.getByRole("heading", { name: "Diseño de marca", level: 1 })).toBeVisible();
  const modules = await page.evaluate(() => JSON.parse(localStorage.getItem("avans-os:preview:v1:client:aca:service-modules") || "null")?.value.modules);
  expect(modules["diseno-marca"]).toMatchObject({ active: true, kind: "demo" });
  await page.goto("/v2/clientes/aca");
  await expect(page.getByRole("region", { name: "Resumen de módulos" }).getByRole("link", { name: "Abrir Diseño de marca" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Resumen de módulos" }).getByRole("link", { name: "Abrir Contenidos" })).toBeVisible();
  await page.goto("/v2/clientes/epsa/diseno-marca");
  await expect(page.getByRole("button", { name: "Activar como demostración" })).toBeVisible();
});

test("mobile: the three tabs fit without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const url of ["/v2/clientes/aca", "/v2/clientes/aca?view=gestion", "/v2/clientes/aca/contenido"]) {
    await page.goto(url);
    const nav = mainNav(page);
    for (const name of ["Inicio", "Tareas", "Gestión y estrategia"]) {
      const box = await nav.getByRole("link", { name }).boundingBox();
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  }
});
