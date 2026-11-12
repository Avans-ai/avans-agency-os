import { test, expect, type Page, type Route } from "@playwright/test";

/* Asistente contextual en formularios de creación.
 * Sin proveedor: se usa el servidor real (AI_ASSISTANT_ENABLED no está activo).
 * Con proveedor: las respuestas del endpoint se simulan en el navegador para
 * probar la interfaz; NO prueban una integración real con un proveedor de IA. */

const local = (page: Page, key: string) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(`avans-os:preview:v1:${k}`) || "null")?.value ?? null, key);

async function mockConfigured(page: Page, generate: (route: Route) => Promise<void> | void) {
  await page.route("**/api/assistant/status", (route) => route.fulfill({ json: { configured: true, provider: "anthropic", model: "modelo-de-prueba", reason: "" } }));
  await page.route("**/api/assistant/generate", generate);
}

function externalRequests(page: Page) {
  const hosts: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname) && url.protocol.startsWith("http")) hosts.push(url.hostname);
  });
  return hosts;
}

test("without a provider: no simulated AI, recommendations by origin, manual edits are protected and the draft keeps its trace", async ({ page }) => {
  const external = externalRequests(page);
  let generateCalls = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/assistant/generate")) generateCalls += 1;
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/v2/clientes/aca/campanas?seccion=campanas");
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  const panel = page.getByRole("dialog", { name: "Nueva campaña" });
  const assistant = panel.getByRole("complementary", { name: "Asistente IA · Ideas para esta campaña" });
  await expect(assistant.getByText("Asistente IA pendiente de conexión")).toBeVisible();
  await expect(assistant.getByRole("status")).toHaveText("Proveedor no configurado");
  await expect(assistant.getByRole("button", { name: /Generar ideas|Regenerar/ })).toHaveCount(0);
  await expect(assistant.getByText(/Generada por IA/)).toHaveCount(0);
  await expect(assistant.getByText("Contexto faltante")).toBeVisible();

  const card = assistant.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Separar campañas por segmento" }) });
  await expect(card.getByText("Recomendación de demostración", { exact: true })).toBeVisible();
  await card.getByText("Ver fuentes (1)").click();
  await expect(card.getByText("Recomendación · Separar campañas por segmento")).toBeVisible();
  await card.getByText("Ver fundamento").click();
  await expect(card.getByText(/no fue generada por IA/)).toBeVisible();

  const form = panel.locator("form");
  await form.getByLabel(/^Nombre/).fill("Nombre escrito a mano");
  await card.getByRole("button", { name: "Aplicar sugerencia" }).click();
  const confirm = card.getByRole("alertdialog", { name: "Confirmar reemplazo" });
  await expect(confirm).toContainText("Nombre");
  await confirm.getByRole("button", { name: "Solo completar vacíos" }).click();
  await expect(form.getByLabel(/^Nombre/)).toHaveValue("Nombre escrito a mano");
  await expect(form.getByLabel("Notas")).toHaveValue(/hoy los mensajes compiten entre públicos/);
  await expect(card.getByText("Sugerencia aplicada")).toBeVisible();

  await card.getByRole("button", { name: "Aplicar sugerencia" }).click();
  await card.getByRole("alertdialog").getByRole("button", { name: "Reemplazar" }).click();
  await expect(form.getByLabel(/^Nombre/)).toHaveValue("Separar campañas por segmento");
  await form.getByLabel(/^Nombre/).fill("Separar campañas por segmento · socios");
  await expect(card.getByText("Aplicada · editada")).toBeVisible();

  await form.getByLabel("Objetivo").selectOption("Generación de leads");
  await form.getByLabel("Plataforma").selectOption("Meta Ads");
  await form.getByLabel("Presupuesto del período (ARS)").fill("400000");
  await form.getByLabel(/^Inicio/).fill("2026-12-01");
  await expect(form.getByLabel(/^Estado/)).toHaveValue("Borrador");
  await panel.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(panel).toHaveCount(0);

  const campaigns = await local(page, "client:aca:module:publicidad-digital:campanas");
  const created = campaigns.find((item: { values: { nombre: string } }) => item.values.nombre === "Separar campañas por segmento · socios");
  expect(created.values.estado).toBe("Borrador");
  expect(created.history.map((entry: { text: string }) => entry.text).join(" ")).toContain("con sugerencias: Separar campañas por segmento (Resultados · REC-201)");
  const log = await local(page, "client:aca:assistant:publicidad-digital");
  const used = log.items.find((item: { recommendationId?: string }) => item.recommendationId === "REC-201");
  expect(used).toMatchObject({ origin: "recomendacion", status: "applied", linkedRecordId: created.id, clientSlug: "aca", serviceId: "publicidad-digital", operation: "crear-campana" });
  expect(used.appliedFields).toEqual(expect.arrayContaining(["nombre", "notas"]));
  expect(used.changes.some((change: { field: string; before: string }) => change.field === "nombre" && change.before === "Nombre escrito a mano")).toBe(true);

  await page.reload();
  await expect(page.getByRole("button", { name: "Separar campañas por segmento · socios" })).toBeVisible();
  await page.goto("/v2/clientes/aca/campanas?seccion=recomendaciones");
  await expect(page.getByText(`Usada como punto de partida en ${created.id}`)).toBeVisible();
  await expect(page.getByText("Pendiente de conexión").first()).toBeVisible();
  expect(await local(page, "client:epsa:assistant:publicidad-digital")).toBeNull();
  expect(generateCalls).toBe(0);
  expect(external).toEqual([]);
});

