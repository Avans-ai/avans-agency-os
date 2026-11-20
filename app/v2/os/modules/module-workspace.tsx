"use client";

/* Espacio operativo de un módulo de servicio dentro de un cliente.
 * Navegación interna sincronizada con ?seccion= (y ?task= / ?campana= para paneles). */
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, type ReactNode } from "react";
import { AvansModuleIcon } from "../brand";
import { canEditService } from "../director-data";
import { serviceCatalog, type OsClient, type ServiceId } from "../os-data";
import { useOsStore } from "../os-store";
import { serviceHref, type ServiceWorkspaceConfig } from "../service-workspace-data";
import { Badge, LinkButton, OSEmptyState, OSSkeletonRows } from "../ui";
import s from "../os.module.css";
import { ClientOperationNav } from "../screens/client-operation-nav";
import { ActivateDemoModuleButton } from "../screens/service-modules-dialog";
import { CollectionView, useWorkItems } from "./collection-view";
import { collectionDef, moduleCollections, primaryWorkCollection } from "./collections";
import { AxesSection, CalendarSection, ContentResultsSection, ContentSummary, IdeasSection, PiecesSection, PlansSection } from "./content";
import { BrandSummary, DesignLibrarySection, DesignOperationSection, DesignRequestsSection } from "./design-workspace";
import { DesignGuidelines } from "./design-guidelines";
import { ServiceGuidelines } from "./service-guidelines";
import { ContentGuidelines } from "./content-guidelines";
import { useModuleRecords } from "./store";
import { DeliverablesSection, HistorySection, RecommendationsSection } from "./module-common";
import { ModuleTaskBoard, useModuleTaskStats } from "./module-task-board";
import { AudiovisualSummary, GenericSummary, QaSection, ReleasesSection, RisksSection, SitemapSection, StrategySummary, TrackingSection, WebSummary } from "./other-modules";
import { AdsSection, CampaignsSection, MediaPlanSection, OptimizationSection, PaidHome, PaidResultsSection } from "./paid-media";
import m from "./modules.module.css";

type Section = { id: string; label: string };
type Go = (section: string, extra?: Record<string, string>) => void;
type Ctx = { client: OsClient; serviceId: ServiceId; editable: boolean; go: Go; params: URLSearchParams; tasksBoard: ReactNode; supportDesign: boolean };

const COMMON_TAIL: Section[] = [
  { id: "entregables", label: "Entregables y aprobaciones" },
  { id: "recomendaciones", label: "Recomendaciones" },
  { id: "historial", label: "Historial" },
];

export function moduleSections(serviceId: ServiceId): Section[] {
  switch (serviceId) {
    case "publicidad-digital":
      return [
        { id: "resumen", label: "Inicio" },
        { id: "plan", label: "Plan de medios" },
        { id: "campanas", label: "Campañas" },
        { id: "anuncios", label: "Anuncios y piezas" },
        { id: "tareas", label: "Tareas" },
        { id: "optimizacion", label: "Optimización" },
        { id: "resultados", label: "Resultados" },
        ...COMMON_TAIL,
      ];
    case "contenidos":
      return [
        { id: "resumen", label: "Resumen" },
        { id: "planes", label: "Plan mensual" },
        { id: "calendario", label: "Calendario" },
        { id: "piezas", label: "Piezas" },
        { id: "ejes", label: "Ejes temáticos" },
        { id: "ideas", label: "Ideas" },
        { id: "tareas", label: "Tareas" },
        { id: "resultados", label: "Resultados" },
        ...COMMON_TAIL,
      ];
    case "diseno-marca":
      return [
        { id: "resumen", label: "Resumen" },
        { id: "operacion", label: "Producción" },
        { id: "trabajos", label: "Pedidos de diseño" },
        { id: "biblioteca", label: "Biblioteca de marca" },
        { id: "tareas", label: "Tareas" },
        ...COMMON_TAIL,
      ];
    case "estrategia":
      return [
        { id: "resumen", label: "Resumen" },
        { id: "planificacion", label: "Planificación" },
        { id: "seguimiento", label: "Seguimiento de módulos" },
        { id: "reuniones", label: "Reuniones" },
        { id: "decisiones", label: "Decisiones" },
        { id: "riesgos", label: "Riesgos y bloqueos" },
        { id: "tareas", label: "Tareas" },
        ...COMMON_TAIL,
      ];
    case "desarrollo-web":
      return [
        { id: "resumen", label: "Resumen" },
        { id: "proyectos", label: "Proyectos" },
        { id: "sitemap", label: "Sitemap" },
        { id: "requisitos", label: "Requisitos" },
        { id: "qa", label: "QA" },
        { id: "publicaciones", label: "Publicaciones y mantenimiento" },
        { id: "tareas", label: "Tareas" },
        ...COMMON_TAIL,
      ];
    case "audiovisuales":
      return [
        { id: "resumen", label: "Resumen" },
        { id: "producciones", label: "Producciones" },
        { id: "guiones", label: "Guiones" },
        { id: "rodajes", label: "Preproducción y rodajes" },
        { id: "edicion", label: "Edición y versiones" },
        { id: "entregas", label: "Entregas" },
        { id: "tareas", label: "Tareas" },
        ...COMMON_TAIL,
      ];
    default: {
      const def = moduleCollections[serviceId][0];
      return [{ id: "resumen", label: "Resumen" }, { id: def.id, label: def.label }, { id: "tareas", label: "Tareas" }, ...COMMON_TAIL];
    }
  }
}

