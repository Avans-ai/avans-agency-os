import type { ModuleRecord } from "../modules/types";

export type PortalComment = {
  id: string;
  at: string;
  text: string;
  author: "Vos" | "Avans";
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentId?: string;
};

/** Explicit public projection; never return the internal record or its history. */
export type PortalContent = {
  id: string;
  title: string;
  axis: string;
  idea: string;
  description: string;
  objective: string;
  requestedMaterial: string;
  copy: string;
  channel: string;
  format: string;
  date: string;
  time: string;
  reference?: string;
  artwork?: string;
  version: string;
  status: string;
  pending: boolean;
  review: "preliminary" | "final" | "information" | null;
  comments: PortalComment[];
};

function array(value: string | undefined): Record<string, unknown>[] {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === "object") : [];
  } catch { return []; }
}

export function portalSafeUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch { return undefined; }
}

const visibleStates = new Set([
  "Revisión preliminar del cliente", "Información del cliente", "Aprobación final del cliente",
  "Aprobado", "Programado", "Programada", "Publicada", "En aprobación",
]);

export function portalSharedValues(record: ModuleRecord): Record<string, string> {
  try {
    const snapshot: unknown = JSON.parse(record.values.clientSnapshot || "null");
    if (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)) return Object.fromEntries(Object.entries(snapshot).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch { /* An unreadable snapshot must not expose work in progress. */ }
  return record.values.clientSnapshot ? {} : record.values;
}

export function portalNoticeKey(record: ModuleRecord) {
  const transition = array(record.values.contentTransitions).at(-1);
  return `${record.id}:${record.values.estado}:${typeof transition?.id === "string" ? transition.id : "legacy"}`;
}

export function projectPortalContent(record: ModuleRecord, clientSlug: string, axis = ""): PortalContent | null {
  if (record.client !== clientSlug || record.module !== "contenidos" || record.collection !== "piezas") return null;
  const v = record.values;
  const transitions = array(v.contentTransitions);
  const sharedBefore = transitions.some((entry) => (typeof entry.to === "string" && visibleStates.has(entry.to)) || (typeof entry.from === "string" && visibleStates.has(entry.from)));
  if (!visibleStates.has(v.estado) && !sharedBefore && !v.clientSnapshot) return null;
  const final = ["Aprobación final del cliente", "Aprobado", "Programado", "Programada", "Publicada", "En aprobación"].includes(v.estado);
  const publicValues = portalSharedValues(record);
  const review = v.estado === "Revisión preliminar del cliente" ? "preliminary"
    : ["Aprobación final del cliente", "En aprobación"].includes(v.estado) ? "final"
    : v.estado === "Información del cliente" ? "information" : null;
  const status = review === "preliminary" ? "Revisá la propuesta" : review === "final" ? "Revisá la pieza final"
    : review === "information" ? "Necesitamos tu información" : v.estado === "Aprobado" ? "Aprobado para programar"
    : ["Programado", "Programada"].includes(v.estado) ? "Programado" : v.estado === "Publicada" ? "Publicado"
    : v.estado === "Ajustes" ? "Estamos aplicando tus cambios" : "En preparación";
  return {
    id: record.id, title: publicValues.titulo || "Contenido sin título", axis,
    idea: publicValues.idea || "", description: publicValues.bajada || "", objective: publicValues.objetivo || "",
    requestedMaterial: publicValues.necesitaCliente || "", copy: publicValues.copy || "", channel: publicValues.canal || "",
    format: publicValues.formato || "", date: final ? v.fecha || publicValues.fecha || "" : publicValues.fecha || "", time: final ? v.hora || publicValues.hora || "" : publicValues.hora || "",
    reference: portalSafeUrl(publicValues.referencia), artwork: final || v.clientSnapshot ? portalSafeUrl(publicValues.archivoDiseno) : undefined,
    version: final || v.clientSnapshot ? publicValues.version || "" : "", status, pending: review !== null, review,
    comments: array(v.contentComments).filter((entry) => entry.visibility === "client" && typeof entry.text === "string").map((entry, index) => ({
      id: typeof entry.id === "string" ? entry.id : `comment-${index}`,
      at: typeof entry.at === "string" ? entry.at : "",
      text: String(entry.text),
      author: typeof entry.actor === "string" && entry.actor.startsWith("Cliente") ? "Vos" : "Avans",
      attachmentUrl: portalSafeUrl(entry.attachmentUrl),
      attachmentName: typeof entry.attachmentName === "string" ? entry.attachmentName : undefined,
      attachmentId: typeof entry.attachmentId === "string" ? entry.attachmentId
        : typeof entry.attachmentUrl === "string" && entry.attachmentUrl.startsWith("local-file:") ? entry.attachmentUrl.slice(11) : undefined,
    })),
  };
}

export function portalDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Fecha a confirmar";
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? "Fecha a confirmar" : parsed.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
}

export function portalCalendarDays(anchor: string, mode: "month" | "week" | "day") {
  const date = new Date(`${anchor}T12:00:00`);
  if (Number.isNaN(date.getTime())) return [];
  if (mode === "month") date.setDate(1);
  if (mode !== "day") date.setDate(date.getDate() - (date.getDay() + 6) % 7);
  const count = mode === "month" ? 42 : mode === "week" ? 7 : 1;
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(date);
    day.setDate(day.getDate() + index);
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  });
}
