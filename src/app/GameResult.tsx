import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import type { RoundMetrics } from '../api/types'
import { useBlip } from '../blip/BlipProvider'
import { distinguishingDetails, sceneSetFromId } from '../scenes/scenes'
import { SceneSvg } from '../scenes/SceneSvg'
import type { Mode } from '../session/session'
import { Chip } from '../ui/Chip'
import { TIE_RATIO } from '../games/compare'
import { SNIPPETS } from '../games/snippets'
import { useGame } from './GameIntro'
import { useGameRun } from './GameRun'
import { useSession } from './SessionProvider'

const NATURAL = ['Very awkward', 'A bit awkward', 'Fine', 'Natural', 'Very natural']
const OWNERSHIP = [
  { value: 'mine', label: 'Yes, all mine' },
  { value: 'mostly', label: 'Mostly mine' },
  { value: 'not', label: 'Not really' },
]

/** Juggler: the catching score and the keyword rubric, which is approximate. */
function jugglerSummary(typed: RoundMetrics, voice: RoundMetrics): string {
  const x = (m: RoundMetrics, key: string) => String(m.extras[key])
  return `Caught ${x(typed, 'caught')} typed, ${x(voice, 'caught')} by voice. Dropped ${x(typed, 'dropped')} typed, ${x(voice, 'dropped')} by voice. Reply covered (place, time, who; approximate, keyword matching): ${x(typed, 'rubric_hits')}/3 typed, ${x(voice, 'rubric_hits')}/3 by voice.`
}

/** Rant: the ratings and edit effort that were saved, never the text itself. */
function rantSummary(typed: RoundMetrics, voice: RoundMetrics): string {
  const accuracy = voice.answers.typed_instead ? '' : ` Flow accuracy: ${String(voice.answers.accuracy)}/5.`
  return `Sendable: ${String(typed.answers.sendable)}/5 typed, ${String(voice.answers.sendable)}/5 by voice.${accuracy} Characters edited: ${String(typed.extras.edit_chars)} typed, ${String(voice.extras.edit_chars)} by voice.`
}

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
  const typedRound = gameKey ? run.played(gameKey).typed : undefined

  // Blip reacts to the same comparison the card shows, so its line never contradicts the numbers.
  useEffect(() => {
    if (gameKey === 'decode') {
      say('decode.sent')
      return
    }
    if (gameKey === 'juggler' && voiceRound && !voiceRound.typedInstead && typedRound) {
      // Only the two juggler lines that the catch counts back up; otherwise fall through to the speed reaction below.
      if (Number(voiceRound.metrics.extras.caught) > Number(typedRound.metrics.extras.caught)) {
        say('juggler.voice_caught_more')
        return
      }
      if (Number(typedRound.metrics.extras.dropped) >= 3 && Number(voiceRound.metrics.extras.dropped) < Number(typedRound.metrics.extras.dropped)) {
        say('juggler.dropped_three')
        return
      }
    }
    if (gameKey === 'snippet' && voiceRound && !voiceRound.typedInstead && typedRound) {
      const voiceHits = Number(voiceRound.metrics.extras.jargon_hits)
      say(voiceHits === 0 || voiceHits < Number(typedRound.metrics.extras.jargon_hits) ? 'snippet.voice_missed' : 'snippet.voice_kept')
      return
    }
    if (gameKey === 'rant') {
      say('rant.sent')
      return
    }
    if (!voiceRound || voiceRound.typedInstead || typedWpm === 0 || voiceWpm === 0) return
    const ratio = voiceWpm / typedWpm
    if (ratio >= TIE_RATIO) say('result.voice_big_win', { x: ratio.toFixed(1) })
    else if (ratio <= 1 / TIE_RATIO) say('result.typed_win')
    else say('result.close')
  }, [gameKey, voiceRound, typedRound, typedWpm, voiceWpm, say])

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
  const isRant = def.key === 'rant'
  const isJuggler = def.key === 'juggler'
  const isSnippet = def.key === 'snippet'
  const noun = isDecode ? 'description' : isRant ? 'rant' : isJuggler ? 'reply' : isSnippet ? 'explanation' : 'ideas'
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
            {isRant && rantSummary(typed.metrics, voice.metrics)}
            {isJuggler && jugglerSummary(typed.metrics, voice.metrics)}
            {isSnippet && `Technical terms hit: ${String(typed.metrics.extras.jargon_hits)}/${String(typed.metrics.extras.jargon_total)} typed, ${String(voice.metrics.extras.jargon_hits)}/${String(voice.metrics.extras.jargon_total)} by voice.`}
            {!isDecode && !isRant && !isJuggler && !isSnippet && `Ideas: ${String(typed.metrics.extras.idea_count)} typed, ${String(voice.metrics.extras.idea_count)} by voice.`}
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

        {isSnippet && (
          <section className="wa-card" aria-label="Technical terms">
            <h2 className="wa-heading">Which terms made it</h2>
            <p className="wa-body">Matches are exact and case-sensitive, so a mangled capital or a near-miss counts as a miss.</p>
            {rows.map(({ mode, label }) => {
              const hit = played[mode]!.jargon ?? []
              return (
                <div key={mode} className="wa-field">
                  <span className="wa-label">{label}: {hit.length}/{SNIPPETS[mode].terms.length}</span>
                  <ul className="wa-chips">
                    {SNIPPETS[mode].terms.map((term) => (
                      <li key={term} className={`wa-chip${hit.includes(term) ? ' is-hit' : ''}`}>
                        {term} {hit.includes(term) ? '(hit)' : '(missed)'}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
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
            {view.arcadeDone ? (
              <Link to="/done" className="wa-btn wa-btn--primary">Finish the arcade</Link>
            ) : (
              <Link to="/lobby" className="wa-btn wa-btn--primary">Back to lobby</Link>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
