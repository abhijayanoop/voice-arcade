import { describe, expect, it } from 'vitest'
import { createMemoryApi } from '../api/memoryApi'
import { createSession } from './session'
import type { PlayerProfile } from '../api/types'

const profile = (codeName = 'Mango'): PlayerProfile => ({
  codeName,
  avatar: 2,
  cohort: 'developer',
  os: 'mac',
  languages: ['English'],
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

    session.completeRound('brain_dump', 'typed')
    expect(statuses(session)).toEqual(['next', 'locked', 'locked', 'locked', 'locked'])

    session.completeRound('brain_dump', 'voice')
    expect(statuses(session)).toEqual(['done', 'next', 'locked', 'locked', 'locked'])
  })

  it('ignores rounds for a game that is still locked', async () => {
    const session = await inLobby()

    session.completeRound('rant', 'typed')
    session.completeRound('rant', 'voice')

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

  it('keeps each game first mode stable across views', () => {
    const session = createSession({ api: createMemoryApi() })
    expect(session.view().games.map((g) => g.firstMode)).toEqual(
      session.view().games.map((g) => g.firstMode),
    )
  })
})
