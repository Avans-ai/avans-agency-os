/* Tareas: tres niveles de visualización sobre el mismo store (módulo, cliente e Inicio),
 * cadena por etapa sin duplicados, agrupación por responsable con filtros, creación manual,
 * permisos de solo lectura, aislamiento ACA/EPSA, persistencia y sin desborde horizontal. */
import { test, expect, type Locator, type Page } from "@playwright/test";
import { osClients } from "../app/v2/os/os-data";
import type { ModuleRecord } from "../app/v2/os/modules/types";
import { buildContentTask } from "../app/v2/os/workflow-tasks";
import { expectChain, openOf, type ChainTask } from "./task-chain-helpers";

test.use({ actionTimeout: 15000 });
const KEY = "avans-os:preview:v1:";
const RECORD = "QA-TAREAS-VISTAS";
const TITLE = "Carrusel: beneficios QA de la cadena";
const BASE = `CONTENT-epsa-${RECORD}`;
const REVIEW = `${BASE}-revision-interna-de-produccion-1`;
const SHOTS = "test-results/tareas-vistas";

function fixture(client: string, values: Record<string, string> = {}): ModuleRecord {
  const at = "2026-11-20T12:00:00.000Z";
  return { id: RECORD, client, module: "contenidos", collection: "piezas", source: "manual", user: "QA", createdAt: at, updatedAt: at, history: [], values: {
    titulo: client === "epsa" ? TITLE : "QA contenido de ACA", estado: "Borrador", eje: "QA-EJE", idea: "Explicar el beneficio", bajada: "Usos", copy: "Copy preliminar", objetivo: "Dar a conocer",
    canal: "Instagram", formato: "Carrusel", fecha: "2099-12-03", responsable: "Lucía Benítez", revisor: "Valentina Ríos", disenador: "Tomás Aguirre", ...values,
  } };
}
type Workspace = { tasks: ChainTask[]; notifications: { id: string; taskId: string; recipient: string; kind: string }[]; role: string };
const workspace = (page: Page) => page.evaluate((prefix) => JSON.parse(localStorage.getItem(`${prefix}workspace`) || "null")?.value as Workspace, KEY);
const piece = (page: Page) => page.evaluate(({ prefix, id }) => (JSON.parse(localStorage.getItem(`${prefix}client:epsa:module:contenidos:piezas`) || "null")?.value as ModuleRecord[]).find((item) => item.id === id)!, { prefix: KEY, id: RECORD });
const chainOf = async (page: Page) => (await workspace(page)).tasks.filter((task) => task.workItem?.id === RECORD && task.id.startsWith("CONTENT-epsa-"));

/** Prepara un contenido de EPSA (y uno homónimo de ACA) con su tarea; opcionalmente con datos anteriores. */
async function prepare(page: Page, options: { values?: Record<string, string>; legacyTask?: boolean } = {}) {
  await page.goto("/v2");
  await expect(page.getByRole("button", { name: /^Perfil:/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem("avans-os:preview:v1:workspace")))).toBe(true);
  const records = [fixture("epsa", options.values), fixture("aca")];
  const tasks = records.map((record) => buildContentTask(osClients.find((client) => client.slug === record.client)!, record, [], "QA", record.createdAt));
  if (options.legacyTask) for (const task of tasks) { delete task.createdAt; delete task.cycle; delete task.chainId; }
  await page.evaluate(({ records, tasks, prefix }) => {
    const stored = JSON.parse(localStorage.getItem(`${prefix}workspace`)!);
    stored.value.role = "admin";
    stored.value.tasks = [...stored.value.tasks.filter((task: { id: string }) => !task.id.includes("QA-TAREAS-VISTAS")), ...tasks];
    stored.value.notifications = [];
    localStorage.setItem(`${prefix}workspace`, JSON.stringify(stored));
    for (const record of records) {
      localStorage.setItem(`${prefix}client:${record.client}:module:contenidos:piezas`, JSON.stringify({ version: 1, value: [record], savedAt: record.createdAt }));
      localStorage.setItem(`${prefix}client:${record.client}:module:contenidos:ejes`, JSON.stringify({ version: 1, value: [{ ...record, id: "QA-EJE", collection: "ejes", values: { nombre: "Productos", estado: "Activo" } }], savedAt: record.createdAt }));
    }
  }, { records, tasks, prefix: KEY });
}
async function setRole(page: Page, label: string) {
  await page.getByRole("button", { name: /^Perfil:/ }).click();
  await page.getByRole("group", { name: "Rol simulado" }).getByRole("button", { name: label, exact: true }).click();
  await page.getByRole("button", { name: /^Perfil:/ }).click();
}
async function act(detail: Locator, action: string, next: string, note?: string) {
  if (note) await detail.getByLabel("Comentario o devolución").fill(note);
  await detail.getByRole("button", { name: action, exact: true }).click();
  await expect(detail.getByText(next, { exact: true }).first()).toBeVisible();
}
async function noOverflow(page: Page, name: string) {
  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `sin desborde a ${width}px · ${name}`).toBe(true);
    if (width !== 820) {
      // Captura de la lista agrupada (no de página completa: el encabezado fijo se superpone en esas capturas).
      await page.locator("section[data-owner]").first().scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, -160));
      await page.screenshot({ path: `${SHOTS}/${name}-${width}.png` });
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}
const errorsOf = (page: Page) => { const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message)); return errors; };

