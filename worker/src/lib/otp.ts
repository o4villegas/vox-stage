import { randomHex, randomSixDigitCode, sha256Hex, timingSafeEqual } from "./crypto";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export type VerifyOutcome = "ok" | "invalid" | "expired" | "locked";

/** Issues a fresh code for `email`, replacing any earlier one. Returns the plaintext code. */
export async function issueCode(db: D1Database, email: string, now: number): Promise<string> {
  const code = randomSixDigitCode();
  const salt = randomHex(16);
  const codeHash = await sha256Hex(`${salt}:${code}`);
  await db.batch([
    db.prepare("DELETE FROM otp_codes WHERE email = ?1 OR expires_at < ?2").bind(email, now),
    db
      .prepare(
        `INSERT INTO otp_codes (id, email, code_hash, salt, expires_at, attempts, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)`,
      )
      .bind(crypto.randomUUID(), email, codeHash, salt, now + OTP_TTL_MS, now),
  ]);
  return code;
}

interface CodeRow {
  id: string;
  code_hash: string;
  salt: string;
  expires_at: number;
  attempts: number;
}

/** Checks `code` against the newest code for `email`; consumes it on success. */
export async function verifyCode(
  db: D1Database,
  email: string,
  code: string,
  now: number,
): Promise<VerifyOutcome> {
  const row = await db
    .prepare(
      `SELECT id, code_hash, salt, expires_at, attempts FROM otp_codes
       WHERE email = ?1 ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(email)
    .first<CodeRow>();
  if (!row) return "invalid";

  if (row.expires_at <= now) {
    await db.prepare("DELETE FROM otp_codes WHERE id = ?1").bind(row.id).run();
    return "expired";
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    await db.prepare("DELETE FROM otp_codes WHERE id = ?1").bind(row.id).run();
    return "locked";
  }

  const expected = await sha256Hex(`${row.salt}:${code}`);
  if (!timingSafeEqual(expected, row.code_hash)) {
    const updated = await db
      .prepare("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?1 RETURNING attempts")
      .bind(row.id)
      .first<{ attempts: number }>();
    if ((updated?.attempts ?? OTP_MAX_ATTEMPTS) >= OTP_MAX_ATTEMPTS) {
      await db.prepare("DELETE FROM otp_codes WHERE id = ?1").bind(row.id).run();
      return "locked";
    }
    return "invalid";
  }

  await db.prepare("DELETE FROM otp_codes WHERE id = ?1").bind(row.id).run();
  return "ok";
}
