"use client";
import { useState, type ReactNode } from "react";
import { serviceLabel, type OsClient } from "../os-data";
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
  externalBrands,
  newBrand,
  newItem,
  saveBrand,
  validateItem,
  benchmarkCoverage,
  captureBenchmark,
  benchmarkReport,
} from "./benchmark";
import { discoveryOf, versionChange } from "./state";
import { validatedDiscoveryToBenchmark } from "./proposals";
import type { BenchmarkBrand, KnowledgeItem } from "./types";
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
import o from "../os.module.css";
import {
  DocumentSection,
  DocumentShell,
  SectionStateBadge,
  type SectionState,
} from "./document-shell";
import { saveBenchmarkItem, deleteBenchmarkItem } from "./mutations";
import { BenchmarkIdeaDialog } from "./benchmark-idea-dialog";
import { useOsStore } from "../os-store";
import { canEditService } from "../director-data";
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
      options: ["Directa", "Indirecta", "Referente"],
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
      persistentFooter
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
type BlockCoverage = ReturnType<typeof benchmarkCoverage>[number]["blocks"][number];
function blockState(block?: BlockCoverage): SectionState {
  if (!block || block.count === 0) return "empty";
  if (block.missing.length) return "missing";
  if (block.requiresValidation) return "pending-validation";
  return "validated";
}

