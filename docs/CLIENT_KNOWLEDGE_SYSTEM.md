# Sistema de conocimiento del cliente

Esta ampliación integra el Marketing Discovery anterior y utiliza el PPT adjunto `Marketing Discovery.pptx` como referencia de contenido. Conserva los cinco accesos: Ficha, Benchmark, Plan de Marketing, Reportes y Documentos. Las instrucciones operativas provienen del pedido del usuario; el PPT es material de referencia.

## Arquitectura y persistencia

`app/v2/os/knowledge/` contiene modelos, catálogo de preguntas/campos, asociación de reuniones, deduplicación, extracción determinística, propuestas, validación, dependencias y versionado. Los selectores de Discovery/Benchmark/Plan y las mutaciones se ejecutan fuera de React. Los componentes presentan esos resultados y mantienen los borradores de los formularios.

Una sola clave local por cliente: `avans-os:preview:v1:client:<slug>:knowledge:v1`. El agregado incluye Discovery sin fuentes embebidas, fuentes canónicas, cuestionario, reuniones, propuestas, Benchmark, Plan, versiones, revisiones y auditoría. `discoveryOf` proyecta las fuentes al modelo anterior, conservando compatibilidad con todos sus editores. Una aprobación guarda actualización, versión, estado de propuesta y alertas en una sola escritura. Los formularios detectan revisiones concurrentes y conservan el contenido si falla localStorage. No existe sincronización entre usuarios/dispositivos.

La primera modificación importa la clave anterior de Discovery y las listas locales de documentos/competidores. Las claves anteriores permanecen como respaldo y no sobrescriben el agregado nuevo. Los documentos y estrategias demostrativos se conservan identificados como DEMO. No se convierten en información validada ni se copian sus objetivos numéricos al Plan nuevo.

## Cuestionario y aprobación

El catálogo reutilizable cubre empresa, datos relevantes, unidades, ofertas, venta y etapas, segmentos, perfiles B2B/B2C y materiales (páginas 5–12). Cada pregunta conoce el destino; las colecciones admiten varias respuestas con identidad estable, fuente y autorización. Hay vista interna, vista para compartir dentro de la sesión, copia de preguntas, impresión, borradores, progreso y filtro de aclaraciones. No hay enlace público ni envío simulado.

Las respuestas respondidas/validadas sin aclaraciones generan propuestas. No cambian el Discovery hasta aprobarse. Una nota admite extracción de etiquetas explícitas (por ejemplo `Cobertura: ...`); cualquier otra decisión puede proponerse manualmente con una cita. No se interpreta una instrucción dentro de una nota como autoridad para operar el sistema.

La bandeja permite filtrar fuente/reunión, sección, módulo, confianza, impacto, estado y fecha, editar valor/destino, rechazar y aprobar. El lote solo acepta propuestas seleccionadas de bajo riesgo y el dominio vuelve a comprobarlo. Claim, públicos, perfiles, posicionamiento, cobertura y estrategia tienen impacto alto. La comparación con el valor vigente impide aprobar silenciosamente una propuesta obsoleta. Reaprobar una propuesta aplicada no repite el cambio.

Se conservan evidencia, fuente, autor, fecha, versión anterior y nueva. Cambiar Discovery marca marcas y módulos dependientes para revisión. Cambiar una conclusión marca los servicios afectados. Registrar una revisión crea una nueva versión del módulo sin reescribir decisiones. Una revisión de un servicio no borra alertas de los demás.

## Benchmark (páginas 13–25)

- Selección de hasta cuatro competidores principales, con marcas adicionales permitidas; marca propia separada, segmentos, criterio, URL/región, responsable, fuentes y validación del cliente.
- Resumen, contenidos, paid media, web y diseño repetibles para cada marca; fuentes, evidencia, fecha, capturas, estado y responsable por registro.
- Conclusiones: tomar, evitar y diferenciar; vínculos con módulos del Plan.
- Cobertura por marca/bloque, historial y snapshots fechados inmutables.
- Cadencia/fuentes de monitoreo configurables; adapter y estados de job preparados, sin proveedor ni scraping activo.
- Reporte que compara los dos últimos snapshots de cada marca, mostrando sus fechas reales. No afirma cambios quincenales cuando no existen dos relevamientos; oportunidades/recomendaciones provienen de conclusiones guardadas. No hay campañas, lanzamientos ni métricas inventados.

