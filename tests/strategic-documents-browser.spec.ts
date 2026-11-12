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

test("Discovery starts with the questionnaire, shows no coverage percentages and applies validated answers directly", async ({ page }) => {
  await page.goto("/v2/clientes/epsa?view=ficha");
  await page.getByRole("tab", { name: "Discovery del negocio" }).click();
  const index = page.getByRole("navigation", { name: "Índice de Discovery del negocio" });
  await expect(index.getByRole("link")).toHaveText(["Cuestionario", "Empresa", "Datos", "Unidades", "Productos", "Comercial", "Targeting", "ICP B2B", "ICP B2C", "Fuentes"]);
  const first = page.locator("[id^=discovery-]").first();
  await expect(first).toHaveAttribute("id", "discovery-cuestionario");
  await expect(page.locator("#discovery-empresa, #discovery-datos, #discovery-targeting").getByText(/\d+\s?%/)).toHaveCount(0);
  await page.locator("summary", { hasText: /^Responder preguntas/ }).click();
  const q = page.getByRole("heading", { name: "¿Qué cobertura tiene?", exact: true }).locator("..");
  await page.getByLabel("¿Qué cobertura tiene?", { exact: true }).fill("Cobertura validada QA");
  await q.getByLabel("Estado de respuesta").selectOption("validated");
  await q.getByLabel("Fuente o referencia").fill("Reunión de kickoff QA");
  await q.getByLabel("Permiso de publicación").selectOption("public");
  await page.getByRole("button", { name: "Aplicar respuestas validadas al Discovery" }).click();
  await expect.poll(async () => (await knowledge(page))?.discovery.companyProfile.coverage).toBe("Cobertura validada QA");
  const state = await knowledge(page);
  expect(state.proposals.some((p: { status: string; originQuestionId?: string }) => p.status === "applied" && p.originQuestionId)).toBe(true);
  expect(state.audit.some((a: { action: string }) => a.action.startsWith("Respuestas validadas aplicadas al Discovery"))).toBe(true);
  await index.getByRole("link", { name: "Empresa", exact: true }).click();
  await expect(page.locator("#discovery-empresa")).toContainText("Cobertura validada QA");
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
    const box = await index.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeLessThan(200);
    await expect(page.getByRole("tab")).toHaveCount(0);
  });
}
