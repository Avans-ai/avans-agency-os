import { BenchmarkHub } from "../components/benchmark-hub";
import { V2Chrome } from "../components/v2-chrome";

export default function BenchmarkPage() {
  return (
    <V2Chrome active="clientes" title="Benchmark y competencia">
      <BenchmarkHub />
    </V2Chrome>
  );
}
