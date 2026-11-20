import { expect, test } from "@playwright/test";
import { createDesignVersion, designImage, safeDesignUrl, upsertDesignRequest, validDesignValues } from "../app/v2/os/modules/design-model";
import type { ModuleRecord } from "../app/v2/os/modules/types";

const ctx = { actor: "Diseñadora", at: "2026-11-20T12:00:00.000Z" };
const piece: ModuleRecord = { id: "CONTENT-1", client: "epsa", module: "contenidos", collection: "piezas", source: "manual", user: "Content", createdAt: ctx.at, updatedAt: ctx.at, history: [], values: { titulo: "Servicio industrial", canal: "LinkedIn", formato: "Carrusel", idea: "Inspección", copy: "Copy aprobado", objetivo: "Solicitudes", fecha: "2026-12-02", disenador: "Diseñadora" } };

test("design request reuses identity and keeps existing records on a repeated content review", () => {
  const first = upsertDesignRequest([], piece, ctx);
  expect(first.request.values).toMatchObject({ contenidoId: piece.id, nombre: "Servicio industrial", responsable: "Diseñadora", formatos: "Carrusel", estado: "En curso" });
  expect(first.request.values.detalle).toContain("Copy aprobado");
  const another = { ...first.request, id: "OTHER", client: "aca" };
  const before = [another, { ...first.request, values: { ...first.request.values, version: "3", comentarios: "Conservar" } }];
  const repeat = upsertDesignRequest(before, { ...piece, values: { ...piece.values, copy: "Nuevo copy aprobado" } }, { ...ctx, at: "2026-11-21T12:00:00Z" });
  expect(repeat.records).toHaveLength(2);
  expect(repeat.request.id).toBe(first.request.id);
  expect(repeat.request.values.version).toBe("3");
  expect(repeat.request.values.comentarios).toBe("Conservar");
  expect(repeat.request.history).toHaveLength(2);
  expect(repeat.records.find((r) => r.client === "aca")).toEqual(another);
  expect(before[1].values.detalle).toContain("Copy aprobado");
});

test("design versions are immutable, monotonically numbered and isolated by client", () => {
  const first = createDesignVersion([], { client: "epsa", id: "PIECE-1", values: { nombre: "Placa", archivo: "https://example.com/v1.png", estado: "Borrador" } }, ctx);
  const snapshot = JSON.stringify(first.record);
  const second = createDesignVersion(first.records, { client: "epsa", id: "PIECE-2", previousId: first.record.id, values: { ...first.record.values, archivo: "https://example.com/v2.png" } }, ctx);
  expect(second.record.values).toMatchObject({ version: "2", piezaId: "PIECE-1", anteriorId: "PIECE-1" });
  expect(JSON.stringify(second.records.find((r) => r.id === first.record.id))).toBe(snapshot);
  expect(() => createDesignVersion(second.records, { client: "aca", id: "BAD", previousId: first.record.id, values: first.record.values }, ctx)).toThrow(/cliente/);
  const third = createDesignVersion(second.records, { client: "epsa", id: "PIECE-3", previousId: first.record.id, values: first.record.values }, ctx);
  expect(third.record.values.version).toBe("3");
});

test("design resources validate color, font and navigable file references", () => {
  expect(validDesignValues({ nombre: "Coral", tipo: "Color", valor: "#ff897a" })).toBe("");
  expect(validDesignValues({ nombre: "Coral", tipo: "Color", valor: "red" })).toMatch(/hexadecimal/);
  expect(validDesignValues({ nombre: "Titulares", tipo: "Tipografía" })).toMatch(/familia/);
  for (const url of ["javascript:alert(1)", "data:text/html,<script>", "file:///secret", "/relative"]) expect(safeDesignUrl(url)).toBe("");
  expect(designImage("data:image/svg+xml;base64,AAAA")).toBe("");
  expect(designImage("data:image/png;base64,AAAA")).toBeTruthy();
  expect(() => createDesignVersion([], { client: "epsa", id: "P", values: { nombre: "Sin archivo" } }, ctx)).toThrow(/archivo/);
});
