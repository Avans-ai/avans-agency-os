"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Glyph } from "../glyphs";
import { serviceForProject } from "../director-data";
import { osClients, osProjects, serviceCatalog, serviceLabel, type ClientStatus, type ServiceId } from "../os-data";
import { useOsStore } from "../os-store";
import { getClient, projectProgress } from "../selectors";
import { cx, OSEmptyState, OSStatus, PageHead, Progress } from "../ui";
import s from "../os.module.css";
import sc from "../screens.module.css";
import d from "./director-update.module.css";

const STATUS_OPTIONS: { value: "todos" | ClientStatus; label: string }[] = [
  { value: "todos", label: "Todos los estados" },
  { value: "al-dia", label: "Al día" },
  { value: "atencion", label: "Atención" },
  { value: "en-riesgo", label: "En riesgo" },
  { value: "onboarding", label: "Onboarding" },
  { value: "pausado", label: "Pausado" },
];

export function OperationsOverview() {
  const { tasks } = useOsStore();
  const [query, setQuery] = useState("");
  const [clientSlug, setClientSlug] = useState("todos");
  const [serviceId, setServiceId] = useState<"todos" | ServiceId>("todos");
  const [status, setStatus] = useState<"todos" | ClientStatus>("todos");

  const projects = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return osProjects.filter((project) => {
      const client = getClient(project.clientSlug);
      const service = serviceForProject(project.slug);
      if (clientSlug !== "todos" && project.clientSlug !== clientSlug) return false;
      if (serviceId !== "todos" && service !== serviceId) return false;
      if (status !== "todos" && project.status !== status) return false;
      return !normalized || `${project.name} ${client?.name ?? ""} ${project.owner} ${serviceLabel(service)}`.toLocaleLowerCase("es").includes(normalized);
    });
  }, [clientSlug, query, serviceId, status]);

  return (
    <div className={s.page}>
      <PageHead
        rotulo="Operaciones"
        title="Vista general"
        description="Todos los proyectos activos de la agencia, organizados por cliente y módulo de servicio. La edición se realiza dentro de cada cuenta."
      />

      <div className={d.operationsFilters} role="search" aria-label="Filtrar proyectos">
        <label className={cx(s.searchField, s.searchFieldRaised)}>
          <Glyph name="search" size={16} />
          <span className={s.srOnly}>Buscar proyectos</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar proyecto, cliente o responsable" />
        </label>
        <label className={sc.selectWrap}>Cliente
          <select value={clientSlug} onChange={(event) => setClientSlug(event.target.value)}>
            <option value="todos">Todos los clientes</option>
            {osClients.map((client) => <option value={client.slug} key={client.slug}>{client.name}</option>)}
          </select>
        </label>
        <label className={sc.selectWrap}>Módulo
          <select value={serviceId} onChange={(event) => setServiceId(event.target.value as "todos" | ServiceId)}>
            <option value="todos">Todos los módulos</option>
            {serviceCatalog.map((service) => <option value={service.id} key={service.id}>{service.label}</option>)}
          </select>
        </label>
        <label className={sc.selectWrap}>Estado
          <select value={status} onChange={(event) => setStatus(event.target.value as "todos" | ClientStatus)}>
            {STATUS_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      {projects.length ? (
        <section className={s.surface} aria-label={`${projects.length} proyectos`}>
          {projects.map((project) => {
            const client = getClient(project.clientSlug);
            const service = serviceForProject(project.slug);
            const progress = projectProgress(project.slug, tasks);
            return (
              <article className={d.operationsProject} key={project.slug}>
                <div>
                  <Link className={s.linkInk} href={`/v2/proyectos/${project.slug}`}>{project.name}</Link>
                  <small><Link className={s.link} href={`/v2/clientes/${project.clientSlug}`}>{client?.name}</Link> · {serviceLabel(service)}</small>
                </div>
                <div><small>Responsable</small><strong>{project.owner}</strong></div>
                <div><small>Avance</small><Progress value={progress} accent label={`Avance de ${project.name}`} /></div>
                <div><small>Estado</small><OSStatus status={project.status} /></div>
                <div><small>Próximo hito</small><strong>{project.delivery}</strong>{project.alert ? <small>{project.alert}</small> : null}</div>
              </article>
            );
          })}
        </section>
      ) : (
        <OSEmptyState icon="busqueda" title="No hay proyectos que coincidan">
          Modificá los filtros para volver a mostrar la operación.
        </OSEmptyState>
      )}
      <p className={d.archiveNote}>Esta vista es transversal y de coordinación. Las tareas, recomendaciones y cambios se realizan dentro del cliente y del módulo correspondiente.</p>
    </div>
  );
}
