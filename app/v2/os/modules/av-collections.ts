/* Audiovisuales · objeto principal «Jornada» (procedimiento Jornada audiovisual).
 * Los objetos anteriores (producciones, guiones, rodajes, versiones y entregas) siguen
 * registrados en collections.ts y se leen como archivo secundario. */
import { JORNADA_TYPES } from "../providers-catalog";
import { JORNADA_STATES } from "./av-model";
import type { CollectionDef } from "./types";

export const jornadasCollection: CollectionDef = {
  id: "jornadas",
  label: "Jornadas",
  singular: "jornada",
  prefix: "JOR",
  description: "Jornadas audiovisuales: validación de cupo, agenda, brief y guiones, rodaje, edición y cierre.",
  titleKey: "titulo",
  statusKey: "estado",
  ownerKey: "content",
  dateKey: "fecha",
  linkTasks: true,
  empty: "Todavía no hay jornadas.",
  fields: [
    { key: "titulo", label: "Jornada", type: "text", required: true, list: true },
    { key: "tipo", label: "Tipo de jornada", type: "select", options: JORNADA_TYPES, required: true, list: true },
    { key: "proveedor", label: "Proveedor", type: "text", list: true },
    { key: "fecha", label: "Fecha", type: "date", required: true, list: true },
    { key: "drive", label: "Carpeta de Google Drive", type: "text" },
    { key: "brief", label: "Brief", type: "textarea" },
    { key: "estado", label: "Etapa", type: "select", options: JORNADA_STATES, required: true, list: true },
  ],
};
