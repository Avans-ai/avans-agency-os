"use client";

/* Vista genérica de una colección de objetos del módulo: listado con filtros,
 * alta, detalle con edición, aprobación, tareas vinculadas e historial.
 * Cada módulo la usa con sus propias definiciones (collections.ts). */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { AssistedCreatePanel } from "../assistant/assisted-create";
import { assistantProfile } from "../assistant/profiles";
import { Glyph } from "../glyphs";
import { serviceForTask } from "../director-data";
import { type OsClient, type ServiceId, type TaskWorkItem } from "../os-data";
import { useOsStore } from "../os-store";
import { OSModal, OSSidePanel } from "../overlays";
import { dueLabel } from "../selectors";
import { serviceHref } from "../service-workspace-data";
import { NewTaskModal } from "../task-blocks";
import { buttonClass, cx, OSDue, OSEmptyState } from "../ui";
import s from "../os.module.css";
import { newLabel, PEOPLE } from "./collections";
import { formatDate, formatDateTime, Panel, SourceTag, StatusBadge } from "./module-ui";
import { describeChanges, useModuleRecords } from "./store";
import type { CollectionDef, FieldDef, ModuleRecord } from "./types";
import m from "./modules.module.css";

export function refIds(def: CollectionDef) {
  return Array.from(new Set(def.fields.filter((field) => field.type === "ref" && field.ref).map((field) => field.ref!)));
}

export function displayValue(field: FieldDef, value: string, refs: Record<string, ModuleRecord[]>, titleKeyOf: (collection: string) => string) {
  if (!value) return "—";
  if (field.type === "ref" && field.ref) {
    const target = refs[field.ref]?.find((record) => record.id === value);
    return target ? target.values[titleKeyOf(field.ref)] || target.id : value;
  }
  if (field.type === "date") return formatDate(value);
  if (field.type === "number") {
    const number = Number(value);
    if (Number.isNaN(number)) return value;
    return field.key === "presupuesto" ? `$ ${number.toLocaleString("es-AR")}` : field.key === "participacion" ? `${number} %` : number.toLocaleString("es-AR");
  }
  return value;
}

export function useWorkItems(client: OsClient, serviceId: ServiceId, def?: CollectionDef) {
  const { data } = useModuleRecords(client.slug, serviceId, def ? [def.id] : []);
  return useMemo<TaskWorkItem[]>(() => def ? (data[def.id] ?? []).map((record) => ({ collection: def.id, id: record.id, label: record.values[def.titleKey] || record.id })) : [], [data, def]);
}

