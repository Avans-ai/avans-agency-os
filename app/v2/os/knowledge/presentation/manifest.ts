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
  Object.fromEntries(
    ids.map((id, i) => [
      String(id),
      vals[i] === FILLER ? FILLER : safeText(vals[i]),
    ]),
  );
/**
 * Marks a template cell that stays empty because there are fewer records than
 * cells (e.g. three facts in a grid of six). It is removed silently, unlike a
 * record whose field has no data, which is reported as pending.
 */
export const FILLER = "\u0000";
/** Padding for a grid: with no records at all, the first record is pending. */
const padFor = (records: number, total: number, perRecord: number) =>
  Array.from({ length: Math.max(0, total - records * perRecord) }, (_, i) =>
    records === 0 && i < perRecord ? "" : FILLER,
  );
const moduleOf = (
  slide: number,
): NonNullable<PresentationSlideManifest["pending"]>[number]["module"] =>
  slide >= 5 && slide <= 12
    ? "discovery"
    : slide >= 13 && slide <= 25
      ? "benchmark"
      : slide >= 26 && slide <= 53
        ? "marketing-plan"
        : "template";
const moduleView: Record<string, string> = {
  discovery: "ficha",
  benchmark: "benchmark",
  "marketing-plan": "plan",
  template: "ficha",
};
/** Rows of the services index (page 26): service, separator, number, label. */
const INDEX_ROWS: [ServiceId, string | null, string, string, number][] = [
  ["estrategia", "673", "674", "675", 2920305],
  ["diseno-marca", "676", "677", "678", 3543151],
  ["publicidad-digital", "679", "680", "681", 4165997],
  ["contenidos", "682", "683", "684", 4788843],
  ["audiovisuales", "685", "686", "687", 5411688],
  ["desarrollo-web", null, "688", "689", 6034534],
];
/** Targeting matrix of page 10 (EMU): plot area and the five bubbles. */
const TARGETING_MATRIX = {
  x0: 914400,
  x1: 14249400,
  y0: 3448050,
  y1: 8582025,
  pad: 127000,
  labelHeight: 431100,
};
const TARGETING_BUBBLES = [
  { circle: "241", label: "242", x: 9346853, y: 4083248, size: 1809600, labelCenterX: 10251723 },
  { circle: "243", label: "244", x: 4207073, y: 4171057, size: 1428900, labelCenterX: 4921444 },
  { circle: "247", label: "248", x: 10765334, y: 6386661, size: 1104900, labelCenterX: 11317779 },
  { circle: "245", label: "246", x: 2332286, y: 6173837, size: 914400, labelCenterX: 2789481 },
  { circle: "249", label: "250", x: 6177707, y: 7006828, size: 685800, labelCenterX: 6520602 },
];
/**
 * Cells of repeated grids: when every data object of a cell is unused, its
 * decoration (card, bubble, separator line, label) goes with it.
 */
