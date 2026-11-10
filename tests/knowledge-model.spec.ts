import { test, expect } from "@playwright/test";
import { osClients } from "../app/v2/os/os-data";
import {
  seedKnowledge,
  discoveryOf,
  replaceDiscovery,
  acknowledgeReviews,
} from "../app/v2/os/knowledge/state";
import {
  newSource,
  demoMeeting,
  importMeeting,
  associateMeeting,
  sameMeeting,
  type ClientMatchProfile,
} from "../app/v2/os/knowledge/sources";
import {
  questionnaireToProposals,
  meetingToProposals,
  newProposal,
  reviewProposal,
  editProposal,
  validatedDiscoveryToBenchmark,
} from "../app/v2/os/knowledge/proposals";
import {
  questionnaireTemplate,
  answerPresent,
} from "../app/v2/os/knowledge/questionnaire";
import {
  newBrand,
  newItem,
  saveBrand,
  captureBenchmark,
  benchmarkReport,
  validateItem,
} from "../app/v2/os/knowledge/benchmark";
import {
  saveBenchmarkItem,
  savePlanItem,
  deletePlanItem,
} from "../app/v2/os/knowledge/mutations";
import {
  visiblePlan,
  allocationErrors,
  validatePlanItem,
  sitemapTree,
} from "../app/v2/os/knowledge/plan";
import {
  planBlueprints,
  benchmarkBlueprints,
} from "../app/v2/os/knowledge/blueprints";
import {
  UnconfiguredScanAdapter,
  runBenchmarkScan,
} from "../app/v2/os/knowledge/scan-adapter";
const client = osClients.find((c) => c.slug === "epsa")!;
const ctx = { actor: "PM QA", at: "2026-11-10T12:00:00.000Z" };
function fresh() {
  return seedKnowledge(client);
}
function withSource() {
  const k = fresh();
  return {
    ...k,
    sources: [
      ...k.sources,
      {
        ...newSource(client.slug, ctx),
        id: "real",
        title: "Fuente QA",
        validationStatus: "Validado" as const,
        externalUrl: "https://example.com/evidence",
        evidence: "Verificado",
      },
    ],
  };
}
test("questionnaire covers every Discovery collection with plain-language mapping", () => {
  const sections = questionnaireTemplate.sections;
  expect(sections.map((s) => s.id)).toEqual(
    expect.arrayContaining([
      "companyProfile",
      "relevantFacts",
      "businessUnits",
      "offerings",
      "salesProcess",
      "stages",
      "targetSegments",
      "b2bIcps",
      "b2cIcps",
      "materials",
    ]),
  );
  for (const q of sections.flatMap((s) => s.questions))
    expect(q.targetFieldPath).toBeTruthy();
  expect(answerPresent([{}])).toBe(false);
  expect(answerPresent([{ value: 0, unit: "años" }])).toBe(true);
});
test("questionnaire proposes, deduplicates and only approval mutates/version Discovery", () => {
  let k = fresh();
  const before = k.discovery.companyProfile.coverage;
  k.questionnaire.responses["companyProfile.coverage"] = {
    questionId: "companyProfile.coverage",
    value: "Argentina y Uruguay",
    status: "answered",
    sourceReference: "Reunión con cliente",
    permission: "public",
    clarification: "",
    updatedAt: ctx.at,
    updatedBy: ctx.actor,
  };
  k = questionnaireToProposals(k, ctx);
  expect(k.discovery.companyProfile.coverage).toBe(before);
  expect(k.proposals).toHaveLength(1);
  expect(questionnaireToProposals(k, ctx).proposals).toHaveLength(1);
  k = reviewProposal(k, k.proposals[0].id, "approve", ctx);
  expect(k.discovery.companyProfile.coverage).toBe("Argentina y Uruguay");
  expect(
    k.versions.filter((v) => v.entityType === "companyProfile"),
  ).toHaveLength(2);
  expect(k.reviews.some((r) => r.entityType === "benchmark")).toBe(true);
  expect(k.reviews.some((r) => r.entityType === "marketing-plan")).toBe(true);
  expect(reviewProposal(k, k.proposals[0].id, "approve", ctx)).toBe(k);
});
test("draft and clarification answers do not create proposals; collection identity stable", () => {
  let k = fresh();
  k.questionnaire.responses["relevantFacts.records"] = {
    questionId: "relevantFacts.records",
    value: [
      {
        _id: "a",
        name: "Dato",
        value: "10",
        unit: "años",
        _source: "Registro",
        _permission: "public",
      },
    ],
    status: "draft",
    sourceReference: "",
    permission: "public",
    clarification: "",
    updatedAt: ctx.at,
    updatedBy: ctx.actor,
  };
  expect(questionnaireToProposals(k, ctx).proposals).toHaveLength(0);
  k.questionnaire.responses["relevantFacts.records"].status = "answered";
  k = questionnaireToProposals(k, ctx);
  expect(k.proposals[0].targetEntityId).toBe("questionnaire-relevantFacts-a");
  expect(k.proposals[0].evidence[0].excerpt).toContain("_permission");
  k = reviewProposal(k, k.proposals[0].id, "approve", ctx);
  expect(
    k.discovery.relevantFacts.some(
      (r) => r.id === "questionnaire-relevantFacts-a",
    ),
  ).toBe(true);
});
test("stale proposals, foreign sources and high-impact batch changes are rejected", () => {
  let k = withSource();
  const p = newProposal(
    k,
    "real",
    "companyProfile",
    "tagline",
    "Nueva promesa",
    "Evidencia",
    ctx,
  );
  k = { ...k, proposals: [p] };
  expect(() => reviewProposal(k, p.id, "approve", ctx, "", true)).toThrow(
    /bajo riesgo/,
  );
  const changed = structuredClone(k);
  changed.discovery.companyProfile.tagline = "Cambio concurrente";
  expect(() => reviewProposal(changed, p.id, "approve", ctx)).toThrow(
    /actual cambió/,
  );
  const foreign = { ...k, sources: k.sources.filter((s) => s.id !== "real") };
  expect(() => reviewProposal(foreign, p.id, "approve", ctx)).toThrow(/fuente/);
  const edited = editProposal(
    changed,
    p.id,
    {
      targetModule: "discovery",
      targetSection: "companyProfile",
      targetEntityId: p.targetEntityId,
      targetFieldPath: "tagline",
      proposedValue: "Revisada",
    },
    ctx,
  );
  expect(
    reviewProposal(edited, p.id, "approve", ctx).discovery.companyProfile
      .tagline,
  ).toBe("Revisada");
});
test("rejection preserves values; arbitrary target paths cannot be applied", () => {
  let k = withSource();
  const p = newProposal(k, "real", "companyProfile", "tagline", "X", "E", ctx);
  k = { ...k, proposals: [p] };
  const rejected = reviewProposal(k, p.id, "reject", ctx, "No relevante");
  expect(rejected.discovery).toEqual(k.discovery);
  expect(rejected.proposals[0].status).toBe("rejected");
  k.proposals[0].targetFieldPath = "__proto__";
  k.proposals[0].previousValue = null;
  expect(() => reviewProposal(k, p.id, "approve", ctx)).toThrow();
});
test("meeting association follows priority and never automatically picks ambiguous candidates", async () => {
  const meeting = await demoMeeting();
  const profiles: ClientMatchProfile[] = [
    {
      slug: "epsa",
      aliases: ["EPSA"],
      emails: ["buyer@epsa.com"],
      domains: ["epsa.com"],
      eventIds: ["saved"],
      folderIds: [],
      documentIds: [],
    },
    {
      slug: "aca",
      aliases: ["ACA"],
      emails: [],
      domains: ["aca.com"],
      eventIds: [],
      folderIds: [],
      documentIds: [],
    },
  ];
  expect(associateMeeting(meeting, profiles).association).toBe("suggested");
  expect(
    associateMeeting({ ...meeting, title: "EPSA y ACA" }, profiles).candidates,
  ).toHaveLength(2);
  expect(
    associateMeeting(
      { ...meeting, title: "EPSA y ACA", eventId: "saved" },
      profiles,
    ).clientSlug,
  ).toBe("epsa");
  expect(
    associateMeeting(
      { ...meeting, attendees: ["buyer@epsa.com"], explicitClientSlug: "aca" },
      profiles,
    ).clientSlug,
  ).toBe("aca");
  expect(
    associateMeeting(
      { ...meeting, title: "X", summary: "X", attendees: ["bad@fakeepsa.com"] },
      profiles,
    ).clientSlug,
  ).toBe("");
});
test("manual DEMO import and repeat delivery do not duplicate sources or proposals", async () => {
  const meeting = { ...(await demoMeeting()), clientSlug: "epsa" };
  let k = importMeeting(fresh(), meeting, ctx);
  const count = k.sources.length;
  k = meetingToProposals(k, meeting.sourceId, ctx);
  expect(k.proposals).toHaveLength(1);
  expect(k.discovery.companyProfile.coverage).not.toContain("prueba");
  k = importMeeting(k, { ...meeting, id: "other", sourceId: "other" }, ctx);
  expect(k.sources).toHaveLength(count);
  expect(meetingToProposals(k, meeting.sourceId, ctx).proposals).toHaveLength(
    1,
  );
  expect(() =>
    importMeeting(k, { ...meeting, clientSlug: "aca" }, ctx),
  ).toThrow(/cliente/);
  for (const key of [
    "workspaceEventId",
    "conferenceRecordId",
    "smartNoteName",
    "documentId",
    "hash",
  ] as const) {
    const a = {
      ...meeting,
      workspaceEventId: "",
      conferenceRecordId: "",
      smartNoteName: "",
      documentId: "",
      hash: "",
      [key]: "dedup",
    };
    expect(sameMeeting(a, { ...a, id: "other" })).toBe(true);
  }
});
test("legacy Discovery is preserved and isolated by client", () => {
  const original = discoveryOf(fresh());
  original.companyProfile.definition = "Dato anterior";
  const migrated = seedKnowledge(client, original);
  expect(migrated.discovery.companyProfile.definition).toBe("Dato anterior");
  const other = seedKnowledge(
    osClients.find((c) => c.slug === "aca")!,
    original,
  );
  expect(other.discovery.companyProfile.definition).not.toBe("Dato anterior");
  expect(validatedDiscoveryToBenchmark(fresh()).segments).toHaveLength(0);
});
test("approval dependencies keep other module reviews pending", () => {
  const k = withSource();
  const d = structuredClone(discoveryOf(k));
  d.companyProfile.definition = "Nueva definición";
  const changed = replaceDiscovery(k, d, ctx);
  const reviewed = acknowledgeReviews(
    changed,
    "marketing-plan",
    "estrategia",
    ctx,
  );
  expect(
    reviewed.reviews.filter(
      (r) => r.entityType === "marketing-plan" && !r.resolvedAt,
    ).length,
  ).toBeGreaterThan(0);
  expect(
    reviewed.versions.some(
      (v) => v.entityType === "marketing-plan" && v.entityId === "estrategia",
    ),
  ).toBe(true);
  expect(reviewed.plan).toEqual(changed.plan);
});
test("brands enforce four main competitors, allow additional brands and real evidence", () => {
  let k = {
    ...withSource(),
    benchmark: {
      ...withSource().benchmark,
      brands: [newBrand(client.name, true)],
    },
  };
  for (let i = 0; i < 4; i++) k = saveBrand(k, newBrand(`B${i}`));
  expect(() => saveBrand(k, newBrand("Fifth"))).toThrow(/cuatro/);
  expect(
    saveBrand(k, { ...newBrand("Additional"), principal: false }).benchmark
      .brands,
  ).toHaveLength(6);
  expect(() =>
    saveBrand(k, {
      ...newBrand("Valid"),
      principal: false,
      status: "Validado",
    }),
  ).toThrow(/validación/);
});
test("Benchmark snapshots and report compare saved evidence without modifying history", () => {
  let k = withSource();
  let item = {
    ...newItem("overview", ctx),
    values: { claim: "Promesa original" },
  };
  k = saveBenchmarkItem(k, item, "own", ctx);
  k = captureBenchmark(k, "own", ctx);
  expect(benchmarkReport(k).find((r) => r.brand === client.name)?.pending).toBe(
    true,
  );
  item = { ...item, values: { claim: "Promesa nueva" } };
  k = saveBenchmarkItem(k, item, "own", ctx);
  k = captureBenchmark(k, "own", { ...ctx, at: "2026-11-24T12:00:00.000Z" });
  expect(k.benchmark.snapshots[0].brand.items[0].values.claim).toBe(
    "Promesa original",
  );
  expect(benchmarkReport(k)[0].changes[0].section).toBe("Resumen general");
  expect(
    validateItem(k, { ...item, status: "Validado" }, benchmarkBlueprints[0])
      .length,
  ).toBeGreaterThan(0);
});
test("active-service selectors preserve hidden data and unsupported services have no invented template", () => {
  let k = withSource();
  const item = {
    ...newItem("objectives", ctx),
    values: { statement: "Objetivo QA" },
  };
  k = savePlanItem(k, item, "estrategia", ["estrategia"], ctx);
  expect(visiblePlan(k, [])).toHaveLength(0);
  expect(visiblePlan(k, ["estrategia"])[0].items).toHaveLength(1);
  expect(visiblePlan(k, ["crm"])[0].templatePending).toBe(true);
  expect(() => savePlanItem(k, item, "estrategia", [], ctx)).toThrow(
    /inactivo/,
  );
});
test("media percentages, missing channel distributions and invalid links are checked", () => {
  const campaign = {
    ...newItem("campaigns", ctx),
    values: { name: "QA", share: 60 },
  };
  expect(allocationErrors([campaign])).toContain(
    "La distribución entre campañas debe sumar 100%",
  );
  expect(
    allocationErrors([
      { ...campaign, values: { ...campaign.values, share: 100 } },
    ]),
  ).toContain("Los canales de QA deben sumar 100%");
  const channel = {
    ...newItem("allocations", ctx),
    values: { campaignIds: [campaign.id], share: 100 },
  };
  expect(
    allocationErrors([
      { ...campaign, values: { ...campaign.values, share: 100 } },
      channel,
    ]),
  ).toHaveLength(0);
  expect(
    validatePlanItem(
      withSource(),
      channel,
      planBlueprints.find((b) => b.id === "allocations")!,
      "publicidad-digital",
    ),
  ).toContain("Campaña: vínculo inexistente");
});
test("sitemap prevents cycles and deletion of referenced parent", () => {
  let k = withSource();
  const root = {
    ...newItem("sitemap", ctx),
    values: { name: "Home", parentIds: [] },
  };
  k = savePlanItem(k, root, "desarrollo-web", ["desarrollo-web"], ctx);
  const child = {
    ...newItem("sitemap", ctx),
    values: { name: "Hijo", parentIds: [root.id] },
  };
  k = savePlanItem(k, child, "desarrollo-web", ["desarrollo-web"], ctx);
  expect(sitemapTree(k.plan.modules["desarrollo-web"]!)[1].depth).toBe(1);
  expect(() =>
    savePlanItem(
      k,
      { ...root, values: { ...root.values, parentIds: [child.id] } },
      "desarrollo-web",
      ["desarrollo-web"],
      ctx,
    ),
  ).toThrow(/ciclos/);
  expect(() => deletePlanItem(k, root, "desarrollo-web", ctx)).toThrow(
    /vinculado/,
  );
});
test("scan provider without configuration never fabricates a result", async () => {
  const k = fresh();
  const result = await runBenchmarkScan(
    k.benchmark.scan,
    k.benchmark.brands[0],
    [],
    new UnconfiguredScanAdapter(),
    new AbortController().signal,
  );
  expect(result.job.status).toBe("pending-configuration");
  expect(result.result).toBeUndefined();
});
