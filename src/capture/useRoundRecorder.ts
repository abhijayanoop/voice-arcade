import { useEffect, useRef } from 'react'
import type { Mode, RecordedEvent, RoundLog } from './capture'

/** A pause this long ends the "first text" snapshot that the edit distance starts from. */
const FIRST_TEXT_GAP_MS = 2000

const COUNTED_KEYS = new Set(['Backspace', 'Delete', 'Enter'])

/**
 * Records the input log of one round on a plain textarea. All judgement lives in `capture`; this only watches.
 * Typed rounds block paste and drops (and call `onBlocked`); voice rounds let insertions through.
 */
export function useRoundRecorder({
  mode,
  timerMs,
  onBlocked,
}: {
  mode: Mode
  timerMs: number
  onBlocked?: () => void
}) {
  const field = useRef<HTMLTextAreaElement>(null)
  const events = useRef<RecordedEvent[]>([])
  const origin = useRef(0)
  const lastInput = useRef<number | null>(null)
  const firstText = useRef<string | null>(null)
  const blocked = useRef(onBlocked)
  blocked.current = onBlocked

  useEffect(() => {
    const el = field.current
    if (!el) return
    const now = () => Math.round(performance.now() - origin.current)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key.length === 1 || COUNTED_KEYS.has(event.key)) events.current.push({ t: now(), kind: 'key' })
    }
    const onPaste = (event: ClipboardEvent) => {
      if (mode === 'typed') {
        event.preventDefault()
        blocked.current?.()
        return
      }
      events.current.push({ t: now(), kind: 'paste' })
    }
    const onBeforeInput = (event: InputEvent) => {
      if (mode === 'typed' && (event.inputType === 'insertFromPaste' || event.inputType === 'insertFromDrop')) {
        event.preventDefault()
        blocked.current?.()
        return
      }
      const t = now()
      if (lastInput.current !== null && t - lastInput.current > FIRST_TEXT_GAP_MS && firstText.current === null) {
        firstText.current = el.value
      }
      lastInput.current = t
      events.current.push({ t, kind: 'input', inputType: event.inputType, length: event.data?.length ?? 0 })
    }

    el.addEventListener('keydown', onKeyDown)
    el.addEventListener('paste', onPaste)
    el.addEventListener('beforeinput', onBeforeInput)
    return () => {
      el.removeEventListener('keydown', onKeyDown)
      el.removeEventListener('paste', onPaste)
      el.removeEventListener('beforeinput', onBeforeInput)
    }
  }, [mode])

  return {
    field,
    /** Starts the clock and forgets anything recorded before. */
    start() {
      events.current = []
      lastInput.current = null
      firstText.current = null
      origin.current = performance.now()
    },
    finish(finalText: string): RoundLog {
      return { mode, timerMs, events: events.current, firstText: firstText.current ?? finalText, finalText }
    },
  }
}
