# Marketing Discovery estructurado — preview

## Alcance

Ficha del cliente conserva Alcance del servicio y reemplaza Información del negocio por Discovery del negocio. Se mantienen los cinco accesos de Gestión y estrategia y la navegación diaria. La fuente funcional es el PowerPoint adjunto `Marketing Discovery.pptx`, páginas 2–12, leído directamente del contenido de sus diapositivas.

Las páginas 2–4 informan la metodología: el PM conduce el relevamiento, contrasta el brief en reunión, distribuye responsabilidades y repite unidades/productos/ICP según el negocio. Las páginas 5–12 se representan con ocho entidades/secciones; no se implementan las páginas siguientes.

## Modelo y relaciones

- `app/v2/os/discovery/schema.ts`: catálogo tipado de campos, etiquetas, tipos, referencias y obligatoriedad para completar. El editor permite guardar borradores incompletos.
- `model.ts`: entidades, esquema versión 1, validación, operaciones, cobertura y selector puro `toDiscoveryPresentation`.
- `seed.ts`: transformación de datos demostrativos existentes; no inventa cifras, clientes, catálogos, puntajes ni decisiones comerciales.
- `permissions.ts`: política de edición de preview y actor demostrativo.
- `screens/marketing-discovery.tsx` y su CSS: lectura, índice, cobertura, formularios en paneles, fuentes, matriz y vista previa de contenido.

Cada registro lleva identificador, estado, referencias a fuentes, evidencia, responsable, notas, marca de dato demostrativo, fecha y autor de la última edición. Los campos faltantes se derivan del catálogo, sin almacenar una segunda versión contradictoria.

Una oferta referencia una unidad. Un segmento referencia una o más ofertas. Los productos relacionados de una unidad y los segmentos relacionados de una oferta se calculan a partir de esas referencias (se editan en producto y segmento, respectivamente). Los ICP referencian un segmento de su mismo tipo y una o más ofertas. Las fuentes se comparten por ID dentro del cliente. Se bloquea la eliminación de registros referenciados y el cambio de tipo de un segmento con ICP incompatibles; el usuario debe desvincularlos explícitamente. Solo puede haber una unidad principal.

Todas las colecciones tienen alta, edición, duplicado, reordenamiento con botones accesibles y eliminación confirmada. Los productos pueden filtrarse por unidad. Las etapas comerciales conservan su orden y responsable propio.

## Cobertura y validación

Las reglas están documentadas y ejecutadas en `calculateCompletion`:

1. Las ocho secciones tienen el mismo peso en el porcentaje general.
2. Se cuentan los campos requeridos de **todos** los registros, no solo del primero. Una colección vacía representa un registro sin completar. Campos opcionales no penalizan. Textos que empiezan con “Pendiente” o “Dato demostrativo” no completan requisitos.
3. Quiénes somos requiere nombre, definición, qué es, actividad, ubicación, cobertura, frase corta y trazabilidad.
4. Datos relevantes requiere nombre, valor, relevancia, categoría y trazabilidad; agrega tres requisitos de datos validados, por lo que nunca alcanza el 100% con menos de tres datos validados.
5. Unidades exige nombre, descripción, problema resuelto, cliente y trazabilidad; ofertas exige unidad, tipo, descripción, inclusión, entrega, problema, prueba, fortalezas, diferenciales y trazabilidad.
6. Proceso comercial combina datos generales con cada etapa. Como mínimo necesita una etapa, y cada etapa debe tener nombre, descripción, canal, responsable y trazabilidad.
7. Segmentos exige nombre, descripción, tipo, match, potencial, relevancia actual, ofertas y trazabilidad. Los tres puntajes aceptan 0–100, inclusive; vacío no equivale a cero. Cuadrantes derivados con umbral 50, sin etiquetas almacenadas. La lista accesible incluye los segmentos todavía sin puntajes.
8. Cada segmento marcado “Requiere ICP propio” necesita un perfil correspondiente. Un tipo de ICP explícitamente marcado como no aplicable, con motivo y sin segmentos ni perfiles de ese tipo, aporta 100% y no penaliza el promedio. Agregar un segmento o perfil de ese tipo vuelve a marcarlo aplicable.
9. Un registro solo puede validarse si tiene todos sus campos requeridos, evidencia, responsable y fuentes validadas no demostrativas. Una fuente también requiere fecha y referencia. Al revisar una fuente se invalida derivadamente la validación de sus registros vinculados.
10. “Completa” exige contenido completo y validado; “Requiere validación” indica contenido completo sin validación; “Parcial” indica faltantes; “Pendiente” indica cobertura cero. El porcentaje mide cobertura de contenido, no certeza de los hechos. Las excepciones de validación del punto 4 se indican explícitamente.

EPSA contiene empresa, tres datos cualitativos existentes, tres unidades, dos ofertas, etapas iniciales pendientes, un segmento B2B y dos perfiles B2B. Los puntajes, tickets, cifras y detalles comerciales desconocidos quedan pendientes. B2C figura no aplicable por la definición B2B de la demo, con motivo visible y editable. Esto demuestra todas las funciones sin representar un Discovery comercial validado o artificialmente completo. ACA y los otros clientes usan sus datos propios y fallbacks vacíos.

