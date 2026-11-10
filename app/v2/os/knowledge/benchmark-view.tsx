"use client";
import { useState } from "react";
import { serviceLabel, type OsClient, type ServiceId } from "../os-data";
import { buttonClass } from "../ui";
import { OSSidePanel } from "../overlays";
import { useKnowledge } from "./use-knowledge";
import {
  benchmarkBlueprints,
  findingBlueprint,
  type Blueprint,
  type KnowledgeField,
} from "./blueprints";
import {
  newBrand,
  newItem,
  saveBrand,
  validateItem,
  benchmarkCoverage,
  captureBenchmark,
  benchmarkReport,
} from "./benchmark";
import { versionChange } from "./state";
import { validatedDiscoveryToBenchmark } from "./proposals";
import type { BenchmarkBrand, KnowledgeItem, BenchmarkFinding } from "./types";
import {
  FieldInput,
  ItemEditor,
  ItemDetails,
  History,
  LocalNotice,
  ReviewBanner,
  formatValue,
} from "./shared-ui";
import m from "./knowledge.module.css";
import { saveBenchmarkItem, deleteBenchmarkItem } from "./mutations";
function BrandEditor({
  client,
  brand,
  onClose,
}: {
  client: OsClient;
  brand: BenchmarkBrand;
  onClose: () => void;
}) {
  const { k, mutate } = useKnowledge(client);
  const [draft, setDraft] = useState(brand);
  const [error, setError] = useState("");
  const fields: KnowledgeField[] = [
    { key: "name", label: "Nombre", kind: "text" },
    {
      key: "type",
      label: "Tipo",
      kind: "select",
      options:
        brand.type === "Propia"
          ? ["Propia"]
          : ["Directa", "Indirecta", "Referente"],
    },
    {
      key: "segmentIds",
      label: "Segmentos del Discovery",
      kind: "relations",
      reference: "segments",
    },
    { key: "rationale", label: "Por qué fue elegida", kind: "long" },
    { key: "url", label: "URL", kind: "text" },
    { key: "region", label: "País o región", kind: "text" },
    { key: "owner", label: "Responsable", kind: "text" },
    {
      key: "sourceIds",
      label: "Fuentes",
      kind: "relations",
      reference: "sources",
    },
    {
      key: "principal",
      label: "Marca principal (hasta cuatro competidores)",
      kind: "boolean",
    },
    {
      key: "clientValidated",
      label: "Selección validada por el cliente",
      kind: "boolean",
    },
    {
      key: "status",
      label: "Estado",
      kind: "select",
      options: ["Borrador", "Validado", "Requiere revisión"],
    },
  ];
  return (
    <OSSidePanel
      label="Editar marca"
      heading={<h2>Marca a analizar</h2>}
      onClose={onClose}
      footer={
        <button
          className={buttonClass("primary")}
          type="submit"
          form="brand-form"
        >
          Guardar marca
        </button>
      }
    >
      <form
        id="brand-form"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            saveBrand(k, draft);
          } catch (e) {
            setError((e as Error).message);
            return;
          }
          if (
            mutate(
              (s, c) =>
                versionChange(
                  saveBrand(s, draft),
                  "benchmark-brand",
                  draft.id,
                  s.benchmark.brands.find((b) => b.id === draft.id),
                  draft,
                  c,
                ),
              k.revision,
            )
          )
            onClose();
        }}
      >
        {fields.map((f) => (
          <FieldInput
            key={f.key}
            field={f}
            value={draft[f.key as keyof BenchmarkBrand] as string}
            onChange={(v) => setDraft({ ...draft, [f.key]: v })}
            k={k}
          />
        ))}
        {error ? (
          <p className={m.error} role="alert">
            {error}
          </p>
        ) : null}
        {draft.demo ? (
          <p className={m.notice}>
            Selección heredada de la demo; cargá una marca real para validarla.
          </p>
        ) : null}
      </form>
    </OSSidePanel>
  );
}
export function BenchmarkView({ client }: { client: OsClient }) {
  const { k, editable, invalid, mutate, context } = useKnowledge(client);
  const [tab, setTab] = useState("coverage");
  const [brandId, setBrandId] = useState("own");
  const [block, setBlock] = useState("overview");
  const [brandEditor, setBrandEditor] = useState<BenchmarkBrand | null>(null);
  const [editor, setEditor] = useState<{
    item: KnowledgeItem;
    bp: Blueprint;
    brandId?: string;
    revision: number;
  } | null>(null);
  const brand =
    k.benchmark.brands.find((b) => b.id === brandId) ?? k.benchmark.brands[0];
  const bp = benchmarkBlueprints.find((b) => b.id === block)!;
  const inputs = validatedDiscoveryToBenchmark(k);
  const coverage = benchmarkCoverage(k.benchmark);
  const reports = benchmarkReport(k);
  const findingsBlueprint: Blueprint = {
    ...findingBlueprint,
    fields: [
      ...findingBlueprint.fields,
      {
        key: "impactedServices",
        label: "Módulos del Plan afectados",
        kind: "relations",
        reference: "services",
      },
    ],
  };
  function saveItem(item: KnowledgeItem) {
    if (!editor) return ["Sin editor"];
    const errors = validateItem(k, item, editor.bp);
    if (errors.length) return errors;
    const ok = mutate((state, ctx) => saveBenchmarkItem(state,item,editor.brandId,ctx),editor.revision);
    return ok
      ? []
      : ["No se pudo guardar. Revisá el aviso y conservá el formulario."];
  }
  function deleteItem(item:KnowledgeItem) {mutate((s,c)=>deleteBenchmarkItem(s,item,c));}
  return (
    <div className={m.root}>
      <div className={m.head}>
        <div>
          <h2>Benchmark</h2>
          <p>
            Marca propia, competidores y decisiones respaldadas por
            relevamientos fechados.
          </p>
        </div>
        <button
          disabled={!editable}
          className={buttonClass("primary", true)}
          onClick={() => setBrandEditor(newBrand())}
        >
          Agregar marca
        </button>
      </div>
      <LocalNotice invalid={invalid} />
      <ReviewBanner client={client} type="benchmark" id="all" />
      <nav className={m.tabs} aria-label="Secciones del Benchmark">
        {[
          ["coverage", "Cobertura del Benchmark"],
          ["analysis", "Marcas y análisis"],
          ["findings", "Conclusiones"],
          ["monitoring", "Monitoreo y reporte quincenal"],
        ].map(([id, label]) => (
          <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>
      {tab === "coverage" ? (
        <>
          <div className={m.notice}>
            Entradas validadas del Discovery: {inputs.segments.length} segmentos
            · {inputs.offerings.length} ofertas.{" "}
            {inputs.company
              ? "Perfil de empresa validado."
              : "Perfil de empresa pendiente de validación."}
          </div>
          <div className={m.grid}>
            {coverage.map((row) => (
              <article key={row.brandId} className={m.card}>
                <h3>
                  {row.name} · {row.percent}%
                </h3>
                <progress
                  className={m.progress}
                  value={row.percent}
                  max={100}
                />
                {row.blocks.map((b) => (
                  <div className={m.row} key={b.id}>
                    <div>
                      <strong>
                        {b.label} · {b.percent}%
                      </strong>
                      <p className={m.small}>
                        {b.owner || "Responsable pendiente"} ·{" "}
                        {b.requiresValidation
                          ? "Requiere validación"
                          : "Sin observaciones pendientes"}
                      </p>
                      {b.missing.length ? (
                        <details>
                          <summary>
                            {b.missing.length} campos pendientes
                          </summary>
                          <ul>
                            {b.missing.map((x, i) => (
                              <li key={i}>{x}</li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </div>
                    <button
                      className={buttonClass("ghost", true)}
                      onClick={() => {
                        setBrandId(row.brandId);
                        setBlock(b.id);
                        setTab("analysis");
                      }}
                    >
                      Abrir {b.label}
                    </button>
                  </div>
                ))}
              </article>
            ))}
          </div>
          <p className={m.muted}>
            Conclusiones: {k.benchmark.findings.length} · Fuentes:{" "}
            {
              new Set(
                k.benchmark.brands.flatMap((b) =>
                  b.items.flatMap((i) => i.sourceIds),
                ),
              ).size
            }{" "}
            · Última actualización: {k.updatedAt || "Sin relevamiento"}
          </p>
        </>
      ) : null}
      {tab === "analysis" ? (
        <>
          <nav className={m.tabs} aria-label="Marcas">
            {k.benchmark.brands.map((b) => (
              <button
                key={b.id}
                aria-pressed={brand?.id === b.id}
                onClick={() => setBrandId(b.id)}
              >
                {b.name} · {b.type}
                {b.demo ? " · DEMO" : ""}
              </button>
            ))}
          </nav>
          {brand ? (
            <>
              <div className={m.card}>
                <div className={m.head}>
                  <h3>{brand.name}</h3>
                  <div className={m.actions}>
                    <button
                      disabled={!editable}
                      className={buttonClass("secondary", true)}
                      onClick={() => setBrandEditor(brand)}
                    >
                      Editar selección
                    </button>
                    <button
                      disabled={!editable || !brand.items.length}
                      className={buttonClass("secondary", true)}
                      onClick={() =>
                        mutate((s, c) => captureBenchmark(s, brand.id, c))
                      }
                    >
                      Guardar snapshot fechado
                    </button>
                  </div>
                </div>
                <p>{brand.rationale || "Criterio de selección pendiente"}</p>
                <p className={m.small}>
                  {brand.region || "Región pendiente"} · Responsable:{" "}
                  {brand.owner || "Pendiente"} ·{" "}
                  {brand.clientValidated
                    ? "Selección validada con el cliente"
                    : "Validación del cliente pendiente"}{" "}
                  · {brand.status}
                </p>
                <ReviewBanner client={client} type="benchmark" id={brand.id} />
              </div>
              <nav className={m.tabs} aria-label="Bloques del análisis">
                {benchmarkBlueprints.map((b) => (
                  <button
                    key={b.id}
                    aria-pressed={block === b.id}
                    onClick={() => setBlock(b.id)}
                  >
                    {b.label}
                  </button>
                ))}
              </nav>
              <div className={m.head}>
                <h3>{bp.label}</h3>
                <button
                  disabled={!editable}
                  className={buttonClass("primary", true)}
                  onClick={() =>
                    setEditor({
                      item: newItem(bp.id, context()),
                      bp,
                      brandId: brand.id,
                      revision: k.revision,
                    })
                  }
                >
                  Agregar {bp.label.toLowerCase()}
                </button>
              </div>
              {brand.items.filter((i) => i.section === block).length ? (
                brand.items
                  .filter((i) => i.section === block)
                  .map((item) => (
                    <article className={m.card} key={item.id}>
                      <p className={m.badge}>
                        {item.status} · {item.observedAt || "Fecha pendiente"}
                      </p>
                      <ItemDetails item={item} bp={bp} k={k} />
                      <div className={m.actions}>
                        <button
                          disabled={!editable}
                          className={buttonClass("secondary", true)}
                          onClick={() =>
                            setEditor({
                              item,
                              bp,
                              brandId: brand.id,
                              revision: k.revision,
                            })
                          }
                        >
                          Editar análisis
                        </button>
                        <button
                          disabled={!editable}
                          className={buttonClass("ghost", true)}
                          onClick={() => deleteItem(item)}
                        >
                          Quitar análisis
                        </button>
                      </div>
                    </article>
                  ))
              ) : (
                <p className={m.empty}>
                  Todavía no hay observaciones de {bp.label.toLowerCase()} para
                  esta marca.
                </p>
              )}
              <details className={m.card}>
                <summary>Snapshots de {brand.name}</summary>
                {k.benchmark.snapshots
                  .filter((s) => s.brandId === brand.id)
                  .map((s) => (
                    <details key={s.id}>
                      <summary>
                        {s.capturedAt} · {s.capturedBy}
                      </summary>
                      <pre className={m.pre}>{formatValue(s.brand)}</pre>
                    </details>
                  ))}
              </details>
            </>
          ) : null}
        </>
      ) : null}
      {tab === "findings" ? (
        <>
          <div className={m.head}>
            <h3>Conclusiones del Benchmark</h3>
            <button
              disabled={!editable}
              className={buttonClass("primary", true)}
              onClick={() =>
                setEditor({
                  item: newItem("finding", context()),
                  bp: findingsBlueprint,
                  revision: k.revision,
                })
              }
            >
              Agregar conclusión
            </button>
          </div>
          {findingBlueprint.fields[0].options?.map((category) => (
            <section className={m.card} key={category}>
              <h3>{category}</h3>
              {k.benchmark.findings
                .filter((f) => f.values.category === category)
                .map((item) => (
                  <article className={m.card} key={item.id}>
                    <ItemDetails item={item} bp={findingBlueprint} k={k} />
                    <p>
                      Módulos afectados:{" "}
                      {item.impactedServices.map(serviceLabel).join(" · ") ||
                        "Pendientes"}
                    </p>
                    <div className={m.actions}>
                      <button
                        disabled={!editable}
                        className={buttonClass("secondary", true)}
                        onClick={() =>
                          setEditor({
                            item: {
                              ...item,
                              values: {
                                ...item.values,
                                impactedServices: item.impactedServices,
                              },
                            },
                            bp: findingsBlueprint,
                            revision: k.revision,
                          })
                        }
                      >
                        Editar conclusión
                      </button>
                      <button
                        disabled={!editable}
                        className={buttonClass("ghost", true)}
                        onClick={() => deleteItem(item)}
                      >
                        Quitar conclusión
                      </button>
                    </div>
                  </article>
                ))}
            </section>
          ))}
        </>
      ) : null}
      {tab === "monitoring" ? (
        <>
          <section className={m.card}>
            <h3>Monitoreo pendiente de configurar</h3>
            <p>
              No hay proveedor conectado. Los snapshots manuales se guardan con
              la fecha y el responsable del relevamiento.
            </p>
            <label className={m.field}>
              Frecuencia
              <select
                disabled={!editable}
                value={k.benchmark.scan.cadence}
                onChange={(e) =>
                  mutate((s) => ({
                    ...s,
                    benchmark: {
                      ...s.benchmark,
                      scan: {
                        ...s.benchmark.scan,
                        cadence: e.target.value as
                          "weekly" | "biweekly" | "monthly",
                      },
                    },
                  }))
                }
              >
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quincenal</option>
                <option value="monthly">Mensual</option>
              </select>
            </label>
            <FieldInput
              field={{
                key: "sourceIds",
                label: "Fuentes a monitorear",
                kind: "relations",
                reference: "sources",
              }}
              value={k.benchmark.scan.sourceIds}
              onChange={(value) =>
                mutate((s) => ({
                  ...s,
                  benchmark: {
                    ...s.benchmark,
                    scan: { ...s.benchmark.scan, sourceIds: value as string[] },
                  },
                }))
              }
              disabled={!editable}
              k={k}
            />
            <p>
              Último escaneo: {k.benchmark.scan.lastRunAt || "Nunca"} · Próxima
              ejecución: {k.benchmark.scan.nextRunAt || "Sin programar"}
            </p>
            <button disabled className={buttonClass("secondary", true)}>
              Ejecutar escaneo
            </button>
          </section>
          <section className={m.card}>
            <h3>Reporte quincenal · cambios entre snapshots</h3>
            <p className={m.muted}>
              Comparación de los dos últimos relevamientos guardados por marca.
              Las fechas muestran el período real disponible.
            </p>
            {reports.map((r) => (
              <article key={r.brand} className={m.card}>
                <h4>{r.brand}</h4>
                {r.pending ? (
                  <p>
                    Se necesitan dos snapshots para detectar diferencias. No hay
                    datos suficientes para este período.
                  </p>
                ) : (
                  <>
                    <p>
                      {r.baseline} → {r.last}
                    </p>
                    {r.changes.length ? (
                      r.changes.map((change) => (
                        <details key={change.section}>
                          <summary>Cambios en {change.section}</summary>
                          <div className={m.diff}>
                            <pre className={m.pre}>
                              {formatValue(change.before)}
                            </pre>
                            <pre className={m.pre}>
                              {formatValue(change.after)}
                            </pre>
                          </div>
                        </details>
                      ))
                    ) : (
                      <p>Sin cambios registrados entre estos relevamientos.</p>
                    )}
                  </>
                )}
              </article>
            ))}
            <h4>Oportunidades, amenazas y recomendaciones registradas</h4>
            {k.benchmark.findings.length ? (
              k.benchmark.findings.map((f) => (
                <p key={f.id}>
                  {String(f.values.category)}: {String(f.values.statement)} ·{" "}
                  {f.status}
                </p>
              ))
            ) : (
              <p>
                Sin conclusiones registradas. Contenidos, campañas y
                lanzamientos se informarán cuando exista evidencia en los
                relevamientos.
              </p>
            )}
          </section>
        </>
      ) : null}
      <History k={k} />
      {brandEditor ? (
        <BrandEditor
          client={client}
          brand={brandEditor}
          onClose={() => setBrandEditor(null)}
        />
      ) : null}
      {editor ? (
        <ItemEditor
          item={editor.item}
          bp={editor.bp}
          k={k}
          onSave={saveItem}
          onClose={() => setEditor(null)}
        />
      ) : null}
    </div>
  );
}
