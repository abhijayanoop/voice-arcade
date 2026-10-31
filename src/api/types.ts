export type Cohort = 'developer' | 'prompt_engineer'
export type Os = 'mac' | 'windows' | 'other'
export type GameKey = 'brain_dump' | 'decode' | 'rant' | 'juggler' | 'snippet'
export type Mode = 'typed' | 'voice'

export interface PlayerProfile {
  codeName: string
  avatar: number
  cohort: Cohort
  os: Os
  languages: string[]
}

/** What a finished round stores: metrics and ratings, never dictated text (ADR 0003). */
export interface RoundMetrics {
  promptKey: string
  startedAt: string
  activeMs: number
  words: number
  chars: number
  wpm: number
  keystrokes: number
  pasteEvents: number
  insertEvents: number
  integrity: 'ok' | 'flagged'
  answers: Record<string, unknown>
  extras: Record<string, unknown>
}

export interface RoundSubmission extends RoundMetrics {
  game: GameKey
  mode: Mode
  /** 1 when this was the Player's first mode for the game, 2 otherwise. */
  modeOrder: 1 | 2
}

/** The one stored dictated text: a Decode description. */
export interface DescriptionSubmission {
  sceneSet: string
  targetScene: string
  text: string
}

export interface PlayerState {
  player: PlayerProfile & { consented: boolean; leaderboardOptIn: boolean; arcadeDone: boolean }
  rounds: { game: GameKey; mode: Mode; modeOrder: 1 | 2 }[]
  questDays: number[]
  checkinDays: number[]
  bossDone: boolean
}

export class CodeNameTakenError extends Error {
  constructor() {
    super('code_name_taken')
  }
}

export class UnknownTokenError extends Error {
  constructor() {
    super('unknown_token')
  }
}

export interface Api {
  /** Creates the Player and returns their token. Throws CodeNameTakenError. */
  registerPlayer(profile: PlayerProfile): Promise<{ token: string }>
  recordConsent(token: string, leaderboardOptIn: boolean): Promise<void>
  /** Throws UnknownTokenError when no Player holds the token. */
  getState(token: string): Promise<PlayerState>
  /** Idempotent on (player, game, mode): a repeat is ignored. */
  submitRound(token: string, round: RoundSubmission, description?: DescriptionSubmission): Promise<void>
  /** Merges answers into a saved round; the metrics stay as submitted. */
  recordAnswers(token: string, game: GameKey, mode: Mode, answers: Record<string, unknown>): Promise<void>
}
