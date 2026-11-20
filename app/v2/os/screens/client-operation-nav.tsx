"use client";

/* Navegación principal del cliente (Funcionalidades 2): Inicio · Tareas · Estrategia · módulos contratados.
 * Incluye los tres accesos flotantes del cliente (Ficha, Benchmark, Cargar documentos). */
import Link from "next/link";
import { AvansIcon, AvansModuleIcon } from "../brand";
import { canEditService, canManageClient } from "../director-data";
import { serviceCatalog, type OsClient, type ServiceId } from "../os-data";
import { useOsStore } from "../os-store";
import { serviceHref } from "../service-workspace-data";
import d from "./director-update.module.css";
import { ClientShortcuts } from "./client-banner";

export type ClientOperationSection = "inicio" | "tareas" | "gestion" | ServiceId;

export function managementHref(slug: string) {
  return `/v2/clientes/${slug}?view=gestion`;
}

/** Barra de secciones del cliente (Funcionalidades 2): Inicio · Tareas · Estrategia · módulos contratados. */
export function ClientOperationNav({ client, active }: { client: OsClient; active?: ClientOperationSection }) {
  const { role, servicesOf } = useOsStore();
  const canEditTasks = canManageClient(role, client.slug);
  const modules = serviceCatalog.filter((service) => servicesOf(client.slug).includes(service.id));

  return (
    <>
    <ClientShortcuts client={client} />
    <nav className={d.operationNav} aria-label={`Navegación de ${client.name}`}>
      <Link href={`/v2/clientes/${client.slug}`} className={d.operationTab} data-active={active === "inicio"} aria-current={active === "inicio" ? "page" : undefined}>
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
        Estrategia
      </Link>
      {modules.map((service) => {
        const editable = canEditService(role, client.slug, service.id);
        return (
          <Link key={service.id} href={serviceHref(client.slug, service.id)} className={d.operationTab} data-active={active === service.id} aria-current={active === service.id ? "page" : undefined}>
            <AvansModuleIcon name={service.icon} size={22} />
            {service.label}
            {!editable ? <span className={d.readOnly}>Solo lectura</span> : null}
          </Link>
        );
      })}
    </nav>
    </>
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
