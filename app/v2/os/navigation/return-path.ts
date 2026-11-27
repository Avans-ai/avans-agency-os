/* Validación y armado de rutas de regreso (puro, sin dependencias de navegador). */
export const RETURN_PARAM = "volver";
const MAX_LENGTH = 1200;

/** Solo rutas internas de la app (/v2/…). Rechaza protocolos, dominios, `//` y rutas fuera de /v2. */
export function safeReturnPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim();
  try {
    if (/%2f|%3a/i.test(value)) value = decodeURIComponent(value);
  } catch {
    return null;
  }
  if (value.length > MAX_LENGTH) return null;
  if (!value.startsWith("/v2")) return null;
  if (value.startsWith("//") || value.includes("\\") || /^\/v2[^/?#]/.test(value)) return null;
  if (/[\u0000-\u001f]/.test(value)) return null;
  try {
    const url = new URL(value, "https://avans.local");
    if (url.origin !== "https://avans.local") return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** Agrega el origen a un enlace de detalle. Si el origen ya es demasiado largo, se recorta su propio `volver`. */
export function withReturn(href: string, from: string | null | undefined) {
  const origin = safeReturnPath(from);
  if (!origin) return href;
  let value = origin;
  if (value.length > MAX_LENGTH / 2) {
    const url = new URL(value, "https://avans.local");
    url.searchParams.delete(RETURN_PARAM);
    value = `${url.pathname}${url.search}${url.hash}`;
  }
  const [path, hash = ""] = href.split("#");
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${RETURN_PARAM}=${encodeURIComponent(value)}${hash ? `#${hash}` : ""}`;
}

