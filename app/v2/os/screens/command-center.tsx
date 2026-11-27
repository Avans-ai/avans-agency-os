"use client";

import Link from "next/link";
import { Suspense } from "react";
import { clientOfTask, directorMeta, isAssignedClient } from "../director-data";
import { osClients } from "../os-data";
import { useOsStore } from "../os-store";
import { previewActor } from "../preview-roles";
import { activeBlockers, myApprovals, myOpenWork, projectsNeedingAttention } from "../selectors";
import { MyTaskRow, taskHref } from "../task-blocks";
import { ReturnLink } from "../navigation/back";
import { REMINDERS_NOTE } from "../workflow-tasks";
import { OSKpiTile, OSEmptyState, OSSkeletonRows, OSStatus, PageHead } from "../ui";
import s from "../os.module.css";
import d from "./director-update.module.css";

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function CommandCenter() {
  // ReturnLink lee la URL actual: en una página estática necesita su propio límite de Suspense.
  return <Suspense fallback={<div className={s.page}><OSSkeletonRows rows={5} label="Cargando Inicio…" /></div>}><CommandCenterBody /></Suspense>;
}

function CommandCenterBody() {
  const { tasks, role } = useOsStore();
  const actor = previewActor(role);
  const pending = myOpenWork(tasks, actor).filter((task) => task.status !== "Hecho");
  const approvals = myApprovals(tasks, actor);
  const blockers = activeBlockers(tasks).filter((task) => task.owner === actor || isAssignedClient(clientOfTask(task)?.slug ?? "", actor));
  const projectAlerts = projectsNeedingAttention().filter((project) => isAssignedClient(project.clientSlug, actor));
  const clients = osClients.filter((client) => isAssignedClient(client.slug, actor) || client.team.some((person) => person.name === actor));
  const attentionCount = approvals.length + blockers.length + projectAlerts.length;

  const alerts = [
    ...approvals.map((task) => ({ id: `approval-${task.id}`, title: "Aprobación pendiente", detail: `${task.approvalTitle ?? task.title} · ${task.id}`, tone: task.dueKind === "late" ? "error" as const : "warning" as const, href: taskHref(task) })),
    ...blockers.map((task) => ({ id: `blocked-${task.id}`, title: "Tarea bloqueada", detail: `${task.title}. ${task.blocked ?? "Requiere atención"} · ${task.id}`, tone: "error" as const, href: taskHref(task) })),
    ...projectAlerts.map((project) => ({ id: `project-${project.slug}`, title: `Proyecto ${project.status === "en-riesgo" ? "en riesgo" : "con atención"}`, detail: `${project.name}${project.alert ? ` · ${project.alert}` : ""}`, tone: project.status === "en-riesgo" ? "error" as const : "warning" as const, href: `/v2/proyectos/${project.slug}` })),
  ].slice(0, 7);

  return (
    <div className={s.page}>
      <PageHead
        rotulo="Inicio · Tablero personal"
        title={`Buen día, ${actor.split(" ")[0]}`}
        description={<>{new Date().toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "long", day: "numeric", month: "long" })} · Tenés {plural(pending.length, "tarea pendiente", "tareas pendientes")}, {plural(attentionCount, "tema que requiere atención", "temas que requieren atención")} y {plural(clients.length, "cliente asignado", "clientes asignados")}.</>}
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
          <p className={s.demoNote} style={{ margin: 0, padding: "10px 20px" }}>{REMINDERS_NOTE}</p>
        </section>

        <section className={`${s.surface} ${d.homePanel}`} aria-labelledby="atencion" id="atencion">
          <div className={s.cardHead}><h2>Alertas y temas que requieren tu atención</h2><span className={s.cardMeta}>{alerts.length}</span></div>
          {alerts.length ? <div className={d.homeList}>{alerts.map((alert) => (
            <div className={d.homeAlert} key={alert.id}>
              <span className={d.homeAlertDot} data-tone={alert.tone} aria-hidden="true" />
              <span className={d.homeAlertMain}><strong>{alert.title}</strong><span>{alert.detail}</span></span>
              <ReturnLink className={s.link} href={alert.href}>Abrir</ReturnLink>
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
                <span><OSStatus status={client.status} />{role === "admin" ? <span className={s.srOnly}> · Facturación {meta?.billingStatus}</span> : null}</span>
              </Link>
            );
          })}</div> : <OSEmptyState icon="persona" title="No tenés clientes asignados">Cuando te asignen a una cuenta aparecerá en este listado.</OSEmptyState>}
        </section>
      </div>
    </div>
  );
}
