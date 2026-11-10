"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { GOOGLE_SCOPES } from "../../../lib/google-workspace/contracts";
import { requiredGoogleSettings } from "../../../lib/google-workspace/readiness";
import { buttonClass } from "../os/ui";
import m from "../os/knowledge/knowledge.module.css";
export function GoogleWorkspaceCard() {
  const [missing, setMissing] = useState<string[]>([...requiredGoogleSettings]);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/integrations/google/status", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (Array.isArray(data.missing)) setMissing(data.missing);
        setChecked(true);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return (
    <section className={m.card}>
      <div className={m.head}>
        <div>
          <h2>Google Workspace no conectado</h2>
          <p>
            Calendar → Meet Smart Notes → Google Docs → Fuentes → revisión del
            PM.
          </p>
        </div>
        <span className={m.badge}>Sin conexión validada</span>
      </div>
      <p>
        La sincronización permanece deshabilitada hasta contar con una cuenta
        autorizada, almacenamiento seguro y una prueba completa.
      </p>
      <div className={m.actions}>
        <button disabled className={buttonClass("primary", true)}>
          Conectar Google Workspace
        </button>
        <button disabled className={buttonClass("secondary", true)}>
          Sincronizar
        </button>
        <button disabled className={buttonClass("ghost", true)}>
          Revocar conexión
        </button>
        <Link href="/v2/clientes/epsa?view=documentos">
          Abrir fuentes de EPSA
        </Link>
      </div>
      <details>
        <summary>
          Configuración pendiente{" "}
          {checked ? "· comprobada en servidor" : "· sin comprobación"}
        </summary>
        <ul>
          {missing.map((name) => (
            <li key={name}>
              <code>{name}</code>
            </li>
          ))}
        </ul>
        <p>
          También faltan el repositorio cifrado, sesiones OAuth de un solo uso,
          identidad de administrador verificada, permisos de Workspace y
          validación de Pub/Sub. No ingreses credenciales en formularios ni
          notas.
        </p>
      </details>
      <details>
        <summary>Permisos y flujo de eventos</summary>
        <ul>
          {GOOGLE_SCOPES.map((scope) => (
            <li key={scope}>
              <code>{scope}</code>
            </li>
          ))}
        </ul>
        <p>
          Evento: <code>google.workspace.meet.smartNote.v2.fileGenerated</code>.
          Se consulta <code>conferenceRecords.smartNotes</code> y se lee su{" "}
          <code>docsDestination</code>. Las notas nunca actualizan Discovery sin
          aprobación.
        </p>
      </details>
    </section>
  );
}
