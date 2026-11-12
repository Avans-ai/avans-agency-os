# Módulos, reportes y tareas (etapas 3, 4 y 5)

Desarrollado en una rama de trabajo desde `feat/avans-os-ajustes-reunion-2026-11-03` (`d9e44d0`) e integrado en esa rama. Sin cambios en `main` ni migraciones de Supabase.

## Qué es real y qué no

| Tema | Estado |
| --- | --- |
| Persistencia | Solo vista previa en `localStorage` («Guardado en este navegador»). No hay sincronización multiusuario. |
| Permisos | Visuales, con los roles de vista previa (admin / pm / operativo) y `canManageClient` / `canEditService`. **No son seguridad**: falta aplicarlos en API y RLS. |
| Datos de ejemplo | Ficticios y rotulados «Datos de demostración» / «Demo». No son datos reales de ACA, EPSA ni de ningún cliente. |
| Meta Ads, Google Ads, LinkedIn Ads, redes | «No conectada». No se simula ninguna conexión ni sincronización. |
| Recomendaciones asistidas por IA | «Sin conexión»: no hay proveedor. Las manuales funcionan y se guardan localmente. |

## Etapa 4 · Tareas (store único)

- `OsTask` suma `serviceId?`, `workItem?` (campaña, pieza, producción… del módulo) y `deliverable?`. Todas las tareas semilla declaran su `serviceId`.
- Migración compatible en `os-store.tsx` (`validPersistedState`): las tareas guardadas sin `serviceId` lo reciben de `serviceForTask` (mismo `localStorage` key `workspace`, ningún otro campo cambia, ninguna tarea se descarta). `serviceForTask` ahora prioriza el `serviceId` explícito.
- `createTask` acepta `serviceId`, `workItem`, `deliverable`, `desc`, `approver`; nuevas acciones `editTask` (responsable, vencimiento, aprobador, entregable, vínculo) y `addFileRef` (referencia de archivo, sin subir binarios).
- `NewTaskModal`: módulo (fijo dentro de un módulo o elegible entre los activos), proyecto, campaña/objeto, entregable del alcance, responsable, prioridad, vencimiento y descripción.
- `TaskSidePanel` (antes `TaskPanel` privado de `project.tsx`) se comparte entre el proyecto, el Kanban de cada módulo y la vista transversal (esta en solo lectura).
- Kanban por módulo (`modules/module-task-board.tsx`): Kanban + lista, filtros por proyecto o campaña, responsable, estado, fecha y prioridad, «Archivadas (n)» (regla de 30 días intacta, ocultas por defecto), panel con estado, prioridad, responsable, vencimiento, aprobador, entregable, archivos, comentarios y actividad. Deep link: `/v2/clientes/<slug>/<modulo>?seccion=tareas&task=T-142`.
- «Tareas» del cliente (`/v2/clientes/<slug>/tareas`) es la vista transversal: resumen por módulo (con enlace al Kanban), responsables, bloqueos, lista filtrable y archivo. Si un módulo inactivo conserva tareas, se muestra como «Módulo inactivo» (no se ocultan ni se borran).
- URLs anteriores conservadas: `/v2/clientes/[client]/tareas`, `/v2/proyectos/...?task=`, `?view=lista`.

## Etapa 5 · Módulos de servicio (`app/v2/os/modules/`)

| Archivo | Contenido |
| --- | --- |
| `types.ts`, `collections.ts` | Modelo `ModuleRecord` y definición de los objetos propios de cada módulo |
| `demo-fixtures.ts` | Registros DEMO (ficticios) por cliente/módulo |
| `store.ts` | Lectura/escritura local por colección: `avans-os:preview:v1:client:<slug>:module:<serviceId>:<colección>` |
| `recommendations.ts` | Manuales (clave anterior `client:<slug>:service:<id>:recommendations`, sin migrar ni borrar), estado/prioridad en `...:recommendation-status` |
| `collection-view.tsx` | Listado, filtros, alta, detalle editable, aprobación, tareas vinculadas e historial |
| `module-task-board.tsx` | Kanban/lista del módulo |
| `module-common.tsx` | Resumen operativo, alertas, alcance, documentación, entregables y aprobaciones, recomendaciones (IA «Sin conexión»), historial |
| `paid-media.tsx`, `content.tsx`, `other-modules.tsx` | Vistas propias de cada módulo |
| `module-workspace.tsx` | Shell del módulo y navegación interna sincronizada con `?seccion=` |

