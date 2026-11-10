# Entrega · conocimiento del cliente · 2026-11-10

## IMPLEMENTADO

Cuestionario reutilizable de páginas 5–12 integrado al Marketing Discovery existente; fuentes comunes; reuniones e inbox sin cliente; asociación determinística y manual entre cuentas autorizadas; deduplicación; propuestas con evidencia y aprobación del PM; versiones, auditoría y módulos que requieren revisión.

Benchmark de páginas 13–25 con marca propia, competidores, análisis repetibles, conclusiones, snapshots y comparación de relevamientos. Plan de páginas 26–53 con los seis servicios del PPT, campos condicionales, validación de distribuciones y relaciones, sitemap y visibilidad por servicios activos. Los servicios sin plantilla conservan su operación y muestran el pendiente solicitado.

Persistencia local aislada por cliente, migración conservadora de datos previos, permisos visuales y estados honestos. Se mantienen los cinco accesos superiores. Google Workspace tiene adapters, OAuth/PKCE, validación OIDC, parsing, contratos de persistencia y rutas cerradas hasta habilitar autenticación y repositorios reales.

## PROBADO

- `npm ci --cache /tmp/avans-npm-cache`: correcto.
- `npm run lint`: 0 errores, 4 advertencias heredadas fuera del nuevo sistema.
- `npm run typecheck`: correcto.
- `npm run build`: correcto, 269/269 páginas.
- 47 pruebas verificadas: 34 de dominio y 13 de navegador. Tras el último ajuste de asignación, 46 pasaron en la ejecución completa y la restante pasó al corregir el selector de navegación del test y volver a ejecutarla.
- Cuestionario → propuesta → aprobación → Discovery → revisión dependiente; fuentes, evidencias, idempotencia y propuestas obsoletas; recarga y aislamiento EPSA/ACA; asignación de reuniones entre cuentas autorizadas; roles; altas de competidores y conclusiones; snapshots; activación/desactivación de Plan; campos Leads/Ecommerce y validaciones de porcentajes/sitemap.
- Regresión de Inicio, Tareas, clientes, Alcance, Reportes, módulos operativos y Discovery anterior. Chromium en escritorio, notebook, tablet y mobile; capturas de Plan mobile y Benchmark desktop inspeccionadas. Sin desborde de documento en los recorridos verificados.
- Google probado con fixtures y transporte simulado, sin acceso a cuentas reales: scopes, PKCE, estado OAuth de un solo uso, firma/audiencia/emisor/email OIDC, envelope Pub/Sub, APIs, errores sin tokens, parser Docs y asociación Calendar. Rutas sin configuración: OAuth 503, webhook sin credencial válida 401.
- Migración: parser PostgreSQL `pglast`, 87 sentencias válidas sintácticamente. No se conectó ni ejecutó SQL.

