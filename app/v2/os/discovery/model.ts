import {
  entityFields,
  fields,
  sections,
  type CollectionKey,
  type EditableRecord,
  type EntityKind,
  type Field,
  type SectionKey,
} from "./schema";

export type DiscoveryStatus = "Borrador" | "Validado" | "Requiere revisión";
export type Trace = {
  id: string;
  status: DiscoveryStatus;
  sourceIds: string[];
  evidence: string;
  owner: string;
  notes: string;
  demo: boolean;
  updatedAt: string;
  updatedBy: string;
};
type Value<F> = F extends { kind: "number" }
  ? number | null
  : F extends { kind: "boolean" }
    ? boolean
    : F extends { kind: "relations" }
      ? string[]
      : string;
type FromFields<F extends readonly Field[]> = {
  -readonly [P in F[number] as P["key"]]: Value<P>;
} & Trace;
export type CompanyProfile = FromFields<typeof fields.companyProfile>;
export type RelevantFact = FromFields<typeof fields.relevantFacts>;
export type BusinessUnit = FromFields<typeof fields.businessUnits>;
export type Offering = FromFields<typeof fields.offerings>;
export type SalesStage = FromFields<typeof fields.stages>;
export type SalesProcess = FromFields<typeof fields.salesProcess> & {
  stages: SalesStage[];
};
export type TargetSegment = FromFields<typeof fields.targetSegments>;
export type B2BIcp = FromFields<typeof fields.b2bIcps>;
export type B2CIcp = FromFields<typeof fields.b2cIcps>;
export type DiscoverySource = FromFields<typeof fields.sources>;
export type EntityMap = {
  companyProfile: CompanyProfile;
  relevantFacts: RelevantFact;
  businessUnits: BusinessUnit;
  offerings: Offering;
  salesProcess: FromFields<typeof fields.salesProcess>;
  stages: SalesStage;
  targetSegments: TargetSegment;
  b2bIcps: B2BIcp;
  b2cIcps: B2CIcp;
  sources: DiscoverySource;
};
export type Applicability = {
  applies: boolean;
  reason: string;
  updatedAt: string;
  updatedBy: string;
};
export type SectionCompletion = {
  key: SectionKey;
  label: string;
  percent: number;
  state: "Completa" | "Parcial" | "Pendiente" | "Requiere validación";
  count: number;
  missing: string[];
  unvalidated: number;
  notApplicable: boolean;
};
export type DiscoveryCompletion = {
  percent: number;
  sections: SectionCompletion[];
};
export type MarketingDiscovery = {
  version: 1;
  clientSlug: string;
  companyProfile: CompanyProfile;
  relevantFacts: RelevantFact[];
  businessUnits: BusinessUnit[];
  offerings: Offering[];
  salesProcess: SalesProcess;
  targetSegments: TargetSegment[];
  b2bIcps: B2BIcp[];
  b2cIcps: B2CIcp[];
  sources: DiscoverySource[];
  applicability: { b2bIcps: Applicability; b2cIcps: Applicability };
  status: DiscoveryStatus;
  completion: DiscoveryCompletion;
  updatedAt: string;
  updatedBy: string;
};
export const discoveryKey = (slug: string) =>
  `client:${slug}:marketing-discovery`;