export function RecordForm({
  def,
  initial,
  refs,
  titleKeyOf,
  formId,
  onSubmit,
  excludeId,
  values: controlled,
  onValuesChange,
}: {
  def: CollectionDef;
  initial: Record<string, string>;
  refs: Record<string, ModuleRecord[]>;
  titleKeyOf: (collection: string) => string;
  formId: string;
  onSubmit: (values: Record<string, string>) => void;
  excludeId?: string;
  /** Controlled mode: the assisted panel owns the values so suggestions can fill fields. */
  values?: Record<string, string>;
  onValuesChange?: (values: Record<string, string>) => void;
}) {
  const [own, setOwn] = useState<Record<string, string>>(initial);
  const values = controlled ?? own;
  function setValues(update: (current: Record<string, string>) => Record<string, string>) {
    if (controlled && onValuesChange) onValuesChange(update(controlled));
    else setOwn(update);
  }
  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstRef = useRef<HTMLDivElement>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    for (const field of def.fields) {
      if (field.required && !(values[field.key] ?? "").trim()) nextErrors[field.key] = `Completá ${field.label.toLowerCase()}`;
      if (field.type === "number" && values[field.key] && Number.isNaN(Number(values[field.key]))) nextErrors[field.key] = "Ingresá un número";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      firstRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    onSubmit(Object.fromEntries(def.fields.map((field) => [field.key, (values[field.key] ?? "").trim()])));
  }

  return (
    <form id={formId} onSubmit={submit} noValidate>
      <div className={m.formGrid} ref={firstRef}>
        {def.fields.map((field, index) => {
          const id = `${formId}-${field.key}`;
          const group = field.group && field.group !== def.fields[index - 1]?.group ? <p key={`${field.key}-group`} className={m.formGroup} data-wide="true">{field.group}</p> : null;
          const error = errors[field.key];
          const common = {
            id,
            className: cx(s.input, s.inputSm),
            value: values[field.key] ?? "",
            "aria-invalid": Boolean(error),
            "aria-describedby": error ? `${id}-error` : undefined,
            required: field.required,
            onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
              const value = event.target.value;
              setValues((current) => ({ ...current, [field.key]: value }));
              setErrors((current) => ({ ...current, [field.key]: "" }));
            },
          };
          let control: ReactNode;
          if (field.type === "textarea") control = <textarea {...common} rows={3} maxLength={1200} placeholder={field.placeholder} />;
          else if (field.type === "select") control = <select {...common}><option value="">Elegir…</option>{(field.options ?? []).map((option) => <option key={option}>{option}</option>)}</select>;
          else if (field.type === "person") control = <select {...common}><option value="">Sin asignar</option>{PEOPLE.map((person) => <option key={person}>{person}</option>)}</select>;
          else if (field.type === "ref" && field.ref) control = <select {...common}><option value="">Sin vincular</option>{(refs[field.ref] ?? []).filter((record) => record.id !== excludeId).map((record) => <option key={record.id} value={record.id}>{record.values[titleKeyOf(field.ref!)] || record.id}</option>)}</select>;
          else control = <input {...common} type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"} inputMode={field.type === "number" ? "decimal" : undefined} maxLength={200} placeholder={field.placeholder} />;
          return [group,
            <div key={field.key} className={s.field} data-wide={field.type === "textarea" || field.key === def.titleKey ? "true" : undefined}>
              <label htmlFor={id}>{field.label}{field.required ? <span className={s.req} aria-hidden="true"> *</span> : null}</label>
              {control}
              {field.hint ? <span className={s.hint}>{field.hint}</span> : null}
              {error ? <span className={s.fieldError} id={`${id}-error`}><Glyph name="alert" size={14} />{error}</span> : null}
            </div>,
          ];
        })}
      </div>
    </form>
  );
}