test("an existing similar campaign is flagged with a link that keeps the draft", async ({ page }) => {
  await page.goto("/v2/clientes/epsa/campanas?seccion=campanas");
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Campaña de posventa como diferencial" }) });
  await expect(card.getByText("Esta idea es similar a una iniciativa existente.")).toBeVisible();
  const link = card.getByRole("link", { name: /Abrir/ });
  await expect(link).toHaveAttribute("href", /campana=CMP-EPSA-03/);
  await expect(link).toHaveAttribute("target", "_blank");
});

test("with a provider (simulated response): generate, cite sources, apply selected fields, edit and save with model trace", async ({ page }) => {
  let body: Record<string, unknown> | null = null;
  await mockConfigured(page, async (route) => {
    body = route.request().postDataJSON();
    const sources = (body!.sources as { ref: string; kind: string }[]);
    const ref = sources.find((source) => source.kind === "icp" || source.kind === "segmento")?.ref ?? sources[0].ref;
    await route.fulfill({
      json: {
        provider: "anthropic",
        model: "modelo-de-prueba",
        generatedAt: new Date().toISOString(),
        missingContext: ["No hay resultados históricos cargados para Publicidad digital."],
        suggestions: [
          { id: "SUG-QA-1", type: "Concepto de campaña", title: "Compras sin frenos", description: "Leads de responsables de compras industriales.", rationale: "El ICP prioriza tiempos de entrega.", proposedFields: { nombre: "Compras sin frenos", objetivo: "Generación de leads", plataforma: "LinkedIn Ads", mensaje: "Entregas en plazo para no parar la planta" }, sourceReferences: [ref], warnings: [], similarTo: [] },
        ],
      },
    });
  });
  await page.goto("/v2/clientes/epsa/campanas?seccion=campanas");
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  const panel = page.getByRole("dialog", { name: "Nueva campaña" });
  const assistant = panel.getByRole("complementary");
  await assistant.getByLabel("¿Qué buscás? (opcional)").fill("Leads para Line Up");
  await assistant.getByRole("button", { name: "Generar ideas" }).click();
  await expect(assistant.getByText("Generada por IA · modelo-de-prueba")).toBeVisible();
  await expect(assistant.getByRole("status")).toHaveText("Sugerencia disponible");
  await expect(assistant.getByText("No hay resultados históricos cargados")).toBeVisible();
  expect(body!.clientSlug).toBe("epsa");
  expect(body!.brief).toBe("Leads para Line Up");
  expect((body!.sources as { clientSlug: string }[]).every((source) => source.clientSlug === "epsa")).toBe(true);
  expect(JSON.stringify(body)).not.toMatch(/api[_-]?key|sk-/i);

  const card = assistant.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Compras sin frenos" }) });
  await card.getByText(/^Ver fuentes/).click();
  await expect(card.locator("li").first()).toContainText(/ICP|Segmento/);
  await card.getByRole("checkbox", { name: /Mensaje principal/ }).uncheck();
  await card.getByRole("button", { name: "Aplicar campos seleccionados" }).click();
  const form = panel.locator("form");
  await expect(form.getByLabel(/^Nombre/)).toHaveValue("Compras sin frenos");
  await expect(form.getByLabel("Plataforma")).toHaveValue("LinkedIn Ads");
  await expect(form.getByLabel("Mensaje principal")).toHaveValue("");
  await expect(card.getByText("Sugerencia aplicada")).toBeVisible();
  await expect(assistant.getByRole("button", { name: "Regenerar propuestas" })).toBeVisible();

  await form.getByLabel("Audiencia").fill("Compras · editado a mano");
  await form.getByLabel("Presupuesto del período (ARS)").fill("300000");
  await form.getByLabel(/^Inicio/).fill("2026-12-02");
  await panel.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(panel).toHaveCount(0);
  const campaigns = await local(page, "client:epsa:module:publicidad-digital:campanas");
  const created = campaigns.find((item: { values: { nombre: string } }) => item.values.nombre === "Compras sin frenos");
  expect(created.values).toMatchObject({ estado: "Borrador", audiencia: "Compras · editado a mano", mensaje: "" });
  expect(created.history.map((entry: { text: string }) => entry.text).join(" ")).toContain("Compras sin frenos (IA · modelo-de-prueba)");
  const log = await local(page, "client:epsa:assistant:publicidad-digital");
  expect(log.items.find((item: { id: string }) => item.id === "SUG-QA-1")).toMatchObject({ origin: "ia", provider: "anthropic", model: "modelo-de-prueba", status: "applied", linkedRecordId: created.id, appliedFields: ["nombre", "objetivo", "plataforma"] });
});

