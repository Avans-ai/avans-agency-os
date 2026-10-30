import { CommandCenterHub } from "./components/command-center-hub";
import { V2Chrome } from "./components/v2-chrome";

export default function V2Page() {
  return (
    <V2Chrome active="command-center" title="Command Center">
      <CommandCenterHub />
    </V2Chrome>
  );
}
