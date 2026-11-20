import { V2Chrome } from "../components/v2-chrome";
import { SettingsScreen } from "../os/screens/settings";

export default function SettingsPage() {
  return (
    <V2Chrome active="configuracion" title="Configuración" legacy={false}>
      <SettingsScreen />
    </V2Chrome>
  );
}
