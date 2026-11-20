export const SMART_NOTE_EVENT =
  "google.workspace.meet.smartNote.v2.fileGenerated";
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/meetings.space.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
] as const;
export type WorkspaceIdentity = {
  userId: string;
  organizationId: string;
  role: "admin";
};
export type OAuthTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  scope: string;
};
export type WorkspaceConnection = {
  id: string;
  organizationId: string;
  accountEmail: string;
  state: "not-connected" | "connected" | "expired" | "revoked" | "error";
  scopes: string[];
  connectedBy: string;
  connectedAt: string;
  lastSyncedAt: string;
  error: string;
};
export type WorkspaceSubscription = {
  name: string;
  organizationId: string;
  connectionId: string;
  targetResource: string;
  expireTime: string;
  state: string;
  pubsubSubscription: string;
  eventSource: string;
};
export type SmartNote = {
  name: string;
  state: string;
  startTime?: string;
  endTime?: string;
  docsDestination?: { document: string; exportUri: string };
};
export type ConferenceRecord = {
  name: string;
  space: string;
  startTime: string;
  endTime?: string;
};
export type CalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  htmlLink?: string;
  organizer?: { email?: string };
  attendees?: { email?: string }[];
  start?: { dateTime?: string; date?: string };
  extendedProperties?: { private?: Record<string, string> };
  conferenceData?: { conferenceId?: string; entryPoints?: { uri?: string }[] };
};
export type DocElement = {
  paragraph?: { elements?: { textRun?: { content?: string } }[] };
  table?: { tableRows?: { tableCells?: { content?: DocElement[] }[] }[] };
  sectionBreak?: unknown;
};
export type GoogleDocument = {
  documentId: string;
  title?: string;
  body?: { content?: DocElement[] };
  tabs?: {
    documentTab?: { body?: { content?: DocElement[] } };
    childTabs?: GoogleDocument["tabs"];
  }[];
};
export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  parents?: string[];
  modifiedTime?: string;
};
export type WorkspaceEvent = {
  id: string;
  messageId: string;
  type: string;
  source: string;
  time: string;
  smartNoteName: string;
};
/** This store is SERVER ONLY. Production implementation must encrypt tokens with
 * a managed key and transactionally claim events in organization-scoped storage. */
export interface WorkspaceRepository {
  getTokens(
    connectionId: string,
    organizationId: string,
  ): Promise<OAuthTokens | null>;
  saveTokens(
    connectionId: string,
    identity: WorkspaceIdentity,
    tokens: OAuthTokens,
  ): Promise<void>;
  deleteTokens(
    connectionId: string,
    identity: WorkspaceIdentity,
  ): Promise<void>;
  audit(organizationId: string, actor: string, action: string): Promise<void>;
  claimEvent(
    organizationId: string,
    event: WorkspaceEvent,
  ): Promise<"new" | "processed" | "busy">;
  completeEvent(organizationId: string, eventId: string): Promise<void>;
  failEvent(
    organizationId: string,
    eventId: string,
    errorCode: string,
  ): Promise<void>;
}
export interface OAuthSessionStore {
  create(input: {
    state: string;
    verifier: string;
    identity: WorkspaceIdentity;
    expiresAt: number;
  }): Promise<void>;
  consume(
    state: string,
    identity: WorkspaceIdentity,
  ): Promise<{ verifier: string; expiresAt: number } | null>;
}
