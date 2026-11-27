import type { ReactNode } from "react";
import { getV2Ancestors, getV2NavItem, getV2RootSlug } from "../navigation";
import { isRevisionArea } from "../owner-revision-data";
import { OsShell, type Crumb } from "../os/os-shell";
import { OwnerRevisionWorkspace } from "./owner-revision-workspace";

/** Shared Avans OS chrome (OSSidebar + OSHeader + mobile navigation).
 * Modules built before the redesign keep rendering inside the legacy bridge
 * wrapper; screens rebuilt with OS components pass `legacy={false}`. */
export function V2Chrome({ active, title, children, crumbs, legacy = true }: {
  active: string;
  title: string;
  children: ReactNode;
  /** Overrides the breadcrumb trail derived from the navigation tree. */
  crumbs?: Crumb[];
  legacy?: boolean;
}) {
  // Compatibility with existing client benchmark pages: URLs and props stay valid.
  const effectiveActive = active === "clientes" && title.toLocaleLowerCase("es").includes("benchmark") ? "benchmark" : active;
  const trail: Crumb[] = crumbs ?? (effectiveActive === "command-center"
    ? [{ label: "Inicio" }]
    : [...getV2Ancestors(effectiveActive).map(item => ({ label: item.label, href: item.href })), { label: title }]);
  const current = getV2NavItem(effectiveActive);
  const content = legacy ? (
    <div className="avans-v2-shell os-legacy">
      {isRevisionArea(active) ? <OwnerRevisionWorkspace area={active}>{children}</OwnerRevisionWorkspace> : children}
    </div>
  ) : children;

  return (
    <OsShell active={effectiveActive} root={getV2RootSlug(effectiveActive)} title={current && effectiveActive !== "command-center" ? title : "Inicio"} crumbs={trail}>
      {content}
    </OsShell>
  );
}
