import { RateLimitError } from "@/domain/errors/application-error";
import { env } from "@/lib/env";

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

const buckets = new Map<string, Bucket>();

export function consumeRateLimit(
  key: string,
  options: { limit?: number; windowSeconds?: number } = {},
  now = Date.now(),
): RateLimitDecision {
  if (!env.RATE_LIMIT_ENABLED) {
    return {
      allowed: true,
      limit: Number.POSITIVE_INFINITY,
      remaining: Number.POSITIVE_INFINITY,
      retryAfterSeconds: 0,
    };
  }

  const limit = Math.max(1, Math.trunc(options.limit ?? env.RATE_LIMIT_MAX_REQUESTS));
  const windowSeconds = Math.max(
    1,
    Math.trunc(options.windowSeconds ?? env.RATE_LIMIT_WINDOW_SECONDS),
  );
  const existing = buckets.get(key);
  const bucket =
    !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + windowSeconds * 1000 }
      : existing;
  bucket.count += 1;
  buckets.set(key, bucket);

  if (buckets.size > 10_000) pruneRateLimitBuckets(now);
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return {
    allowed: bucket.count <= limit,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds,
  };
}

export function enforceRateLimit(
  key: string,
  options: { limit?: number; windowSeconds?: number } = {},
): RateLimitDecision {
  const decision = consumeRateLimit(key, options);
  if (!decision.allowed) throw new RateLimitError(decision.retryAfterSeconds);
  return decision;
}

export function resetRateLimitBuckets(): void {
  buckets.clear();
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

function pruneRateLimitBuckets(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
