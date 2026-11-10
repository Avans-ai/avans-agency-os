/* Avans OS — datos de demostración de la iteración 1 (Claude Design).
 * Reales del brief: los cinco clientes, las cinco áreas y sus subniveles.
 * Todo lo demás (personas, proyectos, tareas, fees, fechas, actividad) es
 * ficticio. No existe base de datos conectada: ver docs/AVANS_OS_REDESIGN.md.
 * Fecha de referencia de la demo: viernes 30 oct 2026. */

export const REFERENCE_DATE_LABEL = "Viernes 30 de octubre";
export const CURRENT_USER = { name: "Nicolás Okro", firstName: "Nicolás", initials: "NO", role: "Administrador" } as const;

export type ClientStatus = "al-dia" | "atencion" | "en-riesgo" | "onboarding" | "pausado";
export type Priority = "Alta" | "Media" | "Baja";
export type TaskStatus = "Por hacer" | "En curso" | "En aprobación" | "Hecho";
/** past = done before; late = vencida; today; week = next 7 days; later. */
export type DueKind = "past" | "late" | "today" | "week" | "later";

export const TASK_STATUSES: TaskStatus[] = ["Por hacer", "En curso", "En aprobación", "Hecho"];
export const PRIORITIES: Priority[] = ["Alta", "Media", "Baja"];

export type Person = { name: string; initials: string; role: string; bubble: string };
export const people: Person[] = [
  { name: "Nicolás Okro", initials: "NO", role: "Dirección", bubble: "Dirección" },
  { name: "Valentina Ríos", initials: "VR", role: "Responsable de cuenta · Estrategia", bubble: "B2B" },
  { name: "Martín Ledesma", initials: "ML", role: "Paid media", bubble: "B2B" },
  { name: "Lucía Benítez", initials: "LB", role: "Contenidos", bubble: "Norte" },
  { name: "Tomás Aguirre", initials: "TA", role: "Diseño", bubble: "B2B" },
  { name: "Julián Paz", initials: "JP", role: "Desarrollo web", bubble: "Sur" },
  { name: "Sofía Ramírez", initials: "SR", role: "Performance", bubble: "Norte" },
];
export function initialsOf(name: string) {
  return people.find(person => person.name === name)?.initials
    ?? name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
}
export function shortName(name: string) {
  const [first, last] = name.split(" ");
  return last ? `${first} ${last[0]}.` : first;
}

/** Servicios que Avans puede contratar con un cliente. Cada servicio contratado
 * activa su módulo en la ficha («Servicios activos»). Etiquetas según el sitio de Avans. */
export type ServiceId =
  | "estrategia" | "diseno-marca" | "publicidad-digital" | "contenidos" | "audiovisuales"
  | "desarrollo-web" | "crm" | "ia-automatizaciones" | "soluciones-graficas" | "mercado-libre";
export type ServiceDef = {
  id: ServiceId;
  label: string;
  icon: "estrategia-y-consultoria" | "diseno-de-marca" | "publicidad-digital" | "contenidos" | "audiovisuales" | "desarrollo-web" | "implementacion-de-crm" | "ia-y-automatizaciones" | "soluciones-graficas" | "mercado-libre";
  /** Existing per-client workspace that already implements this service. */
  workspace?: "contenido" | "campanas";
};
export const serviceCatalog: ServiceDef[] = [
  { id: "estrategia", label: "Estrategia y coordinación", icon: "estrategia-y-consultoria" },
  { id: "diseno-marca", label: "Diseño de marca", icon: "diseno-de-marca" },
  { id: "publicidad-digital", label: "Publicidad digital", icon: "publicidad-digital", workspace: "campanas" },
  { id: "contenidos", label: "Contenidos", icon: "contenidos", workspace: "contenido" },
  { id: "audiovisuales", label: "Audiovisuales", icon: "audiovisuales" },
  { id: "desarrollo-web", label: "Desarrollo web", icon: "desarrollo-web" },
  { id: "crm", label: "Implementación de CRM", icon: "implementacion-de-crm" },
  { id: "ia-automatizaciones", label: "IA y automatizaciones", icon: "ia-y-automatizaciones" },
  { id: "soluciones-graficas", label: "Soluciones gráficas y merchandising", icon: "soluciones-graficas" },
  { id: "mercado-libre", label: "Mercado Libre", icon: "mercado-libre" },
];
export function serviceLabel(id: ServiceId) {
  return serviceCatalog.find(service => service.id === id)?.label ?? id;
}

