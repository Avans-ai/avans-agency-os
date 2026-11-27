/* Modo de autenticación de Avans OS. Sin dependencias de Next: se usa en proxy,
 * rutas, layout y pruebas de dominio.
 *
 *  - preview:       AVANS_AUTH_REQUIRED no es "true". La preview funciona como hasta
 *                   ahora (sin sesión, datos de demostración en el navegador).
 *  - required:      AVANS_AUTH_REQUIRED=true y Supabase configurado. Todo /v2 y /api
 *                   exige sesión válida; la autorización real la resuelve la RLS.
 *  - misconfigured: se pidió autenticación pero faltan variables. Falla cerrado
 *                   (503): nunca deja la aplicación abierta por error. */
export const ALLOWED_EMAIL_DOMAIN = "avans.agency";

export type AuthMode = "preview" | "required" | "misconfigured";
type Env = Record<string, string | undefined>;

export function authMode(env: Env = process.env): AuthMode {
  if (env.AVANS_AUTH_REQUIRED?.trim().toLowerCase() !== "true") return "preview";
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
  return url && key && isSecureSupabaseUrl(url) ? "required" : "misconfigured";
}

/** https siempre; http solo para un Supabase local (CLI o pruebas). */
function isSecureSupabaseUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:") return true;
    return parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

/** Correo del dominio interno (comparación exacta del dominio, sin subdominios ni sufijos). */
export function isInternalEmail(email: string | null | undefined) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  return at > 0 && normalized.slice(at + 1) === ALLOWED_EMAIL_DOMAIN;
}

/** Rutas que no exigen sesión (cada una tiene su propia protección). */
export function isPublicPath(pathname: string) {
  return (
    pathname === "/ingresar" ||
    pathname.startsWith("/auth/") ||
    pathname === "/api/health/persistence" ||
    pathname.startsWith("/api/cron/") || // Bearer CRON_SECRET
    pathname === "/api/integrations/google/webhook" // autenticación de Pub/Sub
  );
}

/** Mensajes de la pantalla de ingreso (claves controladas, nunca texto del proveedor). */
export const LOGIN_MESSAGES: Record<string, string> = {
  dominio: "Solo pueden ingresar cuentas @avans.agency o personas invitadas por el equipo.",
  callback: "No pudimos completar el ingreso con Google. Probá de nuevo.",
  "sesion-expirada": "Tu sesión venció. Volvé a ingresar para continuar.",
  salida: "Cerraste la sesión.",
  "sin-acceso": "Tu cuenta todavía no tiene una organización asignada. Pedile acceso a un administrador.",
  "no-configurado": "La autenticación no está configurada en este entorno.",
};
