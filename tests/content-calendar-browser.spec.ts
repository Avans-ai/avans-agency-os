import { test, expect, type Locator, type Page } from "@playwright/test";

/* Calendario de contenidos como herramienta principal: ficha única, «Volver» con contexto en la
 * URL, aprobaciones atadas a la versión, materiales de Archivos y documentos, programación local
 * vs. confirmada, aislamiento entre clientes, persistencia y 390 px. */
test.use({ actionTimeout: 15000 });
const PREFIX = "avans-os:preview:v1:";
async function local(page: Page, key: string) {
  return page.evaluate((full) => JSON.parse(localStorage.getItem(full) || "null")?.value, `${PREFIX}${key}`);
}
async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}
/** Ejecuta una acción del flujo desde la ficha; si aparece la revisión de lineamientos, sigue igual. */
async function act(detail: Locator, action: string, next: string, note?: string) {
  if (note) await detail.getByLabel("Comentario o devolución").fill(note);
  await detail.getByRole("button", { name: action, exact: true }).click();
  const proceed = detail.getByRole("region", { name: "Revisión de lineamientos" }).getByRole("button", { name: "Enviar igual" });
  const reached = detail.getByRole("heading", { level: 2 }).locator("xpath=..").getByText(next, { exact: true });
  await expect(proceed.or(reached)).toBeVisible();
  if (await proceed.isVisible()) await proceed.click();
  await expect(reached).toBeVisible();
}

