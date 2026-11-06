import Link from "next/link";
import { Fragment, type ElementType, type ReactNode } from "react";
import { Activity, BrainCircuit, BriefcaseBusiness, ChartNoAxesCombined, FileChartColumn, Gauge, Inbox, Network, Settings2, ShieldCheck, Users, Workflow } from "lucide-react";
import { AvansLogo } from "../../components/avans-logo";
import { getV2Ancestors, v2NavGroups, type V2NavItem } from "../navigation";
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

function NestedNavigation({ parent, selected, ancestors }: { parent: V2NavItem; selected: string; ancestors: Set<string> }) {
  if (!parent.children?.length) return null;
  return <div className={revision.subnav} role="group" aria-label={`Secciones de ${parent.label}`}>
    {parent.children.map(child => <Fragment key={child.slug}>
      <Link href={child.href} aria-current={selected === child.slug ? "page" : ancestors.has(child.slug) ? "location" : undefined}>{child.label}</Link>
      <NestedNavigation parent={child} selected={selected} ancestors={ancestors}/>
    </Fragment>)}
  </div>;
}

export function V2Chrome({ active, title, children }: { active: string; title: string; children: ReactNode }) {
  // Compatibility with existing client benchmark pages: URLs and props stay valid.
  const effectiveActive = active === "clientes" && title.toLocaleLowerCase("es").includes("benchmark") ? "benchmark" : active;
  const ancestors = getV2Ancestors(effectiveActive);
  const ancestorSlugs = new Set(ancestors.map(item => item.slug));
  const activeNav = ancestors[0]?.slug ?? effectiveActive;
  return (
    <main className={`${styles.shell} avans-v2-shell`}>
      <aside className={`${styles.sidebar} avans-v2-sidebar`}>
        <div className={styles.brand}><Link href="/v2" aria-label="Ir al Command Center"><AvansLogo variant="compact"/></Link><span className={styles.productName}>OS</span></div>
        <div className={styles.workspace}><span className={styles.mark}>↗</span><div><strong>Avans Agency</strong><small>Sistema operativo interno</small></div></div>
        <nav className={styles.nav} aria-label="Navegación principal">
          {v2NavGroups.map(({ group, items }) => <div key={group} className={styles.navGroup}><span>{group}</span>{items.map(item => {
            const Icon = iconMap[item.slug];
            return <Fragment key={item.slug}>
              <Link href={item.href} className={activeNav === item.slug ? styles.activeNav : ""} aria-current={effectiveActive === item.slug ? "page" : activeNav === item.slug ? "location" : undefined}>
                {Icon ? <Icon size={15} aria-hidden="true"/> : <span className={styles.dot}/>}<span>{item.label}</span>
              </Link>
              <NestedNavigation parent={item} selected={effectiveActive} ancestors={ancestorSlugs}/>
            </Fragment>;
          })}</div>)}
        </nav>
        <div className={styles.guardrail}><ShieldCheck size={17}/><div><strong>Acceso corporativo previsto</strong><small>Google · @avans.agency</small><small>Login real pendiente</small></div></div>
      </aside>
      <section className={`${styles.workspaceMain} avans-v2-main`}>
        <header className={`${styles.topbar} avans-v2-topbar`}>
          <div className={revision.crumb}><Link href="/v2">Avans OS</Link><span>/</span>{ancestors.map(parent => <Fragment key={parent.slug}><Link href={parent.href}>{parent.label}</Link><span>/</span></Fragment>)}<strong>{title}</strong></div>
          <div className={styles.topStatus}><span className={styles.liveDot}/><Link href="/v2/estado-producto" title="Ver estado real del producto">Preview · estado del producto</Link><ThemeToggle/></div>
        </header>
        {isRevisionArea(active) ? <OwnerRevisionWorkspace area={active}>{children}</OwnerRevisionWorkspace> : children}
      </section>
    </main>
  );
}
