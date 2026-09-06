import type { Env } from "../env";

export type Delivery = "sent" | "logged" | "unavailable";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Delivers a sign-in code. Never returns the code to the caller's HTTP client.
 *  - AUTH_DEV_ECHO="1": the code is also written to the Worker log (staging convenience).
 *  - No RESEND_API_KEY: "logged" if echo is on, otherwise "unavailable".
 *  - Resend rejects the send: logged with status; "logged" if echo is on, else "unavailable".
 */
export async function sendSignInCode(env: Env, to: string, code: string): Promise<Delivery> {
  const echo = env.AUTH_DEV_ECHO === "1";
  if (echo) console.log(JSON.stringify({ event: "auth.code_echo", to, code }));

  if (!env.RESEND_API_KEY) {
    if (!echo) console.error(JSON.stringify({ event: "auth.email_unconfigured" }));
    return echo ? "logged" : "unavailable";
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [to],
      subject: `${code} is your ${env.APP_NAME} sign-in code`,
      text: renderText(env.APP_NAME, code),
      html: renderHtml(env.APP_NAME, code),
    }),
  });

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    console.error(JSON.stringify({ event: "auth.email_send_failed", status: res.status, detail }));
    return echo ? "logged" : "unavailable";
  }
  return "sent";
}

function renderText(appName: string, code: string): string {
  return [
    `Your ${appName} sign-in code is ${code}.`,
    "",
    "It works for 10 minutes. If you didn't ask for it, you can ignore this email.",
  ].join("\n");
}

function renderHtml(appName: string, code: string): string {
  const digits = code.split("").join(" ");
  return [
    '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px;color:#1a1523">',
    `<p style="margin:0 0 8px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#a2621b">${escapeHtml(appName)}</p>`,
    '<p style="margin:0 0 20px;font-size:17px;line-height:1.5">Here is your sign-in code:</p>',
    `<p style="margin:0 0 20px;font-size:38px;font-weight:600;letter-spacing:.2em;font-variant-numeric:tabular-nums">${digits}</p>`,
    '<p style="margin:0;font-size:14px;line-height:1.5;color:#5c5566">It works for 10 minutes. If you didn&#39;t ask for it, you can ignore this email.</p>',
    "</div>",
  ].join("");
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}
