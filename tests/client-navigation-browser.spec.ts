import { test, expect, type Page } from "@playwright/test";

/* Navegación del cliente: Inicio | Tareas | Gestión y estrategia | módulos activos, y «Volver». */
const mainNav = (page: Page, name = "ACA") => page.getByRole("navigation", { name: `Navegación de ${name}` });
const managementNav = (page: Page, name = "ACA") => page.getByRole("navigation", { name: `Gestión y estrategia de ${name}`, exact: true });

async function switchRole(page: Page, name: string) {
  await page.getByRole("button", { name: /^Perfil:/ }).click();
  await page.getByRole("group", { name: "Rol simulado" }).getByRole("button", { name, exact: true }).click();
  await page.getByRole("button", { name: /^Perfil:/ }).click();
}

test("client bar is Inicio | Tareas | Gestión y estrategia | active services, with the client always visible", async ({ page }) => {
  await page.goto("/v2/clientes/aca");
  await expect(mainNav(page).getByRole("link")).toHaveText(["Inicio", "Tareas", "Gestión y estrategia", "Publicidad digital", "Contenidos"]);
  await mainNav(page).getByRole("link", { name: "Contenidos" }).click();
  await expect(page).toHaveURL(/\/v2\/clientes\/aca\/contenido/);
  await expect(mainNav(page).getByRole("link", { name: "Contenidos" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Módulo · ACA")).toBeVisible();
  // Compact header: no module row nor channels in the client banner.
  await page.goto("/v2/clientes/aca");
  await expect(page.getByLabel("Módulos de servicio contratados")).toHaveCount(0);
  await expect(page.getByText("aca.org.ar")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Registrar reunión/ })).toHaveCount(0);
});

test("Gestión y estrategia keeps its five sections in the new order", async ({ page }) => {
  await page.goto("/v2/clientes/aca");
  await mainNav(page).getByRole("link", { name: "Gestión y estrategia" }).click();
  await expect(managementNav(page).getByRole("link")).toHaveText(["Resumen", "Ficha del cliente", "Reportes", "Benchmark", "Plan de marketing", "Archivos y documentos"]);
  for (const [label, url] of [["Ficha del cliente", /view=ficha/], ["Reportes", /view=reportes/], ["Benchmark", /view=benchmark/], ["Plan de marketing", /view=plan/], ["Archivos y documentos", /view=documentos/]] as const) {
    await managementNav(page).getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(url);
    await expect(mainNav(page).getByRole("link", { name: "Gestión y estrategia" })).toHaveAttribute("data-active", "true");
  }
  await expect(page.getByRole("heading", { name: "Archivos y documentos", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Documentos y actualizaciones" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Biblioteca de archivos" }).click();
  await expect(page).toHaveURL(/archivos=biblioteca/);
  await expect(page.getByRole("heading", { name: "Biblioteca de archivos" })).toBeVisible();
});

test("old Materiales links open the unified Archivos y documentos", async ({ page }) => {
  await page.goto("/v2/clientes/epsa?view=ficha&ficha=materiales");
  await expect(page).toHaveURL(/view=documentos&archivos=biblioteca/);
  await expect(page.getByRole("heading", { name: "Biblioteca de archivos" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Materiales" })).toHaveCount(0);
});

test("Volver returns to the real origin with its context, and direct links get a logical destination", async ({ page }) => {
  // From the client's tasks list (with a filter in the URL) into a module.
  const origin = "/v2/clientes/epsa/tareas?vista=modulo";
  await page.goto(`/v2/clientes/epsa/campanas?seccion=campanas&volver=${encodeURIComponent(origin)}`);
  const back = page.getByRole("link", { name: "Volver", exact: true });
  await expect(back).toHaveAttribute("href", origin);
  await back.click();
  await expect(page).toHaveURL(/\/v2\/clientes\/epsa\/tareas\?vista=modulo/);
  // Direct link: the logical destination is the client Inicio.
  await page.goto("/v2/clientes/epsa/campanas");
  await expect(page.getByRole("link", { name: "Volver a EPSA / Line Up" })).toHaveAttribute("href", "/v2/clientes/epsa");
  // External or malformed destinations are ignored.
  for (const bad of ["https://evil.example/x", "//evil.example", "/v2evil", "javascript:alert(1)"]) {
    await page.goto(`/v2/clientes/epsa/campanas?volver=${encodeURIComponent(bad)}`);
    await expect(page.getByRole("link", { name: "Volver a EPSA / Line Up" })).toHaveAttribute("href", "/v2/clientes/epsa");
  }
  // Sub-screens of Gestión y estrategia go back to its summary when opened directly.
  await page.goto("/v2/clientes/epsa?view=benchmark");
  await expect(page.getByRole("link", { name: "Volver a Gestión y estrategia" })).toHaveAttribute("href", "/v2/clientes/epsa?view=gestion");
});

test("service Lineamientos read the Plan de marketing (general guidelines first)", async ({ page }) => {
  await page.goto("/v2/clientes/epsa?view=plan");
  const index = page.getByRole("navigation", { name: "Índice de Plan de Marketing" });
  await expect(index.getByRole("link").first()).toHaveText("Lineamientos generales");
  for (const block of ["Posicionamiento", "Claim y storytelling", "Objetivos del plan", "Ecosistema digital"])
    await expect(page.locator("#plan-lineamientos-generales").getByRole("heading", { name: block, exact: true })).toBeVisible();
  await page.goto("/v2/clientes/epsa/campanas?area=lineamientos");
  await expect(page.getByRole("navigation", { name: "Áreas de Publicidad digital" }).getByRole("link")).toHaveText(["Lineamientos", "Operación mensual"]);
  await expect(page.getByRole("heading", { name: "Lineamientos generales de la cuenta" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Capítulo del servicio en el Plan" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar procedimientos" })).toHaveCount(0);
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

test("mobile and tablet: client bar scrolls inside itself without page overflow", async ({ page }) => {
  for (const width of [390, 820]) {
    await page.setViewportSize({ width, height: 900 });
    for (const url of ["/v2/clientes/aca", "/v2/clientes/aca?view=gestion", "/v2/clientes/aca/contenido", "/v2/clientes/aca?view=documentos&archivos=biblioteca"]) {
      await page.goto(url);
      await expect(mainNav(page).getByRole("link", { name: "Inicio", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    }
  }
});
