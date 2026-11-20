import { notFound } from "next/navigation";
import { Suspense } from "react";
import { osClients } from "../../os/os-data";
import { ClientPortal } from "../../os/portal/client-portal";

export function generateStaticParams() {
  return osClients.map((client) => ({ client: client.slug }));
}

export default async function PortalPage({ params }: { params: Promise<{ client: string }> }) {
  const { client: slug } = await params;
  const client = osClients.find((item) => item.slug === slug);
  if (!client) notFound();
  return <Suspense fallback={<p>Cargando tus contenidos…</p>}><ClientPortal client={client} /></Suspense>;
}
