"use client";

import Link from "next/link";
import { V2Chrome } from "./components/v2-chrome";
import { Glyph } from "./os/glyphs";
import { buttonClass, OSInlineAlert, osStyles as s } from "./os/ui";

export default function V2Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <V2Chrome active="command-center" title="Error" legacy={false} crumbs={[{ label: "Inicio", href: "/v2" }, { label: "Error" }]}>
      <div className={s.page}>
        <OSInlineAlert title="No pudimos cargar esta pantalla.">Lo que ya cargaste en esta sesión no se perdió. Probá de nuevo o volvé a Inicio.</OSInlineAlert>
        <div className={s.actions}>
          <button type="button" className={buttonClass("dark")} onClick={reset}><Glyph name="retry" size={16} />Reintentar</button>
          <Link className={s.link} href="/v2">Volver a Inicio</Link>
        </div>
        {error.digest ? <p className={s.demoNote}>Detalle técnico: {error.digest}</p> : null}
      </div>
    </V2Chrome>
  );
}
