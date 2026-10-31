import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useBlip } from '../blip/BlipProvider'
import { distinguishingDetails, sceneSetFromId } from '../scenes/scenes'
import { SceneSvg } from '../scenes/SceneSvg'
import type { Mode } from '../session/session'
import { Chip } from '../ui/Chip'
import { useGame } from './GameIntro'
import { useGameRun } from './GameRun'
import { useSession } from './SessionProvider'

/** Voice and typing within this factor of each other count as a tie. */
const TIE_RATIO = 1.2
const NATURAL = ['Very awkward', 'A bit awkward', 'Fine', 'Natural', 'Very natural']
const OWNERSHIP = [
  { value: 'mine', label: 'Yes, all mine' },
  { value: 'mostly', label: 'Mostly mine' },
  { value: 'not', label: 'Not really' },
]

export function GameResult() {
  const { def, status } = useGame()
  const run = useGameRun()
  const { view, recordAnswers } = useSession()
  const [natural, setNatural] = useState<number | null>(null)
  const [ownership, setOwnership] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const { say } = useBlip()
  const gameKey = def?.key
  const typedWpm = gameKey ? run.played(gameKey).typed?.metrics.wpm ?? 0 : 0
  const voiceRound = gameKey ? run.played(gameKey).voice : undefined
  const voiceWpm = voiceRound?.metrics.wpm ?? 0

  // Blip reacts to the same comparison the card shows, so its line never contradicts the numbers.
  useEffect(() => {
    if (gameKey === 'decode') {
      say('decode.sent')
      return
    }
    if (!voiceRound || voiceRound.typedInstead || typedWpm === 0 || voiceWpm === 0) return
    const ratio = voiceWpm / typedWpm
    if (ratio >= TIE_RATIO) say('result.voice_big_win', { x: ratio.toFixed(1) })
    else if (ratio <= 1 / TIE_RATIO) say('result.typed_win')
    else say('result.close')
  }, [gameKey, voiceRound, typedWpm, voiceWpm, say])

  if (!def || !def.playable || !status) return <Navigate to="/lobby" replace />
  const played = run.played(def.key)
  const typed = played.typed
  const voice = played.voice
  // Both rounds are saved by now; a refresh drops what the comparison needs, so go back to the lobby.
  if (!typed || !voice) return <Navigate to="/lobby" replace />

  const ratio = typed.metrics.wpm > 0 ? voice.metrics.wpm / typed.metrics.wpm : 0
  const verdict =
    voice.typedInstead
      ? 'You typed the voice round, so there is no voice comparison this time.'
      : typed.metrics.wpm === 0 || voice.metrics.wpm === 0
      ? 'One of your rounds has no usable timing, so there is no fair speed comparison this time.'
      : ratio >= TIE_RATIO
        ? `Voice was ${ratio.toFixed(1)}× faster than typing.`
        : ratio <= 1 / TIE_RATIO
          ? `Typing was ${(1 / ratio).toFixed(1)}× faster than voice.`
          : 'Basically a tie between typing and voice.'

  const rows: { mode: Mode; label: string }[] = [
    { mode: 'typed', label: 'Typed' },
    { mode: 'voice', label: voice.typedInstead ? 'Voice (typed)' : 'Voice' },
  ]
  const isDecode = def.key === 'decode'
  const noun = isDecode ? 'description' : 'ideas'
  const maxWpm = Math.max(typed.metrics.wpm, voice.metrics.wpm, 1)

  async function save() {
    setBusy(true)
    setFailed(false)
    try {
      await recordAnswers(def!.key, 'voice', { felt_natural: natural, ownership })
      setSaved(true)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="wa-page">
      <div className="wa-screen">
        <h1 className="wa-title">{def.title}: result</h1>
        <section className="wa-result" aria-label="Typed versus voice" data-blip-target="result-card">
          <p className="wa-body">{verdict}</p>
          {rows.map(({ mode, label }) => {
            const m = played[mode]!.metrics
            return (
              <div key={mode} className="wa-result__row">
                <span>{label}</span>
                <span className="wa-result__bar">
                  <span
                    className="wa-result__fill"
                    style={{ width: `${(m.wpm / maxWpm) * 100}%`, background: mode === 'voice' ? 'var(--lavender)' : 'var(--tomato)' }}
                  />
                </span>
                <span>{m.wpm} wpm</span>
              </div>
            )
          })}
          <p className="wa-note">
            {!isDecode && `Ideas: ${String(typed.metrics.extras.idea_count)} typed, ${String(voice.metrics.extras.idea_count)} by voice.`}
            {isDecode && `Words: ${typed.metrics.words} typed, ${voice.metrics.words} by voice.`}
            {voice.metrics.integrity === 'flagged' && !voice.typedInstead && ' Your voice round looked typed, so it is marked as flagged.'}
          </p>
        </section>

        {isDecode && (
          <section className="wa-card" aria-label="Details to emphasise">
            <h2 className="wa-heading">Details worth saying</h2>
            <p className="wa-body">Judges now see your descriptions without your name or the mode. These details set each scene apart from its lookalikes.</p>
            <div className="wa-scenes">
              {rows.map(({ mode, label }) => {
                const info = played[mode]!.scenes
                const set = info && sceneSetFromId(info.setId)
                const scene = set && set.scenes.find((s) => s.id === info.targetId)
                if (!set || !scene) return null
                return (
                  <div key={mode} className="wa-scene is-target">
                    <SceneSvg scene={scene} label={`${label} round target`} />
                    <span className="wa-scene__tag">{label} round</span>
                    <ul className="wa-note">
                      {distinguishingDetails(set, scene.id).map((d) => (
                        <li key={d.attr}>{d.label}</li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {!saved ? (
          <div className="wa-card">
            <fieldset className="wa-field">
              <legend className="wa-label">How did talking to your computer feel?</legend>
              <div className="wa-chips">
                {NATURAL.map((label, i) => (
                  <Chip key={label} pressed={natural === i + 1} onToggle={() => setNatural(i + 1)}>{label}</Chip>
                ))}
              </div>
            </fieldset>
            <fieldset className="wa-field">
              <legend className="wa-label">{`Did the voice ${noun} feel like yours?`}</legend>
              <div className="wa-chips">
                {OWNERSHIP.map(({ value, label }) => (
                  <Chip key={value} pressed={ownership === value} onToggle={() => setOwnership(value)}>{label}</Chip>
                ))}
              </div>
            </fieldset>
            {failed && <p className="wa-error" role="alert">That did not save. Try again.</p>}
            <div className="wa-actions">
              <button
                type="button"
                className="wa-btn wa-btn--primary"
                disabled={busy || natural === null || ownership === null}
                onClick={save}
              >
                Save my result
              </button>
            </div>
          </div>
        ) : (
          <div className="wa-actions">
            <span className="wa-gain" data-blip-target="waves">{view.waves} waves earned so far</span>
            <Link to="/lobby" className="wa-btn wa-btn--primary">Back to lobby</Link>
          </div>
        )}
      </div>
    </main>
  )
}
