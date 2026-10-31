import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chip } from '../ui/Chip'
import { isIn } from '../ui/isIn'
import { useSession } from './SessionProvider'

type Tab = 'need' | 'setup' | 'how'

const TABS: { id: Tab; label: string }[] = [
  { id: 'need', label: 'What you need' },
  { id: 'setup', label: 'Set up Flow' },
  { id: 'how', label: 'How it works' },
]

const NEEDS = [
  'A laptop with Wispr Flow installed',
  'A microphone this browser can use',
  'A spot quiet enough to talk out loud',
  'About 20 minutes for the five games',
]

export function ReadyPopup() {
  const { giveConsent } = useSession()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('need')
  const [ticked, setTicked] = useState<boolean[]>(NEEDS.map(() => false))
  const [tryIt, setTryIt] = useState('')
  const [said, setSaid] = useState('')
  const [leaderboard, setLeaderboard] = useState(false)
  const [busy, setBusy] = useState(false)
  const titleId = useId()
  const agreed = isIn(said)

  async function join() {
    if (!agreed) return
    setBusy(true)
    try {
      await giveConsent({ leaderboardOptIn: leaderboard })
      navigate('/lobby', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="wa-page">
      <div className="wa-modal-scrim">
        <div className="wa-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <h1 id={titleId} className="wa-heading">
            Get ready to play
          </h1>
          <div className="wa-tabs" role="tablist" aria-label="Requirements">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-controls={`panel-${t.id}`}
                aria-selected={tab === t.id}
                className="wa-chip"
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="wa-field">
            {tab === 'need' && (
              <ul className="wa-checklist">
                {NEEDS.map((need, i) => (
                  <li key={need}>
                    <label className="wa-check">
                      <input
                        type="checkbox"
                        checked={ticked[i]}
                        onChange={() =>
                          setTicked((current) => current.map((v, j) => (j === i ? !v : v)))
                        }
                      />
                      {need}
                    </label>
                  </li>
                ))}
              </ul>
            )}

            {tab === 'setup' && (
              <>
                <ol className="wa-body">
                  <li>Open Wispr Flow and sign in.</li>
                  <li>Click in the box below.</li>
                  <li>Hold your Flow key and say a sentence.</li>
                </ol>
                <label className="wa-label" htmlFor="try-it">
                  Try it here
                </label>
                <textarea
                  id="try-it"
                  className="wa-input"
                  value={tryIt}
                  onChange={(e) => setTryIt(e.target.value)}
                  placeholder="Your words should appear here."
                />
                {tryIt.trim() && <p className="wa-note">Flow works. You are set.</p>}
              </>
            )}

            {tab === 'how' && (
              <>
                <p className="wa-body">
                  You play each game twice: a typed round and a voice round, in a random order. Typed
                  rounds block paste. Voice rounds are for Flow.
                </p>
                <p className="wa-label">What is shared and who sees it</p>
                <ul className="wa-consent">
                  <li>
                    We keep numbers from your rounds, such as words, speed and ratings. Your typed and
                    spoken text stays in your browser.
                  </li>
                  <li>
                    The one exception: your Describe to decode descriptions are shown anonymously to
                    outside Judges, with no mode or author.
                  </li>
                  <li>Results are published in aggregate under code names only.</li>
                  <li>Streak card images stay private.</li>
                </ul>
                <div className="wa-confirm">
                  <label className="wa-label" htmlFor="say-in">
                    Say or type
                  </label>
                  <p className="wa-confirm__say">I&apos;m in</p>
                  <input
                    id="say-in"
                    className="wa-input"
                    value={said}
                    onChange={(e) => setSaid(e.target.value)}
                    placeholder="Hold your Flow key and say it, or type it"
                    autoComplete="off"
                  />
                </div>
                <div className="wa-chips">
                  <Chip pressed={leaderboard} onToggle={() => setLeaderboard((v) => !v)}>
                    Show my speed on the leaderboard
                  </Chip>
                </div>
                <p className="wa-note">Optional and separate. Your speed stays hidden unless you pick this.</p>
              </>
            )}
          </div>

          <div className="wa-actions">
            {tab !== 'how' ? (
              <button
                type="button"
                className="wa-btn wa-btn--primary"
                onClick={() => setTab(tab === 'need' ? 'setup' : 'how')}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                className="wa-btn wa-btn--primary"
                disabled={!agreed || busy}
                onClick={join}
              >
                Start playing
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
