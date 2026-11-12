import { fields, type EntityKind, type Field } from "../discovery/schema";
export type AnswerValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | Record<string, string | number | boolean | null | string[]>[];
export type QuestionnaireCondition = {
  questionId: string;
  equals: string | boolean;
};
export type QuestionnaireQuestion = {
  id: string;
  sectionId: string;
  label: string;
  helpText?: string;
  responseType:
    | "shortText"
    | "longText"
    | "number"
    | "select"
    | "multiselect"
    | "boolean"
    | "file"
    | "url"
    | "repeatable";
  required: boolean;
  targetFieldPath: string;
  applicableWhen?: QuestionnaireCondition[];
  fields?: readonly Field[];
};
export type QuestionnaireSection = {
  id: string;
  label: string;
  questions: QuestionnaireQuestion[];
};
export type QuestionnaireTemplate = {
  id: string;
  name: string;
  version: number;
  sections: QuestionnaireSection[];
};
export type QuestionnaireResponse = {
  origin?: "manual" | "source";
  sourceIds?: string[];
  suggestionId?: string;
  demo?: boolean;
  questionId: string;
  value: AnswerValue;
  status: "unanswered" | "draft" | "answered" | "validated";
  sourceId?: string;
  sourceReference: string;
  permission: "pending" | "public" | "confidential";
  clarification: string;
  updatedAt: string;
  updatedBy: string;
};
export type QuestionnaireInstance = {
  id: string;
  templateId: string;
  templateVersion: number;
  responses: Record<string, QuestionnaireResponse>;
};
const labels: Record<string, string> = {
  name: "¿Cómo se llama?",
  legalName: "¿Cuál es la razón social, si corresponde?",
  definition: "¿Cómo describirías la empresa en una o dos frases?",
  companyType: "¿Qué tipo de empresa es?",
  activity: "¿A qué se dedica concretamente?",
  location: "¿Dónde opera o vive este público?",
  coverage: "¿Qué cobertura tiene?",
  tagline: "¿Hay una frase corta que resuma el negocio?",
  relatedBrands: "¿Existen otras marcas o unidades relacionadas?",
  value: "¿Cuál es el valor o hecho?",
  unit: "¿En qué unidad se mide?",
  relevance: "¿Por qué es importante este dato o unidad?",
  category: "¿Qué describe?",
  featured: "¿Querés destacarlo en la presentación?",
  description: "¿Cómo lo describirías?",
  problem: "¿Qué problema resuelve?",
  customerType: "¿Para qué tipo de cliente?",
  primary: "¿Es la unidad principal?",
  type: "¿De qué tipo es?",
  businessUnitId: "¿A qué línea del negocio pertenece?",
  includes: "¿Qué incluye?",
  delivery: "¿Cómo se entrega?",
  reasonToBelieve:
    "¿Qué datos, experiencia o credenciales respaldan esta solución?",
  strengths: "¿Por qué la eligen?",
  differentiators: "¿Qué la diferencia?",
  materials: "¿Qué materiales comerciales hay?",
  catalog: "¿Dónde está el catálogo, ficha o brochure?",
  image: "¿Hay una imagen o referencia visual?",
  cycleDuration: "¿Cuánto dura normalmente una venta?",
  averageTicket: "¿Cuál es el valor típico de una venta?",
  repurchase: "¿Los clientes vuelven a comprar?",
  frequency: "¿Con qué frecuencia compran?",
  inquirer: "¿Quién inicia la consulta?",
  influencer: "¿Quién influye?",
  decider: "¿Quién decide?",
  approver: "¿Quién aprueba?",
  lossReasons: "¿Por qué se pierden oportunidades?",
  observations: "¿Qué otras observaciones u objeciones hay?",
  channel: "¿Por qué canal llega o continúa la consulta?",
  requiredInformation: "¿Qué información se necesita?",
  customerAction: "¿Qué hace el cliente?",
  internalAction: "¿Qué hace el equipo?",
  frictions: "¿Qué dificulta avanzar?",
  duration: "¿Cuánto dura esta etapa?",
  match: "¿Qué tan bien encaja este grupo con la oferta? (0 a 100)",
  potential: "¿Qué potencial de crecimiento tiene? (0 a 100)",
  currentRelevance: "¿Qué importancia tiene hoy en el negocio? (0 a 100)",
  expectedDemand: "¿Qué demanda se espera?",
  expectedTicket: "¿Qué valor de compra se espera?",
  expectedRepurchase: "¿Qué recompra se espera?",
  offeringIds: "¿Qué productos o servicios le corresponden?",
  requiresIcp: "¿Necesita una descripción propia del cliente ideal?",
  segmentId: "¿A qué grupo de clientes corresponde?",
  interests: "¿Qué le interesa?",
  trustedSources: "¿A quién le cree?",
  insight: "¿Qué le preocupa o qué necesidad no tiene resuelta?",
  trigger: "¿Qué situación lo lleva a buscar?",
  barriers: "¿Qué lo frena?",
  benefit: "¿Qué beneficio concreto espera?",
  industry: "¿De qué rubro es la empresa que compra?",
  companySize: "¿Qué tamaño tiene?",
  operationType: "¿Cómo opera?",
  interlocutor: "¿Con qué rol se conversa?",
  decisionParticipants: "¿Quiénes participan en la decisión?",
  channels: "¿Dónde se informa?",
  perceivedRisk: "¿Qué riesgo percibe?",
  switchingCost: "¿Qué frena el cambio de proveedor?",
  lifeStage: "¿En qué momento de vida está?",
  occupation: "¿A qué se dedica esta persona?",
  buyingSituation: "¿Desde qué situación compra?",
  platforms: "¿Qué plataformas usa?",
  purchaseLocation: "¿Dónde compra?",
  priceSensitivity: "¿Qué peso tiene el precio?",
  distrust: "¿Qué le genera desconfianza?",
  informationGap: "¿Qué información le falta?",
  timeConstraints: "¿Qué limitaciones de tiempo tiene?",
};
const blockNames: [EntityKind, string, string][] = [
  [
    "companyProfile",
    "Empresa",
    "Describí el negocio sin promesas ni adjetivos.",
  ],
  [
    "relevantFacts",
    "Datos relevantes",
    "Años, clientes, productos, puntos de venta, sedes, usuarios, equipo o capacidad. Indicá valor, unidad, fuente y autorización. Una respuesta por dato.",
  ],
  [
    "businessUnits",
    "Unidades de negocio",
    "Agregá las líneas o áreas que componen el negocio.",
  ],
  [
    "offerings",
    "Productos y servicios",
    "Una respuesta por producto o servicio.",
  ],
  [
    "salesProcess",
    "Proceso comercial",
    "Desde la primera consulta hasta el cierre. Agregá también las etapas.",
  ],
  [
    "stages",
    "Etapas de la venta",
    "Cómo llega, primer contacto, propuesta, decisión y cierre. Podés agregar o cambiar etapas.",
  ],
  [
    "targetSegments",
    "Grupos de clientes",
    "Describí los tipos de clientes actuales y potenciales. B2B significa empresas; B2C, personas consumidoras.",
  ],
  [
    "b2bIcps",
    "Perfil de empresa que compra",
    "Describí una empresa ideal y las personas que intervienen en su compra.",
  ],
  [
    "b2cIcps",
    "Perfil de persona que compra",
    "Describí las situaciones, necesidades y decisiones de una persona consumidora.",
  ],
];
export const questionnaireTemplate: QuestionnaireTemplate = {
  id: "business-discovery",
  name: "Cuestionario inicial",
  version: 1,
  sections: blockNames.map(([kind, label, helpText]) => ({
    id: kind,
    label,
    questions:
      kind === "companyProfile" || kind === "salesProcess"
        ? fields[kind].map((f) => ({
            id: `${kind}.${f.key}`,
            sectionId: kind,
            label: labels[f.key] ?? f.label,
            helpText,
            responseType: "longText" as const,
            required: "required" in f && f.required === true,
            targetFieldPath: `${kind}.${f.key}`,
          }))
        : [
            {
              id: `${kind}.records`,
              sectionId: kind,
              label: `Contanos sobre: ${label.toLowerCase()}`,
              helpText,
              responseType: "repeatable",
              required: true,
              targetFieldPath: kind,
              fields: fields[kind].map((f) => ({
                ...f,
                label: labels[f.key] ?? f.label,
              })),
            },
          ],
  })),
};
questionnaireTemplate.sections.push({
  id: "materials",
  label: "Material disponible",
  questions: [
    "Sitio web",
    "Redes",
    "Catálogos",
    "Brochures",
    "Presentaciones",
    "Listas de productos",
    "Estudios",
    "Reportes",
    "Accesos a plataformas (sin contraseñas)",
    "Documentos comerciales",
    "Grabaciones o notas de reuniones",
  ].map((label, i) => ({
    id: `materials.${i}`,
    sectionId: "materials",
    label: `¿Qué ${label.toLowerCase()} podés compartir?`,
    helpText:
      "Ingresá una URL o referencia. No ingreses contraseñas ni tokens. Los archivos binarios no se suben en esta preview.",
    responseType: "longText",
    required: false,
    targetFieldPath: "sources",
  })),
});
export function emptyQuestionnaire(): QuestionnaireInstance {
  return {
    id: "initial",
    templateId: questionnaireTemplate.id,
    templateVersion: questionnaireTemplate.version,
    responses: {},
  };
}
export function answerPresent(value: AnswerValue): boolean {
  if (Array.isArray(value))
    return value.some((row) =>
      typeof row === "string"
        ? !!row.trim()
        : Object.entries(row).some(
            ([key, v]) =>
              !key.startsWith("_") &&
              (Array.isArray(v)
                ? v.length > 0
                : v !== null && String(v).trim() !== ""),
          ),
    );
  return value !== null && String(value).trim() !== "";
}
export function questionnaireProgress(instance: QuestionnaireInstance) {
  const sections = questionnaireTemplate.sections.map((section) => {
    const questions = section.questions;
    const answered = questions.filter((q) => {
      const r = instance.responses[q.id];
      return (
        r &&
        answerPresent(r.value) &&
        (r.status === "answered" || r.status === "validated")
      );
    }).length;
    return {
      id: section.id,
      label: section.label,
      answered,
      total: questions.length,
      percent: Math.round((answered / questions.length) * 100),
      pending: questions
        .filter(
          (q) =>
            !instance.responses[q.id] ||
            !answerPresent(instance.responses[q.id].value),
        )
        .map((q) => q.label),
      clarification: questions.filter(
        (q) => instance.responses[q.id]?.clarification,
      ).length,
    };
  });
  const answered = sections.reduce((n, s) => n + s.answered, 0),
    total = sections.reduce((n, s) => n + s.total, 0);
  return {
    sections,
    answered,
    total,
    percent: Math.round((answered / total) * 100),
  };
}
export function questionnaireText() {
  return questionnaireTemplate.sections
    .map(
      (s) =>
        `${s.label}\n${s.questions.map((q) => `${q.label}\n${q.helpText ?? ""}\n${q.fields?.map((f) => `- ${f.label}`).join("\n") ?? ""}`).join("\n\n")}`,
    )
    .join("\n\n");
}
