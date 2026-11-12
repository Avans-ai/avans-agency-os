# Ampliación prioritaria · cuestionario y presentaciones · 2026-11-10

Se amplía el estado `cd91664` en la rama exclusiva `feat/avans-os-ajustes-reunion-2026-11-03` y el PR draft #17. El cuestionario, Discovery, Benchmark, Plan y los cinco accesos existentes se conservan. Los pedidos operativos provienen del usuario; el PPT se trata como referencia visual y estructural.

## IMPLEMENTADO

- Carga múltiple por selector o arrastre; PDF, DOCX, PPTX, XLSX, CSV, TXT y Markdown; registro de imágenes con aviso de OCR pendiente. Texto pegado, URL de referencia y fuente manual. URL no implica descarga ni scraping.
- Validación de extensión, MIME, firma, tamaño, nombre, ZIP, XML, duplicados y vacío. PDF.js extrae texto de PDF; los paquetes Office se leen como XML sin ejecutar fórmulas, macros ni contenido incrustado. PPTX respeta el orden declarado de slides. Errores concretos y ocho estados de procesamiento.
- Arquitectura separada: extracción → proveedor → schema Zod → mapeo a pregunta → sugerencia → revisión → aplicación. No se encontró una integración de IA operativa en el repositorio. El proveedor real queda sin configurar; el fixture explícito DEMO y las propuestas manuales permiten probar el circuito.
- Sugerencias con respuesta anterior/propuesta, cita exacta, fuentes, confianza, impacto y fecha. Edición, aprobación individual, rechazo, consulta al cliente y lote de alta confianza. Alto impacto y conflictos requieren revisión individual; una fuente cambiada impide aprobar hasta generar una sugerencia nueva. No se elige entre fuentes contradictorias automáticamente.
- Aprobación al cuestionario con auditoría, origen y versión; el circuito previo crea propuestas hacia Discovery, cuya aprobación marca dependencias en Benchmark/Plan/reportes/módulos. No se vuelcan respuestas directamente en esos dominios. DEMO mantiene su condición y no pasa a dato validado.
- Indicadores de respuestas manuales, desde fuentes, pendientes, sin evidencia, consultas y conflictos; progreso general y por sección. Acordeones, evidencia en panel, estado por fuente y controles de revisión.
- Rutas independientes de impresión A4 en blanco y completada, con logo extraído del master, portada, fecha, contacto, preguntas, líneas, checkboxes, tablas, validación y paginación. La versión vacía nunca lee las respuestas. La completada solo muestra referencias marcadas públicas y exige administrador/PM asignado en la preview.
- Preparación de Discovery, Benchmark y Plan: completitud, validación, fuentes, responsable, actualización, faltantes y cantidad de slides. Manifest de contenido, modo borrador con marca visible y bloqueo de versión para cliente incompleta; advertencias no críticas requieren confirmación.
- Master original conservado sin alteración, catálogo de sus 56 páginas y mapeo tipado de contenido/repeticiones/condiciones. Historial inmutable en Documentos → Presentaciones generadas. Una modificación posterior marca los snapshots anteriores como desactualizados.
- Adapters de Drive/Slides, compilador de operaciones sobre objetos nativos y pipeline server-side preparados. **Actualización 2026-11:** el bloqueo de PPTX quedó reemplazado por el generador real sobre el master (ver `docs/PPTX_GENERATION.md`); Slides permanece deshabilitado. No se generó ni se presentó un archivo o enlace ficticio.

## Persistencia y límites

Una clave local por cliente conserva fuentes, texto extraído, respuestas, sugerencias, auditoría y manifests. Las propiedades nuevas son opcionales para leer el agregado anterior. Los originales solo se leen en memoria: no se guardan binarios en localStorage ni se sincronizan. Los errores de almacenamiento conservan el estado anterior.

| Límite | Valor |
| --- | --- |
| Archivos por lote / tamaño individual | 6 / 10 MB |
| Office descomprimido / partes | 40 MB / 2.000 |
| PDF | 100 páginas |
| Texto persistido | 120.000 caracteres por fuente; 600.000 por cliente |
| Contexto de análisis / sugerencias | 80.000 caracteres / 64 por solicitud |
| Historial local de presentaciones | 10 versiones; la undécima se bloquea, ninguna se borra |
| PPTX futuro exportado por Drive | Hasta 10 MB según API |

