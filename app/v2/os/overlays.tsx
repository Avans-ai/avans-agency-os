"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Glyph } from "./glyphs";
import { useOsStore } from "./os-store";
import s from "./os.module.css";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** role=dialog + aria-modal, Esc closes, focus is trapped and returned to the trigger. */
function useDialog(onClose: () => void, initialFocus?: React.RefObject<HTMLElement | null>) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  // Captured on first render, before autoFocus moves focus into the dialog.
  const [trigger] = useState(() => (typeof document === "undefined" ? null : document.activeElement as HTMLElement | null));
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const node = ref.current;
    if (!node?.contains(document.activeElement)) (initialFocus?.current ?? node?.querySelector<HTMLElement>(FOCUSABLE) ?? node)?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { event.stopPropagation(); closeRef.current(); return; }
      if (event.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(item => item.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (trigger && document.contains(trigger)) trigger.focus();
    };
  }, [initialFocus, trigger]);
  return ref;
}

export function OSSidePanel({ label, heading, onClose, children, footer, titleRef, persistentFooter = false, wide = false, extraWide = false }: {
  label: string;
  heading: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  titleRef?: React.RefObject<HTMLElement | null>;
  persistentFooter?: boolean;
  /** 720 px instead of 480 px on desktop, for catalog-style dialogs. */
  wide?: boolean;
  /** Two-column work panels (form + assistant), up to 1180 px. */
  extraWide?: boolean;
}) {
  const ref = useDialog(onClose, titleRef);
  return (
    <>
      <div className={s.veil} onClick={onClose} aria-hidden="true" />
      <div ref={ref} className={`${s.panel} ${wide ? s.panelWide : ""} ${extraWide ? s.panelXWide : ""}`} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        <div className={s.panelHead}>
          <button type="button" className={s.backBtn} onClick={onClose} aria-label="Volver"><Glyph name="chevron-left" size={22} /></button>
          <div style={{ flex: 1, minWidth: 0 }}>{heading}</div>
          <button type="button" className={`${s.closeBtn} ${s.panelClose}`} onClick={onClose} aria-label="Cerrar panel"><Glyph name="close" size={16} /></button>
        </div>
        <div className={s.panelBody}>{children}</div>
        {footer ? <div className={`${s.panelFoot} ${persistentFooter ? s.panelFootVisible : ""}`}>{footer}</div> : null}
      </div>
    </>
  );
}

export function OSModal({ title, onClose, children, footer, titleId }: { title: string; onClose: () => void; children: ReactNode; footer: ReactNode; titleId: string }) {
  const ref = useDialog(onClose);
  return (
    <>
      <div className={s.veil} onClick={onClose} aria-hidden="true" />
      <div ref={ref} className={s.modal} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={s.modalHead}>
          <h2 id={titleId}>{title}</h2>
          <button type="button" className={s.closeBtn} onClick={onClose} aria-label="Cerrar"><Glyph name="close" size={16} /></button>
        </div>
        <div className={s.modalBody}>{children}</div>
        <div className={s.modalFoot}>{footer}</div>
      </div>
    </>
  );
}

/** OSToast: bottom center, 5 s, Deshacer when the change is reversible. aria-live polite. */
export function OSToastViewport() {
  const { toast, undo, dismissToast } = useOsStore();
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(dismissToast, toast.undo ? 6000 : 5000);
    return () => window.clearTimeout(timer);
  }, [toast, dismissToast]);
  return (
    <div aria-live="polite" role="status">
      {toast ? (
        <div className={s.toast} key={toast.id}>
          {toast.tone === "error" ? <Glyph name="alert" size={16} /> : <Glyph name="check" size={16} />}
          <span>{toast.message}</span>
          {toast.undo ? <button type="button" onClick={undo}>Deshacer</button> : null}
          <button type="button" className={s.toastClose} onClick={dismissToast} aria-label="Cerrar aviso"><Glyph name="close" size={14} /></button>
        </div>
      ) : null}
    </div>
  );
}
