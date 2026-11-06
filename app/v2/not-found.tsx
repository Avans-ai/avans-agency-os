import { V2Chrome } from "./components/v2-chrome";
import { LinkButton, OSEmptyState, osStyles as s } from "./os/ui";

export default function V2NotFound() {
  return (
    <V2Chrome active="command-center" title="No encontrado" legacy={false} crumbs={[{ label: "Inicio", href: "/v2" }, { label: "No encontrado" }]}>
      <div className={s.page}>
        <OSEmptyState icon="busqueda" title="No encontramos esta página" actions={<><LinkButton href="/v2" variant="primary" small>Ir a Inicio</LinkButton><LinkButton href="/v2/clientes" small>Ver clientes</LinkButton></>}>
          Puede que el enlace sea viejo o que la ficha todavía no exista en la demo.
        </OSEmptyState>
      </div>
    </V2Chrome>
  );
}
