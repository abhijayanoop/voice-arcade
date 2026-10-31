import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useBlip, useBlipOnMount, useQuietWhile } from '../blip/BlipProvider'
import { capture, editDistance, jargonHits, rubricHits, type CaptureMetrics } from '../capture/capture'
import { useRoundRecorder } from '../capture/useRoundRecorder'
import type { DescriptionSubmission, RoundMetrics } from '../api/types'
import { other } from '../games/modes'
import { countIdeas, LANG_MIXES, type GameKey } from '../games/registry'
import { SNIPPETS } from '../games/snippets'
import { generateSceneSet, seedForMode } from '../scenes/scenes'
import { SceneSvg } from '../scenes/SceneSvg'
import type { Mode } from '../session/session'
import { Chip } from '../ui/Chip'
import { JugglerField, type JugglerScore } from '../ui/JugglerField'
import { useGame } from './GameIntro'
import { useGameRun } from './GameRun'
import { useSession } from './SessionProvider'

type Phase = 'ready' | 'running' | 'over' | 'edit'

const SENDABLE = ['Not at all', 'Barely', 'Mostly', 'Sendable', 'Send it now']
const ACCURACY = ['Mangled', 'Rough', 'OK', 'Good', 'Spot on']

function Rating({ legend, labels, value, onPick }: { legend: string; labels: string[]; value: number | null; onPick: (n: number) => void }) {
  return (
    <fieldset className="wa-field">
      <legend className="wa-label">{legend}</legend>
      <div className="wa-chips">
        {labels.map((label, i) => (
          <Chip key={label} pressed={value === i + 1} onToggle={() => onPick(i + 1)}>{label}</Chip>
        ))}
      </div>
    </fieldset>
  )
}

export function GameRound() {
  const { def, status } = useGame()
  const { mode } = useParams()
  if (!def || !def.playable || status?.status !== 'next' || (mode !== 'typed' && mode !== 'voice')) {
    return <Navigate to="/lobby" replace />
  }
  // A round already saved (after a refresh) is not played twice.
  if (status.doneModes.includes(mode)) return <Navigate to={`/game/${def.key}/${other(mode)}`} replace />
  return <Round key={mode} gameKey={def.key} mode={mode} secondRound={status.doneModes.length > 0} />
}

