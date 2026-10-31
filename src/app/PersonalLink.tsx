import { useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ROUTE_FOR_STEP } from './routes'
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

  if (view.player) return <Navigate to={ROUTE_FOR_STEP[view.step]} replace />
  return null
}
