/* Cierre de sesión (POST del mismo origen). Revoca la sesión en Supabase y borra cookies. */
import { NextResponse, type NextRequest } from "next/server";
import { authMode } from "../../../lib/auth/config";
import { isSameOrigin } from "../../../lib/auth/session";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (authMode() === "required" && isSameOrigin(request)) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/ingresar?motivo=salida", request.url), 303);
}
