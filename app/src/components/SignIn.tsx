import { type FormEvent, useEffect, useRef, useState } from "react";
import type { PublicUser } from "../../../shared/api";
import { ApiError, api } from "../api";

interface Props {
  onSignedIn: (user: PublicUser) => void;
}

type Step = { kind: "email" } | { kind: "code"; email: string; delivery: "email" | "log" };

const RESEND_COOLDOWN_S = 30;

export function SignIn({ onSignedIn }: Props) {
  const [step, setStep] = useState<Step>({ kind: "email" });
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [shake, setShake] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step.kind === "code") codeRef.current?.focus();
  }, [step.kind]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode(target: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await api.requestCode(target);
      setStep({ kind: "code", email: target.trim().toLowerCase(), delivery: res.delivery });
      setCode("");
      setCooldown(RESEND_COOLDOWN_S);
      setNotice(
        res.delivery === "email"
          ? "Code sent. Check your inbox — and the spam folder, just in case."
          : "Test mode: the code was written to the server log instead of being emailed.",
      );
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitEmail(e: FormEvent) {
    e.preventDefault();
    await sendCode(email);
  }

  async function onSubmitCode(e: FormEvent) {
    e.preventDefault();
    if (step.kind !== "code") return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.verify(step.email, code);
      onSignedIn(res.user);
    } catch (err) {
      setError(messageFor(err));
      setNotice(null);
      setShake(true);
      if (err instanceof ApiError && err.code !== "invalid_code") setCode("");
      codeRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  if (step.kind === "email") {
    return (
      <form className="card" onSubmit={onSubmitEmail} noValidate>
        <p className="eyebrow">Sign in</p>
        <h1 className="title">
          Every song, <em>in your key.</em>
        </h1>
        <p className="lede">
          Enter your email and we'll send a six-digit code. There's no password to remember.
        </p>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            required
          />
        </div>
        <button className="btn" type="submit" disabled={busy || email.trim() === ""}>
          {busy ? "Sending…" : "Send my code"}
        </button>
        <p className={statusClass(error, null)} role="status" aria-live="polite">
          {error ?? ""}
        </p>
      </form>
    );
  }

  const codeClass = `input input--code${shake ? " shake" : ""}`;
  return (
    <form className="card" onSubmit={onSubmitCode} noValidate>
      <p className="eyebrow">Check your email</p>
      <h1 className="title">Enter the code.</h1>
      <p className="lede">
        We sent six digits to <strong>{step.email}</strong>. It works for 10 minutes.
      </p>
      <div className="field">
        <label htmlFor="code">Six-digit code</label>
        <input
          ref={codeRef}
          id="code"
          className={codeClass}
          onAnimationEnd={() => setShake(false)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          disabled={busy}
        />
      </div>
      <button className="btn" type="submit" disabled={busy || code.length !== 6}>
        {busy ? "Checking…" : "Sign in"}
      </button>
      <div className="row">
        <button
          className="btn btn--ghost"
          type="button"
          disabled={busy}
          onClick={() => {
            setStep({ kind: "email" });
            setError(null);
            setNotice(null);
          }}
        >
          Change email
        </button>
        <button
          className="btn btn--ghost"
          type="button"
          disabled={busy || cooldown > 0}
          onClick={() => sendCode(step.email)}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
      <p className={statusClass(error, notice)} role="status" aria-live="polite">
        {error ?? notice ?? ""}
      </p>
    </form>
  );
}

function statusClass(error: string | null, notice: string | null): string {
  if (error) return "status status--bad";
  if (notice) return "status status--ok";
  return "status";
}

function messageFor(err: unknown): string {
  return err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
}
