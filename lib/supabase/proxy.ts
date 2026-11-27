/* Refresco de sesión para proxy.ts (patrón de @supabase/ssr): lee las cookies del
 * request, deja que Supabase rote los tokens y copia las cookies nuevas a la respuesta. */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requireSupabasePublicConfig } from "./config";

export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = requireSupabasePublicConfig();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // getUser() valida el token con Supabase Auth (getSession() no alcanza en el servidor).
  const { data } = await supabase.auth.getUser();
  const hadSession = request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));
  return { response, user: data.user ?? null, hadSession };
}
