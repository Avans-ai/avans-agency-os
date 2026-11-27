# Generador PPT real · Etapa 2

«Generar presentación» produce un **PowerPoint editable construido sobre el master oficial** (`assets/templates/marketing-discovery-v1.pptx`, SHA-256 `7dfe3336…d11c`, 56 slides, 16:9). No es un diseño parecido: el archivo de salida es el master con sus slides duplicadas, eliminadas y completadas. Se conservan fuentes embebidas (Figtree, Syne), master, layout, tema, logos, imágenes y recursos gráficos sin cambios de bytes.

## Flujo

1. **Datos**: el estado de conocimiento del cliente (Discovery, Benchmark, Plan de Marketing, servicios activos y recursos visuales) entra al manifest existente (`app/v2/os/knowledge/presentation/manifest.ts`), que ya define qué página del master corresponde a cada registro, las repeticiones y las condiciones. No hay un mapeo paralelo.
2. **Spec**: `presentation/pptx.ts` traduce el manifest a una especificación independiente del framework (`DeckSpec`): página del master, textos por id de objeto (`p:cNvPr id`), objetos a eliminar, desplazamientos, imágenes y pendientes.
3. **Motor** (`lib/pptx/`, TypeScript puro, funciona igual en navegador y Node):
   - `zip.ts`: lectura/escritura con `fflate`; archivo determinista (`[Content_Types].xml` primero, fecha fija = fecha de generación, imágenes y fuentes sin recomprimir).
   - `xml.ts`: edición sobre el XML original (no se re-serializa un DOM): lo que no se toca queda byte a byte igual.
   - `package.ts`: reconstrucción de `presentation.xml` (`sldIdLst`), `presentation.xml.rels`, `[Content_Types].xml`, `docProps/core.xml` (título, autor, «borrador»); las notas no se copian a las slides generadas y se eliminan los medios que quedan sin referencia (por ejemplo, el ícono de placeholder de imagen).
   - `slide.ts`: reemplazo de texto conservando `pPr`/`rPr` del placeholder (color, tipografía, tamaño, interlineado), una línea por párrafo, sin viñetas vacías, con escape XML.
   - `text-fit.ts` + `font-metrics.ts`: ajuste determinista con las métricas reales de Figtree/Syne. Orden: tamaño del master en su caja → la caja crece hacia el espacio libre de abajo (hasta el próximo objeto de la columna o el pie) → reducción gradual del tamaño (mínimo 45 % o 9 pt). Si aun así no entra, el texto se conserva completo y se informa como pendiente «Texto demasiado extenso»; nunca se corta.
   - `generate.ts`: por cada slide de la spec, copia la página del master y aplica: eliminación de instrucciones (ids del catálogo + red de seguridad por texto/estilo coral), placeholders de imagen (imagen local recortada para cubrir el marco, o eliminación del marco gris y su leyenda), objetos vacíos, desplazamientos, textos y marca de borrador. Cualquier `[ … ]` que quede sin dato se elimina y se reporta.
   - `render-model.ts`: lectura del PPTX generado para la vista previa (geometría, rellenos, líneas, texto, imágenes, colores de tema).

## Reglas del master aplicadas

| Regla | Implementación |
| --- | --- |
| Instrucciones coral, página 2 y rol al pie | `instructionIds` del catálogo + patrones de texto; la página 2 nunca se incluye |
| `[ ]` reemplazados | Valor del dato; sin dato → objeto eliminado y pendiente con módulo y enlace |
| Celdas sin registros | Valor `FILLER`: se quitan en silencio junto con su decoración (tarjeta, burbuja, separador) |
| Duplicaciones | Producto (p. 8), perfil B2B/B2C (11/12), bloque por competidor (20–24), campaña (36/37), objetivos, ejes, reglas… |
| Módulos no contratados | Se quitan sus páginas 27–53 y sus filas del índice (p. 26), que se compacta y renumera 01, 02… |
| Matriz de targeting (p. 10) | Burbujas ubicadas por match (x) y potencial (y); la de mayor relevancia usa el círculo grande; las sin uso se eliminan |
| Roadmap (p. 55) | Omitido mientras no haya calendario validado |
| Imágenes | Recursos locales (`data:image/png|jpeg`) ocupan el marco; los enlaces `https` **no se descargan**: el marco se retira y el enlace queda como pendiente |