function collectionSection(ctx: Ctx, collection: string) {
  const def = collectionDef(ctx.serviceId, collection);
  return def ? <CollectionView client={ctx.client} serviceId={ctx.serviceId} def={def} editable={ctx.editable} /> : null;
}

function renderSection(section: string, ctx: Ctx): ReactNode {
  const { client, serviceId, editable, go, params } = ctx;
  if (section === "tareas") return ctx.tasksBoard;
  if (section === "entregables") return <DeliverablesSection client={client} serviceId={serviceId} />;
  if (section === "recomendaciones") return <RecommendationsSection client={client} serviceId={serviceId} editable={editable} consolidated={serviceId === "estrategia"} />;
  if (section === "historial") return <HistorySection client={client} serviceId={serviceId} />;

  switch (serviceId) {
    case "publicidad-digital":
      if (section === "plan") return <MediaPlanSection client={client} go={go} />;
      if (section === "campanas") return <CampaignsSection client={client} editable={editable} campaignId={params.get("campana")} go={go} />;
      if (section === "anuncios") return <AdsSection client={client} editable={editable} adId={params.get("anuncio")} go={go} />;
      if (section === "optimizacion") return <OptimizationSection client={client} editable={editable} />;
      if (section === "resultados") return <PaidResultsSection client={client} editable={editable} />;
      return <PaidHome client={client} go={go} />;
    case "contenidos":
      if (section === "planes") return <PlansSection client={client} editable={editable} />;
      if (section === "calendario") return <CalendarSection client={client} editable={editable} />;
      if (section === "piezas") return <PiecesSection client={client} editable={editable} />;
      if (section === "ejes") return <AxesSection client={client} editable={editable} />;
      if (section === "ideas") return <IdeasSection client={client} editable={editable} />;
      if (section === "resultados") return <ContentResultsSection client={client} editable={editable} />;
      return <ContentSummary client={client} go={go} />;
    case "diseno-marca":
      if (section === "operacion") return <DesignOperationSection client={client} editable={editable} />;
      if (section === "trabajos") return <DesignRequestsSection client={client} editable={editable} supportOnly={ctx.supportDesign} />;
      if (section === "biblioteca") return <DesignLibrarySection client={client} editable={editable} />;
      return <BrandSummary client={client} editable={editable} />;
    case "estrategia":
      if (section === "planificacion") return collectionSection(ctx, "prioridades");
      if (section === "seguimiento") return <TrackingSection client={client} />;
      if (section === "reuniones") return collectionSection(ctx, "reuniones");
      if (section === "decisiones") return collectionSection(ctx, "decisiones");
      if (section === "riesgos") return <RisksSection client={client} editable={editable} />;
      return <StrategySummary client={client} go={go} />;
    case "desarrollo-web":
      if (section === "proyectos") return collectionSection(ctx, "proyectos");
      if (section === "sitemap") return <SitemapSection client={client} editable={editable} />;
      if (section === "requisitos") return collectionSection(ctx, "requisitos");
      if (section === "qa") return <QaSection client={client} editable={editable} />;
      if (section === "publicaciones") return <ReleasesSection client={client} editable={editable} />;
      return <WebSummary client={client} go={go} />;
    case "audiovisuales":
      if (section === "producciones") return collectionSection(ctx, "producciones");
      if (section === "guiones") return collectionSection(ctx, "guiones");
      if (section === "rodajes") return collectionSection(ctx, "rodajes");
      if (section === "edicion") return collectionSection(ctx, "versiones");
      if (section === "entregas") return collectionSection(ctx, "entregas");
      return <AudiovisualSummary client={client} go={go} />;
    default:
      if (section === moduleCollections[serviceId][0].id) return collectionSection(ctx, section);
      return <GenericSummary client={client} serviceId={serviceId} go={go} />;
  }
}