export function newEntity<K extends EntityKind>(
  kind: K,
  id: string,
): EntityMap[K] {
  const values: EditableRecord = {
    id,
    updatedAt: "",
    updatedBy: "",
    sourceIds: [],
  };
  for (const field of entityFields(kind))
    values[field.key] =
      field.kind === "boolean"
        ? false
        : field.kind === "number"
          ? null
          : field.kind === "relations"
            ? []
            : "";
  values.status = "Borrador";
  return values as EntityMap[K];
}
export function emptyDiscovery(clientSlug: string): MarketingDiscovery {
  return refreshDiscovery({
    version: 1,
    clientSlug,
    companyProfile: newEntity("companyProfile", "company"),
    relevantFacts: [],
    businessUnits: [],
    offerings: [],
    salesProcess: {
      ...newEntity("salesProcess", "sales"),
      stages: [
        "Cómo llega",
        "Primer contacto",
        "Propuesta",
        "Decisión",
        "Cierre",
      ].map((name, i) => ({ ...newEntity("stages", `stage-${i}`), name })),
    },
    targetSegments: [],
    b2bIcps: [],
    b2cIcps: [],
    sources: [],
    applicability: {
      b2bIcps: { applies: true, reason: "", updatedAt: "", updatedBy: "" },
      b2cIcps: { applies: true, reason: "", updatedAt: "", updatedBy: "" },
    },
    status: "Borrador",
    completion: { percent: 0, sections: [] },
    updatedAt: "",
    updatedBy: "",
  });
}
export function recordsOf<K extends EntityKind>(
  d: MarketingDiscovery,
  kind: K,
): EntityMap[K][] {
  const key: EntityKind = kind;
  const records =
    key === "stages"
      ? d.salesProcess.stages
      : key === "companyProfile" || key === "salesProcess"
        ? [d[key]]
        : d[key];
  return records as EntityMap[K][];
}
/** Values such as “Pendiente” are readable hints, never completed information. */
export function filled(value: unknown): boolean {
  if (typeof value === "number")
    return Number.isFinite(value) && value >= 0 && value <= 100;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return true;
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !/^(pendiente|sin (datos|completar|validar)|dato demostrativo)/i.test(
      value.trim(),
    )
  );
}
function hasField(d: MarketingDiscovery, field: Field, record: EditableRecord) {
  const value = record[field.key];
  if (!filled(value)) return false;
  if (field.collection) {
    const ids = recordsOf(d, field.collection).map((r) => r.id);
    return Array.isArray(value)
      ? value.every((id) => ids.includes(id))
      : typeof value === "string" && ids.includes(value);
  }
  return true;
}
export function missingFields(
  d: MarketingDiscovery,
  kind: EntityKind,
  record: EditableRecord,
): string[] {
  return entityFields(kind)
    .filter((f) => f.required && f.key !== "status" && !hasField(d, f, record))
    .map((f) => f.label);
}
export function isValidated(
  d: MarketingDiscovery,
  kind: EntityKind,
  record: Trace,
): boolean {
  return (
    record.status === "Validado" &&
    !record.demo &&
    missingFields(d, kind, record as unknown as EditableRecord).length === 0 &&
    (kind === "sources" ||
      record.sourceIds.every((id) => {
        const source = d.sources.find((s) => s.id === id);
        return (
          !!source &&
          source.status === "Validado" &&
          !source.demo &&
          missingFields(d, "sources", source).length === 0
        );
      }))
  );
}
export function targetingQuadrant(
  match: number | null,
  potential: number | null,
) {
  if (
    match === null ||
    potential === null ||
    !filled(match) ||
    !filled(potential)
  )
    return "Pendiente de completar";
  return potential >= 50
    ? match >= 50
      ? "Foco principal"
      : "Adaptar la oferta"
    : match >= 50
      ? "Sostener"
      : "Despriorizar";
}
/** Coverage rules (v1): equal weight for eight slides. Per section, required
 * fields of EVERY record count equally; an empty collection counts as one blank
 * record. Facts require at least THREE validated records (extra validation slots).
 * Sales includes all stages and at least one stage. Marked ICP segments must each
 * have a matching profile. Explicit N/A + reason gives 100%, unless profiles or
 * segments of that type exist. Validation is separate from content percentage:
 * only complete records with evidence and validated, non-demo sources are valid.
 * 0 is a valid targeting score; quadrants use the >=50 boundary and are derived.
 */
