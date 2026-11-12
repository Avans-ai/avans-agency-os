"use client";

/* Bloques comunes a todos los módulos: resumen operativo, entregables y
 * aprobaciones, recomendaciones (manuales + IA sin conexión), documentación e historial. */
import Link from "next/link";
import { useMemo, useState } from "react";
import { clientAttention, scopeForService, serviceForTask, tasksForService } from "../director-data";
import { serviceLabel, type OsClient, type ServiceId } from "../os-data";
import { useOsStore } from "../os-store";
import { dueLabel } from "../selectors";
import { serviceHref, type RecommendationStatus } from "../service-workspace-data";
import { ApprovalRow, NewTaskModal } from "../task-blocks";
import { Badge, buttonClass, cx, OSDue, OSEmptyState } from "../ui";
import s from "../os.module.css";
import { moduleCollections } from "./collections";
import { formatDateTime, Panel, SourceTag, StatusBadge, Strip, type StripItem } from "./module-ui";
import { useModuleTaskStats } from "./module-task-board";
import { ASSISTANT_PROFILES } from "../assistant/profiles";
import { useAssistantStatus, useSuggestionLog } from "../assistant/store";
import { addManualRecommendation, RECOMMENDATION_STATUSES, setRecommendationState, useRecommendations, type RecommendationPriority } from "./recommendations";
import { useModuleRecords } from "./store";
import m from "./modules.module.css";

export function sectionHref(clientSlug: string, serviceId: ServiceId, section: string, extra = "") {
  return `${serviceHref(clientSlug, serviceId)}?seccion=${section}${extra}`;
}

export function TaskHealthStrip({ client, serviceId, extra = [] }: { client: OsClient; serviceId: ServiceId; extra?: StripItem[] }) {
  const stats = useModuleTaskStats(client, serviceId);
  return (
    <Strip
      label="Resumen operativo"
      items={[
        ...extra,
        { label: "Tareas abiertas", value: stats.open.length, href: sectionHref(client.slug, serviceId, "tareas") },
        { label: "Aprobaciones", value: stats.approvals.length },
        { label: "Bloqueos", value: stats.blocked.length, alert: stats.blocked.length > 0 },
        { label: "Vencidas", value: stats.late.length, alert: stats.late.length > 0 },
      ]}
    />
  );
}

export function NextActionsPanel({ client, serviceId }: { client: OsClient; serviceId: ServiceId }) {
  const stats = useModuleTaskStats(client, serviceId);
  return (
    <Panel title="Próximas acciones" description="Tareas abiertas ordenadas por vencimiento" id={`${serviceId}-next`} actions={<Link className={s.link} href={sectionHref(client.slug, serviceId, "tareas")}>Abrir Kanban</Link>}>
      {stats.next.length ? (
        <div className={m.rows}>
          {stats.next.map((task) => (
            <div className={m.markRow} key={task.id}>
              <i className={m.mark} data-tone={task.blocked ? "error" : task.dueKind === "late" ? "warning" : undefined} />
              <div><Link className={m.rowLink} href={sectionHref(client.slug, serviceId, "tareas", `&task=${task.id}`)}>{task.id} · {task.title}</Link><small>{task.owner} · {task.status}{task.blocked ? ` · Bloqueada: ${task.blocked}` : ""}</small></div>
              <OSDue label={dueLabel(task)} kind={task.dueKind} status={task.status} />
            </div>
          ))}
        </div>
      ) : <div className={m.panelBody}><p className={s.cellSub} style={{ margin: 0 }}>Sin tareas abiertas.</p></div>}
    </Panel>
  );
}