export type OsClient = {
  slug: string;
  name: string;
  initials: string;
  since: string;
  /** Servicios contratados: definen los módulos activos de la ficha. */
  services: ServiceId[];
  owner: string;
  bubble: string;
  status: ClientStatus;
  nextMilestone: { label: string; date: string; overdue?: boolean };
  /** Comercial data comes from Finanzas; visible for Administrador y Gerencia. */
  feeMonthly: number;
  contractUntil: string;
  context: { text: string; updated: string; objective: string; channels: string; nextMeeting: string };
  team: { name: string; role: string }[];
  contacts: { name: string; role: string }[];
  nextSteps: { title: string; owner: string; due: string }[];
};

export const osClients: OsClient[] = [
  {
    slug: "aca", name: "ACA", initials: "AC", since: "ago 2023",
    services: ["publicidad-digital", "contenidos"], owner: "Sofía Ramírez", bubble: "Norte", status: "al-dia",
    nextMilestone: { label: "Reporte mensual octubre", date: "4 nov" }, feeMonthly: 2450000, contractUntil: "Dic 2026",
    context: { text: "Cuenta de servicios con campañas always-on de captación. El foco del trimestre es bajar el costo por lead sin perder volumen y sostener la grilla de contenidos.", updated: "20 oct por Sofía Ramírez", objective: "Reducir 15 % el costo por lead", channels: "Google · Meta", nextMeeting: "Mié 4 nov · 11:00 · Reporte" },
    team: [{ name: "Sofía Ramírez", role: "Responsable de cuenta · Performance" }, { name: "Lucía Benítez", role: "Contenidos" }],
    contacts: [{ name: "Contacto de marketing", role: "Aprueba piezas y reportes" }],
    nextSteps: [{ title: "Validar reporte mensual de octubre", owner: "Nicolás Okro", due: "4 nov" }, { title: "Ajustar segmentación de la campaña de captación", owner: "Sofía Ramírez", due: "6 nov" }],
  },
  {
    slug: "edinovo", name: "Edinovo", initials: "ED", since: "feb 2025",
    services: ["contenidos", "audiovisuales"], owner: "Lucía Benítez", bubble: "Norte", status: "en-riesgo",
    nextMilestone: { label: "Aprobación de guiones", date: "Vencido 29 oct", overdue: true }, feeMonthly: 2100000, contractUntil: "Feb 2027",
    context: { text: "Serie educativa en video para posicionar la oferta académica. La producción depende de que el cliente apruebe los guiones; la grabación ya está reprogramada una vez.", updated: "28 oct por Lucía Benítez", objective: "Publicar 4 episodios antes de diciembre", channels: "YouTube · Instagram", nextMeeting: "Lun 2 nov · 15:00 · Guiones" },
    team: [{ name: "Lucía Benítez", role: "Responsable de cuenta · Contenidos" }, { name: "Tomás Aguirre", role: "Diseño" }],
    contacts: [{ name: "Contacto institucional", role: "Aprueba guiones" }],
    nextSteps: [{ title: "Dar feedback de guiones de la serie educativa", owner: "Nicolás Okro", due: "Vencida" }, { title: "Reprogramar grabación del episodio 1", owner: "Lucía Benítez", due: "3 nov" }],
  },
  {
    slug: "epsa", name: "EPSA / Line Up", initials: "EP", since: "mar 2024",
    services: ["estrategia", "publicidad-digital", "contenidos"], owner: "Valentina Ríos", bubble: "B2B", status: "atencion",
    nextMilestone: { label: "Lanzamiento campaña Line Up", date: "12 nov" }, feeMonthly: 3200000, contractUntil: "Jun 2027",
    context: { text: "Cuenta B2B con foco en posicionamiento de marca y generación de demanda. Line Up es la línea de producto que se lanza en noviembre: la campaña concentra el esfuerzo del trimestre. El cliente decide por comité; las aprobaciones pasan por Marketing y luego por Dirección Comercial.", updated: "22 oct por Valentina Ríos", objective: "Lanzar Line Up con 300 leads calificados", channels: "LinkedIn · Meta · Web", nextMeeting: "Mar 3 nov · 10:00 · Comité" },
    team: [{ name: "Valentina Ríos", role: "Responsable de cuenta · Estrategia" }, { name: "Martín Ledesma", role: "Paid media" }, { name: "Lucía Benítez", role: "Contenidos" }, { name: "Tomás Aguirre", role: "Diseño" }],
    contacts: [{ name: "Carolina Méndez", role: "Gerenta de Marketing · aprueba piezas" }, { name: "Diego Fernández", role: "Director Comercial · aprueba presupuesto" }],
    nextSteps: [{ title: "Aprobar key visual para destrabar copys y piezas", owner: "Nicolás Okro", due: "Hoy" }, { title: "Presentar plan de pauta en el comité", owner: "Martín Ledesma", due: "3 nov" }, { title: "Cerrar benchmark y sumar hallazgos al brief", owner: "Valentina Ríos", due: "6 nov" }],
  },
  {
    slug: "grupo-portland", name: "Grupo Portland", initials: "GP", since: "jun 2025",
    services: ["estrategia", "desarrollo-web"], owner: "Julián Paz", bubble: "Sur", status: "atencion",
    nextMilestone: { label: "Sitio en staging", date: "8 nov" }, feeMonthly: 1900000, contractUntil: "Mar 2027",
    context: { text: "Rediseño del sitio corporativo con nueva arquitectura de contenidos. El desarrollo está listo para staging; faltan los textos institucionales que debe entregar el cliente.", updated: "27 oct por Julián Paz", objective: "Publicar el sitio nuevo en noviembre", channels: "Web · LinkedIn", nextMeeting: "Jue 5 nov · 16:00 · Estado del sitio" },
    team: [{ name: "Julián Paz", role: "Responsable de cuenta · Desarrollo web" }, { name: "Valentina Ríos", role: "Estrategia" }],
    contacts: [{ name: "Contacto de comunicación", role: "Entrega textos y aprueba el sitio" }],
    nextSteps: [{ title: "Reunión de estado del sitio", owner: "Nicolás Okro", due: "5 nov" }, { title: "Cargar contenidos en staging", owner: "Julián Paz", due: "8 nov" }],
  },
  {
    slug: "lider-energy", name: "Lider Energy", initials: "LE", since: "oct 2026",
    services: ["publicidad-digital", "crm"], owner: "Martín Ledesma", bubble: "B2B", status: "onboarding",
    nextMilestone: { label: "Kickoff de CRM", date: "4 nov" }, feeMonthly: 1650000, contractUntil: "Oct 2027",
    context: { text: "Cuenta nueva en onboarding. Primera etapa: implementar el CRM y conectar los formularios de campañas para medir el embudo completo.", updated: "26 oct por Martín Ledesma", objective: "CRM operativo antes de diciembre", channels: "Google · LinkedIn", nextMeeting: "Mié 4 nov · 09:30 · Kickoff CRM" },
    team: [{ name: "Martín Ledesma", role: "Responsable de cuenta · Paid media" }, { name: "Julián Paz", role: "Integraciones" }],
    contacts: [{ name: "Contacto comercial", role: "Define etapas del embudo" }],
    nextSteps: [{ title: "Revisar propuesta de implementación de CRM", owner: "Nicolás Okro", due: "Hoy" }, { title: "Kickoff de CRM con el equipo comercial", owner: "Martín Ledesma", due: "4 nov" }],
  },
];

