/* DATOS DE DEMOSTRACIÓN · Publicidad digital (Funcionalidades 2).
 * Campañas, planes, pedidos de anuncio, landing y atención de ACA y EPSA (y la
 * campaña en preparación de Lider Energy). Todo es ficticio: no son campañas,
 * piezas ni resultados reales. Ninguna plataforma (Meta Ads, Google Ads, TikTok
 * Ads, ChatGPT Ads ni LinkedIn Ads) está conectada: las métricas salen de
 * reports/demo-fixtures.ts y se rotulan «Datos de demostración».
 * Los ids de ICP, segmentos y productos (icp-buyers, segment-companies,
 * offering-0/1) apuntan a la semilla del Marketing Discovery de EPSA. */
import type { DemoSeed } from "./types";

type Seeds = Record<string, Record<string, DemoSeed[]>>;
const json = (value: unknown) => JSON.stringify(value);
const comment = (actor: string, at: string, text: string, version: number, stage: string, kind: "comentario" | "devolucion" | "aprobacion") => ({ id: `COM-DEMO-${at.replace(/\D/g, "").slice(0, 10)}-${version}`, actor, at, text, version, stage, kind });

export const PAID_DEMO_LABEL = "Datos de demostración";
/** Referencia temporal de las métricas demo: noviembre de 2026, día 20, última semana con datos 2–8 nov. */
export const PAID_DEMO_MONTH = { label: "Noviembre 2026", day: 20, days: 30, weekLabel: "Semana del 2 nov", previousWeekLabel: "Semana del 26 oct" } as const;

/** Objetivos semanales de demostración (se reemplazan por los KPIs del Plan de Marketing cuando existan). */
export const PAID_DEMO_TARGETS: Record<string, { cpl: number; leads: number; ctr: number; conversions: number }> = {
  aca: { cpl: 5500, leads: 140, ctr: 1.6, conversions: 70 },
  epsa: { cpl: 20000, leads: 45, ctr: 1, conversions: 12 },
  "lider-energy": { cpl: 25000, leads: 20, ctr: 1, conversions: 6 },
};

/** Eficiencia relativa de leads por canal para repartir las métricas demo (no es un dato de plataforma). */
export const PAID_DEMO_CHANNEL_EFFICIENCY: Record<string, number> = { "Meta Ads": 1, "Google Ads": 1.2, "TikTok Ads": 0.8, "ChatGPT Ads": 0.7, "LinkedIn Ads": 0.9 };

