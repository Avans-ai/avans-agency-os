"use client";

/* Audiovisuales · espacio de trabajo de la Jornada audiovisual.
 * Resumen (cupo usado/disponible y etapas), tablero por etapa, alta breve, detalle con
 * la etapa actual, la tarea única y el historial, y archivo de objetos anteriores.
 * Todo se guarda en este navegador (vista previa local). */
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { canManageClient } from "../director-data";
import type { OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { OSSidePanel } from "../overlays";
import { previewActor } from "../preview-roles";
import { JORNADA_TYPES, providersForType } from "../providers-catalog";
import { useProviderCatalog } from "../providers-store";
import { ProviderAvatar, ProviderTypes } from "../providers-ui";
import { Badge, buttonClass } from "../ui";
import s from "../os.module.css";
import { CollectionView } from "./collection-view";
import { collectionDef } from "./collections";
import { AttentionPanel, NextActionsPanel, ScopePanel, sectionHref, TaskHealthStrip } from "./module-common";
import { formatDate, formatDateTime, Panel, StatusBadge } from "./module-ui";
import type { ModuleRecord } from "./types";
import {
  ACTION_LABELS, accountLead, CIERRE_STATES, daysUntil, EDITION_DAYS, editableFields, JORNADA_STAGES, jornadaActions, jornadaOwner, jornadaState, jornadaStep, jornadaTaskId,
  jornadaTransitions, safeUrl, visibleComments,
  type JornadaAction, type JornadaQuota, type JornadaRole, type JornadaVisibility, type QuotaUsage,
} from "./av-model";
import { AV_DEMO_LABEL } from "./av-demo";
import { jornadaRoleOf, useJornadaData, useJornadaOperations } from "./av-operations";
import a from "./av-jornadas.module.css";
import m from "./modules.module.css";

const AV = "audiovisuales" as const;
type Go = (section: string, extra?: Record<string, string>) => void;

/** Siembra una sola vez la tarea de cada jornada de demostración que no la tenga. */
function useJornadaDemoTasks(client: OsClient) {
  const store = useOsStore();
  const ops = useJornadaOperations(client);
  const done = useRef(false);
  const ready = store.localHydrated && store.servicesOf(client.slug).includes(AV);
  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    ops.seedDemoTasks();
  });
}

function useRoleContext(client: OsClient) {
  const { role } = useOsStore();
  const jornadaRole = jornadaRoleOf(role, client.slug);
  const actor = previewActor(role);
  const canQuota = role === "admin" || actor === accountLead(client) || (role === "pm" && canManageClient(role, client.slug));
  return { role, jornadaRole, actor, canQuota };
}

function useNow() {
  const [now] = useState(() => new Date().toISOString());
  return now;
}

/* ───────── Piezas visuales ───────── */
export function TypeTag({ tipo }: { tipo?: string }) {
  return <span className={a.type} data-type={tipo || "none"}>{tipo || "Sin tipo"}</span>;
}

function dueTone(days: number | null) {
  if (days === null) return undefined;
  return days < 0 ? "late" : days <= 1 ? "soon" : undefined;
}
function dueText(days: number | null, date: string) {
  if (days === null) return formatDate(date);
  if (days < 0) return `Vencida hace ${-days} ${-days === 1 ? "día" : "días"}`;
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  return `Vence ${formatDate(date)}`;
}

export function JornadaStepper({ state }: { state: ReturnType<typeof jornadaState> }) {
  const step = jornadaStep(state);
  const closed = state === "Cerrada";
  return (
    <div>
      <ol className={a.stepper} aria-label="Etapas de la jornada">
        {JORNADA_STAGES.map((stage) => {
          const status = state === "Cancelada" ? "todo" : closed || stage.step < step ? "done" : stage.step === step ? "current" : "todo";
          return (
            <li key={stage.step} data-status={status} aria-current={status === "current" ? "step" : undefined}>
              <b>{stage.step}</b><span>{stage.label}</span><small>{stage.who}</small>
              <span className={a.srOnly}>{status === "done" ? "completada" : status === "current" ? "etapa actual" : "pendiente"}</span>
            </li>
          );
        })}
      </ol>
      {step === 6 ? (
        <ol className={a.substeps} aria-label="Pasos del cierre">
          {CIERRE_STATES.slice(0, 3).map((item, index) => {
            const current = CIERRE_STATES.indexOf(state);
            return <li key={item} data-status={closed || index < current ? "done" : index === current ? "current" : "todo"}>{item}</li>;
          })}
        </ol>
      ) : null}
    </div>
  );
}

