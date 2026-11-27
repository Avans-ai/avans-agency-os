# Contenidos · operación editorial mensual (ampliación 20/11/2026)

Rama: `feat/avans-os-contenidos` (desde `feat/avans-os-ajustes-reunion-2026-11-03`). Vista previa local: todo se guarda en este navegador (`localStorage` + IndexedDB para adjuntos). Los roles de la vista previa son visuales, no permisos de servidor. Metricool no está conectado: no hay sincronización simulada.

## Estructura del servicio (actualización 27/11/2026)

La operación mensual se concentra en dos herramientas; lo demás es lineamiento o seguimiento.

| Área | Sección · componente | Contenido |
| --- | --- | --- |
| Lineamientos | `?area=lineamientos` · `ContentGuidelines` (`content-guidelines.tsx`) | «Lineamientos de Contenidos»: consulta del Plan de Marketing, do's & don'ts, glosario, notas anteriores. |
| Operación · Plan de contenidos | `?seccion=planes` · `ContentPlanSection` (`content-plan.tsx`) | Por período (`plan=<id>`), con partes en `bloque=objetivos|ejes|ideas|canales|material`: objetivos y temáticas, ejes temáticos (alta/edición, ICP, distribución), ideas y bajadas de los contenidos del período + banco de ideas (para el período / futuras / todas; conversión sin duplicar), canales y formatos, y material que necesitamos del cliente. |
| Operación · Calendario | `?seccion=calendario` · `ContentCalendarSection` (`content-calendar.tsx`) | Herramienta principal: todas las piezas con etapa, fecha y responsable; vistas `mes`, `semana`, `dia`, `lista`, `tablero`; filtros de canal, estado/etapa, eje, responsable, plan y búsqueda. Abre la ficha única del contenido. |
| Operación · Tareas, Resultados | `tareas`, `resultados` | Sin cambios. |

Alias que siguen funcionando hasta que la navegación del módulo se reorganice: `PlansSection` → plan; `AxesSection` → plan con `bloque=ejes`; `IdeasSection` → plan con `bloque=ideas`; `CalendarSection` → calendario; `PiecesSection` → calendario en vista `lista`. Enlaces anteriores `?seccion=piezas&registro=<id>` (notificaciones, Diseño) abren la misma ficha.

### Estado en la URL y «Volver»

`content-calendar-state.ts` lee y escribe `vista`, `mes`, `fecha`, `canal`, `etapa` (o `estado`), `eje`, `resp`, `plan`, `periodo`, `q` y `pieza` (acepta `registro` y `paso` heredados). Abrir una pieza agrega `pieza` + `volver=<calendario o plan de origen>` (helper compartido `navigation/back.tsx`). La ficha muestra `BackButton` («Volver al calendario» / «Volver al plan»); cerrar el panel (X o Escape) vuelve al mismo origen y devuelve el foco a la pieza. Comentarios, enlaces de diseño, programación, preproducción y el editor sin guardar se registran con `useUnsavedChanges`.

### Ficha única del contenido (`content-detail.tsx`)

Encabezado (título, estado, marca de programación, versión vigente, código interno secundario), etapas, «Próximo paso» con las acciones del flujo y qué versión se revisa. Pestañas: **Ficha** (vista previa con copy y CTA, eje, canal y formato, fecha y tipo de programación, responsables, período, idea/bajada/objetivo/mensaje, referencias, materiales vinculados, qué necesitamos del cliente, tarea y pedido de diseño), **Preproducción**, **Revisiones y aprobaciones** (aprobaciones de la versión vigente + comentarios por versión) e **Historial**.

### Aprobaciones atadas a la versión

`contentApprovals` / `validApproval` (`content-workflow.ts`): cada aprobación (revisión interna del PM, validación conjunta con el cliente, revisión interna del diseño, aprobación final) vale solo para la versión registrada en su transición. Deja de valer si cambia la versión (`Propuesta vN` por reenvío; `Diseño vN` por nueva entrega) o si después se pidieron ajustes sobre esa versión. Un reenvío de diseño sin cambiar el rótulo se numera solo (`nextDesignVersion`). En ajustes de diseño no se edita la propuesta ya validada. Se guardan además `preliminaryApprovedVersion` y `finalApprovedVersion`.

### Materiales vinculados

`values.materialesVinculados` guarda solo referencias `{ id, at, by }` a fuentes de «Archivos y documentos» (`k.sources`, archivos en IndexedDB `avans-os-client-files-v1`). Abrir consulta el origen (archivo local en otra pestaña, enlace o texto); nunca se copia el archivo ni su contenido. Respeta la visibilidad de cada fuente y el cliente.

