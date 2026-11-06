import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getClientBenchmark } from "../../benchmark-data";
import { getClientDepth } from "../../client-depth-data";
import { V2Chrome } from "../../components/v2-chrome";
import { osClients } from "../../os/os-data";
import { ClientProfile } from "../../os/screens/client-profile";
import { getClient } from "../../os/selectors";
import { OSSkeletonRows } from "../../os/ui";

export function generateStaticParams() {
  return osClients.map((client) => ({ client: client.slug }));
}

export default async function ClientProfilePage({ params }: { params: Promise<{ client: string }> }) {
  const { client: clientSlug } = await params;
  const client = getClient(clientSlug);
  if (!client) notFound();

  return (
    <V2Chrome
      active="clientes"
      title={client.name}
      legacy={false}
      crumbs={[{ label: "Operaciones", href: "/v2/operaciones" }, { label: "Clientes", href: "/v2/clientes" }, { label: client.name }]}
    >
      <Suspense fallback={<OSSkeletonRows rows={4} label="Cargando ficha…" />}>
        <ClientProfile client={client} depth={getClientDepth(client.slug)} benchmark={getClientBenchmark(client.slug)} />
      </Suspense>
    </V2Chrome>
  );
}
