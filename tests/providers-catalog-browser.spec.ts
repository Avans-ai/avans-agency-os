import { test, expect, type Page } from "@playwright/test";
test.use({ actionTimeout: 15000 });

const KEY = "avans-os:preview:v1:";
type Provider = { id: string; nombre: string; activo: boolean; source: string; tipos: string[]; links: { url: string }[]; descripcion: string; foto: string };
const catalog = (page: Page) => page.evaluate((prefix) => JSON.parse(localStorage.getItem(`${prefix}providers:catalog`) || "null")?.value?.providers as Provider[] | undefined, KEY);
// 1×1 PNG generado localmente (no es una foto tomada de internet).
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

test("catálogo de proveedores en Personas y Cultura: alta, edición, baja y uso desde Audiovisuales", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/v2/proveedores");
  await expect(page.getByRole("heading", { name: "Catálogo de proveedores", level: 1 })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Ubicación" })).toContainText("RRHH");
  await expect(page.getByRole("link", { name: "Catálogo de proveedores" }).first()).toHaveAttribute("aria-current", "page");
  const list = page.getByRole("list", { name: "Proveedores audiovisuales" });
  await expect(list.getByRole("listitem")).toHaveCount(3);
  await expect(list.getByRole("listitem", { name: "Kinética Films" })).toContainText("Demo");

  await page.getByRole("button", { name: "Nuevo proveedor" }).click();
  const form = page.getByRole("dialog", { name: "Nuevo proveedor" });
  await form.getByLabel("Nombre del proveedor").fill("QA Producciones");
  await form.getByLabel("UGC").check();
  await form.getByLabel("Descripción").fill("Contenido vertical con creadores para marcas educativas.");
  await form.getByRole("button", { name: "Guardar proveedor" }).click();
  await expect(form.getByRole("alert")).toContainText("Agregá al menos un enlace");
  await form.getByLabel("URL del enlace 1").fill("https://example.com/qa-producciones");
  await form.locator('input[type="file"]').setInputFiles({ name: "qa.png", mimeType: "image/png", buffer: PNG });
  await expect(form.locator("img")).toHaveCount(1);
  await form.getByRole("button", { name: "Guardar proveedor" }).click();
  await expect(form).toHaveCount(0);
  const created = (await catalog(page))!.find((item) => item.nombre === "QA Producciones")!;
  expect(created).toMatchObject({ source: "manual", activo: true, tipos: ["UGC"], links: [{ url: "https://example.com/qa-producciones" }] });
  expect(created.foto).toMatch(/^data:image\/png;base64,/);

  const card = list.getByRole("listitem", { name: "QA Producciones" });
  await card.getByRole("button", { name: "Editar QA Producciones" }).click();
  const edit = page.getByRole("dialog", { name: "Editar QA Producciones" });
  await edit.getByLabel("Producto").check();
  await edit.getByRole("button", { name: "Guardar proveedor" }).click();
  await expect.poll(async () => (await catalog(page))!.find((item) => item.id === created.id)!.tipos).toEqual(["UGC", "Producto"]);

  // Audiovisuales elige del catálogo: el nuevo proveedor aparece; uno dado de baja, no.
  await list.getByRole("listitem", { name: "Lumen Audiovisual" }).getByRole("button", { name: "Dar de baja" }).click();
  await page.goto("/v2/clientes/edinovo/audiovisuales?seccion=jornadas");
  await page.getByRole("button", { name: "Nueva jornada" }).click();
  const create = page.getByRole("dialog", { name: "Nueva jornada" });
  await create.getByText("Producto", { exact: true }).click();
  await expect(create.locator("label").filter({ hasText: "QA Producciones" })).toContainText("Recomendado para Producto");
  await expect(create.locator("label").filter({ hasText: "Lumen Audiovisual" })).toHaveCount(0);
  await page.keyboard.press("Escape");

  await page.goto("/v2/proveedores");
  await list.getByRole("listitem", { name: "Lumen Audiovisual" }).getByRole("button", { name: "Reactivar" }).click();
  await list.getByRole("listitem", { name: "QA Producciones" }).getByRole("button", { name: "Eliminar" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(3);
  expect((await catalog(page))!.every((item) => item.activo)).toBe(true);
  // Los proveedores de demostración no se eliminan (solo se dan de baja).
  await expect(list.getByRole("listitem", { name: "Kinética Films" }).getByRole("button", { name: "Eliminar" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("solo la responsable del área edita el catálogo; el resto lo consulta", async ({ page }) => {
  await page.goto("/v2");
  await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem("avans-os:preview:v1:workspace")))).toBe(true);
  await page.evaluate((prefix) => { const w = JSON.parse(localStorage.getItem(`${prefix}workspace`)!); w.value.role = "content"; localStorage.setItem(`${prefix}workspace`, JSON.stringify(w)); }, KEY);
  await page.goto("/v2/proveedores");
  await expect(page.getByRole("button", { name: "Nuevo proveedor" })).toBeDisabled();
  await expect(page.getByText(/Los permisos son visuales/)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Editar/ })).toHaveCount(0);
});
