import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import type { Mode } from '../session/session'
import { Chip } from '../ui/Chip'
import { useGame } from './GameIntro'
import { useGameRun } from './GameRun'
import { useSession } from './SessionProvider'

const NATURAL = ['Very awkward', 'A bit awkward', 'Fine', 'Natural', 'Very natural']
const OWNERSHIP = [
  { value: 'mine', label: 'Yes, all mine' },
  { value: 'mostly', label: 'Mostly mine' },
  { value: 'not', label: 'Not really' },
]

export function GameResult() {
  const { def, status } = useGame()
  const run = useGameRun()
  const { view, completeRound } = useSession()
  const [natural, setNatural] = useState<number | null>(null)
  const [ownership, setOwnership] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  if (!def || !def.playable || !status) return <Navigate to="/lobby" replace />
  const played = run.played(def.key)
  const typed = played.typed
  const voice = played.voice
  if (!saved && (!typed || !voice || status.status !== 'next')) return <Navigate to={`/game/${def.key}`} replace />
  if (!typed || !voice) return <Navigate to="/lobby" replace />

  const ratio = typed.metrics.wpm > 0 ? voice.metrics.wpm / typed.metrics.wpm : 0
  const verdict =
    typed.metrics.wpm === 0 || voice.metrics.wpm === 0
      ? 'One of your rounds has no usable timing, so there is no fair speed comparison this time.'
      : ratio >= 1.2
        ? `Voice was ${ratio.toFixed(1)}× faster than typing.`
        : ratio <= 1 / 1.2
          ? `Typing was ${(1 / ratio).toFixed(1)}× faster than voice.`
          : 'Basically a tie between typing and voice.'

  const rows: { mode: Mode; label: string }[] = [
    { mode: 'typed', label: 'Typed' },
    { mode: 'voice', label: 'Voice' },
  ]
  const maxWpm = Math.max(typed.metrics.wpm, voice.metrics.wpm, 1)

  async function save() {
    setBusy(true)
    setFailed(false)
    try {
      await completeRound(def!.key, 'typed', typed!.metrics)
      await completeRound(def!.key, 'voice', {
        ...voice!.metrics,
        answers: { ...voice!.metrics.answers, felt_natural: natural, ownership },
      })
      setSaved(true)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="wa-page">
      <div className="wa-screen">
        <h1 className="wa-title">{def.title}: result</h1>
        <section className="wa-result" aria-label="Typed versus voice" data-blip-target="result-card">
          <p className="wa-body">{verdict}</p>
          {rows.map(({ mode, label }) => {
            const m = played[mode]!.metrics
            return (
              <div key={mode} className="wa-result__row">
                <span>{label}</span>
                <span className="wa-result__bar">
                  <span
                    className="wa-result__fill"
                    style={{ width: `${(m.wpm / maxWpm) * 100}%`, background: mode === 'voice' ? 'var(--lavender)' : 'var(--tomato)' }}
                  />
                </span>
                <span>{m.wpm} wpm</span>
              </div>
            )
          })}
          <p className="wa-note">
            Ideas: {String(typed.metrics.extras.idea_count)} typed, {String(voice.metrics.extras.idea_count)} by voice.
            {voice.metrics.integrity === 'flagged' && ' Your voice round looked typed, so it is marked as flagged.'}
          </p>
        </section>

        {!saved ? (
          <div className="wa-card">
            <fieldset className="wa-field">
              <legend className="wa-label">How did talking to your computer feel?</legend>
              <div className="wa-chips">
                {NATURAL.map((label, i) => (
                  <Chip key={label} pressed={natural === i + 1} onToggle={() => setNatural(i + 1)}>{label}</Chip>
                ))}
              </div>
            </fieldset>
            <fieldset className="wa-field">
              <legend className="wa-label">Did the voice ideas feel like yours?</legend>
              <div className="wa-chips">
                {OWNERSHIP.map(({ value, label }) => (
                  <Chip key={value} pressed={ownership === value} onToggle={() => setOwnership(value)}>{label}</Chip>
                ))}
              </div>
            </fieldset>
            {failed && <p className="wa-error" role="alert">That did not save. Try again.</p>}
            <div className="wa-actions">
              <button
                type="button"
                className="wa-btn wa-btn--primary"
                disabled={busy || natural === null || ownership === null}
                onClick={save}
              >
                Save my result
              </button>
            </div>
          </div>
        ) : (
          <div className="wa-actions">
            <span className="wa-gain" data-blip-target="waves">+2 waves · {view.waves} total</span>
            <Link to="/lobby" className="wa-btn wa-btn--primary">Back to lobby</Link>
          </div>
        )}
      </div>
    </main>
  )
}
