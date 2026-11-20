import type { BenchmarkBrand, KnowledgeItem } from "./types";
import type { ModuleRecord } from "../modules/types";

export type BenchmarkIdeaDraft = { title: string; url: string; capture: string; reason: string; pillarId: string };
export function benchmarkIdeaValues(brand: BenchmarkBrand, item: KnowledgeItem, draft: BenchmarkIdeaDraft) {
  if (brand.type === "Propia" || brand.id === "own") throw new Error("Elegí una referencia externa.");
  if (!draft.title.trim() || !draft.reason.trim()) throw new Error("Completá el título y por qué te interesa esta referencia.");
  if (draft.capture.length > 700_000) throw new Error("La captura supera el límite local de 512 KB.");
  try {
    if (!["https:", "http:"].includes(new URL(draft.url).protocol)) throw new Error();
  } catch { throw new Error("Ingresá una URL válida del contenido original."); }
  if (draft.capture && !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(draft.capture)) {
    try { if (!["https:", "http:"].includes(new URL(draft.capture).protocol)) throw new Error(); }
    catch { throw new Error("Usá una URL de captura válida o adjuntá una imagen PNG, JPG o WebP."); }
  }
  return {
    idea: draft.title.trim(), eje: draft.pillarId, origen: "Benchmark", detalle: draft.reason.trim(),
    url: draft.url.trim(), captura: draft.capture, estado: "Nueva", fuenteId: item.id,
    sourceBenchmarkBrandId: brand.id, sourceBenchmarkItemId: item.id,
    competidorId: brand.id, competidor: brand.name, sourceIds: JSON.stringify(item.sourceIds),
    fechaRelevamiento: item.observedAt, evidencia: item.evidence,
  };
}
export function existingBenchmarkIdea(records: ModuleRecord[], brandId: string, itemId: string, url: string) {
  return records.find((record) => record.values.sourceBenchmarkBrandId === brandId && record.values.sourceBenchmarkItemId === itemId && record.values.url === url.trim());
}
