# QA de evolución funcional · 20/11/2026

La matriz conserva los 33 pasos del pedido y enlaza cada uno con pruebas concretas. Distingue pruebas de modelo, recorridos de navegador y cierre de regresión: tener un caso escrito no acredita su aprobación. La validación corresponde a la implementación local y no implica aprobación del cliente ni prueba de un despliegue remoto.

## Evidencia consolidada

- La primera regresión completa contra el servidor de producción local ejecutó **172 pruebas: 169 aprobadas y 3 fallidas** por expectativas heredadas del comportamiento anterior. Es un resultado histórico de diagnóstico, no el resultado definitivo de entrega.
- Las suites nuevas de Ficha, Benchmark, Diseño, Contenidos, portal y vinculación de tareas participaron en esa ejecución; sus referencias y alcance están en la matriz. La configuración central descubre `*-model.spec.ts` y `*-browser.spec.ts`.
- La comprobación focalizada de creación manual de Contenidos aprobó: guarda el borrador y una tarea vinculada, conserva procedencia `manual` y registra **cero llamadas** a `/api/assistant/`. Caso: `tests/assistant-browser.spec.ts`, «content creation stays manual while AI is deferred and saves its linked task».
- La regresión focalizada de módulos existentes aprobó después de adaptar las expectativas al flujo de Contenidos. Referencia: `tests/modules-browser.spec.ts`, incluido «contenidos, estrategia, web and audiovisual workspaces show their own objects».
- El asistente de Diseño se conserva como acceso opcional, independiente del pedido manual y sin implicar un proveedor conectado. Su caso específico es «Diseño de marca preserves its optional assistant and saves a request with one task; modules without an AI process get none» en `tests/assistant-browser.spec.ts`; su resultado definitivo corresponde al cierre consolidado.
- La creación de un eje nuevo amplía el recorrido mensual de Contenidos. La primera pasada seleccionaba un eje existente; la ejecución de la ampliación queda identificada en el cierre consolidado, sin atribuirla a aquella pasada.

## Entorno de ejecución comprobado

- Playwright ya estaba disponible. Chromium del sistema, `/usr/bin/chromium`, abrió en modo headless y devolvió el título `Avans QA smoke`; versión observada: `156.0.8078.79`.
- Las pruebas utilizan `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`; no requieren descargar el navegador administrado por Playwright, ausente en este entorno.
- La configuración usa `http://localhost:<puerto>` y `npm run start -- -p <puerto>` para producción. `PLAYWRIGHT_PORT` permite separar servidores; los recorridos focalizados de integración también se ejecutaron sobre Next dev en el puerto 3101.
- Las suites concurrentes utilizaron directorios de salida separados para evitar que una ejecución borrara los artefactos de otra.

## Matriz de los 33 pasos

Las referencias son relativas a la raíz del repositorio. Las líneas señalan el inicio del caso observado; el título identifica el caso cuando posteriores ediciones desplazan la línea. «Modelo» describe reglas de dominio ejecutadas; «navegador» describe acciones reales en la aplicación local. Los resultados de la última revisión del código se registran una sola vez en el cierre consolidado.

