"use client";
/**
 * Browser storage for generated presentations.
 *
 * The history record (manifest + data snapshot + file fingerprint) lives in
 * the client's knowledge state in localStorage. The PPTX bytes (~1 MB each)
 * never go to localStorage: they are cached in IndexedDB under the record id.
 * If the cache is missing (other browser, cleared data, private window) the
 * file is rebuilt from the stored manifest and the master, which yields the
 * same bytes; the SHA-256 in the record confirms it.
 */
import type { GenerationReport } from "../../../../../lib/pptx/generate";
import { TEMPLATE_URL } from "./pptx";

const DB_NAME = "avans-os-presentations";
const STORE = "files";

export type StoredPresentation = {
  bytes: Uint8Array;
  report: GenerationReport;
  savedAt: string;
};

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE))
          request.result.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function putPresentationFile(key: string, value: StoredPresentation) {
  const db = await openDb();
  if (!db) return false;
  return new Promise<boolean>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  }).finally(() => db.close());
}

export async function getPresentationFile(key: string): Promise<StoredPresentation | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise<StoredPresentation | null>((resolve) => {
    try {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      request.onsuccess = () => {
        const v = request.result as StoredPresentation | undefined;
        resolve(v && v.bytes instanceof Uint8Array ? v : null);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  }).finally(() => db.close());
}

let templatePromise: Promise<Uint8Array> | null = null;
/** Downloads the published master once per page load. */
export function loadTemplate(): Promise<Uint8Array> {
  templatePromise ??= fetch(TEMPLATE_URL, { cache: "force-cache" })
    .then(async (r) => {
      if (!r.ok)
        throw new Error(
          `No se pudo descargar la plantilla oficial (HTTP ${r.status}). Revisá la publicación de public/templates.`,
        );
      return new Uint8Array(await r.arrayBuffer());
    })
    .catch((error) => {
      templatePromise = null;
      throw error;
    });
  return templatePromise;
}

export function downloadBytes(bytes: Uint8Array, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
