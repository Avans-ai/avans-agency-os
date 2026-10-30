import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CircleAlert,
  Clock3,
  IdCard,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  UserCheck,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import {
  accessDemoPeriod,
  accessLifecycleSteps,
  accessPolicies,
  accessReviews,
  accessRoles,
  accessSessions,
  accessSources,
  accessUsers,
  permissionDomains,
  type AccessLevel,
  type AccessReviewStatus,
  type AccessRisk,
  type AccessSessionRisk,
  type AccessSourceStatus,
  type AccessUserStatus,
} from "../access-data";
import styles from "../users-access-hub.module.css";

function sourceClass(status: AccessSourceStatus) {
  if (status === "Disponible") return styles.statusAvailable;
  if (status === "Parcial") return styles.statusPartial;
  return styles.statusPending;
}

function userStatusClass(status: AccessUserStatus) {
  if (status === "Activo") return styles.userActive;
  if (status === "Invitación pendiente") return styles.userPending;
  if (status === "Suspendido") return styles.userSuspended;
  return styles.userReview;
}

function reviewStatusClass(status: AccessReviewStatus) {
  if (status === "Resuelta") return styles.reviewResolved;
  if (status === "Abierta") return styles.reviewOpen;
  return styles.reviewScheduled;
}

function riskClass(risk: AccessRisk) {
  if (risk === "Alta") return styles.riskHigh;
  if (risk === "Media") return styles.riskMedium;
  return styles.riskLow;
}

function permissionClass(level: AccessLevel) {
  if (level === "Total") return styles.permissionTotal;
  if (level === "Área") return styles.permissionArea;
  if (level === "Asignado") return styles.permissionAssigned;
  if (level === "Lectura") return styles.permissionRead;
  return styles.permissionNone;
}

function sessionClass(risk: AccessSessionRisk) {
  if (risk === "Normal") return styles.sessionNormal;
  if (risk === "Revisar") return styles.sessionReview;
  return styles.sessionBlocked;
}

