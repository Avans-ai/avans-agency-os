import { V2Chrome } from "../components/v2-chrome";
import { ProvidersCatalogScreen } from "../os/providers-view";

/** Personas y Cultura (RRHH) · Catálogo de proveedores audiovisuales. */
export default function ProvidersCatalogPage() {
  return (
    <V2Chrome active="proveedores" title="Catálogo de proveedores" legacy={false}>
      <ProvidersCatalogScreen />
    </V2Chrome>
  );
}
