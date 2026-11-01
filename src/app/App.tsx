import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BlipHost } from '../blip/BlipHost'
import { BlipProvider } from '../blip/BlipProvider'
import { ArcadeDone } from './ArcadeDone'
import { Boss } from './Boss'
import { CheckIn } from './CheckIn'
import { GameIntro } from './GameIntro'
import { GameResult } from './GameResult'
import { GameRound } from './GameRound'
import { GameRunProvider } from './GameRun'
import { JudgePage } from './JudgePage'
import { Lobby } from './Lobby'
import { NameScreen } from './NameScreen'
import { PersonalLink } from './PersonalLink'
import { QuestBoard } from './QuestBoard'
import { ReadyPopup } from './ReadyPopup'
import { ROUTE_FOR_PHASE, ROUTE_FOR_STEP } from './routes'
import { SessionProvider, useSession } from './SessionProvider'
import { Backdrop } from '../ui/Backdrop'
import { Spike } from './Spike'
import { Thanks } from './Thanks'
import { Welcome } from './Welcome'

function Guard({ step, children }: { step: keyof typeof ROUTE_FOR_STEP; children: React.ReactNode }) {
  const { view, restoring } = useSession()
  if (restoring) return null
  if (view.step !== step) return <Navigate to={ROUTE_FOR_STEP[view.step]} replace />
  return <>{children}</>
}

/** The three-day screens: reachable once the arcade is done, and only while their phase is current. */
function PhaseGuard({ phases, children }: { phases: (keyof typeof ROUTE_FOR_PHASE)[]; children: React.ReactNode }) {
  const { view, restoring } = useSession()
  if (restoring) return null
  if (view.step !== 'lobby') return <Navigate to={ROUTE_FOR_STEP[view.step]} replace />
  if (view.phase === 'arcade') return <Navigate to="/lobby" replace />
  if (!phases.includes(view.phase)) return <Navigate to={ROUTE_FOR_PHASE[view.phase]} replace />
  return <>{children}</>
}

export function App() {
  return (
    <SessionProvider>
      <BlipProvider>
        <GameRunProvider>
          <BrowserRouter>
            <a className="wa-skip" href="#main">Skip to content</a>
            <Backdrop />
            <Routes>
              <Route path="/" element={<Welcome />} />
              <Route path="/name" element={<Guard step="register"><NameScreen /></Guard>} />
              <Route path="/ready" element={<Guard step="consent"><ReadyPopup /></Guard>} />
              <Route path="/lobby" element={<Guard step="lobby"><Lobby /></Guard>} />
              <Route path="/done" element={<Guard step="lobby"><ArcadeDone /></Guard>} />
              <Route path="/game/:key" element={<Guard step="lobby"><GameIntro /></Guard>} />
              <Route path="/game/:key/result" element={<Guard step="lobby"><GameResult /></Guard>} />
              <Route path="/game/:key/:mode" element={<Guard step="lobby"><GameRound /></Guard>} />
              <Route path="/quests" element={<PhaseGuard phases={['quests', 'checkin']}><QuestBoard /></PhaseGuard>} />
              <Route path="/check-in" element={<PhaseGuard phases={['checkin']}><CheckIn /></PhaseGuard>} />
              <Route path="/boss" element={<PhaseGuard phases={['boss']}><Boss /></PhaseGuard>} />
              <Route path="/thanks" element={<PhaseGuard phases={['thanks']}><Thanks /></PhaseGuard>} />
              <Route path="/judge" element={<JudgePage />} />
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
