import { discoverySeed } from "../discovery/seed";
import {
  isDiscovery,
  refreshDiscovery,
  recordsOf,
  type MarketingDiscovery,
} from "../discovery/model";
import { fields, type EntityKind } from "../discovery/schema";
import {
  directorMeta,
  type ClientDocument,
  type CompetitorSnapshot,
} from "../director-data";
import { strategyByClient, serviceCatalog, type OsClient } from "../os-data";
import { emptyQuestionnaire } from "./questionnaire";
import { newBrand } from "./benchmark";
import { newSource, sourceFromDiscovery, sourceToDiscovery } from "./sources";
import { newId, type KnowledgeState, type MutationContext } from "./types";
export const knowledgeKey = (slug: string) => `client:${slug}:knowledge:v1`;
export function discoveryOf(k: KnowledgeState): MarketingDiscovery {
  return refreshDiscovery({
    ...k.discovery,
    sources: k.sources.map(sourceToDiscovery),
  });
}
export function seedKnowledge(
  client: OsClient,
  legacy?: unknown,
  documents?: ClientDocument[],
  competitors?: CompetitorSnapshot[],
): KnowledgeState {
  const discovery = isDiscovery(legacy, client.slug)
    ? legacy
    : discoverySeed(client);
  const { sources, ...rest } = discovery;
  const ctx = { actor: "Migración local", at: discovery.updatedAt || "" };
  const meta = directorMeta(client.slug);
  const canonical = sources.map((s) => sourceFromDiscovery(s, client.slug));
  for (const doc of documents ?? meta?.documents ?? [])
    if (!canonical.some((s) => s.metadata.documentId === doc.id))
      canonical.push({
        ...newSource(client.slug, ctx),
        id: `legacy-doc-${doc.id}`,
        type: "document",
        title: doc.name,
        externalUrl: /^https?:\/\//.test(doc.source) ? doc.source : "",
        metadata: { documentId: doc.id, legacy: doc },
        demo: true,
        status: "needs-review",
      });
  const legacyPlan = strategyByClient[client.slug];
  if (legacyPlan)
    canonical.push({
      ...newSource(client.slug, ctx),
      id: "legacy-plan",
      title: "Plan anterior · demostración conservada",
      type: "document",
      rawText: JSON.stringify(legacyPlan, null, 2),
      metadata: { legacyPlan },
      demo: true,
      status: "needs-review",
    });
  return {
    version: 1,
    clientSlug: client.slug,
    revision: 0,
    discovery: rest,
    questionnaire: emptyQuestionnaire(),
    sources: canonical,
    meetings: [],
    proposals: [],
    benchmark: {
      brands: [
        { ...newBrand(client.name, true), id: "own" },
        ...(competitors ?? meta?.competitors ?? []).map((c, i) => ({
          ...newBrand(c.name),
          id: `legacy-brand-${i}`,
          principal: i < 4,
          demo: true,
          rationale: c.positioning,
          region: "",
          items: [],
        })),
      ],
      snapshots: [],
      findings: [],
      scan: {
        id: "scan",
        status: "pending-configuration",
        adapter: "connected-provider",
        lastRunAt: "",
        nextRunAt: "",
        cadence: "biweekly",
        sourceIds: [],
        error: "",
      },
    },
    plan: { modules: {} },
    dependencies: [],
    versions: [],
    reviews: [],
    audit: [],
    updatedAt: ctx.at,
    updatedBy: ctx.actor,
  };
}
export function isKnowledge(v: unknown, slug: string): v is KnowledgeState {
  if (!v || typeof v !== "object") return false;
  const k = v as KnowledgeState;
  return (
    k.version === 1 &&
    k.clientSlug === slug &&
    Number.isInteger(k.revision) &&
    !!k.discovery &&
    Array.isArray(k.sources) &&
    k.sources.every((s) => s.clientSlug === slug) &&
    Array.isArray(k.proposals) &&
    Array.isArray(k.meetings) &&
    !!k.questionnaire?.responses &&
    Array.isArray(k.benchmark?.brands) &&
    Array.isArray(k.benchmark?.snapshots) &&
    !!k.plan?.modules &&
    Array.isArray(k.versions) &&
    Array.isArray(k.reviews) &&
    Array.isArray(k.audit) &&
    isDiscovery(
      { ...k.discovery, sources: k.sources.map(sourceToDiscovery) },
      slug,
    )
  );
}
export function versionChange(
  k: KnowledgeState,
  type: string,
  id: string,
  before: unknown,
  after: unknown,
  ctx: MutationContext,
  sourceId?: string,
  proposalId?: string,
): KnowledgeState {
  if (JSON.stringify(before) === JSON.stringify(after)) return k;
  const previous = k.versions.filter(
    (v) => v.entityType === type && v.entityId === id,
  );
  let version = previous.reduce((n, v) => Math.max(n, v.version), 0);
  const versions = [...k.versions];
  if (!previous.length && before !== undefined)
    versions.push({
      id: newId(),
      entityType: type,
      entityId: id,
      version: ++version,
      changedAt: ctx.at,
      changedBy: ctx.actor,
      snapshot: structuredClone(before),
      sourceId,
      proposalId,
    });
  versions.push({
    id: newId(),
    entityType: type,
    entityId: id,
    version: ++version,
    changedAt: ctx.at,
    changedBy: ctx.actor,
    snapshot: structuredClone(after ?? null),
    sourceId,
    proposalId,
  });
  return {
    ...k,
    versions,
    audit: [
      ...k.audit,
      {
        id: newId(),
        at: ctx.at,
        actor: ctx.actor,
        sourceId,
        proposalId,
        action: `Actualización de ${type} · ${id} · versión ${version}`,
      },
    ],
  };
}
export function rebuildDependencies(k: KnowledgeState): KnowledgeState {
  const deps: KnowledgeState["dependencies"] = [];
  for (const brand of k.benchmark.brands) {
    for (const id of brand.segmentIds)
      deps.push({
        sourceEntityType: "targetSegments",
        sourceEntityId: id,
        targetEntityType: "benchmark",
        targetEntityId: brand.id,
        dependencyReason: `Segmento utilizado por ${brand.name}`,
      });
    for (const item of brand.items)
      for (const id of item.discoveryRefs)
        deps.push({
          sourceEntityType: "discovery",
          sourceEntityId: id,
          targetEntityType: "benchmark",
          targetEntityId: brand.id,
          dependencyReason: `Hallazgo utilizado en ${brand.name}`,
        });
  }
  for (const [service, items] of Object.entries(k.plan.modules))
    for (const item of items ?? []) {
      for (const id of item.discoveryRefs)
        deps.push({
          sourceEntityType: "discovery",
          sourceEntityId: id,
          targetEntityType: "marketing-plan",
          targetEntityId: service,
          dependencyReason: `Hallazgo utilizado en ${item.section}`,
        });
      for (const id of item.findingIds)
        deps.push({
          sourceEntityType: "finding",
          sourceEntityId: id,
          targetEntityType: "marketing-plan",
          targetEntityId: service,
          dependencyReason: `Conclusión utilizada en ${item.section}`,
        });
      for (const id of Array.isArray(item.values.icpIds)
        ? item.values.icpIds
        : [])
        deps.push({
          sourceEntityType: "discovery",
          sourceEntityId: id,
          targetEntityType: "marketing-plan",
          targetEntityId: service,
          dependencyReason: "Perfil utilizado en contenidos",
        });
    }
  for (const icp of [...k.discovery.b2bIcps, ...k.discovery.b2cIcps])
    if (icp.segmentId)
      deps.push({
        sourceEntityType: "targetSegments",
        sourceEntityId: icp.segmentId,
        targetEntityType: "discovery",
        targetEntityId: icp.id,
        dependencyReason: "Perfil asociado al segmento",
      });
  return { ...k, dependencies: deps };
}
export function flagDependents(
  k: KnowledgeState,
  type: string,
  id: string,
  reason: string,
  ctx: MutationContext,
  sourceId?: string,
) {
  const linked = rebuildDependencies(k);
  const targets = linked.dependencies
    .filter((d) => d.sourceEntityId === id)
    .map((d) => ({
      entityType: d.targetEntityType,
      entityId: d.targetEntityId,
      reason: `${reason}. ${d.dependencyReason}`,
    }));
  if (type !== "finding" && type !== "benchmark" && type !== "marketing-plan")
    targets.push(
      ...k.benchmark.brands.map((b) => ({
        entityType: "benchmark",
        entityId: b.id,
        reason,
      })),
      ...serviceCatalog.map((s) => ({
        entityType: "marketing-plan",
        entityId: s.id,
        reason,
      })),
    );
  if (type === "finding") {
    const finding = k.benchmark.findings.find((f) => f.id === id);
    for (const service of finding?.impactedServices ?? [])
      targets.push({ entityType: "marketing-plan", entityId: service, reason });
  }
  const reviews = [...linked.reviews];
  for (const t of targets)
    if (
      !reviews.some(
        (r) =>
          !r.resolvedAt &&
          r.entityType === t.entityType &&
          r.entityId === t.entityId &&
          r.reason === t.reason,
      )
    )
      reviews.push({ ...t, id: newId(), changedAt: ctx.at, sourceId });
  return { ...linked, reviews };
}
export function replaceDiscovery(
  k: KnowledgeState,
  d: MarketingDiscovery,
  ctx: MutationContext,
  sourceId?: string,
  proposalId?: string,
): KnowledgeState {
  if (d.clientSlug !== k.clientSlug) throw new Error("Cliente incompatible");
  const before = discoveryOf(k);
  const { sources, ...rest } = refreshDiscovery(d);
  for (const removed of k.sources.filter(
    (s) => !sources.some((x) => x.id === s.id),
  )) {
    if (
      k.proposals.some((p) => p.sourceId === removed.id) ||
      k.meetings.some((m) => m.sourceId === removed.id) ||
      k.benchmark.brands.some(
        (b) =>
          b.sourceIds.includes(removed.id) ||
          b.items.some((i) => i.sourceIds.includes(removed.id)),
      ) ||
      k.benchmark.findings.some((f) => f.sourceIds.includes(removed.id)) ||
      Object.values(k.plan.modules)
        .flat()
        .some((i) => i?.sourceIds.includes(removed.id))
    )
      throw new Error(
        "La fuente está vinculada a reuniones, propuestas, Benchmark o Plan. Debe conservarse su trazabilidad.",
      );
  }
  let next = {
    ...k,
    discovery: rest,
    sources: sources.map((s) =>
      sourceFromDiscovery(
        s,
        k.clientSlug,
        k.sources.find((x) => x.id === s.id),
      ),
    ),
  };
  for (const kind of Object.keys(fields) as EntityKind[]) {
    const old = recordsOf(before, kind),
      rows = recordsOf(d, kind);
    for (const id of new Set([
      ...old.map((r) => r.id),
      ...rows.map((r) => r.id),
    ])) {
      const a = old.find((r) => r.id === id),
        b = rows.find((r) => r.id === id);
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        next = versionChange(next, kind, id, a, b, ctx, sourceId, proposalId);
        if (kind !== "sources")
          next = flagDependents(
            next,
            kind,
            id,
            `Cambió ${kind}: ${id}`,
            ctx,
            sourceId,
          );
      }
    }
  }
  return next;
}
export function acknowledgeReviews(
  k: KnowledgeState,
  type: string,
  id: string,
  ctx: MutationContext,
) {
  const current = k.reviews.filter(
    (r) =>
      !r.resolvedAt &&
      r.entityType === type &&
      (id === "all" || r.entityId === id || r.entityId === "all"),
  );
  if (!current.length) return k;
  let next = versionChange(
    k,
    type,
    id,
    { notices: current, module: type === "benchmark" ? k.benchmark : k.plan },
    {
      reviewed: true,
      reviewedAt: ctx.at,
      reviewedBy: ctx.actor,
      module: type === "benchmark" ? k.benchmark : k.plan,
    },
    ctx,
  );
  next = {
    ...next,
    reviews: next.reviews.map((r) =>
      current.some((x) => x.id === r.id)
        ? { ...r, resolvedAt: ctx.at, resolvedBy: ctx.actor }
        : r,
    ),
  };
  return next;
}
