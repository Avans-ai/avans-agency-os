import { notFound, redirect } from "next/navigation";
import { osClients } from "../../../os/os-data";
import { getClient } from "../../../os/selectors";

export function generateStaticParams() {
  return osClients.map((client) => ({ client: client.slug }));
}

/** Shareable route of the continuous Discovery document. */
export default async function ClientDiscoveryPage({ params }: { params: Promise<{ client: string }> }) {
  const { client: slug } = await params;
  if (!getClient(slug)) notFound();
  redirect(`/v2/clientes/${slug}?view=ficha&ficha=discovery`);
}
