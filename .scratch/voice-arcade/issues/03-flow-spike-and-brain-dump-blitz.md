# 03: Flow insertion spike and Brain dump blitz

**What to build:** First, a throwaway input-event logging page to learn on Mac and Windows whether Flow inserts text by paste or by simulated keystrokes. Then the first full game: Brain dump blitz, with a typed round and a voice round (different prompts, randomised first mode, visible timer, type-it-instead on voice steps), a game explainer screen, a typed-versus-voice result, and one or two quick feelings questions. Each round is stored in Supabase as metrics only.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] The spike page logs input types, key presses, paste events and timestamps, and the findings are noted so the integrity check can be set as a flag or informational
- [ ] The Capture module returns words, characters, active time, words per minute, keystrokes, pastes, inserts, edit distance and an integrity verdict from a recorded input log
- [ ] Capture tests use typed, paste-dictated, keystroke-dictated and mixed logs, with expected values worked out by hand
- [ ] Typed rounds block paste; voice rounds allow insertion; mismatched rounds are flagged but kept
- [ ] Ideas are counted as non-empty lines
- [ ] The result screen compares typed and voice honestly and records the post-game questions
- [ ] Submitting the same round twice is harmless (unique per Player, game and mode)
- [ ] A full game is saved to Supabase with metrics and no dictated text
- [ ] The Lobby updates (game done, next game unlocked) and the first wave is earned for finishing a round
