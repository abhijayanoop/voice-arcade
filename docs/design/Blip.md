# Blip

Blip is the guide agent: a small tomato orb that flies around the page, shows friends what to do next, and reacts to everything they do with a face and one line. It is scripted, not an LLM, so it is fast, predictable and safe to build in a weekend.

## Anatomy

| Part | Spec | Token |
| --- | --- | --- |
| Body | Circle, radius 30 in an 88-unit viewBox | `blip-body` |
| Shine | Flat ellipse 20×10, rotated −30°, top-left | `blip-shine` |
| Eyes | Two capsules 8×18, 6 units apart | `blip-ink` |
| Mouth | None at rest. A 7-point waveform only while listening; small curves for a few expressions | `blip-ink` |
| Props | Sparkles, sweat drop, thinking dots, z z, arrow | `prop-spark`, `prop-drop`, `prop-dots` |

Sizes: 56px docked (desktop), 44px (phone), 96px on the welcome screen only.

## Expressions

| Key | Name | When |
| --- | --- | --- |
| `idle` | Idle | Default; docked, bobbing, blinking |
| `pointing` | Pointing | Perched on the next thing to touch |
| `listening` | Listening | Flow is dictating into a field |
| `thinking` | Thinking | Waiting for a choice, calculating results |
| `cheeky` | Cheeky | Teasing, tips, the house expression |
| `cheering` | Cheering | Wins, completions |
| `shocked` | Shocked | Very fast results, last 10 seconds |
| `oops` | Oops | Errors, empty submits, dropped items |
| `sleepy` | Sleepy | Idle 20+ seconds |
| `smug` | Smug | Gentle teasing, waves earned |
| `sad` | Dramatic sad | Missed a day, Juggler drops (theatrical only) |
| `love` | Love | Personal bests, code name picked, goodbye |

Ready-made SVGs for every key are in the Blip asset group. Switching expressions crossfades the face group in 160ms; the body never changes.

## Moves

| Move | What happens | Timing |
| --- | --- | --- |
| Dock | Rests bottom-left, 24px from edges; bobs 2px | Bob 2.4s loop, blink every 3–6s |
| Travel | Flies in an arc to a target; squashes to 112% × 88% on takeoff and landing | 480ms, `cubic-bezier(.34,1.56,.64,1)` |
| Perch | Sits 8px outside the target's top-left or top-right corner (whichever is closer to open space) and looks at it | Holds until the step is done |
| Orbit | Circles the target twice | 1.2s per loop; only after 15s of being ignored |
| Celebrate | Jumps 18px with two sparkles, then returns | 600ms |
| Fly off | Exits to the bottom-left after the goodbye line | 400ms |

## Rules

1. Never cover the control in use. If a perch would overlap it, use the other corner; if both overlap, stay docked and point.
2. Move at most once per step.
3. Quiet mode during timed rounds: dock, no lines, no bob. The timer is Blip's only company.
4. One line on screen at a time. A new line replaces the old; never stack bubbles.
5. Pick a random variant per event, never the same one twice in a row.
6. Reduced motion: no travel, bob or orbit. Fade out (150ms), fade in at the target (150ms). Expressions still change.
7. Draggable: friends can drag Blip anywhere; it stays there until the next step.
8. Sounds are short effects only (pop on waves, chime on wins), muted by the HUD toggle. Blip never speaks aloud, because friends' mics are in use for Flow.

## How to build it

- One component that takes `expression`, `say(eventKey, vars)` and `goTo(target, move)`.
- Targets are elements tagged `data-blip-target="start"`, `"voice-input"`, `"timer"` and so on; the script library names them.
- The bubble types out at 28ms per character and auto-hides after 4s unless it has reply chips.
- Store the last variant index per event in memory so repeats are avoided.
