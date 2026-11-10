import catalog from "./master-catalog.json";
import { discoveryOf } from "../state";
import { recordsOf, isValidated } from "../../discovery/model";
import { fields, type EntityKind } from "../../discovery/schema";
import {
  benchmarkBlueprints,
  findingBlueprint,
  planBlueprints,
} from "../blueprints";
import { itemMissing, validateItem, benchmarkCoverage } from "../benchmark";
import { planCoverage, validatePlanItem, allocationErrors } from "../plan";
import { serviceLabel, type OsClient, type ServiceId } from "../../os-data";
import {
  newId,
  type KnowledgeState,
  type KnowledgeItem,
  type MutationContext,
  type BenchmarkBrand,
} from "../types";
import type {
  PresentationManifest,
  PresentationSlideManifest,
  PresentationSnapshot,
  PresentationMode,
  PreparationBlock,
  PresentationExport,
} from "./types";
export const MASTER_VERSION = catalog.version;
export const MASTER_SHA256 = catalog.sha256;
export const DRAFT_WATERMARK = "BORRADOR INTERNO — NO ENVIAR AL CLIENTE";
const ranges: { id: ServiceId; start: number; end: number }[] = [
  { id: "estrategia", start: 27, end: 31 },
  { id: "diseno-marca", start: 32, end: 34 },
  { id: "publicidad-digital", start: 35, end: 40 },
  { id: "contenidos", start: 41, end: 44 },
  { id: "audiovisuales", start: 45, end: 47 },
  { id: "desarrollo-web", start: 48, end: 53 },
];
const safeText = (v: unknown): string =>
  v === null || v === undefined
    ? ""
    : Array.isArray(v)
      ? v.map(safeText).filter(Boolean).join(" · ")
      : String(v)
          .replace(/[\[\]]/g, "")
          .trim();
const join = (...values: unknown[]) =>
  values.map(safeText).filter(Boolean).join(" · ");
const values = (item: KnowledgeItem | undefined, ...keys: string[]) =>
  join(...keys.map((key) => item?.values[key]));
function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out.length ? out : [[]];
}
const binding = (ids: (string | number)[], vals: unknown[]) =>
  Object.fromEntries(ids.map((id, i) => [String(id), safeText(vals[i])]));
