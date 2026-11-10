"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";

const PREFIX = "avans-os:preview:v1";
type Envelope<T> = { version: 1; value: T; savedAt: string };
type LocalState<T> = { key: string; value: T; hydrated: boolean };

function fullKey(key: string) {
  return `${PREFIX}:${key}`;
}

export function readLocalJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(fullKey(key));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Envelope<T>>;
    return parsed.version === 1 && "value" in parsed ? parsed.value as T : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return false;
  try {
    const envelope: Envelope<T> = { version: 1, value, savedAt: new Date().toISOString() };
    window.localStorage.setItem(fullKey(key), JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

export function removeLocalJson(key: string) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(fullKey(key));
    return true;
  } catch {
    return false;
  }
}

export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [state, setState] = useState<LocalState<T>>({ key, value: initialValue, hydrated: false });

  useEffect(() => {
    setState({ key, value: readLocalJson(key, initialValue), hydrated: true });
    // The fallback is a seed for a new key, not a reactive source. Including
    // object/array seeds would rehydrate on every render for literal defaults.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!state.hydrated || state.key !== key) return;
    writeLocalJson(key, state.value);
  }, [key, state.hydrated, state.key, state.value]);

  useEffect(() => {
    function syncFromAnotherTab(event: StorageEvent) {
      if (event.key !== fullKey(key)) return;
      setState({ key, value: readLocalJson(key, initialValue), hydrated: true });
    }
    window.addEventListener("storage", syncFromAnotherTab);
    return () => window.removeEventListener("storage", syncFromAnotherTab);
  }, [initialValue, key]);

  const setValue = useCallback<Dispatch<SetStateAction<T>>>((update) => {
    setState((current) => {
      const previous = current.key === key ? current.value : initialValue;
      const value = typeof update === "function"
        ? (update as (previousValue: T) => T)(previous)
        : update;
      return { key, value, hydrated: true };
    });
  }, [initialValue, key]);

  const currentValue = state.key === key ? state.value : initialValue;
  return [currentValue, setValue, state.key === key && state.hydrated];
}
