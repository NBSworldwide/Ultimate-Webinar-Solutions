const globalForRateLimit = globalThis as unknown as {
  webinarRateLimit?: Map<string, { count: number; resetAt: number }>;
};

export class RateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many requests. Please try again shortly.");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function buckets(): Map<string, { count: number; resetAt: number }> {
  globalForRateLimit.webinarRateLimit ??= new Map();
  return globalForRateLimit.webinarRateLimit;
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "anonymous";
}

/**
 * A small in-process guard for the standalone demo. Production should replace
 * this with a shared edge or Redis-backed limiter before running multiple
 * instances.
 */
export function enforceRateLimit(scope: string, key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const store = buckets();
  for (const [bucketKey, bucket] of store) if (bucket.resetAt <= now) store.delete(bucketKey);

  const bucketKey = `${scope}:${key}`;
  const current = store.get(bucketKey);
  if (!current || current.resetAt <= now) {
    store.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= limit) throw new RateLimitError(Math.max(1, Math.ceil((current.resetAt - now) / 1000)));
  current.count += 1;
}
