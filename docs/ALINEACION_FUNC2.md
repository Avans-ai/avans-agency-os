# Alineación con «Avans OS – Funcionalidades 2»

Rama: `feat/alineacion-func2` (desde `feat/avans-os-ajustes-reunion-2026-11-03` en `16b2f1d`). En esta rama prevalece el documento (`docs/FUNCIONALIDADES_2.md`) cuando contradice indicaciones anteriores. Sin merge, sin producción, sin migraciones de Supabase. Persistencia local del navegador; roles visuales.

| Sección del documento | Implementación en la rama | Detalle |
| --- | --- | --- |
| Barra de secciones | Inicio · Tareas · Estrategia · módulos contratados | `screens/client-operation-nav.tsx` |
| Banner superior | Módulos contratados que abren su alcance; revisión periódica de demostración | `screens/client-banner.tsx` |
| Accesos flotantes | Ficha del cliente, Benchmark y Cargar documentos en todas las secciones del cliente | `screens/client-banner.tsx` |
| Estrategia | Ficha, Benchmark, Plan de Marketing, Reportes y Documentos; canales dentro de la Ficha | `screens/client-management-hub.tsx` |
| Tareas | Agrupadas por rol/persona por defecto, por módulo o lista; procedimientos periódicos de demostración | `screens/client-tasks-workspace.tsx`, `procedures-periodic.ts` |
| Contenidos · Plan de contenidos | Consulta del Plan de Marketing y do's & don'ts; control de glosario sin IA | `modules/content-guidelines.tsx`, `modules/content-guideline-check.ts` |
| Reportes | Revisión por responsable (LT, Content, PM), exportación y borrador de mail (sin envío) | `reports/review-circuit.ts`, `docs` del módulo |
| Documentos | Solo PM/administrador cargan; historial debajo de la carga | `knowledge/documents-view.tsx` |
| Publicidad digital | Plan de medios, inicio con semáforos, campañas en dos instancias, pedido de anuncio, flujo de seis pasos y plazos | `docs/PAID_MEDIA_FUNC2.md` |
| Audiovisuales | Jornada audiovisual: cupo, seis etapas, espacio del proveedor, cierre con Diseño y cliente | `docs/AUDIOVISUAL_FUNC2.md` |
| Personas y Cultura | Catálogo de proveedores audiovisuales | `/v2/proveedores` |

## Pendiente
- IA: escaneo de Benchmark, propuestas del Plan, borradores de reportes, wireframe/copy de contenidos, estrategia y anuncios, optimización (sin proveedor conectado; no se simula).
- Integraciones: Meta/Google/TikTok/ChatGPT Ads, Metricool, Google Drive, Tiendanube, Claude Design, envío de mails.
- Gerencia · Configuración de la IA (solo mencionado como pendiente).
- Backend: autenticación, permisos de servidor, persistencia multiusuario.
- Definiciones del equipo: plazos por etapa, días hábiles vs corridos, procedimientos del manual, nombre «RRHH» vs «Personas y Cultura».

## QA de la rama
`npx eslint` 0 errores · `npm run typecheck` · `npm run build` (291 páginas) · Playwright **238/238**.
