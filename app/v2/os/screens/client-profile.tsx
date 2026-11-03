"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { ClientBenchmark } from "../../benchmark-data";
import type { ClientDepth } from "../../client-depth-data";
import { AvansIcon, AvansModuleIcon, type AvansIconName } from "../brand";
import { Glyph } from "../glyphs";
import { IDEA_STATES, knowledgeByClient, serviceCatalog, serviceLabel, strategyByClient, supportRequests, type IdeaState, type OsClient, type ServiceId } from "../os-data";
import { useOsStore } from "../os-store";
import { MarketingDiscovery } from "../marketing-discovery";
import { formatMoney, getProject, pendingApprovals, projectProgress, projectsOf, tasksOf } from "../selectors";
import { OSModal } from "../overlays";
import { ApprovalRow } from "../task-blocks";
import { Avatar, Badge, buttonClass, cx, LinkButton, OSEmptyState, OSPriority, OSStatus, Progress, RestrictedValue, Rotulo } from "../ui";
import s from "../os.module.css";
import sc from "../screens.module.css";

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "conocimiento", label: "Discovery / Conocimiento" },
  { id: "benchmark", label: "Benchmark" },
  { id: "estrategia", label: "Estrategia y plan MKT" },
  { id: "proyectos", label: "Proyectos y centro de ideas" },
  { id: "servicios", label: "Servicios activos" },
  { id: "reportes", label: "Reportes" },
  { id: "soporte", label: "Soporte" },
] as const;
type TabId = (typeof TABS)[number]["id"];
/** Links shared before this menu existed keep working. */
const TAB_ALIASES: Record<string, TabId> = { aprobaciones: "proyectos", discovery: "conocimiento", ideas: "proyectos" };

const SOURCE_ICON: Record<string, AvansIconName> = { Contexto: "registro", Resultados: "datos", Reuniones: "plazo", Memoria: "idea" };

export function ClientProfile({ client, depth, benchmark }: { client: OsClient; depth?: ClientDepth; benchmark?: ClientBenchmark }) {
  const { notify, servicesOf } = useOsStore();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = params.get("tab") ?? "";
  const tab: TabId = TABS.some(item => item.id === requested) ? requested as TabId : TAB_ALIASES[requested] ?? "resumen";
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const projects = projectsOf(client.slug);
  useEffect(() => {
    // Keep the selected tab visible in the scrollable strip (mobile/tablet).
    const node = tabRefs.current[tab];
    const strip = node?.parentElement;
    if (node && strip) strip.scrollLeft = Math.max(0, node.offsetLeft - strip.offsetLeft - 16);
  }, [tab]);
  const openSupport = supportRequests.filter(item => item.clientSlug === client.slug && item.status !== "Resuelta").length;

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
            const count = item.id === "proyectos" ? projects.length : item.id === "servicios" ? servicesOf(client.slug).length : item.id === "soporte" && openSupport ? openSupport : null;
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
              </button>
            );
          })}
        </div>
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0} className={cx(sc.profileBody, tab !== "resumen" && sc.profileBodyFull)}>
        {tab === "resumen" ? <Summary client={client} depth={depth} onProjectsTab={() => select("proyectos")} onServicesTab={() => select("servicios")} /> : null}
        {tab === "conocimiento" ? <Knowledge client={client} depth={depth} /> : null}
        {tab === "benchmark" ? <Benchmark client={client} benchmark={benchmark} /> : null}
        {tab === "estrategia" ? <Strategy client={client} benchmark={benchmark} /> : null}
        {tab === "proyectos" ? <ProjectsAndIdeas client={client} depth={depth} /> : null}
        {tab === "servicios" ? <Services client={client} /> : null}
        {tab === "reportes" ? <Reports client={client} /> : null}
        {tab === "soporte" ? <Support client={client} /> : null}
      </div>
    </>
  );
}

