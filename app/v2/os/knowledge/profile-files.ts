/** Local binary storage. It does not upload or synchronize files between users. */
export const PROFILE_FILE_LIMIT = 20 * 1024 * 1024;
const databaseName = "avans-os-client-files-v1";
function key(clientSlug: string, id: string) {
  if (!clientSlug || !id || clientSlug.includes(":")) throw new Error("Referencia de archivo inválida");
  return `${clientSlug}:${id}`;
}
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("No se pudo abrir el almacenamiento local de archivos."));
    request.onblocked = () => reject(new Error("Cerrá las otras pestañas para habilitar los archivos locales."));
  });
}
export function validateProfileFile(file: Pick<File, "size" | "name" | "type">) {
  if (!file.size) throw new Error("El archivo está vacío.");
  if (file.size > PROFILE_FILE_LIMIT) throw new Error("El archivo supera el máximo de 20 MB.");
  if (/\.(html?|xhtml|svg|js|mjs|exe|sh|bat|cmd|com|jar)$/i.test(file.name) || /html|javascript|svg\+xml/i.test(file.type))
    throw new Error("Este formato no se admite como material. Usá una imagen, documento, audio o video.");
}
export async function putProfileFile(clientSlug: string, id: string, file: File) {
  validateProfileFile(file);
  const fileKey = key(clientSlug, id), db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put(file, fileKey);
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(new Error("No se pudo guardar el archivo. Revisá el espacio del navegador."));
    });
    return { name: file.name, type: file.type, size: file.size };
  } finally { db.close(); }
}
export async function getProfileFile(clientSlug: string, id: string): Promise<Blob | null> {
  const fileKey = key(clientSlug, id), db = await openDatabase();
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const request = db.transaction("files", "readonly").objectStore("files").get(fileKey);
      request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
      request.onerror = () => reject(new Error("No se pudo leer el archivo local."));
    });
  } finally { db.close(); }
}
export async function removeProfileFile(clientSlug: string, id: string) {
  const fileKey = key(clientSlug, id), db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").delete(fileKey);
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(new Error("No se pudo quitar el archivo local."));
    });
  } finally { db.close(); }
}