export function CollectionView({
  client,
  serviceId,
  def,
  editable,
  onOpenRecord,
  headingLevel = "h2",
  extraActions,
  intro,
}: {
  client: OsClient;
  serviceId: ServiceId;
  def: CollectionDef;
  editable: boolean;
  onOpenRecord?: (record: ModuleRecord) => void;
  headingLevel?: "h2" | "h3";
  extraActions?: ReactNode;
  intro?: ReactNode;
}) {
  const { notify, tasks } = useOsStore();
  const collections = useMemo(() => [def.id, ...refIds(def)], [def]);
  const { data, create, update } = useModuleRecords(client.slug, serviceId, collections);
  const records = useMemo(() => data[def.id] ?? [], [data, def.id]);
  const [status, setStatus] = useState("todos");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const params = useSearchParams();
  // ?registro=<id> abre el detalle (enlaces desde el asistente u otras vistas).
  const [openId, setOpenId] = useState<string | null>(() => params.get("registro"));
  const profile = assistantProfile(serviceId, def.id);
  const statusField = def.fields.find((field) => field.key === def.statusKey);
  const columns = def.fields.filter((field) => field.list && field.key !== def.titleKey).slice(0, 6);
  const titleKeyOf = (collection: string) => (collection === def.id ? def.titleKey : FALLBACK_TITLE[collection] ?? "nombre");
  const linked = (id: string) => tasks.filter((task) => task.workItem?.id === id && serviceForTask(task) === serviceId);

  const normalized = query.trim().toLocaleLowerCase("es");
  const visible = records.filter((record) => {
    if (status !== "todos" && record.values[def.statusKey ?? ""] !== status) return false;
    return !normalized || Object.values(record.values).join(" ").toLocaleLowerCase("es").includes(normalized);
  });
  const open = records.find((record) => record.id === openId);
  const headingId = `${def.id}-heading`;

  function handleCreate(values: Record<string, string>, note?: string) {
    const record = create(def, values, note);
    if (!record) { notify("No se pudo guardar en este navegador", "error"); return null; }
    setCreating(false);
    notify(`${newLabel(def).replace(/^Nuev[oa] /, "").replace(/^./, (letter) => letter.toUpperCase())} guardado en este navegador`, "success");
    return record;
  }
  /** Enlace a un registro existente que se abre en otra pestaña, sin perder el borrador. */
  function existingHref(recordId: string) {
    const url = new URL(window.location.href);
    url.hash = "";
    if (def.id === "campanas" && serviceId === "publicidad-digital") url.searchParams.set("campana", recordId);
    else url.searchParams.set("registro", recordId);
    return `${url.pathname}${url.search}`;
  }

  return (
    <Panel
      as={headingLevel}
      id={headingId}
      title={def.label}
      description={def.description}
      actions={<>{extraActions}<button type="button" className={buttonClass("primary", true)} disabled={!editable} title={!editable ? "Tu rol puede consultar este módulo, pero no modificarlo" : undefined} onClick={() => setCreating(true)}>{newLabel(def)}</button></>}
      footer={<>Guardado en este navegador · {records.filter((record) => record.source === "demo").length} registros de demostración · {records.filter((record) => record.source === "manual").length} manuales</>}
    >
      {intro}
      <div className={m.toolbar} role="search" aria-label={`Filtrar ${def.label.toLowerCase()}`}>
        <label className={cx(s.searchField, m.grow)} style={{ background: "var(--av-bg)" }}>
          <Glyph name="search" size={15} />
          <span className={s.srOnly}>Buscar en {def.label.toLowerCase()}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar ${def.singular}`} />
        </label>
        {statusField?.options ? (
          <label className={m.filter} style={{ minWidth: 170 }}>
            <span>Estado</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="todos">Todos ({records.length})</option>
              {statusField.options.map((option) => {
                const count = records.filter((record) => record.values[def.statusKey!] === option).length;
                return <option key={option} value={option}>{option} ({count})</option>;
              })}
            </select>
          </label>
        ) : null}
      </div>
      {visible.length ? (
        <div className={s.tableWrap}>
          <table className={`${s.table} ${m.dense}`}>
            <caption className={s.srOnly}>{def.label} de {client.name}</caption>
            <thead>
              <tr>
                <th scope="col">{def.fields.find((field) => field.key === def.titleKey)?.label ?? "Nombre"}</th>
                {columns.map((field) => <th scope="col" key={field.key}>{field.label}</th>)}
                {def.linkTasks ? <th scope="col">Tareas</th> : null}
                <th scope="col">Fuente</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((record) => {
                const recordTasks = linked(record.id);
                return (
                  <tr key={record.id}>
                    <td>
                      <span className={m.tableTitle}>
                        <button type="button" className={m.rowButton} onClick={() => (onOpenRecord ? onOpenRecord(record) : setOpenId(record.id))}>{record.values[def.titleKey] || record.id}</button>
                        <small>{record.id}</small>
                      </span>
                    </td>
                    {columns.map((field) => (
                      <td key={field.key} className={field.type === "textarea" || field.type === "text" ? m.cellWrap : undefined}>
                        {field.key === def.statusKey ? <StatusBadge status={record.values[field.key] ?? ""} /> : displayValue(field, record.values[field.key] ?? "", data, titleKeyOf)}
                      </td>
                    ))}
                    {def.linkTasks ? <td>{recordTasks.length ? `${recordTasks.filter((task) => task.status !== "Hecho").length} abiertas / ${recordTasks.length}` : "—"}</td> : null}
                    <td><SourceTag source={record.source} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <OSEmptyState icon="registro" title={records.length ? "No hay registros que coincidan" : def.empty} actions={records.length ? <button type="button" className={buttonClass("secondary", true)} onClick={() => { setStatus("todos"); setQuery(""); }}>Limpiar filtros</button> : undefined}>
          {records.length ? "Probá con otro estado o texto." : editable ? `Creá el primer registro con «${newLabel(def)}».` : "Tu rol puede consultar, pero no crear registros en este módulo."}
        </OSEmptyState>
      )}

      {creating && profile && editable ? (
        <AssistedCreatePanel
          client={client}
          serviceId={serviceId}
          def={def}
          profile={profile}
          refs={data}
          titleKeyOf={titleKeyOf}
          onCreate={(values, note) => handleCreate(values, note)}
          onClose={() => setCreating(false)}
          existingHref={existingHref}
        />
      ) : creating ? (
        <OSModal
          title={newLabel(def)}
          titleId={`${def.id}-new-title`}
          onClose={() => setCreating(false)}
          footer={<><button type="button" className={buttonClass("ghost")} onClick={() => setCreating(false)}>Cancelar</button><button type="submit" form={`${def.id}-new-form`} className={buttonClass("primary")}>Guardar en este navegador</button></>}
        >
          <RecordForm def={def} initial={{}} refs={data} titleKeyOf={titleKeyOf} formId={`${def.id}-new-form`} onSubmit={handleCreate} />
          <p className={s.demoNote} style={{ margin: 0 }}>Se guarda con cliente, módulo, usuario, origen «manual», fecha e historial. Sin sincronización entre usuarios.</p>
        </OSModal>
      ) : null}

      {open ? (
        <RecordPanel
          key={open.id}
          client={client}
          serviceId={serviceId}
          def={def}
          record={open}
          refs={data}
          titleKeyOf={titleKeyOf}
          editable={editable}
          onClose={() => setOpenId(null)}
          onSave={(values, text) => update(def.id, open.id, values, text)}
        />
      ) : null}
    </Panel>
  );
}

/** Títulos de colecciones referenciadas (para mostrar el nombre en vez del id). */
const FALLBACK_TITLE: Record<string, string> = {
  campanas: "nombre",
  ejes: "nombre",
  proyectos: "nombre",
  producciones: "titulo",
  sitemap: "pagina",
  piezas: "titulo",
};

export function RecordPanel({
  client,
  serviceId,
  def,
  record,
  refs,
  titleKeyOf,
  editable,
  onClose,
  onSave,
}: {
  client: OsClient;
  serviceId: ServiceId;
  def: CollectionDef;
  record: ModuleRecord;
  refs: Record<string, ModuleRecord[]>;
  titleKeyOf: (collection: string) => string;
  editable: boolean;
  onClose: () => void;
  onSave: (values: Record<string, string>, text: string) => boolean;
}) {
  const { notify, tasks } = useOsStore();
  const [editing, setEditing] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [note, setNote] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const linkedTasks = tasks.filter((task) => task.workItem?.id === record.id && serviceForTask(task) === serviceId);
  const statusValue = def.statusKey ? record.values[def.statusKey] ?? "" : "";
  const pendingApproval = def.approval && statusValue === def.approval.pending;
  const workItem: TaskWorkItem = { collection: def.id, id: record.id, label: record.values[def.titleKey] || record.id };

  function save(values: Record<string, string>) {
    const text = describeChanges(def, record.values, values) || "Guardó sin cambios";
    if (onSave(values, text)) { setEditing(false); notify("Cambios guardados en este navegador", "success"); }
    else notify("No se pudo guardar en este navegador", "error");
  }

  function decide(approved: boolean) {
    if (!def.approval || !def.statusKey) return;
    const patch: Record<string, string> = { [def.statusKey]: approved ? def.approval.approved : def.approval.changes };
    if (!approved && note.trim() && def.fields.some((field) => field.key === "feedback")) patch.feedback = [note.trim(), record.values.feedback].filter(Boolean).join("\n");
    const ok = onSave(patch, approved ? `Aprobó (${def.approval.approved})` : `Pidió cambios${note.trim() ? `: ${note.trim()}` : ""}`);
    if (ok) { setNote(""); notify(approved ? "Aprobado · guardado en este navegador" : "Cambios pedidos · guardado en este navegador", "success"); }
  }

  return (
    <OSSidePanel
      label={`${def.singular}: ${record.values[def.titleKey] || record.id}`}
      onClose={onClose}
      titleRef={titleRef}
      heading={<span>{record.id} · {def.label}</span>}
      persistentFooter={editing}
      footer={editing ? <><button type="button" className={buttonClass("ghost")} onClick={() => setEditing(false)}>Cancelar</button><button type="submit" form={`${record.id}-edit`} className={buttonClass("primary")}>Guardar cambios</button></> : null}
    >
      <div className={m.detail}>
        <div className={m.detailHead}>
          <div>
            <h2 ref={titleRef} tabIndex={-1} style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>{record.values[def.titleKey] || record.id}</h2>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>{statusValue ? <StatusBadge status={statusValue} /> : null}<SourceTag source={record.source} /></div>
          </div>
          {editable && !editing ? <button type="button" className={buttonClass("secondary", true)} onClick={() => setEditing(true)}>Editar</button> : null}
        </div>
        {record.source === "demo" ? <p className={s.demoNote} style={{ margin: 0 }}>Registro de demostración: ficticio. Podés editarlo para probar el flujo; seguirá marcado como demo.</p> : null}

        {pendingApproval && editable ? (
          <div className={m.notice} role="status">
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <strong>Espera aprobación</strong>
              <label className={s.field}><span>Comentario (opcional)</span><textarea className={cx(s.input, s.inputSm)} rows={2} value={note} onChange={(event) => setNote(event.target.value)} /></label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className={buttonClass("secondary", true)} onClick={() => decide(false)}>Pedir cambios</button>
                <button type="button" className={buttonClass("primary", true)} onClick={() => decide(true)}>Aprobar</button>
              </div>
            </div>
          </div>
        ) : null}

        {editing ? (
          <RecordForm def={def} initial={record.values} refs={refs} titleKeyOf={titleKeyOf} formId={`${record.id}-edit`} onSubmit={save} excludeId={record.id} />
        ) : (
          <div className={m.detailGrid}>
            {def.fields.filter((field) => field.key !== def.titleKey).map((field) => (
              <div key={field.key} data-wide={field.type === "textarea" ? "true" : undefined}>
                <span>{field.label}</span>
                <p>{displayValue(field, record.values[field.key] ?? "", refs, titleKeyOf)}</p>
              </div>
            ))}
            <div><span>Cliente</span><p>{client.name}</p></div>
            <div><span>Última modificación</span><p>{formatDateTime(record.updatedAt)} · {record.user}</p></div>
          </div>
        )}

        {def.linkTasks ? (
          <section aria-label="Tareas vinculadas" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <p className={cx(s.rotulo, s.rotuloInk)}>Tareas vinculadas · {linkedTasks.length}</p>
              {editable ? <button type="button" className={buttonClass("ghost")} onClick={() => setTaskOpen(true)}>Nueva tarea vinculada</button> : null}
            </div>
            {linkedTasks.length ? (
              <div className={m.rows} style={{ border: "1px solid var(--av-border)" }}>
                {linkedTasks.map((task) => (
                  <div className={m.row} key={task.id}>
                    <div><Link className={m.rowLink} href={`${serviceHref(client.slug, serviceId)}?seccion=tareas&task=${task.id}`}>{task.id} · {task.title}</Link><small>{task.owner} · {task.status}</small></div>
                    <OSDue label={dueLabel(task)} kind={task.dueKind} status={task.status} />
                  </div>
                ))}
              </div>
            ) : <p className={s.cellSub} style={{ margin: 0 }}>Sin tareas vinculadas.</p>}
          </section>
        ) : null}

        <section aria-label="Historial" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p className={cx(s.rotulo, s.rotuloInk)}>Historial · {record.history.length}</p>
          <ul className={m.history}>{record.history.map((entry, index) => <li key={`${entry.at}-${index}`}>{entry.text} <span>· {entry.user} · {formatDateTime(entry.at)}</span></li>)}</ul>
        </section>
      </div>
      {taskOpen ? <NewTaskModal clientSlug={client.slug} serviceId={serviceId} workItems={[workItem]} workItemLabel={def.singular.charAt(0).toUpperCase() + def.singular.slice(1)} defaultWorkItemId={record.id} onClose={() => setTaskOpen(false)} /> : null}
    </OSSidePanel>
  );
}
