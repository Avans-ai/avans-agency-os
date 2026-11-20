import { test, expect, type Page } from "@playwright/test";
import { osClients } from "../app/v2/os/os-data";
import type { ModuleRecord } from "../app/v2/os/modules/types";
import { buildContentTask } from "../app/v2/os/workflow-tasks";

test.use({ actionTimeout: 15000 });
const KEY = "avans-os:preview:v1:";
const recordId = "QA-WORKFLOW-SHARED-ID";
const title = "QA trazabilidad de tarea única";
function fixture(client: string): ModuleRecord {
  const at = "2026-11-20T12:00:00.000Z";
  return { id: recordId, client, module: "contenidos", collection: "piezas", source: "manual", user: "QA", createdAt: at, updatedAt: at, history: [], values: { titulo: client === "epsa" ? title : "QA contenido de otro cliente", estado: "Borrador", eje: "QA-EJE", idea: "Explicar el producto", bajada: "Presentar sus usos", copy: "Texto preliminar para revisar", objetivo: "Dar a conocer", necesitaCliente: "Fotografía", canal: "Instagram", formato: "Carrusel", fecha: "2099-12-03", responsable: "Lucía Benítez", revisor: "Valentina Ríos", disenador: "Tomás Aguirre" } };
}

async function prepare(page: Page) {
  await page.goto("/v2");
  await expect(page.getByRole("button", { name: /^Perfil:/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem("avans-os:preview:v1:workspace")))).toBe(true);
  const records = [fixture("epsa"), fixture("aca")];
  const tasks = records.map((record) => buildContentTask(osClients.find((client) => client.slug === record.client)!, record, [], "QA", record.createdAt));
  await page.evaluate(({ records, tasks, prefix }) => {
    const workspace = JSON.parse(localStorage.getItem(`${prefix}workspace`)!);
    workspace.value.role = "admin";
    workspace.value.tasks = tasks;
    workspace.value.notifications = [];
    localStorage.setItem(`${prefix}workspace`, JSON.stringify(workspace));
    for (const record of records) {
      localStorage.setItem(`${prefix}client:${record.client}:module:contenidos:piezas`, JSON.stringify({ version: 1, value: [record], savedAt: record.createdAt }));
      localStorage.setItem(`${prefix}client:${record.client}:module:contenidos:ejes`, JSON.stringify({ version: 1, value: [{ ...record, id: "QA-EJE", collection: "ejes", values: { nombre: "Productos", estado: "Activo" } }], savedAt: record.createdAt }));
    }
  }, { records, tasks, prefix: KEY });
  await page.goto(`/v2/clientes/epsa/contenido?seccion=piezas&registro=${recordId}`);
  await expect(page.getByRole("dialog", { name: `Contenido: ${title}`, exact: true })).toBeVisible();
  return tasks;
}

async function readWorkflow(page: Page) {
  return page.evaluate((prefix) => ({
    workspace: JSON.parse(localStorage.getItem(`${prefix}workspace`)!).value,
    epsa: JSON.parse(localStorage.getItem(`${prefix}client:epsa:module:contenidos:piezas`)!).value,
    aca: JSON.parse(localStorage.getItem(`${prefix}client:aca:module:contenidos:piezas`)!).value,
  }), KEY);
}

async function setRole(page: Page, label: string) {
  await page.getByRole("button", { name: /^Perfil:/ }).click();
  await page.getByRole("group", { name: "Rol simulado" }).getByRole("button", { name: label, exact: true }).click();
  await page.getByRole("button", { name: /^Perfil:/ }).click();
}

test("review updates one central task, notification opens the content, role review is traced and another client is unchanged", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const tasks = await prepare(page);
  const before = await readWorkflow(page);
  await page.getByRole("dialog", { name: `Contenido: ${title}`, exact: true }).getByRole("button", { name: "Enviar a revisión interna", exact: true }).click();
  await expect.poll(async () => (await readWorkflow(page)).epsa[0].values.estado).toBe("Revisión interna de producción");
  let saved = await readWorkflow(page);
  expect(saved.workspace.tasks).toHaveLength(2);
  expect(saved.workspace.tasks.find((task: { id: string }) => task.id === tasks[0].id)).toMatchObject({ owner: "Valentina Ríos", status: "En aprobación" });
  expect(saved.workspace.notifications).toHaveLength(1);
  expect(saved.workspace.notifications[0]).toMatchObject({ taskId: tasks[0].id, recipient: "Valentina Ríos", href: `/v2/clientes/epsa/contenido?seccion=piezas&registro=${recordId}` });
  expect(saved.aca).toEqual(before.aca);

  await page.goto("/v2");
  await setRole(page, "Project Manager · Valentina Ríos");
  await page.getByRole("button", { name: /^Notificaciones,/ }).first().click();
  await page.getByRole("dialog", { name: "Notificaciones", exact: true }).getByRole("link", { name: /Revisión interna de producción · QA trazabilidad/ }).click();
  await expect(page.getByRole("dialog", { name: `Contenido: ${title}`, exact: true })).toBeVisible();
  await expect.poll(async () => Boolean((await readWorkflow(page)).workspace.notifications[0].readAt)).toBe(true);
  await page.getByRole("dialog", { name: `Contenido: ${title}`, exact: true }).getByRole("button", { name: "Enviar al cliente", exact: true }).click();
  await expect.poll(async () => (await readWorkflow(page)).epsa[0].values.estado).toBe("Revisión preliminar del cliente");
  saved = await readWorkflow(page);
  expect(saved.workspace.tasks).toHaveLength(2);
  expect(saved.workspace.notifications).toHaveLength(2);
  expect(new Set(saved.workspace.notifications.map((item: { id: string }) => item.id)).size).toBe(2);
  const transitions = JSON.parse(saved.epsa[0].values.contentTransitions);
  expect(transitions).toHaveLength(2);
  expect(transitions[1]).toMatchObject({ actor: "Valentina Ríos", taskId: tasks[0].id, responsible: "Cliente · EPSA / Line Up" });
  expect(saved.aca).toEqual(before.aca);

  await page.goto("/v2/clientes/epsa/tareas");
  await expect(page.getByRole("table", { name: "Tareas de EPSA / Line Up" }).locator(`tr[data-task-id="${tasks[0].id}"]`)).toHaveCount(1);
  await page.reload();
  saved = await readWorkflow(page);
  expect(saved.workspace.tasks).toHaveLength(2);
  expect(saved.workspace.notifications).toHaveLength(2);
  expect(errors).toEqual([]);
});

