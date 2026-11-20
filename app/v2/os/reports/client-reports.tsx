"use client";

/* Reportes del cliente (acceso «Reportes» de la ficha).
 * Cuatro reportes de ejemplo completos, construidos con builders puros a partir de
 * las tareas reales del store, los objetos de los módulos y fixtures DEMO rotulados.
 * Solo se ofrecen los reportes de módulos activos para el cliente (servicesOf). */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { directorMeta } from "../director-data";
import type { OsClient, ServiceId } from "../os-data";
import { Badge, OSEmptyState } from "../ui";
import s from "../os.module.css";
import sc from "../screens.module.css";
import { ContentReportView, MonthlyReportView, PaidReportView, WeeklyReportView } from "./report-views";
import { useClientReports } from "./use-report-data";
import r from "./reports.module.css";

type ReportId = "semanal" | "mensual" | "publicidad" | "contenidos";

function reportTone(status: string) {
  if (status === "Listo") return "cool" as const;
  if (status === "En preparación") return "peach" as const;
  return "stone" as const;
}

export function ClientReports({ client }: { client: OsClient }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [moduleFilter, setModuleFilter] = useState<ServiceId | "todos">("todos");
  const { activeServices, weekly, monthly, paid, content } = useClientReports(client, moduleFilter);
  const meta = directorMeta(client.slug);

  const options: { id: ReportId; label: string; detail: string }[] = [
    { id: "semanal", label: "Semanal operativo", detail: "Tareas, entregables, bloqueos y próximos pasos" },
    { id: "mensual", label: "Mensual de resultados", detail: "Objetivos, indicadores y comparativa" },
    ...(activeServices.includes("publicidad-digital") ? [{ id: "publicidad" as const, label: "Publicidad digital", detail: "Inversión, leads, CPL y campañas" }] : []),
    ...(activeServices.includes("contenidos") ? [{ id: "contenidos" as const, label: "Contenidos", detail: "Producción, alcance y formatos" }] : []),
  ];
  const requested = params.get("reporte") as ReportId | null;
  const selected: ReportId = options.some((option) => option.id === requested) ? requested! : "semanal";

  function select(id: ReportId) {
    const next = new URLSearchParams(params.toString());
    next.set("reporte", id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div className={sc.stack}>
      <div className={s.pageHead}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Reportes</h2>
          <p>Reportes de ejemplo completos construidos desde las tareas y los objetos de los módulos activos, complementados con métricas de demostración rotuladas.</p>
        </div>
      </div>

      <div className={r.reportShell}>
        <div className={r.picker} role="group" aria-label="Elegir reporte">
          {options.map((option) => (
            <button key={option.id} type="button" aria-pressed={selected === option.id} onClick={() => select(option.id)}>
              <strong>{option.label}</strong>
              <span>{option.detail}</span>
            </button>
          ))}
        </div>

        {selected === "semanal" ? <WeeklyReportView report={weekly} clientSlug={client.slug} onModuleChange={setModuleFilter} /> : null}
        {selected === "mensual" ? <MonthlyReportView report={monthly} clientSlug={client.slug} /> : null}
        {selected === "publicidad" ? <PaidReportView report={paid} clientSlug={client.slug} /> : null}
        {selected === "contenidos" ? <ContentReportView report={content} clientSlug={client.slug} /> : null}
      </div>

      <section className={s.surface} aria-labelledby="report-schedule">
        <div className={s.cardHead}><h3 id="report-schedule">Cadencia de entrega</h3><span className={s.cardMeta}>Datos de demostración</span></div>
        <div className={sc.cardBody}>
          {meta?.reports.length ? (
            <div className={r.schedule}>
              {meta.reports.map((report) => (
                <div className={r.scheduleRow} key={report.id}>
                  <span><strong style={{ fontWeight: 500 }}>{report.label}</strong></span>
                  <span className={s.cellSub}>{report.type} · {report.period}</span>
                  <Badge tone={reportTone(report.state)}>{report.state}</Badge>
                </div>
              ))}
            </div>
          ) : <OSEmptyState icon="datos" title="Sin reportes configurados" />}
          <p className={s.demoNote} style={{ margin: 0 }}>
            Los reportes se arman en la plataforma con las tareas guardadas en este navegador y fixtures de demostración. La generación automática y el envío al cliente necesitan persistencia multiusuario, integraciones conectadas y una plantilla aprobada.
          </p>
        </div>
      </section>
    </div>
  );
}