## Persistencia y permisos

Se reutilizan `useLocalStorageState`, `readLocalJson` y `writeLocalJson` de la abstracción existente. La clave es `avans-os:preview:v1:client:<slug>:marketing-discovery`, con envelope existente y versión del dominio. Se comprueba el slug y la forma de los datos antes de leer/escribir; formatos desconocidos no se sobrescriben. Cambios y borrados se aplican sobre la última lectura local. Una edición sobre un registro modificado en otra pestaña se bloquea hasta reabrirlo; no hay bloqueo transaccional entre dispositivos.

El guardado informa “Guardado en este navegador” y “Pendiente de sincronización multiusuario”. Si localStorage rechaza la escritura, se informa el fallo y el editor mantiene el borrador. La suscripción existente notifica cambios locales y de otras pestañas. Lecturas de storage deshabilitado tienen fallback y no rompen la pantalla.

Administrador puede editar. El nuevo rol demostrativo Project Manager representa a Valentina Ríos y solo puede editar Discovery donde está asignada y es responsable de cuenta; en EPSA sí, en ACA no. El perfil operativo conserva su navegación y consulta Discovery sin acciones de edición. El rol PM también permanece fuera de Finanzas/Gerencia. Estas son restricciones frontend de **preview**; antes de producción son necesarios identidad autenticada, API y RLS por organización/cliente. No existe seguridad backend implementada por este módulo.

## Salida para presentación

`toDiscoveryPresentation` devuelve una copia estructurada con ocho salidas, fuentes, aplicabilidad y cobertura. Incluye solamente datos relevantes destacados, deriva relaciones inversas y cuadrantes, y conserva el estado demostrativo/validación. La vista previa explica la futura filmina y repeticiones por oferta o ICP, muestra campos y pendientes y omite los ICP que no aplican. No genera ni descarga un PPTX.

## QA reproducible

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm run test:discovery
npx playwright install chromium
npm run test:discovery:browser
```

Si Chromium está instalado en el entorno, usar `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:discovery:browser` sin descargar otro navegador. Playwright inicia `npm run start`, por eso el build debe existir. `test-results/` contiene capturas y trazas de fallos y no se versiona.

`tests/discovery-model.spec.ts` verifica los cuadrantes y límites, completitud de todas las filas, no aplicabilidad, validación de fuentes, integridad referencial, aislamiento, selector y permisos.

`tests/discovery-browser.spec.ts` cubre los 12 recorridos pedidos: ocho secciones de EPSA; alta/recarga; unidad/producto; targeting y cambio de cuadrante; ICP B2B; ICP B2C; cobertura y faltantes; presentación; aislamiento ACA; roles; responsive 1440×900, 1280×800, 820×1180 y 390×844; regresión de alcance, gestión, Inicio, Tareas, Contenidos y los módulos activos. Además prueba duplicación, reordenamiento, confirmación/cancelación de eliminación, fuentes, validación, fallo de storage, conflicto entre pestañas y restitución de foco con Escape.

## Límites de entrega

Sin migraciones ejecutadas, sin restaurar Supabase, sin cambios de dominios/variables/configuración de Vercel, sin merge ni publicación de producción. Quedan pendientes la API/RLS, sincronización multiusuario, almacenamiento real de archivos, extracción con evidencia, generación real del PowerPoint y aprobación de información comercial del cliente. Ningún resultado de este trabajo se declara validado en producción.

## Resultado del QA de esta entrega (10 de noviembre de 2026)

- Instalación limpia con `npm ci`: exitosa. En este entorno se ubicó la caché npm en `/tmp/avans-npm-cache` por permisos del directorio de usuario.
- Lint: 0 errores; 4 advertencias heredadas en archivos fuera del módulo Discovery.
- Typecheck: exitoso.
- Build Next.js: exitoso, 269/269 páginas generadas.
- Suite final: **19/19 pruebas exitosas** (11 de dominio y 8 de navegador), incluyendo los 12 recorridos del pedido.
- Capturas de escritorio y mobile inspeccionadas; los cuatro tamaños pasaron controles de desborde y dimensiones del panel de edición.
- El primer pase detectó un selector de prueba que esperaba “Registro 1” donde se mostraba el nombre “EPSA / Line Up”; se corrigió el selector y se ejecutó nuevamente toda la suite. También se ajustó el índice sticky al encabezado mobile.
- Alcance del resultado: build y ejecución local de la preview. No constituye validación en producción.

## Archivos de la entrega

Nuevos: `app/v2/os/discovery/{schema,model,seed,permissions}.ts`, `app/v2/os/screens/marketing-discovery.tsx`, `app/v2/os/screens/marketing-discovery.module.css`, `tests/discovery-model.spec.ts`, `tests/discovery-browser.spec.ts`, `playwright.config.ts` y este documento.

Integración: `app/v2/os/screens/client-management-views.tsx`, `app/v2/os/screens/director-update.module.css`, `app/v2/os/local-persistence.ts`, `app/v2/os/os-store.tsx`, `app/v2/os/os-shell.tsx`, `app/v2/os/director-data.ts`, `app/v2/os/screens/settings.tsx`, `package.json`, `package-lock.json` y `.gitignore`.
