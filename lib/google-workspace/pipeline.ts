import {
  GoogleWorkspaceAdapter,
  documentText,
  matchCalendarEvent,
} from "./adapters";
import type { WorkspaceEvent, WorkspaceRepository } from "./contracts";
import {
  associateMeeting,
  contentHash,
  type ClientMatchProfile,
} from "../../app/v2/os/knowledge/sources";
import { newId, type MeetingArtifact } from "../../app/v2/os/knowledge/types";
export interface MeetingRepository extends WorkspaceRepository {
  profiles(organizationId: string): Promise<ClientMatchProfile[]>;
  /** Atomically inserts a source + meeting + proposals (or unassigned inbox),
   * with unique keys for event, conference, Smart Note, document and hash. Does
   * NOT approve proposals or mutate Discovery. Must preserve original links. */
  persistMeeting(
    organizationId: string,
    meeting: MeetingArtifact,
    event: WorkspaceEvent,
  ): Promise<"created" | "duplicate">;
}
export async function ingestSmartNote(
  event: WorkspaceEvent,
  organizationId: string,
  adapter: GoogleWorkspaceAdapter,
  repository: MeetingRepository,
  calendarId = "primary",
) {
  const claim = await repository.claimEvent(organizationId, event);
  if (claim !== "new") return claim;
  try {
    const note = await adapter.smartNote(event.smartNoteName);
    if (note.state !== "FILE_GENERATED" || !note.docsDestination?.document)
      throw new Error("SMART_NOTE_NOT_READY");
    const conferenceRecordId = note.name.split("/").slice(0, 2).join("/");
    const conference = await adapter.conference(conferenceRecordId);
    const [doc, file, space] = await Promise.all([
      adapter.document(note.docsDestination.document),
      adapter.driveMetadata(note.docsDestination.document),
      adapter.space(conference.space),
    ]);
    const rawText = documentText(doc);
    if (!rawText.trim()) throw new Error("EMPTY_NOTE");
    const start = Date.parse(conference.startTime);
    const events = await adapter.calendarEvents(
      calendarId,
      new Date(start - 86400000).toISOString(),
      new Date(start + 86400000).toISOString(),
    );
    const calendar = space.meetingCode
      ? matchCalendarEvent(events, space.meetingCode)
      : null;
    const meeting: MeetingArtifact = {
      id: newId(),
      sourceId: newId(),
      title: calendar?.summary || doc.title || file.name,
      occurredAt: conference.startTime,
      organizer: calendar?.organizer?.email ?? "",
      attendees:
        calendar?.attendees?.flatMap((a) => (a.email ? [a.email] : [])) ?? [],
      eventId: calendar?.id ?? "",
      eventUrl: calendar?.htmlLink ?? "",
      conferenceRecordId,
      smartNoteName: note.name,
      documentId: doc.documentId,
      documentUrl: note.docsDestination.exportUri || file.webViewLink || "",
      workspaceEventId: event.id,
      explicitClientSlug:
        calendar?.extendedProperties?.private?.avansClientSlug ?? "",
      folderId: file.parents?.[0] ?? "",
      summary: rawText.split("\n").slice(0, 5).join("\n"),
      decisions: [],
      tasks: [],
      association: "needs-review",
      candidates: [],
      clientSlug: "",
      associationReason: "",
      demo: false,
      hash: await contentHash(rawText),
      rawText,
    };
    const associated = {
      ...meeting,
      ...associateMeeting(meeting, await repository.profiles(organizationId)),
    };
    const result = await repository.persistMeeting(
      organizationId,
      associated,
      event,
    );
    await repository.completeEvent(organizationId, event.id);
    await repository.audit(
      organizationId,
      "google-workspace",
      `google.smart-note.${result}`,
    );
    return result;
  } catch (error) {
    await repository.failEvent(
      organizationId,
      event.id,
      error instanceof Error && /^[A-Z_]+$/.test(error.message)
        ? error.message
        : "GOOGLE_IMPORT_FAILED",
    );
    throw new Error("Google import failed; event remains retryable");
  }
}
