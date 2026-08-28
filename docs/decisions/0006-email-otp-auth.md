# ADR-0006: Single-method email-OTP authentication

**Status:** Proposed · 2026-08-28

## Context
Lando's MVP pillar: "no multi-auth — keep it simple for dev." Separately, the app is headed
to the App Store, where guideline 4.8 requires Sign in with Apple **only** for apps using
third-party/social login; an app that "exclusively uses your company's own account setup
and sign-in systems" is exempt (R27).

## Decision
One auth method: email one-time codes (D1-backed codes + httpOnly session cookies, rate
limited). No passwords to store, no OAuth providers, no social logins.

## Consequences
- Simplest credible auth for MVP; identical UX inside a future Capacitor shell.
- Preserves the guideline 4.8 exemption — adding ANY social login later voids it and drags
  in Sign in with Apple; that trade-off would need a superseding ADR.
- Requires one transactional-email dependency (provider chosen at M1).
