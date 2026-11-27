"use client";

/* Banner del cliente (Funcionalidades 2): módulos contratados que abren su alcance,
 * y los tres accesos flotantes que acompañan todas las secciones del cliente. */
import Link from "next/link";
import { useState } from "react";
import { AvansIcon, AvansModuleIcon } from "../brand";
import { scopeForClient, type ScopeCompliance } from "../director-data";
import { serviceCatalog, serviceLabel, type OsClient, type ServiceId } from "../os-data";
import { useOsStore } from "../os-store";
import { OSSidePanel } from "../overlays";
import { serviceHref } from "../service-workspace-data";
import { useServiceModules } from "../service-modules";
import { Badge, LinkButton } from "../ui";
import s from "../os.module.css";
import b from "./client-banner.module.css";

function complianceTone(status: ScopeCompliance) {
  if (status === "Cumplido") return "cool" as const;
  if (status === "Atención") return "peach" as const;
  return "stone" as const;
}

export function BannerModules({ client }: { client: OsClient }) {
  const { servicesOf } = useOsStore();
  const active = servicesOf(client.slug);
  const { stored } = useServiceModules(client);
  const [open, setOpen] = useState<ServiceId | null>(null);
  const scopes = scopeForClient({ ...client, services: active });
  const modules = serviceCatalog.filter((service) => active.includes(service.id));
  const scope = scopes.find((item) => item.serviceId === open);
  const config = open ? stored.modules[open] : undefined;

  return (
    <>
      <div className={b.modules} aria-label="Módulos de servicio contratados">
        <span className={b.label}>Módulos contratados</span>
        <ul>
          {modules.map((service) => {
            const item = scopes.find((entry) => entry.serviceId === service.id);
            return (
              <li key={service.id}>
                <button type="button" className={b.module} onClick={() => setOpen(service.id)} aria-haspopup="dialog" data-tone={item?.alert ? "alert" : undefined}>
                  <AvansModuleIcon name={service.icon} size={22} />
                  <span>{service.label}</span>
                  {item?.alert ? <span className={b.dot} aria-label="Revisión de alcance pendiente" /> : null}
                </button>
              </li>
            );
          })}
          {!modules.length ? <li className={s.demoNote}>Sin módulos contratados.</li> : null}
        </ul>
      </div>
      {open ? (
        <OSSidePanel
          label={`Alcance de ${serviceLabel(open)}`}
          heading={<h2 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: "var(--av-text)" }}>Alcance · {serviceLabel(open)}</h2>}
          onClose={() => setOpen(null)}
        >
          <div className={b.scope}>
            <div className={b.scopeHead}>
              {scope ? <Badge tone={complianceTone(scope.compliance)}>{scope.compliance}</Badge> : null}
              {config ? <Badge tone={config.kind === "contracted" ? "cool" : "peach"}>{config.kind === "contracted" ? "Contratado" : "Demostración"}</Badge> : null}
            </div>
            {config?.scope ? (
              <section><h3>Alcance contratado</h3><p>{config.scope}</p>{config.startDate ? <p className={s.demoNote}>Inicio: {config.startDate}</p> : null}</section>
            ) : null}
            {scope ? (
              <>
                <section><h3>Detalle del módulo</h3><p>{scope.summary}</p><p className={s.demoNote}>{scope.cadence}</p></section>
                <section><h3>Entregables comprometidos</h3><ul>{scope.deliverables.map((item) => <li key={item}>{item}</li>)}</ul></section>
                {scope.alert ? <section className={b.alert} role="note"><h3>Revisión periódica del alcance</h3><p>{scope.alert}</p></section> : null}
              </>
            ) : null}
            <p className={s.demoNote}>La revisión periódica compara el alcance con lo entregado e informa al PM. En esta preview usa reglas y datos de demostración; para informar incumplimientos reales necesita entregables persistidos y el alcance contractual cargado.</p>
            <LinkButton href={serviceHref(client.slug, open)} variant="dark">Abrir {serviceLabel(open)}</LinkButton>
          </div>
        </OSSidePanel>
      ) : null}
    </>
  );
}

/** Atajos flotantes: Ficha del cliente, Benchmark y Cargar documentos (viven dentro de Gestión y estrategia). */
export function ClientShortcuts({ client }: { client: OsClient }) {
  return (
    <nav className={b.shortcuts} aria-label={`Accesos directos de ${client.name}`}>
      <Link href={`/v2/clientes/${client.slug}?view=ficha`} title="Ficha del cliente"><AvansIcon name="identidad" size={18} /><span>Ficha del cliente</span></Link>
      <Link href={`/v2/clientes/${client.slug}?view=benchmark`} title="Benchmark"><AvansIcon name="monitor" size={18} /><span>Benchmark</span></Link>
      <Link href={`/v2/clientes/${client.slug}?view=documentos#cargar-documentos`} title="Cargar documentos"><AvansIcon name="registro" size={18} /><span>Cargar documentos</span></Link>
    </nav>
  );
}
