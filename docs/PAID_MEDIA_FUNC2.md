# Publicidad digital · Funcionalidades 2

Implementación del apartado «📄 Publicidad digital» de `docs/FUNCIONALIDADES_2.md`. Todo vive en la
preview local: los datos se guardan en este navegador, los roles son visuales (no hay permisos de
servidor) y **ninguna plataforma de anuncios está conectada** (Meta Ads, Google Ads, TikTok Ads,
ChatGPT Ads y LinkedIn Ads figuran como «No conectada»; no se simula ninguna sincronización).

## Secciones del módulo (`/v2/clientes/<cliente>/campanas`)

| Sección | Qué muestra | Archivo |
| --- | --- | --- |
| Inicio | Alertas, semáforos de KPIs semanales, presupuesto mensual (gastado vs. esperado, ritmo y proyección), gasto por canal, plataformas «No conectada», campañas abiertas y piezas en flujo | `paid-home.tsx`, `paid-metrics.ts` |
| Plan de medios | Plan general de pauta leído del Plan de Marketing (`useKnowledge` → `plan.modules["publicidad-digital"]`, consulta sin copia) y, debajo, el plan de cada campaña | `paid-plan.tsx` |
| Campañas | Alta en dos instancias, filtro por estado de la planificación y vista de campaña | `paid-campaigns.tsx`, `paid-wizard.tsx` |
| Anuncios y piezas | Tablero por etapa del flujo, anuncios anteriores, detalle con plazos, comentarios por versión e historial; registro creativo anterior como consulta | `paid-ads.tsx` |
| Tareas, Optimización, Resultados, Entregables, Recomendaciones, Historial | Se conservan | `paid-media.tsx`, comunes |

## Campaña en dos instancias

1. **Instancia 1 · Planificación general** (Líder técnico): paso a paso de 8 pasos — target (ICP y
   segmentos elegidos del Marketing Discovery, o texto libre si el Discovery no los tiene, y se avisa),
   productos o servicios (del Discovery), presupuesto, distribución por canal (debe sumar 100 %),
   enfoque publicitario y funnel, anuncios de Meta Ads / Google Ads / otros, landing y secuencia de
   estímulos (WhatsApp, CRM, email). Se guarda como borrador en cualquier paso y se envía a
   validación del PM: crea la tarea `PAID-PLAN-<cliente>-<campaña>` para el PM con aviso. El PM aprueba
   (aviso al Líder técnico) o devuelve con comentario (la misma tarea vuelve al Líder técnico).
2. **Instancia 2 · Brief y desarrollo de piezas** (con la planificación aprobada): pedido de anuncio,
   brief de landing y brief de atención por mail o WhatsApp. «Nuevas piezas» repite el mismo proceso.

## Pedido de anuncio y flujo

El formulario del Líder técnico pide insight, respuesta, beneficio, propuesta concreta, reason to
believe, call to action, etapa del funnel (descubrimiento, retargeting, conversión u otra) y piezas a
generar (reel, carrusel, placa, historia, video, texto de búsqueda, banner, landing). Genera un brief
(con el target y los productos del Discovery) que llega al Content como tarea.

Flujo (una sola tarea `PAID-<cliente>-<pedido>` que se reasigna en cada etapa, con aviso al próximo
responsable):

1. Opciones de Content → 2. Validación del PM → 3. Diseño → 4. Validación del diseño (PM) →
5. Aprobación del cliente (desde su portal, `/v2/portal/<cliente>?anuncio=<id>`) → 6. Puesta en
circulación (Líder técnico) → En circulación → Finalizado (anuncios anteriores).

- Las devoluciones (PM o cliente) exigen comentario, suben la versión y vuelven a la etapa de trabajo.
- Al pasar a Diseño se crea **un único** pedido en Diseño de marca (`DIS-<pedido>`, `servicioOrigen:
  "publicidad-digital"`, `campanaId`, `anuncioId`, `tareaId`) que se actualiza en cada etapa. Ese pedido
  no crea una segunda tarea (`use-design-operations.ts`) y no se mueve desde el tablero de Diseño
  (`design-operation.ts`), igual que los pedidos de Contenidos.
