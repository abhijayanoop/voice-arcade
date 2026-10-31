import type { GameKey, Mode } from '../api/types'

export type { GameKey }

export interface Prompt {
  key: string
  text: string
}

export interface GameDef {
  key: GameKey
  title: string
  blurb: string
  card: 'tomato' | 'mustard' | 'sage' | 'lavender'
  /** False until the game's round screens are built. */
  playable: boolean
  /** Round length in seconds, for timed games. */
  seconds?: number
  explainer?: string
  /** Round screen copy that differs by game. */
  inputLabel?: string
  voiceHint?: string
  emptyNotice?: string
  /** A different prompt for each mode, so the two rounds never repeat. */
  prompts?: Record<Mode, Prompt>
}

/** Ideas are non-empty lines. */
export function countIdeas(text: string): number {
  return text.split('\n').filter((line) => line.trim() !== '').length
}

/** Language mixes a Player can pick before a Rant round. */
export const LANG_MIXES = ['English', 'Hinglish', 'Manglish', 'Hindi', 'Spanish', 'Other mix']

/** The Arcade in unlock order. Adding a game is adding one entry. */
export const GAMES: GameDef[] = [
  {
    key: 'brain_dump',
    title: 'Brain dump blitz',
    blurb: '60 sec · list silly ideas',
    card: 'tomato',
    playable: true,
    seconds: 60,
    inputLabel: 'Your ideas, one per line',
    voiceHint: 'Hold your Flow key and talk. Ideas, one per line.',
    emptyNotice: 'That is empty. Add at least one idea.',
    explainer:
      'You get sixty seconds and a silly prompt. List as many ideas as you can, one per line. You play it twice: once typing, once talking to Flow.',
    prompts: {
      typed: { key: 'bd_typed_1', text: 'Name things a very lazy superhero could do instead of saving the day.' },
      voice: { key: 'bd_voice_1', text: 'Invent new uses for a broken umbrella.' },
    },
  },
  {
    key: 'decode',
    title: 'Describe to decode',
    blurb: '90 sec · describe a scene so Judges can pick it',
    card: 'mustard',
    playable: true,
    seconds: 90,
    inputLabel: 'Your description of the highlighted scene',
    voiceHint: 'Hold your Flow key and describe the highlighted scene.',
    emptyNotice: 'That is empty. Describe the highlighted scene first.',
    explainer:
      'You see four near-identical scenes and one is highlighted. Describe it so an outside Judge could pick it out from the lookalikes. Your description is shown to Judges anonymously. You play it twice: once typing, once talking to Flow, each with a different scene.',
  },
  {
    key: 'rant',
    title: 'Rant to sendable',
    blurb: '90 sec · vent, then make it sendable',
    card: 'lavender',
    playable: true,
    seconds: 90,
    inputLabel: 'Your rant',
    voiceHint: 'Hold your Flow key and rant, in whatever language you actually rant in.',
    emptyNotice: 'That is empty. Write or say something first.',
    explainer:
      'Pick the language mix you really rant in. You get ninety seconds to vent about something irritating, then you edit it into something you could actually send. You rate how sendable your rant was and, in the voice round, how accurate Flow was. Your words never leave this browser: only the ratings and numbers are saved. You play it twice: once typing, once talking to Flow.',
    prompts: {
      typed: { key: 'rant_typed_1', text: 'Rant about a group chat that never stops buzzing.' },
      voice: { key: 'rant_voice_1', text: 'Rant about a meeting that should have been a message.' },
    },
  },
  { key: 'juggler', title: 'The juggler', blurb: 'Reply while you catch things', card: 'sage', playable: false },
  { key: 'snippet', title: 'Explain the snippet', blurb: 'Explain code, count the jargon', card: 'tomato', playable: false },
]
