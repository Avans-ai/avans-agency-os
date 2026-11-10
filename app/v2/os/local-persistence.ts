"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

const PREFIX = "avans-os:preview:v1";
type Envelope<T> = { version: 1; value: T; savedAt: string };

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
  if (typeof window === "undefined") return;
  const envelope: Envelope<T> = { version: 1, value, savedAt: new Date().toISOString() };
  window.localStorage.setItem(fullKey(key), JSON.stringify(envelope));
}

export function removeLocalJson(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(fullKey(key));
}

export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const initialRef = useRef(initialValue);
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setValue(readLocalJson(key, initialRef.current));
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    writeLocalJson(key, value);
  }, [hydrated, key, value]);

  return [value, setValue, hydrated];
}
