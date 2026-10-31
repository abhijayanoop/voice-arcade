import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBlip } from '../blip/BlipProvider'
import { GAMES } from '../games/registry'
import { Avatar } from '../ui/Avatar'
import { Podium } from '../ui/Podium'
import { useSession } from './SessionProvider'

const DEFS = new Map(GAMES.map((def) => [def.key, def]))
const HALFWAY = 3
/** Blip falls asleep after this long without a pick. */
const IDLE_MS = 20000
const STATE_LABEL = { done: 'Done', next: 'Up next', locked: 'Locked' } as const

export function Lobby() {
  const { view, personalLink } = useSession()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const doneCount = view.games.filter((g) => g.status === 'done').length
  const { say } = useBlip()
  const nextNumber = view.games.findIndex((g) => g.status === 'next') + 1

  // Blip greets the lobby, points at the next card, and dozes off if nothing is picked.
  useEffect(() => {
    if (nextNumber === 0) return
    if (doneCount === 0) say('lobby.first')
    else if (doneCount === HALFWAY) say('lobby.halfway')
    else say('lobby.unlocked', { n: nextNumber })
    const id = window.setTimeout(() => say('lobby.idle'), IDLE_MS)
    return () => window.clearTimeout(id)
  }, [doneCount, nextNumber, say])

  return (
    <main className="wa-page">
      <div className="wa-screen">
        <header className="wa-hud">
          <span className="wa-hud__round">Lobby</span>
          <div className="wa-path" aria-label={`${doneCount} of ${GAMES.length} games done`}>
            {view.games.map((g, i) => (
              <span key={g.key} className="wa-contents">
                {i > 0 && <span className={`wa-path__link${g.status !== 'locked' ? ' is-done' : ''}`} />}
                <span
                  className={`wa-path__node${g.status === 'done' ? ' is-done' : ''}${g.status === 'next' ? ' is-current' : ''}`}
                >
                  {i + 1}
                </span>
              </span>
            ))}
          </div>
          <span className="wa-hud__spacer" />
          {view.player && (
            <span className="wa-row">
              <Avatar index={view.player.avatar} /> {view.player.codeName}
            </span>
          )}
          <span className="wa-waves">{view.waves} waves</span>
        </header>

        <h1 className="wa-heading">Pick up where you left off</h1>
        <div className="wa-lobby-grid" data-blip-target="lobby-cards">
          {view.games.map((g) => {
            const def = DEFS.get(g.key)!
            const tone = g.status === 'locked' ? 'is-locked' : g.status === 'done' ? 'wa-lobby--sage' : `wa-lobby--${def.card}`
            const playable = g.status === 'next' && def.playable
            const open = () => navigate(`/game/${g.key}`)
            return (
              <article
                key={g.key}
                className={`wa-lobby ${tone}`}
                data-blip-target={`lobby-card-${view.games.indexOf(g) + 1}`}
                aria-disabled={g.status === 'locked'}
                role={playable ? 'button' : undefined}
                tabIndex={playable ? 0 : undefined}
                onClick={playable ? open : undefined}
                onKeyDown={playable ? (e) => (e.key === 'Enter' || e.key === ' ') && open() : undefined}
              >
                <span className="wa-lobby__state">{STATE_LABEL[g.status]}</span>
                <span className="wa-lobby__title">{def.title}</span>
                <span className="wa-lobby__meta">{def.blurb}</span>
              </article>
            )
          })}
        </div>

        {view.arcadeDone && (
          <p className="wa-body">
            You finished the arcade. <Link to="/done">See your summary</Link>
          </p>
        )}
        <Podium />

        {personalLink && (
          <p className="wa-body">
            Your personal link brings you back here on day 2 and 3. Keep it safe.{' '}
            <button
              type="button"
              className="wa-btn"
              onClick={() => navigator.clipboard.writeText(personalLink).then(() => setCopied(true))}
            >
              {copied ? 'Copied' : 'Copy my link'}
            </button>
          </p>
        )}
      </div>
    </main>
  )
}
