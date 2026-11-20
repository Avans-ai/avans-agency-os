import { expect, test } from "@playwright/test";
import { designCategory, DESIGN_CATEGORIES } from "../app/v2/os/modules/design-model";
import { designDemoSeeds } from "../app/v2/os/modules/design-demo";
import { demoSeedsFor } from "../app/v2/os/modules/demo-fixtures";
import { addDesignComment, designApprovals, designComments, designStage, DESIGN_STAGES, inBrandLibrary, latestVersions, libraryAfterMove, moveDesignRequest, requestVersions, resetDemoRecords } from "../app/v2/os/modules/design-operation";
import { brandTokens, colorPairs, contrastRatio, hexToRgb, wcagLevel } from "../app/v2/os/modules/design-system-model";
import type { ModuleRecord } from "../app/v2/os/modules/types";

const at = "2026-11-20T12:00:00.000Z";
const ctx = { actor: "Diseñador QA", at };
function rec(id: string, collection: string, values: Record<string, string>, extra: Partial<ModuleRecord> = {}): ModuleRecord {
  return { id, client: "aca", module: "diseno-marca", collection, source: "manual", user: "QA", createdAt: at, updatedAt: at, history: [], values, ...extra };
}

test("WCAG contrast, RGB and brand tokens are computed from the palette", () => {
  expect(contrastRatio("#ffffff", "#000000")).toBe(21);
  expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  expect(wcagLevel(4.48)).toBe("AA grande");
  expect(wcagLevel(4.5)).toBe("AA");
  expect(wcagLevel(7.1)).toBe("AAA");
  expect(wcagLevel(2)).toBe("No apto");
  expect(hexToRgb("#1f4d3a")).toEqual([31, 77, 58]);
  expect(hexToRgb("red")).toBeNull();
  const pairs = colorPairs([{ name: "Blanco", hex: "#ffffff" }, { name: "Negro", hex: "#000000" }, { name: "Gris", hex: "#777777" }]);
  expect(pairs[0]).toMatchObject({ ratio: 21, level: "AAA" });
  expect(pairs).toHaveLength(6);
  const tokens = brandTokens([rec("C1", "sistema", { tipo: "Color", grupo: "Principal", valor: "#1f4d3a" }), rec("C2", "sistema", { tipo: "Color", grupo: "Secundario", valor: "#f28c38" }), rec("T1", "sistema", { tipo: "Tipografía", subtipo: "Titulares", valor: "Syne", variante: "700" })]);
  expect(tokens).toMatchObject({ primary: "#1f4d3a", secondary: "#f28c38", headingWeight: 700 });
  expect(tokens.heading).toContain("Syne");
});

test("library categories are extended and old values are read compatibly", () => {
  expect(DESIGN_CATEGORIES).toEqual(["Identidad", "Redes sociales", "Carruseles", "Publicidad", "Presentaciones", "Material comercial", "Banners", "Packaging", "Videos", "Motion", "Otros"]);
  expect(designCategory("Redes")).toBe("Redes sociales");
  expect(designCategory("Anuncios")).toBe("Publicidad");
  expect(designCategory("Material institucional")).toBe("Material comercial");
  expect(designCategory("Plantillas")).toBe("Otros");
  expect(designCategory("Carruseles")).toBe("Carruseles");
  expect(designCategory("")).toBe("Otros");
});

