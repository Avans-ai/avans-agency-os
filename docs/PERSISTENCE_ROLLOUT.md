# Avans OS — persistencia y seguridad

## Estado actual

La rama de trabajo conserva los cinco accesos de gestión aprobados y agrega persistencia local para que la revisión no pierda cambios al recargar el navegador.

Esto **no es** todavía un backend multiusuario:

- los datos locales no se sincronizan entre equipos;
- no hay Auth real aplicada a `/v2`;
- no hay permisos ejecutados por API/RLS;
- los archivos binarios todavía no se suben a Storage;
- el proyecto Supabase `rwjrqrwspddckvxeansc` está pausado.

## Bloqueo comprobado

Supabase no permitió restaurar `avans-agency-os` porque la organización ya alcanzó el límite de dos proyectos gratuitos activos. No se pausó ni modificó otro producto para liberar el cupo.

## Preparado en código

- clientes SSR/browser para Supabase, todavía sin uso;
- endpoint de salud `/api/health/persistence`;
- endpoint protegido `/api/cron/archive-tasks`;
- migración `20261110143000_operational_persistence.sql`;
- tablas para asignaciones, servicios, canales, finanzas, benchmark, recomendaciones, documentos y reportes;
- políticas RLS por organización, asignación, rol y módulo;
- función de archivo de tareas completadas después de 30 días;
- grants explícitos para el Data API.

## Activación segura

1. Liberar un cupo o actualizar el plan de Supabase.
2. Restaurar `rwjrqrwspddckvxeansc`.
3. Inspeccionar tablas, datos, Auth y migraciones aplicadas.
4. Crear una rama de desarrollo de Supabase si el costo fue aprobado; de lo contrario usar una base local.
5. Aplicar primero la migración en desarrollo.
6. Ejecutar Security Advisor y pruebas RLS de allow/deny.
7. Configurar `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `CRON_SECRET` en Preview, no en el cliente.
8. Migrar datos demostrativos con IDs estables.
9. Conectar lectura real; después escrituras por módulo.
10. Validar Auth, roles, clientes asignados, finanzas y aislamiento entre organizaciones.
11. Recién entonces configurar el cron diario y habilitar producción.

## Regla de publicación

No promover a `main` ni producción hasta que la misma preview haya sido revisada y los flujos críticos tengan evidencia de persistencia y permisos reales.
