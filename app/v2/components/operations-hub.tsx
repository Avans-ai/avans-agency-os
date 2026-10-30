import Link from "next/link";
import { Activity, ArrowRight, CircleAlert, Layers3, UsersRound } from "lucide-react";
import {
  operationsCapabilities,
  operationsCapacity,
  operationsExceptions,
  operationsLanes,
  operationsMetrics,
  operationsPortfolio,
} from "../operations-depth-data";
import styles from "../depth.module.css";

function statusClass(status: "Saludable" | "Atención" | "Aprobación") {
  if (status === "Saludable") return styles.statusHealthy;
  if (status === "Aprobación") return styles.statusApproval;
  return styles.statusAttention;
}

export function OperationsHub() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>ÁREA 02 · CENTRALIZACIÓN OPERATIVA</span>
          <h1>La operación organizada según cómo trabaja Avans.</h1>
          <p>
            Procesos, proyectos, producción, campañas, reuniones, responsables, fechas, aprobaciones y bloqueos conectados sin reducir la agencia a un tablero genérico de tareas.
          </p>
        </div>
        <div className={styles.heroAside}>
          <span>OBJETIVO DEL ÁREA</span>
          <strong>Entender qué está en marcha, qué sigue y qué necesita intervención.</strong>
          <small>Cada elemento conserva cliente, proceso de origen, responsable, fecha y estado.</small>
        </div>
      </section>

      <section className={styles.metrics} aria-label="Indicadores de operaciones">
        {operationsMetrics.map((metric) => (
          <article className={styles.metric} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
          </article>
        ))}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>MAPA DE OPERACIÓN</span>
            <h2>Del ingreso de información a la entrega y medición</h2>
          </div>
          <p>La vista representa etapas de trabajo, no columnas fijas. Cada proceso puede tener reglas, responsables y aprobaciones diferentes.</p>
        </div>
        <div className={styles.laneGrid}>
          {operationsLanes.map((lane) => (
            <article key={lane.label} className={styles.lane}>
              <div className={styles.laneHead}>
                <div>
                  <h3>{lane.label}</h3>
                  <p>{lane.description}</p>
                </div>
                <strong>{lane.count}</strong>
              </div>
              <div className={styles.laneItems}>
                {lane.items.map((item) => (
                  <Link key={`${item.client}-${item.title}`} href={item.href} className={styles.laneItem}>
                    <span>{item.client}</span>
                    <strong>{item.title}</strong>
                    <small>{item.status}</small>
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
            <span className={styles.eyebrow}>PORTFOLIO OPERATIVO</span>
            <h2>Frentes activos por cliente</h2>
          </div>
          <p>Una lectura transversal para detectar desvíos, dependencias y próximos hitos sin recorrer proyecto por proyecto.</p>
        </div>

        <div className={styles.grid}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>OPERACIÓN ACTIVA</span>
                <h2>Estado y próximo paso</h2>
              </div>
              <Layers3 size={21} aria-hidden="true" />
            </div>
            <div className={styles.portfolioList}>
              {operationsPortfolio.map((row) => (
                <Link key={`${row.client}-${row.workstream}`} href={row.href} className={styles.portfolioRow}>
                  <div><span>Cliente</span><strong>{row.client}</strong></div>
                  <div><span>Frente</span><strong>{row.workstream}</strong></div>
                  <div><span>Responsable</span><strong>{row.owner}</strong></div>
                  <div><span>Etapa</span><strong>{row.stage}</strong></div>
                  <div><span>Próximo paso</span><strong>{row.next}</strong></div>
                  <div><span className={statusClass(row.status)}>{row.status}</span><ArrowRight size={16} aria-hidden="true" /></div>
                </Link>
              ))}
            </div>
          </article>

          <aside className={styles.sideStack}>
            <section className={styles.sidePanel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>CAPACIDAD</span>
                  <h2>Carga por área</h2>
                </div>
                <UsersRound size={21} aria-hidden="true" />
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
            </section>

            <section className={styles.sidePanel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>EXCEPCIONES</span>
                  <h2>Lo que requiere intervención</h2>
                </div>
                <CircleAlert size={21} aria-hidden="true" />
              </div>
              <div className={styles.exceptionList}>
                {operationsExceptions.map((item) => (
                  <Link key={`${item.client}-${item.title}`} href={item.href} className={styles.exceptionRow}>
                    <span className={styles.exceptionPriority}>{item.priority}</span>
                    <div>
                      <span>{item.client}</span>
                      <strong>{item.title}</strong>
                      <small>{item.owner} · {item.due}</small>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>CAPACIDADES PRESERVADAS</span>
            <h2>Lo que ya construimos vive dentro de Operaciones</h2>
          </div>
          <p>No se eliminan módulos: se convierten en capacidades conectadas a clientes, responsables, procesos y resultados.</p>
        </div>
        <div className={styles.capabilityGrid}>
          {operationsCapabilities.map((capability) => (
            <Link key={capability.label} href={capability.href} className={styles.capabilityCard}>
              <span>{capability.label}<ArrowRight size={17} aria-hidden="true" /></span>
              <p>{capability.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.darkPanel}>
          <span className={styles.eyebrowLight}>CRITERIO DE PROFUNDIZACIÓN</span>
          <h2>Primero proceso, después automatización.</h2>
          <p>Las automatizaciones y agentes se incorporan sobre flujos entendidos, con entradas, reglas, responsables, puntos de aprobación, salidas e indicadores definidos.</p>
          <div className={styles.darkList}>
            <div><span>Automatización</span><strong>Pasos determinísticos y repetibles</strong></div>
            <div><span>Agente</span><strong>Interpretación y elección dentro de límites</strong></div>
            <div><span>Control humano</span><strong>Aprobaciones e impacto sensible</strong></div>
          </div>
        </div>
      </section>
    </div>
  );
}
