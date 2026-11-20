/* Diseño de marca · operación mensual (área B) y biblioteca (área C).
 * Un pedido (`trabajos`) es la unidad de producción; cada archivo entregado es una
 * versión en `biblioteca` vinculada por `pedidoId` y agrupada por `piezaId`.
 * La biblioteca no copia registros: una pieza aprobada o entregada es la misma
 * versión, marcada con su estado. Funciones puras, sin acceso a localStorage. */
import { contentState } from "./content-workflow";
import { designCategory } from "./design-model";
import type { DesignContext } from "./design-model";
import type { ModuleRecord } from "./types";

export const DESIGN_STAGES = ["Pendientes", "En producción", "En revisión interna", "Ajustes", "Esperando aprobación", "Aprobados", "Entregados"] as const;
export type DesignStage = typeof DESIGN_STAGES[number];
export const DESIGN_ORIGINS = [
  { id: "contenidos", label: "Contenidos" },
  { id: "publicidad-digital", label: "Publicidad Digital" },
  { id: "soporte", label: "Soporte" },
  { id: "estrategia", label: "Estrategia" },
  { id: "interno", label: "Solicitudes internas" },
] as const;
export const DESIGN_PRIORITIES = ["Alta", "Media", "Baja"] as const;
export const LIBRARY_STATES = ["Borrador", "En revisión", "Cambios pedidos", "Aprobado", "Entregado"] as const;

export function originLabel(id?: string) {
  return DESIGN_ORIGINS.find((origin) => origin.id === id)?.label ?? (id === "diseno-marca" ? "Diseño de marca" : id || "Solicitudes internas");
}

/** Estado genérico del pedido (compatibilidad con aprobaciones, entregables y tareas). */
const ESTADO_OF: Record<DesignStage, string> = {
  Pendientes: "Planificado", "En producción": "En curso", "En revisión interna": "En curso", Ajustes: "Cambios pedidos",
  "Esperando aprobación": "En aprobación", Aprobados: "Aprobado", Entregados: "Cerrado",
};
const ETAPA_OF: Record<DesignStage, string> = {
  Pendientes: "Brief", "En producción": "Diseño", "En revisión interna": "Revisión", Ajustes: "Diseño",
  "Esperando aprobación": "Revisión", Aprobados: "Entrega", Entregados: "Entrega",
};
const STAGE_OF_ESTADO: Record<string, DesignStage> = {
  Planificado: "Pendientes", Bloqueado: "Pendientes", "En curso": "En producción", "En aprobación": "Esperando aprobación",
  "Cambios pedidos": "Ajustes", Aprobado: "Aprobados", Cerrado: "Entregados",
};
const STAGE_OF_CONTENT: Record<string, DesignStage> = {
  "Producción de diseño": "En producción", "Revisión interna del diseño": "En revisión interna", "Aprobación final del cliente": "Esperando aprobación",
  Aprobado: "Aprobados", Programado: "Entregados", Publicada: "Entregados",
};
const LIBRARY_OF_STAGE: Partial<Record<DesignStage, string>> = {
  "En revisión interna": "En revisión", "Esperando aprobación": "En revisión", Ajustes: "Cambios pedidos", Aprobados: "Aprobado", Entregados: "Entregado",
};
const NEEDS_VERSION: DesignStage[] = ["En revisión interna", "Esperando aprobación", "Aprobados", "Entregados"];

export function isDesignStage(value?: string): value is DesignStage {
  return (DESIGN_STAGES as readonly string[]).includes(value ?? "");
}

/** Columna de la operación. Los pedidos de Contenidos siguen el estado del contenido de origen. */
export function designStage(request: ModuleRecord, content?: ModuleRecord): DesignStage {
  if (request.values.contenidoId && content) {
    const state = contentState(content);
    if (state === "Ajustes" && ["Revisión interna del diseño", "Aprobación final del cliente"].includes(content.values.returnState)) return "Ajustes";
    if (STAGE_OF_CONTENT[state]) return STAGE_OF_CONTENT[state];
  }
  const stage = request.values.operacion;
  // Si otra vista cambió el estado genérico (p. ej. Entregables y aprobaciones), manda ese estado.
  if (isDesignStage(stage) && ESTADO_OF[stage] === request.values.estado) return stage;
  return STAGE_OF_ESTADO[request.values.estado] ?? "Pendientes";
}

export type DesignApproval = { id: string; actor: string; at: string; decision: "Aprobado" | "Ajustes solicitados" | "Entregado"; note: string };
export type DesignComment = { id: string; actor: string; at: string; text: string };
function readArray<T>(raw?: string): T[] {
  try { const value: unknown = JSON.parse(raw || "[]"); return Array.isArray(value) ? value as T[] : []; } catch { return []; }
}
export function designApprovals(record: ModuleRecord) { return readArray<DesignApproval>(record.values.designApprovals); }
export function designComments(record: ModuleRecord) { return readArray<DesignComment>(record.values.designComments); }

export function addDesignComment(record: ModuleRecord, text: string, ctx: DesignContext): ModuleRecord {
  const clean = text.trim();
  if (!clean) throw new Error("Escribí un comentario.");
  if (clean.length > 2000) throw new Error("El comentario supera los 2000 caracteres.");
  const comment: DesignComment = { id: `COM-${Date.parse(ctx.at).toString(36)}-${designComments(record).length + 1}`, actor: ctx.actor, at: ctx.at, text: clean };
  return {
    ...record, updatedAt: ctx.at, user: ctx.actor,
    values: { ...record.values, designComments: JSON.stringify([...designComments(record), comment]) },
    history: [{ at: ctx.at, user: ctx.actor, text: "Comentó en la pieza" }, ...record.history],
  };
}