## Plan (páginas 26–53)

| Servicio | Bloques |
| --- | --- |
| Estrategia | Objetivos repetibles, cuatro etapas de canales, insight, claim/storytelling y tono |
| Diseño | Dirección visual, look & feel/moodboard, colores hex y sistema visual |
| Publicidad | Campañas, inversión y distribución por canal, visibilidad IA metodológica, KPIs condicionales Leads/Ecommerce |
| Contenidos | Ejes vinculados a perfiles, reglas siempre/nunca, KPIs y aprendizajes |
| Audiovisuales | Producción, guion/documental y referencias visuales |
| Web | Rol/tecnología, sitemap editable con padres y vínculos, visibilidad IA y KPIs condicionales |

Los módulos visibles dependen de los servicios activos. Desactivar conserva datos; reactivar los recupera. CRM, IA/automatizaciones, soluciones gráficas y Mercado Libre mantienen sus accesos operativos y muestran “Plantilla estratégica pendiente de definición” en Plan.

Las validaciones comprueban fuentes reales, vínculos existentes, campos requeridos, distribución entre campañas y entre canales de cada campaña, colores hex y ciclos del sitemap. Los borradores admiten información parcial; la validación exige evidencia. Los objetivos numéricos parten vacíos. Los lineamientos de IA son metodología, no conexiones activas.

## Permisos y límites reales

Administrador y PM asignado pueden editar; operativo y PM no asignado ven controles de lectura. Fuentes sensibles, reuniones, cuestionarios, propuestas e historial completo se restringen visualmente. La preview mantiene roles simulados y localStorage: no reemplaza autenticación real y no debe almacenar secretos ni notas sensibles reales. La migración prepara aislamiento de organización/cliente y acceso de servidor para las escrituras que deberán ser atómicas.

La integración Google se describe en `GOOGLE_WORKSPACE.md`. No está conectada. OAuth, webhooks y sync están cerrados por defecto; ninguna variable de entorno activa por sí sola el servicio. Los fixtures dicen DEMO y la importación manual no se presenta como sincronización.

## Migración preparada, sin ejecución

`supabase/migrations/20261110175436_client_knowledge_workspace.sql`, generado con `supabase migration new client_knowledge_workspace`, extiende las tablas existentes de competidores, snapshots, configuración de escaneo y propuestas. Agrega fuentes, cuestionarios, reuniones, versiones/dependencias, análisis y Plan; OAuth/suscripciones/eventos quedan en esquema privado. Incluye claves compuestas de organización/cliente, índices de idempotencia, RLS y grants explícitos. No duplica `benchmark_snapshots` ni crea una segunda tabla de propuestas.

Verificación sintáctica con parser PostgreSQL (`pglast`), sin conexión ni ejecución SQL. Pendiente: aplicación autorizada en un entorno de prueba, validación de RLS con identidades reales, pruebas de transacciones y adapters de persistencia. La preview usa exclusivamente almacenamiento local.

## QA reproducible

- `npm ci --cache /tmp/avans-npm-cache`
- `npm run lint`, `npm run typecheck`, `npm run build`
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm exec -- playwright test`

Pruebas en `tests/discovery-model.spec.ts`, `knowledge-model.spec.ts`, `google-workspace.spec.ts`, `discovery-browser.spec.ts` y `knowledge-browser.spec.ts`. Cubren lógica, OAuth/CloudEvents con fixtures, navegador, persistencia, aislamiento, permisos visuales, navegación, responsive y regresión del Discovery anterior. Las pruebas Google no llaman cuentas reales ni crean recursos.
