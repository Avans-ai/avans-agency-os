import type { ModuleRecord } from "./types";

export const DESIGN_KINDS = ["Logo", "Color", "Tipografía", "Recurso gráfico", "Componente", "Moodboard", "Aplicación"] as const;
export const DESIGN_CATEGORIES = ["Redes", "Anuncios", "Carruseles", "Videos", "Motion", "Material institucional", "Presentaciones", "Plantillas", "Otros"] as const;
export type DesignContext = { actor: string; at: string };

export function safeDesignUrl(value: string) {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : ""; } catch { return ""; }
}

export function designImage(value: string) {
  if (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value) && value.length < 1_500_000) return value;
  const url = safeDesignUrl(value);
  return url && /\.(png|jpe?g|webp|gif)(?:\?|$)/i.test(url) ? url : "";
}

export function validDesignValues(values: Record<string, string>) {
  if (!values.nombre?.trim()) return "Completá el nombre.";
  if (values.tipo === "Color" && !/^#[a-f\d]{6}$/i.test(values.valor ?? "")) return "Ingresá un color hexadecimal de 6 dígitos.";
  if (values.tipo === "Tipografía" && !values.valor?.trim()) return "Ingresá la familia tipográfica.";
  if (values.archivo && !safeDesignUrl(values.archivo) && !designImage(values.archivo)) return "Usá una URL http/https o una imagen cargada desde tu equipo.";
  return "";
}

export function upsertDesignRequest(records: ModuleRecord[], content: ModuleRecord, ctx: DesignContext): { records: ModuleRecord[]; request: ModuleRecord } {
  if (content.module !== "contenidos" || content.collection !== "piezas") throw new Error("El origen debe ser un contenido.");
  const previous = records.find((record) => record.client === content.client && record.values.contenidoId === content.id);
  const values = {
    ...previous?.values,
    nombre: content.values.titulo || content.id,
    objetivo: content.values.objetivo || "",
    canal: content.values.canal || "",
    formatos: content.values.formato || "",
    detalle: [content.values.idea, content.values.bajada, content.values.copy].filter(Boolean).join("\n\n"),
    referencias: content.values.referencia || content.values.referencias || "",
    recursos: [content.values.brief, content.values.materialCliente, content.values.recursos, content.values.necesitaCliente ? `Información requerida al cliente: ${content.values.necesitaCliente}` : ""].filter(Boolean).join("\n\n"),
    lineamientos: `/v2/clientes/${content.client}/diseno-marca?area=lineamientos`,
    fechaObjetivo: content.values.fecha || content.values.fechaPublicacion || "",
    responsable: content.values.disenador || previous?.values.responsable || "",
    contenidoId: content.id,
    servicioOrigen: "contenidos",
    etapa: "Diseño",
    estado: "En curso",
  };
  const at = ctx.at;
  const request: ModuleRecord = previous ? {
    ...previous, values, updatedAt: at, user: ctx.actor,
    history: [{ at, user: ctx.actor, text: "Actualizó el pedido desde el contenido aprobado" }, ...previous.history],
  } : {
    id: `DIS-${content.id}`, client: content.client, module: "diseno-marca", collection: "trabajos", source: content.source,
    user: ctx.actor, createdAt: at, updatedAt: at, values,
    history: [{ at, user: ctx.actor, text: "Pedido creado desde la validación preliminar del contenido" }],
  };
  return { records: previous ? records.map((r) => r.id === request.id && r.client === request.client ? request : r) : [request, ...records], request };
}

export function createDesignVersion(records: ModuleRecord[], input: { client: string; id: string; values: Record<string, string>; previousId?: string }, ctx: DesignContext) {
  const error = validDesignValues(input.values);
  if (error) throw new Error(error);
  if (!input.values.archivo) throw new Error("Agregá un archivo o enlace de la pieza.");
  const previous = input.previousId ? records.find((r) => r.id === input.previousId && r.client === input.client) : undefined;
  if (input.previousId && !previous) throw new Error("La versión anterior no pertenece a este cliente.");
  const root = previous?.values.piezaId || previous?.id || input.id;
  const versions = records.filter((r) => r.client === input.client && (r.values.piezaId || r.id) === root);
  const version = Math.max(0, ...versions.map((r) => Number(r.values.version) || 1)) + 1;
  const record: ModuleRecord = {
    id: input.id, client: input.client, module: "diseno-marca", collection: "biblioteca", source: "manual",
    user: ctx.actor, createdAt: ctx.at, updatedAt: ctx.at,
    values: { ...input.values, piezaId: root, version: String(version), anteriorId: previous?.id || "" },
    history: [{ at: ctx.at, user: ctx.actor, text: `Guardó versión ${version}${previous ? ` de ${previous.values.nombre}` : ""}` }],
  };
  return { records: [record, ...records], record };
}
