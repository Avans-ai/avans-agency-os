import { test, expect } from "@playwright/test";
import { calendarDays, calendarHref, readCalendarState, shiftDate } from "../app/v2/os/modules/content-calendar-state";
import { applyContentAction, linkedMaterials, contentApprovals, contentSchedule, contentState, contentTransitions, currentDesignVersion, getContentActions, validApproval, type ContentAction, type ContentRole } from "../app/v2/os/modules/content-workflow";
import type { ModuleRecord } from "../app/v2/os/modules/types";

function draft(values: Record<string, string> = {}): ModuleRecord { return { id: "PZA-VER", client: "epsa", module: "contenidos", collection: "piezas", source: "manual", user: "Content", createdAt: "2026-11-20T12:00:00Z", updatedAt: "2026-11-20T12:00:00Z", history: [], values: { titulo: "Versiones", eje: "EJE-1", idea: "Idea", bajada: "Bajada", copy: "Copy", canal: "Instagram", formato: "Carrusel", estado: "Borrador", ...values } }; }
let tick = 0;
function act(record: ModuleRecord, action: ContentAction, role: ContentRole, comment = "", patch: Record<string, string> = {}) { tick += 1; return applyContentAction(record, action, { actor: role, role, comment, patch, at: `2026-11-21T10:${String(tick).padStart(2, "0")}:00Z` }); }

test("calendario: vista, mes, fecha, filtros, búsqueda y pieza viajan en la URL y se recuperan", () => {
  const params = new URLSearchParams("seccion=calendario&mes=2026-12&vista=semana&fecha=2026-12-09&canal=Facebook&q=comercios&etapa=4&resp=Luc%C3%ADa+Ben%C3%ADtez");
  const state = readCalendarState(params);
  expect(state).toMatchObject({ view: "semana", date: "2026-12-09", channel: "Facebook", query: "comercios", stage: "4", owner: "Lucía Benítez", piece: null });
  const open = new URL(calendarHref("/v2/clientes/aca/contenido", params, { piece: "PZA-ACA-D06" }), "https://x");
  expect(open.searchParams.get("seccion")).toBe("calendario");
  expect(open.searchParams.get("pieza")).toBe("PZA-ACA-D06");
  expect(readCalendarState(open.searchParams)).toMatchObject({ ...state, piece: "PZA-ACA-D06" });
  const closed = new URL(calendarHref(open.pathname, open.searchParams, { piece: null }), "https://x");
  expect(readCalendarState(closed.searchParams)).toEqual(state);
  // Enlaces anteriores: ?seccion=piezas&registro=… y ?paso=… se leen como pieza y etapa.
  expect(readCalendarState(new URLSearchParams("registro=PZA-1&paso=3"), "lista")).toMatchObject({ view: "lista", piece: "PZA-1", stage: "3" });
  // Sin parámetros: fecha de referencia de la vista previa; valores inválidos se ignoran.
  expect(readCalendarState(new URLSearchParams("vista=x&fecha=2026-02-30&mes=13")).view).toBe("mes");
  expect(readCalendarState(new URLSearchParams("fecha=2026-02-30")).date).toBe("2026-11-20");
  expect(readCalendarState(new URLSearchParams("mes=2026-11&fecha=2026-11-01")).date).toBe("2026-11-01");
  expect(calendarDays("2026-12-10", "semana")).toEqual(["2026-12-07", "2026-12-08", "2026-12-09", "2026-12-10", "2026-12-11", "2026-12-12", "2026-12-13"]);
  expect(calendarDays("2026-12-10", "mes")[0]).toBe("2026-11-30");
  expect(shiftDate("2026-12-31", "mes", 1)).toBe("2027-01-01");
});

