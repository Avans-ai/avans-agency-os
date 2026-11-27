"use client";
import { useState } from "react";
import type { OsClient } from "../os-data";
import { OSSidePanel } from "../overlays";
import { buttonClass } from "../ui";
import { useKnowledge } from "./use-knowledge";
import { ProfileChecks } from "./profile-library";
import { glossaryOf, saveGlossary, type BrandGlossary } from "./profile-model";
import p from "./profile.module.css";
import m from "./knowledge.module.css";
const sections = [
  { key: "use", label: "Palabras que usamos" }, { key: "avoid", label: "Palabras que evitamos" },
  { key: "expressions", label: "Expresiones de marca" }, { key: "technical", label: "Terminología técnica" }, { key: "approvedMessages", label: "Mensajes aprobados" },
] as const;
export function ProfileGlossary({ client }: { client: OsClient }) {
  const { k, editable } = useKnowledge(client), value = glossaryOf(k);
  const [editing, setEditing] = useState(false);
  return <section className={p.root} aria-label="Glosario de marca"><div className={p.head}><div><h3>Glosario de marca</h3><p>Voz, vocabulario y mensajes que guían al equipo</p></div>{editable && <button className={buttonClass("primary")} onClick={() => setEditing(true)}>Editar glosario</button>}</div>
    <div className={p.glossary}><article><h4>Tono de marca</h4><p>{value.tone || "Todavía no se definió el tono."}</p></article>{sections.map(section => <article key={section.key} data-kind={section.key}><h4>{section.label}</h4>{value[section.key].length ? <ul>{value[section.key].map(item => <li key={item}>{item}</li>)}</ul> : <p>Sin términos definidos.</p>}</article>)}</div>
    {value.updatedAt && <p className={m.muted}>Última edición: {value.updatedBy} · {value.updatedAt.slice(0, 10)} · {value.sourceIds.length} fuentes vinculadas</p>}
    {editing && <GlossaryEditor client={client} onClose={() => setEditing(false)} />}
  </section>;
}
function GlossaryEditor({ client, onClose }: { client: OsClient; onClose: () => void }) {
  const { k, mutate } = useKnowledge(client), [revision] = useState(k.revision);
  const [draft, setDraft] = useState<BrandGlossary>(glossaryOf(k)), [error, setError] = useState("");
  return <OSSidePanel label="Editar glosario de marca" heading={<h3>Glosario de marca</h3>} onClose={onClose} wide footer={<button className={buttonClass("primary")} onClick={() => { if (mutate((state, ctx) => saveGlossary(state, draft, ctx), revision)) onClose(); else setError("No se guardó. Revisá el aviso y corregí los términos o las fuentes."); }}>Guardar glosario</button>} persistentFooter>
    <label className={m.field}><span>Tono de marca</span><textarea value={draft.tone} onChange={e => setDraft({ ...draft, tone: e.target.value })} /></label>
    {sections.map(section => <label className={m.field} key={section.key}><span>{section.label}</span><textarea value={draft[section.key].join("\n")} onChange={e => setDraft({ ...draft, [section.key]: e.target.value.split("\n") })} /><small>Un término o mensaje por línea.</small></label>)}
    <ProfileChecks label="Fuentes del glosario" options={k.sources.map(s => ({ id: s.id, label: s.title }))} value={draft.sourceIds} onChange={ids => setDraft({ ...draft, sourceIds: ids })} />
    {error && <p role="alert" className={m.error}>{error}</p>}
  </OSSidePanel>;
}