function Summary({ client, depth, onProjectsTab, onServicesTab }: { client: OsClient; depth?: ClientDepth; onProjectsTab: () => void; onServicesTab: () => void }) {
  const { tasks, role, servicesOf } = useOsStore();
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
          <div className={s.cardHead} style={{ borderBottom: 0 }}><h2 id="services-title" style={{ fontSize: 18 }}>Servicios contratados</h2><button type="button" className={buttonClass("ghost")} onClick={onServicesTab}>Ver módulos</button></div>
          <div className={sc.serviceTags}>{servicesOf(client.slug).map(service => <Badge key={service} tone="stone">{serviceLabel(service)}</Badge>)}</div>
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
    <>
    <ul className={sc.mobileList}>
      {projects.map(project => (
        <li key={project.slug}>
          <Link href={`/v2/proyectos/${project.slug}`}>
            <strong style={{ fontWeight: 500 }}>{project.name}</strong>
            <OSStatus status={project.status} />
            <small>{progress(project.slug)}% · Entrega {project.delivery}</small>
          </Link>
        </li>
      ))}
    </ul>
    <div className={cx(s.tableWrap, sc.desktopTable)}>
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
    </>
  );
}

function ProjectsAndIdeas({ client, depth }: { client: OsClient; depth?: ClientDepth }) {
  const { tasks } = useOsStore();
  const projects = projectsOf(client.slug);
  const approvals = pendingApprovals(tasks).filter(item => getProject(item.projectSlug)?.clientSlug === client.slug);
  return (
    <div className={sc.stack}>
      <section className={s.surface} aria-labelledby="projects-title">
        <div className={s.cardHead}><h2 id="projects-title">Proyectos de {client.name}</h2><span className={s.cardMeta}>{projects.reduce((sum, project) => sum + tasksOf(tasks, project.slug).length, 0)} tareas registradas</span></div>
        <ProjectsTable projects={projects} progress={slug => projectProgress(slug, tasks)} />
      </section>
      {approvals.length ? (
        <section className={s.surface} aria-labelledby="client-approvals">
          <div className={s.cardHead}><h2 id="client-approvals">Aprobaciones pendientes</h2><Link className={s.link} href="/v2/aprobaciones">Ver todas las de la agencia</Link></div>
          {approvals.map(item => <ApprovalRow key={item.id} item={item} actions="decide" />)}
        </section>
      ) : null}
      <IdeasCenter client={client} />
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
  const business = depth?.knowledge.find(item => item.label === "Negocio y objetivos");
  return (
    <div className={sc.stack}>
      <section className={s.surface} aria-labelledby="discovery-title">
        <div className={s.cardHead}><h2 id="discovery-title">Discovery</h2><Link className={s.link} href="/v2/discovery">Abrir Discovery en Ventas</Link></div>
        <div className={sc.cardBody}>
          <p style={{ margin: 0, lineHeight: 1.55 }}>{depth?.primaryObjective ?? client.context.text}</p>
          <div className={sc.contextFacts}>
            <div><span>Objetivo del trimestre</span><strong style={{ fontWeight: 400 }}>{client.context.objective}</strong></div>
            <div><span>Canales principales</span><strong style={{ fontWeight: 400 }}>{client.context.channels}</strong></div>
            <div><span>Negocio y objetivos</span><strong style={{ fontWeight: 400 }}>{business ? `${business.completeness}% documentado · ${business.provenance}` : "Por relevar"}</strong></div>
          </div>
          <p className={s.demoNote} style={{ margin: 0 }}>El discovery de prospectos se usa en Ventas. El Marketing Discovery de la cuenta se completa y revisa acá, con un enlace a las fuentes comerciales, sin duplicarlas.</p>
        </div>
      </section>
      <MarketingDiscovery client={client} />
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
        <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 400 }}>Benchmark competitivo</h2><p>Último relevamiento de la demo: {benchmark.lastScan} · {benchmark.monitoredCompetitors} competidores del ejemplo. Escaneo semanal acordado, automatización aún pendiente. {benchmark.summary}</p></div>
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

function IdeasCenter({ client }: { client: OsClient }) {
  const { ideas, addIdea, setIdeaState, notify } = useOsStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState("");
  const own = ideas.filter(idea => idea.clientSlug === client.slug);
  const tone = (state: IdeaState) => state === "Aprobada" ? "cool" : state === "En evaluación" ? "peach" : state === "Descartada" ? "stone" : "info";
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) { setError("Escribí un título para la idea"); return; }
    addIdea(client.slug, title.trim(), detail.trim());
    setTitle(""); setDetail(""); setError(""); setOpen(false);
  }
  return (
    <section className={s.surface} aria-labelledby="ideas-title">
      <div className={s.cardHead}>
        <h2 id="ideas-title">Centro de ideas</h2>
        <button type="button" className={buttonClass("secondary", true)} aria-expanded={open} onClick={() => setOpen(value => !value)}><AvansIcon name="idea" size={18} />Nueva idea</button>
      </div>
      {open ? (
        <form onSubmit={submit} noValidate className={sc.cardBody} style={{ borderBottom: "1px solid var(--av-border)" }}>
          <label className={s.field}>
            <span>Idea <span className={s.req} aria-hidden="true">*</span></span>
            <input className={s.input} value={title} maxLength={140} aria-invalid={Boolean(error)} aria-describedby={error ? "idea-error" : undefined} onChange={event => { setTitle(event.target.value); setError(""); }} placeholder="Qué proponés" />
            {error ? <span className={s.fieldError} id="idea-error"><Glyph name="alert" size={15} />{error}</span> : null}
          </label>
          <label className={s.field}>
            <span>Por qué (opcional)</span>
            <textarea className={s.input} rows={2} value={detail} maxLength={500} onChange={event => setDetail(event.target.value)} placeholder="Dato, aprendizaje o pedido que la origina" />
          </label>
          <div className={s.actions}><button type="submit" className={buttonClass("dark", true)}>Agregar idea</button><button type="button" className={buttonClass("ghost")} onClick={() => setOpen(false)}>Cancelar</button></div>
        </form>
      ) : null}
      {own.length ? own.map(idea => (
        <div className={sc.projectItem} key={idea.id}>
          <div className={sc.projectTop}><span>{idea.id} · {idea.title}</span><Badge tone={tone(idea.state)}>{idea.state}</Badge></div>
          {idea.detail ? <span>{idea.detail}</span> : null}
          <span className={sc.meta}>{idea.source} · {idea.author} · {idea.when}</span>
          <div className={s.actions}>
            <label className={sc.selectWrap} style={{ fontSize: 14 }}>Estado
              <select value={idea.state} onChange={event => setIdeaState(idea.id, event.target.value as IdeaState)}>{IDEA_STATES.map(state => <option key={state}>{state}</option>)}</select>
            </label>
            {idea.state === "Aprobada" ? <button type="button" className={buttonClass("ghost")} onClick={() => notify("Convertir en proyecto: pendiente de implementación (requiere persistencia)")}>Convertir en proyecto</button> : null}
          </div>
        </div>
      )) : <OSEmptyState icon="idea" title="Todavía no hay ideas para esta cuenta">Sumá propuestas que surgen de reuniones, benchmark o aprendizajes; las aprobadas se convierten en proyectos.</OSEmptyState>}
    </section>
  );
}

