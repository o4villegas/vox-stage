# ADR-0007: Copyright posture — per-user processing, no dedup, no export

**Status:** Accepted 2026-08-29 (PR #1 merged on Lando's explicit instruction) · proposed 2026-08-28

## Context
Users upload commercial recordings they do not own. The working industry posture — Moises
(60M+ users) and LALAL.AI — is: user-uploaded files only, ToS placing rights responsibility
on the user, personal-use framing; no lawsuits found against separation tools 2023–2026,
while suits and settlements hit *generative* audio tools (R31, R28). The cautionary case is
Riffstation, shut down over licensing of distributed content (R29). Cross-user caching of
processed songs would cut GPU cost but converts the service into a distributor of a shared
stem library — the risky category.

## Decision
Architectural guardrails, binding until superseded:
1. Audio is processed **per user, per upload** — no cross-user deduplication or shared
   cache of originals, stems, or analyses.
2. No song/stem catalog of any kind.
3. No sharing, social distribution, or export of processed copyrighted audio in MVP.
4. ToS (drafted before beta) follows the user-bears-rights-responsibility, personal-use
   pattern; counsel review before public launch.

## Consequences
- Higher GPU/storage cost per user — accepted; unit costs are small (ADR-0003).
- Some attractive features (shared setlists with audio, performance sharing) are blocked
  pending legal review and a superseding ADR.
- This is risk posture, not legal advice; no lawsuit-free past guarantees the future.
