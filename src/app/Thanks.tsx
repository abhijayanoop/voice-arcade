import { useBlip } from '../blip/BlipProvider'
import { useEffect } from 'react'
import { useSession } from './SessionProvider'

export function Thanks() {
  const { view } = useSession()
  const { say } = useBlip()
  const name = view.player?.codeName ?? 'friend'

  useEffect(() => {
    say('farewell', { name })
  }, [say, name])

  const { waves, questsDone, streak } = view.totals
  return (
    <main id="main" tabIndex={-1} className="wa-page">
      <div className="wa-screen">
        <h1 className="wa-title">Thank you, {name}</h1>
        <section className="wa-card" aria-label="Your totals">
          <h2 className="wa-heading">Your totals</h2>
          <ul className="wa-body">
            <li><strong>{waves}</strong> waves earned</li>
            <li><strong>{questsDone}</strong> of 3 quests ticked</li>
            <li><strong>{streak}</strong>-day quest streak</li>
          </ul>
        </section>
        <p className="wa-body">
          Your answers are in. Results are published in aggregate under code names, and your streak card stays private. You can close this tab.
        </p>
      </div>
    </main>
  )
}
