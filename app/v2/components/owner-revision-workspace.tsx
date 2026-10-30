"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Plus, RotateCcw } from "lucide-react";
import { avansClients } from "../agency-client-data";
import { calculateRevisionForecast, ownerRevisionTabs, revisionModules, type ForecastInputs, type RevisionArea, type RevisionModule, type RevisionRow } from "../owner-revision-data";
import s from "../owner-revision.module.css";

function DemoNotice() {
  return <p className={s.notice}><strong>Demo interactivo.</strong> Datos ficticios y cambios sólo en memoria durante esta visita. No hay guardado compartido, envíos ni integraciones. No ingreses datos personales, contratos reales o credenciales.</p>;
}

function ClientsWithinOperations() {
  return <div className={s.page}>
    <div className={s.heading}><span>OPERACIONES / CLIENTES</span><h1>Clientes vive dentro de Operaciones.</h1><p>La ficha 360°, el conocimiento, los documentos y el benchmark se conservan. Cambia la jerarquía, no la información ni los enlaces existentes.</p></div>
    <div className={s.clientGrid}>{avansClients.map(client => <Link key={client.slug} href={`/v2/clientes/${client.slug}`} className={s.clientCard}><small>CUENTA · DEMO</small><h2>{client.name}</h2><p>Contexto, servicios, proyectos y decisiones.</p><span>Abrir Cliente 360° <ArrowRight size={16}/></span></Link>)}</div>
    <div className={s.linkRow}><Link href="/v2/clientes">Portfolio de clientes <ArrowRight size={16}/></Link><Link href="/v2/benchmark">Benchmark y competencia <ArrowRight size={16}/></Link><Link href="/v2/rrhh#burbujas">Burbujas y equipos <ArrowRight size={16}/></Link></div>
    <p className={s.annotation}>Ventas, Finanzas y Gerencia siguen consultando las mismas cuentas. No se crean copias por área.</p>
  </div>;
}

