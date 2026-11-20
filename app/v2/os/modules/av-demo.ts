/* DATOS DE DEMOSTRACIÓN · Audiovisuales (jornadas) y cupo contratado de jornadas.
 * Jornadas, proveedores, fechas, enlaces de Drive y piezas finales son ficticios.
 * Edinovo tiene Audiovisuales activo; EPSA solo las ve si se activa el módulo como
 * demostración (no se cambian los servicios contratados de ningún cliente).
 * Los enlaces usan carpetas de ejemplo: Google Drive no está conectado. */
import type { JornadaQuota, JornadaState, JornadaTransition } from "./av-model";
import type { DemoSeed } from "./types";

export const AV_DEMO_LABEL = "Datos de demostración";
const QUOTA_AT = "2026-10-01T12:00:00.000Z";

export const AV_DEMO_QUOTAS: Record<string, JornadaQuota> = {
  edinovo: { version: 1, clientSlug: "edinovo", contracted: 6, period: "Trimestre oct–dic 2026", start: "2026-10-01", end: "2026-12-31", source: "demo", updatedAt: QUOTA_AT, updatedBy: "Sistema", history: [{ at: QUOTA_AT, actor: "Sistema", text: "Cupo de demostración: 6 jornadas por trimestre" }] },
  epsa: { version: 1, clientSlug: "epsa", contracted: 2, period: "Trimestre oct–dic 2026", start: "2026-10-01", end: "2026-12-31", source: "demo", updatedAt: QUOTA_AT, updatedBy: "Sistema", history: [{ at: QUOTA_AT, actor: "Sistema", text: "Cupo de demostración: 2 jornadas por trimestre" }] },
};

type Step = [JornadaState, JornadaState, string, string, JornadaTransition["action"], string?];
/** Historial de etapas de la demo, con el mismo formato que genera el flujo real. */
function trail(client: string, id: string, steps: Step[]) {
  return JSON.stringify(steps.map(([from, to, actor, at, action, responsible], index) => ({ id: `JTR-DEMO-${id}-${index + 1}`, from, to, action, actor, at, comment: "", responsible: responsible || actor, taskId: `AV-${client}-${id}` })));
}
const drive = (slug: string) => `https://drive.google.com/drive/folders/demo-${slug}`;
const team = { pm: "Lucía Benítez", content: "Lucía Benítez", disenador: "Tomás Aguirre", creadaPor: "Lucía Benítez" };

