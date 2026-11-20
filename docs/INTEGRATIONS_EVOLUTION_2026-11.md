# Integraciones de Ficha, Diseño y Contenidos

Revisión documental y de código: 20/11/2026. Alcance: viabilidad y preparación; no se conectaron cuentas, no se enviaron publicaciones, no se instalaron aplicaciones en tiendas y no se ejecutaron migraciones.

## Estado comprobado

| Servicio | Viabilidad comprobada en documentación oficial | Estado en Avans OS | Bloqueo para una prueba real |
| --- | --- | --- | --- |
| Metricool | API para consultar publicaciones y programar/editar; disponibilidad y formatos dependen de cuenta y red | No conectado; el calendario operativo es local | Cuenta de prueba de Gabi, plan con API, token y asignación de marcas a clientes |
| Google Drive / Workspace | API de archivos, metadatos y permisos por OAuth | Adapters y contratos existentes; rutas de conexión cerradas | Identidad real, repositorios de servidor, consentimiento y cuenta autorizada |
| Claude Design | Producto de Anthropic Labs con sistemas de diseño, enlaces compartidos y exportaciones | Referencia conceptual y posible intercambio manual | Acceso a un proyecto del cliente y comprobación de permisos; API de edición no verificada |
| Arlis | El nombre no identifica con certeza al proveedor requerido | Proveedor por identificar | URL oficial o nombre comercial exacto |
| Tiendanube / Nuvemshop | OAuth y API de catálogo con productos, variantes, imágenes y categorías | Sin sincronización de catálogo activa | Aplicación autorizada en tienda de prueba, permisos y backend persistente |

Un enlace externo, un archivo agregado a la biblioteca o una cuenta accesible desde una herramienta del entorno de desarrollo no constituye una integración instalada en Avans OS. Los estados anteriores no dependen de los perfiles simulados de la preview.

## Metricool

