/* DATOS DE DEMOSTRACIÓN · Contenidos de ACA.
 * Todo lo que está en este archivo es ficticio: planes, ejes, ideas, contenidos, copys,
 * comentarios, pedidos de diseño y versiones sirven para mostrar el proceso editorial
 * mensual de Avans. No son publicaciones, beneficios, datos ni opiniones reales de ACA.
 * Se cargan con `source: "demo"` solo cuando la clave local está vacía y se pueden
 * reiniciar sin tocar los registros manuales (ver content-demo-tasks.ts).
 * El historial de cada contenido se genera ejecutando las mismas acciones del flujo,
 * así las transiciones, versiones y snapshots públicos son coherentes. */
import { addContentComment, applyContentAction, clientRequestValues, recordContentChange, type ClientRequest, type ContentAction, type ContentRole, type ContentTransition } from "./content-workflow";
import { contentDesignValues } from "./content-design";
import { upsertDesignRequest } from "./design-model";
import { CONTENT_DEMO_THUMBS, type ContentDemoThumb } from "./content-demo-thumbs";
import type { DemoSeed, ModuleRecord } from "./types";

export const CONTENT_DEMO_LABEL = "DATOS DE DEMOSTRACIÓN";
export const CONTENT_DEMO_CLIENTS = ["aca"] as const;
const CLIENT = "aca";
const PEOPLE = { content: "Lucía Benítez", pm: "Sofía Ramírez", designer: "Tomás Aguirre", client: "Cliente · ACA", admin: "Nicolás Okro" } as const;
type Actor = keyof typeof PEOPLE;
const at = (stamp: string) => `2026-${stamp}:00.000Z`;
const demoUrl = (slug: string, version: string) => `https://example.com/avans-demo/aca/${slug}-${version}`;
/** La tarea demo T-405 ya existía para el carrusel de preguntas frecuentes: se reutiliza. */
const LEGACY_TASKS: Record<string, string> = { "PZA-ACA-03": "T-405" };
export const contentDemoTaskId = (id: string) => LEGACY_TASKS[id] || `CONTENT-${CLIENT}-${id}`;

/* ───────── Lineamientos editoriales (A) ───────── */
export const CONTENT_DEMO_GUIDELINES: Record<string, Record<string, string>> = {
  aca: {
    objetivos: "Fidelizar socios actuales mostrando beneficios útiles.\nExplicar la asistencia antes de los viajes de verano.\nSostener una presencia constante en Instagram y Facebook.",
    estrategia: "Contenido de servicio primero: cada pieza resuelve una duda concreta y deriva a un beneficio o a la asistencia.",
    tono: "Cercano, claro y tranquilizador. Voseo. Frases cortas, sin tecnicismos ni alarmismo.",
    canales: "Instagram, Facebook, LinkedIn, TikTok, YouTube, Blog, Newsletter",
    frecuencia: "Instagram 3 por semana · Facebook 2 · LinkedIn 1 · TikTok y YouTube 2 por mes · Newsletter mensual",
    formatos: "Carrusel, Reel, Historia, Post estático, Video corto, Artículo, Newsletter, Documento LinkedIn",
    dos: "Mostrar el paso a paso.\nNombrar el beneficio y cómo se accede.\nUsar fotos propias o del banco aprobado.",
    donts: "Prometer tiempos de respuesta.\nUsar precios sin vigencia.\nMostrar patentes o datos personales.",
    kpis: "Alcance, guardados y clics al sitio de beneficios. Se leen desde Metricool cuando esté conectado.",
    restricciones: "Toda promoción requiere validación legal del cliente antes de la aprobación final.",
    referencias: "Guías visuales de servicio con iconografía simple y fondos planos.",
  },
};

