import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBlip } from '../blip/BlipProvider'
import { useSession } from './SessionProvider'

const QUESTS = [
  'Dictate every prompt you write today.',
  'Reply to one message by voice instead of typing it.',
  'Write one longer thing, a doc or an email, by dictating it.',
]
const STATUS_LABEL = { done: 'Done', today: 'Today', missed: 'Missed', locked: 'Not yet' } as const

export function QuestBoard() {
  const { view, markQuest } = useSession()
  const { say } = useBlip()
  const [busy, setBusy] = useState(false)
  const todayQuest = view.quests.find((q) => q.status === 'today')
  const todayNumber = todayQuest?.day ?? view.quests.find((q) => q.status === 'done')?.day ?? 1

  // Once per visit: Blip introduces the board on day 1, or welcomes the Player back and notes a missed day.
  useEffect(() => {
    if (todayNumber === 1) say('quest.intro')
    else if (view.quests.some((q) => q.status === 'missed')) say('quest.missed_day')
    else say('quest.return', { name: view.player?.codeName ?? 'friend' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function tick() {
    setBusy(true)
    try {
      await markQuest()
    } finally {
      setBusy(false)
    }
  }

  return (
    <main id="main" className="wa-page">
      <div className="wa-screen">
        <h1 className="wa-title">Quest board</h1>
        <p className="wa-gain" aria-live="polite">
          {view.streak === 0 ? 'No streak yet' : `${view.streak}-day streak`}
        </p>
        <ol className="wa-card wa-quests" data-blip-target="quest-board" aria-label="Your three quests">
          {view.quests.map((q) => (
            <li key={q.day} className={`wa-quest is-${q.status}`}>
              <span className="wa-quest__day">Day {q.day}</span>
              <span className="wa-quest__text">{QUESTS[q.day - 1]}</span>
              <span className="wa-quest__state">{STATUS_LABEL[q.status]}</span>
            </li>
          ))}
        </ol>
        <p className="wa-note">Do the quest in real life, in whatever app you work in. Tick it here when it is done.</p>
        <div className="wa-actions">
          {todayQuest && (
            <button type="button" className="wa-btn wa-btn--primary" disabled={busy} onClick={tick}>
              I did today&apos;s quest
            </button>
          )}
          {view.checkinDue && (
            <Link to="/check-in" className="wa-btn wa-btn--primary">Do my day 3 check-in</Link>
          )}
        </div>
        {!view.checkinDue && (
          <p className="wa-body">Your day 3 check-in opens on day 3. Come back through your personal link.</p>
        )}
      </div>
    </main>
  )
}
