/* Contenidos → Diseño: el pedido derivado reutiliza todo lo ya cargado en el contenido
 * (propuesta aprobada, preproducción, pedidos al cliente, lineamientos y recursos del
 * Design System) para que el diseñador no vuelva a escribir información existente.
 * Usa `upsertDesignRequest` (un pedido por contenido, id `DIS-<contenidoId>`) sin
 * modificarlo: solo completa campos del mismo registro. */
import { upsertDesignRequest, type DesignContext } from "./design-model";
import { clientRequests, VIDEO_FORMATS } from "./content-workflow";
import type { ModuleRecord } from "./types";

const join = (...parts: (string | undefined | false)[]) => parts.filter(Boolean).join("\n\n");

/** Recursos aprobados del Design System del cliente que acompañan el pedido. */
export function designSystemResources(system: ModuleRecord[], clientSlug: string) {
  return system.filter((item) => item.client === clientSlug && item.values.estado !== "Requiere revisión").map((item) => `${item.values.tipo || "Recurso"} · ${item.values.nombre}${item.values.valor ? ` (${item.values.valor})` : ""}`);
}

export function contentDesignValues(content: ModuleRecord, system: ModuleRecord[], axis?: ModuleRecord) {
  const v = content.values;
  const resources = designSystemResources(system, content.client);
  const requests = clientRequests(v);
  return {
    detalle: join(v.preCopyFinal ? `Copy definitivo:\n${v.preCopyFinal}` : v.copy ? `Copy aprobado:\n${v.copy}` : "", v.idea && `Idea: ${v.idea}`, v.bajada && `Bajada: ${v.bajada}`, v.cta && `CTA: ${v.cta}`),
    concepto: v.conceptoVisual || v.mensaje || "",
    publico: axis?.values.perfil || v.icp || "",
    formatos: [v.formato, v.preDimensiones].filter(Boolean).join(" · "),
    referencias: join(v.preReferencias, v.referencia && !v.preReferencias?.includes(v.referencia) ? v.referencia : ""),
    recursos: join(
      v.preRecursos && `Recursos indicados: ${v.preRecursos}`,
      v.preMaterial && `Material fotográfico: ${v.preMaterial}`,
      requests.length ? `Material del cliente:\n${requests.map((item) => `· ${item.type}: ${item.detail} (${item.status})`).join("\n")}` : "",
      resources.length ? `Design System:\n${resources.map((item) => `· ${item}`).join("\n")}` : "Design System: sin recursos cargados para esta cuenta; usar los materiales de la Ficha.",
    ),
    consideraciones: join(v.preIndicaciones, v.preDimensiones && `Dimensiones: ${v.preDimensiones}`, v.preWireframe && `Wireframe: ${v.preWireframe}`, VIDEO_FORMATS.includes(v.formato) && v.preGuion ? `Guion:\n${v.preGuion}` : ""),
    fechaObjetivo: v.fechaEntregaDiseno || v.fecha || "",
    recursosSistema: String(resources.length),
    ejeNombre: axis?.values.nombre || "",
    planId: v.plan || "",
  };
}

/** Crea o actualiza el único pedido de diseño del contenido y lo vincula a su tarea. */
export function upsertContentDesignRequest(records: ModuleRecord[], content: ModuleRecord, ctx: DesignContext & { taskId: string; designer: string; system: ModuleRecord[]; axis?: ModuleRecord }) {
  const result = upsertDesignRequest(records, { ...content, values: { ...content.values, disenador: ctx.designer } }, ctx);
  const request: ModuleRecord = { ...result.request, values: { ...result.request.values, ...contentDesignValues(content, ctx.system, ctx.axis), tareaId: ctx.taskId } };
  return { request, records: result.records.map((item) => item.id === request.id && item.client === request.client ? request : item) };
}

/** Miniatura disponible para un contenido: última versión con imagen en la biblioteca de Diseño. */
export function contentThumbnail(library: ModuleRecord[], contentId: string) {
  const image = (value = "") => /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value) || /^https?:\/\/[^\s]+\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(value) ? value : "";
  return library.filter((item) => item.values.contenidoId === contentId && image(item.values.archivo)).sort((a, b) => (Number(b.values.version) || 0) - (Number(a.values.version) || 0) || b.updatedAt.localeCompare(a.updatedAt)).map((item) => image(item.values.archivo))[0] || "";
}