export function AttentionPanel({ client, serviceId }: { client: OsClient; serviceId: ServiceId }) {
  const { tasks } = useOsStore();
  const items = clientAttention(client.slug, tasks).filter((item) => item.serviceId === serviceId);
  const scope = scopeForService(client, serviceId);
  return (
    <Panel title="Alertas" id={`${serviceId}-alerts`} description="Bloqueos de tareas y alertas de la cuenta para este módulo">
      <div className={m.rows}>
        {scope.alert ? <div className={m.markRow}><i className={m.mark} data-tone="warning" /><div><strong>Revisión de alcance</strong><small>{scope.alert}</small></div><Badge tone="stone">Demo</Badge></div> : null}
        {items.map((item) => (
          <div className={m.markRow} key={item.id}>
            <i className={m.mark} data-tone={item.tone} />
            <div><strong>{item.title}</strong><small>{item.detail}</small></div>
            {item.id.startsWith("TASK-") ? <Badge tone="stone">Tarea</Badge> : <Badge tone="stone">Demo</Badge>}
          </div>
        ))}
        {!items.length && !scope.alert ? <div className={m.panelBody}><p className={s.cellSub} style={{ margin: 0 }}>Sin alertas para este módulo.</p></div> : null}
      </div>
    </Panel>
  );
}

export function ScopePanel({ client, serviceId }: { client: OsClient; serviceId: ServiceId }) {
  const scope = scopeForService(client, serviceId);
  return (
    <Panel title="Alcance contratado" id={`${serviceId}-scope`} actions={<StatusBadge status={scope.compliance === "Cumplido" ? "Cumplido" : scope.compliance === "Atención" ? "Revisar" : "Pendiente"} />}>
      <div className={m.panelBody}>
        <p style={{ margin: 0, lineHeight: 1.5 }}>{scope.summary}</p>
        <span className={s.cellSub}>{scope.cadence}</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{scope.deliverables.map((item) => <span key={item} className={m.source} style={{ fontSize: 12 }}>{item}</span>)}</div>
      </div>
    </Panel>
  );
}

export function DocsPanel({ client }: { client: OsClient }) {
  const links = [
    { href: `/v2/clientes/${client.slug}?view=documentos`, label: "Documentos", detail: "Fuentes, actas y versiones aprobadas" },
    { href: `/v2/clientes/${client.slug}?view=plan`, label: "Plan de Marketing", detail: "Objetivos y lineamientos del módulo" },
    { href: `/v2/clientes/${client.slug}?view=benchmark`, label: "Benchmark", detail: "Hallazgos competitivos" },
    { href: `/v2/clientes/${client.slug}?view=reportes`, label: "Reportes", detail: "Semanal, mensual y por módulo" },
  ];
  return (
    <Panel title="Documentación" id="module-docs" description="La documentación vive en la ficha del cliente; acá solo se enlaza">
      <div className={m.rows}>
        {links.map((link) => <div className={m.row} key={link.href}><div><Link className={m.rowLink} href={link.href}>{link.label}</Link><small>{link.detail}</small></div></div>)}
      </div>
    </Panel>
  );
}

function approvalCollections(serviceId: ServiceId) {
  return moduleCollections[serviceId].filter((def) => def.approval);
}

export function ApprovalsPanel({ client, serviceId }: { client: OsClient; serviceId: ServiceId }) {
  const stats = useModuleTaskStats(client, serviceId);
  const defs = approvalCollections(serviceId);
  const ids = useMemo(() => defs.map((def) => def.id), [defs]);
  const { data } = useModuleRecords(client.slug, serviceId, ids);
  const pending = defs.flatMap((def) => (data[def.id] ?? []).filter((record) => def.statusKey && record.values[def.statusKey] === def.approval!.pending).map((record) => ({ def, record })));
  return (
    <Panel title="Aprobaciones" id={`${serviceId}-approvals`} description="Tareas en aprobación y objetos del módulo que esperan decisión">
      {stats.approvals.length ? stats.approvals.map((task) => <ApprovalRow key={task.id} item={task} actions="decide" href={sectionHref(client.slug, serviceId, "tareas", `&task=${task.id}`)} />) : null}
      {pending.length ? (
        <div className={m.rows}>
          {pending.map(({ def, record }) => (
            <div className={m.markRow} key={record.id}>
              <i className={m.mark} data-tone="warning" />
              <div><Link className={m.rowLink} href={sectionHref(client.slug, serviceId, sectionForCollection(serviceId, def.id))}>{record.values[def.titleKey] || record.id}</Link><small>{def.label} · {record.values.responsable || "Sin responsable"} · {record.values.version ? `versión ${record.values.version}` : record.id}</small></div>
              <SourceTag source={record.source} />
            </div>
          ))}
        </div>
      ) : null}
      {!stats.approvals.length && !pending.length ? <div className={m.panelBody}><p className={s.cellSub} style={{ margin: 0 }}>Nada espera aprobación en este módulo.</p></div> : null}
    </Panel>
  );
}

