"use client";

/* Estrategia y coordinación, Desarrollo web, Audiovisuales y módulos con
 * proceso genérico (CRM, IA y automatizaciones, Diseño de marca, Soluciones
 * gráficas, Mercado Libre). Cada uno muestra sus propios objetos. */
import Link from "next/link";
import { useMemo } from "react";
import { scopeForService, serviceSummary, tasksForClient, isArchivedTask, serviceForTask } from "../director-data";
import { serviceCatalog, serviceLabel, type OsClient, type ServiceId } from "../os-data";
import { useOsStore } from "../os-store";
import { dueLabel } from "../selectors";
import { serviceHref, serviceWorkspaceById } from "../service-workspace-data";
import { Badge, buttonClass, OSDue } from "../ui";
import s from "../os.module.css";
import { CollectionView } from "./collection-view";
import { AV_STAGES, collectionDef, moduleCollections, WEB_STAGES } from "./collections";
import { AttentionPanel, ApprovalsPanel, DocsPanel, NextActionsPanel, ScopePanel, sectionHref, TaskHealthStrip } from "./module-common";
import { Panel, StatusBadge, Strip } from "./module-ui";
import { StagePipeline } from "./stage-pipeline";
import { useModuleRecords } from "./store";
import type { ModuleRecord } from "./types";
import m from "./modules.module.css";

type Go = (section: string, extra?: Record<string, string>) => void;

/* ───────── Estrategia y coordinación ───────── */
const STRATEGY = "estrategia" as const;

