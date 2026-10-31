# Voice Arcade

A five-game survey where friends play typed and voice rounds, then try Wispr Flow for three days, so the findings can show what turns "I like Flow" into "I need Flow".

## Language

### People and access

**Player**:
A friend who plays the arcade and takes part in the three-day experiment.
_Avoid_: participant, respondent, user, subject

**Code name**:
The public alias a player picks; the only name shown anywhere.
_Avoid_: username, nickname, handle

**Avatar**:
The coloured face a player picks next to their code name.
_Avoid_: profile picture, icon

**Cohort tag**:
Whether a player is a developer or a prompt engineer; recorded for comparison, never a separate experiment.
_Avoid_: group, segment, role

**Personal link**:
The unguessable URL that returns a player to their own progress.
_Avoid_: login, account, session link, magic link

**Consent**:
A player saying "I'm in" by voice (or typing it) after reading what is shared.
_Avoid_: agreement, opt-in (opt-in is reserved for the Speed race)

**Judge**:
An outside person, not a player, who picks the scene a description refers to.
_Avoid_: rater, reviewer, grader

### The arcade

**Arcade**:
The set of five games a player works through in one sitting.
_Avoid_: survey, quiz, session

**Game**:
One of the five named challenges in the Arcade.
_Avoid_: level, activity, task

**Round**:
One timed attempt at a game in a single mode.
_Avoid_: attempt, turn, trial

**Mode**:
Typed or voice; every game is played once in each.
_Avoid_: method, input type, channel

**Prompt**:
The thing a player is asked to respond to in a round.
_Avoid_: question, task, brief

**Result**:
The typed-versus-voice comparison shown after a game.
_Avoid_: score, report

**Waves**:
The reward currency earned for finishing rounds and quests; buys nothing.
_Avoid_: points, coins, gems, XP

**Speed race**:
The opt-in leaderboard of voice words per minute from Brain dump blitz.
_Avoid_: ranking, scoreboard

**Flag**:
A round whose integrity check failed; it stays stored and is reported separately.
_Avoid_: invalid round, cheat

### The five games

**Brain dump blitz**:
Sixty seconds to list as many ideas as possible for a silly prompt.

**Describe to decode**:
Describing a scene so a Judge can pick it out from lookalikes.
_Avoid_: Decode game (use Decode in code only as a short name)

**Rant to sendable**:
Venting about an irritating situation in the player's natural language mix, then rating how sendable it is.

**The juggler**:
Replying to a message while a mouse-controlled catching game keeps running.

**Explain the snippet**:
Explaining a short piece of code aloud or in writing, scored on technical terms.

### Decode

**Scene**:
A small drawn picture of a house, sun and trees.

**Scene set**:
Four near-identical scenes that differ in a few attributes.

**Description**:
The text a player writes or speaks about their target scene; the only dictated text that is stored.

**Judgment**:
One Judge's pick of a scene for one description.

**Hit rate**:
The share of judgments that picked the described scene, compared by mode.

### After the arcade

**Quest**:
A small real-life task for one of the three days, done in the player's own work.
_Avoid_: challenge, mission, homework

**Quest day**:
Day 1, 2 or 3 of the experiment; Day 1 is the day the arcade is played.

**Streak card**:
The shareable image from Flow's Usage tab showing streak, words and apps.
_Avoid_: screenshot, proof

**Check-in**:
The day-3 return visit: streak card, where Flow was used, and a few questions.

**Boss round**:
Thirty minutes of normal work without Flow, followed by the loss test.
_Avoid_: final level, withdrawal test

**Loss test**:
The question "how would you feel if you could no longer use Flow?".

**Still using**:
The headline outcome: the player dictated on all three quest days with an AI tool among their apps.
_Avoid_: converted, retained, activated

### Blip

**Blip**:
The scripted guide agent that flies around the page and reacts to what the player does.
_Avoid_: bot, assistant, mascot, AI

**Expression**:
One of Blip's twelve faces.
_Avoid_: emotion, mood, state

**Move**:
How Blip travels: dock, travel, perch, orbit, celebrate or fly off.
_Avoid_: animation, transition

**Script**:
The table of event keys, expressions, moves, targets and lines that defines everything Blip says.
_Avoid_: dialogue, copy, prompts

**Event key**:
The name of a moment Blip reacts to, such as `round.time_up`.

**Line**:
One sentence Blip says; each event key has at least two variants.
_Avoid_: message, text

**Target**:
A marked element Blip points at or perches on.
_Avoid_: anchor, selector

**Quiet mode**:
Blip docked and silent while a timer runs.

### Research

**Findings**:
The published aggregate numbers exported from the data for the portfolio.
_Avoid_: analytics, stats, report

**Integrity check**:
The comparison between a round's declared mode and how its text actually arrived.
