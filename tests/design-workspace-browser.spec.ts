import { expect, test, type Page } from "@playwright/test";
test.use({ actionTimeout: 15000 });

async function activateDesign(page: Page, client = "epsa") {
  await page.goto(`/v2/clientes/${client}`);
  await page.getByRole("button", { name: "+ Agregar módulo de servicio" }).click();
  const dialog = page.getByRole("dialog");
  const design = dialog.locator("li").filter({ has: page.getByText("Diseño de marca", { exact: true }) }).first();
  await design.getByRole("checkbox").first().check();
  await design.getByLabel(/Alcance contratado/).fill("Design System y diseño mensual");
  await dialog.getByRole("checkbox", { name: /Confirmo que los cambios/ }).check();
  await dialog.getByRole("button", { name: /^Guardar 1 cambio/ }).click();
  await expect(dialog).toHaveCount(0);
  await page.goto(`/v2/clientes/${client}/diseno-marca?area=lineamientos`);
  await expect(page.getByRole("heading", { name: "Design System", exact: true })).toBeVisible();
}
async function stored(page: Page, collection: string, client = "epsa") {
  return page.evaluate(({ collection, client }) => JSON.parse(localStorage.getItem(`avans-os:preview:v1:client:${client}:module:diseno-marca:${collection}`) || "null")?.value, { collection, client });
}

test("design system, request and single task, immutable library versions, guidelines and mobile persist", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await activateDesign(page);
  await page.getByRole("button", { name: "Agregar recurso de marca" }).click();
  let editor = page.getByRole("dialog", { name: "Editar recurso de marca" });
  await editor.getByLabel("Nombre", { exact: true }).fill("Coral de pruebas");
  await editor.getByRole("combobox", { name: "Tipo", exact: true }).selectOption("Color");
  await editor.getByLabel("Hex", { exact: true }).fill("#ff897a");
  await editor.getByLabel("Función / jerarquía").fill("Acento principal");
  await editor.getByRole("button", { name: "Guardar recurso" }).click();
  await expect(editor).toHaveCount(0);
  await expect(page.getByText("#ff897a", { exact: true }).first()).toBeVisible();
  await expect(page).toHaveURL(/parte=color/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Coral de pruebas" })).toBeVisible();
  expect((await stored(page, "sistema"))[0].values.valor).toBe("#ff897a");
  await page.getByRole("button", { name: "Agregar recurso de marca" }).click();
  editor = page.getByRole("dialog", { name: "Editar recurso de marca" });
  await editor.getByLabel("Nombre", { exact: true }).fill("Logo de prueba");
  await editor.getByRole("combobox", { name: "Tipo", exact: true }).selectOption("Logo");
  await editor.getByLabel("Cargar imagen").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==", "base64") });
  await expect(editor.getByRole("button", { name: "Guardar recurso" })).toBeEnabled();
  await editor.getByRole("button", { name: "Guardar recurso" }).click();
  await expect(editor).toHaveCount(0);
  // Al guardar, el documento abre la parte del tipo de recurso (Identidad para logos).
  await expect(page).toHaveURL(/parte=identidad/);
  await page.reload();
  await expect(page.getByRole("img", { name: "Logo de prueba" })).toBeVisible();
  await page.screenshot({ path: "/tmp/avans-design-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: "/tmp/avans-design-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.getByRole("navigation", { name: "Áreas de Diseño de marca" }).getByRole("link", { name: "Operación mensual" }).click();
  await page.getByRole("navigation", { name: "Secciones de Diseño de marca" }).getByRole("link", { name: "Pedidos de diseño" }).click();
  await page.getByRole("button", { name: "Nuevo pedido de diseño" }).click();
  const requestDialog = page.getByRole("dialog", { name: "Nuevo pedido de diseño" });
  await requestDialog.getByLabel(/^Pieza de marca/).fill("Diseñar brochure QA");
  await requestDialog.getByLabel("Responsable", { exact: true }).selectOption({ index: 1 });
  await requestDialog.getByLabel("Objetivo", { exact: true }).fill("Presentar los servicios al cliente");
  await requestDialog.getByLabel("Fecha objetivo").fill("2026-12-01");
  await requestDialog.getByRole("button", { name: "Crear pedido y tarea" }).click();
  await expect(requestDialog).toHaveCount(0);
  await expect(page.getByRole("dialog")).toContainText("Diseñar · Diseñar brochure QA");
  const request = (await stored(page, "trabajos"))[0];
  const tasks = await page.evaluate(() => JSON.parse(localStorage.getItem("avans-os:preview:v1:workspace")!).value.tasks);
  expect(tasks.filter((t: { workItem?: { id: string } }) => t.workItem?.id === request.id)).toHaveLength(1);
  await page.keyboard.press("Escape");

  await page.getByRole("navigation", { name: "Áreas de Diseño de marca" }).getByRole("link", { name: "Biblioteca de marca" }).click();
  await page.getByRole("button", { name: "Agregar pieza a biblioteca" }).click();
  editor = page.getByRole("dialog", { name: "Agregar pieza a biblioteca" });
  await editor.getByLabel("Nombre", { exact: true }).fill("Brochure QA");
  await editor.getByLabel("Archivo o enlace").fill("https://example.com/brochure-v1.pdf");
  await editor.getByRole("combobox", { name: "Pedido relacionado", exact: true }).selectOption(request.id);
  await editor.getByRole("button", { name: "Guardar recurso" }).click();
  await expect(editor).toHaveCount(0);
  await expect(page.getByText("Versión 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Nueva versión", exact: true }).click();
  editor = page.getByRole("dialog", { name: "Nueva versión de la pieza" });
  await editor.getByLabel("Archivo o enlace").fill("https://example.com/brochure-v2.pdf");
  await editor.getByRole("button", { name: "Guardar recurso" }).click();
  await expect(page.getByText("Versión 2", { exact: true })).toBeVisible();
  await page.getByLabel("Ver versiones anteriores").check();
  await expect(page.getByText("Versión 1", { exact: true })).toBeVisible();
  const versions = await stored(page, "biblioteca");
  expect(versions).toHaveLength(2);
  expect(versions.find((r: { values: { version: string } }) => r.values.version === "1").values.archivo).toBe("https://example.com/brochure-v1.pdf");

  await page.getByRole("navigation", { name: "Áreas de Diseño de marca" }).getByRole("link", { name: "Lineamientos del servicio" }).click();
  await page.getByRole("button", { name: "Editar procedimientos" }).click();
  await page.getByLabel("Criterios de revisión", { exact: true }).fill("Comprobar legibilidad y contraste");
  await page.getByRole("button", { name: "Guardar procedimientos" }).click();
  await page.reload();
  await expect(page.getByText("Comprobar legibilidad y contraste", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.goto("/v2/clientes/aca/diseno-marca?seccion=sistema");
  await expect(page.getByText("Coral de pruebas", { exact: true })).toHaveCount(0);
  expect(await stored(page, "sistema", "aca")).toBeUndefined();
  expect(errors).toEqual([]);
});

test("design request and task roll back together on storage failure and retry keeps a single task", async ({ page }) => {
  await activateDesign(page);
  await page.getByRole("navigation", { name: "Áreas de Diseño de marca" }).getByRole("link", { name: "Operación mensual" }).click();
  await page.getByRole("navigation", { name: "Secciones de Diseño de marca" }).getByRole("link", { name: "Pedidos de diseño" }).click();
  await page.getByRole("button", { name: "Nuevo pedido de diseño" }).click();
  const dialog = page.getByRole("dialog", { name: "Nuevo pedido de diseño" });
  await dialog.getByLabel(/^Pieza de marca/).fill("Pedido transaccional QA");
  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "avans-os:preview:v1:workspace") throw new DOMException("Storage full", "QuotaExceededError");
      return set.call(this, key, value);
    };
    window.addEventListener("restore-design-storage", () => { Storage.prototype.setItem = set; }, { once: true });
  });
  await dialog.getByRole("button", { name: "Crear pedido y tarea" }).click();
  await expect(dialog.getByRole("alert")).toContainText("No se guardó el pedido ni su tarea");
  expect((await stored(page, "trabajos") || []).some((r: { values: { nombre: string } }) => r.values.nombre === "Pedido transaccional QA")).toBe(false);
  await expect(dialog.getByLabel(/^Pieza de marca/)).toHaveValue("Pedido transaccional QA");
  await page.evaluate(() => window.dispatchEvent(new Event("restore-design-storage")));
  await dialog.getByRole("button", { name: "Crear pedido y tarea" }).click();
  await expect(dialog).toHaveCount(0);
  const record = (await stored(page, "trabajos"))[0];
  const tasks = await page.evaluate(() => JSON.parse(localStorage.getItem("avans-os:preview:v1:workspace")!).value.tasks);
  expect(tasks.filter((t: { workItem?: { id: string } }) => t.workItem?.id === record.id)).toHaveLength(1);
  expect(record.values.tareaId).toBeTruthy();
});

