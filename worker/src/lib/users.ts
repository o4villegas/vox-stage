import type { PublicUser } from "../../../shared/api";

export interface User {
  id: string;
  email: string;
  createdAt: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trims + lowercases; returns null when the value is not a plausible email address. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || !EMAIL_RE.test(email)) return null;
  return email;
}

/** Creates the user on first sign-in, or stamps last_sign_in_at on later ones. */
export async function upsertUser(db: D1Database, email: string, now: number): Promise<User> {
  const row = await db
    .prepare(
      `INSERT INTO users (id, email, created_at, last_sign_in_at) VALUES (?1, ?2, ?3, ?3)
       ON CONFLICT(email) DO UPDATE SET last_sign_in_at = ?3
       RETURNING id, email, created_at`,
    )
    .bind(crypto.randomUUID(), email, now)
    .first<{ id: string; email: string; created_at: number }>();
  if (!row) throw new Error("upsertUser: no row returned");
  return { id: row.id, email: row.email, createdAt: row.created_at };
}

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, createdAt: user.createdAt };
}
