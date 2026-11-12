import { test, expect, type Page } from "@playwright/test";
import { docxFixture, pptxFixture, pdfFixture } from "./intake-fixtures";
test.setTimeout(90000);
async function state(page: Page, slug = "epsa") {
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
async function open(page: Page) {
  await page.goto("/v2/clientes/epsa?view=ficha");
  await page.getByRole("tab", { name: "Discovery del negocio" }).click();
  await page
    .getByRole("button", { name: "Cuestionario inicial", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Cuestionario inicial · EPSA / Line Up",
    }),
  ).toBeVisible();
}
async function details(page: Page, id: string) {
  const locator = page.locator(`#${id}`);
  if (!(await locator.getAttribute("open")))
    await locator.locator("summary").first().click();
  return locator;
}
test("source intake extracts PDF, DOCX, PPTX and pasted text; duplicate, empty, unsupported and corrupt files show errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await page
    .getByRole("button", { name: "Cargar información", exact: true })
    .click();
  const input = page.locator("#company-intake input[type=file]");
  await input.setInputFiles([
    { name: "empresa.pdf", mimeType: "application/pdf", buffer: pdfFixture() },
    {
      name: "empresa.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: docxFixture(),
    },
    {
      name: "empresa.pptx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      buffer: pptxFixture(),
    },
  ]);
  await expect
    .poll(
      async () =>
        ((await state(page))?.sources ?? []).filter(
          (s: { intake?: unknown }) => s.intake,
        ).length,
      { timeout: 30000 },
    )
    .toBe(3);
  const sources = (await state(page)).sources.filter(
    (s: { intake?: unknown }) => s.intake,
  );
  expect(
    sources.every(
      (s: { intake: { status: string } }) => s.intake.status === "ready",
    ),
  ).toBe(true);
  expect(
    sources.find((s: { title: string }) => s.title === "empresa.pdf").rawText,
  ).toContain("Empresa PDF QA");
  await input.setInputFiles({
    name: "duplicado.docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: docxFixture(),
  });
  await expect(
    page.getByText(/Archivo duplicado: ya existe en este cliente/),
  ).toBeVisible();
  expect(
    (await state(page)).sources.filter((s: { intake?: unknown }) => s.intake),
  ).toHaveLength(3);
  await input.setInputFiles([
    {
      name: "programa.exe",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("MZ-executable"),
    },
    { name: "vacio.txt", mimeType: "text/plain", buffer: Buffer.from("") },
    {
      name: "roto.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nthis is corrupt"),
    },
  ]);
  await expect
    .poll(
      async () =>
        ((await state(page))?.sources ?? []).filter(
          (s: { intake?: { status: string } }) => s.intake?.status === "failed",
        ).length,
    )
    .toBe(3);
  const upload = page.locator("#company-intake");
  await upload
    .getByText("Pegar texto, agregar URL o registrar fuente manual", {
      exact: true,
    })
    .click();
  await upload
    .getByLabel("Título de la fuente", { exact: true })
    .fill("Texto comercial QA");
  await upload
    .getByLabel("Texto disponible", { exact: true })
    .fill("Cobertura: Argentina. Información provista por la empresa.");
  await upload
    .getByRole("button", { name: "Registrar fuente", exact: true })
    .click();
  await expect
    .poll(async () =>
      (await state(page)).sources.some(
        (s: { title: string }) => s.title === "Texto comercial QA",
      ),
    )
    .toBe(true);
  await page.reload();
  await page.getByRole("tab", { name: "Discovery del negocio" }).click();
  await page
    .getByRole("button", { name: "Cuestionario inicial", exact: true })
    .click();
  expect(
    (await state(page)).sources.find(
      (s: { title: string }) => s.title === "Texto comercial QA",
    ).rawText,
  ).toContain("Cobertura");
  expect(errors).toEqual([]);
});
test("suggestions expose evidence and conflicts; edit, approve, reject and ask-client preserve local answers", async ({
  page,
}) => {
  await open(page);
  const sources = await details(page, "processed-sources");
  await sources
    .getByRole("button", { name: "Probar sugerencias DEMO" })
    .click();
  await expect
    .poll(async () => (await state(page))?.answerSuggestions?.length)
    .toBe(5);
  await page
    .getByRole("button", { name: "Revisar sugerencias", exact: true })
    .click();
  const suggestions = page.locator("#answer-suggestions");
  const coverage = suggestions
    .getByRole("heading", { name: "¿Qué cobertura tiene?", exact: true })
    .first()
    .locator("..");
  await coverage.getByText("Ver evidencia", { exact: true }).click();
  await expect(
    coverage.getByText("Cobertura: Argentina y Uruguay", { exact: true }),
  ).toBeVisible();
  await expect(
    coverage.getByText("Conflicto: requiere decisión del PM"),
  ).toBeVisible();
  await coverage
    .getByRole("button", { name: "Editar antes de aprobar" })
    .click();
  await page
    .getByRole("dialog", { name: "Editar respuesta sugerida" })
    .getByRole("textbox", { name: "Respuesta propuesta", exact: true })
    .fill("Cobertura revisada QA");
  await page
    .getByRole("button", { name: "Guardar sugerencia", exact: true })
    .click();
  expect(
    (await state(page)).questionnaire.responses["companyProfile.coverage"],
  ).toBeUndefined();
  await coverage
    .getByLabel(
      "Revisé este cambio y las fuentes en conflicto o de alto impacto",
    )
    .check();
  await coverage
    .getByRole("button", { name: "Aprobar respuesta", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await state(page)).questionnaire.responses["companyProfile.coverage"]
          ?.value,
    )
    .toBe("Cobertura revisada QA");
  const other = suggestions
    .getByRole("heading", { name: "¿Qué cobertura tiene?", exact: true })
    .locator("..");
  await other.getByRole("button", { name: "Rechazar respuesta" }).click();
  const activity = suggestions
    .getByRole("heading", {
      name: "¿A qué se dedica concretamente?",
      exact: true,
    })
    .locator("..");
  await activity.getByRole("button", { name: "Preguntar al cliente" }).click();
  await page.reload();
  await page.getByRole("tab", { name: "Discovery del negocio" }).click();
  await page
    .getByRole("button", { name: "Cuestionario inicial", exact: true })
    .click();
  await expect(
    page.getByLabel("¿Qué cobertura tiene?", { exact: true }),
  ).toHaveValue("Cobertura revisada QA");
  expect(
    (await state(page)).questionnaire.responses["companyProfile.activity"]
      .clarification,
  ).toContain("consulta al cliente");
  await page.goto("/v2/clientes/aca?view=ficha");
  expect(await state(page, "aca")).toBeUndefined();
});
test("blank and filled print are independent A4 Avans documents with pagination and no app chrome", async ({
  page,
}) => {
  await open(page);
  await page
    .getByLabel("¿Qué cobertura tiene?", { exact: true })
    .fill("RESPUESTA PRIVADA QA");
  await page
    .getByRole("button", { name: "Guardar respuestas", exact: true })
    .click();
  await page.goto("/v2/clientes/epsa/discovery/questionnaire/print?mode=blank");
  await expect(
    page.getByRole("heading", { name: "Cuestionario inicial", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Datos de demostración", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("RESPUESTA PRIVADA QA", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Avans" }).first()).toBeVisible();
  await page.emulateMedia({ media: "print" });
  const sections = page.locator("main>section");
  const count = await sections.count();
  const pdf = await page.pdf({
    path: "/tmp/avans-questionnaire-blank.pdf",
    preferCSSPageSize: true,
    printBackground: true,
    displayHeaderFooter: false,
  });
  expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  expect((pdf.toString("latin1").match(/\/Type \/Page\b/g) || []).length).toBe(
    count,
  );
  const overflow = await page.locator("[data-print-page]").evaluateAll(
    (pages) =>
      pages.filter((page) => {
        const footer = page.querySelector("footer")!.getBoundingClientRect();
        const questions = page.querySelectorAll("article");
        return [...questions].some(
          (q) => q.getBoundingClientRect().bottom > footer.top - 8,
        );
      }).length,
  );
  expect(overflow).toBe(0);
  await page.screenshot({
    path: "/tmp/avans-questionnaire-print.png",
    fullPage: false,
  });
  await page.emulateMedia({ media: "screen" });
  await page.goto(
    "/v2/clientes/epsa/discovery/questionnaire/print?mode=filled",
  );
  await expect(
    page.getByText("RESPUESTA PRIVADA QA", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Borrador", { exact: true }).first(),
  ).toBeVisible();
  await page.emulateMedia({ media: "print" });
  const filled = await page.pdf({
    path: "/tmp/avans-questionnaire-filled.pdf",
    preferCSSPageSize: true,
    printBackground: true,
  });
  expect(
    (filled.toString("latin1").match(/\/Type \/Page\b/g) || []).length,
  ).toBe(await page.locator("main>section").count());
});
test("presentation readiness, generated PPTX versions, documents history, blocked Google export and mobile regression", async ({
  page,
  request,
}) => {
  await open(page);
  const prep = await details(page, "presentation-preparation");
  await expect(prep.getByText(/Versión para cliente bloqueada/)).toBeVisible();
  await expect(
    prep.getByRole("button", { name: "Crear en Google Slides" }),
  ).toBeDisabled();
  for (const version of [1, 2]) {
    await prep.getByRole("button", { name: "Generar presentación" }).click();
    const studio = page.getByRole("dialog", { name: /Marketing Discovery/ });
    await expect(
      studio.getByRole("radio", { name: /Versión final para cliente/ }),
    ).toBeDisabled();
    await studio.getByRole("button", { name: "Generar borrador" }).click();
    await expect(
      studio.getByText(`Presentación generada · versión ${version}`),
    ).toBeVisible({ timeout: 60000 });
    await expect(
      studio
        .locator("button[aria-label^='Ampliar slide']")
        .getByText("BORRADOR INTERNO — NO ENVIAR AL CLIENTE", { exact: true }),
    ).toBeVisible();
    await studio.getByRole("button", { name: "Cerrar presentación" }).click();
  }
  expect(
    (await state(page)).presentationExports.map(
      (e: { version: number; format: string }) => `${e.format}-${e.version}`,
    ),
  ).toEqual(["pptx-1", "pptx-2"]);
  await page.getByRole("link", { name: /^Documentos / }).click();
  await page
    .getByRole("button", { name: "Presentaciones generadas", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Abrir v1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir v2" })).toBeVisible();
  expect(
    (
      await request.post("/api/presentations/create-google-slides", {
        data: { clientSlug: "epsa" },
      })
    ).status(),
  ).toBe(503);
  expect(
    (
      await request.post("/api/presentations/export-pptx", {
        data: { clientSlug: "epsa" },
      })
    ).status(),
  ).toBe(503);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "/v2",
    "/v2/operaciones",
    "/v2/clientes",
    "/v2/clientes/epsa?view=ficha",
    "/v2/clientes/epsa?view=benchmark",
    "/v2/clientes/epsa?view=plan",
    "/v2/clientes/epsa?view=reportes",
    "/v2/clientes/epsa?view=documentos",
    "/v2/mis-tareas",
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
  await open(page);
  await details(page, "company-intake");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/avans-intake-mobile.png",
    fullPage: true,
  });
});