const edinovo: DemoSeed[] = [
  {
    id: "JOR-EDI-01", titulo: "Cápsulas de programas 2027", tipo: "Institucional", proveedorId: "PRV-LUMEN", proveedor: "Lumen Audiovisual", fecha: "2026-10-14", horario: "09:00", locacion: "Estudio del proveedor",
    drive: drive("edinovo-capsulas"), brief: "Tres cápsulas de 40 s que presentan los programas 2027 con docentes como voceros.", guion: "Apertura con pregunta, testimonio docente y cierre con inscripción abierta.", planRodaje: "Set con dos cámaras y luz controlada. Tres docentes en bloques de 40 minutos.",
    estado: "Cerrada", ...team, validadaAt: "2026-10-02T13:00:00.000Z", validadaPor: "Lucía Benítez", agendaConfirmadaAt: "2026-10-03T13:00:00.000Z", briefEnviadoAt: "2026-10-08T13:00:00.000Z", materialSubidoAt: "2026-10-14T21:00:00.000Z", fechaLimiteEdicion: "2026-10-17",
    edicionSubidaAt: "2026-10-17T15:00:00.000Z", edicionVersion: "v1", contentValidadaAt: "2026-10-18T13:00:00.000Z", disenoEntregadoAt: "2026-10-21T13:00:00.000Z", finalUrl: "https://example.com/demo/edinovo-capsulas-final", clienteAprobadaAt: "2026-10-23T13:00:00.000Z", cerradaAt: "2026-10-23T13:00:00.000Z",
    jornadaTransitions: trail("edinovo", "JOR-EDI-01", [["Validación", "Agenda", "Lucía Benítez", "2026-10-02T13:00:00.000Z", "validate"], ["Agenda", "Brief y guiones", "Lucía Benítez", "2026-10-03T13:00:00.000Z", "confirm-agenda"], ["Brief y guiones", "Rodaje", "Lucía Benítez", "2026-10-08T13:00:00.000Z", "send-brief", "Lumen Audiovisual"], ["Rodaje", "Edición", "Lumen Audiovisual", "2026-10-14T21:00:00.000Z", "mark-raw"], ["Edición", "Validación de Content", "Lumen Audiovisual", "2026-10-17T15:00:00.000Z", "mark-edit", "Lucía Benítez"], ["Validación de Content", "Subtítulos y motion", "Lucía Benítez", "2026-10-18T13:00:00.000Z", "approve-edit", "Tomás Aguirre"], ["Subtítulos y motion", "Aprobación del cliente", "Tomás Aguirre", "2026-10-21T13:00:00.000Z", "deliver-design", "Cliente · Edinovo"], ["Aprobación del cliente", "Cerrada", "Contacto institucional", "2026-10-23T13:00:00.000Z", "client-approve", "Lucía Benítez"]]),
  },
  {
    id: "JOR-EDI-02", titulo: "Serie educativa · grabación del episodio 1", tipo: "Institucional", proveedorId: "PRV-KINETICA", proveedor: "Kinética Films", fecha: "2026-11-17", horario: "10:00", locacion: "Aula magna del campus",
    drive: drive("edinovo-episodio-1"), brief: "Episodio 1 de la serie educativa: introducción al programa con dos docentes y un alumno.", guion: "Guion v2 aprobado por el cliente: apertura breve, bloque de docentes, cierre con llamado a inscripción.", planRodaje: "Dos cámaras, sonido corbatero, permiso del campus confirmado. Rodaje de 10 a 14 h.",
    estado: "Edición", ...team, validadaAt: "2026-11-04T13:00:00.000Z", validadaPor: "Lucía Benítez", agendaConfirmadaAt: "2026-11-06T13:00:00.000Z", briefEnviadoAt: "2026-11-10T13:00:00.000Z", materialSubidoAt: "2026-11-18T20:00:00.000Z", fechaLimiteEdicion: "2026-11-21",
    jornadaTransitions: trail("edinovo", "JOR-EDI-02", [["Validación", "Agenda", "Lucía Benítez", "2026-11-04T13:00:00.000Z", "validate"], ["Agenda", "Brief y guiones", "Lucía Benítez", "2026-11-06T13:00:00.000Z", "confirm-agenda"], ["Brief y guiones", "Rodaje", "Lucía Benítez", "2026-11-10T13:00:00.000Z", "send-brief", "Kinética Films"], ["Rodaje", "Edición", "Kinética Films", "2026-11-18T20:00:00.000Z", "mark-raw", "Kinética Films"]]),
    jornadaComments: JSON.stringify([{ id: "JCM-DEMO-EDI-02-1", actor: "Lucía Benítez", at: "2026-11-10T13:05:00.000Z", text: "Priorizar planos de los docentes: el cliente pidió una apertura corta.", visibility: "provider", stage: "Brief y guiones" }, { id: "JCM-DEMO-EDI-02-2", actor: "Lucía Benítez", at: "2026-11-11T13:00:00.000Z", text: "Nota interna: el cliente demoró la aprobación del guion 5 días; no repetir el retraso en el episodio 2.", visibility: "internal", stage: "Brief y guiones" }]),
  },
  {
    id: "JOR-EDI-03", titulo: "Testimonios de alumnos", tipo: "UGC", proveedorId: "PRV-BRUMA", proveedor: "Estudio Bruma", fecha: "2026-11-27", horario: "15:00", locacion: "Campus · patio central",
    drive: drive("edinovo-testimonios"), brief: "Cuatro testimonios verticales de alumnos de primer año, en formato nativo de redes.",
    estado: "Brief y guiones", ...team, validadaAt: "2026-11-12T13:00:00.000Z", validadaPor: "Lucía Benítez", agendaConfirmadaAt: "2026-11-14T13:00:00.000Z",
    jornadaTransitions: trail("edinovo", "JOR-EDI-03", [["Validación", "Agenda", "Lucía Benítez", "2026-11-12T13:00:00.000Z", "validate"], ["Agenda", "Brief y guiones", "Lucía Benítez", "2026-11-14T13:00:00.000Z", "confirm-agenda"]]),
  },
  {
    id: "JOR-EDI-04", titulo: "Cobertura · Expo Educación 2026", tipo: "Cobertura de evento", proveedorId: "PRV-KINETICA", proveedor: "Kinética Films", fecha: "2026-11-06", horario: "11:00", locacion: "Predio ferial",
    drive: drive("edinovo-expo"), brief: "Resumen de 60 s del stand y entrevistas cortas a visitantes.", guion: "Estructura: llegada, stand, tres entrevistas, cierre con dato de visitas.", planRodaje: "Una cámara en mano y una fija en el stand. Entrevistas de 11 a 13 h.",
    estado: "Aprobación del cliente", ...team, validadaAt: "2026-10-27T13:00:00.000Z", validadaPor: "Lucía Benítez", agendaConfirmadaAt: "2026-10-28T13:00:00.000Z", briefEnviadoAt: "2026-11-02T13:00:00.000Z", materialSubidoAt: "2026-11-06T22:00:00.000Z", fechaLimiteEdicion: "2026-11-09",
    edicionSubidaAt: "2026-11-09T14:00:00.000Z", edicionVersion: "v1", contentValidadaAt: "2026-11-11T13:00:00.000Z", disenoEntregadoAt: "2026-11-18T13:00:00.000Z", finalUrl: "https://example.com/demo/edinovo-expo-final",
    jornadaTransitions: trail("edinovo", "JOR-EDI-04", [["Validación", "Agenda", "Lucía Benítez", "2026-10-27T13:00:00.000Z", "validate"], ["Agenda", "Brief y guiones", "Lucía Benítez", "2026-10-28T13:00:00.000Z", "confirm-agenda"], ["Brief y guiones", "Rodaje", "Lucía Benítez", "2026-11-02T13:00:00.000Z", "send-brief", "Kinética Films"], ["Rodaje", "Edición", "Kinética Films", "2026-11-06T22:00:00.000Z", "mark-raw", "Kinética Films"], ["Edición", "Validación de Content", "Kinética Films", "2026-11-09T14:00:00.000Z", "mark-edit", "Lucía Benítez"], ["Validación de Content", "Subtítulos y motion", "Lucía Benítez", "2026-11-11T13:00:00.000Z", "approve-edit", "Tomás Aguirre"], ["Subtítulos y motion", "Aprobación del cliente", "Tomás Aguirre", "2026-11-18T13:00:00.000Z", "deliver-design", "Cliente · Edinovo"]]),
  },
  {
    id: "JOR-EDI-05", titulo: "Kit de bienvenida 2027", tipo: "Producto", proveedorId: "PRV-LUMEN", proveedor: "Lumen Audiovisual", fecha: "2026-12-10",
    drive: drive("edinovo-kit"), brief: "", estado: "Validación", ...team, solicitadaAt: "2026-11-19T13:00:00.000Z",
  },
  {
    id: "JOR-EDI-06", titulo: "Recorrido por el campus", tipo: "Institucional", proveedorId: "PRV-KINETICA", proveedor: "Kinética Films", fecha: "2026-11-19", horario: "09:30", locacion: "Campus · edificio central",
    drive: drive("edinovo-recorrido"), brief: "Recorrido de 90 s por aulas, laboratorios y biblioteca para la campaña de inscripción.", guion: "Plano secuencia de ingreso, tres espacios con texto en pantalla y cierre con logo.",
    estado: "Rodaje", ...team, validadaAt: "2026-11-05T13:00:00.000Z", validadaPor: "Lucía Benítez", agendaConfirmadaAt: "2026-11-07T13:00:00.000Z", briefEnviadoAt: "2026-11-13T13:00:00.000Z",
    jornadaTransitions: trail("edinovo", "JOR-EDI-06", [["Validación", "Agenda", "Lucía Benítez", "2026-11-05T13:00:00.000Z", "validate"], ["Agenda", "Brief y guiones", "Lucía Benítez", "2026-11-07T13:00:00.000Z", "confirm-agenda"], ["Brief y guiones", "Rodaje", "Lucía Benítez", "2026-11-13T13:00:00.000Z", "send-brief", "Kinética Films"]]),
  },
];

