import { describe, expect, it } from 'vitest'
import { createMemoryApi } from '../api/memoryApi'
import { createSession } from './session'
import type { PlayerProfile, RoundMetrics } from '../api/types'

const profile = (codeName = 'Mango'): PlayerProfile => ({
  codeName,
  avatar: 2,
  cohort: 'developer',
  os: 'mac',
  languages: ['English'],
})

const metrics = (words = 20): RoundMetrics => ({
  promptKey: 'p1',
  startedAt: '2026-11-01T10:00:00.000Z',
  activeMs: 60000,
  words,
  chars: words * 5,
  wpm: words,
  keystrokes: words * 5,
  pasteEvents: 0,
  insertEvents: 0,
  integrity: 'ok',
  answers: {},
  extras: {},
})

describe('registering', () => {
  it('moves a new Player from register to consent and persists them', async () => {
    const api = createMemoryApi()
    const session = createSession({ api })
    expect(session.view().step).toBe('register')

    await session.register(profile())

    expect(session.view().step).toBe('consent')
    expect(session.view().player?.codeName).toBe('Mango')
    expect(api.players()).toHaveLength(1)
    expect(api.players()[0].codeName).toBe('Mango')
  })
})

describe('a taken code name', () => {
  it('keeps the Player on register with a clear error, then lets them pick another', async () => {
    const api = createMemoryApi()
    await createSession({ api }).register(profile('Mango'))

    const second = createSession({ api })
    await second.register(profile('mango'))
    expect(second.view().step).toBe('register')
    expect(second.view().registerError).toBe('code_name_taken')
    expect(api.players()).toHaveLength(1)

    await second.register(profile('Papaya'))
    expect(second.view().step).toBe('consent')
    expect(second.view().registerError).toBeNull()
  })
})

describe('consent and the lobby', () => {
  it('opens the lobby after consent, persists the leaderboard choice, and offers only the first game', async () => {
    const api = createMemoryApi()
    const session = createSession({ api })
    await session.register(profile())

    await session.giveConsent({ leaderboardOptIn: true })

    expect(session.view().step).toBe('lobby')
    expect(api.players()[0].consented).toBe(true)
    expect(api.players()[0].leaderboardOptIn).toBe(true)
    expect(session.view().games.map((g) => g.status)).toEqual([
      'next', 'locked', 'locked', 'locked', 'locked',
    ])
  })
})

describe('unlocking', () => {
  async function inLobby() {
    const session = createSession({ api: createMemoryApi() })
    await session.register(profile())
    await session.giveConsent({ leaderboardOptIn: false })
    return session
  }
  const statuses = (s: Awaited<ReturnType<typeof inLobby>>) => s.view().games.map((g) => g.status)

  it('keeps a game as next until both its modes are complete, then unlocks the following game', async () => {
    const session = await inLobby()

    await session.completeRound('brain_dump', 'typed', metrics())
    expect(statuses(session)).toEqual(['next', 'locked', 'locked', 'locked', 'locked'])

    await session.completeRound('brain_dump', 'voice', metrics())
    expect(statuses(session)).toEqual(['done', 'next', 'locked', 'locked', 'locked'])
  })

  it('ignores rounds for a game that is still locked', async () => {
    const session = await inLobby()

    await session.completeRound('rant', 'typed', metrics())
    await session.completeRound('rant', 'voice', metrics())

    expect(statuses(session)).toEqual(['next', 'locked', 'locked', 'locked', 'locked'])
  })
})

describe('mode order', () => {
  const firstModes = (random: () => number) =>
    createSession({ api: createMemoryApi(), random }).view().games.map((g) => g.firstMode)

  it('picks typed first below the midpoint and voice first at or above it, per game', () => {
    const draws = [0.1, 0.9, 0.49, 0.5, 0]
    expect(firstModes(() => draws.shift() ?? 0)).toEqual(['typed', 'voice', 'typed', 'voice', 'typed'])
  })

  it('keeps each game first mode fixed while the Player moves through the arcade', async () => {
    // A random source that never repeats: any re-draw on a later view would change the modes.
    let n = 0
    const session = createSession({ api: createMemoryApi(), random: () => (n++ * 0.37) % 1 })
    const before = session.view().games.map((g) => g.firstMode)

    await session.register(profile())
    await session.giveConsent({ leaderboardOptIn: false })
    await session.completeRound('brain_dump', 'typed', metrics())

    expect(session.view().games.map((g) => g.firstMode)).toEqual(before)
  })

  it('always yields typed or voice with the real random source, and uses both across Players', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      for (const mode of firstModes(Math.random)) seen.add(mode)
    }
    expect([...seen].sort()).toEqual(['typed', 'voice'])
  })
})

