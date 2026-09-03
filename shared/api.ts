// Types shared between the SPA (app/) and the Worker (worker/). Keep this file
// dependency-free: it is imported by both TypeScript projects.

export interface PublicUser {
  id: string;
  email: string;
  createdAt: number;
}

export interface ApiErrorBody {
  error: string;
  message: string;
  retryAfterSeconds?: number;
}

export interface RequestCodeBody {
  email: string;
}

export interface RequestCodeResponse {
  ok: true;
  /** "email" = a message was sent; "log" = dev echo mode, code is in the Worker log. */
  delivery: "email" | "log";
}

export interface VerifyBody {
  email: string;
  code: string;
}

export interface VerifyResponse {
  user: PublicUser;
}

export interface MeResponse {
  user: PublicUser;
}

export interface HelloResponse {
  message: string;
  user: PublicUser;
}