test("contenido: la aprobación de una versión anterior no aprueba la versión nueva", () => {
  let record = act(act(draft(), "submit", "content"), "approve-internal", "pm");
  expect(validApproval(record, "internal-proposal")?.version).toBe("Propuesta v1");
  // El cliente pide ajustes sobre la propuesta v1: la revisión interna de v1 deja de valer.
  record = act(record, "request-changes", "client", "Cambiar el título");
  expect(validApproval(record, "internal-proposal")).toBeUndefined();
  record = act(record, "resubmit", "content", "Título corregido");
  expect(contentApprovals(record).find((item) => item.kind === "internal-proposal")).toMatchObject({ version: "Propuesta v1", valid: false });
  record = act(act(record, "approve-internal", "pm"), "approve-preliminary", "client");
  expect(validApproval(record, "client-proposal")?.version).toBe("Propuesta v2");
  expect(record.values.preliminaryApprovedVersion).toBe("Propuesta v2");
  record = act({ ...record, values: { ...record.values, preIndicaciones: "Placa" } }, "send-to-design", "content");
  record = act(record, "deliver-design", "designer", "", { archivoDiseno: "https://example.com/v1.png", version: "v1" });
  record = act(record, "approve-design", "content");
  expect(validApproval(record, "internal-design")?.version).toBe("Diseño v1");
  record = act(record, "request-changes", "client", "Más contraste");
  // Reenvío sin cambiar el rótulo: se numera solo como v2 y las aprobaciones de v1 no cuentan.
  record = act(record, "resubmit", "designer", "Listo", { archivoDiseno: "https://example.com/v1.png", version: "v1" });
  expect(record.values.version).toBe("v2");
  expect(currentDesignVersion(record)).toBe("Diseño v2");
  expect(contentState(record)).toBe("Revisión interna del diseño");
  expect(validApproval(record, "internal-design")).toBeUndefined();
  expect(validApproval(record, "client-final")).toBeUndefined();
  expect(contentApprovals(record).filter((item) => item.version === "Diseño v1").every((item) => !item.valid)).toBe(true);
  // La aprobación final solo se puede pedir otra vez después de revisar v2.
  expect(getContentActions(record, "client").map((item) => item.id)).toEqual([]);
  record = act(act(record, "approve-design", "content"), "approve-final", "client");
  expect(validApproval(record, "client-final")?.version).toBe("Diseño v2");
  expect(record.values.finalApprovedVersion).toBe("Diseño v2");
  // La propuesta validada (v2) sigue vigente: no se repite esa aprobación en la etapa de diseño.
  expect(validApproval(record, "client-proposal")?.version).toBe("Propuesta v2");
  expect(contentTransitions(record).filter((entry) => entry.action === "approve-preliminary")).toHaveLength(1);
});

test("programación: fecha prevista, programación local y confirmada; nada figura publicado sin evidencia", () => {
  expect(contentSchedule(draft({ fecha: "2026-12-01" }))).toMatchObject({ kind: "planned", label: "Fecha prevista" });
  expect(contentSchedule(draft({ estado: "Programado", fecha: "2026-12-01", hora: "10:00" }))).toMatchObject({ kind: "local", label: "Programación local" });
  expect(contentSchedule(draft({ estado: "Programado", programacionProveedor: "metricool" }))).toMatchObject({ kind: "local" });
  expect(contentSchedule(draft({ estado: "Programado", programacionProveedor: "metricool", programacionProveedorId: "mc-1" }))).toMatchObject({ kind: "confirmed" });
  expect(contentSchedule(draft({ estado: "Publicada", enlace: "Publicación de demostración" }))).toMatchObject({ kind: "published-unverified", label: "Publicación sin verificar" });
  expect(contentSchedule(draft({ estado: "Publicada", publicacionProveedor: "metricool", publicacionProveedorId: "p-1", publicacionUrl: "javascript:alert(1)" })).kind).toBe("published-unverified");
  expect(linkedMaterials({ materialesVinculados: "[{\"id\":\"S1\",\"at\":\"x\",\"by\":\"QA\"},{\"bad\":true}]" })).toEqual([{ id: "S1", at: "x", by: "QA" }]);
  expect(linkedMaterials({ materialesVinculados: "no-json" })).toEqual([]);
});