/** Sección del módulo donde vive cada colección (para enlazar aprobaciones). */
export function sectionForCollection(serviceId: ServiceId, collection: string) {
  const map: Record<string, string> = {
    creatividades: "produccion",
    optimizaciones: "optimizacion",
    campanas: "campanas",
    aprendizajes: "resultados",
    prioridades: "planificacion",
    versiones: "edicion",
    proyectos: "proyectos",
  };
  if (serviceId === "contenidos" && collection === "aprendizajes") return "resultados";
  return map[collection] ?? collection;
}

export function DeliverablesSection({ client, serviceId }: { client: OsClient; serviceId: ServiceId }) {
  const { tasks } = useOsStore();
  const scope = scopeForService(client, serviceId);
  const own = tasksForService(tasks, client.slug, serviceId);
  const rows = scope.deliverables.map((deliverable) => {
    const linked = own.filter((task) => task.deliverable === deliverable);
    const open = linked.filter((task) => task.status !== "Hecho");
    const late = open.filter((task) => task.dueKind === "late");
    const state = !linked.length ? "Sin tareas" : late.length ? "Demorado" : open.length ? "En curso" : "Completado";
    return { deliverable, linked, open, late, state };
  });
  const unassigned = own.filter((task) => !task.deliverable && task.status !== "Hecho");
  return (
    <div className={m.stack}>
      <Panel title="Entregables del alcance" id={`${serviceId}-deliverables`} description={`${scope.cadence} · el estado se calcula con las tareas vinculadas a cada entregable`}>
        <div className={s.tableWrap}>
          <table className={`${s.table} ${m.dense}`}>
            <caption className={s.srOnly}>Entregables de {serviceLabel(serviceId)}</caption>
            <thead><tr><th scope="col">Entregable</th><th scope="col">Tareas</th><th scope="col">Abiertas</th><th scope="col">Vencidas</th><th scope="col">Estado</th><th scope="col">Responsables</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.deliverable}>
                  <td><strong style={{ fontWeight: 500 }}>{row.deliverable}</strong></td>
                  <td>{row.linked.length}</td>
                  <td>{row.open.length}</td>
                  <td>{row.late.length}</td>
                  <td><Badge tone={row.state === "Demorado" ? "error" : row.state === "Completado" ? "cool" : row.state === "En curso" ? "info" : "stone"}>{row.state}</Badge></td>
                  <td className={m.cellWrap}>{Array.from(new Set(row.linked.map((task) => task.owner))).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {unassigned.length ? <div className={m.panelFoot}>{unassigned.length} {unassigned.length === 1 ? "tarea abierta no está asociada" : "tareas abiertas no están asociadas"} a un entregable. Asociala desde el panel de la tarea.</div> : null}
      </Panel>
      <ApprovalsPanel client={client} serviceId={serviceId} />
    </div>
  );
}

const PRIORITY_ORDER: Record<RecommendationPriority, number> = { Alta: 0, Media: 1, Baja: 2 };

