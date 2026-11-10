"use client";
import { useState } from "react";
import Link from "next/link";
import { osClients, type OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { canEditDiscovery } from "../discovery/permissions";
import {
  useLocalStorageState,
  readLocalJson,
  writeLocalJson,
} from "../local-persistence";
import { OSSidePanel } from "../overlays";
import { buttonClass } from "../ui";
import { useKnowledge } from "./use-knowledge";
import {
  newSource,
  sourceVisible,
  associateMeeting,
  importMeeting,
  demoMeeting,
  sameMeeting,
  contentHash,
  type ClientMatchProfile,
} from "./sources";
import {
  newId,
  sourceTypes,
  sourceLabels,
  type KnowledgeSource,
  type MeetingArtifact,
} from "./types";
import { versionChange } from "./state";
import { meetingToProposals } from "./proposals";
import { ProposalsView, ProposalEditor } from "./proposal-view";
import { ExternalLink, History, LocalNotice } from "./shared-ui";
import m from "./knowledge.module.css";
const inboxKey = "knowledge:unassigned-meetings";
const matchKey = "knowledge:client-associations";
const tabs = [
  "Todos",
  "Reuniones",
  "Cuestionarios",
  "Documentos",
  "Catálogos y brochures",
  "Fuentes web",
  "Pendientes de procesar",
  "Cambios para aprobar",
  "Errores de sincronización",
  "Bandeja sin cliente",
];
function SourceEditor({
  client,
  source,
  onClose,
}: {
  client: OsClient;
  source: KnowledgeSource;
  onClose: () => void;
}) {
  const { k, editable, mutate } = useKnowledge(client);
  const [draft, setDraft] = useState(source);
  const [error, setError] = useState("");
  return (
    <OSSidePanel
      label="Editar fuente"
      heading={<h2>{source.title || "Agregar fuente"}</h2>}
      onClose={onClose}
      footer={
        <button
          className={buttonClass("primary")}
          form="source-form"
          disabled={!editable}
        >
          Guardar fuente
        </button>
      }
    >
      <form
        id="source-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!draft.title.trim()) {
            setError("Ingresá un título");
            return;
          }
          if (
            draft.validationStatus === "Validado" &&
            (draft.demo ||
              !draft.owner ||
              (!draft.externalUrl && !draft.rawText) ||
              !draft.evidence)
          ) {
            setError(
              "Validar requiere responsable, evidencia y referencia o contenido real.",
            );
            return;
          }
          const hash = draft.rawText ? await contentHash(draft.rawText) : "";
          if (
            mutate((s, c) => {
              const prev = s.sources.find((x) => x.id === draft.id);
              const next = {
                ...draft,
                contentHash: hash,
                version: (prev?.version ?? 0) + 1,
                metadata: {
                  ...draft.metadata,
                  updatedAt: c.at,
                  updatedBy: c.actor,
                },
              };
              return {
                ...versionChange(
                  s,
                  "source",
                  draft.id,
                  prev,
                  next,
                  c,
                  draft.id,
                ),
                sources: [...s.sources.filter((x) => x.id !== draft.id), next],
              };
            }, k.revision)
          )
            onClose();
        }}
      >
        <label className={m.field}>
          Título
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </label>
        <label className={m.field}>
          Tipo
          <select
            value={draft.type}
            onChange={(e) =>
              setDraft({
                ...draft,
                type: e.target.value as KnowledgeSource["type"],
              })
            }
          >
            {sourceTypes.map((t) => (
              <option key={t} value={t}>
                {sourceLabels[t]}
              </option>
            ))}
          </select>
        </label>
        <label className={m.field}>
          Enlace original o referencia
          <input
            value={draft.externalUrl}
            onChange={(e) =>
              setDraft({ ...draft, externalUrl: e.target.value })
            }
          />
        </label>
        <label className={m.field}>
          Fecha
          <input
            type="date"
            value={draft.occurredAt.slice(0, 10)}
            onChange={(e) => setDraft({ ...draft, occurredAt: e.target.value })}
          />
        </label>
        <label className={m.field}>
          Autor o responsable
          <input
            value={draft.owner}
            onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
          />
        </label>
        <label className={m.field}>
          Texto del documento o nota
          <textarea
            value={draft.rawText}
            onChange={(e) =>
              setDraft({
                ...draft,
                rawText: e.target.value,
                status: "imported",
              })
            }
          />
        </label>
        <label className={m.field}>
          Importar texto (.txt o .md)
          <input
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 1_000_000) {
                setError("El texto debe pesar menos de 1 MB");
                return;
              }
              setDraft({
                ...draft,
                title: draft.title || file.name,
                rawText: await file.text(),
                mimeType: file.type,
                status: "imported",
              });
            }}
          />
        </label>
        <p className={m.muted}>
          Los archivos PDF, presentaciones e imágenes se registran por enlace.
          No se suben ni se extraen automáticamente en esta preview.
        </p>
        <label className={m.field}>
          Evidencia de validación
          <textarea
            value={draft.evidence}
            onChange={(e) => setDraft({ ...draft, evidence: e.target.value })}
          />
        </label>
        <label className={m.field}>
          Validación
          <select
            value={draft.validationStatus}
            onChange={(e) =>
              setDraft({
                ...draft,
                validationStatus: e.target
                  .value as KnowledgeSource["validationStatus"],
              })
            }
          >
            <option>Borrador</option>
            <option>Validado</option>
            <option>Requiere revisión</option>
          </select>
        </label>
        <label className={m.field}>
          Visibilidad
          <select
            value={draft.visibility}
            onChange={(e) =>
              setDraft({
                ...draft,
                visibility: e.target.value as KnowledgeSource["visibility"],
              })
            }
          >
            <option value="team">Equipo del cliente</option>
            <option value="managers">Administrador y PM asignado</option>
          </select>
        </label>
        <label className={m.field}>
          Notas
          <textarea
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
        </label>
        {draft.demo ? (
          <p className={m.notice}>
            Fuente demostrativa; no puede validarse como información real.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className={m.error}>
            {error}
          </p>
        ) : null}
      </form>
    </OSSidePanel>
  );
}
function ManualMeeting({
  onImport,
  onClose,
}: {
  onImport: (meeting: MeetingArtifact) => Promise<boolean>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [attendees, setAttendees] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [eventId, setEventId] = useState("");
  const [error, setError] = useState("");
  return (
    <OSSidePanel
      label="Importar nota manual"
      heading={<h2>Importar nota de reunión</h2>}
      onClose={onClose}
      footer={
        <button className={buttonClass("primary")} form="meeting-form">
          Importar a bandeja
        </button>
      }
    >
      <form
        id="meeting-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim() || !rawText.trim()) {
            setError("Completá título y nota");
            return;
          }
          const hash = await contentHash(rawText);
          const meeting: MeetingArtifact = {
            id: newId(),
            sourceId: newId(),
            title,
            occurredAt,
            organizer,
            attendees: attendees.split(/[;,\s]+/).filter(Boolean),
            eventId,
            eventUrl: "",
            conferenceRecordId: "",
            smartNoteName: "",
            documentId: "",
            documentUrl,
            workspaceEventId: "",
            explicitClientSlug: "",
            folderId: "",
            summary: rawText.split("\n").slice(0, 3).join("\n"),
            decisions: rawText
              .split("\n")
              .filter((l) => /^decisi[oó]n:/i.test(l)),
            tasks: rawText.split("\n").filter((l) => /^tarea:/i.test(l)),
            association: "needs-review",
            candidates: [],
            clientSlug: "",
            associationReason: "Importación manual",
            demo: false,
            hash,
            rawText,
          };
          if (await onImport(meeting)) onClose();
        }}
      >
        {[
          ["Título", title, setTitle],
          ["Organizador", organizer, setOrganizer],
          ["Asistentes (emails)", attendees, setAttendees],
          ["Google Doc / enlace original", documentUrl, setDocumentUrl],
          ["Calendar event ID (si se conoce)", eventId, setEventId],
        ].map(([label, value, setter]) => (
          <label key={String(label)} className={m.field}>
            {String(label)}
            <input
              value={String(value)}
              onChange={(e) => (setter as (v: string) => void)(e.target.value)}
            />
          </label>
        ))}
        <label className={m.field}>
          Fecha
          <input
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
        </label>
        <label className={m.field}>
          Nota o transcripción
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
        </label>
        <p className={m.muted}>
          Las líneas como “Cobertura: …” permiten extracción determinística. El
          resto queda disponible para propuestas manuales con evidencia.
        </p>
        {error ? (
          <p role="alert" className={m.error}>
            {error}
          </p>
        ) : null}
      </form>
    </OSSidePanel>
  );
}
export function DocumentsView({ client }: { client: OsClient }) {
  const { k, editable, invalid, mutate, context } = useKnowledge(client);
  const { role, notify } = useOsStore();
  const [tab, setTab] = useState("Todos");
  const [editing, setEditing] = useState<KnowledgeSource | null>(null);
  const [manual, setManual] = useState(false);
  const [proposalSource, setProposalSource] = useState("");
  const [inbox] = useLocalStorageState<MeetingArtifact[]>(inboxKey, []);
  const [profiles, setProfiles] = useLocalStorageState<ClientMatchProfile[]>(
    matchKey,
    [],
  );
  const [contact, setContact] = useState("");
  const [assignment, setAssignment] = useState<Record<string, string>>({});
  const available = osClients.filter((c) => canEditDiscovery(role, c));
  async function importArtifact(meeting: MeetingArtifact) {
    if (!editable) return false;
    const base = osClients.map((c) => ({
      slug: c.slug,
      aliases: [c.name, c.slug],
      emails: [],
      domains: [],
      eventIds: [],
      folderIds: [],
      documentIds: [],
      ...profiles.find((p) => p.slug === c.slug),
    }));
    const associated = { ...meeting, ...associateMeeting(meeting, base) };
    if (associated.clientSlug === client.slug)
      return mutate((s, c) => {
        const next = importMeeting(s, associated, c);
        return next === s ? s : meetingToProposals(next, associated.sourceId, c);
      });
    const old = readLocalJson<MeetingArtifact[]>(inboxKey, []);
    if (
      old.some((m) => sameMeeting(m, associated)) ||
      k.meetings.some((m) => sameMeeting(m, associated))
    ) {
      notify("La reunión ya está registrada; no se duplicó");
      return true;
    }
    if (!writeLocalJson(inboxKey, [...old, associated])) {
      notify("No se pudo guardar la bandeja", "error");
      return false;
    }
    notify("Nota en bandeja sin cliente; requiere asignación");
    setTab("Bandeja sin cliente");
    return true;
  }
  function assign(meeting: MeetingArtifact) {
    const slug = assignment[meeting.id] || client.slug;
    if (slug !== client.slug) {
      notify(
        "Abrí Documentos del cliente elegido para completar la asignación",
        "error",
      );
      return;
    }
    if (!available.some((c) => c.slug === slug)) return;
    const assigned = {
      ...meeting,
      clientSlug: slug,
      association: "automatic" as const,
      associationReason: "Asignación manual del PM",
    };
    if (
      mutate((s, c) => {
        const next = importMeeting(s, assigned, c);
        return next === s ? s : meetingToProposals(next, assigned.sourceId, c);
      })
    ) {
      const current = readLocalJson<MeetingArtifact[]>(inboxKey, []);
      if (
        !writeLocalJson(
          inboxKey,
          current.filter((m) => m.id !== meeting.id),
        )
      )
        notify(
          "Importada; no se pudo quitar de la bandeja. Reintentar no duplicará la fuente.",
          "error",
        );
      if (meeting.eventId) {
        const p = profiles.find((x) => x.slug === slug) ?? {
          slug,
          aliases: [client.name],
          emails: [],
          domains: [],
          eventIds: [],
          folderIds: [],
          documentIds: [],
        };
        setProfiles([
          ...profiles.filter((x) => x.slug !== slug),
          {
            ...p,
            eventIds: Array.from(new Set([...p.eventIds, meeting.eventId])),
          },
        ]);
      }
    }
  }
  const sources = k.sources
    .filter((s) => sourceVisible(s, editable))
    .filter((s) =>
      tab === "Reuniones"
        ? s.type.startsWith("meeting")
        : tab === "Cuestionarios"
          ? s.type === "questionnaire"
          : tab === "Documentos"
            ? ["document", "drive-file"].includes(s.type)
            : tab === "Catálogos y brochures"
              ? ["catalog", "brochure"].includes(s.type)
              : tab === "Fuentes web"
                ? ["website", "platform"].includes(s.type)
                : tab === "Pendientes de procesar"
                  ? ["pending", "imported", "needs-review"].includes(s.status)
                  : tab === "Errores de sincronización"
                    ? s.status === "failed"
                    : true,
    );
  return (
    <div className={m.root}>
      <div className={m.head}>
        <div>
          <h2>Fuentes y actualizaciones</h2>
          <p>
            Documentos, reuniones y cuestionarios del cliente. Los cambios se
            aplican después de la revisión.
          </p>
        </div>
        <div className={m.actions}>
          <button
            disabled={!editable}
            className={buttonClass("primary", true)}
            onClick={() => setEditing(newSource(client.slug, context()))}
          >
            Agregar fuente
          </button>
          <button
            disabled={!editable}
            className={buttonClass("secondary", true)}
            onClick={() => setManual(true)}
          >
            Importar nota manual
          </button>
        </div>
      </div>
      <LocalNotice invalid={invalid} />
      <div className={m.notice}>
        <strong>Google Workspace no conectado</strong>
        <p>
          Sincronización deshabilitada. OAuth, almacenamiento seguro y
          suscripción de eventos pendientes de configuración y validación.
        </p>
        <Link href="/v2/integraciones">
          Ver configuración de Google Workspace
        </Link>
        <div className={m.actions}>
          <button disabled className={buttonClass("secondary", true)}>
            Sincronizar reuniones
          </button>
          <button
            disabled={!editable}
            className={buttonClass("secondary", true)}
            onClick={async () => importArtifact(await demoMeeting())}
          >
            Probar nota DEMO
          </button>
          <button
            disabled={!editable}
            className={buttonClass("ghost", true)}
            onClick={async () => importArtifact(await demoMeeting(true))}
          >
            Probar asociación ambigua DEMO
          </button>
        </div>
      </div>
      <nav className={m.tabs} aria-label="Filtros de fuentes">
        {tabs.map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      {tab === "Cambios para aprobar" ? (
        <ProposalsView client={client} />
      ) : tab === "Bandeja sin cliente" ? (
        <section className={m.root}>
          <h3>Bandeja de reuniones sin cliente</h3>
          {editable ? (
            <>
              {inbox.length ? (
                inbox.map((meeting) => (
                  <article className={m.card} key={meeting.id}>
                    <h4>{meeting.title}</h4>
                    <p>
                      {meeting.associationReason} · {meeting.association}
                    </p>
                    <p>
                      Candidatos:{" "}
                      {meeting.candidates.join(" · ") || "Sin coincidencias"}
                    </p>
                    <p>{meeting.summary}</p>
                    <label className={m.field}>
                      Asignar a cliente
                      <select
                        value={assignment[meeting.id] || client.slug}
                        onChange={(e) =>
                          setAssignment({
                            ...assignment,
                            [meeting.id]: e.target.value,
                          })
                        }
                      >
                        {available.map((c) => (
                          <option key={c.slug} value={c.slug}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className={m.actions}>
                      <button
                        className={buttonClass("primary", true)}
                        onClick={() => assign(meeting)}
                      >
                        Asignar al cliente
                      </button>
                      <button
                        className={buttonClass("ghost", true)}
                        onClick={() => {
                          if (
                            writeLocalJson(
                              inboxKey,
                              inbox.map((m) =>
                                m.id === meeting.id
                                  ? { ...m, association: "unrelated" }
                                  : m,
                              ),
                            )
                          )
                            notify("Marcada como no relacionada");
                        }}
                      >
                        No relacionada con cliente
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className={m.empty}>No hay reuniones sin cliente.</p>
              )}
              <details className={m.card}>
                <summary>
                  Contactos para asociación determinística · {client.name}
                </summary>
                <p className={m.muted}>
                  Una dirección completa o un dominio por línea. Las
                  coincidencias ambiguas siempre requieren revisión.
                </p>
                <label className={m.field}>
                  Emails o dominios
                  <textarea
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                </label>
                <button
                  className={buttonClass("secondary", true)}
                  onClick={() => {
                    const values = contact
                      .toLowerCase()
                      .split(/[\n,;\s]+/)
                      .filter(Boolean);
                    const p = profiles.find((x) => x.slug === client.slug) ?? {
                      slug: client.slug,
                      aliases: [client.name, client.slug],
                      emails: [],
                      domains: [],
                      eventIds: [],
                      folderIds: [],
                      documentIds: [],
                    };
                    setProfiles([
                      ...profiles.filter((x) => x.slug !== client.slug),
                      {
                        ...p,
                        emails: Array.from(
                          new Set([
                            ...p.emails,
                            ...values.filter((v) => v.includes("@")),
                          ]),
                        ),
                        domains: Array.from(
                          new Set([
                            ...p.domains,
                            ...values.filter((v) => !v.includes("@")),
                          ]),
                        ),
                      },
                    ]);
                    setContact("");
                  }}
                >
                  Agregar contactos
                </button>
                <p>
                  {profiles
                    .find((p) => p.slug === client.slug)
                    ?.emails.concat(
                      profiles.find((p) => p.slug === client.slug)?.domains ??
                        [],
                    )
                    .join(" · ")}
                </p>
              </details>
            </>
          ) : (
            <p className={m.notice}>
              Bandeja disponible para el administrador y el PM asignado.
            </p>
          )}
        </section>
      ) : (
        <section className={m.root}>
          {sources.length ? (
            sources.map((source) => {
              const meeting = k.meetings.find(
                (meeting) => meeting.sourceId === source.id,
              );
              const pending = k.proposals.filter(
                (p) => p.sourceId === source.id && p.status === "pending",
              );
              return (
                <article className={m.card} key={source.id}>
                  <div className={m.head}>
                    <h3>{source.title}</h3>
                    <span className={m.badge}>
                      {sourceLabels[source.type]}
                      {source.demo ? " · DEMO" : ""} · v{source.version}
                    </span>
                  </div>
                  <p className={m.muted}>
                    {source.provider === "manual"
                      ? "Importación o carga manual"
                      : source.provider}{" "}
                    · {source.occurredAt || "Fecha pendiente"} ·{" "}
                    {source.owner || source.importedBy} · {client.name}
                  </p>
                  <ExternalLink
                    url={source.externalUrl}
                    label="Abrir fuente original"
                  />
                  <p>
                    Procesamiento: {source.status} · Validación:{" "}
                    {source.validationStatus} · {pending.length} propuestas
                    pendientes
                  </p>
                  <p className={m.small}>
                    Módulos:{" "}
                    {source.impactedModules.join(" · ") || "Sin propuestas"} ·
                    Última sincronización: {source.lastSyncedAt || "Nunca"}
                  </p>
                  {source.error ? (
                    <p role="alert" className={m.error}>
                      {source.error}
                    </p>
                  ) : null}
                  {meeting ? (
                    <details>
                      <summary>Detalle de la reunión</summary>
                      <p>
                        Organizador: {meeting.organizer} · Asistentes:{" "}
                        {meeting.attendees.join(", ") || "No informados"}
                      </p>
                      <p>Asociación: {meeting.associationReason}</p>
                      <ExternalLink
                        url={meeting.eventUrl}
                        label="Evento de Calendar"
                      />
                      <p>{meeting.summary}</p>
                      <h4>Decisiones</h4>
                      <ul>
                        {meeting.decisions.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                      <h4>Tareas</h4>
                      <ul>
                        {meeting.tasks.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                      <p>
                        Campos potencialmente afectados:{" "}
                        {pending
                          .map(
                            (p) => p.targetSection + " / " + p.targetFieldPath,
                          )
                          .join(" · ") || "Sin extracción pendiente"}
                      </p>
                    </details>
                  ) : null}
                  {source.rawText ? (
                    <details>
                      <summary>Contenido conservado</summary>
                      <pre className={m.pre}>{source.rawText}</pre>
                    </details>
                  ) : null}
                  <div className={m.actions}>
                    <button
                      disabled={!editable}
                      className={buttonClass("secondary", true)}
                      onClick={() => setEditing(source)}
                    >
                      Editar fuente
                    </button>
                    <button
                      disabled={!editable || !source.rawText}
                      className={buttonClass("secondary", true)}
                      onClick={() =>
                        mutate((s, c) => meetingToProposals(s, source.id, c))
                      }
                    >
                      Extraer propuestas
                    </button>
                    <button
                      disabled={!editable}
                      className={buttonClass("ghost", true)}
                      onClick={() => setProposalSource(source.id)}
                    >
                      Proponer cambio manual
                    </button>
                    {pending.length ? (
                      <button
                        className={buttonClass("primary", true)}
                        onClick={() => setTab("Cambios para aprobar")}
                      >
                        Revisar propuestas
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <p className={m.empty}>No hay fuentes en esta categoría.</p>
          )}
        </section>
      )}
      {editable ? <History k={k} /> : null}
      {editing ? (
        <SourceEditor
          client={client}
          source={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {manual ? (
        <ManualMeeting
          onImport={importArtifact}
          onClose={() => setManual(false)}
        />
      ) : null}
      {proposalSource ? (
        <ProposalEditor
          client={client}
          sourceId={proposalSource}
          onClose={() => setProposalSource("")}
        />
      ) : null}
    </div>
  );
}
