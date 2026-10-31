export const FIELD = { width: 360, height: 200 }
const BASKET = { width: 70, height: 12 }
const APPLE_RADIUS = 9
const SPAWN_EVERY_MS = 900
const BASE_SPEED = 90
const SPEED_UP_PER_SECOND = 1.5

export interface Apple {
  x: number
  y: number
}

export interface JugglerState {
  apples: Apple[]
  caught: number
  dropped: number
  elapsedMs: number
  sinceSpawnMs: number
}

export const newJuggler = (): JugglerState => ({ apples: [], caught: 0, dropped: 0, elapsedMs: 0, sinceSpawnMs: 0 })

/** Advances the game by dt milliseconds with the basket centred on basketX. `random` gives a number in [0, 1). */
export function stepJuggler(state: JugglerState, dtMs: number, basketX: number, random: () => number): JugglerState {
  const elapsedMs = state.elapsedMs + dtMs
  const speed = BASE_SPEED + SPEED_UP_PER_SECOND * (elapsedMs / 1000)
  let sinceSpawnMs = state.sinceSpawnMs + dtMs
  const apples = state.apples.map((a) => ({ x: a.x, y: a.y + (speed * dtMs) / 1000 }))
  if (sinceSpawnMs >= SPAWN_EVERY_MS) {
    sinceSpawnMs -= SPAWN_EVERY_MS
    apples.push({ x: APPLE_RADIUS + random() * (FIELD.width - 2 * APPLE_RADIUS), y: -APPLE_RADIUS })
  }
  const basketTop = FIELD.height - BASKET.height
  let caught = state.caught
  let dropped = state.dropped
  const falling: Apple[] = []
  for (const apple of apples) {
    if (apple.y + APPLE_RADIUS >= basketTop && Math.abs(apple.x - basketX) <= BASKET.width / 2 + APPLE_RADIUS) caught += 1
    else if (apple.y - APPLE_RADIUS > FIELD.height) dropped += 1
    else falling.push(apple)
  }
  return { apples: falling, caught, dropped, elapsedMs, sinceSpawnMs }
}

export const BASKET_SIZE = BASKET
export const APPLE_SIZE = APPLE_RADIUS
