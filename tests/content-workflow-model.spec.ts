import { test, expect } from "@playwright/test";
import { addContentComment, applyContentAction, contentComments, contentState, contentTransitions, getContentActions, ideaToContentValues, validContentDate, type ContentAction, type ContentRole } from "../app/v2/os/modules/content-workflow";
import { MONDAY_STATE, clientRequestValues, clientRequests, contentChanges, contentFlowStep, contentVersionLabel, preproductionChecklist, recordContentChange } from "../app/v2/os/modules/content-workflow";
import type { ModuleRecord } from "../app/v2/os/modules/types";

function draft(): ModuleRecord { return { id: "PZA-QA", client: "epsa", module: "contenidos", collection: "piezas", source: "manual", user: "Content", createdAt: "2026-11-20T12:00:00Z", updatedAt: "2026-11-20T12:00:00Z", history: [], values: { titulo: "Proceso Line Up", eje: "EJE-1", idea: "Explicar el proceso", bajada: "Tres pasos", copy: "Conocé el proceso", canal: "LinkedIn", formato: "Carrusel", responsable: "Content", disenador: "Diseño", revisor: "PM", estado: "Borrador" } }; }
function act(record: ModuleRecord, action: ContentAction, role: ContentRole, comment = "", patch: Record<string, string> = {}) { return applyContentAction(record, action, { actor: role, role, comment, patch, at: `2026-11-20T12:${String(contentTransitions(record).length).padStart(2, "0")}:00Z` }); }

test("contenido: circuito completo conserva propuesta conjunta, tarea estable y evidencia de aprobación antes de programar", () => {
  let record = draft();
  record = act(record, "submit", "content");
  record = act(record, "approve-internal", "pm");
  expect(JSON.parse(record.values.clientSnapshot).copy).toBe("Conocé el proceso");
  record = act(record, "approve-preliminary", "client");
  expect(contentState(record)).toBe("Preproducción");
  expect(record.values.preCopyFinal).toBe("Conocé el proceso");
  expect(() => act(record, "send-to-design", "content")).toThrow(/indicaciones de diseño/);
  expect(() => act(record, "send-to-design", "designer")).toThrow(/no está disponible/);
  record = act({ ...record, values: { ...record.values, preIndicaciones: "Tres láminas con iconos" } }, "send-to-design", "content");
  expect(contentState(record)).toBe("Producción de diseño");
  expect(() => act(record, "deliver-design", "designer")).toThrow(/Adjuntá/);
  record = act(record, "deliver-design", "designer", "Versión lista", { archivoDiseno: "https://example.com/diseno-v1.pdf", version: "v1" });
  record = act(record, "approve-design", "content");
  expect(JSON.parse(record.values.clientSnapshot).archivoDiseno).toContain("diseno-v1");
  record = act(record, "approve-final", "client");
  expect(contentState(record)).toBe("Aprobado");
  expect(() => act(record, "schedule", "content")).toThrow(/fecha/);
  record = act(record, "schedule", "content", "Programado externamente", { fecha: "2026-12-03", hora: "10:30", enlaceMetricool: "https://app.metricool.com/" });
  expect(contentState(record)).toBe("Programado");
  expect(contentTransitions(record)).toHaveLength(8);
  expect(new Set(contentTransitions(record).map((entry) => entry.taskId)).size).toBe(1);
  expect(contentTransitions(record).every((entry) => entry.actor && entry.at && entry.responsible)).toBe(true);
  expect(record.values.preliminaryApprovedAt).toBeTruthy();
  expect(record.values.finalApprovedAt).toBeTruthy();
});

test("contenido: cambios preliminares vuelven por revisión interna; cambios finales vuelven por revisión interna de diseño", () => {
  let record = act(act(draft(), "submit", "content"), "approve-internal", "pm");
  record = act(record, "request-changes", "client", "Ajustar el beneficio");
  expect(record.values.returnState).toBe("Revisión preliminar del cliente");
  record = act(record, "resubmit", "content", "Beneficio corregido");
  expect(contentState(record)).toBe("Revisión interna de producción");
  record = act(act(record, "approve-internal", "pm"), "approve-preliminary", "client");
  record = act({ ...record, values: { ...record.values, preIndicaciones: "Placa simple" } }, "send-to-design", "pm");
  record = act(record, "deliver-design", "designer", "", { archivoDiseno: "https://example.com/1", version: "v1" });
  record = act(record, "approve-design", "content");
  record = act(record, "request-changes", "client", "Aumentar tamaño de tipografía");
  record = act(record, "resubmit", "designer", "Hecho", { archivoDiseno: "https://example.com/2", version: "v2" });
  expect(contentState(record)).toBe("Revisión interna del diseño");
  expect(record.values.finalApprovedAt).toBeUndefined();
  expect(JSON.parse(record.values.clientSnapshot).archivoDiseno).toBe("https://example.com/1");
  expect(contentComments(record).filter((comment) => comment.visibility === "client")).toHaveLength(2);
});

