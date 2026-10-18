import "server-only";

/**
 * Einfaches In-Memory-Rate-Limit (Fixed Window) für eigene API-Endpunkte.
 * Ausreichend für den Betrieb mit einem App-Container. Login, Registrierung und
 * Passwort-Reset werden zusätzlich von Better Auth datenbankgestützt begrenzt.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();
let lastSweep = Date.now();

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    lastSweep = now;
  }
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  b.count += 1;
  if (b.count > max) return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}

export function resetRateLimits() {
  buckets.clear();
}