export function QuotaMeter({ client, quota, usage, canEdit }: { client: OsClient; quota: JornadaQuota; usage: QuotaUsage; canEdit: boolean }) {
  const ops = useJornadaOperations(client);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ contracted: String(quota.contracted || ""), period: quota.period, start: quota.start, end: quota.end });
  const cells = Array.from({ length: Math.max(usage.contracted, usage.used) }, (_, index) => index < usage.used ? "used" : index < usage.used + usage.pending ? "pending" : "free");
  function submit(event: FormEvent) {
    event.preventDefault();
    if (ops.saveQuota({ contracted: Number(draft.contracted), period: draft.period, start: draft.start, end: draft.end })) setEditing(false);
  }
  return (
    <Panel title="Cupo de jornadas" id="av-quota" description={quota.period ? `${quota.period} · alcance contratado${quota.source === "demo" ? ` · ${AV_DEMO_LABEL.toLowerCase()}` : ""}` : "Definí cuántas jornadas incluye el alcance contratado"}
      actions={canEdit ? <button type="button" className={buttonClass("ghost")} aria-expanded={editing} onClick={() => { setDraft({ contracted: String(quota.contracted || ""), period: quota.period, start: quota.start, end: quota.end }); setEditing((value) => !value); }}>{editing ? "Cancelar" : "Editar cupo"}</button> : null}>
      <section className={a.quota} aria-label="Jornadas usadas y disponibles">
        <div className={a.quotaNumber} data-empty={usage.defined && usage.available === 0}>
          <strong>{usage.defined ? usage.available : "—"}</strong>
          <span>{usage.defined ? `disponibles de ${usage.contracted}` : "sin cupo definido"}</span>
        </div>
        <div>
          {usage.defined ? <div className={a.meter} role="img" aria-label={`${usage.used} usadas, ${usage.pending} a validar, ${usage.available} disponibles de ${usage.contracted}`}>{cells.map((kind, index) => <i key={index} data-kind={kind} />)}</div> : <p className={a.muted}>Sin cupo cargado no se puede validar ninguna jornada.</p>}
          <div className={a.legend}><span data-kind="used">{usage.used} usadas</span><span data-kind="pending">{usage.pending} a validar</span><span>{usage.available} disponibles</span></div>
        </div>
      </section>
      {editing ? (
        <form className={a.quotaForm} onSubmit={submit} aria-label="Editar cupo de jornadas">
          <label className={a.field}><span>Jornadas contratadas por período</span><input type="number" min={0} max={99} required value={draft.contracted} onChange={(event) => setDraft({ ...draft, contracted: event.target.value })} /></label>
          <label className={a.field}><span>Período</span><input value={draft.period} required placeholder="Trimestre oct–dic 2026" onChange={(event) => setDraft({ ...draft, period: event.target.value })} /></label>
          <label className={a.field}><span>Desde</span><input type="date" value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} /></label>
          <label className={a.field}><span>Hasta</span><input type="date" value={draft.end} onChange={(event) => setDraft({ ...draft, end: event.target.value })} /></label>
          <button type="submit" className={buttonClass("primary", true)}>Guardar cupo</button>
        </form>
      ) : null}
    </Panel>
  );
}

export function JornadaCard({ record, onOpen, current, now }: { record: ModuleRecord; onOpen: (id: string) => void; current?: boolean; now: string }) {
  const state = jornadaState(record);
  const deadline = state === "Edición" ? record.values.fechaLimiteEdicion : "";
  const days = deadline ? daysUntil(deadline, now) : null;
  return (
    <button type="button" className={a.card} data-current={current || undefined} onClick={() => onOpen(record.id)} aria-label={`Abrir jornada ${record.values.titulo}`}>
      <span className={a.between}><TypeTag tipo={record.values.tipo} />{record.source === "demo" ? <span className={a.demoTag}>Demo</span> : null}</span>
      <strong>{record.values.titulo}</strong>
      <span className={a.cardMeta}><ProviderAvatar name={record.values.proveedor || "?"} size={20} /><span>{record.values.proveedor || "Sin proveedor"}</span></span>
      <span className={a.cardMeta}><span>Jornada {formatDate(record.values.fecha)}</span></span>
      {deadline ? <span className={a.due} data-tone={dueTone(days)}>Edición · {dueText(days, deadline)}</span> : null}
      {jornadaStep(state) === 6 && state !== "Cerrada" ? <span className={a.sub}>{state}</span> : null}
    </button>
  );
}