export type OsProject = {
  slug: string;
  name: string;
  clientSlug: string;
  owner: string;
  dates: string;
  delivery: string;
  status: ClientStatus;
  /** Used when the project has no tracked tasks in the demo. */
  progress: number;
  alert?: string;
};

export const osProjects: OsProject[] = [
  { slug: "lanzamiento-line-up-2027", name: "Lanzamiento Line Up 2027", clientSlug: "epsa", owner: "Valentina Ríos", dates: "1 oct – 12 nov 2026", delivery: "12 nov 2026", status: "atencion", progress: 58, alert: "1 bloqueo · 2 tareas vencen esta semana" },
  { slug: "contenidos-always-on-q4", name: "Contenidos always-on Q4", clientSlug: "epsa", owner: "Lucía Benítez", dates: "1 oct – 31 dic 2026", delivery: "31 dic 2026", status: "al-dia", progress: 64 },
  { slug: "benchmark-competitivo-2026", name: "Benchmark competitivo 2026", clientSlug: "epsa", owner: "Valentina Ríos", dates: "5 oct – 15 nov 2026", delivery: "15 nov 2026", status: "al-dia", progress: 80 },
  { slug: "serie-educativa-2026", name: "Serie educativa 2026", clientSlug: "edinovo", owner: "Lucía Benítez", dates: "1 sep – 20 nov 2026", delivery: "20 nov 2026", status: "en-riesgo", progress: 41, alert: "Aprobación de guiones vencida · el cliente no responde hace 5 días" },
  { slug: "contenidos-institucionales", name: "Contenidos institucionales", clientSlug: "edinovo", owner: "Lucía Benítez", dates: "1 oct – 31 dic 2026", delivery: "31 dic 2026", status: "al-dia", progress: 35 },
  { slug: "performance-always-on", name: "Performance always-on", clientSlug: "aca", owner: "Sofía Ramírez", dates: "Continuo", delivery: "Mensual", status: "al-dia", progress: 70 },
  { slug: "grilla-de-contenidos-aca", name: "Grilla de contenidos", clientSlug: "aca", owner: "Lucía Benítez", dates: "Continuo", delivery: "Mensual", status: "al-dia", progress: 55 },
  { slug: "sitio-web-corporativo", name: "Sitio web corporativo", clientSlug: "grupo-portland", owner: "Julián Paz", dates: "1 ago – 8 nov 2026", delivery: "Staging 8 nov", status: "atencion", progress: 72, alert: "Faltan textos institucionales del cliente" },
  { slug: "onboarding-crm", name: "Onboarding CRM", clientSlug: "lider-energy", owner: "Martín Ledesma", dates: "15 oct – 15 dic 2026", delivery: "15 dic 2026", status: "onboarding", progress: 10 },
];

