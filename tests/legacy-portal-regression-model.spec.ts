import { test, expect } from "@playwright/test";
import { applyContentAction } from "../app/v2/os/modules/content-workflow";
import { projectPortalContent } from "../app/v2/os/portal/portal-model";
import type { ModuleRecord } from "../app/v2/os/modules/types";

function legacy(): ModuleRecord {
  return {
    id: "LEGACY", client: "epsa", module: "contenidos", collection: "piezas", user: "PM", source: "manual",
    createdAt: "2026-11-20T12:00:00Z", updatedAt: "2026-11-20T12:00:00Z", history: [],
    values: { titulo: "Propuesta legacy", estado: "Revisión preliminar del cliente", copy: "Copy compartido", contentTransitions: JSON.stringify([{ to: "Revisión preliminar del cliente" }]) },
  };
}

test("legacy proposal without a snapshot keeps its shared copy during internal adjustments", () => {
  const returned = applyContentAction(legacy(), "request-changes", { role: "client", actor: "Cliente", comment: "Cambiar imagen" });
  const edited = { ...returned, values: { ...returned.values, copy: "BORRADOR INTERNO NO REVISADO" } };
  expect(projectPortalContent(edited, "epsa")?.copy).toBe("Copy compartido");
});

test("legacy final approval without transitions remains visible after the client requests changes", () => {
  const record = legacy();
  record.values = { ...record.values, estado: "En aprobación", contentTransitions: "[]", archivoDiseno: "https://example.com/final.pdf" };
  expect(projectPortalContent(record, "epsa")).not.toBeNull();
  const returned = applyContentAction(record, "request-changes", { role: "client", actor: "Cliente", comment: "Cambiar portada" });
  expect(projectPortalContent(returned, "epsa")).toMatchObject({ pending: false, status: "Estamos aplicando tus cambios", artwork: "https://example.com/final.pdf" });
});
