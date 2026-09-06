import type {
  ApiErrorBody,
  HelloResponse,
  MeResponse,
  RequestCodeResponse,
  VerifyResponse,
} from "../../shared/api";

/** A non-2xx answer from the API, carrying the server's plain-English message. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfterSeconds: number | undefined;

  constructor(status: number, body: Partial<ApiErrorBody>) {
    super(body.message ?? "Something went wrong. Please try again.");
    this.name = "ApiError";
    this.status = status;
    this.code = body.error ?? "unknown";
    this.retryAfterSeconds = body.retryAfterSeconds;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (init.body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(path, { credentials: "same-origin", ...init, headers });

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) throw new ApiError(res.status, (body ?? {}) as Partial<ApiErrorBody>);
  return body as T;
}

export const api = {
  me: () => request<MeResponse>("/api/auth/me"),
  hello: () => request<HelloResponse>("/api/hello"),
  requestCode: (email: string) =>
    request<RequestCodeResponse>("/api/auth/request-code", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  verify: (email: string, code: string) =>
    request<VerifyResponse>("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),
  logout: () => request<undefined>("/api/auth/logout", { method: "POST" }),
};
