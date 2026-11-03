# Avans OS · Marketing Discovery y módulos de servicios (revisión 03/11/2026)

## Estado de fuentes y alcance

Esta iteración nace del pedido del usuario de continuar la rama de Claude, no de un manual operativo aprobado. Fuentes efectivamente disponibles:
- Resumen y notas de la reunión de Avans del 30/10/2026 (archivo de notas de Gemini compartido).
- Plantilla **Marketing Discovery.pptx** (56 páginas) de Avans.
- Captura del catálogo de 10 servicios con cinco destacados en celeste.
- Código de la rama Claude `claude/laughing-gauss-qc9m2r`, commit `2775a2f`.

**Bloqueo concreto:** el manual operativo de Google Docs compartido anteriormente devolvió 403 a la conexión del usuario y no llegó adjunto el Word con los procedimientos detallados. Por eso **los pasos de Contenidos y Audiovisuales son propuestas de modelado**, no la transcripción exacta ni el procedimiento certificado de Avans.

## Decisiones del negocio que sí están sustentadas

- Estructura de Cliente 360°: Resumen; Discovery/Conocimiento; Benchmark; Estrategia y Plan MKT; Proyectos/Centro de Ideas; Servicios Activos; Reportes; Soporte.
- Marketing Discovery tiene tres momentos: 1) Análisis del negocio, 2) Benchmark, 3) Plan de marketing. La ficha conserva Benchmark y Plan en pestañas propias.
- La sección Conocimiento ofrece un formulario local de negocio, venta, targeting e ICP coherente con el módulo 1 de la plantilla. La fuente y referencia son obligatorias para marcar un borrador como guardado en sesión. No actualiza conocimiento vigente en producción.
- El benchmark se acuerda **semanal**; no existe un escáner automático conectado. Ningún dato competitivo del demo es una observación real.
- Al configurar los servicios de un cliente sólo se activan los que están seleccionados para esa cuenta. El resaltado **celeste** marca **prioridad de desarrollo de plataforma**, no contrato ni estado operativo.
- Los 10 servicios del catálogo son: Estrategia y coordinación, Diseño de marca, Publicidad digital, Contenidos, Audiovisuales, Desarrollo web, Implementación de CRM, IA y automatizaciones, Soluciones gráficas y merchandising, Mercado Libre.
- Los cinco priorizados en celeste: Estrategia, Diseño de marca, Publicidad digital, Contenidos y Audiovisuales.
- **Contenidos y Audiovisuales** son los dos primeros procedimientos a profundizar según la reunión; Paid Media se relevará luego con Gabi.

## Implementación acotada a demo

- `app/v2/os/marketing-discovery-schema.ts`: campos del análisis del negocio tomados de la estructura de la plantilla.
- `app/v2/os/marketing-discovery.tsx`: edición manual de borrador con fuente, guardado en memoria de la sesión y acceso a Benchmark/Plan.
- `app/v2/os/service-process-data.ts`: checklists y etapas PROPUESTAS de Contenidos y Audiovisuales. Se identifican claramente como pendientes de contraste con el manual.
- `app/v2/os/service-operations.tsx`: controles de avance locales; no deja validar una etapa si faltan previas, responsable, evidencia o checks.
- `app/v2/clientes/[client]/servicios/[service]/page.tsx`: rutas por cliente para Contenidos y Audiovisuales. Consulta el catálogo activo de esa cuenta en el demo; sin permiso efectivo de backend.
- Se conserva el workspace anterior de Contenidos en `/v2/clientes/:slug/contenido`. Publicidad Digital mantiene el espacio actual de Campañas pero su procedimiento no se considera documentado.

**NO implementado:** persistencia, auth, roles seguros server-side, integración Drive, extracción IA, ejecución automática de workflow, aprobación real del cliente, envío de piezas, publicación, almacenamiento de archivos o portal cliente. No promocionar estas capacidades como implementadas.

## QA y criterios de aceptación

1. `/v2/clientes/edinovo?tab=servicios`: Audiovisuales debe aparecer contratado en la demo y abrir `/v2/clientes/edinovo/servicios/audiovisuales`.
2. `/v2/clientes/aca?tab=servicios`: Contenidos debe abrir su nuevo flujo; Audiovisuales no debe figurar como contratado por defecto.
3. Activar temporalmente Audiovisuales en ACA permite abrir el módulo en esa misma sesión. Tras recargar, vuelve al catálogo original.
4. En proceso, no se puede marcar una etapa como Validada en demo si falta evidencia/responsable/checklist o si la previa no fue validada. Editar una etapa validada la devuelve a revisión.
5. `/v2/clientes/epsa?tab=conocimiento`: el formulario de Marketing Discovery está disponible y los links navegan a Benchmark y Estrategia sin duplicar datos. Guardar requiere al menos un campo y fuente.
6. Navegación desktop y mobile, estados visuales, enlaces heredados, `npm run typecheck`, `npm run lint` y `npm run build` deben pasar antes del merge a la rama principal.
7. Comparar etapas, responsables, disparadores, aprobaciones y entregables con el manual real en cuanto se obtenga acceso; **no dar esa validación por hecha**.

La rama de esta iteración nace del commit de Claude `2775a2f`, no de `main`, para preservar su trabajo. El PR de Claude #14 permanece en revisión mientras se valida este cambio.
