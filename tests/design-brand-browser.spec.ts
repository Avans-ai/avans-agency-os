import { expect, test, type Page } from "@playwright/test";
test.use({ actionTimeout: 15000 });

const KEY = "avans-os:preview:v1";
/** Activa Diseño de marca en el store local (ACA no lo tiene activo por defecto) y abre la ruta. */
async function open(page: Page, path: string, { client = "aca", role = "" } = {}) {
  await page.goto(`/v2/clientes/${client}`);
  await page.waitForFunction((key) => !!localStorage.getItem(`${key}:workspace`), KEY);
  await page.evaluate(({ key, client, role }) => {
    const raw = JSON.parse(localStorage.getItem(`${key}:workspace`)!);
    if (!raw.value.services[client].includes("diseno-marca")) raw.value.services[client].push("diseno-marca");
    if (role) raw.value.role = role;
    localStorage.setItem(`${key}:workspace`, JSON.stringify(raw));
  }, { key: KEY, client, role });
  await page.goto(path);
}
async function local(page: Page, key: string) {
  return page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null")?.value, `${KEY}:${key}`);
}
const part = (page: Page, name: RegExp) => page.getByRole("navigation", { name: "Partes del Design System" }).getByRole("link", { name });
async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
async function createRequest(page: Page, name: string) {
  await page.getByRole("button", { name: "Nuevo pedido de diseño" }).click();
  const panel = page.getByRole("dialog", { name: "Nuevo pedido de diseño" });
  await panel.getByLabel(/^Pieza de marca/).fill(name);
  await panel.getByLabel("Origen", { exact: true }).selectOption("estrategia");
  await panel.getByLabel("Tipo de pieza", { exact: true }).selectOption("Redes sociales");
  await panel.getByLabel("Prioridad", { exact: true }).selectOption("Alta");
  await panel.getByLabel("Objetivo", { exact: true }).fill("Comunicar el beneficio de diciembre");
  await panel.getByLabel("Medidas", { exact: true }).fill("1080 × 1350");
  await panel.getByLabel("Responsable", { exact: true }).selectOption("Tomás Aguirre");
  await panel.getByLabel("Fecha objetivo").fill("2026-12-10");
  await panel.getByRole("group", { name: "Recursos del Design System" }).getByRole("button", { name: /Verde ruta/ }).click();
  await panel.getByRole("button", { name: "Crear pedido y tarea" }).click();
  await expect(panel).toHaveCount(0);
}

