/** Domain field catalog: shared by editors, readers, validation and presentation.
 * Required fields measure content coverage, not commercial truth. Optional fields
 * remain explicit, editable data rather than an opaque brief. */
export type Field = {
  key: string;
  label: string;
  kind?:
    | "text"
    | "long"
    | "number"
    | "boolean"
    | "select"
    | "relation"
    | "relations"
    | "date";
  required?: boolean;
  options?: readonly string[];
  collection?: "businessUnits" | "offerings" | "targetSegments" | "sources";
};
const company = [
  { key: "name", label: "Nombre comercial", required: true },
  { key: "legalName", label: "Nombre legal" },
  {
    key: "definition",
    label: "Definición literal",
    kind: "long",
    required: true,
  },
  { key: "companyType", label: "Qué es", required: true },
  { key: "activity", label: "A qué se dedica", required: true },
  { key: "location", label: "Dónde opera", required: true },
  { key: "coverage", label: "Cobertura", required: true },
  { key: "tagline", label: "Frase corta", required: true },
  { key: "relatedBrands", label: "Marcas o unidades relacionadas" },
] as const satisfies readonly Field[];
const facts = [
  { key: "name", label: "Nombre o descripción", required: true },
  { key: "value", label: "Valor", required: true },
  { key: "unit", label: "Unidad" },
  {
    key: "relevance",
    label: "Relevancia comunicacional",
    kind: "long",
    required: true,
  },
  {
    key: "category",
    label: "Categoría",
    kind: "select",
    options: [
      "Clientes",
      "Cobertura",
      "Puntos de venta",
      "Años de operación",
      "Productos",
      "Capacidad",
      "Volumen",
      "Facturación",
      "Usuarios",
      "Equipo",
      "Resultados",
      "Otra",
    ],
    required: true,
  },
  { key: "featured", label: "Destacar en la presentación", kind: "boolean" },
] as const satisfies readonly Field[];
const units = [
  { key: "name", label: "Nombre", required: true },
  { key: "description", label: "Descripción", kind: "long", required: true },
  { key: "problem", label: "Qué resuelve", kind: "long", required: true },
  { key: "customerType", label: "Tipo de cliente", required: true },
  { key: "relevance", label: "Relevancia dentro del negocio" },
  { key: "primary", label: "Unidad principal", kind: "boolean" },
] as const satisfies readonly Field[];
const offerings = [
  { key: "name", label: "Nombre", required: true },
  {
    key: "type",
    label: "Tipo",
    kind: "select",
    options: ["Producto", "Servicio"],
    required: true,
  },
  {
    key: "businessUnitId",
    label: "Unidad de negocio",
    kind: "relation",
    collection: "businessUnits",
    required: true,
  },
  { key: "description", label: "Descripción", kind: "long", required: true },
  { key: "includes", label: "Qué incluye", kind: "long", required: true },
  { key: "delivery", label: "Cómo se entrega", required: true },
  {
    key: "problem",
    label: "Problema que resuelve",
    kind: "long",
    required: true,
  },
  {
    key: "reasonToBelieve",
    label: "Reason to believe / evidencia",
    kind: "long",
    required: true,
  },
  { key: "strengths", label: "Fortalezas", kind: "long", required: true },
  {
    key: "differentiators",
    label: "Diferenciales",
    kind: "long",
    required: true,
  },
  {
    key: "materials",
    label: "Materiales relacionados / referencias",
    kind: "long",
  },
  { key: "catalog", label: "Catálogo o brochure (URL o referencia)" },
  { key: "image", label: "Imagen o referencia visual" },
] as const satisfies readonly Field[];
const sales = [
  { key: "cycleDuration", label: "Duración total del ciclo", required: true },
  { key: "averageTicket", label: "Ticket promedio", required: true },
  { key: "repurchase", label: "Recompra", required: true },
  { key: "frequency", label: "Frecuencia de compra" },
  { key: "inquirer", label: "Quién consulta", required: true },
  { key: "influencer", label: "Quién influye", required: true },
  { key: "decider", label: "Quién decide", required: true },
  { key: "approver", label: "Quién aprueba", required: true },
  { key: "lossReasons", label: "Motivos de pérdida", kind: "long" },
  { key: "observations", label: "Observaciones", kind: "long" },
] as const satisfies readonly Field[];
const stages = [
  { key: "name", label: "Nombre", required: true },
  { key: "description", label: "Descripción", kind: "long", required: true },
  { key: "channel", label: "Canal", required: true },
  { key: "requiredInformation", label: "Información requerida", kind: "long" },
  { key: "customerAction", label: "Acción del cliente", kind: "long" },
  { key: "internalAction", label: "Acción interna", kind: "long" },
  { key: "frictions", label: "Fricciones", kind: "long" },
  { key: "duration", label: "Duración" },
] as const satisfies readonly Field[];
const segments = [
  { key: "name", label: "Nombre", required: true },
  { key: "description", label: "Descripción", kind: "long", required: true },
  {
    key: "type",
    label: "Tipo",
    kind: "select",
    options: ["B2B", "B2C"],
    required: true,
  },
  { key: "match", label: "Match (0–100)", kind: "number", required: true },
  {
    key: "potential",
    label: "Potencial (0–100)",
    kind: "number",
    required: true,
  },
  {
    key: "currentRelevance",
    label: "Relevancia actual (0–100)",
    kind: "number",
    required: true,
  },
  { key: "expectedDemand", label: "Demanda esperada" },
  { key: "expectedTicket", label: "Ticket esperado" },
  { key: "expectedRepurchase", label: "Recompra esperada" },
  {
    key: "offeringIds",
    label: "Productos o servicios",
    kind: "relations",
    collection: "offerings",
    required: true,
  },
  { key: "requiresIcp", label: "Requiere ICP propio", kind: "boolean" },
] as const satisfies readonly Field[];
const commonIcp = [
  { key: "name", label: "Nombre", required: true },
  {
    key: "segmentId",
    label: "Segmento relacionado",
    kind: "relation",
    collection: "targetSegments",
    required: true,
  },
  {
    key: "description",
    label: "Descripción general",
    kind: "long",
    required: true,
  },
  { key: "interests", label: "Intereses", kind: "long", required: true },
  {
    key: "trustedSources",
    label: "Personas o fuentes a las que les cree",
    required: true,
  },
  { key: "location", label: "Ubicación", required: true },
  {
    key: "offeringIds",
    label: "Productos o servicios",
    kind: "relations",
    collection: "offerings",
    required: true,
  },
  { key: "insight", label: "Insight o tensión", kind: "long", required: true },
  {
    key: "trigger",
    label: "Disparador de búsqueda",
    kind: "long",
    required: true,
  },
  { key: "barriers", label: "Barreras", kind: "long", required: true },
  {
    key: "benefit",
    label: "Beneficio específico",
    kind: "long",
    required: true,
  },
] as const satisfies readonly Field[];
const b2b = [
  ...commonIcp,
  { key: "industry", label: "Rubro", required: true },
  { key: "companySize", label: "Tamaño de empresa", required: true },
  { key: "operationType", label: "Tipo de operación", required: true },
  { key: "interlocutor", label: "Interlocutor principal", required: true },
  { key: "decisionParticipants", label: "Participantes en la decisión" },
  { key: "inquirer", label: "Quién consulta" },
  { key: "influencer", label: "Quién influye" },
  { key: "decider", label: "Quién decide" },
  { key: "approver", label: "Quién aprueba" },
  { key: "channels", label: "Canales donde se informa", required: true },
  { key: "coverage", label: "Cobertura" },
  { key: "perceivedRisk", label: "Riesgo percibido" },
  { key: "switchingCost", label: "Costo de cambio" },
] as const satisfies readonly Field[];
const b2c = [
  ...commonIcp,
  { key: "lifeStage", label: "Momento de vida", required: true },
  { key: "occupation", label: "Ocupación", required: true },
  {
    key: "buyingSituation",
    label: "Situación desde la que compra",
    required: true,
  },
  { key: "platforms", label: "Plataformas que utiliza", required: true },
  { key: "purchaseLocation", label: "Dónde compra", required: true },
  { key: "priceSensitivity", label: "Sensibilidad al precio" },
  { key: "distrust", label: "Desconfianzas" },
  { key: "informationGap", label: "Falta de información" },
  { key: "timeConstraints", label: "Limitaciones de tiempo" },
] as const satisfies readonly Field[];
const sources = [
  { key: "name", label: "Nombre", required: true },
  {
    key: "type",
    label: "Tipo",
    kind: "select",
    options: [
      "Reunión",
      "Brief",
      "Documento",
      "Catálogo",
      "Brochure",
      "Sitio web",
      "Tienda Nube",
      "Carga manual",
      "Investigación",
      "Otra fuente",
    ],
    required: true,
  },
  { key: "reference", label: "URL o referencia", required: true },
  { key: "documentId", label: "Documento relacionado (referencia)" },
  { key: "date", label: "Fecha de la fuente", kind: "date", required: true },
] as const satisfies readonly Field[];
export const fields = {
  companyProfile: company,
  relevantFacts: facts,
  businessUnits: units,
  offerings,
  salesProcess: sales,
  stages,
  targetSegments: segments,
  b2bIcps: b2b,
  b2cIcps: b2c,
  sources,
};
export type EntityKind = keyof typeof fields;
export type FieldValue = string | string[] | number | boolean | null;
export type EditableRecord = Record<string, FieldValue>;
export const traceFields = [
  { key: "owner", label: "Responsable", required: true },
  {
    key: "sourceIds",
    label: "Fuentes",
    kind: "relations",
    collection: "sources",
    required: true,
  },
  { key: "evidence", label: "Evidencia / cita", kind: "long", required: true },
  { key: "notes", label: "Notas", kind: "long" },
  {
    key: "status",
    label: "Estado de validación",
    kind: "select",
    options: ["Borrador", "Validado", "Requiere revisión"],
    required: true,
  },
  { key: "demo", label: "Dato demostrativo", kind: "boolean" },
] as const satisfies readonly Field[];
export function entityFields(kind: EntityKind): readonly Field[] {
  return [
    ...fields[kind],
    ...traceFields.filter((f) => kind !== "sources" || f.key !== "sourceIds"),
  ];
}
export const sections = [
  {
    key: "companyProfile",
    label: "Quiénes somos",
    slide: 5,
    hint: "Definición literal en una o dos frases, sin adjetivos ni promesas.",
  },
  {
    key: "relevantFacts",
    label: "Datos relevantes",
    slide: 6,
    hint: "Hechos y números que dimensionan el negocio. Mínimo: tres datos validados.",
  },
  {
    key: "businessUnits",
    label: "Unidades de negocio",
    slide: 7,
    hint: "Qué resuelve cada unidad y para qué tipo de cliente.",
  },
  {
    key: "offerings",
    label: "Productos y servicios",
    slide: 8,
    hint: "Una ficha por oferta. Una futura filmina por producto o servicio.",
  },
  {
    key: "salesProcess",
    label: "Proceso comercial",
    slide: 9,
    hint: "Cómo se vende hoy: desde la llegada hasta el cierre.",
  },
  {
    key: "targetSegments",
    label: "Segmentación",
    slide: 10,
    hint: "Match horizontal, potencial vertical y tamaño según relevancia actual.",
  },
  {
    key: "b2bIcps",
    label: "ICP B2B",
    slide: 11,
    hint: "Un perfil por segmento priorizado de empresas.",
  },
  {
    key: "b2cIcps",
    label: "ICP B2C",
    slide: 12,
    hint: "Un perfil por segmento priorizado de consumidores.",
  },
] as const;
export type SectionKey = (typeof sections)[number]["key"];
export type CollectionKey = Exclude<
  EntityKind,
  "companyProfile" | "salesProcess"
>;
