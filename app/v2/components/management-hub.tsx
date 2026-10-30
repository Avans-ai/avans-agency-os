import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CircleAlert,
  CircleCheck,
  Database,
  Gauge,
  Layers3,
  ShieldCheck,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { benchmarkData, benchmarkSignals, type CompetitiveSignal } from "../benchmark-data";
import { clientDepthData } from "../client-depth-data";
import { operationsCapacity, operationsExceptions } from "../operations-depth-data";
import { salesOpportunities, salesStages } from "../sales-data";
import styles from "../management-hub.module.css";

type ExecutiveTone = "critical" | "warning" | "healthy" | "neutral";

const impactRank: Record<CompetitiveSignal["impact"], number> = {
  Alto: 0,
  Medio: 1,
  Bajo: 2,
};

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function toneClass(tone: ExecutiveTone) {
  if (tone === "critical") return styles.toneCritical;
  if (tone === "warning") return styles.toneWarning;
  if (tone === "healthy") return styles.toneHealthy;
  return styles.toneNeutral;
}

function clientHealthClass(status: "Saludable" | "Atención") {
  return status === "Saludable" ? styles.healthHealthy : styles.healthAttention;
}

function readinessClass(status: "Disponible" | "Parcial" | "Pendiente") {
  if (status === "Disponible") return styles.readinessAvailable;
  if (status === "Parcial") return styles.readinessPartial;
  return styles.readinessPending;
}

function impactClass(impact: CompetitiveSignal["impact"]) {
  if (impact === "Alto") return styles.impactHigh;
  if (impact === "Medio") return styles.impactMedium;
  return styles.impactLow;
}

function getBenchmarkDelta(clientSlug: string) {
  const benchmark = benchmarkData.find((item) => item.clientSlug === clientSlug);
  if (!benchmark) return null;

  const account = average(benchmark.dimensions.map((item) => item.clientScore));
  const category = average(benchmark.dimensions.map((item) => item.benchmarkScore));
  return account - category;
}

function deltaClass(delta: number | null) {
  if (delta === null || Math.abs(delta) <= 3) return styles.deltaNeutral;
  if (delta > 0) return styles.deltaPositive;
  return styles.deltaNegative;
}

function deltaLabel(delta: number | null) {
  if (delta === null) return "Sin lectura";
  const sign = delta > 0 ? "+" : "";
  if (Math.abs(delta) <= 3) return `Paridad ${sign}${delta}`;
  return delta > 0 ? `Ventaja ${sign}${delta}` : `Brecha ${delta}`;
}

