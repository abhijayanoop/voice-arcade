import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import scriptsMarkdown from '../../docs/design/Scripts.md?raw'
import { createBlip, parseScripts, type Said, type Vars } from './blip'

const blip = createBlip({ table: parseScripts(scriptsMarkdown) })

export interface BlipScene extends Said {
  /** Changes on every step so the bubble, the move and any drag reset restart. */
  id: number
}

interface BlipValue {
  scene: BlipScene
  quiet: boolean
  say(eventKey: string, vars?: Vars): void
  /** Counts a running timer; returns the function that releases it. */
  holdQuiet(): () => void
}

const IDLE: BlipScene = { id: 0, expression: 'idle', move: 'dock', target: null, line: '' }

const BlipContext = createContext<BlipValue | null>(null)

export function BlipProvider({ children }: { children: React.ReactNode }) {
  const [scene, setScene] = useState<BlipScene>(IDLE)
  const [quiet, setQuiet] = useState(false)
  const holds = useRef(0)
  const counter = useRef(0)

  const holdQuiet = useCallback(() => {
    holds.current += 1
    setQuiet(true)
    let released = false
    return () => {
      if (released) return
      released = true
      holds.current -= 1
      if (holds.current === 0) setQuiet(false)
    }
  }, [])

  const say = useCallback((eventKey: string, vars?: Vars) => {
    // Quiet mode: a timer is running, so Blip stays docked and silent.
    if (holds.current > 0) return
    counter.current += 1
    setScene({ id: counter.current, ...blip.say(eventKey, vars) })
  }, [])

  // Going quiet sends Blip home with a neutral face.
  useEffect(() => {
    if (quiet) {
      counter.current += 1
      setScene({ ...IDLE, id: counter.current })
    }
  }, [quiet])

  const value = useMemo(() => ({ scene, quiet, say, holdQuiet }), [scene, quiet, say, holdQuiet])
  return <BlipContext.Provider value={value}>{children}</BlipContext.Provider>
}

export function useBlip(): BlipValue {
  const value = useContext(BlipContext)
  if (!value) throw new Error('useBlip outside BlipProvider')
  return value
}

/** Blip reacts once when the screen mounts. Later screens add their own event keys through the same call. */
export function useBlipOnMount(eventKey: string | null, vars?: Vars) {
  const { say } = useBlip()
  const varsRef = useRef(vars)
  useEffect(() => {
    if (eventKey) say(eventKey, varsRef.current)
  }, [eventKey, say])
}

/** Quiet mode on while `active` (a timer is running), off afterwards. */
export function useQuietWhile(active: boolean) {
  const { holdQuiet } = useBlip()
  useEffect(() => (active ? holdQuiet() : undefined), [active, holdQuiet])
}
