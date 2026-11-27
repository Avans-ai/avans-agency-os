import { V2Chrome } from "../components/v2-chrome";
import { MyTasksScreen } from "../os/screens/lists";

export default function MyTasksPage() {
  return (
    <V2Chrome active="mis-tareas" title="Mis tareas" legacy={false}>
      <MyTasksScreen />
    </V2Chrome>
  );
}
