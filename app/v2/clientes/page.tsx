import { Suspense } from "react";
import { V2Chrome } from "../components/v2-chrome";
import { ClientsRestructured } from "../os/screens/clients-restructured";
import { OSSkeletonRows } from "../os/ui";

export default function ClientsPage() {
  return (
    <V2Chrome active="clientes" title="Clientes" legacy={false}>
      <Suspense fallback={<OSSkeletonRows rows={5} label="Cargando clientes…" />}>
        <ClientsRestructured />
      </Suspense>
    </V2Chrome>
  );
}