/* ───────── Planes, ejes, ideas y aprendizajes ───────── */
const plans: DemoSeed[] = [
  { id: "PLAN-ACA-2026-11", nombre: "Noviembre 2026 — ACA", mes: "2026-11", estado: "En producción", responsable: "Lucía Benítez", objetivos: "Cerrar la serie de asistencia.\nAnticipar beneficios de verano.", tematicas: "Asistencia en ruta, preguntas frecuentes y previa del verano.", ejes: "Asistencia y movilidad · Beneficios para socios", cantidad: "8", canales: "Instagram, Facebook", formatos: "Carrusel, Reel, Historia", fechas: "03/11 propuestas · 10/11 diseño · 24/11 cierre de aprobaciones" },
  { id: "PLAN-ACA-2026-12", nombre: "Diciembre 2026 — ACA", mes: "2026-12", estado: "En producción", responsable: "Lucía Benítez", objetivos: "Aumentar el uso de beneficios de verano entre socios actuales.\nExplicar la asistencia en ruta antes de las vacaciones.\nSostener cuatro publicaciones semanales entre Instagram y Facebook.", tematicas: "Verano, viajes seguros, beneficios del mes y cierre de año con la comunidad de socios.", ejes: "Beneficios para socios · Asistencia y movilidad · Turismo y verano · Seguridad vial · Comunidad de socios", cantidad: "18", canales: "Instagram, Facebook, LinkedIn, TikTok, YouTube, Blog, Newsletter", formatos: "Carrusel, Reel, Historia, Post estático, Video corto, Artículo, Newsletter, Documento LinkedIn", fechas: "18/11 propuestas al cliente · 25/11 cierre de preproducción · 05/12 entregas de diseño · 15/12 aprobaciones finales" },
];
const axes: DemoSeed[] = [
  { id: "EJE-ACA-01", nombre: "Beneficios para socios", plan: "PLAN-ACA-2026-12", descripcion: "Beneficios del mes y cómo acceder desde la credencial digital.", objetivo: "Aumentar el uso de beneficios entre socios actuales.", perfil: "Socios actuales de 30 a 55 años", icp: "Socios activos con vehículo (perfil de demostración)", relacionPlan: "Plan de Marketing (demo): fidelizar socios con beneficios útiles y medibles.", cantidad: "5", participacion: "30", referencias: "Listas con el beneficio destacado y la vigencia visible.", estado: "Activo" },
  { id: "EJE-ACA-02", nombre: "Asistencia y movilidad", plan: "PLAN-ACA-2026-12", descripcion: "Preguntas frecuentes y uso del servicio de asistencia.", objetivo: "Que el socio sepa qué hacer y a quién llamar antes de necesitarlo.", perfil: "Socios y potenciales socios que viajan en auto", icp: "Conductores que viajan en vacaciones (perfil de demostración)", relacionPlan: "Plan de Marketing (demo): usar la asistencia como puerta de entrada a la marca.", cantidad: "5", participacion: "30", referencias: "Tutoriales cortos con paso a paso numerado.", estado: "Activo" },
  { id: "EJE-ACA-03", nombre: "Turismo y verano", plan: "PLAN-ACA-2026-12", descripcion: "Escapadas, destinos y beneficios de viaje para la temporada.", objetivo: "Inspirar viajes cortos que usen beneficios de turismo.", perfil: "Familias y parejas viajeras", icp: "Familias socias que viajan en auto (perfil de demostración)", relacionPlan: "Plan de Marketing (demo): estacionalidad de verano.", cantidad: "3", participacion: "20", referencias: "Mapas simples y fotos de ruta.", estado: "Activo" },
  { id: "EJE-ACA-04", nombre: "Seguridad vial", plan: "PLAN-ACA-2026-12", descripcion: "Hábitos de manejo seguro y preparación del vehículo.", objetivo: "Posicionar a la marca como referente de viajes seguros.", perfil: "Conductores y familias", icp: "", relacionPlan: "Plan de Marketing (demo): contenido de valor no promocional.", cantidad: "3", participacion: "15", referencias: "Checklists descargables y artículos de blog.", estado: "Activo" },
  { id: "EJE-ACA-05", nombre: "Comunidad de socios", plan: "PLAN-ACA-2026-12", descripcion: "Historias del equipo y de socios, con autorización.", objetivo: "Humanizar la marca y reforzar pertenencia.", perfil: "Socios actuales", icp: "", relacionPlan: "Plan de Marketing (demo): reputación y comunidad.", cantidad: "2", participacion: "5", referencias: "Testimonios breves con foto propia.", estado: "En revisión" },
];
const ideas: DemoSeed[] = [
  { id: "IDE-ACA-01", idea: "Serie «Lo que tu credencial incluye»", eje: "EJE-ACA-01", tipo: "Contenido futuro", origen: "Resultados", detalle: "Una pieza por beneficio poco conocido.", estado: "Convertida en pieza", contenidoId: "PZA-ACA-D06" },
  { id: "IDE-ACA-02", idea: "Mapa de escapadas a menos de 300 km", eje: "EJE-ACA-03", tipo: "Oportunidad", origen: "Reunión", detalle: "En la reunión mensual (demo) surgió que muchos socios hacen viajes cortos de fin de semana.", estado: "Convertida en pieza", contenidoId: "PZA-ACA-D12" },
  { id: "IDE-ACA-03", idea: "Video vertical de un día con una grúa de asistencia", eje: "EJE-ACA-02", tipo: "Contenido futuro", origen: "Equipo", detalle: "Formato detrás de escena para TikTok y Reels.", mesSugerido: "2027-01", estado: "En evaluación" },
  { id: "IDE-ACA-04", idea: "Referencia: guía visual de mantenimiento en láminas", eje: "EJE-ACA-04", tipo: "Referencia", origen: "Benchmark", detalle: "Formato de carrusel con iconos grandes y una acción por lámina.", url: "https://example.com/referencia-demo-carrusel", estado: "Nueva" },
  { id: "IDE-ACA-05", idea: "Encuesta en historias: ¿cuál es tu ruta favorita?", eje: "EJE-ACA-03", tipo: "Oportunidad", origen: "Tendencia", detalle: "Genera respuestas para alimentar el eje de turismo.", mesSugerido: "2027-01", estado: "Aprobada" },
  { id: "IDE-ACA-06", idea: "Newsletter con resumen del año para socios", eje: "EJE-ACA-05", tipo: "Contenido futuro", origen: "Cliente", detalle: "Pedido del contacto de marketing (demo) para el cierre de diciembre.", estado: "Aprobada" },
  { id: "IDE-ACA-07", idea: "Checklist imprimible antes de salir a la ruta", eje: "EJE-ACA-04", tipo: "Contenido futuro", origen: "Documento", detalle: "Se puede reutilizar en el blog y como lámina final de carruseles.", mesSugerido: "2027-02", estado: "Nueva" },
  { id: "IDE-ACA-08", idea: "Trend de audio con «cosas que no pueden faltar en el auto»", eje: "EJE-ACA-02", tipo: "Oportunidad", origen: "Tendencia", detalle: "Vigencia corta: evaluar antes de mediados de diciembre.", estado: "Descartada" },
];
const learnings: DemoSeed[] = [
  { id: "APR-ACA-C1", aprendizaje: "Las piezas de asistencia tienen más alcance que las de beneficios", evidencia: "Reel de asistencia en ruta (demo)", eje: "EJE-ACA-02", fecha: "2026-10-30", aplicar: "Usar asistencia como puerta de entrada a beneficios." },
  { id: "APR-ACA-C2", aprendizaje: "Los carruseles con paso a paso se guardan más", evidencia: "Comparación interna de formatos de octubre (demo, sin datos de Metricool)", eje: "EJE-ACA-04", fecha: "2026-11-15", aplicar: "Mantener una lámina final con checklist en los carruseles de diciembre." },
];