export function calculateCompletion(
  d: MarketingDiscovery,
): DiscoveryCompletion {
  const coverage = sections.map((section) => {
    const kind = section.key;
    const records = recordsOf(d, kind);
    const missing: string[] = [];
    const icpType = kind === "b2bIcps" ? "B2B" : "B2C";
    const applicability =
      kind === "b2bIcps" || kind === "b2cIcps" ? d.applicability[kind] : null;
    if (
      applicability &&
      !applicability.applies &&
      filled(applicability.reason) &&
      !records.length &&
      !d.targetSegments.some((s) => s.type === icpType)
    ) {
      return {
        key: kind,
        label: section.label,
        percent: 100,
        state: "Completa" as const,
        count: 0,
        missing: [],
        unvalidated: 0,
        notApplicable: true,
      };
    }
    let total = 0,
      done = 0,
      unvalidated = 0;
    function measure(recordKind: EntityKind, rows: Trace[]) {
      const required = entityFields(recordKind).filter(
        (f) => f.required && f.key !== "status",
      );
      if (!rows.length) {
        total += required.length;
        missing.push(
          `Agregar al menos un registro: ${recordKind === "stages" ? "etapa" : section.label}`,
        );
      }
      rows.forEach((row, index) => {
        const value = row as unknown as EditableRecord;
        const absent = required.filter((f) => !hasField(d, f, value));
        total += required.length;
        done += required.length - absent.length;
        const name =
          typeof value.name === "string" && value.name
            ? value.name
            : `Registro ${index + 1}`;
        missing.push(...absent.map((f) => `${name}: ${f.label}`));
        if (!isValidated(d, recordKind, row)) unvalidated++;
      });
    }
    measure(kind, records);
    if (kind === "salesProcess") measure("stages", d.salesProcess.stages);
    if (kind === "relevantFacts") {
      const validated = d.relevantFacts.filter((r) =>
        isValidated(d, kind, r),
      ).length;
      total += 3;
      done += Math.min(3, validated);
      if (validated < 3)
        missing.push(`Validar ${3 - validated} dato(s) más (mínimo 3)`);
    }
    if (applicability) {
      if (!applicability.applies) {
        total++;
        missing.push(
          "No aplica necesita un motivo y no puede coexistir con perfiles o segmentos de ese tipo",
        );
      }
      d.targetSegments
        .filter((s) => s.type === icpType && s.requiresIcp)
        .forEach((segment) => {
          total++;
          if (
            (records as (B2BIcp | B2CIcp)[]).some(
              (p) => p.segmentId === segment.id,
            )
          )
            done++;
          else missing.push(`Crear ICP para ${segment.name}`);
        });
    }
    const percent = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
    return {
      key: kind,
      label: section.label,
      percent,
      state: (missing.length === 0 && percent === 100
        ? unvalidated
          ? "Requiere validación"
          : "Completa"
        : percent
          ? "Parcial"
          : "Pendiente") as SectionCompletion["state"],
      count: records.length,
      missing,
      unvalidated,
      notApplicable: false,
    };
  });
  return {
    percent: Math.round(
      coverage.reduce((sum, s) => sum + s.percent, 0) / coverage.length,
    ),
    sections: coverage,
  };
}
export function refreshDiscovery(d: MarketingDiscovery): MarketingDiscovery {
  const completion = calculateCompletion(d);
  const status = completion.sections.every((s) => s.state === "Completa")
    ? "Validado"
    : completion.sections.some(
          (s) => s.unvalidated || s.state === "Requiere validación",
        )
      ? "Requiere revisión"
      : "Borrador";
  return { ...d, completion, status };
}
export function putEntity<K extends EntityKind>(
  d: MarketingDiscovery,
  kind: K,
  record: EntityMap[K],
): MarketingDiscovery {
  if (kind === "companyProfile")
    return refreshDiscovery({ ...d, companyProfile: record as CompanyProfile });
  if (kind === "salesProcess")
    return refreshDiscovery({
      ...d,
      salesProcess: {
        ...(record as EntityMap["salesProcess"]),
        stages: d.salesProcess.stages,
      },
    });
  const rows = recordsOf(d, kind);
  let next = rows.some((r) => r.id === record.id)
    ? rows.map((r) => (r.id === record.id ? record : r))
    : [...rows, record];
  if (kind === "businessUnits" && (record as BusinessUnit).primary)
    next = next.map((r) => (r.id === record.id ? r : { ...r, primary: false }));
  return refreshDiscovery(
    kind === "stages"
      ? {
          ...d,
          salesProcess: { ...d.salesProcess, stages: next as SalesStage[] },
        }
      : { ...d, [kind]: next },
  );
}
/** Block deletions that would create dangling references; make the user unlink
 * explicitly, preserving evidence and avoiding silent cascading data loss. */
