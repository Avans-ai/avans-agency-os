"use client";

/* Contexto del asistente (cliente). Reúne, solo para el cliente abierto, lo que
 * el perfil necesita: Discovery, ICP y segmentos, Benchmark y conclusiones,
 * Plan, objetivos, campañas, resultados, aprendizajes, recomendaciones,
 * reuniones, decisiones, alcance contratado y trabajo existente. Cada pieza
 * lleva un ref estable, su estado de validación y el slug del cliente. */
import { useMemo } from "react";
import { planBlueprints, benchmarkBlueprints } from "../knowledge/blueprints";
import { useKnowledge } from "../knowledge/use-knowledge";
import { entityFields } from "../discovery/schema";
import { scopeForClient } from "../director-data";
import { serviceLabel, type OsClient, type ServiceId } from "../os-data";
import { useServiceModules } from "../service-modules";
import { collectionDef } from "../modules/collections";
import { readLocalValue, seedRecords, useLocalKeys, moduleKey } from "../modules/store";
import { useRecommendations } from "../modules/recommendations";
import type { ModuleRecord } from "../modules/types";
import type { AssistantProfile } from "./profiles";
import type { ContextSource, SourceKind, SourceStatus } from "./types";
import type { KnowledgeItem } from "../knowledge/types";

const TEXT_LIMIT = 700;
const MAX_SOURCES = 100;

function clip(text: string, max = TEXT_LIMIT) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
function valueText(value: unknown): string {
  if (value === null || value === undefined || value === false) return "";
  if (value === true) return "sí";
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string").join(", ");
  return String(value);
}

/** Colecciones de otros módulos que alimentan a cada asistente. */
const RELATED: { serviceId: ServiceId; collection: string; kind: SourceKind; only?: (record: ModuleRecord) => boolean }[] = [
  { serviceId: "publicidad-digital", collection: "campanas", kind: "campana" },
  { serviceId: "publicidad-digital", collection: "aprendizajes", kind: "aprendizaje" },
  { serviceId: "publicidad-digital", collection: "optimizaciones", kind: "resultado", only: (record) => Boolean(record.values.resultadoObservado) },
  { serviceId: "contenidos", collection: "aprendizajes", kind: "aprendizaje" },
  { serviceId: "estrategia", collection: "decisiones", kind: "decision", only: (record) => record.values.estado === "Tomada" },
  { serviceId: "estrategia", collection: "reuniones", kind: "reunion", only: (record) => record.values.estado === "Realizada" },
  { serviceId: "estrategia", collection: "riesgos", kind: "resultado", only: (record) => record.values.estado !== "Cerrado" },
];

export type AssistantContextData = {
  sources: ContextSource[];
  /** Trabajo existente de la colección del formulario (para similitud). */
  existingWork: { ref: string; label: string; text: string; recordId: string }[];
  /** Recomendaciones vigentes para el módulo (manuales, demo o hallazgos de Benchmark). */
  recommendations: { ref: string; id: string; title: string; rationale: string; source: string; origin: "manual" | "demo" | "benchmark"; status: string; date?: string }[];
  missing: string[];
  hydrated: boolean;
};

