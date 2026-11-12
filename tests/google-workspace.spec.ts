import { test, expect } from "@playwright/test";
import { generateKeyPair, SignJWT } from "jose";
import {
  GoogleWorkspaceAdapter,
  documentText,
  matchCalendarEvent,
} from "../lib/google-workspace/adapters";
import {
  SMART_NOTE_EVENT,
  GOOGLE_SCOPES,
  type OAuthSessionStore,
  type WorkspaceIdentity,
} from "../lib/google-workspace/contracts";
import {
  parseWorkspaceEvent,
  verifyPubSubAuthorization,
} from "../lib/google-workspace/webhook";
import { beginOAuth, finishOAuth } from "../lib/google-workspace/oauth";
import {
  googleReadiness,
  requiredGoogleSettings,
} from "../lib/google-workspace/readiness";
const sub = "projects/qa/subscriptions/qa",
  source = "//workspaceevents.googleapis.com/subscriptions/qa";
function envelope() {
  return {
    subscription: sub,
    message: {
      messageId: "delivery1",
      data: Buffer.from(
        JSON.stringify({
          smartNote: { name: "conferenceRecords/record/smartNotes/note" },
        }),
      ).toString("base64"),
      attributes: {
        "ce-specversion": "1.0",
        "ce-type": SMART_NOTE_EVENT,
        "ce-id": "event1",
        "ce-time": "2026-11-10T12:00:00Z",
        "ce-source": source,
      },
    },
  };
}
test("only authenticated envelope from expected subscription and source is parsed", () => {
  expect(parseWorkspaceEvent(envelope(), sub, source).smartNoteName).toBe(
    "conferenceRecords/record/smartNotes/note",
  );
  expect(() => parseWorkspaceEvent(envelope(), "wrong", source)).toThrow();
  const changed = envelope();
  changed.message.attributes["ce-type"] = "not-allowed";
  expect(() => parseWorkspaceEvent(changed, sub, source)).toThrow();
  expect(() => parseWorkspaceEvent(envelope(), sub, "wrong")).toThrow();
  const poisoned = envelope();
  poisoned.message.data = Buffer.from(
    JSON.stringify({ smartNote: { name: "https://evil.example/token" } }),
  ).toString("base64");
  expect(() => parseWorkspaceEvent(poisoned, sub, source)).toThrow();
});
test("OIDC verification checks signature, audience, issuer, verified service email and expiry", async () => {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const token = await new SignJWT({
    email: "push@qa.iam.gserviceaccount.com",
    email_verified: true,
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setIssuer("https://accounts.google.com")
    .setAudience("https://qa.example/webhook")
    .setSubject("push")
    .setExpirationTime("10m")
    .sign(privateKey);
  const key = async () => publicKey;
  expect(
    await verifyPubSubAuthorization(
      `Bearer ${token}`,
      "https://qa.example/webhook",
      "push@qa.iam.gserviceaccount.com",
      key,
    ),
  ).toBe("push");
  await expect(
    verifyPubSubAuthorization(
      `Bearer ${token}`,
      "wrong",
      "push@qa.iam.gserviceaccount.com",
      key,
    ),
  ).rejects.toThrow();
  await expect(
    verifyPubSubAuthorization(
      `Bearer ${token}`,
      "https://qa.example/webhook",
      "other",
      key,
    ),
  ).rejects.toThrow();
  await expect(
    verifyPubSubAuthorization(null, "a", "b", key),
  ).rejects.toThrow();
  const other = await generateKeyPair("RS256");
  await expect(
    verifyPubSubAuthorization(
      `Bearer ${token}`,
      "https://qa.example/webhook",
      "push@qa.iam.gserviceaccount.com",
      async () => other.publicKey,
    ),
  ).rejects.toThrow();
});
test("Google adapters use exact resources, read-only scopes and no arbitrary fetch", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const http: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ name: "fixture" }), { status: 200 });
  };
  const adapter = new GoogleWorkspaceAdapter("test-token", http);
  await adapter.smartNote("conferenceRecords/record/smartNotes/note");
  await adapter.document("doc_id");
  await adapter.driveMetadata("doc_id");
  await adapter.createSubscription(
    "//meet.googleapis.com/spaces/space",
    "projects/qa/topics/events",
  );
  await adapter.renewSubscription("subscriptions/qa");
  expect(calls[0].url).toBe(
    "https://meet.googleapis.com/v2/conferenceRecords/record/smartNotes/note",
  );
  expect(calls[1].url).toContain("includeTabsContent=true");
  expect(calls[3].init?.body).toContain(SMART_NOTE_EVENT);
  expect(calls[4].url).toContain("updateMask=ttl");
  expect(() => adapter.smartNote("https://evil.example/x")).toThrow();
  expect(calls).toHaveLength(5);
  expect(GOOGLE_SCOPES.every((s) => s.endsWith("readonly"))).toBe(true);
});
test("Google errors do not reveal response content or tokens", async () => {
  const adapter = new GoogleWorkspaceAdapter(
    "sensitive-token",
    async () => new Response("PRIVATE DOCUMENT", { status: 403 }),
  );
  await expect(
    adapter.smartNote("conferenceRecords/a/smartNotes/b"),
  ).rejects.toThrow("Google API HTTP 403");
});
test("Docs parser handles tabs, nested tabs and tables without duplicating the legacy body", () => {
  expect(
    documentText({
      documentId: "doc",
      body: {
        content: [
          { paragraph: { elements: [{ textRun: { content: "duplicate" } }] } },
        ],
      },
      tabs: [
        {
          documentTab: {
            body: {
              content: [
                {
                  paragraph: { elements: [{ textRun: { content: "Main\n" } }] },
                },
                {
                  table: {
                    tableRows: [
                      {
                        tableCells: [
                          {
                            content: [
                              {
                                paragraph: {
                                  elements: [
                                    { textRun: { content: "Cell\n" } },
                                  ],
                                },
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                },
              ],
            },
          },
          childTabs: [
            {
              documentTab: {
                body: {
                  content: [
                    {
                      paragraph: {
                        elements: [{ textRun: { content: "Child" } }],
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
    }),
  ).toBe("Main\nCell\nChild");
});
test("Calendar relation requires a unique code or saved event ID", () => {
  const a = { id: "a", conferenceData: { conferenceId: "abc-defg-hij" } },
    b = { ...a, id: "b" };
  expect(matchCalendarEvent([a], "abc-defg-hij")?.id).toBe("a");
  expect(matchCalendarEvent([a, b], "abc-defg-hij")).toBeNull();
  expect(matchCalendarEvent([a, b], "ignored", "b")?.id).toBe("b");
});
test("OAuth uses one-time session-bound state and PKCE and rejects unapproved scopes", async () => {
  const identity: WorkspaceIdentity = {
    userId: "admin",
    organizationId: "org",
    role: "admin",
  };
  let session: Parameters<OAuthSessionStore["create"]>[0] | null = null;
  const store: OAuthSessionStore = {
    create: async (s) => {
      session = s;
    },
    consume: async (state, actor) => {
      if (session?.state !== state || session.identity.userId !== actor.userId)
        return null;
      const result = session;
      session = null;
      return result;
    },
  };
  const config = {
    clientId: "fixture",
    clientSecret: "server-only-fixture",
    redirectUri: "https://qa.example/callback",
  };
  const url = new URL(await beginOAuth(config, identity, store));
  expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  const state = url.searchParams.get("state")!;
  expect(state.length).toBeGreaterThan(32);
  const response: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        access_token: "fixture",
        refresh_token: "fixture-refresh",
        expires_in: 3600,
        scope: GOOGLE_SCOPES.join(" "),
      }),
    );
  expect(
    (await finishOAuth(config, identity, state, "code", store, response))
      .accessToken,
  ).toBe("fixture");
  await expect(
    finishOAuth(config, identity, state, "code", store, response),
  ).rejects.toThrow(/state/);
  const retry = new URL(await beginOAuth(config, identity, store));
  await expect(
    finishOAuth(
      config,
      identity,
      retry.searchParams.get("state")!,
      "code",
      store,
      async () =>
        new Response(
          JSON.stringify({
            access_token: "fixture",
            expires_in: 3600,
            scope: "",
          }),
        ),
    ),
  ).rejects.toThrow(/scopes/);
});
test("setting environment values alone never enables a live connection", () => {
  expect(googleReadiness({}).missing.length).toBe(
    requiredGoogleSettings.length,
  );
  const status = googleReadiness(
    Object.fromEntries(
      requiredGoogleSettings.map((name) => [name, "configured"]),
    ),
  );
  expect(status.missing).toHaveLength(0);
  expect(status.enabled).toBe(false);
  expect(status.state).toBe("not-connected");
});
