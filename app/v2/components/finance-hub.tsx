import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CircleAlert,
  CircleCheck,
  Database,
  Layers3,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import {
  financeAccessModel,
  financeClientRows,
  financeCostStructure,
  financePeriod,
  financeReceivables,
  financeSources,
  financeTechnologyCosts,
  type FinanceCollectionStatus,
  type FinanceDataStatus,
  type FinanceMarginState,
} from "../finance-data";
import styles from "../finance-hub.module.css";

function formatMoney(value: number) {
  if (value >= 1_000_000) {
    return `ARS ${(value / 1_000_000).toFixed(1).replace(".", ",")} M`;
  }
  if (value >= 1_000) {
    return `ARS ${Math.round(value / 1_000)} k`;
  }
  return `ARS ${value}`;
}

function sourceStatusClass(status: FinanceDataStatus) {
  if (status === "Disponible") return styles.statusAvailable;
  if (status === "Parcial") return styles.statusPartial;
  return styles.statusPending;
}

function collectionStatusClass(status: FinanceCollectionStatus) {
  if (status === "Vencida") return styles.collectionOverdue;
  if (status === "En revisión") return styles.collectionReview;
  return styles.collectionUpcoming;
}

function marginStateClass(state: FinanceMarginState) {
  if (state === "Sano") return styles.marginHealthy;
  if (state === "Vigilar") return styles.marginWatch;
  return styles.marginReview;
}

function marginForClient(row: (typeof financeClientRows)[number]) {
  if (!row.billed) return 0;
  return Math.round(((row.billed - row.deliveryCost - row.technologyCost) / row.billed) * 100);
}

