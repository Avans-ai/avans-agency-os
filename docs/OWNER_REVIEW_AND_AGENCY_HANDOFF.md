# Avans OS — revisión del dueño y traspaso a la agencia

## Estado y límites

Esta entrega actualiza el demo, no habilita producción. No cambia cuentas, dominios, credenciales, bases, proveedores ni la autenticación. El cierre definitivo requiere la revisión del usuario y de Avans.

Repositorio: `devdamig-dev/avans-agency-os`.
Rama de continuidad: `feature/avans-os-meeting-architecture` (PR #11). No asumir que `main` contiene la última versión del demo; verificar el commit y la rama antes de trabajar con Claude o desplegar desde otra cuenta.

## Fuente de las decisiones

- Confirmación del usuario: Clientes pertenece a Operaciones; cinco áreas principales; Google y `@avans.agency` se conservan como requisito de acceso.
- Sitemap revisado y video `msedge_VFBptdpmj0.mp4`: Forecast en Finanzas; Burbujas, Contractors y “Pull de talentos” en RRHH; Planificación en Gerencia.
- Las anotaciones especifican equipos/clientes para Burbujas; gestión de contratos, CDC, valores medulares y ausencias programadas para Contractors; formularios para Pull de talentos; prioridades, riesgos, responsable y plazo para Planificación.
- No se interpretan espacios vacíos como instrucciones de eliminación.
- CDC, criterios de valores medulares y el alcance final de Forecast no están definidos. No inventar su significado ni una política de evaluación de personas.

## Arquitectura vigente

1. Operaciones: Clientes/Cliente 360°, conocimiento, benchmark, procesos, proyectos, reuniones, contenido, campañas, capacidad y excepciones.
2. Ventas: leads, discovery, oportunidades, propuestas, pipeline y handoff.
3. Finanzas: Forecast más gestión financiera, facturación, cobranzas, costos y rentabilidad preservados.
4. RRHH: Burbujas, Contractors, Pull de talentos, equipo, capacidad, asignaciones, ausencias, habilidades y continuidad preservados.
5. Gerencia: Planificación más indicadores, riesgos, decisiones, reportes y aprendizajes preservados.

Command Center, Bandeja y la capa de Plataforma siguen siendo transversales. Clientes no vuelve al primer nivel. Otras áreas consultan la misma cuenta; no duplicar registros.

## Implementación del demo

- `app/v2/navigation.ts`: cinco áreas; Clientes y Benchmark como hijos de Operaciones. Se conservan `/v2/clientes`, sus fichas y `/v2/benchmark`.
- `app/v2/components/v2-chrome.tsx`: navegación y breadcrumbs; integra espacios por área sin eliminar los componentes anteriores.
- `app/v2/components/owner-revision-workspace.tsx`: pestañas accesibles, formularios locales, filtros, edición y restablecimiento; no usa backend ni almacenamiento persistente.
- `app/v2/owner-revision-data.ts`: nombres de la revisión, ejemplos sintéticos, campos propuestos y validación del simulador Forecast.
- `app/v2/owner-revision.module.css`: estilos con superficies claras, negro/coral y soporte de tema oscuro para los componentes nuevos.

Accesos de revisión:
- `/v2/operaciones#clientes`
- `/v2/finanzas#forecast`
- `/v2/rrhh#burbujas`
- `/v2/rrhh#contractors`
- `/v2/rrhh#talentos`
- `/v2/gerencia#planificacion`

Las pestañas mantienen sus cambios locales mientras se permanece en la página. Recargar o navegar fuera los descarta. Los formularios no publican convocatorias, no firman contratos, no envían mensajes y no modifican la operación real.

Forecast muestra facturado, cobrado, saldo y deuda vencida. Su escenario probabilístico es una propuesta para validar, no una fórmula acordada ni datos económicos de Avans. La deuda vencida es parte del saldo; no se vuelve a sumar a ingresos. Se bloquean valores negativos, no numéricos, probabilidades fuera de rango y saldos inconsistentes.

## Validación antes de cerrar

- Revisar cinco áreas y selección de Operaciones al entrar a cuentas y benchmark.
- Revisar enlaces históricos de las cinco cuentas y capacidades internas.
- Probar pestañas, enlaces con hash, teclado, filtros, formulario vacío, alta/edición local y restablecimiento.
- Comprobar que ausencia hasta no anteceda a desde y que se pidan ambas fechas.
- Probar Forecast con valores válidos e inválidos; verificar saldo y escenario.
- Revisar desktop, móvil y tema oscuro; no confundir HTTP 200 con prueba de interacción.
- Revisar build/TypeScript y dependencias con evidencia actual, no repetir conteos históricos de vulnerabilidades.
- Mantener pendiente el login real, los permisos efectivos, la persistencia, los backups y las integraciones hasta su implementación y pruebas.

## Traspaso posterior (no ejecutado en esta entrega)

Primero aprobar el demo y fijar una versión de referencia en GitHub. Después identificar las cuentas, equipos y proyectos de destino de la agencia, y sus responsables.

Vercel: inventariar proyecto, rama, dominios, variables por ambiente (sólo nombres, no valores), integraciones y protección. Elegir transferencia o recreación tras verificar requisitos actuales. Validar un preview de destino antes de mover tráfico; conservar la versión anterior para recuperación.

Supabase: verificar primero si existe un proyecto efectivamente conectado a este demo y qué contiene. Un directorio de migraciones en GitHub no prueba una base activa. Si sólo hay esquema/semillas, preparar el entorno de la agencia; si existen datos/usuarios/archivos, planificar su transferencia, permisos y recuperación según el inventario. No afirmar una migración de datos sin comprobar el origen.

Claude: conectar el repositorio y la rama correcta, conservar arquitectura y flujos, y abrir ramas separadas para trabajo paralelo. El sistema de diseño de la agencia será la referencia visual cuando se comparta; no reconstruir el producto desde cero para cambiar el estilo.

No copiar secretos a documentos, chats, capturas, GitHub ni archivos de entrega. No desconectar el origen hasta validar el destino. Esta revisión no ejecuta ninguno de estos movimientos.

## Descripción breve para el proyecto de Claude

Continuar el desarrollo de Avans OS, la plataforma interna de Avans, sobre el demo existente en GitHub. Organizarla en cinco áreas: Operaciones —con Clientes, conocimiento y benchmark—, Ventas, Finanzas, RRHH y Gerencia. Incorporar Forecast, Burbujas, Contractors, Pull de talentos y Planificación sin descartar funciones útiles. Primero cerrar la revisión funcional; después trasladar la infraestructura a las cuentas de Vercel y Supabase de la agencia y adaptar la interfaz a su sistema de diseño en Claude Design. Mantener el requisito de acceso con Google `@avans.agency`, permisos por rol y una distinción clara entre simulación y funciones reales.
