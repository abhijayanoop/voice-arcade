export type Mode = 'typed' | 'voice'

export type RecordedEvent =
  | { t: number; kind: 'key' }
  | { t: number; kind: 'paste' }
  | { t: number; kind: 'input'; inputType: string; length: number; data?: string }

/** Everything the recorder saw during one round. `t` is milliseconds since the round started. */
export interface RoundLog {
  mode: Mode
  /** Length of the round's timer; input after it does not count towards active time. */
  timerMs: number
  events: RecordedEvent[]
  /** The text as it first stood (when typing paused or the first chunk landed); the edit distance is measured from here. */
  firstText: string
  finalText: string
}

export interface CaptureMetrics {
  words: number
  chars: number
  activeMs: number
  wpm: number
  keystrokes: number
  pasteEvents: number
  insertEvents: number
  editDistance: number
  integrity: 'ok' | 'flagged'
}

/** A voice round whose text came almost entirely from key presses is flagged; this is the share that counts as "almost entirely". */
const KEYSTROKE_SHARE_FLAG = 0.8

export function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}

export function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    previous = row
  }
  return previous[b.length]
}

/** An insert is a chunk of text arriving at once: a paste, or an input event carrying more than one character. */
function isInsert(event: RecordedEvent): boolean {
  return event.kind === 'input' && (event.inputType === 'insertFromPaste' || event.length > 1)
}

export function capture(log: RoundLog): CaptureMetrics {
  const { events, mode, finalText } = log
  const keystrokes = events.filter((e) => e.kind === 'key').length
  const pasteEvents = events.filter((e) => e.kind === 'paste').length
  const insertEvents = events.filter(isInsert).length

  const words = countWords(finalText)
  const chars = finalText.length

  // One clock for both modes, so typed and voice compare fairly: from the round start to the last input or the timer end, whichever is first.
  const activeMs = events.length === 0 ? 0 : Math.min(Math.max(...events.map((e) => e.t)), log.timerMs)
  const wpm = activeMs === 0 ? 0 : Math.round((words / (activeMs / 60000)) * 10) / 10

  const flagged =
    mode === 'typed'
      ? pasteEvents > 0 || insertEvents > 0
      : chars > 0 && keystrokes >= KEYSTROKE_SHARE_FLAG * chars

  return {
    words,
    chars,
    activeMs,
    wpm,
    keystrokes,
    pasteEvents,
    insertEvents,
    editDistance: editDistance(log.firstText, finalText),
    integrity: flagged ? 'flagged' : 'ok',
  }
}

export interface RubricHits {
  place: boolean
  time: boolean
  who: boolean
  hits: number
}

const PLACE = /\b(?:at|in|near|outside|inside|by)\s+the\b|\b(?:caf[eé]|office|station|park|home|house|room|library|restaurant|bar|pub|mall|campus|gym|school|hotel|airport|street|lobby|entrance|floor|building|downtown|venue|place)\b/i
const TIME = /\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b|\b\d{1,2}:\d{2}\b|o['’]?clock|\b(?:noon|midnight|tonight|tomorrow|today|morning|afternoon|evening|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
const WHO = /\b(?:with|bring|bringing|invite|inviting|joining|joins|coming|everyone|everybody|team|friends?|colleagues?|boss|manager|we|he|she|they)\b/i

/** A capitalised word in mid-sentence reads as a name; the opening word of a sentence and "I" do not. */
function hasName(text: string): boolean {
  return /(?<![.!?]\s)(?<!^)\b(?!I\b)[A-Z][a-z]+\b/.test(text.trim())
}

/**
 * The Juggler's approximate rubric: does the reply mention a place, a time and who is involved?
 * Plain keyword matching, so it can miss or over-count; it is reported as approximate.
 */
export function rubricHits(text: string): RubricHits {
  const place = PLACE.test(text)
  const time = TIME.test(text)
  const who = WHO.test(text) || hasName(text)
  return { place, time, who, hits: [place, time, who].filter(Boolean).length }
}
