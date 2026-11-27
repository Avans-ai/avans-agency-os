"use client";

/* Publicidad digital · piezas visuales compartidas (semáforos, barras, plataformas, IA pendiente, Discovery). */
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { useAssistantStatus } from "../assistant/store";
import { useKnowledge } from "../knowledge/use-knowledge";
import type { OsClient } from "../os-data";
import { Badge } from "../ui";
import { PAID_DEMO_LABEL } from "./paid-demo";
import { SPEC_CHANNELS, type Light, type PaidChannel } from "./paid-model";
import p from "./paid.module.css";

export const CHANNEL_COLOR: Record<string, string> = {
  "Meta Ads": "var(--av-chrome)", "Google Ads": "var(--av-accent)", "TikTok Ads": "var(--av-teal-300)", "ChatGPT Ads": "var(--av-umber)", "LinkedIn Ads": "var(--av-teal-400)",
};

export const money = (value: number) => `$ ${Math.round(value).toLocaleString("es-AR")}`;
export const moneyShort = (value: number) => value >= 1_000_000 ? `$ ${(value / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M` : value >= 1000 ? `$ ${Math.round(value / 1000).toLocaleString("es-AR")} k` : money(value);
export const LIGHT_LABEL: Record<Light, string> = { verde: "En objetivo", amarillo: "Atención", rojo: "Fuera de objetivo", gris: "Sin datos" };

export function DemoBar({ children }: { children?: ReactNode }) {
  return <p className={p.demoBar} role="note"><strong>{PAID_DEMO_LABEL}</strong><span>{children ?? "Métricas, campañas y piezas ficticias. Ninguna plataforma de anuncios está conectada; no se simula ninguna sincronización."}</span><span>Guardado en este navegador · los roles son visuales (no son permisos de servidor).</span></p>;
}

export function LightDot({ light }: { light: Light }) {
  return <span className={p.lightLabel}><span className={p.dot} data-light={light} aria-hidden="true" />{LIGHT_LABEL[light]}</span>;
}