export type TaskFile = { name: string; ext: string; meta: string };
export type TaskComment = { who: string; when: string; text: string };
export type TaskActivity = { text: string; when: string };
export type OsTask = {
  id: string;
  projectSlug: string;
  title: string;
  /** Approvals that also count as a personal task in "Mis tareas" carry the task title. */
  approvalTitle?: string;
  owner: string;
  approver?: string;
  prio: Priority;
  due: string;
  dueKind: DueKind;
  status: TaskStatus;
  blocked?: string;
  blockedSince?: string;
  desc: string;
  files: TaskFile[];
  comments: TaskComment[];
  activity: TaskActivity[];
  /** ISO timestamps used by the 30-day archive policy. */
  completedAt?: string;
  archivedAt?: string;
  /** Approval metadata shown on Inicio / Aprobaciones. */
  sentBy?: string;
  sentWhen?: string;
  approvalNote?: string;
};

const task = (t: Partial<OsTask> & Pick<OsTask, "id" | "projectSlug" | "title" | "owner" | "prio" | "due" | "dueKind" | "status" | "desc">): OsTask =>
  ({ files: [], comments: [], activity: [], ...t });

export const osTasks: OsTask[] = [
  task({ id: "T-140", projectSlug: "lanzamiento-line-up-2027", title: "Kickoff con el comité de marketing", owner: "Valentina Ríos", prio: "Media", due: "3 oct", dueKind: "past", status: "Hecho", completedAt: "2026-10-03T15:00:00.000Z", desc: "Presentar objetivos, cronograma y responsables del lanzamiento al comité del cliente.", activity: [{ text: "Valentina Ríos marcó la tarea como Hecho", when: "3 oct" }] }),
  task({ id: "T-141", projectSlug: "lanzamiento-line-up-2027", title: "Mapa de mensajes por segmento", owner: "Valentina Ríos", prio: "Alta", due: "15 oct", dueKind: "past", status: "Hecho", desc: "Definir mensajes clave para cada segmento B2B y validarlos con el cliente.", files: [{ name: "Mapa de mensajes v2", ext: "PDF", meta: "1,2 MB" }], activity: [{ text: "Carolina Méndez (cliente) aprobó la v2", when: "22 oct" }] }),
  task({ id: "T-142", projectSlug: "lanzamiento-line-up-2027", title: "Definir key visual de campaña", approvalTitle: "Aprobar key visual de campaña", owner: "Tomás Aguirre", approver: "Nicolás Okro", prio: "Alta", due: "30 oct", dueKind: "today", status: "En aprobación", sentBy: "Tomás Aguirre", sentWhen: "hace 2 días", approvalNote: "Bloquea T-144",
    desc: "Tres rutas de key visual a partir del mapa de mensajes. Espera la aprobación interna de Nicolás antes de presentarse al cliente el 3 nov.",
    files: [{ name: "Key visual — ruta A", ext: "PNG", meta: "3,4 MB" }, { name: "Key visual — ruta B", ext: "PNG", meta: "3,1 MB" }, { name: "Key visual — ruta C", ext: "PNG", meta: "2,9 MB" }],
    comments: [{ who: "Tomás Aguirre", when: "28 oct", text: "Subí las tres rutas. Recomiendo la A por legibilidad en LinkedIn." }, { who: "Valentina Ríos", when: "29 oct", text: "Coincido con la A. Nicolás, ¿la podés aprobar hoy así Lucía avanza con los copys?" }],
    activity: [{ text: "Tomás Aguirre pidió aprobación a Nicolás Okro", when: "28 oct" }, { text: "Tomás Aguirre subió 3 archivos", when: "28 oct" }, { text: "Tarea creada por Valentina Ríos", when: "16 oct" }] }),
  task({ id: "T-143", projectSlug: "lanzamiento-line-up-2027", title: "Brief de pauta LinkedIn y Meta", owner: "Martín Ledesma", prio: "Alta", due: "30 oct", dueKind: "today", status: "En curso", desc: "Objetivos por etapa, audiencias, presupuesto por canal y calendario de flighting para presentar en el comité del 3 nov.", files: [{ name: "Brief de pauta (borrador)", ext: "DOC", meta: "Drive" }], comments: [{ who: "Martín Ledesma", when: "30 oct", text: "Me falta cerrar el split de presupuesto. Lo tengo al mediodía." }], activity: [{ text: "Martín Ledesma movió la tarea a En curso", when: "30 oct 08:40" }] }),
  task({ id: "T-144", projectSlug: "lanzamiento-line-up-2027", title: "Copys para piezas de lanzamiento", owner: "Lucía Benítez", prio: "Media", due: "4 nov", dueKind: "week", status: "En curso", blocked: "espera la aprobación del key visual (T-142).", blockedSince: "2 días", desc: "Copys para 12 piezas: 6 de LinkedIn, 4 de Meta y 2 banners web. Sumar el ángulo de posventa que surgió del benchmark.", comments: [{ who: "Lucía Benítez", when: "28 oct", text: "Marco como bloqueada hasta tener el key visual: los copys dependen del concepto elegido." }], activity: [{ text: "Lucía Benítez marcó la tarea como bloqueada", when: "28 oct" }] }),
  task({ id: "T-145", projectSlug: "lanzamiento-line-up-2027", title: "Landing de Line Up", owner: "Julián Paz", prio: "Alta", due: "6 nov", dueKind: "week", status: "Por hacer", desc: "Landing con formulario conectado al CRM del cliente. Depende de copys y key visual." }),
  task({ id: "T-146", projectSlug: "lanzamiento-line-up-2027", title: "Configurar píxel y eventos de conversión", owner: "Martín Ledesma", prio: "Media", due: "6 nov", dueKind: "week", status: "Por hacer", desc: "Píxel de Meta, Insight Tag de LinkedIn y eventos del formulario de la landing." }),
  task({ id: "T-147", projectSlug: "lanzamiento-line-up-2027", title: "Calendario de publicaciones de noviembre", owner: "Lucía Benítez", prio: "Baja", due: "10 nov", dueKind: "later", status: "Por hacer", desc: "Calendario orgánico que acompañe la pauta durante las tres semanas de lanzamiento." }),
  task({ id: "T-149", projectSlug: "lanzamiento-line-up-2027", title: "Revisión final del plan de lanzamiento", owner: "Nicolás Okro", prio: "Media", due: "10 nov", dueKind: "later", status: "Por hacer", desc: "Revisión de Dirección antes de salir al aire: piezas, pauta, landing y medición." }),

  task({ id: "T-201", projectSlug: "serie-educativa-2026", title: "Dar feedback de guiones de la serie educativa", owner: "Nicolás Okro", prio: "Alta", due: "29 oct", dueKind: "late", status: "En curso", desc: "Revisar los guiones de los episodios 1 a 4 antes de enviarlos al cliente." }),
  task({ id: "T-202", projectSlug: "serie-educativa-2026", title: "Guiones serie educativa (episodios 1–4)", owner: "Lucía Benítez", approver: "Nicolás Okro", prio: "Alta", due: "29 oct", dueKind: "late", status: "En aprobación", sentBy: "Lucía Benítez", sentWhen: "hace 3 días", approvalNote: "Pendiente de enviar al cliente", desc: "Guiones de los cuatro primeros episodios. Después de la aprobación interna se envían al cliente." }),
  task({ id: "T-203", projectSlug: "serie-educativa-2026", title: "Grabación episodio 1", owner: "Lucía Benítez", prio: "Alta", due: "3 nov", dueKind: "week", status: "Por hacer", blocked: "espera aprobación de guiones del cliente.", blockedSince: "5 días", desc: "Jornada de grabación del primer episodio con el equipo docente." }),
  task({ id: "T-301", projectSlug: "sitio-web-corporativo", title: "Reunión de estado del sitio", owner: "Nicolás Okro", prio: "Baja", due: "5 nov", dueKind: "week", status: "Por hacer", desc: "Revisar avance, staging y textos pendientes con el cliente." }),
  task({ id: "T-302", projectSlug: "sitio-web-corporativo", title: "Carga de contenidos en staging", owner: "Julián Paz", prio: "Media", due: "8 nov", dueKind: "week", status: "En curso", blocked: "faltan textos institucionales del cliente.", blockedSince: "3 días", desc: "Cargar textos e imágenes definitivos en el entorno de staging." }),
  task({ id: "T-303", projectSlug: "sitio-web-corporativo", title: "Mapa del sitio y arquitectura", owner: "Julián Paz", approver: "Valentina Ríos", prio: "Media", due: "2 nov", dueKind: "week", status: "En aprobación", sentBy: "Julián Paz", sentWhen: "ayer", desc: "Estructura de navegación y plantillas de página." }),
  task({ id: "T-401", projectSlug: "performance-always-on", title: "Validar reporte mensual de octubre", owner: "Nicolás Okro", prio: "Media", due: "Mié 4 nov", dueKind: "week", status: "Por hacer", desc: "Revisar lectura ejecutiva y recomendaciones antes de enviarlo al cliente." }),
  task({ id: "T-402", projectSlug: "performance-always-on", title: "Reporte de octubre", owner: "Sofía Ramírez", approver: "Sofía Ramírez", prio: "Media", due: "4 nov", dueKind: "week", status: "En aprobación", sentBy: "Sofía Ramírez", sentWhen: "ayer", desc: "Reporte de resultados del período con recomendaciones." }),
  task({ id: "T-501", projectSlug: "onboarding-crm", title: "Revisar propuesta de implementación de CRM", owner: "Nicolás Okro", prio: "Media", due: "30 oct", dueKind: "today", status: "Por hacer", desc: "Validar etapas, integraciones y cronograma propuestos para el CRM." }),
];