export function UsersAccessHub() {
  const activeUsers = accessUsers.filter((user) => user.status === "Activo" || user.status === "En revisión");
  const pendingInvitations = accessUsers.filter((user) => user.status === "Invitación pendiente");
  const openReviews = accessReviews.filter((review) => review.status === "Abierta");
  const riskySessions = accessSessions.filter((session) => session.risk !== "Normal");
  const availableSources = accessSources.filter((source) => source.status === "Disponible").length;
  const partialSources = accessSources.filter((source) => source.status === "Parcial").length;
  const pendingSources = accessSources.filter((source) => source.status === "Pendiente").length;

  const metrics = [
    {
      label: "Identidades activas",
      value: `${activeUsers.length}`,
      detail: `${pendingInvitations.length} invitación pendiente`,
      state: "Directorio demo",
      tone: "neutral" as const,
      icon: UsersRound,
      href: "#directorio",
    },
    {
      label: "Proveedor de acceso",
      value: "Google",
      detail: "Sólo @avans.agency",
      state: "Implementación pendiente",
      tone: "warning" as const,
      icon: KeyRound,
      href: "#politicas",
    },
    {
      label: "Roles base",
      value: `${accessRoles.length}`,
      detail: "Organización y plataforma separados",
      state: "Modelo disponible",
      tone: "healthy" as const,
      icon: IdCard,
      href: "#roles",
    },
    {
      label: "Revisiones abiertas",
      value: `${openReviews.length}`,
      detail: "Acceso temporal con vencimiento",
      state: openReviews.length ? "Decisión requerida" : "Al día",
      tone: openReviews.length ? ("warning" as const) : ("healthy" as const),
      icon: CircleAlert,
      href: "#revisiones",
    },
    {
      label: "Sesiones a revisar",
      value: `${riskySessions.length}`,
      detail: "Dispositivo o contexto no habitual",
      state: riskySessions.length ? "Confirmar o revocar" : "Sin alertas",
      tone: riskySessions.length ? ("critical" as const) : ("healthy" as const),
      icon: Activity,
      href: "#sesiones",
    },
    {
      label: "Registro público",
      value: "OFF",
      detail: "Altas únicamente por invitación",
      state: "Política definida",
      tone: "healthy" as const,
      icon: LockKeyhole,
      href: "#ciclo",
    },
  ];

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrowLight}>PLATAFORMA · IDENTIDAD Y ACCESO</span>
          <h1>Cada persona entra con identidad, rol y alcance explícitos.</h1>
          <p>
            Usuarios y roles conecta Google Workspace, estructura organizacional, clientes asignados y permisos por acción. El rol ofrece un punto de partida; nunca reemplaza el control por área, cliente y sensibilidad del dato.
          </p>
        </div>
        <div className={styles.heroAside}>
          <span>PERÍODO DE DEMOSTRACIÓN</span>
          <strong>{accessDemoPeriod}</strong>
          <div className={styles.heroFacts}>
            <div><em>{availableSources}</em><small>Fuentes disponibles</small></div>
            <div><em>{partialSources}</em><small>Fuente parcial</small></div>
            <div><em>{pendingSources}</em><small>Integraciones pendientes</small></div>
          </div>
          <p>Identidades y correos sintéticos. El demo todavía no exige autenticación real con Google.</p>
        </div>
      </section>

      <div className={styles.scopeBar} aria-label="Modelo de acceso">
        <div><span>IDENTIDAD</span><strong>Quién es y cómo se autentica</strong></div>
        <div><span>ROL ORGANIZACIONAL</span><strong>Qué responsabilidad cumple en Avans</strong></div>
        <div><span>ROL DE PLATAFORMA</span><strong>Qué puede ver, editar o aprobar</strong></div>
        <div><span>ALCANCE</span><strong>Área, clientes, proyectos y datos habilitados</strong></div>
      </div>

      <section className={styles.metricsGrid} aria-label="Indicadores de acceso">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const toneClass =
            metric.tone === "critical"
              ? styles.toneCritical
              : metric.tone === "warning"
                ? styles.toneWarning
                : metric.tone === "healthy"
                  ? styles.toneHealthy
                  : styles.toneNeutral;

          return (
            <Link key={metric.label} href={metric.href} className={styles.metricCard}>
              <div className={styles.metricTop}>
                <span>{metric.label}</span>
                <Icon size={18} aria-hidden="true" />
              </div>
              <strong>{metric.value}</strong>
              <p>{metric.detail}</p>
              <div className={styles.metricFooter}>
                <span className={toneClass}>{metric.state}</span>
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
            <h2>Qué fuente sostiene cada decisión de acceso</h2>
          </div>
          <p>El sistema diferencia una política definida de una integración realmente activa. Ningún control aparece como operativo sólo porque exista una pantalla.</p>
        </div>
        <div className={styles.sourceGrid}>
          {accessSources.map((source) => (
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

      <section className={styles.block} id="directorio">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>DIRECTORIO Y REVISIONES</span>
            <h2>Identidades activas, alcance y excepciones temporales</h2>
          </div>
          <p>Una persona puede cambiar de función sin conservar automáticamente los permisos anteriores. Cada excepción debe tener motivo, aprobador y vencimiento.</p>
        </div>

        <div className={styles.directoryLayout}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>IDENTIDADES · DEMO</span>
                <h2>Usuarios internos</h2>
              </div>
              <UsersRound size={22} aria-hidden="true" />
            </div>
            <div className={styles.directoryHead} aria-hidden="true">
              <span>Identidad</span><span>Área / función</span><span>Rol de plataforma</span><span>Alcance</span><span>Último acceso</span><span>Revisión</span><span>Estado</span>
            </div>
            <div className={styles.directoryList}>
              {accessUsers.map((user) => (
                <div key={user.id} className={styles.directoryRow}>
                  <div className={styles.identityCell}><strong>{user.identity}</strong><small>{user.email}</small></div>
                  <div><strong>{user.area}</strong><small>{user.organizationalRole}</small></div>
                  <div><strong>{user.platformRole}</strong><small>{user.authentication}</small></div>
                  <div><strong>{user.scope}</strong><small>Alcance efectivo</small></div>
                  <div><strong>{user.lastAccess}</strong><small>Actividad de sesión</small></div>
                  <div><strong>{user.review}</strong><small>Recertificación</small></div>
                  <div><span className={userStatusClass(user.status)}>{user.status}</span></div>
                </div>
              ))}
            </div>
          </article>

          <aside className={styles.panel} id="revisiones">
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>COLA DE ACCESO</span>
                <h2>Revisiones y vencimientos</h2>
              </div>
              <UserCheck size={22} aria-hidden="true" />
            </div>
            <div className={styles.reviewList}>
              {accessReviews.map((review) => (
                <div key={review.id} className={styles.reviewRow}>
                  <div className={styles.reviewTop}>
                    <span className={reviewStatusClass(review.status)}>{review.status}</span>
                    <span className={riskClass(review.risk)}>Riesgo {review.risk.toLowerCase()}</span>
                  </div>
                  <strong>{review.title}</strong>
                  <p>{review.scope}</p>
                  <div className={styles.reviewMeta}>
                    <div><span>SOLICITANTE</span><strong>{review.requester}</strong></div>
                    <div><span>APROBADOR</span><strong>{review.approver}</strong></div>
                    <div><span>VENCE</span><strong>{review.expires}</strong></div>
                  </div>
                  <small>{review.action}</small>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.block} id="roles">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>ROLES Y PERMISOS</span>
            <h2>El rol define defaults; el alcance decide el acceso real</h2>
          </div>
          <p>La matriz sirve para establecer permisos base. Las políticas de datos y el alcance por cliente deben verificar cada operación del lado servidor.</p>
        </div>

        <div className={styles.roleGrid}>
          {accessRoles.map((role, index) => (
            <article key={role.id} className={styles.roleCard}>
              <div className={styles.roleTop}><span>{String(index + 1).padStart(2, "0")}</span><em>{role.users} usuario{role.users === 1 ? "" : "s"}</em></div>
              <h3>{role.title}</h3>
              <p>{role.defaultScope}</p>
              <div><span>PUEDE</span><strong>{role.capabilities}</strong></div>
              <small>{role.restrictions}</small>
            </article>
          ))}
        </div>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>MATRIZ BASE</span>
              <h2>Visibilidad por área del sistema</h2>
            </div>
            <ShieldCheck size={22} aria-hidden="true" />
          </div>
          <div className={styles.permissionScroll}>
            <div className={styles.permissionHead} aria-hidden="true">
              <span>Módulo</span><span>Administrador</span><span>Gerencia</span><span>Líder de área</span><span>Equipo</span><span>Finanzas / Admin.</span>
            </div>
            <div className={styles.permissionList}>
              {permissionDomains.map((domain) => (
                <div key={domain.module} className={styles.permissionRow}>
                  <div><strong>{domain.module}</strong><small>{domain.detail}</small></div>
                  <span className={permissionClass(domain.admin)}>{domain.admin}</span>
                  <span className={permissionClass(domain.management)}>{domain.management}</span>
                  <span className={permissionClass(domain.lead)}>{domain.lead}</span>
                  <span className={permissionClass(domain.team)}>{domain.team}</span>
                  <span className={permissionClass(domain.finance)}>{domain.finance}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.matrixRule}>
            <LockKeyhole size={17} aria-hidden="true" />
            <span>Una denegación explícita o una política de dato restringido prevalece sobre el permiso general del rol.</span>
          </div>
        </article>
      </section>

      <section className={styles.block} id="sesiones">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>SESIONES Y POLÍTICAS</span>
            <h2>Acceso continuo sólo mientras identidad y contexto sigan siendo válidos</h2>
          </div>
          <p>Las sesiones deben poder revisarse y revocarse sin modificar el usuario completo. Las elevaciones privilegiadas se tratan como excepciones temporales.</p>
        </div>

        <div className={styles.twoColumn}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>SESIONES ACTIVAS · DEMO</span>
                <h2>Dispositivos y señales de riesgo</h2>
              </div>
              <Activity size={22} aria-hidden="true" />
            </div>
            <div className={styles.sessionList}>
              {accessSessions.map((session) => (
                <div key={session.id} className={styles.sessionRow}>
                  <span className={sessionClass(session.risk)}>{session.risk}</span>
                  <div className={styles.sessionMain}>
                    <small>{session.device} · {session.location}</small>
                    <strong>{session.identity}</strong>
                    <p>{session.authentication} · {session.lastActivity}</p>
                  </div>
                  <div className={styles.sessionAction}>
                    <span>ACCIÓN</span>
                    <strong>{session.action}</strong>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.panel} id="politicas">
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>POLÍTICAS CLAVE</span>
                <h2>Reglas que deben convertirse en enforcement</h2>
              </div>
              <KeyRound size={22} aria-hidden="true" />
            </div>
            <div className={styles.policyList}>
              {accessPolicies.map((policy) => (
                <div key={policy.title} className={styles.policyRow}>
                  <div><strong>{policy.title}</strong><span>{policy.state}</span></div>
                  <p>{policy.detail}</p>
                </div>
              ))}
            </div>
            <Link href="/v2/seguridad" className={styles.securityLink}>
              <ShieldCheck size={18} aria-hidden="true" />
              <strong>Revisar controles de seguridad y autorización</strong>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </article>
        </div>
      </section>

      <section className={styles.block} id="ciclo">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>CICLO DE ACCESO</span>
            <h2>Alta, cambio, revisión y baja con trazabilidad</h2>
          </div>
          <p>El proceso se conecta con RRHH, Operaciones, Seguridad y Auditoría para que ningún cambio de persona o responsabilidad deje permisos huérfanos.</p>
        </div>
        <div className={styles.lifecycleFlow}>
          {accessLifecycleSteps.map((step) => (
            <article key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </article>
          ))}
        </div>
        <div className={styles.lifecycleActions}>
          <Link href="/v2/rrhh"><UserRoundPlus size={17} /><span>RRHH y estructura</span><ArrowRight size={15} /></Link>
          <Link href="/v2/seguridad"><ShieldCheck size={17} /><span>Seguridad</span><ArrowRight size={15} /></Link>
          <Link href="/v2/auditoria"><Clock3 size={17} /><span>Auditoría</span><ArrowRight size={15} /></Link>
        </div>
      </section>

      <section className={styles.block}>
        <div className={styles.darkPanel}>
          <span className={styles.eyebrowLight}>PRINCIPIO DE ACCESO</span>
          <h2>Un rol no es una llave maestra.</h2>
          <p>La autorización correcta combina identidad, responsabilidad, alcance, sensibilidad del dato y acción solicitada. Todo permiso excepcional debe poder explicarse, revisarse y revocarse.</p>
          <div className={styles.darkList}>
            <div><span>Identificar</span><strong>Quién entra y desde qué contexto</strong></div>
            <div><span>Limitar</span><strong>Qué datos y acciones necesita realmente</strong></div>
            <div><span>Revisar</span><strong>Cuándo deja de necesitar ese acceso</strong></div>
          </div>
        </div>
      </section>
    </div>
  );
}
