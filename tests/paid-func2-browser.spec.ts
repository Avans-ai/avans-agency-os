import { test, expect, type Page } from "@playwright/test";
import { expectChain, openOf, type ChainTask } from "./task-chain-helpers";

/* Publicidad digital · Funcionalidades 2. Persistencia local de la preview y roles visuales:
 * el rol se cambia en localStorage (no hay permisos de servidor). Métricas DE DEMOSTRACIÓN. */
test.use({ actionTimeout: 15000 });
const KEY = "avans-os:preview:v1";
const local = (page: Page, key: string) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null")?.value ?? null, `${KEY}:${key}`);
const errorsOf = (page: Page) => { const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message)); return errors; };
async function asRole(page: Page, role: string, path: string) {
  if (!(await page.evaluate((k) => !!localStorage.getItem(`${k}:workspace`), KEY).catch(() => false))) {
    await page.goto("/v2/clientes/epsa");
    await page.waitForFunction((k) => !!localStorage.getItem(`${k}:workspace`), KEY);
  }
  await page.evaluate(({ k, role }) => { const raw = JSON.parse(localStorage.getItem(`${k}:workspace`)!); raw.value.role = role; localStorage.setItem(`${k}:workspace`, JSON.stringify(raw)); }, { k: KEY, role });
  await page.goto(path);
}
async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
type Task = ChainTask & { serviceId: string };
type Note = { recipient: string; taskId: string; title: string; href: string };

