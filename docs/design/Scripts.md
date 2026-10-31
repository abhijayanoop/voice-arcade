# Scripts

Every event Blip reacts to, with its expression, move, target and line variants. `{name}` is the friend's code name, `{n}` a game number, `{x}` a speed ratio, `{w}` waves earned. One variant is picked at random, never the same one twice in a row. Tone: cheeky, kind, one sentence. Blip teases keyboards, never people.

## Arrival and setup

| Event key | Face | Move → target | Lines |
| --- | --- | --- | --- |
| `setup.first_visit` | cheering | fly in → dock | "Oh hi. I'm Blip. I run this tiny voice arcade." · "A visitor! Quick, look busy. Hi, I'm Blip." |
| `setup.pick_name` | thinking | perch → `name-input` | "Pick a code name. Something a spy would be proud of." · "Your secret identity goes here. Make it dramatic." |
| `setup.name_done` | love | celebrate | "{name}. Iconic. I'm already intimidated." · "{name}? Yes. That's going on the leaderboard." |
| `setup.pick_avatar` | pointing | perch → `avatar-grid` | "Now a face. Choose wisely, it's permanent. Kidding. Mostly." · "Pick your fighter." |
| `setup.languages` | pointing | orbit → `language-card` | "Tell Flow how you actually talk: English, Hinglish, Manglish, all welcome." · "Set your languages once and Flow stops guessing." |
| `setup.flow_missing` | oops | perch → `help-link` | "Hmm, I can't hear Flow yet. Is it running?" · "Flow's still asleep. Give it a nudge and try again." |
| `setup.say_im_in` | listening | perch → `confirm-box` | "Hold your Flow key and say 'I'm in.' Make it sound official." · "Words, not clicks. Say 'I'm in.'" |
| `setup.consent_done` | cheering | celebrate | "Contract signed with your voice. Very futuristic." · "We're official. Let's play." |

## Lobby and between games

| Event key | Face | Move → target | Lines |
| --- | --- | --- | --- |
| `lobby.first` | pointing | travel across → `lobby-cards` | "Five games. Each one twice: fingers first, then voice. Or the other way round." · "Two ways to play everything. May the best input win." |
| `lobby.unlocked` | cheering | perch → `lobby-card-{n}` | "Game {n} unlocked. Don't keep it waiting." · "Ooh, this one's my favorite. Don't tell the others." |
| `lobby.halfway` | smug | celebrate | "Halfway. You're doing suspiciously well." · "Game 3 of 5. Hydrate. I'll wait." |
| `lobby.idle` | sleepy | dock | "Zzz. Wake me when you pick a game." · "I'll just… rest my eyes." |

## Inside a round

| Event key | Face | Move → target | Lines |
| --- | --- | --- | --- |
| `round.typed_intro` | smug | perch → `start` | "Keyboard round. Show me those fingers." · "Old school first. Type like it's 2019." |
| `round.voice_intro` | listening | perch → `voice-input` | "Voice round. Hold your Flow key and just talk." · "Your turn to talk. Don't overthink it." |
| `round.running` | idle | dock (quiet) | No lines while the timer runs. |
| `round.ten_seconds` | shocked | hop on dock | "Ten seconds!" · "Tick tock, {name}." |
| `round.time_up` | pointing | perch → `submit` | "Pens down. Mouths closed." · "Time. Let's see what you made." |
| `round.empty_submit` | oops | perch → `answer-input` | "That's… empty. Bold strategy." · "Nothing here yet. Your ideas are shy." |
| `round.typed_in_voice` | cheeky | orbit → `voice-input` | "I saw those fingers. This round's voice only." · "Sneaky typing detected. Talk it out." |
| `round.pasted` | smug | perch → `answer-input` | "Copy-paste? I'll pretend I didn't see that. I did, though." · "Nice try. Fresh words only." |
| `juggler.dropped_three` | sad | hop on dock | "The little apples! They had families." · "Hands busy is the whole point. Try voice next round." |
| `decode.sent` | love | celebrate | "Sent to the judges. Fingers crossed for you." · "Someone out there is about to squint at your words." |
| `juggler.voice_caught_more` | cheering | celebrate | "Hands free, apples saved. That is the whole point." · "More caught while talking. Your mouse hand says thanks." |
| `rant.edit` | pointing | perch → `answer-input` | "Rant over. Now make it something you could actually send." · "Steam released. Time for the grown-up edit." |
| `rant.sent` | cheeky | celebrate | "Rant filed, never sent. Healthy." · "Your words stay in this browser. Only the numbers leave." |

