export type BenchmarkDimension = {
  label: string;
  clientScore: number;
  benchmarkScore: number;
  note: string;
};

export type CompetitorProfile = {
  name: string;
  type: "Directo" | "Referente" | "Emergente";
  positioning: string;
  strength: string;
  watch: string;
  activity: "Alta" | "Media" | "Baja";
};

export type CompetitiveSignal = {
  id: string;
  clientSlug: string;
  competitor: string;
  category: "Oferta" | "Comunicación" | "Performance" | "Producto" | "Experiencia" | "Talento";
  title: string;
  detail: string;
  detectedAt: string;
  impact: "Alto" | "Medio" | "Bajo";
  status: "Nuevo" | "Validado" | "En observación";
  source: string;
};

export type BenchmarkOpportunity = {
  title: string;
  rationale: string;
  owner: string;
  state: "Detectada" | "En análisis" | "Validada";
};

export type ClientBenchmark = {
  clientSlug: string;
  summary: string;
  lastScan: string;
  monitoredCompetitors: number;
  dimensions: BenchmarkDimension[];
  competitors: CompetitorProfile[];
  signals: CompetitiveSignal[];
  opportunities: BenchmarkOpportunity[];
};

export const benchmarkData: ClientBenchmark[] = [
  {
    clientSlug: "epsa",
    summary: "Comparar propuesta logística, experiencia digital, comunicación y señales comerciales sin confundir observación externa con información confirmada de la cuenta.",
    lastScan: "Hoy · 08:30",
    monitoredCompetitors: 3,
    dimensions: [
      { label: "Propuesta de valor", clientScore: 82, benchmarkScore: 76, note: "Diferencial fuerte en cobertura y especialización; falta convertirlo en mensajes más comparables." },
      { label: "Presencia digital", clientScore: 71, benchmarkScore: 79, note: "La categoría muestra mayor frecuencia de actualización y mejor visibilidad de casos." },
      { label: "Contenido y autoridad", clientScore: 68, benchmarkScore: 74, note: "Existe oportunidad de ocupar temas técnicos con evidencia, procesos y resultados." },
      { label: "Experiencia de conversión", clientScore: 75, benchmarkScore: 72, note: "Los flujos actuales son competitivos; conviene simplificar el paso de consulta a diagnóstico." },
      { label: "Innovación y automatización", clientScore: 86, benchmarkScore: 69, note: "Ventaja potencial si se comunica con casos concretos y no sólo como capacidad tecnológica." },
    ],
    competitors: [
      { name: "Operador logístico regional A", type: "Directo", positioning: "Cobertura y escala operativa", strength: "Capilaridad y presencia comercial", watch: "Cambios de propuesta, SLA y mensajes de cobertura", activity: "Alta" },
      { name: "Plataforma de última milla B", type: "Emergente", positioning: "Tecnología y velocidad", strength: "Experiencia digital y autogestión", watch: "Nuevas integraciones, pricing y funcionalidades", activity: "Alta" },
      { name: "Integrador e-commerce C", type: "Referente", positioning: "Solución integral para tiendas", strength: "Contenido educativo y alianzas", watch: "Casos, partners y territorios de contenido", activity: "Media" },
    ],
    signals: [
      { id: "epsa-s1", clientSlug: "epsa", competitor: "Plataforma de última milla B", category: "Producto", title: "Nueva integración visible en el proceso de alta", detail: "La propuesta incorpora conexión directa con una plataforma de e-commerce y reduce pasos de onboarding.", detectedAt: "Hoy", impact: "Alto", status: "Nuevo", source: "Sitio y centro de ayuda" },
      { id: "epsa-s2", clientSlug: "epsa", competitor: "Operador logístico regional A", category: "Comunicación", title: "Mayor presión sobre cobertura nacional", detail: "La comunicación reciente concentra mensajes de alcance, trazabilidad y tiempos de entrega.", detectedAt: "2 días", impact: "Medio", status: "En observación", source: "Sitio, anuncios y redes" },
      { id: "epsa-s3", clientSlug: "epsa", competitor: "Integrador e-commerce C", category: "Performance", title: "Aumento de contenido orientado a conversión", detail: "Se detecta mayor frecuencia de casos, comparativas y llamados a diagnóstico comercial.", detectedAt: "Esta semana", impact: "Medio", status: "Validado", source: "Contenido público" },
    ],
    opportunities: [
      { title: "Convertir innovación operativa en evidencia comercial", rationale: "La ventaja tecnológica aparece en la operación, pero todavía puede explicarse mejor mediante casos, métricas y recorridos concretos.", owner: "Estrategia + Cuentas", state: "En análisis" },
      { title: "Crear un territorio de autoridad sobre logística especializada", rationale: "Los competidores compiten por escala y velocidad; existe espacio para explicar complejidad, trazabilidad y conocimiento sectorial.", owner: "Contenido", state: "Detectada" },
    ],
  },
  {
    clientSlug: "aca",
    summary: "Monitorear propuestas de asistencia, beneficios, pricing y experiencia de alta para sostener una diferenciación clara sin copiar mensajes de la categoría.",
    lastScan: "Ayer · 18:00",
    monitoredCompetitors: 3,
    dimensions: [
      { label: "Propuesta de valor", clientScore: 84, benchmarkScore: 73, note: "La amplitud institucional es una ventaja; necesita mayor claridad por situación de uso." },
      { label: "Presencia digital", clientScore: 69, benchmarkScore: 78, note: "Los competidores simplifican mejor beneficios, comparativas y pasos de contratación." },
      { label: "Contenido y autoridad", clientScore: 76, benchmarkScore: 70, note: "Existe credibilidad y patrimonio de marca para construir contenidos diferenciales." },
      { label: "Experiencia de conversión", clientScore: 64, benchmarkScore: 81, note: "La principal brecha aparece en claridad de planes, CTA y continuidad del recorrido." },
      { label: "Innovación y automatización", clientScore: 70, benchmarkScore: 72, note: "La categoría avanza en autogestión, asistencia y comunicación contextual." },
    ],
    competitors: [
      { name: "Club de asistencia A", type: "Directo", positioning: "Beneficios cotidianos", strength: "Claridad de planes y promociones", watch: "Pricing, bundles y campañas estacionales", activity: "Alta" },
      { name: "Asistencia vehicular B", type: "Directo", positioning: "Respuesta rápida ante emergencias", strength: "Mensaje simple y conversión directa", watch: "Nuevos servicios, cobertura y promesas", activity: "Media" },
      { name: "Plataforma de beneficios C", type: "Emergente", positioning: "Membresía digital flexible", strength: "Experiencia mobile y personalización", watch: "Alianzas, beneficios y modelo de suscripción", activity: "Alta" },
    ],
    signals: [
      { id: "aca-s1", clientSlug: "aca", competitor: "Club de asistencia A", category: "Oferta", title: "Nuevo bundle de beneficios para viajeros", detail: "La propuesta agrupa asistencia, descuentos y experiencias bajo un único mensaje de tranquilidad.", detectedAt: "Ayer", impact: "Alto", status: "Nuevo", source: "Landing y anuncios" },
      { id: "aca-s2", clientSlug: "aca", competitor: "Plataforma de beneficios C", category: "Experiencia", title: "Alta digital con menos pasos", detail: "El recorrido reduce fricción y muestra beneficios antes de solicitar información extensa.", detectedAt: "3 días", impact: "Alto", status: "Validado", source: "Flujo web público" },
      { id: "aca-s3", clientSlug: "aca", competitor: "Asistencia vehicular B", category: "Comunicación", title: "Uso intensivo de situaciones de emergencia", detail: "La comunicación abandona el listado de prestaciones y dramatiza momentos concretos de necesidad.", detectedAt: "Esta semana", impact: "Medio", status: "En observación", source: "Redes y anuncios" },
    ],
    opportunities: [
      { title: "Organizar beneficios por momentos de vida", rationale: "La categoría comunica planes; ACA puede construir una lectura más amplia basada en viaje, movilidad, seguridad y pertenencia.", owner: "Estrategia", state: "Detectada" },
      { title: "Reducir fricción entre interés y contacto", rationale: "El benchmark muestra que la claridad del recorrido influye tanto como la amplitud de la propuesta.", owner: "UX + Performance", state: "En análisis" },
    ],
  },
  {
    clientSlug: "grupo-portland",
    summary: "Comparar posicionamiento, narrativa de proyectos, experiencia digital y captación para detectar espacios de diferenciación por visión, calidad y confianza.",
    lastScan: "Esta semana",
    monitoredCompetitors: 3,
    dimensions: [
      { label: "Propuesta de valor", clientScore: 79, benchmarkScore: 75, note: "La propuesta tiene activos diferenciales, pero necesita una narrativa más consistente entre unidades." },
      { label: "Presencia digital", clientScore: 72, benchmarkScore: 80, note: "Los referentes muestran proyectos y avances con mayor profundidad visual y editorial." },
      { label: "Contenido y autoridad", clientScore: 67, benchmarkScore: 73, note: "Existe oportunidad de explicar visión, proceso, calidad y decisiones de diseño." },
      { label: "Experiencia de conversión", clientScore: 70, benchmarkScore: 76, note: "La categoría utiliza recorridos segmentados por proyecto, etapa e intención." },
      { label: "Innovación y automatización", clientScore: 74, benchmarkScore: 68, note: "Puede diferenciarse mediante seguimiento, personalización y claridad comercial." },
    ],
    competitors: [
      { name: "Grupo desarrollador A", type: "Directo", positioning: "Trayectoria y volumen", strength: "Portfolio y prueba social", watch: "Lanzamientos, precios y mensajes de inversión", activity: "Alta" },
      { name: "Estudio de arquitectura B", type: "Referente", positioning: "Diseño y autoría", strength: "Dirección visual y contenido editorial", watch: "Narrativas, proyectos y reconocimientos", activity: "Media" },
      { name: "Desarrolladora urbana C", type: "Emergente", positioning: "Experiencia y comunidad", strength: "Visualización de estilo de vida", watch: "Campañas, amenities y captación", activity: "Alta" },
    ],
    signals: [
      { id: "portland-s1", clientSlug: "grupo-portland", competitor: "Desarrolladora urbana C", category: "Comunicación", title: "Mayor foco en estilo de vida y comunidad", detail: "Los proyectos se presentan desde experiencias y escenas de uso, no sólo desde características técnicas.", detectedAt: "2 días", impact: "Medio", status: "Nuevo", source: "Sitio y redes" },
      { id: "portland-s2", clientSlug: "grupo-portland", competitor: "Grupo desarrollador A", category: "Oferta", title: "Nuevo esquema de financiación visible", detail: "La propuesta comercial aparece antes y con mayor claridad dentro del recorrido del proyecto.", detectedAt: "Esta semana", impact: "Alto", status: "En observación", source: "Landing de proyecto" },
      { id: "portland-s3", clientSlug: "grupo-portland", competitor: "Estudio de arquitectura B", category: "Comunicación", title: "Serie editorial sobre proceso y decisiones", detail: "El contenido construye autoridad explicando criterios, materiales y evolución de obra.", detectedAt: "Esta semana", impact: "Medio", status: "Validado", source: "Contenido público" },
    ],
    opportunities: [
      { title: "Construir una narrativa unificada de grupo", rationale: "El benchmark muestra consistencia en referentes; la oportunidad es articular proyectos, visión y prueba de ejecución bajo una misma lógica.", owner: "Estrategia + Marca", state: "En análisis" },
      { title: "Conectar proyecto, etapa y próximo paso comercial", rationale: "Una navegación por intención puede reducir fricción y mejorar la calidad del lead.", owner: "UX + Ventas", state: "Detectada" },
    ],
  },
  {
    clientSlug: "edinovo",
    summary: "Observar propuestas educativas, autoridad temática, formatos de contenido y experiencia de producto para convertir aprendizajes en ventaja editorial y comercial.",
    lastScan: "Hoy · 09:10",
    monitoredCompetitors: 3,
    dimensions: [
      { label: "Propuesta de valor", clientScore: 81, benchmarkScore: 77, note: "La propuesta es sólida; puede ganar claridad segmentando por problema, usuario y resultado." },
      { label: "Presencia digital", clientScore: 74, benchmarkScore: 76, note: "Brecha acotada; la mejora principal está en profundidad y actualización de contenidos." },
      { label: "Contenido y autoridad", clientScore: 85, benchmarkScore: 78, note: "Ventaja potencial por criterio editorial y capacidad de traducir conocimiento complejo." },
      { label: "Experiencia de conversión", clientScore: 69, benchmarkScore: 75, note: "Falta conectar mejor el contenido de valor con la siguiente acción comercial." },
      { label: "Innovación y automatización", clientScore: 78, benchmarkScore: 72, note: "La personalización y la memoria de contenidos pueden convertirse en diferencial visible." },
    ],
    competitors: [
      { name: "Plataforma educativa A", type: "Directo", positioning: "Acceso simple a contenidos", strength: "Escala, catálogo y performance", watch: "Nuevos formatos, pricing y captación", activity: "Alta" },
      { name: "Editorial digital B", type: "Referente", positioning: "Autoridad y curaduría", strength: "Marca editorial y profundidad", watch: "Temas, autores y alianzas", activity: "Media" },
      { name: "Edtech regional C", type: "Emergente", positioning: "Aprendizaje personalizado", strength: "Producto y experiencia digital", watch: "Funcionalidades, IA y casos", activity: "Alta" },
    ],
    signals: [
      { id: "edinovo-s1", clientSlug: "edinovo", competitor: "Edtech regional C", category: "Producto", title: "Nueva funcionalidad de recomendación personalizada", detail: "La plataforma utiliza comportamiento y objetivos para adaptar recorridos de aprendizaje.", detectedAt: "Hoy", impact: "Alto", status: "Nuevo", source: "Producto y comunicación pública" },
      { id: "edinovo-s2", clientSlug: "edinovo", competitor: "Editorial digital B", category: "Comunicación", title: "Mayor inversión en autores y series temáticas", detail: "El referente fortalece autoridad mediante voces reconocibles y continuidad editorial.", detectedAt: "Esta semana", impact: "Medio", status: "Validado", source: "Newsletter y sitio" },
      { id: "edinovo-s3", clientSlug: "edinovo", competitor: "Plataforma educativa A", category: "Performance", title: "Campañas orientadas a prueba inmediata", detail: "La propuesta acorta el recorrido entre contenido, muestra y registro.", detectedAt: "3 días", impact: "Medio", status: "En observación", source: "Anuncios y landing" },
    ],
    opportunities: [
      { title: "Convertir memoria editorial en personalización", rationale: "Los aprendizajes acumulados pueden mejorar recomendaciones, briefs y recorridos sin perder control editorial.", owner: "Producto + Contenido", state: "En análisis" },
      { title: "Diseñar series propias de autoridad", rationale: "El benchmark valida la oportunidad de construir territorios reconocibles y sostenidos en el tiempo.", owner: "Contenido", state: "Validada" },
    ],
  },
  {
    clientSlug: "lider-energy",
    summary: "Monitorear oferta, argumentos de ahorro, casos, certificaciones y experiencia comercial para acelerar el onboarding estratégico y definir una posición defendible.",
    lastScan: "Pendiente de primera validación",
    monitoredCompetitors: 3,
    dimensions: [
      { label: "Propuesta de valor", clientScore: 72, benchmarkScore: 78, note: "El diferencial todavía debe validarse y expresarse con mayor precisión." },
      { label: "Presencia digital", clientScore: 61, benchmarkScore: 75, note: "La categoría utiliza casos, simuladores y explicaciones técnicas para generar confianza." },
      { label: "Contenido y autoridad", clientScore: 58, benchmarkScore: 73, note: "Existe una brecha inicial que puede abordarse con educación, evidencia y credenciales." },
      { label: "Experiencia de conversión", clientScore: 65, benchmarkScore: 71, note: "Se necesita un recorrido de diagnóstico que ordene consumo, necesidad y viabilidad." },
      { label: "Innovación y automatización", clientScore: 76, benchmarkScore: 70, note: "La oportunidad está en acompañar comercialmente con simulación, seguimiento y datos." },
    ],
    competitors: [
      { name: "Proveedor energético A", type: "Directo", positioning: "Ahorro y retorno", strength: "Casos y calculadoras", watch: "Promesas, financiación y sectores priorizados", activity: "Alta" },
      { name: "Integrador solar B", type: "Directo", positioning: "Implementación llave en mano", strength: "Proceso comercial claro", watch: "Servicios, garantías y alianzas", activity: "Media" },
      { name: "Consultora de eficiencia C", type: "Referente", positioning: "Diagnóstico técnico", strength: "Autoridad y contenido especializado", watch: "Informes, normativas y casos", activity: "Media" },
    ],
    signals: [
      { id: "lider-s1", clientSlug: "lider-energy", competitor: "Proveedor energético A", category: "Experiencia", title: "Calculadora de ahorro como puerta de entrada", detail: "El recorrido comercial comienza con una estimación simple antes de solicitar contacto.", detectedAt: "Esta semana", impact: "Alto", status: "Nuevo", source: "Sitio público" },
      { id: "lider-s2", clientSlug: "lider-energy", competitor: "Consultora de eficiencia C", category: "Comunicación", title: "Contenido técnico por industria", detail: "La comunicación segmenta problemas y resultados según tipo de operación.", detectedAt: "Esta semana", impact: "Medio", status: "En observación", source: "Artículos y casos" },
      { id: "lider-s3", clientSlug: "lider-energy", competitor: "Integrador solar B", category: "Oferta", title: "Proceso llave en mano más visible", detail: "La propuesta explica etapas, responsables, tiempos y garantías antes del contacto.", detectedAt: "5 días", impact: "Medio", status: "Validado", source: "Landing comercial" },
    ],
    opportunities: [
      { title: "Crear diagnóstico guiado de oportunidad", rationale: "La categoría reduce incertidumbre mediante estimaciones y pasos claros; Avans puede modelar un flujo consultivo más útil.", owner: "Ventas + Estrategia", state: "Detectada" },
      { title: "Priorizar autoridad por vertical", rationale: "La explicación sectorial puede acelerar confianza y mejorar la calidad del lead.", owner: "Contenido", state: "En análisis" },
    ],
  },
];

export const benchmarkSignals = benchmarkData.flatMap((item) => item.signals);

export function getClientBenchmark(clientSlug: string) {
  return benchmarkData.find((item) => item.clientSlug === clientSlug);
}