export const paidDemoSeeds: Seeds = {
  campanas: {
    epsa: [
      { id: "CMP-EPSA-01", nombre: "Line Up · Generación de demanda", objetivo: "Generación de leads", plataforma: "LinkedIn Ads", audiencia: "Compras y mantenimiento industrial · empresas de más de 50 empleados", presupuesto: "2400000", estado: "Activa", responsable: "Martín Ledesma", inicio: "2026-10-12", fin: "2026-12-15", notas: "Campaña principal del lanzamiento. Formulario conectado al CRM del cliente pendiente de la landing (T-145).",
        planEstado: "Aprobada", pasoPlan: "7", aprobadoPor: "Valentina Ríos", aprobadoEn: "2026-10-08T15:00:00.000Z", icpIds: "icp-buyers,icp-commercial", segmentoIds: "segment-companies", productoIds: "offering-0", presupuestoMensual: "2400000",
        canales: json({ "LinkedIn Ads": 55, "Meta Ads": 25, "Google Ads": 20 }), enfoque: "Confiabilidad técnica comparable: especificaciones y entrega en plazo, en lenguaje de compras.", mensaje: "Line Up: la línea que se elige por confiabilidad.", funnel: "Descubrimiento,Retargeting,Conversión",
        metaAds: "Conjunto de remarketing a visitantes del catálogo · video 15 s y carrusel de especificaciones.", googleAds: "Búsqueda de marca y genéricas de línea industrial · anuncios responsivos.", otrosCanales: "LinkedIn Ads: Compras y Mantenimiento por cargo, con formulario nativo.",
        landing: "Landing Line Up con ficha técnica descargable y formulario de contacto comercial.", estimuloWhatsapp: "Respuesta del equipo comercial en el día hábil.", estimuloCrm: "Alta del lead en el CRM con etapa «Contacto inicial» y tarea al vendedor.", estimuloEmail: "Secuencia de 3 emails: ficha técnica, caso de cliente y propuesta de visita.",
        planComentarios: json([comment("Valentina Ríos", "2026-10-08T15:00:00.000Z", "Planificación aprobada en comité.", 1, "En validación del PM", "aprobacion")]) },
      { id: "CMP-EPSA-02", nombre: "Line Up · Remarketing de visitantes", objetivo: "Remarketing", plataforma: "Meta Ads", audiencia: "Visitantes de la web y del catálogo en los últimos 30 días", presupuesto: "900000", estado: "Activa", responsable: "Martín Ledesma", inicio: "2026-10-19", fin: "2026-12-15", notas: "",
        planEstado: "Aprobada", pasoPlan: "7", aprobadoPor: "Valentina Ríos", aprobadoEn: "2026-10-16T13:00:00.000Z", icpIds: "icp-buyers", segmentoIds: "segment-companies", productoIds: "offering-0,offering-1", presupuestoMensual: "700000",
        canales: json({ "Meta Ads": 80, "Google Ads": 20 }), enfoque: "Recordar el diferencial a quien ya visitó el catálogo, con casos de posventa.", mensaje: "Volvé a ver por qué Line Up no frena tu planta.", funnel: "Retargeting",
        metaAds: "Audiencia personalizada de visitantes 30 días · frecuencia máxima 3 por semana.", googleAds: "Display de remarketing con banner de ficha técnica.", landing: "Misma landing de Line Up.", estimuloWhatsapp: "", estimuloCrm: "Marca de «retargeting» en el lead.", estimuloEmail: "" },
      { id: "CMP-EPSA-03", nombre: "Posventa como diferencial", objetivo: "Alcance y reconocimiento", plataforma: "Meta Ads", audiencia: "Jefes de mantenimiento · industria", presupuesto: "600000", estado: "En preparación", responsable: "Valentina Ríos", inicio: "2026-11-16", fin: "2026-12-20", notas: "Surge del benchmark: ningún competidor comunica posventa.",
        planEstado: "En validación del PM", pasoPlan: "7", enviadoEn: "2026-11-18T14:00:00.000Z", icpIds: "icp-buyers", segmentoIds: "segment-companies", productoIds: "offering-1", presupuestoMensual: "400000",
        canales: json({ "Meta Ads": 60, "Google Ads": 25, "ChatGPT Ads": 15 }), enfoque: "Mostrar la respuesta técnica en 24 horas como prueba de confiabilidad.", mensaje: "Cuando algo falla, respondemos en 24 horas.", funnel: "Descubrimiento,Retargeting",
        metaAds: "Video de caso real + placa de dato «respuesta en 24 h».", googleAds: "Búsquedas de servicio técnico y repuestos.", otrosCanales: "ChatGPT Ads: prueba acotada en consultas de mantenimiento preventivo (a validar disponibilidad en Argentina).",
        landing: "Página de posventa con formulario de solicitud técnica.", estimuloWhatsapp: "Botón de WhatsApp a soporte técnico.", estimuloCrm: "Etiqueta «posventa» y aviso al responsable de servicio.", estimuloEmail: "Checklist de mantenimiento preventivo como contenido de valor." },
      { id: "CMP-EPSA-04", nombre: "Búsqueda · Repuestos y servicio técnico", objetivo: "Tráfico", plataforma: "Google Ads", audiencia: "Búsquedas de repuestos y servicio técnico", presupuesto: "700000", estado: "Pausada", responsable: "Martín Ledesma", inicio: "2026-09-14", fin: "2026-12-31", notas: "Pausada hasta tener la landing de Line Up.",
        planEstado: "Aprobada", pasoPlan: "7", productoIds: "offering-1", segmentoIds: "segment-companies", presupuestoMensual: "700000", canales: json({ "Google Ads": 100 }), enfoque: "Capturar demanda activa de repuestos.", funnel: "Conversión" },
    ],
    aca: [
      { id: "CMP-ACA-01", nombre: "Captación de socios · Meta", objetivo: "Generación de leads", plataforma: "Meta Ads", audiencia: "Potenciales socios de 30 a 55 años con vehículo", presupuesto: "1800000", estado: "Activa", responsable: "Sofía Ramírez", inicio: "2026-09-01", fin: "2026-12-31", notas: "",
        planEstado: "Aprobada", pasoPlan: "7", aprobadoPor: "Sofía Ramírez", aprobadoEn: "2026-08-28T15:00:00.000Z", presupuestoMensual: "1800000", productosTexto: "Membresía de socio con asistencia en ruta",
        canales: json({ "Meta Ads": 80, "TikTok Ads": 20 }), enfoque: "Asistencia y beneficios desde el primer día, con prueba social de socios.", mensaje: "Sumate y accedé a beneficios desde el primer día.", funnel: "Descubrimiento,Retargeting,Conversión",
        metaAds: "Descubrimiento con reels de beneficios · retargeting con placas de asistencia 24 h · formulario instantáneo.", googleAds: "", otrosCanales: "TikTok Ads: reels de viajes con beneficio de bienvenida.",
        landing: "Landing «Asociate en 3 pasos» con alta online.", estimuloWhatsapp: "Respuesta automática con el link de alta y horario de atención.", estimuloCrm: "Alta del lead con origen de campaña.", estimuloEmail: "Email de bienvenida con beneficios del primer mes." },
      { id: "CMP-ACA-02", nombre: "Búsqueda · Beneficios para socios", objetivo: "Generación de leads", plataforma: "Google Ads", audiencia: "Búsquedas de asistencia, beneficios y seguros", presupuesto: "1500000", estado: "Activa", responsable: "Sofía Ramírez", inicio: "2026-09-01", fin: "2026-12-31", notas: "",
        planEstado: "Aprobada", pasoPlan: "7", presupuestoMensual: "1000000", productosTexto: "Beneficios para socios · Asistencia", canales: json({ "Google Ads": 85, "ChatGPT Ads": 15 }), enfoque: "Responder a la búsqueda activa por intención: beneficios, asistencia y turismo.", funnel: "Conversión",
        googleAds: "Tres grupos por intención: beneficios, asistencia y turismo.", otrosCanales: "ChatGPT Ads: prueba en consultas de asistencia en ruta (a validar).", landing: "Landing «Asociate en 3 pasos».", estimuloCrm: "Alta del lead con la intención de búsqueda." },
      { id: "CMP-ACA-03", nombre: "Turismo de verano", objetivo: "Tráfico", plataforma: "Meta Ads", audiencia: "Socios actuales · familias viajeras", presupuesto: "800000", estado: "Borrador", responsable: "Sofía Ramírez", inicio: "2026-12-01", fin: "2027-02-28", notas: "",
        planEstado: "Borrador", pasoPlan: "2", productosTexto: "Turismo para socios", presupuestoMensual: "", enfoque: "" },
    ],
    "lider-energy": [
      { id: "CMP-LID-01", nombre: "Captación B2B · Eficiencia energética", objetivo: "Generación de leads", plataforma: "Google Ads", audiencia: "Responsables de energía y plantas industriales", presupuesto: "1200000", estado: "En preparación", responsable: "Martín Ledesma", inicio: "2026-12-01", fin: "2027-03-31", notas: "Se activa después de cerrar medición y CRM." },
    ],
  },
  anuncios: {
    aca: [
      { id: "ANU-ACA-01", nombre: "Asistencia 24 h · variante B", campana: "CMP-ACA-01", tipo: "Anuncio", canal: "Meta Ads", funnel: "Conversión", piezas: "Placa,Historia", insight: "Muchos conductores descubren que necesitaban asistencia cuando ya están varados.", respuesta: "Con ACA tenés auxilio las 24 h desde el primer día.", beneficio: "Tranquilidad en la ruta sin esperar carencias.", propuesta: "Asociate online y activá la asistencia en el momento.", rtb: "Red de prestadores en todo el país (dato a validar con el cliente).", cta: "Asociate ahora", fechaNecesaria: "2026-11-27", etapa: "Validación del diseño", version: "1",
        opciones: "A · Testimonio de socio en ruta.\nB · Placa de dato «24 h, todo el país» + historia en 3 pasos.\nC · Comparativa con y sin asistencia.", propuestaContent: "Opción B · Placa de dato «24 h, todo el país» + historia de 3 láminas con el paso a paso.", copy: "¿Te quedaste en la ruta? Con ACA tenés auxilio las 24 h desde el primer día.", enlacePieza: "https://example.com/demo/aca-asistencia-variante-b", pedidoDisenoId: "DIS-ACA-04", solicitadoPor: "Sofía Ramírez", origen: "Instancia 2",
        brief: "Brief de anuncio · Asistencia 24 h · variante B\nCampaña: Captación de socios · Meta\nEtapa del funnel: Conversión\nPiezas a generar: Placa, Historia",
        comentarios: json([comment("Sofía Ramírez", "2026-11-17T13:00:00.000Z", "Validada la opción B. Pasa a diseño.", 1, "Validación del PM", "aprobacion")]) },
      { id: "ANU-ACA-02", nombre: "Beneficio de bienvenida · reel", campana: "CMP-ACA-01", tipo: "Anuncio", canal: "Meta Ads", funnel: "Descubrimiento", piezas: "Reel", insight: "Asociarse parece un trámite largo.", respuesta: "El alta es online y el beneficio llega el primer día.", beneficio: "Ahorro desde el primer mes.", propuesta: "Reel de 15 s con el beneficio de bienvenida.", rtb: "Beneficio vigente publicado por el cliente.", cta: "Conocé el beneficio", fechaNecesaria: "2026-10-14", etapa: "En circulación", fechaCirculacion: "2026-10-14", version: "2", previoAlFlujo: "true", propuestaContent: "Reel con viaje familiar y sobreimpreso del beneficio.", solicitadoPor: "Sofía Ramírez", origen: "Anterior al flujo del OS" },
      { id: "ANU-ACA-03", nombre: "Promo de septiembre · carrusel", campana: "CMP-ACA-01", tipo: "Anuncio", canal: "Meta Ads", funnel: "Conversión", piezas: "Carrusel", insight: "La promo vencía a fin de mes.", respuesta: "Urgencia con fecha de cierre.", beneficio: "Primer mes bonificado.", propuesta: "Carrusel de 4 láminas.", rtb: "Promo publicada por el cliente.", cta: "Aprovechá hasta el 30/9", fechaNecesaria: "2026-09-05", etapa: "Finalizado", fechaCirculacion: "2026-09-05", fechaFin: "2026-10-01", version: "1", previoAlFlujo: "true", solicitadoPor: "Sofía Ramírez", origen: "Anterior al flujo del OS" },
      { id: "ANU-ACA-04", nombre: "Landing · Asociate en 3 pasos", campana: "CMP-ACA-01", tipo: "Landing page", canal: "Meta Ads", funnel: "Conversión", piezas: "Landing", insight: "", respuesta: "", beneficio: "Alta online en tres pasos.", propuesta: "Landing con formulario corto y beneficios del primer mes.", rtb: "", cta: "Asociarme", detalle: "Secciones: beneficio principal, tres pasos, preguntas frecuentes y formulario.", fechaNecesaria: "2026-09-01", etapa: "En circulación", fechaCirculacion: "2026-09-01", version: "3", previoAlFlujo: "true", enlacePieza: "https://example.com/demo/aca-landing-asociate", solicitadoPor: "Sofía Ramírez", origen: "Anterior al flujo del OS" },
      { id: "ANU-ACA-05", nombre: "WhatsApp · respuesta a nuevos leads", campana: "CMP-ACA-01", tipo: "Atención por WhatsApp", canal: "Meta Ads", funnel: "Conversión", piezas: "", insight: "", respuesta: "", beneficio: "Respuesta inmediata.", propuesta: "Mensaje automático con link de alta y horario de atención.", rtb: "", cta: "Completá tu alta", detalle: "Mensaje 1: saludo y link. Mensaje 2 (a las 24 h): recordatorio con beneficio.", fechaNecesaria: "2026-09-01", etapa: "En circulación", fechaCirculacion: "2026-09-01", version: "1", previoAlFlujo: "true", solicitadoPor: "Sofía Ramírez", origen: "Anterior al flujo del OS" },
      { id: "ANU-ACA-06", nombre: "Carrusel · Qué incluye la cuota", campana: "CMP-ACA-01", tipo: "Anuncio", canal: "Meta Ads", funnel: "Retargeting", piezas: "Carrusel,Placa", insight: "Quien visitó la landing no sabe qué incluye la cuota.", respuesta: "Mostrar los servicios incluidos uno por uno.", beneficio: "Saber exactamente qué se paga.", propuesta: "Carrusel de 5 láminas: asistencia, beneficios, turismo, app y precio.", rtb: "Detalle de servicios del cliente.", cta: "Asociate", fechaNecesaria: "2026-12-04", etapa: "Opciones de Content", version: "1", solicitadoPor: "Sofía Ramírez", origen: "Nuevas piezas",
        brief: "Brief de anuncio · Carrusel · Qué incluye la cuota\nCampaña: Captación de socios · Meta\nEtapa del funnel: Retargeting\nPiezas a generar: Carrusel, Placa" },
      { id: "ANU-ACA-07", nombre: "Banner · Asistencia 24 h", campana: "CMP-ACA-02", tipo: "Anuncio", canal: "Google Ads", funnel: "Conversión", piezas: "Banner", insight: "La búsqueda de asistencia es urgente.", respuesta: "Mostrar el teléfono y el pictograma de grúa.", beneficio: "Ayuda inmediata.", propuesta: "Banner display 1200 × 300 con teléfono.", rtb: "Asistencia 24 h.", cta: "Llamá ahora", fechaNecesaria: "2026-11-26", etapa: "Aprobación del cliente", version: "2", propuestaContent: "Banner con pictograma de grúa y teléfono destacado.", copy: "Asistencia en ruta 24 h · Llamá ahora", enlacePieza: "https://example.com/demo/aca-banner-asistencia", pedidoDisenoId: "DIS-ACA-07", solicitadoPor: "Sofía Ramírez", origen: "Instancia 2",
        comentarios: json([comment("Sofía Ramírez", "2026-11-11T14:00:00.000Z", "Subir el contraste del teléfono.", 1, "Validación del diseño", "devolucion"), comment("Sofía Ramírez", "2026-11-13T16:00:00.000Z", "Diseño aprobado. Va al cliente.", 2, "Validación del diseño", "aprobacion")]) },
      { id: "ANU-ACA-08", nombre: "Email · bienvenida a nuevos socios", campana: "CMP-ACA-01", tipo: "Atención por mail", canal: "Meta Ads", funnel: "Conversión", piezas: "", insight: "", respuesta: "", beneficio: "Empezar a usar los beneficios en la primera semana.", propuesta: "Email con los tres beneficios más usados y la app.", rtb: "", cta: "Descargá la app", detalle: "Asunto, preencabezado y cuerpo con tres bloques.", fechaNecesaria: "2026-11-24", etapa: "Validación del PM", version: "1", propuestaContent: "Asunto: «Ya sos socio: esto es lo primero que podés usar». Tres bloques con beneficio, asistencia y app.", solicitadoPor: "Sofía Ramírez", origen: "Instancia 2" },
    ],
    epsa: [
      { id: "ANU-EPSA-01", nombre: "Video Line Up 15 s", campana: "CMP-EPSA-01", tipo: "Anuncio", canal: "LinkedIn Ads", funnel: "Descubrimiento", piezas: "Video", insight: "Compras compara confiabilidad antes que precio.", respuesta: "Mostrar el producto en uso en los primeros 3 segundos.", beneficio: "Menos paradas de planta.", propuesta: "Video de 15 s con subtítulos.", rtb: "Especificaciones técnicas publicadas.", cta: "Pedí la ficha técnica", fechaNecesaria: "2026-10-12", etapa: "En circulación", fechaCirculacion: "2026-10-12", version: "2", previoAlFlujo: "true", solicitadoPor: "Martín Ledesma", origen: "Anterior al flujo del OS" },
      { id: "ANU-EPSA-02", nombre: "Carrusel · cinco especificaciones", campana: "CMP-EPSA-01", tipo: "Anuncio", canal: "LinkedIn Ads", funnel: "Retargeting", piezas: "Carrusel", insight: "Compras necesita datos comparables para justificar la elección.", respuesta: "Cinco especificaciones en lenguaje de compras.", beneficio: "Decidir con datos.", propuesta: "Carrusel de 6 láminas con dato y comparación.", rtb: "Ficha técnica de Line Up.", cta: "Descargá la ficha", fechaNecesaria: "2026-11-27", etapa: "Validación del PM", version: "1",
        opciones: "A · Una especificación por lámina con ícono.\nB · Tabla comparativa simplificada.", propuestaContent: "Opción A con cierre en tabla resumen.", copy: "Cinco datos para comparar antes de comprar.", solicitadoPor: "Martín Ledesma", origen: "Instancia 2",
        brief: "Brief de anuncio · Carrusel · cinco especificaciones\nCampaña: Line Up · Generación de demanda\nTarget (Discovery): Responsables de compras\nEtapa del funnel: Retargeting\nPiezas a generar: Carrusel" },
      { id: "ANU-EPSA-03", nombre: "Placa · entrega en plazo", campana: "CMP-EPSA-01", tipo: "Anuncio", canal: "Meta Ads", funnel: "Conversión", piezas: "Placa,Historia", insight: "Una parada de planta cuesta más que el producto.", respuesta: "Entrega en plazo comprometida.", beneficio: "Planificar sin sorpresas.", propuesta: "Placa de dato con el plazo de entrega.", rtb: "Compromiso de entrega del cliente (a validar).", cta: "Consultá disponibilidad", fechaNecesaria: "2026-12-02", etapa: "Diseño", version: "1",
        opciones: "A · Dato grande sobre fondo oscuro.\nB · Calendario con fecha marcada.", propuestaContent: "Opción A · «Entregamos en plazo» con dato de días.", copy: "Tu planta no puede esperar. Entregamos en plazo.", solicitadoPor: "Martín Ledesma", origen: "Instancia 2",
        comentarios: json([comment("Valentina Ríos", "2026-11-19T12:00:00.000Z", "Va la opción A. Respetar la ruta A del key visual.", 1, "Validación del PM", "aprobacion")]) },
      { id: "ANU-EPSA-04", nombre: "Landing Line Up", campana: "CMP-EPSA-01", tipo: "Landing page", canal: "LinkedIn Ads", funnel: "Conversión", piezas: "Landing", insight: "", respuesta: "", beneficio: "Pedir la ficha técnica en un paso.", propuesta: "Landing con ficha descargable y formulario comercial.", rtb: "", cta: "Descargá la ficha técnica", detalle: "Secciones: hero con producto, 5 especificaciones, caso de cliente, formulario conectado al CRM (T-145).", fechaNecesaria: "2026-12-10", etapa: "Opciones de Content", version: "1", solicitadoPor: "Martín Ledesma", origen: "Instancia 2" },
      { id: "ANU-EPSA-05", nombre: "Remarketing · caso de posventa", campana: "CMP-EPSA-02", tipo: "Anuncio", canal: "Meta Ads", funnel: "Retargeting", piezas: "Placa", insight: "Quien visitó el catálogo duda del soporte posterior.", respuesta: "Mostrar un caso de respuesta técnica.", beneficio: "Respaldo después de la compra.", propuesta: "Placa con cita del caso y dato de 24 h.", rtb: "Caso de cliente con autorización (a confirmar).", cta: "Hablá con un asesor", fechaNecesaria: "2026-11-26", etapa: "Aprobación del cliente", version: "1",
        propuestaContent: "Placa con cita breve del cliente y dato «respuesta en 24 h».", copy: "«Nos respondieron en el día». Así trabaja la posventa de Line Up.", enlacePieza: "https://example.com/demo/epsa-remarketing-posventa", solicitadoPor: "Martín Ledesma", origen: "Instancia 2",
        comentarios: json([comment("Valentina Ríos", "2026-11-18T15:00:00.000Z", "Diseño aprobado. Enviado a Carolina Méndez.", 1, "Validación del diseño", "aprobacion")]) },
      { id: "ANU-EPSA-06", nombre: "Búsqueda · repuestos (RSA)", campana: "CMP-EPSA-04", tipo: "Anuncio", canal: "Google Ads", funnel: "Conversión", piezas: "Texto de búsqueda", insight: "Se busca el repuesto por código.", respuesta: "Títulos con código y disponibilidad.", beneficio: "Encontrar el repuesto rápido.", propuesta: "Anuncio responsivo con 12 títulos.", rtb: "Stock informado por el cliente.", cta: "Consultá stock", fechaNecesaria: "2026-09-14", etapa: "Finalizado", fechaCirculacion: "2026-09-14", fechaFin: "2026-10-26", version: "1", previoAlFlujo: "true", solicitadoPor: "Martín Ledesma", origen: "Anterior al flujo del OS" },
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
};

/** Valores de una semilla demo, para completar al leer registros demo guardados antes de que existieran los campos nuevos. */
export function paidDemoSeed(collection: string, clientSlug: string, id: string) {
  return paidDemoSeeds[collection]?.[clientSlug]?.find((seed) => seed.id === id);
}
