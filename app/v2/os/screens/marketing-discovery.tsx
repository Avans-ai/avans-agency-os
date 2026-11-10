"use client";

import { useRef, useState } from "react";
import { type OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { useKnowledge } from "../knowledge/use-knowledge";
import { discoveryOf } from "../knowledge/state";
import { ReviewBanner } from "../knowledge/shared-ui";
import { QuestionnaireView } from "../knowledge/questionnaire-view";
import { OSModal, OSSidePanel } from "../overlays";
import { Badge, buttonClass } from "../ui";
import { discoveryActor } from "../discovery/permissions";
import {
  changeCollection,
  isValidated,
  missingFields,
  newEntity,
  putEntity,
  recordsOf,
  referencesTo,
  targetingQuadrant,
  toDiscoveryPresentation,
  validateEntity,
  type EntityMap,
  type MarketingDiscovery,
  type SectionCompletion,
  type Trace,
} from "../discovery/model";
import {
  entityFields,
  fields,
  sections,
  type CollectionKey,
  type EditableRecord,
  type EntityKind,
  type Field,
  type SectionKey,
} from "../discovery/schema";
import s from "../os.module.css";
import m from "./marketing-discovery.module.css";

type View = SectionKey | "coverage" | "sources" | "questionnaire";
type Editor = { kind: EntityKind; value: EditableRecord; original?: string };
const titles: Record<EntityKind, string> = {
  companyProfile: "Quiénes somos",
  relevantFacts: "Dato relevante",
  businessUnits: "Unidad de negocio",
  offerings: "Producto o servicio",
  salesProcess: "Datos del proceso comercial",
  stages: "Etapa comercial",
  targetSegments: "Segmento",
  b2bIcps: "ICP B2B",
  b2cIcps: "ICP B2C",
  sources: "Fuente",
};
const toRecord = (record: Trace) => record as unknown as EditableRecord;
const formatDate = (value: string) =>
  value && !Number.isNaN(Date.parse(value))
    ? new Intl.DateTimeFormat("es-AR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Argentina/Buenos_Aires",
      }).format(new Date(value))
    : "Sin actualización registrada";

