"use client";
import { useState, type ReactNode } from "react";
import {
  serviceCatalog,
  serviceLabel,
  type OsClient,
  type ServiceId,
} from "../os-data";
import { useOsStore } from "../os-store";
import { buttonClass } from "../ui";
import { useKnowledge } from "./use-knowledge";
import { type Blueprint } from "./blueprints";
import { newItem } from "./benchmark";
import {
  visiblePlan,
  planCoverage,
  validatePlanItem,
  allocationErrors,
  sitemapTree,
} from "./plan";
import { discoveryAndFindingsToPlan } from "./proposals";
import { savePlanItem, deletePlanItem } from "./mutations";
import type { KnowledgeItem } from "./types";
import {
  History,
  ItemEditor,
  ItemDetails,
  LocalNotice,
  ReviewBanner,
} from "./shared-ui";
import m from "./knowledge.module.css";
import { AvansModuleIcon } from "../brand";
import {
  DocumentSection,
  DocumentShell,
  SectionStateBadge,
  type SectionState,
} from "./document-shell";
const SERVICE_PITCH: Partial<Record<ServiceId, string>> = {
  estrategia: "El marco del plan: dónde se para la marca, qué dice y en qué canales.",
  "diseno-marca": "Lo que hace que la marca se reconozca antes de leerla.",
  "publicidad-digital": "Lleva la marca a quienes todavía no la conocen y genera interés por la propuesta de valor.",
  contenidos: "Donde la marca muestra su conocimiento y se valida frente a clientes potenciales y activos.",
  audiovisuales: "Muestra a la marca en movimiento: da prueba, cercanía y conexión humana.",
  "desarrollo-web": "El lugar donde desembarca la audiencia que generamos.",
};

