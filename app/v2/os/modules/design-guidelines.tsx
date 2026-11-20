"use client";

/* Diseño de marca · A. Lineamientos del servicio.
 * Documento permanente con el Design System del cliente. No contiene tareas ni piezas en
 * producción: esas viven en la Operación mensual y en la Biblioteca de marca. */
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { OsClient } from "../os-data";
import { Badge, buttonClass, OSEmptyState } from "../ui";
import { useKnowledge } from "../knowledge/use-knowledge";
import { planBlueprints } from "../knowledge/blueprints";
import { glossaryOf, materialOf, saveGlossary } from "../knowledge/profile-model";
import { sourceVisible } from "../knowledge/sources";
import { designSystemCollection } from "./design-collections";
import { BrandArt } from "./design-art";
import { ComponentPreview } from "./design-components";
import { colorPairs, contrastRatio, COLOR_GROUPS, fontStack, firstWeight, GRAPHIC_KINDS, GUIDELINE_PARTS, MOOD_KINDS, PART_KINDS, partOfKind, readableInk, rgbLabel, validHex, wcagLevel, type BrandTokens, type GuidelinePart } from "./design-system-model";
import { AssetEditor, AssetPreview, BrandScope, DemoTag, DesignDemoBanner, LinkedBrandMaterial, SERVICE, useBrand } from "./design-shared";
import { formatDateTime, Panel, StatusBadge } from "./module-ui";
import { ServiceGuidelines } from "./service-guidelines";
import { useModuleRecords } from "./store";
import type { ModuleRecord } from "./types";
import d from "./design-workspace.module.css";

type Props = { client: OsClient; editable: boolean };
const DEMO_GLOSSARY = {
  tone: "[Demostración] Cercana, clara y resolutiva. Hablamos de vos y explicamos qué hacer en cada paso.",
  use: ["asistencia", "socio", "en ruta", "acompañamos", "pedí", "beneficio"],
  avoid: ["increíble", "exclusivísimo", "cliente VIP", "¡¡"],
  expressions: ["Te acompañamos en la ruta", "Pedilo desde la app"],
  technical: ["auxilio mecánico", "remolque"],
  approvedMessages: ["Asistencia 24 h en todo el país", "Tu credencial, siempre con vos"],
};

function History({ record }: { record: ModuleRecord }) {
  return <details className={d.history}><summary>Historial ({record.history.length})</summary>{record.history.map((entry, index) => <p key={index}>{entry.text} · {entry.user} · {formatDateTime(entry.at)}</p>)}</details>;
}

function Tile({ record, t, editable, onEdit, preview, children, wrong = false }: { record: ModuleRecord; t: BrandTokens; editable: boolean; onEdit: (r: ModuleRecord) => void; preview?: ReactNode; children?: ReactNode; wrong?: boolean }) {
  return <article className={d.tile} data-wrong={wrong || undefined}>
    <div className={d.tileMedia}>{preview ?? <AssetPreview values={record.values} t={t} />}{wrong ? <span className={d.wrongMark} aria-label="Uso incorrecto">✕</span> : null}</div>
    <div className={d.tileBody}>
      <div className={d.tileHead}><h3>{record.values.nombre}</h3>{record.source === "demo" ? <DemoTag /> : null}</div>
      <div className={d.chips}>{record.values.subtipo || record.values.grupo ? <Badge tone="stone">{record.values.subtipo || record.values.grupo}</Badge> : null}<StatusBadge status={record.values.estado} /></div>
      {children}
      {!wrong && record.values.funcion ? <p>{record.values.funcion}</p> : null}
      {record.values.usos ? <p className={d.ok}><strong>Usar:</strong> {record.values.usos}</p> : null}
      {record.values.evitar ? <p className={d.no}><strong>Evitar:</strong> {record.values.evitar}</p> : null}
      <div className={d.tileFoot}>{editable ? <button className={buttonClass("ghost", true)} onClick={() => onEdit(record)}>Editar recurso</button> : null}<History record={record} /></div>
    </div>
  </article>;
}

