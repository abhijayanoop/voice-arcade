import {
  CodeNameTakenError,
  UnknownTokenError,
  type Api,
  type PlayerProfile,
  type PlayerState,
  type RoundSubmission,
  type DescriptionSubmission,
} from './types'

interface StoredPlayer extends PlayerProfile {
  token: string
  consented: boolean
  leaderboardOptIn: boolean
}

export interface MemoryApi extends Api {
  /** Test and dev inspection of what was persisted. */
  players(): StoredPlayer[]
  rounds(): RoundSubmission[]
  descriptions(): DescriptionSubmission[]
}

export function createMemoryApi(): MemoryApi {
  const store = new Map<string, StoredPlayer>()
  const roundsByToken = new Map<string, RoundSubmission[]>()
  const descriptionList: DescriptionSubmission[] = []

  const find = (token: string) => {
    const player = store.get(token)
    if (!player) throw new UnknownTokenError()
    return player
  }

  return {
    async registerPlayer(profile) {
      const taken = [...store.values()].some(
        (p) => p.codeName.toLowerCase() === profile.codeName.toLowerCase(),
      )
      if (taken) throw new CodeNameTakenError()
      const token = `mem-${store.size + 1}-${Math.random().toString(36).slice(2, 10)}`
      store.set(token, { ...profile, token, consented: false, leaderboardOptIn: false })
      return { token }
    },
    async recordConsent(token, leaderboardOptIn) {
      const player = find(token)
      player.consented = true
      player.leaderboardOptIn = leaderboardOptIn
    },
    async getState(token): Promise<PlayerState> {
      const { codeName, avatar, cohort, os, languages, consented, leaderboardOptIn } = find(token)
      return {
        player: { codeName, avatar, cohort, os, languages: [...languages], consented, leaderboardOptIn, arcadeDone: false },
        rounds: (roundsByToken.get(token) ?? []).map(({ game, mode, modeOrder }) => ({ game, mode, modeOrder })),
        questDays: [],
        checkinDays: [],
        bossDone: false,
      }
    },
    async submitRound(token, round, description) {
      find(token)
      const rounds = roundsByToken.get(token) ?? []
      if (rounds.some((r) => r.game === round.game && r.mode === round.mode)) return
      roundsByToken.set(token, [...rounds, round])
      if (description) descriptionList.push(description)
    },
    players: () => [...store.values()].map((p) => ({ ...p })),
    rounds: () => [...roundsByToken.values()].flat(),
    descriptions: () => [...descriptionList],
  }
}
