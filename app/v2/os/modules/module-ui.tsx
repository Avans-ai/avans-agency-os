"use client";

import type { ReactNode } from "react";
import { Badge } from "../ui";
import type { RecordSource } from "./types";
import m from "./modules.module.css";

const SOURCE_LABEL: Record<RecordSource, string> = { demo: "Demo", manual: "Manual", integration: "Integración" };

export function SourceTag({ source }: { source: RecordSource }) {
  return <span className={m.source} data-source={source} title={source === "demo" ? "Dato de demostración: ficticio" : source === "manual" ? "Cargado a mano y guardado en este navegador" : "Proveniente de una integración"}>{SOURCE_LABEL[source]}</span>;
}

const ERROR = ["Bloquead", "Falla", "Revertida", "Abierto", "Vencid", "Atención", "Demorado"];
const PEACH = ["aprobación", "Revisión", "En revisión", "Cambios pedidos", "En evaluación", "Acta pendiente", "Por confirmar", "Mitigando", "Reprogramado", "Propuesta", "Revisar", "Pendiente del cliente"];
const COOL = ["Activ", "Aprobad", "Publicad", "Validad", "Realizad", "Cumplid", "Entregad", "Lista", "Tomada", "Confirmad", "Cerrad", "Programada", "Resuelta", "Convertida", "Priorizada", "Cargado", "Al día"];
const INFO = ["En curso", "En producción", "En desarrollo", "En diseño", "Planificad", "En edición", "Brief", "Nueva", "Programada", "En preparación", "Aplicada", "Borrador", "En redacción", "Idea"];

export function statusTone(status: string) {
  if (!status) return "stone" as const;
  if (ERROR.some((key) => status.includes(key))) return "error" as const;
  if (PEACH.some((key) => status.includes(key))) return "peach" as const;
  if (COOL.some((key) => status.includes(key))) return "cool" as const;
  if (INFO.some((key) => status.includes(key))) return "info" as const;
  return "stone" as const;
}

export function StatusBadge({ status }: { status: string }) {
  return status ? <Badge tone={statusTone(status)}>{status}</Badge> : <span className={m.source}>Sin estado</span>;
}

export function Panel({ title, description, actions, children, footer, id, as: Tag = "h2" }: { title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; footer?: ReactNode; id?: string; as?: "h2" | "h3" }) {
  return (
    <section className={m.panel} aria-labelledby={id}>
      <div className={m.panelHead}>
        <div><Tag id={id}>{title}</Tag>{description ? <p>{description}</p> : null}</div>
        {actions ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div> : null}
      </div>
      {children}
      {footer ? <div className={m.panelFoot}>{footer}</div> : null}
    </section>
  );
}

export type StripItem = { label: string; value: ReactNode; detail?: string; alert?: boolean; href?: string };
export function Strip({ items, label }: { items: StripItem[]; label: string }) {
  return (
    <section className={m.strip} aria-label={label}>
      {items.map((item) => item.href ? (
        <a key={item.label} href={item.href} className={item.alert ? m.stripAlert : undefined}><span>{item.label}</span><strong>{item.value}</strong>{item.detail ? <small>{item.detail}</small> : null}</a>
      ) : (
        <div key={item.label} className={item.alert ? m.stripAlert : undefined}><span>{item.label}</span><strong>{item.value}</strong>{item.detail ? <small>{item.detail}</small> : null}</div>
      ))}
    </section>
  );
}

export function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: value.slice(0, 4) === "2026" ? undefined : "numeric" });
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });
}
