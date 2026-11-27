# Avans OS — rediseño Claude Design (iteración 1)

Rama: `claude/laughing-gauss-qc9m2r` (parte de `main` en `646c454`, después del PR #11). No se tocó producción.
Referencia: export HTML de Claude Design «Avans OS» (artboards A–D, móvil 390, estados, componentes y especificación).
El HTML se usó como referencia visual y de interacción: no se copió ni se publicó.

## Qué se encontró antes de cambiar

- Producto vigente: `/v2` (Next.js 16 App Router, React 19). `/` es el MVP anterior y sigue intacto.
- No hay cliente de Supabase, autenticación, API routes ni persistencia en la app: todos los datos son módulos TypeScript de demostración.
  Por eso el rediseño no reemplaza datos reales ni bases de datos.
- `npm run lint` estaba roto (`next lint` ya no existe en Next 16).

## Arquitectura de navegación

`app/v2/navigation.ts` es la única fuente para sidebar, migas, hoja móvil y rutas estáticas.

- Inicio / Command Center → `/v2`
- Operaciones → Clientes (`/v2/clientes`), Proyectos y tareas (`/v2/proyectos`), Producción (`/v2/contenido`), Campañas (`/v2/campanas`),
  Aprobaciones (`/v2/aprobaciones`, contador real), Reportes operativos (`/v2/reportes`, antes colgaba de Gerencia).
- Ventas → Prospectos (`/v2/leads`), Discovery, Oportunidades, Propuestas, Seguimiento comercial (`/v2/ventas`).
- Finanzas → Ingresos y gastos, Facturación y cobranzas, Rentabilidad, Forecast (anclas del hub existente).
- RRHH → Equipo, Roles y habilidades, Burbujas, Contractors, Talento, Disponibilidad (anclas/pestañas existentes).
- Gerencia → Planificación, Indicadores generales, Decisiones, Insights, Aprendizajes, Uso y eficiencia de IA.
- Configuración (utilidad) → `/v2/configuracion`: plataforma (usuarios, integraciones, automatizaciones, seguridad, auditoría, salud, estado del producto), preferencias y mapa completo de módulos.
- Benchmark vive dentro de la ficha (`/v2/clientes/:id?tab=benchmark`). `/v2/benchmark` y `/v2/clientes/:id/benchmark` se conservan.

Todas las URL anteriores siguen respondiendo.

## Archivos

Nuevos (`app/v2/os/`):

| Archivo | Contenido |
| --- | --- |
| `tokens.css` | Tokens `--av-*` del sistema Avans, reset base de `/v2`, remapeo de modo oscuro |
| `brand.tsx` | Logo, Isotipo e íconos del sistema (trazados copiados sin cambios del bundle `AvansDesignSystem_bb7f4b`) |
| `glyphs.tsx` | Glifos utilitarios de OS (cerrar, chevron, campana, candado, lupa…) |
| `os-shell.tsx` | OSSidebar, OSHeader (migas, búsqueda Ctrl K, notificaciones, perfil), riel de tablet, barra inferior y hoja móvil |
| `ui.tsx` | OSStatus, OSPriority, OSDue, Badge, OSKpiTile, Progress, OSEmptyState, OSInlineAlert, OSRestricted, OSSkeletonRows, botones |
| `overlays.tsx` | OSSidePanel, OSModal, OSToast (role=dialog, aria-modal, Esc, foco atrapado y devuelto) |
| `os-store.tsx` | Estado de sesión: tareas, rol de vista previa, toasts con Deshacer |
| `os-data.ts`, `selectors.ts` | Datos de demostración de la iteración y derivaciones |
| `task-blocks.tsx` | Fila de tarea, fila de aprobación, modal «Nueva tarea» |
| `screens/*.tsx` | Inicio, Clientes, ficha, proyecto, listas (proyectos, aprobaciones, mis tareas), configuración |
| `os.module.css`, `screens.module.css` | Estilos con tokens; sin radios, sin sombras salvo overlays |

Rutas nuevas: `app/v2/clientes/page.tsx`, `app/v2/proyectos/page.tsx`, `app/v2/proyectos/[project]/page.tsx`,
`app/v2/aprobaciones/page.tsx`, `app/v2/mis-tareas/page.tsx`, `app/v2/configuracion/page.tsx`, `app/v2/error.tsx`, `app/v2/not-found.tsx`.

Modificados:

- `app/v2/components/v2-chrome.tsx`: misma API (`active`, `title`) + `crumbs` y `legacy`. Los módulos previos se renderizan dentro de `.avans-v2-shell.os-legacy`.
- `app/v2/layout.tsx`: Figtree (400/500/600, latin + latin-ext) y `OsStoreProvider`.
- `app/v2/theme-overrides.css`: ahora es el puente de estilos para módulos previos (Figtree, cantos vivos, mínimo 12 px, rótulos de 13 px).
- 23 hojas de estilo de módulos previos: colores remapeados a tokens Avans (coral #F86E4F → #FF6C4C, negros → Graphite, superficies → Paper, bordes → Stone, semánticos desaturados).
- `app/v2/clientes/[client]/page.tsx`: ficha nueva con pestañas por URL. Se eliminó su CSS anterior.
- `app/v2/page.tsx`: Command Center nuevo. Se eliminaron `command-center-hub.tsx` y `client-hub.tsx` (ver «Diferencias»).
- `app/layout.tsx`, `app/page.tsx`, `app/[section]/page.tsx`: `globals.css` del MVP anterior se carga sólo en sus rutas (antes forzaba `td { font-size: 10px }` en todo el sitio).
- `theme-toggle.tsx`: reescrito con `useSyncExternalStore` (corrige el error de lint) + `ThemeSync` para aplicar el tema guardado en cada página.
- Nombre del cliente unificado a «EPSA / Line Up» en los datos de los módulos existentes (los slugs no cambian).
- `package.json` + `eslint.config.mjs`: `npm run lint` usa ESLint CLI con `eslint-config-next`.

## Funciones implementadas

- **Inicio**: saludo, 4 KPIs enlazados, Mi trabajo (vencidas / hoy / esta semana) con checkbox que marca hecha o aprueba, con Deshacer;
  Esperan tu aprobación; Proyectos con alertas; Bloqueos activos; Actividad. Móvil: pestañas Mi trabajo / Agencia y KPIs 2×2.
- **Clientes**: búsqueda, filtros por estado, burbuja, orden por cliente / proyectos / fee (`aria-sort`), estado vacío con «Limpiar filtros»,
  fee oculto según rol, lista compacta en móvil, primera columna fija en tablet.
- **Ficha del cliente** (menú definido por Avans, `?tab=`, navegable con flechas e Inicio/Fin):
  1. **Resumen** (`resumen`): contexto, proyectos activos, próximos pasos, equipo, contactos, servicios contratados y datos comerciales o bloque restringido.
  2. **Discovery / Conocimiento** (`conocimiento`): discovery de la cuenta (enlaza al Discovery de Ventas, sin duplicarlo), referencias por grupo, memoria y decisiones existentes.
  3. **Benchmark** (`benchmark`): datos existentes de `benchmark-data.ts` + enlace al hub completo.
  4. **Estrategia y plan MKT** (`estrategia`): posicionamiento, audiencias, pilares, canales, KPIs e hitos. Solo EPSA tiene plan cargado; el resto muestra «plan en preparación».
  5. **Proyectos y centro de ideas** (`proyectos`): proyectos, aprobaciones pendientes del cliente, centro de ideas (alta con validación y cambio de estado), frentes y acciones abiertas.
  6. **Servicios activos** (`servicios`): módulos de los servicios contratados, configurables desde «Configurar servicios» sobre el catálogo de 10 servicios de Avans. Publicidad digital y Contenidos abren los espacios existentes (Campañas y Producción); el resto figura como «pendiente de documentación».
  7. **Reportes** (`reportes`): espacio de reportes del cliente, reportes operativos de la agencia y KPIs del plan.
  8. **Soporte** (`soporte`): solicitudes del cliente fuera de los proyectos, con estado, prioridad y responsable.
  Enlaces anteriores: `?tab=aprobaciones` y `?tab=ideas` abren Proyectos y centro de ideas; `?tab=discovery` abre Discovery / Conocimiento.
- **Proyecto**: resumen (responsable, fechas, avance calculado, tareas, alertas), Kanban/Lista (`?view=lista`), filtros, búsqueda,
  panel de tarea (`?task=T-142`) con estado, prioridad, desbloqueo, comentarios, actividad y aprobar / pedir cambios; modal «Nueva tarea» con validación.
  Aprobar T-142 desbloquea T-144. Proyectos sin tareas muestran el estado vacío del diseño.
- **Aprobaciones** y **Mis tareas** (destinos de la barra inferior móvil).
- **Búsqueda global** (Ctrl/Cmd K) sobre clientes, proyectos, tareas y módulos, con teclado.
- **Vista previa de rol** (perfil o Configuración): «Ejecutiva de cuentas» oculta fee, muestra datos comerciales restringidos y bloquea Finanzas y Gerencia con OSRestricted.
- **Estados**: carga (skeleton en Suspense), vacío, sin resultados, error (`error.tsx` con Reintentar), no encontrado, restringido, toast con Deshacer.
- **Responsive**: ≥1280 sidebar 248 px; 768–1279 riel de 72 px expandible; <768 cabecera Graphite, barra inferior (Inicio, Mis tareas, Aprobaciones, Menú) y hoja con las cinco áreas; panel y modal a pantalla completa con acciones fijas.

## Persistencia: qué es real y qué no

No existe backend. Los cambios (crear tarea, cambiar estado o prioridad, comentar, desbloquear, aprobar, pedir cambios, marcar hecha)
viven en memoria en la pestaña del navegador y se pierden al recargar. Cada confirmación dice «(simulado)», la cabecera muestra
«Datos de demostración» y el modal lo aclara. No se usa `localStorage` para simular guardado. El rol de vista previa tampoco persiste
y no es control de acceso.

## Diferencias justificadas respecto del diseño

- Se agregó «Vista general» como primer ítem de cada área para no perder los hubs existentes (`/v2/operaciones`, `/v2/ventas`, …).
- RRHH «Roles» se rotuló «Roles y habilidades» porque enlaza a la sección de habilidades existente. «Riesgos» de Gerencia no tiene sección propia
  en el hub actual: se reemplazó por Insights y Aprendizajes, que ya existían. Burbujas, Contractors, Talento, Forecast y Planificación se conservan.
- La pestaña Benchmark usa los datos existentes del módulo (dimensiones, competidores, señales, oportunidades) en lugar de las cifras del prototipo
  (seguidores, posts, share of voice), para no reemplazar datos del sistema con los del prototipo. No hay selector 30/90 días porque los datos no tienen períodos.
- La ficha sigue el menú de 8 secciones pedido por Avans en lugar de las 6 pestañas del artboard. Aprobaciones dejó de ser pestaña: las del cliente aparecen en Proyectos y centro de ideas, y las de toda la agencia en Operaciones › Aprobaciones. «Módulos de servicios activos» se rotula «Servicios activos» en la pestaña para que el menú entre a 1440 px.
- Los emblemas de servicio (`ModuleIcon` del sistema) solo se usan a gran tamaño en las tarjetas, como indica el sistema; no en línea con texto.
- Se mantuvo el modo oscuro existente con un remapeo de tokens (el sistema Avans no define tema oscuro): queda como propuesta a validar.
- Botones con peso 500 en lugar de 600 para igualar la lectura visual de los artboards.
- Selectores nativos con flecha CSS en lugar del chevron del prototipo.
- Bandeja de excepciones (`/v2/inbox`) se conserva y se accede desde notificaciones, Inicio y Configuración.
- `client-hub.tsx` (portafolio narrativo) y `command-center-hub.tsx` se retiraron: su contenido quedó cubierto por la tabla de Clientes, la pestaña
  Conocimiento (cobertura por cliente), Benchmark y el estado de plataforma en Configuración. El placeholder genérico de `/v2/proyectos` fue reemplazado por el módulo real de proyectos.
- Algunos módulos previos todavía tienen textos de 9–11 px y heros grandes: el puente los alinea pero el rediseño completo de Ventas, Finanzas, RRHH y Gerencia es la próxima iteración.

## Pendiente

| Dependencia | Estado |
| --- | --- |
| Persistencia (Supabase u otra) de tareas, comentarios, aprobaciones | Pendiente. El proyecto Supabase figura INACTIVE; no se reactivó |
| Autenticación Google @avans.agency y roles en servidor | Pendiente. La vista previa de rol es sólo visual |
| Filtrado de datos sensibles (fee, rentabilidad, forecast) en servidor | Pendiente |
| Arrastrar tarjetas entre columnas (con alternativa de teclado) | Pendiente |
| Notificaciones reales | Lista estática enlazada |
| Nuevo cliente / proyecto, exportar, adjuntar, Drive, registrar reunión, actualizar benchmark, usar plantilla, pedir acceso | Aviso «pendiente» |
| Selector de fecha completo en «Nueva tarea» | Lista de fechas de la demo |
| Flujos de los módulos de servicio (salvo Publicidad digital y Contenidos, que reutilizan Campañas y Producción) | Falta la documentación de cada servicio |
| Persistir servicios contratados, ideas, plan de marketing y solicitudes de soporte | Hoy son cambios de sesión «(simulado)» |
| Convertir idea en proyecto, editar plan, nueva solicitud de soporte | Aviso «pendiente» |
| Rediseño profundo de Ventas, Finanzas, RRHH, Gerencia y plataforma con componentes OS | Próxima iteración |
| Alta de las extensiones OS* en el sistema Avans | Requiere autorización del equipo de marca |

## Verificación

- `npm run typecheck`: OK.
- `npm run lint`: 0 errores; 2 avisos en el MVP anterior (`/`), sin cambios.
- `npm run build`: OK, 224 páginas estáticas.
- No hay suite de pruebas en el repositorio. Se ejecutó un recorrido con Playwright (24 verificaciones: aprobar y deshacer, desbloqueo, enlaces viejos de pestañas, alta de ideas, activación de servicios,
  validación del modal, panel con Esc y retorno de foco, `?view`, `?tab`, filtros, búsqueda Ctrl K, vacío, rol restringido): todas pasan, sin errores de página.
- Revisión visual a 1440, 1024, 768 y 390 px de Inicio, Clientes, ficha, proyecto, panel, Finanzas, Ventas, Configuración y 404;
  sin desborde horizontal. Modo oscuro revisado en ficha y Ventas.
