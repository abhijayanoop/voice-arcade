import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { GAMES } from '../games/registry'
import { other } from '../games/modes'
import { useSession } from './SessionProvider'

export function useGame() {
  const { key } = useParams()
  const { view } = useSession()
  const def = GAMES.find((g) => g.key === key)
  const status = view.games.find((g) => g.key === key)
  return { def, status }
}

export function GameIntro() {
  const { def, status } = useGame()
  const navigate = useNavigate()
  if (!def || !def.playable || status?.status !== 'next') return <Navigate to="/lobby" replace />
  const first = status.firstMode
  // After a refresh between rounds, resume at the round still to play.
  const target = status.doneModes.includes(first) ? other(first) : first

  return (
    <main id="main" tabIndex={-1} className="wa-page">
      <div className="wa-screen">
        <h1 className="wa-title">{def.title}</h1>
        <p className="wa-body">{def.explainer}</p>
        <p className="wa-body">
          Your first round is <strong>{first === 'typed' ? 'typed' : 'voice'}</strong>; the other follows straight away.
        </p>
        <div className="wa-actions">
          <button type="button" className="wa-btn wa-btn--primary" onClick={() => navigate(`/game/${def.key}/${target}`)}>
            Start
          </button>
          <Link to="/lobby" className="wa-btn wa-btn--ghost">Back to lobby</Link>
        </div>
      </div>
    </main>
  )
}
