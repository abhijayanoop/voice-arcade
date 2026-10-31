import { describe, expect, it } from 'vitest'
import scriptsMarkdown from '../../docs/design/Scripts.md?raw'
import { createBlip, parseScripts } from './blip'

const TABLE = `
| Event key | Face | Move → target | Lines |
| --- | --- | --- | --- |
| \`a.one\` | smug | perch → \`start\` | "First {name}." · "Second {name}." · "Third {name}." |
| \`a.two\` (rating 4–5) | love | celebrate | "Only line." |
| \`a.quiet\` | idle | dock (quiet) | No lines while the timer runs. |
`

describe('parseScripts', () => {
  it('reads expression, move, target and lines from a script table', () => {
    const table = parseScripts(TABLE)
    expect(table['a.one']).toEqual({
      expression: 'smug',
      move: 'perch',
      target: 'start',
      lines: ['First {name}.', 'Second {name}.', 'Third {name}.'],
    })
    expect(table['a.two']).toMatchObject({ expression: 'love', move: 'celebrate', target: null })
    expect(table['a.quiet'].lines).toEqual([])
  })

  it('parses the real Blip scripts with at least two variants per event that speaks', () => {
    const table = parseScripts(scriptsMarkdown)
    expect(table['round.time_up']).toMatchObject({ expression: 'pointing', target: 'submit' })
    for (const [key, entry] of Object.entries(table)) {
      if (key === 'round.running') continue
      expect(entry.lines.length, key).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('say', () => {
  it('substitutes variables into the line', () => {
    const blip = createBlip({ table: parseScripts(TABLE) })
    const result = blip.say('a.one', { name: 'Mango' })
    expect(result.line).toMatch(/^(First|Second|Third) Mango\.$/)
    expect(result).toMatchObject({ expression: 'smug', move: 'perch', target: 'start' })
  })

  it('substitutes {n} inside a target', () => {
    const blip = createBlip({ table: parseScripts(scriptsMarkdown) })
    expect(blip.say('lobby.unlocked', { n: 3 }).target).toBe('lobby-card-3')
  })

  it('never repeats the last variant for a key', () => {
    const blip = createBlip({ table: parseScripts(TABLE) })
    let previous = blip.say('a.one', { name: 'x' }).line
    for (let i = 0; i < 200; i++) {
      const next = blip.say('a.one', { name: 'x' }).line
      expect(next).not.toBe(previous)
      previous = next
    }
  })

  it('tracks the last variant per key', () => {
    const blip = createBlip({ table: parseScripts(TABLE), random: () => 0 })
    expect(blip.say('a.one', { name: 'x' }).line).toBe('First x.')
    expect(blip.say('a.two').line).toBe('Only line.')
    expect(blip.say('a.one', { name: 'x' }).line).toBe('Second x.')
  })

  it('returns an empty line for an event with no lines, and throws for an unknown key', () => {
    const blip = createBlip({ table: parseScripts(TABLE) })
    expect(blip.say('a.quiet').line).toBe('')
    expect(() => blip.say('nope')).toThrow(/nope/)
  })
})