const CELL_GROUPS: Record<number, { data: string[]; decoration: string[] }[]> =
  {
    9: [
      { data: ["195", "196"], decoration: ["193", "194"] },
      { data: ["199", "200"], decoration: ["197", "198"] },
      { data: ["203", "204"], decoration: ["201", "202"] },
      { data: ["207", "208"], decoration: ["205", "206"] },
      { data: ["211", "212"], decoration: ["209", "210"] },
    ],
    10: [
      { data: ["242"], decoration: ["241"] },
      { data: ["244"], decoration: ["243"] },
      { data: ["246"], decoration: ["245"] },
      { data: ["248"], decoration: ["247"] },
      { data: ["250"], decoration: ["249"] },
    ],
    14: [
      { data: ["363", "365", "367", "369"], decoration: ["362", "364", "366", "368"] },
      { data: ["371", "373", "375", "377"], decoration: ["370", "372", "374", "376"] },
      { data: ["379", "381", "383", "385"], decoration: ["378", "380", "382", "384"] },
      { data: ["386", "387", "388", "389"], decoration: [] },
    ],
    36: [
      { data: ["884", "886", "888"], decoration: ["883", "885", "887"] },
      { data: ["890", "892", "894"], decoration: ["889", "891", "893"] },
      { data: ["896", "898", "900"], decoration: ["895", "897", "899"] },
      { data: ["901", "902", "903"], decoration: [] },
    ],
    37: [
      { data: ["924", "925"], decoration: ["923"] },
      { data: ["927", "928"], decoration: ["926"] },
      { data: ["930", "931"], decoration: ["929"] },
    ],
  };
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
      removeObjectKeys: [...template.instructionIds, ...remove],
      warnings: [],
      pending: [],
    };
    const owner = moduleOf(number),
      href = `/v2/clientes/${client.slug}?view=${moduleView[owner]}`;
    const unused = new Set<string>();
    for (const slot of template.slots) {
      const value = replacements[slot.id];
      const field = slot.text.replace(/[\[\]]/g, "").replace(/\s+/g, " ").trim();
      if (value === FILLER) {
        unused.add(slot.id);
        output.removeObjectKeys.push(slot.id);
      } else if (value) {
        output.replacements[slot.id] = safeText(value);
        if (value.length > 700)
          output.warnings.push(
            `Texto extenso en ${slot.id}: requiere revisión de ajuste en la plantilla.`,
          );
      } else {
        // No data: never show the template text; the object is removed and
        // the field is reported as pending on this slide.
        if (value === undefined)
          missing.push(`Slide ${number} · ${title ?? template.title} · ${field}`);
        output.removeObjectKeys.push(slot.id);
        output.pending!.push({
          objectKey: slot.id,
          label: field,
          module: owner,
          href,
          kind: "field",
        });
      }
    }
    for (const [id, text] of Object.entries(replacements))
      if (!template.slots.some((s) => s.id === id)) {
        if (text === FILLER) {
          unused.add(id);
          output.removeObjectKeys.push(id);
        } else output.replacements[id] = safeText(text);
      }
    for (const cell of CELL_GROUPS[number] ?? [])
      if (cell.data.every((id) => unused.has(id)))
        output.removeObjectKeys.push(...cell.decoration);
    let imageIndex = 0;
    output.images = template.pictures.map((pic) => {
      if (!pic.media.endsWith("/image5.png"))
        return {
          templateObjectKey: pic.id,
          action: "keep" as const,
          description: "Elemento original de la plantilla Avans",
        };
      const url = imageUrls[imageIndex++];
      if (url && /^(https:\/\/|data:image\/(png|jpeg);base64,)/.test(url))
        return {
          templateObjectKey: pic.id,
          action: "replace" as const,
          url,
          description: `Material visual para ${output.title}`,
        };
      const label = `Slide ${number} · ${output.title} · imagen ${imageIndex}`;
      missingImages.push(label);
      output.pending!.push({
        objectKey: pic.id,
        label: `Imagen ${imageIndex} (captura, moodboard o referencia)`,
        module: owner,
        href,
        kind: "image",
      });
      return {
        templateObjectKey: pic.id,
        action: "delete" as const,
        description: `Sin imagen: ${label}`,
      };
    });
    slides.push(output);
    return output;
  };
  // Registered visual resources: local images (data URLs) or https links.
  const imageLinks = (s: string) =>
    s.match(
      /data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+|https:\/\/[^\s,]+/g,
    ) ?? [];
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
          .concat(padFor(group.length, 12, 2)),
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
            .concat(padFor(group.length, 6, 2)),
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
            .concat(padFor(stages.length, 10, 2)),
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
  for (const [i, chunk] of chunks(d.targetSegments, 5).entries()) {
    // Bigger relevance → bigger bubble; position from match (x) and
    // potential (y) when both are known, as the matrix of the master reads.
    const group = [...chunk].sort(
      (a, b) => (b.currentRelevance ?? -1) - (a.currentRelevance ?? -1),
    );
    const slide = add(
      10,
      binding(
        TARGETING_BUBBLES.map((b) => b.label),
        group.map((s) => s.name).concat(padFor(group.length, 5, 1)),
      ),
      `targeting-${i}`,
      "Matriz de targeting",
    );
    slide.moves = {};
    group.forEach((segment, j) => {
      const bubble = TARGETING_BUBBLES[j];
      const { match, potential } = segment;
      if (
        typeof match !== "number" ||
        typeof potential !== "number" ||
        !Number.isFinite(match) ||
        !Number.isFinite(potential)
      ) {
        slide.pending!.push({
          objectKey: bubble.circle,
          label: `${segment.name || "Segmento"}: match y potencial (0–100) para ubicarlo en la matriz`,
          module: "discovery",
          href: `/v2/clientes/${client.slug}?view=ficha`,
          kind: "field",
        });
        return;
      }
      const m = TARGETING_MATRIX,
        r = bubble.size / 2;
      const clamp = (v: number, lo: number, hi: number) =>
        Math.min(hi, Math.max(lo, v));
      const cx = clamp(
        m.x0 + (Math.min(100, Math.max(0, match)) / 100) * (m.x1 - m.x0),
        m.x0 + r + m.pad,
        m.x1 - r - m.pad,
      );
      const cy = clamp(
        m.y1 - (Math.min(100, Math.max(0, potential)) / 100) * (m.y1 - m.y0),
        m.y0 + r + m.pad,
        m.y1 - r - m.labelHeight - m.pad,
      );
      const dx = Math.round(cx - (bubble.x + r)),
        dy = Math.round(cy - (bubble.y + r));
      slide.moves![bubble.circle] = { dx, dy };
      slide.moves![bubble.label] = { dx: Math.round(cx - bubble.labelCenterX), dy };
    });
  }
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
          .concat(padFor(group.length, 16, 4)),
      ),
      `brands-${i}`,
      "Marcas a analizar",
    );
  function brandBlock(b: BenchmarkBrand) {
    const own = b.type === "Propia",
      overview = b.items.find((i) => i.section === "overview");
    if (own)
      add(15, { 398: `02 · BENCHMARK · ${b.name.toLocaleUpperCase("es")}`, 399: b.name }, b.id, b.name);
    else
      add(
        20,
        {
          518: `02 · BENCHMARK · ${b.name.toLocaleUpperCase("es")}`,
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
        r[ids.header] = `02 · BENCHMARK · ${b.name.toLocaleUpperCase("es")}`;
        if (section === "content")
          Object.assign(
            r,
            binding(
              ids.links,
              group.map((i) => values(i, "links")).concat(padFor(group.length, 4, 1)),
            ),
            binding(
              ids.channels,
              group
                .map((i) => values(i, "channel", "followers", "frequency"))
                .concat(padFor(group.length, 3, 1)),
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
                .concat(padFor(group.length, 3, 1)),
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
  // Services index: keep only contracted modules, close the gaps and number
  // them again (01, 02, …); the last row has no separator below, as in the
  // master.
  const keptRows = INDEX_ROWS.filter(([service]) => active.includes(service));
  const indexSlide = add(
    26,
    Object.fromEntries(
      keptRows.map(([, , number], i) => [number, String(i + 1).padStart(2, "0")]),
    ),
    undefined,
    "Plan de Marketing",
    [],
    INDEX_ROWS.filter(([service]) => !active.includes(service)).flatMap(
      ([, line, number, label]) => [line, number, label].filter(Boolean) as string[],
    ),
  );
  indexSlide.moves = {};
  keptRows.forEach(([, line, number, label, y], i) => {
    const dy = INDEX_ROWS[i][4] - y;
    if (dy) for (const id of [line, number, label]) if (id) indexSlide.moves![id] = { dy };
    if (i === keptRows.length - 1 && line) indexSlide.removeObjectKeys.push(line);
  });
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
            .concat(padFor(group.length, 4, 2)),
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
              .concat(padFor(group.length, 6, 1)),
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
            ...Array(9).fill(FILLER),
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
            920: values(campaign, "monthlyInvestment")
              ? join(values(campaign, "monthlyInvestment", "currency"), "/ mes")
              : "",
            ...binding(
              [924, 925, 927, 928, 930, 931],
              group
                .flatMap((a) => [
                  `${values(a, "share")}%`,
                  values(a, "channel"),
                ])
                .concat(padFor(group.length, 6, 2)),
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
            .concat(padFor(group.length, 20, 5)),
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
              .concat(padFor((yes[i] ?? []).length, 4, 1)),
          ),
          ...binding(
            [1088, 1089, 1090, 1091],
            (no[i] ?? [])
              .map((r) => values(r, "rule", "basis", "examples"))
              .concat(padFor((no[i] ?? []).length, 4, 1)),
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
            .concat(padFor(group.length, 3, 1)),
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
            .concat(padFor(group.length, 10, 2)),
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
export function nextPresentationVersion(k: KnowledgeState) {
  return (
    (k.presentationExports ?? []).reduce((n, e) => Math.max(n, e.version), 0) +
    1
  );
}
/**
 * Records a generated PPTX in the local history. The manifest (with its data
 * snapshot) is stored in the knowledge state; the bytes live in IndexedDB and
 * can be rebuilt byte-for-byte from the manifest and the master.
 */
export function savePptxExport(
  k: KnowledgeState,
  manifest: PresentationManifest,
  file: NonNullable<PresentationExport["file"]>,
  version: number,
  id: string,
  ctx: MutationContext,
) {
  if (k.clientSlug !== manifest.clientSlug)
    throw new Error("Cliente incompatible.");
  if ((k.presentationExports ?? []).length >= 10)
    throw new Error(
      "Límite local de 10 versiones. Conservá las anteriores fuera del navegador antes de continuar; no se sobrescriben.",
    );
  if ((k.presentationExports ?? []).some((e) => e.version === version))
    throw new Error("Otra pestaña guardó esta versión. Generá nuevamente.");
  const record: PresentationExport = {
    id,
    clientSlug: k.clientSlug,
    format: "pptx",
    mode: manifest.mode,
    version,
    status: "ready",
    manifest: structuredClone(manifest),
    fileName: file.fileName,
    file,
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
        action: `Presentación PPTX v${version} generada desde el master · ${manifest.mode === "client" ? "versión para cliente" : "borrador interno"} · ${file.slideCount} slides`,
      },
    ],
  };
}
