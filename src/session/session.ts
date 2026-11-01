import { GAMES, type GameKey } from '../games/registry'
import {
  CodeNameTakenError,
  UnknownTokenError,
  type Api,
  type BossSubmission,
  type DescriptionSubmission,
  type LeaderboardEntry,
  type Mode,
  type PlayerProfile,
  type RoundMetrics,
} from '../api/types'

export type { Mode }
export type Step = 'register' | 'consent' | 'lobby'
export type GameStatus = 'done' | 'next' | 'locked'
export type QuestStatus = 'done' | 'today' | 'missed' | 'locked'
/** Where the Player is in the whole experiment: the arcade, then three days of quests, then the close. */
export type Phase = 'arcade' | 'quests' | 'checkin' | 'boss' | 'thanks'

const DAY_MS = 24 * 60 * 60 * 1000
const QUEST_DAYS = [1, 2, 3] as const
const CHECKIN_DAY = 3

export interface CheckinInput {
  streakDays: number
  totalWords: number
  apps: string[]
  builtinTried: boolean
  builtinReason: string
  /** The Flow streak card. */
  image?: Blob
}

export type BossInput = Omit<BossSubmission, 'payIf'> & { payIf: string }

export interface GameView {
  key: GameKey
  status: GameStatus
  firstMode: Mode
  /** Modes already saved, so a refresh resumes at the missing round. */
  doneModes: Mode[]
}

export interface SessionView {
  step: Step
  player: { codeName: string; avatar: number } | null
  registerError: 'code_name_taken' | null
  games: GameView[]
  /** True once every game is done and the finish has been saved. */
  arcadeDone: boolean
  /** One wave per finished round. */
  waves: number
  phase: Phase
  /** The three daily quests; empty until the arcade is done. */
  quests: { day: number; status: QuestStatus }[]
  /** Consecutive quest days ticked, counted up to today (or yesterday while today is still open). */
  streak: number
  checkinDue: boolean
  bossDue: boolean
  totals: { waves: number; questsDone: number; streak: number }
}

export interface Session {
  view(): SessionView
  /** The Player's token, for the personal link; null until registered or resumed. */
  token(): string | null
  register(profile: PlayerProfile): Promise<void>
  giveConsent(choice: { leaderboardOptIn: boolean }): Promise<void>
  /** Restores a Player from their token. Returns false, changing nothing, when the token is unknown. */
  resume(token: string): Promise<boolean>
  completeRound(
    game: GameKey,
    mode: Mode,
    metrics: RoundMetrics,
    description?: DescriptionSubmission,
  ): Promise<void>
  /** The Speed race podium: opted-in Players only. */
  leaderboard(): Promise<LeaderboardEntry[]>
  /** Adds the post-game answers to a round already saved. */
  recordAnswers(game: GameKey, mode: Mode, answers: Record<string, unknown>): Promise<void>
  /** Ticks today's quest. Does nothing before the arcade is done. */
  markQuest(): Promise<void>
  /** Uploads the streak card, when given, and saves the day 3 check-in. */
  submitCheckin(input: CheckinInput): Promise<void>
  submitBoss(input: BossInput): Promise<void>
}

