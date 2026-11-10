import { V2Chrome } from "../components/v2-chrome";
import { OperationsOverview } from "../os/screens/operations-overview";

export default function OperationsEntryPage() {
  return (
    <V2Chrome active="operaciones" title="Operaciones" legacy={false}>
      <OperationsOverview />
    </V2Chrome>
  );
}
