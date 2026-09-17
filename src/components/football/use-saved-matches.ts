"use client";
import { useMemo, useSyncExternalStore } from "react";

const KEY = "touchline:saved-matches:v1";
const EVENT = "touchline:saved-change";
let memory = "[]";
let storageUnavailable = false;
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}
function getSnapshot() {
  if (storageUnavailable) return memory;
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return memory;
  }
}
export function useSavedMatches() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => "[]");
  const ids = useMemo<string[]>(() => {
    try {
      const data: unknown = JSON.parse(raw);
      return Array.isArray(data)
        ? [
            ...new Set(
              data.filter((id): id is string => typeof id === "string"),
            ),
          ].slice(-500)
        : [];
    } catch {
      return [];
    }
  }, [raw]);
  function toggle(id: string) {
    memory = JSON.stringify(
      ids.includes(id)
        ? ids.filter((value) => value !== id)
        : [...ids, id].slice(-500),
    );
    try {
      localStorage.setItem(KEY, memory);
    } catch {
      storageUnavailable = true;
    }
    window.dispatchEvent(new Event(EVENT));
  }
  return { ids, toggle };
}
