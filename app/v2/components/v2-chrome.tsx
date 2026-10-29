import Link from "next/link";
import { Fragment, type ElementType, type ReactNode } from "react";
import { Activity, BrainCircuit, BriefcaseBusiness, ChartNoAxesCombined, FileChartColumn, Gauge, Inbox, Network, Settings2, ShieldCheck, Users, Workflow } from "lucide-react";
import { AvansLogo } from "../../components/avans-logo";
import { v2NavGroups, v2ParentBySlug } from "../navigation";
import { isRevisionArea } from "../owner-revision-data";
import { OwnerRevisionWorkspace } from "./owner-revision-workspace";
import { ThemeToggle } from "./theme-toggle";
import styles from "../v2.module.css";
import revision from "../owner-revision.module.css";

const iconMap: Record<string, ElementType> = {
  "command-center": Gauge, inbox: Inbox, clientes: Users, operaciones: Network,
  ventas: BriefcaseBusiness, finanzas: FileChartColumn, rrhh: Users, gerencia: ChartNoAxesCombined,
  usuarios: Settings2, integraciones: Settings2, automatizaciones: Workflow,
  seguridad: ShieldCheck, auditoria: BrainCircuit, "salud-sistema": Activity,
};

export function V2Chrome({ active, title, children }: { active: string; title: string; children: ReactNode }) {
  const effectiveActive = active === "clientes" && title.toLocaleLowerCase("es").includes("benchmark") ? "benchmark" : active;
  const activeNav = v2ParentBySlug[effectiveActive] ?? effectiveActive;
  const parent = v2NavGroups.flatMap(group => group.items).find(item => item.slug === activeNav);
  return (
    <main className={`${styles.shell} avans-v2-shell`}>
      <aside className={`${styles.sidebar} avans-v2-sidebar`}>
        <div className={styles.brand}><Link href="/v2" aria-label="Ir al Command Center"><AvansLogo variant="compact"/></Link><span className={styles.productName}>OS</span></div>
        <div className={styles.workspace}><span className={styles.mark}>↗</span><div><strong>Avans Agency</strong><small>Sistema operativo interno</small></div></div>
        <nav className={styles.nav} aria-label="Navegación principal">
          {v2NavGroups.map(({ group, items }) => <div key={group} className={styles.navGroup}><span>{group}</span>{items.map(item => {
            const Icon = iconMap[item.slug];
            return <Fragment key={item.slug}>
              <Link href={item.href} className={activeNav === item.slug ? styles.activeNav : ""} aria-current={active === item.slug ? "page" : activeNav === item.slug ? "location" : undefined}>
                {Icon ? <Icon size={15} aria-hidden="true"/> : <span className={styles.dot}/>}<span>{item.label}</span>
              </Link>
              {item.children && <div className={revision.subnav} role="group" aria-label={`Secciones de ${item.label}`}>{item.children.map(child => <Link key={child.slug} href={child.href} aria-current={effectiveActive === child.slug ? "page" : undefined}>{child.label}</Link>)}</div>}
            </Fragment>;
          })}</div>)}
        </nav>
        <div className={styles.guardrail}><ShieldCheck size={17}/><div><strong>Acceso corporativo previsto</strong><small>Google · @avans.agency</small><small>Login real pendiente</small></div></div>
      </aside>
      <section className={`${styles.workspaceMain} avans-v2-main`}>
        <header className={`${styles.topbar} avans-v2-topbar`}>
          <div className={revision.crumb}><Link href="/v2">Avans OS</Link><span>/</span>{parent && activeNav !== effectiveActive && <><Link href={parent.href}>{parent.label}</Link><span>/</span></>}<strong>{title}</strong></div>
          <div className={styles.topStatus}><span className={styles.liveDot}/><Link href="/v2/estado-producto" title="Ver estado real del producto">Preview · estado del producto</Link><ThemeToggle/></div>
        </header>
        {isRevisionArea(active) ? <OwnerRevisionWorkspace area={active}>{children}</OwnerRevisionWorkspace> : children}
      </section>
    </main>
  );
}
