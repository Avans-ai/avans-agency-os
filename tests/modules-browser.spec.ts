import { test, expect, type Page } from "@playwright/test";
test.use({ actionTimeout: 15000 });

const errorsOf = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
};

async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

async function workspace(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("avans-os:preview:v1:workspace") || "null")?.value);
}

function sectionNav(page: Page, label: string) {
  return page.getByRole("navigation", { name: `Secciones de ${label}` });
}

test("reports: weekly, monthly, paid media and content render for EPSA with module filter and sources", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto("/v2/clientes/epsa?view=reportes");
  await expect(page.getByRole("heading", { name: "Reportes", exact: true })).toBeVisible();
  const picker = page.getByRole("group", { name: "Elegir reporte" });
  await expect(picker.getByRole("button")).toHaveCount(4);

  const weekly = page.getByRole("article", { name: "Reporte semanal operativo" });
  await expect(weekly.getByRole("heading", { name: "Resumen ejecutivo" })).toBeVisible();
  await expect(weekly.getByText("Datos de demostración.").first()).toBeVisible();
  for (const heading of ["Servicios activos", "Trabajo de la semana", "Bloqueos, aprobaciones y alertas", "Próximos pasos y acciones sugeridas", "Fuentes"]) {
    await expect(weekly.getByRole("heading", { name: heading })).toBeVisible();
  }
  const services = weekly.getByRole("table", { name: "Estado de los servicios activos" });
  await expect(services.getByRole("row")).toHaveCount(4);
  const filter = weekly.getByLabel("Filtrar reporte semanal por módulo");
  await expect(filter.locator("option")).toHaveText(["Todos los módulos activos", "Estrategia y coordinación", "Publicidad digital", "Contenidos"]);
  await filter.selectOption("publicidad-digital");
  await expect(services.getByRole("row")).toHaveCount(2);
  await expect(services).toContainText("Publicidad digital");
  await expect(services).not.toContainText("Contenidos");
  await expect(weekly.getByText("T-144 · Copys para piezas de lanzamiento")).toHaveCount(0);
  await expect(weekly.getByRole("img", { name: /Tareas hechas vs. abiertas por módulo/ })).toBeVisible();

  await picker.getByRole("button", { name: /Mensual de resultados/ }).click();
  await expect(page).toHaveURL(/reporte=mensual/);
  const monthly = page.getByRole("article", { name: "Reporte mensual de resultados" });
  for (const heading of ["Objetivos del cliente", "Resultados por módulo", "Actividades realizadas", "Aprendizajes, oportunidades y recomendaciones", "Próximas acciones", "Fuentes"]) {
    await expect(monthly.getByRole("heading", { name: heading })).toBeVisible();
  }
  await expect(monthly.getByRole("img", { name: /Variación frente al período anterior/ })).toBeVisible();

  await picker.getByRole("button", { name: /Publicidad digital/ }).click();
  const paid = page.getByRole("article", { name: "Reporte de Publicidad digital" });
  for (const label of ["Inversión", "Alcance", "Impresiones", "Clics", "CTR", "CPC", "Leads", "CPL", "Conversiones"]) {
    await expect(paid.getByRole("region", { name: "Indicadores de pauta" }).getByText(label, { exact: true })).toBeVisible();
  }
  await expect(paid.getByRole("img", { name: /Leads semanales/ })).toBeVisible();
  await expect(paid.getByText("ROAS no aplica", { exact: false }).first()).toBeVisible();
  await expect(paid.getByText("No conectada").first()).toBeVisible();
  await expect(paid.getByRole("table", { name: "Resultados por campaña" })).toContainText("Sin datos");

  await picker.getByRole("button", { name: /Contenidos/ }).click();
  const content = page.getByRole("article", { name: "Reporte de Contenidos" });
  await expect(content.getByRole("img", { name: /Formatos más efectivos/ })).toBeVisible();
  await expect(content.getByRole("heading", { name: "Aprendizajes y propuestas para el próximo período" })).toBeVisible();
  await expect(content.getByRole("table", { name: "Crecimiento de audiencia" })).toContainText("LinkedIn");

  // Edinovo has no paid media module: its report is not offered.
  await page.goto("/v2/clientes/edinovo?view=reportes&reporte=publicidad");
  await expect(page.getByRole("group", { name: "Elegir reporte" }).getByRole("button", { name: /Publicidad digital/ })).toHaveCount(0);
  await expect(page.getByRole("article", { name: "Reporte semanal operativo" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("publicidad digital: no generic flow block, own sections, campaign persists and opens its detail", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto("/v2/clientes/epsa/campanas");
  await expect(page.getByRole("heading", { name: "Publicidad digital", level: 1 })).toBeVisible();
  await expect(page.getByText("Flujo del servicio")).toHaveCount(0);
  const nav = sectionNav(page, "Publicidad digital");
  for (const label of ["Resumen", "Campañas", "Tareas", "Producción creativa", "Optimización", "Resultados", "Recomendaciones"]) {
    await expect(nav.getByRole("link", { name: new RegExp(`^${label}`) })).toBeVisible();
  }
  await expect(page.getByText("No conectada").first()).toBeVisible();

  await nav.getByRole("link", { name: /^Campañas/ }).click();
  await expect(page).toHaveURL(/seccion=campanas/);
  await page.getByRole("button", { name: "Nueva campaña" }).click();
  const dialog = page.getByRole("dialog", { name: "Nueva campaña" });
  await dialog.getByRole("button", { name: "Guardar en este navegador" }).click();
  await expect(dialog.getByText("Completá nombre")).toBeVisible();
  await dialog.getByLabel(/^Nombre/).fill("QA Campaña de prueba");
  await dialog.getByLabel("Objetivo").selectOption("Generación de leads");
  await dialog.getByLabel("Plataforma").selectOption("LinkedIn Ads");
  await dialog.getByLabel("Audiencia").fill("Compras industriales QA");
  await dialog.getByLabel("Presupuesto del período (ARS)").fill("500000");
  await dialog.getByLabel(/^Estado/).selectOption("Activa");
  await dialog.getByLabel("Responsable").selectOption("Martín Ledesma");
  await dialog.getByLabel(/^Inicio/).fill("2026-11-20");
  await dialog.getByRole("button", { name: "Guardar en este navegador" }).click();
  await expect(dialog).toHaveCount(0);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("avans-os:preview:v1:client:epsa:module:publicidad-digital:campanas") || "null")?.value);
  const created = stored.find((record: { values: { nombre: string } }) => record.values.nombre === "QA Campaña de prueba");
  expect(created).toMatchObject({ client: "epsa", module: "publicidad-digital", source: "manual", user: "Nicolás Okro" });
  expect(created.history.length).toBeGreaterThan(0);
  expect(created.updatedAt).toBeTruthy();

  await page.reload();
  await page.getByRole("button", { name: "QA Campaña de prueba" }).click();
  await expect(page).toHaveURL(/campana=CMP-/);
  await expect(page.getByRole("heading", { name: "QA Campaña de prueba", level: 2 })).toBeVisible();
  await expect(page.getByText("no está conectada a esta preview", { exact: false })).toBeVisible();

  // Isolation: ACA never sees the EPSA campaign.
  await page.goto("/v2/clientes/aca/campanas?seccion=campanas");
  await expect(page.getByRole("button", { name: "Captación de socios · Meta" })).toBeVisible();
  await expect(page.getByText("QA Campaña de prueba")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("module Kanban shows only its own tasks; a task created in a module is the same task in the client view", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto("/v2/clientes/epsa/campanas?seccion=tareas");
  const paidBoard = page.getByLabel("Kanban de Publicidad digital");
  await expect(paidBoard.getByRole("button", { name: /^T-143 / })).toBeVisible();
  await expect(paidBoard.getByRole("button", { name: /^T-146 / })).toBeVisible();
  await expect(paidBoard.getByRole("button", { name: /^T-142 / })).toHaveCount(0);
  await expect(paidBoard.getByRole("button", { name: /^T-403 / })).toHaveCount(0);

  await page.goto("/v2/clientes/epsa/contenido?seccion=tareas");
  const contentBoard = page.getByLabel("Kanban de Contenidos");
  for (const id of ["T-142", "T-144", "T-147"]) await expect(contentBoard.getByRole("button", { name: new RegExp(`^${id} `) })).toBeVisible();
  await expect(contentBoard.getByRole("button", { name: /^T-143 / })).toHaveCount(0);

  // Create inside Publicidad digital, linked to a campaign.
  await page.goto("/v2/clientes/epsa/campanas?seccion=tareas");
  await page.getByRole("button", { name: "Nueva tarea" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Nueva tarea" });
  await expect(dialog.getByText("Publicidad digital", { exact: true })).toBeVisible();
  await dialog.getByLabel(/^Título/).fill("QA tarea de pauta única");
  await dialog.getByLabel("Campaña (opcional)").selectOption({ label: "Line Up · Generación de demanda" });
  await dialog.getByLabel("Entregable del alcance (opcional)").selectOption("Optimización");
  await dialog.getByRole("button", { name: "Crear tarea" }).click();
  await expect(dialog).toHaveCount(0);
  const card = page.getByLabel("Kanban de Publicidad digital").getByRole("button", { name: /QA tarea de pauta única/ });
  await expect(card).toBeVisible();
  const id = (await card.getAttribute("aria-label"))!.split(" ")[0];

  const store = await workspace(page);
  const matches = store.tasks.filter((task: { title: string }) => task.title === "QA tarea de pauta única");
  expect(matches).toHaveLength(1);
  expect(matches[0]).toMatchObject({ id, serviceId: "publicidad-digital", deliverable: "Optimización", workItem: { id: "CMP-EPSA-01" } });

  await page.goto("/v2/clientes/epsa/tareas");
  const rows = page.getByRole("table", { name: "Tareas de EPSA / Line Up" }).locator(`tr[data-task-id="${id}"]`);
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText("Publicidad digital");
  await expect(rows).toContainText("Line Up · Generación de demanda");
  await rows.getByRole("link", { name: "QA tarea de pauta única" }).click();
  await expect(page).toHaveURL(new RegExp(`/v2/clientes/epsa/campanas\\?seccion=tareas&task=${id}`));
  await expect(page.getByRole("dialog", { name: new RegExp(`${id} QA tarea de pauta única`) })).toBeVisible();

  // Isolation: ACA tasks never include it.
  await page.goto("/v2/clientes/aca/tareas");
  await expect(page.getByText("QA tarea de pauta única")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("archived filter, legacy migration, inactive module state and read-only role", async ({ page }) => {
  const errors = errorsOf(page);
  // Legacy persisted state without serviceId is migrated in place, without losing tasks.
  await page.goto("/v2");
  // Wait for the store to hydrate and write the seed, so the legacy payload is not overwritten.
  await expect.poll(async () => Boolean(await workspace(page))).toBe(true);
  await page.evaluate(() => {
    const legacy = {
      version: 1,
      savedAt: new Date().toISOString(),
      value: {
        tasks: [
          { id: "T-142", projectSlug: "lanzamiento-line-up-2027", title: "Definir key visual de campaña", owner: "Tomás Aguirre", prio: "Alta", due: "30 oct", dueKind: "today", status: "En aprobación", desc: "x", files: [], comments: [], activity: [] },
          { id: "T-999", projectSlug: "performance-always-on", title: "Tarea anterior sin módulo", owner: "Sofía Ramírez", prio: "Media", due: "6 nov", dueKind: "week", status: "Por hacer", desc: "x", files: [], comments: [], activity: [] },
          { id: "T-140", projectSlug: "lanzamiento-line-up-2027", title: "Kickoff con el comité de marketing", owner: "Valentina Ríos", prio: "Media", due: "3 oct", dueKind: "past", status: "Hecho", completedAt: "2026-10-03T15:00:00.000Z", desc: "x", files: [], comments: [], activity: [] },
        ],
        seq: 150, role: "admin", services: {}, ideas: [], ideaSeq: 40,
      },
    };
    localStorage.setItem("avans-os:preview:v1:workspace", JSON.stringify(legacy));
  });
  await page.goto("/v2/clientes/epsa/estrategia?seccion=tareas");
  await expect.poll(async () => (await workspace(page))?.tasks?.map((task: { id: string; serviceId: string }) => `${task.id}:${task.serviceId}`)).toEqual(["T-142:contenidos", "T-999:publicidad-digital", "T-140:estrategia"]);
  await expect(page.getByRole("button", { name: /^T-140 / })).toHaveCount(0);
  await page.getByRole("button", { name: "Archivadas (1)" }).click();
  await expect(page.getByLabel("Kanban de Estrategia y coordinación").getByRole("button", { name: /^T-140 / })).toBeVisible();
  await page.goto("/v2/clientes/aca/campanas?seccion=tareas");
  await expect(page.getByLabel("Kanban de Publicidad digital").getByRole("button", { name: /^T-999 / })).toBeVisible();

  // Inactive module: restricted state, nothing deleted.
  await page.goto("/v2/clientes/aca/estrategia");
  await expect(page.getByRole("heading", { name: "Estrategia y coordinación no está activo para ACA" })).toBeVisible();
  await expect(page.getByText("Ningún dato se borra", { exact: false })).toBeVisible();

  // Operative preview role, not assigned to Grupo Portland: read only.
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("avans-os:preview:v1:workspace")!);
    raw.value.role = "operativo";
    localStorage.setItem("avans-os:preview:v1:workspace", JSON.stringify(raw));
  });
  await page.goto("/v2/clientes/grupo-portland/desarrollo-web?seccion=proyectos");
  await expect(page.getByRole("button", { name: "Nuevo proyecto web" })).toBeDisabled();
  await expect(page.getByText("los permisos son visuales", { exact: false }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("contenidos, estrategia, web and audiovisual workspaces show their own objects", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto("/v2/clientes/epsa/contenido");
  const contentNav = sectionNav(page, "Contenidos");
  for (const label of ["Calendario", "Piezas", "Ejes temáticos", "Ideas", "Tareas", "Resultados", "Entregables y aprobaciones", "Historial"]) {
    await expect(contentNav.getByRole("link", { name: new RegExp(`^${label}`) })).toBeVisible();
  }
  await contentNav.getByRole("link", { name: "Calendario" }).click();
  await expect(page.getByRole("grid", { name: /Calendario editorial · Noviembre de 2026/ })).toBeVisible();
  await page.getByRole("button", { name: /Teaser del lanzamiento Line Up/ }).click();
  const panel = page.getByRole("dialog", { name: /pieza: Teaser del lanzamiento Line Up/ });
  await panel.getByRole("button", { name: "Aprobar" }).click();
  await expect(panel.getByText("Programada").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("group", { name: "Vista del calendario" }).getByRole("button", { name: "Semana" }).click();
  await expect(page.getByText(/Semana del/)).toBeVisible();

  await page.goto("/v2/clientes/epsa/estrategia?seccion=seguimiento");
  const tracking = page.getByRole("table", { name: "Seguimiento de módulos de EPSA / Line Up" });
  await expect(tracking.getByRole("row")).toHaveCount(4);
  await page.goto("/v2/clientes/epsa/estrategia?seccion=recomendaciones");
  await expect(page.getByRole("heading", { name: "Recomendaciones consolidadas" })).toBeVisible();
  await expect(page.getByText("Sin conexión")).toBeVisible();
  await page.getByRole("button", { name: "Nueva recomendación" }).click();
  await page.getByLabel(/^Recomendación/).fill("QA recomendación manual");
  await page.getByRole("button", { name: "Guardar en este navegador" }).click();
  await page.reload();
  await expect(page.getByText("QA recomendación manual")).toBeVisible();

  await page.goto("/v2/clientes/grupo-portland/desarrollo-web?seccion=sitemap");
  await expect(page.getByRole("list", { name: "Sitemap" }).getByText("Unidad operativa")).toBeVisible();
  await page.goto("/v2/clientes/edinovo/audiovisuales");
  await expect(page.getByRole("list", { name: "Producciones por etapa" })).toContainText("Serie educativa 2026");
  expect(errors).toEqual([]);
});

for (const [name, width, height] of [["desktop", 1440, 900], ["notebook", 1280, 800], ["tablet", 820, 1180], ["mobile", 390, 844]] as const) {
  test(`responsive ${name}: modules, client tasks and reports without horizontal overflow`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    const errors = errorsOf(page);
    for (const path of [
      "/v2/clientes/epsa/campanas",
      "/v2/clientes/epsa/campanas?seccion=tareas",
      "/v2/clientes/epsa/contenido?seccion=calendario",
      "/v2/clientes/epsa/tareas",
      "/v2/clientes/epsa?view=reportes",
      "/v2/clientes/epsa?view=reportes&reporte=publicidad",
      "/v2/clientes/grupo-portland/desarrollo-web",
    ]) {
      await page.goto(path);
      await expect(page.locator("main").first()).toBeVisible();
      await noOverflow(page);
      await page.screenshot({ path: testInfo.outputPath(`${name}-${path.replace(/[^a-z0-9]+/gi, "_")}.png`), fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}
