import { createContext, useContext, useMemo, useState } from 'react'
import { createMemoryApi } from '../api/memoryApi'
import type { PlayerProfile } from '../api/types'
import type { GameKey } from '../games/registry'
import { createSession, type Mode, type SessionView } from '../session/session'

interface SessionContextValue {
  view: SessionView
  register(profile: PlayerProfile): Promise<void>
  giveConsent(choice: { leaderboardOptIn: boolean }): Promise<void>
  completeRound(game: GameKey, mode: Mode): void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const session = useMemo(() => createSession({ api: createMemoryApi() }), [])
  const [view, setView] = useState(session.view())

  const value = useMemo<SessionContextValue>(
    () => ({
      view,
      register: async (profile) => {
        await session.register(profile)
        setView(session.view())
      },
      giveConsent: async (choice) => {
        await session.giveConsent(choice)
        setView(session.view())
      },
      completeRound: (game, mode) => {
        session.completeRound(game, mode)
        setView(session.view())
      },
    }),
    [session, view],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession outside SessionProvider')
  return value
}
