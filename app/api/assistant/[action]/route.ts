import { NextResponse } from "next/server";
import { AssistantInputError, buildPrompt, normalizeResult, validateRequest } from "../../../v2/os/assistant/engine";
import { createProvider, providerStatus, ProviderError } from "../../../v2/os/assistant/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_BODY = 80_000;
const WINDOW_MS = 5 * 60_000;
const MAX_REQUESTS = 20;
/* Límite por proceso; en serverless es orientativo. La autenticación real queda pendiente. */
const hits = new Map<string, number[]>();

function limited(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > MAX_REQUESTS;
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === (request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  } catch {
    return false;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (action !== "status") return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(providerStatus(), { headers: NO_STORE });
}

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (action !== "generate") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403, headers: NO_STORE });
  const provider = createProvider();
  if (!provider) return NextResponse.json({ error: "AI_NOT_CONFIGURED", ...providerStatus() }, { status: 503, headers: NO_STORE });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return NextResponse.json({ error: "RATE_LIMITED", message: "Demasiados pedidos seguidos. Probá en unos minutos." }, { status: 429, headers: NO_STORE });
  const text = await request.text();
  if (text.length > MAX_BODY) return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413, headers: NO_STORE });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST", message: "JSON inválido." }, { status: 400, headers: NO_STORE });
  }
  let validated: ReturnType<typeof validateRequest>;
  try {
    validated = validateRequest(body);
  } catch (error) {
    if (error instanceof AssistantInputError) return NextResponse.json({ error: error.code, message: error.message }, { status: 400, headers: NO_STORE });
    throw error;
  }
  const { request: input, profile } = validated;
  const prompt = buildPrompt(profile, input);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const raw = await provider.generate({ ...prompt, signal: controller.signal });
    const result = normalizeResult(profile, input, raw, { provider: provider.id, model: provider.model, id: () => `SUG-${crypto.randomUUID().slice(0, 8).toUpperCase()}` });
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (error) {
    const message = error instanceof ProviderError ? error.message : controller.signal.aborted ? "El proveedor tardó demasiado en responder." : error instanceof Error ? error.message : "Error desconocido del proveedor.";
    return NextResponse.json({ error: "PROVIDER_ERROR", message }, { status: 502, headers: NO_STORE });
  } finally {
    clearTimeout(timer);
  }
}
