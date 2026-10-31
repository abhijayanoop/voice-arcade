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
  /** A different prompt for each mode, so the two rounds never repeat. */
  prompts?: Record<Mode, Prompt>
}

/** Ideas are non-empty lines. */
export function countIdeas(text: string): number {
  return text.split('\n').filter((line) => line.trim() !== '').length
}

/** The Arcade in unlock order. Adding a game is adding one entry. */
export const GAMES: GameDef[] = [
  {
    key: 'brain_dump',
    title: 'Brain dump blitz',
    blurb: '60 sec · list silly ideas',
    card: 'tomato',
    playable: true,
    seconds: 60,
    explainer:
      'You get sixty seconds and a silly prompt. List as many ideas as you can, one per line. You play it twice: once typing, once talking to Flow.',
    prompts: {
      typed: { key: 'bd_typed_1', text: 'Name things a very lazy superhero could do instead of saving the day.' },
      voice: { key: 'bd_voice_1', text: 'Invent new uses for a broken umbrella.' },
    },
  },
  { key: 'decode', title: 'Describe to decode', blurb: 'Describe a scene so Judges can pick it', card: 'mustard', playable: false },
  { key: 'rant', title: 'Rant to sendable', blurb: 'Vent, then make it sendable', card: 'lavender', playable: false },
  { key: 'juggler', title: 'The juggler', blurb: 'Reply while you catch things', card: 'sage', playable: false },
  { key: 'snippet', title: 'Explain the snippet', blurb: 'Explain code, count the jargon', card: 'tomato', playable: false },
]
