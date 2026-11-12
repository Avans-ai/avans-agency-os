import {
  benchmarkBlueprints,
  findingBlueprint,
  planBlueprints,
} from "./blueprints";
import { validateItem } from "./benchmark";
import { validatePlanItem } from "./plan";
import { flagDependents, rebuildDependencies, versionChange } from "./state";
import { serviceCatalog, type ServiceId } from "../os-data";
import type {
  KnowledgeState,
  KnowledgeItem,
  BenchmarkFinding,
  MutationContext,
} from "./types";
export function saveBenchmarkItem(
  k: KnowledgeState,
  item: KnowledgeItem,
  brandId: string | undefined,
  ctx: MutationContext,
) {
  const bp = brandId
    ? benchmarkBlueprints.find((b) => b.id === item.section)
    : findingBlueprint;
  if (!bp) throw new Error("Bloque inexistente");
  const errors = validateItem(k, item, bp);
  if (errors.length) throw new Error(errors.join(" · "));
  const stamped = { ...item, updatedAt: ctx.at, updatedBy: ctx.actor };
  if (brandId) {
    const brand = k.benchmark.brands.find((b) => b.id === brandId);
    if (!brand) throw new Error("Marca inexistente");
    const next = versionChange(
      k,
      "benchmark",
      item.id,
      brand.items.find((i) => i.id === item.id),
      stamped,
      ctx,
    );
    return rebuildDependencies({
      ...next,
      benchmark: {
        ...next.benchmark,
        brands: next.benchmark.brands.map((b) =>
          b.id === brandId
            ? {
                ...b,
                items: [...b.items.filter((i) => i.id !== item.id), stamped],
              }
            : b,
        ),
      },
    });
  }
  const services = Array.isArray(item.values.impactedServices)
    ? (item.values.impactedServices as ServiceId[])
    : [];
  if (services.some((id) => !serviceCatalog.some((s) => s.id === id)))
    throw new Error("Servicio inexistente");
  const finding: BenchmarkFinding = { ...stamped, impactedServices: services };
  const next = versionChange(
    k,
    "finding",
    item.id,
    k.benchmark.findings.find((f) => f.id === item.id),
    finding,
    ctx,
  );
  return flagDependents(
    {
      ...next,
      benchmark: {
        ...next.benchmark,
        findings: [
          ...next.benchmark.findings.filter((f) => f.id !== item.id),
          finding,
        ],
      },
    },
    "finding",
    item.id,
    "Se actualizó una conclusión del Benchmark",
    ctx,
  );
}
export function deleteBenchmarkItem(
  k: KnowledgeState,
  item: KnowledgeItem,
  ctx: MutationContext,
) {
  if (
    Object.values(k.plan.modules)
      .flat()
      .some((i) => i?.findingIds.includes(item.id))
  )
    throw new Error(
      "La conclusión está vinculada al Plan. Revisá esos vínculos antes de quitarla.",
    );
  const next = versionChange(
    k,
    item.section === "finding" ? "finding" : "benchmark",
    item.id,
    item,
    null,
    ctx,
  );
  return rebuildDependencies({
    ...next,
    benchmark: {
      ...next.benchmark,
      brands: next.benchmark.brands.map((b) => ({
        ...b,
        items: b.items.filter((i) => i.id !== item.id),
      })),
      findings: next.benchmark.findings.filter((f) => f.id !== item.id),
    },
  });
}
export function savePlanItem(
  k: KnowledgeState,
  item: KnowledgeItem,
  service: ServiceId,
  active: ServiceId[],
  ctx: MutationContext,
) {
  if (!active.includes(service))
    throw new Error(
      "El módulo está inactivo. Los datos anteriores se conservan.",
    );
  const bp = planBlueprints.find(
    (b) => b.service === service && b.id === item.section,
  );
  if (!bp) throw new Error("Plantilla estratégica pendiente de definición");
  const errors = validatePlanItem(k, item, bp, service);
  if (errors.length) throw new Error(errors.join(" · "));
  const items = k.plan.modules[service] ?? [];
  const stamped = { ...item, updatedAt: ctx.at, updatedBy: ctx.actor };
  const next = versionChange(
    k,
    "marketing-plan",
    item.id,
    items.find((i) => i.id === item.id),
    stamped,
    ctx,
  );
  return rebuildDependencies({
    ...next,
    plan: {
      modules: {
        ...next.plan.modules,
        [service]: [...items.filter((i) => i.id !== item.id), stamped],
      },
    },
  });
}
export function deletePlanItem(
  k: KnowledgeState,
  item: KnowledgeItem,
  service: ServiceId,
  ctx: MutationContext,
) {
  const items = k.plan.modules[service] ?? [];
  if (
    items.some(
      (i) =>
        i.id !== item.id &&
        Object.values(i.values).some(
          (v) => Array.isArray(v) && v.includes(item.id),
        ),
    )
  )
    throw new Error(
      "Este registro está vinculado a otras decisiones. Quitá esos vínculos primero.",
    );
  const next = versionChange(k, "marketing-plan", item.id, item, null, ctx);
  return rebuildDependencies({
    ...next,
    plan: {
      modules: {
        ...next.plan.modules,
        [service]: items.filter((i) => i.id !== item.id),
      },
    },
  });
}
