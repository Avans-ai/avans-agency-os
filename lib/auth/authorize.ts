/* Autorización del servidor (espejo de las funciones private.* de la migración
 * 20261127190100). Sirve para cortar temprano en rutas API y para decidir la
 * interfaz; la decisión final siempre la toma la RLS de Postgres. Pura y testeable. */
import { isExternal, isLeadership, type MemberRole } from "./roles";

export type Membership = { organizationId: string; role: MemberRole };
export type Assignment = {
  organizationId: string;
  clientId: string;
  serviceId: string | null;
  canManage: boolean;
  canEdit: boolean;
  active: boolean;
};
export type AuthContext = {
  userId: string;
  email: string;
  name: string | null;
  memberships: Membership[];
  assignments: Assignment[];
};

const normalizeService = (serviceId: string | null | undefined) => serviceId?.trim() || null;

export function roleIn(ctx: AuthContext, organizationId: string): MemberRole | null {
  return ctx.memberships.find((m) => m.organizationId === organizationId)?.role ?? null;
}

function activeAssignments(ctx: AuthContext, organizationId: string, clientId: string) {
  return ctx.assignments.filter((a) => a.active && a.organizationId === organizationId && a.clientId === clientId);
}

export function canReadClient(ctx: AuthContext, organizationId: string, clientId: string) {
  const role = roleIn(ctx, organizationId);
  if (!role) return false;
  return isLeadership(role) || activeAssignments(ctx, organizationId, clientId).length > 0;
}

export function canReadService(ctx: AuthContext, organizationId: string, clientId: string, serviceId: string | null) {
  const role = roleIn(ctx, organizationId);
  if (!role) return false;
  if (isLeadership(role)) return true;
  const target = normalizeService(serviceId);
  return activeAssignments(ctx, organizationId, clientId).some((a) => a.serviceId === null || a.serviceId === target);
}

export function canManageClient(ctx: AuthContext, organizationId: string, clientId: string) {
  const role = roleIn(ctx, organizationId);
  if (!role) return false;
  if (isLeadership(role)) return true;
  return !isExternal(role) && activeAssignments(ctx, organizationId, clientId).some((a) => a.canManage);
}

export function canEditService(ctx: AuthContext, organizationId: string, clientId: string, serviceId: string | null) {
  const role = roleIn(ctx, organizationId);
  if (!role) return false;
  if (isLeadership(role)) return true;
  if (role === "cliente") return false;
  const target = normalizeService(serviceId);
  return activeAssignments(ctx, organizationId, clientId).some((a) => a.canEdit && (a.serviceId === null || a.serviceId === target));
}

/** Rol principal para la interfaz: el de mayor alcance entre las membresías. */
export function primaryRole(ctx: AuthContext): MemberRole | null {
  const order: MemberRole[] = ["admin", "socio", "gerencia", "project_manager", "lider_tecnico", "content_manager", "designer", "comercial", "trafficker", "finance", "viewer", "proveedor_externo", "cliente"];
  const roles = ctx.memberships.map((m) => m.role);
  return order.find((role) => roles.includes(role)) ?? null;
}
