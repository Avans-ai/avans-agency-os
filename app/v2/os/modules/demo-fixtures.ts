/* DATOS DE DEMOSTRACIÓN · objetos de trabajo de los módulos.
 * Todo lo que está en este archivo es ficticio: no son campañas, piezas,
 * reuniones ni resultados reales de ACA, EPSA, Edinovo, Grupo Portland o
 * Lider Energy. Se cargan con `source: "demo"` y la interfaz los rotula como
 * «Datos de demostración». Ninguna campaña está conectada a Meta Ads, Google Ads
 * ni LinkedIn Ads. Reemplazar por datos persistidos o integraciones reales. */
import type { ServiceId } from "../os-data";
import type { DemoSeed } from "./types";
import { contentDemoSeedsFor } from "./content-demo";
import { designDemoSeeds } from "./design-demo";
import { paidDemoSeeds } from "./paid-demo";
import { avDemoSeedsFor } from "./av-demo";

type SeedTable = Partial<Record<ServiceId, Record<string, Record<string, DemoSeed[]>>>>;

export const DEMO_SEED_DATE = "2026-10-30T12:00:00.000Z";

export const moduleDemoSeeds: SeedTable = {
  // Publicidad digital (campañas, planes, pedidos de anuncio, landing y atención): paid-demo.ts.
  "publicidad-digital": paidDemoSeeds,
  contenidos: {
    ejes: {
      epsa: [
        { id: "EJE-EPSA-01", nombre: "Confiabilidad técnica", descripcion: "Casos y especificaciones comparables, en lenguaje de compras.", perfil: "Gerentes de compras industriales", participacion: "40", estado: "Activo" },
        { id: "EJE-EPSA-02", nombre: "Servicio posventa", descripcion: "Respuesta técnica, repuestos y acompañamiento.", perfil: "Jefes de mantenimiento", participacion: "35", estado: "Activo" },
        { id: "EJE-EPSA-03", nombre: "Lanzamiento Line Up", descripcion: "Piezas que acompañan la pauta del lanzamiento.", perfil: "Compras y mantenimiento", participacion: "25", estado: "Activo" },
      ],
      edinovo: [
        { id: "EJE-EDI-01", nombre: "Formación aplicable", descripcion: "Contenidos que muestran qué se aprende y para qué sirve.", perfil: "Profesionales", participacion: "60", estado: "Activo" },
        { id: "EJE-EDI-02", nombre: "Especialistas", descripcion: "Docentes y referentes de cada programa.", perfil: "Estudiantes e instituciones", participacion: "40", estado: "Activo" },
      ],
    },
    ideas: {
      epsa: [
        { id: "IDE-EPSA-01", idea: "Webinar técnico con clientes actuales", eje: "EJE-EPSA-01", origen: "Reunión", detalle: "Caso de éxito en vivo para compras industriales.", estado: "Nueva" },
        { id: "IDE-EPSA-02", idea: "Checklist descargable de mantenimiento preventivo", eje: "EJE-EPSA-02", origen: "Benchmark", detalle: "Pieza de valor para jefes de mantenimiento.", estado: "En evaluación" },
      ],
      edinovo: [
        { id: "IDE-EDI-01", idea: "Cápsulas de 60 s por episodio", eje: "EJE-EDI-01", origen: "Equipo", detalle: "Sostener frecuencia mientras se destraba la serie.", estado: "En evaluación" },
      ],
    },
    piezas: {
      epsa: [
        { id: "PZA-EPSA-01", titulo: "Teaser del lanzamiento Line Up", eje: "EJE-EPSA-03", formato: "Video corto", canal: "LinkedIn", fecha: "2026-11-10", estado: "En aprobación", responsable: "Lucía Benítez", brief: "Anticipar el lanzamiento sin mostrar el producto completo.", copy: "Algo nuevo llega a la línea técnica.", version: "v2", feedback: "", enlace: "" },
        { id: "PZA-EPSA-02", titulo: "Carrusel: cinco especificaciones para comparar", eje: "EJE-EPSA-01", formato: "Carrusel", canal: "LinkedIn", fecha: "2026-11-12", estado: "En producción", responsable: "Tomás Aguirre", brief: "", copy: "", version: "v1", feedback: "", enlace: "" },
        { id: "PZA-EPSA-03", titulo: "Caso: respuesta técnica en 24 horas", eje: "EJE-EPSA-02", formato: "Post estático", canal: "LinkedIn", fecha: "2026-11-17", estado: "Brief", responsable: "Lucía Benítez", brief: "Contar un caso de posventa con datos verificables.", copy: "", version: "", feedback: "", enlace: "" },
        { id: "PZA-EPSA-04", titulo: "Demostración de producto", eje: "EJE-EPSA-03", formato: "Reel", canal: "Instagram", fecha: "2026-11-19", estado: "Idea", responsable: "Lucía Benítez", brief: "", copy: "", version: "", feedback: "", enlace: "" },
        { id: "PZA-EPSA-05", titulo: "Detrás de escena de la planta", eje: "EJE-EPSA-01", formato: "Video corto", canal: "LinkedIn", fecha: "2026-10-22", estado: "Publicada", responsable: "Lucía Benítez", brief: "", copy: "", version: "v1", feedback: "", enlace: "Publicación de demostración" },
        { id: "PZA-EPSA-06", titulo: "Guía de repuestos", eje: "EJE-EPSA-02", formato: "Documento LinkedIn", canal: "LinkedIn", fecha: "2026-10-29", estado: "Publicada", responsable: "Lucía Benítez", brief: "", copy: "", version: "v2", feedback: "", enlace: "Publicación de demostración" },
        { id: "PZA-EPSA-07", titulo: "Newsletter de octubre", eje: "EJE-EPSA-01", formato: "Newsletter", canal: "Email", fecha: "2026-10-30", estado: "Publicada", responsable: "Lucía Benítez", brief: "", copy: "", version: "v1", feedback: "", enlace: "Envío de demostración" },
      ],
      edinovo: [
        { id: "PZA-EDI-01", titulo: "Cápsula: introducción al programa", eje: "EJE-EDI-01", formato: "Video corto", canal: "YouTube", fecha: "2026-10-15", estado: "Publicada", responsable: "Lucía Benítez", brief: "", copy: "", version: "v1", feedback: "", enlace: "Publicación de demostración" },
        { id: "PZA-EDI-02", titulo: "Carrusel: programas 2027", eje: "EJE-EDI-02", formato: "Carrusel", canal: "Instagram", fecha: "2026-11-11", estado: "En revisión", responsable: "Tomás Aguirre", brief: "", copy: "", version: "v1", feedback: "", enlace: "" },
        { id: "PZA-EDI-03", titulo: "Clip del episodio 1", eje: "EJE-EDI-01", formato: "Reel", canal: "Instagram", fecha: "2026-11-25", estado: "Idea", responsable: "Lucía Benítez", brief: "Depende de la grabación del episodio 1.", copy: "", version: "", feedback: "", enlace: "" },
      ],
    },
    aprendizajes: {
      epsa: [
        { id: "APR-EPSA-C1", aprendizaje: "Los documentos de LinkedIn generan más guardados que los posts", evidencia: "Guía de repuestos vs. posts de octubre (demo)", eje: "EJE-EPSA-02", fecha: "2026-10-31", aplicar: "Sumar un documento por mes en el eje posventa." },
      ],
    },
  },
  estrategia: {
    prioridades: {
      epsa: [
        { id: "PRI-EPSA-01", iniciativa: "Lanzar Line Up el 12 de noviembre", modulo: "Publicidad digital", horizonte: "Este mes", responsable: "Valentina Ríos", estado: "En curso", detalle: "Piezas, pauta, landing y medición listas antes del comité final." },
        { id: "PRI-EPSA-02", iniciativa: "Consolidar las aprobaciones en un comité único", modulo: "Estrategia y coordinación", horizonte: "Esta semana", responsable: "Valentina Ríos", estado: "Planificada", detalle: "Evita feedback contradictorio entre Marketing y Dirección Comercial." },
        { id: "PRI-EPSA-03", iniciativa: "Incorporar posventa al plan del primer trimestre", modulo: "Contenidos", horizonte: "Trimestre", responsable: "Lucía Benítez", estado: "Planificada", detalle: "" },
      ],
      "grupo-portland": [
        { id: "PRI-POR-01", iniciativa: "Publicar el sitio nuevo en noviembre", modulo: "Desarrollo web", horizonte: "Este mes", responsable: "Julián Paz", estado: "Bloqueada", detalle: "Faltan los textos institucionales." },
        { id: "PRI-POR-02", iniciativa: "Guía de contenidos por unidad", modulo: "Estrategia y coordinación", horizonte: "Este mes", responsable: "Valentina Ríos", estado: "En curso", detalle: "" },
      ],
    },
    reuniones: {
      epsa: [
        { id: "REU-EPSA-01", tema: "Comité de marketing · kickoff Line Up", fecha: "2026-10-03", participantes: "Carolina Méndez, Diego Fernández, Valentina Ríos", acuerdos: "Cronograma y responsables del lanzamiento.", proximosPasos: "Mapa de mensajes por segmento.", estado: "Realizada" },
        { id: "REU-EPSA-02", tema: "Comité: plan de pauta y key visual", fecha: "2026-11-03", participantes: "Comité EPSA, Martín Ledesma, Valentina Ríos", acuerdos: "", proximosPasos: "", estado: "Acta pendiente" },
      ],
      "grupo-portland": [
        { id: "REU-POR-01", tema: "Estado del sitio", fecha: "2026-11-05", participantes: "Contacto de comunicación, Julián Paz", acuerdos: "Publicar staging con contenido marcado.", proximosPasos: "Entrega de textos institucionales.", estado: "Realizada" },
      ],
    },
    decisiones: {
      epsa: [
        { id: "DEC-EPSA-01", decision: "LinkedIn concentra el 55 % de la inversión", fecha: "2026-10-22", motivo: "La demanda B2B se genera mejor en el canal profesional.", impacto: "Publicidad digital", responsable: "Martín Ledesma", estado: "Tomada" },
        { id: "DEC-EPSA-02", decision: "Ruta A del key visual como recomendación de la agencia", fecha: "2026-10-29", motivo: "Mejor legibilidad en LinkedIn.", impacto: "Contenidos · Publicidad digital", responsable: "Valentina Ríos", estado: "Propuesta" },
      ],
      "grupo-portland": [
        { id: "DEC-POR-01", decision: "Publicar staging con contenido marcado", fecha: "2026-11-05", motivo: "Validar estructura y responsive sin esperar todos los textos.", impacto: "Desarrollo web", responsable: "Julián Paz", estado: "Tomada" },
      ],
    },
    riesgos: {
      epsa: [
        { id: "RSG-EPSA-01", riesgo: "La aprobación del key visual demora piezas y copys", tipo: "Bloqueo", probabilidad: "Alta", impacto: "Alto", mitigacion: "Aprobación interna hoy y presentación al comité del 3 nov.", responsable: "Nicolás Okro", estado: "Mitigando" },
        { id: "RSG-EPSA-02", riesgo: "Feedback contradictorio entre Marketing y Dirección Comercial", tipo: "Riesgo", probabilidad: "Media", impacto: "Alto", mitigacion: "Comité único de consolidación.", responsable: "Valentina Ríos", estado: "Abierto" },
      ],
      "grupo-portland": [
        { id: "RSG-POR-01", riesgo: "Textos institucionales pendientes del cliente", tipo: "Dependencia del cliente", probabilidad: "Alta", impacto: "Alto", mitigacion: "Staging con contenido marcado y plantilla por unidad.", responsable: "Julián Paz", estado: "Abierto" },
      ],
    },
  },
  "desarrollo-web": {
    proyectos: {
      "grupo-portland": [
        { id: "WEB-POR-01", nombre: "Sitio web corporativo", tipo: "Sitio institucional", alcance: "Arquitectura nueva, 7 plantillas, formularios y medición.", etapa: "Desarrollo", entorno: "Staging", responsable: "Julián Paz", fechaObjetivo: "2026-11-30", estado: "Bloqueado" },
        { id: "WEB-POR-02", nombre: "Landing de búsquedas laborales", tipo: "Landing", alcance: "Formulario de postulación por unidad.", etapa: "Definición", entorno: "Local", responsable: "Julián Paz", fechaObjetivo: "2026-12-15", estado: "Planificado" },
      ],
    },
    sitemap: {
      "grupo-portland": [
        { id: "PAG-POR-01", pagina: "Inicio", ruta: "/", padre: "", plantilla: "Home", contenido: "Cargado", estado: "Lista" },
        { id: "PAG-POR-02", pagina: "Nosotros", ruta: "/nosotros", padre: "PAG-POR-01", plantilla: "Institucional", contenido: "Pendiente del cliente", estado: "En desarrollo" },
        { id: "PAG-POR-03", pagina: "Unidades de negocio", ruta: "/unidades", padre: "PAG-POR-01", plantilla: "Listado", contenido: "En redacción", estado: "Lista" },
        { id: "PAG-POR-04", pagina: "Unidad operativa", ruta: "/unidades/operativa", padre: "PAG-POR-03", plantilla: "Detalle de unidad", contenido: "Pendiente del cliente", estado: "En desarrollo" },
        { id: "PAG-POR-05", pagina: "Servicios", ruta: "/servicios", padre: "PAG-POR-01", plantilla: "Listado", contenido: "En redacción", estado: "En desarrollo" },
        { id: "PAG-POR-06", pagina: "Trabajá con nosotros", ruta: "/talento", padre: "PAG-POR-01", plantilla: "Formulario", contenido: "Cargado", estado: "En diseño" },
        { id: "PAG-POR-07", pagina: "Contacto", ruta: "/contacto", padre: "PAG-POR-01", plantilla: "Formulario", contenido: "Cargado", estado: "Lista" },
      ],
    },
    requisitos: {
      "grupo-portland": [
        { id: "REQ-POR-01", requisito: "Formulario de contacto con confirmación y aviso por email", tipo: "Funcional", prioridad: "Alta", proyecto: "WEB-POR-01", criterio: "El envío llega al buzón definido y el usuario ve la confirmación.", estado: "En desarrollo" },
        { id: "REQ-POR-02", requisito: "Eventos de conversión en formularios", tipo: "Medición", prioridad: "Alta", proyecto: "WEB-POR-01", criterio: "Cada envío registra un evento con la unidad de negocio.", estado: "Pendiente" },
        { id: "REQ-POR-03", requisito: "Contraste y navegación por teclado nivel AA", tipo: "Accesibilidad", prioridad: "Media", proyecto: "WEB-POR-01", criterio: "Sin errores críticos en la revisión manual.", estado: "Validado" },
      ],
    },
    qa: {
      "grupo-portland": [
        { id: "QA-POR-01", caso: "Menú principal a 390 px", area: "Responsive", dispositivo: "Chrome móvil", resultado: "Aprobado", responsable: "Julián Paz", evidencia: "Captura en staging (demo)", fecha: "2026-10-28" },
        { id: "QA-POR-02", caso: "Formulario de contacto envía y confirma", area: "Formularios", dispositivo: "Chrome escritorio", resultado: "Pendiente", responsable: "Julián Paz", evidencia: "", fecha: "" },
        { id: "QA-POR-03", caso: "Textos institucionales completos", area: "Contenido", dispositivo: "Todos", resultado: "Bloqueado", responsable: "Julián Paz", evidencia: "Faltan textos del cliente.", fecha: "" },
      ],
    },
    publicaciones: {
      "grupo-portland": [
        { id: "REL-POR-01", version: "v0.9", entorno: "Staging", fecha: "2026-10-28", cambios: "Plantillas completas y contenido marcado.", responsable: "Julián Paz", estado: "Publicada" },
      ],
    },
  },
  audiovisuales: {
    producciones: {
      edinovo: [
        { id: "PRD-EDI-01", titulo: "Serie educativa 2026 · cuatro episodios", formato: "Serie", etapa: "Guion", objetivo: "Publicar cuatro episodios antes de diciembre.", responsable: "Lucía Benítez", fechaEntrega: "2026-11-20", estado: "Bloqueada" },
        { id: "PRD-EDI-02", titulo: "Cápsulas de programas 2027", formato: "Cápsula", etapa: "Preproducción", objetivo: "Sostener frecuencia mientras avanza la serie.", responsable: "Tomás Aguirre", fechaEntrega: "2026-12-05", estado: "En curso" },
      ],
    },
    guiones: {
      edinovo: [
        { id: "GUI-EDI-01", titulo: "Episodio 1 · Introducción", produccion: "PRD-EDI-01", version: "v2", estado: "En aprobación", feedback: "Acortar la apertura.", responsable: "Lucía Benítez", enlace: "" },
        { id: "GUI-EDI-02", titulo: "Episodio 2 · Casos aplicados", produccion: "PRD-EDI-01", version: "v1", estado: "En revisión interna", feedback: "", responsable: "Lucía Benítez", enlace: "" },
      ],
    },
    rodajes: {
      edinovo: [
        { id: "ROD-EDI-01", jornada: "Grabación del episodio 1", produccion: "PRD-EDI-01", fecha: "2026-11-03", locacion: "Aula del campus", equipo: "Cámara, sonido y dirección", recursos: "Permiso del campus, dos docentes, kit de luces", estado: "Reprogramado" },
      ],
    },
  },
  crm: {
    trabajos: {
      "lider-energy": [
        { id: "CRM-LID-01", nombre: "Embudo comercial mínimo", etapa: "Relevamiento", responsable: "Martín Ledesma", fechaObjetivo: "2026-11-20", estado: "En curso", detalle: "Validar etapas y responsables con casos reales." },
        { id: "CRM-LID-02", nombre: "Integración de formularios de campañas", etapa: "Integración", responsable: "Julián Paz", fechaObjetivo: "2026-12-10", estado: "Planificado", detalle: "Depende de la validación del embudo y de las UTMs." },
      ],
    },
  },
};

