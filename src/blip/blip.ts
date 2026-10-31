export type Expression =
  | 'idle' | 'pointing' | 'listening' | 'thinking' | 'cheeky' | 'cheering'
  | 'shocked' | 'oops' | 'sleepy' | 'smug' | 'sad' | 'love'

export interface ScriptEntry {
  expression: Expression
  /** First word of the move column: dock, travel, perch, orbit, celebrate, hop, fly, wave, squash, spin, follow. */
  move: string
  /** Target name from `data-blip-target`, may contain `{n}`; null when Blip stays where it is. */
  target: string | null
  lines: string[]
}

export type ScriptTable = Record<string, ScriptEntry>

export interface Said {
  expression: Expression
  move: string
  target: string | null
  line: string
}

export type Vars = Record<string, string | number>

const unwrap = (cell: string) => cell.trim().replace(/^`|`$/g, '')

/** Parses every `| \`event.key\` | face | move → target | "line" · "line" |` row in the Blip scripts. */
export function parseScripts(markdown: string): ScriptTable {
  const table: ScriptTable = {}
  for (const row of markdown.split('\n')) {
    const cells = row.split('|').slice(1, -1)
    const key = cells[0]?.match(/^\s*`([a-z0-9_.]+)`/)?.[1]
    if (!key || cells.length < 4) continue
    const [movePart, targetPart] = cells[2].split('→')
    const moveWord = movePart.trim().split(/\s+/)[0]
    table[key] = {
      expression: unwrap(cells[1]) as Expression,
      move: moveWord,
      target: targetPart ? unwrap(targetPart) : null,
      lines: [...cells[3].matchAll(/"([^"]+)"/g)].map((m) => m[1]),
    }
  }
  return table
}

const fill = (text: string, vars: Vars) =>
  text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole))

export function createBlip({
  table,
  random = Math.random,
}: {
  table: ScriptTable
  random?: () => number
}) {
  const last = new Map<string, number>()

  function say(eventKey: string, vars: Vars = {}): Said {
    const entry = table[eventKey]
    if (!entry) throw new Error(`Unknown Blip event key: ${eventKey}`)
    let line = ''
    if (entry.lines.length > 0) {
      const previous = last.get(eventKey)
      const choices = entry.lines.map((_, i) => i).filter((i) => i !== previous || entry.lines.length === 1)
      const index = choices[Math.min(Math.floor(random() * choices.length), choices.length - 1)]
      last.set(eventKey, index)
      line = fill(entry.lines[index], vars)
    }
    return {
      expression: entry.expression,
      move: entry.move,
      target: entry.target === null ? null : fill(entry.target, vars),
      line,
    }
  }

  return { say }
}
