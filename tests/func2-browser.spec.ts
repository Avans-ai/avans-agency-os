import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { osClients } from "../app/v2/os/os-data";
import type { ModuleRecord } from "../app/v2/os/modules/types";
import { buildContentTask } from "../app/v2/os/workflow-tasks";
import { dueSortKey } from "../app/v2/os/procedures-periodic";

test.use({ actionTimeout: 15000 });
const KEY = "avans-os:preview:v1:";

function errorsOf(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}
async function setRole(page: Page, label: string) {
  await page.getByRole("button", { name: /^Perfil:/ }).click();
  await page.getByRole("group", { name: "Rol simulado" }).getByRole("button", { name: label, exact: true }).click();
  await page.getByRole("button", { name: /^Perfil:/ }).click();
}
async function workspace(page: Page) {
  return page.evaluate((prefix) => JSON.parse(localStorage.getItem(`${prefix}workspace`) || "null")?.value, KEY);
}
async function noOverflow(page: Page) {
  for (const width of [1440, 1280, 820, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `overflow at ${width}`).toBe(true);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

test("tasks: grouped by person by default, by module, list sorted by priority or due date; choice remembered per viewer", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto("/v2/clientes/epsa/tareas");
  const views = page.getByRole("group", { name: "Ver tareas" });
  await expect(views.getByRole("button", { name: "Por rol / persona" })).toHaveAttribute("aria-pressed", "true");
  const byPerson = page.getByRole("list", { name: "Tareas de EPSA / Line Up por rol y persona" });
  const lucia = byPerson.getByRole("listitem", { name: /^Lucía Benítez · \d+ abiertas/ });
  await expect(lucia).toContainText("Contenidos");
  await expect(lucia.locator('[data-task-id="T-144"]')).toHaveCount(1);
  await expect(byPerson.getByRole("listitem", { name: /^Martín Ledesma/ }).locator('[data-task-id="T-143"]')).toHaveCount(1);

  await views.getByRole("button", { name: "Por módulo" }).click();
  const byModule = page.getByRole("list", { name: "Tareas de EPSA / Line Up por módulo" });
  await expect(byModule.getByRole("listitem", { name: /^Contenidos · / }).locator('[data-task-id="T-144"]')).toHaveCount(1);
  await expect(byModule.getByRole("listitem", { name: /^Publicidad digital · / }).locator('[data-task-id="T-143"]')).toHaveCount(1);
  await expect(byModule.getByRole("link", { name: "Abrir Kanban de Contenidos" })).toHaveAttribute("href", /\/v2\/clientes\/epsa\/contenido\?seccion=tareas/);
  await page.reload();
  await expect(page.getByRole("group", { name: "Ver tareas" }).getByRole("button", { name: "Por módulo" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("group", { name: "Ver tareas" }).getByRole("button", { name: "Lista", exact: true }).click();
  const table = page.getByRole("table", { name: "Tareas de EPSA / Line Up" });
  const store = await workspace(page);
  const byId = new Map<string, { prio: string; due: string; status: string }>(store.tasks.map((task: { id: string; prio: string; due: string; status: string }) => [task.id, task]));
  const order = async () => (await table.locator("tbody tr").evaluateAll((rows) => rows.map((row) => row.getAttribute("data-task-id")!))).map((id) => byId.get(id)!);
  const rank = { Alta: 0, Media: 1, Baja: 2 } as Record<string, number>;
  const byPrio = (await order()).filter((task) => task.status !== "Hecho").map((task) => rank[task.prio]);
  expect(byPrio).toEqual([...byPrio].sort((a, b) => a - b));
  await page.getByLabel("Ordenar por").selectOption("fecha");
  await expect.poll(async () => { const due = (await order()).filter((task) => task.status !== "Hecho").map((task) => dueSortKey(task.due)); return due.join() === [...due].sort().join(); }).toBe(true);
  await page.reload();
  await expect(page.getByLabel("Ordenar por")).toHaveValue("fecha");

  // Otro perfil (vista simulada) tiene su propia elección: arranca agrupado por persona.
  await setRole(page, "Content Manager");
  await expect(page.getByRole("group", { name: "Ver tareas" }).getByRole("button", { name: "Por rol / persona" })).toHaveAttribute("aria-pressed", "true");
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("periodic procedures generate one task per period, idempotent, with assignment notice and client isolation", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto("/v2/clientes/epsa/tareas");
  const panel = page.getByRole("region", { name: "Procedimientos periódicos" });
  await expect(panel).toContainText("Procedimientos de demostración");
  await expect(panel.getByText("Pendiente de generar")).toHaveCount(6);
  await panel.getByRole("button", { name: "Generar tareas periódicas" }).click();
  await expect(panel.getByRole("link", { name: "Tarea generada" })).toHaveCount(6);
  const first = await workspace(page);
  const generated = first.tasks.filter((task: { id: string }) => task.id.startsWith("PROC-epsa-"));
  expect(generated).toHaveLength(6);
  expect(first.notifications.filter((item: { kind: string; taskId: string }) => item.kind === "assignment" && item.taskId.startsWith("PROC-epsa-"))).toHaveLength(6);
  await expect(page.locator(`[data-task-id="${generated[0].id}"]`)).toHaveCount(1);
  await expect(page.getByText("Procedimiento periódico").first()).toBeVisible();

  await panel.getByRole("button", { name: "Generar tareas periódicas" }).click();
  await page.reload();
  await page.getByRole("region", { name: "Procedimientos periódicos" }).getByRole("button", { name: "Generar tareas periódicas" }).click();
  const second = await workspace(page);
  expect(second.tasks.filter((task: { id: string }) => task.id.startsWith("PROC-epsa-"))).toHaveLength(6);
  expect(second.notifications).toHaveLength(first.notifications.length);

  await page.goto("/v2/clientes/aca/tareas");
  await expect(page.locator('[data-task-id^="PROC-epsa-"]')).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Procedimientos periódicos" }).getByText("Pendiente de generar")).toHaveCount(4);

  // Un rol sin gestión de la cuenta no genera tareas.
  await setRole(page, "Diseñador");
  await expect(page.getByRole("button", { name: "Generar tareas periódicas" })).toBeDisabled();
  expect(errors).toEqual([]);
});

test("Plan de contenidos is a read-only consultation of the Plan with previous notes preserved and proposable", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto("/v2");
  await expect.poll(async () => Boolean(await workspace(page))).toBe(true);
  const notes = { values: { tono: "Cercano QA y sin tecnicismos", donts: "Prometer descuentos QA", procedures: "Procedimiento QA conservado" }, history: [{ at: "2026-11-01T12:00:00.000Z", actor: "Lucía Benítez", text: "Actualizó los lineamientos editoriales" }] };
  await page.evaluate(({ prefix, notes }) => localStorage.setItem(`${prefix}client:epsa:service-guidelines:contenidos`, JSON.stringify({ version: 1, value: notes, savedAt: "2026-11-01T12:00:00.000Z" })), { prefix: KEY, notes });
  await page.goto("/v2/clientes/epsa/contenido?area=lineamientos");
  const plan = page.getByRole("region", { name: "Plan de contenidos" });
  await expect(plan).toContainText("Vista de consulta");
  await expect(plan.getByRole("link", { name: "Editar en el Plan de Marketing" })).toHaveAttribute("href", "/v2/clientes/epsa?view=plan#plan-contenidos");
  await expect(page.getByRole("button", { name: "Editar lineamientos" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Do's & don'ts de Contenidos" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Glosario de marca" })).toBeVisible();
  const previous = page.getByRole("region", { name: "Notas operativas anteriores" });
  await expect(previous).toContainText("Cercano QA y sin tecnicismos");
  await expect(previous).toContainText("Prometer descuentos QA");
  await expect(previous.getByRole("textbox")).toHaveCount(0);

  await previous.getByRole("button", { name: "Proponer al Plan de Marketing" }).click();
  await expect(previous.getByRole("link", { name: "Ver en Documentos" })).toBeVisible();
  const saved = await page.evaluate((prefix) => ({
    notes: JSON.parse(localStorage.getItem(`${prefix}client:epsa:service-guidelines:contenidos`)!).value,
    knowledge: JSON.parse(localStorage.getItem(`${prefix}client:epsa:knowledge:v1`)!).value,
  }), KEY);
  expect(saved.notes).toEqual(notes);
  expect(saved.knowledge.sources.filter((source: { title: string }) => source.title === "Notas operativas anteriores · Contenidos")).toHaveLength(1);
  await page.goto("/v2/clientes/epsa?view=documentos");
  await expect(page.getByRole("region", { name: "Historial de documentos cargados" })).toContainText("Notas operativas anteriores · Contenidos");

  // ACA no ve las notas de EPSA: muestra su referencia de demostración rotulada.
  await page.goto("/v2/clientes/aca/contenido?area=lineamientos");
  await expect(page.getByText("Cercano QA y sin tecnicismos")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Lineamientos de demostración anteriores" })).toBeVisible();
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("glossary check warns citing the source before saving a draft and before sending to PM review; override is recorded", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto("/v2/clientes/epsa?view=ficha&ficha=glosario");
  await page.getByRole("button", { name: "Editar glosario", exact: true }).click();
  const glossary = page.getByRole("dialog", { name: "Editar glosario de marca" });
  await glossary.getByLabel("Palabras que usamos").fill("confianza");
  await glossary.getByLabel("Palabras que evitamos").fill("barato");
  await glossary.getByRole("button", { name: "Guardar glosario" }).click();
  await expect(glossary).toHaveCount(0);

  await page.goto("/v2/clientes/epsa/contenido?seccion=piezas");
  await page.getByRole("button", { name: "Nuevo contenido", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Nuevo contenido", exact: true });
  await modal.getByLabel("Título", { exact: false }).fill("QA Lineamientos glosario");
  await modal.getByLabel("Copy preliminar").fill("Un servicio Barato y rápido para tu planta.");
  await modal.getByRole("button", { name: "Guardar borrador", exact: true }).click();
  const review = modal.getByRole("region", { name: "Revisión de lineamientos" });
  await expect(review).toContainText("Estás usando «barato», que el cliente pidió evitar · Glosario de la Ficha");
  await expect(review).toContainText("«confianza»");
  await expect(review.getByRole("button", { name: "Ajustar con IA" })).toBeDisabled();
  await expect(review).toContainText("pendiente de conexión");
  await review.getByRole("button", { name: "Ajustar a mano" }).click();
  await expect(review).toHaveCount(0);
  await expect(modal.getByLabel("Copy preliminar")).toBeFocused();
  await modal.getByRole("button", { name: "Guardar borrador", exact: true }).click();
  await modal.getByRole("region", { name: "Revisión de lineamientos" }).getByRole("button", { name: "Guardar igual" }).click();
  const detail = page.getByRole("dialog", { name: "Contenido: QA Lineamientos glosario", exact: true });
  await expect(detail).toBeVisible();
  await detail.getByRole("button", { name: "Historial", exact: true }).click();
  await expect(detail.getByText("Advertencias de lineamientos · Enviado igual")).toBeVisible();
  const draft = await page.evaluate((prefix) => JSON.parse(localStorage.getItem(`${prefix}client:epsa:module:contenidos:piezas`)!).value.find((item: { values: { titulo: string } }) => item.values.titulo === "QA Lineamientos glosario"), KEY);
  expect(draft.values.__guidelineOverride).toBeUndefined();
  expect(JSON.parse(draft.values.guidelineChecks)).toMatchObject([{ stage: "Guardar borrador", decision: "Enviado igual", warnings: [{ term: "barato", source: "glossary" }] }]);

  // Envío a revisión del PM: un borrador completo con la palabra a evitar.
  const at = "2026-11-20T12:00:00.000Z";
  const epsa = osClients.find((client) => client.slug === "epsa")!;
  const record: ModuleRecord = { id: "QA-GUIDE-SUBMIT", client: "epsa", module: "contenidos", collection: "piezas", source: "manual", user: "QA", createdAt: at, updatedAt: at, history: [], values: { titulo: "QA Envío con glosario", estado: "Borrador", eje: "QA-EJE", idea: "Explicar el servicio", bajada: "Cómo funciona", copy: "La opción más barata del mercado", canal: "LinkedIn", formato: "Carrusel", fecha: "2099-12-03", responsable: "Lucía Benítez", revisor: "Valentina Ríos" } };
  const task = buildContentTask(epsa, record, [], "QA", at);
  await page.evaluate(({ prefix, record, task }) => {
    const pieces = JSON.parse(localStorage.getItem(`${prefix}client:epsa:module:contenidos:piezas`)!);
    pieces.value = [record, ...pieces.value];
    localStorage.setItem(`${prefix}client:epsa:module:contenidos:piezas`, JSON.stringify(pieces));
    const store = JSON.parse(localStorage.getItem(`${prefix}workspace`)!);
    store.value.tasks = [...store.value.tasks, task];
    localStorage.setItem(`${prefix}workspace`, JSON.stringify(store));
  }, { prefix: KEY, record, task });
  // «barata» no es «barato»: la comparación es por término exacto. Se agrega un don't con frase citada.
  await page.goto("/v2/clientes/epsa/contenido?seccion=piezas&registro=QA-GUIDE-SUBMIT");
  const submitDetail = page.getByRole("dialog", { name: "Contenido: QA Envío con glosario", exact: true });
  await submitDetail.getByRole("button", { name: "Enviar a revisión interna", exact: true }).click();
  await expect.poll(() => page.evaluate((prefix) => JSON.parse(localStorage.getItem(`${prefix}client:epsa:module:contenidos:piezas`)!).value.find((item: { id: string }) => item.id === "QA-GUIDE-SUBMIT").values.estado, KEY)).toBe("Revisión interna de producción");

  await page.evaluate(({ prefix, record }) => {
    const pieces = JSON.parse(localStorage.getItem(`${prefix}client:epsa:module:contenidos:piezas`)!);
    pieces.value = [{ ...record, id: "QA-GUIDE-SUBMIT-2", values: { ...record.values, titulo: "QA Envío barato", copy: "Precio barato garantizado" } }, ...pieces.value];
    localStorage.setItem(`${prefix}client:epsa:module:contenidos:piezas`, JSON.stringify(pieces));
  }, { prefix: KEY, record });
  await page.goto("/v2/clientes/epsa/contenido?seccion=piezas&registro=QA-GUIDE-SUBMIT-2");
  const second = page.getByRole("dialog", { name: "Contenido: QA Envío barato", exact: true });
  await second.getByRole("button", { name: "Enviar a revisión interna", exact: true }).click();
  const submitReview = second.getByRole("region", { name: "Revisión de lineamientos" });
  await expect(submitReview).toContainText("Estás usando «barato», que el cliente pidió evitar · Glosario de la Ficha");
  await expect(submitReview).toContainText("En título");
  await submitReview.getByRole("button", { name: "Enviar igual" }).click();
  await expect.poll(() => page.evaluate((prefix) => JSON.parse(localStorage.getItem(`${prefix}client:epsa:module:contenidos:piezas`)!).value.find((item: { id: string }) => item.id === "QA-GUIDE-SUBMIT-2").values.estado, KEY)).toBe("Revisión interna de producción");
  const sent = await page.evaluate((prefix) => JSON.parse(localStorage.getItem(`${prefix}client:epsa:module:contenidos:piezas`)!).value.find((item: { id: string }) => item.id === "QA-GUIDE-SUBMIT-2"), KEY);
  const checks = JSON.parse(sent.values.guidelineChecks);
  expect(checks).toHaveLength(1);
  expect(checks[0].stage).toContain("Enviar a revisión");
  expect(checks[0].warnings.map((item: { field: string }) => item.field).sort()).toEqual(["Copy", "Título"]);
  expect(sent.history[0].text).toContain("con advertencias de lineamientos");

  // Aislamiento: el glosario de EPSA no se aplica en ACA.
  await page.goto("/v2/clientes/aca/contenido?area=lineamientos");
  await expect(page.getByRole("region", { name: "Glosario de marca" })).not.toContainText("barato");
  expect(errors).toEqual([]);
});

test("report review per part by responsible → export only when all reviewed → download → email draft", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto("/v2/clientes/epsa?view=reportes");
  const review = page.getByRole("region", { name: "Circuito de revisión · Reporte semanal operativo" });
  await expect(review).toContainText("0/3");
  await expect(review.getByRole("button", { name: "Exportar" })).toBeDisabled();
  await expect(review.getByRole("button", { name: "Preparar envío por mail" })).toBeDisabled();
  await expect(review).toContainText("Borradores con IA: pendientes de conexión");

  await setRole(page, "Content Manager");
  await expect(review.getByRole("button", { name: /^Marcar revisada/ })).toHaveCount(1);
  await review.getByLabel("Comentario sobre Contenidos").fill("Alcance y piezas revisados");
  await review.getByRole("button", { name: "Marcar revisada: Contenidos" }).click();
  await expect(review.getByRole("article", { name: "Parte Contenidos" })).toContainText("Revisada");
  await expect(review.getByRole("article", { name: "Parte Contenidos" })).toContainText("«Alcance y piezas revisados»");

  await setRole(page, "Líder técnico");
  await review.getByRole("button", { name: "Pedir ajustes: Publicidad digital" }).click();
  await expect(review.getByRole("article", { name: "Parte Publicidad digital" })).toContainText("Pendiente");
  await review.getByLabel("Comentario sobre Publicidad digital").fill("Falta el CPL de la semana");
  await review.getByRole("button", { name: "Pedir ajustes: Publicidad digital" }).click();
  await expect(review.getByRole("article", { name: "Parte Publicidad digital" })).toContainText("Requiere ajustes");
  await review.getByRole("button", { name: "Marcar revisada: Publicidad digital" }).click();
  await expect(review).toContainText("2/3");

  await setRole(page, "Project Manager · Valentina Ríos");
  await expect(review.getByRole("button", { name: "Exportar" })).toBeDisabled();
  await review.getByRole("button", { name: "Marcar revisada: Resumen y Estrategia" }).click();
  await expect(review).toContainText("3/3");
  await expect(review).toContainText("Listo para exportar");
  const [download] = await Promise.all([page.waitForEvent("download"), review.getByRole("button", { name: "Exportar" }).click()]);
  expect(download.suggestedFilename()).toBe("reporte-semanal-epsa-semana-45-2-al-8-de-noviembre-de-2026.html");
  const html = readFileSync((await download.path())!, "utf8");
  expect(html).toContain("Reporte semanal operativo");
  expect(html).toContain("Revisada por Martín Ledesma");
  expect(html).toContain("Alcance y piezas revisados");

  await review.getByRole("button", { name: "Preparar envío por mail" }).click();
  const email = review.getByRole("region", { name: "Borrador del mail al cliente" });
  await expect(email).toContainText("Gmail / SMTP no conectado");
  await expect(email).toContainText("Carolina Méndez");
  await expect(email).toContainText("Reporte semanal operativo · EPSA / Line Up");
  await expect(email.getByLabel("Cuerpo del mail")).toHaveValue(/Hola Carolina:/);

  const stored = await page.evaluate((prefix) => JSON.parse(localStorage.getItem(`${prefix}client:epsa:report-reviews`)!).value, KEY);
  const record = stored.reports["semanal:Semana 45 · 2 al 8 de noviembre de 2026"];
  expect(Object.values(record.parts).map((part) => (part as { status: string }).status)).toEqual(["Revisada", "Revisada", "Revisada"]);
  expect(record.exportedBy).toBe("Valentina Ríos");
  expect(record.emailPreparedBy).toBe("Valentina Ríos");
  expect(record.history.length).toBeGreaterThanOrEqual(6);

  await page.reload();
  await expect(page.getByRole("region", { name: "Circuito de revisión · Reporte semanal operativo" })).toContainText("3/3");
  await page.getByRole("group", { name: "Elegir reporte" }).getByRole("button", { name: /Mensual de resultados/ }).click();
  await expect(page.getByRole("region", { name: "Circuito de revisión · Reporte mensual de resultados" })).toContainText("0/3");
  await noOverflow(page);
  // Aislamiento: ACA tiene su propio circuito.
  await page.goto("/v2/clientes/aca?view=reportes");
  await expect(page.getByRole("region", { name: "Circuito de revisión · Reporte semanal operativo" })).toContainText("0/3");
  expect(errors).toEqual([]);
});

test("documents: only the PM uploads; other roles see read-only history with an explanation", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto("/v2/clientes/epsa?view=documentos");
  await expect(page.getByRole("button", { name: "Agregar fuente" })).toBeEnabled();
  await expect(page.getByRole("note", { name: "Permisos de carga" })).toHaveCount(0);
  const history = page.getByRole("region", { name: "Historial de documentos cargados" });
  await expect(history).toBeVisible();
  await expect(history.getByRole("listitem").first()).toBeVisible();

  for (const role of ["Content Manager", "Líder técnico", "Diseñador"]) {
    await setRole(page, role);
    await expect(page.getByRole("button", { name: "Agregar fuente" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Importar nota manual" })).toBeDisabled();
    await expect(page.getByRole("note", { name: "Permisos de carga" })).toContainText("Solo el PM de la cuenta puede cargar documentos.");
    await expect(history).toBeVisible();
  }
  await setRole(page, "Project Manager · Valentina Ríos");
  await expect(page.getByRole("button", { name: "Agregar fuente" })).toBeEnabled();
  await expect(page.getByRole("note", { name: "Permisos de carga" })).toHaveCount(0);
  // El PM de EPSA no es PM de ACA: solo consulta.
  await page.goto("/v2/clientes/aca?view=documentos");
  await expect(page.getByRole("button", { name: "Agregar fuente" })).toBeDisabled();
  await noOverflow(page);
  expect(errors).toEqual([]);
});
