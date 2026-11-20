import { test, expect, type Page } from "@playwright/test";
test.use({ actionTimeout: 15000 });

const KEY = "avans-os:preview:v1:";
type Rec = { id: string; values: Record<string, string> };
type Task = { id: string; owner: string; status: string; workItem?: { id: string; collection: string } };
type Note = { id: string; recipient: string; href: string; taskId: string };

function errorsOf(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}
async function local<T>(page: Page, key: string): Promise<T> {
  return page.evaluate(({ key, prefix }) => JSON.parse(localStorage.getItem(`${prefix}${key}`) || "null")?.value, { key, prefix: KEY });
}
async function boot(page: Page) {
  await page.goto("/v2");
  await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem("avans-os:preview:v1:workspace")))).toBe(true);
}
async function setRole(page: Page, role: string) {
  await page.evaluate(({ role, prefix }) => {
    const workspace = JSON.parse(localStorage.getItem(`${prefix}workspace`)!);
    workspace.value.role = role;
    localStorage.setItem(`${prefix}workspace`, JSON.stringify(workspace));
  }, { role, prefix: KEY });
}
async function setProvider(page: Page, id: string) {
  await page.evaluate(({ id, prefix }) => localStorage.setItem(`${prefix}providers:preview-identity`, JSON.stringify({ version: 1, value: id, savedAt: new Date().toISOString() })), { id, prefix: KEY });
}
const jornadas = (page: Page) => local<Rec[]>(page, "client:edinovo:module:audiovisuales:jornadas");
const workspace = (page: Page) => local<{ tasks: Task[]; notifications: Note[] }>(page, "workspace");
const tasksOf = async (page: Page, id: string) => (await workspace(page)).tasks.filter((task) => task.workItem?.collection === "jornadas" && task.workItem.id === id);
function plusDays(days: number) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

test("crear jornada con proveedor del catálogo, cupo usado/disponible y validación bloqueada sin jornadas", async ({ page }) => {
  const errors = errorsOf(page);
  await boot(page);
  await page.goto("/v2/clientes/edinovo/audiovisuales");
  const quota = page.getByRole("region", { name: "Jornadas usadas y disponibles" });
  await expect(quota).toContainText("disponibles de 6");
  await expect(quota.getByRole("img")).toHaveAttribute("aria-label", "5 usadas, 1 a validar, 1 disponibles de 6");
  // Una tarea por jornada de demostración, sembrada una sola vez.
  await expect.poll(async () => (await workspace(page)).tasks.filter((task) => task.id.startsWith("AV-edinovo-")).length).toBe(6);

  await page.getByRole("navigation", { name: "Secciones de Audiovisuales" }).getByRole("link", { name: "Jornadas" }).click();
  await page.getByRole("button", { name: "Nueva jornada" }).click();
  const form = page.getByRole("dialog", { name: "Nueva jornada" });
  await expect(form.getByText("Quedan 1 de 6 jornadas")).toBeVisible();
  await form.getByText("UGC", { exact: true }).click();
  await expect(form.locator("label").filter({ hasText: "Estudio Bruma" })).toContainText("Recomendado para UGC");
  await form.locator("label").filter({ hasText: "Estudio Bruma" }).click();
  await form.getByLabel("Fecha de la jornada").fill("2026-12-04");
  await form.getByLabel("Nombre (opcional)").fill("QA testimonios de docentes");
  await form.getByLabel("Carpeta de Google Drive").fill("no-es-un-enlace");
  await form.getByRole("button", { name: "Crear jornada" }).click();
  await expect(page.getByText(/Pegá el enlace de la carpeta de Google Drive/)).toBeVisible();
  await form.getByLabel("Carpeta de Google Drive").fill("https://drive.google.com/drive/folders/qa-docentes");
  await form.getByRole("button", { name: "Crear jornada" }).click();

  const detail = page.getByRole("dialog", { name: "Jornada: QA testimonios de docentes" });
  await expect(detail).toBeVisible();
  const created = (await jornadas(page)).find((record) => record.values.titulo === "QA testimonios de docentes")!;
  expect(created.values).toMatchObject({ tipo: "UGC", proveedorId: "PRV-BRUMA", proveedor: "Estudio Bruma", estado: "Validación", drive: "https://drive.google.com/drive/folders/qa-docentes" });
  expect(await tasksOf(page, created.id)).toEqual([expect.objectContaining({ id: `AV-edinovo-${created.id}`, owner: "Lucía Benítez", status: "En aprobación" })]);
  expect((await workspace(page)).notifications.filter((note) => note.taskId === `AV-edinovo-${created.id}`)).toEqual([expect.objectContaining({ recipient: "Lucía Benítez" })]);
  await page.keyboard.press("Escape");

  // El PM valida la última jornada disponible: el cupo queda en 0.
  await page.getByRole("button", { name: "Abrir jornada Kit de bienvenida 2027" }).first().click();
  const kit = page.getByRole("dialog", { name: "Jornada: Kit de bienvenida 2027" });
  await kit.getByRole("button", { name: "Confirmar jornada disponible" }).click();
  await expect.poll(async () => (await jornadas(page)).find((record) => record.id === "JOR-EDI-05")!.values.estado).toBe("Agenda");
  await expect(page.getByRole("region", { name: "Jornadas usadas y disponibles" }).getByRole("img")).toHaveAttribute("aria-label", "6 usadas, 1 a validar, 0 disponibles de 6");
  await page.keyboard.press("Escape");

  // Sin jornadas disponibles la validación queda bloqueada.
  await page.getByRole("button", { name: "Abrir jornada QA testimonios de docentes" }).first().click();
  const blocked = page.getByRole("dialog", { name: "Jornada: QA testimonios de docentes" });
  await expect(blocked.getByRole("alert")).toContainText("No quedan jornadas disponibles");
  await expect(blocked.getByRole("button", { name: "Confirmar jornada disponible" })).toBeDisabled();
  expect((await workspace(page)).tasks.find((task) => task.id === `AV-edinovo-${created.id}`)).toMatchObject({ blocked: "Sin jornadas disponibles en el cupo contratado" });

  // El cupo se amplía desde la misma vista y la validación se habilita.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Editar cupo" }).click();
  await page.getByLabel("Jornadas contratadas por período").fill("8");
  await page.getByRole("button", { name: "Guardar cupo" }).click();
  await expect(page.getByRole("region", { name: "Jornadas usadas y disponibles" }).getByRole("img")).toHaveAttribute("aria-label", "6 usadas, 1 a validar, 2 disponibles de 8");
  await expect.poll(async () => (await workspace(page)).tasks.find((task) => task.id === `AV-edinovo-${created.id}`)).not.toHaveProperty("blocked", expect.any(String));
  expect(errors).toEqual([]);
});

