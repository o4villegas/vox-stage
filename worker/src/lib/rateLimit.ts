export interface RateLimitResult {
  allowed: boolean;
  count: number;
  retryAfterMs: number;
}

/**
 * Fixed-window counter in D1. One atomic upsert: starts a new window when the old one has
 * elapsed, otherwise increments. Returns whether this hit is within `limit`.
 */
export async function hitRateLimit(
  db: D1Database,
  key: string,
  limit: number,
  windowMs: number,
  now: number,
): Promise<RateLimitResult> {
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (key, window_start, count) VALUES (?1, ?2, 1)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN rate_limits.window_start <= ?2 - ?3 THEN 1 ELSE rate_limits.count + 1 END,
         window_start = CASE WHEN rate_limits.window_start <= ?2 - ?3 THEN ?2 ELSE rate_limits.window_start END
       RETURNING count, window_start`,
    )
    .bind(key, now, windowMs)
    .first<{ count: number; window_start: number }>();

  const count = row?.count ?? 1;
  const windowStart = row?.window_start ?? now;
  const allowed = count <= limit;
  return {
    allowed,
    count,
    retryAfterMs: allowed ? 0 : Math.max(0, windowStart + windowMs - now),
  };
}