test("contenido: información conserva etapa de retorno; roles y acciones impiden saltos y comentarios vacíos", () => {
  let record = act(draft(), "request-information", "content", "Necesitamos la ficha técnica");
  expect(contentState(record)).toBe("Información del cliente");
  expect(() => act(record, "provide-information", "client")).toThrow(/Detallá/);
  record = addContentComment(record, { actor: "Cliente", visibility: "client", text: "", attachmentId: "file-1", attachmentName: "ficha.pdf" });
  record = act(record, "provide-information", "client", "Adjunté la ficha");
  expect(contentState(record)).toBe("Borrador");
  expect(() => act(record, "approve-final", "admin")).toThrow(/no está disponible/);
  expect(getContentActions(record, "client")).toEqual([]);
  record = act(record, "submit", "content");
  expect(() => act(record, "approve-internal", "designer")).toThrow(/no está disponible/);
  expect(() => act(record, "request-changes", "pm")).toThrow(/ajustes/);
  expect(() => addContentComment(record, { actor: "Cliente", visibility: "client", text: "Adjunto", attachmentUrl: "javascript:alert(1)" })).toThrow(/HTTP/);
});

test("contenido: patch no puede cambiar copy durante una aprobación y datos heredados se leen sin borrado", () => {
  const previous = draft(); previous.values.estado = "En aprobación"; previous.values.archivoDiseno = "https://example.com/diseno";
  expect(contentState(previous)).toBe("Aprobación final del cliente");
  const next = act(previous, "approve-final", "client", "Aprobado", { copy: "Reemplazo oculto", estado: "Programado" });
  expect(next.values.copy).toBe(previous.values.copy);
  expect(next.values.estado).toBe("Aprobado");
  expect(previous.values.estado).toBe("En aprobación");
  expect(validContentDate("2026-02-30")).toBe(false);
  expect(validContentDate("2028-02-29")).toBe(true);
});

test("contenido: convertir idea conserva origen, eje, URL y captura sin copiar texto de terceros automáticamente", () => {
  const idea = { ...draft(), id: "IDE-4", collection: "ideas", values: { idea: "Mostrar proceso propio", detalle: "Inspiración en claridad visual", origen: "Benchmark", eje: "EJE-1", url: "https://example.com/referencia", captura: "https://example.com/captura.png", sourceBenchmarkBrandId: "brand-2", sourceBenchmarkItemId: "post-3" } };
  expect(ideaToContentValues(idea, { copy: "Texto original propio" })).toMatchObject({ ideaId: "IDE-4", sourceBenchmarkBrandId: "brand-2", sourceBenchmarkItemId: "post-3", referencia: idea.values.url, capturaReferencia: idea.values.captura, estado: "Borrador", copy: "Texto original propio" });
});

test("contenido: comentarios por versión e instancia, cambios con quién los pidió y pedidos estructurados al cliente", () => {
  const requests = clientRequestValues([{ id: "R1", type: "Fotografías", detail: "Foto de producto", status: "Pendiente" }, { id: "R2", type: "Testimonios", detail: "  ", status: "Pendiente" }]);
  expect(requests.necesitaCliente).toBe("Fotografías: Foto de producto");
  let record = act({ ...draft(), values: { ...draft().values, ...requests } }, "submit", "content");
  record = act(record, "approve-internal", "pm");
  expect(JSON.parse(JSON.parse(record.values.clientSnapshot).clientRequests)[0]).toMatchObject({ type: "Fotografías" });
  record = act(record, "request-changes", "client", "Cambiar el título");
  expect(contentComments(record).at(-1)).toMatchObject({ version: "Propuesta v1", kind: "client-review", visibility: "client" });
  const edited = { ...record, values: recordContentChange(record, { ...record.values, titulo: "Proceso Line Up en tres pasos" }, "Content", "2026-11-21T10:00:00Z") };
  expect(contentChanges(edited)[0]).toMatchObject({ fields: ["título"], requestedBy: "client", request: "Cambiar el título", version: "Propuesta v1" });
  record = act(edited, "resubmit", "content", "Título corregido");
  expect(contentVersionLabel(record)).toBe("Propuesta v2");
  expect(contentComments(record).at(-1)).toMatchObject({ kind: "adjustment" });
  expect(clientRequests({ necesitaCliente: "Texto heredado" })).toEqual([{ id: "REQ-LEGACY", type: "Información", detail: "Texto heredado", status: "Pendiente" }]);
  expect(contentFlowStep("Preproducción")).toBe(5);
  expect(MONDAY_STATE["Revisión interna del diseño"]).toBe("Revisión de producción interna");
  expect(preproductionChecklist({ formato: "Reel", canal: "Instagram", preCopyFinal: "x", preIndicaciones: "y", preDimensiones: "z" })).toMatchObject({ ready: true });
  expect(preproductionChecklist({ formato: "Reel", canal: "Instagram" }).items.some((item) => item.key === "preGuion")).toBe(true);
});
