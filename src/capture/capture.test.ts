import { describe, expect, it } from 'vitest'
import { capture, rubricHits, type RoundLog } from './capture'

// Worked by hand: six keystrokes at 1000, 1200 ... 2000 ms spell "hi all".
// The clock runs from the round start in both modes: 2 words in 2000 ms = 1/30 min -> 60 wpm.
const typedLog: RoundLog = {
  mode: 'typed',
  timerMs: 60000,
  events: [
    ...[1000, 1200, 1400, 1600, 1800, 2000].flatMap((t, i) => [
      { t, kind: 'key' as const },
      { t, kind: 'input' as const, inputType: 'insertText', length: 1, data: 'hi all'[i] },
    ]),
  ],
  firstText: 'hi all',
  finalText: 'hi all',
}

describe('a typed round', () => {
  it('reports words, characters, active time, wpm and keystrokes, and is ok', () => {
    expect(capture(typedLog)).toEqual({
      words: 2,
      chars: 6,
      activeMs: 2000,
      wpm: 60,
      keystrokes: 6,
      pasteEvents: 0,
      insertEvents: 0,
      editDistance: 0,
      integrity: 'ok',
    })
  })
})

describe('a voice round dictated by paste', () => {
  // "call mum about the bill" = 23 chars, 5 words, one paste at 3000 ms; the clock starts at 0.
  // 5 words in 3 s = 100 wpm.
  const log: RoundLog = {
    mode: 'voice',
    timerMs: 60000,
    events: [
      { t: 3000, kind: 'paste' },
      { t: 3000, kind: 'input', inputType: 'insertFromPaste', length: 23 },
    ],
    firstText: 'call mum about the bill',
    finalText: 'call mum about the bill',
  }

  it('counts the paste and insert, no keystrokes, and is ok', () => {
    expect(capture(log)).toMatchObject({
      words: 5, chars: 23, activeMs: 3000, wpm: 100,
      keystrokes: 0, pasteEvents: 1, insertEvents: 1, integrity: 'ok',
    })
  })

  it('flags the same text arriving by paste in a typed round', () => {
    const result = capture({ ...log, mode: 'typed' })
    expect(result.integrity).toBe('flagged')
    expect(result.activeMs).toBe(3000)
    expect(result.wpm).toBe(100)
  })
})

describe('a voice round dictated by simulated keystrokes', () => {
  // "go now" typed key by key: 6 keys against 6 characters is above the 80% share.
  const events = [500, 700, 900, 1100, 1300, 1500].flatMap((t, i) => [
    { t, kind: 'key' as const },
    { t, kind: 'input' as const, inputType: 'insertText', length: 1, data: 'go now'[i] },
  ])

  it('is flagged but keeps its metrics', () => {
    expect(capture({ mode: 'voice', timerMs: 60000, events, firstText: 'go now', finalText: 'go now' })).toMatchObject({
      words: 2, chars: 6, keystrokes: 6, activeMs: 1500, wpm: 80, integrity: 'flagged',
    })
  })
})

describe('a mixed round', () => {
  // Voice: a 17-char paste ("buy milk and eggs") then 3 corrective keys, final text edited by 3 characters.
  const log: RoundLog = {
    mode: 'voice',
    timerMs: 60000,
    events: [
      { t: 2000, kind: 'paste' },
      { t: 2000, kind: 'input', inputType: 'insertFromPaste', length: 17 },
      ...[4000, 4100, 4200].flatMap((t) => [
        { t, kind: 'key' as const },
        { t, kind: 'input' as const, inputType: 'insertText', length: 1 },
      ]),
    ],
    firstText: 'buy milk and eggs',
    finalText: 'buy milk and eggs!!!',
  }

  it('stays ok, counts each channel and measures the edit distance', () => {
    expect(capture(log)).toMatchObject({
      words: 4, chars: 20, keystrokes: 3, pasteEvents: 1, insertEvents: 1,
      editDistance: 3, activeMs: 4200, wpm: 57.1, integrity: 'ok',
    })
  })
})

describe('timing and empty rounds', () => {
  it('ignores input after the timer ended', () => {
    const events = [
      { t: 1000, kind: 'key' as const },
      { t: 70000, kind: 'key' as const },
    ]
    const result = capture({ mode: 'typed', timerMs: 60000, events, firstText: 'a b', finalText: 'a b' })
    expect(result.activeMs).toBe(60000)
  })

  it('reports zeros for an empty round', () => {
    expect(capture({ mode: 'voice', timerMs: 60000, events: [], firstText: '', finalText: '' })).toEqual({
      words: 0, chars: 0, activeMs: 0, wpm: 0, keystrokes: 0, pasteEvents: 0,
      insertEvents: 0, editDistance: 0, integrity: 'ok',
    })
  })

  it('counts words as whitespace-separated tokens', () => {
    expect(capture({ mode: 'typed', timerMs: 1, events: [], firstText: '', finalText: '  one\ntwo   three ' }).words).toBe(3)
  })
})

describe('rubricHits', () => {
  it('counts place, time and who from simple keywords', () => {
    expect(rubricHits('Meet me at the station at 6pm, Priya is coming too.')).toEqual({
      place: true, time: true, who: true, hits: 3,
    })
  })

  it('finds only what the reply mentions', () => {
    expect(rubricHits('Sure, see you tomorrow.')).toEqual({ place: false, time: true, who: false, hits: 1 })
    expect(rubricHits('Okay sounds good')).toMatchObject({ hits: 0 })
    expect(rubricHits('')).toMatchObject({ hits: 0 })
  })

  it('does not count everyday words as a place or a who', () => {
    expect(rubricHits('Sounds good, we will see how it goes. At the moment I am busy.')).toMatchObject({ place: false, who: false })
    expect(rubricHits('See you on Friday').who).toBe(false)
  })

  it('does not take a sentence-opening word or the pronoun I for a name', () => {
    expect(rubricHits('Great. Sure. I will be there.').who).toBe(false)
  })

  it('reads clock times written with a colon or o\'clock', () => {
    expect(rubricHits('18:30 works').time).toBe(true)
    expect(rubricHits('around seven o\'clock').time).toBe(true)
  })
})