| Paso | Recorrido solicitado | Evidencia y alcance concreto | Pruebas de referencia |
| --- | --- | --- | --- |
| 1 | Abrir Ficha del cliente | Navegador abre Materiales, Productos y Glosario; conserva acceso a Discovery y Cuestionario. | `tests/profile-library-browser.spec.ts:4` y `:62`; `tests/discovery-browser.spec.ts:65`. |
| 2 | Completar cuestionario | Navegador completa la herramienta independiente y aplica respuestas validadas a Discovery sin duplicados. | `tests/strategic-documents-browser.spec.ts:67`, «Cuestionario inicial is a separate tool…»; `tests/knowledge-browser.spec.ts:60`. |
| 3 | Adjuntar materiales | Carga archivo real, recarga y descarga los mismos bytes; guarda URL y rechaza duplicado. Modelo rechaza archivos vacíos, excesivos o ejecutables. | `tests/profile-library-browser.spec.ts:4` y `:62`; `tests/profile-library-model.spec.ts:60`. |
| 4 | Crear producto | Navegador crea producto con descripción y beneficio. Modelo actualiza oferta canónica y segmentos sin segunda entidad de producto. | `tests/profile-library-browser.spec.ts:4`; `tests/profile-library-model.spec.ts:41`. |
| 5 | Asociar catálogo | Navegador vincula catálogo a producto y comprueba `sourceIds` y categoría persistidos. Modelo rechaza referencias ajenas. | `tests/profile-library-browser.spec.ts:4`; `tests/profile-library-model.spec.ts:12`. |
| 6 | Editar glosario | Navegador guarda usar/evitar y tono, recarga y cambia rol. Modelo deduplica, conserva fuentes e historial y rechaza contradicciones. | `tests/profile-library-browser.spec.ts:4`; `tests/profile-library-model.spec.ts:27`. |
| 7 | Abrir Benchmark y excluir marca propia | Navegador oculta marca propia heredada y conserva sus datos. Modelo excluye propia de Benchmark, reportes y nuevas presentaciones. | `tests/benchmark-evolution-browser.spec.ts:6`; `tests/benchmark-evolution-model.spec.ts:13`. |
| 8 | Agregar competidor | Modelo guarda externo y rechaza duplicados y aliases de propia. Recorrido UI revisado agrega competidor, evidencia y snapshots. | `tests/benchmark-evolution-model.spec.ts:33`; `tests/knowledge-browser.spec.ts:193`, «Benchmark external competitor, evidence, conclusions and immutable snapshots». |
| 9 | Guardar referencia en Banco de ideas | Navegador guarda motivo, URL y captura, conserva origen y evita repetir al recargar. Modelo conserva eje y procedencia. | `tests/benchmark-evolution-browser.spec.ts:6`; `tests/benchmark-evolution-model.spec.ts:44`. |
| 10 | Crear Design System | Navegador agrega color con hex y logo como archivo y comprueba recarga. Modelo valida color, tipografía y referencias; no se atribuye al navegador editar todos los tipos de recurso. | `tests/design-workspace-browser.spec.ts:21`; `tests/design-workspace-model.spec.ts:35`. |
| 11 | Agregar pieza a biblioteca | Navegador vincula pieza a pedido, genera versión 2 y conserva archivo de versión 1. Modelo comprueba numeración e identidad por cliente. | `tests/design-workspace-browser.spec.ts:21`; `tests/design-workspace-model.spec.ts:24`. |
| 12 | Crear pedido de diseño | Navegador crea pedido con responsable, objetivo y fecha. Error de almacenamiento conserva formulario y revierte pedido/tarea; reintento guarda ambos. | `tests/design-workspace-browser.spec.ts:21` y `:100`. |
| 13 | Verificar tarea | Navegador comprueba una sola tarea vinculada. Regresión de módulos verifica misma tarea central en módulo y vista del cliente. | `tests/design-workspace-browser.spec.ts:21` y `:100`; `tests/modules-browser.spec.ts:126`. |
| 14 | Crear plan mensual de contenidos | Navegador crea plan con mes, temáticas y cantidad y lo encuentra en el módulo. | `tests/content-workflow-browser.spec.ts`, «monthly plan and full content cycle, both adjustment loops, one task, calendar, history and reload». |
| 15 | Crear ejes temáticos | Primera ejecución selecciona eje existente. Crear un eje nuevo amplía el mismo recorrido mensual, identificado en el cierre consolidado. | `tests/content-workflow-browser.spec.ts`, «monthly plan and full content cycle…». |
| 16 | Crear contenido | Navegador completa título, eje, idea, bajada, copy, canal, formato, fecha y hora. Prueba sin IA comprueba procedencia manual y tarea vinculada. | `tests/content-workflow-browser.spec.ts`, «monthly plan and full content cycle…»; `tests/assistant-browser.spec.ts`, «content creation stays manual…». |
| 17 | Enviar a revisión interna | Navegador cambia estado y actualiza tarea existente. Modelo controla campos, rol, acción y transición. | `tests/workflow-integration-browser.spec.ts:51`; `tests/content-workflow-model.spec.ts:8` y `:48`. |
| 18 | Validar como cliente | Portal muestra idea y copy juntos, aprueba propuesta y conserva decisión al recargar; excluye borradores ajenos y datos internos. | `tests/portal-browser.spec.ts:21`; `tests/portal-model.spec.ts:9`. |
| 19 | Solicitar ajustes | Navegador recorre devoluciones preliminar y final; portal rechaza comentario vacío. Modelo conserva etapa de retorno y comentarios compartidos. | Circuito completo de `tests/content-workflow-browser.spec.ts`; `tests/portal-browser.spec.ts:55`; `tests/content-workflow-model.spec.ts:31`. |
| 20 | Reenviar | Navegador recorre ambos ajustes. Modelo exige revisión interna correspondiente y reutiliza tarea. | Circuito completo de `tests/content-workflow-browser.spec.ts`; `tests/content-workflow-model.spec.ts:31`; `tests/workflow-integration-model.spec.ts:31`. |
| 21 | Generar tarea de Diseño | Modelo conserva identidad al derivar a Diseño y reintentar. Navegador conserva una tarea durante el ciclo y abre pedidos de apoyo sin activar otro contrato. | `tests/workflow-integration-model.spec.ts:31`; `tests/design-workspace-model.spec.ts:8`; `tests/design-workspace-browser.spec.ts:127`; circuito completo de Contenidos. |
| 22 | Validar diseño | Navegador entrega enlace y versión, pasa por revisión interna y cambia versión tras devolución. Modelo rechaza entrega sin archivo. | Circuito completo de `tests/content-workflow-browser.spec.ts`; `tests/content-workflow-model.spec.ts:8` y `:31`. |
| 23 | Solicitar aprobación final | Navegador solicita tras revisión interna. Portal expone enlace final en esa etapa; proyección oculta notas y ediciones internas posteriores. | Circuito completo de `tests/content-workflow-browser.spec.ts`; `tests/portal-browser.spec.ts:55`; `tests/portal-model.spec.ts:21` y `:44`. |
| 24 | Aprobar | Portal aprueba pieza final y crea programación en Por hacer; no ofrece marcarla programada desde portal. | `tests/portal-browser.spec.ts:86`; `tests/content-workflow-model.spec.ts:8`. |
| 25 | Programar | Navegador guarda fecha/hora y estado Programado. Modelo rechaza programación sin fecha y fechas inexistentes; acción local, sin publicación externa. | Circuito completo de `tests/content-workflow-browser.spec.ts`; `tests/content-workflow-model.spec.ts:8` y `:63`. |
| 26 | Revisar calendario | Navegador recorre mes/semana/día, filtra canal y precarga fecha al crear desde día. Modelo cubre límites de mes y semanas de lunes. | Ambos casos de `tests/content-workflow-browser.spec.ts`; `tests/portal-browser.spec.ts:55`; `tests/portal-model.spec.ts:36`. |
| 27 | Verificar notificaciones | Navegador abre contenido desde notificación y registra lectura. Modelo verifica destinatario, ruta, deduplicación, cliente y vencimientos en Buenos Aires. | `tests/workflow-integration-browser.spec.ts:51`; `tests/workflow-integration-model.spec.ts:72` y `:87`. |
| 28 | Verificar historial | Navegador comprueba comentarios, trece transiciones del ciclo y recarga. Modelo comprueba actor, fecha, responsable, tarea y evidencias de aprobación. | Circuito completo de `tests/content-workflow-browser.spec.ts`; `tests/content-workflow-model.spec.ts:8`; `tests/workflow-integration-browser.spec.ts:51`. |
| 29 | Cambiar de cliente | Navegador cambia EPSA por ACA y no encuentra productos, recursos de Diseño, contenido ni ideas del otro cliente. | `tests/profile-library-browser.spec.ts:4`; `tests/design-workspace-browser.spec.ts:21`; `tests/benchmark-evolution-browser.spec.ts:6`; circuito completo de Contenidos. |
| 30 | Comprobar aislamiento | Navegador conserva clientes con mismo ID externo sin cruzar tarea/notificación. Modelos rechazan relaciones ajenas y filtran portal. | `tests/workflow-integration-browser.spec.ts:51`; `tests/workflow-integration-model.spec.ts:19` y `:72`; `tests/profile-library-model.spec.ts:12`; `tests/portal-model.spec.ts:9`. |
| 31 | Cambiar de rol | Navegador revisa como PM con actor registrado y comprueba lectura operativa de Ficha. Modelos controlan Content/Diseño/cliente; regresión cubre PM asignado/no asignado y finanzas. | `tests/workflow-integration-browser.spec.ts:51`; `tests/profile-library-browser.spec.ts:4`; `tests/content-workflow-model.spec.ts:48`; `tests/discovery-browser.spec.ts:249`; `tests/operations-clients-browser.spec.ts:155`. |
| 32 | Revisar mobile | Navegador mide ausencia de desborde global a 390 px en Ficha, Diseño, Contenidos, captura de Benchmark y portal, incluido calendario y diálogo. | `tests/profile-library-browser.spec.ts:4`; `tests/design-workspace-browser.spec.ts:21`; circuito completo de Contenidos; `tests/benchmark-evolution-browser.spec.ts:6`; `tests/portal-browser.spec.ts:55`; `tests/operations-clients-browser.spec.ts:175`. |
| 33 | Regresión de Inicio, Tareas, Discovery, Plan, Reportes y módulos | Navegador recorre Inicio/Tareas y accesos de cliente, Discovery, Plan/servicios, reportes y módulos secundarios. Propuestas y PPTX integran la regresión general. | `tests/discovery-browser.spec.ts:65` y `:363`; `tests/strategic-documents-browser.spec.ts`; `tests/modules-browser.spec.ts`; `tests/knowledge-browser.spec.ts`; `tests/intake-presentation-browser.spec.ts`; `tests/pptx-*-browser.spec.ts`. |

