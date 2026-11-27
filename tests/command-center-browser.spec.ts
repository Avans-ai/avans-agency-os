import { test, expect } from "@playwright/test";

test("Inicio de Operaciones muestra tareas, alertas y clientes; no muestra responsabilidades del equipo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/v2");

  const tasks = page.locator('section[aria-labelledby="home-tasks-title"]');
  const alerts = page.locator("#atencion");
  const clients = page.locator('section[aria-labelledby="assigned-clients-title"]');

  await expect(tasks.getByRole("heading", { name: "Tareas pendientes" })).toBeVisible();
  await expect(alerts.getByRole("heading", { name: "Alertas y temas que requieren tu atención" })).toBeVisible();
  await expect(clients.getByRole("heading", { name: "Clientes asignados" })).toBeVisible();
  await expect(page.getByText("Responsabilidades del equipo", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Ver por responsable", { exact: true })).toHaveCount(0);

  const [taskBox, alertBox, clientBox, gridBox] = await Promise.all([
    tasks.boundingBox(),
    alerts.boundingBox(),
    clients.boundingBox(),
    page.locator(".homeGrid").boundingBox(),
  ]);
  expect(taskBox && alertBox && clientBox && gridBox).toBeTruthy();
  expect(Math.abs(taskBox!.y - alertBox!.y)).toBeLessThan(2);
  expect(clientBox!.y).toBeGreaterThan(Math.max(taskBox!.y + taskBox!.height, alertBox!.y + alertBox!.height) - 1);
  expect(Math.abs(clientBox!.width - gridBox!.width)).toBeLessThan(2);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(tasks.getByRole("heading", { name: "Tareas pendientes" })).toBeVisible();
  await expect(alerts.getByRole("heading", { name: "Alertas y temas que requieren tu atención" })).toBeVisible();
  await expect(clients.getByRole("heading", { name: "Clientes asignados" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});
