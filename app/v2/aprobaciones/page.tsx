import { V2Chrome } from "../components/v2-chrome";
import { ApprovalsScreen } from "../os/screens/lists";

export default function ApprovalsPage() {
  return (
    <V2Chrome active="aprobaciones" title="Aprobaciones" legacy={false}>
      <ApprovalsScreen />
    </V2Chrome>
  );
}
