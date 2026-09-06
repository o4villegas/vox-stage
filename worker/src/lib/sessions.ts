import { randomToken, sha256Hex } from "./crypto";
import type { User } from "./users";

export const SESSION_COOKIE = "vox_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_RENEW_BELOW_MS = 15 * 24 * 60 * 60 * 1000;
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

export interface ResolvedSession {
  user: User;
  /** True when the expiry was pushed out; the caller should re-set the cookie. */
  renewed: boolean;
}

export async function createSession(db: D1Database, userId: string, now: number): Promise<string> {
  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  await db.batch([
    db.prepare("DELETE FROM sessions WHERE expires_at < ?1").bind(now),
    db
      .prepare(
        `INSERT INTO sessions (token_hash, user_id, created_at, expires_at, last_seen_at)
         VALUES (?1, ?2, ?3, ?4, ?3)`,
      )
      .bind(tokenHash, userId, now, now + SESSION_TTL_MS),
  ]);
  return token;
}

interface SessionRow {
  expires_at: number;
  last_seen_at: number;
  id: string;
  email: string;
  created_at: number;
}

export async function resolveSession(
  db: D1Database,
  token: string,
  now: number,
): Promise<ResolvedSession | null> {
  const tokenHash = await sha256Hex(token);
  const row = await db
    .prepare(
      `SELECT s.expires_at, s.last_seen_at, u.id, u.email, u.created_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?1`,
    )
    .bind(tokenHash)
    .first<SessionRow>();
  if (!row) return null;

  if (row.expires_at <= now) {
    await db.prepare("DELETE FROM sessions WHERE token_hash = ?1").bind(tokenHash).run();
    return null;
  }

  const renewed = row.expires_at - now < SESSION_RENEW_BELOW_MS;
  if (renewed || now - row.last_seen_at > TOUCH_INTERVAL_MS) {
    await db
      .prepare("UPDATE sessions SET expires_at = ?2, last_seen_at = ?3 WHERE token_hash = ?1")
      .bind(tokenHash, renewed ? now + SESSION_TTL_MS : row.expires_at, now)
      .run();
  }
  return { user: { id: row.id, email: row.email, createdAt: row.created_at }, renewed };
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
  const tokenHash = await sha256Hex(token);
  await db.prepare("DELETE FROM sessions WHERE token_hash = ?1").bind(tokenHash).run();
}