export function Bar({ label, value, max, display, tone, light, marker, title }: { label: ReactNode; value: number; max: number; display: ReactNode; tone?: "accent" | "teal"; light?: Light; marker?: number; title?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return <li className={p.barRow} title={title}>
    <span>{label}</span>
    <span className={p.track} role="img" aria-label={`${typeof label === "string" ? label : ""} ${Math.round(pct)} %`}><span className={p.fill} data-tone={tone} data-light={light} style={{ width: `${pct}%` }} />{marker !== undefined && max > 0 ? <span className={p.marker} style={{ left: `${Math.min(100, (marker / max) * 100)}%` }} /> : null}</span>
    <span className={p.num}>{display}</span>
  </li>;
}

export function ChannelStack({ channels, label }: { channels: Partial<Record<PaidChannel, number>>; label: string }) {
  const entries = Object.entries(channels).filter(([, share]) => (share ?? 0) > 0) as [PaidChannel, number][];
  const total = entries.reduce((sum, [, share]) => sum + share, 0) || 1;
  if (!entries.length) return <p className={p.small}>Sin distribución por canal.</p>;
  return <div className={p.stack} style={{ gap: 6 }}>
    <div className={p.stackBar} role="img" aria-label={`${label}: ${entries.map(([channel, share]) => `${channel} ${Math.round((share / total) * 100)} %`).join(", ")}`}>{entries.map(([channel, share]) => <span key={channel} style={{ width: `${(share / total) * 100}%`, background: CHANNEL_COLOR[channel] }} />)}</div>
    <ul className={p.legend}>{entries.map(([channel, share]) => <li key={channel}><span className={p.swatch} style={{ background: CHANNEL_COLOR[channel] }} />{channel} {Math.round((share / total) * 100)} %</li>)}</ul>
  </div>;
}

/** Plataformas de pauta: todas «No conectada». No hay credenciales ni conectores en esta preview. */
export function PlatformsPanel({ extra = [] as string[] }) {
  const detail: Record<string, string> = {
    "Meta Ads": "Facebook e Instagram: inversión, alcance, clics, leads.",
    "Google Ads": "Búsqueda, display y YouTube: clics, CPC, conversiones.",
    "TikTok Ads": "Video corto: vistas, clics y conversiones.",
    "ChatGPT Ads": "Anuncios en respuestas de IA: disponibilidad a validar.",
    "LinkedIn Ads": "Canal B2B usado por la cuenta.",
  };
  const rows = [...SPEC_CHANNELS, ...extra.filter((channel) => !(SPEC_CHANNELS as readonly string[]).includes(channel))];
  return <div className={p.platforms} role="list" aria-label="Plataformas de pauta">
    {rows.map((name) => <div className={p.platform} role="listitem" key={name}><strong>{name}</strong><Badge tone="stone">No conectada</Badge><span className={p.small}>{detail[name] ?? "Canal adicional."}</span></div>)}
  </div>;
}

/** Estado honesto de la IA: sin proveedor no se muestran sugerencias; con proveedor, el flujo de anuncios sigue pendiente. */
export function AiPending({ what, children }: { what: string; children?: ReactNode }) {
  const { status, error } = useAssistantStatus();
  const configured = Boolean(status?.configured);
  return <div className={p.ai} role="note" aria-label={`IA · ${what}`}>
    <strong>✨ IA · {what}</strong>
    <span><Badge tone={configured ? "info" : "stone"}>{configured ? "Proveedor disponible" : "Pendiente de conexión"}</Badge></span>
    <span>{error ? "No se pudo consultar el estado del asistente." : configured
      ? `Hay un proveedor configurado (${status?.provider} · ${status?.model}), pero la generación con estructuras, plantillas y buenas prácticas de Avans para ${what.toLowerCase()} todavía no está conectada a este flujo. No se generan ni simulan propuestas.`
      : `${status?.reason || "El servidor no tiene un proveedor de IA configurado."} No se muestran sugerencias simuladas: el equipo completa este paso a mano.`}</span>
    {children}
    <span className={p.small}>Pendiente para Gerencia · Configuración de la IA: espacio donde se cargarán las buenas prácticas, estructuras y plantillas transversales (todavía no existe).</span>
  </div>;
}

export type DiscoveryOption = { id: string; name: string; detail: string };
/** ICP, segmentos y productos o servicios del Marketing Discovery (consulta del agregado de conocimiento). */
export function usePaidDiscovery(client: OsClient) {
  const { d, k, hydrated } = useKnowledge(client);
  return useMemo(() => {
    const icps: DiscoveryOption[] = [
      ...d.b2bIcps.map((icp) => ({ id: icp.id, name: String(icp.name || icp.id), detail: "ICP B2B" })),
      ...d.b2cIcps.map((icp) => ({ id: icp.id, name: String(icp.name || icp.id), detail: "ICP B2C" })),
    ];
    const segments: DiscoveryOption[] = d.targetSegments.map((segment) => ({ id: segment.id, name: String(segment.name || segment.id), detail: String(segment.type || "Segmento") }));
    const offerings: DiscoveryOption[] = d.offerings.map((offering) => ({ id: offering.id, name: String(offering.name || offering.id), detail: String(offering.type || "Oferta") }));
    const name = (options: DiscoveryOption[], ids: string[]) => ids.map((id) => options.find((option) => option.id === id)?.name || `${id} (ya no está en el Discovery)`);
    return { icps, segments, offerings, planItems: k.plan.modules["publicidad-digital"] ?? [], name, hydrated };
  }, [d, k, hydrated]);
}

export function DiscoveryLink({ client, children = "Abrir Marketing Discovery" }: { client: OsClient; children?: ReactNode }) {
  return <Link href={`/v2/clientes/${client.slug}/discovery`} style={{ color: "var(--av-link)", fontSize: 13 }}>{children}</Link>;
}
