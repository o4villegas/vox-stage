# ADR-0008: Portable SPA now, Capacitor for the App Store later (floor iOS 14.5)

**Status:** Accepted 2026-08-29 (PR #1 merged on Lando's explicit instruction) · proposed 2026-08-28

## Context
Pillars: web-first mobile-optimized MVP, then a real App Store app (developer account
exists). Verified: everything the client plane needs works in iOS web contexts —
AudioWorklet since iOS 14.5, mic in WKWebView since iOS 14.3 with Info.plist keys,
BiquadFilter universal (R24); Capacitor mic access is proven, with a known per-session
permission re-prompt fixed by implementing `WKUIDelegate decideMediaCapturePermissionFor`
in the native shell (R25). SSR frameworks would couple the UI to a server runtime and
complicate wrapping.

## Decision
Build the frontend as a plain SPA/PWA (no SSR) served from Workers static assets, with all
audio features written against standard Web Audio. Target floor: **iOS 14.5+ / equivalent
modern Android** (pending Lando's confirmation). The App Store phase wraps the same bundle
in Capacitor plus a minimal native layer (mic-permission delegate, icons, store metadata).

## Consequences
- One codebase from MVP through App Store launch; no rewrite between phases.
- Native-only capabilities (lower-latency audio pipelines, background audio) stay
  unavailable until/unless a native audio layer is added — a future ADR if scoring fairness
  demands it.
- SEO-dependent marketing pages, if ever needed, live outside the app shell.
