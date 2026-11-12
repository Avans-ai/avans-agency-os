"use client";

import Link from "next/link";
import { BenchmarkView } from "../knowledge/benchmark-view";
import { PlanView } from "../knowledge/plan-view";
import { DocumentsView } from "../knowledge/documents-view";
import { MarketingDiscoveryView } from "./marketing-discovery";
import { AddServiceModuleButton } from "./service-modules-dialog";
import { GeneratePresentationButton } from "../knowledge/presentation/presentation-studio";
import { useState } from "react";
import type { ClientBenchmark } from "../../benchmark-data";
import { scopeForClient } from "../director-data";
import { serviceLabel, type OsClient } from "../os-data";
import { ClientReports } from "../reports/client-reports";
import { serviceHref } from "../service-workspace-data";
import { Badge } from "../ui";
import s from "../os.module.css";
import sc from "../screens.module.css";
import d from "./director-update.module.css";

export type ClientManagementView =
  "ficha" | "benchmark" | "plan" | "reportes" | "documentos";

function complianceTone(status: string) {
  if (status === "Cumplido") return "cool" as const;
  if (status === "Atención") return "peach" as const;
  return "stone" as const;
}

export function ClientManagementContent({
  client,
  view,
}: {
  client: OsClient;
  view: ClientManagementView;
  benchmark?: ClientBenchmark;
}) {
  if (view === "ficha") return <ClientSheet client={client} />;
  if (view === "benchmark")
    return (
      <BenchmarkView
        key={client.slug}
        client={client}
        headerActions={<GeneratePresentationButton client={client} small />}
      />
    );
  if (view === "plan")
    return (
      <PlanView
        key={client.slug}
        client={client}
        headerActions={<GeneratePresentationButton client={client} small />}
        manageModules={
          <AddServiceModuleButton
            client={client}
            label="Gestionar módulos"
            variant="secondary"
          />
        }
      />
    );
  if (view === "reportes") return <ClientReports client={client} />;
  return <DocumentsView key={client.slug} client={client} />;
}

function ClientSheet({ client }: { client: OsClient }) {
  const [tab, setTab] = useState<"scope" | "business">("scope");
  const scope = scopeForClient(client);

  return (
    <div className={sc.stack}>
      <div className={s.pageHead}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>
            Ficha del cliente
          </h2>
          <p>
            Alcance contratado e información estructurada del negocio según el
            modelo de Discovery.
          </p>
        </div>
      </div>
      <div
        className={d.managementTabs}
        role="tablist"
        aria-label="Secciones de la ficha"
        onKeyDown={(event) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            const next =
              event.key === "Home"
                ? "scope"
                : event.key === "End"
                  ? "business"
                  : tab === "scope"
                    ? "business"
                    : "scope";
            setTab(next);
            document.getElementById(`sheet-tab-${next}`)?.focus();
          }
        }}
      >
        <button
          type="button"
          role="tab"
          id="sheet-tab-scope"
          aria-controls="sheet-panel"
          tabIndex={tab === "scope" ? 0 : -1}
          aria-selected={tab === "scope"}
          onClick={() => setTab("scope")}
        >
          Alcance del servicio
        </button>
        <button
          type="button"
          role="tab"
          id="sheet-tab-business"
          aria-controls="sheet-panel"
          tabIndex={tab === "business" ? 0 : -1}
          aria-selected={tab === "business"}
          onClick={() => setTab("business")}
        >
          Discovery del negocio
        </button>
      </div>

      <div
        id="sheet-panel"
        role="tabpanel"
        aria-labelledby={`sheet-tab-${tab}`}
        className={sc.stack}
      >
        {tab === "scope" ? (
          <>
            <section className={d.scopeGrid} aria-label="Alcance por módulo">
              {scope.map((item) => (
                <article className={d.scopeCard} key={item.serviceId}>
                  <div className={d.scopeHead}>
                    <strong>{serviceLabel(item.serviceId)}</strong>
                    <Badge tone={complianceTone(item.compliance)}>
                      {item.compliance}
                    </Badge>
                  </div>
                  <p>{item.summary}</p>
                  <span className={s.cellSub}>{item.cadence}</span>
                  <ul className={d.scopeList}>
                    {item.deliverables.map((deliverable) => (
                      <li key={deliverable}>{deliverable}</li>
                    ))}
                  </ul>
                  {item.alert ? (
                    <div className={d.scopeAlert}>
                      <strong>Revisión de alcance:</strong> {item.alert}
                    </div>
                  ) : null}
                  <Link
                    className={s.link}
                    href={serviceHref(client.slug, item.serviceId)}
                  >
                    Abrir módulo
                  </Link>
                </article>
              ))}
            </section>
            <p className={s.demoNote}>
              La revisión periódica del alcance está representada con reglas y
              alertas de demostración. Para informar incumplimientos reales
              deberá comparar entregables persistidos, fechas y alcance
              contractual.
            </p>
          </>
        ) : (
          <MarketingDiscoveryView
            key={client.slug}
            client={client}
            headerActions={<GeneratePresentationButton client={client} small />}
          />
        )}
      </div>
    </div>
  );
}
