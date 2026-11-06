import Link from "next/link";
import { ArrowRight, BookOpenCheck, CircleAlert } from "lucide-react";
import { benchmarkData, benchmarkSignals } from "../benchmark-data";
import { clientDepthData } from "../client-depth-data";
import styles from "../depth.module.css";

const average = (values: number[]) => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

function statusClass(status: "Saludable" | "Atención") {
  return status === "Saludable" ? styles.statusHealthy : styles.statusAttention;
}

export function ClientHub() {
  const contextAverage = average(clientDepthData.map((client) => client.context));
  const activeWorkstreams = clientDepthData.reduce((sum, client) => sum + client.activeWorkstreams, 0);
  const openActions = clientDepthData.reduce((sum, client) => sum + client.openActions, 0);
  const newCompetitiveSignals = benchmarkSignals.filter((signal) => signal.status === "Nuevo").length;
  const highImpactSignals = benchmarkSignals.filter((signal) => signal.impact === "Alto").length;
  const monitoredCompetitors = benchmarkData.reduce((sum, item) => sum + item.monitoredCompetitors, 0);
  const coverage = [
    { label: "Negocio y objetivos", value: average(clientDepthData.map((client) => client.knowledge[0].completeness)) },
    { label: "Marca y comunicación", value: average(clientDepthData.map((client) => client.knowledge[1].completeness)) },
    { label: "Procesos de cuenta", value: average(clientDepthData.map((client) => client.knowledge[2].completeness)) },
    { label: "Resultados e histórico", value: average(clientDepthData.map((client) => client.knowledge[3].completeness)) },
  ];

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>ÁREA 01 · CLIENTE 360°</span>
          <h1>Todo lo que Avans sabe y hace para cada cliente.</h1>
          <p>
            Contexto, servicios, proyectos, decisiones, reuniones, documentos, mercado, competencia, resultados y próximos pasos concentrados en una ficha única. La misma fuente de información alimenta al equipo, los reportes y las automatizaciones.
          </p>
        </div>
        <div className={styles.heroAside}>
          <span>PRINCIPIO DE LA SECCIÓN</span>
          <strong>Una cuenta no es una carpeta ni un tablero: es contexto, operación, mercado e historial conectados.</strong>
          <small>Datos simulados para validar la arquitectura funcional del demo.</small>
        </div>
      </section>

      <section className={styles.metrics} aria-label="Indicadores del portfolio de clientes">
        <article className={styles.metric}>
          <span>Cuentas activas</span>
          <strong>{clientDepthData.length}</strong>
          <small>Portfolio demo Avans</small>
        </article>
        <article className={styles.metric}>
          <span>Contexto disponible</span>
          <strong>{contextAverage}%</strong>
          <small>Promedio del portfolio</small>
        </article>
        <article className={styles.metric}>
          <span>Frentes activos</span>
          <strong>{activeWorkstreams}</strong>
          <small>Operación vinculada a clientes</small>
        </article>
        <article className={styles.metric}>
          <span>Acciones abiertas</span>
          <strong>{openActions}</strong>
          <small>Priorizadas y con responsable</small>
        </article>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>PORTFOLIO OPERATIVO</span>
            <h2>Estado de cada cuenta</h2>
          </div>
          <p>La vista combina salud, conocimiento disponible, operación activa y próximo hito. Desde acá se ingresa a la ficha completa.</p>
        </div>

        <div className={styles.grid}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>CLIENTES</span>
                <h2>Portfolio Avans</h2>
              </div>
              <span>Datos simulados</span>
            </div>

            <div className={styles.clientList}>
              {clientDepthData.map((client) => (
                <Link key={client.slug} href={`/v2/clientes/${client.slug}`} className={styles.clientRow}>
                  <div className={styles.clientIdentity}>
                    <span className={statusClass(client.status)}>{client.status}</span>
                    <h3>{client.name}</h3>
                    <p>{client.relationship} · {client.accountOwner}</p>
                  </div>
                  <div className={styles.clientCell}>
                    <span>Conocimiento</span>
                    <strong>{client.context}% disponible</strong>
                    <div className={styles.contextTrack}><i style={{ width: `${client.context}%` }} /></div>
                  </div>
                  <div className={styles.clientCell}>
                    <span>Operación</span>
                    <strong>{client.activeWorkstreams} frentes activos</strong>
                    <small>{client.services.join(" · ")}</small>
                  </div>
                  <div className={styles.clientCell}>
                    <span>Próximo hito</span>
                    <strong>{client.nextMilestone}</strong>
                    <small>{client.nextMilestoneDate}</small>
                  </div>
                  <span className={styles.clientArrow}><ArrowRight size={17} aria-hidden="true" /></span>
                </Link>
              ))}
            </div>
          </article>

          <aside className={styles.sideStack}>
            <section className={styles.sidePanel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>COBERTURA DE CONOCIMIENTO</span>
                  <h2>Qué tan completa está la memoria</h2>
                </div>
                <BookOpenCheck size={21} aria-hidden="true" />
              </div>
              <div className={styles.coverageList}>
                {coverage.map((item) => (
                  <div key={item.label} className={styles.coverageRow}>
                    <div><span>{item.label}</span><strong>{item.value}%</strong></div>
                    <div className={styles.coverageTrack}><i style={{ width: `${item.value}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.sidePanel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>SEÑALES DEL PORTFOLIO</span>
                  <h2>Qué requiere atención</h2>
                </div>
                <CircleAlert size={21} aria-hidden="true" />
              </div>
              <div className={styles.sideStack}>
                <article className={styles.signalCard}>
                  <span>CUENTAS CON ATENCIÓN</span>
                  <strong>2</strong>
                  <small>ACA y Lider Energy concentran pendientes de contexto, aprobación y onboarding.</small>
                </article>
                <article className={styles.signalCard}>
                  <span>APROBACIONES</span>
                  <strong>3</strong>
                  <small>Propuesta, contenido y aprendizaje esperan decisión humana antes de avanzar.</small>
                </article>
                <article className={styles.signalCard}>
                  <span>SEÑALES COMPETITIVAS</span>
                  <strong>{newCompetitiveSignals}</strong>
                  <small>{highImpactSignals} de impacto alto sobre {monitoredCompetitors} perfiles monitoreados.</small>
                </article>
              </div>
            </section>
          </aside>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>ARQUITECTURA DE LA FICHA</span>
            <h2>Qué vive dentro de un cliente</h2>
          </div>
          <p>Los módulos dejan de ser silos y se relacionan con una cuenta concreta, sus objetivos, responsables y decisiones.</p>
        </div>
        <div className={styles.clientArchitecture}>
          <article><span>01</span><h3>Conocimiento</h3><p>Negocio, marca, públicos, procesos, fuentes, restricciones y aprendizajes validados.</p></article>
          <article><span>02</span><h3>Operación</h3><p>Servicios, proyectos, tareas, entregables, reuniones, bloqueos y responsables.</p></article>
          <article><span>03</span><h3>Comercial</h3><p>Alcance, propuestas, oportunidades, servicios contratados y revisiones de cuenta.</p></article>
          <article><span>04</span><h3>Finanzas</h3><p>Facturación, cobranzas, costos y rentabilidad visibles únicamente para los roles habilitados.</p></article>
          <article><span>05</span><h3>Historial</h3><p>Actividad, decisiones, archivos, versiones y origen de cada cambio registrado.</p></article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>MERCADO Y COMPETENCIA</span>
            <h2>El contexto externo también forma parte de Cliente 360°</h2>
          </div>
          <p>El benchmark se registra por cuenta y conserva perfiles, dimensiones, señales, oportunidades y fuentes antes de alimentar decisiones.</p>
        </div>
        <div className={styles.capabilityGrid}>
          <Link href="/v2/benchmark" className={styles.capabilityCard}>
            <span>Benchmark portfolio <ArrowRight size={17} /></span>
            <p>Comparar cuentas, perfiles monitoreados, señales nuevas y riesgos de mercado.</p>
          </Link>
          <Link href="/v2/benchmark#senales" className={styles.capabilityCard}>
            <span>Monitoreo competitivo <ArrowRight size={17} /></span>
            <p>Capturar cambios de oferta, comunicación, producto, experiencia y performance.</p>
          </Link>
          <Link href="/v2/clientes/epsa/benchmark#oportunidades" className={styles.capabilityCard}>
            <span>Oportunidades <ArrowRight size={17} /></span>
            <p>Convertir señales validadas en hipótesis, responsables, acciones y aprendizaje.</p>
          </Link>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.darkPanel}>
          <span className={styles.eyebrowLight}>NÚCLEO TRANSVERSAL</span>
          <h2>Clientes conecta todas las áreas del sistema.</h2>
          <p>Ventas crea la relación, Operaciones ejecuta, Finanzas mide el resultado económico, RRHH aporta capacidad y Gerencia recibe indicadores consolidados.</p>
          <div className={styles.darkList}>
            <div><span>Ventas</span><strong>Lead → Discovery → Propuesta → Alta</strong></div>
            <div><span>Operaciones</span><strong>Procesos → Proyectos → Entregables → Aprobaciones</strong></div>
            <div><span>Gerencia</span><strong>Salud → Riesgo → Benchmark → Oportunidades</strong></div>
          </div>
        </div>
      </section>
    </div>
  );
}
