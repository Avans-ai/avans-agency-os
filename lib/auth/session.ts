import "server-only";
/* Sesión del servidor. Nunca confía en el rol guardado en localStorage, en
 * parámetros de URL ni en cookies propias: identidad = auth.getUser() (valida el
 * JWT contra Supabase Auth) y alcance = filas visibles por RLS para ese usuario. */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../supabase/server";
import { authMode, isInternalEmail } from "./config";
import { interfaceRoleFor, isMemberRole, MEMBER_ROLE_LABELS } from "./roles";
import { primaryRole, type AuthContext } from "./authorize";
import type { PreviewRole } from "../../app/v2/os/preview-roles";

export async function getAuthContext(): Promise<AuthContext | null> {
  if (authMode() !== "required") return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;
  const user = data.user;

  const [members, assignments, profile] = await Promise.all([
    supabase.from("organization_members").select("organization_id, role").eq("user_id", user.id),
    supabase.from("client_assignments").select("organization_id, client_id, service_id, can_manage, can_edit, active").eq("user_id", user.id),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  // Si la base no responde, la sesión no tiene alcance (falla cerrado).
  if (members.error || assignments.error) {
    return { userId: user.id, email: user.email!, name: null, memberships: [], assignments: [] };
  }
  return {
    userId: user.id,
    email: user.email!.toLowerCase(),
    name: (profile.data?.full_name as string | null | undefined) ?? null,
    memberships: (members.data ?? [])
      .filter((row) => isMemberRole(row.role))
      .map((row) => ({ organizationId: String(row.organization_id), role: row.role })),
    assignments: (assignments.data ?? []).map((row) => ({
      organizationId: String(row.organization_id),
      clientId: String(row.client_id),
      serviceId: (row.service_id as string | null) ?? null,
      canManage: Boolean(row.can_manage),
      canEdit: Boolean(row.can_edit),
      active: Boolean(row.active),
    })),
  };
}

export type ShellIdentity = {
  email: string;
  name: string;
  initials: string;
  roleLabel: string;
  interfaceRole: PreviewRole;
  internal: boolean;
};

/** Identidad para la interfaz. null en modo preview (no toca cookies: la preview sigue estática). */
export async function getShellIdentity(): Promise<ShellIdentity | null> {
  if (authMode() !== "required") return null;
  const ctx = await getAuthContext();
  if (!ctx) return null;
  const role = primaryRole(ctx);
  const name = ctx.name?.trim() || ctx.email.split("@")[0];
  const initials = name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join("") || "?";
  return {
    email: ctx.email,
    name,
    initials,
    roleLabel: role ? MEMBER_ROLE_LABELS[role] : "Sin organización asignada",
    // Sin membresía: la vista más restringida (la RLS no le devuelve datos de todos modos).
    interfaceRole: role ? interfaceRoleFor(role) : "client",
    internal: isInternalEmail(ctx.email),
  };
}

type ApiAuth =
  | { ok: true; mode: "preview"; ctx: null }
  | { ok: true; mode: "required"; ctx: AuthContext }
  | { ok: false; response: NextResponse };

const NO_STORE = { "Cache-Control": "no-store" };

/** Guardia para rutas API. En preview deja pasar (comportamiento previo); con
 * autenticación exige sesión y membresía; mal configurado responde 503. */
export async function requireApiAuth(): Promise<ApiAuth> {
  const mode = authMode();
  if (mode === "preview") return { ok: true, mode, ctx: null };
  if (mode === "misconfigured") {
    return { ok: false, response: NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503, headers: NO_STORE }) };
  }
  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, response: NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401, headers: NO_STORE }) };
  if (!ctx.memberships.length) return { ok: false, response: NextResponse.json({ error: "NO_MEMBERSHIP" }, { status: 403, headers: NO_STORE }) };
  return { ok: true, mode, ctx };
}

/** Mutaciones solo desde el mismo origen (defensa CSRF además de SameSite). */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === (request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  } catch {
    return false;
  }
}