## Results

| Event key | Face | Move → target | Lines |
| --- | --- | --- | --- |
| `result.voice_big_win` | cheering | celebrate | "Your voice just lapped your keyboard." · "That was {x}× faster. Your keyboard wants a word." |
| `result.typed_win` | shocked | hop | "Okay, your fingers are elite. Respect." · "Keyboard wins this one. Rematch next game." |
| `result.close` | thinking | perch → `result-card` | "Basically a tie. Your hands and mouth are friends." · "Too close to call. Both of you get a sticker." |
| `result.personal_best` | love | celebrate | "New personal best. I'm telling everyone." · "Frame this. Seriously." |
| `result.podium` | cheering | travel → `podium` | "{name} on the podium!" · "Look at you, up there with the legends." |
| `result.last_place` | cheeky | perch → `leaderboard-row` | "Someone has to keep the podium humble. Thank you for your service." · "Last place is just first place from the other side." |
| `result.waves` | smug | perch → `waves` | "+{w} waves. Rich." · "Waves acquired. Spend them on bragging." |

## Session end and days 1 to 3

| Event key | Face | Move → target | Lines |
| --- | --- | --- | --- |
| `session.all_done` | cheering | celebrate → dock | "That's the full arcade. You legend." · "Done! Now the real game: use Flow for 3 days." |
| `quest.intro` | pointing | travel across → `quest-board` | "One tiny quest a day. Do it in real life, not here." · "Your first quest: dictate every prompt today." |
| `quest.return` | love | fly in → dock | "{name}! You came back. I wasn't worried. Okay, I was." · "Welcome back. How are the fingers feeling?" |
| `quest.missed_day` | sad | hop | "You missed yesterday. I counted every second." · "No guilt. Okay, a little guilt. Today's quest is ready." |
| `quest.upload_prompt` | pointing | perch → `upload` | "Drop your Flow streak card here. Proof or it didn't happen." · "Screenshot time. Show me the streak." |
| `quest.upload_done` | cheering | celebrate | "Verified. Streak looks great." · "Look at that streak. Chef's kiss." |
| `boss.intro` | shocked | orbit → `boss-card` | "Final boss: turn Flow off for 30 minutes. If you dare." · "Let's see how much you miss it." |
| `boss.missed_it` (rating 4–5) | smug | celebrate | "Missed it, huh? Thought so." · "Your keyboard is not getting its old job back." |
| `boss.fine_without` (rating 1–2) | thinking | perch → `rating` | "Honest answer, thank you. That's useful." · "Fair. Tell me why in one line?" |
| `farewell` | love | wave → fly off | "Thanks, {name}. You helped more than you know." · "That's a wrap. Go talk to your computer." |

## Easter eggs and errors

| Event key | Face | Move | Lines |
| --- | --- | --- | --- |
| `poke.once` | shocked | squash | "Hey!" · "Rude. Adorable, but rude." |
| `poke.five` | oops | spin | "I'm getting dizzy." · "Okay, you've found my weakness." |
| `drag.moved` | cheeky | follow cursor briefly | "Fine, I'll sit here." · "New office. I like it." |
| `error.network` | oops | dock | "Lost the internet. Not my fault. Probably." · "Connection hiccup. Try again?" |

## Writing new lines

- One sentence, 70 characters or fewer, contractions on.
- Tease the keyboard, the timer or Blip itself. Never a person's speed, accent or language.
- Every event needs at least two variants.
- Results lines must never contradict the numbers on screen.
