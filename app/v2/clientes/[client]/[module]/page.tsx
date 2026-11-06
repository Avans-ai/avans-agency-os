import { notFound, redirect } from "next/navigation";
import { V2Chrome } from "../../../components/v2-chrome";
import { osClients } from "../../../os/os-data";
import { ClientServiceWorkspace } from "../../../os/screens/client-service-workspace";
import { serviceWorkspaceByRoute, serviceWorkspaces } from "../../../os/service-workspace-data";
import { getClient } from "../../../os/selectors";

export function generateStaticParams() {
  return osClients.flatMap((client) => [
    ...serviceWorkspaces.map((service) => ({ client: client.slug, module: service.route })),
    { client: client.slug, module: "reportes" },
  ]);
}

export default async function ClientServicePage({ params }: { params: Promise<{ client: string; module: string }> }) {
  const { client: clientSlug, module: moduleSlug } = await params;
  const client = getClient(clientSlug);
  if (!client) notFound();

  if (moduleSlug === "reportes") {
    redirect(`/v2/clientes/${client.slug}?view=reportes`);
  }

  const service = serviceWorkspaceByRoute(moduleSlug);
  if (!service) notFound();

  return (
    <V2Chrome
      active="clientes"
      title={`${client.name} · ${service.label}`}
      legacy={false}
      crumbs={[
        { label: "Operaciones", href: "/v2/clientes" },
        { label: "Clientes", href: "/v2/clientes" },
        { label: client.name, href: `/v2/clientes/${client.slug}` },
        { label: service.label },
      ]}
    >
      <ClientServiceWorkspace client={client} service={service} />
    </V2Chrome>
  );
}
