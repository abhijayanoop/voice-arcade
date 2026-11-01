# Data model

Postgres on Supabase. Every table has row-level security enabled and no policy for the browser roles, so direct reads and writes fail. The browser reaches data only through the RPC functions below (ADR 0001, 0002). Functions are `security definer`, set an explicit search path, and check the token first.

## Tables

**player**: `id` uuid pk, `token` text unique (long random string, never selectable by the browser), `code_name` text unique, `avatar` int, `cohort` text (`developer` | `prompt_engineer`), `os` text (`mac` | `windows` | `other`), `languages` text[], `consented_at` timestamptz, `leaderboard_opt_in` bool default false, `arcade_done_at` timestamptz, `created_at`.

**round**: `id` uuid pk, `player_id` fk, `game` text (`brain_dump` | `decode` | `rant` | `juggler` | `snippet`), `mode` text (`typed` | `voice`), `mode_order` int (1 or 2), `prompt_key` text, `started_at`, `active_ms` int, `words` int, `chars` int, `wpm` numeric, `keystrokes` int, `paste_events` int, `insert_events` int, `integrity` text (`ok` | `flagged`), `answers` jsonb (ratings and chips: sendable, accuracy, ownership, felt_natural, lang_mix), `extras` jsonb (idea_count, caught, dropped, rubric_hits, jargon_hits, jargon_total, edit_chars). Unique on (`player_id`, `game`, `mode`).

**description**: `id` uuid pk, `round_id` fk unique, `scene_set` text, `target_scene` text, `text` text. The only stored dictated text.

**judgment**: `id` uuid pk, `description_id` fk, `judge_key` text (random id kept in the Judge's browser), `picked_scene` text, `correct` bool, `created_at`. Unique on (`description_id`, `judge_key`).

**quest**: pk (`player_id`, `day` 1..3), `done_at`.

**checkin**: pk (`player_id`, `day` 3 or 5), `streak_days` int, `total_words` int, `apps` text[], `screenshot_path` text, `answers` jsonb (builtin_dictation_reason, where_used), `submitted_at`.

**boss**: pk `player_id`, `annoyance` int 1..5, `disappointment` text (`very` | `somewhat` | `not`), `pay_intent` text (`already` | `yes` | `maybe` | `no`), `pay_if` text, `submitted_at`.

## RPC functions

Implemented in `supabase/migrations/0001_voice_arcade.sql` and `0002_record_answers.sql`. Parameters are prefixed `p_`. Code names are unique ignoring case. Token lookup is a helper in a separate `private` schema so it is not callable as an RPC. Failures raise `code_name_taken`, `unknown_token` or `unknown_description`. `get_state` returns camelCase JSON matching the `PlayerState` type in `src/api/types.ts`.

| Function | Does |
|---|---|
| `register_player(code_name, avatar, cohort, os, languages)` | Creates the player; fails clearly if the code name is taken; returns the token |
| `record_consent(token, leaderboard_opt_in)` | Sets `consented_at` and the opt-in |
| `get_state(token)` | Returns the player (with `arcadeDoneAt`, from which the quest days count), finished games and modes, quest days done, check-in and boss status (migration `0004_arcade_done_at.sql`) |
| `submit_round(token, round, description?)` | Inserts the round; idempotent on (player, game, mode); inserts the description when given |
| `record_answers(token, game, mode, answers)` | Merges post-game answers into a saved round; metrics are untouched (migration `0002_record_answers.sql`) |
| `finish_arcade(token)` | Sets `arcade_done_at` |
| `get_leaderboard()` | Top ten opted-in players by best unflagged voice words per minute in Brain dump blitz: code name, avatar, wpm only |
| `get_judge_batch(judge_key, n)` | Descriptions this Judge has not judged: id, text, scene set. Never returns mode, author or target |
| `submit_judgment(judge_key, description_id, picked_scene)` | Stores the pick and whether it was correct |
| `mark_quest(token, day)` | Records a quest day |
| `submit_checkin(token, day, fields)` | Stores the check-in |
| `submit_boss(token, fields)` | Stores the boss answers |

## Storage

One private bucket for streak cards. Object path starts with the player's token (`<token>/day3.png`). Browser roles may insert only, only images up to 5 MB, and may not read, list, update or delete. Abhijay reads the images in the dashboard to verify check-ins.

## Findings export

A local script reads with the service key and writes `findings.json`. Contents are aggregates only:

- Players: count, by cohort, by OS, arcade completion.
- Per game and mode: round count, flagged count, mean and median words per minute, voice-to-typed ratio distribution, and which mode won per player.
- Describe to decode: judgments by mode, hit rate by mode, judge count.
- Rant: accuracy rating distribution by language mix.
- Explain the snippet: jargon hit rate by mode.
- Day 3: players with a check-in, players meeting "still using", apps most used.
- Boss: annoyance distribution, loss-test distribution, pay-intent distribution, the "maybe if" answers listed without code names unless the player allowed quotes.
- Day 5 follow-up as a separate, labelled block.

Always include the count behind every number.
