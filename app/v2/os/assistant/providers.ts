/* Proveedores de IA del asistente (solo servidor: lee variables de entorno y
 * nunca se importa desde componentes cliente). Adaptador común para varios
 * motores; la salida siempre es estructurada y luego se valida con zod.
 *
 * Activación explícita: además de la clave del proveedor hace falta
 * AI_ASSISTANT_ENABLED=true. Cargar una clave por otra razón no activa nada.
 *   AI_PROVIDER = "openai" | "anthropic" (si falta, se usa el que tenga clave)
 *   OPENAI_API_KEY / ANTHROPIC_API_KEY
 *   AI_MODEL (obligatorio para OpenAI; opcional para Anthropic) */
import { RAW_RESULT_JSON_SCHEMA, type AssistantStatus } from "./types";

export type StructuredRequest = { system: string; user: string; signal?: AbortSignal };
export type AssistantProvider = {
  id: "openai" | "anthropic";
  model: string;
  generate(request: StructuredRequest): Promise<unknown>;
};

export class ProviderError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

type Env = Record<string, string | undefined>;
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5-5";

export function providerStatus(env: Env = process.env): AssistantStatus {
  if (env.AI_ASSISTANT_ENABLED !== "true")
    return { configured: false, provider: null, model: null, reason: "El asistente no está habilitado en este entorno (falta AI_ASSISTANT_ENABLED=true)." };
  const preferred = env.AI_PROVIDER?.trim().toLowerCase();
  const hasOpenAI = Boolean(env.OPENAI_API_KEY?.trim());
  const hasAnthropic = Boolean(env.ANTHROPIC_API_KEY?.trim());
  const id = preferred === "openai" || preferred === "anthropic" ? preferred : hasAnthropic ? "anthropic" : hasOpenAI ? "openai" : null;
  if (!id) return { configured: false, provider: null, model: null, reason: "No hay un proveedor de IA con credenciales en el servidor." };
  if (id === "openai" && !hasOpenAI) return { configured: false, provider: "openai", model: null, reason: "Falta OPENAI_API_KEY en el servidor." };
  if (id === "anthropic" && !hasAnthropic) return { configured: false, provider: "anthropic", model: null, reason: "Falta ANTHROPIC_API_KEY en el servidor." };
  const model = env.AI_MODEL?.trim() || (id === "anthropic" ? DEFAULT_ANTHROPIC_MODEL : "");
  if (!model) return { configured: false, provider: id, model: null, reason: "Falta AI_MODEL para el proveedor configurado." };
  return { configured: true, provider: id, model, reason: "" };
}

export function createProvider(env: Env = process.env, fetcher: typeof fetch = fetch): AssistantProvider | null {
  const status = providerStatus(env);
  if (!status.configured || !status.provider || !status.model) return null;
  const model = status.model;
  if (status.provider === "openai") {
    const key = env.OPENAI_API_KEY!.trim();
    return {
      id: "openai",
      model,
      async generate({ system, user, signal }) {
        const response = await fetcher("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          signal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            response_format: { type: "json_schema", json_schema: { name: "creative_suggestions", strict: true, schema: RAW_RESULT_JSON_SCHEMA } },
          }),
        });
        if (!response.ok) throw new ProviderError(`El proveedor respondió ${response.status}.`, response.status);
        const data = (await response.json()) as { choices?: { message?: { content?: string; refusal?: string } }[] };
        const message = data.choices?.[0]?.message;
        if (!message?.content) throw new ProviderError(message?.refusal ? "El proveedor rechazó el pedido." : "El proveedor no devolvió contenido.");
        try {
          return JSON.parse(message.content);
        } catch {
          throw new ProviderError("El proveedor devolvió un JSON inválido.");
        }
      },
    };
  }
  const key = env.ANTHROPIC_API_KEY!.trim();
  return {
    id: "anthropic",
    model,
    async generate({ system, user, signal }) {
      const response = await fetcher("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model,
          max_tokens: 4000,
          system,
          messages: [{ role: "user", content: user }],
          tools: [{ name: "submit_suggestions", description: "Entrega las sugerencias estructuradas.", input_schema: RAW_RESULT_JSON_SCHEMA }],
          tool_choice: { type: "tool", name: "submit_suggestions" },
        }),
      });
      if (!response.ok) throw new ProviderError(`El proveedor respondió ${response.status}.`, response.status);
      const data = (await response.json()) as { content?: { type: string; name?: string; input?: unknown }[] };
      const block = data.content?.find((item) => item.type === "tool_use" && item.name === "submit_suggestions");
      if (!block) throw new ProviderError("El proveedor no devolvió la salida estructurada.");
      return block.input;
    },
  };
}
