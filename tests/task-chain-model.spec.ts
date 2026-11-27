/* Cadena de tareas por etapa (app/v2/os/workflow-tasks.ts): reglas del modelo sin navegador. */
import { test, expect } from "@playwright/test";
import { osClients, type OsTask } from "../app/v2/os/os-data";
import type { ModuleRecord } from "../app/v2/os/modules/types";
import { applyContentAction } from "../app/v2/os/modules/content-workflow";
import { applyStageTask, assignmentNotification, buildContentTask, chainTasks, contentOwner, contentStageTasks, contentTaskId, latestChainTask, ownerOrPending, stageSlug, UNASSIGNED_OWNER, upcomingNotifications, upsertTasks } from "../app/v2/os/workflow-tasks";
import { buildDesignTask, designStageTasks } from "../app/v2/os/modules/use-design-operations";
import { expectChain, openOf } from "./task-chain-helpers";

const AT = "2026-11-20T12:00:00.000Z";
const epsa = osClients.find((client) => client.slug === "epsa")!;
const aca = osClients.find((client) => client.slug === "aca")!;
function piece(client = "epsa", values: Record<string, string> = {}): ModuleRecord {
  return { id: "PZA-QA-CHAIN", client, module: "contenidos", collection: "piezas", source: "manual", user: "QA", createdAt: AT, updatedAt: AT, history: [], values: {
    titulo: "Carrusel: beneficios para socios", estado: "Borrador", eje: "EJE", idea: "Idea", bajada: "Bajada", copy: "Copy", canal: "Instagram", formato: "Carrusel", fecha: "2099-12-03",
    responsable: "Lucía Benítez", revisor: "Valentina Ríos", disenador: "Tomás Aguirre", ...values,
  } };
}
/** Aplica una acción del flujo y guarda la cadena como lo hace use-content-operations. */
function step(record: ModuleRecord, tasks: OsTask[], action: Parameters<typeof applyContentAction>[1], role: "content" | "pm" | "client" | "designer" = "pm", comment?: string, patch?: Record<string, string>) {
  const at = new Date(Date.parse(record.updatedAt) + 60000).toISOString();
  const next = applyContentAction(record, action, { actor: "QA", role: role === "pm" ? "pm" : role, comment, patch, at });
  const result = contentStageTasks(epsa, next, tasks, "QA", at);
  return { record: { ...next, values: { ...next.values, tareaId: result.current.id } }, tasks: upsertTasks(tasks, result.changed), result };
}

test("sending a draft to review completes the draft task and assigns the PM review with origin, stage and link", () => {
  const draft = piece();
  let tasks = contentStageTasks(epsa, draft, [], "QA", AT).changed;
  expect(tasks).toEqual([expect.objectContaining({ id: "CONTENT-epsa-PZA-QA-CHAIN", status: "Por hacer", owner: "Lucía Benítez", title: "Preparar propuesta · Carrusel: beneficios para socios", workflow: expect.objectContaining({ stage: "Borrador" }) })]);
  const sent = step(draft, tasks, "submit", "content");
  tasks = sent.tasks;
  expect(sent.result.created).toBe(true);
  expect(sent.result.completed).toMatchObject({ id: "CONTENT-epsa-PZA-QA-CHAIN", status: "Hecho", completedAt: expect.any(String) });
  expect(sent.result.current).toMatchObject({
    id: "CONTENT-epsa-PZA-QA-CHAIN-revision-interna-de-produccion-1", chainId: "CONTENT-epsa-PZA-QA-CHAIN", cycle: 1, previousTaskId: "CONTENT-epsa-PZA-QA-CHAIN",
    owner: "Valentina Ríos", approver: "Valentina Ríos", status: "En aprobación", clientSlug: "epsa", serviceId: "contenidos",
    title: "Revisar propuesta · Carrusel: beneficios para socios", workItem: { collection: "piezas", id: "PZA-QA-CHAIN", label: "Carrusel: beneficios para socios" },
    workflow: { kind: "content", stage: "Revisión interna de producción", href: "/v2/clientes/epsa/contenido?seccion=piezas&registro=PZA-QA-CHAIN" },
  });
  expect(contentTaskId("epsa", sent.record, tasks)).toBe(sent.result.current.id);
  // Repetir la misma etapa (resincronizar, recargar, comentar) actualiza la misma tarea: nada se duplica.
  const again = contentStageTasks(epsa, sent.record, tasks, "QA", AT);
  expect(again.created).toBe(false);
  expect(again.changed.map((task) => task.id)).toEqual([sent.result.current.id]);
  expect(upsertTasks(tasks, again.changed)).toHaveLength(2);
  const note = assignmentNotification(sent.result.current, AT)!;
  expect(assignmentNotification(again.current, AT)!.id).toBe(note.id);
});

