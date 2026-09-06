import { exports } from "cloudflare:workers";
import { expectResendEmail } from "./resend-mock";

export { expectResendEmail } from "./resend-mock";

export const ORIGIN = "https://voxstage.test";

/** Dispatches a request through the Worker's default export (same isolate as the tests). */
export function dispatch(path: string, init?: RequestInit): Promise<Response> {
  return exports.default.fetch(new Request(`${ORIGIN}${path}`, init));
}

export function requestCode(email: string, ip = "203.0.113.1", origin?: string) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "cf-connecting-ip": ip,
  };
  if (origin) headers.origin = origin;
  return dispatch("/api/auth/request-code", {
    method: "POST",
    headers,
    body: JSON.stringify({ email }),
  });
}

export function verify(email: string, code: string, ip = "203.0.113.1") {
  return dispatch("/api/auth/verify", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: JSON.stringify({ email, code }),
  });
}

/** Full happy path: request → intercept email → verify. Returns the session cookie. */
export async function signIn(email: string, ip: string) {
  const sent = expectResendEmail();
  const req = await requestCode(email, ip);
  if (req.status !== 202) throw new Error(`request-code failed: ${req.status}`);
  const { code } = await sent;
  const res = await verify(email, code, ip);
  if (res.status !== 200) throw new Error(`verify failed: ${res.status}`);
  return {
    cookie: sessionCookieFrom(res),
    body: (await res.json()) as { user: { email: string } },
  };
}

export function sessionCookieFrom(res: Response): string {
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = /vox_session=([^;]+)/.exec(setCookie);
  if (!match?.[1]) throw new Error(`no vox_session cookie in: ${setCookie}`);
  return `vox_session=${match[1]}`;
}

export function me(cookie?: string) {
  return dispatch("/api/auth/me", { headers: cookie ? { cookie } : {} });
}
