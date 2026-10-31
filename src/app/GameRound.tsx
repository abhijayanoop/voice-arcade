import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useBlip, useBlipOnMount, useQuietWhile } from '../blip/BlipProvider'
import { capture } from '../capture/capture'
import { useRoundRecorder } from '../capture/useRoundRecorder'
import type { DescriptionSubmission, RoundMetrics } from '../api/types'
import { other } from '../games/modes'
import { countIdeas, type GameKey } from '../games/registry'
import { generateSceneSet, seedForMode } from '../scenes/scenes'
import { SceneSvg } from '../scenes/SceneSvg'
import type { Mode } from '../session/session'
import { useGame } from './GameIntro'
import { useGameRun } from './GameRun'
import { useSession } from './SessionProvider'

type Phase = 'ready' | 'running' | 'over'

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
  const prompt = decode
    ? { key: `decode_${decode.set.id}`, text: 'Describe the highlighted scene so a Judge can pick it from the lookalikes.' }
    : def!.prompts![mode]
  const [phase, setPhase] = useState<Phase>('ready')
  const [left, setLeft] = useState(seconds)
  const [text, setText] = useState('')
  const [notice, setNotice] = useState('')
  const [typedInstead, setTypedInstead] = useState(false)
  const [busy, setBusy] = useState(false)
  const startedAt = useRef('')
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
    if (phase === 'running') recorder.field.current?.focus()
  }, [phase, recorder.field])

  useEffect(() => {
    if (phase === 'over') say('round.time_up')
  }, [phase, say])

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
    if (text.trim() === '') {
      setNotice(def!.emptyNotice ?? 'That is empty. Add something first.')
      say('round.empty_submit')
      return
    }
    const captured = capture(recorder.finish(text))
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
      answers: typedInstead ? { typed_instead: true } : {},
      extras: decode
        ? { edit_chars: captured.editDistance }
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
        <textarea
          ref={recorder.field}
          className="wa-input"
          aria-label={def!.inputLabel}
          rows={8}
          value={text}
          readOnly={phase !== 'running'}
          onChange={(e) => setText(e.target.value)}
          data-blip-target="answer-input"
        />
        {notice && <p className="wa-error" role="status">{notice}</p>}
        <div className="wa-actions">
          {phase === 'ready' ? (
            <button type="button" className="wa-btn wa-btn--primary" onClick={start} data-blip-target="start">
              Start the clock
            </button>
          ) : (
            <button type="button" className="wa-btn wa-btn--primary" disabled={busy} onClick={submit} data-blip-target="submit">
              {phase === 'over' ? 'Time is up. Submit' : 'Submit'}
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
