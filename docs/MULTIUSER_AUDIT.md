# Avans OS · Etapa 0 · Auditoría técnica para la plataforma multiusuario

Fecha: 27/11/2026 · Rama: `feat/avans-os-ajustes-reunion-2026-11-03` · Base: `761d670`.

Referencia funcional: `docs/FUNCIONALIDADES_2.md`. El documento «Avans OS - Funcionalidades (3).docx» no está en el repositorio ni en los adjuntos de la sesión; falta para cruzar el alcance.

Estados usados en este documento (no son sinónimos):

- **IMPLEMENTADA**: el código existe en la rama.
- **PROBADA**: pasó pruebas automáticas que se ejecutaron (indicadas).
- **DESPLEGADA**: está en un entorno hospedado (preview de Vercel o Supabase).
- **VALIDADA EN PRODUCCIÓN**: verificada con datos y usuarios reales en producción. Hoy no hay nada en este estado.

## 1. Mapa de arquitectura actual

```
Navegador ──► Next.js 16 (Vercel) ────────────────────────────► Supabase (proyecto pausado)
  │            ├─ proxy.ts (nuevo): sesión / redirección         ├─ Postgres: 6 migraciones en repo, ninguna aplicada
  │            ├─ /v2/** páginas estáticas + componentes cliente  ├─ Auth (Google): sin configurar
  │            ├─ /api/assistant  (IA, apagada sin variables)     └─ Storage: sin buckets
  │            ├─ /api/integrations/google (falla cerrado, 503)
  │            ├─ /api/presentations (falla cerrado, 503)
  │            ├─ /api/cron/archive-tasks (Bearer CRON_SECRET)
  │            └─ /api/health/persistence
  │
  └─ localStorage «avans-os:preview:v1:*» + IndexedDB (binarios)  ◄── TODOS los datos operativos hoy
```

Hoy toda la operación vive en el navegador de cada persona: no hay datos compartidos entre usuarios ni dispositivos. Supabase está preparado en código, pero no se usa para leer ni escribir.

## 2. Inventario

### 2.1 Supabase y base de datos

| Elemento | Estado | Detalle |
|---|---|---|
| Proyecto `rwjrqrwspddckvxeansc` | Pausado | Para restaurarlo hay que liberar un cupo del plan gratuito (2 proyectos activos) o pagar un plan. **Requiere autorización.** |
| `20260814012500_initial_schema.sql` | Preparada | 22 tablas con RLS «cualquier miembro de la organización, todo». La función `is_org_member` referencia `organization_members` antes de crearla, así que en un Postgres limpio solo se aplica con `check_function_bodies=off` (verificado). |
| `20261110143000_operational_persistence.sql` | Preparada | Asignaciones por cliente y módulo, servicios, canales, finanzas, benchmark, propuestas y archivo a los 30 días. |
| `20261110150000_operational_policy_hardening.sql` | Preparada | Tareas y documentos sin cliente; perfiles de colegas. |
| `20261110175436_client_knowledge_workspace.sql` | Preparada | Fuentes de conocimiento, versiones, dependencias, Google Workspace (tokens solo en `private`). |
| `20261127190000_member_roles_multiuser.sql` | **Nueva** | Roles socio, gerencia, líder técnico, cliente y proveedor externo. |
| `20261127190100_multiuser_foundation.sql` | **Nueva** | Aislamiento por cliente y módulo, alta restringida, auditoría, historial de tareas, concurrencia y archivo. Ver Etapa 1. |
| `seed.sql` | Preparado | Agentes de IA; no crea usuarios. |
| Clientes `lib/supabase/*` | Sin uso | Navegador, servidor, admin y (nuevo) proxy. Solo el cron usa admin. |

### 2.2 Autenticación

| Antes de esta etapa | Después (rama) |
|---|---|
| No había inicio de sesión. El rol se elegía en un selector y se guardaba en localStorage. | Supabase Auth con Google, `proxy.ts`, `/ingresar`, `/auth/login`, `/auth/callback`, `/auth/signout`, `/api/auth/session`. Se activa con `AVANS_AUTH_REQUIRED=true` (ver `docs/ETAPA1_MULTIUSUARIO.md`). |

### 2.3 Persistencia local (todo lo que hay que migrar)

Prefijo `avans-os:preview:v1:` con sobre `{version, value, savedAt}` (`app/v2/os/local-persistence.ts`).