export function presentationSnapshot(
  k: KnowledgeState,
  active: ServiceId[],
  ctx: MutationContext,
): PresentationSnapshot {
  return structuredClone({
    discovery: k.discovery,
    benchmark: k.benchmark,
    marketingPlan: k.plan,
    includedServiceIds: [...active].sort(),
    sources: k.sources.map(
      ({
        id,
        title,
        type,
        contentHash,
        version,
        demo,
        validationStatus,
        externalUrl,
      }) => ({
        id,
        title,
        type,
        contentHash,
        version,
        demo,
        validationStatus,
        externalUrl,
      }),
    ),
    at: ctx.at,
    actor: ctx.actor,
  });
}
export function presentationIsStale(
  k: KnowledgeState,
  active: ServiceId[],
  record: PresentationExport,
) {
  const now = presentationSnapshot(k, active, {
    at: record.manifest.snapshot.at,
    actor: record.manifest.snapshot.actor,
  });
  return JSON.stringify(now) !== JSON.stringify(record.manifest.snapshot);
}
function preparation(
  k: KnowledgeState,
  active: ServiceId[],
  slug: string,
): PreparationBlock[] {
  const d = discoveryOf(k),
    base = `/v2/clientes/${slug}?view=`;
  const discoveryMissing = d.completion.sections.flatMap((s) =>
    s.notApplicable ? [] : s.missing.map((m) => `${s.label}: ${m}`),
  );
  const discoveryRows = (Object.keys(fields) as EntityKind[])
    .filter(
      (kind) =>
        kind !== "sources" &&
        !(kind === "b2bIcps" && !d.applicability.b2bIcps.applies) &&
        !(kind === "b2cIcps" && !d.applicability.b2cIcps.applies),
    )
    .flatMap((kind) => recordsOf(d, kind).map((r) => ({ kind, r })));
  const bmMissing: string[] = [],
    planMissing: string[] = [];
  let bmInvalid = 0,
    planInvalid = 0;
  for (const brand of k.benchmark.brands) {
    if (
      brand.type !== "Propia" &&
      (!brand.clientValidated || brand.status !== "Validado" || brand.demo)
    )
      bmInvalid++;
    for (const bp of benchmarkBlueprints) {
      const rows = brand.items.filter((i) => i.section === bp.id);
      if (!rows.length) bmMissing.push(`${brand.name}: ${bp.label}`);
      for (const item of rows) {
        bmMissing.push(
          ...itemMissing(item, bp).map(
            (x) => `${brand.name} · ${bp.label}: ${x}`,
          ),
        );
        if (
          item.status !== "Validado" ||
          item.demo ||
          validateItem(k, item, bp).length
        )
          bmInvalid++;
      }
    }
  }
  if (!k.benchmark.brands.some((b) => b.type !== "Propia"))
    bmMissing.push(
      "Seleccionar competidores y validar la selección con el cliente",
    );
  for (const category of findingBlueprint.fields[0].options ?? [])
    if (!k.benchmark.findings.some((f) => f.values.category === category))
      bmMissing.push(`Conclusión: ${category}`);
  for (const f of k.benchmark.findings)
    if (
      f.status !== "Validado" ||
      f.demo ||
      validateItem(k, f, findingBlueprint).length
    )
      bmInvalid++;
  for (const service of active)
    for (const bp of planBlueprints.filter((b) => b.service === service)) {
      const rows = (k.plan.modules[service] ?? []).filter(
        (i) => i.section === bp.id,
      );
      if (!rows.length)
        planMissing.push(`${serviceLabel(service)}: ${bp.label}`);
      for (const row of rows) {
        planMissing.push(
          ...itemMissing(row, bp).map(
            (f) => `${serviceLabel(service)} · ${bp.label}: ${f}`,
          ),
        );
        if (
          row.status !== "Validado" ||
          row.demo ||
          validatePlanItem(k, row, bp, service).length
        )
          planInvalid++;
      }
    }
  if (active.includes("publicidad-digital"))
    planMissing.push(
      ...allocationErrors(k.plan.modules["publicidad-digital"] ?? []),
    );
  const infos = [
    {
      id: "discovery" as const,
      label: "Discovery · páginas 5–12",
      percent: d.completion.percent,
      missing: discoveryMissing,
      unvalidated: discoveryRows.filter(
        ({ kind, r }) => !isValidated(d, kind, r),
      ).length,
      rows: discoveryRows.map((x) => x.r),
      href: base + "ficha",
    },
    {
      id: "benchmark" as const,
      label: "Benchmark · páginas 13–25",
      percent: Math.round(
        benchmarkCoverage(k.benchmark).reduce((n, b) => n + b.percent, 0) /
          Math.max(1, k.benchmark.brands.length),
      ),
      missing: bmMissing,
      unvalidated: bmInvalid,
      rows: [
        ...k.benchmark.brands.flatMap((b) => b.items),
        ...k.benchmark.findings,
      ],
      href: base + "benchmark",
    },
    {
      id: "marketing-plan" as const,
      label: "Plan de Marketing · páginas 26–53",
      percent: Math.round(
        active
          .filter((s) => ranges.some((r) => r.id === s))
          .reduce(
            (n, s) =>
              n +
              (100 *
                planCoverage(k.plan.modules[s] ?? [], s).filter(
                  (b) => b.complete,
                ).length) /
                Math.max(1, planCoverage(k.plan.modules[s] ?? [], s).length),
            0,
          ) /
          Math.max(
            1,
            active.filter((s) => ranges.some((r) => r.id === s)).length,
          ),
      ),
      missing: planMissing,
      unvalidated: planInvalid,
      rows: active.flatMap((s) => k.plan.modules[s] ?? []),
      href: base + "plan",
    },
  ];
  return infos.map(({ rows, ...x }) => ({
    ...x,
    sourceIds: Array.from(new Set(rows.flatMap((r) => r.sourceIds))),
    updatedAt:
      rows
        .map((r) => r.updatedAt)
        .sort()
        .at(-1) ?? "",
    owners: Array.from(new Set(rows.map((r) => r.owner).filter(Boolean))),
    slides: 0,
  }));
}
export function buildPresentationManifest(
  k: KnowledgeState,
  client: OsClient,
  active: ServiceId[],
  mode: PresentationMode,
  ctx: MutationContext,
): PresentationManifest {
  if (k.clientSlug !== client.slug)
    throw new Error("Los datos de presentación pertenecen a otro cliente.");
  const d = discoveryOf(k),
    slides: PresentationSlideManifest[] = [],
    warnings: string[] = [],
    missing: string[] = [],
    missingImages: string[] = [];
  const blocks = preparation(k, active, client.slug);
  for (const b of blocks) {
    missing.push(...b.missing);
    if (b.unvalidated)
      missing.push(
        `${b.label}: ${b.unvalidated} registros pendientes de validación o DEMO`,
      );
  }
  const unresolved = k.reviews.filter(
    (r) =>
      !r.resolvedAt &&
      (r.entityType !== "marketing-plan" ||
        r.entityId === "all" ||
        active.includes(r.entityId as ServiceId)),
  );
  if (unresolved.length)
    missing.push(
      `${unresolved.length} módulos o registros requieren revisión por cambios aprobados`,
    );
  const items = (service: ServiceId, section: string) =>
    (k.plan.modules[service] ?? []).filter((i) => i.section === section);
  const add = (
    number: number,
    replacements: Record<string, string> = {},
    entityId?: string,
    title?: string,
    imageUrls: string[] = [],
    remove: string[] = [],
  ): PresentationSlideManifest => {
    const template = catalog.slides[number - 1];
    const output: PresentationSlideManifest = {
      templateSlideKey: template.key,
      templateSlideNumber: number,
      outputOrder: slides.length + 1,
      repeatEntityId: entityId,
      title: title ?? template.title,
      replacements: {},
      images: [],
      removeInstructionLayers: true,
      removeObjectKeys: [
        ...template.instructionIds,
        ...remove,
        ...((
          { 18: ["467", "472"], 23: ["598", "603"], 33: ["816"] } as Record<
            number,
            string[]
          >
        )[number] ?? []),
      ],
      warnings: [],
    };
    for (const slot of template.slots) {
      const value = replacements[slot.id];
      if (value) {
        output.replacements[slot.id] = safeText(value);
        if (value.length > 700)
          output.warnings.push(
            `Texto extenso en ${slot.id}: requiere revisión de ajuste en la plantilla.`,
          );
      } else if (value === "") {
        output.removeObjectKeys.push(slot.id);
      } else {
        const label = `Slide ${number} · ${title ?? template.title} · ${slot.text.replace(/[\[\]]/g, "").trim()}`;
        missing.push(label);
        output.replacements[slot.id] =
          mode === "internal-draft" ? "Pendiente de completar" : "";
      }
    }
    for (const [id, text] of Object.entries(replacements))
      if (!template.slots.some((s) => s.id === id))
        output.replacements[id] = safeText(text);
    let imageIndex = 0;
    output.images = template.pictures.map((pic) => {
      if (!pic.media.endsWith("/image5.png"))
        return {
          templateObjectKey: pic.id,
          action: "keep" as const,
          description: "Elemento original de la plantilla Avans",
        };
      const url = imageUrls[imageIndex++];
      if (url && /^https:\/\//.test(url))
        return {
          templateObjectKey: pic.id,
          action: "replace" as const,
          url,
          description: `Material visual para ${output.title}`,
        };
      const label = `Slide ${number} · ${output.title} · imagen ${imageIndex}`;
      missingImages.push(label);
      return {
        templateObjectKey: pic.id,
        action: "delete" as const,
        description: `Sin imagen: ${label}`,
      };
    });
    slides.push(output);
    return output;
  };
  const imageLinks = (s: string) =>
    s.split(/[\s,]+/).filter((u) => /^https:\/\//.test(u));
  add(
    1,
    { 20: client.name },
    undefined,
    `Marketing Discovery · ${client.name}`,
  );
  add(3, {}, undefined, "El proceso");
  add(4, {}, undefined, "Análisis del negocio");
  add(
    5,
    {
      99: join(
        d.companyProfile.definition,
        d.companyProfile.activity,
        d.companyProfile.location,
        d.companyProfile.coverage,
      ),
      100: safeText(d.companyProfile.tagline),
    },
    d.companyProfile.id,
    "Quiénes somos",
  );
  for (const [i, group] of chunks(
    d.relevantFacts.filter((f) => f.featured),
    6,
  ).entries())
    add(
      6,
      binding(
        [114, 115, 118, 119, 121, 122, 124, 125, 127, 128, 129, 130],
        group
          .flatMap((f) => [join(f.value, f.unit), join(f.name, f.relevance)])
          .concat(Array(Math.max(0, 12 - group.length * 2)).fill("")),
      ),
      `facts-${i}`,
      "Datos relevantes",
    );
  if (d.businessUnits.length > 1)
    for (const [i, group] of chunks(d.businessUnits, 3).entries())
      add(
        7,
        binding(
          [144, 145, 148, 149, 152, 153],
          group
            .flatMap((u) => [u.name, join(u.problem, u.customerType)])
            .concat(Array(Math.max(0, 6 - group.length * 2)).fill("")),
        ),
        `units-${i}`,
        "Unidades de negocio",
      );
  for (const o of d.offerings)
    add(
      8,
      {
        167: o.name,
        172: join(o.description, o.includes, o.delivery, o.problem),
        175: o.reasonToBelieve,
        177: join(o.strengths, o.differentiators),
      },
      o.id,
      o.name,
      imageLinks(o.image),
    );
  if (!d.offerings.length)
    add(8, {}, "missing-offering", "Producto o servicio pendiente");
  for (const [i, stages] of chunks(d.salesProcess.stages, 5).entries())
    add(
      9,
      {
        ...binding(
          [195, 196, 199, 200, 203, 204, 207, 208, 211, 212],
          stages
            .flatMap((s) => [
              s.name,
              join(s.channel, s.customerAction, s.internalAction),
            ])
            .concat(Array(Math.max(0, 10 - stages.length * 2)).fill("")),
        ),
        215: d.salesProcess.cycleDuration,
        218: join(
          d.salesProcess.averageTicket,
          d.salesProcess.repurchase,
          d.salesProcess.frequency,
        ),
        220: join(
          d.salesProcess.inquirer,
          d.salesProcess.influencer,
          d.salesProcess.decider,
          d.salesProcess.approver,
        ),
      },
      `sales-${i}`,
      "Cómo se vende hoy",
    );
  for (const [i, group] of chunks(d.targetSegments, 5).entries())
    add(
      10,
      binding(
        [242, 244, 246, 248, 250],
        group
          .map(
            (s) =>
              `${s.name} · Match ${s.match ?? "pendiente"} · Potencial ${s.potential ?? "pendiente"} · Relevancia ${s.currentRelevance ?? "pendiente"}`,
          )
          .concat(Array(Math.max(0, 5 - group.length)).fill("")),
      ),
      `targeting-${i}`,
      "Matriz de targeting",
    );
  const offeringNames = (ids: string[]) =>
    ids
      .map(
        (id) =>
          d.offerings.find((o) => o.id === id)?.name ?? "Referencia pendiente",
      )
      .join(" · ");
  if (d.applicability.b2bIcps.applies)
    for (const p of d.b2bIcps)
      add(
        11,
        {
          269: p.name,
          272: join(p.industry, p.companySize, p.operationType, p.interlocutor),
          275: join(p.interests, p.channels, p.trustedSources),
          278: p.location,
          281: offeringNames(p.offeringIds),
          283: p.insight,
          286: p.trigger,
          289: join(
            p.barriers,
            p.perceivedRisk,
            p.switchingCost,
            p.decisionParticipants,
          ),
          292: p.benefit,
        },
        p.id,
        `ICP B2B · ${p.name}`,
      );
  if (d.applicability.b2cIcps.applies)
    for (const p of d.b2cIcps)
      add(
        12,
        {
          307: p.name,
          310: join(p.lifeStage, p.occupation, p.buyingSituation),
          313: join(p.interests, p.platforms, p.trustedSources),
          316: join(p.location, p.purchaseLocation),
          319: offeringNames(p.offeringIds),
          321: p.insight,
          324: p.trigger,
          327: join(
            p.barriers,
            p.priceSensitivity,
            p.distrust,
            p.informationGap,
            p.timeConstraints,
          ),
          330: p.benefit,
        },
        p.id,
        `ICP B2C · ${p.name}`,
      );
  add(13, {}, undefined, "Benchmark");
  const rivals = k.benchmark.brands.filter((b) => b.type !== "Propia");
  for (const [i, group] of chunks(rivals, 4).entries())
    add(
      14,
      binding(
        [
          363, 365, 367, 369, 371, 373, 375, 377, 379, 381, 383, 385, 386, 387,
          388, 389,
        ],
        group
          .flatMap((b) => [
            b.name,
            b.type,
            b.segmentIds
              .map(
                (id) =>
                  d.targetSegments.find((s) => s.id === id)?.name ??
                  "Segmento pendiente",
              )
              .join(" · "),
            b.rationale,
          ])
          .concat(Array(Math.max(0, 16 - group.length * 4)).fill("")),
      ),
      `brands-${i}`,
      "Marcas a analizar",
    );
  function brandBlock(b: BenchmarkBrand) {
    const own = b.type === "Propia",
      overview = b.items.find((i) => i.section === "overview");
    if (own)
      add(15, { 398: `02 · BENCHMARK · ${b.name}`, 399: b.name }, b.id, b.name);
    else
      add(
        20,
        {
          518: `02 · BENCHMARK · ${b.name}`,
          519: b.name,
          520: values(overview, "claim"),
          522: values(overview, "description", "size", "age"),
          524: values(overview, "positioning"),
          526: values(overview, "audience"),
        },
        b.id,
        b.name,
      );
    for (const section of ["content", "paid", "web", "design"]) {
      const rows = b.items.filter((i) => i.section === section),
        page =
          (own ? 16 : 21) +
          ["content", "paid", "web", "design"].indexOf(section);
      for (const [index, group] of chunks(
        rows,
        section === "content" ? 3 : section === "paid" ? 3 : 1,
      ).entries()) {
        const first = group[0],
          r: Record<string, string> = {};
        const imageUrls = group.flatMap((i) => imageLinks(i.captures));
        const ids = own
          ? {
              header:
                section === "content"
                  ? 408
                  : section === "paid"
                    ? 437
                    : section === "web"
                      ? 462
                      : 490,
              links: [412, 415, 418, 421],
              channels: [423, 424, 425],
              contentSummary: 428,
              platforms: [448, 449, 450],
              paidSummary: 453,
              web: [468, 473, 475, 476, 477, 478, 481],
              design: [503, 504, 505, 506, 509],
            }
          : {
              header:
                section === "content"
                  ? 539
                  : section === "paid"
                    ? 568
                    : section === "web"
                      ? 593
                      : 621,
              links: [543, 546, 549, 552],
              channels: [554, 555, 556],
              contentSummary: 559,
              platforms: [579, 580, 581],
              paidSummary: 584,
              web: [599, 604, 606, 607, 608, 609, 612],
              design: [634, 635, 636, 637, 640],
            };
        r[ids.header] = `02 · BENCHMARK · ${b.name}`;
        if (section === "content")
          Object.assign(
            r,
            binding(
              ids.links,
              group.map((i) => values(i, "links")).concat(["", "", "", ""]),
            ),
            binding(
              ids.channels,
              group
                .map((i) => values(i, "channel", "followers", "frequency"))
                .concat(["", "", ""]),
            ),
            {
              [ids.contentSummary]: group
                .map((i) =>
                  values(i, "summary", "topics", "protagonists", "channelRole"),
                )
                .join("\n"),
            },
          );
        if (section === "paid")
          Object.assign(
            r,
            binding(
              ids.platforms,
              group
                .map((i) => values(i, "platforms", "campaignTypes"))
                .concat(["", "", ""]),
            ),
            {
              [ids.paidSummary]: group
                .map((i) =>
                  values(i, "summary", "insight", "objective", "pieces"),
                )
                .join("\n"),
            },
          );
        if (section === "web")
          Object.assign(
            r,
            binding(ids.web, [
              values(first, "home"),
              values(first, "internalPages"),
              values(first, "internalPages"),
              values(first, "content"),
              values(first, "actions"),
              values(first, "resources"),
              values(first, "summary", "role"),
            ]),
          );
        if (section === "design")
          Object.assign(
            r,
            binding(ids.design, [
              values(first, "palette"),
              values(first, "fonts"),
              values(first, "graphics"),
              values(first, "images", "treatment"),
              values(first, "summary", "categoryCodes", "differentiation"),
            ]),
          );
        add(
          page,
          r,
          `${b.id}-${section}-${index}`,
          `${b.name} · ${benchmarkBlueprints.find((bp) => bp.id === section)!.label}`,
          imageUrls,
        );
      }
    }
  }
  for (const b of k.benchmark.brands) brandBlock(b);
  add(
    25,
    binding(
      [653, 656, 659],
      [
        "Qué podemos tomar",
        "Qué debemos evitar",
        "Cómo podemos diferenciarnos",
      ].map((category) =>
        k.benchmark.findings
          .filter((f) => f.values.category === category)
          .map((f) => values(f, "statement", "explanation", "brand"))
          .join("\n"),
      ),
    ),
    undefined,
    "Conclusiones del Benchmark",
  );
  const indexRows = [
    ["estrategia", 673, 674, 675],
    ["diseno-marca", 676, 677, 678],
    ["publicidad-digital", 679, 680, 681],
    ["contenidos", 682, 683, 684],
    ["audiovisuales", 685, 686, 687],
    ["desarrollo-web", 0, 688, 689],
  ];
  add(
    26,
    {},
    undefined,
    "Plan de Marketing",
    [],
    indexRows
      .filter((row) => !active.includes(row[0] as ServiceId))
      .flatMap((row) => row.slice(1).filter(Boolean).map(String)),
  );
  if (active.includes("estrategia")) {
    for (const [i, group] of chunks(
      items("estrategia", "objectives"),
      2,
    ).entries())
      add(
        27,
        binding(
          [705, 706, 709, 710],
          group
            .flatMap((item) => [
              values(item, "statement"),
              values(item, "outcome", "reason", "indicator"),
            ])
            .concat(Array(Math.max(0, 4 - group.length * 2)).fill("")),
        ),
        `objectives-${i}`,
        "Objetivos",
      );
    add(
      28,
      binding(
        [727, 731, 735, 739],
        [
          "Audiencia fría",
          "Audiencia de marca",
          "Audiencia interesada",
          "Clientes y base propia",
        ].map((stage) =>
          items("estrategia", "channels")
            .filter((i) => safeText(i.values.stage).startsWith(stage))
            .map((i) => values(i, "channel", "action", "content", "objective"))
            .join("\n"),
        ),
      ),
      undefined,
      "Ecosistema de canales",
    );
    for (const i of items("estrategia", "insight").length
      ? items("estrategia", "insight")
      : [undefined])
      add(
        29,
        {
          751: values(i, "tension"),
          753: join(
            i?.evidence,
            i?.discoveryRefs.map(
              (id) =>
                d.targetSegments.find((r) => r.id === id)?.name ??
                "Hallazgo del Discovery",
            ),
            i?.findingIds.map(
              (id) =>
                k.benchmark.findings.find((f) => f.id === id)?.values.statement,
            ),
          ),
        },
        i?.id,
        "Insight",
      );
    for (const i of items("estrategia", "story").length
      ? items("estrategia", "story")
      : [undefined])
      add(
        30,
        {
          765: values(i, "claim"),
          767: values(i, "storytelling", "territory", "basis"),
        },
        i?.id,
        "Claim y storytelling",
      );
    for (const i of items("estrategia", "voice").length
      ? items("estrategia", "voice")
      : [undefined])
      add(
        31,
        binding(
          [780, 783, 786, 788],
          [
            values(i, "sound", "reference"),
            values(i, "message", "attributes"),
            values(i, "audiencePosition"),
            values(i, "differentiation", "examples", "avoid"),
          ],
        ),
        i?.id,
        "Tono de marca",
      );
  }
  if (active.includes("diseno-marca")) {
    add(32, {}, undefined, "Diseño de marca");
    for (const i of items("diseno-marca", "lookFeel").length
      ? items("diseno-marca", "lookFeel")
      : [undefined])
      add(
        33,
        { 817: values(i, "description", "mood", "territory", "basis") },
        i?.id,
        "Look & feel",
        imageLinks(values(i, "moodboard", "references")),
      );
    const system = items("diseno-marca", "visualSystem")[0];
    for (const [i, group] of chunks(
      items("diseno-marca", "colors"),
      6,
    ).entries())
      add(
        34,
        {
          ...binding(
            [831, 833, 835, 837, 839, 841],
            group
              .map((c) => values(c, "hex", "function"))
              .concat(["", "", "", "", "", ""]),
          ),
          844: values(system, "headingFont"),
          845: values(system, "weights", "uses"),
          847: values(system, "bodyFont"),
          848: values(system, "weights", "uses"),
          851: values(
            system,
            "icons",
            "textures",
            "imageTreatment",
            "ownResources",
          ),
        },
        `colors-${i}`,
        "Sistema visual",
      );
  }
  if (active.includes("publicidad-digital")) {
    add(35, {}, undefined, "Publicidad digital");
    const campaigns = items("publicidad-digital", "campaigns");
    for (const campaign of campaigns.length ? campaigns : [undefined]) {
      add(
        36,
        binding(
          [884, 886, 888, 890, 892, 894, 896, 898, 900, 901, 902, 903],
          [
            values(campaign, "name", "focus", "objective"),
            values(campaign, "platforms"),
            values(campaign, "share") ? `${values(campaign, "share")}%` : "",
            ...Array(9).fill(""),
          ],
        ),
        campaign?.id,
        "Plan de medios por campaña",
      );
      const allocations = items("publicidad-digital", "allocations").filter(
        (i) =>
          Array.isArray(i.values.campaignIds) &&
          i.values.campaignIds.includes(campaign?.id ?? ""),
      );
      for (const [j, group] of chunks(allocations, 3).entries())
        add(
          37,
          {
            917: values(campaign, "name"),
            920: join(
              values(campaign, "monthlyInvestment", "currency"),
              "/ mes",
            ),
            ...binding(
              [924, 925, 927, 928, 930, 931],
              group
                .flatMap((a) => [
                  `${values(a, "share")}%`,
                  values(a, "channel"),
                ])
                .concat(Array(Math.max(0, 6 - group.length * 2)).fill("")),
            ),
          },
          `${campaign?.id ?? "pending"}-${j}`,
          `Inversión · ${values(campaign, "name")}`,
        );
    }
    add(38, {}, undefined, "Visibilidad en IA · metodología");
    const models = new Set(
      items("publicidad-digital", "paidKpis").map(
        (i) => i.values.businessModel,
      ),
    );
    if (!models.size || models.has("Leads"))
      add(39, {}, undefined, "KPIs de publicidad · Leads");
    if (models.has("Ecommerce"))
      add(40, {}, undefined, "KPIs de publicidad · Ecommerce");
  }
  if (active.includes("contenidos")) {
    add(41, {}, undefined, "Contenidos");
    for (const [i, group] of chunks(
      items("contenidos", "contentAxes"),
      4,
    ).entries())
      add(
        42,
        binding(
          [
            1034, 1036, 1038, 1040, 1042, 1044, 1046, 1048, 1050, 1052, 1054,
            1056, 1058, 1060, 1062, 1063, 1064, 1065, 1066, 1067,
          ],
          group
            .flatMap((a) => [
              values(a, "name"),
              values(a, "description"),
              values(a, "audience"),
              values(a, "insight"),
              values(a, "piecesPerMonth"),
            ])
            .concat(Array(Math.max(0, 20 - group.length * 5)).fill("")),
        ),
        `axes-${i}`,
        "Ejes temáticos",
      );
    const yes = chunks(
        items("contenidos", "contentRules").filter(
          (i) => i.values.type === "Siempre",
        ),
        4,
      ),
      no = chunks(
        items("contenidos", "contentRules").filter(
          (i) => i.values.type === "Nunca",
        ),
        4,
      );
    for (let i = 0; i < Math.max(yes.length, no.length); i++)
      add(
        43,
        {
          ...binding(
            [1082, 1083, 1084, 1085],
            (yes[i] ?? [])
              .map((r) => values(r, "rule", "basis", "examples"))
              .concat(["", "", "", ""]),
          ),
          ...binding(
            [1088, 1089, 1090, 1091],
            (no[i] ?? [])
              .map((r) => values(r, "rule", "basis", "examples"))
              .concat(["", "", "", ""]),
          ),
        },
        `rules-${i}`,
        "Do's & don'ts",
      );
    add(44, {}, undefined, "KPIs de contenidos");
  }
  if (active.includes("audiovisuales")) {
    add(45, {}, undefined, "Audiovisuales");
    for (const i of items("audiovisuales", "production").length
      ? items("audiovisuales", "production")
      : [undefined])
      add(
        46,
        binding(
          [1142, 1145, 1148, 1151, 1154, 1157],
          [
            values(i, "style", "pace", "framing", "light", "scriptType"),
            values(i, "locations"),
            values(i, "clothing"),
            values(i, "speech"),
            values(i, "music"),
            values(i, "protagonist"),
          ],
        ),
        i?.id,
        "Lineamientos de producción",
      );
    for (const [i, group] of chunks(
      items("audiovisuales", "visualReferences"),
      3,
    ).entries())
      add(
        47,
        binding(
          [1171, 1175, 1179],
          group
            .map((i) => values(i, "description", "take", "avoid"))
            .concat(["", "", ""]),
        ),
        `references-${i}`,
        "Referencias visuales",
        group.flatMap((i) => imageLinks(values(i, "reference"))),
      );
  }
  if (active.includes("desarrollo-web")) {
    add(48, {}, undefined, "Desarrollo web");
    for (const i of items("desarrollo-web", "websiteRole").length
      ? items("desarrollo-web", "websiteRole")
      : [undefined])
      add(
        49,
        binding(
          [1206, 1209, 1212, 1215],
          [
            values(i, "role"),
            values(i, "technology", "reason"),
            values(i, "features"),
            values(i, "requirements", "integrations", "analytics"),
          ],
        ),
        i?.id,
        "Rol del sitio y recomendaciones",
      );
    for (const [i, group] of chunks(
      items("desarrollo-web", "sitemap"),
      5,
    ).entries())
      add(
        50,
        binding(
          [1228, 1230, 1232, 1234, 1236, 1238, 1240, 1242, 1244, 1246],
          group
            .flatMap((page) => [
              values(page, "name", "type"),
              values(page, "blocks", "objective", "cta"),
            ])
            .concat(Array(Math.max(0, 10 - group.length * 2)).fill("")),
        ),
        `sitemap-${i}`,
        "Sitemap",
      );
    add(51, {}, undefined, "Visibilidad web en IA · metodología");
    const models = new Set(
      items("desarrollo-web", "webKpis").map((i) => i.values.businessModel),
    );
    if (!models.size || models.has("Leads"))
      add(52, {}, undefined, "KPIs web · Leads");
    if (models.has("Ecommerce")) add(53, {}, undefined, "KPIs web · Ecommerce");
  }
  add(54, {}, undefined, "Próximos pasos");
  add(56, {}, undefined, "Cierre Avans");
  warnings.push(
    "Roadmap de implementación (página 55) omitido: no hay calendario validado en el sistema.",
  );
  for (const service of active.filter((s) => !ranges.some((r) => r.id === s)))
    warnings.push(
      `${serviceLabel(service)}: plantilla estratégica pendiente de definición; no se inventan slides.`,
    );
  if (missingImages.length)
    warnings.push(
      `${missingImages.length} imágenes no disponibles: los recuadros de ejemplo se eliminarán. Revisar antes de confirmar una versión para cliente.`,
    );
  warnings.push(...slides.flatMap((s) => s.warnings));
  for (const b of blocks)
    b.slides = slides.filter((s) =>
      b.id === "discovery"
        ? s.templateSlideNumber >= 5 && s.templateSlideNumber <= 12
        : b.id === "benchmark"
          ? s.templateSlideNumber >= 13 && s.templateSlideNumber <= 25
          : s.templateSlideNumber >= 26 && s.templateSlideNumber <= 53,
    ).length;
  const included = new Set(slides.map((s) => s.templateSlideNumber));
  const removedSlides = catalog.slides
    .filter((s) => !included.has(s.number))
    .map((s) => ({
      slide: s.number,
      reason:
        s.number === 2
          ? "Página interna de instrucciones"
          : s.number === 7 && d.businessUnits.length <= 1
            ? "Una sola unidad: se utiliza el detalle de productos/servicios"
            : s.number === 11 || s.number === 12
              ? "Perfil no aplicable o sin registros"
              : s.number === 55
                ? "Roadmap sin calendario validado"
                : ranges.some(
                      (r) =>
                        s.number >= r.start &&
                        s.number <= r.end &&
                        !active.includes(r.id),
                    )
                  ? "Servicio no contratado"
                  : "Sin registros o condición no aplicable",
    }));
  return {
    id: newId(),
    clientSlug: k.clientSlug,
    clientName: client.name,
    templateVersion: MASTER_VERSION,
    mode,
    discoveryVersion: `revision-${k.revision}`,
    benchmarkVersion: `revision-${k.revision}`,
    marketingPlanVersion: `revision-${k.revision}`,
    includedServiceIds: [...active],
    slides,
    removedSlides,
    missingFields: Array.from(new Set(missing)),
    warnings: Array.from(new Set(warnings)),
    missingImages,
    preparation: blocks,
    snapshot: presentationSnapshot(k, active, ctx),
    generatedAt: ctx.at,
    generatedBy: ctx.actor,
    warningsConfirmed: false,
  };
}
export function assertExportAllowed(manifest: PresentationManifest) {
  if (manifest.templateVersion !== MASTER_VERSION)
    throw new Error("La versión de plantilla no está soportada.");
  if (manifest.mode === "client" && manifest.missingFields.length)
    throw new Error(
      "La versión para cliente está bloqueada por campos críticos o contenido sin validar.",
    );
  if (
    manifest.mode === "client" &&
    manifest.warnings.length &&
    !manifest.warningsConfirmed
  )
    throw new Error("Confirmá explícitamente las advertencias no críticas.");
  if (manifest.slides.some((s) => s.templateSlideNumber === 2))
    throw new Error("La página interna de instrucciones no se exporta.");
  if (
    manifest.slides.some((s) =>
      Object.values(s.replacements).some((value) => /\[[^\]]*\]/.test(value)),
    )
  )
    throw new Error("El manifest contiene placeholders sin resolver.");
}
export function saveManifestPreview(
  k: KnowledgeState,
  manifest: PresentationManifest,
  ctx: MutationContext,
) {
  if (k.clientSlug !== manifest.clientSlug)
    throw new Error("Cliente incompatible.");
  if ((k.presentationExports ?? []).length >= 10)
    throw new Error(
      "Límite local de 10 versiones. Conservá las anteriores fuera del navegador antes de continuar; no se sobrescriben.",
    );
  const version =
    (k.presentationExports ?? []).reduce((n, e) => Math.max(n, e.version), 0) +
    1;
  const record: PresentationExport = {
    id: newId(),
    clientSlug: k.clientSlug,
    format: "manifest",
    mode: manifest.mode,
    version,
    status: "preview",
    manifest: structuredClone(manifest),
    generatedAt: ctx.at,
    generatedBy: ctx.actor,
  };
  return {
    ...k,
    presentationExports: [...(k.presentationExports ?? []), record],
    audit: [
      ...k.audit,
      {
        id: newId(),
        at: ctx.at,
        actor: ctx.actor,
        action: `Vista previa de presentación v${version} guardada · archivo no generado`,
      },
    ],
  };
}
