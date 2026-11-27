# Diseño de marca · noviembre de 2026

Espacio de identidad y diseño por cliente. Conserva las claves, entidades y comportamientos de la primera etapa (17/11) y separa tres áreas que no se mezclan: lineamientos permanentes, operación mensual y biblioteca. No modifica contratos, no activa integraciones ni ejecuta migraciones.

## Áreas

| Área | Ruta | Contenido |
| --- | --- | --- |
| A. Lineamientos del servicio | `?area=lineamientos[&parte=…]` | Design System por partes: Resumen, Identidad, Sistema de color, Tipografía, Recursos gráficos, Componentes, Tono y comunicación, Moodboard y referencias. En Resumen, además, alcance, estrategia y procedimientos del servicio (`ServiceGuidelines`). |
| B. Operación mensual | `?seccion=resumen`, `operacion`, `trabajos` | Resumen con las tres áreas; Producción (Kanban y lista); bandeja única de Pedidos de diseño. Tareas, entregables, recomendaciones e historial comunes se conservan. |
| C. Biblioteca de marca | `?seccion=biblioteca` | Piezas (con versiones), Recursos de marca, Referencias y Materiales de la Ficha. |

La navegación de áreas del encabezado pertenece a `module-workspace.tsx`; la Biblioteca se abre como sección de la Operación y desde la tarjeta C del Resumen. Los enlaces antiguos `?seccion=pedidos` siguen abriendo pedidos; `?seccion=sistema` cae en el Resumen, que enlaza a Lineamientos.

## Design System (A)

- **Identidad:** logos principal, secundario, isotipo, monocromático y negativo; usos incorrectos marcados con ✕; aplicaciones; materiales de identidad de la Ficha sin duplicarlos.
- **Color:** muestras reales agrupadas en principales, secundarios y de apoyo, con HEX, RGB, función y contraste WCAG 2.1 contra blanco y negro. Combinaciones de la paleta con relación de contraste y nivel (AAA ≥ 7, AA ≥ 4.5, AA grande ≥ 3). Cálculo en `design-system-model.ts`.
- **Tipografía:** familia, pesos, tamaño/interlineado y jerarquía aplicada renderizada. Solo se cargan Figtree (global) y Syne (`next/font`, variable `--font-design-syne`); otras familias usan la fuente instalada o pilas del sistema.
- **Recursos gráficos, componentes y moodboard:** visuales generados en la app con SVG/CSS y los tokens del cliente (`--b-*` derivados de la paleta y tipografías). Nunca se usan imágenes de internet como referencias del cliente. Cada referencia del moodboard exige descripción y justificación.
- **Tono y comunicación:** personalidad, voz y ejemplos son recursos del Design System. Palabras permitidas, a evitar, expresiones y mensajes aprobados se leen del **glosario de la Ficha** (`KnowledgeState.brandGlossary`), única fuente; se editan allí. Si el glosario de ACA está vacío, un administrador puede cargar un glosario rotulado «[Demostración]» en la Ficha mediante `saveGlossary`.

## Pedidos y operación (B)

- **Orígenes:** Contenidos, Publicidad Digital, Soporte, Estrategia y Solicitudes internas (`servicioOrigen`: `contenidos`, `publicidad-digital`, `soporte`, `estrategia`, `interno`).
- **Pedido:** nombre, objetivo, descripción, tipo de pieza, canal, formato, medidas, referencias, materiales, recursos del Design System vinculados (`recursosDS`), responsable, revisor, prioridad, fecha y estado. Formulario corto agrupado en un panel lateral. El asistente opcional se conserva.
- **Una tarea por pedido:** `buildDesignTask` + `commitWorkflow` guardan pedido y tarea juntos; ante una falla ambos se revierten. La tarea lleva brief, responsable, prioridad, revisor y enlace al pedido. Los pedidos de Contenidos usan la tarea central del contenido y nunca crean otra.
- **Estados:** Pendientes, En producción, En revisión interna, Ajustes, Esperando aprobación, Aprobados, Entregados (`values.operacion`). Se mantiene `estado` genérico y `etapa` por compatibilidad con aprobaciones y entregables; si otra vista cambia `estado`, prevalece ese valor. Pasar a revisión, aprobación o entrega exige al menos una versión.
- **Detalle de la pieza:** vista previa, acciones contextuales, versiones, comentarios (`designComments`), aprobaciones (`designApprovals`), historial combinado de pedido y versiones, brief, recursos vinculados, responsables, fechas, tarea y archivos.
- **Contenidos:** contenido aprobado → `upsertDesignRequest` → diseño produce → Contenidos revisa → cliente aprueba → la versión queda «Aprobado» y entra a la Biblioteca. Los pedidos de Contenidos muestran la columna derivada del estado del contenido y se avanzan desde el contenido.

## Biblioteca (C)

- Una tarjeta por pieza (`piezaId`), con su última versión; «Ver versiones anteriores» muestra todas. Cada versión es un registro inmutable de `biblioteca`.
- Al aprobar o entregar un pedido, `libraryAfterMove` actualiza el estado de la **misma** última versión vinculada (`pedidoId`); no copia archivos ni crea registros. El filtro «Aprobadas y entregadas» también incluye piezas cuyo pedido quedó aprobado en otra vista.
- Categorías: Identidad, Redes sociales, Carruseles, Publicidad, Presentaciones, Material comercial, Banners, Packaging, Videos, Motion, Otros. Los valores anteriores se traducen al leer (`designCategory`): Redes → Redes sociales, Anuncios → Publicidad, Material institucional → Material comercial, Plantillas → Otros.

## Datos de demostración

- `app/v2/os/modules/design-demo.ts`, registrado en `demo-fixtures.ts`. Solo para ACA y solo cuando la clave local está vacía. Marca genérica «ACA DEMO» dibujada en la app; no imita la identidad real del cliente.
- Incluye logos y variantes, usos incorrectos, aplicaciones, paleta, tipografías, recursos, componentes, tono, moodboard, 13 pedidos en los siete estados y 19 versiones en las once categorías. Las tareas de los pedidos de demostración se crean una sola vez al abrir el módulo.
- Banner visible «DATOS DE DEMOSTRACIÓN» en cada área y rótulo «Demo» por registro. «Reiniciar datos de demostración» reemplaza solo los registros `source: "demo"` de este cliente en las tres colecciones y regenera sus tareas; conserva registros manuales, sus versiones y tareas manuales.
- ACA no tiene Diseño de marca activo por defecto: se activa desde «Gestionar módulos».

## Persistencia

| Información | Ubicación |
| --- | --- |
| Pedidos (con operación, comentarios y aprobaciones) | `client:<slug>:module:diseno-marca:trabajos` |
| Recursos del Design System | `client:<slug>:module:diseno-marca:sistema` |
| Versiones de piezas | `client:<slug>:module:diseno-marca:biblioteca` |
| Procedimientos del servicio | `client:<slug>:service-guidelines:<serviceId>` |
| Tareas y notificaciones | Store central `workspace` |
| Glosario, materiales y Plan | Agregado `client:<slug>:knowledge:v1` |

Prefijo `avans-os:preview:v1` y sobre versionado existentes. Las interfaces muestran «Guardado en este navegador». Sin sincronización multiusuario ni RLS: los roles de preview (`canEditService`) son controles visuales, no seguridad de servidor.

## Verificación

- Dominio: `tests/design-operation-model.spec.ts`, `tests/design-workspace-model.spec.ts`.
- Navegador: `tests/design-brand-browser.spec.ts`, `tests/design-workspace-browser.spec.ts`.
