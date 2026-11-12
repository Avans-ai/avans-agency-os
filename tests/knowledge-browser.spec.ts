import { test, expect, type Page } from "@playwright/test";
test.use({ actionTimeout: 15000 });
async function knowledge(page: Page, slug = "epsa") {
  return page.evaluate(
    (slug) =>
      JSON.parse(
        localStorage.getItem(
          `avans-os:preview:v1:client:${slug}:knowledge:v1`,
        ) || "null",
      )?.value,
    slug,
  );
}
async function open(page: Page, view: string, slug = "epsa") {
  await page.goto(`/v2/clientes/${slug}?view=${view}`);
  await expect(
    page.getByRole("navigation", {
      name: slug === "epsa" ? "Gestión de EPSA / Line Up" : "Gestión de ACA",
    }),
  ).toBeVisible();
}
async function switchRole(page: Page, name: string) {
  await page.getByRole("button", { name: /^Perfil:/ }).click();
  await page
    .getByRole("group", { name: "Rol simulado" })
    .getByRole("button", { name, exact: true })
    .click();
  await page.getByRole("button", { name: /^Perfil:/ }).click();
}
async function setModules(page: Page, changes: Record<string, boolean>) {
  await page.getByRole("button", { name: "Gestionar módulos", exact: true }).click();
  const dialog = page.getByRole("dialog");
  for (const [label, active] of Object.entries(changes)) {
    const item = dialog
      .locator("li")
      .filter({ has: page.getByText(label, { exact: true }) })
      .first();
    const box = item.getByRole("checkbox").first();
    if (active) {
      await box.check();
      await item.getByRole("button", { name: "Demostración", exact: true }).click();
    } else await box.uncheck();
  }
  await dialog.getByRole("button", { name: /^Guardar \d+ cambio/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
function planBlock(page: Page, service: string, block: string) {
  return page
    .locator(`#plan-${service}`)
    .locator("[class*=block]")
    .filter({ has: page.getByRole("heading", { name: block, exact: true }) });
}
async function saveRecord(page: Page) {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Guardar registro", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
test("questionnaire to proposal to approved Discovery, dependencies, persistence and client isolation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page, "ficha");
  await page.getByRole("tab", { name: "Discovery del negocio" }).click();
  await page
    .locator("summary", { hasText: /^Responder preguntas/ })
    .click();
  await page
    .getByLabel("¿Qué cobertura tiene?", { exact: true })
    .fill("Cobertura QA Argentina y Uruguay");
  const q = page
    .getByRole("heading", { name: "¿Qué cobertura tiene?", exact: true })
    .locator("..");
  await q.getByLabel("Estado de respuesta").selectOption("answered");
  await q.getByLabel("Fuente o referencia").fill("Conversación QA");
  await q.getByLabel("Permiso de publicación").selectOption("public");
  await page
    .getByRole("button", { name: "Enviar respuestas a revisión" })
    .click();
  await expect
    .poll(async () => (await knowledge(page))?.proposals.length)
    .toBe(1);
  const before = (await knowledge(page)).discovery.companyProfile.coverage;
  expect(before).not.toContain("Cobertura QA");
  await page.getByRole("link", { name: /^Documentos / }).click();
  await page
    .getByRole("button", { name: "Cambios para aprobar", exact: true })
    .click();
  await expect(page.getByText("Valor actual", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Valor propuesto", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Aprobar propuesta", exact: true })
    .click();
  await expect
    .poll(async () => (await knowledge(page)).discovery.companyProfile.coverage)
    .toBe("Cobertura QA Argentina y Uruguay");
  await page
    .getByRole("combobox", { name: "Estado", exact: true })
    .selectOption("applied");
  await expect(page.getByText(/Revisada por/)).toBeVisible();
  expect((await knowledge(page)).versions.length).toBeGreaterThan(1);
  await page.getByRole("link", { name: /^Plan de Marketing / }).click();
  await expect(
    page.getByText("Requiere revisión", { exact: true }).first(),
  ).toBeVisible();
  await page.reload();
  expect((await knowledge(page)).discovery.companyProfile.coverage).toBe(
    "Cobertura QA Argentina y Uruguay",
  );
  await open(page, "ficha", "aca");
  expect(await knowledge(page, "aca")).toBeUndefined();
  expect(errors).toEqual([]);
});
test("DEMO meeting inbox, ambiguous manual assignment, duplicate delivery and role privacy", async ({
  page,
}) => {
  await open(page, "documentos");
  await expect(
    page.getByText("Google Workspace no conectado", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sincronizar reuniones" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Probar nota DEMO", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Bandeja de reuniones sin cliente" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Asignar al cliente", exact: true })
    .click();
  await expect
    .poll(async () => (await knowledge(page)).meetings.length)
    .toBe(1);
  await page
    .getByRole("button", { name: "Probar nota DEMO", exact: true })
    .click();
  expect((await knowledge(page)).meetings).toHaveLength(1);
  await page
    .getByRole("button", { name: "Probar asociación ambigua DEMO" })
    .click();
  await expect(page.getByText("Candidatos: aca · epsa")).toBeVisible();
  await switchRole(page, "Administrador");
  await page
    .getByRole("button", { name: "Bandeja sin cliente", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Asignar a cliente", exact: true })
    .selectOption("aca");
  await page
    .getByRole("button", { name: "Asignar al cliente", exact: true })
    .click();
  await expect
    .poll(async () => (await knowledge(page, "aca"))?.meetings.length)
    .toBe(1);
  expect((await knowledge(page)).meetings).toHaveLength(1);
  expect(
    (await knowledge(page, "aca")).sources.every(
      (source: { clientSlug: string }) => source.clientSlug === "aca",
    ),
  ).toBe(true);
  await expect(page.getByText("No hay reuniones sin cliente.")).toBeVisible();
  await page
    .getByRole("button", { name: "Probar asociación ambigua DEMO" })
    .click();
  expect((await knowledge(page, "aca")).meetings).toHaveLength(1);
  await expect(page.getByText("No hay reuniones sin cliente.")).toBeVisible();
  await page.getByRole("button", { name: "Reuniones", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "DEMO · EPSA · revisión del negocio",
      exact: true,
    }),
  ).toBeVisible();
  await switchRole(page, "Ejecutiva de cuentas");
  await expect(
    page.getByRole("button", { name: "Importar nota manual" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("heading", {
      name: "DEMO · EPSA · revisión del negocio",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Cambios para aprobar", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Aprobar propuesta", exact: true }),
  ).toHaveCount(0);
});
test("Benchmark brand baseline, competitor, evidence, conclusions and immutable snapshots", async ({
  page,
}) => {
  await open(page, "benchmark");
  await page
    .getByRole("button", { name: "+ Agregar marca", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Nombre", { exact: true })
    .fill("Competidor QA");
  await page
    .getByRole("dialog")
    .getByLabel("Por qué fue elegida")
    .fill("Compite en el segmento principal");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Guardar marca" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Índice de Benchmark" }).getByRole("link", { name: "Competidor QA", exact: true }),
  ).toBeVisible();
  const own = page.locator("#benchmark-propia-overview");
  await page
    .getByRole("navigation", { name: "Índice de Benchmark" })
    .getByRole("link", { name: "Marca del cliente", exact: true })
    .click();
  await own.getByRole("button", { name: "+ Agregar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Claim o promesa").fill("Promesa propia QA");
  await dialog
    .getByLabel("Descripción general")
    .fill("Descripción basada en evidencia QA");
  await dialog.getByLabel("Fecha del relevamiento").fill("2026-11-10");
  await saveRecord(page);
  await own.getByRole("button", { name: "Guardar snapshot fechado" }).click();
  await own.getByRole("button", { name: "Editar", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Claim o promesa")
    .fill("Promesa propia revisada");
  await saveRecord(page);
  await own.getByRole("button", { name: "Guardar snapshot fechado" }).click();
  const state = await knowledge(page);
  expect(state.benchmark.snapshots).toHaveLength(2);
  expect(state.benchmark.snapshots[0].brand.items[0].values.claim).toBe(
    "Promesa propia QA",
  );
  await page
    .getByRole("navigation", { name: "Índice de Benchmark" })
    .getByRole("link", { name: "Conclusiones", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Agregar conclusión" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Tipo de conclusión")
    .selectOption("Cómo podemos diferenciarnos");
  await page
    .getByRole("dialog")
    .getByLabel("Enunciado")
    .fill("Conclusión QA con evidencia");
  await page
    .getByRole("dialog")
    .getByLabel("Módulos del Plan afectados")
    .selectOption("contenidos");
  await saveRecord(page);
  await expect
    .poll(async () => (await knowledge(page)).benchmark.findings.length)
    .toBe(1);
  await page.reload();
  expect(
    (await knowledge(page)).benchmark.brands.some(
      (b: { name: string }) => b.name === "Competidor QA",
    ),
  ).toBe(true);
  await page
    .getByRole("navigation", { name: "Índice de Benchmark" })
    .getByRole("link", { name: "Monitoreo", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /^Ejecutar escaneo/ }),
  ).toBeDisabled();
  await expect(page.getByText("Cambios en Resumen general")).toBeVisible();
});
test("Plan modules preserve decisions across activation, show conditional fields and validate sitemap", async ({
  page,
}) => {
  await open(page, "plan");
  await switchRole(page, "Administrador");
  await setModules(page, {
    "Diseño de marca": true,
    Audiovisuales: true,
    "Desarrollo web": true,
    "Implementación de CRM": true,
  });
  const index = page.getByRole("navigation", { name: "Índice de Plan de Marketing" });
  await expect(index.getByRole("link", { name: "Desarrollo web", exact: true })).toBeVisible();
  await planBlock(page, "estrategia", "Objetivos")
    .getByRole("button", { name: "+ Agregar", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Enunciado")
    .fill("Objetivo persistente QA");
  await saveRecord(page);
  await setModules(page, { "Estrategia y coordinación": false });
  await expect(page.locator("#plan-estrategia")).toHaveCount(0);
  await expect(
    index.getByRole("link", { name: "Estrategia y coordinación", exact: true }),
  ).toHaveCount(0);
  await setModules(page, { "Estrategia y coordinación": true });
  await expect(
    page.getByText("Objetivo persistente QA", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator("#plan-crm")
      .getByText("Plantilla estratégica pendiente de definición", {
        exact: true,
      }),
  ).toBeVisible();
  await planBlock(page, "publicidad-digital", "KPIs de publicidad")
    .getByRole("button", { name: "+ Agregar", exact: true })
    .click();
  await page.getByRole("dialog").getByLabel("Modelo").selectOption("Leads");
  await expect(
    page.getByLabel("Criterio de calidad de consultas"),
  ).toBeVisible();
  await expect(page.getByLabel("Ventana y criterio de atribución")).toHaveCount(
    0,
  );
  await page.getByRole("dialog").getByLabel("Modelo").selectOption("Ecommerce");
  await expect(
    page.getByLabel("Ventana y criterio de atribución"),
  ).toBeVisible();
  await expect(page.getByLabel("Criterio de calidad de consultas")).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Cerrar panel" }).click();
  await page.reload();
  expect(
    (await knowledge(page)).plan.modules.estrategia[0].values.statement,
  ).toBe("Objetivo persistente QA");
  await expect(index.getByRole("link", { name: "Audiovisuales", exact: true })).toBeVisible();
});
test("mobile and existing workspaces stay navigable; Google routes fail closed", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of [
    "/v2",
    "/v2/mis-tareas",
    "/v2/clientes/epsa?view=documentos",
    "/v2/clientes/epsa?view=benchmark",
    "/v2/clientes/epsa?view=plan",
    "/v2/clientes/epsa/contenido",
  ]) {
    await page.goto(path);
    await expect(page.locator("main").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  await page.goto("/v2/integraciones");
  await expect(
    page.getByRole("heading", { name: "Google Workspace no conectado" }),
  ).toBeVisible();
  const status = await request.get("/api/integrations/google/status");
  expect((await status.json()).enabled).toBe(false);
  expect(
    (
      await request.post("/api/integrations/google/webhook", { data: {} })
    ).status(),
  ).toBe(401);
  expect(
    (await request.get("/api/integrations/google/oauth-start")).status(),
  ).toBe(503);
  expect(errors).toEqual([]);
});
