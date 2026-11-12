import type { ServiceId } from "../os-data";
export type KnowledgeValue = string | number | boolean | null | string[];
export type KnowledgeField = {
  key: string;
  label: string;
  kind: "text" | "long" | "number" | "select" | "relations" | "boolean";
  options?: string[];
  reference?:
    | "sources"
    | "segments"
    | "icps"
    | "offerings"
    | "findings"
    | "discovery"
    | "campaigns"
    | "pages"
    | "services";
  required?: boolean;
  max?: number;
  condition?: { field: string; value: string };
};
export type Blueprint = {
  id: string;
  label: string;
  slide: string;
  service?: ServiceId;
  fields: KnowledgeField[];
  methodology?: string;
};
const t = (key: string, label: string, required = true): KnowledgeField => ({
  key,
  label,
  kind: "long",
  required,
});
const n = (key: string, label: string, max?: number): KnowledgeField => ({
  key,
  label,
  kind: "number",
  required: true,
  max,
});
const select = (
  key: string,
  label: string,
  options: string[],
): KnowledgeField => ({ key, label, kind: "select", required: true, options });
const rel = (
  key: string,
  label: string,
  reference: KnowledgeField["reference"],
  required = false,
): KnowledgeField => ({ key, label, kind: "relations", reference, required });
export const benchmarkBlueprints: Blueprint[] = [
  {
    id: "overview",
    label: "Resumen general",
    slide: "15 / 20",
    fields: [
      t("claim", "Claim o promesa"),
      t("description", "Descripción general"),
      t("size", "Tamaño y alcance"),
      t("age", "Antigüedad"),
      t("positioning", "Posicionamiento"),
      t("audience", "Público principal / cliente ideal"),
      rel("segments", "Segmentos relacionados", "segments"),
    ],
  },
  {
    id: "content",
    label: "Contenidos",
    slide: "16 / 21",
    fields: [
      t("links", "Links a contenidos relevantes"),
      t("channel", "Canal"),
      n("followers", "Seguidores"),
      t("frequency", "Frecuencia"),
      t("topics", "Temas"),
      t("protagonists", "Protagonistas"),
      t("channelRole", "Rol del canal"),
      t("summary", "Síntesis"),
    ],
  },
  {
    id: "paid",
    label: "Paid media",
    slide: "17 / 22",
    fields: [
      t("platforms", "Plataformas"),
      t("campaignTypes", "Tipos de campaña"),
      t("pieces", "Piezas / referencias"),
      t("insight", "Insight utilizado"),
      t("objective", "Objetivo de las campañas"),
      t("summary", "Síntesis"),
    ],
  },
  {
    id: "web",
    label: "Web",
    slide: "18 / 23",
    fields: [
      t("home", "Home / enlace"),
      t("internalPages", "Secciones internas / links"),
      t("resources", "Recursos destacados"),
      t("role", "Rol del sitio"),
      t("content", "Contenido"),
      t("actions", "Acciones esperadas"),
      t("summary", "Síntesis"),
    ],
  },
  {
    id: "design",
    label: "Diseño",
    slide: "19 / 24",
    fields: [
      t("palette", "Paleta"),
      t("fonts", "Tipografías"),
      t("graphics", "Recursos gráficos"),
      t("images", "Imágenes"),
      t("treatment", "Tratamiento"),
      t("categoryCodes", "Códigos de categoría"),
      t("differentiation", "Diferenciación"),
      t("summary", "Síntesis"),
    ],
  },
];
export const findingBlueprint: Blueprint = {
  id: "finding",
  label: "Conclusión",
  slide: "25",
  fields: [
    select("category", "Tipo de conclusión", [
      "Qué podemos tomar",
      "Qué debemos evitar",
      "Cómo podemos diferenciarnos",
    ]),
    t("statement", "Enunciado"),
    t("explanation", "Explicación"),
    t("brand", "Marca de la que surge"),
    select("impact", "Impacto", ["Bajo", "Medio", "Alto"]),
  ],
};
export const planBlueprints: Blueprint[] = [
  {
    id: "objectives",
    service: "estrategia",
    label: "Objetivos",
    slide: "27",
    fields: [
      t("statement", "Enunciado"),
      t("outcome", "Qué queremos que pase"),
      t("reason", "Por qué importa"),
      t("indicator", "Indicador relacionado"),
    ],
  },
  {
    id: "channels",
    service: "estrategia",
    label: "Ecosistema de canales",
    slide: "28",
    fields: [
      select("stage", "Etapa", [
        "Audiencia fría · nos descubren",
        "Audiencia de marca · nos recuerdan",
        "Audiencia interesada · nos validan",
        "Clientes y base propia · nos eligen",
      ]),
      t("channel", "Canal"),
      t("action", "Acción"),
      t("content", "Contenido"),
      t("objective", "Objetivo"),
    ],
  },
  {
    id: "insight",
    service: "estrategia",
    label: "Insight",
    slide: "29",
    fields: [
      t("tension", "Tensión principal"),
      rel("discoveryRefs", "Hallazgos del Discovery", "discovery", true),
      rel("findingIds", "Conclusiones del Benchmark", "findings", true),
    ],
  },
  {
    id: "story",
    service: "estrategia",
    label: "Claim y storytelling",
    slide: "30",
    fields: [
      t("claim", "Claim"),
      t("storytelling", "Storytelling"),
      t("territory", "Territorio"),
      t("basis", "Fundamento"),
      select("approval", "Aprobación", [
        "Pendiente",
        "Aprobado",
        "Requiere revisión",
      ]),
    ],
  },
  {
    id: "voice",
    service: "estrategia",
    label: "Tono de marca",
    slide: "31",
    fields: [
      t("sound", "Cómo suena"),
      t("reference", "Referencia"),
      t("message", "Qué transmite"),
      t("attributes", "Atributos"),
      t("audiencePosition", "Posición frente a la audiencia"),
      t("differentiation", "Diferenciación"),
      t("examples", "Ejemplos"),
      t("avoid", "Cosas que evitar"),
    ],
  },
  {
    id: "visualDirection",
    service: "diseno-marca",
    label: "Dirección visual",
    slide: "32",
    fields: [
      t("role", "Rol del diseño"),
      t("applications", "Aplicaciones"),
      t("positioning", "Relación con el posicionamiento"),
    ],
  },
  {
    id: "lookFeel",
    service: "diseno-marca",
    label: "Look & feel",
    slide: "33",
    fields: [
      t("description", "Descripción"),
      t("mood", "Clima"),
      t("territory", "Territorio"),
      t("references", "Referencias"),
      t("moodboard", "Moodboard / referencias visuales"),
      t("basis", "Fundamentos"),
    ],
  },
  {
    id: "colors",
    service: "diseno-marca",
    label: "Paleta",
    slide: "34",
    fields: [t("hex", "Color hexadecimal"), t("function", "Función del color")],
  },
  {
    id: "visualSystem",
    service: "diseno-marca",
    label: "Sistema visual",
    slide: "34",
    fields: [
      t("headingFont", "Tipografía de titulares"),
      t("bodyFont", "Tipografía de textos"),
      t("weights", "Pesos"),
      t("uses", "Usos"),
      t("icons", "Iconografía"),
      t("textures", "Texturas"),
      t("imageTreatment", "Tratamiento de imagen"),
      t("ownResources", "Recursos propios"),
    ],
  },
  {
    id: "campaigns",
    service: "publicidad-digital",
    label: "Plan de medios",
    slide: "35–37",
    fields: [
      t("name", "Nombre de campaña"),
      t("focus", "Producto, servicio, branding o segmento"),
      t("objective", "Objetivo"),
      t("platforms", "Plataformas"),
      n("share", "Distribución de inversión (%)", 100),
      t("audience", "Audiencia"),
      t("funnel", "Funnel"),
      n("monthlyInvestment", "Inversión mensual"),
      t("currency", "Moneda"),
      t("assumptions", "Supuestos"),
      select("approval", "Estado de aprobación", [
        "Pendiente",
        "Aprobado",
        "Requiere revisión",
      ]),
    ],
  },
  {
    id: "allocations",
    service: "publicidad-digital",
    label: "Inversión por canal",
    slide: "37",
    fields: [
      rel("campaignIds", "Campaña", "campaigns", true),
      t("channel", "Canal"),
      n("share", "Distribución por canal (%)", 100),
    ],
  },
  {
    id: "adVisibility",
    service: "publicidad-digital",
    label: "Anuncios y visibilidad en IA",
    slide: "38",
    fields: [
      t("contentClarity", "Estructura y claridad del contenido"),
      t("traffic", "Tráfico y diversidad de fuentes"),
      t("brandDemand", "Demanda de marca"),
      t("considerations", "Consideraciones a validar"),
    ],
    methodology:
      "La plantilla propone revisar contenido web y demanda de marca para visibilidad en IA. Sus afirmaciones sobre anuncios deben verificarse con el proveedor. No hay integración publicitaria con IA activa.",
  },
  {
    id: "paidKpis",
    service: "publicidad-digital",
    label: "KPIs de publicidad",
    slide: "39–40",
    fields: [
      select("businessModel", "Modelo", ["Leads", "Ecommerce"]),
      select("indicator", "Indicador", [
        "Alcance y frecuencia",
        "Tasa de conversión",
        "Costo por consulta",
        "Calidad de consultas",
        "ROAS",
        "Conversión ecommerce",
        "Ticket promedio",
        "Clientes nuevos",
        "Recompra",
        "Frecuencia",
      ]),
      t("target", "Objetivo numérico con datos propios", false),
      {
        ...t("leadQuality", "Criterio de calidad de consultas", false),
        condition: { field: "businessModel", value: "Leads" },
      },
      {
        ...t("attribution", "Ventana y criterio de atribución", false),
        condition: { field: "businessModel", value: "Ecommerce" },
      },
    ],
    methodology:
      "Los KPIs son metodología común. Los valores objetivo solo se acuerdan cuando existen datos propios.",
  },
  {
    id: "contentAxes",
    service: "contenidos",
    label: "Ejes temáticos",
    slide: "41–42",
    fields: [
      t("name", "Nombre del eje"),
      t("description", "Descripción"),
      t("audience", "A quién le habla"),
      rel("icpIds", "Perfiles relacionados", "icps", true),
      t("insight", "Insight que lo justifica"),
      n("piecesPerMonth", "Piezas por mes"),
      t("formats", "Formatos"),
    ],
  },
  {
    id: "contentRules",
    service: "contenidos",
    label: "Do's & don'ts",
    slide: "43",
    fields: [
      select("type", "Tipo", ["Siempre", "Nunca"]),
      t("rule", "Regla"),
      t("basis", "Fundamento"),
      t("examples", "Ejemplos"),
    ],
  },
  {
    id: "contentKpis",
    service: "contenidos",
    label: "KPIs y aprendizajes",
    slide: "44",
    fields: [
      select("indicator", "Indicador", [
        "Alcance",
        "Interacciones",
        "Aumento de seguidores",
      ]),
      t("topics", "Temáticas"),
      t("formats", "Formatos"),
      t("learning", "Aprendizajes"),
      t("target", "Objetivo numérico con datos propios", false),
    ],
    methodology:
      "Alcance, interacciones y crecimiento de seguidores. Analizar qué temáticas y formatos funcionan y por qué; no inventar objetivos.",
  },
  {
    id: "production",
    service: "audiovisuales",
    label: "Lineamientos de producción",
    slide: "45–46",
    fields: [
      t("style", "Estilo"),
      t("pace", "Ritmo"),
      t("framing", "Encuadres"),
      t("light", "Luz"),
      select("scriptType", "Guion o documental", [
        "Guion",
        "Documental",
        "Mixto",
      ]),
      t("locations", "Locaciones"),
      t("clothing", "Indumentaria"),
      t("speech", "Tono del habla"),
      t("music", "Música"),
      t("protagonist", "Protagonista"),
    ],
  },
  {
    id: "visualReferences",
    service: "audiovisuales",
    label: "Referencias visuales",
    slide: "47",
    fields: [
      t("reference", "Imagen o link"),
      t("description", "Descripción"),
      t("take", "Qué se toma"),
      t("avoid", "Qué se evita"),
    ],
  },
  {
    id: "websiteRole",
    service: "desarrollo-web",
    label: "Rol y recomendaciones",
    slide: "48–49",
    fields: [
      t("role", "Rol del sitio"),
      t("technology", "Tecnología"),
      t("reason", "Motivo de elección"),
      t("features", "Funcionalidades"),
      t("requirements", "Requisitos técnicos"),
      t("integrations", "Integraciones"),
      t("analytics", "Analítica"),
    ],
  },
  {
    id: "sitemap",
    service: "desarrollo-web",
    label: "Sitemap",
    slide: "50",
    fields: [
      t("name", "Página"),
      select("type", "Tipo de página", ["Estática", "Dinámica", "Landing"]),
      t("blocks", "Bloques"),
      rel("parentIds", "Página superior", "pages"),
      t("objective", "Objetivo"),
      t("cta", "CTA"),
      rel("relatedPageIds", "Otras páginas relacionadas", "pages"),
    ],
  },
  {
    id: "webVisibility",
    service: "desarrollo-web",
    label: "Visibilidad en IA",
    slide: "51",
    fields: [
      t("indexing", "Acceso e indexación"),
      t("citable", "Contenido citable"),
      t("structuredData", "Datos estructurados"),
      t("stableUrls", "URLs estables"),
      t("authority", "Autoridad"),
      t("mentions", "Menciones"),
      t("outsidePlan", "Iniciativas fuera del plan"),
    ],
    methodology:
      "Lineamientos de contenido e indexación de la plantilla. No implican una integración activa ni garantizan citación por sistemas de IA.",
  },
  {
    id: "webKpis",
    service: "desarrollo-web",
    label: "KPIs web",
    slide: "52–53",
    fields: [
      select("businessModel", "Modelo", ["Leads", "Ecommerce"]),
      select("indicator", "Indicador", [
        "Tráfico",
        "Fuente de origen",
        "Permanencia",
        "Recorrido",
        "Conversiones",
        "Productos vistos",
        "Productos vendidos",
        "Carrito",
        "Checkout",
        "Page Speed Insights",
      ]),
      t("target", "Objetivo con datos propios", false),
      {
        ...t("contactPath", "Recorrido hasta el contacto", false),
        condition: { field: "businessModel", value: "Leads" },
      },
      {
        ...t("purchasePath", "Recorrido de compra y abandono", false),
        condition: { field: "businessModel", value: "Ecommerce" },
      },
    ],
    methodology:
      "Los KPIs base orientan la revisión mensual; valores y objetivos requieren medición propia.",
  },
];
export const commonKnowledgeFields: KnowledgeField[] = [
  t("owner", "Responsable"),
  rel("sourceIds", "Fuentes", "sources", true),
  t("evidence", "Evidencia textual"),
  t("observedAt", "Fecha del relevamiento (AAAA-MM-DD)"),
  t("captures", "Capturas / referencias", false),
  t("notes", "Notas", false),
  select("status", "Estado", ["Borrador", "Validado", "Requiere revisión"]),
];
export const planCommonFields = [
  ...commonKnowledgeFields,
  rel("discoveryRefs", "Hallazgos de Discovery", "discovery"),
  rel("findingIds", "Conclusiones de Benchmark", "findings"),
];
export function visibleFields(
  blueprint: Blueprint,
  values: Record<string, KnowledgeValue>,
) {
  return blueprint.fields
    .filter(
      (f) => !f.condition || values[f.condition.field] === f.condition.value,
    )
    .map((f) => {
      if (f.key !== "indicator" || !values.businessModel) return f;
      const allowed =
        blueprint.id === "paidKpis"
          ? values.businessModel === "Leads"
            ? [
                "Alcance y frecuencia",
                "Tasa de conversión",
                "Costo por consulta",
                "Calidad de consultas",
              ]
            : [
                "ROAS",
                "Conversión ecommerce",
                "Ticket promedio",
                "Clientes nuevos",
                "Recompra",
                "Frecuencia",
              ]
          : blueprint.id === "webKpis"
            ? values.businessModel === "Leads"
              ? [
                  "Tráfico",
                  "Fuente de origen",
                  "Permanencia",
                  "Recorrido",
                  "Conversiones",
                  "Page Speed Insights",
                ]
              : [
                  "Tráfico",
                  "Productos vistos",
                  "Productos vendidos",
                  "Carrito",
                  "Checkout",
                  "Page Speed Insights",
                ]
            : f.options;
      return { ...f, options: allowed };
    });
}
