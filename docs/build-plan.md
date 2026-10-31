# Build plan

## How to run Matt Pocock's skills on this repo

Several of these skills only run when you type them yourself.

1. Create the repo, drop this pack in, `git init`, open Claude Code. Because `CLAUDE.md` already exists, setup edits it.
2. `/setup-matt-pocock-skills`. Answers: issue tracker **Local markdown**, triage labels **keep the defaults**, domain docs **single-context**.
3. The decisions are already written down in `CONTEXT.md`, the ADRs and the spec, so skip the full interview. Run `/grill-with-docs` only if something below the spec's "Open questions" needs settling.
4. `/to-tickets .scratch/voice-arcade/spec.md`. Compare its proposed breakdown with the slices below; approve it when the order and blocking edges match.
5. For each ticket: `/clear`, then `/implement .scratch/voice-arcade/issues/<NN>-<slug>.md`. `/implement` drives `/tdd` at the two agreed seams, runs `/code-review`, and commits.
6. When Claude Code reaches a step only you can do (Supabase project, keys, Vercel), run `/wizard`, which writes a guided script that fills `.env` for you.
7. A stubborn bug: `/diagnosing-bugs`. Optional extras: `/git-guardrails-claude-code` to block destructive git commands. Skip `/setup-pre-commit` tonight.

## Steps only a human can do

- Create the Supabase project and copy the project URL and the public key.
- Apply the migration (SQL editor) and create the private streak-cards bucket with the insert-only policy from `docs/data-model.md`.
- Create the Vercel project, set the two public environment variables, add the catch-all rewrite.
- Put the service key in a local `.env` used only by the export script.
- Test, on a Mac and a Windows laptop with real Flow, how text arrives in a textarea (spike, below).

## Slices (tracer bullets, in dependency order)

| # | Slice | Blocked by | Demoable when |
|---|---|---|---|
| 01 | Walking skeleton: tokens as CSS, Welcome, Code name and avatar, Ready popup with three tabs, Lobby, Blip docked; all on the in-memory Api | none | You can click from welcome to the lobby |
| 02 | Supabase backend: migration, register, consent, state, Supabase adapter, personal link resume, Vercel deploy | 01 | A code name persists and the link restores it |
| 03 | Spike and Brain dump blitz: input-event logging page first, then capture module, typed and voice rounds, result, round submit | 02 | A full game saved to Supabase with metrics |
| 04 | Blip runtime: script table, bubble, move to targets, quiet mode, wired into slices 01 and 03 | 01 | Blip reacts on every built screen |
| 05 | Describe to decode, with scene sets and the Judge page | 03 | A judgment arrives from a second browser |
| 06 | Rant to sendable | 03 | Ratings and language mix saved without the text |
| 07 | Speed race, Arcade complete, finish | 03 | Podium and totals show real data |
| 08 | The juggler | 03 | Catching and replying work together |
| 09 | Explain the snippet | 03 | Jargon hits compare typed and voice |
| 10 | Quest board, check-in with upload, boss round, thanks | 02 | A day-3 check-in lands with its image |
| 11 | Findings export script | 03 | `findings.json` has counts for the games built so far |
| 12 | Polish: backdrop toggle, reduced motion, phone layout, accessibility pass | last | The wireframes and the app match |

## Cut line for tonight

Everything through slice 07 makes the Sunday sessions playable; the minimum is slices 01 to 05. Slices 08 and 09 can ship as bonus games added on Monday, and slice 10 must be live by Tuesday 3 November. If slice 10 slips, the check-in can be a form for one day, but the data model does not change.

## Open decisions

- Sunday with three games (Brain dump, Decode, Rant) and the other two as Monday bonus games, versus all five on Sunday.
- Whether the Flow text-injection spike changes the integrity check from a flag to informational only.