El texto excedente se marca para revisión. PDF escaneado e imágenes necesitan OCR; los gráficos/diagramas no se interpretan. Texto plano requiere UTF-8. Las fuentes con referencias no pueden eliminarse dejando sugerencias huérfanas. Los roles son visuales y la persistencia sigue siendo local: no es autorización multiusuario de servidor.

## Master y correspondencia

Archivo recibido: `Marketing Discovery.pptx` (el pedido lo menciona como `Marketing Discovery(1).pptx`). Copia exacta: `assets/templates/marketing-discovery-v1.pptx`. SHA-256:

`7dfe3336bf8713a5ed7aab912007adde4836c0664383fc1eaf6cc9674803d11c`

Dimensiones: 18.288.000 × 10.287.000 EMU, 16:9. Se inspeccionaron textos, objetos, relaciones e imágenes de las 56 páginas y los recursos gráficos originales. No se realizó una validación visual de la conversión a Google Slides ni una apertura del resultado en PowerPoint; esas condiciones bloquean la exportación.

| Páginas originales | Regla del manifest |
| --- | --- |
| 1–4 | Portada con cliente; eliminar página 2 interna; conservar proceso y portada Discovery |
| 5–10 | Empresa; hechos por grupos; unidades condicionales; una slide por oferta; etapas; segmentos |
| 11–12 | Una slide por perfil B2B/B2C aplicable |
| 13–19 | Portada Benchmark, marcas seleccionadas y análisis de marca propia |
| 20–24 | Bloque completo repetido por competidor |
| 25 | Conclusiones tomar/evitar/diferenciar |
| 26 | Índice de servicios activos |
| 27–31 / 32–34 | Estrategia / Diseño, solo si contratados |
| 35–40 | Publicidad, campañas e inversión repetidas; KPIs Leads/Ecommerce |
| 41–44 / 45–47 / 48–53 | Contenidos / Audiovisuales / Web; colecciones, sitemap y campos condicionales |
| 54–56 | Próximos pasos y cierre; 55 se omite con advertencia porque no existe roadmap validado |

Eliminar módulos nunca elimina los datos del Plan. Los servicios sin estructura en el PPT se advierten, sin inventar slides. Se retiran objetos de instrucciones/roles y captions de material pendiente; no se eliminan indiscriminadamente los elementos coral de diseño. Las imágenes originales de marca/iconos se conservan; placeholders de imagen se reemplazan por material registrado o se retiran con advertencia.

El manifest no es una previsualización gráfica del archivo terminado. Geometría dinámica de targeting, swatches de color, conectores de sitemap, ajuste de texto y estilos mixtos requieren completar el binding/operaciones específicas y revisar visualmente la copia nativa. No se promete fidelidad de exportación antes de esa validación.

## PROBADO

Comandos ejecutados: `npm ci --cache /tmp/avans-npm-cache`, `npm audit --omit=dev --audit-level=high`, `npm run lint`, `npm run typecheck`, `npm run build` y `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm exec -- playwright test`.

- Instalación reproducible correcta; auditoría de producción sin vulnerabilidades.
- Lint: 0 errores y 4 advertencias heredadas. Typecheck y build correctos; 269 páginas prerenderizadas y rutas dinámicas de impresión/API.
- Regresión completa: 67 pruebas aprobadas, 50 de dominio y 17 de navegador. Después se añadió la comprobación de orden de PPTX y se repitieron los 20 casos de carga/presentaciones junto con lint, typecheck y build.
- PDF, DOCX y PPTX se cargaron como bytes reales en Chromium; XLSX con rich text/valores guardados, CSV/Markdown y el master se verificaron en dominio. Vacíos, MIME incompatible, ejecutable, macro, XML con entidades, duplicado y PDF dañado se rechazan sin aplicar respuestas.
- Impresión real a PDF desde Chromium: 34 páginas A4 en blanco y completada, conteo coincidente con páginas del documento y sin invasión del pie. Portada, páginas internas, tablas y mobile inspeccionados visualmente. Respuestas largas y saltos de línea se conservan en continuaciones.
- Regresión de navegación, permisos visuales, edición, recarga, aislamiento, Discovery, Benchmark, Plan, reportes, tareas y contenidos. Pruebas existentes en desktop/notebook/tablet/mobile; recorrido nuevo a 390 px sin desborde del documento.
- Google probado con transporte simulado/fixtures; validaciones de estructura OOXML, compilador y cierre de rutas. Ninguna prueba creó un recurso real en Google ni abrió una exportación generada en PowerPoint.

