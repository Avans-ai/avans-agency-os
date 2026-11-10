import { notFound, redirect } from "next/navigation";
import { V2Chrome } from "../../../components/v2-chrome";
import { osClients } from "../../../os/os-data";
import { ClientServiceWorkspace } from "../../../os/screens/client-service-workspace";
import { ClientTasksWorkspace } from "../../../os/screens/client-tasks-workspace";
import { serviceWorkspaceByRoute, serviceWorkspaces } from "../../../os/service-workspace-data";
import { getClient } from "../../../os/selectors";

export function generateStaticParams() {
  return osClients.flatMap((client) => [
    ...serviceWorkspaces.map((service) => ({ client: client.slug, module: service.route })),
    { client: client.slug, module: "tareas" },
    { client: client.slug, module: "reportes" },
  ]);
}

export default async function ClientServicePage({ params }: { params: Promise<{ client: string; module: string }> }) {
  const { client: clientSlug, module: moduleSlug } = await params;
  const client = getClient(clientSlug);
  if (!client) notFound();

  if (moduleSlug === "reportes") redirect(`/v2/clientes/${client.slug}?view=reportes`);

  if (moduleSlug === "tareas") {
    return (
      <V2Chrome
        active="clientes"
        title={`${client.name} · Tareas`}
        legacy={false}
        crumbs={[
          { label: "Operaciones", href: "/v2/operaciones" },
          { label: "Clientes", href: "/v2/clientes" },
          { label: client.name, href: `/v2/clientes/${client.slug}` },
          { label: "Tareas" },
        ]}
      >
        <ClientTasksWorkspace client={client} />
      </V2Chrome>
    );
  }

  const service = serviceWorkspaceByRoute(moduleSlug);
  if (!service) notFound();

  const content = service.id === "contenidos"
    ? <ClientTasksWorkspace client={client} lockedServiceId="contenidos" title="Contenidos" />
    : <ClientServiceWorkspace client={client} service={service} />;

  return (
    <V2Chrome
      active="clientes"
      title={`${client.name} · ${service.label}`}
      legacy={false}
      crumbs={[
        { label: "Operaciones", href: "/v2/operaciones" },
        { label: "Clientes", href: "/v2/clientes" },
        { label: client.name, href: `/v2/clientes/${client.slug}` },
        { label: service.label },
      ]}
    >
      {content}
    </V2Chrome>
  );
}
