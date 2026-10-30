import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  Clock3,
  Database,
  IdCard,
  Layers3,
  ShieldCheck,
  UserRoundPlus,
  UsersRound,
  Workflow,
} from "lucide-react";
import {
  hrAbsences,
  hrAreaCapacity,
  hrAssignments,
  hrDemoPeriod,
  hrLifecycleSteps,
  hrPlatformRoles,
  hrSkillCoverage,
  hrSources,
  hrTeamSeats,
  type HrAbsenceStatus,
  type HrAssignmentStatus,
  type HrCapacityStatus,
  type HrSkillStatus,
  type HrSourceStatus,
} from "../hr-data";
import styles from "../hr-hub.module.css";

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function sourceClass(status: HrSourceStatus) {
  if (status === "Disponible") return styles.statusAvailable;
  if (status === "Parcial") return styles.statusPartial;
  return styles.statusPending;
}

function capacityClass(status: HrCapacityStatus) {
  if (status === "Disponible") return styles.capacityHealthy;
  if (status === "Vigilar") return styles.capacityWatch;
  return styles.capacityOverload;
}

function assignmentClass(status: HrAssignmentStatus) {
  if (status === "Estable") return styles.assignmentHealthy;
  if (status === "Revisar") return styles.assignmentWatch;
  return styles.assignmentCritical;
}

function absenceClass(status: HrAbsenceStatus) {
  if (status === "Cubierta") return styles.absenceHealthy;
  if (status === "Planificada") return styles.absencePlanned;
  return styles.absenceCritical;
}

function skillClass(status: HrSkillStatus) {
  if (status === "Cubierta") return styles.skillHealthy;
  if (status === "Concentrada") return styles.skillWatch;
  return styles.skillCritical;
}

