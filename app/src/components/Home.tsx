import { useEffect, useState } from "react";
import type { PublicUser } from "../../../shared/api";
import { api } from "../api";

interface Props {
  user: PublicUser;
  onSignedOut: () => void;
}

const NEXT_UP = [
  ["Your vocal profile", "A short guided exercise finds your range and your comfortable zone."],
  ["Your songs", "Upload a track. We separate the vocal from the band."],
  ["Sync", "The song plays in the key that fits your voice, instantly."],
  ["Score", "Sing along and see, note by note, how close you are."],
] as const;

export function Home({ user, onSignedOut }: Props) {
  const [serverHello, setServerHello] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .hello()
      .then((r) => {
        if (!cancelled) setServerHello(r.message);
      })
      .catch(() => {
        if (!cancelled) setServerHello(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    setBusy(true);
    try {
      await api.logout();
    } finally {
      setBusy(false);
      onSignedOut();
    }
  }

  const name = user.email.split("@")[0] ?? user.email;

  return (
    <section className="card">
      <p className="eyebrow">You're in</p>
      <h1 className="title">
        Hello, <em>{name}</em>.
      </h1>
      <p className="lede">
        The lights are on. This is milestone one: a working sign-in. Here's what comes next, in
        order.
      </p>
      <ol className="roadmap">
        {NEXT_UP.map(([title, blurb]) => (
          <li key={title}>
            <span>{title}</span>
            <small>{blurb}</small>
          </li>
        ))}
      </ol>
      <p className={serverHello ? "pill pill--ok" : "pill"} role="status">
        {serverHello
          ? "Signed-in connection to the server: working"
          : "Checking the signed-in connection…"}
      </p>
      <button className="btn btn--ghost" type="button" onClick={signOut} disabled={busy}>
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </section>
  );
}
