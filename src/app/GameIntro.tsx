import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { GAMES } from '../games/registry'
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

  return (
    <main className="wa-page">
      <div className="wa-screen">
        <h1 className="wa-title">{def.title}</h1>
        <p className="wa-body">{def.explainer}</p>
        <p className="wa-body">
          Your first round is <strong>{first === 'typed' ? 'typed' : 'voice'}</strong>; the other follows straight away.
        </p>
        <div className="wa-actions">
          <button type="button" className="wa-btn wa-btn--primary" onClick={() => navigate(`/game/${def.key}/${first}`)}>
            Start
          </button>
          <Link to="/lobby" className="wa-btn wa-btn--ghost">Back to lobby</Link>
        </div>
      </div>
    </main>
  )
}
