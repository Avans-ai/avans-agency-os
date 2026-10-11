import { createClient } from "@supabase/supabase-js";
import type { AiModality } from "../app/v2/ai-usage-data";

/**
 * INTERNAL SERVER-ONLY adapter. Do not import into Client Components or expose
 * it in public API routes. orgId must come from an authenticated trusted workflow.
 * Pass provider billing totals or a documented estimate; null is "unknown".
 */
export type UsageCapture = {
  organization_id: string;
  source_event_id: string; // provider request id or internal run + operation key
  provider: string;
  model: string;
  modality: AiModality;
  area: string;
  activity: string;
  user_id?: string | null;
  client_id?: string | null;
  project_id?: string | null;
  agent_run_id?: string | null;
  input_tokens?: number;
  output_tokens?: number;
  provider_units?: number | null;
  provider_unit_name?: string | null;
  attempts?: number;
  units_generated?: number;
  units_approved?: number;
  minutes_saved?: number | null;
  cost_usd: number | null;
  cost_source: "provider" | "estimated";
  occurred_at?: string;
};

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) throw new Error("AI telemetry unavailable: server Supabase configuration missing");
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

function nonNegative(value: number | null | undefined, label: string) {
  if (value === null || value === undefined) return;
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid AI usage ${label}`);
}
function count(value: number | undefined, label: string) {
  nonNegative(value, label);
  if (value !== undefined && !Number.isInteger(value)) throw new Error(`Invalid AI usage ${label}`);
}

export async function recordAiUsage(event: UsageCapture): Promise<string> {
  if (!event.organization_id || !event.source_event_id || !event.provider || !event.model ||
      !event.area || !event.activity || !["text", "image", "video"].includes(event.modality)) {
    throw new Error("Invalid AI usage identity or attribution");
  }
  nonNegative(event.cost_usd, "cost_usd");
  nonNegative(event.provider_units, "provider_units");
  nonNegative(event.minutes_saved, "minutes_saved");
  for (const key of ["input_tokens", "output_tokens", "attempts", "units_generated", "units_approved"] as const) {
    count(event[key], key);
  }
  if ((event.units_approved ?? 0) > (event.units_generated ?? 0)) throw new Error("Approved results exceed generated results");

  const db = adminDb();
  // Captures are insert-once. A late provider retry must not reset human outcomes.
  const { data, error } = await db.from("ai_usage_events").upsert({
    ...event,
    input_tokens: event.input_tokens ?? 0,
    output_tokens: event.output_tokens ?? 0,
    attempts: event.attempts ?? 1,
    units_generated: event.units_generated ?? 0,
    units_approved: event.units_approved ?? 0,
  }, { onConflict: "organization_id,provider,source_event_id", ignoreDuplicates: true }).select("id").maybeSingle();

  if (error) throw new Error(`AI usage capture failed: ${error.message}`);
  if (data?.id) return data.id as string;

  // ON CONFLICT DO NOTHING returns no row. Resolve the existing ID using the
  // complete idempotency key, including organization, without updating it.
  const { data: existing, error: existingError } = await db.from("ai_usage_events")
    .select("id")
    .eq("organization_id", event.organization_id)
    .eq("provider", event.provider)
    .eq("source_event_id", event.source_event_id).single();
  if (existingError || !existing?.id) throw new Error(`AI usage capture failed: ${existingError?.message ?? "missing id"}`);
  return existing.id as string;
}

/** Update quality only after human validation; do not award approval at generation time. */
export async function recordAiUsageOutcome(args: {
  organization_id: string;
  usage_event_id: string;
  approved: number;
  minutes_saved?: number | null;
}): Promise<void> {
  count(args.approved, "approved");
  nonNegative(args.minutes_saved, "minutes_saved");
  const { data: event, error: readError } = await adminDb().from("ai_usage_events")
    .select("units_generated")
    .eq("organization_id", args.organization_id).eq("id", args.usage_event_id).single();
  if (readError || !event) throw new Error("AI usage event not found");
  if (args.approved > event.units_generated) throw new Error("Approved results exceed generated results");
  const { error } = await adminDb().from("ai_usage_events")
    .update({
      units_approved: args.approved,
      ...(args.minutes_saved !== undefined ? { minutes_saved: args.minutes_saved } : {}),
    })
    .eq("organization_id", args.organization_id).eq("id", args.usage_event_id);
  if (error) throw new Error(`AI usage outcome failed: ${error.message}`);
}

