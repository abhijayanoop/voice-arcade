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

/** What a Judge receives: never the mode, the author or the target. */
export interface JudgeItem {
  id: string
  text: string
  sceneSet: string
}

/** One row of the Speed race: code name, avatar and best voice words per minute, nothing else. */
export interface LeaderboardEntry {
  codeName: string
  avatar: number
  wpm: number
}

export interface PlayerState {
  player: PlayerProfile & { consented: boolean; leaderboardOptIn: boolean; arcadeDone: boolean; arcadeDoneAt: string | null }
  rounds: { game: GameKey; mode: Mode; modeOrder: 1 | 2 }[]
  questDays: number[]
  checkinDays: number[]
  bossDone: boolean
}

/** The day 3 check-in (day 5 is a later follow-up). */
export interface CheckinSubmission {
  day: 3 | 5
  streakDays: number
  totalWords: number
  /** Apps where Flow was used most. */
  apps: string[]
  /** Storage path of the streak card, when one was uploaded. */
  screenshotPath: string | null
  answers: Record<string, unknown>
}

export type Disappointment = 'very' | 'somewhat' | 'not'
export type PayIntent = 'already' | 'yes' | 'maybe' | 'no'

export interface BossSubmission {
  annoyance: number
  disappointment: Disappointment
  payIntent: PayIntent
  payIf: string | null
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
  /** Sets the finish time once; a repeat is ignored. */
  finishArcade(token: string): Promise<void>
  /** Top ten opted-in Players by best voice words per minute in Brain dump blitz. */
  getLeaderboard(): Promise<LeaderboardEntry[]>
  /** Merges answers into a saved round; the metrics stay as submitted. */
  recordAnswers(token: string, game: GameKey, mode: Mode, answers: Record<string, unknown>): Promise<void>
  /** Up to n descriptions this Judge has not judged yet. No sign-up: the Judge is a random key kept in their browser. */
  getJudgeBatch(judgeKey: string, n: number): Promise<JudgeItem[]>
  /** One pick per (description, Judge); a repeat is ignored. */
  submitJudgment(judgeKey: string, descriptionId: string, pickedScene: string): Promise<void>
  /** Records a quest day; a repeat is ignored. */
  markQuest(token: string, day: number): Promise<void>
  /** Insert-only: the browser can send a streak card but never read one back. Returns the stored path. */
  uploadStreakCard(token: string, day: number, file: Blob): Promise<string>
  submitCheckin(token: string, checkin: CheckinSubmission): Promise<void>
  submitBoss(token: string, boss: BossSubmission): Promise<void>
}
