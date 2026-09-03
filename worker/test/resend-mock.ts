// The Worker under test runs in the same isolate as the tests, so stubbing the global
// `fetch` intercepts its outbound call to Resend (the plugin's old fetchMock was removed
// in @cloudflare/vitest-plugin v1; docs recommend stubbing globalThis.fetch or MSW).
import { afterAll, afterEach, beforeAll, expect, vi } from "vitest";

export interface SentEmail {
  from: string;
  to: string[];
  subject: string;
  code: string;
}

const RESEND_URL = "https://api.resend.com/emails";

const unclaimed: SentEmail[] = [];
const waiters: Array<(email: SentEmail) => void> = [];

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/** Call once at the top of a test file. Registers the fetch stub and its bookkeeping. */
export function installResendMock(): void {
  beforeAll(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = urlOf(input);
      if (url !== RESEND_URL) throw new Error(`unexpected outbound fetch in test: ${url}`);
      const auth = new Headers(init?.headers).get("authorization") ?? "";
      if (!auth.startsWith("Bearer ")) throw new Error("Resend call without bearer token");
      const body = JSON.parse(String(init?.body)) as {
        from: string;
        to: string[];
        subject: string;
      };
      const email: SentEmail = { ...body, code: /\b(\d{6})\b/.exec(body.subject)?.[1] ?? "" };
      const waiter = waiters.shift();
      if (waiter) waiter(email);
      else unclaimed.push(email);
      return Response.json({ id: "email_test" });
    });
  });

  afterEach(() => {
    expect(waiters, "an expected email was never sent").toHaveLength(0);
    expect(unclaimed, "an email was sent that no test expected").toHaveLength(0);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });
}

/** Resolves with the next email handed to Resend (or one already sent and unclaimed). */
export function expectResendEmail(): Promise<SentEmail> {
  return new Promise((resolve) => {
    const ready = unclaimed.shift();
    if (ready) resolve(ready);
    else waiters.push(resolve);
  });
}