test("etapas: una sola tarea reasignada con avisos, proveedor limitado a sus jornadas, plazo de edición, un pedido a Diseño y aprobación del cliente", async ({ page }) => {
  const errors = errorsOf(page);
  await boot(page);
  await page.goto("/v2/clientes/edinovo/audiovisuales?seccion=jornadas&jornada=JOR-EDI-03");
  const detail = () => page.getByRole("dialog", { name: "Jornada: Testimonios de alumnos" });
  await expect.poll(async () => (await tasksOf(page, "JOR-EDI-03")).length).toBe(1);
  await detail().getByLabel("Guion", { exact: true }).fill("Tres preguntas a cada alumno y cierre con logo.");
  await detail().getByRole("button", { name: "Enviar brief al proveedor" }).click();
  await expect.poll(async () => (await jornadas(page)).find((record) => record.id === "JOR-EDI-03")!.values.estado).toBe("Rodaje");
  expect(await tasksOf(page, "JOR-EDI-03")).toEqual([expect.objectContaining({ owner: "Estudio Bruma", status: "En curso" })]);
  expect((await workspace(page)).notifications.find((note) => note.recipient === "Estudio Bruma")).toMatchObject({ href: "/v2/proveedor?jornada=JOR-EDI-03" });

  // Proveedor externo (vista previa): solo sus jornadas y sin la gestión interna.
  await setRole(page, "provider");
  await setProvider(page, "PRV-BRUMA");
  await page.goto("/v2/clientes/edinovo/audiovisuales");
  await expect(page.getByText("Espacio del proveedor", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Abrir mis jornadas" }).click();
  await expect(page.getByText("permisos visuales del rol «Proveedor externo», no seguridad de servidor", { exact: false })).toBeVisible();
  const cards = page.getByRole("listitem").filter({ has: page.getByRole("heading", { level: 3 }) });
  await expect(cards).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Recorrido por el campus" })).toHaveCount(0);
  await expect(page.getByText("Avisos")).toBeVisible();
  const card = page.getByRole("listitem", { name: "Testimonios de alumnos" });
  await card.getByRole("button", { name: /Marcar material subido/ }).click();
  await expect(page.getByText("Cargá el plan de rodaje antes de marcar el material como subido.")).toBeVisible();
  await card.getByLabel("Plan de rodaje").fill("Cámara en mano, luz natural, 4 alumnos de 15 a 17 h.");
  await card.getByRole("button", { name: /Marcar material subido/ }).click();
  await expect.poll(async () => (await jornadas(page)).find((record) => record.id === "JOR-EDI-03")!.values.estado).toBe("Edición");
  const afterRaw = (await jornadas(page)).find((record) => record.id === "JOR-EDI-03")!;
  expect(afterRaw.values.fechaLimiteEdicion).toBe(plusDays(3));
  await expect(page.getByRole("listitem", { name: "Testimonios de alumnos" })).toContainText("Plazo de edición: 3 días");
  await page.getByRole("listitem", { name: "Testimonios de alumnos" }).getByRole("button", { name: /Marcar edición subida/ }).click();
  await expect.poll(async () => (await jornadas(page)).find((record) => record.id === "JOR-EDI-03")!.values.estado).toBe("Validación de Content");

  // Otro proveedor ve los comentarios compartidos con él, nunca los internos.
  await page.getByLabel("Ver como (vista previa)").selectOption("PRV-KINETICA");
  await expect(page.getByRole("listitem", { name: "Serie educativa · grabación del episodio 1" })).toContainText("Priorizar planos de los docentes");
  await expect(page.getByText(/Nota interna/)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Testimonios de alumnos" })).toHaveCount(0);

  // Content pide ajustes: vuelve al proveedor con plazo nuevo, sin duplicar la tarea.
  await setRole(page, "admin");
  await page.goto("/v2/clientes/edinovo/audiovisuales?seccion=jornadas&jornada=JOR-EDI-03");
  await detail().getByLabel(/Comentario para la acción/).fill("Sumar subtítulo con el nombre de cada alumno");
  await detail().getByRole("button", { name: "Pedir ajustes de edición" }).click();
  await expect.poll(async () => (await jornadas(page)).find((record) => record.id === "JOR-EDI-03")!.values.estado).toBe("Edición");
  await detail().getByRole("button", { name: "Marcar edición subida" }).click();
  await expect.poll(async () => (await jornadas(page)).find((record) => record.id === "JOR-EDI-03")!.values.edicionVersion).toBe("v2");
  await detail().getByRole("button", { name: "Validar edición y pedir subtítulos" }).click();
  await expect.poll(async () => (await jornadas(page)).find((record) => record.id === "JOR-EDI-03")!.values.estado).toBe("Subtítulos y motion");
  const design = await local<Rec[]>(page, "client:edinovo:module:diseno-marca:trabajos");
  expect(design.filter((record) => record.values.jornadaId === "JOR-EDI-03")).toEqual([expect.objectContaining({ id: "DIS-JOR-EDI-03", values: expect.objectContaining({ servicioOrigen: "audiovisuales", responsable: "Tomás Aguirre", tareaId: "AV-edinovo-JOR-EDI-03" }) })]);
  expect(await tasksOf(page, "JOR-EDI-03")).toEqual([expect.objectContaining({ owner: "Tomás Aguirre" })]);
  // Diseño de marca no está contratado: el pedido aparece como apoyo, sin activar el módulo.
  await page.goto("/v2/clientes/edinovo/diseno-marca?seccion=trabajos");
  await expect(page.getByRole("link", { name: "Abrir jornada de origen" })).toBeVisible();
  expect((await workspace(page)).tasks.filter((task) => task.workItem?.id === "DIS-JOR-EDI-03")).toHaveLength(0);

  await page.goto("/v2/clientes/edinovo/audiovisuales?seccion=jornadas&jornada=JOR-EDI-03");
  await detail().getByLabel("Enlace a la versión final con subtítulos y motion").fill("https://example.com/qa-testimonios-final");
  await detail().getByRole("button", { name: "Entregar subtítulos y motion" }).click();
  await expect.poll(async () => (await jornadas(page)).find((record) => record.id === "JOR-EDI-03")!.values.estado).toBe("Aprobación del cliente");
  const clientNote = (await workspace(page)).notifications.find((note) => note.recipient === "Cliente · Edinovo" && note.taskId === "AV-edinovo-JOR-EDI-03")!;
  expect(clientNote.href).toBe("/v2/portal/edinovo?jornada=JOR-EDI-03");

  // El cliente aprueba desde su front.
  await page.goto(clientNote.href);
  const portalCard = page.getByRole("listitem", { name: "Testimonios de alumnos" });
  await expect(portalCard.getByRole("link", { name: "Ver la pieza final con subtítulos y motion" })).toHaveAttribute("href", "https://example.com/qa-testimonios-final");
  await expect(page.getByText(/Nota interna|Sumar subtítulo con el nombre/)).toHaveCount(0);
  await portalCard.getByRole("button", { name: /Pedir cambios/ }).click();
  await expect(page.getByText("Contanos qué cambios necesitás.")).toBeVisible();
  await portalCard.getByRole("button", { name: /Aprobar jornada/ }).click();
  await expect.poll(async () => (await jornadas(page)).find((record) => record.id === "JOR-EDI-03")!.values.estado).toBe("Cerrada");

  const tasks = await tasksOf(page, "JOR-EDI-03");
  expect(tasks).toEqual([expect.objectContaining({ id: "AV-edinovo-JOR-EDI-03", status: "Hecho", owner: "Lucía Benítez" })]);
  const notes = (await workspace(page)).notifications.filter((note) => note.taskId === "AV-edinovo-JOR-EDI-03");
  expect(new Set(notes.map((note) => note.id)).size).toBe(notes.length);
  expect(notes.map((note) => note.recipient).reverse()).toEqual(["Estudio Bruma", "Estudio Bruma", "Lucía Benítez", "Estudio Bruma", "Lucía Benítez", "Tomás Aguirre", "Cliente · Edinovo", "Lucía Benítez"]);
  const finalDesign = (await local<Rec[]>(page, "client:edinovo:module:diseno-marca:trabajos")).filter((record) => record.values.jornadaId === "JOR-EDI-03");
  expect(finalDesign).toHaveLength(1);
  expect(finalDesign[0].values).toMatchObject({ estado: "Aprobado", operacion: "Aprobados" });
  expect((await local<Rec[]>(page, "client:edinovo:module:audiovisuales:entregas")).filter((record) => record.values.jornada === "JOR-EDI-03")).toHaveLength(1);
  expect(errors).toEqual([]);
});

test("aislamiento por cliente: otras cuentas no ven jornadas de Edinovo ni cambian sus datos", async ({ page }) => {
  const errors = errorsOf(page);
  await boot(page);
  const before = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.includes("client:aca:") || key.includes("client:epsa:")).sort());
  await page.goto("/v2/clientes/edinovo/audiovisuales?seccion=jornadas&jornada=JOR-EDI-05");
  await page.getByRole("dialog", { name: "Jornada: Kit de bienvenida 2027" }).getByRole("button", { name: "Confirmar jornada disponible" }).click();
  await expect.poll(async () => (await jornadas(page)).find((record) => record.id === "JOR-EDI-05")!.values.estado).toBe("Agenda");
  // EPSA no tiene Audiovisuales activo: su portal no muestra jornadas y su módulo no se puede operar.
  await page.goto("/v2/portal/epsa");
  await expect(page.getByRole("heading", { name: /jornada/i })).toHaveCount(0);
  await page.goto("/v2/clientes/epsa/audiovisuales");
  await expect(page.getByText("Audiovisuales no está activo para EPSA / Line Up")).toBeVisible();
  const after = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.includes("client:aca:") || key.includes("client:epsa:")).sort());
  expect(after.filter((key) => key.includes("audiovisuales"))).toEqual(before.filter((key) => key.includes("audiovisuales")));
  // El espacio del proveedor solo muestra jornadas de cuentas con el módulo activo.
  await setRole(page, "provider");
  await setProvider(page, "PRV-LUMEN");
  await page.goto("/v2/proveedor");
  await expect(page.getByRole("heading", { name: "Kit de bienvenida 2027" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Line Up · producto en uso" })).toHaveCount(0);
  await expect(page.getByText("Cliente: Edinovo").first()).toBeVisible();
  await expect(page.getByText("Cliente: EPSA")).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const [name, width, height] of [["desktop", 1440, 900], ["notebook", 1280, 800], ["tablet", 820, 1180], ["mobile", 390, 844]] as const) {
  test(`responsive ${name}: Audiovisuales, catálogo, portal y espacio del proveedor sin desborde horizontal`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    const errors = errorsOf(page);
    await boot(page);
    for (const path of ["/v2/clientes/edinovo/audiovisuales", "/v2/clientes/edinovo/audiovisuales?seccion=jornadas&jornada=JOR-EDI-02", "/v2/clientes/edinovo/audiovisuales?seccion=producciones", "/v2/proveedores", "/v2/portal/edinovo?jornada=JOR-EDI-04", "/v2/proveedor"]) {
      await page.goto(path);
      await expect(page.locator("main").first()).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${name}-${path.replace(/[^a-z0-9]+/gi, "_")}.png`), fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}
