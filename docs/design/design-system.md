# Warm Arcade

Warm Arcade is the design system for a voice arcade: a 5-game experiment where friends play every round twice, once typing and once speaking with Wispr Flow, guided by a small agent called Blip. It also dresses the portfolio that tells the story of that experiment. It should feel like a game you want to play and a product a growth team would ship: playful first, never sloppy.

## Principles

1. **Play first, explain later.** Every screen starts with something to do. Instructions come from Blip in one sentence, not from paragraphs.
2. **One loud thing per screen.** Cream is the ground; one saturated block (a lobby card, the result number, the active node) carries the moment. If two things shout, one goes quiet.
3. **Voice is the hero.** Voice states get the lavender treatment and Blip's waveform mouth. Typing is shown honestly but never celebrated.
4. **Honest scores.** Results always show both typed and voice numbers, including when typing wins. The data is the point.
5. **Kind cheek.** Blip teases keyboards, timers and itself. Never the person.

## Voice and copy

- Sentence case everywhere, including buttons. Display-face labels (Anton) are the one exception: they are uppercase by design.
- Buttons are verbs, 1 to 3 words: "Play round", "Continue", "Show me".
- Blip speaks in one sentence, 70 characters max, contractions on. Example: "Round 2 is voice. Hold your Flow key and just talk."
- Numbers are concrete: "3.4× faster", "141 wpm", never "much faster".
- No "please", "simply", "just click". No emoji in UI text; Blip's face does that job.
- Friends are addressed by code name (`{name}`), never their real name.

## Color

Cream is the ground and ink is the voice; four accents each have one job.

| Token | Job | Text on it |
| --- | --- | --- |
| `cream-100` | Page ground | `ink`, `ink-soft` |
| `paper` | Cards, inputs, bubbles | `ink`, `ink-soft` |
| `ink` | Text, primary pill, waves counter | `cream-100` |
| `tomato` | Brand, Blip, the active game moment | `ink` (cream only at 24px+) |
| `mustard` | Rewards: waves icon, sparkles, gold | `ink` |
| `sage` | Done and correct | `sage-ink` |
| `lavender` | Selected and voice states | `lavender-ink` |

Rules:
- Small tomato text on cream uses `tomato-deep`, never `tomato`.
- Selection reads in lightness, not hue alone: selected chips go to `lavender`, which is clearly darker than `paper`.
- `sky` exists only for Blip's sweat drop and tear.
- No gradients anywhere, including Blip. Blip's "gloss" is a flat `blip-shine` crescent.

## Type

Two families from Google Fonts (loaded by `components/bundle.css`):
- **Anton** (`--font-display`) for game moments only: game titles, round labels, scores, "I'M IN". Always uppercase, never for sentences.
- **Urbanist** (`--font-sans`) for everything people read: questions (`heading`), instructions (`body`), controls (`ui`), meta (`small`, `caption`).

Never put more than one Anton element in a card. Never set body copy below 12px.

## Shape and depth

- Pills (`radius-pill`) for anything a finger presses, `radius-lg` for game cards and the bubble, `radius-md` for inputs and the HUD, `radius-sm` for rating tiles.
- Depth is a hard lip, not a blur. The primary pill sits on `shadow-press` and drops 4px when pressed, like an arcade button. Cards and the bubble use `shadow-card`, a 2px flat lip.
- Spacing steps: `space-1` 4, `space-2` 8, `space-3` 12, `space-4` 16, `space-6` 24, `space-8` 32.

## Layout: Arcade HUD

Desktop-first, because Flow's stats live on Mac and Windows.
- A slim HUD bar across the top (`Hud`): round label, path progress, waves, mute.
- A full-width play area below, max 960px wide, centered, `space-6` from the HUD.
- Blip docked bottom-left at 24px from the edges, with its bubble opening to the right.
- On phones: the HUD stays on top (round label hides), the play area stacks, and Blip's bubble becomes a bottom sheet.

## Components

| Group | Components |
| --- | --- |
| Actions | `Button`, `SayToConfirm` |
| Inputs | `Chip`, `FaceRating`, `VoiceInput` |
| Game | `Hud`, `PathProgress`, `WavesCounter`, `LobbyCard`, `Podium`, `ResultCard` |
| Agent | `Blip`, `BlipBubble`, `Spotlight` |

Class names are prefixed `wa-` and live in `components/bundle.css`; every value comes from a token.

## Iconography

Blip's face is the icon system: rating faces, the welcome screen and empty states reuse Blip's capsule eyes. Utility icons (mute, back) are simple 2px ink strokes. The waves icon is a two-hump sine in `mustard`. No emoji, no third-party icon pack in game screens.

## Motion

- Buttons sink 4px on press, 120ms.
- Lobby cards lift 4px and tilt 1° on hover, with a slight overshoot.
- Waves gained pop in from below over 900ms.
- Blip's motion has its own section.
- Everything respects `prefers-reduced-motion`: animations stop and Blip fades instead of flying.

## Accessibility

- Text meets 4.5:1 on its ground; display text at 24px+ meets 3:1. Every pairing in the color table is checked.
- Focus is a 3px `lavender` outline with 3px offset on every control.
- Every voice step has a "Type it instead" link, so nobody is locked out of the survey.
- Blip never covers the control in use and never talks during timed rounds.

## Inspiration and originality

Patterns were studied, not copied, from a quiz app shot by Bayu Aji Sadewa for Korsa (podium, currency pill, game cards), the Freud UI kit by strangehelix (progress, chip cloud, face ratings), and two agent avatars, Penny by Gaby Simpson and Little AI Agent by Arash (orb body, capsule eyes, state props). Every color, illustration and the Blip character here are original to this system.

## Further sections

- **Blip**: the agent's anatomy, expressions, motion and rules.
- **Scripts**: every event Blip reacts to, with its expression, move and lines.
