# 05: Describe to decode and Judge page

**What to build:** The Describe to decode game: the Player sees a target scene beside lookalikes, describes it in a typed round and a voice round, and sees which details to emphasise. The description text is the one thing stored as text, with its scene set and target. A public Judge page needs no sign-up: a Judge sees a description and four scenes, picks one, and is shown descriptions they have not judged yet, never learning who wrote it or in which mode.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Scenes are generated deterministically from a small catalogue and render as inline SVG
- [ ] Each round shows one target scene with its scene set; typed and voice rounds use different targets
- [ ] The description is stored with its scene set and target; no other round text is stored
- [ ] The Judge page is a public route that serves a description and four scenes, with no mode, author or target exposed in what the Judge receives
- [ ] A Judge is shown only descriptions they have not judged yet
- [ ] A judgment submitted from a second browser is saved and readable
- [ ] The result screen and Blip events for the game are in place