const WORK_ITEM_LABEL: Partial<Record<ServiceId, string>> = {
  "publicidad-digital": "Campaña",
  contenidos: "Pieza",
  estrategia: "Prioridad",
  "desarrollo-web": "Proyecto web",
  audiovisuales: "Producción",
};

export function ModuleWorkspace({ client, service }: { client: OsClient; service: ServiceWorkspaceConfig }) {
  const { role, servicesOf, localHydrated } = useOsStore();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const serviceId = service.id;
  const { data: designData } = useModuleRecords(client.slug, "diseno-marca", ["trabajos"]);
  const activeServices = servicesOf(client.slug);
  const supportDesign = serviceId === "diseno-marca" && !activeServices.includes("diseno-marca") && activeServices.includes("contenidos") && (designData.trabajos || []).some((record) => record.values.contenidoId);
  const definition = serviceCatalog.find((item) => item.id === serviceId);
  const editable = canEditService(role, client.slug, serviceId);
  const sections = moduleSections(serviceId).filter((section) => !supportDesign || ["trabajos", "biblioteca", "tareas", "historial"].includes(section.id));
  // Compatibilidad de enlaces anteriores: «pedidos» de Diseño y «produccion» (creatividades) de Publicidad digital.
  const legacy = params.get("seccion");
  const requested = legacy === "pedidos" && serviceId === "diseno-marca" ? "trabajos" : legacy === "produccion" && serviceId === "publicidad-digital" ? "anuncios" : legacy;
  const guidelines = params.get("area") === "lineamientos";
  const taskParam = params.get("task");
  const current = sections.some((section) => section.id === requested) ? requested! : taskParam ? "tareas" : supportDesign ? "trabajos" : "resumen";
  // Área C de cada módulo creativo: repositorio separado de la operación mensual.
  const repository = serviceId === "diseno-marca" ? { id: "biblioteca", label: "Biblioteca de marca" } : serviceId === "contenidos" ? { id: "ideas", label: "Banco de ideas" } : null;
  const inRepository = !guidelines && Boolean(repository) && current === repository?.id && sections.some((section) => section.id === repository?.id);
  const operationSections = sections.filter((section) => section.id !== repository?.id);
  const primary = primaryWorkCollection(serviceId);
  const workItems = useWorkItems(client, serviceId, primary);
  const stats = useModuleTaskStats(client, serviceId);

  const go = useCallback<Go>((section, extra = {}) => {
    const next = new URLSearchParams();
    next.set("seccion", section);
    for (const [key, value] of Object.entries(extra)) next.set(key, value);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }, [pathname, router]);

  const selectTask = useCallback((id: string | null) => {
    const next = new URLSearchParams(params.toString());
    next.set("seccion", "tareas");
    if (id) next.set("task", id); else next.delete("task");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [params, pathname, router]);

  if (!localHydrated) {
    return <div className={m.body}><OSSkeletonRows rows={5} label={`Cargando ${service.label}…`} /></div>;
  }

  if (!activeServices.includes(serviceId) && !supportDesign) {
    return (
      <>
        <ClientOperationNav client={client} active={serviceId} />
        <div className={m.body}>
          <OSEmptyState icon="ajuste" title={`${service.label} no está activo para ${client.name}`} actions={<><ActivateDemoModuleButton client={client} serviceId={serviceId} /><LinkButton href={`/v2/clientes/${client.slug}`} variant="dark">Volver a la cuenta</LinkButton></>}>
            Este módulo no figura entre los servicios activos del cliente, por eso no se puede operar desde acá. Si se había usado antes, sus objetos y tareas siguen guardados en este navegador y vuelven a aparecer al reactivarlo desde la cuenta. Ningún dato se borra al desactivar un módulo.
          </OSEmptyState>
        </div>
      </>
    );
  }

  const ctx: Ctx = {
    client,
    serviceId,
    editable,
    go,
    params,
    supportDesign,
    tasksBoard: <ModuleTaskBoard client={client} serviceId={serviceId} editable={editable} workItems={workItems} workItemLabel={WORK_ITEM_LABEL[serviceId] ?? (primary ? primary.singular.charAt(0).toUpperCase() + primary.singular.slice(1) : "Objeto")} selectedTaskId={taskParam} onSelectTask={selectTask} />,
  };

  return (
    <div>
      <ClientOperationNav client={client} active={serviceId} />
      <header className={m.hero}>
        <div className={m.heroTitle}>
          <span className={m.heroIcon}>{definition ? <AvansModuleIcon name={definition.icon} size={34} /> : null}</span>
          <div>
            <span className={s.rotulo}>Módulo · {client.name}</span>
            <h1>{supportDesign ? "Pedidos de diseño de Contenidos" : service.label}</h1>
            <p>{supportDesign ? "Producción y versiones de los contenidos aprobados de la cuenta." : service.description}</p>
            <div className={m.heroMeta}>
              <span>Responsable de cuenta <strong>{client.owner}</strong></span>
              <span>Permiso <strong>{editable ? "Puede editar" : "Solo lectura"}</strong></span>
              <span><Badge tone="stone">Guardado en este navegador</Badge></span>
              {supportDesign ? <span><Badge tone="stone">Apoyo a Contenidos</Badge></span> : null}
            </div>
          </div>
        </div>
        <div className={s.actions}>
          {supportDesign ? <ActivateDemoModuleButton client={client} serviceId={serviceId} /> : null}
          {serviceId === "contenidos" ? <LinkButton href={`/v2/portal/${client.slug}`} variant="secondary" small>Vista del cliente</LinkButton> : null}
          <LinkButton href={`/v2/clientes/${client.slug}?view=reportes`} variant="ghost">Reportes</LinkButton>
          <LinkButton href={`/v2/clientes/${client.slug}/tareas`} variant="secondary" small>Tareas del cliente</LinkButton>
        </div>
      </header>

      <nav className={m.sectionNav} aria-label={`Áreas de ${service.label}`}>
        <Link className={m.sectionTab} aria-current={!guidelines && !inRepository ? "page" : undefined} href={`${serviceHref(client.slug, serviceId)}?seccion=${inRepository ? operationSections[0]?.id ?? "resumen" : current}`} scroll={false}>Operación mensual</Link>
        <Link className={m.sectionTab} aria-current={guidelines ? "page" : undefined} href={`${serviceHref(client.slug, serviceId)}?area=lineamientos`} scroll={false}>{serviceId === "contenidos" ? "Plan de contenidos" : "Lineamientos del servicio"}</Link>
        {repository ? <Link className={m.sectionTab} aria-current={inRepository ? "page" : undefined} href={`${serviceHref(client.slug, serviceId)}?seccion=${repository.id}`} scroll={false}>{repository.label}</Link> : null}
      </nav>

      {!guidelines && !inRepository ? <nav className={m.sectionNav} aria-label={`Secciones de ${service.label}`}>
        {operationSections.map((section) => (
          <Link
            key={section.id}
            href={`${serviceHref(client.slug, serviceId)}?seccion=${section.id}`}
            className={m.sectionTab}
            aria-current={current === section.id ? "page" : undefined}
            scroll={false}
          >
            {section.label}
            {section.id === "tareas" && stats.open.length ? <em>{stats.open.length}</em> : null}
          </Link>
        ))}
      </nav> : null}

      <div className={m.body}>
        {!editable ? <p className={s.demoNote} style={{ margin: 0 }}>Tu rol de vista previa puede consultar este módulo, pero no modificarlo. Los permisos son visuales: todavía no se aplican en servidor.</p> : null}
        {guidelines ? (serviceId === "diseno-marca" && !supportDesign ? <DesignGuidelines client={client} editable={editable} /> : serviceId === "contenidos" ? <ContentGuidelines client={client} /> : <ServiceGuidelines client={client} serviceId={supportDesign ? "contenidos" : serviceId} />) : <><ServiceGuidelines client={client} serviceId={supportDesign ? "contenidos" : serviceId} compact />{renderSection(current, ctx)}</>}
      </div>
    </div>
  );
}