/* ───────── Contenidos generados con el flujo real ───────── */
type Step =
  | { a: ContentAction; by: Actor; at: string; note?: string; patch?: Record<string, string> }
  | { a: "edit"; by: Actor; at: string; patch: Record<string, string> }
  | { a: "comment"; by: Actor; at: string; note: string; vis: "client" | "internal" };
type Def = { id: string; slug: string; thumb?: ContentDemoThumb; values: Record<string, string>; requests?: Omit<ClientRequest, "id">[]; steps: Step[] };
const BASE = { responsable: PEOPLE.content, revisor: PEOPLE.pm, disenador: PEOPLE.designer, clienteResponsable: "Contacto de marketing" };
const s = (a: ContentAction, by: Actor, stamp: string, note?: string, patch?: Record<string, string>): Step => ({ a, by, at: stamp, note, patch });
const edit = (by: Actor, stamp: string, patch: Record<string, string>): Step => ({ a: "edit", by, at: stamp, patch });
const say = (by: Actor, stamp: string, note: string, vis: "client" | "internal" = "internal"): Step => ({ a: "comment", by, at: stamp, note, vis });
/** Recorrido habitual hasta la preproducción. */
const toPre = (day: number, approval = "Aprobado. Avancemos."): Step[] => [s("submit", "content", `11-${pad(day)}T10:00`), s("approve-internal", "pm", `11-${pad(day)}T15:30`, "Copy y bajada revisados."), s("approve-preliminary", "client", `11-${pad(day + 1)}T11:00`, approval)];
const pad = (value: number) => String(value).padStart(2, "0");
const pre = (stamp: string, patch: Record<string, string>): Step => edit("content", stamp, patch);

