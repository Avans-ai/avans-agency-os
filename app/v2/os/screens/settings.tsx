"use client";

import Link from "next/link";
import { ThemeToggle } from "../../components/theme-toggle";
import { osAreas, osSettingsItems, v2NavItems } from "../../navigation";
import { useOsStore } from "../os-store";
import { Badge, PageHead } from "../ui";
import s from "../os.module.css";
import sc from "../screens.module.css";

/** Platform status carried over from the previous Command Center. */
const PLATFORM_STATE: Record<string, { state: string; detail: string }> = {
  usuarios: { state: "Pendiente", detail: "Roles y permisos definidos como propuesta; sin autenticación real." },
  integraciones: { state: "Por conectar", detail: "Catálogo y alcance definidos, no conexiones productivas." },
  automatizaciones: { state: "Simulado", detail: "Runs y límites representados, sin ejecución real." },
  seguridad: { state: "Pendiente", detail: "Google @avans.agency y permisos siguen previstos." },
  auditoria: { state: "Simulado", detail: "Eventos de ejemplo; sin registro persistente." },
  "salud-sistema": { state: "Por validar", detail: "Backups y restauración productiva no comprobados." },
  "estado-producto": { state: "Demo en revisión", detail: "Datos sintéticos; backend e integraciones pendientes." },
};

export function SettingsScreen() {
  const { role, setRole } = useOsStore();
  const extra = v2NavItems.filter(item => ["inbox", "procesos", "reuniones", "agentes", "workflows", "guardrails"].includes(item.slug));
  return (
    <div className={s.page}>
      <PageHead rotulo="Utilidad" title="Configuración" description="Plataforma, preferencias y mapa completo de módulos. Configuración no es un área de negocio." />

      <section aria-labelledby="platform-title" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 id="platform-title" className={s.rotulo} style={{ color: "var(--av-text)" }}>Plataforma</h2>
        <div className={sc.settingsGrid}>
          {osSettingsItems.map(item => (
            <Link key={item.slug} href={item.href} className={sc.settingsCard}>
              <h2>{item.label}</h2>
              <p>{PLATFORM_STATE[item.slug]?.detail}</p>
              <span style={{ marginTop: "auto" }}><Badge tone="stone">{PLATFORM_STATE[item.slug]?.state}</Badge></span>
            </Link>
          ))}
        </div>
      </section>

      <section className={s.surface} aria-labelledby="prefs-title">
        <div className={s.cardHead}><h2 id="prefs-title">Preferencias</h2></div>
        <div style={{ padding: 20, display: "flex", flexWrap: "wrap", gap: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <strong style={{ fontWeight: 500 }}>Tema</strong>
            <ThemeToggle className={s.themeBtn} />
            <span className={s.cellSub}>Se guarda en este navegador.</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <strong style={{ fontWeight: 500 }}>Vista previa de rol</strong>
            <div className={s.segmented} role="group" aria-label="Rol simulado">
              <button type="button" aria-pressed={role === "admin"} onClick={() => setRole("admin")}>Administrador</button>
              <button type="button" aria-pressed={role === "operativo"} onClick={() => setRole("operativo")}>Ejecutiva de cuentas</button>
            </div>
            <span className={s.cellSub}>Simulación visual. No es control de acceso: se resolverá en el servidor.</span>
          </div>
        </div>
      </section>

      <section className={s.surface} aria-labelledby="map-title">
        <div className={s.cardHead}><h2 id="map-title">Mapa de módulos</h2><span className={s.cardMeta}>Todos los módulos existentes siguen disponibles</span></div>
        <div className={sc.mapGrid} style={{ padding: 20 }}>
          {osAreas.map(area => (
            <div key={area.slug}>
              <Link className={s.linkInk} href={area.href} style={{ fontWeight: 500 }}>{area.label}</Link>
              <ul>{area.items.map(item => <li key={item.href}><Link className={s.link} href={item.href}>{item.label}</Link></li>)}</ul>
            </div>
          ))}
          <div>
            <span style={{ fontWeight: 500 }}>Capacidades complementarias</span>
            <ul>
              {extra.map(item => <li key={item.slug}><Link className={s.link} href={item.href}>{item.label}</Link></li>)}
              <li><Link className={s.link} href="/v2/benchmark">Benchmark (vista general)</Link></li>
              <li><Link className={s.link} href="/">Versión anterior del MVP</Link></li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