test("Design System shows logo variants, swatches with HEX/RGB/contrast, type samples, components and tone linked to the Ficha glossary", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page, "/v2/clientes/aca/diseno-marca?area=lineamientos");
  await expect(page.getByRole("heading", { name: "Design System", exact: true })).toBeVisible();
  await expect(page.getByText("DATOS DE DEMOSTRACIÓN", { exact: true })).toBeVisible();
  await expect(page.getByText(/Guardado en este navegador/).first()).toBeVisible();

  await part(page, /^Identidad/).click();
  for (const name of ["Logo principal horizontal", "Logo secundario apilado", "Isotipo · monograma", "Versión monocromática", "Versión negativa"]) await expect(page.getByRole("img", { name, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Usos incorrectos" })).toBeVisible();
  await expect(page.getByLabel("Uso incorrecto", { exact: true })).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "Aplicaciones" })).toBeVisible();

  await part(page, /^Sistema de color/).click();
  await expect(page.getByRole("heading", { name: "Colores principales" })).toBeVisible();
  await expect(page.getByText("31, 77, 58", { exact: true })).toBeVisible();
  await expect(page.getByText("#1f4d3a", { exact: true }).first()).toBeVisible();
  await expect(page.getByTitle("Blanco: contraste 9.63:1 (AAA)")).toBeVisible();
  await expect(page.getByTitle("Blanco: contraste 2.45:1 (No apto)")).toBeVisible();
  const swatch = page.locator("article").filter({ has: page.getByRole("heading", { name: "Verde ruta" }) }).locator("div").first();
  expect(await swatch.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(31, 77, 58)");
  await expect(page.getByRole("heading", { name: "Combinaciones y contraste" })).toBeVisible();
  await expect(page.getByText("Niebla sobre Tinta", { exact: true })).toBeVisible();

  await part(page, /^Tipografía/).click();
  await expect(page.getByRole("heading", { name: "Jerarquía aplicada" })).toBeVisible();
  const headline = page.getByText("Asistencia en ruta, todo el año", { exact: true });
  await expect(headline).toBeVisible();
  expect(await headline.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/Syne/i);
  await expect(page.getByText("Syne 700", { exact: true })).toBeVisible();

  await part(page, /^Componentes/).click();
  for (const text of ["Pedí asistencia", "20 % en hoteles de ruta", "Asistencia 24 h", "Zona segura"]) await expect(page.getByText(text, { exact: true }).first()).toBeVisible();

  await part(page, /^Recursos gráficos/).click();
  await expect(page.getByRole("img", { name: "Patrón de ruta" })).toBeVisible();

  await part(page, /^Tono y comunicación/).click();
  await expect(page.getByRole("heading", { name: "Personalidad y voz" })).toBeVisible();
  const glossary = page.getByLabel("Glosario vinculado");
  await expect(glossary.getByRole("link", { name: "Abrir glosario de marca" })).toHaveAttribute("href", "/v2/clientes/aca?view=ficha&ficha=glosario");
  await glossary.getByRole("button", { name: "Cargar glosario de demostración en la Ficha" }).click();
  await expect(glossary.getByText("acompañamos", { exact: true })).toBeVisible();
  await expect(glossary.getByText("Asistencia 24 h en todo el país", { exact: true })).toBeVisible();
  const knowledge = await local(page, "client:aca:knowledge:v1");
  expect(knowledge.brandGlossary.use).toContain("acompañamos");
  await page.goto("/v2/clientes/aca?view=ficha&ficha=glosario");
  await expect(page.getByText("Te acompañamos en la ruta").first()).toBeVisible();

  await page.goto("/v2/clientes/aca/diseno-marca?area=lineamientos&parte=moodboard");
  await expect(page.getByText("Por qué:")).toHaveCount(7);
  await expect(page.getByText("Visual generado en la app · demo").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("adds a graphic resource and a moodboard reference that requires a justification", async ({ page }) => {
  await open(page, "/v2/clientes/aca/diseno-marca?area=lineamientos&parte=recursos");
  await page.getByRole("button", { name: "Agregar recurso de marca" }).click();
  let editor = page.getByRole("dialog", { name: "Editar recurso de marca" });
  await expect(editor.getByRole("combobox", { name: "Tipo", exact: true })).toHaveValue("Recurso gráfico");
  await editor.getByLabel("Nombre", { exact: true }).fill("Patrón QA");
  await editor.getByLabel("Clase", { exact: true }).selectOption("Patrón");
  await editor.getByLabel("Visual generado").selectOption("rec-patron");
  await editor.getByLabel("Función / jerarquía").fill("Fondos de portada QA");
  await editor.getByRole("button", { name: "Guardar recurso" }).click();
  await expect(editor).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Patrón QA" })).toBeVisible();

  await page.goto("/v2/clientes/aca/diseno-marca?area=lineamientos&parte=moodboard");
  await page.getByRole("button", { name: "Agregar recurso de marca" }).click();
  editor = page.getByRole("dialog", { name: "Editar recurso de marca" });
  await editor.getByLabel("Nombre", { exact: true }).fill("Referencia QA");
  await editor.getByLabel("Clase", { exact: true }).selectOption("Fotografía");
  await editor.getByLabel("Descripción", { exact: true }).fill("Ruta al atardecer en duotono");
  await editor.getByLabel("Visual generado").selectOption("mb-duotono");
  await editor.getByRole("button", { name: "Guardar recurso" }).click();
  await expect(editor.getByRole("alert")).toContainText("Explicá por qué");
  await editor.getByLabel("Justificación", { exact: true }).fill("Conecta el servicio con el viaje QA");
  await editor.getByRole("button", { name: "Guardar recurso" }).click();
  await expect(editor).toHaveCount(0);
  await expect(page.getByText("Conecta el servicio con el viaje QA")).toBeVisible();
  const stored = await local(page, "client:aca:module:diseno-marca:sistema");
  expect(stored.find((r: { values: { nombre: string } }) => r.values.nombre === "Referencia QA")).toMatchObject({ source: "manual", values: { tipo: "Moodboard", justificacion: "Conecta el servicio con el viaje QA" } });
  await page.goto("/v2/clientes/aca/diseno-marca?seccion=biblioteca");
  await page.getByRole("group", { name: "Contenido de la biblioteca" }).getByRole("button", { name: /^Referencias/ }).click();
  await expect(page.getByRole("heading", { name: "Referencia QA" })).toBeVisible();
});

test("a design request creates exactly one task for its responsible with brief and linked Design System resources", async ({ page }) => {
  await open(page, "/v2/clientes/aca/diseno-marca?seccion=trabajos");
  await createRequest(page, "Placa QA diciembre");
  const detail = page.getByRole("dialog", { name: "Placa QA diciembre" });
  await expect(detail).toContainText("Diseñar · Placa QA diciembre");
  await expect(detail.getByRole("link", { name: /Verde ruta/ })).toBeVisible();
  await expect(detail).toContainText("1080 × 1350");
  const request = (await local(page, "client:aca:module:diseno-marca:trabajos")).find((r: { values: { nombre: string } }) => r.values.nombre === "Placa QA diciembre");
  expect(request).toMatchObject({ source: "manual", values: { servicioOrigen: "estrategia", operacion: "Pendientes", prioridad: "Alta", recursosDS: "DS-ACA-COL-01" } });
  const workspace = await local(page, "workspace");
  const tasks = workspace.tasks.filter((t: { workItem?: { id: string } }) => t.workItem?.id === request.id);
  expect(tasks).toHaveLength(1);
  expect(tasks[0]).toMatchObject({ owner: "Tomás Aguirre", prio: "Alta", serviceId: "diseno-marca", clientSlug: "aca", due: "2026-12-10" });
  expect(tasks[0].desc).toContain("Comunicar el beneficio de diciembre");
  expect(workspace.notifications.some((n: { taskId: string; recipient: string; kind: string }) => n.taskId === tasks[0].id && n.recipient === "Tomás Aguirre" && n.kind === "assignment")).toBe(true);
  // Las tareas de los pedidos de demostración existen una sola vez.
  const demoTasks = workspace.tasks.filter((t: { id: string }) => t.id.startsWith("DESIGN-aca-DIS-ACA-"));
  expect(demoTasks).toHaveLength(10);
  expect(new Set(demoTasks.map((t: { id: string }) => t.id)).size).toBe(10);
});

test("operation Kanban and list move a piece through states; approval puts the same version once in the Biblioteca", async ({ page }) => {
  await open(page, "/v2/clientes/aca/diseno-marca?seccion=trabajos");
  await createRequest(page, "Placa QA flujo");
  await page.keyboard.press("Escape");
  await page.getByRole("navigation", { name: "Secciones de Diseño de marca" }).getByRole("link", { name: "Producción" }).click();
  const board = page.getByLabel("Kanban de diseño");
  for (const stage of ["Pendientes", "En producción", "En revisión interna", "Ajustes", "Esperando aprobación", "Aprobados", "Entregados"]) await expect(board.getByRole("heading", { name: stage, exact: true })).toBeVisible();
  await board.getByLabel("Mover Placa QA flujo").selectOption("En producción");
  await expect(board.getByRole("region", { name: "En producción" }).getByRole("button", { name: "Abrir Placa QA flujo" })).toBeVisible();
  await board.getByLabel("Mover Placa QA flujo").selectOption("En revisión interna");
  await expect(page.getByText(/Subí al menos una versión/)).toBeVisible();
  await expect(board.getByLabel("Mover Placa QA flujo")).toHaveValue("En producción");

  await board.getByRole("button", { name: "Abrir Placa QA flujo" }).click();
  const detail = page.getByRole("dialog", { name: "Placa QA flujo" });
  await detail.getByRole("button", { name: "Subir versión" }).click();
  const editor = page.getByRole("dialog", { name: "Agregar pieza a biblioteca" });
  await editor.getByLabel("Archivo o enlace").fill("https://example.com/placa-qa-v1.png");
  await editor.getByRole("button", { name: "Guardar recurso" }).click();
  await expect(editor).toHaveCount(0);
  await expect(detail.getByRole("link", { name: "Versión 1", exact: true })).toBeVisible();
  await detail.getByRole("button", { name: "Enviar a revisión interna" }).click();
  await detail.getByLabel("Nota de la revisión").fill("Subir el contraste del CTA");
  await detail.getByRole("button", { name: "Pedir ajustes" }).click();
  await expect(detail.getByText("Subir el contraste del CTA", { exact: true })).toBeVisible();
  await detail.getByRole("button", { name: "Reenviar a revisión" }).click();
  await detail.getByRole("button", { name: "Pedir aprobación" }).click();
  await detail.getByLabel("Comentario").fill("Listo para el cliente");
  await detail.getByRole("button", { name: "Comentar" }).click();
  await expect(detail.getByText("Listo para el cliente", { exact: true })).toBeVisible();
  await detail.getByRole("button", { name: "Registrar aprobación" }).click();
  await expect(detail.getByLabel("Estado de Placa QA flujo")).toHaveValue("Aprobados");
  await expect(detail.locator("li[data-decision=Aprobado]")).toHaveCount(1);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await expect(page.getByLabel("Estado de Placa QA flujo en la lista")).toHaveValue("Aprobados");
  await page.getByRole("button", { name: "Kanban", exact: true }).click();
  await expect(board.getByRole("region", { name: "Aprobados" }).getByRole("button", { name: "Abrir Placa QA flujo" })).toBeVisible();

  await page.getByRole("navigation", { name: "Áreas de Diseño de marca" }).getByRole("link", { name: "Biblioteca de marca" }).click();
  await page.getByRole("group", { name: "Estado en la biblioteca" }).getByRole("button", { name: "Aprobadas y entregadas" }).click();
  await page.getByRole("textbox", { name: "Buscar", exact: true }).fill("Placa QA flujo");
  await expect(page.getByRole("heading", { name: "Placa QA flujo", exact: true })).toHaveCount(1);
  await expect(page.getByText("En biblioteca", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ver detalle de Placa QA flujo" }).click();
  await expect(page.getByRole("dialog", { name: "Pieza Placa QA flujo" })).toContainText("Aprobada · disponible en la Biblioteca de marca");

  const request = (await local(page, "client:aca:module:diseno-marca:trabajos")).find((r: { values: { nombre: string } }) => r.values.nombre === "Placa QA flujo");
  const versions = (await local(page, "client:aca:module:diseno-marca:biblioteca")).filter((r: { values: { pedidoId: string } }) => r.values.pedidoId === request.id);
  expect(versions).toHaveLength(1);
  expect(versions[0].values).toMatchObject({ estado: "Aprobado", version: "1", archivo: "https://example.com/placa-qa-v1.png" });
  expect(JSON.parse(request.values.designApprovals).map((a: { decision: string }) => a.decision)).toEqual(["Ajustes solicitados", "Aprobado"]);
  const tasks = (await local(page, "workspace")).tasks.filter((t: { workItem?: { id: string } }) => t.workItem?.id === request.id);
  expect(tasks).toHaveLength(1);
  expect(tasks[0]).toMatchObject({ status: "Hecho", workflow: { kind: "design", stage: "Aprobados" } });
});

test("resetting demo data restores demo records and tasks and keeps manual records", async ({ page }) => {
  await open(page, "/v2/clientes/aca/diseno-marca?area=lineamientos&parte=color");
  await page.getByRole("button", { name: "Agregar recurso de marca" }).click();
  const editor = page.getByRole("dialog", { name: "Editar recurso de marca" });
  await editor.getByLabel("Nombre", { exact: true }).fill("Manual QA");
  await editor.getByLabel("Hex", { exact: true }).fill("#123456");
  await editor.getByRole("button", { name: "Guardar recurso" }).click();
  await expect(editor).toHaveCount(0);
  await page.goto("/v2/clientes/aca/diseno-marca?seccion=operacion");
  await page.getByLabel("Mover Banner web · Turismo de verano").selectOption("En producción");
  await expect(page.getByLabel("Mover Banner web · Turismo de verano")).toHaveValue("En producción");
  await page.getByRole("button", { name: "Reiniciar datos de demostración" }).click();
  await page.getByRole("dialog", { name: "Reiniciar datos de demostración" }).getByRole("button", { name: "Reiniciar demostración" }).click();
  await expect(page.getByLabel("Mover Banner web · Turismo de verano")).toHaveValue("Pendientes");
  const system = await local(page, "client:aca:module:diseno-marca:sistema");
  expect(system.filter((r: { source: string }) => r.source === "manual").map((r: { values: { nombre: string } }) => r.values.nombre)).toEqual(["Manual QA"]);
  expect(system.filter((r: { source: string }) => r.source === "demo")).toHaveLength(49);
  const tasks = (await local(page, "workspace")).tasks.filter((t: { id: string }) => t.id === "DESIGN-aca-DIS-ACA-01");
  expect(tasks).toHaveLength(1);
  expect(tasks[0].workflow.stage).toBe("Pendientes");
});

test("ACA demo data stays isolated from EPSA and a read-only role cannot edit", async ({ page }) => {
  await open(page, "/v2/clientes/epsa/diseno-marca?area=lineamientos", { client: "epsa" });
  await expect(page.getByRole("heading", { name: "El Design System está vacío" })).toBeVisible();
  await expect(page.getByText("DATOS DE DEMOSTRACIÓN", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Agregar recurso de marca" }).click();
  const editor = page.getByRole("dialog", { name: "Editar recurso de marca" });
  await editor.getByLabel("Nombre", { exact: true }).fill("Color EPSA QA");
  await editor.getByRole("combobox", { name: "Tipo", exact: true }).selectOption("Color");
  await editor.getByLabel("Hex", { exact: true }).fill("#336699");
  await editor.getByRole("button", { name: "Guardar recurso" }).click();
  await page.goto("/v2/clientes/epsa/diseno-marca?seccion=biblioteca");
  await expect(page.getByText("Sin piezas en esta categoría")).toBeVisible();
  await open(page, "/v2/clientes/aca/diseno-marca?area=lineamientos&parte=color");
  await expect(page.getByRole("heading", { name: "Verde ruta" })).toBeVisible();
  await expect(page.getByText("Color EPSA QA")).toHaveCount(0);
  expect((await local(page, "client:epsa:module:diseno-marca:sistema")).map((r: { values: { nombre: string } }) => r.values.nombre)).toEqual(["Color EPSA QA"]);
  expect(await local(page, "client:aca:module:diseno-marca:sistema")).toBeUndefined();

  await open(page, "/v2/clientes/aca/diseno-marca?area=lineamientos&parte=identidad", { role: "pm" });
  await expect(page.getByRole("region", { name: "Design System" }).getByText("Solo lectura", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Agregar recurso de marca" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Editar recurso" })).toHaveCount(0);
  await page.goto("/v2/clientes/aca/diseno-marca?seccion=operacion");
  await expect(page.getByRole("button", { name: "Abrir Banner web · Turismo de verano" })).toBeVisible();
  await expect(page.getByLabel("Mover Banner web · Turismo de verano")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reiniciar datos de demostración" })).toHaveCount(0);
  await page.getByRole("button", { name: "Abrir Banner web · Turismo de verano" }).click();
  const detail = page.getByRole("dialog", { name: "Banner web · Turismo de verano" });
  await expect(detail.getByRole("button", { name: "Subir versión" })).toHaveCount(0);
  await expect(detail.getByRole("button", { name: "Comentar" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.goto("/v2/clientes/aca/diseno-marca?seccion=trabajos");
  await expect(page.getByRole("button", { name: "Nuevo pedido de diseño" })).toBeDisabled();
});

test("every Diseño de marca area renders without horizontal overflow at 390, 820, 1280 and 1440 px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "/v2/clientes/aca/diseno-marca");
  await expect(page.getByRole("heading", { name: "Lineamientos del servicio", level: 2 })).toBeVisible();
  await noOverflow(page);
  for (const path of ["?area=lineamientos", "?area=lineamientos&parte=identidad", "?area=lineamientos&parte=color", "?area=lineamientos&parte=tipografia", "?area=lineamientos&parte=componentes", "?area=lineamientos&parte=tono", "?area=lineamientos&parte=moodboard", "?seccion=operacion", "?seccion=trabajos", "?seccion=biblioteca"]) {
    await page.goto(`/v2/clientes/aca/diseno-marca${path}`);
    await expect(page.getByText("DATOS DE DEMOSTRACIÓN", { exact: true })).toBeVisible();
    await noOverflow(page);
  }
  await page.goto("/v2/clientes/aca/diseno-marca?seccion=operacion");
  await page.getByRole("button", { name: "Abrir Folleto · Beneficios en estaciones" }).click();
  await expect(page.getByRole("dialog", { name: "Folleto · Beneficios en estaciones" })).toContainText("Agrandar el QR");
  await noOverflow(page);
  await page.keyboard.press("Escape");
  for (const width of [1440, 1280, 820]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["?seccion=operacion", "?seccion=biblioteca", "?area=lineamientos&parte=color"]) {
      await page.goto(`/v2/clientes/aca/diseno-marca${path}`);
      await expect(page.getByText("DATOS DE DEMOSTRACIÓN", { exact: true })).toBeVisible();
      await noOverflow(page);
    }
  }
});