test("provider errors and unconfigured generation never block the form", async ({ page }) => {
  let calls = 0;
  await mockConfigured(page, (route) => {
    calls += 1;
    return calls === 1
      ? route.fulfill({ status: 502, json: { error: "PROVIDER_ERROR", message: "El proveedor respondió 500." } })
      : route.fulfill({ status: 503, json: { error: "AI_NOT_CONFIGURED", configured: false } });
  });
  await page.goto("/v2/clientes/aca/campanas?seccion=campanas");
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  const panel = page.getByRole("dialog", { name: "Nueva campaña" });
  const assistant = panel.getByRole("complementary");
  await assistant.getByRole("button", { name: "Generar ideas" }).click();
  await expect(assistant.getByRole("alert")).toContainText("El asistente no pudo responder. El proveedor respondió 500.");
  await expect(assistant.getByRole("status")).toHaveText("Error");
  await assistant.getByRole("button", { name: "Reintentar" }).click();
  await expect(assistant.getByText("Asistente IA pendiente de conexión")).toBeVisible();
  const form = panel.locator("form");
  await form.getByLabel(/^Nombre/).fill("Campaña manual sin IA");
  await form.getByLabel("Objetivo").selectOption("Tráfico");
  await form.getByLabel("Plataforma").selectOption("Google Ads");
  await form.getByLabel("Presupuesto del período (ARS)").fill("100000");
  await form.getByLabel(/^Inicio/).fill("2026-12-03");
  await panel.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Campaña manual sin IA" })).toBeVisible();
});

