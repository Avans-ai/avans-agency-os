import { Suspense } from "react";
import { ProviderSpace } from "../os/modules/av-provider-space";

/** Espacio del proveedor externo: solo sus jornadas (vista previa local, sin acceso autenticado). */
export default function ProviderSpacePage() {
  return <Suspense fallback={<p>Cargando tus jornadas…</p>}><ProviderSpace /></Suspense>;
}
