# Ficha del cliente · biblioteca, productos y glosario

La ficha conserva el alcance y Discovery y suma accesos directos a Materiales, Productos y servicios y Glosario. El Cuestionario inicial sigue siendo una herramienta independiente, con los flujos anteriores de carga, extracción, revisión e impresión.

## Fuentes y persistencia

- Los materiales son las mismas entidades de `KnowledgeState.sources`. Categoría, tipo, descripción, relaciones y referencia binaria se guardan en `source.metadata.brandMaterial`. No se agrega otra colección de documentos. Las fuentes previas conservan IDs y metadatos.
- La biblioteca muestra categorías, búsqueda, miniaturas raster, estados, responsable y fecha. Permite archivos locales, URLs http/https y texto. Los materiales pueden relacionarse con productos del Discovery y módulos de servicio.
- Los originales adjuntos en esta biblioteca quedan en IndexedDB `avans-os-client-files-v1`, store `files`, con clave `clientSlug:fileId`. Máximo 20 MB por archivo, rechazo de vacío y formatos ejecutables HTML/JS/SVG. Los metadatos se guardan en el agregado existente, conservando el esquema versionado de localStorage.
- Guardar primero el archivo y después su referencia evita entradas que anuncien un archivo no guardado. Si el guardado de metadatos falla o cambia la revisión en otra pestaña, el archivo nuevo se quita; la ficha queda abierta. Reemplazar un archivo conserva el anterior para los snapshots históricos.
- La persistencia es local a navegador y origen. No hay sincronización multiusuario, storage remoto ni autenticación real. Cambiar de preview/origen no mueve datos. Descargar informa si el blob falta.

## Productos

Los productos y servicios siguen siendo `discovery.offerings`. Los nuevos campos opcionales viven en `offering.profile`: categoría, beneficios, público, ICP, servicios que lo usan y referencia de e-commerce. Las fuentes continúan por ID y los segmentos usan `targetSegments.offeringIds`. La edición conserva la trazabilidad y versiones de Discovery.

Los identificadores externos (plataforma, producto y variante) permiten preparar una futura sincronización sin duplicar registros con la misma identidad. No conectan Tienda Nube ni consultan una API. La integración requiere credenciales, mapeo y pruebas reales posteriores.

## Glosario

`KnowledgeState.brandGlossary` es opcional para conservar datos anteriores. Contiene `use`, `avoid`, `expressions`, `tone`, `technical`, `approvedMessages`, `sourceIds`, `updatedAt` y `updatedBy`. Se normalizan líneas repetidas y se bloquea un mismo término simultáneamente en usar/evitar. Los cambios quedan versionados y las fuentes se validan dentro del cliente.

Diseño y Contenidos pueden leer `glossaryOf(k)` y `materialOf(source)` desde `knowledge/profile-model.ts`. Los blobs se recuperan con `getProfileFile(clientSlug, id)` de `profile-files.ts`; no constituyen enlaces externos permanentes.

## Permisos

La ficha conserva la política visual de conocimiento: administrador y PM asignado editan; el resto del equipo consulta. Se respeta `source.visibility` para material exclusivo de PM/administración. La edición utiliza revisión optimista para evitar sobrescrituras de formularios abiertos. Estos controles de preview no reemplazan autorización y RLS de backend.

## Verificación

- `tests/profile-library-model.spec.ts`: reutilización de fuentes, historial, vínculos, URL segura, aislamiento por cliente, deduplicación, glosario contradictorio, producto canónico, identidad externa por variante y límites de archivo.
- `tests/profile-library-browser.spec.ts`: adjuntar/descargar luego de recarga, crear producto con catálogo, glosario persistido, aislamiento, rol de consulta, responsive y acceso independiente al cuestionario.

Consultar el informe general de entrega para el resultado ejecutado de las pruebas y el estado de la preview. No se realizaron migraciones ni se activaron integraciones externas.
