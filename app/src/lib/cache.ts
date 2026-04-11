/** Simple in-memory cache with TTL and request dedup.
 *  Persists across requests within the same Fluid Compute function instance. */

const DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes

const store = new Map<string, { data: unknown; expiresAt: number }>();
const pending = new Map<string, Promise<unknown>>();

/** Strip trailing null/undefined so fn('a','b',undefined) and fn('a','b') hit the same key. */
function normalizeArgs(args: unknown[]): unknown[] {
  const out = [...args];
  while (out.length > 0 && out[out.length - 1] == null) out.pop();
  return out;
}

/**
 * Wrap an async function with in-memory caching.
 * - Cache key = `fnName:JSON(args)` — same store shared across all `cached()` calls.
 * - Concurrent calls for the same key are deduped (single DB hit).
 */
export function cached<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>,
  ttlMs: number = DEFAULT_TTL,
): (...args: Args) => Promise<R> {
  return async (...args: Args): Promise<R> => {
    const key = fn.name + ':' + JSON.stringify(normalizeArgs(args));
    const now = Date.now();

    // Cache hit
    const entry = store.get(key);
    if (entry && entry.expiresAt > now) return entry.data as R;

    // Dedup: reuse in-flight request for same key
    const inflight = pending.get(key);
    if (inflight) return inflight as Promise<R>;

    const promise = fn(...args)
      .then((result) => {
        store.set(key, { data: result, expiresAt: now + ttlMs });
        pending.delete(key);
        return result;
      })
      .catch((err) => {
        pending.delete(key);
        throw err;
      });

    pending.set(key, promise);
    return promise;
  };
}