test("operation stages move with versions, approvals and history, and approval updates the same library version", () => {
  const request = rec("MAR-1", "trabajos", { nombre: "Placa QA", estado: "Planificado", operacion: "Pendientes" });
  expect(designStage(request)).toBe("Pendientes");
  const producing = moveDesignRequest(request, "En producción", { ...ctx, versions: 0 });
  expect(producing.values).toMatchObject({ operacion: "En producción", estado: "En curso", etapa: "Diseño" });
  expect(() => moveDesignRequest(producing, "En revisión interna", { ...ctx, versions: 0 })).toThrow(/versión/);
  const v1 = rec("PIE-1", "biblioteca", { nombre: "Placa QA", pedidoId: "MAR-1", version: "1", piezaId: "PIE-1", estado: "Borrador", archivo: "https://example.com/1.png" });
  const v2 = rec("PIE-2", "biblioteca", { nombre: "Placa QA", pedidoId: "MAR-1", version: "2", piezaId: "PIE-1", estado: "Borrador", archivo: "https://example.com/2.png" });
  const other = rec("PIE-X", "biblioteca", { nombre: "Otra", pedidoId: "MAR-1", version: "1", piezaId: "PIE-X", estado: "Borrador" }, { client: "epsa" });
  const library = [v1, v2, other];
  expect(requestVersions(library, producing)).toHaveLength(2);
  const review = moveDesignRequest(producing, "Esperando aprobación", { ...ctx, versions: 2 });
  const changes = moveDesignRequest(review, "Ajustes", { ...ctx, versions: 2, note: "Subir contraste" });
  expect(designApprovals(changes).at(-1)).toMatchObject({ decision: "Ajustes solicitados", note: "Subir contraste" });
  const approved = moveDesignRequest(moveDesignRequest(changes, "Esperando aprobación", { ...ctx, versions: 2 }), "Aprobados", { ...ctx, versions: 2 });
  expect(approved.values.estado).toBe("Aprobado");
  expect(designApprovals(approved).map((a) => a.decision)).toEqual(["Ajustes solicitados", "Aprobado"]);
  expect(approved.history[0].text).toBe("Movió de Esperando aprobación a Aprobados");
  const after = libraryAfterMove(library, approved, "Aprobados", ctx);
  expect(after.records).toHaveLength(3);
  expect(after.changed).toEqual(["PIE-2"]);
  expect(after.records.find((r) => r.id === "PIE-2")?.values.estado).toBe("Aprobado");
  expect(after.records.find((r) => r.id === "PIE-1")).toEqual(v1);
  expect(after.records.find((r) => r.id === "PIE-X")).toEqual(other);
  expect(latestVersions(after.records).filter((r) => r.client === "aca")).toHaveLength(1);
  expect(inBrandLibrary(after.records.find((r) => r.id === "PIE-2")!, approved)).toBe(true);
  // Generic approvals from another view take precedence over a stale operation stage.
  expect(designStage({ ...approved, values: { ...approved.values, estado: "Cambios pedidos" } })).toBe("Ajustes");
  const delivered = moveDesignRequest(approved, "Entregados", { ...ctx, versions: 2 });
  expect(delivered.values).toMatchObject({ estado: "Cerrado", fechaEntrega: "2026-11-20" });
});

test("content requests follow the content state and cannot be moved from design", () => {
  const request = rec("DIS-C", "trabajos", { nombre: "Contenido", contenidoId: "PZA-1", estado: "En curso" });
  const content = rec("PZA-1", "piezas", { estado: "Aprobación final del cliente" }, { module: "contenidos" });
  expect(designStage(request, content)).toBe("Esperando aprobación");
  expect(designStage(request, { ...content, values: { estado: "Programado" } })).toBe("Entregados");
  expect(() => moveDesignRequest(request, "Aprobados", { ...ctx, versions: 1 })).toThrow(/contenido de origen/);
  const commented = addDesignComment(request, "  Revisar márgenes ", ctx);
  expect(designComments(commented)).toMatchObject([{ actor: "Diseñador QA", text: "Revisar márgenes" }]);
  expect(() => addDesignComment(request, "   ", ctx)).toThrow();
});

test("demo seeds are complete for ACA only and reset keeps manual and other clients' records", () => {
  expect(demoSeedsFor("aca", "diseno-marca", "sistema").length).toBeGreaterThan(30);
  expect(demoSeedsFor("epsa", "diseno-marca", "sistema")).toEqual([]);
  const requests = designDemoSeeds.trabajos.aca;
  const stages = new Set(requests.map((r) => designStage(rec(r.id, "trabajos", r))));
  for (const stage of DESIGN_STAGES) expect(stages.has(stage)).toBe(true);
  const kinds = new Set(designDemoSeeds.sistema.aca.map((r) => r.tipo));
  for (const kind of ["Logo", "Color", "Tipografía", "Recurso gráfico", "Componente", "Moodboard", "Aplicación", "Tono"]) expect(kinds.has(kind)).toBe(true);
  expect(designDemoSeeds.sistema.aca.filter((r) => r.tipo === "Moodboard").every((r) => r.descripcion && r.justificacion)).toBe(true);
  const categories = new Set(designDemoSeeds.biblioteca.aca.map((r) => designCategory(r.categoria)));
  for (const category of DESIGN_CATEGORIES) expect(categories.has(category)).toBe(true);
  const seed = rec("DS-1", "sistema", { nombre: "Semilla" }, { source: "demo" });
  const changedDemo = { ...seed, values: { nombre: "Modificada" } };
  const manual = rec("DS-M", "sistema", { nombre: "Manual" });
  const otherDemo = { ...seed, client: "epsa" };
  const result = resetDemoRecords([changedDemo, manual, otherDemo], [seed], "aca");
  expect(result).toContainEqual(manual);
  expect(result).toContainEqual(otherDemo);
  expect(result).toContainEqual(seed);
  expect(result).not.toContainEqual(changedDemo);
  expect(result).toHaveLength(3);
});
