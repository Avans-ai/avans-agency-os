import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CircleAlert,
  CircleCheck,
  CloudCog,
  Database,
  FileKey,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  Network,
  RotateCcw,
  ServerCog,
  ShieldCheck,
} from "lucide-react";
import {
  authenticationRequirements,
  authorizationLayers,
  continuityChecks,
  dataClasses,
  incidentResponseSteps,
  secretSurfaces,
  securityControls,
  securityDemoPeriod,
  securityEnvironments,
  securityEvents,
  type SecurityControlStatus,
  type SecurityEventStatus,
  type SecuritySeverity,
} from "../security-data";
import styles from "../security-hub.module.css";

function controlClass(status: SecurityControlStatus) {
  if (status === "Operativo") return styles.statusOperational;
  if (status === "Parcial") return styles.statusPartial;
  if (status === "Atención") return styles.statusAttention;
  return styles.statusPending;
}

function severityClass(severity: SecuritySeverity) {
  if (severity === "Crítica") return styles.severityCritical;
  if (severity === "Alta") return styles.severityHigh;
  if (severity === "Media") return styles.severityMedium;
  return styles.severityLow;
}

function eventStatusClass(status: SecurityEventStatus) {
  if (status === "Resuelto") return styles.eventResolved;
  if (status === "En revisión") return styles.eventReview;
  if (status === "Nuevo") return styles.eventNew;
  return styles.eventScheduled;
}

