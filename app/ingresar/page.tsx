/* Ingreso a Avans OS. Google @avans.agency para el equipo; personas invitadas
 * (clientes y proveedores) ingresan con la cuenta a la que se envió la invitación. */
import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import Link from "next/link";
import "../v2/os/tokens.css";
import { authMode, LOGIN_MESSAGES } from "../../lib/auth/config";
import { safeReturnPath } from "../v2/os/navigation/return-path";
import s from "./ingresar.module.css";

const figtree = Figtree({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], display: "swap", variable: "--font-figtree" });

export const metadata: Metadata = { title: { absolute: "Ingresar · Avans OS" }, robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const pick = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);
  const mode = authMode();
  const volver = safeReturnPath(pick("volver")) ?? "/v2";
  const errorKey = pick("error");
  const reason = pick("motivo");
  const error = errorKey ? LOGIN_MESSAGES[errorKey] ?? LOGIN_MESSAGES.callback : undefined;
  const info = !error && reason ? LOGIN_MESSAGES[reason] : undefined;

  return (
    <main className={`${figtree.variable} ${s.page}`}>
      <section className={s.card} aria-labelledby="ingresar-titulo">
        <p className={s.eyebrow}>Avans OS</p>
        <h1 id="ingresar-titulo">Ingresar</h1>
        {error ? <p className={s.error} role="alert">{error}</p> : null}
        {info ? <p className={s.info} role="status">{info}</p> : null}

        {mode === "preview" ? (
          <>
            <p className={s.muted}>Este entorno es una preview: no exige ingreso y los datos son de demostración, guardados solo en este navegador.</p>
            <Link className={s.primary} href={volver}>Ir a Avans OS</Link>
          </>
        ) : mode === "misconfigured" ? (
          <p className={s.muted}>{LOGIN_MESSAGES["no-configurado"]} El acceso queda bloqueado hasta que un administrador complete la configuración.</p>
        ) : (
          <>
            <form method="post" action="/auth/login" className={s.form}>
              <input type="hidden" name="volver" value={volver} />
              <button type="submit" className={s.primary}>Ingresar con Google (@avans.agency)</button>
            </form>
            <form method="post" action="/auth/login" className={s.form}>
              <input type="hidden" name="volver" value={volver} />
              <input type="hidden" name="tipo" value="invitado" />
              <button type="submit" className={s.secondary}>Soy cliente o proveedor invitado</button>
            </form>
            <p className={s.muted}>Si perdiste el acceso a tu cuenta de Google, recuperala desde Google o pedile al administrador de Avans que revise tu invitación.</p>
          </>
        )}
      </section>
    </main>
  );
}
