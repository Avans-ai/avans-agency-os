# Avans OS · Etapa 1 · Bases multiusuario

Fecha: 27/11/2026 · Rama: `feat/avans-os-ajustes-reunion-2026-11-03` (PR #17, borrador).
Auditoría previa: `docs/MULTIUSER_AUDIT.md`.

## Qué incluye

### Base de datos (no destructiva, reversible)

- `supabase/migrations/20261127190000_member_roles_multiuser.sql`: agrega los roles socio, gerencia, lider_tecnico, cliente y proveedor_externo.
- `supabase/migrations/20261127190100_multiuser_foundation.sql`:
  - **Aislamiento**: lectura por asignación activa. Dirección (admin, socio, gerencia) ve toda su organización. Una asignación con `service_id` limita al módulo. El Cliente ve solo lo marcado `client_visible`; el Proveedor ve solo su módulo. Nada cruza organizaciones.
  - **Integridad entre organizaciones**: `client_id` siempre de la misma organización (21 tablas).
  - **Alta restringida**: trigger en `auth.users` que acepta `@avans.agency` (dominio exacto) o una invitación vigente (`user_invitations`). Al darse de alta se crea el perfil y se aplica la invitación. Un `@avans.agency` sin invitación queda sin acceso hasta que un administrador lo asigne.
  - **Contra el escalamiento**: los roles no se cambian por API directa; no se puede dejar una organización sin admin; `can_manage` lo otorga solo dirección; Clientes y Proveedores no pueden recibir gestión.
  - **Auditoría inmutable** (`audit_events`): alta, cambio y baja en 11 tablas, con el actor. No admite UPDATE, DELETE ni TRUNCATE.
  - **Tareas**:
    - `task_events` guarda el historial inmutable;
    - un índice único parcial garantiza una sola tarea activa por cadena;
    - `external_key` única hace idempotentes los reintentos;
    - `revision` habilita la concurrencia optimista (`update … where revision = n`; 0 filas = conflicto).
  - **Archivo sin pérdida**: `archived_at` en clientes, proyectos, documentos y reportes. El borrado físico queda solo para admin.
  - **Permisos de API**: se revocó TRUNCATE, TRIGGER y REFERENCES; `anon` sin acceso a tablas operativas; integraciones, ejecuciones de IA y logs se escriben solo desde el servidor.
- `supabase/rollbacks/20261127190100_multiuser_foundation.down.sql`: restaura políticas, funciones, triggers y permisos previos **sin borrar** columnas ni tablas nuevas.

### Aplicación

- `proxy.ts` (Next 16): refresca la sesión y exige usuario en todas las páginas y APIs, salvo `/ingresar`, `/auth/*`, health, cron y el webhook firmado.
- `/ingresar`:
  - ingreso con Google (`hd=avans.agency` como ayuda visual) y un botón para clientes y proveedores invitados;
  - mensajes de sesión vencida, cierre de sesión y dominio no permitido.
- `/auth/login`, `/auth/callback`, `/auth/signout`: solo POST del mismo origen (salvo el callback). El callback cierra la sesión de cuentas externas sin membresía. `volver` solo acepta rutas `/v2` internas.
- `/api/auth/session`: identidad para la interfaz; nunca devuelve tokens.
- `lib/auth/*`:
  - `config.ts`: modo (preview, required o misconfigured) y dominio;
  - `roles.ts`: roles y vista de interfaz;
  - `authorize.ts`: espejo puro de la RLS para cortar temprano en las APIs;
  - `session.ts`: `getUser()` validado contra Auth, membresías por RLS y la guardia `requireApiAuth`.
- Interfaz:
  - con sesión real, el rol sale del servidor; el selector «Rol simulado» desaparece y se ignora el valor guardado en localStorage;
  - el menú de perfil muestra correo, rol y «Cerrar sesión»;
  - si la sesión vence con la página abierta, se vuelve a `/ingresar` conservando el origen.
- APIs existentes (asistente, Google y presentaciones): exigen sesión con la autenticación activa.

### Modo de funcionamiento

| `AVANS_AUTH_REQUIRED` | Supabase configurado | Resultado |
|---|---|---|
| distinto de `true` | — | **preview**: igual que hasta hoy (sin ingreso, datos de demostración locales). |
| `true` | sí | **required**: ingreso obligatorio. |
| `true` | no | **misconfigured**: todo bloqueado (503 o pantalla de ingreso sin botones). Falla cerrado. |

## Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| `npm run test:db` (Postgres 16 descartable): migraciones, 90 verificaciones de aislamiento y ataques cruzados, reversión idéntica y reaplicación con 90 verificaciones más | OK |
| Esquema anterior atacado con los mismos casos | 9 brechas reales (ver auditoría, sección 3) |
| `tests/auth-model.spec.ts` (8 pruebas de dominio) | OK |
| `tests/auth-guard-browser.spec.ts` (5 pruebas de navegador con un stub local de Supabase Auth/REST: sin sesión, sesión vencida o falsa, sesión válida con intento de cambiar el rol por localStorage, cierre de sesión, POST cruzado y modo mal configurado) | OK |
| Lint, typecheck, build y regresión completa | Ver el informe del commit |

Lo que **no** se probó: un Supabase real (el proyecto está pausado), Google OAuth real y la preview de Vercel desde este entorno (el proxy de red la bloquea).

## Estado por ítem

| Ítem | IMPLEMENTADA | PROBADA | DESPLEGADA | VALIDADA EN PRODUCCIÓN |
|---|---|---|---|---|
| Migraciones de roles y base multiusuario | Sí | Sí (base local) | No | No |
| Reversión | Sí | Sí | No | No |
| Proxy y rutas de autenticación | Sí | Sí (stub local) | Preview de Vercel en modo preview (sin autenticación) | No |
| Rol de la interfaz desde el servidor | Sí | Sí | Igual que arriba | No |
| Protección de APIs | Sí | Sí | Igual que arriba | No |
| Persistencia centralizada en Supabase | **No** | — | — | — |

## Pendiente de la Etapa 1

1. **Persistencia centralizada**: reemplazar `local-persistence.ts` por repositorios del servidor (route handlers o server actions con `requireApiAuth` + RLS), módulo por módulo, empezando por clientes, servicios, tareas y asignaciones. Mientras tanto, incluso con la autenticación activa, los datos siguen siendo de demostración y locales; el distintivo «Datos de demostración» sigue visible.
2. **Carga inicial con IDs estables**: script que use `external_key` y `slug` para pasar los datos de demostración a staging. Nunca a producción.
3. **Administración de usuarios**: pantalla para invitar, asignar clientes y módulos, y revocar (las tablas y la RLS ya existen).

## Activación segura (requiere autorización)

1. Restaurar o crear un proyecto Supabase de **staging** (decisión de costo).
2. Aplicar las migraciones en orden. La inicial se aplica con `set check_function_bodies = off;` (ver auditoría, hallazgo 10).
3. Crear el primer administrador (con service role, una sola vez):
   ```sql
   insert into public.user_invitations (organization_id, email, role)
   select id, '<correo>@avans.agency', 'admin' from public.organizations where slug = 'avans';
   ```
   La persona ingresa con Google y la invitación crea su membresía.
4. En Supabase Auth:
   - habilitar Google con un cliente OAuth de tipo interno;
   - Site URL: la URL de staging;
   - redirect: `https://<dominio>/auth/callback`.
5. En Vercel (solo en el entorno de staging o preview), definir `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `AVANS_AUTH_REQUIRED=true`. `SUPABASE_SERVICE_ROLE_KEY` y `CRON_SECRET` van como variables del servidor, nunca `NEXT_PUBLIC_`.
6. Correr el Security Advisor de Supabase y repetir los casos de `supabase/tests/rls_isolation.test.sql` con usuarios reales.
7. Recién entonces planificar producción.

La reversión se ejecuta solo con autorización, primero fuera de producción.