function Round({ gameKey, mode, secondRound }: { gameKey: GameKey; mode: Mode; secondRound: boolean }) {
  const { def } = useGame()
  const run = useGameRun()
  const { completeRound } = useSession()
  const navigate = useNavigate()
  const seconds = def!.seconds!
  // State, not useMemo: the target must stay put for the whole round.
  const [decode] = useState(() => {
    if (gameKey !== 'decode') return null
    const set = generateSceneSet(seedForMode(mode))
    return { set, target: set.scenes[Math.floor(Math.random() * set.scenes.length)] }
  })
  const snippet = gameKey === 'snippet' ? SNIPPETS[mode] : null
  const prompt = snippet
    ? { key: snippet.key, text: 'Explain what this code does, as if to a teammate.' }
    : decode
    ? { key: `decode_${decode.set.id}`, text: 'Describe the highlighted scene so a Judge can pick it from the lookalikes.' }
    : def!.prompts![mode]
  const [phase, setPhase] = useState<Phase>('ready')
  const [left, setLeft] = useState(seconds)
  const [text, setText] = useState('')
  const [notice, setNotice] = useState('')
  const [typedInstead, setTypedInstead] = useState(false)
  const [busy, setBusy] = useState(false)
  // Rant only: the text as it stood when the rant ended and the speed numbers frozen then, so editing time never counts as ranting time.
  const isRant = gameKey === 'rant'
  const [raw, setRaw] = useState<{ text: string; captured: CaptureMetrics } | null>(null)
  const [sendable, setSendable] = useState<number | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const startedAt = useRef('')
  // Juggler only: the catching game keeps its score here while the reply is written.
  const isJuggler = gameKey === 'juggler'
  const score = useRef<JugglerScore>({ caught: 0, dropped: 0 })
  const { langMix, setLangMix } = run
  const { say } = useBlip()
  useBlipOnMount(mode === 'typed' ? 'round.typed_intro' : 'round.voice_intro')
  // Quiet mode: Blip docks and stays silent for as long as the clock runs.
  useQuietWhile(phase === 'running')
  const recorder = useRoundRecorder({
    mode,
    timerMs: seconds * 1000,
    onBlocked: () => {
      setNotice('Paste is off in typed rounds. Fresh words only.')
      say('round.pasted')
    },
  })

  useEffect(() => {
    if (phase !== 'running') return
    const id = window.setInterval(() => {
      setLeft((n) => {
        if (n <= 1) {
          window.clearInterval(id)
          setPhase('over')
          return 0
        }
        return n - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase === 'running' || phase === 'edit') recorder.field.current?.focus()
  }, [phase, recorder.field])

  useEffect(() => {
    if (phase === 'over') say('round.time_up')
  }, [phase, say])

  function finishRant() {
    setRaw({ text, captured: capture(recorder.finish(text)) })
    setPhase('edit')
    say('rant.edit')
  }

  useEffect(() => {
    if (isRant && phase === 'over') finishRant()
    // finishRant reads the latest text, and the phase moves on at once, so this runs once per round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRant, phase])

  function typeInstead() {
    setTypedInstead(true)
    say('round.typed_in_voice')
  }

  function start() {
    startedAt.current = new Date().toISOString()
    recorder.start()
    setPhase('running')
  }

  async function submit() {
    if (isRant && !raw) {
      if (text.trim() === '') {
        setNotice(def!.emptyNotice!)
        say('round.empty_submit')
        return
      }
      finishRant()
      return
    }
    if (text.trim() === '') {
      setNotice(def!.emptyNotice ?? 'That is empty. Add something first.')
      say('round.empty_submit')
      return
    }
    const captured = raw?.captured ?? capture(recorder.finish(text))
    const jargon = snippet ? jargonHits(text, snippet.terms) : null
    const metrics: RoundMetrics = {
      promptKey: prompt.key,
      startedAt: startedAt.current,
      activeMs: captured.activeMs,
      words: captured.words,
      chars: captured.chars,
      wpm: captured.wpm,
      keystrokes: captured.keystrokes,
      pasteEvents: captured.pasteEvents,
      insertEvents: captured.insertEvents,
      // A voice step typed instead is stored in the voice slot, flagged, so the (player, game, mode) key stays unique.
      integrity: typedInstead || captured.integrity === 'flagged' ? 'flagged' : 'ok',
      answers: {
        ...(typedInstead ? { typed_instead: true } : {}),
        ...(isRant ? { lang_mix: langMix, sendable, ...(typedInstead ? {} : { accuracy }) } : {}),
      },
      extras: decode
        ? { edit_chars: captured.editDistance }
        : isRant
          ? { edit_chars: editDistance(raw!.text, text) }
          : snippet
            ? { jargon_hits: jargon!.hits.length, jargon_total: jargon!.total }
            : isJuggler
            ? { caught: score.current.caught, dropped: score.current.dropped, rubric_hits: rubricHits(text).hits }
            : { idea_count: countIdeas(text), edit_chars: captured.editDistance },
    }
    // The description is the one dictated text that is stored, with its scene set and target.
    // A voice step typed instead is left out, so Judges never score typed text as voice.
    const description: DescriptionSubmission | undefined = decode && !typedInstead
      ? { sceneSet: decode.set.id, targetScene: decode.target.id, text: text.trim() }
      : undefined
    setBusy(true)
    try {
      await completeRound(gameKey, mode, metrics, description)
    } catch {
      setNotice('That did not save. Try submitting again.')
      setBusy(false)
      return
    }
    run.record(gameKey, mode, {
      metrics,
      typedInstead,
      jargon: jargon?.hits,
      scenes: decode ? { setId: decode.set.id, targetId: decode.target.id } : undefined,
    })
    navigate(secondRound ? `/game/${gameKey}/result` : `/game/${gameKey}/${other(mode)}`)
  }

  return (
    <main className="wa-page">
      <div className="wa-screen">
        <header className="wa-hud">
          <span className="wa-hud__round">{mode === 'typed' ? 'Keyboard round' : 'Voice round'}</span>
          <span className="wa-hud__spacer" />
          <span className="wa-waves" role="timer" aria-label={`${left} seconds left`}>{left}s</span>
        </header>
        <h1 className="wa-heading">{prompt.text}</h1>
        {snippet && <pre className="wa-code" tabIndex={0} aria-label="Code to explain"><code>{snippet.code}</code></pre>}
        {isJuggler && <JugglerField running={phase === 'running'} score={score} />}
        {decode && (
          <div className="wa-scenes" data-blip-target="scenes">
            {decode.set.scenes.map((scene) => (
              <div key={scene.id} className={`wa-scene${scene.id === decode.target.id ? ' is-target' : ''}`}>
                <SceneSvg scene={scene} label={scene.id === decode.target.id ? 'Highlighted scene: describe this one' : 'A lookalike scene'} />
                {scene.id === decode.target.id && <span className="wa-scene__tag">Describe this one</span>}
              </div>
            ))}
          </div>
        )}
        {mode === 'voice' && (
          <div className={`wa-voice${phase === 'running' ? ' is-listening' : ''}`} data-blip-target="voice-input">
            <span>{def!.voiceHint}</span>
          </div>
        )}
        {isRant && phase === 'ready' && (
          <fieldset className="wa-field" data-blip-target="lang-mix">
            <legend className="wa-label">What language mix do you actually rant in?</legend>
            <div className="wa-chips">
              {LANG_MIXES.map((mix) => (
                <Chip key={mix} pressed={langMix === mix} onToggle={() => setLangMix(mix)}>{mix}</Chip>
              ))}
            </div>
          </fieldset>
        )}
        {isRant && phase === 'edit' && (
          <>
            <p className="wa-body">Now edit it into something you could send. The box below holds your rant: change it freely.</p>
            <Rating legend="How sendable was your raw rant?" labels={SENDABLE} value={sendable} onPick={setSendable} />
            {mode === 'voice' && !typedInstead && (
              <Rating legend="How accurate was Flow?" labels={ACCURACY} value={accuracy} onPick={setAccuracy} />
            )}
          </>
        )}
        <textarea
          ref={recorder.field}
          className="wa-input"
          aria-label={def!.inputLabel}
          rows={8}
          value={text}
          readOnly={phase !== 'running' && phase !== 'edit'}
          onChange={(e) => setText(e.target.value)}
          data-blip-target="answer-input"
        />
        {notice && <p className="wa-error" role="status">{notice}</p>}
        <div className="wa-actions">
          {phase === 'ready' ? (
            <button type="button" className="wa-btn wa-btn--primary" disabled={isRant && !langMix} onClick={start} data-blip-target="start">
              Start the clock
            </button>
          ) : (
            <button
              type="button"
              className="wa-btn wa-btn--primary"
              disabled={busy || (phase === 'edit' && (sendable === null || (mode === 'voice' && !typedInstead && accuracy === null)))}
              onClick={submit}
              data-blip-target="submit"
            >
              {isRant ? (phase === 'edit' ? 'Submit the sendable version' : 'Done ranting') : phase === 'over' ? 'Time is up. Submit' : 'Submit'}
            </button>
          )}
          {mode === 'voice' && !typedInstead && (
            <button type="button" className="wa-btn wa-btn--ghost" onClick={typeInstead}>
              Type it instead
            </button>
          )}
          {typedInstead && <span className="wa-note">Typing instead. This round will be marked as typed.</span>}
        </div>
      </div>
    </main>
  )
}
