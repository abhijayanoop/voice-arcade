export type Cohort = 'developer' | 'prompt_engineer'
export type Os = 'mac' | 'windows' | 'other'

export interface PlayerProfile {
  codeName: string
  avatar: number
  cohort: Cohort
  os: Os
  languages: string[]
}

export class CodeNameTakenError extends Error {
  constructor() {
    super('code_name_taken')
  }
}

export interface Api {
  /** Creates the Player and returns their token. Throws CodeNameTakenError. */
  registerPlayer(profile: PlayerProfile): Promise<{ token: string }>
  recordConsent(token: string, leaderboardOptIn: boolean): Promise<void>
}
