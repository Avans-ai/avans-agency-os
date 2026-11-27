# Inicio del cliente e indicadores · Generador de reportes

## 1. Una sola definición de métricas (`app/v2/os/metrics/**`)

Funciones puras, sin React ni almacenamiento. El **Inicio del cliente** y el **generador de
Reportes** llaman a la misma función:

```ts
serviceSnapshot(serviceId, input: MetricsInput, { period, asOf, compare? }): ServiceSnapshot
```

| Archivo | Contenido |
| --- | --- |
| `types.ts` | `Metric`, `ItemRef`, `ChartSpec`, `Comparison`, `ServiceSnapshot`, procedencia `DataOrigin` |
| `period.ts` | Mes, semana (lunes a domingo), período personalizado, período anterior de igual extensión; fechas `AAAA-MM-DD` en hora de Buenos Aires |
| `service-health.ts` | Semáforo por servicio (reglas abajo) |
| `input.ts` | `MetricsInput` (tareas del cliente + colecciones de cada módulo + cupo audiovisual) y `projectInput` (lo que se guarda con el reporte) |
| `tasks.ts` | Señales de tareas: bloqueos; vencidas y aprobaciones solo de tareas sueltas (las tareas espejo de un flujo no se cuentan dos veces) |
| `design.ts`, `content.ts`, `paid.ts`, `audiovisual.ts`, `other.ts` | Un cálculo por servicio |
| `index.ts` | `serviceSnapshot`, `serviceSnapshots`, `METRICS_VERSION` |
| `use-metrics-input.ts` | Hook de solo lectura que arma `MetricsInput` con los mismos hooks de los módulos |

Los cálculos reutilizan las funciones de los módulos: `designStage` (tablero de Diseño),
`contentState`, `CONTENT_FLOW`, `clientRequests` (Contenidos), `weeklyKpis`, `monthlyBudget`,
`totalsOf`, `campaignWeeks`, `stageDue`, `adState` (Publicidad digital), `quotaUsage`,
`jornadaState` y `jornadaStageDue` (Audiovisuales; este último se agregó de forma aditiva).
Los reportes de resultados embebidos en los módulos (`PaidReportView`, `ContentReportView`) usan
las mismas definiciones (`paidTotals`, `weeksInPeriod`, `contentState`).

### Indicadores por servicio

| Servicio | Fuente | Indicadores | Gráfico | Resultados del período |
| --- | --- | --- | --- | --- |
| Diseño de marca | `diseno-marca:trabajos` (+ estado del contenido de origen) | En producción (producción + ajustes), en revisión (revisión interna + esperando aprobación), próximas entregas (14 días), demorados (fecha objetivo vencida sin aprobar ni entregar) | Solicitudes por estado | Entregas comprometidas y entregadas |
| Contenidos | `contenidos:piezas`, `contenidos:planes` | Plan del mes (estado y avance), en revisión o aprobación (mismo contador «En revisión» del módulo), próximas publicaciones, material pedido al cliente | Contenidos por etapa (8 etapas) | Con fecha en el período, publicados, alcance y engagement (demo; redes no conectadas) |
| Publicidad digital | `campanas`, `anuncios`, `optimizaciones` | Campañas activas, inversión del mes y ritmo de gasto, KPIs semanales con semáforo (los del Inicio del módulo) | Leads por semana, pedidos por etapa | Inversión, leads, CPL, CTR y conversiones de las semanas cuyo lunes cae en el período |
| Audiovisuales | `audiovisuales:jornadas` + cupo | Cupo usado/contratado, disponibles, próximo rodaje, próxima edición | Jornadas por etapa | Jornadas con fecha y cerradas |
| Estrategia | prioridades, reuniones, decisiones, riesgos | Prioridades activas, riesgos abiertos, decisiones por confirmar, actas pendientes | — | Reuniones y decisiones |
| Desarrollo web | proyectos, sitemap, QA, publicaciones | Proyectos abiertos, páginas listas, QA aprobado, páginas esperando contenido del cliente | Páginas por estado | Publicaciones y casos de QA |
| CRM, IA, Soluciones gráficas, Mercado Libre | `trabajos` | Abiertos, vencidos, en aprobación | Trabajos por etapa | Trabajos con fecha en el período |

### Período y fecha de corte

- **Inicio:** período = mes en curso; estados operativos (pendientes, bloqueos, aprobaciones) a hoy;
  «próximas fechas» = 14 días. Los KPIs semanales y el presupuesto de Publicidad digital indican su
  propio período (el del módulo).
