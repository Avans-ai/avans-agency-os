import { redirect } from "next/navigation";

/** Operaciones se unificó con Clientes (iteración 2): la cartera muestra los
 * proyectos, entregas, vencidas y bloqueos de cada cuenta. Los enlaces viejos a
 * `/v2/operaciones` siguen funcionando y conservan su query string. */
export default async function OperationsEntryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
  }
  const suffix = query.toString();
  redirect(suffix ? `/v2/clientes?${suffix}` : "/v2/clientes");
}
