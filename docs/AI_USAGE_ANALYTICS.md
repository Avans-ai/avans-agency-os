# Avans OS — Analítica de Consumo y Eficiencia de IA

## Estado de implementación (2026-10-10)

- Ruta `/v2/consumo-ia`: **implementada** en la rama de trabajo de la nueva arquitectura de Avans OS.
- Dashboard: filtros 7/30/90 días, áreas, gasto USD, tokens, inversión por actividad/proveedor, tasa de aprobación, costo por resultado y presupuesto mensual.
- Demo: **datos sintéticos siempre identificados** cuando faltan variables Supabase. No se presentan como gasto real.
- Esquema: migración aditiva `ai_usage_events` + `ai_usage_budgets`, pendiente de aplicar cuando el proyecto Supabase vuelva a estar activo.
- Backend: `recordAiUsage` / `recordAiUsageOutcome` listos para ser llamados desde rutas de agentes o motores de producción. **Todavía no hay captura automática conectada a proveedores**.
- Seguridad: costos accesibles únicamente a miembros `admin` o `finance` con RLS al usar Supabase real. Vista demo es ficticia y visible en la preview.
- Integración con Agents Office: esa funcionalidad está actualmente en una rama/PR distinto; conectar el hook cuando se integren las dos ramas, sin descartar cambios de ninguna.

## Modelo: consumo no equivale a resultados

Cada evento de telemetría representa una operación atribuible a una organización y, si se conoce, a un usuario, agente, cliente y proyecto.

- **Moneda principal**: USD. Persistir costos reportados por proveedor (`cost_source=provider`) o estimaciones explícitas (`estimated`). `cost_usd = NULL` significa costo desconocido, no costo cero.
- **Texto**: registrar `input_tokens` y `output_tokens` desde la respuesta real del proveedor.
- **Imagen**: registrar cantidad de imágenes y costo/cuota del proveedor. No convertir imágenes arbitrariamente en tokens.
- **Video**: registrar duración, créditos u otras unidades en `provider_units` + `provider_unit_name`. No comparar unidades físicas distintas.
- **Iteraciones**: `attempts` cuenta solicitudes/intententos; la clave `source_event_id` evita duplicar consumos durante reintentos de webhook.
- **Reintentos**: la captura es insert-once por organización, proveedor y `source_event_id`. Un duplicado devuelve el ID original sin reemplazar costos ni resultados ya aprobados. Las conciliaciones de facturación necesitan un flujo explícito separado; no se deben enviar como una nueva captura del mismo evento.
- **Eficiencia**: `units_generated` y `units_approved` (un resultado aprobado se registra luego de revisión humana). El costo por aprobado = gasto conocido / aprobaciones en el período.
- **Ahorro de tiempo**: opcional, solo cuando el área lo mide o estima expresamente; no equivale por sí solo a rentabilidad financiera.
- **Costo por resultado**: indicador de proceso, no de desempeño individual; sin aprobaciones se muestra sin valor.
- **Presupuesto**: en `ai_usage_budgets` por organización, área y mes. Los períodos analíticos y los límites mensuales se calculan por separado.
- **Cobertura**: la lectura solicita el conteo exacto bajo los mismos filtros y permisos. El snapshot distingue `complete`, `partial` y `unknown`; no depende de recibir exactamente 2.000 filas, porque Data API puede aplicar un límite menor. Con cobertura parcial o desconocida se muestran mínimos conocidos y tasas de la muestra, sin confirmar presupuesto disponible ni costo por aprobado total.
- **Precisión presupuestaria**: los umbrales se comparan en micro-USD, acorde con `numeric(18,6)`. El porcentaje se redondea sólo para presentación. Un límite de USD 0 es un presupuesto válido, distinto de no tener presupuestos configurados.

No registrar prompts, respuestas, archivos ni contenido sensible en estos eventos: solo identificadores y métricas agregables.

## Contrato de integración

Dentro de una función **de servidor confiable**, después de obtener uso y facturación del proveedor:

