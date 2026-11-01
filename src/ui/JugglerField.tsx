import { useEffect, useRef } from 'react'
import { APPLE_SIZE, BASKET_SIZE, FIELD, newJuggler, stepJuggler } from '../games/juggler'

/** How far one arrow-key press moves the basket, in field pixels. */
const KEY_STEP = 24

export interface JugglerScore {
  caught: number
  dropped: number
}

/**
 * The Juggler's catching game: apples fall, the mouse moves the basket. It runs while `running` is true and keeps its score
 * in `score`, which the round reads when it is submitted.
 */
export function JugglerField({ running, score }: { running: boolean; score: React.MutableRefObject<JugglerScore> }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const basketX = useRef(FIELD.width / 2)
  const state = useRef(newJuggler())

  useEffect(() => {
    const el = canvas.current
    const ctx = el?.getContext('2d')
    if (!el || !ctx) return
    const css = getComputedStyle(document.documentElement)
    const color = (name: string) => css.getPropertyValue(name).trim()
    const draw = () => {
      ctx.clearRect(0, 0, FIELD.width, FIELD.height)
      ctx.fillStyle = color('--cream-200')
      ctx.fillRect(0, 0, FIELD.width, FIELD.height)
      ctx.fillStyle = color('--tomato')
      for (const apple of state.current.apples) {
        ctx.beginPath()
        ctx.arc(apple.x, apple.y, APPLE_SIZE, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = color('--lavender')
      ctx.fillRect(basketX.current - BASKET_SIZE.width / 2, FIELD.height - BASKET_SIZE.height, BASKET_SIZE.width, BASKET_SIZE.height)
    }
    draw()
    if (!running) return
    let last = performance.now()
    let frame = requestAnimationFrame(function tick(now) {
      state.current = stepJuggler(state.current, Math.min(now - last, 100), basketX.current, Math.random)
      last = now
      score.current = { caught: state.current.caught, dropped: state.current.dropped }
      draw()
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [running, score])

  return (
    <canvas
      ref={canvas}
      className="wa-juggler"
      width={FIELD.width}
      height={FIELD.height}
      role="application"
      aria-label="Catching game: move the mouse, drag a finger or use the left and right arrow keys to catch the falling apples"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
        e.preventDefault()
        const step = e.key === 'ArrowLeft' ? -KEY_STEP : KEY_STEP
        basketX.current = Math.min(Math.max(basketX.current + step, 0), FIELD.width)
      }}
      data-blip-target="juggler-field"
      onPointerMove={(e) => {
        const box = e.currentTarget.getBoundingClientRect()
        basketX.current = ((e.clientX - box.left) / box.width) * FIELD.width
      }}
    />
  )
}