test("una pieza recorre el proceso desde el calendario: ajustes, aprobaciones por versión, tarea única y programación local", async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  const title = "QA Calendario recorrido completo";
  await page.goto("/v2/clientes/epsa/contenido?seccion=calendario&mes=2026-12&vista=semana&fecha=2026-12-07");
  await expect(page.getByRole("group", { name: "Vista del calendario" }).getByRole("button", { name: "Semana" })).toHaveAttribute("aria-pressed", "true");
  const notificationsBefore = (await local(page, "workspace"))?.notifications?.length ?? 0;
  await page.getByRole("button", { name: "Nuevo contenido", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Nuevo contenido", exact: true });
  await expect(editor.getByLabel("Fecha prevista")).toHaveValue("2026-12-07");
  await editor.getByLabel("Título", { exact: false }).fill(title);
  await editor.getByLabel("Eje temático", { exact: true }).selectOption({ index: 1 });
  await editor.getByLabel("Idea", { exact: true }).fill("Mostrar el proceso en tres pasos");
  await editor.getByLabel("Bajada explicativa").fill("Una lámina por paso");
  await editor.getByLabel("Copy preliminar").fill("Así trabajamos con vos, paso a paso.");
  await editor.getByLabel("Canal", { exact: true }).selectOption("Instagram");
  await editor.getByLabel("Formato", { exact: true }).selectOption("Carrusel");
  await editor.getByLabel("Fecha prevista").fill("2026-12-09");
  await editor.getByLabel("Horario (HH:MM)").fill("10:00");
  await editor.getByRole("button", { name: "Guardar borrador" }).click();
  const keepAnyway = editor.getByRole("region", { name: "Revisión de lineamientos" }).getByRole("button", { name: "Guardar igual" });
  const detail = page.getByRole("dialog", { name: `Contenido: ${title}`, exact: true });
  await expect(keepAnyway.or(detail)).toBeVisible();
  if (await keepAnyway.isVisible()) await keepAnyway.click();
  await expect(detail).toBeVisible();
  // La ficha se abre con la pieza en la URL y el calendario como origen.
  await expect(page).toHaveURL(/pieza=PZA-/);
  await expect(page).toHaveURL(/volver=/);
  const pieces = await local(page, "client:epsa:module:contenidos:piezas");
  const id = pieces.find((item: { values: { titulo: string } }) => item.values.titulo === title).id;

  await act(detail, "Enviar a revisión interna", "Revisión interna de producción");
  await expect(detail.getByText("Revisás Propuesta v1")).toBeVisible();
  await act(detail, "Enviar al cliente", "Revisión preliminar del cliente");
  await act(detail, "Solicitar ajustes", "Ajustes", "Sumá el beneficio principal");
  await detail.getByRole("button", { name: "Editar propuesta" }).click();
  const edit = page.getByRole("dialog", { name: "Editar propuesta" });
  await edit.getByLabel("Copy preliminar").fill("Así trabajamos con vos, paso a paso. Con asesoramiento incluido.");
  await edit.getByRole("button", { name: "Guardar borrador" }).click();
  const editAnyway = edit.getByRole("region", { name: "Revisión de lineamientos" }).getByRole("button", { name: "Guardar igual" });
  await expect(editAnyway.or(detail.getByRole("button", { name: "Reenviar a revisión" }))).toBeVisible();
  if (await editAnyway.isVisible()) await editAnyway.click();
  await expect(edit).toHaveCount(0);
  await act(detail, "Reenviar a revisión", "Revisión interna de producción");
  await expect(detail.getByText("Revisás Propuesta v2")).toBeVisible();
  await act(detail, "Enviar al cliente", "Revisión preliminar del cliente");
  await act(detail, "Aprobar propuesta", "Preproducción");
  await detail.getByLabel("Indicaciones de diseño *").fill("Tres láminas numeradas");
  await detail.getByRole("button", { name: "Guardar preproducción" }).click();
  await expect(detail.getByText(/listo para diseño/)).toBeVisible();
  await act(detail, "Enviar a diseño", "Producción de diseño");
  await detail.getByLabel("Enlace a la versión de diseño").fill("https://example.com/qa-calendario-v1.png");
  await act(detail, "Entregar diseño", "Revisión interna del diseño");
  await act(detail, "Solicitar aprobación final", "Aprobación final del cliente");
  await act(detail, "Solicitar ajustes", "Ajustes", "Subir el contraste");
  // En ajustes de diseño la propuesta validada no se reescribe.
  await expect(detail.getByRole("button", { name: "Editar propuesta" })).toHaveCount(0);
  // Reenvío sin cambiar el rótulo «v1»: queda como Diseño v2.
  await act(detail, "Reenviar a revisión", "Revisión interna del diseño");
  await expect(detail.getByText("Diseño v2", { exact: true })).toBeVisible();
  await detail.getByRole("button", { name: /^Revisiones y aprobaciones/ }).click();
  const approvals = detail.getByRole("region", { name: "Aprobaciones" });
  await expect(approvals.getByRole("listitem").filter({ hasText: "Revisión interna del diseño" })).toContainText("Pendiente");
  await expect(approvals.getByRole("listitem").filter({ hasText: "Validación de la propuesta con el cliente" })).toContainText("Propuesta v2");
  await approvals.getByText(/Aprobaciones de versiones anteriores/).click();
  await expect(approvals).toContainText("Diseño v1");
  await expect(approvals).toContainText("No vale para la versión vigente");
  await act(detail, "Solicitar aprobación final", "Aprobación final del cliente");
  await act(detail, "Aprobar pieza final", "Aprobado");
  await expect(approvals.getByRole("listitem").filter({ hasText: "Aprobación final del cliente" })).toContainText("Diseño v2");
  await detail.getByLabel("Fecha de programación").fill("2026-12-09");
  await detail.getByLabel("Hora de programación").fill("10:00");
  await act(detail, "Marcar programado", "Programado");
  await expect(detail.getByRole("heading", { level: 2 }).locator("xpath=..").getByText("Programación local", { exact: true })).toBeVisible();

  const stored = (await local(page, "client:epsa:module:contenidos:piezas")).find((item: { id: string }) => item.id === id);
  expect(stored.values).toMatchObject({ estado: "Programado", version: "v2", preliminaryApprovedVersion: "Propuesta v2", finalApprovedVersion: "Diseño v2" });
  const workspace = await local(page, "workspace");
  expect(workspace.tasks.filter((task: { workItem?: { id: string } }) => task.workItem?.id === id)).toHaveLength(1);
  expect(workspace.notifications.length).toBeGreaterThan(notificationsBefore);

  // «Volver» recupera la semana del calendario y la pieza aparece con su marca de programación local.
  await detail.getByRole("link", { name: "Volver al calendario" }).click();
  await expect(detail).toHaveCount(0);
  await expect(page).toHaveURL(/vista=semana/);
  await expect(page).toHaveURL(/fecha=2026-12-07/);
  await expect(page).not.toHaveURL(/pieza=/);
  await expect(page.getByLabel("Agenda semanal").getByRole("button", { name: new RegExp(title) })).toContainText("Prog. local");
  expect(errors).toEqual([]);
});

test("«Volver» desde una pieza restaura mes, vista, filtros y búsqueda; cambios sin guardar piden confirmación; foco y recarga", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/v2/clientes/aca/contenido?seccion=calendario&mes=2026-12&vista=semana&fecha=2026-12-07&canal=Facebook");
  await page.getByLabel("Buscar contenido").fill("comercios");
  await expect(page).toHaveURL(/q=comercios/);
  const piece = page.getByRole("button", { name: /beneficios en comercios adheridos/ });
  await expect(piece).toHaveCount(1);
  await piece.click();
  const detail = page.getByRole("dialog", { name: "Contenido: Carrusel: beneficios en comercios adheridos" });
  await expect(detail).toBeVisible();
  await expect(page).toHaveURL(/pieza=PZA-ACA-D06/);
  const back = detail.getByRole("link", { name: "Volver al calendario" });
  await expect(back).toHaveAttribute("data-back-target", /vista=semana.*/);

  // Cambios sin guardar: «Volver» pide confirmación; si se cancela, la ficha queda abierta.
  await detail.getByLabel("Comentario o devolución").fill("Borrador sin guardar");
  page.once("dialog", (dialog) => dialog.dismiss());
  await back.click();
  await expect(detail).toBeVisible();
  await expect(page).toHaveURL(/pieza=PZA-ACA-D06/);
  await detail.getByLabel("Comentario o devolución").fill("");
  await back.click();
  await expect(detail).toHaveCount(0);
  for (const fragment of [/vista=semana/, /fecha=2026-12-07/, /canal=Facebook/, /q=comercios/, /mes=2026-12/]) await expect(page).toHaveURL(fragment);
  await expect(page).not.toHaveURL(/pieza=/);
  await expect(page.getByRole("group", { name: "Vista del calendario" }).getByRole("button", { name: "Semana" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("group", { name: "Canal", exact: true }).getByRole("button", { name: /Facebook/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Buscar contenido")).toHaveValue("comercios");

  // Cerrar con Escape también vuelve al calendario y devuelve el foco a la pieza.
  await piece.click();
  await expect(detail).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(detail).toHaveCount(0);
  await expect(page).not.toHaveURL(/pieza=/);
  await expect(page.locator('[data-piece="PZA-ACA-D06"]')).toBeFocused();

  // Enlace directo (recarga) reabre la misma pieza con su contexto.
  await piece.click();
  await page.reload();
  await expect(detail).toBeVisible();
  await expect(detail.getByText("Ajustes", { exact: true }).first()).toBeVisible();

  // Abierta desde el Plan de contenidos, «Volver» lleva al plan.
  await page.goto("/v2/clientes/aca/contenido?seccion=planes&plan=PLAN-ACA-2026-12&bloque=ideas");
  await page.getByRole("region", { name: "Contenidos del período" }).getByRole("button", { name: "Carrusel: beneficios en comercios adheridos", exact: true }).click();
  await expect(detail).toBeVisible();
  await detail.getByRole("link", { name: "Volver al plan" }).click();
  await expect(page).toHaveURL(/seccion=planes/);
  await expect(page).toHaveURL(/bloque=ideas/);
  await expect(page.getByRole("group", { name: "Partes del plan" }).getByRole("button", { name: "Ideas y bajadas" })).toHaveAttribute("aria-pressed", "true");
  // Los enlaces anteriores (?seccion=piezas&registro=…) siguen abriendo la ficha.
  await page.goto("/v2/clientes/aca/contenido?seccion=piezas&registro=PZA-ACA-D06");
  await expect(detail).toBeVisible();
  expect(errors).toEqual([]);
});

test("materiales vinculados desde Archivos y documentos: se consultan sin copiarse, persisten y no cruzan clientes", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/v2/clientes/aca?view=ficha&ficha=materiales");
  await page.getByRole("button", { name: "Agregar material", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Ficha de material" });
  await editor.getByLabel("Nombre del material *", { exact: true }).fill("Brief QA de comercios");
  await editor.getByLabel("Tipo de material").selectOption("Archivo");
  await editor.getByLabel("Adjuntar archivo").setInputFiles({ name: "brief-comercios.txt", mimeType: "text/plain", buffer: Buffer.from("Brief QA: comercios adheridos de diciembre") });
  await editor.getByRole("button", { name: "Guardar material" }).click();
  await expect(editor).toHaveCount(0);

  await page.goto("/v2/clientes/aca/contenido?seccion=calendario&mes=2026-12&pieza=PZA-ACA-D06");
  const detail = page.getByRole("dialog", { name: "Contenido: Carrusel: beneficios en comercios adheridos" });
  const materials = detail.getByRole("region", { name: "Materiales vinculados" });
  await materials.getByRole("button", { name: "Vincular material" }).click();
  const picker = page.getByRole("dialog", { name: "Vincular material" });
  await picker.getByLabel("Buscar material").fill("Brief QA");
  await picker.getByRole("checkbox", { name: /Brief QA de comercios/ }).check();
  await picker.getByRole("button", { name: /^Vincular/ }).click();
  await expect(picker).toHaveCount(0);
  await expect(materials).toContainText("Brief QA de comercios");
  await expect(materials).toContainText("brief-comercios.txt");
  const [popup] = await Promise.all([page.waitForEvent("popup"), materials.getByRole("button", { name: "Abrir Brief QA de comercios" }).click()]);
  await popup.waitForLoadState();
  expect(popup.url()).toMatch(/^blob:/);
  await expect(popup.locator("body")).toContainText("Brief QA: comercios adheridos de diciembre");
  await popup.close();

  // Solo se guarda la referencia: ni el archivo ni su contenido se copian al contenido.
  const stored = (await local(page, "client:aca:module:contenidos:piezas")).find((item: { id: string }) => item.id === "PZA-ACA-D06");
  const links = JSON.parse(stored.values.materialesVinculados);
  expect(links).toHaveLength(1);
  expect(Object.keys(links[0]).sort()).toEqual(["at", "by", "id"]);
  expect(JSON.stringify(stored)).not.toContain("Brief QA: comercios");
  await page.reload();
  await expect(materials).toContainText("Brief QA de comercios");

  // EPSA no ve los materiales de ACA ni sus contenidos.
  await page.goto("/v2/clientes/epsa/contenido?seccion=calendario&pieza=PZA-ACA-D06");
  await expect(page.getByRole("dialog", { name: /Contenido:/ })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("comercios adheridos");
  await page.goto("/v2/clientes/epsa/contenido?seccion=calendario&vista=lista");
  await page.getByRole("list", { name: "Contenidos planificados" }).getByRole("button").first().click();
  const epsaDetail = page.getByRole("dialog", { name: /Contenido:/ });
  await epsaDetail.getByRole("region", { name: "Materiales vinculados" }).getByRole("button", { name: "Vincular material" }).click();
  const epsaPicker = page.getByRole("dialog", { name: "Vincular material" });
  await epsaPicker.getByLabel("Buscar material").fill("Brief QA");
  await expect(epsaPicker.getByRole("checkbox")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("programación local vs. confirmada, publicaciones sin verificar y 390 px sin desborde", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/v2/clientes/aca/contenido?seccion=calendario&mes=2026-12&pieza=PZA-ACA-D01");
  const scheduled = page.getByRole("dialog", { name: "Contenido: Agenda de beneficios de verano" });
  const head = scheduled.getByRole("heading", { level: 2 }).locator("xpath=..");
  await expect(head.getByText("Programado", { exact: true })).toBeVisible();
  await expect(head.getByText("Programación local", { exact: true })).toBeVisible();
  await expect(scheduled).not.toContainText("confirmada por Metricool");
  await page.keyboard.press("Escape");
  await expect(page.getByText("Metricool no conectado")).toBeVisible();

  await page.goto("/v2/clientes/aca/contenido?seccion=calendario&vista=lista&periodo=2026-10");
  const published = page.getByRole("listitem").filter({ hasText: "Reel: asistencia en ruta" });
  await expect(published).toContainText("Publicación sin verificar");
  await published.getByRole("button", { name: "Reel: asistencia en ruta", exact: true }).click();
  const legacy = page.getByRole("dialog", { name: "Contenido: Reel: asistencia en ruta" });
  await expect(legacy.getByRole("heading", { level: 2 }).locator("xpath=..").getByText("Publicación sin verificar")).toBeVisible();
  await expect(legacy).toContainText("Registro manual de demostración");
  await expect(legacy).not.toContainText("verificada por Metricool");

  // El plan concentra objetivos, ejes, ideas, canales y material del cliente.
  await page.goto("/v2/clientes/aca/contenido?seccion=planes&plan=PLAN-ACA-2026-12");
  const parts = page.getByRole("group", { name: "Partes del plan" });
  for (const label of ["Objetivos", "Ejes temáticos", "Ideas y bajadas", "Canales y formatos", "Material del cliente"]) await expect(parts.getByRole("button", { name: new RegExp(`^${label}`) })).toBeVisible();
  await parts.getByRole("button", { name: /^Material del cliente/ }).click();
  await expect(page.getByRole("list", { name: "Pedidos pendientes" })).toContainText("Testimonio breve");
  await parts.getByRole("button", { name: "Canales y formatos" }).click();
  await expect(page.getByRole("list", { name: "Canales del período" }).getByRole("listitem")).toHaveCount(7);

  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/v2/clientes/aca/contenido?seccion=planes", "/v2/clientes/aca/contenido?seccion=planes&bloque=ideas", "/v2/clientes/aca/contenido?seccion=calendario&mes=2026-12", "/v2/clientes/aca/contenido?seccion=calendario&vista=lista", "/v2/clientes/aca/contenido?seccion=calendario&vista=tablero", "/v2/clientes/aca/contenido?seccion=calendario&mes=2026-12&pieza=PZA-ACA-D06"]) {
    await page.goto(path);
    await expect(page.locator("main").first()).toBeVisible();
    await noOverflow(page);
  }
  for (const width of [1440, 820]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/v2/clientes/aca/contenido?seccion=planes", "/v2/clientes/aca/contenido?seccion=calendario&mes=2026-12", "/v2/clientes/aca/contenido?seccion=calendario&mes=2026-12&pieza=PZA-ACA-D06"]) { await page.goto(path); await noOverflow(page); }
  }
  expect(errors).toEqual([]);
});
