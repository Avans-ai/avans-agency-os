import { V2Chrome } from "../components/v2-chrome";
import { ProjectsScreen } from "../os/screens/lists";

export default function ProjectsPage() {
  return (
    <V2Chrome active="proyectos" title="Proyectos y tareas" legacy={false}>
      <ProjectsScreen />
    </V2Chrome>
  );
}
