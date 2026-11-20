"use client";

import Link from "next/link";
import { ProfileLibrary } from "../knowledge/profile-library";
import { ProfileProducts } from "../knowledge/profile-products";
import { ProfileGlossary } from "../knowledge/profile-glossary";
import { BenchmarkView } from "../knowledge/benchmark-view";
import { PlanView } from "../knowledge/plan-view";
import { DocumentsView } from "../knowledge/documents-view";
import { MarketingDiscoveryView } from "./marketing-discovery";
import { AddServiceModuleButton } from "./service-modules-dialog";
import { GeneratePresentationButton } from "../knowledge/presentation/presentation-studio";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { QuestionnaireView } from "../knowledge/questionnaire-view";
import { useOsStore } from "../os-store";
import { canManageClient } from "../director-data";
import type { ClientBenchmark } from "../../benchmark-data";
import { scopeForClient } from "../director-data";
import { serviceLabel, type OsClient } from "../os-data";
import { ClientReports } from "../reports/client-reports";
import { serviceHref } from "../service-workspace-data";
import { Badge, LinkButton } from "../ui";
import s from "../os.module.css";
import sc from "../screens.module.css";
import d from "./director-update.module.css";

export type ClientManagementView =
  "ficha" | "cuestionario" | "benchmark" | "plan" | "reportes" | "documentos";

/** Shareable URLs of the client sheet: scope, Discovery and the questionnaire. */
export function questionnaireHref(slug: string) {
  return `/v2/clientes/${slug}?view=cuestionario`;
}
export function discoveryHref(slug: string, anchor?: string) {
  return `/v2/clientes/${slug}?view=ficha&ficha=discovery${anchor ? `#${anchor}` : ""}`;
}

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
  if (view === "cuestionario") return <ClientQuestionnaire client={client} />;
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
  const params = useSearchParams();
  const router = useRouter();
  const sheetTabs = [
    { id: "scope", param: "alcance", label: "Alcance del servicio" },
    { id: "business", param: "discovery", label: "Discovery del negocio" },
    { id: "materials", param: "materiales", label: "Materiales" },
    { id: "products", param: "productos", label: "Productos y servicios" },
    { id: "glossary", param: "glosario", label: "Glosario" },
  ] as const;
  type SheetTab = typeof sheetTabs[number]["id"];
  const tab: SheetTab = sheetTabs.find(item => item.param === params.get("ficha"))?.id ?? "scope";
  const scope = scopeForClient(client);
  function setTab(next: SheetTab) {
    const url = new URL(window.location.href);
    url.searchParams.set("ficha", sheetTabs.find(item => item.id === next)!.param);
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }
  // Earlier links pointed to the questionnaire as the first Discovery chapter.
  useEffect(() => {
    if (window.location.hash === "#discovery-cuestionario") router.replace(questionnaireHref(client.slug));
  }, [client.slug, router]);

  return (
    <div className={sc.stack}>
      <div className={s.pageHead}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>
            Ficha del cliente
          </h2>
          <p>
            Conocimiento del negocio, materiales, productos y voz de marca.
          </p>
        </div>
        <div className={s.actions}>
          <LinkButton href={questionnaireHref(client.slug)} variant="primary" icon="registro">
            Cuestionario inicial
          </LinkButton>
        </div>
      </div>
      <div
        className={d.managementTabs}
        role="tablist"
        aria-label="Secciones de la ficha"
        onKeyDown={(event) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            const index = sheetTabs.findIndex(item => item.id === tab);
            const target = event.key === "Home" ? 0 : event.key === "End" ? sheetTabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + sheetTabs.length) % sheetTabs.length;
            const next = sheetTabs[target].id;
            setTab(next);
            document.getElementById(`sheet-tab-${next}`)?.focus();
          }
        }}
      >
        {sheetTabs.map(item => <button key={item.id} type="button" role="tab" id={`sheet-tab-${item.id}`} aria-controls="sheet-panel" tabIndex={tab === item.id ? 0 : -1} aria-selected={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}
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
        ) : tab === "materials" ? <ProfileLibrary client={client} /> : tab === "products" ? <ProfileProducts client={client} /> : tab === "glossary" ? <ProfileGlossary client={client} /> : (
          <MarketingDiscoveryView
            key={client.slug}
            client={client}
            headerActions={
              <>
                <LinkButton href={questionnaireHref(client.slug)} small>
                  Cuestionario inicial
                </LinkButton>
                <GeneratePresentationButton client={client} small />
              </>
            }
          />
        )}
      </div>
    </div>
  );
}

/** Information gathering tool. Its validated answers build the Discovery;
 * both share one knowledge model, so nothing is duplicated. */
function ClientQuestionnaire({ client }: { client: OsClient }) {
  const { role } = useOsStore();
  const editable = canManageClient(role, client.slug);
  return (
    <div className={sc.stack}>
      <div className={s.pageHead}>
        <div>
          <span className={d.managementLabel}>Ficha del cliente · Relevamiento</span>
          <h2 style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 500 }}>
            Cuestionario inicial
          </h2>
          <p>
            Herramienta para recopilar información: cargá documentos, pegá
            textos o sumá fuentes, revisá las sugerencias y validá las
            respuestas. Cuestionario inicial → respuestas validadas →
            Discovery estructurado.
          </p>
        </div>
        <div className={s.actions}>
          <LinkButton href={discoveryHref(client.slug)} variant="dark" small>
            Ver Discovery generado
          </LinkButton>
        </div>
      </div>
      {editable ? (
        <QuestionnaireView key={client.slug} client={client} embedded />
      ) : (
        <p className={s.demoNote}>
          El cuestionario está disponible para el administrador y el PM
          asignado. Podés consultar el Discovery generado.
        </p>
      )}
    </div>
  );
}