Cada registro guarda `client`, `module`, `collection`, `user` (CURRENT_USER), `source` (`manual` / `demo` / `integration`), `history`, `createdAt`, `updatedAt`.

| Módulo (ruta) | Secciones y objetos |
| --- | --- |
| Publicidad digital (`campanas`) | Resumen (campañas activas, inversión, resultados, alertas, tareas, aprobaciones, próximas acciones, integraciones «No conectada»), Campañas (alta con nombre, objetivo, plataforma, audiencia, presupuesto, estado, responsable, período; detalle `?campana=`), Tareas, Producción creativa (brief, piezas, copy, versión, feedback, aprobación), Optimización (hipótesis, cambio propuesto/realizado, fecha, responsable, resultado esperado/observado), Resultados (reporte de pauta + aprendizajes), Recomendaciones. **Se eliminó el bloque genérico «Flujo del servicio».** |
| Contenidos (`contenido`) | Resumen con piezas por estado, Calendario editorial (mes/semana, filtro por canal, alta por fecha), Piezas, Ejes temáticos, Ideas, Tareas, Resultados (reporte de contenidos + aprendizajes), aprobaciones de piezas |
| Estrategia y coordinación (`estrategia`) | Planificación (prioridades por horizonte), Seguimiento de módulos (desde tareas + alcance), Reuniones, Decisiones, Riesgos y bloqueos (registro + bloqueos de todas las tareas), Recomendaciones consolidadas de todos los módulos, Tareas |
| Desarrollo web (`desarrollo-web`) | Proyectos por etapa (definición → mantenimiento), Sitemap (árbol + tabla), Requisitos, QA, Publicaciones y mantenimiento, Tareas |
| Audiovisuales (`audiovisuales`) | Producciones por etapa, Guiones, Preproducción y rodajes, Edición y versiones, Entregas, Tareas |
| CRM, IA y automatizaciones, Diseño de marca, Soluciones gráficas, Mercado Libre | Un objeto genérico con las etapas ya definidas en `service-workspace-data.ts`; Kanban, entregables, aprobaciones, recomendaciones e historial. No se inventaron pasos sin documentación. |

Todos los módulos tienen además «Entregables y aprobaciones» (entregables de `DEFAULT_SCOPE` con estado calculado desde las tareas vinculadas), «Recomendaciones», «Historial» y enlace a Documentos de la ficha.

Una URL de módulo no activo (`servicesOf`) muestra un estado restringido que explica que no está activo y que sus datos no se borran.

## Etapa 3 · Reportes (`app/v2/os/reports/`)

- `ClientReports` salió de `client-management-views.tsx` (único cambio en ese archivo: import + quitar la función y sus imports sin uso).
- `builders.ts`: funciones puras `buildWeeklyReport`, `buildMonthlyReport`, `buildPaidMediaReport`, `buildContentReport` que reciben tareas, objetos de los módulos y métricas y devuelven view models. `adapters.ts` convierte registros de módulos en entradas; `demo-fixtures.ts` contiene **solo** métricas ficticias.
- Reportes: Semanal operativo (filtro por módulo activo), Mensual de resultados, Publicidad digital, Contenidos (estos dos solo si el módulo está activo). Cada uno con KPIs, gráficos SVG propios accesibles (`role="img"`, `<title>`, `<desc>` y tabla de datos), comparativas, tablas, conclusión y «Fuentes» (tareas / objetos / demo / integración «No conectada»). ROAS solo para modelo ecommerce.

## QA

```
npm ci
npm run lint        # 0 errores (4 advertencias previas)
npm run typecheck
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium E2E_PORT=3512 npm exec -- playwright test
```

`E2E_PORT` (nuevo, opcional) cambia el puerto del servidor de pruebas; por defecto sigue siendo 3000. Pruebas nuevas: `tests/modules-reports-model.spec.ts` (dominio) y `tests/modules-browser.spec.ts` (navegador, incluye 1440/1280/820/390 px sin desborde horizontal).

## Pendiente

- Persistencia real (Supabase) de tareas y objetos de módulos, con permisos en servidor.
- Integraciones de pauta y redes; proveedor de IA para recomendaciones asistidas.
- Arrastrar tarjetas entre columnas; selector de fecha completo; carga de archivos a Drive/Storage.
- Exportar/enviar reportes al cliente; plantillas aprobadas.
- Procesos detallados de CRM, IA, Diseño de marca, Soluciones gráficas y Mercado Libre cuando estén documentados.