export function useAssistantContext(client: OsClient, profile: AssistantProfile, activeServices: ServiceId[]): AssistantContextData {
  const { k, hydrated: knowledgeHydrated } = useKnowledge(client);
  const { stored: modules } = useServiceModules(client);
  const { items: recommendationItems, hydrated: recommendationsHydrated } = useRecommendations(client.slug, [profile.serviceId]);
  const related = useMemo(() => [...RELATED, { serviceId: profile.serviceId, collection: profile.collection, kind: (profile.collection === "campanas" ? "campana" : "trabajo") as SourceKind }], [profile.collection, profile.serviceId]);
  const keys = useMemo(() => related.map((item) => moduleKey(client.slug, item.serviceId, item.collection)), [client.slug, related]);
  const { raws, hydrated: recordsHydrated } = useLocalKeys(keys);

  return useMemo(() => {
    const slug = client.slug;
    const sources: ContextSource[] = [];
    const push = (source: Omit<ContextSource, "clientSlug">) => {
      if (source.text.trim()) sources.push({ ...source, clientSlug: slug, label: clip(source.label, 200), text: clip(source.text) });
    };
    const d = k.discovery;
    // Discovery: perfil, datos, unidades, oferta, proceso comercial.
    const describe = (kind: Parameters<typeof entityFields>[0], record: Record<string, unknown>) =>
      entityFields(kind)
        .filter((field) => !["id", "status", "updatedAt", "updatedBy", "sourceIds", "owner", "evidence"].includes(field.key))
        .map((field) => [field.label, valueText(record[field.key])] as const)
        .filter(([, value]) => value)
        .map(([label, value]) => `${label}: ${value}`)
        .join(" · ");
    const statusOf = (record: { status?: unknown }): SourceStatus => (record.status === "Validado" ? "validado" : "pendiente");
    push({ ref: "discovery:empresa", kind: "discovery", label: "Quiénes somos", text: describe("companyProfile", d.companyProfile), status: statusOf(d.companyProfile) });
    d.relevantFacts.forEach((item) => push({ ref: `discovery:dato:${item.id}`, kind: "discovery", label: `Dato relevante · ${item.name}`, text: describe("relevantFacts", item), status: statusOf(item) }));
    d.businessUnits.forEach((item) => push({ ref: `discovery:unidad:${item.id}`, kind: "discovery", label: `Unidad · ${item.name}`, text: describe("businessUnits", item), status: statusOf(item) }));
    d.offerings.forEach((item) => push({ ref: `discovery:oferta:${item.id}`, kind: "discovery", label: `Oferta · ${item.name}`, text: describe("offerings", item), status: statusOf(item) }));
    push({ ref: "discovery:comercial", kind: "discovery", label: "Proceso comercial", text: describe("salesProcess", d.salesProcess), status: statusOf(d.salesProcess) });
    d.targetSegments.forEach((item) => push({ ref: `discovery:segmento:${item.id}`, kind: "segmento", label: `Segmento · ${item.name}`, text: describe("targetSegments", item), status: statusOf(item) }));
    if (d.applicability.b2bIcps.applies) d.b2bIcps.forEach((item) => push({ ref: `discovery:icp:${item.id}`, kind: "icp", label: `ICP B2B · ${item.name}`, text: describe("b2bIcps", item), status: statusOf(item) }));
    if (d.applicability.b2cIcps.applies) d.b2cIcps.forEach((item) => push({ ref: `discovery:icp:${item.id}`, kind: "icp", label: `ICP B2C · ${item.name}`, text: describe("b2cIcps", item), status: statusOf(item) }));

    const itemText = (item: KnowledgeItem, labels: Map<string, string>) =>
      [...Object.entries(item.values).map(([key, value]) => [labels.get(key) ?? key, valueText(value)] as const).filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`), item.notes ? `Notas: ${item.notes}` : ""]
        .filter(Boolean)
        .join(" · ");
    const itemStatus = (item: KnowledgeItem): SourceStatus => (item.demo ? "demo" : item.status === "Validado" ? "validado" : "pendiente");

    // Benchmark: análisis por marca y conclusiones.
    for (const brand of k.benchmark.brands) {
      for (const item of brand.items) {
        const blueprint = benchmarkBlueprints.find((entry) => entry.id === item.section);
        const labels = new Map((blueprint?.fields ?? []).map((field) => [field.key, field.label]));
        push({ ref: `benchmark:${brand.id}:${item.id}`, kind: "benchmark", label: `${brand.name} · ${blueprint?.label ?? item.section}`, text: itemText(item, labels), status: brand.demo ? "demo" : itemStatus(item), date: item.observedAt || undefined });
      }
    }
    for (const finding of k.benchmark.findings) {
      push({ ref: `benchmark:conclusion:${finding.id}`, kind: "conclusion", label: `Conclusión · ${valueText(finding.values.category) || "Benchmark"}`, text: itemText(finding, new Map([["statement", "Enunciado"], ["explanation", "Explicación"], ["brand", "Marca"], ["impact", "Impacto"]])), status: itemStatus(finding) });
    }
    // Plan de Marketing: objetivos (Estrategia) y capítulos del módulo.
    for (const [serviceId, items] of Object.entries(k.plan.modules) as [ServiceId, KnowledgeItem[]][]) {
      if (serviceId !== profile.serviceId && serviceId !== "estrategia" && !(profile.serviceId === "estrategia")) continue;
      for (const item of items ?? []) {
        const blueprint = planBlueprints.find((entry) => entry.id === item.section);
        const labels = new Map((blueprint?.fields ?? []).map((field) => [field.key, field.label]));
        const kind: SourceKind = blueprint?.id === "objectives" ? "objetivo" : "plan";
        push({ ref: `plan:${serviceId}:${item.id}`, kind, label: `Plan · ${serviceLabel(serviceId)} · ${blueprint?.label ?? item.section}`, text: itemText(item, labels), status: itemStatus(item) });
      }
    }
    // Reuniones registradas en el conocimiento del cliente (solo las asociadas a este cliente).
    for (const meeting of k.meetings) {
      if (meeting.clientSlug && meeting.clientSlug !== slug) continue;
      if (meeting.association === "unrelated") continue;
      push({ ref: `reunion:${meeting.id}`, kind: "reunion", label: `Reunión · ${meeting.title}`, text: [meeting.summary, meeting.decisions.length ? `Decisiones: ${meeting.decisions.join("; ")}` : ""].filter(Boolean).join(" · "), status: meeting.demo ? "demo" : meeting.association === "automatic" ? "validado" : "pendiente", date: meeting.occurredAt });
    }
    // Alcance contratado.
    const scope = scopeForClient(client).find((item) => item.serviceId === profile.serviceId);
    const moduleConfig = modules.modules[profile.serviceId];
    if (moduleConfig?.scope) push({ ref: `alcance:${profile.serviceId}`, kind: "alcance", label: `Alcance contratado · ${serviceLabel(profile.serviceId)}`, text: moduleConfig.scope, status: moduleConfig.kind === "contracted" ? "validado" : "demo" });
    else if (scope) push({ ref: `alcance:${profile.serviceId}`, kind: "alcance", label: `Alcance · ${serviceLabel(profile.serviceId)}`, text: `${scope.summary} · ${scope.cadence} · Entregables: ${scope.deliverables.join(", ")}`, status: "demo" });
    if (profile.serviceId === "estrategia") push({ ref: "alcance:modulos", kind: "alcance", label: "Módulos activos", text: activeServices.map(serviceLabel).join(", "), status: "validado" });

    // Registros de módulos (otros y el propio).
    const existingWork: AssistantContextData["existingWork"] = [];
    related.forEach((item, index) => {
      const def = collectionDef(item.serviceId, item.collection);
      if (!def) return;
      const stored = readLocalValue<ModuleRecord[] | null>(raws[index] ?? "", null);
      const records = Array.isArray(stored) ? stored : seedRecords(slug, item.serviceId, item.collection);
      for (const record of records) {
        if (record.client !== slug) continue;
        if (item.only && !item.only(record)) continue;
        const title = record.values[def.titleKey] || record.id;
        const text = def.fields
          .filter((field) => field.key !== def.titleKey && record.values[field.key] && field.type !== "ref")
          .map((field) => `${field.label}: ${record.values[field.key]}`)
          .join(" · ");
        const ref = `${item.serviceId}:${item.collection}:${record.id}`;
        if (sources.some((source) => source.ref === ref)) continue;
        push({ ref, kind: item.kind, label: `${def.singular.charAt(0).toUpperCase()}${def.singular.slice(1)} · ${title}`, text: text || title, status: record.source === "demo" ? "demo" : "manual", date: record.updatedAt.slice(0, 10) });
        if (item.serviceId === profile.serviceId && item.collection === profile.collection) existingWork.push({ ref, label: title, text, recordId: record.id });
      }
    });

    // Recomendaciones vigentes del módulo y hallazgos de Benchmark que lo impactan.
    const recommendations: AssistantContextData["recommendations"] = [];
    for (const item of recommendationItems) {
      if (item.clientSlug !== slug || item.status === "Descartada") continue;
      const ref = `recomendacion:${item.id}`;
      recommendations.push({ ref, id: item.id, title: item.title, rationale: item.rationale, source: item.source, origin: item.origin, status: item.status, date: item.updatedAt?.slice(0, 10) });
      push({ ref, kind: "recomendacion", label: `Recomendación · ${item.title}`, text: `${item.rationale} (origen: ${item.source}, estado: ${item.status})`, status: item.origin === "demo" ? "demo" : "manual" });
    }
    for (const finding of k.benchmark.findings) {
      if (!finding.impactedServices?.includes(profile.serviceId)) continue;
      const statement = valueText(finding.values.statement);
      if (!statement) continue;
      recommendations.push({ ref: `benchmark:conclusion:${finding.id}`, id: finding.id, title: statement, rationale: valueText(finding.values.explanation), source: "Benchmark", origin: "benchmark", status: finding.status, date: finding.updatedAt?.slice(0, 10) });
    }

    const kinds = new Set(sources.map((source) => source.kind));
    const missing = profile.required.filter((rule) => !rule.kinds.some((kind) => kinds.has(kind))).map((rule) => rule.message);
    const validated = sources.filter((source) => source.status === "validado" && profile.sources.includes(source.kind));
    if (!validated.length) missing.push("Ninguna fuente relevante está validada: las ideas se apoyarían en información pendiente o de demostración.");
    return {
      sources: sources.filter((source) => profile.sources.includes(source.kind) || source.kind === "trabajo").slice(0, MAX_SOURCES),
      existingWork,
      recommendations,
      missing,
      hydrated: knowledgeHydrated && recordsHydrated && recommendationsHydrated,
    };
  }, [activeServices, client, k, knowledgeHydrated, modules.modules, profile, raws, recommendationItems, recommendationsHydrated, recordsHydrated, related]);
}
