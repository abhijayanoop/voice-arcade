import { createContext, useContext, useMemo, useState } from 'react'
import type { RoundMetrics } from '../api/types'
import type { GameKey } from '../games/registry'
import type { Mode } from '../session/session'

/** A finished round held in the browser until the Result screen submits both. */
export interface PlayedRound {
  metrics: RoundMetrics
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
