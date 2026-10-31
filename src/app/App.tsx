import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BlipDock } from '../ui/Blip'
import { Lobby } from './Lobby'
import { NameScreen } from './NameScreen'
import { ReadyPopup } from './ReadyPopup'
import { SessionProvider, useSession } from './SessionProvider'
import { Welcome } from './Welcome'

const ROUTE_FOR_STEP = { register: '/name', consent: '/ready', lobby: '/lobby' } as const

function Guard({ step, children }: { step: keyof typeof ROUTE_FOR_STEP; children: React.ReactNode }) {
  const { view } = useSession()
  if (view.step !== step) return <Navigate to={ROUTE_FOR_STEP[view.step]} replace />
  return <>{children}</>
}

export function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/name" element={<Guard step="register"><NameScreen /></Guard>} />
          <Route path="/ready" element={<Guard step="consent"><ReadyPopup /></Guard>} />
          <Route path="/lobby" element={<Guard step="lobby"><Lobby /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <BlipDock />
      </BrowserRouter>
    </SessionProvider>
  )
}
