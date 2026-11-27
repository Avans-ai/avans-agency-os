/* Inicio de ingreso con Google (POST desde /ingresar). El verificador PKCE queda en
 * cookie del servidor; el token de Google nunca pasa por el navegador de la app. */
import { NextResponse, type NextRequest } from "next/server";
import { ALLOWED_EMAIL_DOMAIN, authMode } from "../../../lib/auth/config";
import { isSameOrigin } from "../../../lib/auth/session";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { safeReturnPath } from "../../v2/os/navigation/return-path";

export const dynamic = "force-dynamic";

function back(request: NextRequest, error: string) {
  return NextResponse.redirect(new URL(`/ingresar?error=${error}`, request.url), 303);
}

export async function POST(request: NextRequest) {
  if (authMode() !== "required") return back(request, "no-configurado");
  if (!isSameOrigin(request)) return back(request, "callback");
  const form = await request.formData();
  const next = safeReturnPath(String(form.get("volver") ?? "")) ?? "/v2";
  const external = form.get("tipo") === "invitado";
  const callback = new URL("/auth/callback", request.url);
  callback.searchParams.set("volver", next);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback.toString(),
      skipBrowserRedirect: true,
      // hd solo filtra el selector de cuentas de Google: la restricción real está en
      // el trigger de auth.users y en /auth/callback.
      queryParams: external ? { prompt: "select_account" } : { hd: ALLOWED_EMAIL_DOMAIN, prompt: "select_account" },
    },
  });
  if (error || !data.url) return back(request, "callback");
  return NextResponse.redirect(data.url, 303);
}
