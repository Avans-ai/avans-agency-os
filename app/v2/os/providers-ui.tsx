"use client";

/* Piezas visuales compartidas del catálogo de proveedores (Personas y Cultura y Audiovisuales). */
/* Las fotos son imágenes cargadas desde el equipo (data URL), nunca fotos externas. */
/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import { providerInitials, safeProviderPhoto, type AudiovisualProvider } from "./providers-catalog";
import p from "./providers-catalog.module.css";

function tone(name: string) {
  return String([...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4);
}

export function ProviderAvatar({ name, foto = "", size = 32 }: { name: string; foto?: string; size?: number }) {
  const photo = safeProviderPhoto(foto);
  return (
    <span className={p.avatar} data-tone={tone(name)} style={{ "--size": `${size}px` } as CSSProperties} aria-hidden="true">
      {photo ? <img src={photo} alt="" /> : providerInitials(name)}
    </span>
  );
}

export function ProviderTypes({ provider }: { provider: Pick<AudiovisualProvider, "tipos"> }) {
  return <span className={p.types}>{provider.tipos.map((tipo) => <span key={tipo} className={p.type} data-type={tipo}>{tipo}</span>)}</span>;
}

export function ProviderDemoTag() {
  return <span className={p.demoTag} title="Proveedor ficticio de demostración">Demo</span>;
}