describe('persisting rounds', () => {
  it('submits each completed round with its mode order and ignores locked games', async () => {
    const api = createMemoryApi()
    const session = createSession({ api, random: () => 0.9 }) // voice first everywhere
    await session.register(profile())
    await session.giveConsent({ leaderboardOptIn: false })

    await session.completeRound('brain_dump', 'voice', metrics(33))
    await session.completeRound('brain_dump', 'typed', metrics(21))
    await session.completeRound('rant', 'typed', metrics())

    expect(api.rounds().map((r) => [r.game, r.mode, r.modeOrder, r.words])).toEqual([
      ['brain_dump', 'voice', 1, 33],
      ['brain_dump', 'typed', 2, 21],
    ])
  })

  it('stores a Decode description alongside its round', async () => {
    const api = createMemoryApi()
    const session = createSession({ api })
    await session.register(profile())
    await session.giveConsent({ leaderboardOptIn: false })
    await session.completeRound('brain_dump', 'typed', metrics())
    await session.completeRound('brain_dump', 'voice', metrics())

    const description = { sceneSet: 'set-a', targetScene: 'scene-2', text: 'a red kite over a hill' }
    await session.completeRound('decode', 'typed', metrics(), description)

    expect(api.descriptions()).toEqual([description])
  })
})

describe('resuming from a personal link', () => {
  async function playedHalfway() {
    const api = createMemoryApi()
    const before = createSession({ api, random: () => 0.9 }) // voice first everywhere
    await before.register(profile('Mango'))
    await before.giveConsent({ leaderboardOptIn: true })
    await before.completeRound('brain_dump', 'voice', metrics())
    await before.completeRound('brain_dump', 'typed', metrics())
    await before.completeRound('decode', 'voice', metrics())
    return { api, token: before.token()! }
  }

  it('restores the Player, the lobby and the unlock progress', async () => {
    const { api, token } = await playedHalfway()

    const after = createSession({ api })
    expect(await after.resume(token)).toBe(true)

    expect(after.view().step).toBe('lobby')
    expect(after.view().player).toEqual({ codeName: 'Mango', avatar: 2 })
    expect(after.view().games.map((g) => g.status)).toEqual([
      'done', 'next', 'locked', 'locked', 'locked',
    ])
    expect(after.token()).toBe(token)
  })

  it('finishes a half-played game from where the Player stopped, keeping its mode order', async () => {
    const { api, token } = await playedHalfway()
    const after = createSession({ api, random: () => 0 }) // would pick typed first if re-drawn

    await after.resume(token)
    expect(after.view().games[1].firstMode).toBe('voice')

    await after.completeRound('decode', 'typed', metrics(), { sceneSet: 's', targetScene: 't', text: 'x' })
    expect(after.view().games.map((g) => g.status)).toEqual([
      'done', 'done', 'next', 'locked', 'locked',
    ])
    expect(api.rounds().find((r) => r.game === 'decode' && r.mode === 'typed')?.modeOrder).toBe(2)
  })

  it('sends a Player who registered but never consented back to consent', async () => {
    const api = createMemoryApi()
    const before = createSession({ api })
    await before.register(profile())

    const after = createSession({ api })
    await after.resume(before.token()!)

    expect(after.view().step).toBe('consent')
  })

  it('reports an unknown link without changing the session', async () => {
    const session = createSession({ api: createMemoryApi() })

    expect(await session.resume('not-a-token')).toBe(false)

    expect(session.view().step).toBe('register')
    expect(session.token()).toBeNull()
  })
})

describe('waves', () => {
  it('earns one wave per completed round, ignores locked games, and restores them on resume', async () => {
    const api = createMemoryApi()
    const session = createSession({ api })
    await session.register(profile())
    await session.giveConsent({ leaderboardOptIn: false })
    expect(session.view().waves).toBe(0)

    await session.completeRound('brain_dump', 'typed', metrics())
    expect(session.view().waves).toBe(1)
    await session.completeRound('rant', 'typed', metrics())
    expect(session.view().waves).toBe(1)

    const after = createSession({ api })
    await after.resume(session.token()!)
    expect(after.view().waves).toBe(1)
  })
})
