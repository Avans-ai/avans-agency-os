import { expectChain, openOf, type ChainTask } from "./task-chain-helpers";
import { test, expect, type Page, type Locator } from "@playwright/test";

/* QA de Contenidos con los DATOS DE DEMOSTRACIÓN de ACA: plan, eje, contenido, revisiones,
 * portal, preproducción, pedido de diseño único, biblioteca, calendario, roles, aislamiento,
 * reinicio de la demo y 390 px. */
test.use({ actionTimeout: 15000 });
const PREFIX = "avans-os:preview:v1:";
const TITLE = "QA Contenido de enero";
async function local(page: Page, key: string) {
  return page.evaluate((full) => JSON.parse(localStorage.getItem(full) || "null")?.value, `${PREFIX}${key}`);
}
async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}
async function act(detail: Locator, action: string, next: string, note?: string) {
  if (note) await detail.getByLabel("Comentario o devolución").fill(note);
  await detail.getByRole("button", { name: action, exact: true }).click();
  await expect(detail.getByRole("heading", { level: 2 }).locator("xpath=..").getByText(next, { exact: true })).toBeVisible();
}
async function setRole(page: Page, label: string) {
  await page.getByRole("button", { name: /^Perfil:/ }).click();
  await page.getByRole("group", { name: "Rol simulado" }).getByRole("button", { name: label, exact: true }).click();
  await page.getByRole("button", { name: /^Perfil:/ }).click();
}
const contentFor = async (page: Page) => ((await local(page, "client:aca:module:contenidos:piezas")) || []).find((item: { values: { titulo: string } }) => item.values.titulo === TITLE);
const linkedTasks = async (page: Page, id: string) => (await local(page, "workspace")).tasks.filter((task: { workItem?: { id: string } }) => task.workItem?.id === id);
const linkedRequests = async (page: Page, id: string) => ((await local(page, "client:aca:module:diseno-marca:trabajos")) || []).filter((item: { values: { contenidoId: string } }) => item.values.contenidoId === id);

