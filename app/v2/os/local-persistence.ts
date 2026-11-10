"use client";

import {
  useCallback,
  useMemo,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";

const PREFIX = "avans-os:preview:v1";
const LOCAL_EVENT = "avans-os-local-storage";
const SERVER_SNAPSHOT = "__avans_server__";
const EMPTY_SNAPSHOT = "__avans_empty__";

type Envelope<T> = { version: 1; value: T; savedAt: string };
type LocalEventDetail = { key: string };

function fullKey(key: string) {
  return `${PREFIX}:${key}`;
}

function rawSnapshot(key: string) {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  try {
    return window.localStorage.getItem(fullKey(key)) ?? EMPTY_SNAPSHOT;
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

function parseRaw<T>(raw: string, fallback: T): T {
  if (raw === SERVER_SNAPSHOT || raw === EMPTY_SNAPSHOT) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<Envelope<T>>;
    return parsed.version === 1 && "value" in parsed ? parsed.value as T : fallback;
  } catch {
    return fallback;
  }
}

function emitLocalChange(key: string) {
  window.dispatchEvent(new CustomEvent<LocalEventDetail>(LOCAL_EVENT, { detail: { key } }));
}

export function readLocalJson<T>(key: string, fallback: T): T {
  return parseRaw(rawSnapshot(key), fallback);
}

export function writeLocalJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return false;
  try {
    const envelope: Envelope<T> = { version: 1, value, savedAt: new Date().toISOString() };
    window.localStorage.setItem(fullKey(key), JSON.stringify(envelope));
    emitLocalChange(key);
    return true;
  } catch {
    return false;
  }
}

export function removeLocalJson(key: string) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(fullKey(key));
    emitLocalChange(key);
    return true;
  } catch {
    return false;
  }
}

export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const subscribe = useCallback((onStoreChange: () => void) => {
    function onStorage(event: StorageEvent) {
      if (event.key === null || event.key === fullKey(key)) onStoreChange();
    }

    function onLocalChange(event: Event) {
      const detail = (event as CustomEvent<LocalEventDetail>).detail;
      if (detail?.key === key) onStoreChange();
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener(LOCAL_EVENT, onLocalChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LOCAL_EVENT, onLocalChange);
    };
  }, [key]);

  const getSnapshot = useCallback(() => rawSnapshot(key), [key]);
  const getServerSnapshot = useCallback(() => SERVER_SNAPSHOT, []);
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = useMemo(() => parseRaw(raw, initialValue), [initialValue, raw]);

  const setValue = useCallback<Dispatch<SetStateAction<T>>>((update) => {
    const previous = readLocalJson(key, initialValue);
    const next = typeof update === "function"
      ? (update as (previousValue: T) => T)(previous)
      : update;
    writeLocalJson(key, next);
  }, [initialValue, key]);

  return [value, setValue, raw !== SERVER_SNAPSHOT];
}
