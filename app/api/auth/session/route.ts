/* Identidad de la sesión para la interfaz (rol real del servidor). En la preview
 * responde mode=preview sin identidad. Nunca devuelve tokens. */
import { NextResponse } from "next/server";
import { authMode } from "../../../../lib/auth/config";
import { getShellIdentity } from "../../../../lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const mode = authMode();
  const identity = mode === "required" ? await getShellIdentity() : null;
  return NextResponse.json({ mode, identity }, { headers: { "Cache-Control": "private, no-store" } });
}
