import { unzipSync, zipSync, strFromU8, strToU8, type Zippable } from "fflate";

/** An OOXML package: part name (no leading slash) → bytes, in archive order. */
export type PackageFiles = Map<string, Uint8Array>;

export const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

const MAX_PARTS = 4000;
const MAX_UNCOMPRESSED = 200 * 1024 * 1024;

export function readZip(bytes: Uint8Array): PackageFiles {
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b)
    throw new Error("El archivo no es un paquete ZIP/OOXML.");
  let total = 0;
  let count = 0;
  const entries = unzipSync(bytes, {
    filter: (file) => {
      count++;
      total += file.originalSize;
      if (count > MAX_PARTS || total > MAX_UNCOMPRESSED)
        throw new Error("El paquete excede los límites de lectura.");
      return !file.name.endsWith("/");
    },
  });
  return new Map(Object.entries(entries));
}

const STORED = /\.(png|jpe?g|gif|webp|fntdata|odttf|ttf|mp4|m4a)$/i;

/**
 * Writes a deterministic package: `[Content_Types].xml` first (required by
 * some readers), fixed timestamps, images and fonts stored without
 * recompression.
 */
export function writeZip(files: PackageFiles, mtime = new Date("2026-01-01T00:00:00Z")): Uint8Array {
  const zippable: Zippable = {};
  const names = [...files.keys()].sort((a, b) =>
    a === "[Content_Types].xml" ? -1 : b === "[Content_Types].xml" ? 1 : 0,
  );
  for (const name of names)
    zippable[name] = [
      files.get(name)!,
      { level: STORED.test(name) ? 0 : 6, mtime },
    ];
  return zipSync(zippable);
}

export const readText = (files: PackageFiles, name: string) => {
  const bytes = files.get(name);
  if (!bytes) throw new Error(`Falta la parte ${name} en la plantilla.`);
  return strFromU8(bytes);
};
export const writeText = (files: PackageFiles, name: string, text: string) =>
  files.set(name, strToU8(text));
