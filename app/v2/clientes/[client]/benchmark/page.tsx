import { notFound } from "next/navigation";
import { clientDepthData } from "../../../client-depth-data";
import { getClientBenchmark } from "../../../benchmark-data";
import { BenchmarkHub } from "../../../components/benchmark-hub";
import { V2Chrome } from "../../../components/v2-chrome";

export function generateStaticParams() {
  return clientDepthData.map((client) => ({ client: client.slug }));
}

export default async function ClientBenchmarkPage({ params }: { params: Promise<{ client: string }> }) {
  const { client } = await params;
  const account = clientDepthData.find((item) => item.slug === client);
  const benchmark = getClientBenchmark(client);
  if (!account || !benchmark) notFound();

  return (
    <V2Chrome active="clientes" title={`${account.name} · Benchmark`}>
      <BenchmarkHub clientSlug={client} />
    </V2Chrome>
  );
}