export type ActivityItem = { who: string; text: string; when: string };
export const recentActivity: ActivityItem[] = [
  { who: "Tomás Aguirre", text: "subió 3 versiones del key visual · Lanzamiento Line Up 2027", when: "09:02" },
  { who: "Martín Ledesma", text: "pasó «Brief de pauta LinkedIn y Meta» a En curso", when: "08:40" },
  { who: "Sofía Ramírez", text: "cargó el reporte de octubre de ACA para revisión", when: "Ayer 18:15" },
  { who: "Julián Paz", text: "comentó en «Sitio web corporativo»: faltan textos de Nosotros", when: "Ayer 16:30" },
];

export type NotificationItem = { text: string; strong?: string; when: string; href: string };
export const notifications: NotificationItem[] = [
  { strong: "Tomás Aguirre", text: "te pidió aprobar «Key visual de campaña» · EPSA / Line Up", when: "Hace 2 días", href: "/v2/proyectos/lanzamiento-line-up-2027?task=T-142" },
  { text: "Venció la aprobación de guiones · Edinovo", when: "Ayer", href: "/v2/aprobaciones" },
  { strong: "Lucía Benítez", text: "marcó una tarea como bloqueada · T-144", when: "Hace 2 días", href: "/v2/proyectos/lanzamiento-line-up-2027?task=T-144" },
];