Comando de regresión: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm exec -- playwright test`. Los recorridos funcionales se ejecutaron contra el build local.

## DESPLEGADO EN PREVIEW

Destino exclusivo: [preview de la rama](https://avans-agency-os-git-feat-avans-os-ajustes-reunion-827e1a-avans2.vercel.app/v2). Los checks del commit publicado y el estado del despliegue se registran en el [PR draft #17](https://github.com/Avans-ai/avans-agency-os/pull/17). No se crean PR ni ramas adicionales.

## VALIDADO EN PRODUCCIÓN

No. No se modificó `main`, no se hizo merge ni se publicó en producción. La verificación local y los checks de preview no equivalen a validación productiva.

## BLOQUEOS

Google Workspace no está conectado: faltan configuración/autorización de la cuenta, autenticación de servidor y repositorios de tokens/eventos/sesiones. Completar variables no activa la integración. Supabase no se activó ni se probó en esta iteración; la instrucción prohíbe ejecutar migraciones. La preview continúa con localStorage y roles simulados.

## PENDIENTES

Activación autorizada de persistencia multiusuario, Auth/API/RLS y repositorios cifrados; prueba real Google de punta a punta y renovación de suscripciones; política aprobada de retención/purga; proveedores autorizados para monitoreo periódico. Los PDFs, presentaciones e imágenes se registran por enlace: no hay subida binaria ni extracción automática. El análisis de notas reconoce etiquetas explícitas y admite propuestas manuales; no hay IA conectada. El reporte compara snapshots reales y conclusiones guardadas; no afirma haber detectado datos externos ni una quincena sin relevamientos.

## ARCHIVOS MODIFICADOS

Inventario de esta ampliación respecto del commit anterior de Discovery:

- `.env.example`
- `.gitignore`
- `app/api/integrations/google/[action]/route.ts`
- `app/v2/components/google-workspace-card.tsx`
- `app/v2/components/integrations-hub.tsx`
- `app/v2/os/knowledge/benchmark-view.tsx`
- `app/v2/os/knowledge/benchmark.ts`
- `app/v2/os/knowledge/blueprints.ts`
- `app/v2/os/knowledge/documents-view.tsx`
- `app/v2/os/knowledge/knowledge.module.css`
- `app/v2/os/knowledge/mutations.ts`
- `app/v2/os/knowledge/plan-view.tsx`
- `app/v2/os/knowledge/plan.ts`
- `app/v2/os/knowledge/proposal-view.tsx`
- `app/v2/os/knowledge/proposals.ts`
- `app/v2/os/knowledge/questionnaire-view.tsx`
- `app/v2/os/knowledge/questionnaire.ts`
- `app/v2/os/knowledge/scan-adapter.ts`
- `app/v2/os/knowledge/shared-ui.tsx`
- `app/v2/os/knowledge/sources.ts`
- `app/v2/os/knowledge/state.ts`
- `app/v2/os/knowledge/types.ts`
- `app/v2/os/knowledge/use-knowledge.ts`
- `app/v2/os/os.module.css`
- `app/v2/os/overlays.tsx`
- `app/v2/os/screens/client-management-views.tsx`
- `app/v2/os/screens/marketing-discovery.tsx`
- `docs/CLIENT_KNOWLEDGE_DELIVERY.md`
- `docs/CLIENT_KNOWLEDGE_SYSTEM.md`
- `docs/GOOGLE_WORKSPACE.md`
- `lib/google-workspace/adapters.ts`
- `lib/google-workspace/contracts.ts`
- `lib/google-workspace/oauth.ts`
- `lib/google-workspace/pipeline.ts`
- `lib/google-workspace/readiness.ts`
- `lib/google-workspace/webhook.ts`
- `package-lock.json`
- `package.json`
- `playwright.config.ts`
- `supabase/migrations/20261110175436_client_knowledge_workspace.sql`
- `tests/discovery-browser.spec.ts`
- `tests/google-workspace.spec.ts`
- `tests/knowledge-browser.spec.ts`
- `tests/knowledge-model.spec.ts`

## MIGRACIONES PREPARADAS

[`20261110175436_client_knowledge_workspace.sql`](../supabase/migrations/20261110175436_client_knowledge_workspace.sql), creada con CLI oficial de Supabase y NO EJECUTADA. Extiende competidores, snapshots, scan configs y propuestas existentes; agrega fuentes, cuestionarios, reuniones, versiones/dependencias y Plan. OAuth, suscripciones, eventos y auditoría de conexión quedan en esquema privado. Incluye claves compuestas, idempotencia, RLS y grants. Faltan pruebas de aplicación, rollback operativo, transacciones y aislamiento con identidades reales en un entorno autorizado.

## CONFIGURACIÓN GOOGLE NECESARIA

Proyecto y cuenta Workspace autorizados; APIs Calendar, Meet, Docs, Drive, Workspace Events y Pub/Sub; OAuth web y consentimiento/scopes aprobados; callback HTTPS; topic y suscripción push OIDC con permisos; audiencia, cuenta de servicio y fuente esperada; recurso Meet autorizado; clave gestionada para cifrado. Los nombres exactos están en [`.env.example`](../.env.example) y el procedimiento, interfaces pendientes y referencias oficiales en [`GOOGLE_WORKSPACE.md`](GOOGLE_WORKSPACE.md). No se cargaron credenciales ni se modificaron variables de Vercel.

Arquitectura, límites y reproducción: [`CLIENT_KNOWLEDGE_SYSTEM.md`](CLIENT_KNOWLEDGE_SYSTEM.md).
