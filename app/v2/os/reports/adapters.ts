/* Adaptadores puros: registros de los módulos → entradas de los builders. */
import type { ModuleRecord } from "../modules/types";
import type { AxisInput, CampaignInput, PieceInput, RecommendationInput } from "./builders";
import type { MergedRecommendation } from "../modules/recommendations";

export function campaignInputs(records: ModuleRecord[]): CampaignInput[] {
  return records.map((record) => ({
    id: record.id,
    name: record.values.nombre || record.id,
    platform: record.values.plataforma || "Sin plataforma",
    objective: record.values.objetivo || "",
    status: record.values.estado || "Borrador",
    budget: Number(record.values.presupuesto) || 0,
    source: record.source,
  }));
}

export function pieceInputs(records: ModuleRecord[]): PieceInput[] {
  return records.map((record) => ({
    id: record.id,
    title: record.values.titulo || record.id,
    format: record.values.formato || "",
    channel: record.values.canal || "",
    axisId: record.values.eje || "",
    status: record.values.estado || "Idea",
    date: record.values.fecha || "",
    source: record.source,
  }));
}

export function axisInputs(records: ModuleRecord[]): AxisInput[] {
  return records.map((record) => ({ id: record.id, name: record.values.nombre || record.id }));
}

export function recommendationInputs(items: MergedRecommendation[]): RecommendationInput[] {
  return items.map((item) => ({ id: item.id, title: item.title, rationale: item.rationale, serviceId: item.serviceId, priority: item.priority, status: item.status, source: item.source }));
}