/** Knowledge groups for the Conocimiento tab. Only EPSA is designed in this iteration. */
export type KnowledgeGroup = { title: string; icon: "registro" | "tabla" | "plazo" | "identidad" | "idea"; count: number; source: string; items: { label: string; meta: string }[] };
export const knowledgeByClient: Record<string, KnowledgeGroup[]> = {
  epsa: [
    { title: "Briefs", icon: "registro", count: 3, source: "Google Drive › Clientes › EPSA › Briefs", items: [{ label: "Brief campaña Line Up 2027", meta: "v3 · 22 oct" }, { label: "Brief contenidos Q4", meta: "2 sep" }] },
    { title: "Documentación", icon: "tabla", count: 6, source: "Drive y Monday · contratos, propuestas y alcances", items: [{ label: "Propuesta aprobada 2026", meta: "PDF · mar" }, { label: "Alcance y entregables", meta: "Monday" }] },
    { title: "Reuniones", icon: "plazo", count: 12, source: "Minutas generadas desde Meet · última: 22 oct", items: [{ label: "Comité de marketing — kickoff Line Up", meta: "3 oct" }, { label: "Revisión de mensajes por segmento", meta: "22 oct" }] },
    { title: "Marca", icon: "identidad", count: 4, source: "Manual de marca, logos, tipografías y tono", items: [{ label: "Manual de marca EPSA", meta: "v2 · 2025" }, { label: "Key visual Line Up", meta: "En aprobación" }] },
    { title: "Aprendizajes", icon: "idea", count: 5, source: "Lo que funcionó y lo que no, cargado por el equipo", items: [{ label: "Los videos cortos de producto duplican el CTR", meta: "Jul 2026" }, { label: "Las aprobaciones demoran 4 días hábiles en promedio", meta: "Sep 2026" }] },
  ],
};

