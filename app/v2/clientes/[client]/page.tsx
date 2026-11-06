import Link from "next/link";
import { ArrowLeft, ArrowRight, BarChart3, CheckCircle2, CircleAlert, FileText, Layers3 } from "lucide-react";
import { notFound } from "next/navigation";
import { getClientBenchmark } from "../../benchmark-data";
import { clientDepthData, getClientDepth } from "../../client-depth-data";
import { V2Chrome } from "../../components/v2-chrome";
import styles from "./client-profile.module.css";

export function generateStaticParams() {
  return clientDepthData.map((client) => ({ client: client.slug }));
}

function workstreamStatusClass(status: "En curso" | "Atención" | "Aprobación" | "Planificado") {
  if (status === "Atención") return styles.statusAttention;
  if (status === "Aprobación") return styles.statusApproval;
  if (status === "Planificado") return styles.statusPlanned;
  return styles.statusHealthy;
}

export default async function ClientProfilePage({ params }: { params: Promise<{ client: string }> }) {
  const { client: clientSlug } = await params;
  const client = getClientDepth(clientSlug);
  if (!client) notFound();
  const benchmark = getClientBenchmark(client.slug);

  return (
    <V2Chrome active="clientes" title={client.name}>
      <div className={styles.page}>
        <Link href="/v2/clientes" className={styles.backLink}>
          <ArrowLeft size={14} aria-hidden="true" /> Volver al portfolio
        </Link>

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>CLIENTE 360° · FUENTE ÚNICA DE CONTEXTO</span>
            <h1>{client.name}</h1>
            <p>{client.primaryObjective}</p>
            <div className={styles.heroMeta}>
              <span className={client.status === "Saludable" ? styles.healthHealthy : styles.healthAttention}>{client.status}</span>
              <span>{client.context}% contexto disponible</span>
              <span>{client.accountOwner}</span>
              <span>Datos simulados</span>
            </div>
          </div>

          <div className={styles.heroSide}>
            <span>PRÓXIMO HITO</span>
            <strong>{client.nextMilestone}</strong>
            <small>{client.nextMilestoneDate} · {client.openActions} acciones abiertas</small>
            <div className={styles.quickLinks}>
              <Link href={`/v2/clientes/${client.slug}/contenido`}>Contenido</Link>
              <Link href={`/v2/clientes/${client.slug}/campanas`}>Campañas</Link>
              <Link href={`/v2/clientes/${client.slug}/reportes`}>Reportes</Link>
              <Link href={`/v2/clientes/${client.slug}/benchmark`}>Benchmark</Link>
            </div>
          </div>
        </section>

        <nav className={styles.tabs} aria-label={`Secciones de ${client.name}`}>
          <a href="#resumen">Resumen</a>
          <a href="#conocimiento">Conocimiento</a>
          <a href="#operacion">Operación</a>
          <a href="#acciones">Acciones y decisiones</a>
          <a href="#benchmark">Benchmark y competencia</a>
          <a href="#documentos">Documentos</a>
          <a href="#comercial">Comercial y finanzas</a>
        </nav>

        <section className={styles.metrics} aria-label={`Indicadores de ${client.name}`}>
          <article><span>Salud de cuenta</span><strong>{client.healthScore}</strong><small>/100</small></article>
          <article><span>Contexto disponible</span><strong>{client.context}%</strong><small>Confirmado + importado + aprendido</small></article>
          <article><span>Frentes activos</span><strong>{client.activeWorkstreams}</strong><small>{client.services.join(" · ")}</small></article>
          <article><span>Acciones abiertas</span><strong>{client.openActions}</strong><small>{client.attention}</small></article>
        </section>

        <section className={styles.layout}>
          <div className={styles.mainColumn}>
            <article className={styles.panel} id="resumen">
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>RESUMEN EJECUTIVO</span>
                  <h2>La cuenta en una sola lectura</h2>
                </div>
                <Layers3 size={22} aria-hidden="true" />
              </div>
              <div className={styles.summaryGrid}>
                <div>
                  <span>Objetivo activo</span>
                  <strong>{client.primaryObjective}</strong>
                </div>
                <div>
                  <span>Responsable de cuenta</span>
                  <strong>{client.accountOwner}</strong>
                </div>
                <div>
                  <span>Servicios y capacidades</span>
                  <strong>{client.services.join(" · ")}</strong>
                </div>
                <div>
                  <span>Próximo hito</span>
                  <strong>{client.nextMilestone}</strong>
                  <small>{client.nextMilestoneDate}</small>
                </div>
              </div>
            </article>

            <article className={styles.panel} id="conocimiento">
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>CONOCIMIENTO Y MEMORIA</span>
                  <h2>Qué sabe Avans de {client.name}</h2>
                </div>
                <span className={styles.demoPill}>Origen visible</span>
              </div>
              <div className={styles.knowledgeList}>
                {client.knowledge.map((item) => (
                  <div key={item.label} className={styles.knowledgeRow}>
                    <div className={styles.knowledgeHead}>
                      <div>
                        <span>{item.provenance}</span>
                        <h3>{item.label}</h3>
                      </div>
                      <div className={styles.knowledgeScore}>
                        <strong>{item.completeness}%</strong>
                        <em className={item.status === "Listo" ? styles.ready : styles.review}>{item.status}</em>
                      </div>
                    </div>
                    <p>{item.detail}</p>
                    <div className={styles.progress}><i style={{ width: `${item.completeness}%` }} /></div>
                  </div>
                ))}
              </div>
            </article>

            <article className={styles.panel} id="operacion">
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>OPERACIÓN DE CUENTA</span>
                  <h2>Servicios, proyectos y próximos pasos</h2>
                </div>
                <span className={styles.demoPill}>{client.workstreams.length} frentes</span>
              </div>
              <div className={styles.workstreamList}>
                {client.workstreams.map((item) => {
                  const content = (
                    <>
                      <div className={styles.workstreamMain}>
                        <span>{item.area}</span>
                        <h3>{item.title}</h3>
                        <p>{item.owner} · {item.stage}</p>
                      </div>
                      <div className={styles.workstreamNext}>
                        <span>Próximo paso</span>
                        <strong>{item.next}</strong>
                      </div>
                      <div className={styles.workstreamStatus}>
                        <em className={workstreamStatusClass(item.status)}>{item.status}</em>
                        {item.href ? <ArrowRight size={16} aria-hidden="true" /> : null}
                      </div>
                    </>
                  );

                  return item.href ? (
                    <Link key={item.title} href={item.href} className={styles.workstreamRow}>{content}</Link>
                  ) : (
                    <div key={item.title} className={styles.workstreamRow}>{content}</div>
                  );
                })}
              </div>
            </article>

            {benchmark ? (
              <article className={styles.panel} id="benchmark">
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.eyebrow}>BENCHMARK Y COMPETENCIA</span>
                    <h2>Qué está cambiando alrededor de {client.name}</h2>
                  </div>
                  <BarChart3 size={22} aria-hidden="true" />
                </div>
                <div className={styles.sourceGrid}>
                  {benchmark.signals.slice(0, 4).map((signal) => (
                    <Link key={signal.id} href={`/v2/clientes/${client.slug}/benchmark`} className={styles.sourceCard}>
                      <span>{signal.category} · impacto {signal.impact.toLowerCase()}</span>
                      <strong>{signal.title}</strong>
                      <small>{signal.competitor} · {signal.detectedAt}</small>
                    </Link>
                  ))}
                </div>
                <Link href={`/v2/clientes/${client.slug}/benchmark`} className={styles.backLink}>
                  Abrir benchmark completo <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </article>
            ) : null}

            <article className={styles.panel} id="documentos">
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>DOCUMENTOS Y FUENTES</span>
                  <h2>De dónde proviene la información</h2>
                </div>
                <FileText size={22} aria-hidden="true" />
              </div>
              <div className={styles.sourceGrid}>
                {client.sources.map((source) => (
                  <div key={source.title} className={styles.sourceCard}>
                    <span>{source.category}</span>
                    <strong>{source.title}</strong>
                    <small>{source.origin} · {source.updated}</small>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <aside className={styles.sideColumn}>
            <article className={styles.panel} id="acciones">
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>ATENCIÓN REQUERIDA</span>
                  <h2>Acciones abiertas</h2>
                </div>
                <CircleAlert size={21} aria-hidden="true" />
              </div>
              <div className={styles.actionList}>
                {client.actions.map((action) => (
                  <div key={action.title} className={styles.actionRow}>
                    <span className={action.priority === "Alta" ? styles.priorityHigh : styles.priorityMedium}>{action.priority}</span>
                    <div>
                      <small>{action.source}</small>
                      <strong>{action.title}</strong>
                      <em>{action.owner} · {action.due}</em>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>MEMORIA DE DECISIONES</span>
                  <h2>Qué cambió y por qué</h2>
                </div>
              </div>
              <div className={styles.timeline}>
                {client.decisions.map((decision) => (
                  <div key={`${decision.date}-${decision.title}`} className={styles.timelineItem}>
                    <time>{decision.date}</time>
                    <div>
                      <span>{decision.source}</span>
                      <strong>{decision.title}</strong>
                      <p>{decision.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className={styles.panel} id="comercial">
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>COMERCIAL Y FINANZAS</span>
                  <h2>Relación y estado administrativo</h2>
                </div>
              </div>
              <div className={styles.commercialList}>
                <div><span>Relación</span><strong>{client.relationship}</strong></div>
                <div><span>Servicios</span><strong>{client.commercial.serviceStatus}</strong></div>
                <div><span>Facturación</span><strong>{client.commercial.billingStatus}</strong></div>
                <div><span>Próxima revisión</span><strong>{client.commercial.nextReview}</strong></div>
              </div>
              <p className={styles.commercialNote}>{client.commercial.note}</p>
            </article>

            <article className={styles.darkPanel}>
              <span className={styles.eyebrowLight}>REGLA DE CONTEXTO</span>
              <h2>Nada crítico cambia sin origen y validación.</h2>
              <p>La información confirmada, importada, inferida y aprendida permanece diferenciada. Una hipótesis de IA no modifica la memoria activa hasta ser aceptada.</p>
              <div className={styles.darkList}>
                <div><CheckCircle2 size={14} /><span>Confirmado por equipo o cliente</span></div>
                <div><CheckCircle2 size={14} /><span>Importado desde una fuente conectada</span></div>
                <div><CheckCircle2 size={14} /><span>Aprendido y versionado</span></div>
              </div>
            </article>
          </aside>
        </section>
      </div>
    </V2Chrome>
  );
}
