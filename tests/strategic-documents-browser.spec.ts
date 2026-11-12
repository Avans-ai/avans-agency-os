import { test, expect, type Page } from "@playwright/test";
test.use({ actionTimeout: 15000 });

async function knowledge(page: Page, slug = "epsa") {
  return page.evaluate(
    (slug) =>
      JSON.parse(localStorage.getItem(`avans-os:preview:v1:client:${slug}:knowledge:v1`) || "null")?.value,
    slug,
  );
}
function dailyNav(page: Page, name: string) {
  return page.getByRole("navigation", { name: `Trabajo diario de ${name}` });
}

test("service modules: add with scope and confirmation, persist after reload, feed navigation and Plan, deactivate keeping data, isolate clients", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/v2/clientes/aca");
  await page.getByRole("button", { name: "+ Agregar módulo de servicio" }).click();
  const dialog = page.getByRole("dialog");
  const web = dialog.locator("li").filter({ has: page.getByText("Desarrollo web", { exact: true }) }).first();
  await web.getByRole("checkbox").first().check();
  await expect(web.locator("p", { hasText: "Plan de Marketing:" })).toContainText("Sitemap");
  await dialog.getByRole("button", { name: /^Guardar 1 cambio/ }).click();
  await expect(dialog.getByRole("alert")).toContainText("Describí el alcance contratado");
  await web.getByLabel(/Alcance contratado/).fill("Landing de captación y mantenimiento mensual");
  await web.getByLabel("Fecha de inicio").fill("2026-11-16");
  await dialog.getByRole("button", { name: /^Guardar 1 cambio/ }).click();
  await expect(dialog.getByRole("alert")).toContainText("Confirmá que los cambios de alcance");
  await dialog.getByRole("checkbox", { name: /Confirmo que los cambios/ }).check();
  await dialog.getByRole("button", { name: /^Guardar 1 cambio/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(dailyNav(page, "ACA").getByRole("link", { name: /Desarrollo web/ })).toBeVisible();
  await page.reload();
  await expect(dailyNav(page, "ACA").getByRole("link", { name: /Desarrollo web/ })).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("avans-os:preview:v1:client:aca:service-modules") || "null")?.value);
  expect(stored.modules["desarrollo-web"]).toMatchObject({ active: true, kind: "contracted", startDate: "2026-11-16" });
  expect(stored.modules["desarrollo-web"].history.length).toBeGreaterThan(0);
  await page.goto("/v2/clientes/aca?view=plan");
  await expect(page.locator("#plan-desarrollo-web")).toBeVisible();
  await expect(page.locator("#plan-audiovisuales")).toHaveCount(0);
  await page.getByRole("button", { name: "Gestionar módulos" }).click();
  const web2 = page.getByRole("dialog").locator("li").filter({ has: page.getByText("Desarrollo web", { exact: true }) }).first();
  await web2.getByRole("checkbox").first().uncheck();
  await page.getByRole("dialog").getByRole("checkbox", { name: /Confirmo que los cambios/ }).check();
  await page.getByRole("dialog").getByRole("button", { name: /^Guardar 1 cambio/ }).click();
  await expect(page.locator("#plan-desarrollo-web")).toHaveCount(0);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("avans-os:preview:v1:client:aca:service-modules") || "null")?.value);
  expect(after.modules["desarrollo-web"]).toMatchObject({ active: false, scope: "Landing de captación y mantenimiento mensual" });
  await page.goto("/v2/clientes/epsa");
  await expect(dailyNav(page, "EPSA / Line Up").getByRole("link", { name: /Desarrollo web/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("operative role cannot manage modules; assigned PM can", async ({ page }) => {
  await page.goto("/v2/clientes/epsa");
  await page.getByRole("button", { name: /^Perfil:/ }).click();
  await page.getByRole("group", { name: "Rol simulado" }).getByRole("button", { name: "Ejecutiva de cuentas", exact: true }).click();
  await page.getByRole("button", { name: /^Perfil:/ }).click();
  await expect(page.getByRole("button", { name: "+ Agregar módulo de servicio" })).toHaveCount(0);
  await page.getByRole("button", { name: /^Perfil:/ }).click();
  await page.getByRole("group", { name: "Rol simulado" }).getByRole("button", { name: "Project Manager · Valentina Ríos", exact: true }).click();
  await page.getByRole("button", { name: /^Perfil:/ }).click();
  await expect(page.getByRole("button", { name: "+ Agregar módulo de servicio" })).toBeVisible();
});

test("Cuestionario inicial is a separate tool; validated answers build the continuous Discovery without duplicates", async ({ page }) => {
  await page.goto("/v2/clientes/epsa?view=ficha");
  await page.getByRole("tab", { name: "Discovery del negocio" }).click();
  await expect(page).toHaveURL(/ficha=discovery/);
  const index = page.getByRole("navigation", { name: "Índice de Discovery del negocio" });
  await expect(index.getByRole("link")).toHaveText(["Empresa", "Datos", "Unidades", "Productos", "Proceso comercial", "Segmentación", "ICP B2B", "ICP B2C", "Fuentes"]);
  await expect(page.locator("[id^=discovery-]").first()).toHaveAttribute("id", "discovery-empresa");
  await expect(page.locator("#discovery-cuestionario")).toHaveCount(0);
  await expect(page.locator("summary", { hasText: /^Responder preguntas/ })).toHaveCount(0);
  await expect(page.locator("#discovery-empresa, #discovery-datos, #discovery-targeting").getByText(/\d+\s?%/)).toHaveCount(0);

  // Independent questionnaire with its tools.
  await page.getByRole("link", { name: "Cuestionario inicial" }).first().click();
  await expect(page).toHaveURL(/view=cuestionario/);
  await expect(page.getByRole("heading", { name: "Cuestionario inicial", exact: true })).toBeVisible();
  for (const name of ["Cargar información", "Revisar sugerencias", "Imprimir cuestionario vacío", "Imprimir cuestionario completado"])
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Discovery del negocio" })).toHaveCount(0);
  const q = page.getByRole("heading", { name: "¿Qué cobertura tiene?", exact: true }).locator("..");
  await page.getByLabel("¿Qué cobertura tiene?", { exact: true }).fill("Cobertura validada QA");
  await q.getByLabel("Estado de respuesta").selectOption("validated");
  await q.getByLabel("Fuente o referencia").fill("Reunión de kickoff QA");
  await q.getByLabel("Permiso de publicación").selectOption("public");
  await page.getByRole("button", { name: "Aplicar respuestas validadas al Discovery" }).click();
  await expect.poll(async () => (await knowledge(page))?.discovery.companyProfile.coverage).toBe("Cobertura validada QA");
  // Applying again does not duplicate proposals or values.
  await page.getByRole("button", { name: "Aplicar respuestas validadas al Discovery" }).click();
  await expect(page.getByText(/No hay respuestas validadas nuevas/)).toBeVisible();
  const state = await knowledge(page);
  const applied = state.proposals.filter((p: { status: string; originQuestionId?: string }) => p.status === "applied" && p.originQuestionId === "companyProfile.coverage");
  expect(applied).toHaveLength(1);
  expect(state.audit.filter((a: { action: string }) => a.action.startsWith("Respuestas validadas aplicadas al Discovery"))).toHaveLength(1);

  await page.getByRole("link", { name: "Ver Discovery generado" }).click();
  await expect(page.getByRole("heading", { name: "Discovery del negocio", exact: true })).toBeVisible();
  await expect(page.locator("#discovery-empresa")).toContainText("Cobertura validada QA");

  // Earlier links keep working.
  await page.goto("/v2/clientes/epsa/cuestionario");
  await expect(page).toHaveURL(/view=cuestionario/);
  await page.goto("/v2/clientes/epsa?view=ficha#discovery-cuestionario");
  await expect(page).toHaveURL(/view=cuestionario/);
  await page.goto("/v2/clientes/epsa/discovery");
  await expect(page.getByRole("heading", { name: "Discovery del negocio", exact: true })).toBeVisible();
});

for (const [view, label, first] of [
  ["benchmark", "Índice de Benchmark", "Marcas"],
  ["plan", "Índice de Plan de Marketing", "Estrategia y coordinación"],
] as const) {
  test(`${view} is a continuous document with sticky index and active section`, async ({ page }) => {
    await page.goto(`/v2/clientes/epsa?view=${view}`);
    const index = page.getByRole("navigation", { name: label });
    await expect(index.getByRole("link").first()).toHaveText(first);
    const links = index.getByRole("link");
    const last = links.last();
    await last.click();
    await expect(last).toHaveAttribute("aria-current", "location");
    // El scroll suave puede seguir en curso cuando cambia aria-current: esperar a que el índice quede fijo.
    await expect.poll(async () => (await index.boundingBox())!.y).toBeLessThan(200);
    const box = await index.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    await expect(page.getByRole("tab")).toHaveCount(0);
  });
}