export function JornadaBoard({ records, onOpen, currentId, label = "Jornadas por etapa" }: { records: ModuleRecord[]; onOpen: (id: string) => void; currentId?: string | null; label?: string }) {
  const now = useNow();
  const cancelled = records.filter((record) => jornadaState(record) === "Cancelada");
  return (
    <>
      <div className={a.board} role="list" aria-label={label}>
        {JORNADA_STAGES.map((stage) => {
          const list = records.filter((record) => stage.states.includes(jornadaState(record))).sort((x, y) => (x.values.fecha || "").localeCompare(y.values.fecha || ""));
          return (
            <section key={stage.step} className={a.column} role="listitem" aria-label={`${stage.step} · ${stage.label}: ${list.length}`}>
              <header className={a.columnHead} data-step={stage.step}><div><h3>{stage.step} · {stage.label}</h3><small>{stage.who}</small></div><em>{list.length}</em></header>
              <div className={a.cards}>
                {list.length ? list.map((record) => <JornadaCard key={record.id} record={record} onOpen={onOpen} current={record.id === currentId} now={now} />) : <p className={a.empty}>Sin jornadas</p>}
              </div>
            </section>
          );
        })}
      </div>
      {cancelled.length ? <p className={a.boardFoot}>{cancelled.length} {cancelled.length === 1 ? "jornada cancelada" : "jornadas canceladas"} (no consumen cupo): {cancelled.map((record) => record.values.titulo).join(", ")}.</p> : null}
    </>
  );
}

/* ───────── Resumen ───────── */
export function AvSummary({ client, go }: { client: OsClient; go: Go }) {
  useJornadaDemoTasks(client);
  const { jornadas, quota, usage } = useJornadaData(client);
  const { canQuota } = useRoleContext(client);
  const now = useNow();
  const active = jornadas.filter((record) => !["Cerrada", "Cancelada"].includes(jornadaState(record)));
  const editions = jornadas.filter((record) => jornadaState(record) === "Edición");
  const lateEditions = editions.filter((record) => (daysUntil(record.values.fechaLimiteEdicion, now) ?? 1) < 0);
  const max = Math.max(1, ...JORNADA_STAGES.map((stage) => jornadas.filter((record) => stage.states.includes(jornadaState(record))).length));
  const open = (id: string) => go("jornadas", { jornada: id });
  return (
    <div className={m.stack}>
      <TaskHealthStrip client={client} serviceId={AV} extra={[
        { label: "Jornadas activas", value: active.length, href: sectionHref(client.slug, AV, "jornadas") },
        { label: "A validar", value: usage.pending, alert: usage.pending > 0 && usage.available < 1 },
        { label: "Ediciones en curso", value: editions.length, detail: lateEditions.length ? `${lateEditions.length} fuera de plazo` : `Plazo de ${EDITION_DAYS} días`, alert: lateEditions.length > 0 },
      ]} />
      <div className={a.summaryGrid}>
        <QuotaMeter key={`${quota.updatedAt}-${quota.contracted}`} client={client} quota={quota} usage={usage} canEdit={canQuota} />
        <Panel title="Jornada audiovisual" id="av-stages" description="Procedimiento del manual: cada etapa asigna la tarea y avisa al siguiente responsable" actions={<button type="button" className={buttonClass("secondary", true)} onClick={() => go("jornadas")}>Ver jornadas</button>}>
          <ul className={a.stageBars} aria-label="Cantidad de jornadas por etapa">
            {JORNADA_STAGES.map((stage) => {
              const count = jornadas.filter((record) => stage.states.includes(jornadaState(record))).length;
              return <li key={stage.step} data-step={stage.step}><span>{stage.step} · {stage.label}</span><i style={{ "--w": `${(count / max) * 100}%` } as CSSProperties} /><b>{count}</b></li>;
            })}
          </ul>
        </Panel>
      </div>
      <Panel title="Tablero de jornadas" id="av-board-summary" description={`${jornadas.length} jornadas · guardadas en este navegador`}>
        <JornadaBoard records={jornadas} onOpen={open} />
      </Panel>
      <div className={m.grid}>
        <NextActionsPanel client={client} serviceId={AV} />
        <aside className={m.stack}>
          <AttentionPanel client={client} serviceId={AV} />
          <ScopePanel client={client} serviceId={AV} />
        </aside>
      </div>
    </div>
  );
}

