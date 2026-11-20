import { test, expect, type Page } from "@playwright/test";
test.use({ actionTimeout: 15000 });

async function seedPortal(page: Page, state = "Revisión preliminar del cliente") {
  await page.addInitScript((state) => {
    if (sessionStorage.getItem("portal-seeded")) return;
    const now = new Date().toISOString(), date = now.slice(0, 10);
    function record(id: string, client: string, titulo: string, estado: string) {
      return { id, client, module: "contenidos", collection: "piezas", user: "Private internal owner", source: "manual", createdAt: now, updatedAt: now, history: [{ at: now, user: "PRIVATE", text: "PRIVATE internal history" }], values: { titulo, estado, eje: "EJE-PORTAL", idea: "Idea para el cliente", bajada: "Descripción de la propuesta", objetivo: "Informar", necesitaCliente: "Ficha técnica actualizada", copy: "Este es el copy preliminar", canal: "Instagram", formato: "Carrusel", fecha: date, hora: "14:00", responsable: "Private internal owner", disenador: "Private designer", archivoDiseno: "https://example.com/final-design.pdf", version: "v2", contentTransitions: JSON.stringify(estado === "Borrador" ? [] : [{ id: "shared", at: now, from: "Revisión interna de producción", to: estado, actor: "Private", comment: "", responsible: "Cliente", taskId: "", action: "approve-internal" }]), contentComments: JSON.stringify([{ id: "internal", at: now, actor: "Private", text: "PRIVATE internal comment", visibility: "internal" }]) } };
    }
    const records = [record("PORTAL-PUBLIC", "epsa", "Propuesta del portal", state), record("PORTAL-DRAFT", "epsa", "PRIVATE draft", "Borrador"), record("PORTAL-WRONG", "aca", "PRIVATE other client", state)];
    const envelope = (value: unknown) => JSON.stringify({ version: 1, value, savedAt: now });
    localStorage.setItem("avans-os:preview:v1:client:epsa:module:contenidos:piezas", envelope(records));
    localStorage.setItem("avans-os:preview:v1:client:epsa:module:contenidos:ejes", envelope([]));
    localStorage.setItem("avans-os:preview:v1:client:aca:module:contenidos:piezas", envelope([]));
    sessionStorage.setItem("portal-seeded", "1");
  }, state);
  await page.goto("/v2/portal/epsa");
}

test("client portal shares idea and copy, persists comments, attachments and preliminary approval without exposing internal records", async ({ page }) => {
  await seedPortal(page);
  await expect(page.getByRole("heading", { name: "1 contenido espera tu respuesta" })).toBeVisible();
  await expect(page.getByText(/Vista previa local/)).toBeVisible();
  await expect(page.getByRole("search")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Perfil:/ })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("PRIVATE");
  await page.getByRole("button", { name: "Revisar Propuesta del portal" }).click();
  const panel = page.getByRole("dialog", { name: "Revisar Propuesta del portal" });
  await expect(panel).toContainText("Idea para el cliente");
  await expect(panel).toContainText("Este es el copy preliminar");
  await expect(panel.getByRole("link", { name: /Abrir pieza final/ })).toHaveCount(0);
  await panel.getByLabel("Tu comentario o información").fill("Agregamos el catálogo actualizado");
  await panel.getByLabel(/Adjuntar material/).setInputFiles({ name: "catalogo.txt", mimeType: "text/plain", buffer: Buffer.from("Catálogo actualizado del cliente") });
  await panel.getByRole("button", { name: "Enviar comentario" }).click();
  await expect(panel.getByRole("button", { name: "Descargar catalogo.txt" })).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent("download"), panel.getByRole("button", { name: "Descargar catalogo.txt" }).click()]);
  expect(download.suggestedFilename()).toBe("catalogo.txt");
  await panel.getByRole("button", { name: "Aprobar propuesta" }).click();
  await expect(panel).toContainText("Aprobación registrada");
  await expect(page.getByRole("heading", { name: "Tus contenidos, en un solo lugar" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Contenidos", exact: true }).click();
  await page.getByRole("button", { name: "Ver contenido Propuesta del portal" }).click();
  await expect(panel).toContainText("Agregamos el catálogo actualizado");
  await expect(panel.getByRole("button", { name: "Descargar catalogo.txt" })).toBeVisible();
  await expect(panel).not.toContainText("PRIVATE");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("avans-os:preview:v1:client:epsa:module:contenidos:piezas")!).value.find((item: { id: string }) => item.id === "PORTAL-PUBLIC"));
  expect(stored.values.estado).toBe("Preproducción");
  expect(JSON.parse(stored.values.contentTransitions).at(-1).action).toBe("approve-preliminary");
  await page.goto("/v2/portal/aca");
  await expect(page.locator("body")).not.toContainText("Propuesta del portal");
});

