import { test, expect, type Page, type Locator } from "@playwright/test";

async function openDiscovery(page: Page, slug = "epsa") {
  await page.goto(`/v2/clientes/${slug}?view=ficha`);
  await page.getByRole("tab", { name: "Discovery del negocio" }).click();
  await expect(
    page.getByRole("heading", { name: "Discovery del negocio", exact: true }),
  ).toBeVisible();
}
const INDEX: Record<string, { link: string; heading: string }> = {
  "Quiénes somos": { link: "Empresa", heading: "Quiénes somos" },
  "Datos relevantes": { link: "Datos", heading: "Datos relevantes" },
  "Unidades de negocio": { link: "Unidades", heading: "Unidades de negocio" },
  "Productos y servicios": { link: "Productos", heading: "Productos y servicios" },
  "Proceso comercial": { link: "Proceso comercial", heading: "Proceso comercial" },
  Segmentación: { link: "Segmentación", heading: "Segmentación y targeting" },
  "ICP B2B": { link: "ICP B2B", heading: "ICP B2B" },
  "ICP B2C": { link: "ICP B2C", heading: "ICP B2C" },
  Fuentes: { link: "Fuentes", heading: "Fuentes y validaciones" },
};
/** Continuous document: the sticky index scrolls to the section and marks it as current. */
async function section(page: Page, label: string) {
  const target = INDEX[label];
  const link = page
    .getByRole("navigation", { name: "Índice de Discovery del negocio" })
    .getByRole("link", { name: target.link, exact: true });
  await link.click();
  await expect(
    page.getByRole("heading", { name: target.heading, exact: true }),
  ).toBeInViewport();
  await expect(link).toHaveAttribute("aria-current", "location");
}
async function save(page: Page) {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Guardar en este navegador", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
const ADD_LABEL: Record<string, string> = {
  "Agregar icp b2b": "+ Agregar ICP B2B",
  "Agregar icp b2c": "+ Agregar ICP B2C",
  "Agregar etapa comercial": "+ Agregar etapa",
};
async function add(page: Page, button: string, name: string) {
  await page
    .getByRole("button", { name: ADD_LABEL[button] ?? `+ ${button}`, exact: true })
    .click();
  await page.locator("#discovery-field-name").fill(name);
}
function card(page: Page, name: string): Locator {
  return page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
}
async function role(page: Page, name: string) {
  await page.getByRole("button", { name: /^Perfil:/ }).click();
  await page
    .getByRole("group", { name: "Rol simulado" })
    .getByRole("button", { name, exact: true })
    .click();
  await page.getByRole("button", { name: /^Perfil:/ }).click();
}

test("complete PM journey: eight sections, CRUD, relationships, quadrants, ICP, reload, isolation and preview", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openDiscovery(page);
  await expect(
    page
      .getByRole("navigation", { name: "Gestión de EPSA / Line Up" })
      .getByRole("link"),
  ).toHaveCount(5);
  for (const label of [
    "Quiénes somos",
    "Datos relevantes",
    "Unidades de negocio",
    "Productos y servicios",
    "Proceso comercial",
    "Segmentación",
    "ICP B2B",
    "ICP B2C",
  ]) {
    await section(page, label);
  }
  await expect(
    page.getByRole("navigation", { name: "Índice de Discovery del negocio" }).getByRole("link").first(),
  ).toHaveText("Empresa");
  await expect(page.getByText(/cobertura general/i)).toHaveCount(0);
  await section(page, "Datos relevantes");
  await add(page, "Agregar dato relevante", "Dato de QA persistente");
  await page.locator("#discovery-field-value").fill("Hecho de prueba");
  await page.locator("#discovery-field-featured").check();
  await save(page);
  await page.reload();
  await page.getByRole("tab", { name: "Discovery del negocio" }).click();
  await section(page, "Datos relevantes");
  await expect(card(page, "Dato de QA persistente")).toBeVisible();
  await card(page, "Dato de QA persistente")
    .getByRole("button", { name: "Duplicar", exact: true })
    .click();
  await save(page);
  await page
    .getByRole("button", {
      name: "Subir Dato de QA persistente (copia)",
      exact: true,
    })
    .click();
  await card(page, "Dato de QA persistente (copia)")
    .getByRole("button", { name: "Eliminar", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await expect(card(page, "Dato de QA persistente (copia)")).toBeVisible();
  await card(page, "Dato de QA persistente (copia)")
    .getByRole("button", { name: "Eliminar", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar eliminación", exact: true })
    .click();
  await expect(card(page, "Dato de QA persistente (copia)")).toHaveCount(0);
  await section(page, "Unidades de negocio");
  await add(page, "Agregar unidad de negocio", "Unidad QA");
  await page.locator("#discovery-field-primary").check();
  await save(page);
  await section(page, "Productos y servicios");
  await add(page, "Agregar producto o servicio", "Producto QA");
  await page.locator("#discovery-field-type").selectOption("Producto");
  await page
    .locator("#discovery-field-businessUnitId")
    .selectOption({ label: "Unidad QA" });
  await save(page);
  await page
    .getByLabel("Filtrar por unidad de negocio")
    .selectOption({ label: "Unidad QA" });
  const products = page.locator("#discovery-productos");
  await expect(
    products.locator("article").filter({ has: page.getByRole("heading", { name: "Producto QA", exact: true }) }),
  ).toBeVisible();
  await expect(
    products.locator("article").filter({ has: page.getByRole("heading", { name: "Line Up", exact: true }) }),
  ).toHaveCount(0);
  await section(page, "Unidades de negocio");
  await card(page, "Unidad QA")
    .getByRole("button", { name: "Eliminar", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Confirmar eliminación" }),
  ).toBeDisabled();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await section(page, "Segmentación");
  await add(page, "Agregar segmento", "Segmento B2B QA");
  await page.locator("#discovery-field-type").selectOption("B2B");
  await page.locator("#discovery-field-match").fill("80");
  await page.locator("#discovery-field-potential").fill("90");
  await page.locator("#discovery-field-currentRelevance").fill("30");
  await page.locator("#discovery-field-requiresIcp").check();
  await page
    .getByRole("dialog")
    .getByLabel("Producto QA", { exact: true })
    .check();
  await save(page);
  await expect(
    card(page, "Segmento B2B QA").getByText("Foco principal", { exact: true }),
  ).toBeVisible();
  await card(page, "Segmento B2B QA")
    .getByRole("button", { name: "Editar", exact: true })
    .click();
  await page.locator("#discovery-field-match").fill("10");
  await page.locator("#discovery-field-potential").fill("0");
  await save(page);
  await expect(
    card(page, "Segmento B2B QA").getByText("Despriorizar", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /^Segmento B2B QA: Despriorizar/ })
    .press("Enter");
  await expect(
    card(page, "Segmento B2B QA").getByText("Relevancia actual (0–100)", {
      exact: true,
    }),
  ).toBeVisible();
  await section(page, "ICP B2B");
  await add(page, "Agregar icp b2b", "ICP empresa QA");
  await page
    .locator("#discovery-field-segmentId")
    .selectOption({ label: "Segmento B2B QA" });
  await page
    .getByRole("dialog")
    .getByLabel("Producto QA", { exact: true })
    .check();
  await save(page);
  await section(page, "Segmentación");
  await add(page, "Agregar segmento", "Segmento B2C QA");
  await page.locator("#discovery-field-type").selectOption("B2C");
  await save(page);
  await section(page, "ICP B2C");
  await add(page, "Agregar icp b2c", "ICP consumidor QA");
  await page
    .locator("#discovery-field-segmentId")
    .selectOption({ label: "Segmento B2C QA" });
  await save(page);
  await expect(
    page
      .locator("#discovery-icp-b2c")
      .getByText("Aplica a este negocio", { exact: true }),
  ).toBeVisible();
  await section(page, "Proceso comercial");
  await add(page, "Agregar etapa comercial", "Seguimiento QA");
  await page.locator("#discovery-field-channel").fill("Canal de prueba");
  await save(page);
  await page
    .getByRole("button", { name: "Subir Seguimiento QA", exact: true })
    .click();
  const pendingSummary = page.locator("summary", {
    hasText: /^Pendientes antes de exportar/,
  });
  await pendingSummary.click();
  await expect(
    pendingSummary
      .locator("..")
      .getByRole("link", { name: "Proceso comercial", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Vista previa del contenido de presentación",
    }),
  ).toHaveCount(0);
  await openDiscovery(page, "aca");
  await section(page, "Datos relevantes");
  await expect(card(page, "Dato de QA persistente")).toHaveCount(0);
  await openDiscovery(page);
  await section(page, "Datos relevantes");
  await expect(card(page, "Dato de QA persistente")).toBeVisible();
  const keys = await page.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.endsWith(":knowledge:v1")),
  );
  expect(keys).toEqual(["avans-os:preview:v1:client:epsa:knowledge:v1"]);
  expect(errors).toEqual([]);
});

test("roles enforce admin, assigned PM, unassigned PM and readonly operative after reload", async ({
  page,
}) => {
  await openDiscovery(page);
  await expect(
    page.locator("#discovery-empresa").getByRole("button", { name: "Editar", exact: true }),
  ).toBeVisible();
  await role(page, "Ejecutiva de cuentas");
  await expect(
    page.locator("#discovery-empresa").getByRole("button", { name: "Editar", exact: true }),
  ).toHaveCount(0);
  await section(page, "Datos relevantes");
  await expect(
    page.getByRole("button", { name: "+ Agregar dato relevante", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await page.getByRole("tab", { name: "Discovery del negocio" }).click();
  await expect(
    page.locator("#discovery-empresa").getByRole("button", { name: "Editar", exact: true }),
  ).toHaveCount(0);
  await role(page, "Project Manager · Valentina Ríos");
  await expect(
    page.locator("#discovery-empresa").getByRole("button", { name: "Editar", exact: true }),
  ).toBeVisible();
  await openDiscovery(page, "aca");
  await expect(
    page.locator("#discovery-empresa").getByRole("button", { name: "Editar", exact: true }),
  ).toHaveCount(0);
  await role(page, "Administrador");
  await expect(
    page.locator("#discovery-empresa").getByRole("button", { name: "Editar", exact: true }),
  ).toBeVisible();
});

test("sources, actual validation, failed storage, cross-tab conflict and keyboard focus", async ({
  page,
  context,
}) => {
  await openDiscovery(page);
  await section(page, "Fuentes");
  await add(page, "Agregar fuente", "Fuente QA");
  await page.locator("#discovery-field-type").selectOption("Carga manual");
  await page.locator("#discovery-field-reference").fill("Referencia de QA");
  await page.locator("#discovery-field-date").fill("2026-11-10");
  await page.locator("#discovery-field-evidence").fill("Evidencia de prueba");
  await page.locator("#discovery-field-status").selectOption("Validado");
  await save(page);
  await section(page, "Datos relevantes");
  await add(page, "Agregar dato relevante", "Dato validado QA");
  await page.locator("#discovery-field-status").selectOption("Validado");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Guardar en este navegador" })
    .click();
  await expect(
    page.getByRole("alert").getByText("Para validar falta: Valor"),
  ).toBeVisible();
  await page.locator("#discovery-field-value").fill("Valor de prueba");
  await page.locator("#discovery-field-relevance").fill("Comprobar validación");
  await page.locator("#discovery-field-category").selectOption("Otra");
  await page.locator("#discovery-field-evidence").fill("Cita de prueba");
  await page
    .getByRole("dialog")
    .getByLabel("Fuente QA", { exact: true })
    .check();
  await save(page);
  await expect(
    card(page, "Dato validado QA").getByText("Validado", { exact: true }),
  ).toBeVisible();
  await card(page, "Dato validado QA")
    .getByRole("button", { name: "Editar", exact: true })
    .click();
  const other = await context.newPage();
  await openDiscovery(other);
  await section(other, "Datos relevantes");
  await card(other, "Dato validado QA")
    .getByRole("button", { name: "Editar", exact: true })
    .click();
  await other.locator("#discovery-field-value").fill("Cambio en otra pestaña");
  await save(other);
  await page.locator("#discovery-field-value").fill("Conflicto");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Guardar en este navegador" })
    .click();
  await expect(
    page.getByRole("alert").getByText(/Este registro cambió en otra pestaña/),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    card(page, "Dato validado QA").getByRole("button", {
      name: "Editar",
      exact: true,
    }),
  ).toBeFocused();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k.endsWith(":knowledge:v1"))
        throw new DOMException("Quota", "QuotaExceededError");
      original.call(this, k, v);
    };
  });
  await add(page, "Agregar dato relevante", "No debe guardarse");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Guardar en este navegador" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("alert").getByText(/No se pudo guardar en este navegador/),
  ).toBeVisible();
});

test("regression: scope, five management accesses, home, tasks, content, modules and general overview", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openDiscovery(page);
  await page.getByRole("tab", { name: "Alcance del servicio" }).click();
  await expect(
    page.getByRole("region", { name: "Alcance por módulo" }),
  ).toBeVisible();
  for (const label of [
    "Benchmark",
    "Plan de Marketing",
    "Reportes",
    "Documentos",
  ]) {
    await page
      .getByRole("navigation", { name: "Gestión de EPSA / Line Up" })
      .getByRole("link", { name: new RegExp(`^${label}`) })
      .click();
    await expect(
      page.getByRole("heading", {
        name: label === "Documentos" ? "Fuentes y actualizaciones" : label,
        exact: true,
      }),
    ).toBeVisible();
  }
  await page
    .getByRole("navigation", { name: "Trabajo diario de EPSA / Line Up" })
    .getByRole("link", { name: "Inicio", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Resumen de módulos" }),
  ).toBeVisible();
  const nav = page.getByRole("navigation", {
    name: "Trabajo diario de EPSA / Line Up",
  });
  const links = await nav
    .getByRole("link")
    .evaluateAll((nodes) =>
      nodes.map((n) => ({
        name: n.textContent ?? "",
        href: n.getAttribute("href")!,
      })),
    );
  for (const link of links.filter((l) => l.name.trim() !== "Inicio")) {
    const response = await page.goto(link.href);
    expect(response?.status(), link.name).toBe(200);
    await expect(page.locator("main").first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Application error");
  }
  const response = await page.goto("/v2/clientes");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Clientes", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

for (const [name, width, height] of [
  ["desktop", 1440, 900],
  ["notebook", 1280, 800],
  ["tablet", 820, 1180],
  ["mobile", 390, 844],
] as const) {
  test(`responsive ${name}: navigation, matrix, drawer and no critical overflow`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height });
    await openDiscovery(page);
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`${name}-discovery.png`),
      fullPage: true,
    });
    await section(page, "Segmentación");
    await expect(
      page.getByRole("button", { name: /1. Empresas/ }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      )
      .toBe(true);
    await add(page, "Agregar segmento", "Segmento responsive QA");
    const box = await page.getByRole("dialog").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.width).toBeLessThanOrEqual(width);
    await expect
      .poll(() =>
        page
          .getByRole("dialog")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      )
      .toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`${name}-drawer.png`),
      fullPage: true,
    });
    await save(page);
    await expect(card(page, "Segmento responsive QA")).toBeVisible();
  });
}
