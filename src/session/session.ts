import { GAMES, type GameKey } from '../games/registry'
import { CodeNameTakenError, type Api, type PlayerProfile } from '../api/types'

export type Step = 'register' | 'consent' | 'lobby'
export type GameStatus = 'done' | 'next' | 'locked'

export type Mode = 'typed' | 'voice'

export interface GameView {
  key: GameKey
  status: GameStatus
  firstMode: Mode
}

export interface SessionView {
  step: Step
  player: { codeName: string; avatar: number } | null
  registerError: 'code_name_taken' | null
  games: GameView[]
}

export interface Session {
  view(): SessionView
  register(profile: PlayerProfile): Promise<void>
  giveConsent(choice: { leaderboardOptIn: boolean }): Promise<void>
  completeRound(game: GameKey, mode: Mode): void
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

  function games(): GameView[] {
    let nextAssigned = false
    return GAMES.map(({ key }) => {
      const firstMode = firstModes.get(key)!
      if (isDone(key)) return { key, status: 'done', firstMode }
      if (!nextAssigned) {
        nextAssigned = true
        return { key, status: 'next', firstMode }
      }
      return { key, status: 'locked', firstMode }
    })
  }

  return {
    view: () => ({ step, player, registerError, games: games() }),
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
    completeRound(game, mode) {
      const next = games().find((g) => g.status === 'next')
      if (next?.key !== game) return
      completedModes.set(game, (completedModes.get(game) ?? new Set()).add(mode))
    },
  }
}