function Group({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return <section className={d.group}><header><h3>{title}</h3>{note ? <p>{note}</p> : null}</header>{children}</section>;
}

function ContrastChip({ bg, fg, label }: { bg: string; fg: string; label: string }) {
  const ratio = contrastRatio(bg, fg), level = wcagLevel(ratio);
  return <span className={d.contrast} data-level={level} title={`${label}: contraste ${ratio}:1 (${level})`}><i style={{ background: bg, color: fg }}>Aa</i>{label} {ratio}:1 <b>{level}</b></span>;
}

function ColorPart({ records, t, editable, onEdit }: { records: ModuleRecord[]; t: BrandTokens; editable: boolean; onEdit: (r: ModuleRecord) => void }) {
  const [onlyPass, setOnlyPass] = useState(true);
  const colors = records.filter((r) => validHex(r.values.valor));
  const pairs = colorPairs(colors.map((r) => ({ name: r.values.nombre, hex: r.values.valor })));
  const shown = onlyPass ? pairs.filter((p) => p.ratio >= 4.5) : pairs;
  const groups = [...COLOR_GROUPS, "Sin grupo"].map((group) => ({ group, items: colors.filter((r) => (r.values.grupo || r.values.subtipo || "Sin grupo") === group) })).filter((g) => g.items.length);
  return <>
    {groups.map(({ group, items }) => <Group key={group} title={`Colores ${group === "Sin grupo" ? "sin grupo" : group === "De apoyo" ? "de apoyo" : group === "Principal" ? "principales" : "secundarios"}`}>
      <div className={d.swatches}>{items.map((record) => {
        const hex = record.values.valor;
        return <article key={record.id} className={d.swatch}>
          <div className={d.swatchColor} style={{ background: hex, color: readableInk(hex) }}><strong>{record.values.nombre}</strong><span className={d.mono}>{hex.toLowerCase()}</span></div>
          <div className={d.tileBody}>
            <div className={d.tileHead}><h3>{record.values.nombre}</h3>{record.source === "demo" ? <DemoTag /> : null}</div>
            <dl className={d.facts}><div><dt>HEX</dt><dd className={d.mono}>{hex.toLowerCase()}</dd></div><div><dt>RGB</dt><dd className={d.mono}>{rgbLabel(hex).replace("RGB ", "")}</dd></div></dl>
            {record.values.funcion ? <p>{record.values.funcion}</p> : null}
            <div className={d.chips}><ContrastChip bg={hex} fg="#ffffff" label="Blanco" /><ContrastChip bg={hex} fg="#000000" label="Negro" /></div>
            {record.values.evitar ? <p className={d.no}><strong>Evitar:</strong> {record.values.evitar}</p> : null}
            <div className={d.tileFoot}>{editable ? <button className={buttonClass("ghost", true)} onClick={() => onEdit(record)}>Editar recurso</button> : null}<History record={record} /></div>
          </div>
        </article>;
      })}</div>
    </Group>)}
    {pairs.length ? <Group title="Combinaciones y contraste" note={<>Relación de contraste WCAG 2.1 calculada en la app. AA ≥ 4.5:1 para texto; AA grande ≥ 3:1 para títulos de 24 px o más; AAA ≥ 7:1. <label className={d.inlineCheck}><input type="checkbox" checked={onlyPass} onChange={(e) => setOnlyPass(e.target.checked)} /> Solo aptas para texto</label></>}>
      <div className={d.pairs}>{shown.map((pair) => <div key={`${pair.bg}-${pair.fg}`} className={d.pair} style={{ background: pair.bg, color: pair.fg }} data-level={pair.level}>
        <strong style={{ fontFamily: t.heading }}>Aa</strong><span>{pair.fgName} sobre {pair.bgName}</span><em>{pair.ratio}:1 · {pair.level}</em>
      </div>)}</div>
      {!shown.length ? <p className={d.muted}>Ninguna combinación alcanza AA para texto. Revisá la paleta.</p> : null}
    </Group> : null}
  </>;
}

function TypePart({ records, t, editable, onEdit }: { records: ModuleRecord[]; t: BrandTokens; editable: boolean; onEdit: (r: ModuleRecord) => void }) {
  const role = (name: string) => records.find((r) => (r.values.subtipo || r.values.funcion || "").includes(name));
  const size = (r?: ModuleRecord, fallback = 16) => Math.min(48, Math.max(12, Number((r?.values.tamano || "").match(/\d+/)?.[0]) || fallback));
  const h = role("Titular"), sub = role("Subtítulo"), body = role("Texto");
  return <>
    <Group title="Familias y pesos">
      <div className={d.typeGrid}>{records.map((record) => {
        const weights = (record.values.variante || "400").match(/[1-9]00/g) || ["400"];
        return <Tile key={record.id} record={record} t={t} editable={editable} onEdit={onEdit} preview={<div className={d.specimen} style={{ fontFamily: fontStack(record.values.valor) }}>
          <span style={{ fontWeight: firstWeight(record.values.variante) }}>Aa</span>
          <div>{weights.map((w) => <small key={w} style={{ fontWeight: Number(w) }}>{record.values.valor} {w}</small>)}</div>
        </div>}><p className={d.mono}>{record.values.valor} · {record.values.variante || "400"}{record.values.tamano ? ` · ${record.values.tamano}` : ""}</p></Tile>;
      })}</div>
    </Group>
    {h || sub || body ? <Group title="Jerarquía aplicada" note="Ejemplo renderizado con las familias, pesos y tamaños definidos.">
      <div className={d.hierarchy} style={{ background: t.paper, color: t.ink }}>
        <small style={{ color: t.primary, fontFamily: t.body }}>TITULARES · {h?.values.valor || "—"}</small>
        <p style={{ fontFamily: fontStack(h?.values.valor), fontWeight: firstWeight(h?.values.variante), fontSize: size(h, 40), lineHeight: 1.08, margin: 0 }}>Asistencia en ruta, todo el año</p>
        <small style={{ color: t.primary, fontFamily: t.body }}>SUBTÍTULOS · {sub?.values.valor || "—"}</small>
        <p style={{ fontFamily: fontStack(sub?.values.valor), fontWeight: firstWeight(sub?.values.variante), fontSize: size(sub, 22), margin: 0 }}>Pedí ayuda desde la app y seguí al móvil</p>
        <small style={{ color: t.primary, fontFamily: t.body }}>TEXTOS · {body?.values.valor || "—"}</small>
        <p style={{ fontFamily: fontStack(body?.values.valor), fontWeight: firstWeight(body?.values.variante), fontSize: size(body, 16), lineHeight: 1.5, margin: 0, maxWidth: 560 }}>Compartí tu ubicación, elegí el tipo de asistencia y recibí la confirmación con el tiempo estimado de llegada. Texto de ejemplo de la demostración.</p>
      </div>
    </Group> : null}
  </>;
}

function TonePart({ client, records, t, editable, onEdit }: Props & { records: ModuleRecord[]; t: BrandTokens; onEdit: (r: ModuleRecord) => void }) {
  const { k, editable: canEditFicha, mutate } = useKnowledge(client);
  const glossary = glossaryOf(k);
  const empty = !glossary.tone && !glossary.use.length && !glossary.avoid.length && !glossary.approvedMessages.length;
  const by = (kind: string) => records.filter((r) => r.values.subtipo === kind);
  const examples = [...by("Ejemplo correcto"), ...by("Ejemplo a evitar")];
  const traits = records.filter((r) => !examples.includes(r));
  return <>
    {traits.length ? <Group title="Personalidad y voz"><div className={d.toneGrid}>{traits.map((record) => <article key={record.id} className={d.voice} style={{ borderColor: t.primary }}>
      <small>{record.values.subtipo || "Tono"}</small><strong style={{ fontFamily: t.heading }}>{record.values.nombre}</strong><p>{record.values.funcion}</p>
      <div className={d.tileFoot}>{record.source === "demo" ? <DemoTag /> : null}{editable ? <button className={buttonClass("ghost", true)} onClick={() => onEdit(record)}>Editar recurso</button> : null}<History record={record} /></div>
    </article>)}</div></Group> : null}
    {examples.length ? <Group title="Ejemplos"><div className={d.toneGrid}>{examples.map((record) => { const good = record.values.subtipo === "Ejemplo correcto"; return <article key={record.id} className={d.example} data-good={good}>
      <span aria-hidden="true">{good ? "✓" : "✕"}</span><div><small>{record.values.subtipo}</small><p style={{ fontFamily: t.heading }}>{record.values.funcion}</p>{record.values.evitar ? <p className={d.muted}>{record.values.evitar}</p> : null}</div>
    </article>; })}</div></Group> : null}
    <Group title="Glosario de marca · Ficha del cliente" note="Fuente única: estas palabras y mensajes se leen del glosario de la Ficha. Se editan allí y se reflejan acá y en Contenidos.">
      <div className={d.glossary} aria-label="Glosario vinculado">
        {empty ? <div className={d.glossaryEmpty}><p>El glosario de la Ficha todavía no tiene tono, palabras ni mensajes aprobados.</p>
          {canEditFicha && client.slug === "aca" && records.some((r) => r.source === "demo") ? <button className={buttonClass("secondary", true)} onClick={() => mutate((state, ctx) => saveGlossary(state, { ...glossaryOf(state), ...DEMO_GLOSSARY }, ctx))}>Cargar glosario de demostración en la Ficha</button> : null}</div> : <>
          {glossary.tone ? <p className={d.toneLine}><strong>Tono:</strong> {glossary.tone}</p> : null}
          <div className={d.wordCols}>
            <div><h4>Palabras permitidas</h4><div className={d.words}>{glossary.use.map((w) => <span key={w} data-kind="use">{w}</span>)}</div></div>
            <div><h4>Palabras a evitar</h4><div className={d.words}>{glossary.avoid.map((w) => <span key={w} data-kind="avoid">{w}</span>)}</div></div>
            {glossary.expressions.length ? <div><h4>Expresiones de marca</h4><div className={d.words}>{glossary.expressions.map((w) => <span key={w}>{w}</span>)}</div></div> : null}
          </div>
          {glossary.approvedMessages.length ? <div><h4>Mensajes aprobados</h4><div className={d.messages}>{glossary.approvedMessages.map((msg) => <blockquote key={msg} style={{ borderColor: t.secondary, fontFamily: t.heading }}>{msg}</blockquote>)}</div></div> : null}
          {glossary.updatedAt ? <p className={d.muted}>Última edición en la Ficha: {glossary.updatedBy} · {glossary.updatedAt.slice(0, 10)}</p> : null}
        </>}
        <Link className={buttonClass("secondary", true)} href={`/v2/clientes/${client.slug}?view=ficha&ficha=glosario`}>Abrir glosario de marca</Link>
      </div>
    </Group>
  </>;
}

function ChipFilter({ options, value, onChange, label }: { options: string[]; value: string; onChange: (v: string) => void; label: string }) {
  return <div className={d.chipFilter} role="group" aria-label={label}>{["Todos", ...options].map((option) => <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)}>{option}</button>)}</div>;
}

