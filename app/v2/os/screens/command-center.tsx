"use client";

import Link from "next/link";
import {
  assignedClients,
  clientOfTask,
  directorMeta,
  isAssignedClient,
} from "../director-data";
import { CURRENT_USER, REFERENCE_DATE_LABEL } from "../os-data";
import { useOsStore } from "../os-store";
import { activeBlockers, myApprovals, myOpenWork, projectsNeedingAttention } from "../selectors";
import { MyTaskRow, taskHref } from "../task-blocks";
import { OSKpiTile, OSEmptyState, OSStatus, PageHead } from "../ui";
import s from "../os.module.css";
import d from "./director-update.module.css";

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function CommandCenter() {
  const { tasks } = useOsStore();
  const pending = myOpenWork(tasks).filter((task) => task.status !== "Hecho");
  const approvals = myApprovals(tasks);
  const blockers = activeBlockers(tasks).filter((task) => task.owner === CURRENT_USER.name || isAssignedClient(clientOfTask(task)?.slug ?? ""));
  const projectAlerts = projectsNeedingAttention().filter((project) => isAssignedClient(project.clientSlug));
  const clients = assignedClients();
  const attentionCount = approvals.length + blockers.length + projectAlerts.length;

  const alerts = [
    ...approvals.map((task) => ({ id: `approval-${task.id}`, title: `Aprobación pendiente · ${task.id}`, detail: task.approvalTitle ?? task.title, tone: task.dueKind === "late" ? "error" as const : "warning" as const, href: taskHref(task) })),
    ...blockers.map((task) => ({ id: `blocked-${task.id}`, title: `Tarea bloqueada · ${task.id}`, detail: `${task.title}. ${task.blocked ?? "Requiere atención"}`, tone: "error" as const, href: taskHref(task) })),
    ...projectAlerts.map((project) => ({ id: `project-${project.slug}`, title: `Proyecto ${project.status === "en-riesgo" ? "en riesgo" : "con atención"}`, detail: `${project.name}${project.alert ? ` · ${project.alert}` : ""}`, tone: project.status === "en-riesgo" ? "error" as const : "warning" as const, href: `/v2/proyectos/${project.slug}` })),
  ].slice(0, 7);

  return (
    <div className={s.page}>
      <PageHead
        rotulo="Inicio · Tablero personal"
        title={`Buen día, ${CURRENT_USER.firstName}`}
        description={<>{REFERENCE_DATE_LABEL} · Tenés {plural(pending.length, "tarea pendiente", "tareas pendientes")}, {plural(attentionCount, "tema que requiere atención", "temas que requieren atención")} y {plural(clients.length, "cliente asignado", "clientes asignados")}.</>}
      />

      <section className={s.kpis} aria-label="Resumen personal">
        <OSKpiTile scope="Tu trabajo" value={pending.length} label="tareas pendientes" detail={pending.some((task) => task.dueKind === "late") ? "Hay tareas vencidas" : "Sin vencidas asignadas"} href="/v2/mis-tareas" cta="Abrir" />
        <OSKpiTile scope="Tu atención" value={attentionCount} label="alertas y temas" detail={`${approvals.length} aprobaciones · ${blockers.length} bloqueos`} href="#atencion" cta="Revisar" />
        <OSKpiTile scope="Tu cartera" value={clients.length} label="clientes asignados" detail="Acceso directo a cada cuenta" href="/v2/clientes?tab=mine" cta="Ver" />
      </section>

      <div className={d.homeGrid}>
        <section className={`${s.surface} ${d.homePanel}`} aria-labelledby="home-tasks-title">
          <div className={s.cardHead}><h2 id="home-tasks-title">Tareas pendientes</h2><Link className={s.link} href="/v2/mis-tareas">Ver todas</Link></div>
          {pending.length ? pending.slice(0, 7).map((task) => <MyTaskRow item={task} key={task.id} />) : <OSEmptyState icon="chispa" title="No tenés tareas pendientes">Las nuevas asignaciones aparecerán acá.</OSEmptyState>}
        </section>

        <section className={`${s.surface} ${d.homePanel}`} aria-labelledby="atencion" id="atencion">
          <div className={s.cardHead}><h2>Alertas y temas que requieren tu atención</h2><span className={s.cardMeta}>{alerts.length}</span></div>
          {alerts.length ? <div className={d.homeList}>{alerts.map((alert) => (
            <div className={d.homeAlert} key={alert.id}>
              <span className={d.homeAlertDot} data-tone={alert.tone} aria-hidden="true" />
              <span className={d.homeAlertMain}><strong>{alert.title}</strong><span>{alert.detail}</span></span>
              <Link className={s.link} href={alert.href}>Abrir</Link>
            </div>
          ))}</div> : <OSEmptyState icon="chispa" title="No hay alertas para vos">Los bloqueos, aprobaciones y proyectos críticos aparecerán acá.</OSEmptyState>}
        </section>

        <section className={`${s.surface} ${d.homePanel}`} aria-labelledby="assigned-clients-title">
          <div className={s.cardHead}><h2 id="assigned-clients-title">Clientes asignados</h2><Link className={s.link} href="/v2/clientes?tab=mine">Ver cartera</Link></div>
          {clients.length ? <div className={d.homeList}>{clients.map((client) => {
            const meta = directorMeta(client.slug);
            return (
              <Link href={`/v2/clientes/${client.slug}`} className={d.homeClient} key={client.slug}>
                <span className={d.homeClientMark} aria-hidden="true">{client.initials}</span>
                <span className={d.homeClientMain}><strong>{client.name}</strong><small>{client.services.length} módulos · Próximo hito: {client.nextMilestone.label}</small></span>
                <span><OSStatus status={client.status} /><span className={s.srOnly}> · Facturación {meta?.billingStatus}</span></span>
              </Link>
            );
          })}</div> : <OSEmptyState icon="persona" title="No tenés clientes asignados">Cuando te asignen a una cuenta aparecerá en este listado.</OSEmptyState>}
        </section>
      </div>
    </div>
  );
}
