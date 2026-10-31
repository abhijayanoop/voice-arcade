import { useNavigate } from 'react-router-dom'
import { useBlipOnMount } from '../blip/BlipProvider'
import { BlipHero } from '../ui/Blip'

export function Welcome() {
  const navigate = useNavigate()
  useBlipOnMount('setup.first_visit')
  return (
    <main className="wa-page">
      <div className="wa-screen wa-screen--center">
        <BlipHero />
        <h1 className="wa-title">Voice Arcade</h1>
        <p className="wa-body">
          Five short games, each played twice: once typing, once speaking with Wispr Flow. Then three
          days of tiny quests in your real work. It takes about a minute to get going.
        </p>
        <ol className="wa-steps">
          <li>
            <strong>Play five games</strong>
            Type one round, speak the other. We compare them honestly.
          </li>
          <li>
            <strong>Use Flow for three days</strong>
            One tiny quest a day, in the work you already do.
          </li>
          <li>
            <strong>Check in on day 3</strong>
            Share your streak card and face one last boss round.
          </li>
        </ol>
        <button type="button" className="wa-btn wa-btn--primary" onClick={() => navigate('/name')}>
          Play
        </button>
      </div>
    </main>
  )
}