export function PlanView({
  client,
  headerActions,
  manageModules,
}: {
  client: OsClient;
  /** Document-level actions (e.g. Generar presentación). */
  headerActions?: ReactNode;
  /** Opens the service module manager (contracted modules decide the Plan). */
  manageModules?: ReactNode;
}) {
  const { k, editable, invalid, mutate, context } = useKnowledge(client);
  const { servicesOf } = useOsStore();
  const active = servicesOf(client.slug);
  const ordered = serviceCatalog
    .map((service) => service.id)
    .filter((id) => active.includes(id));
  const modules = visiblePlan(k, ordered);
  const inactiveWithData = serviceCatalog.filter(
    (service) => !active.includes(service.id) && k.plan.modules[service.id]?.length,
  );
  const [editor, setEditor] = useState<{
    item: KnowledgeItem;
    bp: Blueprint;
    service: ServiceId;
    revision: number;
  } | null>(null);
  const inputs = discoveryAndFindingsToPlan(k);
  function save(item: KnowledgeItem) {
    if (!editor) return ["Sin editor"];
    const errors = validatePlanItem(k, item, editor.bp, editor.service);
    if (errors.length) return errors;
    const ok = mutate(
      (s, c) => savePlanItem(s, item, editor.service, active, c),
      editor.revision,
    );
    return ok
      ? []
      : [
          "No se pudo guardar. Revisá el aviso; el formulario conserva tus cambios.",
        ];
  }
  function blockState(module: (typeof modules)[number], blockId: string): SectionState {
    const c = planCoverage(module.items, module.service).find((x) => x.id === blockId);
    if (!c || !c.loaded) return "empty";
    return c.complete ? "validated" : "pending-validation";
  }
  function moduleState(module: (typeof modules)[number]): SectionState | undefined {
    if (module.templatePending) return undefined;
    if (module.needsReview.length) return "review";
    const coverage = planCoverage(module.items, module.service);
    if (!coverage.some((c) => c.loaded)) return "empty";
    if (coverage.every((c) => c.complete)) return "validated";
    return coverage.some((c) => !c.loaded) ? "missing" : "pending-validation";
  }
  function decisions(module: (typeof modules)[number], bp: Blueprint) {
    const rows = module.items.filter((i) => i.section === bp.id);
    return rows.length ? (
      rows.map((item) => (
        <article className={m.card} key={item.id}>
          <span className={m.badge}>
            {item.status}
            {item.demo ? " · DEMO" : ""}
          </span>
          <ItemDetails item={item} bp={bp} k={k} />
          <p className={m.small}>
            Fundamentos:{" "}
            {item.discoveryRefs
              .map(
                (id) =>
                  inputs.discovery.find((d) => d.record.id === id)?.record.id ||
                  id,
              )
              .join(" · ") || "Discovery pendiente"}{" "}
            ·{" "}
            {item.findingIds
              .map((id) =>
                String(
                  k.benchmark.findings.find((f) => f.id === id)?.values
                    .statement || id,
                ),
              )
              .join(" · ") || "Benchmark pendiente"}
          </p>
          {editable ? (
            <div className={m.actions}>
              <button
                className={buttonClass("secondary", true)}
                onClick={() =>
                  setEditor({ item, bp, service: module.service, revision: k.revision })
                }
              >
                Editar
              </button>
              <button
                className={buttonClass("ghost", true)}
                onClick={() =>
                  mutate((s, c) => deletePlanItem(s, item, module.service, c))
                }
              >
                Quitar
              </button>
            </div>
          ) : null}
        </article>
      ))
    ) : (
      <p className={m.empty}>
        Sin decisiones cargadas. No se completa con información inventada: cada
        decisión se apoya en Discovery y Benchmark.
      </p>
    );
  }
  const index = modules.map((module) => ({
    id: `plan-${module.service}`,
    label: serviceLabel(module.service),
  }));
  return (
    <div className={m.root}>
      <DocumentShell
        label="Plan de Marketing"
        sections={index.length ? index : [{ id: "plan-vacio", label: "Plan" }]}
        header={
          <header className={m.docHead}>
            <div className={m.head}>
              <div>
                <p className={m.eyebrowDoc}>03 · Plan de Marketing</p>
                <h2>Plan de Marketing</h2>
                <p>
                  Documento vivo construido desde el Discovery y el Benchmark.
                  Muestra solo los módulos contratados por {client.name}.
                </p>
              </div>
              <div className={m.actions}>
                {headerActions}
                {manageModules}
              </div>
            </div>
            <p className={m.small}>
              Fundamentos validados disponibles: {inputs.discovery.length}{" "}
              hallazgos del Discovery y {inputs.findings.length} conclusiones del
              Benchmark · Módulos en el plan:{" "}
              {ordered.map(serviceLabel).join(" · ") || "ninguno"}
            </p>
            {inactiveWithData.length ? (
              <p className={m.small}>
                Módulos desactivados con datos conservados:{" "}
                {inactiveWithData.map((service) => service.label).join(" · ")}.
                Reactivarlos recupera sus decisiones.
              </p>
            ) : null}
            <LocalNotice invalid={invalid} />
          </header>
        }
      >
        {!modules.length ? (
          <DocumentSection id="plan-vacio" title="Sin módulos contratados">
            <p className={m.empty}>
              El cliente no tiene módulos de servicio activos. Agregalos desde
              el inicio del cliente para habilitar sus secciones del Plan.
            </p>
          </DocumentSection>
        ) : null}
        {modules.map((module, i) => {
          const definition = serviceCatalog.find((service) => service.id === module.service);
          return (
            <DocumentSection
              key={module.service}
              id={`plan-${module.service}`}
              number={`Módulo ${String(i + 1).padStart(2, "0")}`}
              title={serviceLabel(module.service)}
              hint={SERVICE_PITCH[module.service]}
              state={moduleState(module)}
              actions={
                definition ? (
                  <span className={m.moduleHead} aria-hidden="true">
                    <AvansModuleIcon name={definition.icon} size={44} />
                  </span>
                ) : null
              }
            >
              <ReviewBanner client={client} type="marketing-plan" id={module.service} />
              {module.templatePending ? (
                <section className={m.block}>
                  <p>Plantilla estratégica pendiente de definición.</p>
                  <p className={m.small}>
                    El módulo operativo del servicio sigue disponible desde la
                    navegación del cliente.
                  </p>
                </section>
              ) : (
                <>
                  {module.service === "publicidad-digital" &&
                  allocationErrors(module.items).length ? (
                    <div role="status" className={m.notice}>
                      {allocationErrors(module.items).map((e) => (
                        <p key={e}>{e}</p>
                      ))}
                      Los borradores pueden guardarse; la validación requiere
                      distribuciones completas.
                    </div>
                  ) : null}
                  {module.blueprints.map((bp) => (
                    <div className={m.block} key={bp.id}>
                      <div className={m.blockHead}>
                        <h4>{bp.label}</h4>
                        <div className={m.actions}>
                          <SectionStateBadge state={blockState(module, bp.id)} />
                          {editable ? (
                            <button
                              className={buttonClass("secondary", true)}
                              onClick={() =>
                                setEditor({
                                  item: newItem(bp.id, context()),
                                  bp,
                                  service: module.service,
                                  revision: k.revision,
                                })
                              }
                            >
                              + Agregar
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {bp.methodology ? (
                        <p className={m.small}>
                          <strong>Metodología</strong> · {bp.methodology}
                        </p>
                      ) : null}
                      {bp.id === "sitemap" &&
                      module.items.some((x) => x.section === "sitemap") ? (
                        <ul className={m.tree}>
                          {sitemapTree(module.items).map(({ item, depth }) => (
                            <li
                              key={item.id}
                              style={{ marginLeft: Math.min(depth, 8) * 16 }}
                            >
                              {String(item.values.name || "Página sin nombre")} ·{" "}
                              {String(item.values.type || "")}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {decisions(module, bp)}
                    </div>
                  ))}
                </>
              )}
            </DocumentSection>
          );
        })}
      </DocumentShell>
      <History k={k} type="marketing-plan" />
      {editor ? (
        <ItemEditor
          item={editor.item}
          bp={editor.bp}
          k={k}
          onSave={save}
          onClose={() => setEditor(null)}
          plan
        />
      ) : null}
    </div>
  );
}
