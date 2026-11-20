"use client";

/* Navegación principal del cliente: Inicio | Tareas | Gestión y estrategia.
 * Los módulos de servicio se abren desde el resumen de Inicio y conservan su
 * espacio operativo, sin una segunda navegación al mismo nivel. */
import Link from "next/link";
import { AvansIcon, AvansModuleIcon } from "../brand";
import { canManageClient } from "../director-data";
import { serviceCatalog, type OsClient, type ServiceId } from "../os-data";
import { useOsStore } from "../os-store";
import { serviceHref } from "../service-workspace-data";
import d from "./director-update.module.css";

export type ClientOperationSection = "inicio" | "tareas" | "gestion" | ServiceId;

export function managementHref(slug: string) {
  return `/v2/clientes/${slug}?view=gestion`;
}

export function ClientOperationNav({ client, active }: { client: OsClient; active?: ClientOperationSection }) {
  const { role } = useOsStore();
  const canEditTasks = canManageClient(role, client.slug);
  const currentModule = serviceCatalog.find((service) => service.id === active);
  const home = active === "inicio" || Boolean(currentModule);

  return (
    <nav className={d.operationNav} aria-label={`Navegación de ${client.name}`}>
      <Link href={`/v2/clientes/${client.slug}`} className={d.operationTab} data-active={home} aria-current={active === "inicio" ? "page" : undefined}>
        <AvansIcon name="nucleo" size={20} />
        Inicio
      </Link>
      <Link href={`/v2/clientes/${client.slug}/tareas`} className={d.operationTab} data-active={active === "tareas"} aria-current={active === "tareas" ? "page" : undefined}>
        <AvansIcon name="registro" size={20} />
        Tareas
        {!canEditTasks ? <span className={d.readOnly}>Solo lectura</span> : null}
      </Link>
      <Link href={managementHref(client.slug)} className={d.operationTab} data-active={active === "gestion"} aria-current={active === "gestion" ? "page" : undefined}>
        <AvansIcon name="estructura" size={20} />
        Gestión y estrategia
      </Link>
      {currentModule ? (
        <span className={d.operationCrumb} aria-current="page">
          <span aria-hidden="true">/</span>
          <AvansModuleIcon name={currentModule.icon} size={20} />
          {currentModule.label}
        </span>
      ) : null}
    </nav>
  );
}

/** Cambio rápido entre módulos activos desde el espacio de un módulo (menú compacto, no una navegación principal). */
export function ModuleSwitcher({ client, active }: { client: OsClient; active: ServiceId }) {
  const { servicesOf } = useOsStore();
  const others = serviceCatalog.filter((service) => service.id !== active && servicesOf(client.slug).includes(service.id));
  if (!others.length) return null;
  return (
    <details className={d.moduleSwitcher}>
      <summary>Cambiar módulo</summary>
      <ul>
        {others.map((service) => (
          <li key={service.id}>
            <Link href={serviceHref(client.slug, service.id)}><AvansModuleIcon name={service.icon} size={20} />{service.label}</Link>
          </li>
        ))}
        <li><Link href={`/v2/clientes/${client.slug}`}>Resumen de módulos</Link></li>
      </ul>
    </details>
  );
}
