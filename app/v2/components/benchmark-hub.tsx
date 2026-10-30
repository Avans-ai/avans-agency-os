import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CircleAlert,
  Eye,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  benchmarkData,
  benchmarkSignals,
  getClientBenchmark,
  type CompetitiveSignal,
} from "../benchmark-data";
import { clientDepthData } from "../client-depth-data";
import styles from "../benchmark.module.css";

const impactRank: Record<CompetitiveSignal["impact"], number> = {
  Alto: 0,
  Medio: 1,
  Bajo: 2,
};

function impactClass(impact: CompetitiveSignal["impact"]) {
  if (impact === "Alto") return styles.impactHigh;
  if (impact === "Medio") return styles.impactMedium;
  return styles.impactLow;
}

function formatDelta(delta: number) {
  return `${delta > 0 ? "+" : ""}${delta}`;
}

function deltaClass(delta: number) {
  if (delta >= 5) return styles.deltaPositive;
  if (delta <= -5) return styles.deltaNegative;
  return styles.deltaNeutral;
}

function deltaLabel(delta: number) {
  if (delta >= 5) return `Ventaja ${formatDelta(delta)}`;
  if (delta <= -5) return `Brecha ${formatDelta(delta)}`;
  return `Paridad ${formatDelta(delta)}`;
}

const monitoringSources = [
  {
    label: "Sitios y landings",
    detail:
      "Cambios de propuesta, estructura, CTA, pricing visible y recorridos de conversión.",
  },
  {
    label: "Publicidad y creatividades",
    detail:
      "Mensajes, formatos, intensidad, ofertas y territorios utilizados por la categoría.",
  },
  {
    label: "Contenido y canales",
    detail:
      "Redes, newsletters, artículos, casos, webinars y frecuencia de publicación.",
  },
  {
    label: "Producto y experiencia",
    detail:
      "Nuevas funcionalidades, onboarding, centros de ayuda, integraciones y autogestión.",
  },
  {
    label: "Reputación y mercado",
    detail:
      "Reseñas, alianzas, contrataciones, lanzamientos y señales de expansión.",
  },
];

const activationAreas = [
  {
    area: "Clientes",
    title: "Actualizar contexto",
    detail:
      "Una señal validada puede incorporarse a la memoria competitiva de la cuenta con fuente, fecha y alcance.",
  },
  {
    area: "Ventas",
    title: "Crear argumento u oportunidad",
    detail:
      "La evidencia puede alimentar una propuesta, un upsell o un nuevo diagnóstico comercial.",
  },
  {
    area: "Operaciones",
    title: "Convertir en acción",
    detail:
      "Una decisión aprobada se transforma en tarea, responsable, fecha y resultado esperado.",
  },
  {
    area: "Gerencia",
    title: "Elevar cambios materiales",
    detail:
      "Sólo los movimientos con impacto real llegan a la lectura ejecutiva y a la priorización.",
  },
];

