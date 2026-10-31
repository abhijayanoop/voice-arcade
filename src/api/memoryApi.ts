import { CodeNameTakenError, type Api, type PlayerProfile } from './types'

interface StoredPlayer extends PlayerProfile {
  token: string
  consented: boolean
  leaderboardOptIn: boolean
}

export interface MemoryApi extends Api {
  /** Test and dev inspection of what was persisted. */
  players(): StoredPlayer[]
}

export function createMemoryApi(): MemoryApi {
  const store = new Map<string, StoredPlayer>()

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
      const player = store.get(token)
      if (!player) throw new Error('unknown_token')
      player.consented = true
      player.leaderboardOptIn = leaderboardOptIn
    },
    players: () => [...store.values()].map((p) => ({ ...p })),
  }
}
