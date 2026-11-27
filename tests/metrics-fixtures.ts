/* Entrada de métricas armada con las semillas de demostración de cada módulo (lo mismo que
 * ve un navegador sin cambios guardados). Solo para pruebas de dominio. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tasksForClient } from "../app/v2/os/director-data";
import { METRIC_COLLECTIONS, taskLite, type MetricsInput } from "../app/v2/os/metrics/input";
import { AV_DEMO_QUOTAS } from "../app/v2/os/modules/av-demo";
import { emptyQuota } from "../app/v2/os/modules/av-model";
import { seedRecords } from "../app/v2/os/modules/store";
import { osTasks, type OsTask, type ServiceId } from "../app/v2/os/os-data";

export function seedMetricsInput(slug: string, tasks: OsTask[] = osTasks): MetricsInput {
  const records: MetricsInput["records"] = {};
  for (const [serviceId, collections] of Object.entries(METRIC_COLLECTIONS) as [ServiceId, string[]][]) {
    records[serviceId] = Object.fromEntries(collections.map((collection) => [collection, seedRecords(slug, serviceId, collection)]));
  }
  return { clientSlug: slug, tasks: tasksForClient(tasks, slug).map(taskLite), records, quota: AV_DEMO_QUOTAS[slug] ?? emptyQuota(slug) };
}

export function pdfAssets() {
  const root = join(__dirname, "..", "public");
  return {
    regular: new Uint8Array(readFileSync(join(root, "fonts/figtree/Figtree-Regular.ttf"))),
    medium: new Uint8Array(readFileSync(join(root, "fonts/figtree/Figtree-Medium.ttf"))),
    bold: new Uint8Array(readFileSync(join(root, "fonts/figtree/Figtree-Bold.ttf"))),
    logo: new Uint8Array(readFileSync(join(root, "avans-master-logo.png"))),
  };
}