function Strategy({ client, benchmark }: { client: OsClient; benchmark?: ClientBenchmark }) {
  const { notify } = useOsStore();
  const plan = strategyByClient[client.slug];
  const head = (
    <div className={s.pageHead}>
      <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 400 }}>Estrategia y plan de marketing</h2><p>{plan ? `${plan.period} · Actualizado ${plan.updated}` : "Objetivo, posicionamiento, audiencias, canales y KPIs de la cuenta."}</p></div>
      <button type="button" className={buttonClass("secondary", true)} onClick={() => notify("Editar plan: pendiente de implementación (requiere persistencia)")}>{plan ? "Editar plan" : "Cargar plan"}</button>
    </div>
  );
  if (!plan) {
    return (
      <div className={sc.stack}>
        {head}
        <div className={sc.contextFacts} style={{ background: "var(--av-bg-raised)" }}>
          <div><span>Objetivo del trimestre</span><strong style={{ fontWeight: 400 }}>{client.context.objective}</strong></div>
          <div><span>Canales principales</span><strong style={{ fontWeight: 400 }}>{client.context.channels}</strong></div>
          <div><span>Responsable</span><strong style={{ fontWeight: 400 }}>{client.owner}</strong></div>
        </div>
        <OSEmptyState icon="objetivo" title="El plan de marketing está en preparación">
          Se completa con posicionamiento, audiencias, pilares, canales, KPIs e hitos. {benchmark ? `Ya hay ${benchmark.opportunities.length} oportunidades del benchmark para tomar como insumo.` : ""}
        </OSEmptyState>
      </div>
    );
  }
  return (
    <div className={sc.stack}>
      {head}
      <section className={sc.commercial} aria-label="Posicionamiento">
        <p className={s.rotulo} style={{ color: "var(--av-coral-200)" }}>Posicionamiento</p>
        <p style={{ fontSize: 18, color: "var(--av-paper)", lineHeight: 1.45 }}>{plan.positioning}</p>
      </section>
      <div className={sc.twoCols}>
        <section className={s.surface} aria-labelledby="audiences-title">
          <div className={s.cardHead}><h2 id="audiences-title">Audiencias</h2></div>
          {plan.audiences.map(item => <div className={sc.projectItem} key={item.name}><span style={{ fontWeight: 500 }}>{item.name}</span><span className={sc.meta}>{item.insight}</span></div>)}
        </section>
        <section className={s.surface} aria-labelledby="pillars-title">
          <div className={s.cardHead}><h2 id="pillars-title">Pilares de mensaje</h2></div>
          {plan.pillars.map(item => <div className={sc.projectItem} key={item.title}><span style={{ fontWeight: 500 }}>{item.title}</span><span className={sc.meta}>{item.detail}</span></div>)}
        </section>
      </div>
      <div className={sc.twoCols}>
        <section className={s.surface} aria-label="Canales">
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead><tr><th scope="col">Canal</th><th scope="col">Rol</th><th scope="col" className={s.num}>Inversión</th></tr></thead>
              <tbody>{plan.channels.map(item => <tr key={item.channel}><td>{item.channel}</td><td>{item.role}</td><td className={s.num}>{item.share}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
        <section className={s.surface} aria-label="KPIs">
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead><tr><th scope="col">KPI</th><th scope="col">Meta</th><th scope="col">Hoy</th></tr></thead>
              <tbody>{plan.kpis.map(item => <tr key={item.label}><td>{item.label}</td><td>{item.target}</td><td className={s.cellSub}>{item.current}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </div>
      <section className={s.surface} aria-labelledby="milestones-title">
        <div className={s.cardHead}><h2 id="milestones-title">Hitos del plan</h2></div>
        <ol className={sc.stepList}>{plan.milestones.map((item, index) => <li key={item.what}><span className={sc.stepNum}>{String(index + 1).padStart(2, "0")}</span><span>{item.what}</span><span /><span>{item.when}</span></li>)}</ol>
      </section>
    </div>
  );
}

function Services({ client }: { client: OsClient }) {
  const { servicesOf, setServices } = useOsStore();
  const [configuring, setConfiguring] = useState(false);
  const active = servicesOf(client.slug);
  const activeDefs = serviceCatalog.filter(service => active.includes(service.id));
  const inactive = serviceCatalog.filter(service => !active.includes(service.id));
  return (
    <div className={sc.stack}>
      <div className={s.pageHead}>
        <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 400 }}>Módulos de servicios activos</h2><p>Cada servicio contratado activa su módulo de trabajo en esta ficha. Las cinco marcas celestes del catálogo señalan prioridades para desarrollar, no servicios automáticamente contratados.</p></div>
        <button type="button" className={buttonClass("secondary", true)} onClick={() => setConfiguring(true)}><AvansIcon name="ajuste" size={18} />Configurar servicios</button>
      </div>
      {activeDefs.length ? (
        <div className={sc.settingsGrid}>
          {activeDefs.map(service => {
            const body = (
              <>
                <span className={sc.serviceIcon}><AvansModuleIcon name={service.icon} size={40} /></span>
                <h2>{service.label}</h2>
                <p>{service.id === "contenidos" || service.id === "audiovisuales" ? "Proceso de demostración para revisar con el manual de Operaciones. Controles, responsables y evidencia; todavía no es un flujo aprobado." : service.id === "publicidad-digital" ? "Espacio de Campañas disponible. Proceso operativo pendiente de relevamiento con Gabi." : "Módulo pendiente de documentación: el flujo de este servicio todavía no está definido."}</p>
                <span style={{ marginTop: "auto" }}>{service.workspace ? <span className={s.kpiCta}>Abrir módulo <Glyph name="arrow-right" size={13} /></span> : <Badge tone="stone">Pendiente</Badge>}</span>
              </>
            );
            return service.workspace
              ? <Link key={service.id} href={`/v2/clientes/${client.slug}/${service.workspace}`} className={sc.settingsCard}>{body}</Link>
              : <div key={service.id} className={sc.settingsCard}>{body}</div>;
          })}
        </div>
      ) : <OSEmptyState icon="ajuste" title="Esta cuenta no tiene servicios activos" actions={<button type="button" className={buttonClass("primary", true)} onClick={() => setConfiguring(true)}>Configurar servicios</button>}>Activá los servicios contratados para habilitar sus módulos.</OSEmptyState>}
      {inactive.length ? (
        <section aria-labelledby="catalog-title" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h3 id="catalog-title" className={cx(s.rotulo, s.rotuloInk)}>No contratados</h3>
          <div className={s.tagRow}>{inactive.map(service => <span key={service.id} className={cx(s.badge, s.toneStone)}>{service.label}</span>)}</div>
        </section>
      ) : null}
      {configuring ? <ServicesModal client={client} initial={active} onClose={() => setConfiguring(false)} onSave={next => { setServices(client.slug, next); setConfiguring(false); }} /> : null}
    </div>
  );
}

function ServicesModal({ client, initial, onClose, onSave }: { client: OsClient; initial: ServiceId[]; onClose: () => void; onSave: (services: ServiceId[]) => void }) {
  const [selected, setSelected] = useState<ServiceId[]>(initial);
  const toggle = (id: ServiceId) => setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  return (
    <OSModal
      title={`Servicios de ${client.name}`}
      titleId="services-modal-title"
      onClose={onClose}
      footer={<><button type="button" className={buttonClass("ghost")} onClick={onClose}>Cancelar</button><button type="button" className={buttonClass("primary")} onClick={() => onSave(serviceCatalog.map(item => item.id).filter(id => selected.includes(id)))}>Guardar</button></>}
    >
      <fieldset style={{ border: 0, margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <legend className={s.hint} style={{ marginBottom: 8 }}>Marcá los servicios contratados. Cada uno activa su módulo en la ficha.</legend>
        {serviceCatalog.map(service => (
          <label key={service.id} className={sc.checkRow}>
            <input type="checkbox" className={sc.check} checked={selected.includes(service.id)} onChange={() => toggle(service.id)} />
            <span>{service.label}{service.platformPriority ? <small style={{ display: "block", fontSize: 11, color: "var(--av-text-muted)" }}>Prioridad de plataforma · no implica contratación</small> : null}</span>
          </label>
        ))}
      </fieldset>
      <p className={s.demoNote} style={{ margin: 0 }}>El cambio se aplica solo en esta sesión: todavía no hay base de datos conectada.</p>
    </OSModal>
  );
}

function Reports({ client }: { client: OsClient }) {
  const plan = strategyByClient[client.slug];
  return (
    <div className={sc.stack}>
      <div className={s.pageHead}><div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 400 }}>Reportes</h2><p>Cierre del período, fuentes, insights y versión para el cliente.</p></div></div>
      <div className={sc.settingsGrid}>
        <Link href={`/v2/clientes/${client.slug}/reportes`} className={sc.settingsCard}><h2>Reporte del período</h2><p>Preparar fuentes, normalizar métricas, revisar insights y generar el borrador para validación.</p><span className={s.kpiCta} style={{ marginTop: "auto" }}>Abrir <Glyph name="arrow-right" size={13} /></span></Link>
        <Link href="/v2/reportes" className={sc.settingsCard}><h2>Reportes operativos de la agencia</h2><p>Estado de reportes de todas las cuentas en Operaciones.</p><span className={s.kpiCta} style={{ marginTop: "auto" }}>Abrir <Glyph name="arrow-right" size={13} /></span></Link>
      </div>
      {plan ? (
        <section className={s.surface} aria-label="KPIs del plan">
          <div className={s.cardHead}><h2>KPIs que mide el reporte</h2><span className={s.cardMeta}>Del plan de marketing</span></div>
          <div className={s.tableWrap}><table className={s.table}><thead><tr><th scope="col">KPI</th><th scope="col">Meta</th><th scope="col">Hoy</th></tr></thead><tbody>{plan.kpis.map(item => <tr key={item.label}><td>{item.label}</td><td>{item.target}</td><td className={s.cellSub}>{item.current}</td></tr>)}</tbody></table></div>
        </section>
      ) : null}
    </div>
  );
}

function Support({ client }: { client: OsClient }) {
  const { notify } = useOsStore();
  const requests = supportRequests.filter(item => item.clientSlug === client.slug);
  const tone = (status: string) => status === "Abierta" ? "peach" : status === "En curso" ? "info" : "cool";
  return (
    <div className={sc.stack}>
      <div className={s.pageHead}>
        <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 400 }}>Soporte</h2><p>Pedidos del cliente fuera de los proyectos: cambios, incidencias y consultas.</p></div>
        <button type="button" className={buttonClass("secondary", true)} onClick={() => notify("Nueva solicitud de soporte: pendiente de implementación")}><AvansIcon name="mensaje" size={18} />Nueva solicitud</button>
      </div>
      {requests.length ? (
        <section className={s.surface} aria-label="Solicitudes de soporte">
          <div className={cx(s.tableWrap, sc.desktopTable)}>
            <table className={s.table}>
              <thead><tr><th scope="col">ID</th><th scope="col">Solicitud</th><th scope="col">Pidió</th><th scope="col">Canal</th><th scope="col">Responsable</th><th scope="col">Prioridad</th><th scope="col">Estado</th></tr></thead>
              <tbody>{requests.map(item => (
                <tr key={item.id}>
                  <td className={s.cellSub}>{item.id}</td>
                  <td><span className={s.cellMain}><span>{item.title}</span><span className={s.cellSub}>Abierta {item.opened}</span></span></td>
                  <td>{item.requester}</td><td>{item.channel}</td><td>{item.owner}</td>
                  <td><OSPriority prio={item.prio} /></td>
                  <td><Badge tone={tone(item.status)}>{item.status}</Badge></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <ul className={sc.mobileList}>{requests.map(item => (
            <li key={item.id}><div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "6px 12px", padding: "14px 16px" }}><span>{item.title}</span><Badge tone={tone(item.status)}>{item.status}</Badge><small className={s.cellSub} style={{ gridColumn: "1 / -1" }}>{item.id} · {item.requester} · {item.opened}</small></div></li>
          ))}</ul>
        </section>
      ) : <OSEmptyState icon="mensaje" title="Sin solicitudes de soporte">Cuando el cliente pida un cambio o reporte una incidencia, queda registrado acá con responsable y estado.</OSEmptyState>}
    </div>
  );
}
