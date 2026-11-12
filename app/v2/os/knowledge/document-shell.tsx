"use client";

/* Continuous strategic document: one vertical page with a compact sticky index.
 * The index scrolls to each section (smooth unless reduced motion) and marks
 * the section currently in view. Used by Discovery, Benchmark and Plan; the
 * operational modules keep their own tools and filters. */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Badge } from "../ui";
import d from "./document-shell.module.css";

export type DocumentSectionRef = { id: string; label: string };

/** Contextual state shown on each section instead of percentages. */
export type SectionState = "validated" | "pending-validation" | "missing" | "review" | "not-applicable" | "empty";
const STATE_LABEL: Record<SectionState, string> = {
  validated: "Validado",
  "pending-validation": "Pendiente de validar",
  missing: "Falta información",
  review: "Requiere revisión",
  "not-applicable": "No aplica",
  empty: "Sin información",
};
const STATE_TONE: Record<SectionState, "cool" | "peach" | "error" | "stone" | "info"> = {
  validated: "cool",
  "pending-validation": "peach",
  missing: "stone",
  review: "error",
  "not-applicable": "info",
  empty: "stone",
};

export function SectionStateBadge({ state }: { state: SectionState }) {
  return <Badge tone={STATE_TONE[state]}>{STATE_LABEL[state]}</Badge>;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function DocumentShell({
  label,
  sections,
  header,
  children,
}: {
  label: string;
  sections: DocumentSectionRef[];
  header: ReactNode;
  children: ReactNode;
}) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const navRef = useRef<HTMLElement>(null);
  const ids = sections.map((section) => section.id).join("|");

  const compute = useCallback(() => {
    const list = ids.split("|").filter(Boolean);
    const offset = (navRef.current?.getBoundingClientRect().bottom ?? 120) + 24;
    let current = list[0] ?? "";
    for (const id of list) {
      const node = document.getElementById(id);
      if (node && node.getBoundingClientRect().top <= offset) current = id;
    }
    const doc = document.documentElement;
    if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) current = list[list.length - 1] ?? current;
    setActive(current);
  }, [ids]);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(compute);
    };
    frame = requestAnimationFrame(compute);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (hash && ids.split("|").includes(hash)) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }));
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [compute, ids]);

  // Keep the active index item visible inside the horizontally scrollable index.
  useEffect(() => {
    const nav = navRef.current;
    const link = nav?.querySelector<HTMLElement>(`[data-section="${active}"]`);
    if (nav && link) {
      const left = link.offsetLeft - nav.clientWidth / 2 + link.clientWidth / 2;
      nav.scrollTo({ left: Math.max(0, left), behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  }, [active]);

  function go(id: string) {
    const node = document.getElementById(id);
    if (!node) return;
    node.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    const heading = node.querySelector<HTMLElement>("h3, h2");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus({ preventScroll: true });
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#${id}`);
    setActive(id);
  }

  return (
    <article className={d.document} aria-label={label}>
      {header}
      <nav ref={navRef} className={d.index} aria-label={`Índice de ${label}`}>
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            data-section={section.id}
            aria-current={active === section.id ? "location" : undefined}
            onClick={(event) => {
              event.preventDefault();
              go(section.id);
            }}
          >
            {section.label}
          </a>
        ))}
      </nav>
      <div className={d.body}>{children}</div>
    </article>
  );
}

/** One block of the continuous document, with number, title, state and contextual actions. */
export function DocumentSection({
  id,
  number,
  title,
  hint,
  state,
  actions,
  children,
}: {
  id: string;
  number?: string;
  title: string;
  hint?: ReactNode;
  state?: SectionState;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className={d.section} aria-labelledby={`${id}-title`}>
      <header className={d.sectionHead}>
        <div>
          {number ? <span className={d.number}>{number}</span> : null}
          <h3 id={`${id}-title`}>{title}</h3>
          {hint ? <p>{hint}</p> : null}
        </div>
        <div className={d.sectionTools}>
          {state ? <SectionStateBadge state={state} /> : null}
          {actions}
        </div>
      </header>
      <div className={d.sectionBody}>{children}</div>
    </section>
  );
}