export function BenchmarkView({
  client,
  headerActions,
}: {
  client: OsClient;
  /** Document-level actions (e.g. Generar presentación). */
  headerActions?: ReactNode;
}) {
  const { k, editable, invalid, mutate, context } = useKnowledge(client);
  const { role, localHydrated } = useOsStore();
  const canSaveIdea = localHydrated && canEditService(role, client.slug, "contenidos");
  const [brandEditor, setBrandEditor] = useState<BenchmarkBrand | null>(null);
  const [idea, setIdea] = useState<{ brand: BenchmarkBrand; item: KnowledgeItem } | null>(null);
  const [editor, setEditor] = useState<{
    item: KnowledgeItem;
    bp: Blueprint;
    brandId?: string;
    revision: number;
  } | null>(null);
  const inputs = validatedDiscoveryToBenchmark(k);
  const coverage = benchmarkCoverage(k.benchmark);
  const reports = benchmarkReport(k);
  const segments = discoveryOf(k).targetSegments;
  const competitors = externalBrands(k.benchmark)
    .sort((a, b) => Number(b.principal) - Number(a.principal));
  const ownHistoryIds = new Set(k.benchmark.brands.filter((b) => b.type === "Propia" || b.id === "own").flatMap((b) => [b.id, ...b.items.map((i) => i.id)]));
  const benchmarkHistory = {
    ...k,
    versions: k.versions.filter((v) => ["benchmark", "benchmark-brand", "finding"].includes(v.entityType) && !ownHistoryIds.has(v.entityId)),
    audit: k.audit.filter((a) => /^Actualización de (benchmark|benchmark-brand|finding) ·/.test(a.action) && ![...ownHistoryIds].some((id) => a.action.includes(`· ${id} ·`))),
  };
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
    const ok = mutate(
      (state, ctx) => saveBenchmarkItem(state, item, editor.brandId, ctx),
      editor.revision,
    );
    return ok
      ? []
      : ["No se pudo guardar. Revisá el aviso y conservá el formulario."];
  }
  function deleteItem(item: KnowledgeItem) {
    mutate((s, c) => deleteBenchmarkItem(s, item, c));
  }
  const coverageOf = (brandId: string, blockId: string) =>
    coverage.find((row) => row.brandId === brandId)?.blocks.find((b) => b.id === blockId);
  const addButton = (brand: BenchmarkBrand, bp: Blueprint) =>
    editable ? (
      <button
        type="button"
        className={buttonClass("secondary", true)}
        onClick={() =>
          setEditor({
            item: newItem(bp.id, context()),
            bp,
            brandId: brand.id,
            revision: k.revision,
          })
        }
      >
        + Agregar
      </button>
    ) : null;
  function blockItems(brand: BenchmarkBrand, bp: Blueprint) {
    const rows = brand.items.filter((i) => i.section === bp.id);
    const block = coverageOf(brand.id, bp.id);
    return (
      <>
        {rows.length ? (
          rows.map((item) => (
            <article className={m.card} key={item.id}>
              <p className={m.badge}>
                {item.status} · {item.observedAt || "Fecha de relevamiento pendiente"}
                {item.demo ? " · DEMO" : ""}
              </p>
              <ItemDetails item={item} bp={bp} k={k} />
              {editable ? (
                <div className={m.actions}>
                  <button
                    className={buttonClass("secondary", true)}
                    onClick={() =>
                      setEditor({ item, bp, brandId: brand.id, revision: k.revision })
                    }
                  >
                    Editar
                  </button>
                  <button
                    className={buttonClass("ghost", true)}
                    onClick={() => deleteItem(item)}
                  >
                    Quitar
                  </button>
                </div>
              ) : null}
              {canSaveIdea && ["content", "paid", "news"].includes(bp.id) ? <button className={buttonClass("secondary", true)} onClick={() => setIdea({ brand, item })}>Guardar en Banco de ideas</button> : null}
            </article>
          ))
        ) : (
          <p className={m.empty}>
            Sin relevamiento de {bp.label.toLowerCase()} para {brand.name}.
            {editable ? " Usá «+ Agregar» para registrar texto, enlaces, métricas, capturas de referencia, fuentes y evidencia." : ""}
          </p>
        )}
        {block && block.count > 0 && block.missing.length ? (
          <p className={m.small}>Falta completar: {block.missing.slice(0, 6).join(" · ")}{block.missing.length > 6 ? ` y ${block.missing.length - 6} más` : ""}</p>
        ) : null}
      </>
    );
  }
  function brandMeta(brand: BenchmarkBrand) {
    return (
      <p className={m.small}>
        {brand.type}
        {brand.principal ? " · Competidor principal" : ""} ·{" "}
        {brand.region || "Región pendiente"} · Responsable:{" "}
        {brand.owner || "Pendiente"} ·{" "}
        {brand.clientValidated
          ? "Selección validada con el cliente"
          : "Validación del cliente pendiente"}
        {brand.demo ? " · DEMO" : ""}
      </p>
    );
  }
  function brandTools(brand: BenchmarkBrand) {
    return editable ? (
      <>
        <button
          className={buttonClass("ghost", true)}
          onClick={() => setBrandEditor(brand)}
        >
          Editar marca
        </button>
        <button
          disabled={!brand.items.length}
          className={buttonClass("ghost", true)}
          onClick={() => mutate((s, c) => captureBenchmark(s, brand.id, c))}
        >
          Guardar snapshot fechado
        </button>
      </>
    ) : null;
  }
  function snapshots(brand: BenchmarkBrand) {
    const list = k.benchmark.snapshots.filter((s) => s.brandId === brand.id);
    return list.length ? (
      <details className={m.card}>
        <summary>Snapshots fechados de {brand.name} · {list.length}</summary>
        {list.map((s) => (
          <details key={s.id}>
            <summary>
              {s.capturedAt} · {s.capturedBy}
            </summary>
            <pre className={m.pre}>{formatValue(s.brand)}</pre>
          </details>
        ))}
      </details>
    ) : null;
  }
  const firstCompetitorNumber = 2;
  const index = [
    { id: "benchmark-marcas", label: "Marcas" },
    ...competitors.map((c) => ({ id: `benchmark-competidor-${c.id}`, label: c.name })),
    { id: "benchmark-conclusiones", label: "Conclusiones" },
    { id: "benchmark-monitoreo", label: "Monitoreo" },
  ];
  return (
    <div className={m.root}>
      <DocumentShell
        label="Benchmark"
        sections={index}
        header={
          <header className={m.docHead}>
            <div className={m.head}>
              <div>
                <p className={m.eyebrowDoc}>02 · Análisis competitivo</p>
                <h2>Benchmark</h2>
                <p>
                  Competidores externos, referentes y conclusiones respaldadas por
                  relevamientos fechados. Las conclusiones alimentan el Plan de
                  Marketing.
                </p>
              </div>
              {headerActions ? <div className={m.actions}>{headerActions}</div> : null}
            </div>
            <p className={m.small}>
              Entradas validadas del Discovery: {inputs.segments.length}{" "}
              segmentos · {inputs.offerings.length} ofertas ·{" "}
              {inputs.company
                ? "perfil de empresa validado"
                : "perfil de empresa pendiente de validación"}{" "}
              · {k.benchmark.findings.length} conclusiones · Última
              actualización: {k.updatedAt || "sin relevamiento"}
            </p>
            <LocalNotice invalid={invalid} />
            <ReviewBanner client={client} type="benchmark" id="all" />
          </header>
        }
      >
        <DocumentSection
          id="benchmark-marcas"
          number="01"
          title="Marcas seleccionadas"
          hint="Competidores directos, indirectos y referentes externos. La marca del cliente se consulta en Ficha, Discovery y Plan de Marketing."
          actions={
            editable ? (
              <button
                className={buttonClass("secondary", true)}
                onClick={() => setBrandEditor(newBrand())}
              >
                + Agregar marca
              </button>
            ) : null
          }
        >
          {competitors.length ? (
            <div className={o.tableWrap}>
              <table className={o.table}>
                <thead>
                  <tr>
                    <th scope="col">Marca</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Segmento en el que compite</th>
                    <th scope="col">Por qué la elegimos</th>
                    <th scope="col">Validación</th>
                    {editable ? <th scope="col"><span className={o.srOnly}>Acciones</span></th> : null}
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <a className={o.linkInk} href={`#benchmark-competidor-${b.id}`}>{b.name}</a>
                        {b.demo ? <span className={m.small}> · DEMO</span> : null}
                      </td>
                      <td>{b.type}{b.principal ? " · principal" : ""}</td>
                      <td>
                        {b.segmentIds
                          .map((id) => segments.find((x) => x.id === id)?.name)
                          .filter(Boolean)
                          .join(" · ") || "Pendiente"}
                      </td>
                      <td>{b.rationale || "Criterio pendiente"}</td>
                      <td>{b.clientValidated ? "Validada con el cliente" : "Pendiente"} · {b.status}</td>
                      {editable ? (
                        <td>
                          <button className={buttonClass("ghost", true)} onClick={() => setBrandEditor(b)}>Editar</button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={m.empty}>Todavía no hay marcas seleccionadas.</p>
          )}
        </DocumentSection>
        {competitors.map((brand, i) => (
          <DocumentSection
            key={brand.id}
            id={`benchmark-competidor-${brand.id}`}
            number={String(firstCompetitorNumber + i).padStart(2, "0")}
            title={brand.name}
            hint={brand.rationale || "Criterio de selección pendiente"}
            actions={brandTools(brand)}
          >
            {brandMeta(brand)}
            <ReviewBanner client={client} type="benchmark" id={brand.id} />
            {benchmarkBlueprints.map((bp) => (
              <div className={m.block} key={bp.id}>
                <div className={m.blockHead}>
                  <h4>{bp.id === "overview" ? "Análisis individual" : bp.label}</h4>
                  <div className={m.actions}>
                    <SectionStateBadge state={blockState(coverageOf(brand.id, bp.id))} />
                    {addButton(brand, bp)}
                  </div>
                </div>
                {blockItems(brand, bp)}
              </div>
            ))}
            {snapshots(brand)}
          </DocumentSection>
        ))}
        <DocumentSection
          id="benchmark-conclusiones"
          number={String(firstCompetitorNumber + competitors.length).padStart(2, "0")}
          title="Conclusiones generales"
          hint="Qué podemos tomar, qué debemos evitar y cómo diferenciarnos. Cada decisión del Plan tiene que poder apoyarse en una de estas conclusiones."
          state={
            k.benchmark.findings.length === 0
              ? "empty"
              : k.benchmark.findings.some((f) => f.status !== "Validado")
                ? "pending-validation"
                : "validated"
          }
          actions={
            editable ? (
              <button
                className={buttonClass("secondary", true)}
                onClick={() =>
                  setEditor({
                    item: newItem("finding", context()),
                    bp: findingsBlueprint,
                    revision: k.revision,
                  })
                }
              >
                + Agregar conclusión
              </button>
            ) : null
          }
        >
          <div className={m.findingGrid}>
            {findingBlueprint.fields[0].options?.map((category) => {
              const list = k.benchmark.findings.filter(
                (f) => f.values.category === category,
              );
              return (
                <section className={m.card} key={category}>
                  <h4>{category}</h4>
                  {list.length ? (
                    list.map((item) => (
                      <article className={m.findingItem} key={item.id}>
                        <ItemDetails item={item} bp={findingBlueprint} k={k} />
                        <p className={m.small}>
                          Módulos afectados:{" "}
                          {item.impactedServices.map(serviceLabel).join(" · ") ||
                            "Pendientes"}
                        </p>
                        {editable ? (
                          <div className={m.actions}>
                            <button
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
                              Editar
                            </button>
                            <button
                              className={buttonClass("ghost", true)}
                              onClick={() => deleteItem(item)}
                            >
                              Quitar
                            </button>
                          </div>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <p className={m.empty}>Sin conclusiones registradas.</p>
                  )}
                </section>
              );
            })}
          </div>
        </DocumentSection>
        <DocumentSection
          id="benchmark-monitoreo"
          title="Monitoreo y cambios entre relevamientos"
          hint="Cada nuevo relevamiento registra la fuente, se compara con el anterior y propone cambios. Las conclusiones solo se actualizan después de validarlas."
          state="not-applicable"
        >
          <section className={m.card}>
            <h4>Monitoreo automático: sin proveedor conectado</h4>
            <p>
              No hay fuentes ni ejecuciones reales de escaneo. Los snapshots
              manuales se guardan con fecha y responsable. Circuito previsto:
              registrar fuente → comparar con el último análisis → detectar
              cambios → proponer actualización → revisión → actualizar
              conclusiones tras validar.
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
                        cadence: e.target.value as "weekly" | "biweekly" | "monthly",
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
            <p className={m.small}>
              Último escaneo: {k.benchmark.scan.lastRunAt || "Nunca"} · Próxima
              ejecución: {k.benchmark.scan.nextRunAt || "Sin programar"}
            </p>
            <button
              disabled
              className={buttonClass("secondary", true)}
              title="Sin proveedor de escaneo conectado"
            >
              Ejecutar escaneo · sin proveedor conectado
            </button>
          </section>
          <section className={m.card}>
            <h4>Cambios entre los dos últimos snapshots</h4>
            {reports.map((r) => (
              <article key={r.brand} className={m.findingItem}>
                <strong>{r.brand}</strong>
                {r.pending ? (
                  <p className={m.small}>
                    Se necesitan dos snapshots para detectar diferencias.
                  </p>
                ) : (
                  <>
                    <p className={m.small}>
                      {r.baseline} → {r.last}
                    </p>
                    {r.changes.length ? (
                      r.changes.map((change) => (
                        <details key={change.section}>
                          <summary>Cambios en {change.section}</summary>
                          <div className={m.diff}>
                            <pre className={m.pre}>{formatValue(change.before)}</pre>
                            <pre className={m.pre}>{formatValue(change.after)}</pre>
                          </div>
                        </details>
                      ))
                    ) : (
                      <p className={m.small}>Sin cambios entre estos relevamientos.</p>
                    )}
                  </>
                )}
              </article>
            ))}
          </section>
          {editable ? <History k={benchmarkHistory} /> : null}
        </DocumentSection>
      </DocumentShell>
      {brandEditor ? (
        <BrandEditor
          client={client}
          brand={brandEditor}
          onClose={() => setBrandEditor(null)}
        />
      ) : null}
      {idea ? <BenchmarkIdeaDialog client={client} brand={idea.brand} item={idea.item} onClose={() => setIdea(null)} /> : null}
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
