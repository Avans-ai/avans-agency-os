import { V2Chrome } from "./components/v2-chrome";
import { CommandCenter } from "./os/screens/command-center";

export default function V2Page() {
  return (
    <V2Chrome active="command-center" title="Inicio" legacy={false}>
      <CommandCenter />
    </V2Chrome>
  );
}
