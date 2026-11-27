import { test, expect, type BrowserContext } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

/* Modo con autenticación obligatoria, sin tocar Supabase real: un stub local de
 * Supabase Auth/REST responde como el servicio y dos servidores Next usan el mismo
 * build con distintas variables (configurado / mal configurado). */

const BASE_PORT = Number(process.env.PLAYWRIGHT_PORT ?? process.env.E2E_PORT ?? 3000);
const REQUIRED_PORT = BASE_PORT + 21;
const MISCONFIGURED_PORT = BASE_PORT + 22;
const REQUIRED = `http://localhost:${REQUIRED_PORT}`;
const MISCONFIGURED = `http://localhost:${MISCONFIGURED_PORT}`;
const VALID_TOKEN = "token-valido-de-prueba";
const USER = { id: "11111111-0000-0000-0000-000000000002", aud: "authenticated", role: "authenticated", email: "ana@avans.agency", app_metadata: { provider: "google" }, user_metadata: {}, created_at: "2026-11-01T00:00:00Z" };

let stub: Server;
let stubUrl = "";
const servers: ChildProcess[] = [];
const stubCalls: string[] = [];

function startNext(port: number, env: Record<string, string>) {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
    cwd: process.cwd(),
    env: { ...process.env, ...env, NODE_ENV: "production" },
    stdio: "ignore",
  });
  servers.push(child);
}

async function waitFor(url: string) {
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500 || response.status === 503) return;
    } catch {
      /* todavía no levantó */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No levantó ${url}`);
}

function sessionCookie(accessToken: string) {
  const session = { access_token: accessToken, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "refresh-de-prueba", user: USER };
  return { name: "sb-127-auth-token", value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`, url: REQUIRED };
}

