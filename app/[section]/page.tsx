import { notFound } from "next/navigation";
import { AgencyOS } from "../components/agency-os";
import { sections } from "../data";

export function generateStaticParams() {
  return sections.filter((item) => item.slug !== "dashboard").map(({ slug }) => ({ section: slug }));
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.some((item) => item.slug === section) || section === "dashboard") notFound();
  return <AgencyOS section={section} />;
}
