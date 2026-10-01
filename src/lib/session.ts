import { useSyncExternalStore } from "react";

// Anonymous, browser-only session storage. No account, nothing sent to a database.
const KEY = "awpa-session-v1";

export type Stats = { emails: number; meetings: number; plans: number; research: number; chats: number };
export type HistoryItem = { id: string; tool: keyof Stats; title: string; at: number };
type State = { stats: Stats; history: HistoryItem[] };

const empty: State = { stats: { emails: 0, meetings: 0, plans: 0, research: 0, chats: 0 }, history: [] };
let state: State = empty;
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...empty, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  subs.forEach((f) => f());
}

export function recordUsage(tool: keyof Stats, title: string) {
  load();
  state = {
    stats: { ...state.stats, [tool]: state.stats[tool] + 1 },
    history: [{ id: crypto.randomUUID(), tool, title: title.slice(0, 90), at: Date.now() }, ...state.history].slice(0, 12),
  };
  save();
}

export function clearSession() {
  state = empty;
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("awpa-"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
  subs.forEach((f) => f());
}

export function useSession(): State {
  return useSyncExternalStore(
    (cb) => {
      load();
      subs.add(cb);
      cb();
      return () => subs.delete(cb);
    },
    () => state,
    () => empty,
  );
}

/** Small persisted value helper for per-tool drafts (e.g. chat history). */
export function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(`awpa-${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(`awpa-${key}`, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