/* ───────── Jornadas: tablero + alta + detalle ───────── */
export function JornadasSection({ client, editable, selectedId, go }: { client: OsClient; editable: boolean; selectedId: string | null; go: Go }) {
  useJornadaDemoTasks(client);
  const { jornadas, quota, usage } = useJornadaData(client);
  const { providers } = useProviderCatalog();
  const { role, jornadaRole, canQuota } = useRoleContext(client);
  const [creating, setCreating] = useState(false);
  const [type, setType] = useState("");
  const [provider, setProvider] = useState("");
  const visible = jornadas.filter((record) => (!type || record.values.tipo === type) && (!provider || record.values.proveedorId === provider));
  const selected = jornadas.find((record) => record.id === selectedId);
  const canCreate = editable && ["admin", "pm", "content"].includes(jornadaRole || "");
  const usedProviders = Array.from(new Map(jornadas.map((record) => [record.values.proveedorId, record.values.proveedor])).entries()).filter(([id]) => id);
  return (
    <div className={m.stack}>
      <QuotaMeter key={`${quota.updatedAt}-${quota.contracted}`} client={client} quota={quota} usage={usage} canEdit={canQuota} />
      <Panel title="Jornadas" id="av-jornadas" description={`Tablero por etapa · ${AV_DEMO_LABEL.toLowerCase()} rotulados como «Demo» · guardado en este navegador`}
        actions={<>
          <Link className={buttonClass("secondary", true)} href={`/v2/portal/${client.slug}`}>Vista del cliente</Link>
          <Link className={buttonClass("secondary", true)} href="/v2/proveedores">Catálogo de proveedores</Link>
          <button type="button" className={buttonClass("primary", true)} disabled={!canCreate} title={canCreate ? undefined : "Las crea el Content o el PM de la cuenta"} onClick={() => setCreating(true)}>Nueva jornada</button>
        </>}>
        <div className={a.toolbar}>
          <label className={a.field}><span>Tipo</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="">Todos los tipos</option>{JORNADA_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className={a.field}><span>Proveedor</span><select value={provider} onChange={(event) => setProvider(event.target.value)}><option value="">Todos los proveedores</option>{usedProviders.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <p className={`${a.note} ${a.grow}`}>Rol de vista previa: {role === "admin" ? "Administrador" : jornadaRole ? jornadaRole : "solo lectura"}. Los permisos son visuales: todavía no se aplican en servidor.</p>
        </div>
        <JornadaBoard records={visible} onOpen={(id) => go("jornadas", { jornada: id })} currentId={selectedId} />
      </Panel>
      {creating ? <CreateJornadaPanel client={client} usage={usage} providers={providers} onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); go("jornadas", { jornada: id }); }} /> : null}
      {selected ? <JornadaDetail key={`${selected.id}-${selected.updatedAt}`} client={client} record={selected} usage={usage} onClose={() => go("jornadas")} /> : null}
    </div>
  );
}

