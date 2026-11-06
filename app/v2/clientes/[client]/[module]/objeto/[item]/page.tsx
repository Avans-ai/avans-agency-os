import Link from "next/link";
import { ArrowLeft, CheckCircle2, Database, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { notFound } from "next/navigation";
import { agencyModuleConfig, avansClients, type AgencyModuleSlug } from "../../../../../agency-client-data";
import { moduleDetails } from "../../../../../components/agency-depth";
import { DecisionWorkbench } from "../../../../../components/decision-workbench";
import { V2Chrome } from "../../../../../components/v2-chrome";
import styles from "../../../../../object-detail.module.css";

const modules: AgencyModuleSlug[] = ["contenido", "campanas", "reportes"];

export function generateStaticParams() {
  return avansClients.flatMap((client) =>
    modules.flatMap((module) => [
      ...moduleDetails[module].decisions.map((_, index) => ({ client: client.slug, module, item: `decision-${index + 1}` })),
      ...moduleDetails[module].history.map((_, index) => ({ client: client.slug, module, item: `history-${index + 1}` })),
    ]),
  );
}

export default async function AgencyObjectPage({
  params,
}: {
  params: Promise<{ client: string; module: string; item: string }>;
}) {
  const { client: clientSlug, module: moduleSlug, item } = await params;
  const client = avansClients.find((entry) => entry.slug === clientSlug);
  const module = modules.includes(moduleSlug as AgencyModuleSlug) ? moduleSlug as AgencyModuleSlug : null;

  if (!client || !module) notFound();

  const config = agencyModuleConfig[module];
  const details = moduleDetails[module];
  const isDecision = item.startsWith("decision-");
  const index = Number(item.split("-")[1]) - 1;
  const decision = isDecision ? details.decisions[index] : null;
  const history = !isDecision ? details.history[index] : null;

  if (!decision && !history) notFound();

  const title = decision?.title ?? history!.title;
  const detail = decision?.detail ?? history!.detail;
  const status = decision?.status ?? history!.status;
  const actions =
    module === "campanas"
      ? ["Aprobar recomendación", "Pedir ajuste", "Descartar", "Ejecutar demo"]
      : module === "contenido"
        ? ["Aprobar enfoque", "Pedir ajuste", "Validar aprendizaje", "Rechazar"]
        : ["Aprobar versión", "Pedir ajuste", "Pedir más evidencia", "Rechazar"];

  return (
    <V2Chrome active={module} title={`${client.name} · ${config.label}`}>
      <div className={styles.wrap}>
        <Link href={`/v2/clientes/${client.slug}/${module}`} className={styles.back}>
          <ArrowLeft size={14} /> Volver a {client.name} · {config.label}
        </Link>

        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>{isDecision ? "DECISIÓN ABIERTA" : "EVENTO TRAZADO"} · {config.label.toUpperCase()}</span>
            <h1>{title}</h1>
            <p>{detail}</p>
            <div className={styles.badges}>
              <span>{status}</span>
              <span>{client.name}</span>
              <span>{config.label}</span>
              <span>Demo con contexto de cuenta</span>
            </div>
          </div>
          <div className={styles.heroSide}>
            <span className={styles.eyebrow}>CONTEXTO</span>
            <strong>{client.context}%</strong>
            <small>Memoria disponible antes de decidir.</small>
          </div>
        </section>

        <section className={styles.grid}>
          <div>
            <article className={styles.panel}>
              <div className={styles.panelHead}>
                <div>
                  <span className={styles.eyebrow}>CONTEXTO + EVIDENCIA</span>
                  <h2>Qué debe mirar el equipo antes de actuar</h2>
                </div>
                <Sparkles size={18} />
              </div>
              <div className={styles.explainGrid}>
                <div className={styles.explainBox}>
                  <span>Lectura de Avans</span>
                  <strong>{detail}</strong>
                </div>
                <div className={styles.explainBox}>
                  <span>Próximo paso</span>
                  <strong>{isDecision ? "Tomar una decisión explícita y registrar el motivo." : "Revisar el resultado y decidir si genera seguimiento o aprendizaje."}</strong>
                </div>
              </div>

              <div className={styles.evidence}>
                {details.brief.map((entry) => (
                  <div key={entry.label}>
                    <CheckCircle2 size={15} />
                    <span><strong>{entry.label}:</strong> {entry.value}</span>
                  </div>
                ))}
              </div>

              <div className={styles.guardrail}>
                <ShieldCheck size={17} />
                <div>
                  <strong>Control humano</strong>
                  <small>{details.brief.find((entry) => entry.label === "Control humano")?.value ?? "Las decisiones sensibles requieren validación."}</small>
                </div>
              </div>
            </article>

            <article className={styles.panel} style={{ marginTop: 14 }}>
              <div className={styles.panelHead}>
                <div>
                  <span className={styles.eyebrow}>WORKFLOW DE CUENTA</span>
                  <h2>Cómo llega este objeto hasta acá</h2>
                </div>
                <Workflow size={18} />
              </div>
              <div className={styles.flow}>
                {config.stages.map((stage, stageIndex) => (
                  <div className={styles.flowStep} key={stage}>
                    <span>{String(stageIndex + 1).padStart(2, "0")}</span>
                    <strong>{stage}</strong>
                  </div>
                ))}
              </div>
            </article>

            <DecisionWorkbench
              title={title}
              initialStatus={status}
              actions={actions}
              reversible={module === "campanas"}
            />
          </div>

          <aside>
            <article className={styles.panel}>
              <div className={styles.panelHead}>
                <div>
                  <span className={styles.eyebrow}>FICHA DEL OBJETO</span>
                  <h2>Metadatos</h2>
                </div>
                <Database size={17} />
              </div>
              <div className={styles.metaList}>
                <div><span>Cliente</span><strong>{client.name}</strong></div>
                <div><span>Módulo</span><strong>{config.label}</strong></div>
                <div><span>Estado</span><strong>{status}</strong></div>
                <div><span>Tipo</span><strong>{isDecision ? "Decisión" : "Evento"}</strong></div>
                <div><span>Contexto</span><strong>{client.context}%</strong></div>
              </div>
            </article>

            <article className={styles.panel} style={{ marginTop: 14 }}>
              <span className={styles.eyebrow}>TRAZABILIDAD · DEMO</span>
              <h2>Actividad relacionada</h2>
              <div className={styles.timeline}>
                {details.history.map((event) => (
                  <div className={styles.timelineRow} key={event.time + event.title}>
                    <time>{event.time.replace("Hoy ", "").replace("Ayer ", "")}</time>
                    <span className={styles.timelineDot} />
                    <div>
                      <strong>{event.title}</strong>
                      <small>{event.detail}</small>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </aside>
        </section>
      </div>
    </V2Chrome>
  );
}
