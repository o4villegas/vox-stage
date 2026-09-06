import { useEffect, useState } from "react";
import type { PublicUser } from "../../shared/api";
import { api } from "./api";
import { Home } from "./components/Home";
import { SignIn } from "./components/SignIn";
import { Stage } from "./components/Stage";
import { Wordmark } from "./components/Wordmark";

type SessionState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; user: PublicUser };

export function App() {
  const [session, setSession] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((r) => {
        if (!cancelled) setSession({ status: "signed-in", user: r.user });
      })
      .catch(() => {
        if (!cancelled) setSession({ status: "signed-out" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Stage />
      <div className="shell">
        <header className="masthead">
          <Wordmark />
          {session.status === "signed-in" ? (
            <span className="who" title={session.user.email}>
              {session.user.email}
            </span>
          ) : (
            <span className="who who--muted">staging</span>
          )}
        </header>
        <main className="center">
          {session.status === "loading" && (
            <p className="loading" aria-live="polite">
              Warming up the lights…
            </p>
          )}
          {session.status === "signed-out" && (
            <SignIn onSignedIn={(user) => setSession({ status: "signed-in", user })} />
          )}
          {session.status === "signed-in" && (
            <Home user={session.user} onSignedOut={() => setSession({ status: "signed-out" })} />
          )}
        </main>
        <footer className="foot">VoxStage · milestone 1 · staging</footer>
      </div>
    </>
  );
}
