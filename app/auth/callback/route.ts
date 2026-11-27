/* Vuelta de Google. Canjea el código, valida la identidad en el servidor y
 * rechaza cuentas fuera de @avans.agency sin membresía (invitación). */
import { NextResponse, type NextRequest } from "next/server";
import { authMode, isInternalEmail } from "../../../lib/auth/config";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { safeReturnPath } from "../../v2/os/navigation/return-path";

export const dynamic = "force-dynamic";

function toLogin(request: NextRequest, error: string) {
  return NextResponse.redirect(new URL(`/ingresar?error=${error}`, request.url), 303);
}

export async function GET(request: NextRequest) {
  if (authMode() !== "required") return toLogin(request, "no-configurado");
  const params = request.nextUrl.searchParams;
  // El trigger de alta rechaza dominios no permitidos: Supabase vuelve con error.
  if (params.get("error")) return toLogin(request, /database error|signup/i.test(params.get("error_description") ?? "") ? "dominio" : "callback");
  const code = params.get("code");
  if (!code) return toLogin(request, "callback");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return toLogin(request, "callback");
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!data.user || !email) return toLogin(request, "callback");

  if (!isInternalEmail(email)) {
    const { count } = await supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("user_id", data.user.id);
    if (!count) {
      await supabase.auth.signOut();
      return toLogin(request, "dominio");
    }
  }
  return NextResponse.redirect(new URL(safeReturnPath(params.get("volver")) ?? "/v2", request.url), 303);
}