export function RecommendationsSection({ client, serviceId, editable, consolidated = false }: { client: OsClient; serviceId: ServiceId; editable: boolean; consolidated?: boolean }) {
  const { servicesOf, notify } = useOsStore();
  const active = servicesOf(client.slug);
  const services = useMemo(() => (consolidated ? active : [serviceId]), [active, consolidated, serviceId]);
  const { items } = useRecommendations(client.slug, services);
  const assistant = useAssistantStatus();
  const suggestionLog = useSuggestionLog(client.slug, serviceId);
  const usedIn = (id: string) => suggestionLog.items.filter((entry) => entry.origin === "recomendacion" && (entry.recommendationId === id) && entry.linkedRecordId);
  const [status, setStatus] = useState<"todas" | RecommendationStatus>("todas");
  const [moduleFilter, setModuleFilter] = useState<"todos" | ServiceId>("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [rationale, setRationale] = useState("");
  const [priority, setPriority] = useState<RecommendationPriority>("Media");
  const [taskFor, setTaskFor] = useState<{ serviceId: ServiceId; title: string } | null>(null);

  const visible = items
    .filter((item) => status === "todas" || item.status === status)
    .filter((item) => moduleFilter === "todos" || item.serviceId === moduleFilter)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    const ok = addManualRecommendation(client.slug, serviceId, { title: title.trim(), rationale: rationale.trim(), priority, source: "Carga manual" });
    if (!ok) { notify("No se pudo guardar en este navegador", "error"); return; }
    setTitle(""); setRationale(""); setPriority("Media"); setFormOpen(false);
    notify("Recomendación guardada en este navegador", "success");
  }

  return (
    <div className={m.grid}>
      <Panel
        title={consolidated ? "Recomendaciones consolidadas" : `Recomendaciones de ${serviceLabel(serviceId)}`}
        description={consolidated ? "Todas las recomendaciones de los módulos activos, con fuente, prioridad y estado" : "Manuales y precargadas, con fuente, prioridad, estado y acción"}
        id={`${serviceId}-recs`}
        actions={<button type="button" className={buttonClass("primary", true)} aria-expanded={formOpen} disabled={!editable} onClick={() => setFormOpen((value) => !value)}>Nueva recomendación</button>}
        footer="Las precargadas son datos de demostración. Las manuales y los cambios de estado quedan guardados en este navegador."
      >
        {formOpen && editable ? (
          <form className={m.panelBody} onSubmit={submit} style={{ borderBottom: "1px solid var(--av-border)" }}>
            <div className={m.formGrid}>
              <label className={s.field} data-wide="true"><span>Recomendación <span className={s.req} aria-hidden="true">*</span></span><input className={cx(s.input, s.inputSm)} value={title} required onChange={(event) => setTitle(event.target.value)} placeholder="Qué proponemos" /></label>
              <label className={s.field} data-wide="true"><span>Fundamento</span><textarea className={cx(s.input, s.inputSm)} rows={2} value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="Dato, aprendizaje o decisión que la origina" /></label>
              <label className={s.field}><span>Prioridad</span><select className={cx(s.input, s.inputSm)} value={priority} onChange={(event) => setPriority(event.target.value as RecommendationPriority)}><option>Alta</option><option>Media</option><option>Baja</option></select></label>
            </div>
            <div className={s.actions}><button type="submit" className={buttonClass("dark", true)} disabled={!title.trim()}>Guardar en este navegador</button><button type="button" className={buttonClass("ghost")} onClick={() => setFormOpen(false)}>Cancelar</button></div>
          </form>
        ) : null}
        <div className={m.toolbar}>
          <label className={m.filter} style={{ minWidth: 170 }}><span>Estado</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as "todas" | RecommendationStatus)}>
              <option value="todas">Todos</option>
              {RECOMMENDATION_STATUSES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          {consolidated ? (
            <label className={m.filter} style={{ minWidth: 200 }}><span>Módulo</span>
              <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value as "todos" | ServiceId)}>
                <option value="todos">Todos los módulos</option>
                {active.map((id) => <option key={id} value={id}>{serviceLabel(id)}</option>)}
              </select>
            </label>
          ) : null}
          <span className={s.cardMeta}>{visible.length} recomendaciones</span>
        </div>
        {visible.length ? (
          <div className={m.rows}>
            {visible.map((item) => (
              <article className={m.row} key={item.id} style={{ alignItems: "start" }}>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.rationale}</small>
                  <small style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", marginTop: 6 }}>
                    <span>{serviceLabel(item.serviceId)}</span><span>Fuente: {item.source}</span><span>{item.id}</span>
                    <span className={m.source} data-source={item.origin}>{item.origin === "demo" ? "Demo" : "Manual"}</span>
                    {item.history[0] ? <span>Último cambio: {item.history[0].text} · {formatDateTime(item.history[0].at)}</span> : null}
                    {usedIn(item.id).map((use) => <span key={use.id}>Usada como punto de partida en {use.linkedRecordId}</span>)}
                  </small>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", minWidth: 150 }}>
                  <label className={m.filter} style={{ width: 150 }}><span>Estado</span>
                    <select value={item.status} disabled={!editable} onChange={(event) => { if (setRecommendationState(client.slug, item.serviceId, item.id, { status: event.target.value as RecommendationStatus })) notify("Estado actualizado · guardado en este navegador"); }}>
                      {RECOMMENDATION_STATUSES.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </label>
                  <label className={m.filter} style={{ width: 150 }}><span>Prioridad</span>
                    <select value={item.priority} disabled={!editable} onChange={(event) => { if (setRecommendationState(client.slug, item.serviceId, item.id, { priority: event.target.value as RecommendationPriority })) notify("Prioridad actualizada · guardado en este navegador"); }}>
                      <option>Alta</option><option>Media</option><option>Baja</option>
                    </select>
                  </label>
                  {consolidated && item.serviceId !== serviceId ? <Link className={s.link} href={sectionHref(client.slug, item.serviceId, "recomendaciones")}>Abrir en su módulo</Link> : editable ? <button type="button" className={buttonClass("ghost")} onClick={() => setTaskFor({ serviceId: item.serviceId, title: item.title })}>Crear tarea</button> : null}
                </div>
              </article>
            ))}
          </div>
        ) : <OSEmptyState icon="idea" title="No hay recomendaciones que coincidan">Las recomendaciones quedan asociadas a un módulo, con fuente, prioridad y estado.</OSEmptyState>}
      </Panel>
      <div className={m.stack}>
        <AssistantStatusPanel serviceId={serviceId} />
        <Panel title="Fuentes" id={`${serviceId}-rec-sources`}>
          <div className={m.rows}>
            <div className={m.row}><div><strong>Carga manual</strong><small>Equipo de la cuenta · guardado en este navegador</small></div><Badge tone="cool">Activa</Badge></div>
            <div className={m.row}><div><strong>Precargadas</strong><small>Discovery, Benchmark, reuniones y resultados de demostración</small></div><Badge tone="peach">Demo</Badge></div>
            <div className={m.row}><div><strong>Proveedor de IA</strong><small>Asistente al crear trabajo del módulo</small></div><Badge tone={assistant.status?.configured ? "cool" : "stone"}>{assistant.status?.configured ? "Conectado" : "No conectado"}</Badge></div>
          </div>
        </Panel>
      </div>
      {taskFor ? <NewTaskModal clientSlug={client.slug} serviceId={taskFor.serviceId} onClose={() => setTaskFor(null)} onCreated={() => notify(`Tarea creada desde la recomendación «${taskFor.title}»`)} /> : null}
    </div>
  );
}

