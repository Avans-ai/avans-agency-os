"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ClientBenchmark } from "../../benchmark-data";
import type { ClientDepth } from "../../client-depth-data";
import { AvansIcon, AvansModuleIcon } from "../brand";
import { serviceCatalog, serviceLabel, strategyByClient, type OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { recommendationsForClient, serviceHref } from "../service-workspace-data";
import { formatMoney, projectsOf } from "../selectors";
import { Avatar, Badge, buttonClass, cx, LinkButton, OSEmptyState, OSStatus, RestrictedValue } from "../ui";
import s from "../os.module.css";
import sc from "../screens.module.css";
import m from "./meeting-architecture.module.css";

const MANAGEMENT_VIEWS = [
  { id: "resumen", label: "Resumen", description: "Estado y próximos pasos" },
  { id: "ficha", label: "Ficha del cliente", description: "Negocio, equipo y conocimiento" },
  { id: "benchmark", label: "Benchmark", description: "Competidores y oportunidades" },
  { id: "estrategia", label: "Estrategia y plan", description: "Prioridades y recomendaciones" },
  { id: "reportes", label: "Reportes y salud", description: "Indicadores y seguimiento" },
] as const;

type ManagementView = (typeof MANAGEMENT_VIEWS)[number]["id"];

function managementHref(clientSlug: string, view: ManagementView) {
  return view === "resumen" ? `/v2/clientes/${clientSlug}` : `/v2/clientes/${clientSlug}?view=${view}`;
}

function recommendationTone(status: string) {
  if (status === "Priorizada") return "cool" as const;
  if (status === "En evaluación") return "peach" as const;
  if (status === "Descartada") return "stone" as const;
  return "info" as const;
}

export function ClientWorkspace({ client, depth, benchmark }: { client: OsClient; depth?: ClientDepth; benchmark?: ClientBenchmark }) {
  const params = useSearchParams();
  const { notify, servicesOf } = useOsStore();
  const requested = params.get("view") ?? "resumen";
  const view: ManagementView = MANAGEMENT_VIEWS.some((item) => item.id === requested) ? requested as ManagementView : "resumen";
  const activeServices = serviceCatalog.filter((service) => servicesOf(client.slug).includes(service.id));
  const projects = projectsOf(client.slug);

  return (
    <>
      <div className={sc.profileHead}>
        <div className={sc.identity}>
          <span className={sc.bigInitials} aria-hidden="true">{client.initials}</span>
          <div>
            <h1>{client.name} <OSStatus status={client.status} /></h1>
            <p>Cliente desde {client.since} · Burbuja {client.bubble} · Responsable <strong>{client.owner}</strong> · {activeServices.length} {activeServices.length === 1 ? "servicio activo" : "servicios activos"}</p>
          </div>
        </div>
        <div className={s.actions}>
          <button type="button" className={buttonClass("ghost")} onClick={() => notify("Registrar reunión: integración con Google Workspace pendiente")}><AvansIcon name="dialogo" size={18} />Registrar reunión</button>
          <button type="button" className={buttonClass("secondary")} onClick={() => notify("Carpeta en Drive: integración pendiente")}><AvansIcon name="enlace" size={18} />Carpeta en Drive</button>
        </div>
        <div className={m.managementBlock}>
          <p className={m.levelLabel}>Nivel 1 · Gestión y contexto</p>
          <nav className={m.managementNav} aria-label={`Gestión de ${client.name}`}>
            {MANAGEMENT_VIEWS.map((item) => (
              <Link key={item.id} href={managementHref(client.slug, item.id)} className={m.managementLink} data-active={view === item.id} aria-current={view === item.id ? "page" : undefined}>
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className={m.serviceBand}>
        <p className={m.levelLabel}>Nivel 2 · Operación diaria por servicio</p>
        {activeServices.length ? (
          <nav className={m.serviceTabs} aria-label={`Módulos operativos de ${client.name}`}>
            {activeServices.map((service) => (
              <Link key={service.id} href={serviceHref(client.slug, service.id)} className={m.serviceTab}>
                <span className={m.serviceTabIcon}><AvansModuleIcon name={service.icon} size={32} /></span>
                <span>{service.label}</span>
              </Link>
            ))}
          </nav>
        ) : <p className={s.demoNote}>No hay módulos operativos activos. La configuración requiere persistencia antes de habilitarse en producción.</p>}
      </div>

      <div className={cx(sc.profileBody, sc.profileBodyFull)}>
        {view === "resumen" ? <SummaryView client={client} depth={depth} projectCount={projects.length} /> : null}
        {view === "ficha" ? <ClientSheetView client={client} depth={depth} /> : null}
        {view === "benchmark" ? <BenchmarkView client={client} benchmark={benchmark} /> : null}
        {view === "estrategia" ? <StrategyView client={client} /> : null}
        {view === "reportes" ? <ReportsHealthView client={client} /> : null}
      </div>
    </>
  );
}

function SummaryView({ client, depth, projectCount }: { client: OsClient; depth?: ClientDepth; projectCount: number }) {
  const { role, servicesOf } = useOsStore();
  const projects = projectsOf(client.slug);
  return (
    <div className={sc.stack}>
      <section className={m.healthStrip} aria-label="Estado resumido de la cuenta">
        <div><span>Salud de cuenta</span><strong><OSStatus status={client.status} /></strong></div>
        <div><span>Próximo hito</span><strong>{client.nextMilestone.label}</strong><small className={client.nextMilestone.overdue ? sc.overdue : s.cellSub}>{client.nextMilestone.date}</small></div>
        <div><span>Servicios activos</span><strong>{servicesOf(client.slug).length}</strong></div>
        <div><span>Proyectos vinculados</span><strong>{projectCount}</strong></div>
      </section>

      <div className={m.summaryGrid}>
        <div className={sc.stack}>
          <section className={s.surface} aria-labelledby="account-context">
            <div className={s.cardHead}><h2 id="account-context">Contexto de la cuenta</h2><span className={s.cardMeta}>Actualizado {client.context.updated}</span></div>
            <div className={sc.cardBody}>
              <p style={{ margin: 0, lineHeight: 1.6 }}>{client.context.text}</p>
              <div className={m.factGrid}>
                <div className={m.fact}><span>Objetivo del trimestre</span><strong>{client.context.objective}</strong></div>
                <div className={m.fact}><span>Canales principales</span><strong>{client.context.channels}</strong></div>
                <div className={m.fact}><span>Próxima reunión</span><strong>{client.context.nextMeeting}</strong></div>
                <div className={m.fact}><span>Contexto documentado</span><strong>{depth ? `${depth.context}% disponible` : "Pendiente de medición"}</strong></div>
              </div>
            </div>
          </section>

          <section className={s.surface} aria-labelledby="next-steps-title">
            <div className={s.cardHead}><h2 id="next-steps-title">Próximos pasos</h2><span className={s.cardMeta}>Acciones operativas con responsable</span></div>
            <ol className={sc.stepList}>
              {client.nextSteps.map((step, index) => <li key={step.title}><span className={sc.stepNum}>{String(index + 1).padStart(2, "0")}</span><span>{step.title}</span><span>{step.owner}</span><span>{step.due}</span></li>)}
            </ol>
          </section>

          <section className={s.surface} aria-labelledby="linked-work-title">
            <div className={s.cardHead}><h2 id="linked-work-title">Trabajo vinculado</h2><span className={s.cardMeta}>Acceso contextual, no navegación global</span></div>
            {projects.length ? projects.map((project) => (
              <div className={sc.projectItem} key={project.slug}>
                <div className={sc.projectTop}><Link className={s.linkInk} href={`/v2/proyectos/${project.slug}`}>{project.name}</Link><OSStatus status={project.status} /></div>
                <span className={sc.meta}>{project.owner} · Entrega {project.delivery}{project.alert ? ` · ${project.alert}` : ""}</span>
              </div>
            )) : <OSEmptyState icon="registro" title="Sin trabajo vinculado">Los entregables se crean dentro del módulo de servicio correspondiente.</OSEmptyState>}
          </section>
        </div>

        <aside className={sc.stack} aria-label="Equipo y datos de cuenta">
          <section className={s.surface}>
            <div className={s.cardHead} style={{ borderBottom: 0 }}><h2 style={{ fontSize: 18 }}>Equipo Avans · Burbuja {client.bubble}</h2></div>
            <ul className={sc.people}>{client.team.map((person) => <li key={person.name}><Avatar name={person.name} size="md" tone={person.name === client.owner ? "dark" : undefined} /><div><strong>{person.name}</strong>{person.role}</div></li>)}</ul>
          </section>
          <section className={s.surface}>
            <div className={s.cardHead} style={{ borderBottom: 0 }}><h2 style={{ fontSize: 18 }}>Contactos del cliente</h2></div>
            <ul className={sc.people}>{client.contacts.map((person) => <li key={person.name}><div><strong>{person.name}</strong>{person.role}</div></li>)}</ul>
          </section>
          <section className={s.surface}>
            <div className={s.cardHead} style={{ borderBottom: 0 }}><h2 style={{ fontSize: 18 }}>Datos comerciales</h2></div>
            <div className={sc.cardBody} style={{ paddingTop: 0 }}>
              <div className={m.factGrid}>
                <div className={m.fact}><span>Fee mensual</span><strong>{role === "admin" ? formatMoney(client.feeMonthly) : <RestrictedValue />}</strong></div>
                <div className={m.fact}><span>Contrato hasta</span><strong>{client.contractUntil}</strong></div>
              </div>
              <p className={s.demoNote} style={{ margin: 0 }}>La restricción actual es una vista previa en frontend. Falta aplicar permisos en servidor y base de datos antes de producción.</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ClientSheetView({ client, depth }: { client: OsClient; depth?: ClientDepth }) {
  return (
    <div className={sc.stack}>
      <div className={s.pageHead}>
        <div><h2 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Ficha estructurada del cliente</h2><p>Base común para discovery, benchmark, estrategia, módulos operativos y futuras presentaciones.</p></div>
        <button type="button" className={buttonClass("secondary", true)} disabled title="Requiere persistencia">Editar ficha</button>
      </div>
      <section className={m.factGrid} aria-label="Definición del negocio">
        <div className={m.fact}><span>Definición del negocio</span><strong>{client.context.text}</strong></div>
        <div className={m.fact}><span>Objetivo actual</span><strong>{client.context.objective}</strong></div>
        <div className={m.fact}><span>Canales y puntos de contacto</span><strong>{client.context.channels}</strong></div>
        <div className={m.fact}><span>Responsable de cuenta</span><strong>{client.owner} · Burbuja {client.bubble}</strong></div>
      </section>

      <div className={m.managementCards}>
        <article className={m.managementCard}><h3>Negocio y objetivos</h3><p>{depth?.primaryObjective ?? client.context.objective}</p><span className={s.cellSub}>{depth?.knowledge.find((item) => item.label === "Negocio y objetivos")?.completeness ?? 0}% documentado</span></article>
        <article className={m.managementCard}><h3>Documentación y fuentes</h3><p>{depth ? `${depth.sources.length} referencias indexadas con origen y fecha de actualización.` : "Todavía no se cargaron fuentes estructuradas."}</p><span className={s.cellSub}>Drive, reuniones, briefs y resultados deben conservar su fuente.</span></article>
        <article className={m.managementCard}><h3>Preparación para presentación</h3><p>La información queda separada en campos reutilizables para generar documentos sin volver a interpretar texto libre.</p><span className={s.cellSub}>Generación automática todavía no implementada.</span></article>
      </div>

      {depth ? (
        <section className={s.surface} aria-labelledby="coverage-title">
          <div className={s.cardHead}><h2 id="coverage-title">Cobertura de conocimiento</h2><span className={s.cardMeta}>{depth.context}% de contexto disponible</span></div>
          {depth.knowledge.map((item) => (
            <div className={sc.projectItem} key={item.label}>
              <div className={sc.projectTop}><span>{item.label}</span><Badge tone={item.status === "Listo" ? "cool" : "peach"}>{item.status}</Badge></div>
              <span className={sc.meta}>{item.completeness}% · {item.provenance} · {item.detail}</span>
            </div>
          ))}
        </section>
      ) : <OSEmptyState icon="registro" title="Ficha sin relevamiento profundo">La estructura está lista; faltan fuentes y persistencia real.</OSEmptyState>}
    </div>
  );
}

function BenchmarkView({ client, benchmark }: { client: OsClient; benchmark?: ClientBenchmark }) {
  if (!benchmark) return <OSEmptyState icon="busqueda" title="Todavía no hay benchmark para esta cuenta">El relevamiento debe cargarse con fuente, fecha y responsable.</OSEmptyState>;
  return (
    <div className={sc.stack}>
      <div className={s.pageHead}>
        <div><h2 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Benchmark competitivo</h2><p>{benchmark.summary} · Último relevamiento: {benchmark.lastScan}.</p></div>
        <LinkButton href={`/v2/clientes/${client.slug}/benchmark`} variant="dark" small>Abrir análisis completo</LinkButton>
      </div>
      <section className={s.surface}>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <caption>Comparación por dimensión · datos de demostración</caption>
            <thead><tr><th>Dimensión</th><th>{client.name}</th><th>Promedio competidores</th><th>Lectura</th></tr></thead>
            <tbody>{benchmark.dimensions.map((item) => <tr key={item.label}><td>{item.label}</td><td>{item.clientScore}</td><td>{item.benchmarkScore}</td><td className={s.cellSub}>{item.note}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <div className={m.managementCards}>
        {benchmark.opportunities.map((item) => <article className={m.managementCard} key={item.title}><h3>{item.title}</h3><p>{item.rationale}</p><Badge tone={item.state === "Validada" ? "cool" : "peach"}>{item.state}</Badge></article>)}
      </div>
      <p className={s.demoNote}>El escaneo semanal no se presenta como activo: todavía falta una automatización real, historial persistente y evidencia de ejecución.</p>
    </div>
  );
}

function StrategyView({ client }: { client: OsClient }) {
  const plan = strategyByClient[client.slug];
  const recommendations = recommendationsForClient(client.slug);
  return (
    <div className={sc.stack}>
      <div className={s.pageHead}>
        <div><h2 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Estrategia y coordinación</h2><p>Consolida el plan general y las recomendaciones segmentadas que luego trabaja cada líder técnico.</p></div>
        {client.services.includes("estrategia") ? <LinkButton href={serviceHref(client.slug, "estrategia")} variant="dark" small>Abrir módulo operativo</LinkButton> : null}
      </div>

      {plan ? (
        <>
          <section className={sc.commercial}>
            <p className={s.rotulo} style={{ color: "var(--av-coral-200)" }}>Posicionamiento · {plan.period}</p>
            <p style={{ fontSize: 18, lineHeight: 1.5 }}>{plan.positioning}</p>
          </section>
          <div className={m.managementCards}>
            {plan.pillars.map((pillar) => <article className={m.managementCard} key={pillar.title}><h3>{pillar.title}</h3><p>{pillar.detail}</p></article>)}
          </div>
        </>
      ) : <OSEmptyState icon="objetivo" title="Plan general en preparación">La estructura queda lista para posicionamiento, audiencias, pilares, canales, KPIs e hitos.</OSEmptyState>}

      <section className={s.surface} aria-labelledby="recommendations-title">
        <div className={s.cardHead}><h2 id="recommendations-title">Recomendaciones consolidadas por servicio</h2><span className={s.cardMeta}>Datos de demostración · no generados por una IA activa</span></div>
        {recommendations.length ? recommendations.map((item) => (
          <div className={sc.projectItem} key={item.id}>
            <div className={sc.projectTop}><span>{item.title}</span><Badge tone={recommendationTone(item.status)}>{item.status}</Badge></div>
            <span>{item.rationale}</span>
            <span className={sc.meta}>{serviceLabel(item.serviceId)} · {item.source} · Prioridad {item.priority} · {item.id}</span>
            <Link className={s.link} href={serviceHref(client.slug, item.serviceId)}>Abrir en {serviceLabel(item.serviceId)}</Link>
          </div>
        )) : <OSEmptyState icon="idea" title="Sin recomendaciones cargadas">Las recomendaciones deben nacer dentro de un servicio y consolidarse acá.</OSEmptyState>}
      </section>
    </div>
  );
}

function ReportsHealthView({ client }: { client: OsClient }) {
  const { role } = useOsStore();
  const plan = strategyByClient[client.slug];
  return (
    <div className={sc.stack}>
      <div className={s.pageHead}><div><h2 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Reportes y salud de la cuenta</h2><p>Lectura gerencial del cliente con acceso condicionado por rol.</p></div></div>
      <section className={m.healthStrip}>
        <div><span>Estado</span><strong><OSStatus status={client.status} /></strong></div>
        <div><span>Próximo hito</span><strong>{client.nextMilestone.label}</strong><small className={client.nextMilestone.overdue ? sc.overdue : s.cellSub}>{client.nextMilestone.date}</small></div>
        <div><span>Fee mensual</span><strong>{role === "admin" ? formatMoney(client.feeMonthly) : <RestrictedValue />}</strong></div>
        <div><span>Contrato hasta</span><strong>{client.contractUntil}</strong></div>
      </section>
      {plan ? (
        <section className={s.surface}>
          <div className={s.cardHead}><h2>KPIs del plan</h2><span className={s.cardMeta}>{plan.period}</span></div>
          <div className={s.tableWrap}><table className={s.table}><thead><tr><th>KPI</th><th>Meta</th><th>Estado actual</th></tr></thead><tbody>{plan.kpis.map((item) => <tr key={item.label}><td>{item.label}</td><td>{item.target}</td><td>{item.current}</td></tr>)}</tbody></table></div>
        </section>
      ) : <OSEmptyState icon="datos" title="Todavía no hay KPIs estructurados">Primero debe validarse el plan general de la cuenta.</OSEmptyState>}
      <p className={s.demoNote}>La visibilidad financiera todavía se simula en frontend. Antes de producción debe aplicarse control de acceso en servidor, consultas y políticas de base de datos.</p>
    </div>
  );
}
