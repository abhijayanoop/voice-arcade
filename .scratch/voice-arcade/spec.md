# Voice Arcade

Status: ready-for-agent

## Problem Statement

Abhijay uses Wispr Flow daily and does not feel any need to pay for it, because typing is a fine fallback. He wants evidence, from real people, about when voice beats typing and what makes someone keep using Flow, within four days, and a fun way to collect it that also shows growth-team thinking in his portfolio. Friends need a game they enjoy, not a survey they skip.

## Solution

A website where a friend picks a code name, agrees by voice, and plays five short games twice, once typing and once speaking with Flow, guided by Blip, a cheeky scripted agent. Each game ends with an honest typed-versus-voice result. Over the next three days the friend does tiny quests in real work, returns on day 3 with their Flow streak card, faces a boss round without Flow, and answers whether they would miss it or pay. Outside Judges decide which descriptions are clearest. Aggregates are exported for the portfolio.

## User Stories

1. As a player, I want a welcome screen that explains the experiment in a minute, so that I know what I am agreeing to.
2. As a player, I want to pick a code name and an avatar, so that I can play without giving my real name.
3. As a player, I want suggested code names, so that I am not stuck on a blank field.
4. As a player, I want a clear error when my code name is taken, so that I can pick another.
5. As a player, I want to say my cohort, operating system and language mix once, so that results can be compared fairly.
6. As a player, I want a requirements popup with three tabs, so that I can check what I need, set up Flow and understand how it works without leaving the page.
7. As a player, I want to switch freely between the three tabs, so that I can reread a step.
8. As a player, I want a checklist of what I need that I can tick, so that I know I am ready.
9. As a player, I want a try-it box in the setup tab, so that I can confirm Flow works before the first round.
10. As a player, I want to agree by saying "I'm in" or by typing it, so that nothing blocks me.
11. As a player, I want the consent to say what is shared and who sees it, so that I can decide.
12. As a player, I want to choose separately whether I am on the leaderboard, so that my speed is not shown unless I allow it.
13. As a player, I want a lobby that shows which games are done, next and locked, so that I always know where I am.
14. As a player, I want games to unlock in order, so that the warm-up comes first.
15. As a player, I want each game explained in one screen with the order of typed and voice rounds, so that I know what to do.
16. As a player, I want a visible timer, so that I can pace myself.
17. As a player, I want the typed round and the voice round to use different prompts, so that I cannot repeat what I just said.
18. As a player, I want the first mode randomised, so that practice does not favour one mode.
19. As a player, I want a type-it-instead option on every voice step, so that I am never locked out.
20. As a player, I want a result after each game comparing typed and voice honestly, so that I learn something about myself.
21. As a player, I want to answer one or two quick questions after a game, so that my feelings are recorded.
22. As a player, I want Blip to tell me what to do next and react to what I do, so that the arcade feels alive.
23. As a player, I want Blip to be quiet while a timer runs, so that I can concentrate.
24. As a player, I want Blip to point at the control to use next, so that I never wonder where to click.
25. As a player, I want to drag Blip out of the way, so that it never blocks me.
26. As a player, I want waves for finishing rounds, so that progress feels rewarding.
27. As a player, I want a speed race podium, so that friendly competition is possible.
28. As a player, I want Describe to decode to show my scene beside lookalikes, so that I know what to emphasise.
29. As a player, I want to rant in the language I actually rant in, so that the game reflects real life.
30. As a player, I want to rate how sendable my rant was and how accurate Flow was, so that the data shows real friction.
31. As a player, I want The juggler to run a catching game while I reply to a message, so that I feel why hands-free matters.
32. As a player, I want to see which technical terms Flow got right in Explain the snippet, so that I understand where voice struggles.
33. As a player, I want a summary when I finish the arcade, so that I feel done.
34. As a player, I want a personal link that returns me to my progress, so that I can come back on days 2 and 3.
35. As a player, I want a quest board with one tiny quest a day, so that I use Flow in real work.
36. As a player, I want to tick today's quest, so that my streak is visible.
37. As a player, I want to upload my Flow streak card and enter its numbers at the day-3 check-in, so that my usage is verified.
38. As a player, I want to say where I used Flow most, so that the data shows real workflows.
39. As a player, I want to be asked whether I have tried built-in dictation, so that my alternative is recorded.
40. As a player, I want a boss round of thirty minutes without Flow, so that I can feel what I would miss.
41. As a player, I want to say how annoyed I was and how I would feel losing Flow, so that necessity is measured.
42. As a player, I want to say whether I would pay and what would change my mind, so that my price sensitivity is heard.
43. As a player, I want a thank-you with my totals, so that the experiment ends well.
44. As a Judge, I want a link that works without signing up, so that I can help in two minutes.
45. As a Judge, I want to see a description and four scenes and pick one, so that I can judge clarity.
46. As a Judge, I want never to see who wrote a description or how, so that my pick is unbiased.
47. As a Judge, I want to be shown descriptions I have not judged yet, so that I am not repeating work.
48. As Abhijay, I want rounds stored as metrics and ratings, so that no private speech is kept.
49. As Abhijay, I want rounds whose input did not match their mode flagged but kept, so that the data stays honest.
50. As Abhijay, I want to read streak card images privately, so that I can verify day-3 claims.
51. As Abhijay, I want an export of aggregate findings with counts, so that the portfolio can show real numbers.
52. As Abhijay, I want the day-5 follow-up exported as a labelled update, so that late data is clearly marked.
53. As Abhijay, I want the playful backdrop to be switchable to plain, so that I can revert the look.
54. As a player on a phone, I want a stacked layout and a bottom-sheet bubble, so that the arcade still works.