export function demoSeedsFor(clientSlug: string, serviceId: ServiceId, collection: string): DemoSeed[] {
  // Contenidos de ACA (y sus pedidos/versiones de Diseño derivados) viven en content-demo.ts.
  const fromContent = contentDemoSeedsFor(clientSlug, serviceId, collection);
  // Audiovisuales · jornadas de demostración (av-demo.ts).
  if (serviceId === "audiovisuales") { const jornadas = avDemoSeedsFor(clientSlug, collection); if (jornadas) return jornadas; }
  if (serviceId === "diseno-marca") {
    // Diseño de marca: escenario propio (design-demo.ts) + lo derivado de Contenidos, sin duplicar
    // pedidos ni versiones de un mismo contenido (prevalece el derivado del flujo de Contenidos).
    const derived = fromContent ?? [];
    const design = designDemoSeeds[collection]?.[clientSlug] ?? [];
    if (derived.length || design.length) {
      const ids = new Set(derived.map((seed) => seed.id));
      const contents = new Set(derived.map((seed) => seed.contenidoId).filter(Boolean));
      return [...derived, ...design.filter((seed) => !ids.has(seed.id) && !(seed.contenidoId && contents.has(seed.contenidoId)))];
    }
  }
  return fromContent ?? moduleDemoSeeds[serviceId]?.[collection]?.[clientSlug] ?? [];
}