test("content design support opens existing requests without activating a separate contract", async ({ page }) => {
  await page.goto("/v2/clientes/epsa");
  await expect(page.getByRole("heading", { name: "EPSA / Line Up", exact: true })).toBeVisible();
  await page.evaluate(() => {
    const at = new Date().toISOString();
    localStorage.setItem("avans-os:preview:v1:client:epsa:module:diseno-marca:trabajos", JSON.stringify({ version: 1, value: [{ id: "DIS-CONTENT-SUPPORT", client: "epsa", module: "diseno-marca", collection: "trabajos", user: "QA", source: "manual", createdAt: at, updatedAt: at, history: [], values: { nombre: "Diseño desde Contenidos", contenidoId: "CONTENT-SUPPORT", estado: "En curso" } }], savedAt: at }));
  });
  await page.goto("/v2/clientes/epsa/diseno-marca?seccion=trabajos");
  await expect(page.getByRole("heading", { name: "Pedidos de diseño de Contenidos", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Diseño desde Contenidos", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Nuevo pedido de diseño", exact: true })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Secciones de Diseño de marca" }).getByRole("link", { name: "Design System" })).toHaveCount(0);
  const active = await page.evaluate(() => JSON.parse(localStorage.getItem("avans-os:preview:v1:workspace")!).value.services.epsa);
  expect(active).toContain("contenidos");
  expect(active).not.toContain("diseno-marca");
  await page.getByRole("navigation", { name: "Áreas de Diseño de marca" }).getByRole("link", { name: "Lineamientos del servicio" }).click();
  await expect(page.getByRole("link", { name: "Plan de Marketing", exact: true }).last()).toHaveAttribute("href", /plan-contenidos$/);
});
