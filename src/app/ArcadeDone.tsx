import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useBlip } from '../blip/BlipProvider'
import { speedVerdict } from '../games/compare'
import { GAMES } from '../games/registry'
import { Podium } from '../ui/Podium'
import { useGameRun } from './GameRun'
import { useSession } from './SessionProvider'

export function ArcadeDone() {
  const { view, personalLink } = useSession()
  const run = useGameRun()
  const { say } = useBlip()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (view.arcadeDone) say('session.all_done')
  }, [view.arcadeDone, say])

  if (!view.arcadeDone) return <Navigate to="/lobby" replace />
  // Rounds played in this visit; after a refresh the summary shows only what is still saved in the browser.
  const summary = GAMES.flatMap((def) => {
    const { typed, voice } = run.played(def.key)
    return typed && voice ? [{ def, verdict: speedVerdict(typed.metrics.wpm, voice.metrics.wpm, voice.typedInstead) }] : []
  })

  return (
    <main id="main" tabIndex={-1} className="wa-page">
      <div className="wa-screen">
        <h1 className="wa-title">Arcade complete</h1>
        <p className="wa-gain" data-blip-target="waves">{view.waves} waves earned</p>
        <section className="wa-card" aria-label="Typed versus voice, game by game">
          <h2 className="wa-heading">Typed versus voice</h2>
          {summary.length === 0 ? (
            <p className="wa-body">Your per-game results are in the Result screens you already saw. They are saved; this summary only lives for the visit.</p>
          ) : (
            <ul className="wa-body">
              {summary.map(({ def, verdict }) => (
                <li key={def.key}><strong>{def.title}:</strong> {verdict}</li>
              ))}
            </ul>
          )}
        </section>
        <Podium />
        <section className="wa-card" aria-label="What comes next">
          <h2 className="wa-heading">What comes next</h2>
          <p className="wa-body">
            Now the real game: use Flow for the next three days. Your quest board holds one tiny quest a day. Come back through your personal link.
          </p>
          {personalLink && (
            <p className="wa-body">
              <code>{personalLink}</code>{' '}
              <button
                type="button"
                className="wa-btn"
                onClick={() => navigator.clipboard.writeText(personalLink).then(() => setCopied(true))}
              >
                {copied ? 'Copied' : 'Copy my link'}
              </button>
            </p>
          )}
          <div className="wa-actions">
            <Link to="/quests" className="wa-btn wa-btn--primary">Go to my quest board</Link>
            <Link to="/lobby" className="wa-btn wa-btn--ghost">Back to lobby</Link>
          </div>
        </section>
      </div>
    </main>
  )
}
