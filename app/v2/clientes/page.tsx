import { V2Chrome } from "../components/v2-chrome";
import { ClientsScreen } from "../os/screens/clients";

export default function ClientsPage() {
  return (
    <V2Chrome active="clientes" title="Clientes" legacy={false}>
      <ClientsScreen />
    </V2Chrome>
  );
}
