"use client";

import { useSyncExternalStore } from "react";

// A persistent display name for the local user, shared across /present and
// /stage (and used as the presenter's publish name). Demo-grade identity — a
// real deployment would use an authenticated account.

const KEY = "display-name";
const listeners = new Set<() => void>();
let cached: string | null = null;

function read(): string {
  if (cached !== null) return cached;
  try {
    cached = localStorage.getItem(KEY) ?? "";
  } catch {
    cached = "";
  }
  return cached;
}

export function getDisplayName(): string {
  return read();
}

export function setDisplayName(name: string): void {
  const clean = name.replace(/\s+/g, " ").trimStart().slice(0, 40);
  cached = clean;
  try {
    localStorage.setItem(KEY, clean);
  } catch {
    /* ignore storage failures */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** React binding: [name, setName]. Empty string until the user sets one. */
export function useDisplayName(): [string, (name: string) => void] {
  const name = useSyncExternalStore(subscribe, getDisplayName, () => "");
  return [name, setDisplayName];
}
