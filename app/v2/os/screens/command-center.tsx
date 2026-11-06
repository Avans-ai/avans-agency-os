"use client";

import Link from "next/link";
import { useState } from "react";
import { Glyph } from "../glyphs";
import { CURRENT_USER, REFERENCE_DATE_LABEL, recentActivity } from "../os-data";
import { useOsStore } from "../os-store";
import { activeBlockers, DUE_GROUPS, getClient, myApprovals, myOpenWork, pendingApprovals, projectsNeedingAttention } from "../selectors";
import { ApprovalRow, MyTaskRow, NewTaskButton, taskContext, taskHref } from "../task-blocks";
import { Avatar, cx, LinkButton, OSEmptyState, OSKpiTile, OSStatus, PageHead } from "../ui";
import s from "../os.module.css";
import sc from "../screens.module.css";

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function CommandCenter() {
  const { tasks } = useOsStore();
  const [tab, setTab] = useState<"mine" | "agency">("mine");

  const mine = myOpenWork(tasks);
  const upcoming = mine.filter(item => item.dueKind !== "later" && item.dueKind !== "past");
  const today = mine.filter(item => item.dueKind === "today").length;
  const late = mine.filter(item => item.dueKind === "late").length;
  const approvalsMine = myApprovals(tasks);
  const approvalsAll = pendingApprovals(tasks);
  const blockers = activeBlockers(tasks);
  const alerts = projectsNeedingAttention();
  const atRisk = alerts.filter(project => project.status === "en-riesgo").length;
  const blocksOther = approvalsMine.filter(item => tasks.some(other => other.blocked?.includes(`(${item.id})`))).length;

  return (
    <div className={s.page}>
      <PageHead
        rotulo="Inicio · Command Center"
        title={`Buen día, ${CURRENT_USER.firstName}`}
        description={<>{REFERENCE_DATE_LABEL} · Tenés {plural(today, "tarea", "tareas")} para hoy, {plural(late, "vencida", "vencidas")} y {plural(approvalsMine.length, "aprobación esperando", "aprobaciones esperando")} tu OK.</>}
        actions={<><LinkButton href="/v2/proyectos">Ver mis proyectos</LinkButton><NewTaskButton /></>}
      />

      <section className={s.kpis} aria-label="Resumen del día">
        <OSKpiTile scope="Tuyo" value={today} label="tareas para hoy" detail={late ? `+${late} vencida desde ayer` : "Sin vencidas"} href="/v2/mis-tareas" />
        <OSKpiTile scope="Tuyo" value={approvalsMine.length} label="aprobaciones" detail={blocksOther ? `${blocksOther === 1 ? "Una bloquea" : `${blocksOther} bloquean`} a otra tarea` : "Ninguna bloquea a otra tarea"} href="/v2/aprobaciones" cta="Revisar" />
        <OSKpiTile scope="Agencia" value={blockers.length} label="bloqueos activos" detail={blockers.length ? "El más antiguo: 5 días" : "Sin bloqueos"} href="#bloqueos" />
        <OSKpiTile scope="Agencia" value={alerts.length} label="proyectos con alertas" detail={`${atRisk} en riesgo · ${alerts.length - atRisk} en atención`} href="/v2/proyectos" />
      </section>

      <div className={sc.homeTabs} role="tablist" aria-label="Vista de Inicio">
        <button type="button" role="tab" aria-selected={tab === "mine"} aria-controls="home-mine" onClick={() => setTab("mine")}>Mi trabajo</button>
        <button type="button" role="tab" aria-selected={tab === "agency"} aria-controls="home-agency" onClick={() => setTab("agency")}>Agencia</button>
      </div>

      <div className={sc.columns}>
        <div className={cx(sc.column, tab !== "mine" && sc.columnHiddenMobile)} id="home-mine">
          <p className={cx(s.rotulo, s.rotuloInk, sc.colLabel)}>Mi trabajo</p>
          <section className={s.surface} aria-labelledby="my-tasks-title">
            <div className={s.cardHead}><h2 id="my-tasks-title">Mis tareas y vencimientos</h2><span className={s.cardMeta}>{upcoming.length} pendientes</span></div>
            {upcoming.length ? DUE_GROUPS.filter(group => group.kind !== "later").map(group => {
              const items = upcoming.filter(item => item.dueKind === group.kind);
              if (!items.length) return null;
              return (
                <div key={group.kind} role="group" aria-label={group.label}>
                  <p className={cx(s.rotulo, group.kind !== "late" && s.rotuloInk, sc.groupLabel)}>{group.label}</p>
                  {items.map(item => <MyTaskRow key={item.id} item={item} />)}
                </div>
              );
            }) : <OSEmptyState icon="chispa" title="No tenés pendientes para esta semana">Las tareas nuevas que te asignen aparecen acá.</OSEmptyState>}
          </section>

          <section className={s.surface} aria-labelledby="my-approvals-title">
            <div className={s.cardHead}><h2 id="my-approvals-title">Esperan tu aprobación</h2><Link className={s.link} href="/v2/aprobaciones">Ver las {approvalsAll.length} de la agencia</Link></div>
            {approvalsMine.length ? approvalsMine.map(item => <ApprovalRow key={item.id} item={item} />) : <OSEmptyState icon="chispa" title="Nada espera tu aprobación">Cuando alguien te pida revisar una entrega, aparece acá.</OSEmptyState>}
          </section>
        </div>

        <div className={cx(sc.column, tab !== "agency" && sc.columnHiddenMobile)} id="home-agency">
          <p className={cx(s.rotulo, s.rotuloInk, sc.colLabel, sc.colLabelAgency)}>Agencia</p>
          <section className={s.surface} aria-labelledby="alerts-title">
            <div className={s.cardHead}><h2 id="alerts-title">Proyectos que necesitan atención</h2><Link className={s.link} href="/v2/proyectos">Todos</Link></div>
            {alerts.map(project => {
              const client = getClient(project.clientSlug);
              return (
                <article className={sc.projectItem} key={project.slug}>
                  <div className={sc.projectTop}><Link className={s.linkInk} href={`/v2/proyectos/${project.slug}`}>{project.name}</Link><OSStatus status={project.status} /></div>
                  <span className={sc.meta}><Link href={`/v2/clientes/${project.clientSlug}`}>{client?.name}</Link> · {project.owner} · Entrega {project.delivery.replace(" 2026", "")}</span>
                  {project.alert ? <span>{project.alert}</span> : null}
                </article>
              );
            })}
          </section>

          <section className={s.surface} aria-labelledby="bloqueos">
            <div className={s.cardHead}><h2 id="bloqueos">Bloqueos activos</h2><span className={s.cardMeta}>{blockers.length}</span></div>
            {blockers.length ? blockers.map(item => {
              const reason = item.blocked ? item.blocked.charAt(0).toUpperCase() + item.blocked.slice(1).replace(/\.$/, "") : "";
              return (
                <div className={sc.blockRow} key={item.id}>
                  <Glyph name="blocked" size={18} label="Bloqueada" />
                  <div>
                    <Link className={s.linkInk} href={taskHref(item)}>{item.id} {item.title}</Link>
                    <div className={sc.meta}>{taskContext(item).client?.name} · {reason} · {item.owner}</div>
                  </div>
                  <span className={sc.meta}>{item.blockedSince}</span>
                </div>
              );
            }) : <OSEmptyState icon="chispa" title="Sin bloqueos activos" />}
          </section>

          <section className={s.surface} aria-labelledby="activity-title">
            <div className={s.cardHead}><h2 id="activity-title">Actividad reciente</h2><span className={s.cardMeta}>Últimas 24 h</span></div>
            <ul style={{ listStyle: "none", margin: 0, padding: "4px 0 8px" }}>
              {recentActivity.map(item => (
                <li className={sc.activityRow} key={item.who + item.when}>
                  <Avatar name={item.who} />
                  <span><strong>{item.who}</strong> {item.text}</span>
                  <time>{item.when}</time>
                </li>
              ))}
            </ul>
          </section>
          <p className={s.demoNote}>¿Necesitás las excepciones del sistema? <Link className={s.link} href="/v2/inbox">Abrir la bandeja de excepciones</Link>.</p>
        </div>
      </div>
    </div>
  );
}