/** Mueve un pedido manual entre columnas, conservando estado genérico, etapa, aprobaciones e historial. */
export function moveDesignRequest(request: ModuleRecord, to: DesignStage, ctx: DesignContext & { versions: number; note?: string; from?: DesignStage }): ModuleRecord {
  if (request.module !== "diseno-marca" || request.collection !== "trabajos") throw new Error("Solo se mueven pedidos de diseño.");
  if (request.values.contenidoId) throw new Error("Este pedido avanza desde el contenido de origen.");
  if (!isDesignStage(to)) throw new Error("Estado de operación inválido.");
  const from = ctx.from ?? designStage(request);
  if (from === to) return request;
  if (NEEDS_VERSION.includes(to) && ctx.versions < 1) throw new Error("Subí al menos una versión de la pieza antes de enviarla a revisión o aprobación.");
  const note = ctx.note?.trim() || "";
  const approvals = designApprovals(request);
  const decision: DesignApproval["decision"] | null = to === "Aprobados" ? "Aprobado" : to === "Entregados" ? "Entregado" : to === "Ajustes" && ["En revisión interna", "Esperando aprobación", "Aprobados"].includes(from) ? "Ajustes solicitados" : null;
  const nextApprovals = decision ? [...approvals, { id: `APR-${Date.parse(ctx.at).toString(36)}-${approvals.length + 1}`, actor: ctx.actor, at: ctx.at, decision, note }] : approvals;
  return {
    ...request, updatedAt: ctx.at, user: ctx.actor,
    values: {
      ...request.values, operacion: to, estado: ESTADO_OF[to], etapa: ETAPA_OF[to],
      designApprovals: JSON.stringify(nextApprovals),
      ...(to === "Entregados" ? { fechaEntrega: ctx.at.slice(0, 10) } : {}),
    },
    history: [{ at: ctx.at, user: ctx.actor, text: `Movió de ${from} a ${to}${note ? ` · ${note}` : ""}` }, ...request.history],
  };
}

/* ───────── Biblioteca ───────── */
const versionNumber = (record: ModuleRecord) => Number(record.values.version) || 1;
export function pieceIdOf(record: ModuleRecord) { return record.values.piezaId || record.id; }
/** Última versión de cada pieza (una tarjeta por pieza, nunca duplicada). */
export function latestVersions(records: ModuleRecord[]) {
  const best = new Map<string, ModuleRecord>();
  for (const record of records) {
    const key = `${record.client}::${pieceIdOf(record)}`;
    const current = best.get(key);
    if (!current || versionNumber(record) > versionNumber(current)) best.set(key, record);
  }
  return records.filter((record) => best.get(`${record.client}::${pieceIdOf(record)}`) === record);
}
export function versionsOf(records: ModuleRecord[], piece: ModuleRecord) {
  return records.filter((r) => r.client === piece.client && pieceIdOf(r) === pieceIdOf(piece)).sort((a, b) => versionNumber(b) - versionNumber(a));
}
export function requestVersions(records: ModuleRecord[], request: ModuleRecord) {
  return records.filter((r) => r.client === request.client && r.values.pedidoId === request.id).sort((a, b) => versionNumber(b) - versionNumber(a));
}
export function libraryCategory(record: ModuleRecord) { return designCategory(record.values.categoria); }

/** Una pieza está en la Biblioteca de marca cuando su versión o su pedido quedaron aprobados o entregados. */
export function inBrandLibrary(version: ModuleRecord, request?: ModuleRecord, content?: ModuleRecord) {
  if (["Aprobado", "Entregado"].includes(version.values.estado)) return true;
  return !!request && ["Aprobados", "Entregados"].includes(designStage(request, content));
}

/** Al mover un pedido, actualiza el estado de la última versión de cada pieza vinculada. No crea registros. */
export function libraryAfterMove(library: ModuleRecord[], request: ModuleRecord, to: DesignStage, ctx: DesignContext) {
  const status = LIBRARY_OF_STAGE[to];
  if (!status) return { records: library, changed: [] as string[] };
  const latest = latestVersions(requestVersions(library, request));
  const ids = new Set(latest.filter((r) => r.values.estado !== status).map((r) => r.id));
  const text = to === "Aprobados" ? "Aprobada · disponible en la Biblioteca de marca" : to === "Entregados" ? "Entregada · disponible en la Biblioteca de marca" : `Estado de la versión: ${status}`;
  const records = library.map((r) => ids.has(r.id) ? { ...r, updatedAt: ctx.at, user: ctx.actor, values: { ...r.values, estado: status }, history: [{ at: ctx.at, user: ctx.actor, text }, ...r.history] } : r);
  return { records, changed: [...ids] };
}

/* ───────── Datos de demostración ───────── */
/** Reemplaza solo los registros `demo` de un cliente por semillas nuevas. Nunca toca registros manuales ni de otros clientes. */
export function resetDemoRecords(current: ModuleRecord[], seeds: ModuleRecord[], client: string) {
  const keep = current.filter((r) => r.client !== client || r.source !== "demo");
  const fresh = seeds.filter((seed) => seed.client === client && seed.source === "demo" && !keep.some((r) => r.id === seed.id && r.client === client));
  return [...keep, ...fresh];
}
