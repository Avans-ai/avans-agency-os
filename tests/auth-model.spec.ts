import { test, expect } from "@playwright/test";
import { authMode, isInternalEmail, isPublicPath, LOGIN_MESSAGES } from "../lib/auth/config";
import { interfaceRoleFor, isMemberRole, MEMBER_ROLES } from "../lib/auth/roles";
import { canEditService, canManageClient, canReadClient, canReadService, primaryRole, type AuthContext } from "../lib/auth/authorize";

/* Autenticación y autorización del servidor (modelo puro). La RLS de Postgres se
 * prueba aparte con scripts/db/test-rls.sh; estos casos deben coincidir con ella. */

const SUPABASE = { NEXT_PUBLIC_SUPABASE_URL: "https://proyecto.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x" };

test("auth mode: preview unless explicitly required; misconfigured fails closed", () => {
  expect(authMode({})).toBe("preview");
  expect(authMode({ ...SUPABASE })).toBe("preview");
  expect(authMode({ AVANS_AUTH_REQUIRED: "true", ...SUPABASE })).toBe("required");
  expect(authMode({ AVANS_AUTH_REQUIRED: "TRUE ", ...SUPABASE })).toBe("required");
  expect(authMode({ AVANS_AUTH_REQUIRED: "true" })).toBe("misconfigured");
  expect(authMode({ AVANS_AUTH_REQUIRED: "true", NEXT_PUBLIC_SUPABASE_URL: "http://inseguro", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "x" })).toBe("misconfigured");
  expect(authMode({ AVANS_AUTH_REQUIRED: "1", ...SUPABASE })).toBe("preview");
  expect(authMode({ AVANS_AUTH_REQUIRED: "true", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_ANON_KEY: "local" })).toBe("required");
  expect(authMode({ AVANS_AUTH_REQUIRED: "true", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1.evil.com", NEXT_PUBLIC_SUPABASE_ANON_KEY: "x" })).toBe("misconfigured");
});

test("internal email domain is matched exactly", () => {
  for (const ok of ["ana@avans.agency", "Ana.Perez@AVANS.agency", " x@avans.agency "]) expect(isInternalEmail(ok)).toBe(true);
  for (const bad of [null, undefined, "", "ana@gmail.com", "ana@avans.agency.evil.com", "ana@sub.avans.agency", "avans.agency@gmail.com", "@avans.agency", "ana@avansagency"]) expect(isInternalEmail(bad)).toBe(false);
});

test("only login, auth callbacks, health, cron and the signed webhook skip the session check", () => {
  for (const open of ["/ingresar", "/auth/callback", "/auth/login", "/api/health/persistence", "/api/cron/archive-tasks", "/api/integrations/google/webhook"]) expect(isPublicPath(open)).toBe(true);
  for (const closed of ["/", "/v2", "/v2/clientes/aca", "/api/assistant/generate", "/api/integrations/google/status", "/api/presentations/status", "/ingresarx", "/authx", "/api/health"]) expect(isPublicPath(closed)).toBe(false);
  expect(Object.keys(LOGIN_MESSAGES)).toEqual(expect.arrayContaining(["dominio", "sesion-expirada", "salida", "no-configurado"]));
});

test("every real role maps to an interface view, and unknown roles are rejected", () => {
  expect(MEMBER_ROLES).toEqual(expect.arrayContaining(["admin", "socio", "gerencia", "project_manager", "content_manager", "designer", "lider_tecnico", "cliente", "proveedor_externo"]));
  expect(interfaceRoleFor("socio")).toBe("admin");
  expect(interfaceRoleFor("gerencia")).toBe("admin");
  expect(interfaceRoleFor("lider_tecnico")).toBe("technical");
  expect(interfaceRoleFor("cliente")).toBe("client");
  expect(interfaceRoleFor("proveedor_externo")).toBe("provider");
  expect(interfaceRoleFor("viewer")).toBe("operativo");
  expect(isMemberRole("admin")).toBe(true);
  for (const bad of ["Admin", "pm", "", null, 3]) expect(isMemberRole(bad)).toBe(false);
});

const ORG = "org-a";
const OTHER = "org-b";
function ctx(memberships: AuthContext["memberships"], assignments: Partial<AuthContext["assignments"][number]>[] = []): AuthContext {
  return {
    userId: "u", email: "u@avans.agency", name: null, memberships,
    assignments: assignments.map((a) => ({ organizationId: ORG, clientId: "aca", serviceId: null, canManage: false, canEdit: true, active: true, ...a })),
  };
}

test("leadership sees and manages every client of its own organization only", () => {
  for (const role of ["admin", "socio", "gerencia"] as const) {
    const c = ctx([{ organizationId: ORG, role }]);
    expect(canReadClient(c, ORG, "epsa")).toBe(true);
    expect(canManageClient(c, ORG, "epsa")).toBe(true);
    expect(canReadClient(c, OTHER, "ajeno")).toBe(false);
  }
});

test("internal team: only assigned clients, and a module assignment limits to that module", () => {
  const pm = ctx([{ organizationId: ORG, role: "project_manager" }], [{ clientId: "aca", canManage: true }]);
  expect(canReadClient(pm, ORG, "aca")).toBe(true);
  expect(canManageClient(pm, ORG, "aca")).toBe(true);
  expect(canReadClient(pm, ORG, "epsa")).toBe(false);
  expect(canEditService(pm, ORG, "epsa", "contenidos")).toBe(false);

  const designer = ctx([{ organizationId: ORG, role: "designer" }], [{ clientId: "aca", serviceId: "diseno-marca" }]);
  expect(canReadService(designer, ORG, "aca", "diseno-marca")).toBe(true);
  expect(canReadService(designer, ORG, "aca", "contenidos")).toBe(false);
  expect(canReadService(designer, ORG, "aca", null)).toBe(false);
  expect(canEditService(designer, ORG, "aca", " diseno-marca ")).toBe(true);
  expect(canManageClient(designer, ORG, "aca")).toBe(false);

  const inactive = ctx([{ organizationId: ORG, role: "designer" }], [{ clientId: "aca", active: false }]);
  expect(canReadClient(inactive, ORG, "aca")).toBe(false);
  const noMembership = ctx([], [{ clientId: "aca" }]);
  expect(canReadClient(noMembership, ORG, "aca")).toBe(false);
});

test("external roles: client reads its account but never edits; provider edits only its module", () => {
  const client = ctx([{ organizationId: ORG, role: "cliente" }], [{ clientId: "aca", canEdit: true, canManage: true }]);
  expect(canReadClient(client, ORG, "aca")).toBe(true);
  expect(canEditService(client, ORG, "aca", "contenidos")).toBe(false);
  expect(canManageClient(client, ORG, "aca")).toBe(false);
  const provider = ctx([{ organizationId: ORG, role: "proveedor_externo" }], [{ clientId: "aca", serviceId: "audiovisuales", canManage: true }]);
  expect(canEditService(provider, ORG, "aca", "audiovisuales")).toBe(true);
  expect(canEditService(provider, ORG, "aca", "contenidos")).toBe(false);
  expect(canManageClient(provider, ORG, "aca")).toBe(false);
  expect(canReadClient(provider, ORG, "epsa")).toBe(false);
});

test("primary role picks the widest membership", () => {
  expect(primaryRole(ctx([{ organizationId: OTHER, role: "cliente" }, { organizationId: ORG, role: "socio" }]))).toBe("socio");
  expect(primaryRole(ctx([]))).toBeNull();
});
