import { getRequestHeader } from "@tanstack/react-start/server";
import { AIError } from "./gateway.server";

// Best-effort in-memory rate limit per client IP (per server instance).
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 15;

export function rateLimit(bucket: string) {
  let ip = "anon";
  try {
    ip = getRequestHeader("cf-connecting-ip") || getRequestHeader("x-forwarded-for")?.split(",")[0] || "anon";
  } catch {
    /* no request context */
  }
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_PER_WINDOW) {
    throw new AIError("rate_limit", "You're sending requests too quickly. Please wait a minute and try again.");
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string; code: string };

export async function safeRun<T>(bucket: string, fn: () => Promise<T>): Promise<Result<T>> {
  try {
    rateLimit(bucket);
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof AIError) return { ok: false, error: e.message, code: e.code };
    console.error(e);
    return { ok: false, error: "We couldn't generate a response right now. Please check your connection and try again.", code: "unknown" };
  }
}

/** Wrap user content so the model treats it as data, not instructions. */
export function fence(label: string, value: string | undefined) {
  const v = (value ?? "").trim() || "(not provided)";
  return `<${label}>\n${v}\n</${label}>`;
}
