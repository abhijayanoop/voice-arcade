import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Disappointment, PayIntent } from '../api/types'
import { useBlip, useBlipOnMount } from '../blip/BlipProvider'
import { Chip } from '../ui/Chip'
import { useSession } from './SessionProvider'

const BOSS_MS = 30 * 60 * 1000
const START_KEY = 'voice-arcade.boss-start'

const LOSS: { value: Disappointment; label: string }[] = [
  { value: 'very', label: 'Very disappointed' },
  { value: 'somewhat', label: 'Somewhat disappointed' },
  { value: 'not', label: 'Not disappointed' },
]
const PAY: { value: PayIntent; label: string }[] = [
  { value: 'already', label: 'I already pay' },
  { value: 'yes', label: 'Yes' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no', label: 'No' },
]

function readStart(): number | null {
  const raw = localStorage.getItem(START_KEY)
  return raw ? Number(raw) : null
}

const clock = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function Boss() {
  const { submitBoss } = useSession()
  const { say } = useBlip()
  useBlipOnMount('boss.intro')
  const navigate = useNavigate()
  const [startedAt, setStartedAt] = useState<number | null>(readStart)
  const [now, setNow] = useState(Date.now())
  const [skipped, setSkipped] = useState(false)
  const [annoyance, setAnnoyance] = useState<number | null>(null)
  const [loss, setLoss] = useState<Disappointment | null>(null)
  const [pay, setPay] = useState<PayIntent | null>(null)
  const [payIf, setPayIf] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (startedAt === null) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [startedAt])

  const remaining = startedAt === null ? BOSS_MS : BOSS_MS - (now - startedAt)
  const questions = skipped || (startedAt !== null && remaining <= 0)
  const ready = annoyance !== null && loss !== null && pay !== null

  function start() {
    const t = Date.now()
    localStorage.setItem(START_KEY, String(t))
    setNow(t)
    setStartedAt(t)
  }

  function rate(value: number) {
    setAnnoyance(value)
    if (value >= 4) say('boss.missed_it')
    else if (value <= 2) say('boss.fine_without')
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!ready || annoyance === null || loss === null || pay === null) return
    setBusy(true)
    setFailed(false)
    try {
      await submitBoss({ annoyance, disappointment: loss, payIntent: pay, payIf })
      localStorage.removeItem(START_KEY)
      navigate('/thanks', { replace: true })
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="wa-page">
      <div className="wa-screen">
        <h1 className="wa-title">Final boss</h1>
        {!questions ? (
          <section className="wa-card" data-blip-target="boss-card" aria-label="Thirty minutes without Flow">
            <h2 className="wa-heading">30 minutes without Flow</h2>
            <p className="wa-body">
              Quit Flow, or switch its shortcut off, and work as you normally would for thirty minutes. Then come back and answer a few questions.
            </p>
            {startedAt === null ? (
              <div className="wa-actions">
                <button type="button" className="wa-btn wa-btn--primary" onClick={start}>I turned Flow off. Start the clock</button>
              </div>
            ) : (
              <p className="wa-gain" role="timer" aria-label="Time left without Flow">{clock(remaining)} left</p>
            )}
            <p className="wa-note">
              Already did your thirty minutes?{' '}
              <button type="button" className="wa-btn wa-btn--ghost" onClick={() => setSkipped(true)}>Skip to the questions</button>
            </p>
          </section>
        ) : (
          <form className="wa-card" onSubmit={submit}>
            <fieldset className="wa-field" data-blip-target="rating">
              <legend className="wa-label">How annoying was it without Flow? (1 = not at all, 5 = very)</legend>
              <div className="wa-chips">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Chip key={n} pressed={annoyance === n} onToggle={() => rate(n)}>{n}</Chip>
                ))}
              </div>
            </fieldset>

            <fieldset className="wa-field">
              <legend className="wa-label">How would you feel if you could no longer use Flow?</legend>
              <div className="wa-chips">
                {LOSS.map((o) => (
                  <Chip key={o.value} pressed={loss === o.value} onToggle={() => setLoss(o.value)}>{o.label}</Chip>
                ))}
              </div>
            </fieldset>

            {loss !== null && (
              <>
                <fieldset className="wa-field">
                  <legend className="wa-label">Would you pay for Flow?</legend>
                  <div className="wa-chips">
                    {PAY.map((o) => (
                      <Chip key={o.value} pressed={pay === o.value} onToggle={() => setPay(o.value)}>{o.label}</Chip>
                    ))}
                  </div>
                </fieldset>

                <div className="wa-field">
                  <label className="wa-label" htmlFor="pay-if">What would change your mind?</label>
                  <textarea
                    id="pay-if"
                    className="wa-input"
                    value={payIf}
                    maxLength={500}
                    onChange={(e) => setPayIf(e.target.value)}
                  />
                </div>
              </>
            )}

            {failed && <p className="wa-error" role="alert">That did not save. Check your connection and try again.</p>}
            <div className="wa-actions">
              <button type="submit" className="wa-btn wa-btn--primary" disabled={!ready || busy}>Finish</button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
