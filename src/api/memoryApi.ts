import {
  CodeNameTakenError,
  UnknownTokenError,
  type Api,
  type PlayerProfile,
  type PlayerState,
  type RoundSubmission,
  type DescriptionSubmission,
  type JudgeItem,
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
  judgments(): { descriptionId: string; judgeKey: string; pickedScene: string; correct: boolean }[]
}

interface StoredDescription extends DescriptionSubmission {
  id: string
}

export function createMemoryApi(): MemoryApi {
  const store = new Map<string, StoredPlayer>()
  const roundsByToken = new Map<string, RoundSubmission[]>()
  const descriptionList: StoredDescription[] = []
  const judgmentList: ReturnType<MemoryApi['judgments']> = []

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
      if (description) descriptionList.push({ ...description, id: `desc-${descriptionList.length + 1}` })
    },
    async recordAnswers(token, game, mode, answers) {
      find(token)
      const round = (roundsByToken.get(token) ?? []).find((r) => r.game === game && r.mode === mode)
      if (round) round.answers = { ...round.answers, ...answers }
    },
    async getJudgeBatch(judgeKey, n) {
      const judged = new Set(judgmentList.filter((j) => j.judgeKey === judgeKey).map((j) => j.descriptionId))
      return descriptionList
        .filter((d) => !judged.has(d.id))
        .slice(0, Math.max(0, n))
        .map((d): JudgeItem => ({ id: d.id, text: d.text, sceneSet: d.sceneSet }))
    },
    async submitJudgment(judgeKey, descriptionId, pickedScene) {
      const description = descriptionList.find((d) => d.id === descriptionId)
      if (!description) throw new Error('unknown_description')
      if (judgmentList.some((j) => j.descriptionId === descriptionId && j.judgeKey === judgeKey)) return
      judgmentList.push({ descriptionId, judgeKey, pickedScene, correct: pickedScene === description.targetScene })
    },
    players: () => [...store.values()].map((p) => ({ ...p })),
    rounds: () => [...roundsByToken.values()].flat(),
    descriptions: () => descriptionList.map(({ sceneSet, targetScene, text }) => ({ sceneSet, targetScene, text })),
    judgments: () => judgmentList.map((j) => ({ ...j })),
  }
}
