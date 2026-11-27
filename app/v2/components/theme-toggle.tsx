"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "avans-v2-theme";
const EVENT = "avans-theme-change";

type Theme = "light" | "dark";

function readTheme(): Theme {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Applies the saved theme on every /v2 page, even when no toggle is mounted. */
export function ThemeSync() {
  const theme = useSyncExternalStore<Theme>(subscribe, readTheme, () => "light");
  useEffect(() => {
    document.documentElement.dataset.avansTheme = theme;
  }, [theme]);
  return null;
}

export function ThemeToggle({ className = "avans-theme-toggle" }: { className?: string }) {
  const theme = useSyncExternalStore<Theme>(subscribe, readTheme, () => "light");

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be blocked; the theme still applies for this visit.
    }
    document.documentElement.dataset.avansTheme = next;
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button
      type="button"
      className={className}
      onClick={toggle}
      aria-pressed={theme === "dark"}
      aria-label={theme === "light" ? "Activar modo oscuro" : "Activar modo claro"}
    >
      {theme === "light" ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
      <span>{theme === "light" ? "Modo oscuro" : "Modo claro"}</span>
    </button>
  );
}
