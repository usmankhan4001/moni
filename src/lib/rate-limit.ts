import { headers } from "next/headers";

/**
 * In-memory, single-instance rate limiter.
 *
 * NOTE: this bucket map lives in process memory, so it only limits requests
 * hitting THIS server instance. A horizontally-scaled (multi-instance)
 * deployment would need a shared store (e.g. Redis) instead — that's a
 * documented v1 tradeoff, not a bug to fix now.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (bucket.count >= limit) return { ok: false, retryAfterMs: bucket.resetAt - now };
  bucket.count++;
  return { ok: true };
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
