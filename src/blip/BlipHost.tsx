import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useBlip } from './BlipProvider'
import type { Expression } from './blip'

const FACES = import.meta.glob<string>('../../docs/design/blip/blip-*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const face = (expression: Expression) => FACES[`../../docs/design/blip/blip-${expression}.svg`]

const SIZE = 56
const GAP = 8
const TYPE_MS = 28
const HIDE_MS = 4000
const DRAG_PX = 5
const POKES_FOR_SPIN = 5

interface Point {
  x: number
  y: number
}

function targetElement(name: string | null): HTMLElement | null {
  if (!name) return null
  return document.querySelector<HTMLElement>(`[data-blip-target="${CSS.escape(name)}"]`)
}

/** Sits 8px outside the target's top-left corner, or its top-right when the left would leave the screen. */
function perchPoint(rect: DOMRect): Point {
  const maxX = window.innerWidth - SIZE - GAP
  const x = rect.left > maxX ? rect.right - SIZE : rect.left
  const above = rect.top - SIZE - GAP
  return {
    x: Math.min(Math.max(x, GAP), maxX),
    y: above >= GAP ? above : Math.min(rect.bottom + GAP, window.innerHeight - SIZE - GAP),
  }
}

/** Blip: renders the current scene, flies to targets, types the bubble and can be dragged away. */
export function BlipHost() {
  const { scene, quiet, say } = useBlip()
  const [place, setPlace] = useState<Point | null>(null)
  const [dragged, setDragged] = useState<Point | null>(null)
  const [dragging, setDragging] = useState(false)
  const [typed, setTyped] = useState('')
  const [visible, setVisible] = useState(false)
  const origin = useRef<{ pointer: Point; blip: Point; moved: boolean } | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const pokes = useRef(0)

  const locate = useCallback(() => {
    const target = targetElement(scene.target)
    setPlace(target ? perchPoint(target.getBoundingClientRect()) : null)
  }, [scene.target])

  // Each new step takes Blip to its target and ends any drag.
  useLayoutEffect(() => {
    setDragged(null)
    locate()
  }, [scene.id, locate])

  useEffect(() => {
    window.addEventListener('resize', locate)
    window.addEventListener('scroll', locate, true)
    return () => {
      window.removeEventListener('resize', locate)
      window.removeEventListener('scroll', locate, true)
    }
  }, [locate])

  // Type the bubble out at 28ms per character, then hide it after 4s.
  useEffect(() => {
    setTyped('')
    setVisible(scene.line !== '')
    if (scene.line === '') return
    let shown = 0
    let hide = 0
    const type = window.setInterval(() => {
      shown += 1
      setTyped(scene.line.slice(0, shown))
      if (shown >= scene.line.length) {
        window.clearInterval(type)
        hide = window.setTimeout(() => setVisible(false), HIDE_MS)
      }
    }, TYPE_MS)
    return () => {
      window.clearInterval(type)
      window.clearTimeout(hide)
    }
  }, [scene.id, scene.line])

  const position = dragged ?? place
  const flipped = position ? position.x + SIZE + 300 > window.innerWidth : false

  function onPointerDown(event: React.PointerEvent) {
    const box = root.current!.getBoundingClientRect()
    origin.current = {
      pointer: { x: event.clientX, y: event.clientY },
      blip: { x: box.left, y: box.top },
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: React.PointerEvent) {
    const start = origin.current
    if (!start) return
    const dx = event.clientX - start.pointer.x
    const dy = event.clientY - start.pointer.y
    if (!start.moved && Math.hypot(dx, dy) < DRAG_PX) return
    start.moved = true
    setDragging(true)
    setDragged({
      x: Math.min(Math.max(start.blip.x + dx, 0), window.innerWidth - SIZE),
      y: Math.min(Math.max(start.blip.y + dy, 0), window.innerHeight - SIZE),
    })
  }

  function onPointerUp() {
    const start = origin.current
    origin.current = null
    setDragging(false)
    if (!start) return
    if (start.moved) {
      // Say() starts a new step, which would release the drag; keep the spot Blip was dropped on.
      const spot = dragged
      say('drag.moved')
      if (spot) requestAnimationFrame(() => setDragged(spot))
      return
    }
    pokes.current += 1
    if (pokes.current >= POKES_FOR_SPIN) {
      pokes.current = 0
      say('poke.five')
    } else {
      say('poke.once')
    }
  }

  const classes = ['wa-blip']
  if (quiet) classes.push('is-quiet')
  if (dragging) classes.push('is-dragging')
  if (flipped) classes.push('is-flipped')

  return (
    <div
      ref={root}
      className={classes.join(' ')}
      style={position ? { left: position.x, top: position.y, bottom: 'auto' } : undefined}
    >
      {visible && !quiet && (
        <div className="wa-bubble wa-blip__bubble" aria-hidden="true">
          {typed}
        </div>
      )}
      {/* The full line is announced once; the typed-out copy above is decoration. */}
      <p className="wa-sr-only" role="status">
        {quiet ? '' : scene.line}
      </p>
      <div
        key={scene.id}
        className={`blip${quiet ? '' : ' blip--bob'} wa-blip__body wa-blip__body--${scene.move}`}
        role="img"
        aria-label="Blip, your guide"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        dangerouslySetInnerHTML={{ __html: face(scene.expression) }}
      />
    </div>
  )
}
