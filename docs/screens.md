# Screens and flow

Wireframes: https://claude.ai/artifact/RSbEeCDpHCwmJvkFnd1y9P (20 desktop screens in the Warm Arcade look; frame names below match the canvas). Blip's lines for every event are in `docs/design/Scripts.md`.

## Player journey

```
Welcome ─▶ Code name + avatar ─▶ Ready popup (3 tabs, say "I'm in") ─▶ Lobby
   Lobby ─▶ for each game, unlocked in order:
              Game intro ─▶ Round A ─▶ Round B ─▶ Result       (A and B are typed and voice, order randomised per player)
   After game 5 ─▶ Arcade complete ─▶ Quest board (days 1–3)
   Day 2–3 return via the personal link ─▶ Quest board ─▶ Check-in (day 3) ─▶ Boss round ─▶ Thanks

Outside Judge: shared link ─▶ Judge page ─▶ picks ─▶ done
```

## Routes

| Route | Canvas frame | Purpose | Reads | Writes |
|---|---|---|---|---|
| `/` | 1 · Welcome | Explain the experiment | none | none |
| `/name` | 2 · Code name and avatar | Pick code name, avatar; cohort, OS and language mix collected here or in the Ready popup | none | `register_player` |
| `/ready` | 3a, 3b, 3c · Requirements | Popup over the page with three switchable tabs: what you need (tickable list), set up Flow (steps and a try-it box), how it works (and the "I'm in" confirmation, with a type-it-instead link) | `get_state` | `record_consent` |
| `/lobby` | 4 · Lobby | Game cards with locked, next and done states; Speed race panel | `get_state`, `get_leaderboard` | none |
| `/game/:key` | 5 · Game intro | What the game is; which mode comes first | `get_state` | none |
| `/game/:key/typed`, `/game/:key/voice` | 6 · Keyboard round, 7 · Voice round and the game frames | The timed round | none | none until submit |
| `/game/:key/result` | 8 · Round result and per-game frames | Typed versus voice, two quick questions | `get_state` | `submit_round` (both rounds, once complete) |
| `/done` | 9 · Arcade complete | Summary, podium, next step | `get_state`, `get_leaderboard` | `finish_arcade` |
| `/quests` | 10 · Quest board | Day 1–3 quests, streak | `get_state` | `mark_quest` |
| `/check-in` | 11 · Day 3 check-in | Upload streak card, enter streak days, total words, apps, built-in dictation answer | `get_state` | `submit_checkin`, storage upload |
| `/boss` | 12 · Final boss and paying question | 30 minutes without Flow, annoyance, loss test, pay intent | `get_state` | `submit_boss` |
| `/thanks` | 13 · Thanks | Close | `get_state` | none |
| `/judge` | Outside judge page | Pick scenes for descriptions | `get_judge_batch` | `submit_judgment` |
| `/p/:token` | none | Restores a player from a personal link, then redirects to the right step | `get_state` | none |

Per-game frames: Decode, Rant, Juggler, Snippet. Brain dump uses the generic intro, round and result frames.

## Behaviours that cut across screens

- **Order and unlocking**: games unlock one at a time. For each player and game the first mode is random; the second follows immediately.
- **Quiet mode**: while a round timer runs, Blip is docked and silent and the screen has no other motion.
- **Resume**: the token is kept in the browser and in the link; a refresh or a return visit lands on the right step.
- **Pay question**: the "would you pay" question appears only in the boss round, after the loss test.
- **Typed alternative**: every voice step offers a "type it instead" link; the round is then recorded as typed.
- **Backdrop**: the playful background layer is on by default and can be switched to plain.

## Copy to add to the wireframes

The consent panel in the Ready popup must say that Describe to decode descriptions are shown anonymously to outside Judges (ADR 0003), that results are published in aggregate under code names, and that streak card images stay private.