## Auditoría específica de tareas, persistencia y notificaciones

`tests/workflow-integration-model.spec.ts`: **8 pruebas aprobadas** en ejecución focalizada, con configuración temporal sin servidor y un worker. Se repitió después de reforzar la visibilidad del guardado conjunto.

1. Dos clientes con mismo ID de contenido conservan tareas distintas; cliente explícito prevalece sobre asociación heredada contradictoria.
2. Tarea heredada se recupera por proyecto y se reutiliza en revisión, Diseño, ajustes, reenvío y programación, conservando comentarios.
3. Solicitud de información bloquea la tarea y respuesta libera el bloqueo sin cambiar identidad.
4. Reintentar un evento conserva ID de notificación; otros contenidos/clientes reciben IDs y rutas distintos.
5. Vencimientos respetan medianoche de Buenos Aires, excluyen tareas completas y conservan identidad al recalcular.
6. Cada observador del guardado conjunto ve contenido y workspace completos, con mismo instante de guardado; claves ajenas intactas.
7. Falla de cuota restaura valores serializados originales, elimina claves nuevas del intento y no emite eventos de éxito.
8. Valor no serializable deja intacta la persistencia anterior.

`tests/workflow-integration-browser.spec.ts`: **3 pruebas aprobadas** en ejecución focalizada sobre `http://localhost:3101`. Conservan la aserción de ausencia de errores de página. El fallo de hidratación detectado inicialmente se corrigió en `useOsStore`; después se repitieron los tres casos completos.