/* Estrategia y plan de marketing. Solo EPSA tiene plan cargado en la demo;
 * el resto muestra el estado «plan en preparación». */
export type StrategyPlan = {
  period: string;
  updated: string;
  positioning: string;
  audiences: { name: string; insight: string }[];
  pillars: { title: string; detail: string }[];
  channels: { channel: string; role: string; share: string }[];
  kpis: { label: string; target: string; current: string }[];
  milestones: { when: string; what: string }[];
};
export const strategyByClient: Record<string, StrategyPlan> = {
  epsa: {
    period: "Q4 2026 · Lanzamiento Line Up",
    updated: "22 oct por Valentina Ríos",
    positioning: "Line Up: la línea técnica que se elige por confiabilidad y se sostiene con un servicio posventa que la competencia no comunica.",
    audiences: [
      { name: "Gerentes de compras industriales", insight: "Comparan por costo total y riesgo de parada, no solo por precio." },
      { name: "Jefes de mantenimiento", insight: "Valoran disponibilidad de repuestos y respuesta técnica." },
    ],
    pillars: [
      { title: "Confiabilidad técnica", detail: "Casos y especificaciones comparables, en lenguaje de compras." },
      { title: "Servicio posventa", detail: "Territorio libre detectado en el benchmark: nadie lo comunica." },
      { title: "Lanzamiento con comité", detail: "Piezas y pauta alineadas a las aprobaciones de Marketing y Dirección Comercial." },
    ],
    channels: [
      { channel: "LinkedIn", role: "Generación de demanda B2B", share: "55 %" },
      { channel: "Meta", role: "Alcance y remarketing", share: "25 %" },
      { channel: "Web / landing", role: "Conversión a lead calificado", share: "20 %" },
    ],
    kpis: [
      { label: "Leads calificados", target: "300", current: "Lanzamiento 12 nov" },
      { label: "Costo por lead", target: "≤ USD 45", current: "Sin datos aún" },
      { label: "Tasa de aprobación al primer envío", target: "≥ 70 %", current: "58 % (Q3)" },
    ],
    milestones: [
      { when: "3 nov", what: "Comité: plan de pauta y key visual" },
      { when: "6 nov", what: "Landing y medición listas" },
      { when: "12 nov", what: "Salida al aire de Line Up" },
    ],
  },
};

