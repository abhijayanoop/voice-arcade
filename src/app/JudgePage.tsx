import { useEffect, useMemo, useState } from 'react'
import { createApi } from '../api'
import type { JudgeItem } from '../api/types'
import { sceneSetFromId } from '../scenes/scenes'
import { SceneSvg } from '../scenes/SceneSvg'

const JUDGE_KEY = 'voice-arcade.judge'
const BATCH = 5

/** A random id kept in the Judge's browser, so they are never shown a description twice. No sign-up. */
function judgeKey(): string {
  try {
    let key = localStorage.getItem(JUDGE_KEY)
    if (!key) {
      key = crypto.randomUUID()
      localStorage.setItem(JUDGE_KEY, key)
    }
    return key
  } catch {
    // Storage blocked: judge anonymously for this visit only.
    return crypto.randomUUID()
  }
}

type Load = 'loading' | 'ready' | 'failed'

/** The public Judge page: read a description, pick the scene it describes. */
export function JudgePage() {
  const api = useMemo(createApi, [])
  const key = useMemo(judgeKey, [])
  const [queue, setQueue] = useState<JudgeItem[]>([])
  const [load, setLoad] = useState<Load>('loading')
  const [judged, setJudged] = useState(0)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    // Without this, a late reply could land after the Judge has already moved on.
    let current = true
    if (queue.length > 0) return
    setLoad('loading')
    api
      .getJudgeBatch(key, BATCH)
      .then((items) => {
        if (!current) return
        setQueue(items.filter((item) => sceneSetFromId(item.sceneSet)))
        setLoad('ready')
      })
      .catch(() => current && setLoad('failed'))
    return () => {
      current = false
    }
  }, [api, key, queue.length, judged])

  const item = queue[0]
  const set = item ? sceneSetFromId(item.sceneSet) : null

  async function pick(sceneId: string) {
    if (!item || busy) return
    setBusy(true)
    setFailed(false)
    try {
      await api.submitJudgment(key, item.id, sceneId)
      setQueue((items) => items.slice(1))
      setJudged((n) => n + 1)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main id="main" className="wa-page">
      <div className="wa-screen">
        <h1 className="wa-title">Be a Judge</h1>
        <p className="wa-body">
          Someone described one of these scenes. Pick the one you think they meant. You will not see who wrote it.
        </p>
        {load === 'loading' && <p className="wa-body" role="status">Loading descriptions…</p>}
        {load === 'failed' && <p className="wa-error" role="alert">Could not load descriptions. Refresh to try again.</p>}
        {load === 'ready' && item && set && (
          <>
            <blockquote className="wa-card wa-body" data-testid="description">{item.text}</blockquote>
            <div className="wa-scenes" role="group" aria-label="Which scene was described?">
              {set.scenes.map((scene, i) => (
                <button
                  key={scene.id}
                  type="button"
                  className="wa-scene wa-scene--pick"
                  disabled={busy}
                  onClick={() => pick(scene.id)}
                >
                  <SceneSvg scene={scene} label={`Scene ${i + 1}`} />
                  <span className="wa-scene__tag">Scene {i + 1}</span>
                </button>
              ))}
            </div>
            {failed && <p className="wa-error" role="alert">That did not save. Pick again.</p>}
          </>
        )}
        {load === 'ready' && !item && (
          <p className="wa-body" role="status">
            {judged > 0
              ? `Thank you. You judged ${judged}. That is all the descriptions for now.`
              : 'No descriptions to judge yet. Come back soon.'}
          </p>
        )}
      </div>
    </main>
  )
}
