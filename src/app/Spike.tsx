import { useEffect, useRef, useState } from 'react'

interface Line {
  t: number
  text: string
}

/**
 * Throwaway spike (docs/flow-spike.md): shows how text reaches a textarea so we can tell
 * whether Wispr Flow inserts by paste or by simulated keystrokes, on Mac and Windows.
 */
export function Spike() {
  const field = useRef<HTMLTextAreaElement>(null)
  const origin = useRef(performance.now())
  const [lines, setLines] = useState<Line[]>([])

  useEffect(() => {
    const el = field.current
    if (!el) return
    const log = (text: string) =>
      setLines((current) => [...current, { t: Math.round(performance.now() - origin.current), text }])
    const handlers: [string, (e: Event) => void][] = [
      ['keydown', (e) => { const k = e as KeyboardEvent; log(`keydown key=${JSON.stringify(k.key)} code=${k.code} repeat=${k.repeat}`) }],
      ['paste', () => log('paste')],
      ['beforeinput', (e) => { const i = e as InputEvent; log(`beforeinput ${i.inputType} data.length=${i.data?.length ?? 0} composing=${i.isComposing}`) }],
      ['compositionstart', () => log('compositionstart')],
      ['compositionend', () => log('compositionend')],
    ]
    handlers.forEach(([name, fn]) => el.addEventListener(name, fn))
    return () => handlers.forEach(([name, fn]) => el.removeEventListener(name, fn))
  }, [])

  const report = lines.map((l) => `${l.t}ms ${l.text}`).join('\n')

  return (
    <main id="main" tabIndex={-1} className="wa-page">
      <div className="wa-screen">
        <h1 className="wa-heading">Input spike: how does text arrive?</h1>
        <p className="wa-body">
          Click the box, then dictate a sentence with Flow. Note your OS, then copy the log into docs/flow-spike.md.
        </p>
        <textarea ref={field} className="wa-input" aria-label="Spike input" />
        <div className="wa-actions">
          <button type="button" className="wa-btn wa-btn--secondary" onClick={() => navigator.clipboard.writeText(`${navigator.userAgent}\n${report}`)}>
            Copy log
          </button>
          <button type="button" className="wa-btn wa-btn--ghost" onClick={() => { setLines([]); origin.current = performance.now() }}>
            Clear
          </button>
        </div>
        <pre className="wa-body" style={{ whiteSpace: 'pre-wrap', maxWidth: 'none' }}>{report}</pre>
      </div>
    </main>
  )
}