### Programación y publicación (Metricool no conectado)

`contentSchedule`: «Fecha prevista» (sin programar), «Programación local» (registrada en Avans, sin confirmación del proveedor), «Programación confirmada por Metricool» (solo con id del proveedor; hoy nunca ocurre) y «Publicación sin verificar» para todo lo marcado «Publicada» sin evidencia. Las dos publicaciones demo de octubre (`PZA-ACA-02`, `PZA-ACA-04`) son registros manuales de demostración. El portal muestra la misma aclaración.

## Flujo

1 Borrador → 2 Revisión interna de producción → 3 Revisión preliminar del cliente (una sola instancia: idea, título, bajada, copy, formato y pedidos) → 4 Ajustes → 5 Producción de diseño (incluye **Preproducción**: checklist con copy definitivo, indicaciones, dimensiones, wireframe, guion, referencias, material y recursos; «Enviar a diseño» genera el pedido) → 6 Revisión interna del diseño → 7 Aprobación final del cliente (→ Aprobado) → 8 Programado. «Información del cliente» vuelve a la etapa de origen. Equivalencias Monday en `MONDAY_STATE`/`CONTENT_FLOW` (`content-workflow.ts`).

- Una tarea por contenido (`CONTENT-<cliente>-<contenido>` o la tarea anterior vinculada); se reasigna en cada transición y al volver de etapa.
- Un pedido de diseño por contenido (`DIS-<contenido>`, vía `upsertDesignRequest` sin modificarlo) enriquecido en `content-design.ts` con preproducción, pedidos al cliente, recursos del Design System y fecha de entrega; reutiliza la tarea del contenido.
- Versiones en la biblioteca de Diseño (`client:<slug>:module:diseno-marca:biblioteca`) reconocidas por archivo o versión del contenido: no se duplican. Heredan el origen (demo/manual) del contenido.
- Comentarios con versión (`Propuesta vN`, `Diseño vN`) e instancia (revisión interna, revisión del cliente, ajustes, aprobación final). `values.contentChanges` registra qué campos cambiaron y quién lo pidió.
- «Qué necesitamos del cliente»: pedidos estructurados (`values.clientRequests`; se mantiene `necesitaCliente` como texto compatible). El cliente responde y adjunta desde el portal.

## Datos de demostración (ACA)

`app/v2/os/modules/content-demo.ts` (registrado en `demoSeedsFor`): planes Noviembre y **Diciembre 2026 — ACA**, 5 ejes, 22 contenidos en todos los estados (historial generado ejecutando el flujo real), 8 ideas, aprendizajes, pedidos de Diseño derivados y versiones con miniaturas PNG ficticias (`content-demo-thumbs.ts`). Todo rotulado **DATOS DE DEMOSTRACIÓN**; no son publicaciones ni datos reales de ACA.

- Las semillas se aplican solo si la clave local está vacía.
- Tareas demo (`content-demo-tasks.ts`): un navegador nuevo las recibe con el estado inicial; en un workspace existente se agregan al abrir Contenidos, sin duplicar (la tarea `T-405` sigue vinculada a `PZA-ACA-03`).
- «Reiniciar datos de demostración» (banner de Plan, Calendario y Resumen) quita solo registros `source: "demo"` de Contenidos y sus derivados de Diseño, los vuelve a sembrar y restablece sus tareas; los registros manuales se conservan.

## Portal del cliente (`/v2/portal/[client]`)

Pendientes agrupados (propuestas para validar, información pedida, piezas para aprobar), calendario mes/semana/día con canal y miniatura, respuesta a pedidos con adjuntos, ajustes y aprobaciones. Solo muestra la proyección pública (snapshot) del cliente de la URL; nada interno ni de otros clientes.

## QA

`tests/content-workflow-*`, `tests/content-calendar-*` (estado en la URL, aprobaciones por versión, programación, materiales, «Volver», 390 px), `tests/content-demo-model.spec.ts`, `tests/content-qa-browser.spec.ts`, `tests/portal-*`.

## Pendiente

Reorganizar la navegación del módulo (`module-workspace.tsx`): operación = Plan de contenidos (`planes`), Calendario (`calendario`), Tareas, Resultados; mapear `ejes`/`ideas` → `planes` y `piezas` → `calendario&vista=lista`. Backend/permisos reales, conexión Metricool (lectura de métricas y programación), miniaturas reales desde archivos de Diseño, edición de guion/wireframe como adjuntos binarios y validación con Avans/cliente.
