# Design direction for VoxStage — "Instrument" (Direction A), 2026-09-08

Status: **proposal for Lando's approval** (design documents are pre-approved deliverables;
nothing here is application code). The visual reference is a design canvas — a style
board, six phone screens, and two low-fi alternate directions — published as an artifact
(https://claude.ai/code/artifact/2d2637df-adae-44b4-b61f-ce14b881c59c) and kept as source
in `docs/design/2027-direction-a/`. **No code is written until Lando
approves the mockup and the foundation plan (`docs/FOUNDATION-PLAN.md`).**

## 1. What Lando decided (ten true/false questions, 2026-09-08)

| # | Question | Answer |
|---|---|---|
| 1 | Keep evolving the "stage light" look (aubergine / amber / serif)? | **No — fresh identity, still dark** |
| 2 | Encouraging coach rather than a precise professional tool? | **No — precise, data-forward tool** |
| 3 | Familiar iPhone conventions (tab bar, sheets, system-style controls)? | **Yes** |
| 4 | The first thing a new user does is a short voice check? | **Yes** |
| 5 | Songs organised as setlists for real performances? | **Yes** |
| 6 | Live pitch as a cinematic picture, precise underneath? | **Yes** |
| 7 | Game-style rewards (streaks, badges, confetti)? | **No** — personal bests and a ready state do the motivating |
| 8 | Interface reacts to the voice with living light? | **Yes** |
| 9 | Bold cinematic motion throughout? | **No** — subtle and quick; cinematic only at the range reveal and the result |
| 10 | Performance layout readable from a mic stand? | **Yes** — a dedicated stage mode |

Earlier decisions still in force: phone-first (desktop must merely not break), dark only,
offline / add-to-home-screen not for the beta.

## 2. The direction in one paragraph

**A precision instrument on a dark stage; the only warmth is the singer's voice.**
Graphite-black surfaces with a calibrated tick grid, white-hot type in a characterful
grotesque, mono readouts for everything measured. The singer's own signal — the note being
sung — is rendered as *living light* whose temperature is the feedback: cold blue when
flat, white-hot when on pitch, hot rose when sharp. It sits behind the interface, never on
top of text, so it can be read from a metre away without reading a number. Everything else
is quiet: iPhone-familiar navigation, 120–320 ms motion, and exactly two cinematic moments.

## 3. Tokens (as drawn on the style board; every pair verified against WCAG 2.2 AA)

| Token | Value | Use | Contrast (measured) |
|---|---|---|---|
| Void | `#06080F` | ground | — |
| Surface | `#0E1119` | cards | — |
| Raise | `#171B26` | rows, sheets, fields | — |
| Ink | `#F3F5F9` | primary text | 18.3 : 1 on Void |
| Ink 2 | `#AEB5C4` | secondary text | 9.7 : 1 Void · 8.4 : 1 Raise |
| Ink 3 | `#848CA0` | captions, placeholders | 5.1 : 1 on Raise (min) |
| Signal | `#5B8CFF` | interactive, focus, active tab | 6.3 : 1 on Void; button text is Void on Signal (6.3 : 1) |
| Voice · flat / on / sharp | `#6C7CFF` · `#FFF4E0` · `#FF6B8A` | living light + sung line | 5.7 / 18.4 / 7.4 : 1 on Void |
| Ready / Attention / Problem | `#4FD1A0` · `#FFC857` · `#FF5C7A` | status only | 10.4 / 13.0 / 5.8 : 1 |

Type: **Bricolage Grotesque** (variable, optical size 12–96 + weight) for everything read;
**IBM Plex Mono** (tabular figures) for everything measured — cents, notes, keys, scores.
Ramp: display 40/44 · title 28/32 · heading 20/26 · body 16/24 · label 13/16 · readouts
18–120 (stage). Spacing on a 4-pt scale; radii 8 / 14 / 22 / pill; controls 52 px tall in
the hand, **76 px on stage**; stage type ≥ 56 px with a 120 px note letter.

Motion: micro 120 ms, transitions 200–240 ms, sheets and routes 320 ms with a
bounce-free spring; the range reveal and the result take 1.2 s; reduced-motion users get
instant state changes while the living light still breathes (it is feedback, not
decoration).

## 4. Why this is a 2027 design, not a 2024 one (sources checked 2026-09-08)

- **Navigation follows the platform.** Since iOS 26 the tab bar is an inset, translucent
  "Liquid Glass" capsule floating over content, and Apple's guidance reserves that
  material for the navigation layer and recommends system components as the starting
  point — the mockup's floating four-tab bar and sheets follow that exactly, while the
  content layer stays fully custom. (learnui.design "iOS 26 Design Guidelines";
  createwithswift.com "Liquid Glass: Hierarchy, Harmony and Consistency"; bitrig.com
  "Liquid Glass best practices".)
- **Accessibility is measured against the operative standard.** WCAG 2.2 AA remains the
  legal benchmark; WCAG 3.0 is still a working draft and its contrast algorithm (APCA is
  the candidate) is "yet to be determined" as of April 2026 — so every token pair above is
  checked against 2.2's 4.5 : 1, and the darker "Ink 3" of the old build (4.10 : 1) is
  gone. (adrianroselli.com "WCAG3 contrast as of April 2026"; accessibe.com "WCAG 3.0
  explained".)
- **Depth by layering, not colour.** Current practice builds z-hierarchy with elevation
  (shadow + scale + blur) rather than colour alone; the surfaces stack Void → Surface →
  Raise with a hairline and a shadow, and the tab bar floats. (muz.li "What's changing in
  mobile app design 2026".)
- **Motion is purposeful and has a fallback.** Excess motion costs performance and
  accessibility; `prefers-reduced-motion` and the iOS setting must degrade to instant
  states — the rule set in §3. (elinext.com; designstudiouiux.com 2026 trend reviews.)
- **Typography as brand.** Distinctive faces are now the primary branding tool on mobile;
  Bricolage's optical-size axis lets one family be both the 44 px headline and the 13 px
  label without a second display face. (designstudiouiux.com.)
- **Thumb-first, arm's-length second.** Bottom-anchored primary actions and 52 px controls
  in the hand; a separate stage layout for the mic-stand distance the product is actually
  used at — the one thing generic trend lists do not cover and this product needs.

## 5. The alternates on the canvas (drawn low-fi on purpose)

- **Direction B — Editorial mono.** Black and white, one mono typeface, hairline rules,
  one red. Wins on clarity and timelessness; loses the living light (feedback becomes
  numbers only) and can read cold to a nervous singer.
- **Direction C — Warm graphite.** Charcoal with a brown lean, brass, soft cards. The most
  inviting; sits closest to the identity Lando asked to move away from and looks the least
  precise.

Direction A is the recommendation because it is the only one that carries all ten answers
at once: precise *and* alive, familiar *and* distinctive, quiet *and* cinematic where it
counts.

## 6. What approval unlocks (still gated by rule 1)

Approving Direction A + `docs/FOUNDATION-PLAN.md` = the go for the foundation milestone.
Its first commits implement these tokens and primitives; the six screens become the
acceptance targets for the sign-in flow (now), and the reference for M2–M5 screens
(later). Sample content on the canvas (song titles, the 94 score, +6 ¢, B −3) is
illustrative, not measured.