export function DesignGuidelines({ client, editable }: Props) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = params.get("parte") as GuidelinePart | null;
  const part: GuidelinePart = GUIDELINE_PARTS.some((p) => p.id === requested) ? requested! : "portada";
  const { data, create, update } = useModuleRecords(client.slug, SERVICE, ["sistema"]);
  const { tokens: t } = useBrand(client);
  const { k, editable: canManageSources } = useKnowledge(client);
  const [editor, setEditor] = useState<ModuleRecord | "new" | null>(null);
  const [filter, setFilter] = useState("Todos");
  const records = data.sistema || [];
  const of = (kind: string) => records.filter((r) => r.values.tipo === kind);
  const count = (p: GuidelinePart) => p === "portada" ? records.length : records.filter((r) => PART_KINDS[p as Exclude<GuidelinePart, "portada">].includes(r.values.tipo)).length;
  const href = (p: GuidelinePart) => `${pathname}?area=lineamientos${p === "portada" ? "" : `&parte=${p}`}`;
  function save(values: Record<string, string>) {
    const ok = editor === "new" ? !!create(designSystemCollection, values, "Agregó el recurso al Design System") : !!editor && update("sistema", editor.id, values, "Actualizó el recurso de marca");
    if (ok) {
      setEditor(null);
      const target = partOfKind(values.tipo);
      if (target !== part) router.replace(href(target), { scroll: false });
    }
    return ok;
  }
  const edit = (record: ModuleRecord) => setEditor(record);
  const visualPlan = (k.plan.modules[SERVICE] || []).filter((item) => ["colors", "visualSystem", "lookFeel", "visualDirection"].includes(item.section));
  const brandMaterials = k.sources.filter((source) => sourceVisible(source, canManageSources) && ["Identidad de marca", "Logos", "Manuales", "Tipografías", "Colores", "Fotografías"].includes(materialOf(source).category));
  const tiles = (items: ModuleRecord[], wrong = false) => <div className={d.gallery}>{items.map((r) => <Tile key={r.id} record={r} t={t} editable={editable} onEdit={edit} wrong={wrong} />)}</div>;
  const empty = (kind: string) => <OSEmptyState icon="identidad" title={`Sin recursos de ${kind.toLowerCase()}`}>{editable ? "Agregá el primer recurso con el botón «Agregar recurso de marca»." : "Todavía no se cargaron recursos en esta parte."}</OSEmptyState>;

  let body: ReactNode;
  if (part === "identidad") {
    const logos = of("Logo").filter((r) => r.values.subtipo !== "Uso incorrecto"), wrong = of("Logo").filter((r) => r.values.subtipo === "Uso incorrecto"), apps = of("Aplicación");
    body = <>{logos.length || wrong.length || apps.length ? null : empty("identidad")}
      {logos.length ? <Group title="Logos y variantes" note="Principal, secundario, isotipo y versiones monocromáticas.">{tiles(logos)}</Group> : null}
      {wrong.length ? <Group title="Usos incorrectos" note="Ejemplos de lo que no se debe hacer con la marca.">{tiles(wrong, true)}</Group> : null}
      {apps.length ? <Group title="Aplicaciones">{tiles(apps)}</Group> : null}
      {brandMaterials.length ? <Group title="Materiales de identidad de la Ficha" note="Archivos originales de la biblioteca central del cliente, sin duplicarlos."><div className={d.gallery}>{brandMaterials.map((source) => <LinkedBrandMaterial key={`${source.id}-${source.version}`} source={source} />)}</div></Group> : null}
    </>;
  } else if (part === "color") body = of("Color").length ? <ColorPart records={of("Color")} t={t} editable={editable} onEdit={edit} /> : empty("color");
  else if (part === "tipografia") body = of("Tipografía").length ? <TypePart records={of("Tipografía")} t={t} editable={editable} onEdit={edit} /> : empty("tipografía");
  else if (part === "recursos") {
    const items = of("Recurso gráfico"), kinds = GRAPHIC_KINDS.filter((kind) => items.some((r) => r.values.subtipo === kind));
    body = items.length ? <>{kinds.length > 1 ? <ChipFilter label="Clase de recurso" options={kinds} value={filter} onChange={setFilter} /> : null}{tiles(items.filter((r) => filter === "Todos" || r.values.subtipo === filter))}</> : empty("recursos gráficos");
  } else if (part === "componentes") body = of("Componente").length ? <div className={d.gallery} data-wide>{of("Componente").map((r) => <Tile key={r.id} record={r} t={t} editable={editable} onEdit={edit} preview={<div className={d.componentStage}><ComponentPreview kind={r.values.subtipo} t={t} name={r.values.nombre} /></div>} />)}</div> : empty("componentes");
  else if (part === "tono") body = <TonePart client={client} editable={editable} records={of("Tono")} t={t} onEdit={edit} />;
  else if (part === "moodboard") {
    const items = of("Moodboard"), kinds = MOOD_KINDS.filter((kind) => items.some((r) => r.values.subtipo === kind));
    body = items.length ? <>{kinds.length > 1 ? <ChipFilter label="Tipo de referencia" options={kinds} value={filter} onChange={setFilter} /> : null}
      <div className={d.mood}>{items.filter((r) => filter === "Todos" || r.values.subtipo === filter).map((r) => <article key={r.id} className={d.moodCard}>
        <div className={d.moodMedia}><AssetPreview values={r.values} t={t} />{r.values.arte && !r.values.archivo ? <span className={d.generated}>Visual generado en la app · demo</span> : null}</div>
        <div className={d.tileBody}><div className={d.tileHead}><h3>{r.values.nombre}</h3>{r.source === "demo" ? <DemoTag /> : null}</div>
          <div className={d.chips}><Badge tone="stone">{r.values.subtipo || "Referencia"}</Badge><StatusBadge status={r.values.estado} /></div>
          {r.values.descripcion ? <p>{r.values.descripcion}</p> : null}
          {r.values.justificacion ? <p className={d.why}><strong>Por qué:</strong> {r.values.justificacion}</p> : null}
          <div className={d.tileFoot}>{editable ? <button className={buttonClass("ghost", true)} onClick={() => edit(r)}>Editar recurso</button> : null}<History record={r} /></div>
        </div>
      </article>)}</div></> : empty("moodboard");
  } else {
    const logo = of("Logo").find((r) => r.values.subtipo === "Principal") ?? of("Logo")[0];
    const colors = of("Color").filter((r) => validHex(r.values.valor));
    const fonts = of("Tipografía");
    body = records.length ? <div className={d.cover}>
      <Link href={href("identidad")} className={d.coverLogo}>{logo ? <AssetPreview values={logo.values} t={t} large /> : <span className={d.muted}>Sin logo cargado</span>}<span>Identidad · {count("identidad")}</span></Link>
      <Link href={href("color")} className={d.coverColors} aria-label={`Sistema de color · ${colors.length} colores`}>{colors.map((r) => <i key={r.id} style={{ background: r.values.valor }} title={`${r.values.nombre} ${r.values.valor}`} />)}<span>Color · {colors.length}</span></Link>
      <Link href={href("tipografia")} className={d.coverType}><strong style={{ fontFamily: t.heading, fontWeight: t.headingWeight }}>Aa</strong><small style={{ fontFamily: t.body }}>{fonts.map((f) => f.values.valor).filter((v, i, all) => all.indexOf(v) === i).join(" · ") || "Sin tipografías"}</small><span>Tipografía · {fonts.length}</span></Link>
      {(["recursos", "componentes", "tono", "moodboard"] as GuidelinePart[]).map((p) => {
        const first = records.find((r) => PART_KINDS[p as Exclude<GuidelinePart, "portada">].includes(r.values.tipo) && (r.values.arte || r.values.tipo === "Componente" || r.values.tipo === "Tono"));
        return <Link key={p} href={href(p)} className={d.coverTile} data-wide={p === "componentes" || undefined}>
          <div className={d.coverMini}>{first?.values.tipo === "Componente" ? <ComponentPreview kind={first.values.subtipo} t={t} name={first.values.nombre} /> : first?.values.tipo === "Tono" ? <q style={{ fontFamily: t.heading }}>{first.values.nombre}</q> : first ? <BrandArt art={first.values.arte} t={t} label={first.values.nombre} /> : null}</div>
          <span>{GUIDELINE_PARTS.find((x) => x.id === p)?.label} · {count(p)}</span>
        </Link>;
      })}
    </div> : <OSEmptyState icon="identidad" title="El Design System está vacío">{editable ? "Agregá logos, colores, tipografías y referencias para que el equipo los consulte mientras produce." : "Todavía no se cargaron recursos de marca."}</OSEmptyState>;
  }

  return <BrandScope client={client}>
    <div className={d.stack}>
      <DesignDemoBanner client={client} editable={editable} />
      <Panel title="Design System" id="brand-system" description="Documento permanente de identidad del cliente. Se consulta durante la producción; cada cambio queda en el historial del recurso." actions={editable ? <button className={buttonClass("primary", true)} onClick={() => setEditor("new")}>Agregar recurso de marca</button> : <Badge tone="stone">Solo lectura</Badge>}>
        <nav className={d.partNav} aria-label="Partes del Design System">{GUIDELINE_PARTS.map((p) => <Link key={p.id} href={href(p.id)} scroll={false} aria-current={part === p.id ? "page" : undefined} onClick={() => setFilter("Todos")}>{p.label}<em>{count(p.id)}</em></Link>)}</nav>
        <div className={d.partBody}>{body}</div>
      </Panel>
      {part === "portada" && visualPlan.length ? <Panel title="Definiciones del Plan de Marketing" id="brand-plan" description="Consulta de la fuente estratégica vigente; se edita en Gestión y estrategia."><div className={d.plans}>{visualPlan.map((item) => {
        const bp = planBlueprints.find((b) => b.id === item.section);
        return <article key={item.id} className={d.plan}><h3>{bp?.label || item.section}</h3><dl>{bp?.fields.map((f) => item.values[f.key] ? <div key={f.key}><dt>{f.label}</dt><dd>{String(item.values[f.key])}</dd></div> : null)}</dl></article>;
      })}</div></Panel> : null}
      {part === "portada" ? <ServiceGuidelines client={client} serviceId={SERVICE} /> : null}
    </div>
    {editor ? <AssetEditor key={editor === "new" ? "new" : editor.id} library={false} t={t} initial={editor === "new" ? { tipo: part === "portada" ? "Logo" : PART_KINDS[part][0] } : editor.values} requests={[]} onSave={save} onClose={() => setEditor(null)} /> : null}
  </BrandScope>;
}

/** Recursos del Design System vinculados a un pedido: el diseñador los ve sin salir de la pieza. */
export function LinkedResources({ client, ids, t, records }: { client: OsClient; ids: string[]; t: BrandTokens; records: ModuleRecord[] }) {
  const linked = ids.map((id) => records.find((r) => r.id === id)).filter((r): r is ModuleRecord => !!r);
  if (!linked.length) return <p className={d.muted}>Sin recursos del Design System vinculados. <Link className={d.textLink} href={`/v2/clientes/${client.slug}/diseno-marca?area=lineamientos`}>Consultar lineamientos</Link></p>;
  return <div className={d.linked}>{linked.map((r) => <Link key={r.id} href={`/v2/clientes/${client.slug}/diseno-marca?area=lineamientos&parte=${partOfKind(r.values.tipo)}`} className={d.linkedItem} title={r.values.funcion || r.values.nombre}>
    <div className={d.linkedThumb}><AssetPreview values={r.values} t={t} /></div><span>{r.values.nombre}</span><small>{r.values.tipo}{r.values.tipo === "Color" ? ` · ${r.values.valor}` : ""}</small>
  </Link>)}</div>;
}
