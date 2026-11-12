"use client";

import { useRef, useState, type ReactNode } from "react";
import { type OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { useKnowledge } from "../knowledge/use-knowledge";
import { discoveryOf } from "../knowledge/state";
import { ReviewBanner } from "../knowledge/shared-ui";
import {
  DocumentSection,
  DocumentShell,
  type SectionState,
} from "../knowledge/document-shell";
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
  validateEntity,
  type EntityMap,
  type MarketingDiscovery,
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

const sectionAnchor: Record<SectionKey, string> = {
  companyProfile: "discovery-empresa",
  relevantFacts: "discovery-datos",
  businessUnits: "discovery-unidades",
  offerings: "discovery-productos",
  salesProcess: "discovery-comercial",
  targetSegments: "discovery-targeting",
  b2bIcps: "discovery-icp-b2b",
  b2cIcps: "discovery-icp-b2c",
};
const sectionTitle: Record<SectionKey, string> = {
  companyProfile: "Quiénes somos",
  relevantFacts: "Datos relevantes",
  businessUnits: "Unidades de negocio",
  offerings: "Productos y servicios",
  salesProcess: "Cómo se vende hoy",
  targetSegments: "Matriz de targeting",
  b2bIcps: "ICP B2B",
  b2cIcps: "ICP B2C",
};

export function MarketingDiscoveryView({
  client,
  headerActions,
}: {
  client: OsClient;
  /** Document-level actions (e.g. Generar presentación). */
  headerActions?: ReactNode;
}) {
  const { role, notify } = useOsStore();
  const knowledge = useKnowledge(client);
  const { d, editable, invalid: invalidStorage, hydrated } = knowledge;
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deletion, setDeletion] = useState<{
    kind: CollectionKey;
    id: string;
    name: string;
  } | null>(null);
  const [unitFilter, setUnitFilter] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("");
  const [applicability, setApplicability] = useState<{
    kind: "b2bIcps" | "b2cIcps";
    reason: string;
  } | null>(null);
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
        {filtered.length ? (
          <div className={kind === "stages" ? m.steps : m.records}>
            {filtered.map((r) =>
              recordCard(kind, r, all.indexOf(r), all.length),
            )}
          </div>
        ) : (
          <p className={m.empty}>
            {kind === "offerings" && unitFilter
              ? "Sin productos en esta unidad."
              : editable
                ? "Todavía no hay registros. Usá «+ Agregar» o cargá fuentes en el cuestionario."
                : "Todavía no hay registros cargados."}
          </p>
        )}
      </>
    );
  }
  function sectionState(key: SectionKey): SectionState {
    const c = d.completion.sections.find((x) => x.key === key);
    if (!c) return "empty";
    if (c.notApplicable) return "not-applicable";
    if (c.state === "Completa") return "validated";
    if (c.state === "Requiere validación") return "pending-validation";
    return c.count === 0 ? "empty" : "missing";
  }
  const pending = d.completion.sections.filter(
    (c) => !c.notApplicable && c.state !== "Completa",
  );
  const add = (kind: CollectionKey, label?: string) =>
    editable ? (
      <button
        type="button"
        className={buttonClass("secondary", true)}
        onClick={() => openEditor(kind)}
      >
        + Agregar {label ?? titles[kind].toLowerCase()}
      </button>
    ) : null;
  const edit = (kind: "companyProfile" | "salesProcess") =>
    editable ? (
      <button
        type="button"
        className={buttonClass("secondary", true)}
        onClick={() => openEditor(kind, d[kind])}
      >
        Editar
      </button>
    ) : null;
  const hint = (key: SectionKey) =>
    sections.find((section) => section.key === key)?.hint;
  function icpSection(kind: "b2bIcps" | "b2cIcps", number: string) {
    const applies = d.applicability[kind].applies;
    return (
      <DocumentSection
        id={kind === "b2bIcps" ? "discovery-icp-b2b" : "discovery-icp-b2c"}
        number={number}
        title={kind === "b2bIcps" ? "ICP B2B" : "ICP B2C"}
        hint={hint(kind)}
        state={sectionState(kind)}
        actions={
          <>
            {editable ? (
              <button
                type="button"
                className={buttonClass("ghost", true)}
                onClick={() => {
                  if (applies) setApplicability({ kind, reason: "" });
                  else {
                    const current = latest();
                    if (current)
                      persist({
                        ...current,
                        applicability: {
                          ...current.applicability,
                          [kind]: {
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
                {applies ? "Marcar que no aplica" : "Marcar que aplica"}
              </button>
            ) : null}
            {applies ? add(kind, "perfil") : null}
          </>
        }
      >
        {applies ? (
          collection(kind)
        ) : (
          <div className={m.applicability}>
            <strong>No aplica a este negocio</strong>
            {d.applicability[kind].reason ? (
              <p>{d.applicability[kind].reason}</p>
            ) : null}
          </div>
        )}
      </DocumentSection>
    );
  }
  const index = [
    { id: "discovery-cuestionario", label: "Cuestionario" },
    { id: "discovery-empresa", label: "Empresa" },
    { id: "discovery-datos", label: "Datos" },
    { id: "discovery-unidades", label: "Unidades" },
    { id: "discovery-productos", label: "Productos" },
    { id: "discovery-comercial", label: "Comercial" },
    { id: "discovery-targeting", label: "Targeting" },
    { id: "discovery-icp-b2b", label: "ICP B2B" },
    { id: "discovery-icp-b2c", label: "ICP B2C" },
    { id: "discovery-fuentes", label: "Fuentes" },
  ];
  return (
    <div className={m.discovery}>
    <DocumentShell
      label="Discovery del negocio"
      sections={index}
      header={
        <header className={m.docHeader}>
          <div className={m.docTitle}>
            <div>
              <span className={m.eyebrow}>01 · Análisis del negocio</span>
              <h2>Discovery del negocio</h2>
              <p>
                Qué hace, qué vende y a quién le vende {client.name}. Un único
                documento: el cuestionario alimenta el análisis y el análisis
                alimenta Benchmark y Plan.
              </p>
            </div>
            <div className={m.docActions}>{headerActions}</div>
          </div>
          <div className={m.meta}>
            <Badge tone={d.status === "Validado" ? "cool" : "peach"}>
              {d.status}
            </Badge>
            <span>
              Responsable: {d.companyProfile.owner || "Pendiente de asignar"}
            </span>
            <span>{d.sources.length} fuente(s)</span>
            <span>
              Última actualización: {formatDate(d.updatedAt)}
              {d.updatedBy ? ` · ${d.updatedBy}` : ""}
            </span>
            <span className={m.saveState}>
              {!hydrated
                ? "Leyendo datos locales…"
                : knowledge.k.revision > 0 && !invalidStorage
                  ? "Guardado en este navegador"
                  : "Datos demostrativos · sin cambios locales"}{" "}
              · Sin sincronización multiusuario
            </span>
            {!editable ? <Badge>Solo lectura</Badge> : null}
          </div>
          {invalidStorage ? (
            <p role="alert" className={m.error}>
              El Discovery guardado usa un formato incompatible. Se muestra la
              demo sin sobrescribir los datos locales. Se requiere revisar o
              migrar esa versión.
            </p>
          ) : null}
          {pending.length ? (
            <details className={m.pending}>
              <summary>
                Pendientes antes de exportar · {pending.length}{" "}
                {pending.length === 1 ? "sección" : "secciones"}
              </summary>
              <ul>
                {pending.map((c) => (
                  <li key={c.key}>
                    <a href={`#${sectionAnchor[c.key]}`}>
                      {sectionTitle[c.key]}
                    </a>
                    <span>
                      {c.count === 0
                        ? "Sin información cargada"
                        : c.missing.length
                          ? `Falta: ${c.missing.slice(0, 4).join(" · ")}${c.missing.length > 4 ? ` y ${c.missing.length - 4} más` : ""}`
                          : `${c.unvalidated} registro(s) pendientes de validar`}
                    </span>
                  </li>
                ))}
              </ul>
              <p className={m.muted}>
                Para validar un registro se necesitan todos los campos
                obligatorios, evidencia, responsable y fuentes validadas que no
                sean de demostración.
              </p>
            </details>
          ) : (
            <p className={m.muted}>
              Todas las secciones están completas y validadas.
            </p>
          )}
        </header>
      }
    >
      <DocumentSection
        id="discovery-cuestionario"
        number="01"
        title="Cuestionario inicial"
        hint="Relevamiento y carga inicial: cargá documentos, pegá textos o sumá fuentes; el análisis sugiere respuestas y vos las revisás. No hace falta responder a mano lo que ya está en las fuentes."
      >
        {editable ? (
          <QuestionnaireView key={client.slug} client={client} compact />
        ) : (
          <p className={m.muted}>
            El cuestionario está disponible para el administrador y el PM
            asignado.
          </p>
        )}
      </DocumentSection>
      <DocumentSection
        id="discovery-empresa"
        number="02"
        title="Quiénes somos"
        hint={hint("companyProfile")}
        state={sectionState("companyProfile")}
        actions={edit("companyProfile")}
      >
        {recordCard("companyProfile", d.companyProfile, 0, 1)}
      </DocumentSection>
      <DocumentSection
        id="discovery-datos"
        number="03"
        title="Datos relevantes"
        hint={hint("relevantFacts")}
        state={sectionState("relevantFacts")}
        actions={add("relevantFacts")}
      >
        {collection("relevantFacts")}
      </DocumentSection>
      <DocumentSection
        id="discovery-unidades"
        number="04"
        title="Unidades de negocio"
        hint={hint("businessUnits")}
        state={sectionState("businessUnits")}
        actions={add("businessUnits")}
      >
        {collection("businessUnits")}
      </DocumentSection>
      <DocumentSection
        id="discovery-productos"
        number="05"
        title="Productos y servicios"
        hint={hint("offerings")}
        state={sectionState("offerings")}
        actions={add("offerings")}
      >
        {d.businessUnits.length > 1 ? (
          <label className={`${s.field} ${m.filter}`}>
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
        ) : null}
        {collection("offerings")}
      </DocumentSection>
      <DocumentSection
        id="discovery-comercial"
        number="06"
        title="Cómo se vende hoy"
        hint={hint("salesProcess")}
        state={sectionState("salesProcess")}
        actions={
          <>
            {edit("salesProcess")}
            {add("stages", "etapa")}
          </>
        }
      >
        {recordCard("salesProcess", d.salesProcess, 0, 1)}
        <h4 className={m.subhead}>Secuencia comercial</h4>
        {collection("stages")}
      </DocumentSection>
      <DocumentSection
        id="discovery-targeting"
        number="07"
        title="Matriz de targeting"
        hint={hint("targetSegments")}
        state={sectionState("targetSegments")}
        actions={add("targetSegments")}
      >
        <TargetingMatrix
          d={d}
          selected={selectedSegment}
          onSelect={setSelectedSegment}
        />
        {collection("targetSegments")}
      </DocumentSection>
      {icpSection("b2bIcps", "08")}
      {icpSection("b2cIcps", "09")}
      <DocumentSection
        id="discovery-fuentes"
        title="Fuentes y trazabilidad"
        hint="Cada fuente puede respaldar varios registros. Revisar una fuente vuelve a pedir validación de los registros vinculados."
        actions={add("sources")}
      >
        {collection("sources")}
        <p className={m.muted}>
          Permisos de preview: Administrador y PM asignado pueden editar; los
          demás perfiles consultan. La seguridad de producción requiere
          autenticación, API y RLS reales.
        </p>
      </DocumentSection>
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
    </DocumentShell>
    </div>
  );
}