```ts
import { recordAiUsage, recordAiUsageOutcome } from "@/lib/ai-usage-recorder";

const id = await recordAiUsage({
  organization_id: trustedOrganizationId, // nunca confiar en orgId enviado por el navegador
  source_event_id: providerRequestId,      // estable e idempotente
  provider: "openai",
  model: modelName,
  modality: "text",
  area: "Marketing",
  activity: "Recomendaciones de marketing",
  client_id: trustedClientId,
  input_tokens: providerUsage.input_tokens ?? 0,
  output_tokens: providerUsage.output_tokens ?? 0,
  units_generated: 1,
  units_approved: 0,
  cost_usd: verifiedUsdCost, // puede ser null si la fuente no informó el costo
  cost_source: "provider",  // o "estimated", indicando el método utilizado
});
// En una acción posterior validada por humano:
await recordAiUsageOutcome({
  organization_id: trustedOrganizationId,
  usage_event_id: id,
  approved: 1,
});
```

En `recordAiUsageOutcome`, omitir `minutes_saved` conserva el valor anterior. Enviar `null` explícito lo elimina. El replay de captura tampoco modifica ese valor.

El ejemplo es un contrato, no un endpoint de captura conectado hoy. Los conectores reales deberán rellenar área, actividad, cliente, usuario y proveedor desde contexto confiable de ejecución. Si la fuente no permite atribuir una generación a un área o proyecto, clasificarla explícitamente como `Sin atribuir` hasta conciliación.

## Implementación y permisos

1. Verificar la restauración del proyecto Supabase y el esquema base.
2. Revisar y aplicar la migración `20261010150000_ai_usage_efficiency.sql` mediante flujo normal de migraciones; antes de producción correr `get_advisors` y test RLS con roles reales.
3. Configurar las variables Supabase **solo en Vercel**, nunca guardar secretos en GitHub. Respetar separación preview/prod.
4. Crear usuarios corporativos, membresías y roles reales (`admin` y `finance`; decidir el rol formal de Gerencia en próxima migración).
5. Integrar primero OpenAI/Anthropic/Gemini en agentes; agregar después imagen y video con sus tarifas y unidades reales.
6. Registrar un evento exitoso, un evento de costo desconocido, una aprobación posterior, un reintento idempotente y un intento de lectura no autorizado.
7. Confirmar diferencias entre costos estimados y facturas reales antes de mostrar cifras como `facturadas`.
8. Implementar resúmenes paginados o agregación SQL para cubrir todo el período cuando se supere el límite de Data API o de la consulta. Mientras tanto, la UI informa la cobertura y evita conclusiones de presupuesto y eficiencia basadas en una muestra incompleta.
9. Añadir alertas automáticas/umbrales de gasto y aprobaciones gerenciales, sin accionar recortes automáticamente.

## QA y criterios de aceptación

- El dashboard funciona sin Supabase y rotula claramente el modo demo.
- Con Supabase configurado: usuarios anónimos o sin rol autorizado reciben acceso restringido.
- Fallas de lectura muestran indisponibilidad, **nunca reemplazan** montos reales con ejemplos.
- Cambiar periodo/área actualiza indicadores, reparto, proveedor y tasa de aprobación.
- El presupuesto **siempre** representa mes calendario actual y todas las áreas.
- Las cantidades de tokens no incluyen imágenes/video que no tengan contadores de tokens.
- Los resultados aprobados se registran después de validación y nunca exceden los generados.
- No es posible insertar telemetría como `anon` o `authenticated` usando el Data API.
- El módulo respeta la identidad Avans: Figtree, negro, blanco y coral #F86E4F; escritorio/móvil.

## Regresiones de fiabilidad (2026-10-11)

Ejecutar `npm ci`, `npm test`, `npm run typecheck` y `npm run build`.

`npm test` usa Node Test Runner, TypeScript y React SSR con los paquetes del lockfile. El recorder usa el cliente Supabase real con un adaptador HTTP en memoria: verifica `resolution=ignore-duplicates`, respuesta vacía del duplicado y búsqueda por la clave idempotente completa. Las lecturas de sesión/cobertura se simulan y no ejecutan SQL.

La suite cubre replay tras aprobación, duplicados concurrentes, separación por organización/proveedor, campos opcionales, aprobaciones inválidas, umbrales y sumas decimales, presupuesto cero, costos desconocidos, cobertura parcial/desconocida, tokens por modalidad, acceso restringido y fallas de fuente. No usa credenciales ni datos reales y no valida RLS, migraciones, integraciones o QA visual del navegador.