const contents: Def[] = [
  // Noviembre
  { id: "PZA-ACA-01", slug: "beneficios-noviembre", thumb: "verano", values: { plan: "PLAN-ACA-2026-11", titulo: "Beneficios de noviembre", eje: "EJE-ACA-01", idea: "Resumen de beneficios vigentes del mes.", bajada: "Una lámina por beneficio y cómo usarlo.", objetivo: "Recordar beneficios disponibles.", copy: "Tu credencial tiene más beneficios de los que pensás. Deslizá y elegí el tuyo.", cta: "Conocé todos los beneficios", canal: "Instagram", formato: "Carrusel", fecha: "2026-11-05", hora: "10:00" },
    steps: [...toPre(1).map((step) => ({ ...step, at: step.at.replace(/^11-(\d\d)/, "10-$1") })), pre("10-23T10:00", { preIndicaciones: "Plantilla de beneficios con vigencia al pie." }), s("send-to-design", "content", "10-23T12:00"), s("deliver-design", "designer", "10-28T16:00", "Versión lista.", { archivoDiseno: demoUrl("beneficios-noviembre", "v1"), version: "v1" }), s("approve-design", "content", "10-29T10:00"), s("approve-final", "client", "10-30T12:00", "Aprobado."), s("schedule", "content", "11-02T09:00", "Programado en la plataforma del equipo.", { fecha: "2026-11-05", hora: "10:00" })] },
  { id: "PZA-ACA-03", slug: "faq-asistencia", thumb: "faq", values: { plan: "PLAN-ACA-2026-11", titulo: "Carrusel · Preguntas frecuentes de asistencia", eje: "EJE-ACA-02", idea: "Responder las seis consultas más repetidas sobre asistencia.", bajada: "Una pregunta por lámina con respuesta corta.", objetivo: "Reducir dudas antes de pedir auxilio.", mensaje: "Pedir asistencia es simple si sabés estos seis datos.", copy: "¿Qué hago si me quedo sin batería? ¿Cuánto tarda el auxilio? Respondemos tus dudas en 6 láminas.", cta: "Guardalo para tu próximo viaje", canal: "Instagram", formato: "Carrusel", fecha: "2026-11-24", hora: "12:00", brief: "Responder las seis consultas más repetidas." },
    steps: [...toPre(3), pre("11-05T10:00", { preIndicaciones: "Fondo oscuro, número de pregunta grande, respuesta en dos líneas." }), s("send-to-design", "content", "11-05T12:00"), s("deliver-design", "designer", "11-11T17:00", "Seis láminas listas.", { archivoDiseno: demoUrl("faq-asistencia", "v1"), version: "v1" }), s("approve-design", "content", "11-12T10:00", "Ok para enviar.")] },
  { id: "PZA-ACA-05", slug: "historia-auxilio", values: { plan: "PLAN-ACA-2026-11", titulo: "Historia: cómo pedir auxilio", eje: "EJE-ACA-02", idea: "Paso a paso en tres historias.", bajada: "Qué datos tener a mano y por dónde pedir ayuda.", objetivo: "Que el socio sepa cómo pedir auxilio.", copy: "1. Ubicate en un lugar seguro. 2. Tené tu número de socio. 3. Pedí asistencia por el canal oficial.", cta: "Guardá esta historia", canal: "Instagram", formato: "Historia", fecha: "2026-11-26", hora: "19:00" },
    steps: [...toPre(10), pre("11-12T10:00", { preIndicaciones: "Tres historias con número grande y sticker de pregunta al final.", preGuion: "H1 lugar seguro · H2 datos a mano · H3 canal oficial." }), s("send-to-design", "content", "11-12T12:00")] },
  { id: "PZA-ACA-06", slug: "checklist-viaje", thumb: "checklist", values: { plan: "PLAN-ACA-2026-11", titulo: "Reel: checklist antes de viajar", eje: "EJE-ACA-04", idea: "Cinco chequeos rápidos del auto.", bajada: "Un plano por chequeo con texto en pantalla.", objetivo: "Prevenir problemas en la ruta.", copy: "Antes de salir: presión, aceite, luces, agua y documentación. ¿Lo tenés?", cta: "Compartilo con quien viaja con vos", canal: "Instagram", formato: "Reel", fecha: "2026-11-28", hora: "18:00" },
    steps: [...toPre(4), pre("11-06T10:00", { preIndicaciones: "Texto en pantalla grande, ritmo rápido.", preGuion: "Cinco planos de 3 s, cierre con logo." }), s("send-to-design", "content", "11-06T12:00"), s("deliver-design", "designer", "11-12T16:00", "Edición lista.", { archivoDiseno: demoUrl("checklist-viaje", "v1"), version: "v1" }), s("approve-design", "content", "11-13T10:00"), s("approve-final", "client", "11-14T12:00", "Perfecto."), s("schedule", "content", "11-15T09:00", "", { fecha: "2026-11-28", hora: "18:00" })] },
  // Diciembre
  { id: "PZA-ACA-D01", slug: "agenda-verano", thumb: "verano", values: { plan: "PLAN-ACA-2026-12", titulo: "Agenda de beneficios de verano", eje: "EJE-ACA-01", idea: "Abrir diciembre con todos los beneficios de temporada en un solo carrusel.", bajada: "Una lámina por categoría: viajes, gastronomía, combustible y servicios.", objetivo: "Aumentar el uso de beneficios de verano.", mensaje: "Este verano tu credencial viaja con vos.", copy: "Llegó el verano y tu credencial viaja con vos. Deslizá para ver los beneficios de la temporada y guardá este posteo.", cta: "Guardá el carrusel", canal: "Instagram", formato: "Carrusel", fecha: "2026-12-01", hora: "10:00", referencias: "Carrusel de beneficios de noviembre como base.", materialNecesario: "Listado de beneficios con vigencia y logos." },
    requests: [{ type: "Aprobaciones", detail: "Validación legal de bases y condiciones de cada beneficio.", status: "Recibido", responseBy: PEOPLE.client, responseAt: at("11-06T12:00") }],
    steps: [s("submit", "content", "11-03T10:00"), s("approve-internal", "pm", "11-03T16:00", "Bien la apertura."), s("request-changes", "client", "11-04T11:00", "Separemos combustible de servicios y nombremos la vigencia en cada lámina."), edit("content", "11-04T15:00", { bajada: "Una lámina por categoría: viajes, gastronomía, combustible, servicios y vigencias.", copy: "Llegó el verano y tu credencial viaja con vos. Deslizá: cada lámina tiene su beneficio y hasta cuándo está vigente." }), s("resubmit", "content", "11-04T16:00", "Separé categorías y sumé vigencias."), s("approve-internal", "pm", "11-05T09:00"), s("approve-preliminary", "client", "11-05T12:00", "Ahora sí, aprobado."), pre("11-06T10:00", { preIndicaciones: "Portada coral con titular grande. Una categoría por lámina, vigencia al pie en gris.", preWireframe: "L1 portada · L2 viajes · L3 gastronomía · L4 combustible · L5 servicios · L6 cierre con CTA", preMaterial: "Logos de comercios provistos por el cliente.", preRecursos: "Plantilla de carrusel de beneficios", fechaEntregaDiseno: "2026-11-12" }), s("send-to-design", "content", "11-06T12:00"), s("deliver-design", "designer", "11-10T17:00", "Primera versión.", { archivoDiseno: demoUrl("agenda-verano", "v1"), version: "v1" }), s("request-changes", "content", "11-11T10:00", "Subir contraste del texto de vigencia en las láminas claras."), s("resubmit", "designer", "11-11T16:00", "Contraste corregido.", { archivoDiseno: demoUrl("agenda-verano", "v2"), version: "v2" }), s("approve-design", "content", "11-12T09:00"), s("approve-final", "client", "11-13T11:00", "Aprobado para publicar."), s("schedule", "content", "11-14T09:00", "Programado en la plataforma del equipo.", { fecha: "2026-12-01", hora: "10:00" })] },
  { id: "PZA-ACA-D02", slug: "chequeos-ruta", thumb: "ruta", values: { plan: "PLAN-ACA-2026-12", titulo: "Reel: tres chequeos antes de salir a la ruta", eje: "EJE-ACA-02", idea: "Tres chequeos en 20 segundos.", bajada: "Neumáticos, luces y documentación con texto en pantalla.", objetivo: "Prevenir problemas en los viajes de verano.", copy: "Tres chequeos, veinte segundos, cero sorpresas. ¿Los hacés antes de viajar?", cta: "Compartilo con quien maneja", canal: "Instagram", formato: "Reel", fecha: "2026-12-02", hora: "18:00" },
    steps: [...toPre(5), pre("11-07T10:00", { preIndicaciones: "Ritmo rápido, texto en pantalla y audio libre de derechos.", preGuion: "0-5 s neumáticos · 5-12 s luces · 12-20 s documentación y cierre.", preMaterial: "Tomas de archivo del banco aprobado.", fechaEntregaDiseno: "2026-11-12" }), s("send-to-design", "content", "11-07T12:00"), s("deliver-design", "designer", "11-11T18:00", "Edición v1.", { archivoDiseno: demoUrl("chequeos-ruta", "v1"), version: "v1" }), s("approve-design", "content", "11-12T10:00"), s("approve-final", "client", "11-14T10:00", "Excelente."), s("schedule", "content", "11-15T09:30", "", { fecha: "2026-12-02", hora: "18:00" })] },
  { id: "PZA-ACA-D03", slug: "viaje-largo", thumb: "blog", values: { plan: "PLAN-ACA-2026-12", titulo: "Artículo: cómo planificar un viaje largo en auto", eje: "EJE-ACA-04", idea: "Guía de planificación por etapas.", bajada: "Antes, durante y después del viaje.", objetivo: "Atraer tráfico al blog con contenido de valor.", copy: "Planificar un viaje largo empieza mucho antes de cargar el baúl. Te contamos cómo organizarlo en tres etapas.", cta: "Leé la guía completa", canal: "Blog", formato: "Artículo", fecha: "2026-12-03", hora: "09:00" },
    steps: [...toPre(6), pre("11-08T10:00", { preIndicaciones: "Portada horizontal con ilustración simple de ruta." }), s("send-to-design", "content", "11-08T12:00"), s("deliver-design", "designer", "11-13T16:00", "Portada lista.", { archivoDiseno: demoUrl("viaje-largo", "v1"), version: "v1" }), s("approve-design", "content", "11-14T09:00"), s("approve-final", "client", "11-16T12:00", "Aprobado, gracias.")] },
  { id: "PZA-ACA-D04", slug: "equipo-asistencia", thumb: "equipo", values: { plan: "PLAN-ACA-2026-12", titulo: "El equipo detrás de cada auxilio", eje: "EJE-ACA-05", idea: "Presentar a las personas que coordinan la asistencia (sin datos reales).", bajada: "Una foto grupal y un dato del trabajo diario.", objetivo: "Humanizar la marca en LinkedIn.", copy: "Detrás de cada llamado hay un equipo que coordina, acompaña y resuelve. Este verano también está ahí.", cta: "Conocé más sobre la asistencia", canal: "LinkedIn", formato: "Post estático", fecha: "2026-12-04", hora: "11:00" },
    requests: [{ type: "Fotografías", detail: "Foto grupal del equipo de coordinación con autorización de uso.", status: "Recibido", responseBy: PEOPLE.client, responseAt: at("11-10T10:00") }],
    steps: [...toPre(7), pre("11-10T11:00", { preIndicaciones: "Foto a sangre con banda inferior negra y titular blanco.", preMaterial: "Foto grupal enviada por el cliente (demo)." }), s("send-to-design", "content", "11-10T12:00"), s("deliver-design", "designer", "11-16T17:00", "Versión para LinkedIn.", { archivoDiseno: demoUrl("equipo-asistencia", "v1"), version: "v1" }), s("approve-design", "content", "11-17T10:00", "Revisado internamente.")] },
  { id: "PZA-ACA-D05", slug: "encuesta-verano", thumb: "encuesta", values: { plan: "PLAN-ACA-2026-12", titulo: "Historia: ¿a dónde viajás este verano?", eje: "EJE-ACA-03", idea: "Encuesta interactiva de destinos.", bajada: "Cuatro opciones y resultado al día siguiente.", objetivo: "Generar interacción y datos para el eje de turismo.", copy: "¿Mar, sierras, montaña o ciudad? Votá y te mostramos beneficios para tu destino.", cta: "Votá en la encuesta", canal: "Instagram", formato: "Historia", fecha: "2026-12-05", hora: "19:00" },
    steps: [...toPre(8), pre("11-10T10:00", { preIndicaciones: "Fondo coral claro, sticker de encuesta centrado.", preGuion: "H1 pregunta · H2 encuesta · H3 adelanto de beneficios." }), s("send-to-design", "content", "11-10T15:00"), s("deliver-design", "designer", "11-18T16:00", "Tres historias listas.", { archivoDiseno: demoUrl("encuesta-verano", "v1"), version: "v1" }), say("content", "11-19T10:00", "Revisar que el sticker de encuesta no tape el titular.")] },
  { id: "PZA-ACA-D06", slug: "comercios-adheridos", thumb: "comercios", values: { plan: "PLAN-ACA-2026-12", titulo: "Carrusel: beneficios en comercios adheridos", eje: "EJE-ACA-01", ideaId: "IDE-ACA-01", origen: "Resultados", idea: "Serie «Lo que tu credencial incluye»: comercios adheridos de demostración.", bajada: "Seis comercios de ejemplo con su beneficio y vigencia.", objetivo: "Mostrar beneficios poco conocidos.", copy: "Usar tu credencial en comercios adheridos es así de fácil. Mirá los beneficios de diciembre.", cta: "Buscá el comercio más cercano", canal: "Facebook", formato: "Carrusel", fecha: "2026-12-07", hora: "12:00" },
    requests: [{ type: "Información", detail: "Listado de comercios adheridos vigentes en diciembre.", status: "Recibido", responseBy: PEOPLE.client, responseAt: at("11-13T15:00") }, { type: "Fotografías", detail: "Logos de los comercios en alta calidad.", status: "Recibido", responseBy: PEOPLE.client, responseAt: at("11-13T15:00") }],
    steps: [...toPre(12, "Nos gusta. Sumemos los logos."), pre("11-14T10:00", { preIndicaciones: "Grilla 2 × 3 de logos, porcentaje de descuento destacado.", preMaterial: "Logos recibidos del cliente.", preRecursos: "Plantilla de carrusel de beneficios" }), s("send-to-design", "content", "11-14T12:00"), s("deliver-design", "designer", "11-17T16:00", "Primera versión con seis comercios.", { archivoDiseno: demoUrl("comercios-adheridos", "v1"), version: "v1" }), s("approve-design", "content", "11-18T10:00", "Jerarquía correcta."), s("request-changes", "client", "11-19T12:00", "Cambiar la foto de portada y destacar más el porcentaje de descuento.")] },
  { id: "PZA-ACA-D07", slug: "quedarse-en-ruta", values: { plan: "PLAN-ACA-2026-12", titulo: "Video: qué hacer si te quedás en la ruta", eje: "EJE-ACA-02", idea: "Tutorial de un minuto con los pasos de seguridad.", bajada: "Señalizar, ubicarse fuera del auto y pedir asistencia.", objetivo: "Educar sobre seguridad en la ruta.", copy: "Si te quedás en la ruta, lo primero es tu seguridad. Mirá los tres pasos.", cta: "Suscribite para más guías", canal: "YouTube", formato: "Video corto", fecha: "2026-12-09", hora: "17:00" },
    requests: [{ type: "Videos", detail: "Tomas de una unidad de asistencia en ruta.", status: "Recibido", responseBy: PEOPLE.client, responseAt: at("11-12T12:00") }, { type: "Accesos", detail: "Acceso a la carpeta compartida de material audiovisual.", status: "Recibido", responseBy: PEOPLE.client, responseAt: at("11-12T12:00") }],
    steps: [...toPre(9), pre("11-12T15:00", { preIndicaciones: "Placas con números grandes, subtítulos siempre visibles.", preGuion: "Intro 5 s · Paso 1 señalizar · Paso 2 ubicarse en lugar seguro · Paso 3 pedir asistencia · Cierre.", preMaterial: "Tomas provistas por el cliente.", preReferencias: "Tutoriales cortos de seguridad con placas numeradas.", fechaEntregaDiseno: "2026-11-28" }), s("send-to-design", "content", "11-13T10:00")] },
  { id: "PZA-ACA-D08", slug: "newsletter-diciembre", values: { plan: "PLAN-ACA-2026-12", titulo: "Newsletter de diciembre: beneficios y viajes", eje: "EJE-ACA-01", idea: "Resumen mensual para socios.", bajada: "Tres bloques: beneficios, viajes seguros y novedades.", objetivo: "Llevar tráfico al sitio de beneficios.", copy: "Este mes: beneficios para tu verano, una guía para viajar tranquilo y lo que viene en enero.", cta: "Ver beneficios", canal: "Newsletter", formato: "Newsletter", fecha: "2026-12-10", hora: "08:30" },
    requests: [{ type: "Datos", detail: "Beneficios destacados del mes con fechas de vigencia.", status: "Recibido", responseBy: PEOPLE.client, responseAt: at("11-14T10:00") }],
    steps: [...toPre(11), pre("11-14T11:00", { preWireframe: "Cabecera · bloque beneficios · bloque guía · cierre", preReferencias: "Newsletter de noviembre." })] },
  { id: "PZA-ACA-D09", slug: "mitos-auxilio", values: { plan: "PLAN-ACA-2026-12", titulo: "TikTok: tres mitos sobre el auxilio mecánico", eje: "EJE-ACA-02", idea: "Formato mito o verdad con respuestas rápidas.", bajada: "Tres mitos frecuentes y su respuesta.", objetivo: "Llegar a conductores jóvenes.", copy: "¿Mito o verdad? Tres cosas que seguro escuchaste sobre el auxilio.", cta: "Seguinos para más", canal: "TikTok", formato: "Reel", fecha: "2026-12-11", hora: "20:00" },
    requests: [{ type: "Datos", detail: "Tres consultas frecuentes de la mesa de asistencia, sin datos personales.", status: "Pendiente" }, { type: "Videos", detail: "Clips de una unidad de auxilio en servicio, si existen.", status: "Pendiente" }],
    steps: [...toPre(12, "Aprobado. Usemos consultas reales de la mesa."), pre("11-14T10:00", { preIndicaciones: "Formato vertical con placas de mito/verdad.", preGuion: "Mito 1 · Mito 2 · Mito 3 · cierre." }), s("request-information", "content", "11-18T10:00", "Necesitamos las tres consultas frecuentes y, si existen, clips de una unidad en servicio.")] },
  { id: "PZA-ACA-D10", slug: "viajar-con-chicos", values: { plan: "PLAN-ACA-2026-12", titulo: "Carrusel: viajar seguros con chicos", eje: "EJE-ACA-04", idea: "Recomendaciones para viajes largos en familia.", bajada: "Sillas, pausas, entretenimiento y documentación.", objetivo: "Aportar valor a familias viajeras.", mensaje: "Un viaje seguro también es un viaje tranquilo.", copy: "Viajar con chicos es más fácil con un poco de planificación. Te dejamos cinco claves.", cta: "Guardalo para el viaje", canal: "Instagram", formato: "Carrusel", fecha: "2026-12-12", hora: "10:00" },
    requests: [{ type: "Información", detail: "Recomendaciones oficiales que quieran citar sobre sillas infantiles.", status: "Pendiente" }],
    steps: [s("submit", "content", "11-17T10:00"), s("approve-internal", "pm", "11-18T11:00", "Listo para el cliente.")] },
  { id: "PZA-ACA-D11", slug: "testimonio-escapada", values: { plan: "PLAN-ACA-2026-12", titulo: "Testimonio: la primera escapada con la credencial", eje: "EJE-ACA-05", idea: "Historia breve de un socio que usó un beneficio de viaje (con autorización).", bajada: "Cita destacada y foto del socio.", objetivo: "Mostrar beneficios con una voz real.", copy: "«No sabía que podía usar la credencial en el hospedaje.» Así fue la primera escapada de una familia socia.", cta: "Contanos tu escapada", canal: "Facebook", formato: "Post estático", fecha: "2026-12-14", hora: "11:30" },
    requests: [{ type: "Testimonios", detail: "Testimonio breve (3 a 4 líneas) de un socio, con autorización firmada.", status: "Pendiente" }, { type: "Fotografías", detail: "Foto del socio o de la escapada, horizontal y con buena luz.", status: "Pendiente" }, { type: "Aprobaciones", detail: "Confirmar que el beneficio mencionado sigue vigente en diciembre.", status: "Pendiente" }],
    steps: [s("submit", "content", "11-17T12:00"), s("approve-internal", "pm", "11-19T10:00")] },
  { id: "PZA-ACA-D12", slug: "escapadas-300km", values: { plan: "PLAN-ACA-2026-12", titulo: "Reel: escapadas a menos de 300 km", eje: "EJE-ACA-03", ideaId: "IDE-ACA-02", origen: "Reunión", idea: "Tres destinos cercanos para un fin de semana.", bajada: "Distancia, qué hacer y beneficio asociado.", objetivo: "Inspirar viajes cortos con beneficios.", copy: "Tres escapadas a menos de 300 km para este verano.", cta: "Guardá tu próxima escapada", canal: "Instagram", formato: "Reel", fecha: "2026-12-16", hora: "18:30" },
    steps: [s("submit", "content", "11-16T10:00"), s("approve-internal", "pm", "11-17T10:00"), s("request-changes", "client", "11-18T12:00", "Preferimos destinos dentro de la provincia y sumar el beneficio de hospedaje."), edit("content", "11-19T11:00", { bajada: "Tres destinos dentro de la provincia: distancia, qué hacer y beneficio de hospedaje.", copy: "Tres escapadas dentro de la provincia, a menos de 300 km. Y con beneficio de hospedaje para socios." })] },
  { id: "PZA-ACA-D13", slug: "balance-anual", values: { plan: "PLAN-ACA-2026-12", titulo: "Balance del año en asistencia (datos de ejemplo)", eje: "EJE-ACA-02", idea: "Documento con cifras del año provistas por el cliente.", bajada: "Cinco láminas con un dato cada una.", objetivo: "Reputación en LinkedIn.", copy: "Un año acompañando a quienes viajan. Algunos números que nos enorgullecen.", cta: "Leé el documento", canal: "LinkedIn", formato: "Documento LinkedIn", fecha: "2026-12-18", hora: "09:30" },
    requests: [{ type: "Datos", detail: "Cifras anuales validadas por el cliente. No se publican cifras sin validación.", status: "Pendiente" }],
    steps: [s("submit", "content", "11-19T17:00"), say("pm", "11-20T09:30", "Antes de enviarlo al cliente necesitamos las cifras validadas. Dejo el pedido en la ficha.")] },
  { id: "PZA-ACA-D14", slug: "horarios-fiestas", values: { plan: "PLAN-ACA-2026-12", titulo: "Historia: horarios especiales de fiestas", eje: "EJE-ACA-01", idea: "Informar horarios de atención durante las fiestas.", bajada: "Una historia con horarios y canales.", objetivo: "Evitar consultas repetidas.", copy: "", canal: "Instagram", formato: "Historia", fecha: "2026-12-20" }, requests: [{ type: "Información", detail: "Horarios de atención confirmados para el 24, 25 y 31.", status: "Pendiente" }], steps: [] },
  { id: "PZA-ACA-D15", slug: "checklist-valija", values: { plan: "PLAN-ACA-2026-12", titulo: "Checklist: valija, auto y documentación", eje: "EJE-ACA-04", idea: "Lista práctica para guardar.", bajada: "Tres columnas: valija, auto y papeles.", objetivo: "Contenido guardable de servicio.", copy: "Antes de salir, repasá esta lista. Guardala y compartila con quien viaja con vos.", cta: "Guardá la lista", canal: "Instagram", formato: "Carrusel", fecha: "2026-12-22", hora: "10:00" }, steps: [] },
  { id: "PZA-ACA-D16", slug: "fin-de-anio", values: { plan: "PLAN-ACA-2026-12", titulo: "Saludo de fin de año", eje: "EJE-ACA-05", idea: "Saludo institucional con mirada en la comunidad.", bajada: "", objetivo: "Cerrar el año con la comunidad.", copy: "", canal: "Facebook", formato: "Post estático", fecha: "2026-12-27" }, steps: [] },
];

