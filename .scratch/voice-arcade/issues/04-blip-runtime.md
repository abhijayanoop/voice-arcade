# 04: Blip runtime

**What to build:** Blip comes alive on every screen built so far: it tells the Player what to do next, reacts to what they do, points at the control to use, and goes quiet while a timer runs. The Player can drag Blip out of the way. Lines come from the scripted table, one event key per script row, with no LLM involved.

**Blocked by:** 01

**Status:** done

- [x] The script table is parsed from the Blip scripts into data
- [x] `say(eventKey, vars)` returns the expression, move, target and line, substitutes variables and never repeats the last variant for that key
- [x] A seam-level test covers no immediate repeat and variable substitution
- [x] The bubble types out lines and Blip moves to elements marked as Blip targets
- [x] Quiet mode is on while any timer runs and off afterwards
- [x] The Player can drag Blip away and it stays out of the way
- [x] Blip reacts on Welcome, code name, Ready popup, Lobby and Brain dump blitz (where built)
- [x] Tickets that build screens later add their own event keys through the same `say()` call
