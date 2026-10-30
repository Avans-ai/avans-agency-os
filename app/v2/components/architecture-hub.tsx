import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, Layers3, ShieldCheck } from "lucide-react";
import type { ArchitectureArea, ArchitectureModule } from "../architecture-data";
import styles from "../architecture.module.css";

const statusClass: Record<ArchitectureModule["status"], string> = {
  Disponible: styles.statusAvailable,
  "En diseño": styles.statusDesign,
  "Siguiente etapa": styles.statusNext,
};

function ModuleEntry({ module }: { module: ArchitectureModule }) {
  const content = (
    <>
      <div className={styles.moduleCopy}>
        <span className={styles.moduleMeta}>{module.meta}</span>
        <h3>{module.title}</h3>
        <p>{module.description}</p>
      </div>
      <div className={styles.moduleSide}>
        <span className={`${styles.status} ${statusClass[module.status]}`}>{module.status}</span>
        {module.href ? <ArrowRight size={18} aria-hidden="true" /> : <CircleDashed size={18} aria-hidden="true" />}
      </div>
    </>
  );

  if (module.href) {
    return (
      <Link href={module.href} className={styles.moduleEntry}>
        {content}
      </Link>
    );
  }

  return <div className={`${styles.moduleEntry} ${styles.moduleEntryDisabled}`}>{content}</div>;
}

export function ArchitectureHub({ area }: { area: ArchitectureArea }) {
  return (
    <div className={styles.page}>
      <section className={styles.areaHero}>
        <div className={styles.areaHeroCopy}>
          <span className={styles.kicker}>{area.eyebrow}</span>
          <h1>{area.title}</h1>
          <p>{area.description}</p>
        </div>
        <div className={styles.objectiveBox}>
          <span>OBJETIVO DEL ÁREA</span>
          <strong>{area.objective}</strong>
        </div>
      </section>

      <section className={styles.metricsGrid} aria-label={`Indicadores de ${area.label}`}>
        {area.metrics.map((metric) => (
          <article key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
          </article>
        ))}
      </section>

      <section className={styles.areaLayout}>
        <article className={styles.modulesPanel}>
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.kicker}>ESTRUCTURA FUNCIONAL</span>
              <h2>Qué incluye esta sección</h2>
            </div>
            <Layers3 size={22} aria-hidden="true" />
          </div>
          <div className={styles.moduleList}>
            {area.modules.map((module) => (
              <ModuleEntry key={module.title} module={module} />
            ))}
          </div>
        </article>

        <aside className={styles.sideStack}>
          <section className={styles.sidePanel}>
            <div className={styles.sideTitle}>
              <ShieldCheck size={19} aria-hidden="true" />
              <div>
                <span>CRITERIOS DE DISEÑO</span>
                <h2>Cómo debe funcionar</h2>
              </div>
            </div>
            <div className={styles.principlesList}>
              {area.principles.map((principle, index) => (
                <div key={principle}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{principle}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.sidePanelDark}>
            <span className={styles.kickerLight}>SALIDAS E INDICADORES</span>
            <h2>Qué información debe producir</h2>
            <div className={styles.outputList}>
              {area.outputs.map((output) => (
                <div key={output}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  <span>{output}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
