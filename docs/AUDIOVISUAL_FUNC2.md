# Audiovisuales · Jornada audiovisual y catálogo de proveedores (Funcionalidades 2)

Fuente: `docs/FUNCIONALIDADES_2.md`, secciones «📄 Audiovisuales» y «Pendiente para Personas y Cultura · Catálogo de proveedores».

> Vista previa local. Todo se guarda en este navegador (`localStorage`, prefijo `avans-os:preview:v1:`). No hay base de datos, ni Google Drive conectado, ni acceso autenticado para proveedores o clientes. Los permisos por rol son **visuales**: no son seguridad de servidor.

## Qué se construyó

| Spec | Implementación |
| --- | --- |
| Crear jornada (Content o PM) con tipo, proveedor del catálogo, fecha, carpeta de Drive y brief opcional | `Audiovisuales › Jornadas › Nueva jornada` (panel breve). Tipos: UGC, Producto, Institucional, Cobertura de evento. Los proveedores recomendados para el tipo elegido aparecen primero. La carpeta de Drive es solo un enlace (se valida el formato http/https); el OS no la crea ni revisa. |
| 1 · Validación: el PM confirma que queden jornadas; el sistema muestra usadas y disponibles | Medidor «Cupo de jornadas» (usadas / a validar / disponibles). Cupo por cuenta: jornadas contratadas por período (editable por Administrador o el PM/responsable de la cuenta). Sin jornadas disponibles el botón «Confirmar jornada disponible» queda deshabilitado y la tarea de cada jornada en espera queda bloqueada. Una jornada cancelada libera el cupo. |
| 2 · Agenda | Fecha, horario, locación y nota de coordinación con cliente y proveedor; «Confirmar agenda». |
| 3 · Brief y guiones (Content) | Brief + guion (texto o enlace). «Enviar brief al proveedor»: recién ahí el proveedor ve brief y guion. |
| 4 · Rodaje (proveedor) | El proveedor carga el plan de rodaje y marca «Material subido» desde su espacio. |
| 5 · Edición (proveedor, 3 días) | Al marcar el material crudo se calcula la fecha límite: 3 días corridos (hora de Buenos Aires). Si Content pide ajustes, el plazo se recalcula. «Marcar edición subida» genera versiones v1, v2… |
| 6 · Cierre | Content valida (o pide ajustes) → se crea **un único** pedido a Diseño `DIS-<jornada>` con `servicioOrigen: "audiovisuales"` para subtítulos y motion → el diseñador entrega el enlace final → el cliente aprueba o pide cambios desde su portal. Al aprobar se registra una entrega en «Guiones y entregas». |
| Cada etapa crea/reasigna LA tarea y notifica al siguiente responsable | Una tarea por jornada (`AV-<cliente>-<jornada>`), reasignada en cada etapa (PM → Content → proveedor → Content → diseñador → cliente → Content). Volver atrás no duplica la tarea. Cada transición deja una notificación con el enlace al espacio que corresponde (equipo, `/v2/proveedor` o `/v2/portal/<cliente>`). |
| Proveedores con acceso limitado a sus jornadas | `/v2/proveedor`. Con el rol «Proveedor externo» se elige qué proveedor del catálogo se previsualiza («Ver como»). Solo ve jornadas asignadas a ese proveedor, sin comentarios internos ni del cliente, ni otras jornadas. La gestión interna (`/v2/clientes/**`) sigue bloqueada para ese rol, con un acceso a «Abrir mis jornadas». |
| Catálogo de proveedores en Personas y Cultura | `/v2/proveedores` (RRHH › Catálogo de proveedores). Foto (imagen cargada desde el equipo o iniciales), redes/portfolio, descripción y tipos de jornada recomendados. Alta, edición, baja/reactivación y eliminación (solo proveedores cargados a mano y sin jornadas). Edita la responsable del área (en la vista previa: rol Administrador). |
| Objetos anteriores (producciones, guiones, rodajes, versiones, entregas) | Se conservan legibles y editables en la sección secundaria «Guiones y entregas». No se borró ni migró ningún dato. |

## Claves locales

| Clave | Contenido |
| --- | --- |
| `client:<slug>:module:audiovisuales:jornadas` | Jornadas (`ModuleRecord`, colección nueva) con transiciones y comentarios (visibilidad interno / proveedor / cliente). |
| `client:<slug>:audiovisuales:jornadas-cupo` | Cupo contratado por período (cantidad, período, fechas, historial). |
| `providers:catalog` | Catálogo de proveedores. |
| `providers:preview-identity` | Proveedor que se previsualiza con el rol «Proveedor externo». |
| `client:<slug>:module:diseno-marca:trabajos` | Pedido `DIS-<jornada>` (aditivo, campo `jornadaId`). |
| `client:<slug>:module:audiovisuales:entregas` | Entrega `ENT-<jornada>` al aprobar el cliente. |

Las claves anteriores de Audiovisuales (`producciones`, `guiones`, `rodajes`, `versiones`, `entregas`) se leen igual que antes.

## Datos de demostración

`app/v2/os/modules/av-demo.ts` y `app/v2/os/providers-catalog.ts`, rotulados «Demo»:

- Edinovo (Audiovisuales activo): cupo de 6 jornadas en el trimestre oct–dic 2026 y 6 jornadas, una en cada etapa (incluida una cerrada y una esperando aprobación del cliente). Quedan 5 usadas, 1 a validar y 1 disponible.
- EPSA: 2 jornadas y cupo de 2, visibles **solo** si se activa Audiovisuales como demostración. No se cambió ningún servicio contratado.
- Proveedores ficticios: Kinética Films, Estudio Bruma y Lumen Audiovisual, con enlaces de ejemplo y avatar de iniciales.

## Archivos

- Modelo puro: `app/v2/os/modules/av-model.ts` (etapas, acciones por rol, cupo, tarea única, notificaciones, pedido a Diseño, vistas acotadas de proveedor y cliente).
- Operaciones: `app/v2/os/modules/av-operations.ts`. UI: `av-jornadas.tsx`, `av-portal.tsx`, `av-provider-space.tsx`, `av-jornadas.module.css`.
- Catálogo: `app/v2/os/providers-catalog.ts`, `providers-store.ts`, `providers-ui.tsx`, `providers-view.tsx`, `providers-catalog.module.css`.
- Rutas nuevas: `app/v2/proveedores/page.tsx`, `app/v2/proveedor/page.tsx`.
- Cambios mínimos y aditivos en archivos compartidos: registro de la colección (`collections.ts`), semillas (`demo-fixtures.ts`), `OsTask.workflow.kind` admite `"jornada"` (`os-data.ts`), sección del portal (`client-portal.tsx`), acceso «Abrir mis jornadas» para el rol proveedor (`os-shell.tsx`), entrada en RRHH (`navigation.ts`), origen «Audiovisuales» y apoyo a Diseño sin contrato (`design-operation.ts`, `use-design-operations.ts`, `design-workspace.tsx`, `module-workspace.tsx`), textos del módulo (`service-workspace-data.ts`, `service-modules.ts`), etiqueta del enlace de la tarea (`task-blocks.tsx`).

## Pendiente

- Conexión real con Google Drive (crear la carpeta, verificar que el material esté subido).
- Acceso autenticado de proveedores y clientes, y permisos aplicados en servidor.
- Definir si el plazo de edición son días corridos (implementado) o hábiles.
- El cupo vive aparte de la configuración del módulo; falta unificarlo con el alcance contratado cuando exista persistencia real.
- El área sigue rotulada «RRHH» en la navegación; renombrarla a «Personas y Cultura» es una decisión de navegación global.