1. Una transición actualiza una sola tarea. Notificación abre contenido y se marca leída; revisión como PM conserva actor e identidad. Otro cliente con mismo ID permanece intacto y recarga conserva tareas/notificaciones.
2. Falla de escritura del workspace revierte también contenido, sin notificación de éxito. Reintentar completa una única transición.
3. Dos pestañas reciben el cambio y convergen sin repetir escrituras idénticas indefinidamente.

ESLint focalizado de ambos archivos de pruebas y `workflow-tasks.ts`: sin errores. Estos resultados específicos no sustituyen el cierre del proyecto completo.

## Límites acreditados

- Roles y portal son controles visuales del entorno local; no constituyen autorización de backend.
- Recarga y comunicación entre pestañas comprueban persistencia del mismo navegador, no colaboración entre dispositivos o usuarios autenticados.
- Guardado conjunto usa rollback de mejor esfuerzo sobre localStorage; no equivale a transacción de servidor.
- Adjuntos de Ficha y portal se probaron con archivos reales locales. Enlaces de diseño de los casos son fixtures; no acreditan acceso a proveedores ni sincronización de Drive.
- Programado representa confirmación operativa local. Ninguna prueba acredita publicación en Metricool, catálogo sincronizado con Tiendanube, edición en Claude Design ni conexión con Arlis.
- Casos con respuesta simulada del asistente acreditan el contrato de prueba; no un proveedor de IA activo. Crear contenido manual no depende de IA.
- Un build y una suite local no acreditan commit, push, Quality Gate remoto, deployment ni validación del cliente. Esos hitos se registran en el informe de entrega.

## Cierre consolidado de la revisión final

**APROBADO: 175/175 pruebas —104 de dominio y 71 de navegador— contra el build local de esta entrega, en 3 minutos.** Sin casos fallidos ni ignorados. Los números anteriores describen las ejecuciones históricas y los hallazgos corregidos.

Instalación, lint (0 errores, 4 advertencias heredadas), typecheck y build (289 páginas) aprobados; auditoría de dependencias de producción con 0 vulnerabilidades. El cierre incluye la ejecución ampliada que crea un eje nuevo, la expectativa de Benchmark externo, el asistente opcional de Diseño, las regresiones focalizadas ya corregidas y los resultados globales de instalación, lint, typecheck, build y Playwright sobre el mismo código. Comandos reproducibles:

```bash
npm ci
npm run lint
npm run typecheck
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test --project=domain
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test --project=browser
```
