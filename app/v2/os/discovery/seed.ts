import { directorMeta } from "../director-data";
import { type OsClient } from "../os-data";
import {
  emptyDiscovery,
  newEntity,
  refreshDiscovery,
  type MarketingDiscovery,
  type Trace,
} from "./model";

/** Only transforms existing preview data. No catalogue was read, no extraction
 * ran, and no number or commercial decision is asserted as a verified fact. */
export function discoverySeed(client: OsClient): MarketingDiscovery {
  const d = emptyDiscovery(client.slug);
  const meta = directorMeta(client.slug);
  const owner =
    client.team.find((p) => p.role.startsWith("Responsable de cuenta"))?.name ??
    "";
  const trace: Partial<Trace> = {
    demo: true,
    status: "Requiere revisión",
    owner,
    sourceIds: ["preview-data"],
    evidence:
      "Datos existentes de la ficha demostrativa; pendientes de contraste con el cliente.",
    notes: "Dato demostrativo. No equivale a una fuente documental verificada.",
  };
  d.sources = [
    {
      ...newEntity("sources", "preview-data"),
      name: "Datos de la preview existente",
      type: "Otra fuente",
      reference: "app/v2/os/director-data.ts · app/v2/os/os-data.ts",
      owner,
      demo: true,
      status: "Requiere revisión",
      evidence:
        "Referencia al código de demostración, sin extracción de archivos.",
      notes:
        "Los documentos mencionados en la demo no se procesaron ni se verificaron.",
    },
  ];
  d.companyProfile = {
    ...d.companyProfile,
    ...trace,
    name: client.name,
    definition: meta?.business.definition ?? "",
    relatedBrands: meta?.business.units.join(" · ") ?? "",
  };
  d.businessUnits = (meta?.business.units ?? []).map((name, i) => ({
    ...newEntity("businessUnits", `unit-${i}`),
    ...trace,
    name,
  }));
  if (client.slug !== "epsa") return refreshDiscovery(d);

  d.companyProfile.companyType = "Empresa B2B";
  d.companyProfile.activity =
    "Unidades industriales y una línea de producto en etapa de lanzamiento.";
  d.companyProfile.tagline = meta?.business.offer ?? "";
  d.businessUnits = d.businessUnits.map((u) => ({
    ...u,
    customerType: "Empresas",
    description:
      u.name === "Line Up"
        ? "Línea de producto en etapa de lanzamiento."
        : u.name === "Servicios posventa"
          ? "Acompañamiento posventa mencionado en la ficha existente."
          : "Unidades industriales mencionadas en la ficha existente.",
  }));
  d.relevantFacts = [
    {
      name: "Orientación del negocio",
      value: "B2B",
      relevance: "Contextualiza la comunicación dirigida a empresas.",
      category: "Otra",
    },
    {
      name: "Línea de producto",
      value: "Line Up",
      relevance: "Identifica la línea en etapa de lanzamiento.",
      category: "Productos",
    },
    {
      name: "Servicio relacionado",
      value: "Posventa",
      relevance: "Identifica el acompañamiento incluido en la ficha previa.",
      category: "Otra",
    },
  ].map((f, i) => ({
    ...newEntity("relevantFacts", `fact-${i}`),
    ...trace,
    ...f,
    featured: true,
  }));
  d.offerings = [
    {
      name: "Line Up",
      type: "Producto",
      businessUnitId: "unit-1",
      description: "Línea de producto en etapa de lanzamiento.",
    },
    {
      name: "Servicios posventa",
      type: "Servicio",
      businessUnitId: "unit-2",
      description:
        "Acompañamiento comercial y posventa mencionado en la ficha previa.",
    },
  ].map((o, i) => ({
    ...newEntity("offerings", `offering-${i}`),
    ...trace,
    ...o,
  }));
  d.salesProcess = {
    ...d.salesProcess,
    owner,
    notes:
      "Las etapas son una guía inicial. Relevar el proceso de ventas del cliente; las aprobaciones de campañas de la demo no describen su proceso comercial.",
  };
  d.targetSegments = [
    {
      ...newEntity("targetSegments", "segment-companies"),
      ...trace,
      name: "Empresas",
      type: "B2B",
      description: "Público mencionado en la ficha de EPSA.",
      offeringIds: ["offering-0", "offering-1"],
      requiresIcp: true,
    },
  ];
  d.b2bIcps = [
    {
      ...newEntity("b2bIcps", "icp-buyers"),
      ...trace,
      name: "Responsables de compras",
      segmentId: "segment-companies",
      description:
        "Interlocutor incluido entre los públicos de la ficha existente.",
      interlocutor: "Responsables de compras",
      offeringIds: ["offering-0", "offering-1"],
    },
    {
      ...newEntity("b2bIcps", "icp-commercial"),
      ...trace,
      name: "Dirección comercial",
      segmentId: "segment-companies",
      description:
        "Perfil mencionado entre los públicos de la ficha existente. Validar su intervención en la compra.",
      interlocutor: "Dirección comercial",
      offeringIds: ["offering-0"],
    },
  ];
  d.applicability.b2cIcps = {
    applies: false,
    reason:
      "La ficha demostrativa describe una empresa B2B. No se identificaron públicos B2C en los datos existentes; revisar con el PM si cambia el alcance.",
    updatedAt: "",
    updatedBy: "Datos de la preview existente",
  };
  return refreshDiscovery(d);
}