export function SecurityHub() {
  const operationalControls = securityControls.filter((control) => control.status === "Operativo");
  const partialControls = securityControls.filter((control) => control.status === "Parcial");
  const pendingControls = securityControls.filter((control) => control.status === "Pendiente");
  const attentionControls = securityControls.filter((control) => control.status === "Atención");
  const openEvents = securityEvents.filter((event) => event.status !== "Resuelto");
  const highEvents = securityEvents.filter((event) => event.severity === "Alta" || event.severity === "Crítica");
  const secretAttention = secretSurfaces.filter((surface) => surface.status === "Atención" || surface.status === "Pendiente");
  const restorePending = continuityChecks.filter((check) => check.status === "Pendiente");

  const metrics = [
    {
      label: "Dominios de control",
      value: `${securityControls.length}`,
      detail: `${operationalControls.length} operativo · ${partialControls.length} parciales`,
      state: "Cobertura en evolución",
      tone: "warning" as const,
      icon: ShieldCheck,
      href: "#controles",
    },
    {
      label: "Autenticación",
      value: "Google",
      detail: "Sólo @avans.agency",
      state: "Integración pendiente",
      tone: "warning" as const,
      icon: Fingerprint,
      href: "#autenticacion",
    },
    {
      label: "Autorización",
      value: "RLS",
      detail: "Matriz definida; enforcement pendiente",
      state: "Prioridad técnica",
      tone: "critical" as const,
      icon: LockKeyhole,
      href: "#autorizacion",
    },
    {
      label: "Eventos abiertos",
      value: `${openEvents.length}`,
      detail: `${highEvents.length} de severidad alta`,
      state: openEvents.length ? "Requieren seguimiento" : "Sin eventos",
      tone: highEvents.length ? ("critical" as const) : ("healthy" as const),
      icon: CircleAlert,
      href: "#eventos",
    },
    {
      label: "Secretos a revisar",
      value: `${secretAttention.length}`,
      detail: "Sin inventario o rotación completa",
      state: "Acción prioritaria",
      tone: "warning" as const,
      icon: FileKey,
      href: "#secretos",
    },
    {
      label: "Recuperación",
      value: `${restorePending.length}`,
      detail: "Controles pendientes de validación",
      state: "Probar restore",
      tone: "warning" as const,
      icon: RotateCcw,
      href: "#continuidad",
    },
  ];

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrowLight}>PLATAFORMA · CONTROL Y PROTECCIÓN</span>
          <h1>Seguridad protege identidad, datos, código y continuidad.</h1>
          <p>
            No es una pantalla agregada al final. Es una arquitectura de controles que verifica quién actúa, sobre qué información, desde qué ambiente, con qué credencial y cómo se recupera la operación si algo falla.
          </p>
        </div>
        <div className={styles.heroAside}>
          <span>PERÍODO DE DEMOSTRACIÓN</span>
          <strong>{securityDemoPeriod}</strong>
          <div className={styles.heroFacts}>
            <div><em>{operationalControls.length}</em><small>Control operativo</small></div>
            <div><em>{partialControls.length}</em><small>Controles parciales</small></div>
            <div><em>{pendingControls.length + attentionControls.length}</em><small>Prioridades abiertas</small></div>
          </div>
          <p>La vista modela controles y evidencia. No afirma que Google Auth, RLS o backups productivos estén implementados todavía.</p>
        </div>
      </section>

      <div className={styles.scopeBar} aria-label="Ciclo de seguridad">
        <div><span>PREVENIR</span><strong>Identidad, permisos, secretos y entornos separados</strong></div>
        <div><span>DETECTAR</span><strong>Eventos, anomalías, fallas y cambios sensibles</strong></div>
        <div><span>CONTENER</span><strong>Revocar acceso, credencial o acción sin perder evidencia</strong></div>
        <div><span>RECUPERAR</span><strong>Rollback, restore y validación del proceso principal</strong></div>
      </div>

      <section className={styles.metricsGrid} aria-label="Indicadores de seguridad">
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

      <section className={styles.block} id="controles">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>POSTURA DE SEGURIDAD</span>
            <h2>Cobertura real por dominio de control</h2>
          </div>
          <p>Cada dominio muestra estado, evidencia y próximo paso. Una intención documentada no se presenta como control operativo hasta que exista enforcement y validación.</p>
        </div>
        <div className={styles.controlGrid}>
          {securityControls.map((control, index) => (
            <Link key={control.id} href={control.href} className={styles.controlCard}>
              <div className={styles.controlTop}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span className={controlClass(control.status)}>{control.status}</span>
              </div>
              <h3>{control.domain}</h3>
              <p>{control.coverage}</p>
              <div className={styles.controlEvidence}>
                <span>EVIDENCIA ACTUAL</span>
                <strong>{control.evidence}</strong>
              </div>
              <div className={styles.controlFooter}>
                <div><span>RESPONSABLE</span><strong>{control.owner}</strong></div>
                <ArrowRight size={15} aria-hidden="true" />
              </div>
              <small>{control.nextAction}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.block} id="autenticacion">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>AUTENTICACIÓN Y AUTORIZACIÓN</span>
            <h2>Entrar al sistema y poder actuar son controles distintos</h2>
          </div>
          <p>Google confirma identidad. Avans OS todavía debe decidir qué recurso puede ver la persona y qué acción está permitida en cada contexto.</p>
        </div>

        <div className={styles.authLayout}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>POLÍTICA DE LOGIN</span>
                <h2>Requisitos de autenticación</h2>
              </div>
              <Fingerprint size={22} aria-hidden="true" />
            </div>
            <div className={styles.authList}>
              {authenticationRequirements.map((item) => (
                <div key={item.requirement} className={styles.authRow}>
                  <div className={styles.authTitle}>
                    <strong>{item.requirement}</strong>
                    <span className={controlClass(item.status)}>{item.status}</span>
                  </div>
                  <p>{item.implementation}</p>
                  <small>{item.evidence}</small>
                </div>
              ))}
            </div>
            <Link href="/v2/usuarios" className={styles.inlineLink}>
              <KeyRound size={18} aria-hidden="true" />
              <strong>Revisar usuarios, sesiones y elevaciones temporales</strong>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </article>

          <article className={styles.panel} id="autorizacion">
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>DECISIÓN DE ACCESO</span>
                <h2>Seis capas antes de ejecutar</h2>
              </div>
              <LockKeyhole size={22} aria-hidden="true" />
            </div>
            <div className={styles.authorizationFlow}>
              {authorizationLayers.map((layer) => (
                <div key={layer.number} className={styles.authorizationStep}>
                  <span>{layer.number}</span>
                  <div><strong>{layer.title}</strong><p>{layer.detail}</p></div>
                </div>
              ))}
            </div>
            <div className={styles.policyNote}>
              <ShieldCheck size={17} aria-hidden="true" />
              <span>La interfaz puede ocultar un botón, pero la API y la base deben rechazar igualmente una operación no autorizada.</span>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.block}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>CLASIFICACIÓN DE DATOS</span>
            <h2>No toda información necesita el mismo nivel de protección</h2>
          </div>
          <p>Clasificar permite definir visibilidad, retención, exportación, logging y respuesta ante incidentes sin tratar todo como público ni bloquear toda la operación.</p>
        </div>
        <article className={styles.panel}>
          <div className={styles.dataHead} aria-hidden="true">
            <span>Clase</span><span>Nivel</span><span>Ejemplos</span><span>Acceso por defecto</span><span>Controles</span>
          </div>
          <div className={styles.dataList}>
            {dataClasses.map((item) => (
              <div key={item.name} className={styles.dataRow}>
                <div><strong>{item.name}</strong><small>Clasificación interna</small></div>
                <div><span>{item.level}</span></div>
                <div><strong>{item.examples}</strong></div>
                <div><strong>{item.defaultAccess}</strong></div>
                <div><strong>{item.controls}</strong></div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className={styles.block} id="secretos">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>AMBIENTES Y SECRETOS</span>
            <h2>Separar código no alcanza: también deben separarse datos y credenciales</h2>
          </div>
          <p>Preview no debe reutilizar permisos productivos amplios. Cada ambiente y conexión necesita propósito, propietario, alcance y mecanismo de revocación.</p>
        </div>

        <div className={styles.twoColumn}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>AMBIENTES</span>
                <h2>Development → Staging → Production</h2>
              </div>
              <Boxes size={22} aria-hidden="true" />
            </div>
            <div className={styles.environmentList}>
              {securityEnvironments.map((environment) => (
                <div key={environment.name} className={styles.environmentRow}>
                  <div className={styles.environmentTop}>
                    <strong>{environment.name}</strong>
                    <span className={controlClass(environment.status)}>{environment.status}</span>
                  </div>
                  <div className={styles.environmentMeta}>
                    <div><span>CÓDIGO</span><strong>{environment.branch}</strong></div>
                    <div><span>DATOS</span><strong>{environment.data}</strong></div>
                    <div><span>SECRETOS</span><strong>{environment.secrets}</strong></div>
                  </div>
                  <p>{environment.deployment}</p>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>INVENTARIO DE CREDENCIALES</span>
                <h2>Alcance, storage y rotación</h2>
              </div>
              <FileKey size={22} aria-hidden="true" />
            </div>
            <div className={styles.secretList}>
              {secretSurfaces.map((secret) => (
                <div key={secret.surface} className={styles.secretRow}>
                  <div className={styles.secretTop}>
                    <strong>{secret.surface}</strong>
                    <span className={controlClass(secret.status)}>{secret.status}</span>
                  </div>
                  <p>{secret.scope}</p>
                  <div className={styles.secretMeta}>
                    <div><span>STORAGE</span><strong>{secret.storage}</strong></div>
                    <div><span>ROTACIÓN</span><strong>{secret.rotation}</strong></div>
                  </div>
                  <small>{secret.action}</small>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className={styles.block} id="eventos">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>EVENTOS E INCIDENTES</span>
            <h2>Detectar no alcanza: cada señal necesita responsable y resolución</h2>
          </div>
          <p>Los eventos del demo son sintéticos. La arquitectura diferencia una alerta informativa de un incidente que requiere contención y recuperación.</p>
        </div>

        <div className={styles.eventLayout}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>EVENTOS DE SEGURIDAD · DEMO</span>
                <h2>Cola de revisión</h2>
              </div>
              <AlertTriangle size={22} aria-hidden="true" />
            </div>
            <div className={styles.eventList}>
              {securityEvents.map((event) => (
                <div key={event.id} className={styles.eventRow}>
                  <div className={styles.eventBadges}>
                    <span className={severityClass(event.severity)}>{event.severity}</span>
                    <span className={eventStatusClass(event.status)}>{event.status}</span>
                  </div>
                  <div className={styles.eventMain}>
                    <small>{event.source} · {event.detected}</small>
                    <strong>{event.title}</strong>
                    <p>{event.action}</p>
                  </div>
                  <div className={styles.eventOwner}><span>RESPONSABLE</span><strong>{event.owner}</strong></div>
                </div>
              ))}
            </div>
          </article>

          <aside className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>RESPUESTA</span>
                <h2>Flujo mínimo de incidente</h2>
              </div>
              <Activity size={22} aria-hidden="true" />
            </div>
            <div className={styles.incidentFlow}>
              {incidentResponseSteps.map((step) => (
                <div key={step.number} className={styles.incidentStep}>
                  <span>{step.number}</span>
                  <div><strong>{step.title}</strong><p>{step.detail}</p></div>
                </div>
              ))}
            </div>
            <Link href="/v2/auditoria" className={styles.inlineLink}>
              <Activity size={18} aria-hidden="true" />
              <strong>Revisar evidencia y cambios sensibles</strong>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </section>

      <section className={styles.block} id="continuidad">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>CONTINUIDAD Y RECUPERACIÓN</span>
            <h2>Backup, rollback y restore son controles diferentes</h2>
          </div>
          <p>La plataforma debe poder volver a una versión estable y recuperar datos sin asumir que un deployment anterior restaura también la base o los archivos.</p>
        </div>
        <div className={styles.continuityGrid}>
          {continuityChecks.map((check) => (
            <Link key={check.title} href={check.href} className={styles.continuityCard}>
              <div className={styles.continuityIcon}>
                {check.status === "Disponible" || check.status === "Definida" ? <CircleCheck size={19} /> : check.status === "Pendiente" ? <CircleAlert size={19} /> : <Database size={19} />}
              </div>
              <div><span>{check.status}</span><strong>{check.title}</strong><p>{check.detail}</p></div>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          ))}
        </div>
        <div className={styles.systemLinks}>
          <Link href="/v2/salud-sistema"><ServerCog size={17} /><span>Salud del sistema</span><ArrowRight size={15} /></Link>
          <Link href="/v2/integraciones"><Network size={17} /><span>Integraciones</span><ArrowRight size={15} /></Link>
          <Link href="/v2/guardrails"><CloudCog size={17} /><span>Guardrails</span><ArrowRight size={15} /></Link>
        </div>
      </section>

      <section className={styles.block}>
        <div className={styles.darkPanel}>
          <span className={styles.eyebrowLight}>PRINCIPIO DE SEGURIDAD</span>
          <h2>Un control existe cuando puede demostrarse.</h2>
          <p>La política explica qué debería ocurrir. El enforcement impide que ocurra lo contrario. La auditoría conserva evidencia y la recuperación comprueba que el sistema puede volver a operar.</p>
          <div className={styles.darkList}>
            <div><span>Prevenir</span><strong>Mínimo privilegio y separación</strong></div>
            <div><span>Demostrar</span><strong>Evidencia, fuente y trazabilidad</strong></div>
            <div><span>Recuperar</span><strong>Rollback, restore y aprendizaje</strong></div>
          </div>
        </div>
      </section>
    </div>
  );
}
