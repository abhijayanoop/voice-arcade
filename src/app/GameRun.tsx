import { createContext, useContext, useMemo, useState } from 'react'
import type { RoundMetrics } from '../api/types'
import type { GameKey } from '../games/registry'
import type { Mode } from '../session/session'

/** A finished round kept in the browser for the Result screen to compare; the session has already saved it. */
export interface PlayedRound {
  metrics: RoundMetrics
  /** A voice step the Player typed instead: stored in the voice slot, flagged, and left out of the voice comparison. */
  typedInstead: boolean
}

interface GameRunValue {
  played(game: GameKey): Partial<Record<Mode, PlayedRound>>
  record(game: GameKey, mode: Mode, round: PlayedRound): void
}

const GameRunContext = createContext<GameRunValue | null>(null)

export function GameRunProvider({ children }: { children: React.ReactNode }) {
  const [rounds, setRounds] = useState<Partial<Record<GameKey, Partial<Record<Mode, PlayedRound>>>>>({})
  const value = useMemo<GameRunValue>(
    () => ({
      played: (game) => rounds[game] ?? {},
      record: (game, mode, round) =>
        setRounds((current) => ({ ...current, [game]: { ...current[game], [mode]: round } })),
    }),
    [rounds],
  )
  return <GameRunContext.Provider value={value}>{children}</GameRunContext.Provider>
}

export function useGameRun(): GameRunValue {
  const value = useContext(GameRunContext)
  if (!value) throw new Error('useGameRun outside GameRunProvider')
  return value
}
