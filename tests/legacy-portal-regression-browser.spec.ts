import { test, expect } from "@playwright/test";

test("an open draft editor cannot change content after another tab schedules it", async ({ page, context }) => {
  const key = "avans-os:preview:v1:client:epsa:module:contenidos:piezas";
  await page.addInitScript(({ key }) => {
    if (sessionStorage.getItem("legacy-regression-seeded")) return;
    const now = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify({ version: 1, savedAt: now, value: [{
      id: "STALE", client: "epsa", module: "contenidos", collection: "piezas", user: "PM", source: "manual",
      createdAt: now, updatedAt: now, history: [], values: { titulo: "Propuesta QA", estado: "Borrador", copy: "Copy aprobado", canal: "Instagram", formato: "Carrusel" },
    }] }));
    sessionStorage.setItem("legacy-regression-seeded", "1");
  }, { key });
  await page.goto("/v2/clientes/epsa/contenido?seccion=piezas&registro=STALE");
  await page.getByRole("button", { name: "Editar propuesta", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Editar propuesta", exact: true });
  await expect(editor).toBeVisible();
  const second = await context.newPage();
  await second.goto("/v2");
  await second.evaluate(({ key }) => {
    const envelope = JSON.parse(localStorage.getItem(key)!);
    envelope.value[0].values.estado = "Programado";
    envelope.value[0].values.clientSnapshot = JSON.stringify({ titulo: "Propuesta QA", copy: "Copy aprobado" });
    envelope.value[0].updatedAt = "2026-11-21T12:00:00Z";
    localStorage.setItem(key, JSON.stringify(envelope));
  }, { key });
  await second.close();
  await expect.poll(() => page.evaluate(({ key }) => JSON.parse(localStorage.getItem(key)!).value[0].values.estado, { key })).toBe("Programado");
  if (await editor.isVisible()) {
    await editor.getByLabel("Copy preliminar", { exact: true }).fill("Cambio sin revisión en una etapa cerrada");
    const save = editor.getByRole("button", { name: "Guardar borrador", exact: true });
    if (await save.isEnabled()) await save.click();
  }
  const stored = await page.evaluate(({ key }) => JSON.parse(localStorage.getItem(key)!).value[0], { key });
  expect(stored.values.copy).toBe("Copy aprobado");
  expect(stored.values.estado).toBe("Programado");
});

test("legacy client review accepts comments before and after requesting adjustments", async ({ page }) => {
  const key = "avans-os:preview:v1:client:epsa:module:contenidos:piezas";
  await page.addInitScript(({ key }) => {
    if (sessionStorage.getItem("legacy-comment-seeded")) return;
    const now = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify({ version: 1, savedAt: now, value: [{
      id: "LEGACY-COMMENT", client: "epsa", module: "contenidos", collection: "piezas", user: "PM", source: "manual",
      createdAt: now, updatedAt: now, history: [], values: {
        titulo: "Pieza heredada", estado: "En aprobación", copy: "Copy enviado", canal: "Instagram", formato: "Carrusel",
        archivoDiseno: "https://example.com/diseno-final.pdf", fecha: now.slice(0, 10), hora: "14:00",
      },
    }] }));
    sessionStorage.setItem("legacy-comment-seeded", "1");
  }, { key });
  await page.goto("/v2/portal/epsa?contenido=LEGACY-COMMENT");
  const panel = page.getByRole("dialog", { name: "Revisar Pieza heredada" });
  await expect(panel).toBeVisible();
  await panel.getByLabel("Tu comentario o información").fill("El catálogo adjunto al brief sigue vigente.");
  await panel.getByRole("button", { name: "Enviar comentario", exact: true }).click();
  await expect(panel.getByRole("region", { name: "Comentarios compartidos" })).toContainText("El catálogo adjunto al brief sigue vigente.");
  await panel.getByLabel("Tu comentario o información").fill("Cambiar la fotografía de portada.");
  await panel.getByRole("button", { name: "Solicitar ajustes", exact: true }).click();
  await expect(panel).toContainText("Estamos aplicando tus cambios");
  await panel.getByLabel("Tu comentario o información").fill("Usar la fotografía del producto azul.");
  await panel.getByRole("button", { name: "Enviar comentario", exact: true }).click();
  await expect(panel.getByRole("region", { name: "Comentarios compartidos" })).toContainText("Usar la fotografía del producto azul.");
  await page.reload();
  await expect(panel).toContainText("El catálogo adjunto al brief sigue vigente.");
  await expect(panel).toContainText("Usar la fotografía del producto azul.");
  const stored = await page.evaluate(({ key }) => JSON.parse(localStorage.getItem(key)!).value[0], { key });
  expect(stored.values.estado).toBe("Ajustes");
  expect(JSON.parse(stored.values.contentComments)).toHaveLength(3);
  expect(JSON.parse(stored.values.clientSnapshot)).toMatchObject({ titulo: "Pieza heredada", copy: "Copy enviado" });
});