function PortfolioBenchmark() {
  const monitoredCompetitors = benchmarkData.reduce(
    (sum, item) => sum + item.monitoredCompetitors,
    0,
  );
  const newSignals = benchmarkSignals.filter(
    (signal) => signal.status === "Nuevo",
  ).length;
  const highImpact = benchmarkSignals.filter(
    (signal) => signal.impact === "Alto",
  ).length;
  const totalOpportunities = benchmarkData.reduce(
    (sum, item) => sum + item.opportunities.length,
    0,
  );
  const orderedSignals = [...benchmarkSignals]
    .sort((a, b) => impactRank[a.impact] - impactRank[b.impact])
    .slice(0, 8);
  const materialSignal = orderedSignals[0];

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            BENCHMARK · INTELIGENCIA COMPETITIVA
          </span>
          <h1>Entender la categoría antes de decidir.</h1>
          <p>
            Avans OS concentra competidores, referentes, señales de mercado,
            brechas y oportunidades por cliente. El objetivo no es copiar
            movimientos externos, sino dar contexto a estrategia, ventas,
            contenido y gerencia.
          </p>
        </div>
        <div className={styles.heroAside}>
          <span>UBICACIÓN EN LA ARQUITECTURA</span>
          <strong>
            Vive dentro de Clientes y alimenta a Ventas y Gerencia.
          </strong>
          <small>
            Los datos de esta vista son simulados. En producción cada señal
            conservará fuente, fecha, evidencia y validación humana.
          </small>
        </div>
      </section>

      <div className={styles.contextBar} aria-label="Contexto del monitoreo">
        <div>
          <span>COBERTURA</span>
          <strong>{benchmarkData.length} cuentas activas</strong>
        </div>
        <div>
          <span>VENTANA</span>
          <strong>Lectura continua + corte semanal</strong>
        </div>
        <div>
          <span>FUENTES</span>
          <strong>Públicas y autorizadas</strong>
        </div>
        <div>
          <span>VALIDACIÓN</span>
          <strong>Humana antes de activar</strong>
        </div>
      </div>

      <section
        className={styles.metrics}
        aria-label="Indicadores del benchmark competitivo"
      >
        <article>
          <span>Cuentas monitoreadas</span>
          <strong>{benchmarkData.length}</strong>
          <small>Portfolio demo Avans</small>
        </article>
        <article>
          <span>Perfiles competitivos</span>
          <strong>{monitoredCompetitors}</strong>
          <small>Directos, referentes y emergentes</small>
        </article>
        <article>
          <span>Señales nuevas</span>
          <strong>{newSignals}</strong>
          <small>Pendientes de análisis</small>
        </article>
        <article>
          <span>Oportunidades</span>
          <strong>{totalOpportunities}</strong>
          <small>{highImpact} señales de impacto alto</small>
        </article>
      </section>

      <section className={styles.executiveSection}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>LECTURA EJECUTIVA</span>
            <h2>Qué merece atención ahora</h2>
          </div>
          <p>
            La vista prioriza señales materiales y evita que el monitoreo se
            convierta en una acumulación de novedades sin consecuencia.
          </p>
        </div>
        <div className={styles.portfolioBrief}>
          <article className={styles.executivePrimary}>
            <span>SEÑAL MATERIAL</span>
            <strong>{materialSignal?.title ?? "Sin señales materiales"}</strong>
            <small>
              {materialSignal
                ? `${materialSignal.competitor} · ${materialSignal.detectedAt}`
                : "No hay novedades prioritarias"}
            </small>
          </article>
          <article className={styles.executiveCard}>
            <span>IMPACTO ALTO</span>
            <strong>{highImpact}</strong>
            <small>Requieren criterio y priorización</small>
          </article>
          <article className={styles.executiveCard}>
            <span>NUEVAS</span>
            <strong>{newSignals}</strong>
            <small>Pendientes de validación</small>
          </article>
          <article className={styles.executiveCard}>
            <span>OPORTUNIDADES</span>
            <strong>{totalOpportunities}</strong>
            <small>Detectadas o en análisis</small>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>PORTFOLIO COMPETITIVO</span>
            <h2>Una lectura de mercado por cliente</h2>
          </div>
          <p>
            Cada cuenta conserva su propio universo competitivo, dimensiones
            comparables, señales y oportunidades. No existe un benchmark
            genérico para todos.
          </p>
        </div>
        <div className={styles.portfolioGrid}>
          {benchmarkData.map((benchmark) => {
            const client = clientDepthData.find(
              (item) => item.slug === benchmark.clientSlug,
            );
            if (!client) return null;

            const topOpportunity = benchmark.opportunities[0];
            const averageClient = Math.round(
              benchmark.dimensions.reduce(
                (sum, item) => sum + item.clientScore,
                0,
              ) / benchmark.dimensions.length,
            );
            const averageMarket = Math.round(
              benchmark.dimensions.reduce(
                (sum, item) => sum + item.benchmarkScore,
                0,
              ) / benchmark.dimensions.length,
            );
            const positionDelta = averageClient - averageMarket;

            return (
              <Link
                key={benchmark.clientSlug}
                href={`/v2/clientes/${benchmark.clientSlug}/benchmark`}
                className={styles.clientCard}
              >
                <div>
                  <div className={styles.clientCardTop}>
                    <span className={styles.eyebrow}>
                      {client.name.toUpperCase()}
                    </span>
                    <span className={deltaClass(positionDelta)}>
                      {deltaLabel(positionDelta)}
                    </span>
                  </div>
                  <h3>{client.name}</h3>
                  <p>{benchmark.summary}</p>
                  <div className={styles.clientMeta}>
                    <span>{benchmark.monitoredCompetitors} perfiles</span>
                    <span>{benchmark.signals.length} señales</span>
                    <span>{benchmark.lastScan}</span>
                  </div>
                  <div className={styles.clientOpportunity}>
                    <span>OPORTUNIDAD DESTACADA</span>
                    <strong>{topOpportunity.title}</strong>
                  </div>
                </div>
                <span className={styles.clientArrow}>
                  <ArrowRight size={18} aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className={styles.section} id="senales">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>MONITOREO</span>
            <h2>Señales que pueden cambiar una decisión</h2>
          </div>
          <p>
            El sistema separa observación, interpretación y recomendación.
            Detectar un movimiento competitivo no implica ejecutar una
            respuesta automática.
          </p>
        </div>
        <div className={styles.layout}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>FEED COMPETITIVO</span>
                <h2>Novedades priorizadas</h2>
              </div>
              <CircleAlert size={22} aria-hidden="true" />
            </div>
            <div className={styles.signalList}>
              {orderedSignals.map((signal) => {
                const client = clientDepthData.find(
                  (item) => item.slug === signal.clientSlug,
                );
                return (
                  <Link
                    key={signal.id}
                    href={`/v2/clientes/${signal.clientSlug}/benchmark`}
                    className={styles.signalRow}
                  >
                    <span className={impactClass(signal.impact)}>
                      {signal.impact}
                    </span>
                    <div className={styles.signalWho}>
                      <span>{client?.name ?? signal.clientSlug}</span>
                      <strong>{signal.competitor}</strong>
                    </div>
                    <div className={styles.signalBody}>
                      <span>{signal.category}</span>
                      <strong>{signal.title}</strong>
                      <p>{signal.detail}</p>
                    </div>
                    <div className={styles.signalState}>
                      <span>{signal.status}</span>
                      <strong>{signal.detectedAt}</strong>
                      <small>{signal.source}</small>
                    </div>
                  </Link>
                );
              })}
            </div>
          </article>

          <aside className={styles.sidePanel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>FUENTES PREVISTAS</span>
                <h2>Qué puede observar el sistema</h2>
              </div>
              <Eye size={22} aria-hidden="true" />
            </div>
            <div className={styles.sourceList}>
              {monitoringSources.map((source) => (
                <div key={source.label} className={styles.sourceRow}>
                  <span>MONITOREO</span>
                  <strong>{source.label}</strong>
                  <small>{source.detail}</small>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>FLUJO DE INTELIGENCIA</span>
            <h2>De una señal externa a una decisión trazable</h2>
          </div>
          <p>
            El valor no está en acumular capturas: está en convertirlas en
            comparaciones, hipótesis y acciones relacionadas con un objetivo
            real.
          </p>
        </div>
        <div className={styles.flowGrid}>
          <article>
            <span>01</span>
            <h3>Observar</h3>
            <p>Fuentes públicas, sistemas autorizados y señales configuradas.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Capturar</h3>
            <p>Fecha, evidencia, fuente, competidor y categoría de cambio.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Normalizar</h3>
            <p>Evitar duplicados y comparar movimientos equivalentes.</p>
          </article>
          <article>
            <span>04</span>
            <h3>Comparar</h3>
            <p>Relacionar la señal con dimensiones y objetivos del cliente.</p>
          </article>
          <article>
            <span>05</span>
            <h3>Interpretar</h3>
            <p>Detectar riesgo, brecha, oportunidad o cambio de contexto.</p>
          </article>
          <article>
            <span>06</span>
            <h3>Validar</h3>
            <p>Una persona decide si se incorpora a estrategia, memoria o acción.</p>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.darkPanel}>
          <span className={styles.eyebrowLight}>CONEXIÓN TRANSVERSAL</span>
          <h2>El benchmark no es una biblioteca aislada.</h2>
          <p>
            Sus señales actualizan el contexto de la cuenta, ayudan a priorizar
            oportunidades comerciales y ofrecen a Gerencia una lectura del
            mercado con fuente y evidencia.
          </p>
          <div className={styles.darkList}>
            <div>
              <span>Clientes</span>
              <strong>Contexto, competidores y memoria por cuenta</strong>
            </div>
            <div>
              <span>Ventas</span>
              <strong>Señales, argumentos y oportunidades de crecimiento</strong>
            </div>
            <div>
              <span>Gerencia</span>
              <strong>Riesgos, tendencias y decisiones prioritarias</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ClientBenchmark({ clientSlug }: { clientSlug: string }) {
  const benchmark = getClientBenchmark(clientSlug);
  const client = clientDepthData.find((item) => item.slug === clientSlug);
  if (!benchmark || !client) return null;

  const dimensions = benchmark.dimensions.map((dimension) => ({
    ...dimension,
    delta: dimension.clientScore - dimension.benchmarkScore,
  }));
  const averageClient = Math.round(
    dimensions.reduce((sum, item) => sum + item.clientScore, 0) /
      dimensions.length,
  );
  const averageMarket = Math.round(
    dimensions.reduce((sum, item) => sum + item.benchmarkScore, 0) /
      dimensions.length,
  );
  const positionDelta = averageClient - averageMarket;
  const strongestDimension = dimensions.reduce((best, item) =>
    item.delta > best.delta ? item : best,
  );
  const weakestDimension = dimensions.reduce((worst, item) =>
    item.delta < worst.delta ? item : worst,
  );
  const highImpact = benchmark.signals.filter(
    (signal) => signal.impact === "Alto",
  ).length;
  const materialSignal = [...benchmark.signals].sort(
    (a, b) => impactRank[a.impact] - impactRank[b.impact],
  )[0];
  const topOpportunity = benchmark.opportunities[0];

  return (
    <div className={styles.page}>
      <Link href={`/v2/clientes/${client.slug}`} className={styles.backLink}>
        <ArrowLeft size={14} aria-hidden="true" /> Volver a Cliente 360°
      </Link>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            BENCHMARK Y COMPETENCIA · {client.name.toUpperCase()}
          </span>
          <h1>{client.name} frente a su categoría.</h1>
          <p>{benchmark.summary}</p>
        </div>
        <div className={styles.heroAside}>
          <span>ÚLTIMO ESCANEO</span>
          <strong>{benchmark.lastScan}</strong>
          <small>
            {benchmark.monitoredCompetitors} perfiles monitoreados · información
            simulada para validar la arquitectura.
          </small>
        </div>
      </section>

      <nav
        className={styles.subnav}
        aria-label={`Secciones del benchmark de ${client.name}`}
      >
        <a href="#resumen">Resumen ejecutivo</a>
        <a href="#matriz">Matriz</a>
        <a href="#competidores">Competidores</a>
        <a href="#senales">Señales</a>
        <a href="#oportunidades">Oportunidades</a>
      </nav>

      <div className={styles.contextBar} aria-label="Contexto del benchmark">
        <div>
          <span>UNIVERSO</span>
          <strong>{benchmark.monitoredCompetitors} perfiles</strong>
        </div>
        <div>
          <span>VENTANA</span>
          <strong>Últimos 7 días</strong>
        </div>
        <div>
          <span>FUENTES</span>
          <strong>Públicas y autorizadas</strong>
        </div>
        <div>
          <span>ESTADO</span>
          <strong>Demo · evidencia simulada</strong>
        </div>
      </div>

      <section
        className={styles.metrics}
        aria-label={`Indicadores competitivos de ${client.name}`}
      >
        <article>
          <span>Índice de la cuenta</span>
          <strong>{averageClient}</strong>
          <small>Promedio de dimensiones demo</small>
        </article>
        <article>
          <span>Benchmark de categoría</span>
          <strong>{averageMarket}</strong>
          <small>Referencia comparable</small>
        </article>
        <article>
          <span>Señales abiertas</span>
          <strong>{benchmark.signals.length}</strong>
          <small>{highImpact} de impacto alto</small>
        </article>
        <article>
          <span>Oportunidades</span>
          <strong>{benchmark.opportunities.length}</strong>
          <small>Detectadas o en análisis</small>
        </article>
      </section>

      <section className={styles.executiveSection} id="resumen">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>RESUMEN EJECUTIVO</span>
            <h2>La lectura competitiva en cinco decisiones</h2>
          </div>
          <p>
            Primero se muestra qué cambia la decisión. La evidencia detallada
            queda disponible debajo para revisión y trazabilidad.
          </p>
        </div>

        <div className={styles.executiveGrid}>
          <article className={styles.executivePrimary}>
            <span>POSICIÓN RELATIVA</span>
            <strong>{formatDelta(positionDelta)}</strong>
            <small>
              {positionDelta >= 5
                ? "Por encima de la referencia"
                : positionDelta <= -5
                  ? "Brecha material frente a la categoría"
                  : "Posición cercana a la referencia"}
            </small>
          </article>
          <article className={styles.executiveCard}>
            <span>PRINCIPAL VENTAJA</span>
            <strong>{strongestDimension.label}</strong>
            <small>
              {formatDelta(strongestDimension.delta)} puntos vs. benchmark
            </small>
          </article>
          <article className={styles.executiveCard}>
            <span>PRINCIPAL BRECHA</span>
            <strong>{weakestDimension.label}</strong>
            <small>{formatDelta(weakestDimension.delta)} puntos vs. benchmark</small>
          </article>
          <article className={styles.executiveCard}>
            <span>OPORTUNIDAD INMEDIATA</span>
            <strong>{topOpportunity.title}</strong>
            <small>{topOpportunity.owner}</small>
          </article>
          <article className={styles.executiveCard}>
            <span>RIESGO A MONITOREAR</span>
            <strong>{materialSignal.title}</strong>
            <small>
              {materialSignal.competitor} · impacto {materialSignal.impact.toLowerCase()}
            </small>
          </article>
        </div>
      </section>

      <section className={styles.section} id="matriz">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>MATRIZ COMPARATIVA</span>
            <h2>En qué dimensiones existe ventaja o brecha</h2>
          </div>
          <p>
            Los puntajes no son una verdad absoluta: sintetizan evidencias
            configuradas y deben conservar la fuente que los explica.
          </p>
        </div>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>DIMENSIONES</span>
              <h2>Cuenta vs. referencia</h2>
            </div>
            <BarChart3 size={22} aria-hidden="true" />
          </div>

          <div className={styles.dimensionLegend}>
            <div>
              <i className={styles.legendClient} />
              <span>{client.name}</span>
            </div>
            <div>
              <i className={styles.legendBenchmark} />
              <span>Benchmark de categoría</span>
            </div>
            <small>
              Coral indica la cuenta. El benchmark permanece neutro para no
              competir con la lectura.
            </small>
          </div>

          <div className={styles.dimensionList}>
            {dimensions.map((dimension) => (
              <div key={dimension.label} className={styles.dimensionRow}>
                <div className={styles.dimensionTitle}>
                  <span>DIMENSIÓN</span>
                  <strong>{dimension.label}</strong>
                  <em className={deltaClass(dimension.delta)}>
                    {deltaLabel(dimension.delta)}
                  </em>
                </div>
                <div className={styles.dimensionCompare}>
                  <div
                    className={`${styles.scoreBox} ${styles.scoreBoxClient}`}
                  >
                    <div className={styles.scoreMeta}>
                      <span>{client.name}</span>
                      <strong>{dimension.clientScore}</strong>
                    </div>
                    <div className={styles.scoreTrack}>
                      <i style={{ width: `${dimension.clientScore}%` }} />
                    </div>
                  </div>
                  <div
                    className={`${styles.scoreBox} ${styles.scoreBoxBenchmark}`}
                  >
                    <div className={styles.scoreMeta}>
                      <span>Benchmark</span>
                      <strong>{dimension.benchmarkScore}</strong>
                    </div>
                    <div className={styles.scoreTrack}>
                      <i style={{ width: `${dimension.benchmarkScore}%` }} />
                    </div>
                  </div>
                  <p className={styles.dimensionNote}>{dimension.note}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className={styles.section} id="competidores">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>MAPA COMPETITIVO</span>
            <h2>Perfiles que vale la pena observar</h2>
          </div>
          <p>
            Se distinguen competidores directos, referentes y emergentes porque
            no todos deben analizarse con el mismo criterio.
          </p>
        </div>
        <div className={styles.competitorGrid}>
          {benchmark.competitors.map((competitor) => (
            <article key={competitor.name} className={styles.competitorCard}>
              <div className={styles.competitorHead}>
                <span>{competitor.type}</span>
                <em>Actividad {competitor.activity.toLowerCase()}</em>
              </div>
              <h3>{competitor.name}</h3>
              <p>{competitor.positioning}</p>
              <div className={styles.competitorFacts}>
                <div>
                  <span>FORTALEZA</span>
                  <strong>{competitor.strength}</strong>
                </div>
                <div>
                  <span>QUÉ MONITOREAR</span>
                  <strong>{competitor.watch}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} id="senales">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>SEÑALES RECIENTES</span>
            <h2>Cambios con posible impacto</h2>
          </div>
          <p>
            Cada señal conserva hecho observado, fuente, fecha e impacto. La
            interpretación se revisa antes de incorporarla a estrategia.
          </p>
        </div>

        <div className={styles.layout}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>FEED DE LA CUENTA</span>
                <h2>Evidencia priorizada</h2>
              </div>
              <CircleAlert size={22} aria-hidden="true" />
            </div>
            <div className={styles.signalList}>
              {benchmark.signals.map((signal) => (
                <div key={signal.id} className={styles.signalRow}>
                  <span className={impactClass(signal.impact)}>
                    {signal.impact}
                  </span>
                  <div className={styles.signalWho}>
                    <span>{signal.category}</span>
                    <strong>{signal.competitor}</strong>
                  </div>
                  <div className={styles.signalBody}>
                    <span>{signal.status}</span>
                    <strong>{signal.title}</strong>
                    <p>{signal.detail}</p>
                  </div>
                  <div className={styles.signalState}>
                    <span>{signal.detectedAt}</span>
                    <strong>{signal.source}</strong>
                    <small>Evidencia demo</small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <aside className={styles.sidePanel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>GOBERNANZA</span>
                <h2>Cómo se usa una señal</h2>
              </div>
              <ShieldCheck size={22} aria-hidden="true" />
            </div>
            <div className={styles.sourceList}>
              <div className={styles.sourceRow}>
                <span>01 · EVIDENCIA</span>
                <strong>Conservar fuente y fecha</strong>
                <small>
                  Una captura o dato sin procedencia no se transforma en
                  conocimiento activo.
                </small>
              </div>
              <div className={styles.sourceRow}>
                <span>02 · CONTEXTO</span>
                <strong>Relacionar con un objetivo</strong>
                <small>
                  El movimiento externo sólo importa si modifica una decisión
                  de la cuenta.
                </small>
              </div>
              <div className={styles.sourceRow}>
                <span>03 · VALIDACIÓN</span>
                <strong>Separar hecho de interpretación</strong>
                <small>
                  La IA puede sugerir hipótesis, pero una persona valida su uso.
                </small>
              </div>
              <div className={styles.sourceRow}>
                <span>04 · ACTIVACIÓN</span>
                <strong>Crear una acción trazable</strong>
                <small>
                  La oportunidad se asigna, se mide y vuelve como aprendizaje.
                </small>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.section} id="oportunidades">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>OPORTUNIDADES</span>
            <h2>Qué conviene evaluar a partir del benchmark</h2>
          </div>
          <p>
            Una oportunidad todavía no es una tarea automática. Primero se
            revisan fundamento, responsable, prioridad y resultado esperado.
          </p>
        </div>
        <div className={styles.opportunityGrid}>
          {benchmark.opportunities.map((opportunity, index) => (
            <article key={opportunity.title} className={styles.opportunityCard}>
              <div className={styles.opportunityTop}>
                <span>{opportunity.state}</span>
                <em>{String(index + 1).padStart(2, "0")}</em>
              </div>
              <h3>{opportunity.title}</h3>
              <p>{opportunity.rationale}</p>
              <div className={styles.opportunityMeta}>
                <span>{opportunity.owner}</span>
                <span>
                  Revisar → priorizar → activar
                  <Sparkles size={14} aria-hidden="true" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>ACTIVACIÓN TRANSVERSAL</span>
            <h2>Cómo una lectura competitiva entra al sistema</h2>
          </div>
          <p>
            El benchmark genera contexto y recomendaciones. La acción concreta
            se ejecuta en el área correspondiente y conserva trazabilidad.
          </p>
        </div>
        <div className={styles.activationGrid}>
          {activationAreas.map((item, index) => (
            <article key={item.area} className={styles.activationCard}>
              <span>{String(index + 1).padStart(2, "0")} · {item.area}</span>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.darkPanel}>
          <span className={styles.eyebrowLight}>REGLA DE USO</span>
          <h2>Monitorear no significa reaccionar a todo.</h2>
          <p>
            El sistema ayuda a reconocer cambios materiales, compararlos con
            objetivos propios y decidir cuándo ignorar, aprender, experimentar
            o actuar.
          </p>
          <div className={styles.darkList}>
            <div>
              <span>Ignorar</span>
              <strong>Movimiento sin impacto real</strong>
            </div>
            <div>
              <span>Aprender</span>
              <strong>Señal útil para memoria o estrategia</strong>
            </div>
            <div>
              <span>Actuar</span>
              <strong>Oportunidad validada con responsable y métrica</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function BenchmarkHub({ clientSlug }: { clientSlug?: string }) {
  return clientSlug ? (
    <ClientBenchmark clientSlug={clientSlug} />
  ) : (
    <PortfolioBenchmark />
  );
}
