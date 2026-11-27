"use client";

/* «Volver» compartido de Avans OS.
 * - Quien abre un detalle agrega `?volver=<ruta de origen>` (withReturn / ReturnLink).
 * - BackButton vuelve a esa ruta si es interna y válida; si no hay origen (enlace
 *   directo) usa un destino lógico (fallback). Nunca usa el historial a ciegas.
 * - La ruta de origen conserva cliente, filtros, vista y mes porque viajan en la URL.
 * - La posición de scroll del origen se guarda por URL y se restaura al volver.
 * - Formularios con cambios sin guardar se registran con useUnsavedChanges: Volver
 *   pide confirmación solo en ese caso; también se protege el cierre de la pestaña. */
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, type MouseEvent, type ReactNode } from "react";
import { Glyph } from "../glyphs";
import s from "../os.module.css";

import { RETURN_PARAM, safeReturnPath, withReturn } from "./return-path";
export { RETURN_PARAM, safeReturnPath, withReturn };
const SCROLL_PREFIX = "avans-os:scroll:";

/** Ruta actual (pathname + query) para usar como origen. */
export function useCurrentPath() {
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}

/** Origen válido recibido en la URL actual, o null si se entró por enlace directo. */
export function useReturnPath() {
  const params = useSearchParams();
  return useMemo(() => safeReturnPath(params.get(RETURN_PARAM)), [params]);
}

function rememberScroll(path: string) {
  try {
    sessionStorage.setItem(`${SCROLL_PREFIX}${path}`, String(Math.round(window.scrollY)));
  } catch {
    /* sin almacenamiento de sesión: se vuelve al inicio de la página */
  }
}

/** Restaura la posición guardada al volver a una ruta (se monta una vez en el shell). */
export function useScrollRestoration() {
  const path = useCurrentPath();
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(`${SCROLL_PREFIX}${path}`);
      if (stored !== null) sessionStorage.removeItem(`${SCROLL_PREFIX}${path}`);
    } catch {
      stored = null;
    }
    if (stored === null) return;
    const y = Number(stored);
    if (!Number.isFinite(y)) return;
    // Espera a que la vista hidrate sus datos locales antes de desplazar.
    const timers = [60, 250, 600].map((delay) => window.setTimeout(() => window.scrollTo({ top: y }), delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [path]);
}

/* Registro de formularios con cambios sin guardar. */
const dirtyForms = new Set<string>();
export function hasUnsavedChanges() {
  return dirtyForms.size > 0;
}
export function confirmDiscardChanges() {
  if (!hasUnsavedChanges()) return true;
  const ok = window.confirm("Hay cambios sin guardar. ¿Querés salir sin guardarlos?");
  if (ok) dirtyForms.clear();
  return ok;
}
/** Marca un formulario como «con cambios sin guardar» mientras `dirty` sea verdadero. */
export function useUnsavedChanges(id: string, dirty: boolean) {
  useEffect(() => {
    if (!dirty) {
      dirtyForms.delete(id);
      return;
    }
    dirtyForms.add(id);
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      dirtyForms.delete(id);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [dirty, id]);
}

/** Enlace a un detalle que recuerda el origen (URL + scroll) para que «Volver» lo recupere. */
export function ReturnLink({ href, children, className, from, ...rest }: { href: string; children: ReactNode; className?: string; from?: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const current = useCurrentPath();
  const origin = from ?? current;
  return (
    <Link
      {...rest}
      href={withReturn(href, origin)}
      className={className}
      onClick={(event) => {
        rest.onClick?.(event);
        if (!event.defaultPrevented) rememberScroll(origin);
      }}
    >
      {children}
    </Link>
  );
}

/** Navegación programática que conserva el origen. */
export function useReturnNavigation() {
  const router = useRouter();
  const current = useCurrentPath();
  return useCallback((href: string, options?: { replace?: boolean }) => {
    rememberScroll(current);
    const target = withReturn(href, current);
    if (options?.replace) router.replace(target, { scroll: true });
    else router.push(target, { scroll: true });
  }, [current, router]);
}

/** Botón «Volver»: al origen real si existe y es interno; si no, al destino lógico. */
export function BackButton({ fallback, fallbackLabel, label, className }: { fallback: string; fallbackLabel?: string; label?: string; className?: string }) {
  const origin = useReturnPath();
  const target = origin ?? safeReturnPath(fallback) ?? "/v2";
  const text = label ?? (origin ? "Volver" : `Volver${fallbackLabel ? ` a ${fallbackLabel}` : ""}`);
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!confirmDiscardChanges()) event.preventDefault();
  }
  return (
    <Link href={target} className={className ?? s.backLink} onClick={onClick} scroll={!origin} data-back-target={target}>
      <Glyph name="chevron-left" size={16} />
      {text}
    </Link>
  );
}

/** Componente montado en el shell (dentro de <Suspense>) que restaura el scroll al volver. */
export function ScrollRestorer() {
  useScrollRestoration();
  return null;
}