test("inicio: alerts, weekly semáforos, monthly budget, spend by channel, platforms not connected, open campaigns", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto("/v2/clientes/epsa/campanas");
  const nav = page.getByRole("navigation", { name: "Secciones de Publicidad digital" });
  for (const label of ["Inicio", "Plan de medios", "Campañas", "Anuncios y piezas", "Tareas", "Optimización", "Resultados"]) await expect(nav.getByRole("link", { name: new RegExp(`^${label}`) })).toBeVisible();
  await expect(page.getByText("Datos de demostración", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/los roles son visuales/).first()).toBeVisible();
  const lights = page.getByRole("region", { name: "Semáforos de KPIs semanales" });
  for (const label of ["Leads de la semana", "Costo por lead", "CTR", "Conversiones"]) await expect(lights.getByText(label, { exact: true })).toBeVisible();
  await expect(lights.getByText("Fuera de objetivo")).toBeVisible();
  await expect(page.getByRole("list", { name: "Alertas de Publicidad digital" })).toContainText("planificación esperando validación del PM");
  await expect(page.getByRole("list", { name: "Presupuesto vs. gasto por campaña" })).toContainText("Line Up · Generación de demanda");
  await expect(page.getByText(/Ritmo \d+ % del esperado/)).toBeVisible();
  await expect(page.getByRole("list", { name: "Gasto por canal" })).toContainText("LinkedIn Ads");
  const platforms = page.getByRole("list", { name: "Plataformas de pauta" });
  for (const name of ["Meta Ads", "Google Ads", "TikTok Ads", "ChatGPT Ads"]) await expect(platforms.getByRole("listitem").filter({ hasText: name })).toContainText("No conectada");
  await expect(page.getByRole("article", { name: "Campaña Posventa como diferencial" })).toContainText("Plan: En validación del PM");
  // Plan de medios: honest empty state for the Plan de Marketing block, per-campaign plans below.
  await nav.getByRole("link", { name: /^Plan de medios/ }).click();
  await expect(page.getByText(/todavía no tiene cargado el bloque de Publicidad digital/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Abrir Plan de Marketing" })).toHaveAttribute("href", /view=plan#plan-publicidad-digital/);
  await expect(page.getByText("Responsables de compras · Dirección comercial · Empresas").first()).toBeVisible();
  await page.getByText("Posventa como diferencial", { exact: true }).click();
  await expect(page.getByText("Servicios posventa", { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("instancia 1 → PM → instancia 2 → full ad flow with one task, one design request, client approval and circulation", async ({ page }) => {
  const errors = errorsOf(page);
  // Instancia 1: Líder técnico, paso a paso con selectores del Discovery.
  await asRole(page, "technical", "/v2/clientes/epsa/campanas?seccion=campanas");
  await page.getByRole("button", { name: "Nueva campaña", exact: true }).click();
  const wizard = page.getByRole("dialog", { name: "Nueva campaña · Instancia 1" });
  await wizard.getByRole("button", { name: "Siguiente" }).click();
  await expect(wizard.getByRole("alert")).toContainText("Completá el nombre de la campaña.");
  await wizard.getByLabel("Nombre de la campaña").fill("QA Repuestos express");
  await wizard.getByLabel("Objetivo").selectOption("Generación de leads");
  await wizard.getByLabel("Inicio").fill("2026-12-01");
  await wizard.getByRole("checkbox", { name: /Responsables de compras/ }).check();
  await wizard.getByRole("checkbox", { name: /Empresas/ }).check();
  await wizard.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(wizard.getByText("Borrador guardado · paso 1 de 8")).toBeVisible();
  await wizard.getByRole("button", { name: "Siguiente" }).click();
  await wizard.getByRole("checkbox", { name: /Servicios posventa/ }).check();
  await wizard.getByRole("button", { name: "Siguiente" }).click();
  await wizard.getByLabel("Presupuesto mensual (ARS)").fill("600000");
  await wizard.getByRole("button", { name: "Siguiente" }).click();
  await wizard.getByLabel("Meta Ads (%)").fill("60");
  await wizard.getByLabel("Google Ads (%)").fill("30");
  await wizard.getByRole("button", { name: "Siguiente" }).click();
  await expect(wizard.getByRole("alert")).toContainText("debe sumar 100 % (hoy suma 90 %)");
  await wizard.getByLabel("ChatGPT Ads (%)").fill("10");
  await wizard.getByRole("button", { name: "Siguiente" }).click();
  await wizard.getByLabel("Enfoque publicitario").fill("Repuestos en 48 h para no parar la planta");
  await wizard.getByRole("button", { name: "Retargeting" }).click();
  await expect(wizard.getByRole("note", { name: "IA · Sugerencia de estrategia publicitaria" })).toContainText("Pendiente de conexión");
  await wizard.getByRole("button", { name: "Siguiente" }).click();
  await wizard.getByLabel("Anuncios de Meta Ads").fill("Placas de stock por código");
  await wizard.getByRole("button", { name: "Siguiente" }).click();
  await wizard.getByLabel("Landing page").fill("Landing de repuestos con buscador");
  await wizard.getByRole("button", { name: "Siguiente" }).click();
  await wizard.getByLabel("WhatsApp").fill("Respuesta del área de repuestos");
  await wizard.getByRole("button", { name: "Enviar a validación del PM" }).click();
  await expect(wizard).toHaveCount(0);
  await expect(page).toHaveURL(/campana=CMP-/);
  const campaignId = new URL(page.url()).searchParams.get("campana")!;
  await expect(page.getByText("Plan: En validación del PM").first()).toBeVisible();
  let campaigns = await local(page, "client:epsa:module:publicidad-digital:campanas");
  const created = campaigns.find((item: { id: string }) => item.id === campaignId);
  expect(created.values).toMatchObject({ icpIds: "icp-buyers", segmentoIds: "segment-companies", productoIds: "offering-1", presupuestoMensual: "600000", plataforma: "Meta Ads", planEstado: "En validación del PM" });
  let workspace = await local(page, "workspace");
  const planTask = workspace.tasks.find((task: Task) => task.id === `PAID-PLAN-epsa-${campaignId}`);
  expect(planTask).toMatchObject({ owner: "Valentina Ríos", status: "En aprobación", serviceId: "publicidad-digital" });
  expect(workspace.notifications.some((n: Note) => n.taskId === planTask.id && n.recipient === "Valentina Ríos")).toBe(true);
  await expect(page.getByRole("button", { name: "Pedir anuncio" })).toHaveCount(0);

  // PM aprueba.
  await asRole(page, "pm", `/v2/clientes/epsa/campanas?seccion=campanas&campana=${campaignId}`);
  await page.getByRole("button", { name: "Aprobar planificación" }).click();
  await expect(page.getByText("Plan: Aprobada").first()).toBeVisible();
  workspace = await local(page, "workspace");
  expect(workspace.tasks.find((task: Task) => task.id === planTask.id).status).toBe("Hecho");
  // La aprobación cierra la cadena de la planificación (registro de cierre ya completado, sin tareas abiertas).
  const planChain = workspace.tasks.filter((task: Task) => task.workItem?.id === campaignId);
  expect(openOf(planChain)).toHaveLength(0);
  const planClosed = expectChain(planChain, planTask.id);
  expect(planClosed).toMatchObject({ status: "Hecho", workflow: { stage: "Aprobada" } });
  expect(workspace.notifications.some((n: Note) => n.taskId === planClosed.id && n.recipient === "Martín Ledesma" && /armá los briefs/.test(n.title))).toBe(true);

  // Instancia 2: pedido de anuncio → brief al Content, con plazos por etapa.
  await asRole(page, "technical", `/v2/clientes/epsa/campanas?seccion=campanas&campana=${campaignId}`);
  await page.getByRole("button", { name: "Pedir anuncio" }).click();
  const form = page.getByRole("dialog", { name: "Pedido de pieza · QA Repuestos express" });
  await form.getByLabel("Nombre del pedido").fill("Placa QA · stock 48 h");
  await form.getByLabel("Canal").selectOption("Meta Ads");
  await form.getByLabel("Fecha en que se necesita").fill("2026-12-18");
  await form.getByLabel("Qué insight querés probar").fill("Una planta parada cuesta más que el repuesto");
  await form.getByLabel("Qué respuesta le das a ese insight").fill("Stock en 48 h");
  await form.getByLabel("Beneficio para el cliente").fill("No parar la producción");
  await form.getByLabel("Propuesta concreta").fill("Placa con el plazo de entrega");
  await form.getByLabel("Reason to believe").fill("Depósito propio");
  await form.getByLabel("Call to action").fill("Consultá stock");
  await form.getByRole("button", { name: "Conversión" }).click();
  await form.getByRole("button", { name: "Placa" }).click();
  await form.getByRole("button", { name: "Reel" }).click();
  const deadlines = form.getByRole("region", { name: "Plazos por etapa" });
  await expect(deadlines.getByRole("row")).toHaveCount(7);
  await expect(deadlines.getByRole("row", { name: /Diseño Diseño Tomás Aguirre/ })).toContainText("14 dic");
  await expect(deadlines.getByRole("status")).toContainText("Hay margen");
  await expect(form.getByRole("region", { name: "Brief generado" })).toContainText("Target (Discovery): Responsables de compras");
  await form.getByRole("button", { name: "Generar brief y enviar al Content" }).click();
  const detail = page.getByRole("dialog", { name: "Pedido: Placa QA · stock 48 h" });
  await expect(detail).toBeVisible();
  let ads = await local(page, "client:epsa:module:publicidad-digital:anuncios");
  const ad = ads.find((item: { values: { nombre: string } }) => item.values.nombre === "Placa QA · stock 48 h");
  expect(ad.values).toMatchObject({ etapa: "Opciones de Content", funnel: "Conversión", piezas: "Placa,Reel", campana: campaignId });
  expect(JSON.parse(ad.values.plazos).map((d: { stage: string; due: string }) => `${d.stage}:${d.due}`)).toEqual(["Opciones de Content:2026-12-08", "Validación del PM:2026-12-09", "Diseño:2026-12-14", "Validación del diseño:2026-12-15", "Aprobación del cliente:2026-12-17", "Puesta en circulación:2026-12-18"]);
  const taskId = `PAID-epsa-${ad.id}`;
  workspace = await local(page, "workspace");
  expect(workspace.tasks.find((task: Task) => task.id === taskId)).toMatchObject({ owner: "Lucía Benítez", status: "Por hacer", due: "2026-12-08" });
  expect(workspace.notifications.some((n: Note) => n.taskId === taskId && n.recipient === "Lucía Benítez")).toBe(true);

  const adUrl = `/v2/clientes/epsa/campanas?seccion=anuncios&anuncio=${ad.id}`;
  const step = async (role: string, fill: (dialog: ReturnType<Page["getByRole"]>) => Promise<void>, button: string, expected: string) => {
    await asRole(page, role, adUrl);
    const dialog = page.getByRole("dialog", { name: "Pedido: Placa QA · stock 48 h" });
    await fill(dialog);
    await dialog.getByRole("button", { name: button }).click();
    await expect(page.getByRole("dialog", { name: "Pedido: Placa QA · stock 48 h" }).getByRole("list", { name: /Flujo de/ }).locator("[aria-current=step]")).toContainText(expected);
  };
  // 1 Content elige y ajusta.
  await step("content", async (d) => {
    await expect(d.getByRole("note", { name: "IA · Opciones de piezas a partir del brief" })).toContainText("No se muestran sugerencias simuladas");
    await d.getByLabel("Opciones trabajadas").fill("A · dato grande\nB · reel con depósito");
    await d.getByLabel("Opción elegida y ajustes").fill("Opción A con dato 48 h");
    await d.getByLabel("Copy").fill("Tu planta no espera: repuestos en 48 h.");
  }, "Enviar a validación del PM", "Validación del PM");
  // 2 PM devuelve y luego aprueba → 3 Diseño (pedido de diseño único).
  await step("pm", async (d) => { await d.getByLabel("Comentario o devolución").fill("Sumar el código de producto"); }, "Devolver al Content", "Opciones de Content");
  await step("content", async (d) => { await d.getByLabel("Opción elegida y ajustes").fill("Opción A con dato 48 h y código"); }, "Enviar a validación del PM", "Validación del PM");
  await step("pm", async () => {}, "Aprobar y enviar a diseño", "Diseño");
  let design = (await local(page, "client:epsa:module:diseno-marca:trabajos")).filter((r: { values: { anuncioId?: string } }) => r.values.anuncioId === ad.id);
  expect(design).toHaveLength(1);
  // Cada etapa es una tarea de la cadena del pedido: el pedido de diseño queda vinculado a la tarea de Diseño.
  workspace = await local(page, "workspace");
  const designTask = expectChain(workspace.tasks.filter((task: Task) => task.workItem?.id === ad.id), taskId);
  expect(design[0].values).toMatchObject({ servicioOrigen: "publicidad-digital", campanaId: campaignId, responsable: "Tomás Aguirre", tareaId: designTask.id, operacion: "En producción" });
  expect(designTask).toMatchObject({ owner: "Tomás Aguirre", serviceId: "diseno-marca", workflow: { kind: "paid", stage: "Diseño" } });
  expect(workspace.tasks.find((task: Task) => task.id === taskId)).toMatchObject({ status: "Hecho", workflow: { stage: "Opciones de Content" } });
  // 3 Diseño → 4 Validación del PM del diseño → 5 Cliente.
  await step("designer", async (d) => { await d.getByLabel("Enlace a las piezas diseñadas (http/https)").fill("https://example.com/qa-placa"); }, "Enviar piezas a validación del PM", "Validación del diseño");
  await step("pm", async () => {}, "Aprobar diseño y enviar al cliente", "Aprobación del cliente");
  workspace = await local(page, "workspace");
  const clientTask = expectChain(workspace.tasks.filter((task: Task) => task.workItem?.id === ad.id), taskId);
  expect(clientTask).toMatchObject({ owner: "Cliente · EPSA / Line Up", status: "En aprobación" });
  const clientNote = workspace.notifications.find((n: Note) => n.taskId === clientTask.id && n.recipient === "Cliente · EPSA / Line Up");
  expect(clientNote.href).toBe(`/v2/portal/epsa?anuncio=${ad.id}`);
  // 5 Aprobación del cliente desde su portal.
  await page.goto(clientNote.href);
  const portalCard = page.getByRole("article", { name: "Anuncio para aprobar: Placa QA · stock 48 h" });
  await portalCard.getByRole("button", { name: "Aprobar anuncio" }).click();
  await expect(portalCard).toHaveCount(0);
  // 6 Puesta en circulación por el Líder técnico.
  await step("technical", async () => {}, "Marcar en circulación", "En circulación");
  ads = await local(page, "client:epsa:module:publicidad-digital:anuncios");
  const final = ads.find((item: { id: string }) => item.id === ad.id);
  expect(final.values).toMatchObject({ etapa: "En circulación", version: "2" });
  design = (await local(page, "client:epsa:module:diseno-marca:trabajos")).filter((r: { values: { anuncioId?: string } }) => r.values.anuncioId === ad.id);
  expect(design).toHaveLength(1);
  expect(design[0].values.operacion).toBe("Aprobados");
  workspace = await local(page, "workspace");
  const adTasks = workspace.tasks.filter((task: Task) => task.workItem?.id === ad.id);
  expect(expectChain(adTasks, taskId)).toMatchObject({ status: "Hecho", workflow: { stage: "En circulación" } });
  expect(openOf(adTasks)).toHaveLength(0);
  // Las devoluciones quedan como ciclos nuevos de la misma etapa, nunca como tareas duplicadas.
  expect(adTasks.filter((task: Task) => task.workflow?.stage === "Opciones de Content").length).toBe(2);
  const dialog = page.getByRole("dialog", { name: "Pedido: Placa QA · stock 48 h" });
  await expect(dialog.getByRole("region", { name: "Comentarios por versión" })).toContainText("Sumar el código de producto");
  await expect(dialog.getByRole("region", { name: "Historial del pedido" })).toContainText("Aprobar anuncio");
  // Campaign view: the ad now circulates.
  await page.goto(`/v2/clientes/epsa/campanas?seccion=campanas&campana=${campaignId}`);
  await expect(page.getByRole("region", { name: /Anuncios circulando · 1/ })).toContainText("Placa QA · stock 48 h");
  campaigns = await local(page, "client:epsa:module:publicidad-digital:campanas");
  expect(campaigns.filter((item: { id: string }) => item.id === campaignId)).toHaveLength(1);
  expect(errors).toEqual([]);
});

test("campaign view groups metrics, plan, circulating and previous ads, landing, stimuli and pending AI optimisation", async ({ page }) => {
  await page.goto("/v2/clientes/aca/campanas?seccion=campanas&campana=CMP-ACA-01");
  await expect(page.getByRole("heading", { name: "Captación de socios · Meta", level: 2 })).toBeVisible();
  for (const title of ["Desglose de métricas", "Plan de campaña", "Anuncios circulando · 1", "Piezas en flujo · 3", "Anuncios anteriores · 1", "Landing final", "Estímulos posteriores", "Seguimiento y optimización"]) {
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("table").filter({ hasText: "Resumen por canal (demo)" })).toContainText("TikTok Ads");
  await expect(page.getByRole("table").filter({ hasText: "Resumen por canal (demo)" }).getByText("No conectada").first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Landing final" })).toContainText("Landing · Asociate en 3 pasos");
  await expect(page.getByRole("region", { name: "Estímulos posteriores" })).toContainText("WhatsApp · respuesta a nuevos leads");
  await expect(page.getByRole("note", { name: "IA · Sugerencias de optimización" })).toContainText("Pendiente de conexión");
  await expect(page.getByRole("region", { name: "Anuncios anteriores · 1" })).toContainText("Promo de septiembre");
});

test("ACA and EPSA stay isolated, ACA without Discovery ICPs says so, and the client portal only lists its own ads", async ({ page }) => {
  await page.goto("/v2/clientes/aca/campanas?seccion=anuncios");
  const board = page.getByLabel("Tablero de anuncios por etapa");
  await expect(board).toContainText("Banner · Asistencia 24 h");
  await expect(board).not.toContainText("Line Up");
  await page.goto("/v2/clientes/aca/campanas?seccion=campanas");
  await expect(page.getByRole("article", { name: "Campaña Turismo de verano" })).toContainText("Paso 3 de 8");
  await expect(page.getByText("Posventa como diferencial")).toHaveCount(0);
  await page.getByRole("article", { name: "Campaña Turismo de verano" }).getByRole("button", { name: "Turismo de verano" }).click();
  await page.getByRole("button", { name: "Continuar planificación" }).click();
  const wizard = page.getByRole("dialog", { name: "Planificación · Turismo de verano" });
  await wizard.getByRole("button", { name: /Target/ }).click();
  await expect(wizard.getByText(/El Discovery de ACA no tiene ICP cargados/)).toBeVisible();
  await page.goto("/v2/portal/aca");
  const portal = page.getByRole("region", { name: "Anuncios para aprobar" });
  await expect(portal).toContainText("Banner · Asistencia 24 h");
  await expect(portal).not.toContainText("Remarketing · caso de posventa");
  await page.goto("/v2/portal/epsa");
  await expect(page.getByRole("region", { name: "Anuncios para aprobar" })).toContainText("Remarketing · caso de posventa");
  await expect(page.getByRole("region", { name: "Anuncios para aprobar" })).not.toContainText("Banner · Asistencia 24 h");
});

test("demo setup creates one task per open demo ad and one design request per designed demo ad, without duplicates", async ({ page }) => {
  await page.goto("/v2/clientes/epsa/campanas?seccion=anuncios");
  await expect(page.getByLabel("Tablero de anuncios por etapa")).toContainText("Placa · entrega en plazo");
  await expect.poll(async () => (await local(page, "workspace"))?.tasks?.filter((t: Task) => t.id.startsWith("PAID-epsa-")).length).toBe(4);
  await page.reload();
  await page.goto("/v2/clientes/epsa/campanas");
  await expect(page.getByText("Alertas").first()).toBeVisible();
  const workspace = await local(page, "workspace");
  const ids = workspace.tasks.filter((t: Task) => t.id.startsWith("PAID-")).map((t: Task) => t.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids).toEqual(expect.arrayContaining(["PAID-PLAN-epsa-CMP-EPSA-03", "PAID-epsa-ANU-EPSA-03", "PAID-epsa-ANU-EPSA-05"]));
  const design = await local(page, "client:epsa:module:diseno-marca:trabajos");
  expect(design.filter((r: { values: { anuncioId?: string } }) => r.values.anuncioId).map((r: { id: string }) => r.id).sort()).toEqual(["DIS-ANU-EPSA-03", "DIS-ANU-EPSA-05"]);
});

test("read-only roles can consult but not create, validate or advance", async ({ page }) => {
  const errors = errorsOf(page);
  // The client role only sees its portal; the designer is read-only in Publicidad digital outside the design stage.
  await asRole(page, "client", "/v2/clientes/epsa/campanas?seccion=campanas");
  await expect(page.getByText("Espacio del cliente")).toBeVisible();
  await asRole(page, "designer", "/v2/clientes/epsa/campanas?seccion=campanas");
  await expect(page.getByText("Solo lectura", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Nueva campaña", exact: true })).toBeDisabled();
  await expect(page.getByText(/solo el Líder técnico asignado crea y planifica/)).toBeVisible();
  await page.goto("/v2/clientes/epsa/campanas?seccion=campanas&campana=CMP-EPSA-03");
  await expect(page.getByRole("button", { name: "Aprobar planificación" })).toBeDisabled();
  await page.goto("/v2/clientes/epsa/campanas?seccion=anuncios&anuncio=ANU-EPSA-02");
  const detail = page.getByRole("dialog", { name: "Pedido: Carrusel · cinco especificaciones" });
  await expect(detail.getByRole("button", { name: "Aprobar y enviar a diseño" })).toBeDisabled();
  await expect(detail.getByText(/Tu rol puede consultar/)).toBeVisible();
  // Technical leader of EPSA is not assigned to ACA.
  await asRole(page, "technical", "/v2/clientes/aca/campanas?seccion=campanas");
  await expect(page.getByRole("button", { name: "Nueva campaña", exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});

for (const [name, width, height] of [["desktop", 1440, 900], ["mobile", 390, 844]] as const) {
  test(`responsive ${name}: Publicidad digital without horizontal overflow`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    for (const path of ["/v2/clientes/epsa/campanas", "/v2/clientes/epsa/campanas?seccion=plan", "/v2/clientes/epsa/campanas?seccion=campanas", "/v2/clientes/epsa/campanas?seccion=anuncios", "/v2/clientes/aca/campanas?seccion=campanas&campana=CMP-ACA-01", "/v2/clientes/epsa/campanas?seccion=anuncios&anuncio=ANU-EPSA-03", "/v2/portal/aca"]) {
      await page.goto(path);
      await expect(page.locator("main").first()).toBeVisible();
      await noOverflow(page);
      await page.screenshot({ path: info.outputPath(`${name}-${path.replace(/[^a-z0-9]+/gi, "_")}.png`), fullPage: true });
    }
    await page.goto("/v2/clientes/epsa/campanas?seccion=campanas");
    await page.getByRole("button", { name: "Nueva campaña", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Nueva campaña · Instancia 1" })).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: info.outputPath(`${name}-wizard.png`), fullPage: true });
  });
}
