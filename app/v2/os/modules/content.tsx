"use client";

/* Contenidos: calendario editorial, ejes, ideas, piezas (brief, copy, formato,
 * canal, versión, feedback), aprobaciones, resultados y aprendizajes. */
import { useMemo, useState } from "react";
import type { OsClient } from "../os-data";
import { useOsStore } from "../os-store";
import { OSModal } from "../overlays";
import { buttonClass } from "../ui";
import s from "../os.module.css";
import { BarChart } from "../reports/charts";
import { ContentReportView } from "../reports/report-views";
import { useContentReport } from "../reports/use-report-data";
import { AssistedCreatePanel } from "../assistant/assisted-create";
import { assistantProfile } from "../assistant/profiles";
import { CollectionView, RecordForm, RecordPanel } from "./collection-view";
import { collectionDef, PIECE_STATUSES } from "./collections";
import { AttentionPanel, ApprovalsPanel, DocsPanel, NextActionsPanel, ScopePanel, TaskHealthStrip } from "./module-common";
import { Panel, StatusBadge } from "./module-ui";
import { StagePipeline } from "./stage-pipeline";
import { useModuleRecords } from "./store";
import type { ModuleRecord } from "./types";
import m from "./modules.module.css";

const SERVICE = "contenidos" as const;
const piecesDef = collectionDef(SERVICE, "piezas")!;
const profile = assistantProfile(SERVICE, "piezas");
const axesDef = collectionDef(SERVICE, "ejes")!;
const ideasDef = collectionDef(SERVICE, "ideas")!;
const learningsDef = collectionDef(SERVICE, "aprendizajes")!;
const PIECE_REFS = ["piezas", "ejes"];
const titleKeyOf = (collection: string) => (collection === "piezas" ? "titulo" : "nombre");

