import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { avansClients, type AgencyModuleSlug } from "../agency-client-data";
import { architectureAreas } from "../architecture-data";
import { AgencyClientGate } from "../components/agency-client-gate";
import { AuditHub } from "../components/audit-hub";
import { ArchitectureHub } from "../components/architecture-hub";
import { ClientHub } from "../components/client-hub";
import { FinanceHub } from "../components/finance-hub";
import { HrHub } from "../components/hr-hub";
import { InboxHub } from "../components/inbox-hub";
import { HealthHub } from "../components/health-hub";
import { IntegrationsHub } from "../components/integrations-hub";
import { AutomationHub } from "../components/automation-hub";
import { ManagementHub } from "../components/management-hub";
import { ModuleDepth } from "../components/module-depth";
import { OperationsHub } from "../components/operations-hub";
import { ProductReadinessHub } from "../components/product-readiness-hub";
import { SalesHub } from "../components/sales-hub";
import { SecurityHub } from "../components/security-hub";
import { UsersAccessHub } from "../components/users-access-hub";
import { V2Chrome } from "../components/v2-chrome";
import { v2NavItems, v2ParentBySlug } from "../navigation";
import { getOperationalObjectForRow } from "../object-data";
import { sectionData } from "../section-data";
import styles from "../v2.module.css";

const clientScopedAgencyModules = new Set<AgencyModuleSlug>(["contenido", "campanas", "reportes"]);

export function generateStaticParams() {
  return v2NavItems
    .filter((item) => item.slug !== "command-center")
    .map((item) => ({ section: item.slug }));
}

export default async function V2SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const navItem = v2NavItems.find((item) => item.slug === section);
  const architectureArea = architectureAreas[section];

  if (!navItem) notFound();

  if (section === "inbox") {
    return (
      <V2Chrome active={section} title={navItem.label}>
        <InboxHub />
      </V2Chrome>
    );
  }

  if (section === "clientes") {
    return (
      <V2Chrome active={section} title={navItem.label}>
        <ClientHub />
      </V2Chrome>
    );
  }

  if (section === "operaciones") {
    return (
      <V2Chrome active={section} title={navItem.label}>
        <OperationsHub />
      </V2Chrome>
    );
  }

  if (section === "ventas") {
    return (
      <V2Chrome active={section} title={navItem.label}>
        <SalesHub />
      </V2Chrome>
    );
  }

  if (section === "finanzas") {
    return (
      <V2Chrome active={section} title={navItem.label}>
        <FinanceHub />
      </V2Chrome>
    );
  }

  if (section === "rrhh") {
    return (
      <V2Chrome active={section} title={navItem.label}>
        <HrHub />
      </V2Chrome>
    );
  }

  if (section === "usuarios") {
    return (
      <V2Chrome active={section} title={navItem.label}>
        <UsersAccessHub />
      </V2Chrome>
    );
  }

  if (section === "seguridad") {
    return (
      <V2Chrome active={section} title={navItem.label}>
        <SecurityHub />
      </V2Chrome>
    );
  }

  if (section === "auditoria") {
    return (
      <V2Chrome active={section} title={navItem.label}>
        <AuditHub />
      </V2Chrome>
    );
  }

  if (section === "salud-sistema") {
    return (
      <V2Chrome active={section} title={navItem.label}>
        <HealthHub />
      </V2Chrome>
    );
  }

  if (section === "estado-producto") {
    return (
      <V2Chrome active={section} title={navItem.label}>
        <ProductReadinessHub />
      </V2Chrome>
    );
  }

  if (section === "integraciones") {
    return (
      <V2Chrome active={section} title={navItem.label}>
        <IntegrationsHub />
      </V2Chrome>
    );
  }

  if (section === "automatizaciones") {
    return (
      <V2Chrome active={section} title={navItem.label}>
        <AutomationHub />
      </V2Chrome>
    );
  }

  if (section === "gerencia") {
    return (
      <V2Chrome active={section} title={navItem.label}>
        <ManagementHub />
      </V2Chrome>
    );
  }

  if (architectureArea) {
    return (
      <V2Chrome active={section} title={navItem.label}>
        <ArchitectureHub area={architectureArea} />
      </V2Chrome>
    );
  }

  const data = sectionData[section];
  if (!data) notFound();

  const parentSlug = v2ParentBySlug[section];
  const parentNavItem = parentSlug ? v2NavItems.find((item) => item.slug === parentSlug) : null;

  if (clientScopedAgencyModules.has(section as AgencyModuleSlug)) {
    return (
      <V2Chrome active={section} title={navItem.label}>
        <AgencyClientGate module={section as AgencyModuleSlug} />
      </V2Chrome>
    );
  }

  return (
    <V2Chrome active={section} title={navItem.label}>
      <div className={styles.content}>
        {parentNavItem ? (
          <div className={styles.capabilityContext}>
            <div>
              <span>CAPACIDAD INTERNA DE</span>
              <strong>{parentNavItem.label}</strong>
              <span>· Se conserva como profundidad operativa, no como área principal.</span>
            </div>
            <Link href={parentNavItem.href}>
              Volver a {parentNavItem.label}
              <ArrowRight size={13} />
            </Link>
          </div>
        ) : null}
        <section className={styles.moduleHero}>
          <div>
            <span className={styles.eyebrow}>{data.eyebrow}</span>
            <h1>{data.title}</h1>
            <p>{data.description}</p>
          </div>
          <div className={styles.demoAction}>
            <strong>{data.action}</strong>
            <small>Simulado · requiere backend</small>
          </div>
        </section>

        <section className={styles.moduleStats}>
          {data.metrics.map((metric) => (
            <article key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
            </article>
          ))}
        </section>

        <section className={styles.moduleGrid}>
          <article className={styles.modulePanel}>
            <div className={styles.panelHead}>
              <div>
                <span className={styles.eyebrow}>VISTA OPERATIVA · DEMO</span>
                <h2>{data.title}</h2>
              </div>
              <span className={styles.demoPill}>Datos simulados</span>
            </div>

            <div className={styles.moduleRows}>
              {data.rows.map((row) => {
                const client = section === "clientes" ? avansClients.find((item) => item.name === row.title) : null;
                const object = getOperationalObjectForRow(section, row.title);
                const content = (
                  <>
                    <div>
                      <span className={styles.rowMeta}>{row.meta}</span>
                      <h3>{row.title}</h3>
                      <p>{row.detail}</p>
                    </div>
                    <div className={styles.rowSide}>
                      <span>{row.status}</span>
                      <ArrowRight size={15} />
                    </div>
                  </>
                );

                if (client) {
                  return (
                    <Link key={row.title} href={`/v2/clientes/${client.slug}`} className={styles.moduleRow}>
                      {content}
                    </Link>
                  );
                }

                if (object) {
                  return (
                    <Link key={row.title} href={`/v2/objetos/${section}/${object.slug}`} className={styles.moduleRow}>
                      {content}
                    </Link>
                  );
                }

                return (
                  <button key={row.title} className={styles.moduleRow}>
                    {content}
                  </button>
                );
              })}
            </div>
          </article>

          <aside className={styles.contextPanel}>
            <Sparkles size={20} />
            <span className={styles.eyebrow}>CÓMO LO PIENSA AVANS</span>
            <h2>{data.sideTitle}</h2>
            <div className={styles.contextList}>
              {data.sideItems.map((item, index) => (
                <div key={item}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item}</strong>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <ModuleDepth section={section} />
      </div>
    </V2Chrome>
  );
}
