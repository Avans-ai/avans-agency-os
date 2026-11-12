/* DATOS DE DEMOSTRACIÓN · objetos de trabajo de los módulos.
 * Todo lo que está en este archivo es ficticio: no son campañas, piezas,
 * reuniones ni resultados reales de ACA, EPSA, Edinovo, Grupo Portland o
 * Lider Energy. Se cargan con `source: "demo"` y la interfaz los rotula como
 * «Datos de demostración». Ninguna campaña está conectada a Meta Ads, Google Ads
 * ni LinkedIn Ads. Reemplazar por datos persistidos o integraciones reales. */
import type { ServiceId } from "../os-data";
import type { DemoSeed } from "./types";

type SeedTable = Partial<Record<ServiceId, Record<string, Record<string, DemoSeed[]>>>>;

export const DEMO_SEED_DATE = "2026-10-30T12:00:00.000Z";

export const moduleDemoSeeds: SeedTable = {
  "publicidad-digital": {
    campanas: {
      epsa: [
        { id: "CMP-EPSA-01", nombre: "Line Up · Generación de demanda", objetivo: "Generación de leads", plataforma: "LinkedIn Ads", audiencia: "Compras y mantenimiento industrial · empresas de más de 50 empleados", presupuesto: "2400000", estado: "Activa", responsable: "Martín Ledesma", inicio: "2026-10-12", fin: "2026-12-15", notas: "Campaña principal del lanzamiento. Formulario conectado al CRM del cliente pendiente de la landing (T-145)." },
        { id: "CMP-EPSA-02", nombre: "Line Up · Remarketing de visitantes", objetivo: "Remarketing", plataforma: "Meta Ads", audiencia: "Visitantes de la web y del catálogo en los últimos 30 días", presupuesto: "900000", estado: "Activa", responsable: "Martín Ledesma", inicio: "2026-10-19", fin: "2026-12-15", notas: "" },
        { id: "CMP-EPSA-03", nombre: "Posventa como diferencial", objetivo: "Alcance y reconocimiento", plataforma: "Meta Ads", audiencia: "Jefes de mantenimiento · industria", presupuesto: "600000", estado: "En preparación", responsable: "Valentina Ríos", inicio: "2026-11-16", fin: "2026-12-20", notas: "Surge del benchmark: ningún competidor comunica posventa." },
        { id: "CMP-EPSA-04", nombre: "Búsqueda · Repuestos y servicio técnico", objetivo: "Tráfico", plataforma: "Google Ads", audiencia: "Búsquedas de repuestos y servicio técnico", presupuesto: "700000", estado: "Pausada", responsable: "Martín Ledesma", inicio: "2026-09-14", fin: "2026-12-31", notas: "Pausada hasta tener la landing de Line Up." },
      ],
      aca: [
        { id: "CMP-ACA-01", nombre: "Captación de socios · Meta", objetivo: "Generación de leads", plataforma: "Meta Ads", audiencia: "Potenciales socios de 30 a 55 años con vehículo", presupuesto: "1800000", estado: "Activa", responsable: "Sofía Ramírez", inicio: "2026-09-01", fin: "2026-12-31", notas: "" },
        { id: "CMP-ACA-02", nombre: "Búsqueda · Beneficios para socios", objetivo: "Generación de leads", plataforma: "Google Ads", audiencia: "Búsquedas de asistencia, beneficios y seguros", presupuesto: "1500000", estado: "Activa", responsable: "Sofía Ramírez", inicio: "2026-09-01", fin: "2026-12-31", notas: "" },
        { id: "CMP-ACA-03", nombre: "Turismo de verano", objetivo: "Tráfico", plataforma: "Meta Ads", audiencia: "Socios actuales · familias viajeras", presupuesto: "800000", estado: "Borrador", responsable: "Sofía Ramírez", inicio: "2026-12-01", fin: "2027-02-28", notas: "" },
      ],
      "lider-energy": [
        { id: "CMP-LID-01", nombre: "Captación B2B · Eficiencia energética", objetivo: "Generación de leads", plataforma: "Google Ads", audiencia: "Responsables de energía y plantas industriales", presupuesto: "1200000", estado: "En preparación", responsable: "Martín Ledesma", inicio: "2026-12-01", fin: "2027-03-31", notas: "Se activa después de cerrar medición y CRM." },
      ],
    },
    creatividades: {
      epsa: [
        { id: "CRE-EPSA-01", pieza: "Video demostración 15 s · Line Up", campana: "CMP-EPSA-01", formato: "Video", brief: "Mostrar el producto en uso y el diferencial de confiabilidad en los primeros 3 segundos.", copy: "Line Up: la línea que se elige por confiabilidad.", version: "v2", estado: "En aprobación", feedback: "Marketing pidió subtítulos en todo el video.", responsable: "Tomás Aguirre" },
        { id: "CRE-EPSA-02", pieza: "Carrusel de especificaciones técnicas", campana: "CMP-EPSA-01", formato: "Carrusel", brief: "Comparar especificaciones en lenguaje de compras.", copy: "Cinco datos para comparar antes de comprar.", version: "v3", estado: "Aprobada", feedback: "", responsable: "Tomás Aguirre" },
        { id: "CRE-EPSA-03", pieza: "Anuncio de posventa", campana: "CMP-EPSA-03", formato: "Imagen", brief: "Respuesta técnica y repuestos como diferencial.", copy: "", version: "v1", estado: "Brief", feedback: "", responsable: "Lucía Benítez" },
      ],
      aca: [
        { id: "CRE-ACA-01", pieza: "Anuncio de beneficios con descuento", campana: "CMP-ACA-01", formato: "Imagen", brief: "Beneficio destacado del mes.", copy: "Sumate y accedé a beneficios desde el primer día.", version: "v2", estado: "Cambios pedidos", feedback: "Actualizar la promoción vencida.", responsable: "Lucía Benítez" },
        { id: "CRE-ACA-02", pieza: "Textos de anuncios de búsqueda · beneficios", campana: "CMP-ACA-02", formato: "Texto de búsqueda", brief: "Separar por intención: beneficios, asistencia, turismo.", copy: "Asistencia en ruta 24 h · Beneficios para socios", version: "v1", estado: "Aprobada", feedback: "", responsable: "Sofía Ramírez" },
      ],
    },
    optimizaciones: {
      epsa: [
        { id: "OPT-EPSA-01", hipotesis: "Separar por cargo mejora la calidad del lead", campana: "CMP-EPSA-01", cambioPropuesto: "Dividir el conjunto en Compras y Mantenimiento con mensajes propios", cambioRealizado: "Conjuntos separados y anuncios adaptados", fecha: "2026-10-26", responsable: "Martín Ledesma", resultadoEsperado: "CPL −15 %", resultadoObservado: "CPL −9 % en la primera semana", estado: "En evaluación" },
        { id: "OPT-EPSA-02", hipotesis: "La frecuencia alta en remarketing satura a la audiencia", campana: "CMP-EPSA-02", cambioPropuesto: "Limitar la frecuencia a 3 impresiones por semana", cambioRealizado: "", fecha: "2026-11-02", responsable: "Martín Ledesma", resultadoEsperado: "CTR estable con menor costo", resultadoObservado: "", estado: "Propuesta" },
      ],
      aca: [
        { id: "OPT-ACA-01", hipotesis: "Los mensajes compiten entre públicos", campana: "CMP-ACA-02", cambioPropuesto: "Separar grupos de anuncios por intención", cambioRealizado: "Tres grupos: beneficios, asistencia y turismo", fecha: "2026-10-20", responsable: "Sofía Ramírez", resultadoEsperado: "CPL −10 %", resultadoObservado: "CPL −12 %", estado: "Validada" },
      ],
    },
    aprendizajes: {
      epsa: [
        { id: "APR-EPSA-01", aprendizaje: "Los videos cortos de producto duplican el CTR", evidencia: "Comparación de formatos de julio (demo)", campana: "CMP-EPSA-01", fecha: "2026-07-31", aplicar: "Priorizar video de 15 s en la etapa de descubrimiento." },
      ],
      aca: [
        { id: "APR-ACA-01", aprendizaje: "Las búsquedas de asistencia convierten mejor de noche", evidencia: "Distribución horaria de conversiones de octubre (demo)", campana: "CMP-ACA-02", fecha: "2026-10-28", aplicar: "Ajustar pujas por franja horaria." },
      ],
    },
  },
  contenidos: {
    ejes: {
      epsa: [
        { id: "EJE-EPSA-01", nombre: "Confiabilidad técnica", descripcion: "Casos y especificaciones comparables, en lenguaje de compras.", perfil: "Gerentes de compras industriales", participacion: "40", estado: "Activo" },
        { id: "EJE-EPSA-02", nombre: "Servicio posventa", descripcion: "Respuesta técnica, repuestos y acompañamiento.", perfil: "Jefes de mantenimiento", participacion: "35", estado: "Activo" },
        { id: "EJE-EPSA-03", nombre: "Lanzamiento Line Up", descripcion: "Piezas que acompañan la pauta del lanzamiento.", perfil: "Compras y mantenimiento", participacion: "25", estado: "Activo" },
      ],
      aca: [
        { id: "EJE-ACA-01", nombre: "Beneficios para socios", descripcion: "Beneficios del mes y cómo acceder.", perfil: "Socios actuales", participacion: "45", estado: "Activo" },
        { id: "EJE-ACA-02", nombre: "Asistencia y movilidad", descripcion: "Preguntas frecuentes y uso del servicio.", perfil: "Socios y potenciales socios", participacion: "35", estado: "Activo" },
        { id: "EJE-ACA-03", nombre: "Turismo", descripcion: "Destinos y beneficios de viaje.", perfil: "Familias y viajeros", participacion: "20", estado: "En revisión" },
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
      aca: [
        { id: "IDE-ACA-01", idea: "Serie «Lo que tu credencial incluye»", eje: "EJE-ACA-01", origen: "Resultados", detalle: "Una pieza por beneficio poco conocido.", estado: "Aprobada" },
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
      aca: [
        { id: "PZA-ACA-01", titulo: "Beneficios de noviembre", eje: "EJE-ACA-01", formato: "Carrusel", canal: "Instagram", fecha: "2026-11-05", estado: "Programada", responsable: "Lucía Benítez", brief: "", copy: "", version: "v2", feedback: "", enlace: "" },
        { id: "PZA-ACA-02", titulo: "Reel: asistencia en ruta", eje: "EJE-ACA-02", formato: "Reel", canal: "Instagram", fecha: "2026-10-20", estado: "Publicada", responsable: "Lucía Benítez", brief: "", copy: "", version: "v1", feedback: "", enlace: "Publicación de demostración" },
        { id: "PZA-ACA-03", titulo: "Carrusel · Preguntas frecuentes de asistencia", eje: "EJE-ACA-02", formato: "Carrusel", canal: "Instagram", fecha: "2026-11-09", estado: "En aprobación", responsable: "Lucía Benítez", brief: "Responder las seis consultas más repetidas.", copy: "", version: "v1", feedback: "", enlace: "" },
        { id: "PZA-ACA-04", titulo: "Destinos de verano para socios", eje: "EJE-ACA-03", formato: "Post estático", canal: "Facebook", fecha: "2026-10-27", estado: "Publicada", responsable: "Lucía Benítez", brief: "", copy: "", version: "v1", feedback: "", enlace: "Publicación de demostración" },
        { id: "PZA-ACA-05", titulo: "Historia: cómo pedir auxilio", eje: "EJE-ACA-02", formato: "Historia", canal: "Instagram", fecha: "2026-11-14", estado: "En producción", responsable: "Lucía Benítez", brief: "", copy: "", version: "", feedback: "", enlace: "" },
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
      aca: [
        { id: "APR-ACA-C1", aprendizaje: "Las piezas de asistencia tienen más alcance que las de beneficios", evidencia: "Reel de asistencia en ruta (demo)", eje: "EJE-ACA-02", fecha: "2026-10-30", aplicar: "Usar asistencia como puerta de entrada a beneficios." },
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
  return moduleDemoSeeds[serviceId]?.[collection]?.[clientSlug] ?? [];
}
