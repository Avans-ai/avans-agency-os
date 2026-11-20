import { test, expect } from "@playwright/test";
import { osTasks } from "../app/v2/os/os-data";
import { contentDemoSeedsFor, CONTENT_DEMO_LABEL } from "../app/v2/os/modules/content-demo";
import { contentDemoRecords, resetContentDemo, withContentDemoTasks } from "../app/v2/os/modules/content-demo-tasks";
import { CONTENT_FLOW, CONTENT_STATES, clientRequests, contentComments, contentState, contentTransitions, preproductionChecklist } from "../app/v2/os/modules/content-workflow";
import { demoSeedsFor } from "../app/v2/os/modules/demo-fixtures";

const pieces = () => contentDemoRecords("aca", "contenidos", "piezas");

test("demo ACA: plan de diciembre, al menos cuatro ejes, contenidos en todas las etapas y rotulados como demostración", () => {
  const plans = contentDemoSeedsFor("aca", "contenidos", "planes")!;
  expect(plans.map((plan) => plan.nombre)).toContain("Diciembre 2026 — ACA");
  const axes = contentDemoSeedsFor("aca", "contenidos", "ejes")!.filter((axis) => axis.plan === "PLAN-ACA-2026-12");
  expect(axes.length).toBeGreaterThanOrEqual(4);
  for (const axis of axes) expect(axis).toMatchObject({ nombre: expect.any(String), descripcion: expect.any(String), objetivo: expect.any(String), perfil: expect.any(String), relacionPlan: expect.any(String), cantidad: expect.any(String) });
  const records = pieces();
  const states = new Set(records.map(contentState));
  for (const state of CONTENT_STATES) expect(states.has(state), state).toBe(true);
  const december = records.filter((record) => record.values.fecha?.startsWith("2026-12"));
  expect(december.length).toBeGreaterThanOrEqual(14);
  expect(new Set(december.map((record) => record.values.fecha)).size).toBeGreaterThanOrEqual(12);
  for (const channel of ["Instagram", "Facebook", "LinkedIn", "TikTok", "YouTube", "Blog", "Newsletter"]) expect(december.some((record) => record.values.canal === channel), channel).toBe(true);
  expect(records.every((record) => record.source === "demo" && record.values.demo === CONTENT_DEMO_LABEL)).toBe(true);
  expect(records.some((record) => clientRequests(record.values).some((request) => request.type === "Testimonios"))).toBe(true);
  expect(contentDemoSeedsFor("aca", "contenidos", "ideas")!.length).toBeGreaterThanOrEqual(6);
  // Otros clientes conservan sus semillas anteriores.
  expect(demoSeedsFor("epsa", "contenidos", "piezas").map((seed) => seed.id)).toContain("PZA-EPSA-01");
  expect(contentDemoSeedsFor("epsa", "contenidos", "piezas")).toBeUndefined();
});

test("demo ACA: historial generado con el flujo real, comentarios versionados, preproducción y un pedido de diseño por contenido", () => {
  const records = pieces();
  const first = records.find((record) => record.id === "PZA-ACA-D01")!;
  expect(contentState(first)).toBe("Programado");
  const comments = contentComments(first);
  expect(comments.find((comment) => comment.text.startsWith("Separemos"))).toMatchObject({ version: "Propuesta v1", kind: "client-review", visibility: "client" });
  expect(comments.find((comment) => comment.text.startsWith("Subir contraste"))).toMatchObject({ version: "Diseño v1", kind: "internal-review" });
  expect(new Set(contentTransitions(first).map((entry) => entry.taskId))).toEqual(new Set(["CONTENT-aca-PZA-ACA-D01"]));
  const adjusted = records.find((record) => record.id === "PZA-ACA-D12")!;
  expect(JSON.parse(adjusted.values.contentChanges)[0]).toMatchObject({ requestedBy: "Cliente · ACA", fields: expect.arrayContaining(["copy preliminar"]) });
  expect(preproductionChecklist(records.find((record) => record.id === "PZA-ACA-D08")!.values).ready).toBe(false);
  expect(preproductionChecklist(records.find((record) => record.id === "PZA-ACA-D07")!.values).ready).toBe(true);
  const requests = contentDemoSeedsFor("aca", "diseno-marca", "trabajos")!;
  expect(requests.every((request) => request.id === `DIS-${request.contenidoId}` && request.tareaId)).toBe(true);
  expect(new Set(requests.map((request) => request.contenidoId)).size).toBe(requests.length);
  expect(requests.find((request) => request.contenidoId === "PZA-ACA-D07")).toMatchObject({ estado: "En curso", consideraciones: expect.stringContaining("Placas") });
  const library = contentDemoSeedsFor("aca", "diseno-marca", "biblioteca")!;
  expect(library.filter((item) => item.contenidoId === "PZA-ACA-D01").map((item) => item.versionContenido)).toEqual(["v1", "v2"]);
  expect(library.every((item) => item.archivo.startsWith("data:image/png;base64,"))).toBe(true);
  expect(CONTENT_FLOW).toHaveLength(8);
});

test("demo ACA: una tarea por contenido sin duplicar la tarea anterior y reinicio que conserva lo manual", () => {
  const tasks = withContentDemoTasks(osTasks, false);
  const linked = (id: string) => tasks.filter((task) => task.workItem?.id === id);
  expect(linked("PZA-ACA-03").map((task) => task.id)).toEqual(["T-405"]);
  expect(linked("PZA-ACA-D07")).toHaveLength(1);
  expect(linked("PZA-ACA-D07")[0]).toMatchObject({ id: "CONTENT-aca-PZA-ACA-D07", owner: "Tomás Aguirre", serviceId: "diseno-marca", clientSlug: "aca" });
  expect(linked("PZA-ACA-D10")[0]).toMatchObject({ owner: "Cliente · ACA", status: "En aprobación" });
  expect(withContentDemoTasks(tasks, false)).toHaveLength(tasks.length);
  const manualTask = { ...tasks[0], id: "T-MANUAL" };
  const reset = resetContentDemo("aca", [...tasks.map((task) => task.id === "CONTENT-aca-PZA-ACA-D07" ? { ...task, owner: "Otra persona" } : task), manualTask]);
  expect(reset.tasks.find((task) => task.id === "CONTENT-aca-PZA-ACA-D07")!.owner).toBe("Tomás Aguirre");
  expect(reset.tasks.filter((task) => task.workItem?.id === "PZA-ACA-D07")).toHaveLength(1);
  expect(reset.tasks.some((task) => task.id === "T-MANUAL")).toBe(true);
});
