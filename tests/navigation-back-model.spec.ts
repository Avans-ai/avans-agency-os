import { test, expect } from "@playwright/test";
import { safeReturnPath, withReturn } from "../app/v2/os/navigation/return-path";

test("return paths are internal /v2 routes only", () => {
  expect(safeReturnPath("/v2/clientes/aca/tareas?vista=modulo")).toBe("/v2/clientes/aca/tareas?vista=modulo");
  expect(safeReturnPath(encodeURIComponent("/v2/clientes/aca?view=plan#plan-contenidos"))).toBe("/v2/clientes/aca?view=plan#plan-contenidos");
  for (const bad of [null, "", "https://evil.example", "//evil.example/v2", "/v2evil", "javascript:alert(1)", "/v3/x", "/v2\\..\\x", "/v2/\u0000"]) expect(safeReturnPath(bad)).toBeNull();
});

test("withReturn appends a single encoded origin and keeps hashes", () => {
  expect(withReturn("/v2/clientes/aca/contenido?seccion=calendario", "/v2/clientes/aca")).toBe("/v2/clientes/aca/contenido?seccion=calendario&volver=%2Fv2%2Fclientes%2Faca");
  expect(withReturn("/v2/clientes/aca?view=plan#plan-contenidos", "/v2")).toBe("/v2/clientes/aca?view=plan&volver=%2Fv2#plan-contenidos");
  expect(withReturn("/v2/x", "https://evil.example")).toBe("/v2/x");
});