test("content transitions create per-stage tasks without duplicates (tasks, design requests, notifications), after reload too", async ({ page }) => {
  const errors = errorsOf(page);
  await prepare(page);
  await page.goto(`/v2/clientes/epsa/contenido?seccion=piezas&registro=${RECORD}`);
  const detail = page.getByRole("dialog", { name: `Contenido: ${TITLE}`, exact: true });
  await act(detail, "Enviar a revisión interna", "Revisión interna de producción");
  await expect.poll(async () => (await chainOf(page)).length).toBe(2);
  let chain = await chainOf(page);
  expect(chain.find((task) => task.id === BASE)).toMatchObject({ status: "Hecho", workflow: { stage: "Borrador" } });
  expect(expectChain(chain, BASE)).toMatchObject({ id: REVIEW, owner: "Valentina Ríos", status: "En aprobación", title: `Revisar propuesta · ${TITLE}` });
  const notes = (await workspace(page)).notifications.length;

  // La misma transición no se puede repetir y recargar no crea tareas ni avisos.
  await expect(detail.getByRole("button", { name: "Enviar a revisión interna", exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("dialog", { name: `Contenido: ${TITLE}`, exact: true })).toBeVisible();
  expect(await chainOf(page)).toHaveLength(2);
  expect((await workspace(page)).notifications).toHaveLength(notes);

  // Pedir cambios asigna el ajuste al responsable del contenido; reenviar abre el segundo ciclo de revisión.
  await act(page.getByRole("dialog", { name: `Contenido: ${TITLE}`, exact: true }), "Solicitar ajustes", "Ajustes", "Aclarar el beneficio principal");
  await expect.poll(async () => openOf(await chainOf(page))[0]?.workflow?.stage).toBe("Ajustes");
  expect(openOf(await chainOf(page))[0]).toMatchObject({ owner: "Lucía Benítez", title: `Ajustar propuesta · ${TITLE}`, status: "Por hacer" });
  expect((await workspace(page)).notifications.filter((note) => note.recipient === "Lucía Benítez" && note.kind === "changes")).toHaveLength(1);
  await act(page.getByRole("dialog", { name: `Contenido: ${TITLE}`, exact: true }), "Reenviar a revisión", "Revisión interna de producción");
  await expect.poll(async () => openOf(await chainOf(page))[0]?.id).toBe(`${BASE}-revision-interna-de-produccion-2`);
  chain = await chainOf(page);
  expect(chain.map((task) => [task.workflow?.stage, task.status])).toEqual([["Borrador", "Hecho"], ["Revisión interna de producción", "Hecho"], ["Ajustes", "Hecho"], ["Revisión interna de producción", "En aprobación"]]);
  expect((await piece(page)).values.tareaId).toBe(`${BASE}-revision-interna-de-produccion-2`);
  const ids = (await workspace(page)).notifications.map((note) => note.id);
  expect(new Set(ids).size).toBe(ids.length);
  await page.reload();
  expect(await chainOf(page)).toHaveLength(4);
  expect((await workspace(page)).notifications.map((note) => note.id)).toEqual(ids);
  expect(errors).toEqual([]);
});

test("advancing to design links the request and the piece to Design's task, keeping history and completed tasks", async ({ page }) => {
  const errors = errorsOf(page);
  await prepare(page, { values: { estado: "Preproducción", preCopyFinal: "Copy final", preIndicaciones: "Portada y tres láminas", preDimensiones: "1080 × 1350", preReferencias: "Referencia" } });
  await page.goto(`/v2/clientes/epsa/contenido?seccion=piezas&registro=${RECORD}`);
  const detail = page.getByRole("dialog", { name: `Contenido: ${TITLE}`, exact: true });
  await act(detail, "Enviar a diseño", "Producción de diseño");
  await expect.poll(async () => (await chainOf(page)).length).toBe(2);
  const chain = await chainOf(page);
  const designTask = expectChain(chain, BASE);
  expect(designTask).toMatchObject({ owner: "Tomás Aguirre", serviceId: "diseno-marca", title: `Diseñar pieza · ${TITLE}`, workflow: { stage: "Producción de diseño" } });
  expect(chain.find((task) => task.id === BASE)).toMatchObject({ status: "Hecho", workflow: { stage: "Preproducción" } });
  const requests = await page.evaluate((prefix) => JSON.parse(localStorage.getItem(`${prefix}client:epsa:module:diseno-marca:trabajos`) || "null")?.value as ModuleRecord[], KEY);
  const linked = requests.filter((request) => request.values.contenidoId === RECORD);
  expect(linked).toHaveLength(1);
  expect(linked[0].values.tareaId).toBe(designTask.id);
  expect((await piece(page)).values.tareaId).toBe(designTask.id);
  // El panel de la tarea muestra el origen y las etapas anteriores (completadas) de la misma pieza.
  await page.goto(`/v2/clientes/epsa/diseno-marca?seccion=tareas&task=${designTask.id}`);
  const panel = page.getByRole("dialog", { name: new RegExp(`${designTask.id} Diseñar pieza`) });
  await expect(panel.getByLabel("Origen de la tarea")).toContainText(`Contenido: ${TITLE}`);
  await expect(panel.getByRole("region", { name: "Etapas del mismo origen" })).toContainText("Completar preproducción");
  await expect(panel.getByRole("link", { name: "Abrir contenido vinculado" })).toHaveAttribute("href", new RegExp(`registro=${RECORD}`));
  expect(errors).toEqual([]);
});

test("the same task (same id) appears in module, client and general views; grouped by responsible with URL filters and «Volver»", async ({ page }) => {
  const errors = errorsOf(page);
  await prepare(page);
  await page.goto(`/v2/clientes/epsa/contenido?seccion=piezas&registro=${RECORD}`);
  await act(page.getByRole("dialog", { name: `Contenido: ${TITLE}`, exact: true }), "Enviar a revisión interna", "Revisión interna de producción");
  await expect.poll(async () => (await chainOf(page)).length).toBe(2);

  // A · Módulo: Kanban y «Por responsable».
  await page.goto("/v2/clientes/epsa/contenido?seccion=tareas");
  await expect(page.getByLabel("Kanban de Contenidos").locator(`[data-task-id="${REVIEW}"]`)).toHaveCount(1);
  await page.getByRole("group", { name: "Formato de tareas" }).getByRole("button", { name: "Por responsable" }).click();
  await expect(page).toHaveURL(/t-vista=responsable/);
  const moduleGroups = page.getByRole("list", { name: "Tareas de Contenidos por responsable" });
  const valentina = moduleGroups.getByRole("listitem", { name: /^Valentina Ríos · \d+ abierta/ });
  await expect(valentina.locator(`[data-task-id="${REVIEW}"]`)).toContainText(`Revisar propuesta · ${TITLE}`);
  await expect(valentina.locator(`[data-task-id="${REVIEW}"]`)).toContainText("En aprobación");
  await valentina.locator(`[data-task-id="${REVIEW}"]`).getByRole("button", { name: `Revisar propuesta · ${TITLE}` }).click();
  await expect(page.getByRole("dialog", { name: new RegExp(`${REVIEW} Revisar propuesta`) })).toBeVisible();
  await page.keyboard.press("Escape");
  await noOverflow(page, "modulo");

  // B · Cliente: misma tarea, agrupada por persona.
  await page.goto("/v2/clientes/epsa/tareas");
  const clientGroups = page.getByRole("list", { name: "Tareas de EPSA / Line Up por rol y persona" });
  await expect(clientGroups.getByRole("listitem", { name: /^Valentina Ríos · / }).locator(`[data-task-id="${REVIEW}"]`)).toContainText("Contenido: Carrusel: beneficios QA de la cadena · Contenidos");
  await noOverflow(page, "cliente");
  await page.goto("/v2/clientes/aca/tareas");
  await expect(page.locator(`[data-task-id="${REVIEW}"]`)).toHaveCount(0);
  await expect(page.locator(`[data-task-id="CONTENT-aca-${RECORD}"]`)).toHaveCount(1);

  // C · Inicio general: el Administrador ve a todo el equipo, agrupado por responsable, con filtros en la URL.
  await page.goto("/v2/mis-tareas");
  await expect(page.getByRole("heading", { name: "Tareas del equipo", level: 1 })).toBeVisible();
  const general = page.getByRole("list", { name: "Tareas del equipo por responsable" });
  await expect(general.getByRole("listitem", { name: /^Valentina Ríos · / }).locator(`[data-task-id="${REVIEW}"]`)).toContainText("EPSA / Line Up");
  const filters = page.getByRole("search", { name: "Filtrar tareas" });
  await filters.getByRole("combobox", { name: /^Cliente/ }).selectOption("aca");
  await expect(page).toHaveURL(/cliente=aca/);
  await expect(page.locator(`[data-task-id="${REVIEW}"]`)).toHaveCount(0);
  await expect(page.locator(`[data-task-id="CONTENT-aca-${RECORD}"]`)).toHaveCount(1);
  await filters.getByRole("combobox", { name: /^Cliente/ }).selectOption("epsa");
  await filters.getByRole("combobox", { name: /^Módulo/ }).selectOption("contenidos");
  await filters.getByRole("combobox", { name: /^Estado/ }).selectOption("En aprobación");
  await expect(page.locator(`[data-task-id="${REVIEW}"]`)).toHaveCount(1);
  await expect(general.locator("[data-status=\"Por hacer\"]")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("search", { name: "Filtrar tareas" }).getByRole("combobox", { name: /^Estado/ })).toHaveValue("En aprobación");
  const filtered = page.url();
  // Detalle de la tarea y «Volver» a la misma lista filtrada.
  await page.locator(`[data-task-id="${REVIEW}"]`).getByRole("link", { name: `Revisar propuesta · ${TITLE}` }).click();
  await expect(page.getByRole("dialog", { name: new RegExp(`${REVIEW} Revisar propuesta`) })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Volver", exact: true }).click();
  await expect(page).toHaveURL(filtered);
  await expect(page.getByRole("search", { name: "Filtrar tareas" }).getByRole("combobox", { name: /^Módulo/ })).toHaveValue("contenidos");
  // Acceso al origen.
  await expect(page.locator(`[data-task-id="${REVIEW}"]`).getByRole("link", { name: /Abrir origen: Contenido/ })).toHaveAttribute("href", new RegExp(`registro=${RECORD}.*volver=`));
  await page.goto("/v2/mis-tareas");
  await noOverflow(page, "inicio");

  // Otro perfil ve solo sus tareas (actor de la vista previa) y la misma tarea con el mismo id.
  await setRole(page, "Project Manager · Valentina Ríos");
  await expect(page.getByRole("heading", { name: "Mis tareas", level: 1 })).toBeVisible();
  await expect(page.locator(`[data-task-id="${REVIEW}"]`)).toHaveCount(1);
  // Sus tareas y las aprobaciones que esperan su decisión (agrupadas por quién las ejecuta); nada de otros perfiles.
  const own = page.getByRole("list", { name: "Tareas de Valentina Ríos" });
  await expect(own.locator('section[data-owner="Valentina Ríos"]')).toHaveCount(1);
  const visibleIds = await own.locator("li[data-task-id]").evaluateAll((rows) => rows.map((row) => row.getAttribute("data-task-id")));
  const stored = (await workspace(page)).tasks as (ChainTask & { approver?: string })[];
  for (const id of visibleIds) expect(stored.find((task) => task.id === id)).toEqual(expect.objectContaining({ id }));
  expect(visibleIds.every((id) => { const task = stored.find((item) => item.id === id)!; return task.owner === "Valentina Ríos" || (task.approver === "Valentina Ríos" && task.status === "En aprobación"); })).toBe(true);
  await setRole(page, "Diseñador");
  await expect(page.locator(`[data-task-id="${REVIEW}"]`)).toHaveCount(0);
  await noOverflow(page, "inicio-disenador");
  expect(errors).toEqual([]);
});

test("manual creation in each level lands in the shared store and shows everywhere; read-only roles cannot edit", async ({ page }) => {
  const errors = errorsOf(page);
  await prepare(page);
  const create = async (title: string, owner?: string) => {
    const dialog = page.getByRole("dialog", { name: "Nueva tarea" });
    await dialog.getByLabel(/^Título/).fill(title);
    if (owner) await dialog.getByLabel("Responsable").selectOption(owner);
    await dialog.getByRole("button", { name: "Crear tarea" }).click();
    await expect(dialog).toHaveCount(0);
    await expect.poll(async () => (await workspace(page)).tasks.filter((task) => task.title === title).length).toBe(1);
    return (await workspace(page)).tasks.find((task) => task.title === title)!;
  };
  // Nivel A (módulo).
  await page.goto("/v2/clientes/epsa/contenido?seccion=tareas&t-vista=responsable");
  await page.getByRole("button", { name: "Nueva tarea" }).first().click();
  const fromModule = await create("QA manual desde el módulo", "Lucía Benítez");
  await expect(page.getByRole("list", { name: "Tareas de Contenidos por responsable" }).locator(`[data-task-id="${fromModule.id}"]`)).toHaveCount(1);
  // Nivel B (cliente).
  await page.goto("/v2/clientes/epsa/tareas");
  await page.getByRole("button", { name: "Nueva tarea" }).first().click();
  const fromClient = await create("QA manual desde el cliente", "Pendiente de asignación");
  expect(fromClient).toMatchObject({ owner: "Pendiente de asignación", clientSlug: "epsa" });
  await expect(page.getByRole("listitem", { name: /^Pendiente de asignación · / }).locator(`[data-task-id="${fromClient.id}"]`)).toHaveCount(1);
  await expect(page.locator(`[data-task-id="${fromModule.id}"]`)).toHaveCount(1);
  // Nivel C (Inicio): con un cliente filtrado, la tarea nace en ese cliente.
  await page.goto("/v2/mis-tareas?cliente=epsa");
  await page.getByRole("button", { name: "Nueva tarea" }).first().click();
  const fromHome = await create("QA manual desde Inicio");
  expect(fromHome.clientSlug).toBe("epsa");
  for (const id of [fromModule.id, fromClient.id, fromHome.id]) await expect(page.locator(`[data-task-id="${id}"]`)).toHaveCount(1);
  await page.goto("/v2/clientes/aca/tareas");
  for (const id of [fromModule.id, fromClient.id, fromHome.id]) await expect(page.locator(`[data-task-id="${id}"]`)).toHaveCount(0);
  await page.reload();
  expect((await workspace(page)).tasks.filter((task) => task.title.startsWith("QA manual desde"))).toHaveLength(3);

  // Solo lectura: el Líder técnico ve el módulo de Contenidos de EPSA pero no lo edita.
  await page.goto("/v2/clientes/epsa/contenido?seccion=tareas");
  await setRole(page, "Líder técnico");
  await expect(page.getByRole("button", { name: "Nueva tarea" }).first()).toBeDisabled();
  await page.goto(`/v2/clientes/epsa/contenido?seccion=tareas&task=${fromModule.id}`);
  const panel = page.getByRole("dialog", { name: new RegExp(`${fromModule.id} QA manual desde el módulo`) });
  await expect(panel.getByText(/Solo lectura/)).toBeVisible();
  await expect(panel.getByLabel("Estado")).toBeDisabled();
  await expect(panel.getByRole("button", { name: "Comentar" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("legacy single-task data keeps working: the stored task becomes the first of its chain, idempotently", async ({ page }) => {
  const errors = errorsOf(page);
  await prepare(page, { values: { estado: "Revisión interna de producción" }, legacyTask: true });
  const before = (await workspace(page)).tasks.find((task) => task.id === BASE)!;
  expect(before.chainId).toBeUndefined();
  await page.goto(`/v2/clientes/epsa/contenido?seccion=piezas&registro=${RECORD}`);
  await act(page.getByRole("dialog", { name: `Contenido: ${TITLE}`, exact: true }), "Enviar al cliente", "Revisión preliminar del cliente");
  await expect.poll(async () => (await chainOf(page)).length).toBe(2);
  const chain = await chainOf(page);
  expect(chain.find((task) => task.id === BASE)).toMatchObject({ status: "Hecho", workflow: { stage: "Revisión interna de producción" } });
  expect(expectChain(chain, BASE)).toMatchObject({ chainId: BASE, owner: "Cliente · EPSA / Line Up" });
  await page.reload();
  await page.goto("/v2/clientes/epsa/tareas");
  expect(await chainOf(page)).toHaveLength(2);
  expect(errors).toEqual([]);
});
