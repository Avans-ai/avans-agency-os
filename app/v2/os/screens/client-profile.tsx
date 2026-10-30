"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, type KeyboardEvent } from "react";
import type { ClientBenchmark } from "../../benchmark-data";
import type { ClientDepth } from "../../client-depth-data";
import { AvansIcon, type AvansIconName } from "../brand";
import { Glyph } from "../glyphs";
import { knowledgeByClient, type OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { formatMoney, getProject, pendingApprovals, projectProgress, projectsOf, tasksOf } from "../selectors";
import { ApprovalRow } from "../task-blocks";
import { Avatar, Badge, buttonClass, cx, LinkButton, OSEmptyState, OSStatus, Progress, RestrictedValue, Rotulo } from "../ui";
import s from "../os.module.css";
import sc from "../screens.module.css";

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "proyectos", label: "Proyectos" },
  { id: "conocimiento", label: "Conocimiento" },
  { id: "benchmark", label: "Benchmark" },
  { id: "aprobaciones", label: "Aprobaciones", iteration: true },
  { id: "reportes", label: "Reportes", iteration: true },
] as const;
type TabId = (typeof TABS)[number]["id"];

const SOURCE_ICON: Record<string, AvansIconName> = { Contexto: "registro", Resultados: "datos", Reuniones: "plazo", Memoria: "idea" };

