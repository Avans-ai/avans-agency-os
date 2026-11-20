# Diseño de marca y lineamientos · noviembre de 2026

Implementación de la primera etapa acordada el 17/11. Conserva la identidad visual y las colecciones previas del módulo. No modifica contratos, activa integraciones ni ejecuta migraciones.

## Operación

- **Design System visual:** logos y variantes, colores con selector y hexadecimal, muestras tipográficas, recursos gráficos, componentes, aplicaciones y moodboards. Edición, estados e historial por recurso. Las muestras de tipografía usan fuentes instaladas; no descargan archivos de proveedores.
- **Fuentes centrales:** los materiales de identidad y el glosario se leen de la Ficha del cliente. Los documentos visuales se consultan directamente desde el Plan de Marketing. No se replican esas entidades en Diseño.
- **Pedidos:** se conserva `diseno-marca:trabajos`. Los pedidos manuales guardan brief, objetivo, canal, formatos, referencias, recursos, responsable, fecha, origen y comentarios. Pedido y tarea se guardan juntos mediante `commitWorkflow`; ante una falla de almacenamiento, ambos se revierten y el formulario sigue abierto.
- **Pedidos de Contenidos:** se identifican por `contenidoId`; las reiteraciones de una revisión reutilizan el pedido y la tarea central. El brief se modifica desde el contenido de origen. El detalle del pedido muestra esa misma tarea, aun cuando cambia el módulo responsable.
- **Biblioteca de piezas:** cada archivo o enlace conserva su versión, autor, fecha, estado, pedido y contenido de origen. Nueva versión no reemplaza los archivos anteriores. Las piezas vinculadas a Contenidos comienzan como borrador y siguen su flujo de aprobación. Entregar a revisión utiliza la misma transición que Contenidos.
- **Lineamientos / Operación mensual:** navegación común disponible en todos los módulos, conservando las secciones operativas existentes. Los lineamientos consultan alcance configurado, objetivos y estrategia del Plan, con procedimientos y criterios adicionales editables por administración o PM autorizado. Un panel desplegable permite consultarlos durante la ejecución.

## Diseño de apoyo dentro de Contenidos

Algunos clientes tienen Contenidos activo sin contratar Diseño de marca como servicio independiente. El proceso aprobado igualmente requiere producción de diseño.

Cuando existe un pedido vinculado a un contenido y Contenidos está activo, la ruta de Diseño permite acceder a **Pedidos de diseño de Contenidos**, su biblioteca, tareas e historial. Los lineamientos consultados corresponden a Contenidos. Esta vista no activa Diseño como contrato, no lo agrega a la navegación contractual y no habilita pedidos manuales de otros servicios. El contenido enlaza al pedido real. Sin pedido ni contrato activo, permanece el bloqueo previo del módulo.

## Persistencia

| Información | Ubicación |
| --- | --- |
| Pedidos existentes y nuevos | `client:<slug>:module:diseno-marca:trabajos` |
| Recursos propios del Design System | `client:<slug>:module:diseno-marca:sistema` |
| Entregables y versiones | `client:<slug>:module:diseno-marca:biblioteca` |
| Procedimientos adicionales del servicio | `client:<slug>:service-guidelines:<serviceId>` |
| Tareas y notificaciones | Store central `workspace` |
| Materiales, productos, glosario y Plan | Agregado canónico `knowledge:v1` del cliente |

Las claves mantienen el prefijo `avans-os:preview:v1` y el sobre versionado existente. No se reemplazan claves antiguas ni se borran trabajos al desactivar un servicio.

Las imágenes cargadas directamente en el Design System o su biblioteca admiten PNG, JPG, WebP o GIF de hasta 1 MB; se conservan en este navegador. Los materiales de la Ficha se consultan desde su almacenamiento local existente. Para entregar una pieza de Contenidos a revisión se requiere un enlace HTTP/HTTPS accesible: un archivo local no se presenta como compartido con el cliente.

Sin sincronización multiusuario, autenticación de cliente ni RLS activa. Los roles de preview son controles de interfaz, no seguridad de servidor. Claude Design y otras herramientas externas no se presentan como integraciones activas.

## Verificación ejecutada

Suite focal del dominio, reportes y navegador: **12 casos aprobados** contra servidor local de desarrollo en `localhost:3101`.

- Reutilización de pedido y conservación de registros anteriores al reiterar la revisión.
- Versiones inmutables, numeración e aislamiento por cliente.
- Validación de URL, color, tipografía y archivos vacíos.
- Creación y persistencia de recurso visual e imagen tras recargar.
- Pedido manual, tarea única y vínculo visible.
- Biblioteca con dos versiones y conservación de la primera.
- Edición y persistencia de lineamientos; viewport de 390 px sin desborde horizontal.
- Reversión conjunta de pedido y tarea cuando falla la escritura del store; reintento sin duplicar tareas.
- Acceso de diseño de apoyo sin activar un contrato independiente.
- Regresión de reportes, aislamiento de tareas y módulos secundarios.

`npm run typecheck` y ESLint focal aprobados al cerrar este dominio. Build y QA consolidado quedan registrados en el informe principal de la entrega.
