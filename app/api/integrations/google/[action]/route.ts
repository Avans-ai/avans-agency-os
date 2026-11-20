import { NextResponse } from "next/server";
import { googleReadiness } from "../../../../../lib/google-workspace/readiness";
import { verifyPubSubAuthorization } from "../../../../../lib/google-workspace/webhook";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const actions = [
  "status",
  "oauth-start",
  "oauth-callback",
  "disconnect",
  "subscriptions",
  "renew",
  "sync",
  "webhook",
];
function disabled() {
  return NextResponse.json(
    { error: "GOOGLE_WORKSPACE_NOT_READY", ...googleReadiness(process.env) },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
/** Deliberately fail closed until server identity, encrypted repository and
 * migration are enabled together. Preview role selectors are NEVER credentials.
 * Adapters and orchestration are testable independently with injected stores. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ action: string }> },
) {
  const { action } = await context.params;
  if (!actions.includes(action))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (action === "status")
    return NextResponse.json(googleReadiness(process.env), {
      headers: { "Cache-Control": "no-store" },
    });
  return disabled();
}
export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  const { action } = await context.params;
  if (!actions.includes(action))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (action === "webhook") {
    try {
      await verifyPubSubAuthorization(
        request.headers.get("authorization"),
        process.env.GOOGLE_PUBSUB_AUDIENCE ?? "",
        process.env.GOOGLE_PUBSUB_SERVICE_ACCOUNT_EMAIL ?? "",
      );
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    } // Do not ACK an event before durable ingestion is enabled.
    return disabled();
  }
  return disabled();
}