export function FinanceHub() {
  const totalBilled = financeClientRows.reduce((sum, item) => sum + item.billed, 0);
  const totalCollected = financeClientRows.reduce((sum, item) => sum + item.collected, 0);
  const totalOpenBalance = financeClientRows.reduce((sum, item) => sum + item.openBalance, 0);
  const totalDeliveryCost = financeClientRows.reduce((sum, item) => sum + item.deliveryCost, 0);
  const totalTechnologyCost = financeClientRows.reduce((sum, item) => sum + item.technologyCost, 0);
  const totalAssignedCost = totalDeliveryCost + totalTechnologyCost;
  const contributionMargin = totalBilled
    ? Math.round(((totalBilled - totalAssignedCost) / totalBilled) * 100)
    : 0;
  const collectionRate = totalBilled ? Math.round((totalCollected / totalBilled) * 100) : 0;
  const overdueBalance = financeReceivables
    .filter((item) => item.status === "Vencida")
    .reduce((sum, item) => sum + item.amount, 0);
  const upcomingBalance = financeReceivables
    .filter((item) => item.status === "Por vencer")
    .reduce((sum, item) => sum + item.amount, 0);
  const reviewBalance = financeReceivables
    .filter((item) => item.status === "En revisión")
    .reduce((sum, item) => sum + item.amount, 0);
  const connectedSources = financeSources.filter((source) => source.status === "Disponible").length;
  const partialSources = financeSources.filter((source) => source.status === "Parcial").length;
  const pendingSources = financeSources.filter((source) => source.status === "Pendiente").length;

  const summaryMetrics = [
    {
      label: "Facturación emitida",
      value: formatMoney(totalBilled),
      detail: `${financePeriod.label} · demo sintético`,
      icon: BarChart3,
      href: "#rentabilidad",
      state: "Período cerrado",
      tone: "neutral" as const,
    },
    {
      label: "Cobrado",
      value: formatMoney(totalCollected),
      detail: `${collectionRate}% sobre facturación emitida`,
      icon: CircleCheck,
      href: "#cobranzas",
      state: "Conciliación demo",
      tone: "healthy" as const,
    },
    {
      label: "Por cobrar",
      value: formatMoney(totalOpenBalance),
      detail: `${formatMoney(overdueBalance)} vencidos`,
      icon: CircleAlert,
      href: "#cobranzas",
      state: overdueBalance > 0 ? "Requiere seguimiento" : "En término",
      tone: overdueBalance > 0 ? ("warning" as const) : ("healthy" as const),
    },
    {
      label: "Costos imputados",
      value: formatMoney(totalAssignedCost),
      detail: "Equipo, proveedores, tecnología y directos",
      icon: Layers3,
      href: "#costos",
      state: "Fuente parcial",
      tone: "warning" as const,
    },
    {
      label: "Margen de contribución",
      value: `${contributionMargin}%`,
      detail: "Antes de costos generales e impuestos",
      icon: TrendingUp,
      href: "#rentabilidad",
      state: "Demo sintético",
      tone: contributionMargin >= 45 ? ("healthy" as const) : ("warning" as const),
    },
    {
      label: "Costos tecnológicos",
      value: formatMoney(totalTechnologyCost),
      detail: "Infraestructura, IA, mensajería e integraciones",
      icon: Database,
      href: "#costos",
      state: "10% del costo imputado",
      tone: "neutral" as const,
    },
  ];

  const collectionAging = [
    {
      label: "En término / por vencer",
      amount: upcomingBalance,
      detail: "Cobros esperados dentro del plazo acordado",
      tone: "healthy" as const,
    },
    {
      label: "Vencido 1–15 días",
      amount: overdueBalance,
      detail: "Seguimiento con Administración y Cuentas",
      tone: "warning" as const,
    },
    {
      label: "En revisión",
      amount: reviewBalance,
      detail: "Monto o condición pendiente de conciliación",
      tone: "neutral" as const,
    },
    {
      label: "Vencido +30 días",
      amount: 0,
      detail: "Sin casos en la demostración actual",
      tone: "healthy" as const,
    },
  ];

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrowLight}>ÁREA 04 · CONTROL ECONÓMICO</span>
          <h1>Finanzas conecta dinero, operación y capacidad.</h1>
          <p>
            La plataforma no busca reemplazar la contabilidad del cliente ni inventar una segunda fuente de verdad. Organiza facturación, cobranzas, costos, rentabilidad y consumos alrededor de clientes, proyectos y decisiones.
          </p>
        </div>
        <div className={styles.heroAside}>
          <span>PERÍODO DE DEMOSTRACIÓN</span>
          <strong>{financePeriod.label}</strong>
          <div className={styles.heroFacts}>
            <div><em>{connectedSources}</em><small>Fuentes disponibles</small></div>
            <div><em>{partialSources}</em><small>Fuentes parciales</small></div>
            <div><em>{pendingSources}</em><small>Integraciones pendientes</small></div>
          </div>
          <p>{financePeriod.mode}. Los montos no representan datos reales de Avans.</p>
        </div>
      </section>

      <div className={styles.scopeBar} aria-label="Alcance del módulo Finanzas">
        <div><span>FUENTE DE VERDAD</span><strong>Sistema administrativo o contable existente</strong></div>
        <div><span>CAPA AVANS OS</span><strong>Gestión, relación y lectura transversal</strong></div>
        <div><span>VISIBILIDAD</span><strong>Montos y margen restringidos por rol</strong></div>
        <div><span>MONEDA</span><strong>Conservar origen y normalizar para reportar</strong></div>
      </div>

      <section className={styles.metricsGrid} aria-label="Indicadores financieros de demostración">
        {summaryMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Link key={metric.label} href={metric.href} className={styles.metricCard}>
              <div className={styles.metricTop}>
                <span>{metric.label}</span>
                <Icon size={18} aria-hidden="true" />
              </div>
              <strong>{metric.value}</strong>
              <p>{metric.detail}</p>
              <div className={styles.metricFooter}>
                <span className={styles[`tone${metric.tone[0].toUpperCase()}${metric.tone.slice(1)}`]}>{metric.state}</span>
                <ArrowRight size={14} aria-hidden="true" />
              </div>
            </Link>
          );
        })}
      </section>

      <section className={styles.block}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>COBERTURA DE DATOS</span>
            <h2>Qué información existe y qué todavía debe integrarse</h2>
          </div>
          <p>El módulo muestra el estado de cada fuente antes de calcular indicadores. Una ausencia de datos no se completa con una estimación silenciosa.</p>
        </div>
        <div className={styles.sourceGrid}>
          {financeSources.map((source) => (
            <Link key={source.name} href={source.href} className={styles.sourceCard}>
              <div className={styles.sourceHead}>
                <strong>{source.name}</strong>
                <span className={sourceStatusClass(source.status)}>{source.status}</span>
              </div>
              <p>{source.role}</p>
              <div className={styles.sourceMeta}>
                <div><span>MÉTODO</span><strong>{source.method}</strong></div>
                <div><span>ACTUALIZACIÓN</span><strong>{source.update}</strong></div>
              </div>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.block} id="cobranzas">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>FACTURACIÓN Y COBRANZAS</span>
            <h2>Del comprobante emitido al dinero conciliado</h2>
          </div>
          <p>Emitir una factura, cobrarla y conciliarla son eventos distintos. Avans OS debe conservar estado, fecha, responsable y fuente de cada uno.</p>
        </div>
        <div className={styles.collectionLayout}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>CUENTAS POR COBRAR</span>
                <h2>Seguimientos abiertos</h2>
              </div>
              <CircleAlert size={22} aria-hidden="true" />
            </div>
            <div className={styles.receivableList}>
              {financeReceivables.map((item) => (
                <Link key={item.id} href={`/v2/clientes/${item.clientSlug}`} className={styles.receivableRow}>
                  <span className={collectionStatusClass(item.status)}>{item.status}</span>
                  <div className={styles.receivableMain}>
                    <small>{item.client}</small>
                    <strong>{item.concept}</strong>
                    <p>{item.owner} · {item.due}</p>
                  </div>
                  <div className={styles.receivableAmount}>
                    <strong>{formatMoney(item.amount)}</strong>
                    <small>{item.days}</small>
                    <ArrowRight size={14} aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          </article>

          <aside className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>AGING</span>
                <h2>Antigüedad de saldos</h2>
              </div>
              <Activity size={22} aria-hidden="true" />
            </div>
            <div className={styles.agingList}>
              {collectionAging.map((item) => {
                const share = totalOpenBalance ? Math.round((item.amount / totalOpenBalance) * 100) : 0;
                return (
                  <div key={item.label} className={styles.agingRow}>
                    <div className={styles.agingMeta}>
                      <div><strong>{item.label}</strong><small>{item.detail}</small></div>
                      <div><strong>{formatMoney(item.amount)}</strong><small>{share}% del saldo</small></div>
                    </div>
                    <div className={styles.agingTrack}>
                      <i className={styles[`track${item.tone[0].toUpperCase()}${item.tone.slice(1)}`]} style={{ width: `${share}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className={styles.policyNote}>
              <ShieldCheck size={17} aria-hidden="true" />
              <span>Recordatorios automáticos pueden prepararse; cambios de condición, notas de crédito o compromisos sensibles requieren validación humana.</span>
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.block} id="rentabilidad">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>RENTABILIDAD POR CLIENTE</span>
            <h2>Ingresos y costos conectados al trabajo real</h2>
          </div>
          <p>El margen sólo es útil si los costos de equipo, proveedores y tecnología se imputan con un criterio consistente y auditable.</p>
        </div>
        <article className={styles.panel}>
          <div className={styles.profitHead} aria-hidden="true">
            <span>Cliente</span>
            <span>Facturado</span>
            <span>Cobrado</span>
            <span>Costo de entrega</span>
            <span>Tecnología</span>
            <span>Margen</span>
            <span>Saldo</span>
            <span>Próxima acción</span>
          </div>
          <div className={styles.profitList}>
            {financeClientRows.map((row) => {
              const margin = marginForClient(row);
              return (
                <Link key={row.clientSlug} href={`/v2/clientes/${row.clientSlug}`} className={styles.profitRow}>
                  <div className={styles.profitClient}>
                    <strong>{row.client}</strong>
                    <span className={marginStateClass(row.state)}>{row.state}</span>
                  </div>
                  <div><strong>{formatMoney(row.billed)}</strong><small>Período demo</small></div>
                  <div><strong>{formatMoney(row.collected)}</strong><small>{Math.round((row.collected / row.billed) * 100)}% cobrado</small></div>
                  <div><strong>{formatMoney(row.deliveryCost)}</strong><small>Equipo + proveedores</small></div>
                  <div><strong>{formatMoney(row.technologyCost)}</strong><small>Consumos imputados</small></div>
                  <div><strong>{margin}%</strong><small>Contribución</small></div>
                  <div><strong>{formatMoney(row.openBalance)}</strong><small>{row.openBalance ? "Abierto" : "Sin saldo"}</small></div>
                  <div className={styles.profitAction}><strong>{row.nextAction}</strong><ArrowRight size={14} aria-hidden="true" /></div>
                </Link>
              );
            })}
          </div>
        </article>
      </section>

      <section className={styles.block} id="costos">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>ESTRUCTURA DE COSTOS</span>
            <h2>Qué cuesta entregar y qué parte puede asignarse</h2>
          </div>
          <p>El sistema debe distinguir costos directos, compartidos, variables y reembolsables para evitar márgenes falsos o comparaciones injustas.</p>
        </div>
        <div className={styles.costLayout}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>COSTO IMPUTADO</span>
                <h2>Composición del período</h2>
              </div>
              <Layers3 size={22} aria-hidden="true" />
            </div>
            <div className={styles.costList}>
              {financeCostStructure.map((item) => (
                <div key={item.label} className={styles.costRow}>
                  <div className={styles.costMeta}>
                    <div><strong>{item.label}</strong><small>{item.source}</small></div>
                    <div><strong>{formatMoney(item.amount)}</strong><small>{item.share}%</small></div>
                  </div>
                  <div className={styles.costTrack}><i style={{ width: `${item.share}%` }} /></div>
                  <p>{item.detail}</p>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>TECNOLOGÍA</span>
                <h2>Costos fijos y variables</h2>
              </div>
              <Database size={22} aria-hidden="true" />
            </div>
            <div className={styles.technologyList}>
              {financeTechnologyCosts.map((item) => (
                <div key={item.label} className={styles.technologyRow}>
                  <div className={styles.technologyTop}>
                    <div><span>{item.behavior}</span><strong>{item.label}</strong></div>
                    <strong>{formatMoney(item.amount)}</strong>
                  </div>
                  <p>{item.detail}</p>
                  <small>{item.allocation}</small>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className={styles.block}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>MODELO DE INTEGRACIÓN</span>
            <h2>Integrar antes que reemplazar el sistema administrativo</h2>
          </div>
          <p>La arquitectura se adapta a la disponibilidad técnica del cliente o de Avans y conserva el origen de cada dato.</p>
        </div>
        <div className={styles.integrationFlow}>
          <article><span>01</span><h3>Capturar</h3><p>API, webhook, exportación, archivo o carga controlada según el sistema existente.</p></article>
          <article><span>02</span><h3>Normalizar</h3><p>Clientes, períodos, monedas, conceptos, estados y centros de costo bajo un modelo común.</p></article>
          <article><span>03</span><h3>Conciliar</h3><p>Relacionar factura, cobro, proyecto, costo, consumo y responsable sin duplicar información.</p></article>
          <article><span>04</span><h3>Analizar</h3><p>Margen, desvío, aging, forecast y costo tecnológico con fuente y fecha de actualización.</p></article>
          <article><span>05</span><h3>Decidir</h3><p>Crear alertas, seguimientos y revisiones; no modificar comprobantes sensibles sin autorización.</p></article>
        </div>
        <div className={styles.integrationRule}>
          <Database size={18} aria-hidden="true" />
          <strong>Orden de preferencia:</strong>
          <span>API / webhook → exportación estructurada → SFTP/Drive → importación controlada → carga manual auditada.</span>
        </div>
      </section>

      <section className={styles.block}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>USUARIOS Y CONTROL</span>
            <h2>Cada rol ve sólo lo que necesita para decidir</h2>
          </div>
          <p>Finanzas concentra información sensible. Los permisos deben separar visibilidad, edición, conciliación, aprobación y administración.</p>
        </div>
        <div className={styles.accessGrid}>
          {financeAccessModel.map((item, index) => (
            <article key={item.role} className={styles.accessCard}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{item.role}</h3>
              <p>{item.access}</p>
              <small>{item.restriction}</small>
            </article>
          ))}
        </div>
        <div className={styles.controlStrip}>
          <div><ShieldCheck size={17} /><span>Permisos por rol y cliente</span></div>
          <div><Database size={17} /><span>Fuente y actualización visibles</span></div>
          <div><Activity size={17} /><span>Conciliaciones y ajustes auditados</span></div>
          <div><BriefcaseBusiness size={17} /><span>Margen conectado a operación y capacidad</span></div>
        </div>
      </section>

      <section className={styles.block}>
        <div className={styles.darkPanel}>
          <span className={styles.eyebrowLight}>PRINCIPIO DE FINANZAS</span>
          <h2>No alcanza con saber cuánto se factura.</h2>
          <p>Avans necesita entender cuánto se cobró, cuánto cuesta entregar, qué cliente o proyecto consume capacidad, qué tecnología se imputa y qué dato todavía no es confiable.</p>
          <div className={styles.darkList}>
            <div><span>Registrar</span><strong>Origen, monto, moneda y período</strong></div>
            <div><span>Relacionar</span><strong>Cliente, proyecto, personas y tecnología</strong></div>
            <div><span>Decidir</span><strong>Cobranza, alcance, capacidad y rentabilidad</strong></div>
          </div>
        </div>
      </section>
    </div>
  );
}
