export type AiModality = "text" | "image" | "video";
export type AiUsageEvent = {
  id: string;
  occurred_at: string;
  area: string;
  activity: string;
  provider: string;
  model: string;
  modality: AiModality;
  input_tokens: number;
  output_tokens: number;
  units_generated: number;
  units_approved: number;
  attempts: number;
  cost_usd: number | null;
  minutes_saved: number;
  cost_source: "provider" | "estimated";
};

export type AiUsageBudget = { area: string; monthly_limit_usd: number };
export type AiUsageCoverage = {
  status: "complete" | "partial" | "unknown";
  returned_events: number;
  total_events: number | null;
};
export type AiUsageSnapshot = {
  mode: "demo" | "live" | "unavailable" | "forbidden";
  events: AiUsageEvent[];
  budgets: AiUsageBudget[];
  note: string;
  coverage?: AiUsageCoverage;
};

const dayAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
const sample = (
  id: string, days: number, area: string, activity: string, provider: string, model: string,
  modality: AiModality, cost_usd: number, units_generated: number, units_approved: number,
  attempts: number, input_tokens = 0, output_tokens = 0, minutes_saved = 0,
): AiUsageEvent => ({
  id, occurred_at: dayAgo(days), area, activity, provider, model, modality,
  cost_usd, units_generated, units_approved, attempts, input_tokens, output_tokens,
  minutes_saved, cost_source: "estimated",
});

/** All values below are intentionally synthetic; NEVER mix them into production data. */
export function makeDemoSnapshot(): AiUsageSnapshot {
  return {
    mode: "demo",
    coverage: { status: "complete", returned_events: 16, total_events: 16 },
    note: "Vista de diseño: cifras ficticias. Sin conexión a facturación de proveedores.",
    budgets: [
      { area: "Diseño y contenido", monthly_limit_usd: 450 },
      { area: "Marketing", monthly_limit_usd: 280 },
      { area: "Estrategia", monthly_limit_usd: 180 },
      { area: "Cuentas", monthly_limit_usd: 150 },
      { area: "Operaciones", monthly_limit_usd: 140 },
    ],
    events: [
      sample("d01", 1, "Diseño y contenido", "Generación de imágenes", "OpenAI", "Images", "image", 117.8, 28, 11, 43),
      sample("d02", 3, "Diseño y contenido", "Generación de video", "Higgsfield", "Video", "video", 158.5, 6, 2, 12),
      sample("d03", 5, "Marketing", "Recomendaciones de marketing", "Anthropic", "Claude", "text", 39.9, 14, 11, 18, 635000, 120000, 360),
      sample("d04", 6, "Cuentas", "Análisis de clientes", "OpenAI", "GPT", "text", 52.2, 12, 10, 13, 860000, 178000, 480),
      sample("d05", 8, "Estrategia", "Benchmark", "Google", "Gemini", "text", 45.7, 9, 7, 11, 710000, 145000, 300),
      sample("d06", 9, "Marketing", "Generación de contenido", "OpenAI", "GPT", "text", 71.8, 46, 32, 60, 980000, 240000, 680),
      sample("d07", 11, "Estrategia", "Discovery", "Anthropic", "Claude", "text", 24.1, 8, 7, 9, 350000, 89000, 240),
      sample("d08", 12, "Diseño y contenido", "Generación de imágenes", "OpenAI", "Images", "image", 91.2, 24, 14, 33),
      sample("d09", 14, "Operaciones", "Automatizaciones", "OpenAI", "GPT", "text", 39.5, 71, 68, 78, 440000, 79000, 930),
      sample("d10", 17, "Diseño y contenido", "Generación de video", "Higgsfield", "Video", "video", 52.0, 3, 1, 5),
      sample("d11", 19, "Marketing", "Recomendaciones de marketing", "Google", "Gemini", "text", 35.2, 10, 9, 12, 390000, 72000, 230),
      sample("d12", 23, "Cuentas", "Análisis de clientes", "Anthropic", "Claude", "text", 27.7, 7, 6, 8, 290000, 69000, 310),
      sample("d13", 27, "Estrategia", "Benchmark", "OpenAI", "GPT", "text", 35.0, 8, 7, 10, 460000, 93000, 280),
      sample("d14", 36, "Diseño y contenido", "Generación de imágenes", "OpenAI", "Images", "image", 75.0, 16, 8, 24),
      sample("d15", 42, "Marketing", "Generación de contenido", "OpenAI", "GPT", "text", 42.0, 23, 18, 25, 320000, 91000, 320),
      sample("d16", 65, "Operaciones", "Automatizaciones", "OpenAI", "GPT", "text", 26.0, 29, 27, 32, 310000, 56000, 410),
    ],
  };
}

