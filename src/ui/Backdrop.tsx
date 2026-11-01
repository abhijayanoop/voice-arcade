import { useEffect, useState } from 'react'

const KEY = 'voice-arcade.backdrop'
export type BackdropChoice = 'playful' | 'plain'

function readChoice(): BackdropChoice {
  try {
    return window.localStorage.getItem(KEY) === 'plain' ? 'plain' : 'playful'
  } catch {
    return 'playful'
  }
}

function PlayfulLayer() {
  return (
    <svg className="wa-backdrop" aria-hidden="true" focusable="false" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="wa-dots" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.6" className="wa-backdrop__fill" />
        </pattern>
      </defs>
      <g className="wa-backdrop__stroke" fill="none" strokeWidth="2">
        <circle cx="1080" cy="120" r="150" />
        <circle cx="1080" cy="120" r="100" />
        <circle cx="90" cy="690" r="120" />
        <circle cx="90" cy="690" r="70" />
        <path d="M-20 420 Q 150 300 320 420" />
        <path d="M820 800 Q 1000 620 1220 700" />
        <path d="M60 140 q 20 -24 40 0 t 40 0 t 40 0 t 40 0" />
      </g>
      <rect x="40" y="260" width="240" height="120" fill="url(#wa-dots)" />
      <rect x="900" y="520" width="240" height="120" fill="url(#wa-dots)" />
      <g className="wa-backdrop__fill">
        <circle cx="620" cy="60" r="5" />
        <circle cx="330" cy="740" r="6" />
        <circle cx="760" cy="720" r="4" />
        <circle cx="1140" cy="380" r="5" />
      </g>
      <g className="wa-backdrop__stroke" fill="none" strokeWidth="3" strokeLinecap="round">
        <path d="M480 120 h16 M488 112 v16" />
        <path d="M980 330 h16 M988 322 v16" />
        <path d="M200 560 h16 M208 552 v16" />
      </g>
    </svg>
  )
}

/** The quiet decorative layer behind every screen, with a switch to plain that is remembered in the browser. */
export function Backdrop() {
  const [choice, setChoice] = useState<BackdropChoice>(readChoice)

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, choice)
    } catch {
      // Private mode: the choice lasts for this visit only.
    }
  }, [choice])

  const playful = choice === 'playful'
  return (
    <>
      {playful && <PlayfulLayer />}
      <button
        type="button"
        className="wa-btn wa-btn--ghost wa-backdrop-toggle"
        aria-pressed={playful}
        onClick={() => setChoice(playful ? 'plain' : 'playful')}
      >
        Playful backdrop: {playful ? 'on' : 'off'}
      </button>
    </>
  )
}
