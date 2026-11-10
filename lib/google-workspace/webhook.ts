import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { SMART_NOTE_EVENT, type WorkspaceEvent } from "./contracts";
const googleKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
export async function verifyPubSubAuthorization(
  authorization: string | null,
  audience: string,
  serviceAccountEmail: string,
  keys: JWTVerifyGetKey = googleKeys,
) {
  if (
    !authorization?.startsWith("Bearer ") ||
    !audience ||
    !serviceAccountEmail
  )
    throw new Error("Unauthorized Pub/Sub delivery");
  const { payload } = await jwtVerify(authorization.slice(7), keys, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience,
    algorithms: ["RS256"],
    maxTokenAge: "1h",
    clockTolerance: 30,
  });
  if (payload.email !== serviceAccountEmail || payload.email_verified !== true)
    throw new Error("Unexpected Pub/Sub service account");
  return payload.sub;
}
export function parseWorkspaceEvent(
  body: unknown,
  expectedSubscription: string,
  expectedSource: string,
): WorkspaceEvent {
  if (!body || typeof body !== "object")
    throw new Error("Invalid Pub/Sub envelope");
  const b = body as {
    subscription?: string;
    message?: {
      messageId?: string;
      data?: string;
      attributes?: Record<string, string>;
    };
  };
  if (
    !expectedSubscription ||
    !expectedSource ||
    b.subscription !== expectedSubscription ||
    !b.message?.data ||
    !b.message.messageId
  )
    throw new Error("Invalid Pub/Sub subscription");
  const a = b.message.attributes;
  if (
    !a ||
    a["ce-specversion"] !== "1.0" ||
    a["ce-type"] !== SMART_NOTE_EVENT ||
    a["ce-source"] !== expectedSource ||
    !a["ce-id"] ||
    !Number.isFinite(Date.parse(a["ce-time"]))
  )
    throw new Error("Unexpected Workspace event");
  if (b.message.data.length > 1_400_000)
    throw new Error("Workspace payload too large");
  const payload = JSON.parse(
    Buffer.from(b.message.data, "base64").toString("utf8"),
  ) as { smartNote?: { name?: string } };
  const name = payload.smartNote?.name;
  if (!name || !/^conferenceRecords\/[\w-]+\/smartNotes\/[\w-]+$/.test(name))
    throw new Error("Invalid Smart Note resource");
  return {
    id: a["ce-id"],
    messageId: b.message.messageId,
    type: a["ce-type"],
    source: a["ce-source"],
    time: a["ce-time"],
    smartNoteName: name,
  };
}