function ModuleTracking({ client, compact = false }: { client: OsClient; compact?: boolean }) {
  const { tasks, servicesOf } = useOsStore();
  const active = serviceCatalog.filter((service) => servicesOf(client.slug).includes(service.id));
  return (
    <Panel title="Seguimiento de módulos" id={compact ? "tracking-compact" : "tracking"} description="Estado de cada módulo activo calculado desde sus tareas, con el cumplimiento de alcance">
      <div className={s.tableWrap}>
        <table className={`${s.table} ${m.dense}`}>
          <caption className={s.srOnly}>Seguimiento de módulos de {client.name}</caption>
          <thead><tr><th scope="col">Módulo</th><th scope="col">Estado</th><th scope="col">Abiertas</th><th scope="col">Bloqueos</th><th scope="col">Aprobación</th>{compact ? null : <th scope="col">Alcance</th>}<th scope="col">Próxima acción</th></tr></thead>
          <tbody>
            {active.map((service) => {
              const summary = serviceSummary(client.slug, service.id, tasks);
              const scope = scopeForService(client, service.id);
              return (
                <tr key={service.id}>
                  <td><Link className={s.linkInk} href={serviceHref(client.slug, service.id)}>{service.label}</Link></td>
                  <td><StatusBadge status={summary.state} /></td>
                  <td>{summary.open}</td>
                  <td>{summary.blocked}</td>
                  <td>{summary.approvals}</td>
                  {compact ? null : <td><Badge tone={scope.compliance === "Cumplido" ? "cool" : scope.compliance === "Atención" ? "peach" : "stone"}>{scope.compliance}</Badge></td>}
                  <td className={m.cellWrap}>{summary.nextAction}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function StrategySummary({ client, go }: { client: OsClient; go: Go }) {
  const { data } = useModuleRecords(client.slug, STRATEGY, ["prioridades", "riesgos", "decisiones", "reuniones"]);
  const week = (data.prioridades ?? []).filter((record) => record.values.estado !== "Cumplida");
  const risks = (data.riesgos ?? []).filter((record) => record.values.estado !== "Cerrado");
  const decisions = (data.decisiones ?? []).filter((record) => record.values.estado !== "Tomada");
  return (
    <div className={m.stack}>
      <TaskHealthStrip client={client} serviceId={STRATEGY} extra={[
        { label: "Prioridades abiertas", value: week.length, href: sectionHref(client.slug, STRATEGY, "planificacion") },
        { label: "Riesgos abiertos", value: risks.length, alert: risks.some((risk) => risk.values.impacto === "Alto") },
        { label: "Decisiones pendientes", value: decisions.length },
      ]} />
      <ModuleTracking client={client} compact />
      <div className={m.grid}>
        <div className={m.stack}>
          <Panel title="Prioridades" id="strategy-priorities" actions={<button type="button" className={buttonClass("secondary", true)} onClick={() => go("planificacion")}>Planificación</button>}>
            <div className={m.panelBody}><StagePipeline label="Prioridades por horizonte" stages={["Esta semana", "Este mes", "Trimestre"]} records={week} stageKey="horizonte" titleKey="iniciativa" /></div>
          </Panel>
          <Panel title="Próximos pasos de la cuenta" id="strategy-next-steps" description="Definidos en la ficha del cliente (demo)">
            <div className={m.rows}>{client.nextSteps.map((step) => <div className={m.row} key={step.title}><div><strong>{step.title}</strong><small>{step.owner}</small></div><span className={s.cellSub}>{step.due}</span></div>)}</div>
          </Panel>
          <NextActionsPanel client={client} serviceId={STRATEGY} />
        </div>
        <aside className={m.stack}>
          <Panel title="Riesgos y decisiones" id="strategy-risks-summary" actions={<button type="button" className={buttonClass("ghost")} onClick={() => go("riesgos")}>Ver riesgos</button>}>
            <div className={m.rows}>
              {risks.map((risk) => <div className={m.markRow} key={risk.id}><i className={m.mark} data-tone={risk.values.impacto === "Alto" ? "error" : "warning"} /><div><strong>{risk.values.riesgo}</strong><small>{risk.values.tipo} · {risk.values.responsable}</small></div><StatusBadge status={risk.values.estado ?? ""} /></div>)}
              {decisions.map((decision) => <div className={m.markRow} key={decision.id}><i className={m.mark} /><div><strong>{decision.values.decision}</strong><small>Decisión · {decision.values.impacto}</small></div><StatusBadge status={decision.values.estado ?? ""} /></div>)}
              {!risks.length && !decisions.length ? <div className={m.panelBody}><p className={s.cellSub} style={{ margin: 0 }}>Sin riesgos ni decisiones pendientes.</p></div> : null}
            </div>
          </Panel>
          <AttentionPanel client={client} serviceId={STRATEGY} />
          <ApprovalsPanel client={client} serviceId={STRATEGY} />
          <DocsPanel client={client} />
        </aside>
      </div>
    </div>
  );
}

export function TrackingSection({ client }: { client: OsClient }) {
  const { tasks, servicesOf } = useOsStore();
  const active = servicesOf(client.slug);
  const open = tasksForClient(tasks, client.slug).filter((task) => !isArchivedTask(task) && task.status !== "Hecho" && active.includes(serviceForTask(task)));
  return (
    <div className={m.stack}>
      <ModuleTracking client={client} />
      <Panel title="Vencimientos de todos los módulos" id="tracking-due" description="Tareas abiertas que vencen o vencieron, para coordinar entre líderes">
        <div className={m.rows}>
          {open.filter((task) => task.dueKind === "late" || task.dueKind === "today" || task.dueKind === "week").map((task) => (
            <div className={m.markRow} key={task.id}>
              <i className={m.mark} data-tone={task.blocked ? "error" : task.dueKind === "late" ? "warning" : undefined} />
              <div><Link className={m.rowLink} href={sectionHref(client.slug, serviceForTask(task), "tareas", `&task=${task.id}`)}>{task.id} · {task.title}</Link><small>{serviceLabel(serviceForTask(task))} · {task.owner}</small></div>
              <OSDue label={dueLabel(task)} kind={task.dueKind} status={task.status} />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function RisksSection({ client, editable }: { client: OsClient; editable: boolean }) {
  const { tasks, servicesOf } = useOsStore();
  const active = servicesOf(client.slug);
  const blocked = tasksForClient(tasks, client.slug).filter((task) => task.blocked && task.status !== "Hecho" && !isArchivedTask(task) && active.includes(serviceForTask(task)));
  return (
    <div className={m.stack}>
      <Panel title={`Bloqueos activos en tareas · ${blocked.length}`} id="risks-blocked" description="Se leen de las tareas de todos los módulos activos">
        {blocked.length ? <div className={m.rows}>{blocked.map((task) => <div className={m.markRow} key={task.id}><i className={m.mark} data-tone="error" /><div><Link className={m.rowLink} href={sectionHref(client.slug, serviceForTask(task), "tareas", `&task=${task.id}`)}>{task.id} · {task.title}</Link><small>{serviceLabel(serviceForTask(task))} · {task.blocked}{task.blockedSince ? ` · hace ${task.blockedSince}` : ""}</small></div><span className={s.cellSub}>{task.owner}</span></div>)}</div> : <div className={m.panelBody}><p className={s.cellSub} style={{ margin: 0 }}>Sin bloqueos activos.</p></div>}
      </Panel>
      <CollectionView client={client} serviceId={STRATEGY} def={collectionDef(STRATEGY, "riesgos")!} editable={editable} />
    </div>
  );
}

/* ───────── Desarrollo web ───────── */
const WEB = "desarrollo-web" as const;

export function WebSummary({ client, go }: { client: OsClient; go: Go }) {
  const { data } = useModuleRecords(client.slug, WEB, ["proyectos", "sitemap", "qa", "requisitos"]);
  const pages = data.sitemap ?? [];
  const qa = data.qa ?? [];
  return (
    <div className={m.stack}>
      <TaskHealthStrip client={client} serviceId={WEB} extra={[
        { label: "Proyectos web", value: (data.proyectos ?? []).length, href: sectionHref(client.slug, WEB, "proyectos") },
        { label: "Páginas listas", value: `${pages.filter((page) => page.values.estado === "Lista" || page.values.estado === "Publicada").length}/${pages.length}` },
        { label: "QA aprobado", value: `${qa.filter((item) => item.values.resultado === "Aprobado").length}/${qa.length}`, alert: qa.some((item) => item.values.resultado === "Falla" || item.values.resultado === "Bloqueado") },
      ]} />
      <Panel title="Proyectos por etapa" id="web-pipeline" description="Definición → arquitectura → diseño → desarrollo → QA → publicación → mantenimiento" actions={<button type="button" className={buttonClass("secondary", true)} onClick={() => go("proyectos")}>Ver proyectos</button>}>
        <div className={m.panelBody}><StagePipeline label="Proyectos web por etapa" stages={WEB_STAGES} records={data.proyectos ?? []} stageKey="etapa" titleKey="nombre" /></div>
      </Panel>
      <div className={m.grid}>
        <div className={m.stack}>
          <NextActionsPanel client={client} serviceId={WEB} />
          <ApprovalsPanel client={client} serviceId={WEB} />
          <Panel title="Contenido pendiente del cliente" id="web-content-pending" actions={<button type="button" className={buttonClass("ghost")} onClick={() => go("sitemap")}>Ver sitemap</button>}>
            {pages.filter((page) => page.values.contenido === "Pendiente del cliente").length ? <div className={m.rows}>{pages.filter((page) => page.values.contenido === "Pendiente del cliente").map((page) => <div className={m.row} key={page.id}><div><strong>{page.values.pagina}</strong><small>{page.values.ruta}</small></div><StatusBadge status="Pendiente del cliente" /></div>)}</div> : <div className={m.panelBody}><p className={s.cellSub} style={{ margin: 0 }}>Sin contenido pendiente.</p></div>}
          </Panel>
        </div>
        <aside className={m.stack}>
          <AttentionPanel client={client} serviceId={WEB} />
          <ScopePanel client={client} serviceId={WEB} />
          <DocsPanel client={client} />
        </aside>
      </div>
    </div>
  );
}

function depthOf(record: ModuleRecord, all: ModuleRecord[], seen = new Set<string>()): number {
  const parent = all.find((item) => item.id === record.values.padre);
  if (!parent || seen.has(parent.id)) return 0;
  seen.add(record.id);
  return 1 + depthOf(parent, all, seen);
}

function orderTree(records: ModuleRecord[]) {
  const ids = new Set(records.map((record) => record.id));
  const roots = records.filter((record) => !record.values.padre || !ids.has(record.values.padre));
  const out: ModuleRecord[] = [];
  const visit = (record: ModuleRecord, guard: Set<string>) => {
    if (guard.has(record.id)) return;
    guard.add(record.id);
    out.push(record);
    records.filter((child) => child.values.padre === record.id).forEach((child) => visit(child, guard));
  };
  const guard = new Set<string>();
  roots.forEach((root) => visit(root, guard));
  records.filter((record) => !guard.has(record.id)).forEach((record) => out.push(record));
  return out;
}

export function SitemapSection({ client, editable }: { client: OsClient; editable: boolean }) {
  const { data } = useModuleRecords(client.slug, WEB, ["sitemap"]);
  const pages = useMemo(() => orderTree(data.sitemap ?? []), [data.sitemap]);
  return (
    <div className={m.stack}>
      <Panel title="Árbol del sitio" id="sitemap-tree" description="Jerarquía por página padre, con estado de contenido y de desarrollo">
        {pages.length ? (
          <ul className={m.tree} aria-label="Sitemap">
            {pages.map((page) => {
              const depth = depthOf(page, pages);
              return (
                <li key={page.id}>
                  <span className={m.treeName} style={{ paddingLeft: depth * 22 }}>
                    {depth ? <span className={m.treeIndent} aria-hidden="true" /> : null}
                    <strong style={{ fontWeight: depth ? 400 : 600 }}>{page.values.pagina}</strong>
                    <code>{page.values.ruta}</code>
                    <span className={s.srOnly}>nivel {depth + 1}</span>
                  </span>
                  <span className={s.cellSub}>{page.values.contenido || "—"}</span>
                  <StatusBadge status={page.values.estado ?? ""} />
                </li>
              );
            })}
          </ul>
        ) : <div className={m.panelBody}><p className={s.cellSub} style={{ margin: 0 }}>El sitemap todavía no tiene páginas.</p></div>}
      </Panel>
      <CollectionView client={client} serviceId={WEB} def={collectionDef(WEB, "sitemap")!} editable={editable} headingLevel="h3" />
    </div>
  );
}

export function QaSection({ client, editable }: { client: OsClient; editable: boolean }) {
  const { data } = useModuleRecords(client.slug, WEB, ["qa"]);
  const qa = data.qa ?? [];
  const count = (state: string) => qa.filter((item) => item.values.resultado === state).length;
  return (
    <div className={m.stack}>
      <Strip label="Resultado de QA" items={[
        { label: "Casos", value: qa.length },
        { label: "Aprobados", value: count("Aprobado") },
        { label: "Pendientes", value: count("Pendiente") },
        { label: "Fallas", value: count("Falla"), alert: count("Falla") > 0 },
        { label: "Bloqueados", value: count("Bloqueado"), alert: count("Bloqueado") > 0 },
      ]} />
      <CollectionView client={client} serviceId={WEB} def={collectionDef(WEB, "qa")!} editable={editable} />
    </div>
  );
}

export function ReleasesSection({ client, editable }: { client: OsClient; editable: boolean }) {
  return (
    <div className={m.stack}>
      <CollectionView client={client} serviceId={WEB} def={collectionDef(WEB, "publicaciones")!} editable={editable} />
      <CollectionView client={client} serviceId={WEB} def={collectionDef(WEB, "mantenimiento")!} editable={editable} />
    </div>
  );
}

/* ───────── Audiovisuales ───────── */
const AV = "audiovisuales" as const;

export function AudiovisualSummary({ client, go }: { client: OsClient; go: Go }) {
  const { data } = useModuleRecords(client.slug, AV, ["producciones", "guiones", "rodajes", "versiones"]);
  const shoots = (data.rodajes ?? []).filter((shoot) => shoot.values.estado !== "Realizado");
  return (
    <div className={m.stack}>
      <TaskHealthStrip client={client} serviceId={AV} extra={[
        { label: "Producciones", value: (data.producciones ?? []).length, href: sectionHref(client.slug, AV, "producciones") },
        { label: "Guiones para aprobar", value: (data.guiones ?? []).filter((script) => script.values.estado === "En aprobación").length, alert: (data.guiones ?? []).some((script) => script.values.estado === "En aprobación") },
        { label: "Rodajes pendientes", value: shoots.length },
      ]} />
      <Panel title="Producciones por etapa" id="av-pipeline" description="Brief → guion → preproducción → rodaje → edición → aprobación → entrega" actions={<button type="button" className={buttonClass("secondary", true)} onClick={() => go("producciones")}>Ver producciones</button>}>
        <div className={m.panelBody}><StagePipeline label="Producciones por etapa" stages={AV_STAGES} records={data.producciones ?? []} stageKey="etapa" titleKey="titulo" /></div>
      </Panel>
      <div className={m.grid}>
        <div className={m.stack}>
          <NextActionsPanel client={client} serviceId={AV} />
          <ApprovalsPanel client={client} serviceId={AV} />
          <Panel title="Próximos rodajes" id="av-shoots" actions={<button type="button" className={buttonClass("ghost")} onClick={() => go("rodajes")}>Plan de rodaje</button>}>
            {shoots.length ? <div className={m.rows}>{shoots.map((shoot) => <div className={m.row} key={shoot.id}><div><strong>{shoot.values.jornada}</strong><small>{shoot.values.fecha} · {shoot.values.locacion} · {shoot.values.recursos}</small></div><StatusBadge status={shoot.values.estado ?? ""} /></div>)}</div> : <div className={m.panelBody}><p className={s.cellSub} style={{ margin: 0 }}>Sin rodajes pendientes.</p></div>}
          </Panel>
        </div>
        <aside className={m.stack}>
          <AttentionPanel client={client} serviceId={AV} />
          <ScopePanel client={client} serviceId={AV} />
          <DocsPanel client={client} />
        </aside>
      </div>
    </div>
  );
}

/* ───────── Módulos con proceso genérico ───────── */
export function GenericSummary({ client, serviceId, go }: { client: OsClient; serviceId: ServiceId; go: Go }) {
  const def = moduleCollections[serviceId][0];
  const workspace = serviceWorkspaceById(serviceId);
  const { data } = useModuleRecords(client.slug, serviceId, [def.id]);
  const records = data[def.id] ?? [];
  return (
    <div className={m.stack}>
      <TaskHealthStrip client={client} serviceId={serviceId} extra={[
        { label: def.label, value: records.length, href: sectionHref(client.slug, serviceId, def.id) },
        { label: "En curso", value: records.filter((record) => record.values.estado === "En curso").length },
      ]} />
      <Panel title={`${def.label} por etapa`} id="generic-pipeline" description={`Etapas ya definidas para ${workspace?.label ?? serviceLabel(serviceId)}. No se agregan pasos sin documentación.`} actions={<button type="button" className={buttonClass("secondary", true)} onClick={() => go(def.id)}>Ver {def.label.toLowerCase()}</button>}>
        <div className={m.panelBody}><StagePipeline label={`${def.label} por etapa`} stages={workspace?.stages ?? []} records={records} stageKey="etapa" titleKey="nombre" /></div>
      </Panel>
      <div className={m.grid}>
        <div className={m.stack}>
          <NextActionsPanel client={client} serviceId={serviceId} />
          <ApprovalsPanel client={client} serviceId={serviceId} />
        </div>
        <aside className={m.stack}>
          <AttentionPanel client={client} serviceId={serviceId} />
          <ScopePanel client={client} serviceId={serviceId} />
          <DocsPanel client={client} />
        </aside>
      </div>
    </div>
  );
}
