/* Roles de la plataforma (espejo del enum public.member_role). Pura: sin Next ni Supabase. */
import type { PreviewRole } from "../../app/v2/os/preview-roles";

export const MEMBER_ROLES = [
  "admin", "socio", "gerencia", "project_manager", "content_manager", "designer", "lider_tecnico",
  "cliente", "proveedor_externo",
  // Valores heredados del esquema inicial: se conservan, sin alta nueva.
  "comercial", "trafficker", "finance", "viewer",
] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  admin: "Administrador",
  socio: "Socio",
  gerencia: "Gerencia",
  project_manager: "Project Manager",
  content_manager: "Content Manager",
  designer: "Diseñador",
  lider_tecnico: "Líder técnico",
  cliente: "Cliente",
  proveedor_externo: "Proveedor externo",
  comercial: "Comercial",
  trafficker: "Trafficker",
  finance: "Finanzas",
  viewer: "Solo lectura",
};

export function isMemberRole(value: unknown): value is MemberRole {
  return typeof value === "string" && (MEMBER_ROLES as readonly string[]).includes(value);
}

export const LEADERSHIP_ROLES: readonly MemberRole[] = ["admin", "socio", "gerencia"];
export const EXTERNAL_ROLES: readonly MemberRole[] = ["cliente", "proveedor_externo"];

export function isLeadership(role: MemberRole) {
  return LEADERSHIP_ROLES.includes(role);
}
export function isExternal(role: MemberRole) {
  return EXTERNAL_ROLES.includes(role);
}

/** Vista de la interfaz que corresponde a un rol real. Solo decide qué se muestra:
 * los permisos efectivos los aplica la base de datos (RLS). */
export function interfaceRoleFor(role: MemberRole): PreviewRole {
  switch (role) {
    case "admin":
    case "socio":
    case "gerencia":
      return "admin";
    case "project_manager":
      return "pm";
    case "content_manager":
      return "content";
    case "designer":
      return "designer";
    case "lider_tecnico":
      return "technical";
    case "proveedor_externo":
      return "provider";
    case "cliente":
      return "client";
    default:
      return "operativo";
  }
}
