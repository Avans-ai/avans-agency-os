import { test, expect } from "@playwright/test";
import { osClients } from "../app/v2/os/os-data";
import { seedKnowledge } from "../app/v2/os/knowledge/state";
import { benchmarkCoverage, benchmarkReport, captureBenchmark, externalBrands, newBrand, newItem, saveBrand } from "../app/v2/os/knowledge/benchmark";
import { saveBenchmarkItem } from "../app/v2/os/knowledge/mutations";
import { buildPresentationManifest, presentationSnapshot } from "../app/v2/os/knowledge/presentation/manifest";
import { benchmarkIdeaValues, existingBenchmarkIdea } from "../app/v2/os/knowledge/benchmark-ideas";
import type { ModuleRecord } from "../app/v2/os/modules/types";

const client = osClients.find((c) => c.slug === "epsa")!;
const ctx = { actor: "PM QA", at: "2026-11-20T12:00:00.000Z" };

test("own-brand legacy remains stored but is absent from Benchmark, reports and new decks", () => {
  const k = seedKnowledge(client);
  expect(k.benchmark.brands.every((b) => b.type !== "Propia")).toBe(true);
  const own = { ...newBrand(client.name, true), items: [{ ...newItem("overview", ctx), values: { claim: "OWN LEGACY ANALYSIS" } }] };
  const rival = { ...newBrand("Competidor de prueba"), id: "rival", items: [{ ...newItem("overview", ctx), values: { claim: "EXTERNAL ANALYSIS" } }] };
  k.benchmark.brands = [own, rival];
  k.benchmark.snapshots = [{ id: "old", brandId: own.id, capturedAt: ctx.at, capturedBy: ctx.actor, brand: structuredClone(own) }];
  const before = structuredClone(k);
  expect(externalBrands(k.benchmark).map((b) => b.id)).toEqual(["rival"]);
  expect(benchmarkCoverage(k.benchmark).map((b) => b.brandId)).toEqual(["rival"]);
  expect(benchmarkReport(k).map((b) => b.brand)).toEqual([rival.name]);
  const snapshot = presentationSnapshot(k, client.services, ctx);
  expect(JSON.stringify(snapshot)).not.toContain("OWN LEGACY ANALYSIS");
  const manifest = buildPresentationManifest(k, client, client.services, "internal-draft", ctx);
  expect(manifest.slides.some((s) => [15, 16, 17, 18, 19].includes(s.templateSlideNumber))).toBe(false);
  expect(JSON.stringify(manifest.slides)).not.toContain("OWN LEGACY ANALYSIS");
  expect(JSON.stringify(manifest.slides)).toContain("EXTERNAL ANALYSIS");
  expect(k).toEqual(before);
});

test("own brand cannot be added under another classification or edited through the model", () => {
  const k = seedKnowledge(client);
  const own = newBrand(client.name, true);
  k.benchmark.brands.push(own);
  for (const brand of [own, newBrand(client.name), newBrand("EPSA"), newBrand("Line Up")]) expect(() => saveBrand(k, brand)).toThrow(/marca propia/);
  expect(() => saveBenchmarkItem(k, newItem("content", ctx), own.id, ctx)).toThrow(/marca propia/);
  expect(() => captureBenchmark(k, own.id, ctx)).toThrow(/marca propia/);
  const next = saveBrand(k, { ...newBrand("Competidor externo"), principal: false });
  expect(() => saveBrand(next, { ...newBrand("COMPETIDOR EXTERNO"), principal: false })).toThrow(/ya está seleccionada/);
});

test("benchmark inspiration keeps source, capture and rationale and can be deduplicated", () => {
  const brand = newBrand("Competidor externo");
  const item = { ...newItem("content", ctx), sourceIds: ["source-1"], evidence: "Referencia observada", observedAt: "2026-11-20" };
  const draft = { title: "Aprendizaje visual", url: "https://example.com/post", capture: "data:image/png;base64,aGVsbG8=", reason: "Explica un beneficio con una secuencia clara", pillarId: "pillar-1" };
  const values = benchmarkIdeaValues(brand, item, draft);
  expect(values).toMatchObject({ origen: "Benchmark", eje: "pillar-1", sourceBenchmarkBrandId: brand.id, sourceBenchmarkItemId: item.id, captura: draft.capture, detalle: draft.reason, estado: "Nueva" });
  const record: ModuleRecord = { id: "idea-1", client: client.slug, module: "contenidos", collection: "ideas", user: ctx.actor, source: "manual", createdAt: ctx.at, updatedAt: ctx.at, history: [], values };
  expect(existingBenchmarkIdea([record], brand.id, item.id, draft.url)?.id).toBe(record.id);
  expect(existingBenchmarkIdea([record], brand.id, "another", draft.url)).toBeUndefined();
  expect(() => benchmarkIdeaValues(brand, item, { ...draft, url: "javascript:alert(1)" })).toThrow(/URL válida/);
  expect(() => benchmarkIdeaValues(brand, item, { ...draft, reason: "" })).toThrow(/por qué/);
  expect(() => benchmarkIdeaValues(brand, item, { ...draft, capture: "data:text/html;base64,aGVsbG8=" })).toThrow(/captura válida/);
});
