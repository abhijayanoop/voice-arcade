import { useEffect, useState } from 'react'
import type { LeaderboardEntry } from '../api/types'
import { useSession } from '../app/SessionProvider'
import { Avatar } from './Avatar'

const STEPS = [
  { place: 1, height: 96, color: 'var(--mustard)' },
  { place: 2, height: 68, color: 'var(--lavender)' },
  { place: 3, height: 48, color: 'var(--tomato)' },
]
/** Second, first, third: the winner stands in the middle. */
const ORDER = [1, 0, 2]

/** The Speed race: best voice words per minute in Brain dump blitz, opted-in Players only. */
export function Podium() {
  const { leaderboard } = useSession()
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    leaderboard().then(
      (rows) => live && setEntries(rows),
      () => live && setFailed(true),
    )
    return () => {
      live = false
    }
    // The leaderboard call is stable per session; load once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="wa-card" aria-label="Speed race" data-blip-target="podium">
      <h2 className="wa-heading">Speed race</h2>
      <p className="wa-note">Best voice words per minute in Brain dump blitz. Only players who opted in appear.</p>
      {failed && <p className="wa-note">The podium could not load just now.</p>}
      {entries?.length === 0 && <p className="wa-body">Nobody is on the podium yet. Be the first.</p>}
      {entries && entries.length > 0 && (
        <>
          <div className="wa-podium">
            {ORDER.filter((i) => entries[i]).map((i) => (
              <div key={STEPS[i].place} className="wa-podium__spot">
                <Avatar index={entries[i].avatar} />
                <span className="wa-podium__name">{entries[i].codeName}</span>
                <span className="wa-note">{entries[i].wpm} wpm</span>
                <span className="wa-podium__step" style={{ height: STEPS[i].height, background: STEPS[i].color }}>
                  {STEPS[i].place}
                </span>
              </div>
            ))}
          </div>
          <ol className="wa-note" start={4}>
            {entries.slice(3).map((e) => (
              <li key={e.codeName} data-blip-target="leaderboard-row">{e.codeName}: {e.wpm} wpm</li>
            ))}
          </ol>
        </>
      )}
    </section>
  )
}