function demoOwner(values: Record<string, string>) {
  const state = values.estado;
  if (["Revisión preliminar del cliente", "Información del cliente", "Aprobación final del cliente"].includes(state)) return "Cliente · ACA";
  if (state === "Producción de diseño" || (state === "Ajustes" && ["Producción de diseño", "Revisión interna del diseño", "Aprobación final del cliente"].includes(values.returnState))) return values.disenador;
  if (state === "Revisión interna de producción") return values.revisor;
  return values.responsable;
}

function buildContent(def: Def): ModuleRecord {
  const created = def.steps[0]?.at ? at(def.steps[0].at.replace(/T.*/, "T09:00")) : at("11-19T09:00");
  const requests = def.requests?.map((item, index) => ({ ...item, id: `REQ-${def.id}-${index + 1}` })) ?? [];
  let record: ModuleRecord = { id: def.id, client: CLIENT, module: "contenidos", collection: "piezas", source: "demo", user: PEOPLE.content, createdAt: created, updatedAt: created, history: [],
    values: { ...BASE, ...def.values, ...clientRequestValues(requests), demo: CONTENT_DEMO_LABEL, estado: "Borrador", tareaId: contentDemoTaskId(def.id) } };
  for (const step of def.steps) {
    const stamp = at(step.at), actor = PEOPLE[step.by];
    if (step.a === "edit") { record = { ...record, user: actor, updatedAt: stamp, values: recordContentChange(record, { ...record.values, ...step.patch }, actor, stamp) }; continue; }
    if (step.a === "comment") { record = addContentComment(record, { actor, at: stamp, text: step.note, visibility: step.vis }); continue; }
    const role: ContentRole = step.by === "client" ? "client" : step.by === "designer" ? "designer" : step.by === "pm" ? "pm" : "content";
    record = applyContentAction(record, step.a, { actor, role, at: stamp, comment: step.note, patch: step.patch, taskId: contentDemoTaskId(def.id) });
    const transitions = JSON.parse(record.values.contentTransitions) as ContentTransition[];
    transitions[transitions.length - 1].responsible = demoOwner(record.values);
    record = { ...record, values: { ...record.values, contentTransitions: JSON.stringify(transitions) } };
  }
  return record;
}