- La atención por mail o WhatsApp no pasa por diseño.

## Plazos (a definir)

`PAID_STAGE_DAYS` en `paid-model.ts` define los días hábiles por etapa (Content 3, PM 1, Diseño 3,
PM diseño 1, Cliente 2, Circulación 1). **Son valores provisorios**: la especificación dice que los
plazos concretos se definen más adelante. Las fechas límite se calculan hacia atrás desde la fecha en
que se necesita la pieza (sin feriados), se agrupan como «Content y validación», «Diseño» y «Cliente y
circulación», y si el pedido llega tarde se avisa «Plazo comprometido».

## IA

Se reutiliza el estado del asistente (`/api/assistant/status`). Sin proveedor: «Pendiente de conexión»
y no se muestran sugerencias. Con proveedor configurado, la generación de estrategia, anuncios y
sugerencias de optimización con plantillas de Avans **sigue pendiente** y se dice así. El alta asistida
de campañas reutiliza el asistente existente (perfil `publicidad-digital:campanas`) y abre el paso a
paso. «Gerencia · Configuración de la IA» queda pendiente: solo se menciona en pantalla, no hay una
configuración simulada.

## Datos y compatibilidad

- Definiciones: `paid-collections.ts` (registradas en `collections.ts`). Colección nueva `anuncios`.
- Campos nuevos aditivos en `campanas` (`planEstado`, `pasoPlan`, `icpIds`, `segmentoIds`,
  `productoIds`, `productosTexto`, `presupuestoMensual`, `canales` JSON, `enfoque`, `funnel`, `metaAds`,
  `googleAds`, `otrosCanales`, `landing`, `estimulo*`, `planComentarios`). Las campañas guardadas antes
  se leen sin reescribirse: activas, pausadas o finalizadas cuentan como planificación aprobada, el canal
  sale de `plataforma` y el presupuesto mensual se deriva del período (`campaignPlan`).
- Los registros demo guardados antes toman al leer los campos que les falten de su semilla
  (`withPaidDefaults`).
- `OsTask.workflow.kind` suma `"paid"`.

## DATOS DE DEMOSTRACIÓN

`paid-demo.ts` (registrado en `demo-fixtures.ts`): campañas, planes y pedidos ficticios de ACA y EPSA
(y la campaña en preparación de Lider Energy). Las métricas salen de `reports/demo-fixtures.ts`;
objetivos semanales y eficiencia por canal también son de demostración. EPSA usa los ICP, segmentos y
productos de su Discovery demo; ACA no tiene ICP ni productos en el Discovery y la pantalla lo dice.
Al abrir el módulo se crean, una sola vez, las tareas de los pedidos demo abiertos, la tarea de la
planificación demo en validación (EPSA · Posventa) y los pedidos de diseño de los anuncios demo que ya
pasaron por diseño.

## Pendientes

- Integraciones reales con Meta Ads, Google Ads, TikTok Ads y ChatGPT Ads.
- Plazos definitivos por etapa y feriados.
- Generación con IA de estrategia, opciones de piezas y optimización (plantillas y buenas prácticas
  de Gerencia), y la página de Gerencia · Configuración de la IA.
- Metas numéricas de KPIs tomadas del Plan de Marketing (hoy son objetivos de demostración).
- Permisos y portal autenticados en servidor.

## Pruebas

- `tests/paid-func2-model.spec.ts` (dominio): plazos, transiciones, plan, permisos, métricas, Plan.
- `tests/paid-func2-browser.spec.ts` (navegador): Inicio, flujo completo con roles, vista de campaña,
  aislamiento ACA/EPSA, semillas sin duplicados, solo lectura y 1440/390 sin desborde.
