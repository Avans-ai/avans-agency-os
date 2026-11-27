"use client";
import Link from "next/link";
import { useState } from "react";
import type { OsClient } from "../os-data";
import { OSSidePanel } from "../overlays";
import { buttonClass } from "../ui";
import { serviceHref } from "../service-workspace-data";
import { canEditService } from "../director-data";
import { useOsStore } from "../os-store";
import { collectionDef } from "../modules/collections";
import { useModuleRecords } from "../modules/store";
import type { BenchmarkBrand, KnowledgeItem } from "./types";
import { benchmarkIdeaValues, existingBenchmarkIdea, type BenchmarkIdeaDraft } from "./benchmark-ideas";
import m from "./knowledge.module.css";

export function BenchmarkIdeaDialog({ client, brand, item, onClose }: { client: OsClient; brand: BenchmarkBrand; item: KnowledgeItem; onClose: () => void }) {
  const { role, localHydrated } = useOsStore();
  const editable = localHydrated && canEditService(role, client.slug, "contenidos");
  const { data, create, hydrated } = useModuleRecords(client.slug, "contenidos", ["ideas", "ejes"]);
  const [draft, setDraft] = useState<BenchmarkIdeaDraft>({ title: String(item.values.title || `Aprendizaje de ${brand.name}`), url: String(item.values.links || item.values.url || "").split(/\s+/).find((s) => /^https?:\/\//.test(s)) || "", capture: item.captures.split(/\s+/).find((s) => /^https?:\/\//.test(s)) || "", reason: String(item.values.learning || ""), pillarId: "" });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const duplicate = existingBenchmarkIdea(data.ideas, brand.id, item.id, draft.url);
  function patch(key: keyof BenchmarkIdeaDraft, value: string) { setDraft((before) => ({ ...before, [key]: value })); setError(""); }
  async function attach(file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 512 * 1024) { setError("La captura debe ser PNG, JPG o WebP de hasta 512 KB."); return; }
    setLoading(true);
    try {
      const result = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
      patch("capture", result);
    } catch { setError("No se pudo leer la captura. Probá con otro archivo."); }
    finally { setLoading(false); }
  }
  return <OSSidePanel label="Guardar en Banco de ideas" heading={<h2>Inspiración de {brand.name}</h2>} onClose={onClose} persistentFooter footer={saved || duplicate ? <Link className={buttonClass("primary")} href={`${serviceHref(client.slug, "contenidos")}?seccion=ideas`}>Abrir Banco de ideas</Link> : <button type="submit" form="benchmark-idea-form" className={buttonClass("primary")} disabled={!hydrated || loading || !editable}>Guardar idea</button>}>
    <p className={m.small}>Guardá el aprendizaje y su origen para crear una propuesta propia. La referencia no se convierte automáticamente en una pieza.</p>
    {saved || duplicate ? <p role="status" className={m.notice}>{saved ? "Idea guardada con su fuente y captura." : "Esta referencia ya está en el Banco de ideas."}</p> : <form id="benchmark-idea-form" onSubmit={(event) => {
      event.preventDefault();
      try {
        if (!editable) throw new Error("Tu rol no puede agregar ideas para este cliente.");
        const values = benchmarkIdeaValues(brand, item, draft);
        if (draft.pillarId && !data.ejes.some((p) => p.id === draft.pillarId)) throw new Error("El eje ya no existe. Elegí otro.");
        const result = create(collectionDef("contenidos", "ideas")!, values, `Referencia de Benchmark · ${brand.name} · ${item.id}`);
        if (!result) throw new Error("No se pudo guardar la idea en este navegador. Liberá espacio y reintentá.");
        setSaved(true);
      } catch (cause) { setError((cause as Error).message); }
    }}>
      <label className={m.field}>Título de la idea<input required value={draft.title} onChange={(e) => patch("title", e.target.value)} /></label>
      <label className={m.field}>URL del contenido original<input required type="url" value={draft.url} onChange={(e) => patch("url", e.target.value)} /></label>
      <label className={m.field}>Por qué resulta interesante<textarea required value={draft.reason} onChange={(e) => patch("reason", e.target.value)} /></label>
      <label className={m.field}>Eje temático<select value={draft.pillarId} onChange={(e) => patch("pillarId", e.target.value)}><option value="">Por definir</option>{data.ejes.map((p) => <option key={p.id} value={p.id}>{p.values.eje || p.values.nombre || p.id}</option>)}</select></label>
      <label className={m.field}>URL de la captura<input type="url" value={draft.capture.startsWith("data:") ? "" : draft.capture} onChange={(e) => patch("capture", e.target.value)} /></label>
      <label className={m.field}>Adjuntar captura<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { void attach(e.target.files?.[0]); }} /></label>
      {draft.capture ? <p className={m.small}>{draft.capture.startsWith("data:") ? "Captura adjunta · se conserva localmente" : "Captura enlazada"}<button className={buttonClass("ghost", true)} type="button" onClick={() => patch("capture", "")}>Quitar captura</button></p> : null}
      {draft.capture.startsWith("data:image/") ? <figure>
        {/* eslint-disable-next-line @next/next/no-img-element -- Small local user attachment, no remote image service. */}
        <img src={draft.capture} alt={`Captura de referencia de ${brand.name}`} style={{ maxWidth: "100%", maxHeight: 240, objectFit: "contain" }} />
      </figure> : null}
      {error ? <p role="alert" className={m.error}>{error}</p> : null}
    </form>}
  </OSSidePanel>;
}