## Borrador y versión final

- **Borrador interno**: siempre disponible. Cada slide lleva «BORRADOR INTERNO — NO ENVIAR AL CLIENTE» en la franja del rol al pie (con banda oscura si cae sobre una foto) y el archivo se titula «… · Borrador interno».
- **Versión para cliente**: solo administración o el PM asignado (`canEditDiscovery`), sin faltantes críticos ni registros sin validar/DEMO (`assertExportAllowed`) y con advertencias confirmadas. Sin marca de borrador.
- Otros roles pueden generar y descargar un borrador para revisar; no se guarda en el historial. Los roles son visuales (preview), no autorización de servidor.

## Vista previa

`presentation/slide-renderer.tsx` dibuja cada slide del archivo generado con HTML/SVG absoluto escalado al contenedor (1 pt = 1 px internos). Figtree llega por `next/font` del layout; Syne se carga con `next/font/google` solo en el renderer. Miniaturas y documento completo se renderizan de forma diferida. Se comparó contra la rasterización de LibreOffice del mismo archivo: posiciones, tipografías, colores e imágenes coinciden.

`presentation-studio.tsx`: `GeneratePresentationButton` (autocontenido) abre el estudio a pantalla completa: preparación → generación → visor con «Diapositivas» (slide grande, tira de miniaturas, ← → Inicio Fin, clic para ampliar), «Documento completo» (scroll vertical) y «Datos pendientes» (por slide, con enlace a Discovery/Benchmark/Plan). Acciones: Descargar PPTX, Generar nueva versión, Crear en Google Slides (deshabilitado con motivo; no se generan enlaces).

## Historial y almacenamiento

- El registro de versión (manifest con snapshot de datos, huella del archivo, cantidad de slides y pendientes) se guarda en el estado local del cliente, como los manifests anteriores. Límite de 10 versiones; ninguna se borra.
- Los bytes del PPTX (~1 MB) **no van a localStorage**: se guardan en IndexedDB (`avans-os-presentations/files`, clave = id de versión). Si faltan (otro navegador, datos borrados), se reconstruyen desde el manifest guardado y el master: la salida es determinista y se compara con el SHA-256 registrado.
- Una versión se marca «Desactualizada» cuando cambian Discovery, Benchmark, Plan, servicios o fuentes (`presentationIsStale`).

## Publicación de la plantilla

`scripts/copy-presentation-template.mjs` copia el master a `public/templates/` (ignorado por git) en `postinstall` y `prebuild`, verificando el SHA-256 del catálogo; si no coincide, la instalación/compilación falla. El navegador lo descarga de `/templates/marketing-discovery-v1.pptx?v=<sha>` y vuelve a verificar la huella antes de generar. Funciona en Vercel (archivo estático); no se necesitan rutas ni `outputFileTracingIncludes`.

## Validación

- `npm run test:pptx` (dominio): EPSA y ACA desde el estado sembrado, datos ricos, textos extensos, imágenes, historial.
- `tests/pptx-viewer-browser.spec.ts`: generación en Chromium, render, teclado, ampliación, documento completo, pendientes, descarga, versiones, roles y 1440/820/390 px.
- `npm run validate:pptx -- <carpeta>` (`scripts/pptx-validate.py`, solo QA local): abre cada archivo con python-pptx, busca placeholders/instrucciones, convierte con LibreOffice y arma una hoja de contacto con `pdftoppm`.
- `scripts/pptx-font-metrics.py` regenera `lib/pptx/font-metrics.ts` si cambian las fuentes del master.

## Límites conocidos

- Las fuentes embebidas del master son subconjuntos (EOT). Para editar con fidelidad total conviene tener Figtree y Syne instaladas (Google Fonts, OFL); sin ellas PowerPoint/LibreOffice sustituyen la fuente.
- No se probó la apertura en Microsoft PowerPoint en este entorno (no disponible); sí en python-pptx y LibreOffice (conversión a PDF sin errores, mismo número de páginas).
- Los textos extremos en filas de una línea (p. ej. perfiles ICP) se reducen hasta el mínimo y, si no entran, se marcan para resumir.
- Google Slides sigue deshabilitado; `lib/presentations` (adapters y compilador) se conserva sin cambios.
