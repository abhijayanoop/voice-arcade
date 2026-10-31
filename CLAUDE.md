# Voice Arcade

A survey website that works as a research instrument: friends play five typed-vs-voice games guided by a scripted agent called Blip, then use Wispr Flow for three days. The findings feed Abhijay's portfolio for the Wispr Flow growth challenge (submissions close 4 November 2026).

Read `CONTEXT.md` before naming anything. Read the ADRs in `docs/adr/` before touching architecture.

## Where things are

- `docs/architecture.md`: stack, modules, seams, deploy.
- `docs/data-model.md`: tables, RPC functions, access rules, storage, findings export.
- `docs/screens.md`: every route, its wireframe, what it reads and writes.
- `docs/design-principles.md`: how the product must feel and behave. The Warm Arcade system lives in `docs/design/` (tokens, stylesheet, Blip spec, Blip scripts, Blip SVGs).
- `docs/research-protocol.md`: what is collected, shown and published. Read it before adding any field or screen that touches player data.
- `docs/build-plan.md`: slice order and the steps only a human can do.
- Spec and tickets live in `.scratch/voice-arcade/`.

## Working rules

- Put tests at the two agreed seams: `session` and `capture`. Other modules are verified by the tickets' acceptance criteria.
- Style through the tokens: generate CSS variables from `docs/design/tokens.json`, use the `wa-` classes from `docs/design/arcade.css`, and add a token when a new value is needed.
- Blip's lines come from `docs/design/Scripts.md`; one event key maps to one script row.
- Dictated text stays in the browser, except Decode descriptions. Everything else stores metrics.
- The Supabase service key lives only in local scripts. The browser bundle holds the public URL and publishable key.
- `package.json` scripts are the source of truth for commands. Run typecheck and tests before each commit.

## Agent skills

### Issue tracker

Issues and specs are local markdown under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: `CONTEXT.md` at the root is the glossary, and ADRs are in `docs/adr/`. See `docs/agents/domain.md`.