La documentación oficial confirma acceso API en planes Advanced y Custom. La autenticación utiliza `X-Mc-Auth` y los identificadores `userId` y `blogId`; este último representa la marca. Describe `GET /api/v2/scheduler/posts` para listar publicaciones entre fechas y `GET /api/v2/scheduler/posts/{id}` para obtener una. También documenta creación, edición y aprobación, por lo que la plataforma no está limitada a lectura. La escritura exige validar los requisitos de cada red y la fecha/zona horaria. No se comprobó que la cuenta de Avans tenga esos permisos. [Guía oficial de API](https://help.metricool.com/basic-guide-for-api-integration-r97af).

La API ofrece extracción de datos y automatización, pero no todas las funciones disponibles en el planificador tienen equivalencia para cada red. La lectura de métricas y la programación deben verificarse por separado con datos reales. [Acceso API de Metricool](https://help.metricool.com/api-access-export-your-metricool-data-to-other-tools-and-automate-tasks-x8ln5).

El proveedor recomienda un backend intermediario para que el token no llegue al navegador. La integración White Label y su modalidad comercial son asuntos distintos de mostrar datos obtenidos con la API en un calendario propio. [Arquitectura oficial de integración](https://help.metricool.com/wli-integration-architecture-customer-success-approach-xjxku).

### Secuencia propuesta para Avans

1. Damián solicita a Gabi una cuenta o marca de prueba y confirma que el plan incluye API. Esa solicitud sigue pendiente; esta tarea no envió mensajes a terceros.
2. Registrar del lado servidor la conexión y asociar explícitamente cada `blogId` al cliente correcto. No deducir el cliente solo por el nombre comercial.
3. Leer primero las marcas autorizadas y una ventana acotada del calendario. Capturar fixtures anonimizados para validar el schema real, los estados, la paginación y los límites vigentes de la cuenta.
4. Mostrar publicaciones importadas diferenciadas de contenidos producidos en Avans. Un resultado vacío debe distinguirse de una falla de conexión.
5. Relacionar una publicación con un contenido local mediante IDs explícitos. Conservar la aprobación de Avans, la programación externa y la publicación efectiva como hechos separados.
6. Habilitar escritura únicamente después de probarla en la marca de prueba y definir quién puede confirmar la acción. Una aprobación final local no debe publicar automáticamente.

### Contrato futuro propuesto

Este contrato es una especificación de implementación pendiente, no una API activa ni un schema ya migrado:

```ts
type CalendarConnection = {
  id: string;
  clientId: string;
  provider: "metricool";
  externalAccountId: string; // userId
  externalBrandId: string;   // blogId
  capabilities: { calendarRead: boolean; metricsRead: boolean; scheduleWrite: boolean };
  verifiedAt?: string;
  lastSuccessfulSyncAt?: string;
  state: "not-connected" | "pending-validation" | "connected" | "expired" | "error";
};

type ExternalCalendarPublication = {
  connectionId: string;
  externalId: string;
  clientId: string;
  localContentId?: string;
  channel: string;
  scheduledAt: string;      // instante ISO con offset; conservar también timezone
  timezone: string;         // IANA, por ejemplo America/Argentina/Buenos_Aires
  providerState: string;    // conservar el valor original, incluso si es desconocido
  fetchedAt: string;
};
```

La unicidad propuesta es `(connectionId, externalId, channel)` si la respuesta separa proveedores por publicación; confirmar esa cardinalidad con el schema real. Los contenidos manuales conservan sus IDs y su historial. El calendario será una proyección de ambos orígenes, no una segunda colección editable de contenidos.

Para escribir, registrar intención, contenido/versión aprobada e ID externo retornado. Ante un timeout después de enviar, conciliar el resultado antes de repetir: no asumir que el proveedor garantiza idempotencia. Guardar la referencia de una credencial cifrada en servidor, nunca el token dentro de este contrato ni en localStorage.

### Validación pendiente

- Lectura con cuenta autorizada, marca correcta y dos marcas distintas para comprobar aislamiento.
- Fechas en límites de mes/semana y conversión de zona horaria; una misma publicación no puede duplicarse al ampliar el rango.
- Estados nuevos/desconocidos, errores de red, cuota, revocación del token y credenciales sin acceso a una marca.
- Correspondencia de canales y formatos realmente disponibles. Newsletter y Blog locales no se presentan como canales sincronizados sin soporte verificado.
- Métricas por red y fecha; no generar mapas de calor ni mejores horarios con datos inventados.
- Borrador de prueba con texto, recursos y formato; luego programación, modificación y cancelación solo en una cuenta de prueba autorizada. Confirmar resultado en Metricool.

## Google Drive / Workspace

El repositorio ya tiene `GoogleWorkspaceAdapter`, OAuth con PKCE, contratos de repositorio y validación OIDC de eventos. `driveMetadata()` obtiene metadatos de un archivo, y `GOOGLE_SCOPES` incluye `drive.metadata.readonly`. Esto no implementa una biblioteca de archivos sincronizada ni permite descargar cualquier documento. `/api/integrations/google/[action]` devuelve el estado sin conexión y mantiene las acciones de conexión y sincronización cerradas hasta contar con autenticación y persistencia de servidor. Ver [documentación existente](GOOGLE_WORKSPACE.md).

Google distingue scopes de metadatos y acceso a archivos; recomienda el permiso más acotado apropiado. `drive.file` permite operar sobre archivos seleccionados/compartidos con la aplicación y se puede combinar con Google Picker. No equivale a acceso automático a todo Drive. [Scopes oficiales de Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).

La API identifica cada archivo por `fileId`. `files.list` permite buscar y `fields` limita los metadatos retornados; obtener contenido requiere una operación y permisos adecuados. [Búsqueda y lectura de archivos](https://developers.google.com/workspace/drive/api/guides/search-files).

### Ampliación futura propuesta

- Mantener `KnowledgeState.sources` como fuente canónica de materiales. Agregar allí el `fileId` externo, conexión, versión/fecha externa y vínculo a cliente/producto/servicio; no crear una biblioteca paralela.
- Reutilizar OAuth y el repositorio de tokens preparados. Evaluar Picker para seleccionar archivos concretos antes de ampliar scopes; una URL pegada permanece como referencia manual hasta verificar acceso.
- Diferenciar archivo original, metadatos, texto extraído y pieza entregable. Una extracción local no implica que el original esté almacenado ni sincronizado.
- Verificar permisos de lectura y descarga con el usuario real. Registrar un error de acceso o revocación sin borrar la referencia ni su historial local.
- Definir almacenamiento de originales y conservación de versiones antes de mostrar una acción como «sincronizar» o «descargar original».

Pruebas externas pendientes: OAuth real, selección de un archivo permitido, rechazo de archivo no compartido, asociación al cliente, actualización de metadatos, revocación y acceso desde otra identidad. En esta investigación se inspeccionó código; no se repitieron los tests históricos de Google ni se efectuaron llamadas autenticadas.

## Claude Design

El producto identificado es **Claude Design, de Anthropic Labs**. El anuncio oficial describe creación de sistemas de diseño a partir de código y archivos, colaboración por organización, URL compartida y exportación a carpeta, Canva, PDF, PPTX o HTML. La mención «Cloud Design» en las notas se interpreta siguiendo el nombre explícito del pedido: Claude Design. [Presentación oficial](https://www.anthropic.com/news/claude-design-anthropic-labs).

Las fuentes revisadas no verifican una API pública para listar o editar proyectos, sincronizar tokens o recuperar recursos del Design System. La documentación de Claude Platform menciona Claude Design como experiencia de frontend fuera de la API; endpoints de analítica de uso de Claude Design no prueban acceso a sus archivos o edición. [Documentación oficial de prompting](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices), [referencia de analítica](https://platform.claude.com/docs/en/api/python/organization/analytics).

La alternativa implementable sin inventar una API es un enlace al proyecto autorizado y un intercambio manual de recursos exportados. El enlace debe rotularse como **Abrir en Claude Design** y el recurso importado debe conservar fecha, responsable, versión y origen. No denominarlo «Conectado» ni prometer actualización automática. La disponibilidad de API queda **no verificada**, sin afirmar que sea imposible o que nunca exista.

Pendiente: cuenta/proyecto del cliente, prueba de acceso compartido con el diseñador y revisión de formatos exportados. Un enlace válido no autoriza a importar recursos de otras organizaciones ni habilita al portal del cliente a navegar la organización de Avans.

## Arlis

Las fuentes proporcionadas solo dicen «Arlis». La búsqueda pública por ese nombre devuelve, entre otros, sociedades de bibliotecas de arte, sin evidencia que identifique al proveedor creativo utilizado por Avans. Por ejemplo, [ARLIS UK & Ireland](https://arlis.net/) se describe como una sociedad de bibliotecas de arte: esa coincidencia de nombre no alcanza para tratarla como el servicio solicitado.

No se sustituye «Arlis» por «Artlist» ni por otra plataforma por similitud fonética. Falta el nombre exacto o la URL oficial. Hasta resolverlo, no hay adapter, credenciales, supuesto catálogo ni botón de conexión. Una vez identificado, verificar API, autenticación, licencias de uso y redistribución, formas de exportación, límites y acceso por usuario. Si solo admite enlaces/descargas manuales, mostrarlo con esa denominación.

## Tiendanube / Nuvemshop

La documentación actual utiliza **Nuvemshop** como marca de plataforma y ofrece referencias para Tiendanube. La autorización se realiza mediante OAuth: instalar la app, intercambiar el código en servidor y conservar el `user_id` devuelto como ID de tienda. Para leer un catálogo, el alcance inicial propuesto es `read_products`; no se necesita pedir escritura para este objetivo. Vincular la instalación a la app y tienda correctas, no reutilizar tokens entre tiendas. [Autenticación oficial](https://nuvemshop.dev/en-US/api/authentication).

El producto tiene ID, nombres y descripciones por idioma, variantes, imágenes y categorías. Las variantes conservan ID propio, `product_id`, `image_id` y SKU, además de atributos comerciales. No usar el título como identificador de sincronización ni confundir producto con variante. [Producto](https://nuvemshop.dev/en-US/api/resources/2025-03/product), [Variantes](https://tiendanube.github.io/api-documentation/resources/product-variant).

Los webhooks documentados incluyen cambios de productos y pueden repetirse o llegar desordenados. La documentación define verificación HMAC y exige idempotencia del receptor. [Webhooks oficiales](https://tiendanube.github.io/api-documentation/resources/webhook).

### Mapeo propuesto para Ficha

| Identidad externa | Destino/criterio local |
| --- | --- |
| Proveedor + tienda + ID de producto | Referencia externa en la oferta canónica de Discovery; una sola oferta por clave externa |
| ID de variante + producto padre | Variante relacionada, sin duplicar el producto principal |
| ID y URL de imagen | Material relacionado con producto/variante y procedencia explícita |
| IDs de categoría | Categoría de origen, separada de clasificación estratégica manual |
| Descripciones y atributos externos | Datos importados con idioma y fecha; no reemplazar beneficios, ICP o diferenciadores redactados por el equipo |
| Fecha externa de actualización | Control de desactualización y conciliación; no prueba de que se haya sincronizado |

Si ya existe una oferta manual coincidente, proponer su vinculación y conservar el ID local; no unir automáticamente por nombre o SKU. La asociación entre tiendas y clientes debe ser explícita. Una baja externa marca la referencia como no disponible, preservando usos históricos en contenidos, campañas y materiales. Mantener la primera etapa en lectura: precio, stock y escritura sobre la tienda quedan fuera de este alcance.

Pruebas pendientes: instalación en tienda de prueba, páginas completas del catálogo, variantes/imágenes/categorías, reimportación sin duplicados, actualización sin perder enriquecimiento estratégico, dos tiendas aisladas, revocación y webhooks firmados/repetidos/desordenados. No se instaló ninguna app ni se consultaron catálogos autenticados durante esta revisión.

## Criterio de activación y evidencia

La investigación documental está completada para Metricool, Google Drive, Claude Design y Tiendanube; Arlis requiere identificación. La integración de una cuenta solo podrá marcarse verificada después de registrar cliente, cuenta externa, capacidades probadas, fecha y resultado de una prueba real. Un build correcto, un fixture o un enlace que abre no sustituyen esa evidencia.

La preview conserva persistencia local y no comparte automáticamente datos entre usuarios. Quedan pendientes backend, identidad, autorización por cliente, almacenamiento de credenciales y sincronización. Este documento no solicita ejecutar migraciones ni modificar variables, dominios o configuración de producción.