/* Centro de ideas: iniciativas antes de convertirse en proyecto. */
export type IdeaState = "Nueva" | "En evaluación" | "Aprobada" | "Descartada";
export type Idea = { id: string; clientSlug: string; title: string; detail: string; source: string; author: string; when: string; state: IdeaState };
export const IDEA_STATES: IdeaState[] = ["Nueva", "En evaluación", "Aprobada", "Descartada"];
export const ideas: Idea[] = [
  { id: "I-21", clientSlug: "epsa", title: "Serie de videos cortos de producto Line Up", detail: "Los videos cortos duplicaron el CTR en julio; aplicarlo al lanzamiento.", source: "Aprendizajes", author: "Martín Ledesma", when: "24 oct", state: "En evaluación" },
  { id: "I-22", clientSlug: "epsa", title: "Campaña de posventa como diferencial", detail: "Nadie en la categoría comunica posventa: territorio libre según el benchmark.", source: "Benchmark", author: "Valentina Ríos", when: "21 oct", state: "Aprobada" },
  { id: "I-23", clientSlug: "epsa", title: "Webinar técnico con clientes actuales", detail: "Caso de éxito en vivo para compras industriales.", source: "Reunión de comité", author: "Lucía Benítez", when: "15 oct", state: "Nueva" },
  { id: "I-31", clientSlug: "aca", title: "Landing de captación por segmento", detail: "Separar mensajes para bajar el costo por lead.", source: "Reporte de septiembre", author: "Sofía Ramírez", when: "18 oct", state: "En evaluación" },
];

/* Soporte: pedidos del cliente fuera de los proyectos (cambios, incidencias, consultas). */
export type SupportRequest = { id: string; clientSlug: string; title: string; requester: string; channel: string; opened: string; status: "Abierta" | "En curso" | "Resuelta"; prio: Priority; owner: string };
export const supportRequests: SupportRequest[] = [
  { id: "S-108", clientSlug: "epsa", title: "Actualizar precios en el catálogo PDF", requester: "Carolina Méndez", channel: "Email", opened: "29 oct", status: "En curso", prio: "Media", owner: "Tomás Aguirre" },
  { id: "S-104", clientSlug: "epsa", title: "Acceso al tablero de resultados para Dirección Comercial", requester: "Diego Fernández", channel: "WhatsApp", opened: "26 oct", status: "Abierta", prio: "Alta", owner: "Valentina Ríos" },
  { id: "S-097", clientSlug: "epsa", title: "Corrección de logo en firma de email", requester: "Carolina Méndez", channel: "Email", opened: "14 oct", status: "Resuelta", prio: "Baja", owner: "Tomás Aguirre" },
  { id: "S-110", clientSlug: "aca", title: "Pausar anuncio con promoción vencida", requester: "Contacto de marketing", channel: "Email", opened: "30 oct", status: "Abierta", prio: "Alta", owner: "Sofía Ramírez" },
];
