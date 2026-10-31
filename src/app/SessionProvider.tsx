import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { createApi } from '../api'
import type { DescriptionSubmission, LeaderboardEntry, PlayerProfile, RoundMetrics } from '../api/types'
import type { GameKey } from '../games/registry'
import { createSession, type Mode, type SessionView } from '../session/session'

const TOKEN_KEY = 'voice-arcade.token'

interface SessionContextValue {
  view: SessionView
  /** True while a stored token is being restored. */
  restoring: boolean
  personalLink: string | null
  register(profile: PlayerProfile): Promise<void>
  giveConsent(choice: { leaderboardOptIn: boolean }): Promise<void>
  resume(token: string): Promise<boolean>
  completeRound(game: GameKey, mode: Mode, metrics: RoundMetrics, description?: DescriptionSubmission): Promise<void>
  recordAnswers(game: GameKey, mode: Mode, answers: Record<string, unknown>): Promise<void>
  leaderboard(): Promise<LeaderboardEntry[]>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const session = useMemo(() => createSession({ api: createApi() }), [])
  const [view, setView] = useState(session.view())
  const [token, setToken] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(() => localStorage.getItem(TOKEN_KEY) !== null)

  function refresh() {
    const current = session.token()
    if (current) localStorage.setItem(TOKEN_KEY, current)
    setToken(current)
    setView(session.view())
  }

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (!stored) return
    session
      .resume(stored)
      .then((found) => {
        if (!found) localStorage.removeItem(TOKEN_KEY)
        refresh()
      })
      .finally(() => setRestoring(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const value = useMemo<SessionContextValue>(
    () => ({
      view,
      restoring,
      personalLink: token ? `${window.location.origin}/p/${token}` : null,
      register: async (profile) => {
        await session.register(profile)
        refresh()
      },
      giveConsent: async (choice) => {
        await session.giveConsent(choice)
        refresh()
      },
      resume: async (candidate) => {
        const found = await session.resume(candidate)
        refresh()
        return found
      },
      completeRound: async (game, mode, metrics, description) => {
        await session.completeRound(game, mode, metrics, description)
        refresh()
      },
      recordAnswers: (game, mode, answers) => session.recordAnswers(game, mode, answers),
      leaderboard: () => session.leaderboard(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, view, restoring, token],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession outside SessionProvider')
  return value
}
