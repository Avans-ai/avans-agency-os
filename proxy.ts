/* Protección de rutas (Next 16: proxy.ts reemplaza a middleware.ts).
 * - Modo preview: no interviene.
 * - Autenticación requerida: refresca la sesión y exige usuario en /v2, /api y el resto
 *   de las páginas; las rutas públicas tienen su propia protección.
 * - Mal configurado: 503 (falla cerrado).
 * La autorización por cliente/módulo NO se decide acá: la aplican la RLS y cada ruta. */
import { NextResponse, type NextRequest } from "next/server";
import { authMode, isPublicPath } from "./lib/auth/config";
import { updateSession } from "./lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const mode = authMode();
  if (mode === "preview") return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  if (mode === "misconfigured") {
    if (isPublicPath(pathname) && !pathname.startsWith("/auth/")) return NextResponse.next();
    if (isApi) return NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    const target = request.nextUrl.clone();
    target.pathname = "/ingresar";
    target.search = "?error=no-configurado";
    return NextResponse.redirect(target);
  }

  if (isPublicPath(pathname)) return NextResponse.next();

  const { response, user, hadSession } = await updateSession(request);
  if (user) {
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  if (isApi) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const target = request.nextUrl.clone();
  target.pathname = "/ingresar";
  target.search = "";
  target.searchParams.set("volver", `${pathname}${search}`);
  if (hadSession) target.searchParams.set("motivo", "sesion-expirada");
  return NextResponse.redirect(target);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|pdf|pptx|mjs|map)$).*)"],
};
