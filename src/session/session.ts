import { GAMES, type GameKey } from '../games/registry'
import {
  CodeNameTakenError,
  UnknownTokenError,
  type Api,
  type DescriptionSubmission,
  type Mode,
  type PlayerProfile,
  type RoundMetrics,
} from '../api/types'

export type { Mode }
export type Step = 'register' | 'consent' | 'lobby'
export type GameStatus = 'done' | 'next' | 'locked'

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
  /** One wave per finished round. */
  waves: number
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
  /** Adds the post-game answers to a round already saved. */
  recordAnswers(game: GameKey, mode: Mode, answers: Record<string, unknown>): Promise<void>
}

export function createSession({
  api,
  random = Math.random,
}: {
  api: Api
  random?: () => number
}): Session {
  const firstModes = new Map<GameKey, Mode>(
    GAMES.map(({ key }) => [key, random() < 0.5 ? 'typed' : 'voice']),
  )
  let token: string | null = null
  let step: Step = 'register'
  let player: SessionView['player'] = null
  let registerError: SessionView['registerError'] = null
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

  return {
    view: () => ({ step, player, registerError, games: games(), waves: wavesEarned() }),
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
      if (next?.key !== game) return
      const modeOrder = mode === firstModes.get(game) ? 1 : 2
      await api.submitRound(token, { ...metrics, game, mode, modeOrder }, description)
      completedModes.set(game, (completedModes.get(game) ?? new Set()).add(mode))
    },
    async recordAnswers(game, mode, answers) {
      if (!token) throw new Error('register before playing')
      await api.recordAnswers(token, game, mode, answers)
    },
  }
}
