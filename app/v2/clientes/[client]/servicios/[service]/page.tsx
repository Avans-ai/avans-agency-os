import { notFound } from "next/navigation";
import { V2Chrome } from "../../../../components/v2-chrome";
import { osClients } from "../../../../os/os-data";
import { ServiceOperations } from "../../../../os/service-operations";
import type { WorkflowService } from "../../../../os/service-process-data";

const serviceIds: WorkflowService[] = ["contenidos","audiovisuales"];
export function generateStaticParams() {
  return osClients.flatMap(client => serviceIds.map(service => ({ client:client.slug, service })));
}
export default async function ClientServicePage({ params }: { params:Promise<{ client:string; service:string }> }) {
  const {client:slug,service} = await params;
  const client = osClients.find(item=>item.slug===slug);
  if (!client || (service!=="contenidos" && service!=="audiovisuales")) notFound();
  return <V2Chrome active="clientes" title={`${client.name} · ${service==="contenidos"?"Contenidos":"Audiovisuales"}`}
   crumbs={[{label:"Operaciones",href:"/v2/operaciones"},{label:"Clientes",href:"/v2/clientes"},{label:client.name,href:`/v2/clientes/${client.slug}?tab=servicios`},{label:service==="contenidos"?"Contenidos":"Audiovisuales"}]}>
    <ServiceOperations client={client} service={service}/>
  </V2Chrome>;
}