test("failed batch never advances the content without its central task or notification", async ({ page }) => {
  await prepare(page);
  const before = await readWorkflow(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    let rejected = false;
    Storage.prototype.setItem = function (key, value) {
      if (!rejected && key === "avans-os:preview:v1:workspace") {
        rejected = true;
        throw new DOMException("QA storage full", "QuotaExceededError");
      }
      return original.call(this, key, value);
    };
  });
  const detail = page.getByRole("dialog", { name: `Contenido: ${title}`, exact: true });
  await detail.getByRole("button", { name: "Enviar a revisión interna", exact: true }).click();
  await expect(page.getByText("No se pudo guardar el cambio. Revisá el espacio disponible del navegador y reintentá.", { exact: true })).toBeVisible();
  const after = await readWorkflow(page);
  expect(after).toEqual(before);
  await expect(detail.getByRole("button", { name: "Enviar a revisión interna", exact: true })).toBeVisible();
  await detail.getByRole("button", { name: "Enviar a revisión interna", exact: true }).click();
  await expect.poll(async () => (await readWorkflow(page)).epsa[0].values.estado).toBe("Revisión interna de producción");
  expect((await readWorkflow(page)).workspace.notifications).toHaveLength(1);
});

test("cross-tab state updates settle without repeatedly echoing identical workspace values", async ({ page, context }) => {
  await prepare(page);
  const second = await context.newPage();
  await second.goto(`/v2/clientes/epsa/contenido?seccion=piezas&registro=${recordId}`);
  await expect(second.getByRole("dialog", { name: `Contenido: ${title}`, exact: true })).toBeVisible();
  for (const tab of [page, second]) {
    await tab.evaluate(() => {
      const events: string[] = [];
      Object.assign(window, { workflowStorageEvents: events });
      window.addEventListener("storage", (event) => { if (event.key === "avans-os:preview:v1:workspace") events.push(event.newValue || ""); });
    });
  }
  await page.getByRole("dialog", { name: `Contenido: ${title}`, exact: true }).getByRole("button", { name: "Enviar a revisión interna", exact: true }).click();
  await expect(second.getByRole("dialog", { name: `Contenido: ${title}`, exact: true }).getByRole("button", { name: "Enviar al cliente", exact: true })).toBeVisible();
  // The observation interval catches an effect -> storage -> effect loop; it is not UI readiness polling.
  await page.waitForTimeout(600);
  const counts = await Promise.all([page, second].map((tab) => tab.evaluate(() => (window as unknown as { workflowStorageEvents: string[] }).workflowStorageEvents.length)));
  expect(counts[0]).toBeLessThanOrEqual(2);
  expect(counts[1]).toBeLessThanOrEqual(2);
  expect((await readWorkflow(second)).workspace.notifications).toHaveLength(1);
  await second.close();
});

test("a workflow transition in another tab invalidates an older task undo without losing either task", async ({ page, context }) => {
  const tasks = await prepare(page);
  const second = await context.newPage();
  await second.goto(`/v2/clientes/epsa/contenido?seccion=piezas&registro=${recordId}`);
  const detail = second.getByRole("dialog", { name: `Contenido: ${title}`, exact: true });
  await expect(detail).toBeVisible();
  await page.goto("/v2/clientes/epsa/contenido?seccion=tareas");
  await page.getByRole("button", { name: "Nueva tarea", exact: true }).first().click();
  const create = page.getByRole("dialog", { name: "Nueva tarea", exact: true });
  const manualTitle = "QA tarea manual que debe conservarse";
  await create.getByPlaceholder("Qué hay que hacer").fill(manualTitle);
  await create.getByRole("button", { name: "Crear tarea", exact: true }).click();
  const undo = page.getByRole("button", { name: "Deshacer", exact: true });
  await expect(undo).toBeVisible();
  const before = await readWorkflow(page);
  const manual = before.workspace.tasks.find((task: { title: string }) => task.title === manualTitle);
  expect(manual).toBeDefined();

  await detail.getByRole("button", { name: "Enviar a revisión interna", exact: true }).click();
  // This must disappear on hydration, well before the normal six-second toast expiry.
  await expect(undo).toBeHidden({ timeout: 1000 });
  await expect.poll(async () => (await readWorkflow(page)).epsa[0].values.estado).toBe("Revisión interna de producción");
  const after = await readWorkflow(page);
  expect(after.workspace.tasks).toHaveLength(3);
  expect(after.workspace.tasks.find((task: { id: string }) => task.id === tasks[0].id)).toMatchObject({ owner: "Valentina Ríos", status: "En aprobación", workflow: { stage: "Revisión interna de producción" } });
  expect(after.workspace.tasks.find((task: { id: string }) => task.id === manual.id)).toEqual(manual);
  expect(after.aca).toEqual(before.aca);
  await page.reload();
  expect((await readWorkflow(page)).workspace.tasks).toEqual(after.workspace.tasks);
  await second.close();
});