test("requesting changes assigns the adjustment to the right person and every cycle keeps history and completed tasks", () => {
  let state = { record: piece(), tasks: contentStageTasks(epsa, piece(), [], "QA", AT).changed };
  state = step(state.record, state.tasks, "submit", "content");
  const changes = step(state.record, state.tasks, "request-changes", "pm", "Aclarar el beneficio");
  expect(changes.result.current).toMatchObject({ owner: "Lucía Benítez", title: "Ajustar propuesta · Carrusel: beneficios para socios", status: "Por hacer", workflow: expect.objectContaining({ stage: "Ajustes" }) });
  const resubmit = step(changes.record, changes.tasks, "resubmit", "content");
  expect(resubmit.result.current).toMatchObject({ id: "CONTENT-epsa-PZA-QA-CHAIN-revision-interna-de-produccion-2", cycle: 2, owner: "Valentina Ríos" });
  const chain = chainTasks(resubmit.tasks, "CONTENT-epsa-PZA-QA-CHAIN");
  expect(chain.map((task) => [task.workflow?.stage, task.status])).toEqual([["Borrador", "Hecho"], ["Revisión interna de producción", "Hecho"], ["Ajustes", "Hecho"], ["Revisión interna de producción", "En aprobación"]]);
  expectChain(chain);
  // Ajustes de diseño: los hace el diseñador asignado en el contenido.
  const design = piece("epsa", { estado: "Ajustes", returnState: "Revisión interna del diseño" });
  expect(buildContentTask(epsa, design, [], "QA", AT)).toMatchObject({ owner: "Tomás Aguirre", title: "Ajustar diseño · Carrusel: beneficios para socios", serviceId: "diseno-marca" });
});

test("advancing to design creates Design's task in Diseño de marca linked to the piece; the final stage closes the chain", () => {
  const ready = piece("epsa", { estado: "Preproducción", preCopyFinal: "Copy final", preIndicaciones: "Portada", preDimensiones: "1080 × 1350", preReferencias: "Ref" });
  const tasks = contentStageTasks(epsa, ready, [], "QA", AT).changed;
  const design = step(ready, tasks, "send-to-design", "content");
  expect(design.result.current).toMatchObject({ owner: "Tomás Aguirre", serviceId: "diseno-marca", title: "Diseñar pieza · Carrusel: beneficios para socios", workItem: { id: "PZA-QA-CHAIN" }, workflow: expect.objectContaining({ stage: "Producción de diseño" }) });
  expect(design.record.values.tareaId).toBe(design.result.current.id);
  // Etapa final: la tarea vigente se completa y queda un registro de cierre; repetirlo no crea otro.
  const approved = piece("epsa", { estado: "Aprobado" });
  let chain = contentStageTasks(epsa, approved, [], "QA", AT).changed;
  const scheduled = contentStageTasks(epsa, { ...approved, values: { ...approved.values, estado: "Programado" } }, chain, "QA", AT);
  chain = upsertTasks(chain, scheduled.changed);
  expect(openOf(chain)).toHaveLength(0);
  expect(chain.map((task) => task.title)).toEqual(["Programar publicación · Carrusel: beneficios para socios", "Publicación programada · Carrusel: beneficios para socios"]);
  expect(contentStageTasks(epsa, { ...approved, values: { ...approved.values, estado: "Publicada" } }, chain, "QA", AT).changed).toHaveLength(1);
});

