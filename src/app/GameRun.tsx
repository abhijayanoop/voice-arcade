import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { RoundMetrics } from '../api/types'
import type { GameKey } from '../games/registry'
import type { Mode } from '../session/session'
import { useSession } from './SessionProvider'

/** A finished round kept in the browser for the Result screen to compare; the session has already saved it. */
export interface PlayedRound {
  metrics: RoundMetrics
  /** A voice step the Player typed instead: stored in the voice slot, flagged, and left out of the voice comparison. */
  typedInstead: boolean
  /** Decode only: the scene set shown and the target the Player described. */
  scenes?: { setId: string; targetId: string }
  /** Snippet only: the technical terms found in the explanation. The text itself is not kept. */
  jargon?: string[]
}

interface GameRunValue {
  played(game: GameKey): Partial<Record<Mode, PlayedRound>>
  record(game: GameKey, mode: Mode, round: PlayedRound): void
  /** Rant only: the language mix picked for the first round, offered again for the second. */
  langMix: string | null
  setLangMix(mix: string): void
}

const GameRunContext = createContext<GameRunValue | null>(null)

type Rounds = Partial<Record<GameKey, Partial<Record<Mode, PlayedRound>>>>

/** Metrics only (never dictated text), kept per Player so a reload or a return by personal link still reaches the Result screen. */
const storeKey = (who: string) => `voice-arcade.run:${who}`

function readRounds(who: string): Rounds {
  try {
    return JSON.parse(window.localStorage.getItem(storeKey(who)) ?? '{}') as Rounds
  } catch {
    return {}
  }
}

export function GameRunProvider({ children }: { children: React.ReactNode }) {
  const { personalLink } = useSession()
  const [rounds, setRounds] = useState<Rounds>({})
  const [loadedFor, setLoadedFor] = useState<string | null>(null)

  // When a Player is registered or restored, bring back the rounds saved in this browser.
  useEffect(() => {
    if (!personalLink) return
    const stored = readRounds(personalLink)
    setRounds((current) => {
      const merged: Rounds = { ...stored }
      for (const game of Object.keys(current) as GameKey[]) merged[game] = { ...stored[game], ...current[game] }
      return merged
    })
    setLoadedFor(personalLink)
  }, [personalLink])

  useEffect(() => {
    if (!personalLink || loadedFor !== personalLink) return
    try {
      window.localStorage.setItem(storeKey(personalLink), JSON.stringify(rounds))
    } catch {
      // Private mode: the run lasts for this visit only.
    }
  }, [rounds, personalLink, loadedFor])
  const [langMix, setLangMix] = useState<string | null>(null)
  const value = useMemo<GameRunValue>(
    () => ({
      langMix,
      setLangMix,
      played: (game) => rounds[game] ?? {},
      record: (game, mode, round) =>
        setRounds((current) => ({ ...current, [game]: { ...current[game], [mode]: round } })),
    }),
    [rounds, langMix],
  )
  return <GameRunContext.Provider value={value}>{children}</GameRunContext.Provider>
}

export function useGameRun(): GameRunValue {
  const value = useContext(GameRunContext)
  if (!value) throw new Error('useGameRun outside GameRunProvider')
  return value
}
