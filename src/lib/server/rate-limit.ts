import { RateLimitError } from "@/lib/errors";

/**
 * Lightweight server-side rate limiting. Uses an in-process sliding window by
 * default; when REDIS_URL is set a Redis-backed counter could be swapped in —
 * the interface is identical (see lib/server/redis.ts for the optional client).
 */
interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function prune(key: string, windowMs: number) {
  const b = buckets.get(key);
  if (!b) return;
  const now = Date.now();
  b.hits = b.hits.filter((t) => now - t < windowMs);
  if (b.hits.length === 0) buckets.delete(key);
}

export async function rateLimit(opts: { key: string; limit: number; windowSec?: number }): Promise<void> {
  const windowMs = (opts.windowSec ?? 60) * 1000;
  if (buckets.size > MAX_BUCKETS) buckets.clear();
  prune(opts.key, windowMs);
  const now = Date.now();
  let bucket = buckets.get(opts.key);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(opts.key, bucket);
  }
  if (bucket.hits.length >= opts.limit) {
    const retryAfter = Math.ceil((windowMs - (now - bucket.hits[0])) / 1000);
    const err = new RateLimitError();
    (err as unknown as { retryAfter?: number }).retryAfter = Math.max(1, retryAfter);
    throw err;
  }
  bucket.hits.push(now);
}
