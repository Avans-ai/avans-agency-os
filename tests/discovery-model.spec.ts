import { test, expect } from "@playwright/test";
import {
  calculateCompletion,
  changeCollection,
  emptyDiscovery,
  isDiscovery,
  isValidated,
  newEntity,
  putEntity,
  referencesTo,
  targetingQuadrant,
  toDiscoveryPresentation,
  validateEntity,
} from "../app/v2/os/discovery/model";
import { discoverySeed } from "../app/v2/os/discovery/seed";
import { canEditDiscovery } from "../app/v2/os/discovery/permissions";
import { osClients } from "../app/v2/os/os-data";

const epsa = osClients.find((c) => c.slug === "epsa")!;
const aca = osClients.find((c) => c.slug === "aca")!;
test("targeting derives all four quadrants including boundaries and missing scores", () => {
  expect(targetingQuadrant(50, 50)).toBe("Foco principal");
  expect(targetingQuadrant(49, 50)).toBe("Adaptar la oferta");
  expect(targetingQuadrant(50, 0)).toBe("Sostener");
  expect(targetingQuadrant(0, 49)).toBe("Despriorizar");
  expect(targetingQuadrant(null, 100)).toBe("Pendiente de completar");
  expect(targetingQuadrant(101, 100)).toBe("Pendiente de completar");
});
test("explicit N/A counts fully and cannot hide existing segments or profiles", () => {
  const d = emptyDiscovery("epsa");
  d.applicability.b2cIcps = {
    applies: false,
    reason: "Opera exclusivamente B2B",
    updatedAt: "",
    updatedBy: "PM",
  };
  expect(
    calculateCompletion(d).sections.find((s) => s.key === "b2cIcps"),
  ).toMatchObject({ percent: 100, state: "Completa", notApplicable: true });
  d.targetSegments.push({
    ...newEntity("targetSegments", "b2c"),
    name: "Consumidores",
    type: "B2C",
    requiresIcp: true,
  });
  const section = calculateCompletion(d).sections.find(
    (s) => s.key === "b2cIcps",
  )!;
  expect(section.percent).toBeLessThan(100);
  expect(section.missing).toContain("Crear ICP para Consumidores");
});
test("coverage uses every record, and new incomplete products reduce coverage", () => {
  const d = discoverySeed(epsa);
  const before = calculateCompletion(d).sections.find(
    (s) => s.key === "offerings",
  )!.percent;
  const next = putEntity(d, "offerings", newEntity("offerings", "incomplete"));
  expect(
    calculateCompletion(next).sections.find((s) => s.key === "offerings")!
      .percent,
  ).toBeLessThan(before);
});
test("drafts accept incomplete fields; validated records need actual sources and evidence", () => {
  const d = emptyDiscovery("epsa");
  const fact = {
    ...newEntity("relevantFacts", "fact"),
    name: "Dato",
    status: "Borrador" as const,
  };
  expect(validateEntity(d, "relevantFacts", fact)).toEqual([]);
  expect(
    validateEntity(d, "relevantFacts", { ...fact, status: "Validado" }),
  ).toContain("Para validar falta: Fuentes");
  expect(
    validateEntity(d, "relevantFacts", {
      ...fact,
      status: "Validado",
      demo: true,
    }),
  ).toContain("Un dato demostrativo no puede marcarse validado");
});
test("facts need three valid records and source review invalidates their validation", () => {
  const d = emptyDiscovery("epsa");
  d.sources = [
    {
      ...newEntity("sources", "real"),
      name: "Entrevista",
      type: "Reunión",
      reference: "Acta interna",
      date: "2026-11-10",
      owner: "PM",
      evidence: "Acta revisada",
      status: "Validado",
    },
  ];
  d.relevantFacts = Array.from({ length: 3 }, (_, i) => ({
    ...newEntity("relevantFacts", `f${i}`),
    name: `Dato ${i}`,
    value: "Hecho confirmado",
    relevance: "Prueba de comunicación",
    category: "Otra",
    owner: "PM",
    evidence: "Sección de acta",
    sourceIds: ["real"],
    status: "Validado",
  }));
  expect(
    calculateCompletion(d).sections.find((s) => s.key === "relevantFacts"),
  ).toMatchObject({ percent: 100, state: "Completa" });
  d.sources[0].status = "Requiere revisión";
  expect(isValidated(d, "relevantFacts", d.relevantFacts[0])).toBe(false);
  expect(
    calculateCompletion(d).sections.find((s) => s.key === "relevantFacts")!
      .percent,
  ).toBeLessThan(100);
});
test("references block deletion; reorder is bounded and primary unit stays unique", () => {
  const d = discoverySeed(epsa);
  expect(referencesTo(d, "businessUnits", "unit-1").length).toBeGreaterThan(0);
  expect(
    changeCollection(d, "businessUnits", "unit-1", "delete").businessUnits,
  ).toEqual(d.businessUnits);
  const next = changeCollection(d, "businessUnits", "unit-1", "up");
  expect(next.businessUnits[0].id).toBe("unit-1");
  expect(
    changeCollection(next, "businessUnits", "unit-1", "up").businessUnits,
  ).toEqual(next.businessUnits);
  const primary = putEntity(
    putEntity(d, "businessUnits", { ...d.businessUnits[0], primary: true }),
    "businessUnits",
    { ...d.businessUnits[1], primary: true },
  );
  expect(
    primary.businessUnits.filter((u) => u.primary).map((u) => u.id),
  ).toEqual(["unit-1"]);
});
test("ICP and segment types remain consistent; scores reject out-of-range and nonnumeric values", () => {
  const d = discoverySeed(epsa);
  expect(
    validateEntity(d, "b2cIcps", {
      ...newEntity("b2cIcps", "new"),
      segmentId: "segment-companies",
    }),
  ).toContain("El segmento debe corresponder al tipo de ICP");
  expect(
    validateEntity(d, "targetSegments", {
      ...d.targetSegments[0],
      type: "B2C",
    }),
  ).toContain(
    "El segmento está relacionado con ICP del otro tipo; desvinculalos antes de cambiarlo",
  );
  expect(
    validateEntity(d, "targetSegments", { ...d.targetSegments[0], match: 101 })
      .length,
  ).toBeGreaterThan(0);
  expect(
    validateEntity(d, "targetSegments", {
      ...d.targetSegments[0],
      match: "invalid",
    }).length,
  ).toBeGreaterThan(0);
  expect(
    validateEntity(d, "targetSegments", { ...d.targetSegments[0], match: 0 }),
  ).toEqual([]);
});
test("versioned shape guards reject other clients, unsupported schemas and malformed collections", () => {
  const d = discoverySeed(epsa);
  expect(isDiscovery(d, "epsa")).toBe(true);
  expect(isDiscovery(d, "aca")).toBe(false);
  expect(isDiscovery({ ...d, version: 2 }, "epsa")).toBe(false);
  expect(isDiscovery({ ...d, b2bIcps: null }, "epsa")).toBe(false);
  expect(
    isDiscovery({ ...d, applicability: { b2bIcps: {}, b2cIcps: {} } }, "epsa"),
  ).toBe(false);
  expect(
    isDiscovery(
      { ...d, targetSegments: [{ ...d.targetSegments[0], match: 200 }] },
      "epsa",
    ),
  ).toBe(false);
});
test("seeds work for every client, remain independent, and never claim validated demo evidence", () => {
  for (const client of osClients) {
    const d = discoverySeed(client);
    expect(isDiscovery(d, client.slug)).toBe(true);
    expect(d.sources.every((s) => s.demo && s.status !== "Validado")).toBe(
      true,
    );
  }
  const a = discoverySeed(epsa);
  a.companyProfile.name = "Changed";
  expect(discoverySeed(epsa).companyProfile.name).toBe("EPSA / Line Up");
  expect(discoverySeed(aca).clientSlug).toBe("aca");
});
test("presentation preserves structured repeatable content, derived links, flags and isolation", () => {
  const d = discoverySeed(epsa);
  d.targetSegments[0].match = 90;
  d.targetSegments[0].potential = 80;
  d.relevantFacts[0].featured = false;
  const output = toDiscoveryPresentation(d);
  expect(output.relevantFacts).toHaveLength(2);
  expect(output.offeringSlides).toHaveLength(2);
  expect(output.b2bIcpSlides).toHaveLength(2);
  expect(output.targetingMatrix[0].quadrant).toBe("Foco principal");
  expect(output.offeringSlides[0].segmentIds).toContain("segment-companies");
  output.companyOverview.name = "Changed";
  expect(d.companyProfile.name).toBe("EPSA / Line Up");
});
test("only admin or the assigned account PM may edit Discovery", () => {
  expect(canEditDiscovery("admin", aca)).toBe(true);
  expect(canEditDiscovery("pm", epsa)).toBe(true);
  expect(canEditDiscovery("pm", aca)).toBe(false);
  expect(canEditDiscovery("operativo", epsa)).toBe(false);
});