export function referencesTo(
  d: MarketingDiscovery,
  kind: EntityKind,
  id: string,
): string[] {
  const uses: string[] = [];
  for (const k of Object.keys(fields) as EntityKind[])
    for (const row of recordsOf(d, k)) {
      for (const f of entityFields(k))
        if (f.collection === kind) {
          const value = (row as unknown as EditableRecord)[f.key];
          if (value === id || (Array.isArray(value) && value.includes(id)))
            uses.push(`${k}: ${"name" in row ? row.name : row.id}`);
        }
    }
  return uses;
}
export function changeCollection(
  d: MarketingDiscovery,
  kind: CollectionKey,
  id: string,
  action: "delete" | "up" | "down",
): MarketingDiscovery {
  const rows = [...recordsOf(d, kind)];
  const index = rows.findIndex((r) => r.id === id);
  if (index < 0) return d;
  if (action === "delete") {
    if (referencesTo(d, kind, id).length) return d;
    rows.splice(index, 1);
  } else {
    const target = index + (action === "up" ? -1 : 1);
    if (target < 0 || target >= rows.length) return d;
    [rows[index], rows[target]] = [rows[target], rows[index]];
  }
  return refreshDiscovery(
    kind === "stages"
      ? {
          ...d,
          salesProcess: { ...d.salesProcess, stages: rows as SalesStage[] },
        }
      : { ...d, [kind]: rows },
  );
}
/** The storage boundary is versioned and validates shape without touching other
 * clients. Unknown future versions are left intact and must be migrated explicitly. */