function CreateJornadaPanel({ client, usage, providers, onClose, onCreated }: { client: OsClient; usage: QuotaUsage; providers: ReturnType<typeof useProviderCatalog>["providers"]; onClose: () => void; onCreated: (id: string) => void }) {
  const ops = useJornadaOperations(client);
  const [values, setValues] = useState({ titulo: "", tipo: "", proveedorId: "", fecha: "", drive: "", brief: "" });
  const [error, setError] = useState("");
  const options = providersForType(providers, values.tipo);
  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const provider = providers.find((item) => item.id === values.proveedorId && item.activo);
    if (!values.tipo) return setError("Elegí el tipo de jornada.");
    if (!provider) return setError("Elegí un proveedor del catálogo.");
    const created = ops.create({ ...values, proveedor: provider.nombre });
    if (created) onCreated(created.id);
  }
  return (
    <OSSidePanel label="Nueva jornada" heading={<div className={a.detailHead}><span className={s.rotulo}>Audiovisuales · {client.name}</span><h2>Nueva jornada</h2></div>} wide onClose={onClose} persistentFooter
      footer={<div className={a.actions}><button type="submit" form="av-create" className={buttonClass("primary")}>Crear jornada</button><button type="button" className={buttonClass("ghost")} onClick={onClose}>Cancelar</button></div>}>
      <form id="av-create" className={a.detail} onSubmit={submit} noValidate>
        <p className={a.callout} data-tone={usage.available < 1 ? "error" : "info"}>{usage.defined ? `Quedan ${usage.available} de ${usage.contracted} jornadas en el cupo. El PM la valida en la etapa 1.` : "La cuenta todavía no tiene cupo de jornadas: el PM no va a poder validarla hasta cargarlo."}</p>
        <fieldset className={a.fieldset}>
          <legend>Tipo de jornada</legend>
          <div className={a.segmented}>{JORNADA_TYPES.map((tipo) => <label key={tipo}><input type="radio" name="tipo" value={tipo} checked={values.tipo === tipo} onChange={() => setValues({ ...values, tipo })} />{tipo}</label>)}</div>
        </fieldset>
        <fieldset className={a.fieldset}>
          <legend>Proveedor (catálogo de Personas y Cultura)</legend>
          {options.length ? (
            <div className={a.pickList}>
              {options.map((item) => (
                <label key={item.id} className={a.pick}>
                  <input type="radio" name="proveedor" value={item.id} checked={values.proveedorId === item.id} onChange={() => setValues({ ...values, proveedorId: item.id })} />
                  <ProviderAvatar name={item.nombre} foto={item.foto} size={36} />
                  <span><strong>{item.nombre}</strong><small>{item.tipos.join(" · ")}</small>{values.tipo && item.tipos.includes(values.tipo as typeof item.tipos[number]) ? <span className={a.recommended}>Recomendado para {values.tipo}</span> : null}</span>
                </label>
              ))}
            </div>
          ) : <p className={a.callout} data-tone="error">El catálogo no tiene proveedores activos. Pedile a Personas y Cultura que los cargue.</p>}
          <Link className={a.textLink} href="/v2/proveedores">Ver fichas en el catálogo de proveedores</Link>
        </fieldset>
        <div className={a.fields}>
          <label className={a.field}><span>Fecha de la jornada</span><input type="date" required value={values.fecha} onChange={(event) => setValues({ ...values, fecha: event.target.value })} /></label>
          <label className={a.field}><span>Nombre (opcional)</span><input value={values.titulo} placeholder="Ej.: Testimonios de alumnos" onChange={(event) => setValues({ ...values, titulo: event.target.value })} /></label>
          <label className={`${a.field} ${a.wide}`}><span>Carpeta de Google Drive</span><input type="url" inputMode="url" required placeholder="https://drive.google.com/drive/folders/…" value={values.drive} onChange={(event) => setValues({ ...values, drive: event.target.value })} /><small>Google Drive no está conectado: pegá el enlace de la carpeta. El OS guarda solo el enlace; no la crea ni revisa su contenido.</small></label>
          <label className={`${a.field} ${a.wide}`}><span>Brief (opcional)</span><textarea rows={3} value={values.brief} placeholder="Qué se quiere lograr, piezas esperadas, protagonistas" onChange={(event) => setValues({ ...values, brief: event.target.value })} /></label>
        </div>
        {error ? <p className={a.error} role="alert">{error}</p> : null}
      </form>
    </OSSidePanel>
  );
}

const FIELD_LABELS: Record<string, { label: string; kind?: "date" | "textarea" | "url" | "provider"; hint?: string }> = {
  fecha: { label: "Fecha", kind: "date" }, horario: { label: "Horario" }, locacion: { label: "Locación" }, agendaNota: { label: "Nota de coordinación", kind: "textarea", hint: "Con quién se confirmó la fecha (cliente y proveedor)." },
  drive: { label: "Carpeta de Google Drive", kind: "url", hint: "Sin conexión con Drive: el OS guarda solo el enlace." }, brief: { label: "Brief", kind: "textarea" }, proveedorId: { label: "Proveedor", kind: "provider" },
  guion: { label: "Guion", kind: "textarea" }, guionUrl: { label: "Enlace al guion (opcional)", kind: "url" },
  planRodaje: { label: "Plan de rodaje", kind: "textarea", hint: "Lo prepara el proveedor antes de filmar." }, materialNota: { label: "Nota sobre el material crudo", kind: "textarea" },
  edicionUrl: { label: "Enlace a la edición (opcional)", kind: "url" }, edicionNota: { label: "Nota de la edición", kind: "textarea" },
  finalUrl: { label: "Enlace a la versión final con subtítulos y motion", kind: "url" },
};

