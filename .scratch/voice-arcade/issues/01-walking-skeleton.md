# 01: Walking skeleton

**What to build:** A Player can click from the Welcome screen through picking a code name and avatar, the Ready popup (three tabs: what you need, set up Flow, how it works, with the try-it box and the consent step), and arrive at the Lobby showing games as done, next and locked. Everything runs on the in-memory Api. The Session module drives progress and unlocking. Styling comes from the generated tokens and `wa-` classes. Blip is docked on screen but silent. The consent copy discloses that Decode descriptions are shown to Judges.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] CSS variables are generated from the design tokens and the screens use the `wa-` classes
- [ ] Welcome explains the experiment in about a minute
- [ ] Code name entry offers suggestions and shows a clear error when the name is taken; the Player picks an avatar
- [ ] The Player gives cohort, operating system and language mix once
- [ ] The Ready popup has three freely switchable tabs, a tickable checklist and a try-it box
- [ ] Consent can be given by saying or typing "I'm in", states what is shared and who sees it, and includes the Judges sentence; leaderboard opt-in is a separate choice
- [ ] The Lobby shows done, next and locked games, and games unlock in order
- [ ] Session tests cover unlock order and per-game mode-order randomisation bounds against the in-memory Api
- [ ] A Player can click from Welcome to the Lobby end to end