/** Estado real del asistente del módulo (sin simular recomendaciones). */
function AssistantStatusPanel({ serviceId }: { serviceId: ServiceId }) {
  const { status, error } = useAssistantStatus();
  const profile = ASSISTANT_PROFILES.find((item) => item.serviceId === serviceId);
  const connected = Boolean(status?.configured);
  return (
    <Panel title="Asistidas por IA" id={`${serviceId}-ai`} actions={<Badge tone={connected ? "cool" : "stone"}>{connected ? "Conectado" : "Pendiente de conexión"}</Badge>}>
      <div className={m.panelBody}>
        {connected ? (
          <p style={{ margin: 0, lineHeight: 1.5 }}>Proveedor {status?.provider} · {status?.model}. {profile ? `Las ideas se generan al crear trabajo en este módulo («${profile.title}»), con fundamento y fuentes del cliente.` : "Este módulo todavía no tiene un proceso de IA definido."}</p>
        ) : (
          <p style={{ margin: 0, lineHeight: 1.5 }}>Asistente IA pendiente de conexión. {error ? "No se pudo consultar su estado." : status?.reason} No se generan ni se simulan recomendaciones automáticas.</p>
        )}
        <p className={s.demoNote} style={{ margin: 0 }}>Cada sugerencia cita sus fuentes (Discovery, Benchmark, Plan, reuniones, resultados) y queda registrada con usuario, fecha, estado y el trabajo que originó. Las recomendaciones vigentes de esta lista aparecen como punto de partida al crear.</p>
      </div>
    </Panel>
  );
}

