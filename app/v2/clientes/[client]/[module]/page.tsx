import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { AgencyDepth } from "../../../components/agency-depth";
import { V2Chrome } from "../../../components/v2-chrome";
import { agencyModuleConfig, avansClients, type AgencyModuleSlug } from "../../../agency-client-data";
import styles from "../../../client-work.module.css";

const modules: AgencyModuleSlug[] = ["contenido", "campanas", "reportes"];

export function generateStaticParams() {
  return avansClients.flatMap((client) => modules.map((module) => ({ client: client.slug, module })));
}

export default async function ClientAgencyWorkspace({
  params,
}: {
  params: Promise<{ client: string; module: string }>;
}) {
  const { client: clientSlug, module: moduleSlug } = await params;
  const client = avansClients.find((item) => item.slug === clientSlug);
  const module = modules.includes(moduleSlug as AgencyModuleSlug) ? moduleSlug as AgencyModuleSlug : null;

  if (!client || !module) notFound();

  const config = agencyModuleConfig[module];
  const canStart = config.preflight.every((item) => item.state === "Listo");

  return (
    <V2Chrome active={module} title={`${client.name} · ${config.label}`}>
      <div className={styles.workspaceWrap}>
        <section className={styles.clientHero}>
          <div className={styles.clientIdentity}>
            <span className={styles.clientIdentityMark}>{client.name.slice(0, 1)}</span>
            <div>
              <span className={styles.eyebrow}>{config.eyebrow}</span>
              <h1>{client.name} · {config.label}</h1>
              <p>{config.description}</p>
              <div className={styles.clientMeta}>
                <span>{client.health}</span>
                <span>{client.context}% contexto disponible</span>
                <span>{client.attention}</span>
              </div>
            </div>
          </div>
          <Link href={`/v2/${module}`} className={styles.switchClient}>
            <ArrowLeft size={13} /> Cambiar cliente
          </Link>
        </section>

        <nav className={styles.moduleTabs} aria-label="Workspace del cliente">
          <Link href={`/v2/clientes/${client.slug}`}>Resumen</Link>
          {modules.map((item) => (
            <Link
              key={item}
              href={`/v2/clientes/${client.slug}/${item}`}
              className={item === module ? styles.activeTab : ""}
            >
              {agencyModuleConfig[item].label}
            </Link>
          ))}
        </nav>

        <section className={styles.workspaceGrid}>
          <div>
            <article className={styles.panel}>
              <div className={styles.panelHead}>
                <div>
                  <span className={styles.eyebrow}>PREFLIGHT · CUENTA CARGADA</span>
                  <h2>{config.preflightTitle}</h2>
                </div>
                <span className={styles.statusTag}>{canStart ? "Listo para iniciar" : "1 punto a revisar"}</span>
              </div>

              <div className={styles.preflightList}>
                {config.preflight.map((item) => (
                  <div className={styles.preflightRow} key={item.title}>
                    <span className={item.state === "Listo" ? styles.checkIcon : styles.reviewIcon}>
                      {item.state === "Listo" ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.detail}</small>
                    </div>
                    <em>{item.state}</em>
                  </div>
                ))}
              </div>

              <div className={styles.startBox}>
                <span>PASO SIGUIENTE</span>
                <strong>{config.startAction}</strong>
                <small>La acción queda vinculada a {client.name} desde origen. Avans adjunta contexto, fuentes, decisiones previas y reglas antes de invocar agentes o automatizaciones.</small>
                <button className={styles.startButton}>
                  {canStart ? config.startAction : "Revisar preflight"} <ArrowRight size={13} />
                </button>
              </div>
            </article>

            <article className={styles.panel} style={{ marginTop: 14 }}>
              <div className={styles.panelHead}>
                <div>
                  <span className={styles.eyebrow}>WORKFLOW DE CUENTA</span>
                  <h2>Cómo avanza {config.label.toLowerCase()}</h2>
                </div>
              </div>
              <div className={styles.flow}>
                {config.stages.map((stage, index) => (
                  <div className={styles.flowStep} key={stage}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{stage}</strong>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <aside>
            <article className={styles.contextCard}>
              <Sparkles size={17} />
              <span className={styles.eyebrow}>CONTEXTO DISPONIBLE</span>
              <strong>{client.name}: {client.context}%</strong>
              <small>Antes de iniciar una tarea, Avans muestra cuánto contexto confiable tiene y qué parte todavía necesita validación.</small>
              <div className={styles.contextBar}><i style={{ width: `${client.context}%` }} /></div>
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHead}>
                <div>
                  <span className={styles.eyebrow}>COLA DE CUENTA</span>
                  <h2>Trabajo actual</h2>
                </div>
              </div>
              <div className={styles.queue}>
                {config.queue.map((item) => (
                  <div className={styles.queueItem} key={item.title}>
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.detail}</small>
                    </div>
                    <em>{item.status}</em>
                  </div>
                ))}
              </div>
            </article>
          </aside>
        </section>

        <AgencyDepth clientName={client.name} clientSlug={client.slug} module={module} />
      </div>
    </V2Chrome>
  );
}
