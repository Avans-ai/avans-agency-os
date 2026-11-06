import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CircleAlert, Search, Workflow } from "lucide-react";
import { benchmarkSignals } from "../benchmark-data";
import { handoffSteps, salesFollowUps, salesOpportunities, salesStageLabel, salesStages, type SalesOpportunity, type SalesStageKey } from "../sales-data";
import styles from "../sales-hub.module.css";

const stageRoute: Record<SalesStageKey, string> = {
  nuevo: "/v2/leads",
  calificado: "/v2/oportunidades",
  discovery: "/v2/discovery",
  propuesta: "/v2/propuestas",
  negociacion: "/v2/propuestas",
  ganado: "/v2/clientes",
};

function statusClass(status: SalesOpportunity["status"]) {
  if (status === "Atención") return styles.statusAttention;
  if (status === "Aprobación") return styles.statusApproval;
  return styles.statusHealthy;
}

export function SalesHub() {
  const prioritySignals = benchmarkSignals
    .filter((signal) => signal.impact === "Alto" || signal.status === "Nuevo")
    .slice(0, 4);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>ÁREA 03 · DESARROLLO COMERCIAL</span>
          <h1>Ventas conectada desde el primer contacto hasta la operación.</h1>
          <p>
            Leads, diagnóstico, oportunidades, propuestas, seguimiento y alta de cliente comparten un mismo historial. El objetivo es evitar información duplicada y que el contexto se pierda cuando una venta pasa a Operaciones.
          </p>
        </div>
        <div className={styles.heroAside}>
          <span>PRINCIPIO DEL ÁREA</span>
          <strong>Cada oportunidad debe tener próxima acción, responsable, evidencia y criterio de avance.</strong>
          <small>Los datos son simulados para validar la arquitectura. El flujo reutiliza los módulos comerciales ya construidos.</small>
        </div>
      </section>

      <section className={styles.metrics} aria-label="Indicadores comerciales">
        <article><span>Pipeline abierto</span><strong>18</strong><small>Oportunidades activas</small></article>
        <article><span>Discovery en curso</span><strong>3</strong><small>Diagnósticos abiertos</small></article>
        <article><span>Propuestas</span><strong>6</strong><small>2 requieren aprobación</small></article>
        <article><span>Conversión</span><strong>31%</strong><small>Período demo actual</small></article>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>PIPELINE</span>
            <h2>Etapas con criterio de entrada y salida</h2>
          </div>
          <p>No es sólo mover tarjetas. Cada etapa debe definir qué información existe, qué falta y qué condición permite avanzar.</p>
        </div>
        <div className={styles.pipelineGrid}>
          {salesStages.map((stage) => (
            <article key={stage.key} className={styles.pipelineStage}>
              <div className={styles.stageHead}>
                <div>
                  <h3>{stage.label}</h3>
                  <p>{stage.description}</p>
                </div>
                <strong>{stage.count}</strong>
              </div>
              <div className={styles.stageItems}>
                {stage.items.map((item) => (
                  <Link key={`${stage.key}-${item.name}`} href={stageRoute[stage.key]} className={styles.stageItem}>
                    <span>{item.due}</span>
                    <strong>{item.name}</strong>
                    <small>{item.detail}</small>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>OPORTUNIDADES PRIORITARIAS</span>
            <h2>Qué necesita acción comercial ahora</h2>
          </div>
          <p>La prioridad combina fit, momento, riesgo, potencial y próxima acción; no depende únicamente del valor estimado.</p>
        </div>
        <div className={styles.layout}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div><span className={styles.eyebrow}>PIPELINE ACTIVO</span><h2>Oportunidades y siguiente paso</h2></div>
              <BriefcaseBusiness size={22} aria-hidden="true" />
            </div>
            <div className={styles.opportunityList}>
              {salesOpportunities.map((opportunity) => (
                <Link key={opportunity.id} href={stageRoute[opportunity.stage]} className={styles.opportunityRow}>
                  <div className={styles.opportunityMain}>
                    <span>{opportunity.sector}</span>
                    <h3>{opportunity.name}</h3>
                    <p>{opportunity.source} · Potencial {opportunity.potential.toLowerCase()}</p>
                  </div>
                  <div>
                    <span>Etapa</span>
                    <strong>{salesStageLabel(opportunity.stage)}</strong>
                    <small>{opportunity.owner}</small>
                  </div>
                  <div>
                    <span>Fit</span>
                    <strong>{opportunity.fit}%</strong>
                    <div className={styles.fitTrack}><i style={{ width: `${opportunity.fit}%` }} /></div>
                  </div>
                  <div>
                    <span>Próxima acción</span>
                    <strong>{opportunity.nextAction}</strong>
                    <small>{opportunity.due}</small>
                  </div>
                  <div className={styles.rowAction}>
                    <span className={statusClass(opportunity.status)}>{opportunity.status}</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          </article>

          <aside className={styles.sideStack}>
            <section className={styles.sidePanel}>
              <div className={styles.panelHeader}>
                <div><span className={styles.eyebrow}>SEGUIMIENTOS</span><h2>Lo que no puede quedar sin dueño</h2></div>
                <CircleAlert size={21} aria-hidden="true" />
              </div>
              <div className={styles.followList}>
                {salesFollowUps.map((item) => (
                  <Link key={`${item.account}-${item.title}`} href={item.href} className={styles.followRow}>
                    <span className={item.priority === "Alta" ? styles.priorityHigh : styles.priorityMedium}>{item.priority}</span>
                    <div>
                      <span>{item.account}</span>
                      <strong>{item.title}</strong>
                      <small>{item.owner} · {item.due}</small>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className={styles.sidePanel}>
              <div className={styles.panelHeader}>
                <div><span className={styles.eyebrow}>SEÑALES DE MERCADO</span><h2>Benchmark que puede abrir oportunidades</h2></div>
                <Search size={21} aria-hidden="true" />
              </div>
              <div className={styles.marketList}>
                {prioritySignals.map((signal) => (
                  <Link key={signal.id} href={`/v2/clientes/${signal.clientSlug}/benchmark`} className={styles.marketRow}>
                    <Search size={15} aria-hidden="true" />
                    <div>
                      <span>{signal.category} · {signal.impact}</span>
                      <strong>{signal.title}</strong>
                      <small>{signal.competitor} · {signal.detectedAt}</small>
                    </div>
                  </Link>
                ))}
              </div>
              <Link href="/v2/benchmark" className={styles.followRow}>
                <span className={styles.priorityMedium}>Ver</span>
                <div><span>INTELIGENCIA COMPETITIVA</span><strong>Abrir benchmark completo del portfolio</strong><small>Clientes + Ventas + Gerencia</small></div>
              </Link>
            </section>
          </aside>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>CAPACIDADES PRESERVADAS</span>
            <h2>Los módulos existentes forman un único proceso comercial</h2>
          </div>
          <p>Leads, Discovery, Oportunidades y Propuestas dejan de funcionar como destinos separados y comparten contexto, actividad y próximos pasos.</p>
        </div>
        <div className={styles.capabilityGrid}>
          <Link href="/v2/leads" className={styles.capabilityCard}><span>Leads <ArrowRight size={17} /></span><p>Origen, clasificación, contacto, fit y siguiente acción.</p></Link>
          <Link href="/v2/discovery" className={styles.capabilityCard}><span>Discovery <ArrowRight size={17} /></span><p>Problemas, riesgos, cuellos de botella, objetivos y oportunidades.</p></Link>
          <Link href="/v2/oportunidades" className={styles.capabilityCard}><span>Oportunidades <ArrowRight size={17} /></span><p>Priorización, potencial, probabilidad, actividad y forecast.</p></Link>
          <Link href="/v2/propuestas" className={styles.capabilityCard}><span>Propuestas <ArrowRight size={17} /></span><p>Alcance, etapas, entregables, inversión, versiones y aprobación.</p></Link>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>HANDOFF</span>
            <h2>Una venta ganada crea la operación, no otro trabajo manual</h2>
          </div>
          <p>El contexto comercial debe llegar completo a Clientes y Operaciones para que el equipo no vuelva a preguntar lo ya relevado.</p>
        </div>
        <div className={styles.handoffGrid}>
          {handoffSteps.map((step) => (
            <article key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.darkPanel}>
          <span className={styles.eyebrowLight}>AUTOMATIZACIÓN CONTROLADA</span>
          <h2>Propuesta aprobada → Cliente 360° + proyecto + responsables.</h2>
          <p>El sistema puede automatizar el alta y la transferencia de información, mientras Dirección conserva la aprobación sobre alcance, inversión y compromisos sensibles.</p>
          <div className={styles.darkList}>
            <div><span>Automático</span><strong>Crear estructuras, copiar contexto y asignar plantillas</strong></div>
            <div><span>Asistido</span><strong>Detectar riesgos, resumir discovery y sugerir próximos pasos</strong></div>
            <div><span>Humano</span><strong>Aprobar inversión, alcance, condiciones y promesas al cliente</strong></div>
          </div>
        </div>
      </section>
    </div>
  );
}
