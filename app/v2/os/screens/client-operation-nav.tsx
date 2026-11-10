"use client";

import Link from "next/link";
import { AvansIcon, AvansModuleIcon } from "../brand";
import { canEditService, canManageClient } from "../director-data";
import { serviceCatalog, type OsClient, type ServiceId } from "../os-data";
import { useOsStore } from "../os-store";
import { serviceHref } from "../service-workspace-data";
import d from "./director-update.module.css";

export type ClientOperationSection = "inicio" | "tareas" | ServiceId;

export function ClientOperationNav({ client, active }: { client: OsClient; active: ClientOperationSection }) {
  const { role, servicesOf } = useOsStore();
  const activeIds = servicesOf(client.slug);
  const services = serviceCatalog.filter((service) => activeIds.includes(service.id));
  const canEditTasks = canManageClient(role, client.slug);

  return (
    <nav className={d.operationNav} aria-label={`Trabajo diario de ${client.name}`}>
      <Link href={`/v2/clientes/${client.slug}`} className={d.operationTab} data-active={active === "inicio"} aria-current={active === "inicio" ? "page" : undefined}>
        <AvansIcon name="nucleo" size={20} />
        Inicio
      </Link>
      <Link href={`/v2/clientes/${client.slug}/tareas`} className={d.operationTab} data-active={active === "tareas"} aria-current={active === "tareas" ? "page" : undefined}>
        <AvansIcon name="registro" size={20} />
        Tareas
        {!canEditTasks ? <span className={d.readOnly}>Solo lectura</span> : null}
      </Link>
      {services.map((service) => {
        const editable = canEditService(role, client.slug, service.id);
        return (
          <Link key={service.id} href={serviceHref(client.slug, service.id)} className={d.operationTab} data-active={active === service.id} aria-current={active === service.id ? "page" : undefined}>
            <AvansModuleIcon name={service.icon} size={24} />
            {service.label}
            {!editable ? <span className={d.readOnly}>Solo lectura</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
