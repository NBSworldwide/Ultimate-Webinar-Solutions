import { createHash } from "node:crypto";
import { getDb } from "@/lib/db";

export class RateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many requests. Please try again shortly.");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "anonymous";
}

/** Shared, persistent bucket storage keeps the login limit consistent across serverless instances. */
export async function enforceRateLimit(scope: string, key: string, limit: number, windowMs: number): Promise<void> {
  const now = Date.now();
  const bucketKey = createHash("sha256").update(`${scope}:${key}`).digest("hex");
  const expiresAt = now + windowMs;
  const database = getDb();
  await database.query("DELETE FROM auth_rate_limits WHERE reset_at <= $1", [now]);
  const { rows } = await database.query<{ attempt_count: number; reset_at: number | string }>(`
    INSERT INTO auth_rate_limits (bucket_key, attempt_count, reset_at)
    VALUES ($1, 1, $2)
    ON CONFLICT (bucket_key) DO UPDATE SET
      attempt_count = CASE
        WHEN auth_rate_limits.reset_at <= $3 THEN 1
        ELSE LEAST(auth_rate_limits.attempt_count + 1, $4 + 1)
      END,
      reset_at = CASE
        WHEN auth_rate_limits.reset_at <= $3 THEN $2
        ELSE auth_rate_limits.reset_at
      END
    RETURNING attempt_count, reset_at
  `, [bucketKey, expiresAt, now, limit]);
  if (Number(rows[0].attempt_count) > limit) {
    throw new RateLimitError(Math.max(1, Math.ceil((Number(rows[0].reset_at) - now) / 1000)));
  }
}
