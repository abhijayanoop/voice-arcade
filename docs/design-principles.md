# Design principles

The visual system is Warm Arcade (`docs/design/`). This file collects the principles behind it, plus the behavioural, research and engineering ones that shape the build.

## Product feel

1. **Play first, explain later.** Every screen starts with something to do. Blip gives instructions in one sentence.
2. **One loud thing per screen.** Cream is the ground; one saturated block carries the moment. If two things shout, one goes quiet.
3. **Voice is the hero.** Voice states use lavender and Blip's waveform mouth. Typing is shown honestly and never celebrated.
4. **Honest scores.** Results always show both numbers, including when typing wins.
5. **Kind cheek.** Blip teases keyboards, timers and itself, never a person's speed, accent or language.

## Behaviour rules

- Blip is silent and docked during timed rounds; it never covers the control in use; it moves at most once per step; one line is on screen at a time.
- Each voice step has a type-it-instead path; nobody is locked out.
- One primary action per screen, a verb of one to three words.
- Timers turn from ink to tomato in the last ten seconds, with no other change.
- Sounds are short effects only, muted by the HUD toggle; nothing speaks aloud, because the mic is in use.
- Reduced-motion users get fades instead of flying, bobbing and orbiting.

## Visual rules

- Layout: Arcade HUD. Slim top bar (round label, path progress, waves, mute), full-width play area up to 960px, Blip docked bottom-left. Desktop first, 1280 to 1440px.
- Colour: cream ground, ink text; tomato brand and Blip; mustard rewards; sage done; lavender selected and voice. Small tomato text uses the deep tomato.
- Type: Anton for game moments only (uppercase, one per card); Urbanist for everything read.
- Shape: pills for controls, large radii for game cards and the bubble. Depth is a hard lip, never a blur. No gradients.
- Backdrop: a quiet decorative layer behind every screen (pale rings, dotted grid and arc, a wave squiggle, small dots and plus signs), non-interactive and hidden from assistive tech, switchable to plain.
- Copy: sentence case, contractions, concrete numbers, no emoji in UI text.
- Accessibility: 4.5:1 text contrast, 3px lavender focus ring, real buttons and labels, 44px touch targets.

## Research principles

- Show the count behind every number. Small groups are reported as counts, not percentages.
- Flag suspect rounds; never delete them.
- Report where typing wins.
- Label anything added after submission as an update.

## Privacy principles

- Code names only; no real names, emails or accounts.
- Dictated text stays in the browser except Decode descriptions.
- Streak card images are private and read only to verify check-ins.
- Publish aggregates; quotes only with permission.

## Engineering principles

- Deep modules at clean seams (`session`, `capture`); the Api adapter is the one door to the backend.
- Tracer-bullet slices: each ticket cuts through UI, session logic and backend and is demoable alone.
- Tokens, not hexes. New values become tokens first.
- Scripted behaviour is data: Blip's lines live in a table, not in components.
