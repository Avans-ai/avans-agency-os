import { newEntity, putEntity, validateEntity, type Offering } from "../discovery/model";
import type { EditableRecord } from "../discovery/schema";
import { serviceCatalog, type ServiceId } from "../os-data";
import { discoveryOf, replaceDiscovery, versionChange } from "./state";
import { newSource } from "./sources";
import type { KnowledgeSource, KnowledgeState, MutationContext } from "./types";

export const materialCategories = ["Identidad de marca", "Logos", "Manuales", "Tipografías", "Colores", "Fotografías", "Videos", "Catálogos", "Brochures", "Fichas técnicas", "Material comercial", "Presentaciones", "Documentos institucionales", "Otros"] as const;
export type BrandMaterial = {
  category: typeof materialCategories[number];
  kind: "Archivo" | "URL" | "Texto";
  description: string;
  productIds: string[];
  serviceIds: ServiceId[];
  file?: { id: string; name: string; type: string; size: number };
};
export type OfferingProfile = {
  category: string;
  benefits: string;
  audience: string;
  icpIds: string[];
  serviceIds: ServiceId[];
  externalProvider: string;
  externalId: string;
  variantId: string;
};
export type BrandGlossary = {
  use: string[];
  avoid: string[];
  expressions: string[];
  tone: string;
  technical: string[];
  approvedMessages: string[];
  sourceIds: string[];
  updatedAt: string;
  updatedBy: string;
};
export function emptyGlossary(): BrandGlossary {
  return { use: [], avoid: [], expressions: [], tone: "", technical: [], approvedMessages: [], sourceIds: [], updatedAt: "", updatedBy: "" };
}
export function offeringProfile(offering: Offering): OfferingProfile {
  return { category: "", benefits: "", audience: "", icpIds: [], serviceIds: [], externalProvider: "", externalId: "", variantId: "", ...offering.profile };
}
export function materialOf(source: KnowledgeSource): BrandMaterial {
  const existing = source.metadata.brandMaterial as BrandMaterial | undefined;
  return existing ?? { category: source.type === "catalog" ? "Catálogos" : source.type === "brochure" ? "Brochures" : "Otros", kind: source.externalUrl ? "URL" : "Texto", description: source.notes || "", productIds: [], serviceIds: [] };
}
export function httpUrl(value: string) {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : null; } catch { return null; }
}
export function glossaryOf(state: KnowledgeState): BrandGlossary { return state.brandGlossary ?? emptyGlossary(); }
function checkIds(ids: string[], valid: string[], label: string) {
  if (!Array.isArray(ids) || ids.some(id => !valid.includes(id))) throw new Error(`${label}: la referencia ya no existe en este cliente.`);
}
export function saveMaterial(k: KnowledgeState, source: KnowledgeSource, material: BrandMaterial, ctx: MutationContext): KnowledgeState {
  if (source.clientSlug !== k.clientSlug) throw new Error("El material pertenece a otro cliente.");
  if (!source.title.trim()) throw new Error("Completá el nombre del material.");
  if (!materialCategories.includes(material.category)) throw new Error("Categoría inválida.");
  if ((material.kind === "URL" || source.externalUrl) && !httpUrl(source.externalUrl)) throw new Error("Ingresá una URL http o https válida.");
  if (material.kind === "Archivo" && (!material.file?.id || !material.file.size)) throw new Error("Adjuntá el archivo antes de guardar.");
  if (material.kind === "Texto" && !source.rawText.trim()) throw new Error("Ingresá el texto del material.");
  checkIds(material.productIds, k.discovery.offerings.map(p => p.id), "Productos");
  checkIds(material.serviceIds, serviceCatalog.map(s => s.id), "Servicios");
  if (k.sources.some(s => s.id !== source.id && ((source.contentHash && s.contentHash === source.contentHash) || (source.externalUrl && httpUrl(s.externalUrl) === httpUrl(source.externalUrl)))))
    throw new Error("Este material ya existe. Editá su ficha para agregar relaciones.");
  const previous = k.sources.find(s => s.id === source.id);
  const value = { ...source, title: source.title.trim(), version: (previous?.version ?? 0) + 1, metadata: { ...source.metadata, brandMaterial: material, updatedAt: ctx.at, updatedBy: ctx.actor } };
  return { ...versionChange(k, "material", source.id, previous, value, ctx, source.id), sources: [...k.sources.filter(s => s.id !== source.id), value] };
}
export function createMaterialSource(slug: string, ctx: MutationContext) { return { ...newSource(slug, ctx), type: "document" as const, status: "imported" as const, occurredAt: ctx.at.slice(0, 10) }; }
export function saveGlossary(k: KnowledgeState, value: BrandGlossary, ctx: MutationContext) {
  checkIds(value.sourceIds, k.sources.map(s => s.id), "Fuentes");
  const clean = (items: string[]) => [...new Set(items.map(s => s.trim()).filter(Boolean))];
  const next = { ...value, use: clean(value.use), avoid: clean(value.avoid), expressions: clean(value.expressions), technical: clean(value.technical), approvedMessages: clean(value.approvedMessages), updatedAt: ctx.at, updatedBy: ctx.actor };
  if (next.use.some(word => next.avoid.some(avoid => avoid.toLocaleLowerCase() === word.toLocaleLowerCase()))) throw new Error("Una misma palabra no puede estar en usar y evitar.");
  return { ...versionChange(k, "brand-glossary", "glossary", k.brandGlossary, next, ctx), brandGlossary: next };
}
export function saveOffering(k: KnowledgeState, offering: Offering, segmentIds: string[], ctx: MutationContext) {
  if (!offering.name.trim()) throw new Error("Completá el nombre del producto o servicio.");
  const p = offeringProfile(offering);
  checkIds(offering.sourceIds, k.sources.map(s => s.id), "Materiales y fuentes");
  checkIds(segmentIds, k.discovery.targetSegments.map(s => s.id), "Segmentos");
  checkIds(p.icpIds, [...k.discovery.b2bIcps, ...k.discovery.b2cIcps].map(i => i.id), "ICP");
  checkIds(p.serviceIds, serviceCatalog.map(s => s.id), "Servicios");
  if (!!p.externalProvider !== !!p.externalId) throw new Error("Completá proveedor e identificador externo juntos.");
  if (p.externalId && k.discovery.offerings.some(o => o.id !== offering.id && o.profile?.externalProvider === p.externalProvider && o.profile?.externalId === p.externalId && (o.profile?.variantId ?? "") === p.variantId)) throw new Error("Ya existe un producto con ese identificador y variante. Editá el registro existente.");
  const d = discoveryOf(k), errors = validateEntity(d, "offerings", offering as unknown as EditableRecord);
  if (errors.length) throw new Error(errors.join(" · "));
  let next = putEntity(d, "offerings", { ...offering, name: offering.name.trim(), profile: p, updatedAt: ctx.at, updatedBy: ctx.actor });
  for (const segment of next.targetSegments) {
    const was = segment.offeringIds.includes(offering.id), is = segmentIds.includes(segment.id);
    if (was !== is) next = putEntity(next, "targetSegments", { ...segment, offeringIds: is ? [...segment.offeringIds, offering.id] : segment.offeringIds.filter(id => id !== offering.id), status: "Requiere revisión", updatedAt: ctx.at, updatedBy: ctx.actor });
  }
  return replaceDiscovery(k, next, ctx);
}
export function newOffering(id: string): Offering { return { ...newEntity("offerings", id), type: "Producto" }; }
export function isBrandGlossary(value: unknown): value is BrandGlossary {
  if (!value || typeof value !== "object") return false;
  const v = value as BrandGlossary;
  return ["tone", "updatedAt", "updatedBy"].every(key => typeof v[key as "tone"] === "string") && [v.use, v.avoid, v.expressions, v.technical, v.approvedMessages, v.sourceIds].every(list => Array.isArray(list) && list.every(item => typeof item === "string"));
}
