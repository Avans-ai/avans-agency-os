"use client";
import { useState } from "react";
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
export function PlanView({ client }: { client: OsClient }) {
  const { k, editable, invalid, mutate, context } = useKnowledge(client);
  const { servicesOf, setServices, role } = useOsStore();
  const active = servicesOf(client.slug);
  const modules = visiblePlan(k, active);
  const [selected, setSelected] = useState<ServiceId | null>(null);
  const current = modules.find((s) => s.service === selected) ?? modules[0];
  const [block, setBlock] = useState("");
  const bp =
    current?.blueprints.find((b) => b.id === block) ?? current?.blueprints[0];
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
  return (
    <div className={m.root}>
      <div className={m.head}>
        <div>
          <h2>Plan de Marketing</h2>
          <p>
            Decisiones estratégicas de los servicios activos, vinculadas al
            Discovery y al Benchmark.
          </p>
        </div>
      </div>
      <LocalNotice invalid={invalid} />
      <div className={m.notice}>
        Fundamentos validados disponibles: {inputs.discovery.length} hallazgos
        del Discovery y {inputs.findings.length} conclusiones del Benchmark.
        Cada decisión conserva sus fuentes.
      </div>
      <details className={m.card}>
        <summary>Servicios activos del cliente</summary>
        <p>
          Al desactivar un servicio se oculta su módulo del Plan y se conservan
          sus datos. Este cambio local requiere gestión del alcance con el
          cliente.
        </p>
        <div className={m.grid}>
          {serviceCatalog.map((service) => (
            <label key={service.id}>
              <input
                type="checkbox"
                disabled={!editable || role !== "admin"}
                checked={active.includes(service.id)}
                onChange={(e) =>
                  setServices(
                    client.slug,
                    e.target.checked
                      ? [...active, service.id]
                      : active.filter((s) => s !== service.id),
                  )
                }
              />{" "}
              {service.label}
              {!active.includes(service.id) &&
              k.plan.modules[service.id]?.length
                ? " · Inactivo, datos conservados"
                : ""}
            </label>
          ))}
        </div>
      </details>
      {!modules.length ? (
        <p className={m.empty}>
          No hay servicios activos. Activá los servicios contratados desde la
          gestión del cliente.
        </p>
      ) : (
        <>
          <nav className={m.tabs} aria-label="Módulos del Plan">
            {modules.map((module) => (
              <button
                key={module.service}
                aria-pressed={current?.service === module.service}
                onClick={() => {
                  setSelected(module.service);
                  setBlock("");
                }}
              >
                {serviceLabel(module.service)}
                {module.needsReview.length ? " · Requiere revisión" : ""}
              </button>
            ))}
          </nav>
          {current ? (
            <>
              <ReviewBanner
                client={client}
                type="marketing-plan"
                id={current.service}
              />
              {current.templatePending ? (
                <section className={m.card}>
                  <h3>{serviceLabel(current.service)}</h3>
                  <p>Plantilla estratégica pendiente de definición</p>
                  <p className={m.muted}>
                    El módulo operativo del servicio continúa disponible.
                  </p>
                </section>
              ) : (
                <>
                  <section className={m.card}>
                    <h3>Cobertura · {serviceLabel(current.service)}</h3>
                    <div className={m.grid}>
                      {planCoverage(current.items, current.service).map((c) => (
                        <button
                          className={buttonClass("secondary", true)}
                          key={c.id}
                          onClick={() => setBlock(c.id)}
                        >
                          {c.label} ·{" "}
                          {c.complete
                            ? "Validado"
                            : c.loaded
                              ? `${c.loaded} registros · revisar campos y validación`
                              : "Pendiente"}
                        </button>
                      ))}
                    </div>
                  </section>
                  <nav className={m.tabs} aria-label="Bloques del Plan">
                    {current.blueprints.map((b) => (
                      <button
                        key={b.id}
                        aria-pressed={bp?.id === b.id}
                        onClick={() => setBlock(b.id)}
                      >
                        {b.label}
                      </button>
                    ))}
                  </nav>
                  {bp ? (
                    <>
                      <div className={m.head}>
                        <h3>{bp.label}</h3>
                        <button
                          disabled={!editable}
                          className={buttonClass("primary", true)}
                          onClick={() =>
                            setEditor({
                              item: newItem(bp.id, context()),
                              bp,
                              service: current.service,
                              revision: k.revision,
                            })
                          }
                        >
                          Agregar {bp.label.toLowerCase()}
                        </button>
                      </div>
                      {bp.methodology ? (
                        <p className={m.notice}>
                          <strong>Metodología</strong> · {bp.methodology}
                        </p>
                      ) : null}
                      {current.service === "publicidad-digital" &&
                      allocationErrors(current.items).length ? (
                        <div role="status" className={m.notice}>
                          {allocationErrors(current.items).map((e) => (
                            <p key={e}>{e}</p>
                          ))}
                          Los borradores pueden guardarse; la validación
                          requiere distribuciones completas.
                        </div>
                      ) : null}
                      {bp.id === "sitemap" &&
                      current.items.some((i) => i.section === "sitemap") ? (
                        <section className={m.card}>
                          <h4>Árbol de páginas</h4>
                          <ul className={m.tree}>
                            {sitemapTree(current.items).map(
                              ({ item, depth }) => (
                                <li
                                  key={item.id}
                                  style={{
                                    marginLeft: Math.min(depth, 8) * 16,
                                  }}
                                >
                                  {String(
                                    item.values.name || "Página sin nombre",
                                  )}{" "}
                                  · {String(item.values.type || "")}
                                </li>
                              ),
                            )}
                          </ul>
                        </section>
                      ) : null}
                      {current.items.filter((i) => i.section === bp.id)
                        .length ? (
                        current.items
                          .filter((i) => i.section === bp.id)
                          .map((item) => (
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
                                      inputs.discovery.find(
                                        (d) => d.record.id === id,
                                      )?.record.id || id,
                                  )
                                  .join(" · ") || "Discovery pendiente"}{" "}
                                ·{" "}
                                {item.findingIds
                                  .map((id) =>
                                    String(
                                      k.benchmark.findings.find(
                                        (f) => f.id === id,
                                      )?.values.statement || id,
                                    ),
                                  )
                                  .join(" · ") || "Benchmark pendiente"}
                              </p>
                              <div className={m.actions}>
                                <button
                                  disabled={!editable}
                                  className={buttonClass("secondary", true)}
                                  onClick={() =>
                                    setEditor({
                                      item,
                                      bp,
                                      service: current.service,
                                      revision: k.revision,
                                    })
                                  }
                                >
                                  Editar decisión
                                </button>
                                <button
                                  disabled={!editable}
                                  className={buttonClass("ghost", true)}
                                  onClick={() =>
                                    mutate((s, c) =>
                                      deletePlanItem(
                                        s,
                                        item,
                                        current.service,
                                        c,
                                      ),
                                    )
                                  }
                                >
                                  Quitar decisión
                                </button>
                              </div>
                            </article>
                          ))
                      ) : (
                        <p className={m.empty}>
                          Todavía no hay decisiones en este bloque.
                        </p>
                      )}
                    </>
                  ) : null}
                </>
              )}
            </>
          ) : null}
        </>
      )}
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
