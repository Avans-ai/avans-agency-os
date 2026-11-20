"use client";

/* Publicidad digital (Funcionalidades 2): punto de entrada de las secciones del módulo.
 * Inicio (paid-home), Plan de medios (paid-plan), Campañas en dos instancias
 * (paid-campaigns + paid-wizard), Anuncios y piezas con su flujo (paid-ads),
 * Optimización y Resultados. Métricas DE DEMOSTRACIÓN; ninguna plataforma conectada. */
import type { OsClient } from "../os-data";
import { CollectionView } from "./collection-view";
import { Strip } from "./module-ui";
import { paidLearnings, paidOptimizations } from "./paid-collections";
import { PaidReportView } from "../reports/report-views";
import { usePaidReport } from "../reports/use-report-data";
import { useModuleRecords } from "./store";
import m from "./modules.module.css";

export { PaidHome } from "./paid-home";
export { MediaPlanSection } from "./paid-plan";
export { CampaignsSection } from "./paid-campaigns";
export { AdsSection } from "./paid-ads";
export { PlatformsPanel as IntegrationsPanel } from "./paid-ui";

const SERVICE = "publicidad-digital" as const;

export function OptimizationSection({ client, editable }: { client: OsClient; editable: boolean }) {
  const { data } = useModuleRecords(client.slug, SERVICE, ["optimizaciones"]);
  const records = data.optimizaciones ?? [];
  const count = (state: string) => records.filter((record) => record.values.estado === state).length;
  return (
    <div className={m.stack}>
      <Strip label="Estado del registro de optimización" items={[
        { label: "Propuestas", value: count("Propuesta") },
        { label: "Aplicadas", value: count("Aplicada") },
        { label: "En evaluación", value: count("En evaluación") },
        { label: "Validadas", value: count("Validada") },
        { label: "Descartadas", value: count("Descartada") },
      ]} />
      <CollectionView client={client} serviceId={SERVICE} def={paidOptimizations} editable={editable} />
    </div>
  );
}

export function PaidResultsSection({ client, editable }: { client: OsClient; editable: boolean }) {
  const report = usePaidReport(client);
  return (
    <div className={m.stack}>
      <PaidReportView report={report} clientSlug={client.slug} embedded />
      <CollectionView client={client} serviceId={SERVICE} def={paidLearnings} editable={editable} />
    </div>
  );
}