## Implementation Decisions

- A static single-page app with client-side routes, Supabase as the only backend, and no custom server (ADR 0001, 0006).
- Players are identified by an unguessable personal link; no accounts (ADR 0002).
- The browser reaches data only through named backend functions; direct table access is denied.
- Modules: Session (flow and progress), Capture (round measurement and integrity), Games (registry of five), Blip (script, bubble, mover), Api (backend interface with Supabase and in-memory adapters), Scenes (Decode pictures), Ui (design-system components).
- Session owns unlocking, per-game mode order, resume, and persistence; screens read its view-state.
- Capture turns an input log into words, characters, active time, words per minute, keystrokes, pastes, inserts, edit distance and an integrity verdict. Typed rounds block paste; voice rounds allow insertion.
- Rounds are unique per player, game and mode; submitting twice is harmless.
- Only Decode descriptions are stored as text; Judges receive text and scene set without mode, author or target (ADR 0003).
- Data model and function contracts are in `docs/data-model.md`; screens and routes in `docs/screens.md`.
- Blip is scripted from the table in `docs/design/Scripts.md`; each event key has at least two lines, no immediate repeat, quiet mode during timers (ADR 0005).
- Visual system is Warm Arcade: tokens, `wa-` classes, Blip SVGs, backdrop layer with a plain option (`docs/design/`).
- The portfolio consumes a static findings export, not live data (ADR 0004).
- Headline outcome is "still using": dictating on all three quest days with an AI tool among the apps.

## Testing Decisions

- A good test drives a module through its public interface and asserts observable behaviour; it survives refactors.
- Seam 1, Session: events against the in-memory Api; assert view-state, unlock order, mode-order randomisation bounds, resume, and persisted calls.
- Seam 2, Capture: recorded logs for typed, paste-dictated, keystroke-dictated and mixed rounds; expected values from worked examples written by hand.
- The Blip line picker gets one seam-level test (no immediate repeat, variable substitution).
- Backend functions are checked by a smoke script against a real project; screens are checked against wireframes by eye.
- No prior art in the repo yet; follow Vitest conventions from the `tdd` skill.

## Out of Scope

Accounts or passwords; an LLM-driven Blip; realtime features; an admin dashboard; spoken output from Blip; analytics SDKs; internationalised copy; automatic image reading of streak cards; the portfolio site itself (a separate project that consumes the findings export).

## Further Notes

Open questions: how Flow inserts text on Mac and Windows (decides the integrity check); whether Sunday runs three games or five (`docs/build-plan.md`). Consent copy must disclose that descriptions are shown to Judges (the wireframes' Ready popup needs that sentence added). The design system and wireframes are linked from `docs/screens.md` and `docs/design/`.