- **Reportes:** período elegido; estados a la fecha de generación.

### Procedencia de los datos

`real` (registrado en el módulo), `demo` (dato de demostración rotulado), `pendiente`
(«Pendiente de configurar») y `no-conectado` (requiere una integración no conectada). Un dato
faltante tiene `value: null` y se muestra como «Sin datos», «Pendiente de configurar» o
«No conectado»; nunca como cero ni como éxito.

## 2. Semáforo (`metrics/service-health.ts`)

| Nivel | Texto | Regla |
| --- | --- | --- |
| Rojo | En riesgo | Al menos un bloqueo activo, un trabajo vencido, un KPI más de 15 % fuera de objetivo, ritmo de gasto en rojo o el cupo de jornadas excedido |
| Amarillo | Requiere atención | Sin rojos, pero con aprobaciones pendientes, pedidos de material al cliente, elementos para revisar, un KPI hasta 15 % fuera de objetivo, ritmo de gasto en amarillo o el cupo sin configurar |
| Verde | En orden | Hay datos y no se cumple ninguna condición anterior |
| Gris | Sin datos | El módulo no tiene registros ni tareas |

El color siempre va con ícono y texto; el motivo muestra las dos causas de mayor peso.
Pruebas: `tests/metrics-health-model.spec.ts`.

## 3. Inicio del cliente

`ClientDailyHome` (`screens/client-workspace.tsx`) y `screens/client-home-blocks.tsx`: un bloque
horizontal por servicio activo, apilados a lo ancho de la columna principal; alertas a la derecha
desde 1280 px y debajo en pantallas menores. Cada bloque muestra estado y motivo, indicadores,
gráfico, pendientes, bloqueos y aprobaciones, próximas fechas, el período y enlaces al módulo y a
cada elemento (`ReturnLink`: el detalle recibe `?volver=` para regresar al Inicio). Se quitó
«Actividad relevante» (los historiales siguen en cada entidad y en Tareas).

## 4. Generador de reportes (Gestión y estrategia → Reportes)

- Pantalla principal: crear un reporte, continuar borradores y consultar los reportes generados
  con sus versiones (descargar, ver, nueva versión).
- Pasos: 1 Tipo (semanal operativo, mensual, específico de un servicio) · 2 Período · 3 Servicios ·
  4 Datos reunidos · 5 Indicadores · 6 Conclusiones (texto del equipo; «Redactar con IA» pendiente
  de conexión) · 7 Revisión por responsable (PM, LT, Content; `review-circuit.ts`) · 8 Vista
  previa · 9 Generar (todas las partes revisadas y rol PM o administrador).
- Generar arma la instantánea (`buildReportSnapshot`), dibuja el PDF en el navegador
  (`reports/pdf.ts`; pdf-lib 1.17.1 y @pdf-lib/fontkit 1.1.1, MIT; Figtree embebida desde
  `public/fonts/figtree`, licencia OFL), lo guarda en IndexedDB `avans-os-client-files-v1` (el mismo
  almacenamiento de los materiales de la Ficha), lo descarga y lo registra como fuente en
  `client:<slug>:knowledge:v1` (`reports/register.ts`: documento PDF con
  `metadata.report.storedFile/recoverable`, visible en «Archivos y documentos» y descargable desde
  Ficha → Materiales). Generar nunca envía el reporte; el borrador de mail se copia a mano.
- Integridad: cada versión guarda la instantánea y la entrada de métricas proyectada
  (`projectInput`) con su huella SHA-256. Una versión emitida no cambia; los cambios posteriores
  en los módulos se emiten como versión nueva. Si el PDF no está en el navegador, se vuelve a
  dibujar desde la instantánea guardada.
- Comparaciones solo con datos comparables en ambos períodos (en Publicidad digital, además, la
  misma cantidad de semanas con datos).
- Almacenamiento local: `client:<slug>:reports:v1` (reportes, borradores, versiones) y
  `client:<slug>:report-reviews` (revisión por versión). Sin sincronización multiusuario.

## 5. Pendiente

- «Archivos y documentos» lista la fuente del reporte pero todavía no descarga binarios locales;
  hoy se descarga desde Reportes o desde Ficha → Materiales.
- Persistencia multiusuario, integraciones de anuncios y redes, borradores con IA.
- El botón «Volver» de cada detalle depende de que esa vista monte `BackButton`; el enlace ya
  lleva `?volver=`.