async function signIn(context: BrowserContext, token = VALID_TOKEN) {
  await context.addCookies([sessionCookie(token)]);
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  stub = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://stub");
    const bearer = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    stubCalls.push(`${request.method} ${url.pathname}`);
    const json = (status: number, body: unknown) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(body));
    };
    if (url.pathname === "/auth/v1/user") return bearer === VALID_TOKEN ? json(200, USER) : json(401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
    if (url.pathname === "/auth/v1/token") return json(400, { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token" });
    if (url.pathname === "/auth/v1/logout") { response.writeHead(204); return response.end(); }
    const authorized = bearer === VALID_TOKEN;
    if (url.pathname === "/rest/v1/organization_members") return json(200, authorized ? [{ organization_id: "org-a", role: "socio" }] : []);
    if (url.pathname === "/rest/v1/client_assignments") return json(200, []);
    if (url.pathname === "/rest/v1/profiles") {
      const single = String(request.headers.accept ?? "").includes("vnd.pgrst.object");
      return authorized ? json(200, single ? { full_name: "Ana Pérez" } : [{ full_name: "Ana Pérez" }]) : json(single ? 406 : 200, single ? { code: "PGRST116" } : []);
    }
    json(404, { error: "stub: ruta no simulada" });
  });
  await new Promise<void>((resolve) => stub.listen(0, "127.0.0.1", resolve));
  stubUrl = `http://127.0.0.1:${(stub.address() as AddressInfo).port}`;
  startNext(REQUIRED_PORT, { AVANS_AUTH_REQUIRED: "true", NEXT_PUBLIC_SUPABASE_URL: stubUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: "clave-publica-de-prueba" });
  startNext(MISCONFIGURED_PORT, { AVANS_AUTH_REQUIRED: "true", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" });
  await Promise.all([waitFor(`${REQUIRED}/ingresar`), waitFor(`${MISCONFIGURED}/ingresar`)]);
});

test.afterAll(async () => {
  servers.forEach((child) => child.kill("SIGTERM"));
  await new Promise<void>((resolve) => stub.close(() => resolve()));
});

test("without a session every page and API is closed, keeping the requested destination", async ({ page, request }) => {
  await page.goto(`${REQUIRED}/v2/clientes/aca?view=plan`);
  await expect(page).toHaveURL(`${REQUIRED}/ingresar?volver=%2Fv2%2Fclientes%2Faca%3Fview%3Dplan`);
  await expect(page.getByRole("heading", { name: "Ingresar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ingresar con Google (@avans.agency)" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Soy cliente o proveedor invitado" })).toBeVisible();
  for (const path of ["/", "/v2", "/v2/configuracion"]) {
    const response = await request.get(`${REQUIRED}${path}`, { maxRedirects: 0 });
    expect(response.status(), path).toBe(307);
    expect(response.headers().location, path).toContain("/ingresar?volver=");
  }
  for (const path of ["/api/assistant/status", "/api/auth/session", "/api/presentations/status", "/api/integrations/google/status"]) {
    const response = await request.get(`${REQUIRED}${path}`);
    expect(response.status(), path).toBe(401);
  }
  const health = await request.get(`${REQUIRED}/api/health/persistence`);
  expect((await health.json()).authMode).toBe("required");
});

test("an expired or forged session is rejected with a clear message", async ({ page, context }) => {
  await signIn(context, "token-vencido-o-falso");
  await page.goto(`${REQUIRED}/v2/mis-tareas`);
  await expect(page).toHaveURL(/\/ingresar\?volver=%2Fv2%2Fmis-tareas&motivo=sesion-expirada/);
  await expect(page.getByRole("main").getByRole("status")).toHaveText("Tu sesión venció. Volvé a ingresar para continuar.");
});

test("a valid session shows the real identity; the role cannot be simulated from localStorage", async ({ page, context, request }) => {
  await signIn(context);
  // Intento de manipular el rol guardado en el navegador antes de cargar la app.
  await page.addInitScript(() => {
    localStorage.setItem("avans-os:preview:v1:workspace", JSON.stringify({ version: 1, value: { role: "client" }, savedAt: new Date().toISOString() }));
  });
  await page.goto(`${REQUIRED}/v2`);
  const profile = page.getByRole("button", { name: "Perfil: Ana Pérez, Socio" });
  await expect(profile).toBeVisible();
  await profile.click();
  await expect(page.getByRole("dialog", { name: "Perfil y sesión" })).toContainText("ana@avans.agency");
  await expect(page.getByRole("group", { name: "Rol simulado" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
  // La vista corresponde al rol real (Socio → dirección), no al «client» guardado.
  await expect(page.getByText("Espacio del cliente")).toHaveCount(0);

  await page.goto(`${REQUIRED}/v2/configuracion`);
  await expect(page.getByText("Tu acceso")).toBeVisible();
  await expect(page.getByText("ana@avans.agency · Socio")).toBeVisible();

  const session = await page.request.get(`${REQUIRED}/api/auth/session`);
  expect(session.status()).toBe(200);
  const body = await session.json();
  expect(body).toMatchObject({ mode: "required", identity: { email: "ana@avans.agency", roleLabel: "Socio", interfaceRole: "admin" } });
  expect(JSON.stringify(body)).not.toContain(VALID_TOKEN);

  // Cerrar sesión: revoca en Auth, borra cookies y vuelve a cerrar el acceso.
  await page.getByRole("button", { name: /^Perfil:/ }).click();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(`${REQUIRED}/ingresar?motivo=salida`);
  await expect(page.getByRole("main").getByRole("status")).toHaveText("Cerraste la sesión.");
  expect(stubCalls).toContain("POST /auth/v1/logout");
  expect((await context.cookies(REQUIRED)).some((cookie) => cookie.name.startsWith("sb-127-auth-token"))).toBe(false);
  const after = await request.get(`${REQUIRED}/v2`, { maxRedirects: 0 });
  expect(after.status()).toBe(307);
});

test("login and logout only accept same-origin posts; provider errors map to safe messages", async ({ request }) => {
  const crossSite = await request.post(`${REQUIRED}/auth/login`, { form: { volver: "/v2" }, headers: { origin: "https://evil.example" }, maxRedirects: 0 });
  expect(crossSite.status()).toBe(303);
  expect(crossSite.headers().location).toContain("/ingresar?error=callback");
  const blocked = await request.get(`${REQUIRED}/auth/callback?error=server_error&error_description=Database+error+saving+new+user`, { maxRedirects: 0 });
  expect(blocked.headers().location).toContain("/ingresar?error=dominio");
  const noCode = await request.get(`${REQUIRED}/auth/callback`, { maxRedirects: 0 });
  expect(noCode.headers().location).toContain("/ingresar?error=callback");
  const page = await request.get(`${REQUIRED}/ingresar?error=dominio&volver=https%3A%2F%2Fevil.example`);
  const html = await page.text();
  expect(html).toContain("Solo pueden ingresar cuentas @avans.agency o personas invitadas por el equipo.");
  // El destino externo se descarta: los formularios vuelven a /v2.
  expect(html.match(/name="volver" value="([^"]*)"/g)).toEqual(['name="volver" value="/v2"', 'name="volver" value="/v2"']);
});

test("if authentication is required but not configured, access fails closed", async ({ page, request }) => {
  await page.goto(`${MISCONFIGURED}/v2`);
  await expect(page).toHaveURL(`${MISCONFIGURED}/ingresar?error=no-configurado`);
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("La autenticación no está configurada en este entorno.");
  await expect(page.getByRole("button", { name: /Ingresar con Google/ })).toHaveCount(0);
  const api = await request.get(`${MISCONFIGURED}/api/assistant/status`);
  expect(api.status()).toBe(503);
  const health = await request.get(`${MISCONFIGURED}/api/health/persistence`);
  expect((await health.json()).authMode).toBe("misconfigured");
});