function RevisionRecords({ config }: { config: RevisionModule }) {
  const [rows, setRows] = useState<RevisionRow[]>(() => config.rows.map(row => ({ ...row })));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<RevisionRow>({ id: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const visible = useMemo(() => rows.filter(row => (!status || row.status === status) && Object.values(row).join(" ").toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es"))), [rows, query, status]);
  const labels = Object.fromEntries(config.fields.map(field => [field.key, field.label]));

  function startEdit(row?: RevisionRow) {
    const empty: RevisionRow = { id: "" };
    config.fields.forEach(field => { empty[field.key] = field.type === "select" ? field.options?.[0] ?? "" : ""; });
    setDraft(row ? { ...row } : empty);
    setShowForm(true); setError(""); setNotice("");
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (config.fields.some(field => field.required && !draft[field.key]?.trim())) { setError("Completá los campos obligatorios."); return; }
    if (config.fields.some(field => field.type === "select" && draft[field.key] && !field.options?.includes(draft[field.key]))) { setError("Elegí una opción válida."); return; }
    if (Boolean(draft.absenceStart) !== Boolean(draft.absenceEnd)) { setError("Completá ambas fechas de la ausencia, o dejá las dos vacías."); return; }
    if (draft.absenceStart && draft.absenceEnd && draft.absenceStart > draft.absenceEnd) { setError("La fecha de fin no puede ser anterior a la de inicio."); return; }
    const clean: RevisionRow = { id: draft.id || `${config.id}-${crypto.randomUUID()}` };
    config.fields.forEach(field => { clean[field.key] = (draft[field.key] ?? "").trim(); });
    setRows(previous => draft.id ? previous.map(row => row.id === draft.id ? clean : row) : [...previous, clean]);
    setShowForm(false); setError(""); setNotice("Cambio aplicado sólo a la demo local. No se guardó en una base de datos.");
  }
  function reset() {
    setRows(config.rows.map(row => ({ ...row }))); setQuery(""); setStatus(""); setShowForm(false); setError(""); setNotice("Se restauraron los ejemplos; se descartaron los cambios locales de este módulo.");
  }

  return <div className={s.page}>
    <div className={s.heading}><span>REVISIÓN DEL SITEMAP · {config.id === "planificacion" ? "GERENCIA" : "RRHH"}</span><h1>{config.label}</h1><p>{config.description}</p></div>
    <DemoNotice/>
    <div className={s.toolbar}>
      <label>Buscar<input aria-label={`Buscar en ${config.label}`} value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre, equipo o referencia" maxLength={120}/></label>
      <label>Estado<select aria-label={`Filtrar estado de ${config.label}`} value={status} onChange={event => setStatus(event.target.value)}><option value="">Todos</option>{config.states.map(state => <option key={state}>{state}</option>)}</select></label>
      <button type="button" className={s.primary} onClick={() => startEdit()}><Plus size={16}/> {config.id === "talentos" ? "Completar formulario demo" : "Nuevo registro demo"}</button>
      <button type="button" className={s.secondary} onClick={reset} title="Descartar los cambios locales de este módulo"><RotateCcw size={16}/> Restablecer demo</button>
    </div>
    <p className={s.resultCount} aria-live="polite">{visible.length} de {rows.length} registros ficticios</p>
    {notice && <p role="status" className={s.notice}>{notice}</p>}
    {showForm && <form className={s.editor} onSubmit={save}>
      <h2>{draft.id ? "Editar registro demo" : "Nuevo registro demo"}</h2>
      <div className={s.fields}>{config.fields.map(field => <label key={field.key} htmlFor={`${config.id}-${field.key}`}>{field.label}{field.required ? " *" : ""}
        {field.type === "select" ? <select id={`${config.id}-${field.key}`} value={draft[field.key] ?? ""} required={field.required} onChange={event => setDraft(previous => ({ ...previous, [field.key]: event.target.value }))}>{field.options?.map(option => <option key={option}>{option}</option>)}</select> : <input id={`${config.id}-${field.key}`} type={field.type === "date" ? "date" : "text"} value={draft[field.key] ?? ""} required={field.required} maxLength={240} onChange={event => setDraft(previous => ({ ...previous, [field.key]: event.target.value }))}/>}
      </label>)}</div>
      {error && <p role="alert" className={s.error}>{error}</p>}
      <div className={s.actions}><button type="submit" className={s.primary}>Aplicar en esta demo</button><button type="button" className={s.secondary} onClick={() => { setShowForm(false); setError(""); }}>Cancelar</button></div>
    </form>}
    <div className={s.tableScroll} role="region" aria-label={`Registros de ${config.label}`} tabIndex={0}><table className={s.table}><caption>{config.label} · datos de ejemplo</caption><thead><tr>{config.columns.map(key => <th scope="col" key={key}>{labels[key] ?? key}</th>)}<th scope="col">Acción</th></tr></thead><tbody>{visible.map(row => <tr key={row.id}>{config.columns.map(key => <td key={key}>{key === "status" ? <span className={s.state}>{row[key]}</span> : row[key] || "Por definir"}</td>)}<td><button type="button" className={s.textButton} onClick={() => startEdit(row)}>Editar demo<span className={s.srOnly}>: {row.title}</span></button></td></tr>)}</tbody></table>{!visible.length && <p className={s.empty}>No hay registros para estos filtros. Cambiá la búsqueda o el estado.</p>}</div>
    <p className={s.annotation}>{config.note}</p>
    <div className={s.linkRow}>{config.id === "planificacion" ? <><Link href="/v2/operaciones">Ver ejecución <ArrowRight size={16}/></Link><Link href="/v2/finanzas#forecast">Revisar Forecast <ArrowRight size={16}/></Link></> : <><Link href="/v2/operaciones#clientes">Clientes en Operaciones <ArrowRight size={16}/></Link><Link href="/v2/usuarios">Usuarios y permisos <ArrowRight size={16}/></Link></>}</div>
  </div>;
}

const initialForecast: ForecastInputs = { invoiced: 1000000, collected: 700000, overdue: 120000, possible: 300000, probability: 50, costs: 500000 };
const forecastLabels: { key: keyof ForecastInputs; label: string }[] = [
  { key: "invoiced", label: "Facturado · ARS" }, { key: "collected", label: "Cobrado · ARS" }, { key: "overdue", label: "Vencido dentro del saldo · ARS" },
  { key: "possible", label: "Ventas adicionales posibles · ARS" }, { key: "probability", label: "Probabilidad del escenario · %" }, { key: "costs", label: "Costos directos previstos · ARS" },
];
function ForecastDemo() {
  const [input, setInput] = useState<ForecastInputs>({ ...initialForecast });
  const result = calculateRevisionForecast(input);
  const money = (value: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
  const valid = !("error" in result);
  return <div className={s.page}>
    <div className={s.heading}><span>FINANZAS / FORECAST</span><h1>Forecast</h1><p>Facturado, cobrado, saldo y deuda vencida. Un escenario editable para revisar la lectura financiera con Avans.</p></div>
    <DemoNotice/>
    <div className={s.metrics} aria-live="polite">{[
      ["Facturado", valid ? money(input.invoiced) : "—"], ["Cobrado", valid ? money(input.collected) : "—"],
      ["Saldo por cobrar", valid ? money(result.balance) : "—"], ["Deuda vencida", valid ? money(input.overdue) : "—"],
    ].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>Simulación · ARS</small></article>)}</div>
    <div className={s.editor}><h2>Supuestos del ejemplo</h2><p className={s.annotation}>Los importes son ficticios. No corresponden a ventas, contratos ni saldos de la agencia.</p>
      <div className={s.fields}>{forecastLabels.map(field => <label key={field.key} htmlFor={`forecast-${field.key}`}>{field.label}<input id={`forecast-${field.key}`} type="number" min="0" max={field.key === "probability" ? 100 : undefined} step={field.key === "probability" ? "1" : "0.01"} value={Number.isFinite(input[field.key]) ? input[field.key] : ""} onChange={event => setInput(previous => ({ ...previous, [field.key]: event.target.value === "" ? NaN : Number(event.target.value) }))}/></label>)}</div>
      <div className={s.actions}>{[{ label: "Conservador", value: 25 }, { label: "Base", value: 50 }, { label: "Expansivo", value: 75 }].map(scenario => <button type="button" className={s.secondary} key={scenario.label} aria-pressed={input.probability === scenario.value} onClick={() => setInput(previous => ({ ...previous, probability: scenario.value }))}>{scenario.label} · {scenario.value}%</button>)}<button type="button" className={s.textButton} onClick={() => setInput({ ...initialForecast })}>Restablecer supuestos</button></div>
      {!valid && <p role="alert" className={s.error}>{result.error}</p>}
    </div>
    <div className={s.editor}><h2>Proyección propuesta · a validar</h2><p>No es una previsión confirmada ni una estimación de caja. La revisión del cliente incorporó Forecast; esta fórmula simplificada se propone para discutir su alcance.</p>
      {valid && <dl className={s.calculation}><div><dt>Ventas adicionales ponderadas</dt><dd>{money(result.weighted)}</dd></div><div><dt>Facturación del escenario</dt><dd>{money(result.projected)}</dd></div><div><dt>Contribución estimada antes de estructura e impuestos</dt><dd>{money(result.contribution)}</dd></div></dl>}
      <p className={s.annotation}>Facturación del escenario = facturado + ventas posibles × probabilidad. Cobrado y deuda vencida no se suman nuevamente a ingresos. La deuda vencida es parte del saldo.</p>
    </div>
    <div className={s.linkRow}><Link href="/v2/ventas">Pipeline de Ventas <ArrowRight size={16}/></Link><Link href="/v2/gerencia#planificacion">Planificación <ArrowRight size={16}/></Link></div>
  </div>;
}

export function OwnerRevisionWorkspace({ area, children }: { area: RevisionArea; children: ReactNode }) {
  const tabs = ownerRevisionTabs[area];
  const [selected, setSelected] = useState("general");
  useEffect(() => {
    const sync = () => { const candidate = window.location.hash.slice(1); setSelected(tabs.some(tab => tab.id === candidate) ? candidate : "general"); };
    sync(); window.addEventListener("hashchange", sync); return () => window.removeEventListener("hashchange", sync);
  }, [tabs]);
  function activate(id: string) { setSelected(id); window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#${id}`); }
  return <div className={s.workspace}>
    <div className={s.tabsWrap}><span className={s.kicker}>ORGANIZACIÓN ACTUALIZADA · REVISIÓN AVANS</span>
      <div className={s.tabs} role="tablist" aria-label={`Secciones de ${area}`}>{tabs.map((tab, index) => <button key={tab.id} id={`${area}-tab-${tab.id}`} type="button" role="tab" aria-selected={selected === tab.id} aria-controls={`${area}-panel-${tab.id}`} tabIndex={selected === tab.id ? 0 : -1} onClick={() => activate(tab.id)} onKeyDown={event => {
        let next = index;
        if (event.key === "ArrowRight") next = (index + 1) % tabs.length; else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length; else if (event.key === "Home") next = 0; else if (event.key === "End") next = tabs.length - 1; else return;
        event.preventDefault(); activate(tabs[next].id); document.getElementById(`${area}-tab-${tabs[next].id}`)?.focus();
      }}>{tab.label}</button>)}</div>
      {area === "operaciones" && <p>Clientes y benchmark pertenecen a Operaciones. El contexto se comparte con las otras cuatro áreas.</p>}
    </div>
    {tabs.map(tab => <section key={tab.id} id={`${area}-panel-${tab.id}`} role="tabpanel" aria-labelledby={`${area}-tab-${tab.id}`} hidden={selected !== tab.id} tabIndex={0}>
      {tab.id === "general" ? children : tab.id === "clientes" ? <ClientsWithinOperations/> : tab.id === "forecast" ? <ForecastDemo/> : <RevisionRecords config={revisionModules[tab.id]}/>}
    </section>)}
  </div>;
}
