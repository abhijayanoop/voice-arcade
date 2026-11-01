import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBlip } from '../blip/BlipProvider'
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

/** How long the Try it box can stay empty before Blip asks whether Flow is running. */
const FLOW_SILENT_MS = 20000

const FOCUSABLE = 'button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])'

export function ReadyPopup() {
  const { giveConsent } = useSession()
  const { say } = useBlip()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('need')
  const [ticked, setTicked] = useState<boolean[]>(NEEDS.map(() => false))
  const [tryIt, setTryIt] = useState('')
  const [said, setSaid] = useState('')
  const [leaderboard, setLeaderboard] = useState(false)
  const [busy, setBusy] = useState(false)
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ need: null, setup: null, how: null })
  const sayInRef = useRef<HTMLInputElement>(null)
  const agreed = isIn(said)

  // Move focus into the dialog when it opens.
  useEffect(() => {
    tabRefs.current.need?.focus()
  }, [])

  // Blip nudges the confirm step, and notices when Flow has stayed silent on the setup tab.
  useEffect(() => {
    if (tab === 'how') say('setup.say_im_in')
  }, [tab, say])

  useEffect(() => {
    if (tab !== 'setup' || tryIt.trim()) return
    const id = window.setTimeout(() => say('setup.flow_missing'), FLOW_SILENT_MS)
    return () => window.clearTimeout(id)
  }, [tab, tryIt, say])

  function selectTab(id: Tab) {
    setTab(id)
    tabRefs.current[id]?.focus()
  }

  function onTabKeyDown(event: React.KeyboardEvent) {
    const index = TABS.findIndex((t) => t.id === tab)
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key]
    if (step !== undefined) {
      event.preventDefault()
      selectTab(TABS[(index + step + TABS.length) % TABS.length].id)
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      selectTab(TABS[event.key === 'Home' ? 0 : TABS.length - 1].id)
    }
  }

  // Keep Tab and Shift+Tab inside the dialog. It has no Escape: consent is required to play.
  function trapFocus(event: React.KeyboardEvent) {
    if (event.key !== 'Tab' || !dialogRef.current) return
    const items = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null,
    )
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  async function join() {
    if (!agreed) return
    setBusy(true)
    try {
      await giveConsent({ leaderboardOptIn: leaderboard })
      say('setup.consent_done')
      navigate('/lobby', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <main id="main" tabIndex={-1} className="wa-page">
      <div className="wa-modal-scrim">
        <div
          ref={dialogRef}
          className="wa-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onKeyDown={trapFocus}
        >
          <h1 id={titleId} className="wa-heading">
            Get ready to play
          </h1>
          <div className="wa-tabs" role="tablist" aria-label="Requirements" onKeyDown={onTabKeyDown}>
            {TABS.map((t) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el
                }}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-controls={`panel-${t.id}`}
                aria-selected={tab === t.id}
                tabIndex={tab === t.id ? 0 : -1}
                className="wa-chip"
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" id="panel-need" aria-labelledby="tab-need" hidden={tab !== 'need'} className="wa-field">
            <ul className="wa-checklist">
              {NEEDS.map((need, i) => (
                <li key={need}>
                  <label className="wa-check">
                    <input
                      type="checkbox"
                      checked={ticked[i]}
                      onChange={() => setTicked((current) => current.map((v, j) => (j === i ? !v : v)))}
                    />
                    {need}
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div role="tabpanel" id="panel-setup" aria-labelledby="tab-setup" hidden={tab !== 'setup'} className="wa-field">
            <ol className="wa-body">
              <li>Open Wispr Flow and sign in.</li>
              <li>Put your cursor in the box below.</li>
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
            {tryIt.trim() && <p className="wa-note">Text arrived. You&apos;re set.</p>}
          </div>

          <div role="tabpanel" id="panel-how" aria-labelledby="tab-how" hidden={tab !== 'how'} className="wa-field">
            <p className="wa-body">
              You play each game twice: a typed round and a voice round, in a random order. Typed rounds
              block paste. Voice rounds are for Flow.
            </p>
            <p className="wa-label">What is shared and who sees it</p>
            <ul className="wa-consent">
              <li>
                We keep numbers from your rounds, such as words, speed and ratings. Your typed and spoken
                text stays in your browser.
              </li>
              <li>
                The one exception: your Describe to decode descriptions are shown anonymously to outside
                Judges, with no mode or author.
              </li>
              <li>Results are published in aggregate under code names only.</li>
              <li>Streak card images stay private.</li>
            </ul>
            <div className="wa-confirm" data-blip-target="confirm-box">
              <label className="wa-label" htmlFor="say-in">
                Say or type
              </label>
              <p className="wa-confirm__say">I&apos;m in</p>
              <input
                ref={sayInRef}
                id="say-in"
                className="wa-input"
                value={said}
                onChange={(e) => setSaid(e.target.value)}
                placeholder="Say it or type it"
                autoComplete="off"
              />
              <button type="button" className="wa-btn wa-btn--ghost" onClick={() => sayInRef.current?.focus()}>
                Type it instead
              </button>
            </div>
            <div className="wa-chips">
              <Chip pressed={leaderboard} onToggle={() => setLeaderboard((v) => !v)}>
                Show my speed in the Speed race
              </Chip>
            </div>
            <p className="wa-note">Optional and separate. Your speed stays hidden unless you pick this.</p>
          </div>

          <div className="wa-actions">
            {tab !== 'how' ? (
              <button
                type="button"
                className="wa-btn wa-btn--primary"
                onClick={() => selectTab(tab === 'need' ? 'setup' : 'how')}
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