for (const flow of [
  { name: "content piece", url: "/v2/clientes/aca/contenido?seccion=piezas", button: "Nueva pieza", title: "Asistente IA · Ideas para este contenido", rec: "Convertir preguntas frecuentes en piezas", titleLabel: /^Pieza/, fill: async (form: ReturnType<Page["locator"]>) => { await form.getByLabel(/^Formato/).selectOption("Carrusel"); await form.getByLabel(/^Canal/).selectOption("Instagram"); await form.getByLabel(/^Fecha de publicación/).fill("2026-12-04"); }, key: "client:aca:module:contenidos:piezas", field: "titulo" },
  { name: "audiovisual production", url: "/v2/clientes/edinovo/audiovisuales?seccion=producciones", button: "Nueva producción", title: "Asistente IA · Ideas para esta producción", rec: "Cerrar guiones antes de reprogramar rodaje", titleLabel: /^Producción/, fill: async (form: ReturnType<Page["locator"]>) => { await form.getByLabel(/^Formato/).selectOption("Cápsula"); }, key: "client:edinovo:module:audiovisuales:producciones", field: "titulo" },
  { name: "strategic initiative", url: "/v2/clientes/epsa/estrategia?seccion=planificacion", button: "Nueva iniciativa", title: "Asistente IA · Ideas para esta iniciativa", rec: "Alinear aprobaciones del comité antes del lanzamiento", titleLabel: /^Iniciativa/, fill: async (form: ReturnType<Page["locator"]>) => { await form.getByLabel(/^Horizonte/).selectOption("Este mes"); }, key: "client:epsa:module:estrategia:prioridades", field: "iniciativa" },
  { name: "web project", url: "/v2/clientes/grupo-portland/desarrollo-web?seccion=proyectos", button: "Nuevo proyecto web", title: "Asistente IA · Ideas para este proyecto web", rec: "Publicar staging con contenido marcado", titleLabel: /^Proyecto/, fill: async (form: ReturnType<Page["locator"]>) => { await form.getByLabel(/^Tipo/).selectOption("Landing"); }, key: "client:grupo-portland:module:desarrollo-web:proyectos", field: "nombre" },
]) {
  test(`assisted ${flow.name}: specialised assistant, recommendation as a starting point, saved with its link`, async ({ page }) => {
    await page.goto(flow.url);
    await page.getByRole("button", { name: flow.button }).first().click();
    const panel = page.getByRole("dialog", { name: flow.button });
    const assistant = panel.getByRole("complementary", { name: flow.title });
    await expect(assistant.getByText("Asistente IA pendiente de conexión")).toBeVisible();
    const card = assistant.getByRole("listitem").filter({ has: page.getByRole("heading", { name: flow.rec }) });
    await card.getByRole("button", { name: "Aplicar sugerencia" }).click();
    const form = panel.locator("form");
    await expect(form.getByLabel(flow.titleLabel).first()).toHaveValue(flow.rec);
    await flow.fill(form);
    await panel.getByRole("button", { name: /^Guardar/ }).click();
    await expect(panel).toHaveCount(0);
    const records = await local(page, flow.key);
    const created = records.find((record: { values: Record<string, string> }) => record.values[flow.field] === flow.rec);
    expect(created.source).toBe("manual");
    expect(created.history.map((entry: { text: string }) => entry.text).join(" ")).toContain("con sugerencias");
  });
}

test("Diseño de marca gets its own assistant once the module is active; modules without an AI process get none", async ({ page }) => {
  await page.goto("/v2/clientes/aca?view=plan");
  await page.getByRole("button", { name: "Gestionar módulos", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const item = dialog.locator("li").filter({ has: page.getByText("Diseño de marca", { exact: true }) }).first();
  await item.getByRole("checkbox").first().check();
  await item.getByRole("button", { name: "Demostración", exact: true }).click();
  await dialog.getByRole("button", { name: /^Guardar \d+ cambio/ }).click();
  await page.goto("/v2/clientes/aca/diseno-marca?seccion=trabajos");
  await page.getByRole("button", { name: "Nueva pieza de marca" }).first().click();
  const panel = page.getByRole("dialog", { name: "Nueva pieza de marca" });
  await expect(panel.getByRole("complementary", { name: "Asistente IA · Ideas para esta pieza" })).toBeVisible();
  for (const label of ["Concepto visual", "Lineamientos de marca", "Recursos disponibles", "Consideraciones de diseño"]) await expect(panel.locator("form").getByLabel(label)).toBeVisible();
  await panel.getByRole("button", { name: "Cancelar" }).click();

  await page.goto("/v2/clientes/lider-energy/crm?seccion=trabajos");
  await page.getByRole("button", { name: /^Nueva implementación/ }).first().click();
  await expect(page.getByRole("dialog").getByRole("complementary")).toHaveCount(0);
});

test("mobile: the assistant is a collapsible section above the form without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/v2/clientes/aca/campanas?seccion=campanas");
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  const panel = page.getByRole("dialog", { name: "Nueva campaña" });
  const summary = panel.locator("summary", { hasText: "Asistente IA · Ideas para esta campaña" });
  await expect(summary).toBeVisible();
  await expect(panel.getByText("Asistente IA pendiente de conexión")).toBeHidden();
  const summaryBox = await summary.boundingBox();
  const nameBox = await panel.locator("form").getByLabel(/^Nombre/).boundingBox();
  expect(summaryBox!.y).toBeLessThan(nameBox!.y);
  await summary.click();
  await expect(panel.getByText("Asistente IA pendiente de conexión")).toBeVisible();
  const overflow = await page.evaluate(() => {
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    return [document.documentElement.scrollWidth - document.documentElement.clientWidth, dialog.scrollWidth - dialog.clientWidth];
  });
  expect(overflow).toEqual([0, 0]);
  await expect(panel.getByRole("button", { name: "Guardar borrador" })).toBeVisible();
});
