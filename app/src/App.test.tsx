import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

type Handler = () => Response;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const routes = new Map<string, Handler>();
const calls: Array<{ key: string; body: unknown }> = [];

beforeEach(() => {
  routes.clear();
  calls.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.pathname
            : new URL(input.url).pathname;
      const key = `${(init?.method ?? "GET").toUpperCase()} ${path}`;
      calls.push({ key, body: typeof init?.body === "string" ? JSON.parse(init.body) : null });
      const handler = routes.get(key);
      if (!handler) throw new Error(`unmocked request: ${key}`);
      return handler();
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const signedOut = () => json(401, { error: "unauthenticated", message: "Please sign in." });

describe("App", () => {
  it("walks a new visitor from email to code to signed in", async () => {
    const user = { id: "u1", email: "lando@example.com", createdAt: 1 };
    routes.set("GET /api/auth/me", signedOut);
    routes.set("POST /api/auth/request-code", () => json(202, { ok: true, delivery: "email" }));
    routes.set("POST /api/auth/verify", () => json(200, { user }));
    routes.set("GET /api/hello", () => json(200, { message: "Hello, lando@example.com", user }));

    const u = userEvent.setup();
    render(<App />);

    await u.type(await screen.findByLabelText(/email/i), "Lando@Example.com");
    await u.click(screen.getByRole("button", { name: /send my code/i }));

    const codeBox = await screen.findByLabelText(/six-digit code/i);
    expect(calls.find((c) => c.key === "POST /api/auth/request-code")?.body).toEqual({
      email: "Lando@Example.com",
    });
    expect(screen.getByText("lando@example.com")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/code sent/i);

    await u.type(codeBox, "123456");
    await u.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByRole("heading", { name: /hello, lando/i })).toBeInTheDocument();
    expect(calls.find((c) => c.key === "POST /api/auth/verify")?.body).toEqual({
      email: "lando@example.com",
      code: "123456",
    });
    expect(await screen.findByText(/connection to the server: working/i)).toBeInTheDocument();
  });

  it("shows the server's message when a code is rejected", async () => {
    routes.set("GET /api/auth/me", signedOut);
    routes.set("POST /api/auth/request-code", () => json(202, { ok: true, delivery: "log" }));
    routes.set("POST /api/auth/verify", () =>
      json(401, {
        error: "invalid_code",
        message: "That code didn't match. Check the email and try again.",
      }),
    );

    const u = userEvent.setup();
    render(<App />);
    await u.type(await screen.findByLabelText(/email/i), "x@example.com");
    await u.click(screen.getByRole("button", { name: /send my code/i }));
    await u.type(await screen.findByLabelText(/six-digit code/i), "000000");
    await u.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByText(/didn't match/i)).toBeInTheDocument();
  });

  it("goes straight to the signed-in screen with a live session", async () => {
    const user = { id: "u1", email: "back@example.com", createdAt: 1 };
    routes.set("GET /api/auth/me", () => json(200, { user }));
    routes.set("GET /api/hello", () => json(200, { message: "Hello, back@example.com", user }));

    render(<App />);
    expect(await screen.findByRole("heading", { name: /hello, back/i })).toBeInTheDocument();
  });
});