function displayValue(
  d: MarketingDiscovery,
  field: Field,
  value: unknown,
): string {
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (field.collection) {
    const rows = recordsOf(d, field.collection);
    const label = (id: string) =>
      rows.find((r) => r.id === id)?.name || "Referencia pendiente";
    return Array.isArray(value)
      ? value.length
        ? value.map(label).join(" · ")
        : "Pendiente de completar"
      : typeof value === "string" && value
        ? label(value)
        : "Pendiente de completar";
  }
  return value !== null && value !== undefined && String(value).trim()
    ? String(value)
    : "Pendiente de completar";
}
function RecordDetails({
  d,
  kind,
  record,
}: {
  d: MarketingDiscovery;
  kind: EntityKind;
  record: EditableRecord;
}) {
  return (
    <dl className={m.details}>
      {entityFields(kind)
        .filter((f) => f.key !== "status" && f.key !== "demo")
        .map((f) => (
          <div key={f.key}>
            <dt>{f.label}</dt>
            <dd>{displayValue(d, f, record[f.key])}</dd>
          </div>
        ))}
      <div>
        <dt>Última actualización</dt>
        <dd>
          {formatDate(String(record.updatedAt ?? ""))}
          {record.updatedBy ? ` · ${record.updatedBy}` : ""}
        </dd>
      </div>
    </dl>
  );
}
function ValidationBadge({
  d,
  kind,
  record,
}: {
  d: MarketingDiscovery;
  kind: EntityKind;
  record: Trace;
}) {
  const valid = isValidated(d, kind, record);
  return (
    <Badge tone={valid ? "cool" : "peach"}>
      {record.demo
        ? "Dato demostrativo"
        : valid
          ? "Validado"
          : record.status === "Validado"
            ? "Requiere revisión"
            : record.status}
    </Badge>
  );
}
function CoverageCard({
  item,
  onOpen,
  expanded = false,
}: {
  item: SectionCompletion;
  onOpen: () => void;
  expanded?: boolean;
}) {
  return (
    <article className={m.coverageCard}>
      <button type="button" onClick={onOpen}>
        <strong>
          {item.label === "Unidades de negocio"
            ? "Qué hacemos"
            : item.label === "Proceso comercial"
              ? "Cómo se vende hoy"
              : item.label === "Segmentación"
                ? "Matriz de targeting"
                : item.label}
        </strong>
        <b>{item.percent}%</b>
      </button>
      <progress
        aria-label={`Cobertura de ${item.label}`}
        max={100}
        value={item.percent}
      />
      <span>
        {item.state} ·{" "}
        {item.notApplicable ? "No aplica" : `${item.count} elemento(s)`}
      </span>
      {expanded ? (
        <>
          <span>{item.unvalidated} registro(s) pendientes de validar</span>
          <details>
            <summary>Campos faltantes ({item.missing.length})</summary>
            {item.missing.length ? (
              <ul>
                {item.missing.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            ) : (
              <p>Sin campos obligatorios faltantes.</p>
            )}
          </details>
        </>
      ) : null}
    </article>
  );
}

function EntityEditor({
  editor,
  d,
  onClose,
  onSave,
}: {
  editor: Editor;
  d: MarketingDiscovery;
  onClose: () => void;
  onSave: (value: EditableRecord) => string[];
}) {
  const [value, setValue] = useState(editor.value);
  const [errors, setErrors] = useState<string[]>([]);
  const errorRef = useRef<HTMLDivElement>(null);
  const domainFields = fields[editor.kind] as readonly Field[];
  const metadataFields = entityFields(editor.kind).filter(
    (f) => !domainFields.some((x) => x.key === f.key),
  );
  const update = (key: string, next: EditableRecord[string]) =>
    setValue((v) => ({ ...v, [key]: next }));
  function input(field: Field) {
    const id = `discovery-field-${field.key}`;
    const current = value[field.key];
    if (field.kind === "boolean")
      return (
        <label className={m.checkbox} key={field.key}>
          <input
            id={id}
            type="checkbox"
            checked={current === true}
            onChange={(e) => update(field.key, e.target.checked)}
          />
          {field.label}
        </label>
      );
    let options = field.collection
      ? recordsOf(d, field.collection)
          .filter(
            (r) =>
              field.collection !== "targetSegments" ||
              !(editor.kind === "b2bIcps" || editor.kind === "b2cIcps") ||
              ("type" in r &&
                r.type === (editor.kind === "b2bIcps" ? "B2B" : "B2C")),
          )
          .map((r) => ({ id: r.id, name: r.name }))
      : [];
    if (field.collection === "sources")
      options = options.filter((o) => o.id !== value.id);
    if (field.kind === "relations")
      return (
        <fieldset className={m.relations} key={field.key}>
          <legend>
            {field.label}
            {field.required ? " · para completar" : ""}
          </legend>
          {options.length ? (
            options.map((o) => (
              <label className={m.checkbox} key={o.id}>
                <input
                  type="checkbox"
                  checked={Array.isArray(current) && current.includes(o.id)}
                  onChange={(e) =>
                    update(
                      field.key,
                      e.target.checked
                        ? [...(Array.isArray(current) ? current : []), o.id]
                        : (Array.isArray(current) ? current : []).filter(
                            (id) => id !== o.id,
                          ),
                    )
                  }
                />
                {o.name || "Sin nombre"}
              </label>
            ))
          ) : (
            <p>Primero agregá {field.label.toLowerCase()} desde su sección.</p>
          )}
        </fieldset>
      );
    return (
      <label className={s.field} key={field.key} htmlFor={id}>
        <span>
          {field.label}
          {field.required ? <small> · para completar</small> : null}
        </span>
        {field.kind === "long" ? (
          <textarea
            id={id}
            className={s.input}
            rows={3}
            value={String(current ?? "")}
            onChange={(e) => update(field.key, e.target.value)}
          />
        ) : field.kind === "select" || field.kind === "relation" ? (
          <select
            id={id}
            className={s.input}
            value={String(current ?? "")}
            onChange={(e) => update(field.key, e.target.value)}
          >
            <option value="">Pendiente de completar</option>
            {field.options?.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name || "Sin nombre"}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={id}
            className={s.input}
            type={
              field.kind === "number"
                ? "number"
                : field.kind === "date"
                  ? "date"
                  : "text"
            }
            min={field.kind === "number" ? 0 : undefined}
            max={field.kind === "number" ? 100 : undefined}
            step={field.kind === "number" ? "any" : undefined}
            value={
              typeof current === "number" || typeof current === "string"
                ? current
                : ""
            }
            required={field.key === "name"}
            onChange={(e) =>
              update(
                field.key,
                field.kind === "number"
                  ? e.target.value === ""
                    ? null
                    : Number(e.target.value)
                  : e.target.value,
              )
            }
          />
        )}
      </label>
    );
  }
  return (
    <OSSidePanel
      label={`Editar ${titles[editor.kind]}`}
      heading={<h2 className={m.drawerTitle}>{titles[editor.kind]}</h2>}
      onClose={onClose}
    >
      <form
        className={m.form}
        onSubmit={(e) => {
          e.preventDefault();
          const result = onSave(value);
          setErrors(result);
          if (result.length)
            requestAnimationFrame(() => errorRef.current?.focus());
        }}
      >
        <p className={m.muted}>
          Podés guardar un borrador incompleto. Para validar, completá los
          campos indicados y vinculá evidencia y fuentes validadas.
        </p>
        {errors.length ? (
          <div ref={errorRef} className={m.error} role="alert" tabIndex={-1}>
            <strong>Revisá antes de guardar</strong>
            <ul>
              {errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {domainFields.map(input)}
        <h3>Trazabilidad y validación</h3>
        {metadataFields.map(input)}
        <p className={m.muted}>
          Guardado en este navegador · Pendiente de sincronización multiusuario.
        </p>
        <div className={m.formActions}>
          <button
            className={buttonClass("secondary")}
            type="button"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className={buttonClass("primary")} type="submit">
            Guardar en este navegador
          </button>
        </div>
      </form>
    </OSSidePanel>
  );
}

function TargetingMatrix({
  d,
  selected,
  onSelect,
}: {
  d: MarketingDiscovery;
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={m.targeting}>
      <figure className={m.matrix}>
        <figcaption>
          Potencial ↑ · Match → · Tamaño = relevancia actual
        </figcaption>
        <svg
          viewBox="0 0 620 330"
          role="group"
          aria-label="Matriz de targeting; detalle accesible en la lista de segmentos"
        >
          <rect x="50" y="50" width="520" height="220" fill="var(--av-bg)" />
          <path
            d="M50 160H570M310 50V270"
            stroke="var(--av-border-strong)"
            strokeDasharray="5 5"
          />
          <path d="M50 50V270H570" fill="none" stroke="var(--av-text-muted)" />
          <g className={m.quadrants}>
            <text x="65" y="72">
              ADAPTAR LA OFERTA
            </text>
            <text x="325" y="72">
              FOCO PRINCIPAL
            </text>
            <text x="65" y="254">
              DESPRIORIZAR
            </text>
            <text x="325" y="254">
              SOSTENER
            </text>
            <text x="25" y="55">
              100
            </text>
            <text x="30" y="166">
              50
            </text>
            <text x="35" y="274">
              0
            </text>
            <text x="50" y="292">
              0
            </text>
            <text x="300" y="292">
              50
            </text>
            <text x="550" y="292">
              100
            </text>
          </g>
          {d.targetSegments.map((seg, i) =>
            seg.match === null ||
            seg.potential === null ||
            seg.currentRelevance === null ? null : (
              <g
                key={seg.id}
                role="button"
                tabIndex={0}
                aria-label={`${seg.name}: ${targetingQuadrant(seg.match, seg.potential)}. Match ${seg.match}, potencial ${seg.potential}, relevancia ${seg.currentRelevance}`}
                aria-pressed={selected === seg.id}
                className={m.bubble}
                onClick={() => onSelect(seg.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(seg.id);
                  }
                }}
              >
                <circle
                  cx={50 + seg.match * 5.2}
                  cy={270 - seg.potential * 2.2}
                  r={10 + Math.sqrt(seg.currentRelevance) * 1.7}
                  fill="var(--av-coral-300)"
                  fillOpacity=".8"
                  stroke={
                    selected === seg.id
                      ? "var(--av-text)"
                      : "var(--av-bg-raised)"
                  }
                  strokeWidth={selected === seg.id ? 3 : 1}
                />
                <text
                  x={50 + seg.match * 5.2}
                  y={274 - seg.potential * 2.2}
                  textAnchor="middle"
                  fill="var(--av-cocoa)"
                >
                  {i + 1}
                </text>
              </g>
            ),
          )}
        </svg>
        <p>
          El umbral de cada eje es 50. Los segmentos sin los tres puntajes
          aparecen únicamente en la lista.
        </p>
      </figure>
      <div className={m.segmentList} aria-label="Lista accesible de segmentos">
        {d.targetSegments.map((seg, i) => (
          <button
            type="button"
            key={seg.id}
            aria-pressed={selected === seg.id}
            onClick={() => onSelect(seg.id)}
          >
            <strong>
              {i + 1}. {seg.name}
            </strong>
            <span>{targetingQuadrant(seg.match, seg.potential)}</span>
            <small>
              Match {seg.match ?? "—"} · Potencial {seg.potential ?? "—"} ·
              Relevancia {seg.currentRelevance ?? "—"}
            </small>
          </button>
        ))}
      </div>
    </div>
  );
}

function PresentationPreview({
  d,
  onClose,
}: {
  d: MarketingDiscovery;
  onClose: () => void;
}) {
  const presentation = toDiscoveryPresentation(d);
  const rows: Record<SectionKey, Trace[]> = {
    companyProfile: [presentation.companyOverview],
    relevantFacts: presentation.relevantFacts,
    businessUnits: presentation.businessUnits,
    offerings: presentation.offeringSlides,
    salesProcess: [presentation.salesProcess],
    targetSegments: presentation.targetingMatrix,
    b2bIcps: presentation.b2bIcpSlides,
    b2cIcps: presentation.b2cIcpSlides,
  };
  return (
    <OSSidePanel
      label="Vista previa del contenido de presentación"
      heading={<h2 className={m.drawerTitle}>Contenido de presentación</h2>}
      onClose={onClose}
    >
      <div className={m.preview}>
        <p>
          Plan de contenido de las futuras filminas 5–12. No es un PowerPoint
          generado. Los borradores y datos demostrativos requieren revisión
          antes de presentar.
        </p>
        {sections.map((section) => {
          const coverage = presentation.coverage.sections.find(
            (c) => c.key === section.key,
          )!;
          const repeated = ["offerings", "b2bIcps", "b2cIcps"].includes(
            section.key,
          );
          return (
            <details key={section.key}>
              <summary>
                Filmina {section.slide} · {section.label}
                <small>
                  {coverage.notApplicable
                    ? "No aplica · se omite"
                    : `${repeated ? rows[section.key].length : 1} filmina(s) · ${coverage.state}`}
                </small>
              </summary>
              {repeated ? (
                <p>
                  Se duplica una filmina por{" "}
                  {section.key === "offerings"
                    ? "producto o servicio"
                    : "perfil"}
                  .
                </p>
              ) : null}
              {section.key === "relevantFacts" ? (
                <p>
                  Se incluyen únicamente los datos destacados (
                  {presentation.relevantFacts.length} de{" "}
                  {d.relevantFacts.length}).
                </p>
              ) : null}
              {coverage.notApplicable ? (
                <p>
                  {d.applicability[section.key as "b2bIcps" | "b2cIcps"].reason}
                </p>
              ) : null}
              {rows[section.key].map((row, i) => (
                <article key={row.id}>
                  <h3>
                    {i + 1}. {String(toRecord(row).name || section.label)}
                  </h3>
                  <ValidationBadge d={d} kind={section.key} record={row} />
                  <RecordDetails
                    d={d}
                    kind={section.key}
                    record={toRecord(row)}
                  />
                  {section.key === "targetSegments" ? (
                    <p>
                      Cuadrante:{" "}
                      {targetingQuadrant(
                        toRecord(row).match as number | null,
                        toRecord(row).potential as number | null,
                      )}
                    </p>
                  ) : null}
                </article>
              ))}
              {section.key === "salesProcess"
                ? presentation.salesProcess.stages.map((stage, i) => (
                    <article key={stage.id}>
                      <h3>
                        {i + 1}. {stage.name}
                      </h3>
                      <RecordDetails d={d} kind="stages" record={stage} />
                    </article>
                  ))
                : null}
              <p>{coverage.unvalidated} registro(s) requieren validación.</p>
              <details>
                <summary>
                  Información faltante ({coverage.missing.length})
                </summary>
                <ul>
                  {coverage.missing.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </details>
            </details>
          );
        })}
      </div>
    </OSSidePanel>
  );
}

export function MarketingDiscoveryView({ client }: { client: OsClient }) {
  const { role, notify } = useOsStore();
  const knowledge = useKnowledge(client);
  const { d, editable, invalid: invalidStorage, hydrated } = knowledge;
  const [active, setActive] = useState<View>("companyProfile");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deletion, setDeletion] = useState<{
    kind: CollectionKey;
    id: string;
    name: string;
  } | null>(null);
  const [preview, setPreview] = useState(false);
  const [unitFilter, setUnitFilter] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("");
  const [applicability, setApplicability] = useState<{
    kind: "b2bIcps" | "b2cIcps";
    reason: string;
  } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const currentSection = sections.find((section) => section.key === active);
  function navigate(view: View) {
    setActive(view);
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({ block: "start" });
    });
  }
  function latest(): MarketingDiscovery | null {
    try {
      return discoveryOf(knowledge.latest());
    } catch {
      return null;
    }
  }
  function persist(next: MarketingDiscovery): boolean {
    return knowledge.persistDiscovery(next);
  }
  function openEditor(kind: EntityKind, row?: Trace, duplicate = false) {
    if (!editable) return;
    const original = row && !duplicate ? JSON.stringify(row) : undefined;
    const record = row
      ? { ...toRecord(row) }
      : toRecord(newEntity(kind, crypto.randomUUID()));
    if (duplicate) {
      record.id = crypto.randomUUID();
      record.name = `${record.name || titles[kind]} (copia)`;
      record.status = "Borrador";
      record.updatedAt = "";
      record.updatedBy = "";
      if (kind === "businessUnits") record.primary = false;
    }
    if (!record.owner) record.owner = discoveryActor(role);
    setEditor({ kind, value: record, original });
  }
  function saveEditor(value: EditableRecord): string[] {
    if (!editor || !editable) return ["Este rol no puede editar Discovery."];
    const current = latest();
    if (!current)
      return ["El formato almacenado no es compatible. No se sobrescribió."];
    const existing = recordsOf(current, editor.kind).find(
      (r) => r.id === value.id,
    );
    if (editor.original && JSON.stringify(existing) !== editor.original)
      return [
        "Este registro cambió en otra pestaña. Cerrá y volvé a abrir el editor para no sobrescribir ese cambio.",
      ];
    const errors = validateEntity(current, editor.kind, value);
    if (errors.length) return errors;
    const stamped = {
      ...value,
      updatedAt: new Date().toISOString(),
      updatedBy: discoveryActor(role),
    } as EntityMap[EntityKind];
    let next = putEntity(current, editor.kind, stamped);
    if (editor.kind === "b2bIcps" || editor.kind === "b2cIcps")
      next = {
        ...next,
        applicability: {
          ...next.applicability,
          [editor.kind]: {
            applies: true,
            reason: "",
            updatedAt: stamped.updatedAt,
            updatedBy: stamped.updatedBy,
          },
        },
      };
    if (
      editor.kind === "targetSegments" &&
      (value.type === "B2B" || value.type === "B2C")
    ) {
      const icpKind = value.type === "B2B" ? "b2bIcps" : "b2cIcps";
      next = {
        ...next,
        applicability: {
          ...next.applicability,
          [icpKind]: {
            applies: true,
            reason: "",
            updatedAt: stamped.updatedAt,
            updatedBy: stamped.updatedBy,
          },
        },
      };
    }
    if (persist(next)) {
      setEditor(null);
      return [];
    }
    return [
      "No se pudo guardar en este navegador. Los cambios continúan en este formulario.",
    ];
  }
  function move(kind: CollectionKey, id: string, action: "up" | "down") {
    const current = latest();
    if (current) persist(changeCollection(current, kind, id, action));
  }
  function recordCard(
    kind: EntityKind,
    row: Trace,
    index: number,
    length: number,
  ) {
    const record = toRecord(row);
    const singleton = kind === "companyProfile" || kind === "salesProcess";
    const missing = missingFields(d, kind, record);
    const linked =
      kind === "businessUnits"
        ? d.offerings
            .filter((o) => o.businessUnitId === row.id)
            .map((o) => o.name)
        : kind === "offerings"
          ? d.targetSegments
              .filter((t) => t.offeringIds.includes(row.id))
              .map((t) => t.name)
          : [];
    return (
      <article
        className={m.record}
        key={row.id}
        data-selected={selectedSegment === row.id}
      >
        <ReviewBanner client={client} type="discovery" id={row.id} />
        <div className={m.recordHead}>
          <div>
            <span className={m.eyebrow}>
              {kind === "stages"
                ? `Paso ${index + 1}`
                : singleton
                  ? "Ficha"
                  : `${index + 1} / ${length}`}
              {record.primary ? " · Unidad principal" : ""}
              {record.featured ? " · Destacado" : ""}
            </span>
            <h4>{String(record.name || titles[kind])}</h4>
          </div>
          <ValidationBadge d={d} kind={kind} record={row} />
        </div>
        {kind === "relevantFacts" ? (
          <p className={m.factValue}>
            {String(record.value || "Pendiente de completar")}{" "}
            <small>{String(record.unit || "")}</small>
          </p>
        ) : null}
        {kind === "companyProfile" || kind === "salesProcess" ? (
          <RecordDetails d={d} kind={kind} record={record} />
        ) : (
          <>
            <p>
              {String(
                record.description ||
                  record.relevance ||
                  record.reference ||
                  "Pendiente de completar",
              )}
            </p>
            {kind === "targetSegments" ? (
              <p>
                <strong>
                  {targetingQuadrant(
                    record.match as number | null,
                    record.potential as number | null,
                  )}
                </strong>{" "}
                ·{" "}
                {record.requiresIcp
                  ? "Requiere ICP propio"
                  : "Sin ICP solicitado"}
              </p>
            ) : null}
            <details
              open={
                kind === "targetSegments" && selectedSegment === row.id
                  ? true
                  : undefined
              }
            >
              <summary>
                Ver detalle y fuentes · {missing.length} campo(s) faltantes
              </summary>
              <RecordDetails d={d} kind={kind} record={record} />
              {missing.length ? (
                <p className={m.muted}>Falta: {missing.join(" · ")}</p>
              ) : null}
            </details>
          </>
        )}
        {kind === "businessUnits" || kind === "offerings" ? (
          <p className={m.muted}>
            {kind === "businessUnits"
              ? "Productos relacionados"
              : "Segmentos relacionados"}
            : {linked.join(" · ") || "Pendiente de relacionar"}
          </p>
        ) : null}
        <div className={m.recordFoot}>
          <span>{row.owner || "Responsable pendiente"}</span>
          {editable ? (
            <div className={m.actions}>
              <button
                type="button"
                className={buttonClass("secondary", true)}
                onClick={() => openEditor(kind, row)}
              >
                Editar
              </button>
              {!singleton ? (
                <>
                  <button
                    type="button"
                    className={buttonClass("ghost", true)}
                    onClick={() => openEditor(kind, row, true)}
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    className={buttonClass("ghost", true)}
                    disabled={index === 0}
                    aria-label={`Subir ${record.name}`}
                    onClick={() => move(kind as CollectionKey, row.id, "up")}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={buttonClass("ghost", true)}
                    disabled={index === length - 1}
                    aria-label={`Bajar ${record.name}`}
                    onClick={() => move(kind as CollectionKey, row.id, "down")}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={buttonClass("ghost", true)}
                    onClick={() =>
                      setDeletion({
                        kind: kind as CollectionKey,
                        id: row.id,
                        name: String(record.name || titles[kind]),
                      })
                    }
                  >
                    Eliminar
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>
    );
  }
  function collection(kind: CollectionKey) {
    const all = recordsOf(d, kind);
    const filtered =
      kind === "offerings" && unitFilter
        ? all.filter(
            (r) => "businessUnitId" in r && r.businessUnitId === unitFilter,
          )
        : all;
    return (
      <>
        {editable ? (
          <div className={m.toolbar}>
            <button
              type="button"
              className={buttonClass("primary", true)}
              onClick={() => openEditor(kind)}
            >
              Agregar {titles[kind].toLowerCase()}
            </button>
          </div>
        ) : null}
        {filtered.length ? (
          <div className={kind === "stages" ? m.steps : m.records}>
            {filtered.map((r) =>
              recordCard(kind, r, all.indexOf(r), all.length),
            )}
          </div>
        ) : (
          <p className={m.empty}>
            Pendiente de completar.{" "}
            {kind === "offerings" && unitFilter
              ? "Sin productos en esta unidad."
              : "Todavía no hay registros cargados."}
          </p>
        )}
      </>
    );
  }
  return (
    <section className={m.discovery} aria-label="Marketing Discovery">
      <header className={m.header}>
        <div>
          <span className={m.eyebrow}>01 · Análisis del negocio</span>
          <h2>Discovery del negocio</h2>
          <p>
            Una base compartida para entender qué hace, qué vende y a quién le
            vende {client.name}.
          </p>
          <div className={m.meta}>
            <Badge tone={d.status === "Validado" ? "cool" : "peach"}>
              {d.status}
            </Badge>
            <span>
              Responsable: {d.companyProfile.owner || "Pendiente de asignar"}
            </span>
            <span>{d.sources.length} fuente(s)</span>
          </div>
          <p className={m.muted}>
            Última actualización: {formatDate(d.updatedAt)}
            {d.updatedBy ? ` · ${d.updatedBy}` : ""}
          </p>
        </div>
        <div className={m.overall}>
          <strong>
            {d.completion.percent}
            <small>%</small>
          </strong>
          <span>cobertura general</span>
          <button
            type="button"
            className={buttonClass("secondary", true)}
            onClick={() => navigate("coverage")}
          >
            Ver faltantes
          </button>
        </div>
      </header>
      <div className={m.statusBar}>
        <span>
          {!hydrated
            ? "Leyendo datos locales…"
            : knowledge.k.revision > 0 && !invalidStorage
              ? "Guardado en este navegador"
              : "Datos demostrativos · sin cambios locales"}{" "}
          · Pendiente de sincronización multiusuario
        </span>
        {!editable ? <Badge>Solo lectura</Badge> : null}
      </div>
      {invalidStorage ? (
        <p role="alert" className={m.error}>
          El Discovery guardado usa un formato incompatible. Se muestra la demo
          sin sobrescribir los datos locales. Se requiere revisar o migrar esa
          versión.
        </p>
      ) : null}
      <div className={m.actions}>
        {editable ? (
          <button
            type="button"
            className={buttonClass("primary")}
            onClick={() => openEditor("companyProfile", d.companyProfile)}
          >
            Editar Discovery
          </button>
        ) : null}
        <button
          type="button"
          className={buttonClass("secondary")}
          onClick={() => navigate("sources")}
        >
          Fuentes y trazabilidad ({d.sources.length})
        </button>
        <button
          type="button"
          className={buttonClass("secondary")}
          onClick={() => setPreview(true)}
        >
          Vista previa del contenido de presentación
        </button>
      </div>
      <details className={m.method}>
        <summary>Cómo completar este Discovery</summary>
        <p>
          El Project Manager lidera y delega el relevamiento. Completá el brief,
          contrastalo en reunión y registrá la evidencia. Las unidades,
          productos y perfiles se repiten según el negocio. Después del análisis
          se construyen Benchmark y Plan de Marketing.
        </p>
        <p>
          La definición de empresa debe ser literal. Los faltantes y las
          instrucciones internas se revisan antes de presentar. Los documentos
          se referencian manualmente: no se extrajeron automáticamente.
        </p>
      </details>
      <section
        className={m.coverage}
        aria-label="Cobertura del Marketing Discovery"
      >
        <div className={m.sectionHead}>
          <h3>Cobertura del Marketing Discovery</h3>
          <button
            type="button"
            className={buttonClass("ghost", true)}
            onClick={() => navigate("coverage")}
          >
            Ver reglas y campos faltantes
          </button>
        </div>
        <div className={m.coverageGrid}>
          {d.completion.sections.map((item) => (
            <CoverageCard
              key={item.key}
              item={item}
              onOpen={() => navigate(item.key)}
            />
          ))}
        </div>
      </section>
      <nav className={m.index} aria-label="Índice del Discovery">
        {sections.map((section, i) => (
          <button
            type="button"
            key={section.key}
            aria-current={active === section.key ? "page" : undefined}
            onClick={() => navigate(section.key)}
          >
            {i + 1}. {section.label}
          </button>
        ))}
        <button
          type="button"
          aria-current={active === "coverage" ? "page" : undefined}
          onClick={() => navigate("coverage")}
        >
          9. Cobertura
        </button>
        <button
          type="button"
          aria-current={active === "questionnaire" ? "page" : undefined}
          onClick={() => navigate("questionnaire")}
        >
          Cuestionario inicial
        </button>
      </nav>
      <section
        className={m.content}
        aria-labelledby="discovery-section-heading"
      >
        <div className={m.sectionHead}>
          <div>
            <h3 ref={headingRef} tabIndex={-1} id="discovery-section-heading">
              {currentSection?.label ??
                (active === "questionnaire"
                  ? "Cuestionario inicial"
                  : active === "coverage"
                    ? "Cobertura del Marketing Discovery"
                    : "Fuentes y trazabilidad")}
            </h3>
            <p>
              {currentSection?.hint ??
                (active === "questionnaire"
                  ? "Preguntas para completar junto al cliente y generar propuestas revisables."
                  : active === "coverage"
                    ? "Completitud de contenido y validación se evalúan por separado."
                    : "Cada fuente puede vincularse a varios registros. La carga de archivos y la extracción continúan pendientes.")}
            </p>
          </div>
          {currentSection ? (
            <span className={m.eyebrow}>Filmina {currentSection.slide}</span>
          ) : null}
        </div>
        {active === "questionnaire" ? (
          editable ? (
            <QuestionnaireView key={client.slug} client={client} />
          ) : (
            <p>
              El cuestionario está disponible para el administrador y el PM
              asignado.
            </p>
          )
        ) : null}
        {active === "companyProfile"
          ? recordCard("companyProfile", d.companyProfile, 0, 1)
          : null}
        {active === "relevantFacts" ||
        active === "businessUnits" ||
        active === "sources"
          ? collection(active)
          : null}
        {active === "offerings" ? (
          <>
            <label className={s.field}>
              <span>Filtrar por unidad de negocio</span>
              <select
                className={s.input}
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
              >
                <option value="">Todas las unidades</option>
                {d.businessUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
            {collection("offerings")}
          </>
        ) : null}
        {active === "salesProcess" ? (
          <>
            {recordCard("salesProcess", d.salesProcess, 0, 1)}
            <h4>Secuencia comercial</h4>
            {collection("stages")}
          </>
        ) : null}
        {active === "targetSegments" ? (
          <>
            <TargetingMatrix
              d={d}
              selected={selectedSegment}
              onSelect={setSelectedSegment}
            />
            {collection("targetSegments")}
          </>
        ) : null}
        {active === "b2bIcps" || active === "b2cIcps" ? (
          <>
            <div className={m.applicability}>
              <strong>
                {d.applicability[active].applies
                  ? "Aplica a este negocio"
                  : "No aplica a este negocio"}
              </strong>
              {d.applicability[active].reason ? (
                <p>{d.applicability[active].reason}</p>
              ) : null}
              {editable ? (
                <button
                  type="button"
                  className={buttonClass("secondary", true)}
                  onClick={() => {
                    if (d.applicability[active].applies)
                      setApplicability({ kind: active, reason: "" });
                    else {
                      const current = latest();
                      if (current)
                        persist({
                          ...current,
                          applicability: {
                            ...current.applicability,
                            [active]: {
                              applies: true,
                              reason: "",
                              updatedAt: new Date().toISOString(),
                              updatedBy: discoveryActor(role),
                            },
                          },
                        });
                    }
                  }}
                >
                  {d.applicability[active].applies
                    ? "Marcar que no aplica"
                    : "Marcar que aplica"}
                </button>
              ) : null}
            </div>
            {collection(active)}
          </>
        ) : null}
        {active === "coverage" ? (
          <>
            <p className={m.muted}>
              Ocho secciones con el mismo peso. Se cuentan los campos requeridos
              de todos los registros. Datos relevantes exige tres registros
              validados; el proceso exige etapas y responsables; cada segmento
              con ICP solicitado necesita su perfil. “No aplica” con motivo y
              sin segmentos ni perfiles de ese tipo cuenta como completo. Solo
              se valida contenido con evidencia y fuentes validadas, sin datos
              demostrativos.
            </p>
            <div className={m.coverageGrid}>
              {d.completion.sections.map((item) => (
                <CoverageCard
                  key={item.key}
                  item={item}
                  expanded
                  onOpen={() => navigate(item.key)}
                />
              ))}
            </div>
          </>
        ) : null}
      </section>
      <p className={m.muted}>
        Permisos de preview: Administrador y PM asignado pueden editar; los
        demás perfiles consultan. La seguridad de producción requiere
        autenticación, API y RLS reales.
      </p>
      {editor && editable ? (
        <EntityEditor
          key={`${editor.kind}-${editor.value.id}`}
          editor={editor}
          d={d}
          onClose={() => setEditor(null)}
          onSave={saveEditor}
        />
      ) : null}
      {deletion && editable ? (
        <OSModal
          title={`Eliminar ${deletion.name}`}
          titleId="discovery-delete-title"
          onClose={() => setDeletion(null)}
          footer={
            <>
              <button
                type="button"
                className={buttonClass("secondary")}
                onClick={() => setDeletion(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={buttonClass("primary")}
                disabled={
                  referencesTo(d, deletion.kind, deletion.id).length > 0
                }
                onClick={() => {
                  const current = latest();
                  if (!current) return;
                  if (
                    referencesTo(current, deletion.kind, deletion.id).length
                  ) {
                    notify(
                      "El registro tiene referencias. Desvinculalas antes de eliminar.",
                      "error",
                    );
                    return;
                  }
                  if (
                    persist(
                      changeCollection(
                        current,
                        deletion.kind,
                        deletion.id,
                        "delete",
                      ),
                    )
                  )
                    setDeletion(null);
                }}
              >
                Confirmar eliminación
              </button>
            </>
          }
        >
          <p>
            Se eliminará este registro del Discovery guardado en este navegador.
          </p>
          {referencesTo(d, deletion.kind, deletion.id).length ? (
            <p role="alert">
              Está relacionado con otros registros. Desvinculá primero:{" "}
              {referencesTo(d, deletion.kind, deletion.id).join(" · ")}
            </p>
          ) : null}
        </OSModal>
      ) : null}
      {applicability && editable ? (
        <OSModal
          title="Marcar ICP como no aplicable"
          titleId="discovery-applicability-title"
          onClose={() => setApplicability(null)}
          footer={null}
        >
          <form
            className={m.form}
            onSubmit={(e) => {
              e.preventDefault();
              const current = latest();
              if (!current) return;
              const type = applicability.kind === "b2bIcps" ? "B2B" : "B2C";
              if (
                current[applicability.kind].length ||
                current.targetSegments.some((s) => s.type === type)
              ) {
                notify(
                  "Existen perfiles o segmentos de este tipo. Revisalos antes de marcar que no aplica.",
                  "error",
                );
                return;
              }
              if (
                persist({
                  ...current,
                  applicability: {
                    ...current.applicability,
                    [applicability.kind]: {
                      applies: false,
                      reason: applicability.reason.trim(),
                      updatedAt: new Date().toISOString(),
                      updatedBy: discoveryActor(role),
                    },
                  },
                })
              )
                setApplicability(null);
            }}
          >
            <label className={s.field}>
              <span>Motivo por el que no aplica</span>
              <textarea
                className={s.input}
                required
                value={applicability.reason}
                onChange={(e) =>
                  setApplicability({ ...applicability, reason: e.target.value })
                }
              />
            </label>
            <p>
              Solo se permite si no existen perfiles ni segmentos de ese tipo.
              No se elimina información automáticamente.
            </p>
            <button
              type="submit"
              className={buttonClass("primary")}
              disabled={!applicability.reason.trim()}
            >
              Guardar no aplicable
            </button>
          </form>
        </OSModal>
      ) : null}
      {preview ? (
        <PresentationPreview d={d} onClose={() => setPreview(false)} />
      ) : null}
    </section>
  );
}