export function HrHub() {
  const averageLoad = average(hrTeamSeats.map((seat) => seat.load));
  const overloaded = hrTeamSeats.filter((seat) => seat.status === "Sobrecarga");
  const watchSeats = hrTeamSeats.filter((seat) => seat.status === "Vigilar");
  const absenceWithoutCoverage = hrAbsences.filter((absence) => absence.status === "Requiere cobertura");
  const criticalSkills = hrSkillCoverage.filter((skill) => skill.status !== "Cubierta");
  const pendingCostCoverage = hrTeamSeats.filter((seat) => seat.costCoverage === "Pendiente");
  const availableSources = hrSources.filter((source) => source.status === "Disponible").length;
  const partialSources = hrSources.filter((source) => source.status === "Parcial").length;
  const pendingSources = hrSources.filter((source) => source.status === "Pendiente").length;

  const metrics = [
    {
      label: "Perfiles activos",
      value: `${hrTeamSeats.length}`,
      detail: "Asientos anonimizados de demo",
      state: "Estructura inicial",
      tone: "neutral" as const,
      icon: UsersRound,
      href: "#equipo",
    },
    {
      label: "Carga promedio",
      value: `${averageLoad}%`,
      detail: `${overloaded.length} perfil en sobrecarga`,
      state: averageLoad >= 80 ? "Vigilar" : "Operable",
      tone: averageLoad >= 80 ? ("warning" as const) : ("healthy" as const),
      icon: Activity,
      href: "#capacidad",
    },
    {
      label: "Perfiles a revisar",
      value: `${overloaded.length + watchSeats.length}`,
      detail: `${overloaded.length} sobrecarga · ${watchSeats.length} vigilancia`,
      state: "Reasignación",
      tone: "warning" as const,
      icon: CircleAlert,
      href: "#capacidad",
    },
    {
      label: "Ausencias próximas",
      value: `${hrAbsences.length}`,
      detail: `${absenceWithoutCoverage.length} sin cobertura definida`,
      state: absenceWithoutCoverage.length ? "Intervención" : "Cubiertas",
      tone: absenceWithoutCoverage.length ? ("critical" as const) : ("healthy" as const),
      icon: CalendarDays,
      href: "#ausencias",
    },
    {
      label: "Capacidades críticas",
      value: `${criticalSkills.length}`,
      detail: "Concentradas o con brecha",
      state: "Plan de cobertura",
      tone: "warning" as const,
      icon: Layers3,
      href: "#habilidades",
    },
    {
      label: "Costo interno",
      value: "Parcial",
      detail: `${pendingCostCoverage.length} perfiles sin banda validada`,
      state: "Fuente restringida",
      tone: "neutral" as const,
      icon: Database,
      href: "#costos",
    },
  ];

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrowLight}>ÁREA 05 · PERSONAS Y CAPACIDAD</span>
          <h1>RRHH conecta personas, asignaciones y capacidad real.</h1>
          <p>
            La plataforma organiza equipo, roles, disponibilidad, ausencias y cobertura alrededor del trabajo que Avans debe entregar. No convierte cantidad de tareas en una medición automática de productividad.
          </p>
        </div>
        <div className={styles.heroAside}>
          <span>PERÍODO DE DEMOSTRACIÓN</span>
          <strong>{hrDemoPeriod}</strong>
          <div className={styles.heroFacts}>
            <div><em>{availableSources}</em><small>Fuentes disponibles</small></div>
            <div><em>{partialSources}</em><small>Fuentes parciales</small></div>
            <div><em>{pendingSources}</em><small>Fuentes pendientes</small></div>
          </div>
          <p>Datos sintéticos y perfiles anonimizados para validar arquitectura. No representan información laboral real de Avans.</p>
        </div>
      </section>

      <div className={styles.scopeBar} aria-label="Alcance del módulo RRHH">
        <div><span>ROL ORGANIZACIONAL</span><strong>Qué responsabilidad tiene la persona</strong></div>
        <div><span>ROL DE PLATAFORMA</span><strong>Qué puede ver, editar o aprobar</strong></div>
        <div><span>ASIGNACIÓN</span><strong>Dónde está aplicada su capacidad hoy</strong></div>
        <div><span>PRIVACIDAD</span><strong>Datos sensibles separados del trabajo operativo</strong></div>
      </div>

      <section className={styles.metricsGrid} aria-label="Indicadores de RRHH">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Link key={metric.label} href={metric.href} className={styles.metricCard}>
              <div className={styles.metricTop}>
                <span>{metric.label}</span>
                <Icon size={18} aria-hidden="true" />
              </div>
              <strong>{metric.value}</strong>
              <p>{metric.detail}</p>
              <div className={styles.metricFooter}>
                <span className={styles[`tone${metric.tone[0].toUpperCase()}${metric.tone.slice(1)}`]}>{metric.state}</span>
                <ArrowRight size={14} aria-hidden="true" />
              </div>
            </Link>
          );
        })}
      </section>

      <section className={styles.block}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>COBERTURA DE DATOS</span>
            <h2>Qué conocemos del equipo y qué todavía debe definirse</h2>
          </div>
          <p>Antes de calcular capacidad, costos o disponibilidad, el sistema muestra qué fuente existe, cómo se actualiza y qué grado de confianza tiene.</p>
        </div>
        <div className={styles.sourceGrid}>
          {hrSources.map((source) => (
            <Link key={source.title} href={source.href} className={styles.sourceCard}>
              <div className={styles.sourceHead}>
                <strong>{source.title}</strong>
                <span className={sourceClass(source.status)}>{source.status}</span>
              </div>
              <p>{source.detail}</p>
              <div className={styles.sourceMeta}>
                <div><span>MÉTODO</span><strong>{source.method}</strong></div>
                <div><span>ACTUALIZACIÓN</span><strong>{source.freshness}</strong></div>
              </div>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.block} id="equipo">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>EQUIPO Y CAPACIDAD</span>
            <h2>Quién puede absorber trabajo y dónde existe riesgo</h2>
          </div>
          <p>La capacidad combina jornada disponible, asignaciones, hitos, ausencias y trabajo no planificado. No se interpreta como una evaluación automática de desempeño.</p>
        </div>

        <div className={styles.capacityLayout} id="capacidad">
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>PERFILES ANONIMIZADOS · DEMO</span>
                <h2>Carga y disponibilidad</h2>
              </div>
              <UsersRound size={22} aria-hidden="true" />
            </div>
            <div className={styles.teamHead} aria-hidden="true">
              <span>Perfil / rol</span><span>Área</span><span>Carga</span><span>Disponibilidad</span><span>Asignaciones</span><span>Próximo hito</span><span>Estado</span>
            </div>
            <div className={styles.teamList}>
              {hrTeamSeats.map((seat) => (
                <div key={seat.id} className={styles.teamRow}>
                  <div className={styles.teamIdentity}><strong>{seat.seat}</strong><small>{seat.role}</small></div>
                  <div><strong>{seat.area}</strong><small>{seat.focus}</small></div>
                  <div className={styles.loadCell}><strong>{seat.load}%</strong><div className={styles.loadTrack}><i style={{ width: `${seat.load}%` }} /></div></div>
                  <div><strong>{seat.available}%</strong><small>Capacidad estimada</small></div>
                  <div><strong>{seat.assignments}</strong><small>Frentes activos</small></div>
                  <div><strong>{seat.nextMilestone}</strong><small>Costo: {seat.costCoverage}</small></div>
                  <div><span className={capacityClass(seat.status)}>{seat.status}</span></div>
                </div>
              ))}
            </div>
          </article>

          <aside className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>CAPACIDAD POR ÁREA</span>
                <h2>Concentración y tendencia</h2>
              </div>
              <Activity size={22} aria-hidden="true" />
            </div>
            <div className={styles.areaCapacityList}>
              {hrAreaCapacity.map((area) => (
                <div key={area.area} className={styles.areaCapacityRow}>
                  <div className={styles.areaCapacityMeta}>
                    <div><strong>{area.area}</strong><small>{area.detail}</small></div>
                    <div><strong>{area.load}%</strong><small>{area.trend}</small></div>
                  </div>
                  <div className={styles.areaTrack}><i style={{ width: `${area.load}%` }} /></div>
                  <span className={capacityClass(area.status)}>{area.status}</span>
                </div>
              ))}
            </div>
            <div className={styles.policyNote}>
              <ShieldCheck size={17} aria-hidden="true" />
              <span>Una sobrecarga debe activar redistribución, cambio de fecha o decisión de alcance; no sólo una alerta visual.</span>
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.block}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>ASIGNACIONES</span>
            <h2>Capacidad vinculada a clientes y próximos hitos</h2>
          </div>
          <p>Las asignaciones permiten anticipar conflictos entre lo comprometido, la disponibilidad del equipo y el trabajo comercial que podría ingresar.</p>
        </div>
        <article className={styles.panel}>
          <div className={styles.assignmentHead} aria-hidden="true">
            <span>Cliente</span><span>Frente</span><span>Equipo</span><span>Carga</span><span>Próximo hito</span><span>Riesgo</span><span>Estado</span>
          </div>
          <div className={styles.assignmentList}>
            {hrAssignments.map((assignment) => (
              <Link key={assignment.id} href={assignment.href} className={styles.assignmentRow}>
                <div><strong>{assignment.client}</strong><small>Cliente activo</small></div>
                <div><strong>{assignment.workstream}</strong><small>Frente operativo</small></div>
                <div><strong>{assignment.team}</strong><small>Perfiles asignados</small></div>
                <div className={styles.assignmentLoad}><strong>{assignment.plannedLoad}%</strong><div className={styles.loadTrack}><i style={{ width: `${assignment.plannedLoad}%` }} /></div></div>
                <div><strong>{assignment.nextMilestone}</strong><small>Próximo compromiso</small></div>
                <div><strong>{assignment.risk}</strong><small>Dependencia principal</small></div>
                <div><span className={assignmentClass(assignment.status)}>{assignment.status}</span><ArrowRight size={14} aria-hidden="true" /></div>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className={styles.block}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>CONTINUIDAD OPERATIVA</span>
            <h2>Ausencias y capacidades críticas con cobertura explícita</h2>
          </div>
          <p>Planificar una ausencia no es sólo registrarla. El sistema debe identificar clientes, decisiones, accesos y responsabilidades que necesitan una cobertura concreta.</p>
        </div>

        <div className={styles.twoColumn}>
          <article className={styles.panel} id="ausencias">
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>AUSENCIAS PRÓXIMAS</span>
                <h2>Cobertura y handoff</h2>
              </div>
              <CalendarDays size={22} aria-hidden="true" />
            </div>
            <div className={styles.absenceList}>
              {hrAbsences.map((absence) => (
                <div key={absence.id} className={styles.absenceRow}>
                  <span className={absenceClass(absence.status)}>{absence.status}</span>
                  <div className={styles.absenceMain}>
                    <small>{absence.period} · {absence.type}</small>
                    <strong>{absence.seat}</strong>
                    <p>Afecta: {absence.affected}</p>
                  </div>
                  <div className={styles.absenceCoverage}>
                    <span>COBERTURA</span><strong>{absence.coverage}</strong><small>{absence.action}</small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.panel} id="habilidades">
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>HABILIDADES Y RESPALDO</span>
                <h2>Dependencias de personas clave</h2>
              </div>
              <Layers3 size={22} aria-hidden="true" />
            </div>
            <div className={styles.skillList}>
              {hrSkillCoverage.map((skill) => (
                <div key={skill.capability} className={styles.skillRow}>
                  <div className={styles.skillTop}>
                    <div><span>{skill.level}</span><strong>{skill.capability}</strong></div>
                    <span className={skillClass(skill.status)}>{skill.status}</span>
                  </div>
                  <p>{skill.coverage} · {skill.dependency}</p>
                  <small>{skill.action}</small>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className={styles.block}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>ROLES Y NIVELES DE USUARIO</span>
            <h2>La posición laboral no define automáticamente el acceso</h2>
          </div>
          <p>Una persona puede liderar un área y aun así no necesitar acceso a remuneraciones, costos, credenciales o información de otros equipos.</p>
        </div>
        <div className={styles.roleGrid}>
          {hrPlatformRoles.map((role, index) => (
            <article key={role.title} className={styles.roleCard}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{role.title}</h3>
              <p>{role.scope}</p>
              <small>{role.sensitive}</small>
            </article>
          ))}
        </div>
        <div className={styles.accessStrip}>
          <div><IdCard size={17} /><span>Login Google sólo con @avans.agency</span></div>
          <div><ShieldCheck size={17} /><span>Permisos por módulo, cliente y acción</span></div>
          <div><Activity size={17} /><span>Cambios de rol y accesos auditados</span></div>
          <div><Database size={17} /><span>Datos laborales sensibles con visibilidad restringida</span></div>
        </div>
      </section>

      <section className={styles.block} id="costos">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>CONEXIÓN CON FINANZAS</span>
            <h2>Del esfuerzo operativo al costo de entrega</h2>
          </div>
          <p>Finanzas necesita un costo imputable consistente, pero el resto del sistema no necesita exponer el salario individual para calcular rentabilidad.</p>
        </div>
        <div className={styles.costBridge}>
          <article><span>01</span><UsersRound size={20} /><h3>Persona y jornada</h3><p>Área, rol, disponibilidad y modalidad de trabajo.</p></article>
          <article><span>02</span><BriefcaseBusiness size={20} /><h3>Asignación</h3><p>Cliente, proyecto, frente y porcentaje o unidad de esfuerzo.</p></article>
          <article><span>03</span><Clock3 size={20} /><h3>Esfuerzo validado</h3><p>Horas, bloques o unidades de trabajo según el proceso elegido.</p></article>
          <article><span>04</span><Database size={20} /><h3>Banda de costo</h3><p>Costo interno restringido, no remuneración visible para toda la organización.</p></article>
          <article><span>05</span><Workflow size={20} /><h3>Imputación</h3><p>Relación con entregables, proveedores, tecnología y retrabajo.</p></article>
          <article><span>06</span><CircleCheck size={20} /><h3>Rentabilidad</h3><p>Margen por cliente, proyecto, servicio y período con trazabilidad.</p></article>
        </div>
        <Link href="/v2/finanzas" className={styles.financeLink}>
          <Database size={18} aria-hidden="true" />
          <strong>La fórmula y los permisos económicos se administran en Finanzas.</strong>
          <span>Revisar conexión financiera</span>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>

      <section className={styles.block}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>CICLO DE USUARIO</span>
            <h2>Alta, cambios y baja sin perder continuidad ni seguridad</h2>
          </div>
          <p>La gestión del equipo se conecta con Usuarios, Seguridad, Operaciones y Auditoría. Cada cambio debe conservar responsable, fecha y motivo.</p>
        </div>
        <div className={styles.lifecycleFlow}>
          {hrLifecycleSteps.map((step) => (
            <article key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </article>
          ))}
        </div>
        <div className={styles.lifecycleActions}>
          <Link href="/v2/usuarios"><UserRoundPlus size={17} /><span>Usuarios y roles</span><ArrowRight size={15} /></Link>
          <Link href="/v2/seguridad"><ShieldCheck size={17} /><span>Seguridad</span><ArrowRight size={15} /></Link>
          <Link href="/v2/auditoria"><Activity size={17} /><span>Auditoría</span><ArrowRight size={15} /></Link>
        </div>
      </section>

      <section className={styles.block}>
        <div className={styles.darkPanel}>
          <span className={styles.eyebrowLight}>PRINCIPIO DE RRHH</span>
          <h2>Capacidad no es productividad.</h2>
          <p>La plataforma ayuda a distribuir trabajo, proteger continuidad, anticipar saturación y sostener decisiones. No transforma actividad visible en una evaluación automática de personas.</p>
          <div className={styles.darkList}>
            <div><span>Planificar</span><strong>Disponibilidad, cobertura y próximos hitos</strong></div>
            <div><span>Proteger</span><strong>Privacidad, permisos y continuidad operativa</strong></div>
            <div><span>Aprender</span><strong>Carga, desvíos y criterios de asignación</strong></div>
          </div>
        </div>
      </section>
    </div>
  );
}
