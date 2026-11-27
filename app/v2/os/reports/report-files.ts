"use client";

/* Archivos del generador de reportes (solo navegador): tipografías y logo para el PDF,
 * huella SHA-256, guardado y lectura del PDF en IndexedDB (mismo almacenamiento que los
 * materiales de la Ficha) y descarga local. Nada se sube ni se envía. */
import { getProfileFile, putProfileFile, removeProfileFile } from "../knowledge/profile-files";
import type { PdfAssets } from "./pdf";

let assets: Promise<PdfAssets> | null = null;
async function bytesOf(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`No se pudo cargar ${path}.`);
  return new Uint8Array(await response.arrayBuffer());
}
export function loadPdfAssets() {
  assets ??= Promise.all([
    bytesOf("/fonts/figtree/Figtree-Regular.ttf"),
    bytesOf("/fonts/figtree/Figtree-Medium.ttf"),
    bytesOf("/fonts/figtree/Figtree-Bold.ttf"),
    bytesOf("/avans-master-logo.png").catch(() => undefined),
  ]).then(([regular, medium, bold, logo]) => ({ regular, medium, bold, logo })).catch((error) => { assets = null; throw error; });
  return assets;
}

export async function sha256Hex(data: Uint8Array | string) {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function storeReportPdf(clientSlug: string, fileId: string, bytes: Uint8Array, fileName: string) {
  const file = new File([bytes as BlobPart], fileName, { type: "application/pdf" });
  return putProfileFile(clientSlug, fileId, file);
}
export async function readReportPdf(clientSlug: string, fileId: string) {
  return getProfileFile(clientSlug, fileId);
}
export async function removeReportPdf(clientSlug: string, fileId: string) {
  return removeProfileFile(clientSlug, fileId).catch(() => undefined);
}
