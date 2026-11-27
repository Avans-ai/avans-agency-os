import { NextResponse } from "next/server";
import { presentationReadiness } from "../../../../lib/presentations/readiness";
import { requireApiAuth } from "../../../../lib/auth/session";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const actions = [
  "status",
  "import-template",
  "create-google-slides",
  "export-pptx",
];
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  if (!actions.includes(action))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;
  return NextResponse.json(presentationReadiness(process.env), {
    status: action === "status" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  if (!actions.includes(action) || action === "status")
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;
  return NextResponse.json(
    {
      error: "PRESENTATION_EXPORT_NOT_CONFIGURED",
      ...presentationReadiness(process.env),
    },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
