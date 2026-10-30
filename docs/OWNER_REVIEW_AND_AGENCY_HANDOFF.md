# Avans OS — continuidad en main y traspaso a la agencia

## Estado y límites

El usuario solicitó incorporar el demo a `main` mediante el PR #11 para continuar desde Claude. Esta entrega NO transfiere cuentas ni habilita autenticación, persistencia o integraciones productivas. Verificar que el PR esté mergeado y el deployment READY antes de dar por completada la publicación.

Repositorio: `devdamig-dev/avans-agency-os`.
Rama de continuidad para Claude después del merge: `main`.
Rama histórica de implementación: `feature/avans-os-meeting-architecture`.
Ruta de la aplicación revisada: `/v2`. El legado anterior se conserva.

## Decisiones del usuario y de Avans

- Cinco áreas principales: Operaciones, Ventas, Finanzas, RRHH y Gerencia.
- Jerarquía confirmada: **Operaciones → Clientes → Benchmark**. Benchmark NO es hermano de Clientes ni otra área principal. La vista general de benchmark también pertenece al módulo Clientes.
- Se preservan `/v2/clientes`, `/v2/benchmark` y las fichas por cuenta para no romper enlaces. Jerarquía de navegación y estructura de URL no son lo mismo.
- Google y `@avans.agency` siguen siendo requisitos de acceso; no se afirma que el login esté implementado.
- La revisión del sitemap/video incorporó Forecast en Finanzas; Burbujas, Contractors y «Pull de talentos» en RRHH; Planificación en Gerencia.
- Burbujas relaciona equipos/clientes. Contractors contempla contratos, CDC, valores medulares y ausencias programadas. Pull de talentos contempla formularios. Planificación contempla prioridades, riesgos, responsables y plazos.
- CDC, criterios de valores medulares y el alcance definitivo del Forecast siguen por definir. No inventar significados, puntajes ni evaluación laboral.
- No interpretar espacios vacíos del mapa como órdenes de eliminar funciones.

## Arquitectura vigente

1. Operaciones: Clientes (Cliente 360°, conocimiento, documentos y Benchmark), procesos, proyectos, reuniones, contenido, campañas, capacidad y excepciones.
2. Ventas: leads, discovery, oportunidades, propuestas, pipeline y handoff.
3. Finanzas: Forecast, facturación, cobranzas, costos, rentabilidad y gestión financiera preservada.
4. RRHH: Burbujas, Contractors, Pull de talentos, equipo, capacidad, asignaciones, ausencias, habilidades y continuidad.
5. Gerencia: Planificación, indicadores, riesgos, decisiones, reportes y aprendizajes.

Command Center, Bandeja y Plataforma son transversales. Las demás áreas consultan las mismas cuentas; no duplicar Clientes.

## Implementación y revisión

- `app/v2/navigation.ts`: árbol anidado y `getV2Ancestors`, compartido por selección de área y breadcrumbs. Benchmark tiene padre Clientes; Clientes tiene padre Operaciones.
- `app/v2/components/v2-chrome.tsx`: navegación recursiva; conserva Operaciones activa al entrar a Clientes o Benchmark y muestra los ancestros.
- `app/v2/components/owner-revision-workspace.tsx`: pestañas, filtros, formularios y edición locales; sin backend ni almacenamiento persistente.
- `app/v2/owner-revision-data.ts`: registros ficticios, campos propuestos y calculadora Forecast.
- `app/v2/owner-revision.module.css`: superficies claras, negro/coral y estilos de los componentes nuevos.

Accesos:
- `/v2/operaciones#clientes`
- `/v2/clientes` y `/v2/clientes/epsa`
- `/v2/benchmark` y `/v2/clientes/epsa/benchmark`
- `/v2/finanzas#forecast`
- `/v2/rrhh#burbujas`, `#contractors`, `#talentos`
- `/v2/gerencia#planificacion`

Los cambios de formularios permanecen sólo durante la visita. Recargar o navegar fuera los descarta. No se publican convocatorias, firman contratos ni envían mensajes.

Forecast muestra facturado, cobrado, saldo y deuda vencida; su escenario probabilístico es una propuesta demo, no una fórmula económica aprobada. La deuda vencida es parte del saldo y no se vuelve a sumar a ingresos. La validación rechaza valores negativos/no numéricos, probabilidades fuera de rango y saldos inconsistentes.