const records = contents.map((def) => ({ def, record: buildContent(def) }));
const toSeed = ({ id, values }: ModuleRecord): DemoSeed => ({ ...values, id });
const legacyPieces: DemoSeed[] = [
  // Publicaciones de octubre en formato anterior: se conservan para mostrar la compatibilidad de lectura.
  { id: "PZA-ACA-02", titulo: "Reel: asistencia en ruta", eje: "EJE-ACA-02", formato: "Reel", canal: "Instagram", fecha: "2026-10-20", estado: "Publicada", responsable: "Lucía Benítez", brief: "", copy: "", version: "v1", feedback: "", enlace: "Publicación de demostración", demo: CONTENT_DEMO_LABEL },
  { id: "PZA-ACA-04", titulo: "Destinos de verano para socios", eje: "EJE-ACA-03", formato: "Post estático", canal: "Facebook", fecha: "2026-10-27", estado: "Publicada", responsable: "Lucía Benítez", brief: "", copy: "", version: "v1", feedback: "", enlace: "Publicación de demostración", demo: CONTENT_DEMO_LABEL },
];

/* Pedidos de Diseño derivados (uno por contenido, id DIS-<contenido>) y versiones en la biblioteca. */
const axisRecord = (id: string) => { const seed = axes.find((item) => item.id === id); return seed ? { id, client: CLIENT, module: "contenidos" as const, collection: "ejes", source: "demo" as const, user: "", createdAt: "", updatedAt: "", history: [], values: seed } : undefined; };
const designStates = ["Producción de diseño", "Revisión interna del diseño", "Aprobación final del cliente", "Aprobado", "Programado", "Ajustes"];
let requests: ModuleRecord[] = [];
for (const { record } of records) {
  const reached = JSON.parse(record.values.contentTransitions || "[]").some((entry: ContentTransition) => entry.action === "send-to-design");
  if (!reached || !designStates.includes(record.values.estado)) continue;
  const sent = (JSON.parse(record.values.contentTransitions) as ContentTransition[]).find((entry) => entry.action === "send-to-design")!;
  const result = upsertDesignRequest(requests, { ...record, values: { ...record.values, disenador: PEOPLE.designer } }, { actor: sent.actor, at: sent.at });
  const state = record.values.estado;
  const estado = ["Aprobado", "Programado"].includes(state) ? "Aprobado" : state === "Producción de diseño" ? "En curso" : state === "Ajustes" ? "Cambios pedidos" : "En aprobación";
  const request = { ...result.request, values: { ...result.request.values, ...contentDesignValues(record, [], axisRecord(record.values.eje)), estado, tareaId: contentDemoTaskId(record.id) } };
  requests = result.records.map((item) => item.id === request.id ? request : item);
}
const library: DemoSeed[] = [];
for (const { def, record } of records) {
  if (!def.thumb) continue;
  const deliveries = (JSON.parse(record.values.contentTransitions || "[]") as ContentTransition[]).filter((entry) => entry.action === "deliver-design" || (entry.action === "resubmit" && entry.to === "Revisión interna del diseño"));
  deliveries.forEach((entry, index) => {
    const version = `v${index + 1}`, last = index === deliveries.length - 1, state = record.values.estado;
    const estado = !last ? "Cambios pedidos" : ["Aprobado", "Programado"].includes(state) ? "Aprobado" : state === "Ajustes" ? "Cambios pedidos" : "En revisión";
    library.push({ id: `PIE-DEMO-${record.id}-${version}`, nombre: record.values.titulo, contenidoId: record.id, pedidoId: `DIS-${record.id}`, servicioOrigen: "contenidos", categoria: record.values.formato === "Carrusel" ? "Carruseles" : ["Reel", "Video corto"].includes(record.values.formato) ? "Videos" : "Redes", archivo: CONTENT_DEMO_THUMBS[def.thumb!], enlace: demoUrl(def.slug, version), versionContenido: version, responsable: PEOPLE.designer, fecha: entry.at.slice(0, 10), estado, piezaId: `PIE-DEMO-${record.id}-v1`, version: String(index + 1), anteriorId: index ? `PIE-DEMO-${record.id}-v${index}` : "", descripcion: `${CONTENT_DEMO_LABEL} · miniatura ficticia` });
  });
}

const CONTENT_DEMO_SEEDS: Record<string, Record<string, Record<string, DemoSeed[]>>> = {
  contenidos: {
    planes: { aca: plans },
    ejes: { aca: axes },
    ideas: { aca: ideas },
    piezas: { aca: [...records.map(({ record }) => toSeed(record)), ...legacyPieces] },
    aprendizajes: { aca: learnings },
  },
  "diseno-marca": {
    trabajos: { aca: requests.map(toSeed) },
    biblioteca: { aca: library },
  },
};

/** Semillas de Contenidos (y sus derivados de Diseño) para los clientes con demo propia; `undefined` si no aplica. */
export function contentDemoSeedsFor(clientSlug: string, serviceId: string, collection: string): DemoSeed[] | undefined {
  return CONTENT_DEMO_SEEDS[serviceId]?.[collection]?.[clientSlug];
}
/** Colecciones que «Reiniciar datos de demostración» vuelve a sembrar. */
export function contentDemoCollections(clientSlug: string) {
  return Object.entries(CONTENT_DEMO_SEEDS).flatMap(([serviceId, collections]) => Object.entries(collections).filter(([, byClient]) => byClient[clientSlug]).map(([collection]) => ({ serviceId, collection })));
}
