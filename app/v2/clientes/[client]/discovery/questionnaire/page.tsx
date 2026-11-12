import { notFound, redirect } from "next/navigation";
import { osClients } from "../../../../os/os-data";
import { getClient } from "../../../../os/selectors";

export function generateStaticParams() {
  return osClients.map((client) => ({ client: client.slug }));
}

/** Compatibility: the questionnaire used to live inside the Discovery. */
export default async function LegacyQuestionnairePage({ params }: { params: Promise<{ client: string }> }) {
  const { client: slug } = await params;
  if (!getClient(slug)) notFound();
  redirect(`/v2/clientes/${slug}?view=cuestionario`);
}
