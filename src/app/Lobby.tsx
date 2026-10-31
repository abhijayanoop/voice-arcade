import { GAMES } from '../games/registry'
import { Avatar } from '../ui/Avatar'
import { useSession } from './SessionProvider'

const DEFS = new Map(GAMES.map((def) => [def.key, def]))
const STATE_LABEL = { done: 'Done', next: 'Up next', locked: 'Locked' } as const

export function Lobby() {
  const { view } = useSession()
  const doneCount = view.games.filter((g) => g.status === 'done').length

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
          <span className="wa-waves">0 waves</span>
        </header>

        <h1 className="wa-heading">Pick up where you left off</h1>
        <div className="wa-lobby-grid">
          {view.games.map((g) => {
            const def = DEFS.get(g.key)!
            const tone = g.status === 'locked' ? 'is-locked' : g.status === 'done' ? 'wa-lobby--sage' : `wa-lobby--${def.card}`
            return (
              <article key={g.key} className={`wa-lobby ${tone}`} aria-disabled={g.status === 'locked'}>
                <span className="wa-lobby__state">{STATE_LABEL[g.status]}</span>
                <span className="wa-lobby__title">{def.title}</span>
                <span className="wa-lobby__meta">{def.blurb}</span>
              </article>
            )
          })}
        </div>
      </div>
    </main>
  )
}