test("client requests final changes with a comment, calendar filters and responsive views preserve isolation", async ({ page }) => {
  await seedPortal(page, "Aprobación final del cliente");
  await page.getByRole("button", { name: "Revisar Propuesta del portal" }).click();
  const panel = page.getByRole("dialog", { name: "Revisar Propuesta del portal" });
  await expect(panel.getByRole("link", { name: "Abrir pieza final v2" })).toBeVisible();
  await panel.getByRole("button", { name: "Solicitar ajustes" }).click();
  await expect(panel.getByRole("alert")).toContainText("Contanos qué cambios");
  await panel.getByLabel("Tu comentario o información").fill("Cambiar la fotografía de portada");
  await panel.getByRole("button", { name: "Solicitar ajustes" }).click();
  await expect(panel).toContainText("Recibimos tus ajustes");
  await panel.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.getByRole("button", { name: "Calendario", exact: true }).click();
  await expect(page.getByRole("button", { name: /Propuesta del portal/ })).toBeVisible();
  await page.getByLabel("Canal", { exact: true }).selectOption("LinkedIn");
  await expect(page.getByRole("button", { name: /Propuesta del portal/ })).toHaveCount(0);
  await page.getByLabel("Canal", { exact: true }).selectOption("");
  for (const mode of ["Semana", "Día", "Mes"]) {
    await page.getByRole("group", { name: "Vista del calendario" }).getByRole("button", { name: mode, exact: true }).click();
    await expect(page.getByRole("button", { name: /Propuesta del portal/ })).toBeVisible();
  }
  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
    await page.screenshot({ path: test.info().outputPath(`portal-calendar-${width}.png`), fullPage: true });
  }
  await page.getByRole("button", { name: /Propuesta del portal/ }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  await expect(page.getByRole("dialog")).not.toContainText("PRIVATE");
  await page.screenshot({ path: test.info().outputPath("portal-review-mobile.png") });
});

test("final approval creates scheduling work but never marks the content scheduled from the client portal", async ({ page }) => {
  await seedPortal(page, "Aprobación final del cliente");
  await page.getByRole("button", { name: "Revisar Propuesta del portal" }).click();
  const panel = page.getByRole("dialog", { name: "Revisar Propuesta del portal" });
  await panel.getByRole("button", { name: "Aprobar pieza final" }).click();
  await expect(panel).toContainText("Aprobado para programar");
  await expect(panel.getByRole("button", { name: /Marcar programado/ })).toHaveCount(0);
  const task = await page.evaluate(() => JSON.parse(localStorage.getItem("avans-os:preview:v1:workspace")!).value.tasks.find((item: { workItem?: { id: string } }) => item.workItem?.id === "PORTAL-PUBLIC"));
  expect(task.title).toContain("Programar");
  expect(task.status).toBe("Por hacer");
});

test("requested client information returns the item to preparation with a shared response", async ({ page }) => {
  await seedPortal(page, "Información del cliente");
  await page.getByRole("button", { name: "Revisar Propuesta del portal" }).click();
  const panel = page.getByRole("dialog", { name: "Revisar Propuesta del portal" });
  await panel.getByRole("button", { name: "Enviar información", exact: true }).click();
  await expect(panel.getByRole("alert")).toContainText("Detallá la información");
  await panel.getByLabel("Tu comentario o información").fill("La medida final es de 50 por 20 centímetros.");
  await panel.getByRole("button", { name: "Enviar información", exact: true }).click();
  await expect(panel).toContainText("Información enviada");
  await expect(panel.getByRole("region", { name: "Comentarios compartidos" })).toContainText("La medida final es de 50 por 20 centímetros.");
  await expect(panel.getByRole("button", { name: "Enviar información", exact: true })).toHaveCount(0);
});
