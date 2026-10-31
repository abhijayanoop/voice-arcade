import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BlipHost } from '../blip/BlipHost'
import { BlipProvider } from '../blip/BlipProvider'
import { GameIntro } from './GameIntro'
import { GameResult } from './GameResult'
import { GameRound } from './GameRound'
import { GameRunProvider } from './GameRun'
import { Lobby } from './Lobby'
import { NameScreen } from './NameScreen'
import { PersonalLink } from './PersonalLink'
import { ReadyPopup } from './ReadyPopup'
import { ROUTE_FOR_STEP } from './routes'
import { SessionProvider, useSession } from './SessionProvider'
import { Spike } from './Spike'
import { Welcome } from './Welcome'

function Guard({ step, children }: { step: keyof typeof ROUTE_FOR_STEP; children: React.ReactNode }) {
  const { view, restoring } = useSession()
  if (restoring) return null
  if (view.step !== step) return <Navigate to={ROUTE_FOR_STEP[view.step]} replace />
  return <>{children}</>
}

export function App() {
  return (
    <SessionProvider>
      <BlipProvider>
      <GameRunProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/name" element={<Guard step="register"><NameScreen /></Guard>} />
          <Route path="/ready" element={<Guard step="consent"><ReadyPopup /></Guard>} />
          <Route path="/lobby" element={<Guard step="lobby"><Lobby /></Guard>} />
          <Route path="/game/:key" element={<Guard step="lobby"><GameIntro /></Guard>} />
          <Route path="/game/:key/result" element={<Guard step="lobby"><GameResult /></Guard>} />
          <Route path="/game/:key/:mode" element={<Guard step="lobby"><GameRound /></Guard>} />
          <Route path="/spike" element={<Spike />} />
          <Route path="/p/:token" element={<PersonalLink />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <BlipHost />
      </BrowserRouter>
      </GameRunProvider>
    </BlipProvider>
    </SessionProvider>
  )
}