export function StageFields({ fields, values, onChange, providers }: { fields: string[]; values: Record<string, string>; onChange: (key: string, value: string) => void; providers?: ReturnType<typeof useProviderCatalog>["providers"] }) {
  if (!fields.length) return null;
  return (
    <div className={a.fields}>
      {fields.map((key) => {
        const def = FIELD_LABELS[key] ?? { label: key };
        const wide = def.kind === "textarea" || def.kind === "url";
        return (
          <label key={key} className={`${a.field} ${wide ? a.wide : ""}`}>
            <span>{def.label}</span>
            {def.kind === "textarea" ? <textarea rows={3} value={values[key] || ""} onChange={(event) => onChange(key, event.target.value)} />
              : def.kind === "provider" ? <select value={values[key] || ""} onChange={(event) => onChange(key, event.target.value)}>{(providers || []).filter((item) => item.activo || item.id === values[key]).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>
                : <input type={def.kind === "date" ? "date" : def.kind === "url" ? "url" : "text"} value={values[key] || ""} onChange={(event) => onChange(key, event.target.value)} />}
            {def.hint ? <small>{def.hint}</small> : null}
          </label>
        );
      })}
    </div>
  );
}

function Fact({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return <div className={wide ? a.wide : undefined}><dt>{label}</dt><dd>{children}</dd></div>;
}
export function DriveLink({ url }: { url?: string }) {
  const safe = safeUrl(url);
  return safe ? <><a className={a.textLink} href={safe} target="_blank" rel="noreferrer">Abrir carpeta de Drive</a> <span className={a.note}>(Drive sin conexión: solo enlace)</span></> : <span className={a.note}>Sin carpeta cargada</span>;
}

function JornadaDetail({ client, record, usage, onClose }: { client: OsClient; record: ModuleRecord; usage: QuotaUsage; onClose: () => void }) {
  const ops = useJornadaOperations(client);
  const { providers } = useProviderCatalog();
  const { jornadaRole, actor } = useRoleContext(client);
  const { tasks } = useOsStore();
  const now = useNow();
  const state = jornadaState(record);
  const role: JornadaRole | null = jornadaRole;
  const ctx = role ? { role, actor, client } : null;
  const actions = ctx ? jornadaActions(record, ctx) : [];
  const fields = ctx ? editableFields(record, ctx) : [];
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((key) => [key, record.values[key] || ""])));
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  const [visibility, setVisibility] = useState<JornadaVisibility>("internal");
  const owner = jornadaOwner(client, record, state);
  const taskId = jornadaTaskId(client.slug, record);
  const task = tasks.find((item) => item.id === taskId);
  const provider = providers.find((item) => item.id === record.values.proveedorId);
  const deadline = record.values.fechaLimiteEdicion;
  const deadlineDays = deadline ? daysUntil(deadline, now) : null;
  const dirty = fields.some((key) => (draft[key] || "") !== (record.values[key] || ""));
  const needsNote = (action: JornadaAction) => action === "request-edit-changes" || action === "client-changes";
  const stageInfo = JORNADA_STAGES.find((stage) => stage.states.includes(state));
  function act(action: JornadaAction) {
    const patch = Object.fromEntries(fields.map((key) => [key, draft[key] || ""]));
    ops.transition(record, action, { patch, comment: note });
  }
  function save() {
    ops.saveFields(record, Object.fromEntries(fields.map((key) => [key, draft[key] || ""])), providers);
  }
  function sendComment(event: FormEvent) {
    event.preventDefault();
    if (ops.comment(record, comment, visibility)) setComment("");
  }
  const waiting = state === "Rodaje" || state === "Edición" ? `Le toca a ${record.values.proveedor}: lo marca desde su espacio de proveedor.` : state === "Aprobación del cliente" ? "Esperando la aprobación del cliente en su portal." : state === "Subtítulos y motion" && !actions.length ? `Le toca a ${owner} (Diseño): suma subtítulos y motion y entrega el enlace final.` : "";
  return (
    <OSSidePanel label={`Jornada: ${record.values.titulo}`} wide onClose={onClose}
      heading={<div className={a.detailHead}><span className={s.rotulo}>Jornada audiovisual · {client.name}</span><h2>{record.values.titulo}</h2><div className={a.row}><TypeTag tipo={record.values.tipo} /><StatusBadge status={state} />{record.source === "demo" ? <span className={a.demoTag}>{AV_DEMO_LABEL}</span> : null}</div></div>}>
      <div className={a.detail}>
        <JornadaStepper state={state} />
        <div className={a.now} aria-label="Responsable actual">
          <ProviderAvatar name={owner} size={36} />
          <div><small>Etapa {jornadaStep(state) || "—"} · {state}</small><strong>{owner}</strong></div>
          <div>{task ? <Link href={sectionHref(client.slug, AV, "tareas", `&task=${encodeURIComponent(task.id)}`)}>Tarea {task.id}</Link> : <span className={a.note}>Tarea pendiente de crear</span>}</div>
        </div>
        <dl className={a.facts}>
          <Fact label="Proveedor"><span className={a.row}><ProviderAvatar name={record.values.proveedor || "?"} foto={provider?.foto} size={22} />{record.values.proveedor || "Sin proveedor"}</span>{provider ? <ProviderTypes provider={provider} /> : null}</Fact>
          <Fact label="Fecha">{formatDate(record.values.fecha)}{record.values.horario ? ` · ${record.values.horario}` : ""}{record.values.locacion ? ` · ${record.values.locacion}` : ""}</Fact>
          <Fact label="Carpeta de Google Drive" wide><DriveLink url={record.values.drive} /></Fact>
          {deadline ? <Fact label={`Plazo de edición (${EDITION_DAYS} días)`}><span className={a.due} data-tone={state === "Edición" ? dueTone(deadlineDays) : undefined}>{state === "Edición" ? dueText(deadlineDays, deadline) : formatDate(deadline)}</span></Fact> : null}
          {record.values.edicionVersion ? <Fact label="Edición">{record.values.edicionVersion} · {formatDateTime(record.values.edicionSubidaAt)}{safeUrl(record.values.edicionUrl) ? <> · <a className={a.textLink} href={safeUrl(record.values.edicionUrl)} target="_blank" rel="noreferrer">abrir</a></> : null}</Fact> : null}
          {record.values.materialSubidoAt ? <Fact label="Material crudo">Subido {formatDateTime(record.values.materialSubidoAt)}</Fact> : null}
          {record.values.validadaAt ? <Fact label="Cupo">Validada por {record.values.validadaPor} · {formatDateTime(record.values.validadaAt)}</Fact> : null}
          {jornadaStep(state) === 6 ? <Fact label="Diseño (subtítulos y motion)"><Link className={a.textLink} href={`/v2/clientes/${client.slug}/diseno-marca?seccion=trabajos`}>Pedido DIS-{record.id}</Link></Fact> : null}
          {safeUrl(record.values.finalUrl) ? <Fact label="Versión final" wide><a className={a.textLink} href={safeUrl(record.values.finalUrl)} target="_blank" rel="noreferrer">{record.values.finalUrl}</a></Fact> : null}
          {record.values.brief && !fields.includes("brief") ? <Fact label="Brief" wide>{record.values.brief}</Fact> : null}
          {record.values.guion && !fields.includes("guion") ? <Fact label="Guion" wide>{record.values.guion}</Fact> : null}
          {record.values.planRodaje && !fields.includes("planRodaje") ? <Fact label="Plan de rodaje" wide>{record.values.planRodaje}</Fact> : null}
        </dl>

        <section className={a.work} aria-label="Etapa actual">
          <h3>{state === "Cerrada" ? "Jornada cerrada" : state === "Cancelada" ? "Jornada cancelada" : `Ahora · ${stageInfo?.label ?? state}`}</h3>
          {stageInfo && state !== "Cerrada" && state !== "Cancelada" ? <p className={a.muted}>{stageInfo.detail}</p> : null}
          {state === "Validación" ? <p className={a.callout} data-tone={usage.available < 1 ? "error" : "info"} role={usage.available < 1 ? "alert" : undefined}>{!usage.defined ? "La cuenta no tiene cupo cargado: definí las jornadas contratadas para poder validar." : usage.available < 1 ? `No quedan jornadas disponibles: ${usage.used} usadas de ${usage.contracted}. Ampliá el alcance o reprogramá la jornada.` : `Jornadas usadas: ${usage.used} de ${usage.contracted}. Al confirmar quedan ${usage.available - 1} disponibles.`}</p> : null}
          {waiting ? <p className={a.callout}>{waiting}</p> : null}
          {state === "Cerrada" ? <p className={a.callout} data-tone="info">El cliente aprobó la jornada {formatDateTime(record.values.clienteAprobadaAt)}. La entrega quedó registrada en «Guiones y entregas».</p> : null}
          {state === "Validación" && fields.length ? (
            <details className={a.more}><summary>Editar datos de la jornada</summary><StageFields fields={fields} values={draft} providers={providers} onChange={(key, value) => setDraft({ ...draft, [key]: value })} /></details>
          ) : <StageFields fields={fields} values={draft} providers={providers} onChange={(key, value) => setDraft({ ...draft, [key]: value })} />}
          {actions.some(needsNote) || actions.includes("cancel") ? <label className={a.field}><span>Comentario para la acción {actions.some(needsNote) ? "(obligatorio para pedir ajustes)" : "(opcional)"}</span><textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} /></label> : null}
          {actions.length || fields.length ? (
            <div className={a.actions}>
              {actions.filter((action) => action !== "cancel").map((action, index) => (
                <button key={action} type="button" className={buttonClass(index === 0 && !needsNote(action) ? "primary" : "secondary", true)} disabled={action === "validate" && usage.available < 1} onClick={() => act(action)}>{ACTION_LABELS[action]}</button>
              ))}
              {fields.length ? <button type="button" className={buttonClass("secondary", true)} disabled={!dirty} onClick={save}>Guardar cambios</button> : null}
              {actions.includes("cancel") ? <button type="button" className={buttonClass("ghost")} onClick={() => act("cancel")}>{ACTION_LABELS.cancel}</button> : null}
            </div>
          ) : !waiting && state !== "Cerrada" && state !== "Cancelada" ? <p className={a.note}>Tu rol de vista previa puede consultar esta etapa, pero la avanza {owner}.</p> : null}
          {state === "Aprobación del cliente" ? <Link className={a.textLink} href={`/v2/portal/${client.slug}?jornada=${encodeURIComponent(record.id)}`}>Abrir vista del cliente</Link> : null}
          {state === "Rodaje" || state === "Edición" ? <Link className={a.textLink} href={`/v2/proveedor?jornada=${encodeURIComponent(record.id)}`}>Abrir espacio del proveedor (vista previa)</Link> : null}
        </section>

        <section className={a.section} aria-label="Comentarios">
          <h3>Comentarios</h3>
          {visibleComments(record, "team").length ? <ul className={a.comments}>{visibleComments(record, "team").map((item) => <li key={item.id}><span className={a.row}><strong>{item.actor}</strong><span className={a.visibility} data-v={item.visibility}>{item.visibility === "internal" ? "Interno" : item.visibility === "provider" ? "Con el proveedor" : "Con el cliente"}</span><small>{formatDateTime(item.at)} · {item.stage}</small></span><p>{item.text}</p></li>)}</ul> : <p className={a.note}>Todavía no hay comentarios.</p>}
          {role ? (
            <form className={a.commentForm} onSubmit={sendComment}>
              <label className={a.field}><span>Nuevo comentario</span><textarea rows={2} value={comment} onChange={(event) => setComment(event.target.value)} /></label>
              <label className={a.field}><span>Quién lo ve</span><select value={visibility} onChange={(event) => setVisibility(event.target.value as JornadaVisibility)}><option value="internal">Solo el equipo (interno)</option><option value="provider">Equipo y proveedor</option><option value="client">Equipo y cliente</option></select></label>
              <button type="submit" className={buttonClass("secondary", true)}>Comentar</button>
            </form>
          ) : null}
        </section>

        <section className={a.section} aria-label="Historial de etapas">
          <h3>Historial</h3>
          <ol className={a.timeline}>
            {[...jornadaTransitions(record)].reverse().map((entry) => <li key={entry.id}><span><strong>{entry.from} → {entry.to}</strong><small>{entry.actor} · {formatDateTime(entry.at)} · responsable {entry.responsible}{entry.comment ? ` · «${entry.comment}»` : ""}</small></span></li>)}
            <li><span><strong>Creada</strong><small>{record.values.creadaPor || record.user} · {formatDateTime(record.createdAt)}</small></span></li>
          </ol>
        </section>
      </div>
    </OSSidePanel>
  );
}

/* ───────── Archivo: objetos anteriores, legibles y editables ───────── */
const ARCHIVE = [
  { id: "producciones", label: "Producciones" },
  { id: "guiones", label: "Guiones" },
  { id: "rodajes", label: "Rodajes anteriores" },
  { id: "versiones", label: "Versiones" },
  { id: "entregas", label: "Entregas" },
];
export function AvArchiveSection({ client, editable }: { client: OsClient; editable: boolean }) {
  const [tab, setTab] = useState("producciones");
  const def = collectionDef(AV, tab);
  return (
    <div className={m.stack}>
      <Panel title="Guiones y entregas" id="av-archive" description="Objetos audiovisuales anteriores a la jornada: siguen guardados y editables. Las entregas aprobadas por el cliente desde una jornada se registran acá.">
        <div className={a.tabs} role="group" aria-label="Objetos de Audiovisuales">
          {ARCHIVE.map((item) => <button key={item.id} type="button" aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}
        </div>
        <div className={m.panelBody}><Badge tone="stone">Secundario · guardado en este navegador</Badge></div>
      </Panel>
      {def ? <CollectionView key={tab} client={client} serviceId={AV} def={def} editable={editable} /> : null}
    </div>
  );
}
