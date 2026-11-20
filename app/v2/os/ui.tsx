/* Avans OS components (OS* extensions) — stateless, usable from server and client components. */
import Link from "next/link";
import type { ReactNode } from "react";
import { AvansIcon, type AvansIconName } from "./brand";
import { Glyph } from "./glyphs";
import { initialsOf, type ClientStatus, type Priority, type TaskStatus } from "./os-data";
import s from "./os.module.css";

export function cx(...names: (string | false | null | undefined)[]) {
  return names.filter(Boolean).join(" ");
}

export function Rotulo({ children, ink, as: Tag = "p", id }: { children: ReactNode; ink?: boolean; as?: "p" | "span" | "h2" | "h3"; id?: string }) {
  return <Tag id={id} className={cx(s.rotulo, ink && s.rotuloInk)}>{children}</Tag>;
}

export function PageHead({ rotulo, title, description, actions, titleId }: { rotulo?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode; titleId?: string }) {
  return (
    <header className={s.pageHead}>
      <div>
        {rotulo ? <Rotulo>{rotulo}</Rotulo> : null}
        <h1 id={titleId}>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className={s.actions}>{actions}</div> : null}
    </header>
  );
}

type ButtonVariant = "primary" | "secondary" | "dark" | "ghost";
const variantClass: Record<ButtonVariant, string> = { primary: s.btnPrimary, secondary: s.btnSecondary, dark: s.btnDark, ghost: s.btnGhost };
export function buttonClass(variant: ButtonVariant = "primary", small = false) {
  return cx(s.btn, variantClass[variant], small && s.btnSm);
}

/** Navigation styled as a button (OSLinkButton). */
export function LinkButton({ href, children, variant = "secondary", icon, small }: { href: string; children: ReactNode; variant?: ButtonVariant; icon?: AvansIconName; small?: boolean }) {
  return <Link href={href} className={buttonClass(variant, small)}>{icon ? <AvansIcon name={icon} size={18} /> : null}{children}</Link>;
}

const statusMeta: Record<ClientStatus, { label: string; tone: string; shape: ReactNode }> = {
  "al-dia": { label: "Al día", tone: s.toneCool, shape: "●" },
  atencion: { label: "Atención", tone: s.tonePeach, shape: "▲" },
  "en-riesgo": { label: "En riesgo", tone: s.toneError, shape: "■" },
  onboarding: { label: "Onboarding", tone: s.toneInfo, shape: "○" },
  pausado: { label: "Pausado", tone: s.toneStone, shape: <i className={s.pauseShape} /> },
};
export function statusLabel(status: ClientStatus) {
  return statusMeta[status].label;
}

/** OSStatus: text + shape, never color alone. */
export function OSStatus({ status }: { status: ClientStatus }) {
  const meta = statusMeta[status];
  return <span className={cx(s.badge, meta.tone)}><span className={s.shape} aria-hidden="true">{meta.shape}</span>{meta.label}</span>;
}

export function Badge({ children, tone = "peach", title }: { children: ReactNode; tone?: "peach" | "cool" | "error" | "info" | "stone" | "cocoa"; title?: string }) {
  const tones = { peach: s.tonePeach, cool: s.toneCool, error: s.toneError, info: s.toneInfo, stone: s.toneStone, cocoa: s.toneCocoa };
  return <span className={cx(s.badge, tones[tone])} title={title}>{children}</span>;
}

export function OSPriority({ prio }: { prio: Priority }) {
  const on = prio === "Alta" ? 3 : prio === "Media" ? 2 : 1;
  return (
    <span className={cx(s.prio, prio === "Alta" && s.prioAlta)}>
      <span className={s.bars} aria-hidden="true">{[1, 2, 3].map(bar => <i key={bar} className={bar <= on ? s.barOn : undefined} />)}</span>
      {prio}
    </span>
  );
}

export function OSDue({ label, kind, status }: { label: string; kind: string; status?: TaskStatus }) {
  const done = status === "Hecho";
  return <span className={cx(s.due, !done && kind === "today" && s.dueToday, !done && kind === "late" && s.dueLate)}>{label}</span>;
}

export function Avatar({ name, size = "sm", tone }: { name: string; size?: "sm" | "md"; tone?: "dark" | "accent" }) {
  return <span className={cx(s.avatar, size === "md" && s.avatarMd, tone === "dark" && s.avatarDark, tone === "accent" && s.avatarAccent)} aria-hidden="true">{initialsOf(name)}</span>;
}

export function OSKpiTile({ scope, value, label, detail, href, cta = "Ver" }: { scope: string; value: ReactNode; label: string; detail: string; href: string; cta?: string }) {
  return (
    <Link href={href} className={s.kpi} aria-label={`${scope}: ${value} ${label}. ${detail}. ${cta}`}>
      <span className={s.kpiTop}><span className={s.rotulo}>{scope}</span><span className={s.kpiCta} aria-hidden="true">{cta} <Glyph name="arrow-right" size={13} /></span></span>
      <span className={s.kpiValue}><strong>{value}</strong>{label}</span>
      <span className={s.kpiDetail}>{detail}</span>
    </Link>
  );
}

export function Progress({ value, accent, label }: { value: number; accent?: boolean; label?: string }) {
  return (
    <span className={cx(s.progress, accent && s.progressAccent)}>
      <span className={s.progressTrack} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Avance"}>
        <span className={s.progressFill} style={{ width: `${value}%` }} />
      </span>
      <span>{value}%</span>
    </span>
  );
}

export function OSEmptyState({ icon = "registro", title, children, actions }: { icon?: AvansIconName; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className={s.empty}>
      <AvansIcon name={icon} size={28} />
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {actions ? <div className={s.actions}>{actions}</div> : null}
    </div>
  );
}

export function OSInlineAlert({ title, children, tone = "error", action }: { title: string; children?: ReactNode; tone?: "error" | "info" | "peach"; action?: ReactNode }) {
  return (
    <div className={cx(s.alert, tone === "info" && s.alertInfo, tone === "peach" && s.alertPeach)} role={tone === "error" ? "alert" : "status"}>
      <Glyph name="alert" size={20} />
      <div><strong>{title}</strong>{children ? <p>{children}</p> : null}{action}</div>
    </div>
  );
}

/** Full block shown instead of a section the current role cannot see. */
export function OSRestricted({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <section className={s.restricted} aria-label={title}>
      <Glyph name="lock" size={28} />
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
      {actions ? <div className={s.actions}>{actions}</div> : null}
    </section>
  );
}

export function RestrictedValue() {
  return <span className={s.restrictedInline}><Glyph name="lock" size={14} label="Dato restringido" />Restringido</span>;
}

export function OSSkeletonRows({ rows = 4, label = "Cargando…" }: { rows?: number; label?: string }) {
  return (
    <div className={s.surface} aria-busy="true" aria-live="polite">
      <span className={s.skel} style={{ height: 48 }} />
      {Array.from({ length: rows }, (_, index) => (
        <div className={s.skeletonRow} key={index}>
          <span className={s.skel} style={{ width: 32, height: 32 }} />
          <span className={s.skel} style={{ width: `${30 + ((index * 17) % 25)}%`, height: 12 }} />
          <span className={s.skel} style={{ width: "18%", height: 12, marginLeft: "auto" }} />
        </div>
      ))}
      <p className={s.demoNote} style={{ padding: "8px 16px 16px", margin: 0 }}>{label}</p>
    </div>
  );
}

export { s as osStyles };
