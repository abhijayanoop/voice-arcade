import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { capture } from '../capture/capture'
import { useRoundRecorder } from '../capture/useRoundRecorder'
import type { RoundMetrics } from '../api/types'
import { other } from '../games/modes'
import { countIdeas, type GameKey } from '../games/registry'
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
  const prompt = def!.prompts![mode]
  const [phase, setPhase] = useState<Phase>('ready')
  const [left, setLeft] = useState(seconds)
  const [text, setText] = useState('')
  const [notice, setNotice] = useState('')
  const [typedInstead, setTypedInstead] = useState(false)
  const [busy, setBusy] = useState(false)
  const startedAt = useRef('')
  const recorder = useRoundRecorder({
    mode,
    timerMs: seconds * 1000,
    onBlocked: () => setNotice('Paste is off in typed rounds. Fresh words only.'),
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

  function start() {
    startedAt.current = new Date().toISOString()
    recorder.start()
    setPhase('running')
  }

  async function submit() {
    if (text.trim() === '') {
      setNotice('That is empty. Add at least one idea.')
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
      extras: { idea_count: countIdeas(text), edit_chars: captured.editDistance },
    }
    setBusy(true)
    try {
      await completeRound(gameKey, mode, metrics)
    } catch {
      setNotice('That did not save. Try submitting again.')
      setBusy(false)
      return
    }
    run.record(gameKey, mode, { metrics, typedInstead })
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
        {mode === 'voice' && (
          <div className={`wa-voice${phase === 'running' ? ' is-listening' : ''}`} data-blip-target="voice-input">
            <span>Hold your Flow key and talk. Ideas, one per line.</span>
          </div>
        )}
        <textarea
          ref={recorder.field}
          className="wa-input"
          aria-label="Your ideas, one per line"
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
            <button type="button" className="wa-btn wa-btn--ghost" onClick={() => setTypedInstead(true)}>
              Type it instead
            </button>
          )}
          {typedInstead && <span className="wa-note">Typing instead. This round will be marked as typed.</span>}
        </div>
      </div>
    </main>
  )
}
