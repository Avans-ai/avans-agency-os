/* Personas y Cultura · Catálogo de proveedores audiovisuales.
 * Lo carga la responsable del área; Audiovisuales elige el proveedor de cada jornada
 * desde acá. Persistencia de vista previa: una clave local en este navegador
 * (`avans-os:preview:v1:providers:catalog`). Funciones puras, sin acceso a localStorage.
 * Los proveedores marcados `demo` son DATOS DE DEMOSTRACIÓN: personas y estudios ficticios. */

export const JORNADA_TYPES = ["UGC", "Producto", "Institucional", "Cobertura de evento"] as const;
export type JornadaType = typeof JORNADA_TYPES[number];

export const PROVIDERS_KEY = "providers:catalog";
/** Proveedor con el que se previsualiza el rol «Proveedor externo» (solo vista previa). */
export const PROVIDER_IDENTITY_KEY = "providers:preview-identity";
export const PROVIDERS_DEMO_LABEL = "Datos de demostración";

export type ProviderLink = { label: string; url: string };
export type ProviderHistory = { at: string; actor: string; text: string };
export type AudiovisualProvider = {
  id: string;
  nombre: string;
  contacto: string;
  /** Imagen cargada desde el equipo (data URL). Vacío = avatar con iniciales. */
  foto: string;
  links: ProviderLink[];
  descripcion: string;
  tipos: JornadaType[];
  activo: boolean;
  source: "demo" | "manual";
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  history: ProviderHistory[];
};
export type ProviderCatalog = { version: 1; providers: AudiovisualProvider[] };

const DEMO_AT = "2026-10-01T12:00:00.000Z";
const demo = (provider: Omit<AudiovisualProvider, "foto" | "activo" | "source" | "createdAt" | "updatedAt" | "updatedBy" | "history">): AudiovisualProvider => ({
  ...provider, foto: "", activo: true, source: "demo", createdAt: DEMO_AT, updatedAt: DEMO_AT, updatedBy: "Sistema",
  history: [{ at: DEMO_AT, actor: "Sistema", text: "Precargado como dato de demostración" }],
});

/** DATOS DE DEMOSTRACIÓN: estudios y realizadores ficticios, con enlaces de ejemplo. */
export const DEMO_PROVIDERS: AudiovisualProvider[] = [
  demo({ id: "PRV-KINETICA", nombre: "Kinética Films", contacto: "Joaquín Ferrari", links: [{ label: "Portfolio", url: "https://example.com/kinetica-films" }, { label: "Instagram", url: "https://www.instagram.com/example" }], descripcion: "Equipo de rodaje con cámara, sonido y luces. Resuelve jornadas institucionales y coberturas con varias cámaras y entrega en 72 h.", tipos: ["Institucional", "Cobertura de evento"] }),
  demo({ id: "PRV-BRUMA", nombre: "Estudio Bruma", contacto: "Camila Herrera", links: [{ label: "Portfolio", url: "https://example.com/estudio-bruma" }, { label: "TikTok", url: "https://www.tiktok.com/@example" }], descripcion: "Realizadora de contenido vertical con creadores propios. Ideal para UGC, testimonios y piezas nativas de redes.", tipos: ["UGC", "Producto"] }),
  demo({ id: "PRV-LUMEN", nombre: "Lumen Audiovisual", contacto: "Federico Sosa", links: [{ label: "Vimeo", url: "https://vimeo.com/example" }], descripcion: "Estudio con set y luz controlada para producto y piezas institucionales cuidadas. Incluye dirección de arte básica.", tipos: ["Producto", "Institucional"] }),
];

export const demoCatalog = (): ProviderCatalog => ({ version: 1, providers: DEMO_PROVIDERS });

export function providerInitials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "PR";
}

export function safeProviderUrl(value: string) {
  try { const url = new URL(value.trim()); return ["https:", "http:"].includes(url.protocol) ? url.href : ""; } catch { return ""; }
}

/** Solo imágenes cargadas desde el equipo (nunca fotos tomadas de internet). */
export function safeProviderPhoto(value: string) {
  return /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value) && value.length < 900_000 ? value : "";
}

/** Lee lo guardado sin reescribirlo: entradas inválidas se descartan al leer. */
export function normalizeCatalog(value: unknown): ProviderCatalog {
  const raw = value as Partial<ProviderCatalog> | null;
  if (!raw || raw.version !== 1 || !Array.isArray(raw.providers)) return demoCatalog();
  const providers = raw.providers.filter((item): item is AudiovisualProvider => Boolean(item) && typeof item.id === "string" && typeof item.nombre === "string")
    .map((item) => ({
      ...item,
      contacto: item.contacto || "",
      foto: safeProviderPhoto(item.foto || ""),
      links: Array.isArray(item.links) ? item.links.filter((link) => link && safeProviderUrl(link.url)) : [],
      descripcion: item.descripcion || "",
      tipos: Array.isArray(item.tipos) ? item.tipos.filter((tipo) => (JORNADA_TYPES as readonly string[]).includes(tipo)) : [],
      activo: item.activo !== false,
      source: item.source === "demo" ? "demo" as const : "manual" as const,
      history: Array.isArray(item.history) ? item.history : [],
    }));
  return { version: 1, providers };
}

