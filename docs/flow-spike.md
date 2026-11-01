# Flow insertion spike

**Question:** does Wispr Flow put text into a textarea by paste, or by simulated keystrokes? The answer decides whether the integrity check is a flag or only informational (`docs/architecture.md`, spike 1).

**How to run:** open `/spike` on the deployed site (or `npm run dev`), click the box, dictate a sentence with Flow, press Copy log, and paste the result under the right heading below. The page logs `keydown`, `paste`, `beforeinput` (input type and length), and composition events with timestamps.

## Findings

| OS | Flow version | Events seen when dictating | Verdict |
|---|---|---|---|
| Mac | not yet tested | | |
| Windows | not yet tested | | |

## Decision so far

Not yet tested on real Flow; this needs a person with Flow on both systems. Until then the integrity verdict stays a soft flag: flagged rounds are stored, kept, and reported separately, never dropped. If Flow turns out to use simulated keystrokes, set the voice-round check to informational by removing the keystroke-share rule in `src/capture/capture.ts`.

## How Capture uses what we know

- Typed rounds block paste and drops, so any paste or bulk insert that still arrives flags the round.
- Voice rounds allow insertion. A voice round is flagged when key presses reach 80% of the characters.
- Any round above 400 words per minute is flagged, and so is a voice round whose text lands within 1 second of the start: neither is speech or typing. Flagged rounds stay stored but are left out of speed figures and the Speed race.
- Active time runs from the round start to the last input or the timer end, in both modes, so typed and voice compare on one clock.
- A voice step the Player types instead is stored in the voice slot, flagged, with `typed_instead` in its answers, so the unique key (player, game, mode) holds.
