/* AVANS OS · Propuesta operativa para revisión.
 * Basada únicamente en la reunión del 30/10 y en Marketing Discovery.
 * NO sustituye el manual de procesos del equipo, que todavía no fue accesible.
 * No existen persistencia, integraciones, notificaciones ni aprobación externa. */
export type WorkflowService = "contenidos" | "audiovisuales";
export type StagePhase = { id: string; title: string; goal: string; owner: string; deliverable: string; checks: string[]; gate: string };
export type ServiceProcess = { id: WorkflowService; label: string; scope: string; stages: StagePhase[]; source: string; review: string };
export const serviceProcesses: Record<WorkflowService, ServiceProcess> = {
  contenidos: {
    id: "contenidos",
    label: "Contenidos",
    scope: "Planificación, producción, validación y publicación de contenidos para cada cuenta.",
    source: "Notas reunión Avans 30/10/2026 + Marketing Discovery, módulo Contenidos (ejes temáticos, do's & don'ts y KPIs).",
    review: "Borrador para contrastar con el manual y con las plantillas de Monday. No es un proceso formal validado.",
    stages: [
      {id:"brief",title:"Brief y reglas vigentes",goal:"Entender objetivo, público, temática y restricciones antes de producir.",owner:"Responsable de cuenta / estrategia",deliverable:"Brief de contenidos con fuente y versión",checks:["Objetivo y destinatario identificados","Lineamientos de marca y do's & don'ts revisados","Fuentes y cambios recientes de reuniones consultados"],gate:"No producir sin conocer las reglas del cliente."},
      {id:"plan",title:"Planificación y grilla",goal:"Transformar ejes temáticos en piezas con canal, responsable y fecha.",owner:"Content Manager",deliverable:"Grilla del período para revisión",checks:["Eje temático e ICP asignados","Formato, canal y fecha propuestos","Responsable y recursos definidos"],gate:"La planificación debe apoyarse en el plan MKT."},
      {id:"production",title:"Producción de piezas",goal:"Generar texto, diseño y recursos con control de versiones.",owner:"Contenido / diseño",deliverable:"Piezas y copys versionados",checks:["Copy y recursos completos","Versiones y fuentes identificadas","Revisión de nombres, marcas y formatos"],gate:"No enviar material incompleto como entrega final."},
      {id:"internal",title:"Control de calidad interno",goal:"Comprobar consistencia editorial, visual y de las reglas acordadas.",owner:"Líder de cuenta / revisor",deliverable:"Observaciones y conformidad interna",checks:["Coherencia con tono, mensaje y objetivos","Do's & don'ts comprobados","Correcciones resueltas y versión final definida"],gate:"Si una regla cambió, actualizar el conocimiento antes de aprobar."},
      {id:"approval",title:"Aprobación del cliente",goal:"Registrar feedback y decisión sobre la versión presentada.",owner:"Project Manager / contacto aprobador",deliverable:"Referencia a aprobación o solicitud de cambios",checks:["Versión enviada identificada","Observaciones o conformidad documentadas","Responsable de la decisión identificado"],gate:"No inferir aprobación del cliente a partir de un silencio."},
      {id:"publish",title:"Programación y publicación",goal:"Entregar o publicar sólo piezas autorizadas en el canal correcto.",owner:"Content Manager",deliverable:"URL, canal, fecha y evidencia de publicación",checks:["Versión aprobada vinculada","Canal y fecha verificados","Publicación o entrega registrada"],gate:"No publicar sin evidencia de autorización."},
      {id:"measure",title:"Medición y aprendizaje",goal:"Revisar indicadores y documentar resultados para el siguiente ciclo.",owner:"Responsable de cuenta / analítica",deliverable:"Resultados y aprendizaje del período",checks:["KPIs y fuente registrados","Desvíos o resultados relevantes explicados","Aprendizajes y próximos ajustes propuestos"],gate:"Datos sin fuente no se presentan como resultados confirmados."},
    ]
  },
  audiovisuales: {
    id:"audiovisuales",
    label:"Audiovisuales",
    scope:"Organización de jornadas audiovisuales desde el brief hasta la entrega.",
    source:"Notas reunión Avans 30/10/2026 + Marketing Discovery, módulo Audiovisuales (lineamientos, locaciones, referencias).",
    review:"Borrador para contrastar con el manual del proceso audiovisual. Secuencia propuesta, no política operativa confirmada.",
    stages:[
      {id:"brief",title:"Objetivo, formato y referencias",goal:"Definir para qué se produce, qué se debe contar y a quién.",owner:"Responsable de cuenta / estrategia",deliverable:"Brief audiovisual",checks:["Objetivo y canal de uso identificados","Formato, tono y referencias definidos","Criterios de marca y restricciones revisados"],gate:"No cerrar un guion sin brief confirmado."},
      {id:"preproduction",title:"Preproducción",goal:"Preparar guion, protagonistas, locación, permisos y recursos.",owner:"Producción audiovisual",deliverable:"Guion y checklist de preproducción",checks:["Guion o pauta de rodaje revisados","Locación, protagonistas y vestuario confirmados","Recursos, permisos y responsables definidos"],gate:"Confirmar permisos y disponibilidad antes del rodaje."},
      {id:"schedule",title:"Plan de jornada",goal:"Coordinar agenda, responsables, entregables y contingencias.",owner:"Producción / Project Manager",deliverable:"Agenda de jornada y responsables",checks:["Horario y locaciones coordinados","Roles y equipamiento asignados","Dependencias y plan de respaldo revisados"],gate:"No confirmar jornada con bloqueos críticos pendientes."},
      {id:"shoot",title:"Jornada de rodaje",goal:"Registrar tomas y decisiones de producción para postproducción.",owner:"Equipo audiovisual",deliverable:"Registro de material y tomas",checks:["Material y copias identificados","Tomas útiles y pendientes registrados","Cambios de guion o alcance anotados"],gate:"No asumir material completo sin verificación."},
      {id:"edit",title:"Edición y postproducción",goal:"Construir versiones y preparar audio, gráfica y subtítulos necesarios.",owner:"Edición / diseño",deliverable:"Corte revisable versionado",checks:["Montaje y audio revisados","Identidad visual y tono aplicados","Archivos y versiones identificados"],gate:"La versión de revisión no es una entrega aprobada."},
      {id:"approval",title:"Revisión y aprobación",goal:"Registrar feedback interno y del cliente sobre un corte preciso.",owner:"Project Manager / contacto aprobador",deliverable:"Referencia a conformidad de la versión final",checks:["Versión compartida identificada","Correcciones solicitadas resueltas","Conformidad o aprobación documentada"],gate:"No marcar como final sin conformidad verificable."},
      {id:"delivery",title:"Entrega y distribución",goal:"Preparar formatos y registrar entrega para contenidos y pauta.",owner:"Equipo audiovisual / cuenta",deliverable:"Listado de archivos finales y destinos",checks:["Formatos y resoluciones verificados","Ubicación de archivos y permisos registrados","Entrega y responsables confirmados"],gate:"Conservar trazabilidad de qué versión se entregó."},
    ]
  }
};
export const priorityServiceIds = ["estrategia","diseno-marca","publicidad-digital","contenidos","audiovisuales"] as const;