export type ProviderDraft = { nombre: string; contacto: string; foto: string; links: ProviderLink[]; descripcion: string; tipos: JornadaType[] };

export function validateProvider(draft: ProviderDraft, others: AudiovisualProvider[], id?: string) {
  if (!draft.nombre.trim()) return "Completá el nombre del proveedor.";
  if (others.some((item) => item.id !== id && item.nombre.trim().toLowerCase() === draft.nombre.trim().toLowerCase())) return "Ya hay un proveedor con ese nombre en el catálogo.";
  if (!draft.tipos.length) return "Elegí al menos un tipo de jornada recomendado.";
  if (!draft.descripcion.trim()) return "Contá para qué jornadas se recomienda.";
  if (draft.links.some((link) => link.url.trim() && !safeProviderUrl(link.url))) return "Revisá los enlaces: tienen que empezar con http:// o https://.";
  if (!draft.links.some((link) => safeProviderUrl(link.url))) return "Agregá al menos un enlace a redes sociales o portfolio.";
  if (draft.foto && !safeProviderPhoto(draft.foto)) return "La foto tiene que ser una imagen PNG, JPG, WEBP o GIF cargada desde tu equipo (hasta 600 KB).";
  return "";
}

export function upsertProvider(catalog: ProviderCatalog, draft: ProviderDraft, ctx: { actor: string; at: string; id?: string }): { catalog: ProviderCatalog; provider: AudiovisualProvider } {
  const error = validateProvider(draft, catalog.providers, ctx.id);
  if (error) throw new Error(error);
  const previous = ctx.id ? catalog.providers.find((item) => item.id === ctx.id) : undefined;
  if (ctx.id && !previous) throw new Error("El proveedor ya no existe en el catálogo.");
  const clean = {
    nombre: draft.nombre.trim(), contacto: draft.contacto.trim(), foto: safeProviderPhoto(draft.foto),
    links: draft.links.map((link) => ({ label: link.label.trim() || "Enlace", url: safeProviderUrl(link.url) })).filter((link) => link.url),
    descripcion: draft.descripcion.trim(), tipos: JORNADA_TYPES.filter((tipo) => draft.tipos.includes(tipo)),
  };
  const provider: AudiovisualProvider = previous
    ? { ...previous, ...clean, updatedAt: ctx.at, updatedBy: ctx.actor, history: [{ at: ctx.at, actor: ctx.actor, text: "Actualizó la ficha" }, ...previous.history] }
    : { id: `PRV-${ctx.at.replace(/\D/g, "").slice(0, 14)}-${catalog.providers.length + 1}`, ...clean, activo: true, source: "manual", createdAt: ctx.at, updatedAt: ctx.at, updatedBy: ctx.actor, history: [{ at: ctx.at, actor: ctx.actor, text: "Sumó el proveedor al catálogo" }] };
  return { provider, catalog: { version: 1, providers: previous ? catalog.providers.map((item) => item.id === provider.id ? provider : item) : [provider, ...catalog.providers] } };
}

export function setProviderActive(catalog: ProviderCatalog, id: string, active: boolean, ctx: { actor: string; at: string }): ProviderCatalog {
  return { version: 1, providers: catalog.providers.map((item) => item.id === id ? { ...item, activo: active, updatedAt: ctx.at, updatedBy: ctx.actor, history: [{ at: ctx.at, actor: ctx.actor, text: active ? "Reactivó el proveedor" : "Dio de baja al proveedor (sus jornadas se conservan)" }, ...item.history] } : item) };
}

/** Solo se eliminan proveedores cargados a mano y sin jornadas asignadas; el resto se da de baja. */
export function removeProvider(catalog: ProviderCatalog, id: string, assignedJornadas: number): ProviderCatalog {
  const target = catalog.providers.find((item) => item.id === id);
  if (!target) throw new Error("El proveedor ya no existe en el catálogo.");
  if (target.source === "demo") throw new Error("Los proveedores de demostración se dan de baja, no se eliminan.");
  if (assignedJornadas > 0) throw new Error("Tiene jornadas asignadas: dalo de baja para conservar el historial.");
  return { version: 1, providers: catalog.providers.filter((item) => item.id !== id) };
}

/** Proveedores activos ordenados: primero los recomendados para el tipo de jornada. */
export function providersForType(providers: AudiovisualProvider[], tipo?: string) {
  return providers.filter((item) => item.activo).sort((a, b) => Number(b.tipos.includes(tipo as JornadaType)) - Number(a.tipos.includes(tipo as JornadaType)) || a.nombre.localeCompare(b.nombre, "es"));
}