| Clave | Contenido | Tabla destino prevista |
|---|---|---|
| `workspace` | Tareas, servicios por cliente, ideas, avisos y rol simulado | `tasks`, `task_events`, `client_services`, `notifications` (a crear) |
| `client:<slug>:module:<servicio>:<colección>` | Registros de cada módulo (campañas, piezas, jornadas, biblioteca, etc.) | Tablas por módulo o `module_records` (a definir en Etapa 2) |
| `client:<slug>:knowledge:v1` | Discovery, benchmark, plan y fuentes | `client_discoveries`, `knowledge_sources`, `marketing_plan_*`, `benchmark_*` |
| `client:<slug>:marketing-discovery` | Discovery heredado | `client_discoveries` |
| `client:<slug>:reports:v1`, `:report-reviews` | Reportes generados y revisiones | `reports`, `report_metrics`, versiones |
| `client:<slug>:documents`, `knowledge:unassigned-meetings` | Documentos y reuniones sin asignar | `documents`, `meeting_artifacts` |
| `client:<slug>:channels`, `:competitors`, `:service-modules`, `:service-guidelines:<servicio>` | Ficha, competidores y lineamientos | `client_channels`, `client_competitors`, `client_services` |
| `client:<slug>:service:<servicio>:recommendations`, `:recommendation-status` | Recomendaciones | `service_recommendations` |
| `client:<slug>:assistant:<servicio>` | Sugerencias de IA | `agent_runs` |
| `client:<slug>:audiovisuales:jornadas-cupo`, proveedores | Cupos y proveedores audiovisuales | Tablas de Audiovisuales (Etapa 2) |
| `client:<slug>:portal:read`, `viewer:<rol>:client-tasks-view` | Preferencias de lectura y vista | Preferencias por usuario (pueden quedar locales) |
| IndexedDB `avans-os-client-files-v1` y archivos de presentación | Binarios | Storage privado por cliente (Etapa 3) |

`sessionStorage` solo guarda posiciones de scroll (puede quedar local).

### 2.4 API

| Ruta | Protección antes | Protección ahora (rama) |
|---|---|---|
| `/api/assistant/[action]` | Mismo origen y límite por IP. **Sin usuario.** | Además: sesión obligatoria con autenticación activa; límite por usuario. |
| `/api/integrations/google/[action]` | Falla cerrado (503); webhook con firma de Pub/Sub. | Además: sesión obligatoria. |
| `/api/presentations/[action]` | Falla cerrado (503). | Además: sesión obligatoria. |
| `/api/cron/archive-tasks` | Bearer `CRON_SECRET`. | Igual (pública para el proxy, con su propio secreto). |
| `/api/health/persistence` | Pública, sin secretos. | Igual; ahora informa `authMode`. |

### 2.5 Roles

- Preview: 8 roles visuales (`app/v2/os/preview-roles.ts`). Solo cambian la interfaz, no protegen nada.
- Base de datos (ahora): admin, socio, gerencia, project_manager, content_manager, designer, lider_tecnico, cliente y proveedor_externo. Se conservan los valores heredados (comercial, trafficker, finance, viewer).

### 2.6 Integraciones

Google Workspace, Metricool, Meta, Google Ads, TikTok, ChatGPT Ads, Claude Design, Arlis y Tiendanube: **ninguna está conectada**. Google Workspace tiene adaptadores y orquestación probados con almacenes inyectados, pero la ruta falla cerrado. No se activó ningún servicio pago.

### 2.7 Flujos, pruebas y CI/CD

- Motor de tareas por cadena (`applyStageTask`, ids determinísticos, una tarea activa por cadena) en el cliente. Ahora también está garantizado en la base (índice único parcial y `external_key`).
- Pruebas: dominio y navegador con Playwright (278 antes de esta etapa); ahora se suman las de base de datos (`npm run test:db`).
- CI (`quality-gate.yml`): auditoría de dependencias, lint, typecheck, build y regresión de dominio y navegador. Ahora también la regresión de base de datos.
- Vercel: build por commit (preview). Producción sale de `main`, que no se tocó.

## 3. Hallazgos verificados en una base de prueba

Las migraciones vigentes (sin las nuevas) se aplicaron en un Postgres 16 descartable y se atacaron como cada rol. Resultados reales:

| # | Hallazgo (esquema anterior) | Gravedad | Corrección |
|---|---|---|---|
| 1 | Cualquier correo (p. ej. `@gmail.com`) podía darse de alta en Auth. | Alta | Trigger `before insert` en `auth.users` y validación en `/auth/callback`. |
| 2 | Un miembro sin asignaciones leía **todos** los clientes y tareas de la organización. | Alta | Lectura por asignación (`can_read_client` y `can_read_service`). |
| 3 | Cualquier miembro leía `integrations.config` (podría contener secretos). | Alta | Solo admin lee y solo el servidor escribe. |
| 4 | Cualquier miembro escribía integraciones, ejecuciones de IA y logs. | Alta | Escritura solo con `service_role`. |
| 5 | Un PM podía autoasignarse con gestión a **cualquier** cliente. | Alta | Asignan solo dirección o quien ya gestiona el cliente; `can_manage` lo otorga solo dirección. |
| 6 | Un PM podía borrar físicamente tareas. | Media | Borrado físico solo para admin; el resto archiva. |
| 7 | Un admin de una organización podía crear filas con `client_id` de otra organización. | Alta | Trigger `enforce_client_tenant` en 21 tablas. |
| 8 | `anon` y `authenticated` tenían TRUNCATE (ignora RLS). | Media | Revocado TRUNCATE, TRIGGER y REFERENCES. |
| 9 | Perfiles y membresías visibles para cualquier miembro (incluidos los futuros clientes). | Media | Los externos solo ven a quienes trabajan en sus mismos clientes. |
| 10 | La migración inicial no se aplica en un Postgres limpio con la validación por defecto. | Baja | Documentado: aplicar con `check_function_bodies=off`. No se editó porque podría estar aplicada en el proyecto pausado. |

## 4. Matriz de brechas

| Área | Reutilizable | Brecha | Etapa | Estado |
|---|---|---|---|---|
| Esquema base y asignaciones | Sí (4 migraciones) | Aislamiento, roles y alta | 1 | IMPLEMENTADA · PROBADA (base local) |
| RLS por cliente y módulo | Funciones `private.*` | Lectura abierta a toda la organización | 1 | IMPLEMENTADA · PROBADA (90 verificaciones) |
| Auditoría inmutable | — | No existía | 1 | IMPLEMENTADA · PROBADA |
| Historial de tareas y una activa por cadena | Modelo de cadena del cliente | Sin garantía en la base | 1 / 2 | IMPLEMENTADA · PROBADA (base) |
| Concurrencia optimista (`revision`) | — | No existía | 1 | IMPLEMENTADA · PROBADA (base) |
| Migraciones reversibles | — | Sin reversión | 1 | IMPLEMENTADA · PROBADA (reversión idéntica y reaplicación) |
| Auth Google @avans.agency | Clientes Supabase | No existía | 1 | IMPLEMENTADA · PROBADA (stub local de Auth); NO DESPLEGADA |
| Protección de rutas y API | — | No existía | 1 | IMPLEMENTADA · PROBADA |
| Rol de la interfaz desde el servidor | Selector de preview | Rol tomado de localStorage | 1 | IMPLEMENTADA · PROBADA |
| Persistencia centralizada (repositorios Supabase) | Modelos de dominio | Todo sigue en localStorage | 1 (pendiente) | NO IMPLEMENTADA |
| Migración de datos de demostración con IDs estables | `external_key` | Script de carga | 1 (pendiente) | NO IMPLEMENTADA |
| Notificaciones fuera de la app (cola, cron) | Avisos locales | Sin backend | 2 | NO IMPLEMENTADA |
| Procedimientos periódicos del manual | — | Falta el manual oficial | 2 | NO IMPLEMENTADA |
| Storage privado y versionado de documentos | `documents` y `knowledge_versions` | Sin buckets ni políticas | 3 | NO IMPLEMENTADA |
| Propuestas de IA con aprobación del PM | `document_change_proposals` | Falta la transacción de aprobación | 3 | PARCIAL (esquema) |
| Registro de consumo de IA (proveedor, tokens, costo) | `agent_runs` | Faltan las columnas de costo y proveedor | 3 | PARCIAL |
| Métricas reales e integraciones | Motor de métricas, PDF | Sin fuentes reales | 4 | NO IMPLEMENTADA (sin autorización de servicios) |
| Backups, monitoreo, DEV → STAGING → PROD | Vercel por rama | Sin staging de base ni backups | 5 | NO IMPLEMENTADA |

## 5. Decisiones que requieren autorización

1. **Supabase**: liberar un cupo o pagar un plan para restaurar el proyecto; aplicar las migraciones en un entorno que no sea producción (rama de Supabase con costo, o un proyecto nuevo de staging).
2. **Google OAuth**: crear el cliente OAuth en Google Cloud (consentimiento interno `avans.agency`) y cargarlo en Supabase Auth.
3. **Clientes y proveedores externos**: decidir si ingresan con Google (cuenta propia invitada, lo implementado) o con enlace mágico por correo (requiere un SMTP; el de Supabase tiene límites).
4. **Producción**: definir `AVANS_AUTH_REQUIRED=true` en Vercel solo cuando la base y la autenticación estén verificadas en staging.
