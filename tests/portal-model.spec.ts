import { test, expect } from "@playwright/test";
import { portalCalendarDays, portalNoticeKey, portalSafeUrl, projectPortalContent } from "../app/v2/os/portal/portal-model";
import type { ModuleRecord } from "../app/v2/os/modules/types";

function fixture(values: Record<string, string> = {}): ModuleRecord {
  return { id: "PORTAL-1", client: "epsa", module: "contenidos", collection: "piezas", user: "Internal owner", source: "manual", createdAt: "2026-11-20T12:00:00Z", updatedAt: "2026-11-20T12:00:00Z", history: [{ user: "Internal owner", at: "2026-11-20T12:00:00Z", text: "PRIVATE" }], values: { titulo: "Propuesta", estado: "Revisión preliminar del cliente", responsable: "Internal owner", copy: "Copy compartido", archivoDiseno: "https://example.com/unreviewed.png", ...values } };
}

test("portal projection isolates client and stage, excludes internal ownership, notes and unreviewed artwork", () => {
  const record = fixture({ contentComments: JSON.stringify([{ id: "private", actor: "Designer", text: "PRIVATE", visibility: "internal" }, { id: "public", actor: "Content owner", text: "Hola", visibility: "client" }]) });
  expect(projectPortalContent(record, "aca")).toBeNull();
  expect(projectPortalContent(fixture({ estado: "Borrador" }), "epsa")).toBeNull();
  expect(projectPortalContent(fixture({ estado: "Revisión interna del diseño" }), "epsa")).toBeNull();
  const result = projectPortalContent(record, "epsa")!;
  expect(result.pending).toBe(true);
  expect(result.artwork).toBeUndefined();
  expect(result.comments).toEqual([{ id: "public", at: "", text: "Hola", author: "Avans", attachmentUrl: undefined, attachmentName: undefined, attachmentId: undefined }]);
  expect(JSON.stringify(result)).not.toMatch(/PRIVATE|Internal owner|Designer|Content owner/);
});

test("portal keeps shared items visible during adjustments, final artwork is exposed only in final review", () => {
  const record = fixture({ estado: "Ajustes", contentTransitions: JSON.stringify([{ to: "Revisión preliminar del cliente" }]) });
  expect(projectPortalContent(record, "epsa")).toMatchObject({ pending: false, status: "Estamos aplicando tus cambios", artwork: undefined });
  expect(projectPortalContent(fixture({ estado: "Aprobación final del cliente" }), "epsa")).toMatchObject({ pending: true, review: "final", artwork: "https://example.com/unreviewed.png" });
  expect(projectPortalContent(fixture({ estado: "Programado" }), "epsa")).toMatchObject({ pending: false, status: "Programado" });
});

test("portal rejects executable URLs and malformed thread values and preserves local attachment references", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,hello", "file:///private", "//example.com/test", ""]) expect(portalSafeUrl(url)).toBeUndefined();
  expect(portalSafeUrl("https://example.com/file.pdf")).toBe("https://example.com/file.pdf");
  expect(projectPortalContent(fixture({ contentComments: "garbage", referencia: "javascript:alert(1)" }), "epsa")).toMatchObject({ comments: [], reference: undefined });
  const result = projectPortalContent(fixture({ contentComments: JSON.stringify([{ id: "c1", text: "Material", actor: "Cliente · EPSA", visibility: "client", attachmentId: "file-1", attachmentName: "brief.pdf" }]) }), "epsa")!;
  expect(result.comments[0]).toMatchObject({ author: "Vos", attachmentId: "file-1", attachmentName: "brief.pdf" });
});

test("portal calendar includes boundary months, Monday weeks and single days", () => {
  expect(portalCalendarDays("2026-11-20", "month")).toHaveLength(42);
  expect(portalCalendarDays("2026-11-20", "month")[0]).toBe("2026-10-26");
  expect(portalCalendarDays("2026-11-20", "week")).toEqual(["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"]);
  expect(portalCalendarDays("2026-11-20", "day")).toEqual(["2026-11-20"]);
  expect(portalCalendarDays("invalid", "day")).toEqual([]);
});

test("shared snapshot protects internal work in progress and minor edits do not create another unread review", () => {
  const record = fixture({ estado: "Ajustes", titulo: "PRIVATE new draft", copy: "PRIVATE unreviewed copy", archivoDiseno: "https://example.com/private.png", clientSnapshot: JSON.stringify({ titulo: "Propuesta compartida", copy: "Copy enviado", archivoDiseno: "https://example.com/shared.png", version: "v1" }), contentTransitions: JSON.stringify([{ id: "transition-1", to: "Aprobación final del cliente" }]) });
  expect(projectPortalContent(record, "epsa")).toMatchObject({ title: "Propuesta compartida", copy: "Copy enviado", artwork: "https://example.com/shared.png", version: "v1" });
  expect(JSON.stringify(projectPortalContent(record, "epsa"))).not.toContain("PRIVATE");
  expect(portalNoticeKey(record)).toBe(portalNoticeKey({ ...record, updatedAt: "2026-11-21T12:00:00Z" }));
});

test("legacy client reviews remain visible after a rejection and malformed snapshots do not expose internal edits", () => {
  const record = fixture({ estado: "Ajustes", contentTransitions: JSON.stringify([{ from: "Aprobación final del cliente", to: "Ajustes" }]) });
  expect(projectPortalContent(record, "epsa")).toMatchObject({ status: "Estamos aplicando tus cambios", pending: false });
  expect(projectPortalContent(fixture({ estado: "Ajustes", clientSnapshot: JSON.stringify({ titulo: "Última propuesta", copy: "Copy compartido" }) }), "epsa")).toMatchObject({ title: "Última propuesta" });
  const corrupt = projectPortalContent(fixture({ estado: "Ajustes", clientSnapshot: "broken", titulo: "PRIVATE title", copy: "PRIVATE copy" }), "epsa");
  expect(corrupt).not.toBeNull();
  expect(JSON.stringify(corrupt)).not.toContain("PRIVATE");
});
