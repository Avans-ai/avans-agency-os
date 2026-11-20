# Contenidos · operación editorial mensual (ampliación 20/11/2026)

Rama: `feat/avans-os-contenidos` (desde `feat/avans-os-ajustes-reunion-2026-11-03`). Vista previa local: todo se guarda en este navegador (`localStorage` + IndexedDB para adjuntos). Los roles de la vista previa son visuales, no permisos de servidor. Metricool no está conectado: no hay sincronización simulada.

## Estructura del servicio

| Área | Dónde | Contenido |
| --- | --- | --- |
| A · Lineamientos del servicio | `?area=lineamientos` (`content-guidelines.tsx`) | Objetivos, estrategia, ejes, tono, canales, frecuencia, formatos, Do's & Don'ts, KPIs, restricciones, referencias + alcance/procedimientos existentes. Misma clave `client:<slug>:service-guidelines:contenidos` (campos nuevos en `values`). |
| B · Operación mensual | Resumen, Plan mensual, Calendario, Piezas, Ejes, Tareas, Resultados | Flujo de 8 etapas, plan del mes, contenidos, preproducción, pedidos de diseño, revisiones, programación. |
| C · Banco de ideas | `?seccion=ideas` | Oportunidades, referencias y contenidos futuros con origen, eje y mes sugerido; conversión a contenido sin duplicar. |

## Flujo

1 Borrador → 2 Revisión interna de producción → 3 Revisión preliminar del cliente (una sola instancia: idea, título, bajada, copy, formato y pedidos) → 4 Ajustes → 5 Producción de diseño (incluye **Preproducción**: checklist con copy definitivo, indicaciones, dimensiones, wireframe, guion, referencias, material y recursos; «Enviar a diseño» genera el pedido) → 6 Revisión interna del diseño → 7 Aprobación final del cliente (→ Aprobado) → 8 Programado. «Información del cliente» vuelve a la etapa de origen. Equivalencias Monday en `MONDAY_STATE`/`CONTENT_FLOW` (`content-workflow.ts`).

- Una tarea por contenido (`CONTENT-<cliente>-<contenido>` o la tarea anterior vinculada); se reasigna en cada transición y al volver de etapa.
- Un pedido de diseño por contenido (`DIS-<contenido>`, vía `upsertDesignRequest` sin modificarlo) enriquecido en `content-design.ts` con preproducción, pedidos al cliente, recursos del Design System y fecha de entrega; reutiliza la tarea del contenido.
- Versiones en la biblioteca de Diseño (`client:<slug>:module:diseno-marca:biblioteca`) reconocidas por archivo o versión del contenido: no se duplican. Heredan el origen (demo/manual) del contenido.
- Comentarios con versión (`Propuesta vN`, `Diseño vN`) e instancia (revisión interna, revisión del cliente, ajustes, aprobación final). `values.contentChanges` registra qué campos cambiaron y quién lo pidió.
- «Qué necesitamos del cliente»: pedidos estructurados (`values.clientRequests`; se mantiene `necesitaCliente` como texto compatible). El cliente responde y adjunta desde el portal.

## Datos de demostración (ACA)

`app/v2/os/modules/content-demo.ts` (registrado en `demoSeedsFor`): planes Noviembre y **Diciembre 2026 — ACA**, 5 ejes, 22 contenidos en todos los estados (historial generado ejecutando el flujo real), 8 ideas, aprendizajes, pedidos de Diseño derivados y versiones con miniaturas PNG ficticias (`content-demo-thumbs.ts`). Todo rotulado **DATOS DE DEMOSTRACIÓN**; no son publicaciones ni datos reales de ACA.

- Las semillas se aplican solo si la clave local está vacía.
- Tareas demo (`content-demo-tasks.ts`): un navegador nuevo las recibe con el estado inicial; en un workspace existente se agregan al abrir Contenidos, sin duplicar (la tarea `T-405` sigue vinculada a `PZA-ACA-03`).
- «Reiniciar datos de demostración» (Resumen/Piezas) quita solo registros `source: "demo"` de Contenidos y sus derivados de Diseño, los vuelve a sembrar y restablece sus tareas; los registros manuales se conservan.

## Portal del cliente (`/v2/portal/[client]`)

Pendientes agrupados (propuestas para validar, información pedida, piezas para aprobar), calendario mes/semana/día con canal y miniatura, respuesta a pedidos con adjuntos, ajustes y aprobaciones. Solo muestra la proyección pública (snapshot) del cliente de la URL; nada interno ni de otros clientes.

## QA

`tests/content-workflow-*`, `tests/content-demo-model.spec.ts`, `tests/content-qa-browser.spec.ts`, `tests/portal-*`. Suite completa al cierre: 181/181 (108 dominio + 73 navegador).

## Pendiente

Backend/permisos reales, conexión Metricool (lectura de métricas y programación), miniaturas reales desde archivos de Diseño, edición de guion/wireframe como adjuntos binarios y validación con Avans/cliente.