export function HistorySection({ client, serviceId }: { client: OsClient; serviceId: ServiceId }) {
  const { tasks } = useOsStore();
  const defs = moduleCollections[serviceId];
  const ids = useMemo(() => defs.map((def) => def.id), [defs]);
  const { data } = useModuleRecords(client.slug, serviceId, ids);
  const [filter, setFilter] = useState("todo");
  const recordEvents = defs.flatMap((def) => (data[def.id] ?? []).flatMap((record) => record.history.map((entry) => ({
    key: `${record.id}-${entry.at}-${entry.text}`,
    at: entry.at,
    when: formatDateTime(entry.at),
    who: entry.user,
    text: entry.text,
    target: `${def.label} · ${record.values[def.titleKey] || record.id}`,
    kind: def.id,
    source: record.source,
  }))));
  const taskEvents = tasksForService(tasks, client.slug, serviceId).flatMap((task) => task.activity.map((entry, index) => ({
    key: `${task.id}-${index}`,
    at: "",
    when: entry.when,
    who: "",
    text: entry.text,
    target: `Tarea ${task.id} · ${task.title}`,
    kind: "tareas",
    source: "manual" as const,
    serviceOk: serviceForTask(task) === serviceId,
  })));
  const events = [...recordEvents.sort((a, b) => b.at.localeCompare(a.at)), ...taskEvents].filter((event) => filter === "todo" || event.kind === filter);
  return (
    <Panel title="Historial del módulo" id={`${serviceId}-history`} description="Cambios en objetos del módulo (con fecha y usuario) y actividad de sus tareas" actions={(
      <label className={m.filter} style={{ minWidth: 200 }}><span>Mostrar</span>
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="todo">Todo</option>
          {defs.map((def) => <option key={def.id} value={def.id}>{def.label}</option>)}
          <option value="tareas">Tareas</option>
        </select>
      </label>
    )}>
      {events.length ? (
        <div className={m.rows}>
          {events.slice(0, 80).map((event) => (
            <div className={m.row} key={event.key}>
              <div><strong>{event.text}</strong><small>{event.target}{event.who ? ` · ${event.who}` : ""}</small></div>
              <span className={s.cellSub} style={{ whiteSpace: "nowrap" }}>{event.when}</span>
            </div>
          ))}
        </div>
      ) : <div className={m.panelBody}><p className={s.cellSub} style={{ margin: 0 }}>Sin movimientos registrados.</p></div>}
    </Panel>
  );
}
