import { describe, expect, it } from "vitest";
import type { Env } from "../src/env";
import { randomSixDigitCode, randomToken, timingSafeEqual } from "../src/lib/crypto";
import { sendSignInCode } from "../src/lib/email";
import { normalizeEmail } from "../src/lib/users";

describe("crypto helpers", () => {
  it("produces zero-padded six-digit codes", () => {
    for (let i = 0; i < 200; i++) expect(randomSixDigitCode()).toMatch(/^\d{6}$/);
  });

  it("produces base64url session tokens of 43 chars", () => {
    expect(randomToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("compares digests without leaking on length", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Lando@Example.com ")).toBe("lando@example.com");
  });
  it("rejects junk", () => {
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail("nope")).toBeNull();
    expect(normalizeEmail("a@b")).toBeNull();
    expect(normalizeEmail(42)).toBeNull();
    expect(normalizeEmail(`${"x".repeat(250)}@example.com`)).toBeNull();
  });
});

describe("sendSignInCode without a provider key", () => {
  const base = { APP_NAME: "VoxStage", EMAIL_FROM: "VoxStage <onboarding@resend.dev>" };

  it("is unavailable when echo is off", async () => {
    const env = { ...base, AUTH_DEV_ECHO: "0" } as unknown as Env;
    expect(await sendSignInCode(env, "a@example.com", "123456")).toBe("unavailable");
  });

  it("is logged when echo is on", async () => {
    const env = { ...base, AUTH_DEV_ECHO: "1" } as unknown as Env;
    expect(await sendSignInCode(env, "a@example.com", "123456")).toBe("logged");
  });
});
