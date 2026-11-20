import type { CollectionDef } from "./types";
import { DESIGN_CATEGORIES, DESIGN_KINDS } from "./design-model";

export const designSystemCollection: CollectionDef = {
  id: "sistema", label: "Design System", singular: "recurso de marca", prefix: "DS", description: "Identidad y recursos reutilizables del cliente.", titleKey: "nombre", statusKey: "estado", empty: "Agregá el primer recurso de marca.",
  fields: [
    { key: "nombre", label: "Nombre", type: "text", required: true },
    { key: "tipo", label: "Tipo", type: "select", options: DESIGN_KINDS, required: true },
    { key: "subtipo", label: "Variante / clase", type: "text" },
    { key: "grupo", label: "Grupo de color", type: "select", options: ["Principal", "Secundario", "De apoyo"] },
    { key: "valor", label: "Valor", type: "text" },
    { key: "funcion", label: "Función / jerarquía", type: "text" },
    { key: "variante", label: "Variante / peso", type: "text" },
    { key: "tamano", label: "Tamaño / interlineado", type: "text" },
    { key: "archivo", label: "Archivo o enlace", type: "text" },
    { key: "arte", label: "Visual generado", type: "text" },
    { key: "usos", label: "Usos correctos", type: "textarea" },
    { key: "evitar", label: "Usos incorrectos", type: "textarea" },
    { key: "descripcion", label: "Descripción", type: "textarea" },
    { key: "justificacion", label: "Justificación", type: "textarea" },
    { key: "estado", label: "Estado", type: "select", options: ["Borrador", "Aprobado", "Requiere revisión"] },
  ],
};

export const designLibraryCollection: CollectionDef = {
  id: "biblioteca", label: "Biblioteca de piezas", singular: "pieza", prefix: "PIE", description: "Entregables con versiones conservadas.", titleKey: "nombre", statusKey: "estado", ownerKey: "responsable", dateKey: "fecha", empty: "La biblioteca todavía no tiene piezas.",
  fields: [
    { key: "nombre", label: "Nombre", type: "text", required: true },
    { key: "categoria", label: "Categoría", type: "select", options: DESIGN_CATEGORIES, required: true },
    { key: "archivo", label: "Archivo o enlace", type: "text", required: true },
    { key: "responsable", label: "Responsable", type: "person" },
    { key: "fecha", label: "Fecha", type: "date" },
    { key: "servicioOrigen", label: "Servicio de origen", type: "text" },
    { key: "pedidoId", label: "Pedido", type: "ref", ref: "trabajos" },
    { key: "contenidoId", label: "Contenido o campaña", type: "text" },
    { key: "campanaId", label: "Campaña", type: "text" },
    { key: "estado", label: "Estado", type: "select", options: ["Borrador", "En revisión", "Cambios pedidos", "Aprobado", "Entregado"] },
    { key: "descripcion", label: "Descripción", type: "textarea" },
  ],
};

export function enhanceDesignRequests(base: CollectionDef): CollectionDef {
  return { ...base, label: "Pedidos de diseño", singular: "pedido", description: "Pedidos de Contenidos, Publicidad Digital, Soporte, Estrategia y equipo interno, con sus recursos y entregas.", fields: [...base.fields,
    { key: "tipoPieza", label: "Tipo de pieza", type: "select", options: DESIGN_CATEGORIES },
    { key: "canal", label: "Canal", type: "text" },
    { key: "medidas", label: "Medidas", type: "text" },
    { key: "materiales", label: "Materiales", type: "textarea" },
    { key: "prioridad", label: "Prioridad", type: "select", options: ["Alta", "Media", "Baja"] },
    { key: "revisor", label: "Revisor", type: "person" },
    { key: "servicioOrigen", label: "Servicio de origen", type: "select", options: ["contenidos", "publicidad-digital", "soporte", "estrategia", "interno"] },
    { key: "contenidoId", label: "Contenido de origen", type: "text" },
    { key: "campanaId", label: "Campaña de origen", type: "text" },
    { key: "comentarios", label: "Comentarios", type: "textarea" },
  ] };
}
