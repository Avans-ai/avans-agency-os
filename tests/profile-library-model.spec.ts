import { test, expect } from "@playwright/test";
import { osClients } from "../app/v2/os/os-data";
import { seedKnowledge, isKnowledge } from "../app/v2/os/knowledge/state";
import { newEntity } from "../app/v2/os/discovery/model";
import { createMaterialSource, materialOf, saveMaterial, emptyGlossary, saveGlossary, saveOffering, newOffering, offeringProfile, type BrandMaterial } from "../app/v2/os/knowledge/profile-model";
import { PROFILE_FILE_LIMIT, validateProfileFile } from "../app/v2/os/knowledge/profile-files";
const ctx = { actor: "PM QA", at: "2026-11-20T12:00:00.000Z" };
const client = osClients.find(c => c.slug === "epsa")!;
const material: BrandMaterial = { category: "Catálogos", kind: "URL", description: "Catálogo vigente", productIds: [], serviceIds: ["contenidos"] };
function source() { return { ...createMaterialSource(client.slug, ctx), id: "catalog-qa", title: "Catálogo QA", externalUrl: "https://example.com/catalog.pdf", metadata: { originalMarker: true } }; }

test("materials reuse canonical sources, preserve history and reject cross-client references and duplicate URLs", () => {
  const k = seedKnowledge(client), saved = saveMaterial(k, source(), material, ctx);
  expect(saved.sources).toHaveLength(k.sources.length + 1);
  expect(materialOf(saved.sources.at(-1)!)).toEqual(material);
  expect(saved.sources.at(-1)?.metadata.originalMarker).toBe(true);
  const changed = saveMaterial(saved, { ...saved.sources.at(-1)!, title: "Catálogo actualizado" }, material, ctx);
  expect(changed.sources).toHaveLength(saved.sources.length);
  expect(changed.versions.filter(v => v.entityType === "material")).toHaveLength(2);
  expect(() => saveMaterial(saved, { ...source(), id: "duplicate" }, material, ctx)).toThrow(/ya existe/);
  expect(() => saveMaterial(k, { ...source(), clientSlug: "aca" }, material, ctx)).toThrow(/otro cliente/);
  expect(() => saveMaterial(k, source(), { ...material, productIds: ["other-client-product"] }, ctx)).toThrow(/referencia/);
  expect(() => saveMaterial(k, { ...source(), externalUrl: "javascript:alert(1)" }, material, ctx)).toThrow(/URL/);
  expect(isKnowledge(changed, client.slug)).toBe(true);
});

test("glossary keeps source links, removes duplicates, tracks history and prevents contradictory vocabulary", () => {
  const k = saveMaterial(seedKnowledge(client), source(), material, ctx);
  const value = { ...emptyGlossary(), use: [" Cercanía ", "Cercanía"], avoid: ["barato"], tone: "Claro y cercano", sourceIds: ["catalog-qa"] };
  const saved = saveGlossary(k, value, ctx);
  expect(saved.brandGlossary?.use).toEqual(["Cercanía"]);
  expect(saved.brandGlossary?.sourceIds).toEqual(["catalog-qa"]);
  expect(saved.versions.at(-1)?.entityType).toBe("brand-glossary");
  expect(saved.sources).toEqual(k.sources);
  expect(isKnowledge(saved, client.slug)).toBe(true);
  expect(isKnowledge({ ...saved, brandGlossary: { use: "broken" } }, client.slug)).toBe(false);
  expect(() => saveGlossary(k, { ...value, avoid: ["CERCANÍA"] }, ctx)).toThrow(/misma palabra/);
  expect(() => saveGlossary(k, { ...value, sourceIds: ["unknown"] }, ctx)).toThrow(/referencia/);
});

test("product editor updates the Discovery offering and segment relations without creating a second product entity", () => {
  let k = saveMaterial(seedKnowledge(client), source(), material, ctx);
  k = { ...k, discovery: { ...k.discovery, targetSegments: [{ ...newEntity("targetSegments", "segment-qa"), name: "Profesionales", type: "B2B" }] } };
  const product = { ...newOffering("product-qa"), name: "Producto QA", sourceIds: ["catalog-qa"], profile: { ...offeringProfile(newOffering("product-qa")), benefits: "Ahorra tiempo", serviceIds: ["contenidos" as const], externalProvider: "Tienda Nube", externalId: "100", variantId: "blue" } };
  const saved = saveOffering(k, product, ["segment-qa"], ctx);
  expect(saved.discovery.offerings.find(o => o.id === "product-qa")?.profile?.benefits).toBe("Ahorra tiempo");
  expect(saved.discovery.targetSegments[0].offeringIds).toContain("product-qa");
  const updated = saveOffering(saved, { ...product, name: "Producto actualizado" }, [], ctx);
  expect(updated.discovery.offerings.filter(o => o.id === "product-qa")).toHaveLength(1);
  expect(updated.discovery.targetSegments[0].offeringIds).not.toContain("product-qa");
  expect(updated.sources.map(s => s.id)).toEqual(k.sources.map(s => s.id));
  expect(updated.sources.find(s => s.id === "catalog-qa")?.metadata.originalMarker).toBe(true);
  expect(isKnowledge(updated, client.slug)).toBe(true);
  expect(() => saveOffering(saved, { ...product, id: "duplicate" }, [], ctx)).toThrow(/Ya existe un producto/);
  const variant = saveOffering(saved, { ...product, id: "variant", profile: { ...product.profile, variantId: "red" } }, [], ctx);
  expect(variant.discovery.offerings.some(o => o.id === "variant")).toBe(true);
  expect(() => saveOffering(k, { ...product, sourceIds: ["other-source"] }, [], ctx)).toThrow(/referencia/);
});

test("binary files reject empty, oversized and executable payload names before storage", () => {
  expect(() => validateProfileFile({ name: "empty.pdf", type: "application/pdf", size: 0 })).toThrow(/vacío/);
  expect(() => validateProfileFile({ name: "big.mp4", type: "video/mp4", size: PROFILE_FILE_LIMIT + 1 })).toThrow(/20 MB/);
  expect(() => validateProfileFile({ name: "script.html", type: "text/html", size: 100 })).toThrow(/formato/);
  expect(() => validateProfileFile({ name: "logo.svg", type: "image/svg+xml", size: 100 })).toThrow(/formato/);
  expect(() => validateProfileFile({ name: "logo.png", type: "image/png", size: 100 })).not.toThrow();
});