export function createSession({
  api,
  random = Math.random,
  now = () => new Date(),
}: {
  api: Api
  random?: () => number
  now?: () => Date
}): Session {
  const firstModes = new Map<GameKey, Mode>(
    GAMES.map(({ key }) => [key, random() < 0.5 ? 'typed' : 'voice']),
  )
  let token: string | null = null
  let step: Step = 'register'
  let player: SessionView['player'] = null
  let registerError: SessionView['registerError'] = null
  let arcadeDone = false
  let arcadeDoneAt: number | null = null
  let questDays = new Set<number>()
  let checkinDone = false
  let bossDone = false
  const completedModes = new Map<GameKey, Set<Mode>>()
  const isDone = (key: GameKey) => completedModes.get(key)?.size === 2

  const wavesEarned = () => [...completedModes.values()].reduce((sum, modes) => sum + modes.size, 0)

  const modesDone = (key: GameKey): Mode[] => [...(completedModes.get(key) ?? [])]

  function games(): GameView[] {
    let nextAssigned = false
    return GAMES.map(({ key }) => {
      const firstMode = firstModes.get(key)!
      if (isDone(key)) return { key, status: 'done', firstMode, doneModes: modesDone(key) }
      if (!nextAssigned) {
        nextAssigned = true
        return { key, status: 'next', firstMode, doneModes: modesDone(key) }
      }
      return { key, status: 'locked', firstMode, doneModes: modesDone(key) }
    })
  }

  /** Day 1 starts when the arcade finishes; each 24 hours after that opens the next day, up to day 3. */
  function today(): number | null {
    if (!arcadeDone) return null
    const elapsed = arcadeDoneAt === null ? 0 : Math.max(0, now().getTime() - arcadeDoneAt)
    return Math.min(QUEST_DAYS.length, Math.floor(elapsed / DAY_MS) + 1)
  }

  function quests(): SessionView['quests'] {
    const current = today()
    if (current === null) return []
    return QUEST_DAYS.map((day) => ({
      day,
      status: questDays.has(day) ? 'done' : day === current ? 'today' : day < current ? 'missed' : 'locked',
    }))
  }

  function streak(): number {
    const current = today()
    if (current === null) return 0
    let day = questDays.has(current) ? current : current - 1
    let run = 0
    while (day >= 1 && questDays.has(day)) {
      run++
      day--
    }
    return run
  }

  const checkinDue = () => (today() ?? 0) >= CHECKIN_DAY && !checkinDone
  const bossDue = () => arcadeDone && checkinDone && !bossDone

  function phase(): Phase {
    if (!arcadeDone) return 'arcade'
    if (bossDone) return 'thanks'
    if (checkinDone) return 'boss'
    return checkinDue() ? 'checkin' : 'quests'
  }

  async function finishIfDone(playerToken: string) {
    if (arcadeDone || !GAMES.every(({ key }) => isDone(key))) return
    await api.finishArcade(playerToken)
    arcadeDone = true
    arcadeDoneAt = now().getTime()
  }

  return {
    view: () => ({
      step,
      player,
      registerError,
      games: games(),
      arcadeDone,
      waves: wavesEarned(),
      phase: phase(),
      quests: quests(),
      streak: streak(),
      checkinDue: checkinDue(),
      bossDue: bossDue(),
      totals: {
        waves: wavesEarned(),
        questsDone: questDays.size,
        streak: streak(),
      },
    }),
    token: () => token,
    async register(profile) {
      try {
        token = (await api.registerPlayer(profile)).token
      } catch (error) {
        if (error instanceof CodeNameTakenError) {
          registerError = 'code_name_taken'
          return
        }
        throw error
      }
      registerError = null
      player = { codeName: profile.codeName, avatar: profile.avatar }
      step = 'consent'
    },
    async giveConsent({ leaderboardOptIn }) {
      if (!token) throw new Error('register before consent')
      await api.recordConsent(token, leaderboardOptIn)
      step = 'lobby'
    },
    async resume(candidate) {
      let state
      try {
        state = await api.getState(candidate)
      } catch (error) {
        if (error instanceof UnknownTokenError) return false
        throw error
      }
      token = candidate
      player = { codeName: state.player.codeName, avatar: state.player.avatar }
      step = state.player.consented ? 'lobby' : 'consent'
      registerError = null
      arcadeDone = state.player.arcadeDone
      arcadeDoneAt = state.player.arcadeDoneAt ? Date.parse(state.player.arcadeDoneAt) : null
      questDays = new Set(state.questDays)
      checkinDone = state.checkinDays.includes(CHECKIN_DAY)
      bossDone = state.bossDone
      completedModes.clear()
      for (const { game, mode, modeOrder } of state.rounds) {
        completedModes.set(game, (completedModes.get(game) ?? new Set()).add(mode))
        if (modeOrder === 1) firstModes.set(game, mode)
      }
      return true
    },
    async completeRound(game, mode, metrics, description) {
      if (!token) throw new Error('register before playing')
      const next = games().find((g) => g.status === 'next')
      // A retry after a failed finish lands here: every game is done, so only the finish is left to save.
      if (next?.key !== game) return finishIfDone(token)
      const modeOrder = mode === firstModes.get(game) ? 1 : 2
      await api.submitRound(token, { ...metrics, game, mode, modeOrder }, description)
      completedModes.set(game, (completedModes.get(game) ?? new Set()).add(mode))
      await finishIfDone(token)
    },
    leaderboard: () => api.getLeaderboard(),
    async recordAnswers(game, mode, answers) {
      if (!token) throw new Error('register before playing')
      await api.recordAnswers(token, game, mode, answers)
    },
    async markQuest() {
      const day = today()
      if (!token || day === null) return
      await api.markQuest(token, day)
      questDays.add(day)
    },
    async submitCheckin({ streakDays, totalWords, apps, builtinTried, builtinReason, image }) {
      if (!token || !arcadeDone) throw new Error('finish the arcade before the check-in')
      const screenshotPath = image ? await api.uploadStreakCard(token, CHECKIN_DAY, image) : null
      await api.submitCheckin(token, {
        day: CHECKIN_DAY,
        streakDays,
        totalWords,
        apps,
        screenshotPath,
        answers: {
          tried_builtin: builtinTried,
          builtin_dictation_reason: builtinTried ? builtinReason.trim() : '',
        },
      })
      checkinDone = true
    },
    async submitBoss({ payIf, ...rest }) {
      if (!token || !checkinDone) throw new Error('finish the check-in before the boss round')
      await api.submitBoss(token, { ...rest, payIf: payIf.trim() || null })
      bossDone = true
    },
  }
}
