import { notFound } from "next/navigation";
import { getClient } from "../../../../../os/selectors";
import { QuestionnairePrint } from "../../../../../os/knowledge/intake/questionnaire-print";
export const metadata = {
  title: "Cuestionario inicial · Avans",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ client: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { client: slug } = await params;
  const client = getClient(slug);
  if (!client) notFound();
  const { mode } = await searchParams;
  return (
    <QuestionnairePrint
      client={client}
      mode={mode === "filled" ? "filled" : "blank"}
    />
  );
}