export function ManagementHub() {
  const portfolioHealth = average(clientDepthData.map((client) => client.healthScore));
  const portfolioContext = average(clientDepthData.map((client) => client.context));
  const attentionClients = clientDepthData.filter((client) => client.status === "Atención");
  const totalOpenActions = clientDepthData.reduce((sum, client) => sum + client.openActions, 0);
  const totalWorkstreams = clientDepthData.reduce((sum, client) => sum + client.activeWorkstreams, 0);

  const openPipeline = salesStages
    .filter((stage) => stage.key !== "ganado")
    .reduce((sum, stage) => sum + stage.count, 0);
  const highPotentialOpportunities = salesOpportunities.filter((item) => item.potential === "Alto").length;
  const commercialAttention = salesOpportunities.filter((item) => item.status !== "En curso").length;

  const capacityAverage = average(operationsCapacity.map((item) => item.load));
  const highestCapacity = [...operationsCapacity].sort((a, b) => b.load - a.load)[0];
  const criticalOperationalExceptions = operationsExceptions.filter((item) => item.priority === "Alta").length;

  const highImpactSignals = benchmarkSignals.filter((signal) => signal.impact === "Alto");
  const newSignals = benchmarkSignals.filter((signal) => signal.status === "Nuevo");
  const totalCompetitiveOpportunities = benchmarkData.reduce(
    (sum, benchmark) => sum + benchmark.opportunities.length,
    0,
  );
  const orderedSignals = [...benchmarkSignals]
    .sort((a, b) => impactRank[a.impact] - impactRank[b.impact])
    .slice(0, 4);
  const marketOpportunities = benchmarkData
    .flatMap((benchmark) => {
      const client = clientDepthData.find((item) => item.slug === benchmark.clientSlug);
      return benchmark.opportunities.map((opportunity) => ({
        ...opportunity,
        client: client?.name ?? benchmark.clientSlug,
        clientSlug: benchmark.clientSlug,
      }));
    })
    .slice(0, 4);

  const decisionQueue = [
    {
      priority: "Alta",
      tone: "critical" as const,
      area: "Operaciones",
      account: "ACA",
      title: "Resolver la precondición que bloquea el siguiente paso",
      reason: "El proceso no debería continuar con información incompleta ni trasladar el riesgo a producción.",
      owner: "Cuentas",
      due: "Hoy",
      href: "/v2/clientes/aca",
    },
    {
      priority: "Alta",
      tone: "critical" as const,
      area: "Campañas",
      account: "Epsa",
      title: "Validar la optimización antes de modificar inversión",
      reason: "La señal superó el umbral de autonomía y necesita criterio humano antes de ejecutar.",
      owner: "Performance",
      due: "Hoy",
      href: "/v2/clientes/epsa/campanas",
    },
    {
      priority: "Alta",
      tone: "warning" as const,
      area: "Ventas",
      account: "Grupo Portland",
      title: "Aprobar alcance e inversión de la siguiente etapa",
      reason: "La propuesta está lista; demorar la decisión posterga el handoff y la planificación operativa.",
      owner: "Dirección",
      due: "Hoy",
      href: "/v2/propuestas",
    },
    {
      priority: "Media",
      tone: "warning" as const,
      area: "Benchmark",
      account: "Epsa",
      title: "Evaluar el impacto de una nueva integración competitiva",
      reason: "El cambio puede alterar argumentos comerciales, onboarding y expectativas de la categoría.",
      owner: "Estrategia",
      due: "Esta semana",
      href: "/v2/clientes/epsa/benchmark",
    },
    {
      priority: "Media",
      tone: "neutral" as const,
      area: "Conocimiento",
      account: "Edinovo",
      title: "Aceptar o descartar dos aprendizajes antes del próximo ciclo",
      reason: "Los patrones todavía no deben modificar el contexto activo hasta ser validados.",
      owner: "Estrategia",
      due: "Esta semana",
      href: "/v2/aprendizajes",
    },
  ];

  const executiveRadar = [
    {
      label: "Clientes",
      value: `${attentionClients.length} en atención`,
      detail: attentionClients.map((client) => client.name).join(" · "),
      tone: "warning" as const,
      href: "/v2/clientes",
    },
    {
      label: "Operaciones",
      value: `${criticalOperationalExceptions} bloqueos altos`,
      detail: `${totalOpenActions} acciones abiertas en ${totalWorkstreams} frentes`,
      tone: "critical" as const,
      href: "/v2/operaciones",
    },
    {
      label: "Ventas",
      value: `${commercialAttention} decisiones`,
      detail: `${highPotentialOpportunities} oportunidades de potencial alto`,
      tone: "warning" as const,
      href: "/v2/ventas",
    },
    {
      label: "Capacidad",
      value: `${highestCapacity.area} ${highestCapacity.load}%`,
      detail: `Promedio operativo ${capacityAverage}%`,
      tone: highestCapacity.load >= 85 ? ("warning" as const) : ("healthy" as const),
      href: "/v2/rrhh",
    },
    {
      label: "Mercado",
      value: `${highImpactSignals.length} señales altas`,
      detail: `${newSignals.length} nuevas · ${totalCompetitiveOpportunities} oportunidades`,
      tone: "warning" as const,
      href: "/v2/benchmark",
    },
    {
      label: "Finanzas",
      value: "Sin conexión",
      detail: "No calcular margen ni rentabilidad hasta integrar una fuente válida",
      tone: "neutral" as const,
      href: "/v2/finanzas",
    },
  ];

  const areaReadiness = [
    {
      area: "Clientes",
      status: "Disponible" as const,
      signal: `${clientDepthData.length} cuentas · salud ${portfolioHealth}/100 · contexto ${portfolioContext}%`,
      source: "Cliente 360°",
      href: "/v2/clientes",
    },
    {
      area: "Operaciones",
      status: "Disponible" as const,
      signal: `${totalWorkstreams} frentes · ${totalOpenActions} acciones · ${criticalOperationalExceptions} bloqueos altos`,
      source: "Procesos, proyectos y bandeja",
      href: "/v2/operaciones",
    },
    {
      area: "Ventas",
      status: "Disponible" as const,
      signal: `${openPipeline} oportunidades abiertas · ${highPotentialOpportunities} de potencial alto`,
      source: "Pipeline comercial",
      href: "/v2/ventas",
    },
    {
      area: "Benchmark",
      status: "Disponible" as const,
      signal: `${benchmarkData.length} cuentas · ${benchmarkSignals.length} señales · ${highImpactSignals.length} altas`,
      source: "Inteligencia competitiva",
      href: "/v2/benchmark",
    },
    {
      area: "RRHH",
      status: "Parcial" as const,
      signal: `Capacidad por área disponible; personas, ausencias y horas todavía sin fuente real`,
      source: "Asignaciones operativas",
      href: "/v2/rrhh",
    },
    {
      area: "Finanzas",
      status: "Pendiente" as const,
      signal: "Facturación, cobranzas, costos y margen no disponibles en el demo",
      source: "Sistema administrativo a integrar",
      href: "/v2/finanzas",
    },
  ];

  const executiveMetrics = [
    {
      label: "Salud del portfolio",
      value: `${portfolioHealth}`,
      suffix: "/100",
      detail: `${attentionClients.length} de ${clientDepthData.length} cuentas requieren atención`,
      icon: Gauge,
      href: "/v2/clientes",
      state: portfolioHealth >= 85 ? "Estable" : "Revisar",
      tone: portfolioHealth >= 85 ? ("healthy" as const) : ("warning" as const),
    },
    {
      label: "Decisiones abiertas",
      value: `${decisionQueue.length}`,
      suffix: "priorizadas",
      detail: `${decisionQueue.filter((item) => item.priority === "Alta").length} de prioridad alta`,
      icon: CircleAlert,
      href: "#decisiones",
      state: "Intervención",
      tone: "critical" as const,
    },
    {
      label: "Pipeline comercial",
      value: `${openPipeline}`,
      suffix: "abiertas",
      detail: `${highPotentialOpportunities} de potencial alto`,
      icon: BriefcaseBusiness,
      href: "/v2/ventas",
      state: "Activo",
      tone: "healthy" as const,
    },
    {
      label: "Capacidad operativa",
      value: `${capacityAverage}%`,
      suffix: "promedio",
      detail: `${highestCapacity.area} concentra la mayor carga`,
      icon: UsersRound,
      href: "/v2/rrhh",
      state: highestCapacity.load >= 85 ? "Vigilar" : "Disponible",
      tone: highestCapacity.load >= 85 ? ("warning" as const) : ("healthy" as const),
    },
    {
      label: "Señales de mercado",
      value: `${highImpactSignals.length}`,
      suffix: "impacto alto",
      detail: `${newSignals.length} nuevas pendientes de validación`,
      icon: TrendingUp,
      href: "/v2/benchmark",
      state: "Monitoreo",
      tone: "warning" as const,
    },
    {
      label: "Rentabilidad",
      value: "—",
      suffix: "sin dato",
      detail: "La fuente financiera todavía no está conectada",
      icon: Database,
      href: "/v2/finanzas",
      state: "Pendiente",
      tone: "neutral" as const,
    },
  ];

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrowLight}>ÁREA 06 · VISIÓN TRANSVERSAL</span>
          <h1>Gerencia ve decisiones, no una suma de dashboards.</h1>
          <p>
            Clientes, operación, ventas, capacidad, mercado y —cuando exista una fuente válida— finanzas consolidados en una lectura ejecutiva con origen, contexto y responsable.
          </p>
        </div>
        <div className={styles.heroAside}>
          <span>LECTURA ACTUAL · DEMO</span>
          <strong>{decisionQueue.length} decisiones priorizadas</strong>
          <div className={styles.heroFacts}>
            <div><em>{attentionClients.length}</em><small>Cuentas en atención</small></div>
            <div><em>{criticalOperationalExceptions}</em><small>Bloqueos altos</small></div>
            <div><em>1</em><small>Fuente crítica pendiente</small></div>
          </div>
          <p>Los datos de esta vista son simulados para validar arquitectura. Finanzas permanece explícitamente sin calcular.</p>
        </div>
      </section>

      <div className={styles.scopeBar} aria-label="Alcance de Gerencia">
        <div><span>COMMAND CENTER</span><strong>Coordina la operación diaria</strong></div>
        <div><span>GERENCIA</span><strong>Prioriza riesgos, oportunidades y decisiones</strong></div>
        <div><span>VISIBILIDAD</span><strong>Restringida por rol y sensibilidad</strong></div>
        <div><span>CRITERIO</span><strong>Ningún KPI sin fuente y actualización</strong></div>
      </div>

      <section className={styles.kpiGrid} aria-label="Indicadores ejecutivos">
        {executiveMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Link key={metric.label} href={metric.href} className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span>{metric.label}</span>
                <Icon size={18} aria-hidden="true" />
              </div>
              <div className={styles.kpiValue}><strong>{metric.value}</strong><small>{metric.suffix}</small></div>
              <p>{metric.detail}</p>
              <div className={styles.kpiFooter}>
                <span className={toneClass(metric.tone)}>{metric.state}</span>
                <ArrowRight size={14} aria-hidden="true" />
              </div>
            </Link>
          );
        })}
      </section>

      <section className={styles.section} id="decisiones">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>COLA EJECUTIVA</span>
            <h2>Qué necesita una decisión, no sólo seguimiento</h2>
          </div>
          <p>Gerencia recibe excepciones y oportunidades ya contextualizadas. El trabajo rutinario permanece en cada área.</p>
        </div>

        <div className={styles.decisionLayout}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>DECISIONES PRIORIZADAS</span>
                <h2>Impacto, fundamento y responsable</h2>
              </div>
              <CircleAlert size={22} aria-hidden="true" />
            </div>
            <div className={styles.decisionList}>
              {decisionQueue.map((decision, index) => (
                <Link key={`${decision.account}-${decision.title}`} href={decision.href} className={styles.decisionRow}>
                  <span className={styles.decisionNumber}>{String(index + 1).padStart(2, "0")}</span>
                  <div className={styles.decisionMain}>
                    <div className={styles.decisionMeta}>
                      <span className={toneClass(decision.tone)}>{decision.priority}</span>
                      <span>{decision.area}</span>
                      <span>{decision.account}</span>
                    </div>
                    <h3>{decision.title}</h3>
                    <p>{decision.reason}</p>
                  </div>
                  <div className={styles.decisionOwner}>
                    <span>RESPONSABLE</span>
                    <strong>{decision.owner}</strong>
                    <small>{decision.due}</small>
                    <ArrowRight size={15} aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          </article>

          <aside className={styles.radarPanel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>RADAR EJECUTIVO</span>
                <h2>Estado por dimensión</h2>
              </div>
              <Activity size={22} aria-hidden="true" />
            </div>
            <div className={styles.radarList}>
              {executiveRadar.map((item) => (
                <Link key={item.label} href={item.href} className={styles.radarRow}>
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>{item.detail}</small>
                  </div>
                  <i className={toneClass(item.tone)}></i>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>PORTFOLIO DE CLIENTES</span>
            <h2>Salud, contexto, carga y posición competitiva</h2>
          </div>
          <p>La lectura ejecutiva une el estado de la relación con la realidad operativa y el contexto externo de cada cuenta.</p>
        </div>

        <article className={styles.panel}>
          <div className={styles.portfolioHead} aria-hidden="true">
            <span>Cliente</span>
            <span>Salud</span>
            <span>Contexto</span>
            <span>Frentes</span>
            <span>Acciones</span>
            <span>Benchmark</span>
            <span>Próximo hito</span>
          </div>
          <div className={styles.portfolioList}>
            {clientDepthData.map((client) => {
              const delta = getBenchmarkDelta(client.slug);
              return (
                <Link key={client.slug} href={`/v2/clientes/${client.slug}`} className={styles.portfolioRow}>
                  <div className={styles.portfolioClient}>
                    <strong>{client.name}</strong>
                    <small>{client.accountOwner}</small>
                  </div>
                  <div><span className={clientHealthClass(client.status)}>{client.status}</span><small>{client.healthScore}/100</small></div>
                  <div><strong>{client.context}%</strong><small>Contexto útil</small></div>
                  <div><strong>{client.activeWorkstreams}</strong><small>Activos</small></div>
                  <div><strong>{client.openActions}</strong><small>{client.attention}</small></div>
                  <div><span className={deltaClass(delta)}>{deltaLabel(delta)}</span><small>Categoría</small></div>
                  <div className={styles.portfolioMilestone}><strong>{client.nextMilestone}</strong><small>{client.nextMilestoneDate}</small></div>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </article>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>COBERTURA DE DATOS</span>
            <h2>Qué puede decidir Gerencia y qué todavía no</h2>
          </div>
          <p>La ausencia de una fuente se muestra como tal. El sistema no completa indicadores sensibles con supuestos.</p>
        </div>
        <div className={styles.readinessGrid}>
          {areaReadiness.map((item) => (
            <Link key={item.area} href={item.href} className={styles.readinessCard}>
              <div className={styles.readinessHead}>
                <strong>{item.area}</strong>
                <span className={readinessClass(item.status)}>{item.status}</span>
              </div>
              <p>{item.signal}</p>
              <div className={styles.readinessSource}>
                <Database size={14} aria-hidden="true" />
                <span>{item.source}</span>
                <ArrowRight size={14} aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>CAPACIDAD Y CRECIMIENTO</span>
            <h2>Qué puede absorber la agencia y qué está entrando</h2>
          </div>
          <p>Pipeline y capacidad deben leerse juntos para no vender trabajo sin disponibilidad ni subutilizar equipos.</p>
        </div>

        <div className={styles.twoColumn}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div><span className={styles.eyebrow}>CAPACIDAD POR ÁREA</span><h2>Carga operativa</h2></div>
              <UsersRound size={22} aria-hidden="true" />
            </div>
            <div className={styles.capacityList}>
              {operationsCapacity.map((item) => (
                <div key={item.area} className={styles.capacityRow}>
                  <div className={styles.capacityMeta}><strong>{item.area}</strong><span>{item.load}%</span></div>
                  <div className={styles.capacityTrack}><i style={{ width: `${item.load}%` }} /></div>
                  <small>{item.detail}</small>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div><span className={styles.eyebrow}>PIPELINE</span><h2>Volumen por etapa</h2></div>
              <BriefcaseBusiness size={22} aria-hidden="true" />
            </div>
            <div className={styles.pipelineList}>
              {salesStages.map((stage) => (
                <Link key={stage.key} href="/v2/ventas" className={styles.pipelineRow}>
                  <div><strong>{stage.label}</strong><small>{stage.description}</small></div>
                  <span>{stage.count}</span>
                  <div className={styles.pipelineTrack}><i style={{ width: `${Math.max(14, (stage.count / 5) * 100)}%` }} /></div>
                </Link>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>MERCADO Y COMPETENCIA</span>
            <h2>Qué cambió afuera y qué podría activar adentro</h2>
          </div>
          <p>Gerencia recibe sólo señales materiales. La evidencia completa permanece en Benchmark y Cliente 360°.</p>
        </div>

        <div className={styles.marketLayout}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div><span className={styles.eyebrow}>SEÑALES PRIORIZADAS</span><h2>Cambios con posible impacto</h2></div>
              <TrendingUp size={22} aria-hidden="true" />
            </div>
            <div className={styles.marketSignalList}>
              {orderedSignals.map((signal) => {
                const client = clientDepthData.find((item) => item.slug === signal.clientSlug);
                return (
                  <Link key={signal.id} href={`/v2/clientes/${signal.clientSlug}/benchmark`} className={styles.marketSignalRow}>
                    <span className={impactClass(signal.impact)}>{signal.impact}</span>
                    <div><small>{client?.name ?? signal.clientSlug} · {signal.category}</small><strong>{signal.title}</strong><p>{signal.competitor} · {signal.detectedAt}</p></div>
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </article>

          <aside className={styles.opportunityPanel}>
            <div className={styles.panelHeader}>
              <div><span className={styles.eyebrow}>OPORTUNIDADES</span><h2>Hipótesis para revisar</h2></div>
              <BarChart3 size={22} aria-hidden="true" />
            </div>
            <div className={styles.marketOpportunityList}>
              {marketOpportunities.map((opportunity, index) => (
                <Link key={`${opportunity.clientSlug}-${opportunity.title}`} href={`/v2/clientes/${opportunity.clientSlug}/benchmark#oportunidades`} className={styles.marketOpportunityRow}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div><small>{opportunity.client} · {opportunity.state}</small><strong>{opportunity.title}</strong><p>{opportunity.owner}</p></div>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.cadencePanel}>
          <div className={styles.cadenceIntro}>
            <span className={styles.eyebrowLight}>RITMO DE GESTIÓN</span>
            <h2>La vista cambia según la decisión y el horizonte.</h2>
            <p>El mismo dato no merece la misma profundidad todos los días. Gerencia necesita cortes consistentes, responsables y memoria de lo decidido.</p>
          </div>
          <div className={styles.cadenceGrid}>
            <div><span>DIARIO</span><strong>Excepciones y decisiones</strong><small>Bloqueos, aprobaciones, riesgo inmediato y responsables.</small></div>
            <div><span>SEMANAL</span><strong>Portfolio y capacidad</strong><small>Salud de cuentas, pipeline, carga, hitos y señales competitivas.</small></div>
            <div><span>MENSUAL</span><strong>Resultado y aprendizaje</strong><small>Rentabilidad, evolución, desvíos, oportunidades y cambios de criterio.</small></div>
          </div>
          <div className={styles.governanceLine}>
            <ShieldCheck size={17} aria-hidden="true" />
            <span>Acceso por rol · fuentes visibles · decisiones auditadas · información sensible restringida</span>
            <CircleCheck size={17} aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.darkPanel}>
          <span className={styles.eyebrowLight}>PRINCIPIO DE GERENCIA</span>
          <h2>Priorizar antes que acumular indicadores.</h2>
          <p>Gerencia no reemplaza a cada área ni opera el trabajo cotidiano. Consolida señales confiables, identifica dónde intervenir y registra qué se decidió, por qué y con qué resultado esperado.</p>
          <div className={styles.darkList}>
            <div><span>Leer</span><strong>Estado, tendencia y evidencia</strong></div>
            <div><span>Decidir</span><strong>Prioridad, responsable y plazo</strong></div>
            <div><span>Aprender</span><strong>Resultado y criterio actualizado</strong></div>
          </div>
        </div>
      </section>
    </div>
  );
}
