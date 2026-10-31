import type { GameKey } from '../api/types'

export type { GameKey }

export interface GameDef {
  key: GameKey
  title: string
  blurb: string
  card: 'tomato' | 'mustard' | 'sage' | 'lavender'
}

/** The Arcade in unlock order. Adding a game is adding one entry. */
export const GAMES: GameDef[] = [
  { key: 'brain_dump', title: 'Brain dump blitz', blurb: '60 sec · list silly ideas', card: 'tomato' },
  { key: 'decode', title: 'Describe to decode', blurb: 'Describe a scene so Judges can pick it', card: 'mustard' },
  { key: 'rant', title: 'Rant to sendable', blurb: 'Vent, then make it sendable', card: 'lavender' },
  { key: 'juggler', title: 'The juggler', blurb: 'Reply while you catch things', card: 'sage' },
  { key: 'snippet', title: 'Explain the snippet', blurb: 'Explain code, count the jargon', card: 'tomato' },
]
