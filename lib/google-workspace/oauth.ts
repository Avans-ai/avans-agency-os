import { createHash, randomBytes } from "node:crypto";
import {
  GOOGLE_SCOPES,
  type OAuthTokens,
  type OAuthSessionStore,
  type WorkspaceIdentity,
  type WorkspaceRepository,
} from "./contracts";
export type OAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};
function serverOnly() {
  if (typeof window !== "undefined") throw new Error("OAuth is server-only");
}
export async function beginOAuth(
  config: OAuthConfig,
  identity: WorkspaceIdentity,
  store: OAuthSessionStore,
) {
  serverOnly();
  const state = randomBytes(32).toString("base64url"),
    verifier = randomBytes(48).toString("base64url");
  await store.create({
    state,
    verifier,
    identity,
    expiresAt: Date.now() + 600000,
  });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  }).toString();
  return url.href;
}
async function tokenRequest(
  params: URLSearchParams,
  http: typeof fetch,
): Promise<OAuthTokens> {
  const response = await http("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Google OAuth HTTP ${response.status}`);
  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  if (!data.access_token || !data.expires_in)
    throw new Error("Invalid token response");
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    scope: data.scope ?? "",
  };
}
export async function finishOAuth(
  config: OAuthConfig,
  identity: WorkspaceIdentity,
  state: string,
  code: string,
  sessions: OAuthSessionStore,
  http: typeof fetch = fetch,
) {
  serverOnly();
  const session = await sessions.consume(state, identity);
  if (!session || session.expiresAt < Date.now())
    throw new Error("Invalid or expired OAuth state");
  const tokens = await tokenRequest(
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      code,
      code_verifier: session.verifier,
    }),
    http,
  );
  if (GOOGLE_SCOPES.some((scope) => !tokens.scope.split(" ").includes(scope)))
    throw new Error("Required scopes were not approved");
  return tokens;
}
export async function accessToken(
  config: OAuthConfig,
  identity: WorkspaceIdentity,
  connectionId: string,
  repository: WorkspaceRepository,
  http: typeof fetch = fetch,
) {
  serverOnly();
  const tokens = await repository.getTokens(
    connectionId,
    identity.organizationId,
  );
  if (!tokens) throw new Error("Not connected");
  if (Date.parse(tokens.expiresAt) > Date.now() + 60000)
    return tokens.accessToken;
  if (!tokens.refreshToken) throw new Error("Reauthorization required");
  const next = await tokenRequest(
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
    }),
    http,
  );
  await repository.saveTokens(connectionId, identity, {
    ...next,
    refreshToken: next.refreshToken ?? tokens.refreshToken,
    scope: next.scope || tokens.scope,
  });
  await repository.audit(
    identity.organizationId,
    identity.userId,
    "google.oauth.renewed",
  );
  return next.accessToken;
}
export async function disconnect(
  identity: WorkspaceIdentity,
  connectionId: string,
  repository: WorkspaceRepository,
  http: typeof fetch = fetch,
) {
  serverOnly();
  const tokens = await repository.getTokens(
    connectionId,
    identity.organizationId,
  );
  if (tokens) {
    const response = await http("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        token: tokens.refreshToken ?? tokens.accessToken,
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok && response.status !== 400)
      throw new Error(`Google revocation HTTP ${response.status}`);
  }
  await repository.deleteTokens(connectionId, identity);
  await repository.audit(
    identity.organizationId,
    identity.userId,
    "google.oauth.disconnected",
  );
}