const epsaTeam = { pm: "Valentina Ríos", content: "Lucía Benítez", disenador: "Tomás Aguirre", creadaPor: "Valentina Ríos" };
const epsa: DemoSeed[] = [
  { id: "JOR-EPSA-01", titulo: "Line Up · producto en uso", tipo: "Producto", proveedorId: "PRV-LUMEN", proveedor: "Lumen Audiovisual", fecha: "2026-12-03", drive: drive("epsa-line-up"), brief: "Planos de producto en uso para anuncios del lanzamiento.", estado: "Validación", ...epsaTeam, solicitadaAt: "2026-11-19T13:00:00.000Z" },
  {
    id: "JOR-EPSA-02", titulo: "Testimonio de cliente industrial", tipo: "UGC", proveedorId: "PRV-BRUMA", proveedor: "Estudio Bruma", fecha: "2026-11-26", horario: "10:00", locacion: "Planta del cliente",
    drive: drive("epsa-testimonio"), brief: "Testimonio vertical de un jefe de mantenimiento sobre la posventa.", estado: "Agenda", ...epsaTeam, validadaAt: "2026-11-16T13:00:00.000Z", validadaPor: "Valentina Ríos",
    jornadaTransitions: trail("epsa", "JOR-EPSA-02", [["Validación", "Agenda", "Valentina Ríos", "2026-11-16T13:00:00.000Z", "validate"]]),
  },
];

const SEEDS: Record<string, Record<string, DemoSeed[]>> = { jornadas: { edinovo, epsa } };

/** Semillas de Audiovisuales (solo jornadas): null cuando la colección no tiene demo propia. */
export function avDemoSeedsFor(clientSlug: string, collection: string): DemoSeed[] | null {
  return SEEDS[collection]?.[clientSlug] ?? null;
}