test("QA Contenidos ACA: plan, eje, propuesta, validación del cliente, preproducción, diseño sin duplicados, aprobación, biblioteca e historial", async ({ page }) => {
  test.setTimeout(240000);
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/v2/clientes/aca/contenido");
  await expect(page.getByRole("note", { name: "DATOS DE DEMOSTRACIÓN" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Diciembre 2026 — ACA" })).toBeVisible();
  await expect(page.getByText("Metricool no conectado")).toBeVisible();
  // Las tareas de los contenidos demo se agregan una sola vez.
  await expect.poll(async () => (await linkedTasks(page, "PZA-ACA-D07")).length).toBe(1);

  // Plan mensual nuevo y eje vinculado.
  await page.goto("/v2/clientes/aca/contenido?seccion=planes");
  await page.getByRole("button", { name: "Nuevo plan mensual", exact: true }).click();
  const planForm = page.getByRole("dialog", { name: "Nuevo plan mensual" });
  await planForm.getByLabel("Nombre del plan").fill("Enero 2027 — ACA QA");
  await planForm.getByLabel("Mes (AAAA-MM)").fill("2027-01");
  await planForm.getByLabel("Objetivos del mes").fill("Validar el flujo completo de QA");
  await planForm.getByLabel("Temáticas del mes").fill("Vuelta de vacaciones");
  await planForm.getByLabel("Cantidad de contenidos").fill("4");
  await planForm.getByRole("button", { name: "Guardar plan mensual" }).click();
  await expect(page.getByRole("heading", { name: "Enero 2027 — ACA QA" })).toBeVisible();
  await page.getByRole("button", { name: "Agregar eje", exact: true }).click();
  const axisForm = page.getByRole("dialog", { name: "Nuevo eje temático" });
  await axisForm.getByLabel(/^Eje/).fill("QA Regreso seguro");
  await axisForm.getByLabel("Objetivo del eje").fill("Acompañar la vuelta de las vacaciones");
  await axisForm.getByLabel("Perfil o audiencia").fill("Socios que vuelven de viaje");
  await axisForm.getByLabel("ICP relacionado").fill("Perfil QA (sin ICP en Discovery)");
  await axisForm.getByLabel("Cantidad de contenidos").fill("2");
  await axisForm.getByRole("button", { name: "Guardar en este navegador" }).click();
  await expect(axisForm).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "QA Regreso seguro" })).toBeVisible();

  // Contenido del plan con pedido estructurado al cliente.
  await page.getByRole("button", { name: "Nuevo contenido en el plan", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Nuevo contenido", exact: true });
  await expect(editor.getByLabel("Plan mensual", { exact: true })).toHaveValue(/PLAN-/);
  await editor.getByLabel("Título", { exact: false }).fill(TITLE);
  await editor.getByLabel("Eje temático", { exact: true }).selectOption({ label: "QA Regreso seguro" });
  await editor.getByLabel("Idea", { exact: true }).fill("Checklist de regreso");
  await editor.getByLabel("Bajada explicativa").fill("Tres pasos para volver tranquilos");
  await editor.getByLabel("Copy preliminar").fill("Volver también se planifica.");
  await editor.getByLabel("Canal", { exact: true }).selectOption("Instagram");
  await editor.getByLabel("Formato", { exact: true }).selectOption("Carrusel");
  await editor.getByLabel("Fecha prevista").fill("2027-01-15");
  await editor.getByLabel("Horario (HH:MM)").fill("10:00");
  await editor.getByRole("button", { name: "Agregar pedido al cliente" }).click();
  await editor.getByLabel("Tipo de pedido 1").selectOption("Fotografías");
  await editor.getByLabel("Detalle del pedido 1").fill("Fotos QA de una ruta");
  await editor.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(editor).toHaveCount(0);
  const created = await contentFor(page);
  expect(created).toMatchObject({ source: "manual", values: { estado: "Borrador", necesitaCliente: "Fotografías: Fotos QA de una ruta" } });

  // Revisión interna y validación inicial del cliente en el portal (una sola instancia).
  await page.goto(`/v2/clientes/aca/contenido?seccion=piezas&registro=${created.id}`);
  const detail = page.getByRole("dialog", { name: `Contenido: ${TITLE}`, exact: true });
  await act(detail, "Enviar a revisión interna", "Revisión interna de producción");
  await act(detail, "Enviar al cliente", "Revisión preliminar del cliente");
  await page.goto("/v2/portal/aca");
  await expect(page.getByRole("region", { name: "Propuestas para validar" }).getByRole("button", { name: `Revisar ${TITLE}` })).toBeVisible();
  await page.getByRole("button", { name: `Revisar ${TITLE}` }).click();
  let portal = page.getByRole("dialog", { name: `Revisar ${TITLE}` });
  await expect(portal.getByRole("region", { name: "Qué necesitamos de vos" })).toContainText("Fotos QA de una ruta");
  await expect(portal).toContainText("Volver también se planifica.");
  await portal.getByLabel("Tu comentario o información").fill("Sumemos el beneficio de auxilio en el copy");
  await portal.getByRole("button", { name: "Solicitar ajustes" }).click();
  await expect(portal).toContainText("Recibimos tus ajustes");

  await page.goto(`/v2/clientes/aca/contenido?seccion=piezas&registro=${created.id}`);
  await expect(detail.getByText("Pedido por Cliente · ACA", { exact: false })).toBeVisible();
  await detail.getByRole("button", { name: "Editar propuesta" }).click();
  const edit = page.getByRole("dialog", { name: "Editar propuesta" });
  await edit.getByLabel("Copy preliminar").fill("Volver también se planifica. Y con auxilio incluido.");
  await edit.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(edit).toHaveCount(0);
  await act(detail, "Reenviar a revisión", "Revisión interna de producción");
  await act(detail, "Enviar al cliente", "Revisión preliminar del cliente");

  await page.goto("/v2/portal/aca");
  await page.getByRole("button", { name: `Revisar ${TITLE}` }).click();
  portal = page.getByRole("dialog", { name: `Revisar ${TITLE}` });
  await portal.getByLabel("Responder a un pedido (opcional)").selectOption({ index: 1 });
  await portal.getByLabel("Tu comentario o información").fill("Adjunto la foto de la ruta");
  await portal.getByLabel(/Adjuntar material/).setInputFiles({ name: "ruta.txt", mimeType: "text/plain", buffer: Buffer.from("foto de prueba") });
  await portal.getByRole("button", { name: "Enviar comentario" }).click();
  await expect(portal).toContainText("Pedido respondido");
  await expect(portal.getByRole("region", { name: "Qué necesitamos de vos" })).toContainText("Recibido · ruta.txt");
  await portal.getByRole("button", { name: "Aprobar propuesta" }).click();
  await expect(portal).toContainText("Aprobación registrada");
  let stored = await contentFor(page);
  expect(stored.values.estado).toBe("Preproducción");
  expect(JSON.parse(stored.values.clientRequests)[0]).toMatchObject({ status: "Recibido", attachmentName: "ruta.txt" });
  expect(await linkedRequests(page, created.id)).toHaveLength(0);

  // Preproducción: reunir todo antes del diseñador; un único pedido y una única tarea.
  await page.goto(`/v2/clientes/aca/contenido?seccion=piezas&registro=${created.id}`);
  await expect(detail.getByLabel("Checklist de preproducción")).toBeVisible();
  await detail.getByLabel("Indicaciones de diseño *").fill("Portada con ruta y tres láminas numeradas");
  await detail.getByLabel("Material fotográfico").fill("Foto enviada por el cliente");
  await detail.getByRole("button", { name: "Guardar preproducción" }).click();
  await expect(detail.getByText(/listo para diseño/)).toBeVisible();
  await act(detail, "Enviar a diseño", "Producción de diseño");
  let requests = await linkedRequests(page, created.id);
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({ id: `DIS-${created.id}`, source: "manual", values: { servicioOrigen: "contenidos", consideraciones: expect.stringContaining("tres láminas numeradas"), recursos: expect.stringContaining("Fotos QA de una ruta") } });
  // Cadena de tareas por etapa: la de diseño es la vigente; las de etapas anteriores quedan completadas.
  let tasks = await linkedTasks(page, created.id);
  const designTask = expectChain(tasks);
  expect(requests[0].values.tareaId).toBe(designTask.id);
  expect(designTask).toMatchObject({ serviceId: "diseno-marca", status: "Por hacer", workflow: { stage: "Producción de diseño" } });
  expect(tasks.filter((task: ChainTask) => task.status === "Hecho").length).toBeGreaterThan(0);

  // Entrega, devolución interna (vuelve una etapa) y segunda versión: sin pedidos ni tareas duplicadas.
  await detail.getByLabel("Enlace a la versión de diseño").fill("https://example.com/qa-enero-v1.png");
  await detail.getByLabel("Versión del diseño").fill("v1");
  await act(detail, "Entregar diseño", "Revisión interna del diseño");
  await act(detail, "Solicitar ajustes", "Ajustes", "Subir el contraste del titular");
  expect(await linkedRequests(page, created.id)).toHaveLength(1);
  expect(expectChain(await linkedTasks(page, created.id))).toMatchObject({ status: "Por hacer", workflow: { stage: "Ajustes" } });
  await detail.getByLabel("Enlace a la versión de diseño").fill("https://example.com/qa-enero-v2.png");
  await detail.getByLabel("Versión del diseño").fill("v2");
  await act(detail, "Reenviar a revisión", "Revisión interna del diseño");
  await act(detail, "Solicitar aprobación final", "Aprobación final del cliente");
  await page.goto(`/v2/portal/aca?contenido=${created.id}`);
  portal = page.getByRole("dialog", { name: `Revisar ${TITLE}` });
  await expect(portal.getByRole("img", { name: `Diseño de ${TITLE}` })).toHaveCount(1);
  await portal.getByRole("button", { name: "Aprobar pieza final" }).click();
  await expect(portal).toContainText("Aprobado para programar");

  await page.goto(`/v2/clientes/aca/contenido?seccion=piezas&registro=${created.id}`);
  await detail.getByLabel("Fecha de programación").fill("2027-01-15");
  await detail.getByLabel("Hora de programación").fill("10:00");
  await act(detail, "Marcar programado", "Programado");
  requests = await linkedRequests(page, created.id);
  tasks = await linkedTasks(page, created.id);
  expect(requests).toHaveLength(1);
  expect(requests[0].values.estado).toBe("Aprobado");
  expect(expectChain(tasks).status).toBe("Hecho");
  expect(openOf(tasks)).toHaveLength(0);
  const library = ((await local(page, "client:aca:module:diseno-marca:biblioteca")) || []).filter((item: { values: { contenidoId: string } }) => item.values.contenidoId === created.id);
  expect(library.map((item: { values: { versionContenido: string } }) => item.values.versionContenido).sort()).toEqual(["v1", "v2"]);
  expect(new Set(library.map((item: { values: { piezaId: string } }) => item.values.piezaId)).size).toBe(1);
  expect(library.find((item: { values: { versionContenido: string } }) => item.values.versionContenido === "v2").values.estado).toBe("Aprobado");

  // Revisiones por versión e historial con quién pidió cada cambio.
  await detail.getByRole("button", { name: /^Revisiones/ }).click();
  const reviews = detail.getByRole("region", { name: "Comentarios del contenido" });
  await expect(reviews.getByRole("heading", { name: "Diseño v1" })).toBeVisible();
  await expect(reviews.getByRole("heading", { name: "Propuesta v1" })).toBeVisible();
  await expect(reviews).toContainText("Subir el contraste del titular");
  await detail.getByRole("button", { name: "Historial", exact: true }).click();
  const history = detail.getByRole("region", { name: "Historial del contenido" });
  await expect(history).toContainText("a pedido de Cliente · ACA");
  await expect(history).toContainText("Revisión interna del diseño → Ajustes");
  stored = await contentFor(page);
  expect(JSON.parse(stored.values.contentTransitions).map((entry: { to: string }) => entry.to)).toEqual(["Revisión interna de producción", "Revisión preliminar del cliente", "Ajustes", "Revisión interna de producción", "Revisión preliminar del cliente", "Preproducción", "Producción de diseño", "Revisión interna del diseño", "Ajustes", "Revisión interna del diseño", "Aprobación final del cliente", "Aprobado", "Programado"]);

  // La pieza aparece en la biblioteca de Diseño (apoyo a Contenidos para ACA).
  await page.goto("/v2/clientes/aca/diseno-marca?seccion=biblioteca");
  await expect(page.getByText(TITLE).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("QA Contenidos ACA: calendario mes/semana/día con canales, aislamiento, roles, reinicio de demo y 390 px", async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/v2/clientes/aca/contenido?seccion=calendario");
  await page.getByRole("button", { name: "Ir a Diciembre 2026 — ACA" }).click();
  await expect(page.getByRole("grid", { name: /diciembre de 2026/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Agenda de beneficios de verano/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Agenda de beneficios de verano/ }).getByRole("img")).toHaveCount(0); // miniatura decorativa
  await expect(page.getByRole("grid").locator("img").first()).toBeVisible();
  const channels = page.getByRole("group", { name: "Canal", exact: true });
  for (const channel of ["Instagram", "Facebook", "LinkedIn", "TikTok", "YouTube", "Blog", "Newsletter"]) await expect(channels.getByRole("button", { name: new RegExp(channel) })).toBeVisible();
  await channels.getByRole("button", { name: /TikTok/ }).click();
  await expect(page.getByRole("button", { name: /tres mitos sobre el auxilio/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Agenda de beneficios de verano/ })).toHaveCount(0);
  await channels.getByRole("button", { name: /Todos/ }).click();
  await page.getByRole("group", { name: "Vista del calendario" }).getByRole("button", { name: "Semana" }).click();
  await expect(page.getByLabel("Agenda semanal")).toContainText("Agenda de beneficios de verano");
  await page.getByRole("group", { name: "Vista del calendario" }).getByRole("button", { name: "Día" }).click();
  await expect(page.getByLabel("Agenda diaria")).toContainText("Agenda de beneficios de verano");
  await page.getByRole("button", { name: /Agenda de beneficios de verano/ }).click();
  const detail = page.getByRole("dialog", { name: "Contenido: Agenda de beneficios de verano" });
  await expect(detail.getByText("Programado", { exact: true }).first()).toBeVisible();
  await expect(detail.getByRole("img", { name: /Miniatura/ })).toBeVisible();
  await page.keyboard.press("Escape");

  // Aislamiento: otro cliente no ve contenidos, pedidos ni portal de ACA.
  await page.goto("/v2/clientes/epsa/contenido?seccion=piezas");
  await expect(page.getByText("Agenda de beneficios de verano")).toHaveCount(0);
  await page.goto("/v2/portal/epsa");
  await expect(page.locator("body")).not.toContainText("Testimonio: la primera escapada");
  await page.goto("/v2/portal/aca");
  await expect(page.getByRole("region", { name: "Piezas para aprobar" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Sofía Ramírez");

  // Roles visuales: Content edita, líder técnico solo consulta.
  await page.goto("/v2/clientes/aca/contenido?seccion=piezas");
  await setRole(page, "Content Manager");
  await expect(page.getByRole("button", { name: "Nuevo contenido", exact: true })).toBeEnabled();
  await setRole(page, "Líder técnico");
  await expect(page.getByText("Tu rol de vista previa puede consultar este módulo")).toBeVisible();
  await expect(page.getByRole("button", { name: "Nuevo contenido", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Carrusel: viajar seguros con chicos", exact: true }).click();
  await expect(page.getByText("Vista de consulta: tu rol no modifica este contenido.")).toBeVisible();
  await page.keyboard.press("Escape");
  await setRole(page, "Administrador");

  // Reinicio: solo registros demo; lo manual se conserva.
  await page.evaluate((prefix) => {
    const key = `${prefix}client:aca:module:contenidos:piezas`;
    const now = new Date().toISOString();
    const manual = { id: "PZA-QA-MANUAL", client: "aca", module: "contenidos", collection: "piezas", user: "QA", source: "manual", createdAt: now, updatedAt: now, history: [], values: { titulo: "QA manual que se conserva", estado: "Borrador", canal: "Instagram" } };
    const current = JSON.parse(localStorage.getItem(key) || "null")?.value;
    localStorage.setItem(key, JSON.stringify({ version: 1, savedAt: now, value: [manual, ...(current || [])] }));
  }, PREFIX);
  await page.goto("/v2/clientes/aca/contenido?seccion=piezas");
  await expect(page.getByRole("button", { name: "QA manual que se conserva", exact: true })).toBeVisible();
  await page.evaluate((prefix) => {
    const key = `${prefix}client:aca:module:contenidos:piezas`;
    const envelope = JSON.parse(localStorage.getItem(key)!);
    envelope.value = envelope.value.filter((item: { id: string }) => item.id !== "PZA-ACA-D15").map((item: { id: string; values: Record<string, string> }) => item.id === "PZA-ACA-D10" ? { ...item, values: { ...item.values, titulo: "Demo modificada" } } : item);
    localStorage.setItem(key, JSON.stringify(envelope));
  }, PREFIX);
  await page.goto("/v2/clientes/aca/contenido");
  await page.getByRole("button", { name: "Reiniciar datos de demostración" }).click();
  await expect.poll(async () => (await local(page, "client:aca:module:contenidos:piezas")).find((item: { id: string }) => item.id === "PZA-ACA-D10")?.values.titulo).toBe("Carrusel: viajar seguros con chicos");
  const after = await local(page, "client:aca:module:contenidos:piezas");
  expect(after.some((item: { id: string }) => item.id === "PZA-QA-MANUAL")).toBe(true);
  expect(after.filter((item: { id: string }) => item.id === "PZA-ACA-D15")).toHaveLength(1);
  const workspace = await local(page, "workspace");
  for (const id of ["PZA-ACA-D10", "PZA-ACA-D15", "PZA-ACA-03"]) expect(workspace.tasks.filter((task: { workItem?: { id: string } }) => task.workItem?.id === id), id).toHaveLength(1);

  // 390 px: sin desborde horizontal y con agenda por día en el calendario.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/v2/clientes/aca/contenido", "/v2/clientes/aca/contenido?seccion=planes", "/v2/clientes/aca/contenido?seccion=calendario", "/v2/clientes/aca/contenido?seccion=piezas&registro=PZA-ACA-D06", "/v2/clientes/aca/contenido?area=lineamientos", "/v2/portal/aca"]) {
    await page.goto(path);
    await expect(page.locator("body")).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: test.info().outputPath(`aca-390-${path.replace(/[^a-z0-9]+/gi, "_")}.png`), fullPage: true });
  }
  for (const width of [1440, 1280, 820]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/v2/clientes/aca/contenido", "/v2/clientes/aca/contenido?seccion=calendario", "/v2/clientes/aca/contenido?seccion=planes"]) { await page.goto(path); await noOverflow(page); }
  }
  expect(errors).toEqual([]);
});
