"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AvansModuleIcon } from "../brand";
import { serviceCatalog, serviceLabel, type OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import {
  recommendationsForClient,
  serviceHref,
  serviceWorkspaceById,
  type ServiceRecommendation,
  type ServiceWorkspaceConfig,
} from "../service-workspace-data";
import { Badge, buttonClass, cx, LinkButton, OSEmptyState, OSStatus } from "../ui";
import s from "../os.module.css";
import sc from "../screens.module.css";
import m from "./meeting-architecture.module.css";

function statusTone(status: string) {
  if (status === "Priorizada") return "cool" as const;
  if (status === "En evaluación") return "peach" as const;
  if (status === "Descartada") return "stone" as const;
  return "info" as const;
}

export function ClientServiceWorkspace({ client, service }: { client: OsClient; service: ServiceWorkspaceConfig }) {
  const { notify, servicesOf } = useOsStore();
  const activeIds = servicesOf(client.slug);
  const activeServices = serviceCatalog.filter((item) => activeIds.includes(item.id));
  const definition = serviceCatalog.find((item) => item.id === service.id);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [rationale, setRationale] = useState("");
  const [manual, setManual] = useState<ServiceRecommendation[]>([]);

  const recommendations = useMemo(() => {
    const base = service.id === "estrategia"
      ? recommendationsForClient(client.slug)
      : recommendationsForClient(client.slug, service.id);
    return [...manual, ...base];
  }, [client.slug, manual, service.id]);

  if (!activeIds.includes(service.id)) {
    return (
      <div className={m.workspaceBody}>
        <OSEmptyState icon="ajuste" title={`${service.label} no está activo para ${client.name}`} actions={<LinkButton href={`/v2/clientes/${client.slug}`} variant="dark">Volver a la cuenta</LinkButton>}>
          Solo deben aparecer módulos correspondientes a servicios contratados. La configuración persistente todavía no está conectada.
        </OSEmptyState>
      </div>
    );
  }

  function addManualRecommendation(event: React.FormEvent) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    setManual((current) => [{
      id: `MAN-${current.length + 1}`,
      clientSlug: client.slug,
      serviceId: service.id,
      title: cleanTitle,
      rationale: rationale.trim() || "Sin fundamento cargado.",
      source: "Carga manual",
      priority: "Media",
      status: "Nueva",
    }, ...current]);
    setTitle("");
    setRationale("");
    setFormOpen(false);
    notify("Recomendación agregada solo a esta sesión (simulado)");
  }

  return (
    <div className={m.workspace}>
      <header className={m.workspaceHero}>
        <div className={m.workspaceTitle}>
          <span className={m.workspaceIcon}>{definition ? <AvansModuleIcon name={definition.icon} size={38} /> : null}</span>
          <div>
            <span className={s.rotulo}>Operaciones · {client.name}</span>
            <h1>{service.label}</h1>
            <p>{service.description}</p>
          </div>
        </div>
        <div className={s.actions}>
          <LinkButton href={`/v2/clientes/${client.slug}`} variant="ghost">Gestión de cuenta</LinkButton>
          <button type="button" className={buttonClass("primary")} onClick={() => notify(`${service.createLabel}: pendiente de persistencia y definición del flujo específico`)}>{service.createLabel}</button>
        </div>
      </header>

      <nav className={m.workspaceTabs} aria-label={`Servicios activos de ${client.name}`}>
        {activeServices.map((item) => {
          const workspace = serviceWorkspaceById(item.id);
          if (!workspace) return null;
          return <Link key={item.id} href={serviceHref(client.slug, item.id)} className={m.workspaceTab} data-active={item.id === service.id} aria-current={item.id === service.id ? "page" : undefined}>{item.label}</Link>;
        })}
      </nav>

      <div className={m.workspaceBody}>
        <section className={m.healthStrip} aria-label="Contexto del módulo">
          <div><span>Cliente</span><strong>{client.name}</strong></div>
          <div><span>Salud de cuenta</span><strong><OSStatus status={client.status} /></strong></div>
          <div><span>Responsable de cuenta</span><strong>{client.owner}</strong></div>
          <div><span>Próximo hito</span><strong>{client.nextMilestone.label}</strong></div>
        </section>

        <section aria-labelledby="workflow-title" className={sc.stack}>
          <div className={s.pageHead}><div><h2 id="workflow-title" style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Flujo del servicio</h2><p>La creación ocurre acá, adaptada al proceso del servicio, y no desde un botón general del cliente.</p></div></div>
          <div className={m.workflow}>
            {service.stages.map((stage, index) => <div className={m.workflowStep} key={stage}><span>{String(index + 1).padStart(2, "0")}</span><strong>{stage}</strong></div>)}
          </div>
        </section>

        <div className={m.workspaceGrid}>
          <div className={sc.stack}>
            <section className={s.surface} aria-labelledby="queue-title">
              <div className={s.cardHead}><h2 id="queue-title">Trabajo actual</h2><span className={s.cardMeta}>Datos de demostración</span></div>
              {service.queue.map((item) => <div className={m.queueRow} key={item.title}><div><strong>{item.title}</strong><p>{item.detail}</p></div><em>{item.status}</em></div>)}
            </section>

            <section className={s.surface} aria-labelledby="recommendations-title">
              <div className={s.cardHead}>
                <h2 id="recommendations-title">{service.id === "estrategia" ? "Centro consolidado de recomendaciones" : `Recomendaciones de ${service.label}`}</h2>
                <button type="button" className={buttonClass("secondary", true)} aria-expanded={formOpen} onClick={() => setFormOpen((current) => !current)}>Nueva recomendación</button>
              </div>
              {formOpen ? (
                <form className={cx(sc.cardBody, m.formGrid)} onSubmit={addManualRecommendation}>
                  <label className={s.field}><span>Título</span><input className={s.input} value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="Qué proponemos" /></label>
                  <label className={s.field}><span>Fundamento</span><textarea className={s.input} rows={3} value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="Dato, aprendizaje o decisión que la origina" /></label>
                  <div className={s.actions}><button type="submit" className={buttonClass("dark", true)}>Agregar a esta sesión</button><button type="button" className={buttonClass("ghost")} onClick={() => setFormOpen(false)}>Cancelar</button></div>
                </form>
              ) : null}
              {recommendations.length ? recommendations.map((item) => (
                <article className={m.recRow} key={item.id}>
                  <div className={m.recTop}><strong>{item.title}</strong><Badge tone={statusTone(item.status)}>{item.status}</Badge></div>
                  <p>{item.rationale}</p>
                  <div className={m.recMeta}><span>{serviceLabel(item.serviceId)}</span><span>{item.source}</span><span>Prioridad {item.priority}</span><span>{item.id}</span></div>
                  {service.id === "estrategia" && item.serviceId !== "estrategia" ? <Link className={s.link} href={serviceHref(client.slug, item.serviceId)}>Abrir en el módulo responsable</Link> : null}
                </article>
              )) : <OSEmptyState icon="idea" title="Todavía no hay recomendaciones">Las sugerencias deben quedar asociadas a este servicio, con fuente y prioridad.</OSEmptyState>}
              <p className={s.demoNote} style={{ margin: 0, padding: "12px 18px" }}>No hay un motor de IA conectado en esta rama. Las recomendaciones precargadas y manuales están identificadas como demostración.</p>
            </section>
          </div>

          <aside className={sc.stack}>
            <section className={s.surface} aria-labelledby="sources-title">
              <div className={s.cardHead}><h2 id="sources-title">Fuentes para operar</h2></div>
              <div className={m.sourceList}>
                <Link className={m.sourceItem} href={`/v2/clientes/${client.slug}?view=ficha`}><span>Ficha del cliente</span><span>Negocio y contexto</span></Link>
                <Link className={m.sourceItem} href={`/v2/clientes/${client.slug}?view=benchmark`}><span>Benchmark</span><span>Hallazgos competitivos</span></Link>
                <Link className={m.sourceItem} href={`/v2/clientes/${client.slug}?view=estrategia`}><span>Estrategia y plan</span><span>Prioridades generales</span></Link>
                <Link className={m.sourceItem} href={`/v2/clientes/${client.slug}?view=reportes`}><span>Reportes y salud</span><span>Resultados y alertas</span></Link>
              </div>
            </section>
            <section className={s.surface}>
              <div className={s.cardHead}><h2>Estado técnico</h2></div>
              <div className={sc.cardBody}>
                <Badge tone="stone">Estructura implementada</Badge>
                <p style={{ margin: 0, lineHeight: 1.5 }}>El módulo ya está ubicado en el contexto correcto. Persistencia, permisos por backend y flujos específicos requieren la definición funcional de cada servicio.</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
