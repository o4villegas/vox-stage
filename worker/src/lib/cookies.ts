import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { AppEnv } from "../env";
import { SESSION_COOKIE, SESSION_TTL_MS } from "./sessions";

function isHttps(c: Context<AppEnv>): boolean {
  return new URL(c.req.url).protocol === "https:";
}

export function readSessionCookie(c: Context<AppEnv>): string | undefined {
  return getCookie(c, SESSION_COOKIE);
}

/** HttpOnly + SameSite=Lax + Secure (on https). Plain http is only ever local dev. */
export function writeSessionCookie(c: Context<AppEnv>, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isHttps(c),
    sameSite: "Lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export function clearSessionCookie(c: Context<AppEnv>): void {
  deleteCookie(c, SESSION_COOKIE, { path: "/", secure: isHttps(c) });
}
