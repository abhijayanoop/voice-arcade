# Architecture

## Shape

```
Browser (static SPA on Vercel)                    Supabase
  Arcade UI ── Session module ── Api adapter ───▶  RPC functions ─▶ Postgres (tables deny direct access)
  Blip runtime                      │              Storage bucket (private, insert-only)
  Capture module (pure)             └─ memoryApi (tests, offline dev)

Local machine
  export-findings script (service key) ─▶ findings.json ─▶ portfolio (separate project, static)
```

One backend, no custom server (ADR 0001). The portfolio never talks to Supabase (ADR 0004).

## Stack

| Concern | Choice |
|---|---|
| Build | Vite, React 18, TypeScript strict |
| Routing | React Router, client-side, SPA fallback rewrite on the host |
| State | A reducer-driven Session module exposed through React context; no state library |
| Styling | Plain CSS: variables generated from `docs/design/tokens.json`, plus `docs/design/arcade.css` (`wa-` classes). No Tailwind |
| Motion | CSS transitions and the Web Animations API; no animation library |
| Backend client | `@supabase/supabase-js`, used only inside the Api adapter |
| Tests | Vitest and Testing Library |
| Hosting | Vercel static deploy |
| Fonts | Anton and Urbanist from Google Fonts |

Environment variables the browser needs: the Supabase project URL and the public (anon or publishable) key. The service key is only for local scripts and never in a `VITE_` variable.

## Modules and interfaces

Modules are deliberately deep: small interface, much behaviour behind it.

**session**: the arcade's brain, UI-agnostic. Interface: events in (register, consent, begin game, complete round, finish arcade, mark quest, submit check-in, submit boss) and a view-state out (current step, which games are unlocked, which mode comes first for each game, results so far, whether a check-in or boss is due). It owns mode-order randomisation, game unlocking, resume-from-link and persistence through the Api. Everything the screens show about progress comes from here.

**capture**: pure functions over an input log. Interface: given the recorded events of one round (typed characters, paste events, input types, timestamps, final text) it returns the round's metrics: words, characters, active time, words per minute, keystroke count, paste count, insert count, edit distance between first and final text, and an integrity verdict. A thin React hook records the log; all judgement lives in the pure part.

**games**: a registry. Each game declares its key, title, card colour, prompts, the screens of its round, and how its extra scores are computed (idea count, caught and dropped items, jargon hits, rubric hits). Adding a game is adding one entry.

**blip**: the agent. Interface: `say(eventKey, vars)` returns the chosen expression, move, target and line, never repeating the last variant for that key; a host component renders Blip, moves it to targets marked `data-blip-target`, types out the bubble, and enters quiet mode while a timer runs. The script table is data parsed from `docs/design/Scripts.md`.

**api**: one interface mirroring the backend functions, with two adapters: Supabase, and an in-memory fake. The fake is how the UI is built before the backend exists and how the Session module is tested.

**scenes**: deterministic generation of Decode scenes and scene sets from a small catalogue; renders as inline SVG.

**ui**: the design-system components (buttons, chips, face rating, HUD, lobby card, podium, result card, voice input, bubble) as thin React wrappers over `wa-` classes.

Suggested layout, not a contract: `src/{app,session,capture,games,blip,api,scenes,ui,styles}`, `scripts/export-findings`, `supabase/migrations`.

## Seams and testing

Two seams, tested first-class through their public interface (TDD):

1. **session**: drive it with events against the in-memory Api and assert view-state, unlock order, resume behaviour and what was persisted.
2. **capture**: feed recorded logs (typed, dictated-by-paste, dictated-by-keystroke, mixed) and assert metrics and verdicts. Expected values come from worked examples written by hand, never recomputed in the test.

The Blip line picker is small enough to cover with one seam-level test (no immediate repeat, variables substituted). SQL functions are checked with a smoke script that registers a player, submits a round and reads state back. Screens are checked against the wireframes by eye.

## Round capture

A round records `beforeinput` input types, key presses, paste events and timestamps on a plain textarea. Typed rounds block paste. Voice rounds allow insertion, because Flow may insert text by paste or by simulated typing. The integrity verdict is a soft flag: text that arrives almost entirely through key presses in a voice round, or through paste in a typed round, is flagged and kept.

Words are whitespace-separated tokens. Words per minute uses the round's active time, from the round start to the last input or the timer end, whichever is first. Both modes share this clock so the comparison is fair; speech precedes the text landing, so a first-input start would flatter voice.

## Game specifics

- **Brain dump blitz**: ideas are non-empty lines; also records words and words per minute. Different prompts for the typed and the voice round.
- **Describe to decode**: the player sees one target scene and its scene set; the description is stored with the scene set and target.
- **Rant to sendable**: records language mix (chip), accuracy and sendable ratings, and the edit distance between the raw text and the final text. The text itself is discarded.
- **The juggler**: a mouse-controlled catching game runs beside the message box; stores caught, dropped, words, and a three-item rubric hit count (place, time, who) from simple keyword matching, described as approximate.
- **Explain the snippet**: each snippet has a term list; hits are exact, case-sensitive matches in the text; stores hits and total.

## Deploy

Vercel static deploy of the SPA with a catch-all rewrite to the index. Supabase migrations are plain SQL kept in the repo and applied in the dashboard's SQL editor or with the CLI. The Judge page is a public route on the same site.

## Spikes and risks

1. **How Flow inserts text** (paste or simulated keystrokes) decides whether the integrity check works. First thing to test, on Mac and Windows, with a page that logs input events. Until known, treat the verdict as informational.
2. **Free-plan pause** after seven days idle (ADR 0004): keep the project active until 5 November.
3. **Judge pool size**: with ten players and two descriptions each, outside Judges must supply most judgments; the Judge page link is shared widely.
4. **Scope versus time**: five games in an evening is the stretch; `docs/build-plan.md` defines the cut line.

## Non-goals

Accounts, an LLM, realtime features, an admin dashboard (the Supabase table editor is the admin), internationalised copy, analytics SDKs.
