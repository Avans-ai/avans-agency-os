import { notFound } from "next/navigation";
import { Suspense } from "react";
import { V2Chrome } from "../../components/v2-chrome";
import { osProjects } from "../../os/os-data";
import { ProjectScreen } from "../../os/screens/project";
import { getClient, getProject } from "../../os/selectors";
import { OSSkeletonRows, osStyles as s } from "../../os/ui";

export function generateStaticParams() {
  return osProjects.map((project) => ({ project: project.slug }));
}

export default async function ProjectPage({ params }: { params: Promise<{ project: string }> }) {
  const { project: projectSlug } = await params;
  const project = getProject(projectSlug);
  if (!project) notFound();
  const client = getClient(project.clientSlug);

  return (
    <V2Chrome
      active="proyectos"
      title={project.name}
      legacy={false}
      crumbs={[
        { label: "Operaciones", href: "/v2/operaciones" },
        { label: "Clientes", href: "/v2/clientes" },
        { label: client?.name ?? "Cliente", href: `/v2/clientes/${project.clientSlug}` },
        { label: project.name },
      ]}
    >
      <Suspense fallback={<div className={s.page}><OSSkeletonRows rows={5} label="Cargando proyecto…" /></div>}>
        <ProjectScreen project={project} />
      </Suspense>
    </V2Chrome>
  );
}