## QA y límites

Comprobar cinco áreas principales, anidación Operaciones → Clientes → Benchmark, breadcrumbs, enlaces históricos, pestañas y formularios locales. Probar móvil/teclado/tema oscuro y errores de Forecast antes de declarar una QA integral. Build correcto o HTTP 200 no equivalen a probar todas las interacciones. Verificar vulnerabilidades con evidencia actual, no repetir cifras históricas.

## Inventario verificado para el traspaso

Lectura realizada el 30/10/2026, sin acceder a valores de secretos:
- Vercel: proyecto `avans-agency-os`, ID `prj_iZaDbZW6JfLBcocaqzlTq8LkDkx5`, equipo `damians-projects-a45d01bf`.
- Supabase: existe un proyecto `avans-agency-os`, referencia `rwjrqrwspddckvxeansc`, región `sa-east-1`, estado `INACTIVE` en la consulta. Este inventario no certifica su contenido ni la conexión efectiva con el demo.
- Vercel tiene nombres de variables de Supabase, Google, IA, email, n8n y mensajería. La existencia de variables no prueba que los servicios estén operativos. Los valores no se leyeron ni se copian al repositorio.

## Transferencia posterior — no ejecutada

Preferir transferir la propiedad de los proyectos existentes antes que duplicarlos, sujeto a permisos, plan e inventario.

### Vercel

La cuenta que transfiere debe ser Owner del equipo origen y miembro del destino. La agencia debe preparar su equipo, facturación y acceso al repositorio.

En el proyecto: Settings → General → Transfer Project. Seleccionar el equipo de Avans y revisar lo que se transfiere antes de confirmar. La documentación incluye deployments, configuración, enlace Git, dominios y variables del proyecto, con excepciones. Reinstalar integraciones cuando corresponda; logs/monitoring y determinados recursos tienen tratamiento separado. Las variables de `env`/`build.env` en `vercel.json` no se transfieren automáticamente como variables del panel.

Tras transferir: verificar `main`, build, ruta `/v2`, dominios, protección, variables por ambiente y un despliegue de prueba. No publicar secretos ni desactivar protección para facilitar pruebas.

### Supabase

Abrir el proyecto identificado, comprobar su estado INACTIVE en el panel y revisar contenido/recuperación antes de tomar decisiones. No asumir que está vacío y no reactivarlo ni borrarlo sin autorización.

Preparar la organización de Avans. Quien transfiere debe ser Owner del origen y miembro del destino. En los ajustes generales del proyecto, usar Transfer Project. La documentación exige no tener conexión GitHub activa, roles limitados al proyecto (Team/Enterprise) ni log drains configurados. Revisar y restablecer las integraciones necesarias tras el cambio.

Una transferencia entre organizaciones no es una exportación/importación a una base nueva ni cambia región. Revisar facturación, funcionalidades del plan destino, tablas, Auth, Storage, funciones y conectividad después. Si se requiere otro proyecto/región, planificar una migración aparte con respaldo y validación; no confundirla con cambio de propietario.

### Documentación oficial consultada

- https://vercel.com/docs/projects/transferring-projects
- https://supabase.com/docs/guides/platform/project-transfer
- https://supabase.com/docs/guides/platform/migrating-within-supabase

## Claude y sistema de diseño

Partir de `main` después del merge confirmado. Abrir ramas de trabajo separadas para cambios paralelos y usar pull requests. Mantener funcionalidades, arquitectura y alcance; adaptar la UI al sistema de diseño de la agencia sólo cuando esté disponible. No reconstruir desde cero por un cambio visual.

No copiar secretos a chats, capturas, documentos o GitHub. Revisar propietarios de credenciales de terceros: transferir hosting no cambia automáticamente quién paga una API externa.

## Descripción breve para Claude

Continuar Avans OS sobre el demo de GitHub en main. Organizar cinco áreas: Operaciones —con Clientes y Benchmark dentro de Clientes—, Ventas, Finanzas, RRHH y Gerencia. Preservar Forecast, Burbujas, Contractors, Pull de talentos, Planificación y las funciones existentes. Adaptar la interfaz al sistema de diseño de la agencia sin reconstruir el producto. Preparar el traspaso de Vercel y Supabase a Avans, mantener el acceso previsto con Google @avans.agency y distinguir claramente simulación, backend pendiente y funciones reales.