export function ClientProfile({ client, depth, benchmark }: { client: OsClient; depth?: ClientDepth; benchmark?: ClientBenchmark }) {
  const { tasks, notify } = useOsStore();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = params.get("tab");
  const tab: TabId = TABS.some(item => item.id === requested) ? requested as TabId : "resumen";
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const projects = projectsOf(client.slug);
  const approvals = pendingApprovals(tasks).filter(item => getProject(item.projectSlug)?.clientSlug === client.slug);

  function select(id: TabId, focus = false) {
    const next = new URLSearchParams(params.toString());
    if (id === "resumen") next.delete("tab"); else next.set("tab", id);
    const query = next.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    if (focus) tabRefs.current[id]?.focus();
  }
  function onTabKey(event: KeyboardEvent, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;
    event.preventDefault();
    select(TABS[next].id, true);
  }

  return (
    <>
      <div className={sc.profileHead}>
        <div className={sc.identity}>
          <span className={sc.bigInitials} aria-hidden="true">{client.initials}</span>
          <div>
            <h1>{client.name} <OSStatus status={client.status} /></h1>
            <p>Cliente desde {client.since} · Burbuja {client.bubble} · Responsable <strong>{client.owner}</strong> · {projects.length} {projects.length === 1 ? "proyecto activo" : "proyectos activos"}</p>
          </div>
        </div>
        <div className={s.actions}>
          <button type="button" className={buttonClass("ghost")} onClick={() => notify("Registrar reunión: pendiente de implementación")}><AvansIcon name="dialogo" size={18} />Registrar reunión</button>
          <button type="button" className={buttonClass("secondary")} onClick={() => notify("Carpeta en Drive: pendiente de integración con Google Drive")}><AvansIcon name="enlace" size={18} />Carpeta en Drive</button>
          <button type="button" className={buttonClass("primary")} onClick={() => notify("Nuevo proyecto: pendiente de implementación (requiere persistencia)")}><AvansIcon name="chispa" size={18} />Nuevo proyecto</button>
        </div>
        <div className={sc.tabs} role="tablist" aria-label={`Secciones de ${client.name}`}>
          {TABS.map((item, index) => {
            const count = item.id === "proyectos" ? projects.length : item.id === "aprobaciones" ? approvals.length : null;
            return (
              <button
                key={item.id}
                ref={node => { tabRefs.current[item.id] = node; }}
                id={`tab-${item.id}`}
                type="button"
                role="tab"
                className={sc.tab}
                aria-selected={tab === item.id}
                aria-controls={`panel-${item.id}`}
                tabIndex={tab === item.id ? 0 : -1}
                onClick={() => select(item.id)}
                onKeyDown={event => onTabKey(event, index)}
              >
                {item.label}
                {count !== null ? <span className={sc.tabCount}>{count}</span> : null}
                {"iteration" in item ? <span className={sc.iterTag}>Iteración 2</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0} className={cx(sc.profileBody, tab !== "resumen" && sc.profileBodyFull)}>
        {tab === "resumen" ? <Summary client={client} depth={depth} onProjectsTab={() => select("proyectos")} /> : null}
        {tab === "proyectos" ? <Projects client={client} depth={depth} /> : null}
        {tab === "conocimiento" ? <Knowledge client={client} depth={depth} /> : null}
        {tab === "benchmark" ? <Benchmark client={client} benchmark={benchmark} /> : null}
        {tab === "aprobaciones" ? (
          <div className={sc.stack}>
            <p className={s.demoNote} style={{ margin: 0 }}>Vista provisoria: el diseño de esta pestaña corresponde a la iteración 2. Muestra las aprobaciones pendientes de los proyectos de {client.name}.</p>
            <section className={s.surface} aria-label="Aprobaciones pendientes">
              {approvals.length ? approvals.map(item => <ApprovalRow key={item.id} item={item} actions="decide" />) : <OSEmptyState icon="chispa" title="No hay aprobaciones pendientes">Cuando el equipo pida revisar una entrega de esta cuenta, aparece acá.</OSEmptyState>}
            </section>
          </div>
        ) : null}
        {tab === "reportes" ? (
          <div className={sc.stack}>
            <p className={s.demoNote} style={{ margin: 0 }}>Vista provisoria: el diseño de esta pestaña corresponde a la iteración 2. Los espacios de trabajo existentes por cliente se conservan.</p>
            <div className={sc.settingsGrid}>
              {[
                { href: `/v2/clientes/${client.slug}/reportes`, title: "Reportes operativos", text: "Cierre del período, fuentes, insights y versión cliente." },
                { href: `/v2/clientes/${client.slug}/contenido`, title: "Producción", text: "Planificación, piezas en revisión y feedback de la cuenta." },
                { href: `/v2/clientes/${client.slug}/campanas`, title: "Campañas", text: "Objetivos, guardrails, señales y recomendaciones." },
              ].map(item => <Link key={item.href} href={item.href} className={sc.settingsCard}><h2>{item.title}</h2><p>{item.text}</p><span className={s.kpiCta}>Abrir <Glyph name="arrow-right" size={13} /></span></Link>)}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

function Summary({ client, depth, onProjectsTab }: { client: OsClient; depth?: ClientDepth; onProjectsTab: () => void }) {
  const { tasks, role } = useOsStore();
  const projects = projectsOf(client.slug);
  return (
    <>
      <div className={sc.stack}>
        <section className={s.surface} aria-labelledby="context-title">
          <div className={s.cardHead} style={{ borderBottom: 0, paddingBottom: 0 }}><h2 id="context-title">Contexto de la cuenta</h2><span className={s.cardMeta}>Actualizado {client.context.updated}</span></div>
          <div className={sc.cardBody}>
            <p style={{ margin: 0, lineHeight: 1.55 }}>{client.context.text}</p>
            <div className={sc.contextFacts}>
              <div><span>Objetivo del trimestre</span><strong style={{ fontWeight: 400 }}>{client.context.objective}</strong></div>
              <div><span>Canales principales</span><strong style={{ fontWeight: 400 }}>{client.context.channels}</strong></div>
              <div><span>Próxima reunión</span><strong style={{ fontWeight: 400 }}>{client.context.nextMeeting}</strong></div>
            </div>
          </div>
        </section>

        <section className={s.surface} aria-labelledby="active-projects">
          <div className={s.cardHead}><h2 id="active-projects">Proyectos activos</h2><button type="button" className={buttonClass("ghost")} onClick={onProjectsTab}>Ver pestaña Proyectos</button></div>
          <ProjectsTable projects={projects} progress={slug => projectProgress(slug, tasks)} />
        </section>

        <section className={s.surface} aria-labelledby="next-steps">
          <div className={s.cardHead}><h2 id="next-steps">Próximos pasos</h2></div>
          <ol className={sc.stepList}>
            {client.nextSteps.map((step, index) => (
              <li key={step.title}><span className={sc.stepNum}>{String(index + 1).padStart(2, "0")}</span><span>{step.title}</span><span>{step.owner}</span><span>{step.due}</span></li>
            ))}
          </ol>
        </section>
      </div>

      <aside className={sc.stack} aria-label="Equipo, contactos y datos comerciales">
        <section className={s.surface} aria-labelledby="team-title">
          <div className={s.cardHead} style={{ borderBottom: 0 }}><h2 id="team-title" style={{ fontSize: 18 }}>Equipo Avans · Burbuja {client.bubble}</h2></div>
          <ul className={sc.people}>{client.team.map(person => <li key={person.name}><Avatar name={person.name} size="md" tone={person.name === client.owner ? "dark" : undefined} /><div><strong>{person.name}</strong>{person.role}</div></li>)}</ul>
        </section>
        <section className={s.surface} aria-labelledby="contacts-title">
          <div className={s.cardHead} style={{ borderBottom: 0 }}><h2 id="contacts-title" style={{ fontSize: 18 }}>Contactos del cliente</h2></div>
          <ul className={sc.people}>{client.contacts.map(person => <li key={person.name}><div><strong>{person.name}</strong>{person.role}</div></li>)}</ul>
        </section>
        <section className={s.surface} aria-labelledby="services-title">
          <div className={s.cardHead} style={{ borderBottom: 0 }}><h2 id="services-title" style={{ fontSize: 18 }}>Servicios contratados</h2></div>
          <div className={sc.serviceTags}>{client.services.map(service => <Badge key={service} tone="stone">{service}</Badge>)}</div>
        </section>
        {role === "admin" ? (
          <section className={sc.commercial} aria-labelledby="commercial-title">
            <h2 id="commercial-title"><Glyph name="lock" size={16} />Datos comerciales</h2>
            <p>Visible para Administrador y Gerencia. Fuente: Finanzas.</p>
            <div className={sc.commercialGrid}>
              <div><span>Fee mensual</span><strong>{formatMoney(client.feeMonthly)}</strong></div>
              <div><span>Contrato hasta</span><strong>{client.contractUntil}</strong></div>
            </div>
            {depth ? <p>{depth.commercial.serviceStatus} · {depth.commercial.nextReview}. {depth.commercial.billingStatus}.</p> : null}
          </section>
        ) : (
          <section className={s.surface} aria-labelledby="commercial-title">
            <div className={s.cardHead} style={{ borderBottom: 0 }}><h2 id="commercial-title" style={{ fontSize: 18 }}>Datos comerciales</h2></div>
            <div className={sc.cardBody} style={{ paddingTop: 0 }}>
              <div className={sc.commercialGrid}>
                <div style={{ background: "var(--av-bg)", padding: 12 }}><span className={s.cellSub}>Fee mensual</span><RestrictedValue /></div>
                <div style={{ background: "var(--av-bg)", padding: 12 }}><span className={s.cellSub}>Contrato hasta</span><strong style={{ fontWeight: 500 }}>{client.contractUntil}</strong></div>
              </div>
              <p className={s.demoNote} style={{ margin: 0 }}>Vista previa de rol operativo: los montos no se muestran. Cuando exista backend, se filtrarán en el servidor.</p>
            </div>
          </section>
        )}
      </aside>
    </>
  );
}

function ProjectsTable({ projects, progress }: { projects: ReturnType<typeof projectsOf>; progress: (slug: string) => number }) {
  if (!projects.length) return <OSEmptyState icon="registro" title="Esta cuenta todavía no tiene proyectos" />;
  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <thead><tr><th scope="col">Proyecto</th><th scope="col">Responsable</th><th scope="col">Avance</th><th scope="col">Estado</th><th scope="col">Entrega</th></tr></thead>
        <tbody>
          {projects.map(project => (
            <tr key={project.slug}>
              <td><Link className={s.linkInk} href={`/v2/proyectos/${project.slug}`}>{project.name}</Link></td>
              <td>{project.owner}</td>
              <td style={{ minWidth: 150 }}><Progress value={progress(project.slug)} label={`Avance de ${project.name}`} /></td>
              <td><OSStatus status={project.status} /></td>
              <td>{project.delivery}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Projects({ client, depth }: { client: OsClient; depth?: ClientDepth }) {
  const { tasks } = useOsStore();
  const projects = projectsOf(client.slug);
  return (
    <div className={sc.stack}>
      <section className={s.surface} aria-labelledby="projects-title">
        <div className={s.cardHead}><h2 id="projects-title">Proyectos de {client.name}</h2><span className={s.cardMeta}>{projects.reduce((sum, project) => sum + tasksOf(tasks, project.slug).length, 0)} tareas registradas</span></div>
        <ProjectsTable projects={projects} progress={slug => projectProgress(slug, tasks)} />
      </section>
      {depth ? (
        <div className={sc.twoCols}>
          <section className={s.surface} aria-labelledby="streams-title">
            <div className={s.cardHead}><h2 id="streams-title">Frentes operativos</h2><span className={s.cardMeta}>{depth.workstreams.length} frentes</span></div>
            {depth.workstreams.map(item => (
              <div className={sc.projectItem} key={item.title}>
                <div className={sc.projectTop}>{item.href ? <Link className={s.linkInk} href={item.href}>{item.title}</Link> : <span>{item.title}</span>}<Badge tone={item.status === "Atención" ? "peach" : item.status === "Aprobación" ? "info" : "stone"}>{item.status}</Badge></div>
                <span className={sc.meta}>{item.area} · {item.owner} · {item.stage} · Próximo: {item.next}</span>
              </div>
            ))}
          </section>
          <section className={s.surface} aria-labelledby="actions-title">
            <div className={s.cardHead}><h2 id="actions-title">Acciones abiertas</h2><span className={s.cardMeta}>Detectadas por el sistema</span></div>
            {depth.actions.map(item => (
              <div className={sc.projectItem} key={item.title}>
                <span>{item.title}</span>
                <span className={sc.meta}>{item.source} · {item.owner} · {item.due} · Prioridad {item.priority}</span>
              </div>
            ))}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Knowledge({ client, depth }: { client: OsClient; depth?: ClientDepth }) {
  const { notify } = useOsStore();
  const groups = knowledgeByClient[client.slug] ?? (depth ? Object.entries(depth.sources.reduce<Record<string, ClientDepth["sources"]>>((acc, source) => {
    (acc[source.category] ??= []).push(source);
    return acc;
  }, {})).map(([category, items]) => ({ title: category, icon: SOURCE_ICON[category] ?? "registro", count: items.length, source: items.map(item => item.origin).join(" · "), items: items.map(item => ({ label: item.title, meta: item.updated })) })) : []);
  return (
    <div className={sc.stack}>
      <div className={s.pageHead}>
        <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 400 }}>Conocimiento del cliente</h2><p>Dónde está cada cosa. Los archivos viven en su herramienta de origen; acá se indexan y se enlazan.</p></div>
        <button type="button" className={buttonClass("secondary", true)} onClick={() => notify("Agregar referencia: pendiente de implementación")}><AvansIcon name="enlace" size={18} />Agregar referencia</button>
      </div>
      {groups.length ? (
        <div className={sc.knowledgeGrid}>
          {groups.map(group => (
            <section className={sc.knowledgeCard} key={group.title} aria-label={group.title}>
              <h3><AvansIcon name={group.icon as AvansIconName} size={22} /><span>{group.title}</span><span>{group.count}</span></h3>
              <p className={s.cellSub} style={{ margin: 0 }}>{group.source}</p>
              <ul className={sc.docList}>{group.items.map(item => <li key={item.label}><span>{item.label}</span><span>{item.meta}</span></li>)}</ul>
            </section>
          ))}
        </div>
      ) : <OSEmptyState icon="registro" title="Sin referencias todavía">Agregá briefs, documentos o minutas para que el equipo los encuentre desde la ficha.</OSEmptyState>}
      {depth ? (
        <div className={sc.twoCols}>
          <section className={s.surface} aria-labelledby="coverage-title">
            <div className={s.cardHead}><h2 id="coverage-title">Memoria de la cuenta</h2><span className={s.cardMeta}>{depth.context}% disponible</span></div>
            {depth.knowledge.map(item => (
              <div className={sc.coverage} key={item.label}>
                <span className={s.cellMain}><span>{item.label}</span><span className={s.cellSub}>{item.provenance} · {item.detail}</span></span>
                <Progress value={item.completeness} label={`Cobertura de ${item.label}`} />
                <Badge tone={item.status === "Listo" ? "cool" : "peach"}>{item.status}</Badge>
              </div>
            ))}
          </section>
          <section className={s.surface} aria-labelledby="decisions-title">
            <div className={s.cardHead}><h2 id="decisions-title">Memoria de decisiones</h2></div>
            {depth.decisions.map(item => (
              <div className={sc.projectItem} key={item.title}>
                <span>{item.title}</span>
                <span className={sc.meta}>{item.date} · {item.source} · {item.detail}</span>
              </div>
            ))}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Benchmark({ client, benchmark }: { client: OsClient; benchmark?: ClientBenchmark }) {
  const { notify } = useOsStore();
  if (!benchmark) {
    return <OSEmptyState icon="busqueda" title="Todavía no hay benchmark para esta cuenta">El relevamiento competitivo se carga desde Operaciones › Clientes.</OSEmptyState>;
  }
  return (
    <div className={sc.stack}>
      <div className={s.pageHead}>
        <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 400 }}>Benchmark competitivo</h2><p>Último relevamiento: {benchmark.lastScan} · {benchmark.monitoredCompetitors} competidores monitoreados. {benchmark.summary}</p></div>
        <div className={s.actions}>
          <button type="button" className={buttonClass("secondary", true)} onClick={() => notify("Actualizar relevamiento: pendiente de integración")}><Glyph name="retry" size={16} />Actualizar relevamiento</button>
          <LinkButton href={`/v2/clientes/${client.slug}/benchmark`} variant="dark" small>Abrir benchmark completo</LinkButton>
        </div>
      </div>
      <section className={s.surface} aria-label="Comparación por dimensión">
        <div className={s.tableWrap}>
          <table className={s.table}>
            <caption>Puntaje 0–100 por dimensión · datos de demostración</caption>
            <thead><tr><th scope="col">Dimensión</th><th scope="col">{client.name}</th><th scope="col">Promedio competidores</th><th scope="col" className={s.num}>Diferencia</th><th scope="col">Lectura</th></tr></thead>
            <tbody>
              {benchmark.dimensions.map(item => (
                <tr key={item.label}>
                  <td>{item.label}</td>
                  <td style={{ minWidth: 140 }}><span className={sc.scoreBar}><span><i className={sc.clientBar} style={{ width: `${item.clientScore}%` }} /></span>{item.clientScore}</span></td>
                  <td style={{ minWidth: 140 }}><span className={sc.scoreBar}><span><i style={{ width: `${item.benchmarkScore}%` }} /></span>{item.benchmarkScore}</span></td>
                  <td className={s.num}>{item.clientScore - item.benchmarkScore > 0 ? "+" : ""}{item.clientScore - item.benchmarkScore}</td>
                  <td className={s.cellSub} style={{ minWidth: 260 }}>{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className={s.surface} aria-label="Competidores monitoreados">
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th scope="col">Competidor</th><th scope="col">Tipo</th><th scope="col">Posicionamiento</th><th scope="col">Fortaleza</th><th scope="col">Actividad</th></tr></thead>
            <tbody>{benchmark.competitors.map(item => <tr key={item.name}><td style={{ fontWeight: 500 }}>{item.name}</td><td>{item.type}</td><td>{item.positioning}</td><td>{item.strength}</td><td>{item.activity}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <div className={sc.twoCols}>
        <section className={sc.findings} aria-labelledby="findings-title">
          <h3 id="findings-title">Hallazgos</h3>
          <ul>{benchmark.signals.map(signal => <li key={signal.id}><strong style={{ fontWeight: 600 }}>{signal.competitor}:</strong> {signal.title}. <span>Impacto {signal.impact.toLowerCase()} · {signal.status}.</span></li>)}</ul>
        </section>
        <section className={s.surface} aria-labelledby="opps-title">
          <div className={s.cardHead}><h2 id="opps-title" style={{ fontSize: 18 }}>Oportunidades</h2></div>
          {benchmark.opportunities.map(item => (
            <div className={sc.projectItem} key={item.title}>
              <div className={sc.projectTop}><span>{item.title}</span><Badge tone={item.state === "Validada" ? "cool" : item.state === "En análisis" ? "peach" : "stone"}>{item.state}</Badge></div>
              <span className={sc.meta}>{item.owner} · {item.rationale}</span>
            </div>
          ))}
          {client.slug === "epsa" ? (
            <div className={sc.projectItem}>
              <Rotulo ink>Convertidas en tareas</Rotulo>
              <Link className={s.linkInk} href="/v2/proyectos/lanzamiento-line-up-2027?task=T-144">T-144 Copys con ángulo de posventa</Link>
              <Link className={s.linkInk} href="/v2/proyectos/lanzamiento-line-up-2027?task=T-143">T-143 Brief de pauta LinkedIn y Meta</Link>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