export function isDiscovery(
  value: unknown,
  slug: string,
): value is MarketingDiscovery {
  if (!value || typeof value !== "object") return false;
  const d = value as MarketingDiscovery;
  if (
    d.version !== 1 ||
    d.clientSlug !== slug ||
    !d.applicability?.b2bIcps ||
    !d.applicability?.b2cIcps ||
    !d.salesProcess ||
    !Array.isArray(d.salesProcess.stages)
  )
    return false;
  if (
    typeof d.updatedAt !== "string" ||
    typeof d.updatedBy !== "string" ||
    !Object.values(d.applicability).every(
      (a) =>
        typeof a.applies === "boolean" &&
        typeof a.reason === "string" &&
        typeof a.updatedAt === "string" &&
        typeof a.updatedBy === "string",
    )
  )
    return false;
  for (const k of Object.keys(fields) as EntityKind[]) {
    const rows =
      k === "stages"
        ? d.salesProcess.stages
        : k === "companyProfile" || k === "salesProcess"
          ? [d[k]]
          : d[k];
    if (
      !Array.isArray(rows) ||
      !rows.every((row) => {
        if (
          !row ||
          typeof row.id !== "string" ||
          typeof row.updatedAt !== "string" ||
          typeof row.updatedBy !== "string" ||
          !["Borrador", "Validado", "Requiere revisión"].includes(row.status) ||
          !Array.isArray(row.sourceIds)
        )
          return false;
        return entityFields(k).every((f) => {
          const v = (row as EditableRecord)[f.key];
          return f.kind === "relations"
            ? Array.isArray(v) && v.every((x) => typeof x === "string")
            : f.kind === "number"
              ? v === null || (typeof v === "number" && filled(v))
              : f.kind === "boolean"
                ? typeof v === "boolean"
                : typeof v === "string";
        });
      })
    )
      return false;
    if (new Set(rows.map((r) => r.id)).size !== rows.length) return false;
  }
  return true;
}
export function validateEntity(
  d: MarketingDiscovery,
  kind: EntityKind,
  record: EditableRecord,
): string[] {
  const errors: string[] = [];
  for (const field of entityFields(kind)) {
    const value = record[field.key];
    if (
      field.kind === "number" &&
      value !== null &&
      (typeof value !== "number" || !filled(value))
    )
      errors.push(`${field.label}: debe ser un número entre 0 y 100`);
    if (field.options && value && !field.options.includes(String(value)))
      errors.push(`${field.label}: opción inválida`);
    if (field.collection && filled(value) && !hasField(d, field, record))
      errors.push(`${field.label}: la referencia ya no existe`);
  }
  if (
    (kind === "b2bIcps" || kind === "b2cIcps") &&
    record.segmentId &&
    d.targetSegments.find((s) => s.id === record.segmentId)?.type !==
      (kind === "b2bIcps" ? "B2B" : "B2C")
  )
    errors.push("El segmento debe corresponder al tipo de ICP");
  if (kind === "targetSegments") {
    const wrong = (record.type === "B2B" ? d.b2cIcps : d.b2bIcps).some(
      (p) => p.segmentId === record.id,
    );
    if (wrong)
      errors.push(
        "El segmento está relacionado con ICP del otro tipo; desvinculalos antes de cambiarlo",
      );
  }
  if (record.status === "Validado") {
    errors.push(
      ...missingFields(d, kind, record).map((f) => `Para validar falta: ${f}`),
    );
    if (record.demo)
      errors.push("Un dato demostrativo no puede marcarse validado");
    if (
      kind !== "sources" &&
      (record.sourceIds as string[]).some(
        (id) =>
          !d.sources.some((s) => s.id === id && isValidated(d, "sources", s)),
      )
    )
      errors.push(
        "Para validar se necesitan fuentes validadas y no demostrativas",
      );
  }
  return errors;
}
export type DiscoveryPresentationData = {
  companyOverview: CompanyProfile;
  relevantFacts: RelevantFact[];
  businessUnits: (BusinessUnit & { offeringIds: string[] })[];
  offeringSlides: (Offering & { segmentIds: string[] })[];
  salesProcess: SalesProcess;
  targetingMatrix: (TargetSegment & { quadrant: string })[];
  b2bIcpSlides: B2BIcp[];
  b2cIcpSlides: B2CIcp[];
  applicability: MarketingDiscovery["applicability"];
  coverage: DiscoveryCompletion;
  sources: DiscoverySource[];
};
/** No PPT generation or extraction: this is a pure, serializable downstream selector. */
export function toDiscoveryPresentation(
  d: MarketingDiscovery,
): DiscoveryPresentationData {
  return structuredClone({
    companyOverview: d.companyProfile,
    relevantFacts: d.relevantFacts.filter((f) => f.featured),
    businessUnits: d.businessUnits.map((u) => ({
      ...u,
      offeringIds: d.offerings
        .filter((o) => o.businessUnitId === u.id)
        .map((o) => o.id),
    })),
    offeringSlides: d.offerings.map((o) => ({
      ...o,
      segmentIds: d.targetSegments
        .filter((s) => s.offeringIds.includes(o.id))
        .map((s) => s.id),
    })),
    salesProcess: d.salesProcess,
    targetingMatrix: d.targetSegments.map((s) => ({
      ...s,
      quadrant: targetingQuadrant(s.match, s.potential),
    })),
    b2bIcpSlides: d.b2bIcps,
    b2cIcpSlides: d.b2cIcps,
    applicability: d.applicability,
    coverage: calculateCompletion(d),
    sources: d.sources,
  });
}
