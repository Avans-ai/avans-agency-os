# Avans OS — Rediseño operativo (Discovery, Benchmark, Plan, módulos de servicio)

Rama exclusiva: `feat/avans-os-ajustes-reunion-2026-11-03`. Sin cambios en `main`, sin merge, sin producción, sin migraciones de Supabase.
Plantilla oficial: `assets/templates/marketing-discovery-v1.pptx` (SHA-256 `7dfe3336…d11c`), idéntica al `Marketing Discovery(1).pptx` recibido.

## Etapa 1 — Arquitectura y navegación

### Agregar módulo de servicio

- Acción **«+ Agregar módulo de servicio»** en el inicio del cliente y **«Gestionar módulos»** en el Plan. Visible para Administrador y para el PM asignado al cliente (`canManageModules`); el perfil operativo no la ve.
- Catálogo de los diez servicios de Avans con nombre, descripción, responsable o líder, estado de activación, alcance contratado, fecha de inicio, relación con otros módulos, secciones del Plan que habilita e historial.
- Selección múltiple y configuración por módulo: **Contratado** o **Demostración**. Un módulo contratado exige alcance escrito; cualquier cambio contractual (activar, desactivar, tipo, alcance o fecha de inicio de un módulo contratado) exige confirmar que fue acordado con el cliente.
- Al guardar: se actualizan los módulos activos (`servicesOf`), aparecen en la navegación diaria del cliente, se habilitan sus capítulos del Plan y su espacio operativo (tareas, entregables, archivos, recomendaciones, aprobaciones). Los demás módulos no se tocan.
- Desactivar oculta el módulo y conserva datos, decisiones del Plan e historial; reactivarlo los recupera.
- Modelo: `app/v2/os/service-modules.ts`. Persistencia local de la preview: `avans-os:preview:v1:client:<slug>:service-modules` (clave nueva, sin migrar ni sobrescribir claves existentes). Los servicios activados antes de este modelo se completan como «Demostración» sin perder su estado. No hay sincronización entre usuarios ni permisos de servidor.

### Documentos estratégicos continuos

Componente común `app/v2/os/knowledge/document-shell.tsx`: una página vertical con índice sticky compacto, scroll suave (respeta *reduced motion*), sección activa (`aria-current="location"`), anclas compartibles (`#seccion`) y foco en el título al saltar. El índice se ubica debajo de la altura real de la cabecera (`--os-header-h`, medida con `ResizeObserver`).

Los módulos operativos siguen siendo herramientas (filtros, tableros, acciones); los documentos estratégicos son lectura vertical continua.

**Discovery** (`Ficha del cliente → Discovery del negocio`): `01 Cuestionario inicial` primero, luego `02 Quiénes somos`, `03 Datos relevantes`, `04 Unidades de negocio`, `05 Productos y servicios`, `06 Cómo se vende hoy`, `07 Matriz de targeting`, `08 ICP B2B`, `09 ICP B2C` y Fuentes y trazabilidad (estructura de las páginas 5–12). Cada sección tiene «Editar» o «+ Agregar» en contexto; se conservan duplicar, reordenar, eliminar con confirmación, relaciones, matriz, aplicabilidad de ICP, fuentes, evidencia, validación, conflictos entre pestañas e historial.

- El cuestionario queda compacto: carga de documentos, texto pegado, fuentes, análisis y sugerencias, revisión, compartir, copiar e impresión vacía/completada visibles; las preguntas se despliegan bajo «Responder preguntas · N de M respondidas».
- **«Aplicar respuestas validadas al Discovery»**: las respuestas marcadas «Validada con el cliente» generan y aprueban sus propuestas en un paso, con evidencia, versión y auditoría. Las demás siguen por «Enviar respuestas a revisión». Si el valor actual cambió, la propuesta queda pendiente para revisión manual.
- Se eliminó la grilla de porcentajes y los porcentajes repetidos (incluido el progreso del cuestionario, ahora en cantidad de respuestas). Las reglas de completitud del modelo no cambiaron; se muestran como estados contextuales (Validado, Pendiente de validar, Falta información, Requiere revisión, No aplica) y en un resumen compacto «Pendientes antes de exportar».
- Se retiró el drawer «Vista previa del contenido de presentación».

**Benchmark** (páginas 13–25): marcas seleccionadas → análisis de la marca del cliente → contenidos, paid media, web y diseño propios → un bloque completo por competidor (análisis individual, contenidos, paid media, web, diseño) → conclusiones generales (tomar / evitar / diferenciar) → monitoreo y cambios entre snapshots. Cada bloque admite texto, enlaces, métricas, capturas o referencias, fuentes, evidencia y conclusiones. El monitoreo automático figura **sin proveedor conectado**: no se muestran escaneos simulados; el circuito previsto (fuente → comparar → detectar cambios → proponer → revisar → actualizar tras validar) queda descripto y los snapshots manuales funcionan.

**Plan de Marketing** (páginas 26–53): un capítulo por módulo contratado con el emblema del sistema Avans, en el orden de la plantilla (Estrategia, Diseño de marca, Publicidad digital, Contenidos, Audiovisuales, Desarrollo web); los bloques de cada servicio vienen del modelo existente. Los módulos no contratados no aparecen; CRM, IA y automatizaciones, Soluciones gráficas y Mercado Libre muestran «Plantilla estratégica pendiente de definición». No se agrega información inventada: los bloques vacíos lo dicen y cada decisión conserva sus fundamentos de Discovery y Benchmark.

### Ajustes visuales

- Estilos del módulo de conocimiento alineados con tokens Avans (sin esquinas redondeadas ni colores fuera de paleta).
- Corrección de un desborde horizontal en móvil causado por texto solo para lectores de pantalla dentro de tablas con scroll.

### Pruebas de la etapa

- `tests/discovery-browser.spec.ts` y `tests/knowledge-browser.spec.ts` migrados al documento continuo y al gestor de módulos, sin quitar verificaciones.
- `tests/strategic-documents-browser.spec.ts` (nuevo): agregar módulo con alcance y confirmación, persistencia tras recargar, navegación y Plan, desactivación conservando datos, aislamiento ACA/EPSA, permisos PM/operativo, Discovery que empieza por el cuestionario y sin porcentajes, respuestas validadas aplicadas con auditoría, e índices sticky de Benchmark y Plan.