### Correspondencia con los 45 escenarios pedidos

| Escenarios | Evidencia y resultado |
| --- | --- |
| 1–8 | Carga PDF/DOCX/PPTX/texto, duplicado, formato, vacío y error de extracción: navegador + dominio aprobados |
| 9–17 | DEMO, evidencia, editar/aprobar/rechazar, conflictos, ausencia de aplicación silenciosa, recarga y aislamiento: aprobados |
| 18–21 | Blanco/completado, sin chrome y paginación A4: aprobados con PDFs generados |
| 22–28 | Manifest, contenido, servicios, repetición, condiciones y eliminación de instrucciones/placeholders: dominio y vista interna aprobados; no equivale a archivo final |
| 29–31 | Borrador visible, bloqueo de cliente incompleto y Google no conectado: aprobados |
| 32 | Crear/abrir Slides real: bloqueado; faltan conexión, repositorios y master convertido validado |
| 33 | Abrir PPTX generado: bloqueado; no existe exportación real de esta aplicación todavía |
| 34 | Segunda versión y conservación de primera: aprobado en UI y snapshots de dominio |
| 35–45 | Inicio, Operaciones, Clientes, Ficha, Benchmark, Plan, Reportes, Documentos, Tareas, Contenidos y mobile: aprobados |

## DESPLEGADO EN PREVIEW

Destino exclusivo: [preview de la rama](https://avans-agency-os-git-feat-avans-os-ajustes-reunion-827e1a-avans2.vercel.app/v2). El commit publicado y sus checks se registran en el [PR draft #17](https://github.com/Avans-ai/avans-agency-os/pull/17). El QA funcional descrito se ejecutó contra el build local; el estado de Vercel se confirma por su check del commit.

No hay cambios en `main`, merge, publicación en producción, dominios, variables de Vercel ni ejecución de migraciones Supabase.

## BLOQUEOS Y PENDIENTES

| Capacidad | Estado real |
| --- | --- |
| UI de carga, revisión, impresión, preparación e historial | Implementada y probada localmente |
| Extracción textual | Implementada y probada; OCR pendiente |
| Análisis IA | Interfaz y schema implementados; proveedor no configurado; DEMO/manual probados |
| Google OAuth/Drive/Slides | Adapters y pipeline implementados; pruebas simuladas; no conectados ni probados con cuenta real |
| Master para exportación | Original y manifest completos; conversión, binding y revisión visual pendientes |
| PPTX editable | Flujo por Drive preparado; botón bloqueado; sin archivo generado ni apertura validada |
| Storage y repositorios | Contratos preparados; implementaciones conectadas pendientes |
| Supabase/Auth | Sigue sin activarse; ninguna migración creada o ejecutada en esta ampliación prioritaria |

Configurar variables por sí solo no activa las rutas. Se necesita identidad de organización/cliente real, repositorios cifrados, scopes autorizados, carpeta accesible, master importado, binding validado y una prueba integral de crear Slides/exportar PPTX antes de habilitar acciones. Ver [GOOGLE_WORKSPACE.md](GOOGLE_WORKSPACE.md). No se considera validado en producción.

## Archivos de esta ampliación

- `app/v2/os/knowledge/intake/`: modelos, límites, extracción, PDF worker, schema/proveedores, mutaciones, interfaz y documentos imprimibles.
- `app/v2/os/knowledge/presentation/`: catálogo de 56 slides, manifest, readiness, snapshots y vistas.
- `lib/presentations/`: contratos, configuración, Drive/Slides, compilador, validación y orquestación.
- `app/api/presentations/[action]/route.ts` y `app/v2/clientes/[client]/discovery/questionnaire/print/page.tsx`.
- Ampliaciones compatibles en `questionnaire-view.tsx`, `questionnaire.ts`, `proposals.ts`, `types.ts`, `state.ts`, `documents-view.tsx`, estilos y tarjeta Google Workspace.
- Master binario en `assets/templates/`, logo en `public/`, worker generado por `scripts/copy-pdf-worker.mjs` (no versionado).
- Dependencias/lockfile, `.env.example` solo con nombres, ignore de assets generados, ESLint, Playwright y tres archivos de fixtures/pruebas.
- Este informe y actualización de documentación de arquitectura/Google/entrega anterior.
