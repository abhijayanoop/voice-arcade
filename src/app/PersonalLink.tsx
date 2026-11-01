import { useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ROUTE_FOR_PHASE, ROUTE_FOR_STEP } from './routes'
import { useSession } from './SessionProvider'

/** `/p/:token`: restores a Player from their personal link, then sends them to the right step. */
export function PersonalLink() {
  const { token } = useParams()
  const { resume, view } = useSession()
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) return
    let cancelled = false
    resume(token).then((found) => {
      if (!cancelled && !found) navigate('/', { replace: true })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (view.player) {
    // Past the arcade, a returning Player lands on the quest board, check-in, boss round or thanks.
    const target = view.step === 'lobby' && view.phase !== 'arcade' ? ROUTE_FOR_PHASE[view.phase] : ROUTE_FOR_STEP[view.step]
    return <Navigate to={target} replace />
  }
  return null
}