test("design requests group Pendientes and En producción in one task and reopen with a new cycle", () => {
  const request: ModuleRecord = { id: "DIS-QA", client: "aca", module: "diseno-marca", collection: "trabajos", source: "manual", user: "QA", createdAt: AT, updatedAt: AT, history: [], values: { nombre: "Placa QA", operacion: "Pendientes", estado: "Pendiente", responsable: "Tomás Aguirre", revisor: "Valentina Ríos", fechaObjetivo: "2099-12-10" } };
  let tasks = designStageTasks(aca, request, [], "QA", AT).changed;
  expect(tasks).toEqual([expect.objectContaining({ id: "DESIGN-aca-DIS-QA", title: "Diseñar · Placa QA", owner: "Tomás Aguirre" })]);
  const producing = { ...request, values: { ...request.values, operacion: "En producción", estado: "En curso" } };
  const same = designStageTasks(aca, producing, tasks, "QA", AT);
  expect(same.created).toBe(false);
  tasks = upsertTasks(tasks, same.changed);
  const review = designStageTasks(aca, { ...producing, values: { ...producing.values, operacion: "En revisión interna", estado: "En curso" } }, tasks, "QA", AT);
  expect(review.current).toMatchObject({ id: "DESIGN-aca-DIS-QA-en-revision-interna-1", owner: "Valentina Ríos", title: "Revisar diseño · Placa QA" });
  tasks = upsertTasks(tasks, review.changed);
  const back = designStageTasks(aca, producing, tasks, "QA", AT);
  expect(back.current.id).toBe(`DESIGN-aca-DIS-QA-${stageSlug("Producción")}-2`);
  expect(buildDesignTask(aca, { ...request, values: { ...request.values, responsable: "" } }, undefined, "QA", AT).owner).toBe(UNASSIGNED_OWNER);
});

test("owners never invent people: undefined responsibles show «Pendiente de asignación»", () => {
  expect(ownerOrPending("Diseñador por asignar")).toBe(UNASSIGNED_OWNER);
  expect(ownerOrPending("")).toBe(UNASSIGNED_OWNER);
  expect(ownerOrPending("Lucía Benítez")).toBe("Lucía Benítez");
  // ACA no tiene diseñador en su equipo: la tarea de diseño queda pendiente de asignación.
  const record = piece("aca", { estado: "Producción de diseño", disenador: "" });
  expect(contentOwner(aca, record)).toBe(UNASSIGNED_OWNER);
  const task = buildContentTask(aca, record, [], "QA", AT);
  expect(task.owner).toBe(UNASSIGNED_OWNER);
  expect(assignmentNotification(task, AT)).toBeUndefined();
  expect(upcomingNotifications([{ ...task, due: "2026-11-20" }], AT)).toHaveLength(0);
});

test("legacy single tasks remain valid as the first task of the chain and the adaptation is idempotent", () => {
  // Tarea única anterior al modelo: reasignada por etapa, sin chainId, cycle ni createdAt.
  const legacy: OsTask = { id: "CONTENT-epsa-PZA-QA-CHAIN", clientSlug: "epsa", projectSlug: "contenidos-always-on-q4", serviceId: "contenidos", title: "Revisión interna de producción · Carrusel", owner: "Valentina Ríos", prio: "Alta", due: "2099-12-03", dueKind: "later", status: "En aprobación", desc: "", files: [], comments: [{ who: "Lucía Benítez", when: AT, text: "Comentario anterior" }], activity: [{ text: "Historial anterior", when: AT }], workItem: { collection: "piezas", id: "PZA-QA-CHAIN", label: "Carrusel" }, workflow: { kind: "content", stage: "Revisión interna de producción", href: "/v2/clientes/epsa/contenido?seccion=piezas&registro=PZA-QA-CHAIN" } };
  const inReview = piece("epsa", { estado: "Revisión interna de producción" });
  const same = contentStageTasks(epsa, inReview, [legacy], "QA", AT);
  expect(same.created).toBe(false);
  expect(same.current).toMatchObject({ id: legacy.id, prio: "Alta", comments: legacy.comments });
  const next = step(inReview, [legacy], "approve-internal", "pm");
  expect(next.tasks).toHaveLength(2);
  expect(next.tasks[0]).toMatchObject({ id: legacy.id, status: "Hecho", comments: legacy.comments });
  expect(next.tasks[0].activity.at(-1)).toEqual({ text: "Historial anterior", when: AT });
  expect(next.result.current).toMatchObject({ chainId: legacy.id, owner: "Cliente · EPSA / Line Up", prio: "Alta" });
  // Aplicarlo otra vez no cambia la cantidad de tareas ni la tarea vigente.
  const repeat = contentStageTasks(epsa, next.record, next.tasks, "QA", AT);
  expect(upsertTasks(next.tasks, repeat.changed)).toHaveLength(2);
  expect(latestChainTask(next.tasks, legacy.id)!.id).toBe(next.result.current.id);
  // Una tarea manual o de otro cliente nunca entra en la cadena.
  const other = applyStageTask([{ ...legacy, id: "CONTENT-aca-PZA-QA-CHAIN", clientSlug: "aca" }], buildContentTask(epsa, inReview, [], "QA", AT), { base: "CONTENT-epsa-PZA-QA-CHAIN", at: AT, actor: "QA" });
  expect(other.current.id).toBe("CONTENT-epsa-PZA-QA-CHAIN");
});
