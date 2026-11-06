import { V2Chrome } from "../components/v2-chrome";
import { ClientsRestructured } from "../os/screens/clients-restructured";

export default function ClientsPage() {
  return (
    <V2Chrome active="clientes" title="Clientes" legacy={false}>
      <ClientsRestructured />
    </V2Chrome>
  );
}
