import {
  SMART_NOTE_EVENT,
  type SmartNote,
  type CalendarEvent,
  type ConferenceRecord,
  type GoogleDocument,
  type DriveFile,
  type DocElement,
} from "./contracts";
type Http = typeof fetch;
function resource(name: string, pattern: RegExp) {
  if (!pattern.test(name)) throw new Error("Invalid Google resource name");
  return name;
}
const id = (value: string) =>
  encodeURIComponent(resource(value, /^[a-zA-Z0-9_-]+$/));
/** Fixed Google origins: external URLs in notes are never fetched. No credentials
 * or response bodies are included in errors. All calls are server-side only. */
export class GoogleWorkspaceAdapter {
  constructor(
    private token: string,
    private http: Http = fetch,
  ) {
    if (typeof window !== "undefined") throw new Error("Server-only adapter");
  }
  private async request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const response = await this.http(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok) throw new Error(`Google API HTTP ${response.status}`);
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }
  smartNote(name: string) {
    return this.request<SmartNote>(
      `https://meet.googleapis.com/v2/${resource(name, /^conferenceRecords\/[\w-]+\/smartNotes\/[\w-]+$/)}`,
    );
  }
  conference(name: string) {
    return this.request<ConferenceRecord>(
      `https://meet.googleapis.com/v2/${resource(name, /^conferenceRecords\/[\w-]+$/)}`,
    );
  }
  space(name: string) {
    return this.request<{
      name: string;
      meetingCode?: string;
      meetingUri?: string;
    }>(`https://meet.googleapis.com/v2/${resource(name, /^spaces\/[\w-]+$/)}`);
  }
  document(documentId: string) {
    return this.request<GoogleDocument>(
      `https://docs.googleapis.com/v1/documents/${id(documentId)}?includeTabsContent=true`,
    );
  }
  driveMetadata(documentId: string) {
    return this.request<DriveFile>(
      `https://www.googleapis.com/drive/v3/files/${id(documentId)}?fields=id,name,mimeType,webViewLink,parents,modifiedTime`,
    );
  }
  calendarEvent(calendarId: string, eventId: string) {
    return this.request<CalendarEvent>(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${id(eventId)}`,
    );
  }
  async calendarEvents(calendarId: string, timeMin: string, timeMax: string) {
    if (
      !Number.isFinite(Date.parse(timeMin)) ||
      !Number.isFinite(Date.parse(timeMax))
    )
      throw new Error("Invalid Calendar window");
    const events: CalendarEvent[] = [];
    let pageToken = "";
    let pages = 0;
    do {
      const q = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: "true",
        maxResults: "250",
        ...(pageToken ? { pageToken } : {}),
      });
      const page = await this.request<{
        items?: CalendarEvent[];
        nextPageToken?: string;
      }>(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${q}`,
      );
      events.push(...(page.items ?? []));
      pageToken = page.nextPageToken ?? "";
      if (++pages > 20)
        throw new Error("Calendar pagination limit; narrow time window");
    } while (pageToken);
    return events;
  }
  createSubscription(targetResource: string, topic: string) {
    resource(
      targetResource,
      /^\/\/(meet\.googleapis\.com\/spaces|cloudidentity\.googleapis\.com\/users)\/[\w-]+$/,
    );
    resource(topic, /^projects\/[\w-]+\/topics\/[\w.-]+$/);
    return this.request<{ name: string; done?: boolean; response?: unknown }>(
      "https://workspaceevents.googleapis.com/v1/subscriptions",
      {
        method: "POST",
        body: JSON.stringify({
          targetResource,
          eventTypes: [SMART_NOTE_EVENT],
          notificationEndpoint: { pubsubTopic: topic },
          payloadOptions: { includeResource: false },
          ttl: "0s",
        }),
      },
    );
  }
  renewSubscription(name: string) {
    return this.request<unknown>(
      `https://workspaceevents.googleapis.com/v1/${resource(name, /^subscriptions\/[\w-]+$/)}?updateMask=ttl`,
      { method: "PATCH", body: JSON.stringify({ ttl: "0s" }) },
    );
  }
  deleteSubscription(name: string) {
    return this.request<unknown>(
      `https://workspaceevents.googleapis.com/v1/${resource(name, /^subscriptions\/[\w-]+$/)}`,
      { method: "DELETE" },
    );
  }
  operation(name: string) {
    return this.request<{
      done?: boolean;
      response?: unknown;
      error?: { code: number };
    }>(
      `https://workspaceevents.googleapis.com/v1/${resource(name, /^operations\/[\w-]+$/)}`,
    );
  }
}
export function documentText(doc: GoogleDocument): string {
  const walk = (elements: DocElement[]): string =>
    elements
      .map(
        (e) =>
          (e.paragraph?.elements
            ?.map((x) => x.textRun?.content ?? "")
            .join("") ?? "") +
          (e.table?.tableRows
            ?.map((row) =>
              row.tableCells
                ?.map((cell) => walk(cell.content ?? []))
                .join("\n"),
            )
            .join("\n") ?? ""),
      )
      .join("");
  const tabs = (items: GoogleDocument["tabs"]): string =>
    (items ?? [])
      .map(
        (tab) =>
          walk(tab.documentTab?.body?.content ?? []) + tabs(tab.childTabs),
      )
      .join("\n");
  return doc.tabs?.length ? tabs(doc.tabs) : walk(doc.body?.content ?? []);
}
export function matchCalendarEvent(
  events: CalendarEvent[],
  meetingCode: string,
  knownEventId?: string,
) {
  const matches = events.filter((e) =>
    knownEventId
      ? e.id === knownEventId
      : e.conferenceData?.conferenceId === meetingCode ||
        e.conferenceData?.entryPoints?.some(
          (p) => p.uri === `https://meet.google.com/${meetingCode}`,
        ),
  );
  return matches.length === 1 ? matches[0] : null;
}
