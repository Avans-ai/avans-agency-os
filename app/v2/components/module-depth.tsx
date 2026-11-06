import { Bot, ShieldCheck, Workflow } from "lucide-react";
import { moduleDepthData } from "../module-depth-data";
import styles from "./module-depth.module.css";

export function ModuleDepth({ section }: { section: string }) {
  const data = moduleDepthData[section];
  if (!data) return null;

  return (
    <section className={styles.wrap}>
      <div className={styles.topGrid}>
        <article className={styles.panel}>
          <span className={styles.eyebrow}>FLUJO OPERATIVO</span>
          <h2>{data.flowTitle}</h2>
          <div className={styles.flow}>
            {data.flow.map((step, index) => (
              <div className={styles.flowStep} key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <span className={styles.eyebrow}>AUTONOMÍA Y CONTROL</span>
          <h2>Qué hace Avans y qué valida el equipo</h2>
          <div className={styles.controlGrid}>
            <div className={styles.controlBox}>
              <span><Bot size={13} /> Avans automatiza</span>
              <ul>{data.automate.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className={styles.controlBox}>
              <span><ShieldCheck size={13} /> Control humano</span>
              <ul>{data.human.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        </article>
      </div>

      <article className={styles.panel}>
        <span className={styles.eyebrow}>SEÑALES DEL MÓDULO</span>
        <h2>Qué debería mirar el sistema sin esperar a que alguien lo revise</h2>
        <div className={styles.signals}>
          {data.signals.map((signal) => (
            <div className={styles.signal} key={signal.title}>
              <header>
                <h3>{signal.title}</h3>
                <em>{signal.status}</em>
              </header>
              <p>{signal.detail}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