export function ContentSummary({ client, go }: { client: OsClient; go: (section: string, extra?: Record<string, string>) => void }) {
  const { data } = useModuleRecords(client.slug, SERVICE, ["piezas", "ideas", "ejes"]);
  const pieces = data.piezas ?? [];
  const channels = Array.from(new Set(pieces.map((piece) => piece.values.canal).filter(Boolean)));
  return (
    <div className={m.stack}>
      <TaskHealthStrip client={client} serviceId={SERVICE} extra={[
        { label: "Piezas en calendario", value: pieces.length, detail: `${pieces.filter((piece) => piece.values.estado === "Publicada").length} publicadas` },
        { label: "Para aprobar", value: pieces.filter((piece) => piece.values.estado === "En aprobación").length, alert: pieces.some((piece) => piece.values.estado === "En aprobación") },
        { label: "Ideas nuevas", value: (data.ideas ?? []).filter((idea) => idea.values.estado === "Nueva" || idea.values.estado === "En evaluación").length },
      ]} />
      <Panel title="Producción editorial" id="content-pipeline" description="Piezas por estado, de la idea a la publicación" actions={<button type="button" className={buttonClass("secondary", true)} onClick={() => go("calendario")}>Abrir calendario</button>}>
        <div className={m.panelBody}><StagePipeline label="Piezas por estado" stages={PIECE_STATUSES} records={pieces} stageKey="estado" titleKey="titulo" onOpen={() => go("piezas")} /></div>
      </Panel>
      <div className={m.grid}>
        <div className={m.stack}>
          <NextActionsPanel client={client} serviceId={SERVICE} />
          <ApprovalsPanel client={client} serviceId={SERVICE} />
        </div>
        <aside className={m.stack}>
          <Panel title="Ejes y canales" id="content-axes-summary" actions={<button type="button" className={buttonClass("ghost")} onClick={() => go("ejes")}>Ver ejes</button>}>
            <div className={m.rows}>
              {(data.ejes ?? []).map((axis) => <div className={m.row} key={axis.id}><div><strong>{axis.values.nombre}</strong><small>{axis.values.perfil} · {axis.values.participacion || "—"} %</small></div><StatusBadge status={axis.values.estado ?? ""} /></div>)}
              <div className={m.row}><div><strong>Canales</strong><small>{channels.join(" · ") || "Sin canales en el calendario"}</small></div></div>
            </div>
          </Panel>
          <AttentionPanel client={client} serviceId={SERVICE} />
          <ScopePanel client={client} serviceId={SERVICE} />
          <DocsPanel client={client} />
        </aside>
      </div>
    </div>
  );
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
function iso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function startOfWeek(date: Date) {
  const result = new Date(date);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

/** Referencia fija de la demo para que servidor y navegador rendericen el mismo mes. */
const REFERENCE = new Date(2026, 10, 9);

export function CalendarSection({ client, editable }: { client: OsClient; editable: boolean }) {
  const { notify } = useOsStore();
  const { data, create, update } = useModuleRecords(client.slug, SERVICE, PIECE_REFS);
  const pieces = data.piezas ?? [];
  const [mode, setMode] = useState<"mes" | "semana">("mes");
  const [anchor, setAnchor] = useState(REFERENCE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [channel, setChannel] = useState("todos");
  const open = pieces.find((piece) => piece.id === openId);
  const channels = Array.from(new Set(pieces.map((piece) => piece.values.canal).filter(Boolean)));
  const filtered = pieces.filter((piece) => channel === "todos" || piece.values.canal === channel);
  const byDate = useMemo(() => {
    const map = new Map<string, ModuleRecord[]>();
    for (const piece of filtered) {
      const key = (piece.values.fecha ?? "").slice(0, 10);
      if (!key) continue;
      map.set(key, [...(map.get(key) ?? []), piece]);
    }
    return map;
  }, [filtered]);

  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(monthStart);
  const days = mode === "mes"
    ? Array.from({ length: 42 }, (_, index) => { const day = new Date(gridStart); day.setDate(gridStart.getDate() + index); return day; })
    : Array.from({ length: 7 }, (_, index) => { const day = startOfWeek(anchor); day.setDate(day.getDate() + index); return day; });
  const visibleDays = mode === "mes" && days.slice(35).every((day) => day.getMonth() !== anchor.getMonth()) ? days.slice(0, 35) : days;
  const title = mode === "mes"
    ? monthStart.toLocaleDateString("es-AR", { month: "long", year: "numeric" }).replace(/^./, (letter) => letter.toUpperCase())
    : `Semana del ${days[0].toLocaleDateString("es-AR", { day: "numeric", month: "short" })} al ${days[6].toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`;
  const undated = filtered.filter((piece) => !piece.values.fecha);

  function shift(direction: number) {
    const next = new Date(anchor);
    if (mode === "mes") next.setMonth(next.getMonth() + direction, 1);
    else next.setDate(next.getDate() + direction * 7);
    setAnchor(next);
  }

  function item(piece: ModuleRecord) {
    return <button type="button" key={piece.id} className={m.calItem} data-state={piece.values.estado} onClick={() => setOpenId(piece.id)} title={`${piece.values.titulo} · ${piece.values.canal} · ${piece.values.estado}`}>{piece.values.titulo}<span className={s.srOnly}> · {piece.values.canal} · {piece.values.estado}</span></button>;
  }

  return (
    <div className={m.stack}>
      <Panel title="Calendario editorial" id="content-calendar" description="Piezas por fecha de publicación. Clic en una pieza para ver brief, copy, versión, feedback y aprobación." actions={<button type="button" className={buttonClass("primary", true)} disabled={!editable} onClick={() => setCreating(iso(anchor))}>Nueva pieza</button>}>
        <div className={m.toolbar}>
          <div className={m.calTools} style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button type="button" className={buttonClass("secondary", true)} onClick={() => shift(-1)} aria-label={mode === "mes" ? "Mes anterior" : "Semana anterior"}>‹</button>
              <h3 aria-live="polite">{title}</h3>
              <button type="button" className={buttonClass("secondary", true)} onClick={() => shift(1)} aria-label={mode === "mes" ? "Mes siguiente" : "Semana siguiente"}>›</button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <label className={m.filter} style={{ minWidth: 150 }}><span>Canal</span><select value={channel} onChange={(event) => setChannel(event.target.value)}><option value="todos">Todos</option>{channels.map((item) => <option key={item}>{item}</option>)}</select></label>
              <div className={s.segmented} role="group" aria-label="Vista del calendario">
                <button type="button" aria-pressed={mode === "mes"} onClick={() => setMode("mes")}>Mes</button>
                <button type="button" aria-pressed={mode === "semana"} onClick={() => setMode("semana")}>Semana</button>
              </div>
            </div>
          </div>
        </div>
        <div className={m.panelBody}>
          {mode === "mes" ? (
            <div className={m.calendar} role="grid" aria-label={`Calendario editorial · ${title}`}>
              {WEEKDAYS.map((day) => <div className={m.calHead} key={day} role="columnheader">{day}</div>)}
              {visibleDays.map((day) => {
                const items = byDate.get(iso(day)) ?? [];
                const outside = day.getMonth() !== anchor.getMonth();
                return (
                  <div className={m.calDay} key={iso(day)} data-outside={outside} data-empty={!items.length} role="gridcell" aria-label={`${day.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}: ${items.length} piezas`}>
                    <span className={m.calNum}>{day.getDate()}<span className={s.srOnly}> {day.toLocaleDateString("es-AR", { month: "long" })}</span></span>
                    {items.map(item)}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={m.week} style={{ border: "1px solid var(--av-border)" }}>
              {days.map((day) => {
                const items = byDate.get(iso(day)) ?? [];
                return <div className={m.weekDay} key={iso(day)}><strong>{day.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" })}</strong><div>{items.length ? items.map(item) : <span className={s.cellSub}>Sin publicaciones</span>}</div></div>;
              })}
            </div>
          )}
          {undated.length ? <p className={s.demoNote} style={{ margin: 0 }}>{undated.length} piezas sin fecha no aparecen en el calendario.</p> : null}
          <p className={s.demoNote} style={{ margin: 0 }}>Borde grafito: publicada · coral: espera aprobación o tiene cambios pedidos · teal: en curso. Guardado en este navegador.</p>
        </div>
      </Panel>
      {open ? <RecordPanel key={open.id} client={client} serviceId={SERVICE} def={piecesDef} record={open} refs={data} titleKeyOf={titleKeyOf} editable={editable} onClose={() => setOpenId(null)} onSave={(values, text) => update("piezas", open.id, values, text)} /> : null}
      {creating && editable && profile ? (
        <AssistedCreatePanel
          client={client}
          serviceId={SERVICE}
          def={piecesDef}
          profile={profile}
          refs={data}
          titleKeyOf={titleKeyOf}
          initial={{ fecha: creating }}
          onCreate={(values, note) => {
            const record = create(piecesDef, values, note);
            if (record) { setCreating(null); notify("Pieza agregada al calendario · guardado en este navegador", "success"); }
            else notify("No se pudo guardar en este navegador", "error");
            return record;
          }}
          onClose={() => setCreating(null)}
          existingHref={(id) => `${window.location.pathname}?seccion=piezas&registro=${id}`}
        />
      ) : creating ? (
        <OSModal title="Nueva pieza" titleId="calendar-new-title" onClose={() => setCreating(null)} footer={<><button type="button" className={buttonClass("ghost")} onClick={() => setCreating(null)}>Cancelar</button><button type="submit" form="calendar-new-form" className={buttonClass("primary")}>Guardar en este navegador</button></>}>
          <RecordForm def={piecesDef} initial={{ fecha: creating, estado: "Idea" }} refs={data} titleKeyOf={titleKeyOf} formId="calendar-new-form" onSubmit={(values) => { const record = create(piecesDef, values); if (record) { setCreating(null); notify("Pieza agregada al calendario · guardado en este navegador", "success"); } else notify("No se pudo guardar en este navegador", "error"); }} />
        </OSModal>
      ) : null}
    </div>
  );
}

export function AxesSection({ client, editable }: { client: OsClient; editable: boolean }) {
  const { data } = useModuleRecords(client.slug, SERVICE, ["ejes", "piezas"]);
  const axes = data.ejes ?? [];
  const chart = axes.map((axis) => {
    const count = (data.piezas ?? []).filter((piece) => piece.values.eje === axis.id).length;
    return { label: axis.values.nombre || axis.id, value: Number(axis.values.participacion) || 0, secondary: count, display: `${axis.values.participacion || 0} % objetivo`, secondaryDisplay: `${count} piezas en calendario` };
  });
  return (
    <div className={m.stack}>
      {chart.length ? <Panel title="Participación objetivo y piezas por eje" id="axes-chart"><div className={m.panelBody}><BarChart title="Participación objetivo por eje temático" data={chart} primaryLabel="Participación objetivo" secondaryLabel="Piezas en calendario" /></div></Panel> : null}
      <CollectionView client={client} serviceId={SERVICE} def={axesDef} editable={editable} />
    </div>
  );
}

export function IdeasSection({ client, editable }: { client: OsClient; editable: boolean }) {
  return <CollectionView client={client} serviceId={SERVICE} def={ideasDef} editable={editable} />;
}

export function PiecesSection({ client, editable }: { client: OsClient; editable: boolean }) {
  return <CollectionView client={client} serviceId={SERVICE} def={piecesDef} editable={editable} intro={<div className={m.panelBody} style={{ paddingBottom: 0 }}><p className={s.demoNote} style={{ margin: 0 }}>Cada pieza guarda brief, copy, formato, canal, versión y feedback. Al pasar a «En aprobación» se puede aprobar (queda «Programada») o pedir cambios desde su detalle.</p></div>} />;
}

export function ContentResultsSection({ client, editable }: { client: OsClient; editable: boolean }) {
  const report = useContentReport(client);
  return (
    <div className={m.stack}>
      <ContentReportView report={report} clientSlug={client.slug} embedded />
      <CollectionView client={client} serviceId={SERVICE} def={learningsDef} editable={editable} />
    </div>
  );
}
