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

  it('keeps a Rant round to its ratings, language mix and edit effort, with no text stored', async () => {
    const api = createMemoryApi()
    const session = createSession({ api })
    await session.register(profile())
    await session.giveConsent({ leaderboardOptIn: false })
    for (const game of ['brain_dump', 'decode'] as const) {
      await session.completeRound(game, 'typed', metrics())
      await session.completeRound(game, 'voice', metrics())
    }

    const answers = { lang_mix: 'Hinglish', sendable: 2, accuracy: 4 }
    await session.completeRound('rant', 'voice', { ...metrics(), answers, extras: { edit_chars: 37 } })

    const saved = api.rounds().find((r) => r.game === 'rant')
    expect(saved).toMatchObject({ mode: 'voice', answers, extras: { edit_chars: 37 } })
    expect(api.descriptions()).toEqual([])
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

describe('saving a game round by round', () => {
  async function inLobby(api = createMemoryApi()) {
    const session = createSession({ api, random: () => 0.9 }) // voice first
    await session.register(profile())
    await session.giveConsent({ leaderboardOptIn: false })
    return { api, session }
  }

  it('shows which modes of a game are done, and keeps them across a resume', async () => {
    const { api, session } = await inLobby()
    expect(session.view().games[0].doneModes).toEqual([])

    await session.completeRound('brain_dump', 'voice', metrics())
    expect(session.view().games[0].doneModes).toEqual(['voice'])

    const after = createSession({ api, random: () => 0 })
    await after.resume(session.token()!)
    expect(after.view().games[0].doneModes).toEqual(['voice'])
    expect(after.view().games[0].firstMode).toBe('voice')
  })

  it('adds the post-game answers to a saved round without touching its metrics', async () => {
    const { api, session } = await inLobby()
    await session.completeRound('brain_dump', 'voice', metrics(33))
    await session.completeRound('brain_dump', 'typed', metrics(21))

    await session.recordAnswers('brain_dump', 'voice', { felt_natural: 4, ownership: 'mine' })

    const voice = api.rounds().find((r) => r.mode === 'voice')!
    expect(voice.answers).toEqual({ felt_natural: 4, ownership: 'mine' })
    expect(voice.words).toBe(33)
  })
})

describe('the speed race and finishing the arcade', () => {
  const ALL = ['brain_dump', 'decode', 'rant', 'juggler', 'snippet'] as const
  async function player(api: ReturnType<typeof createMemoryApi>, codeName: string, optIn: boolean) {
    const session = createSession({ api })
    await session.register(profile(codeName))
    await session.giveConsent({ leaderboardOptIn: optIn })
    return session
  }
  const playVoiceBrainDump = async (s: Awaited<ReturnType<typeof player>>, wpm: number, integrity: 'ok' | 'flagged' = 'ok') => {
    await s.completeRound('brain_dump', 'typed', metrics())
    await s.completeRound('brain_dump', 'voice', { ...metrics(), wpm, integrity })
  }

  it('ranks only opted-in Players, fastest voice Brain dump first', async () => {
    const api = createMemoryApi()
    await playVoiceBrainDump(await player(api, 'Slow', true), 30)
    await playVoiceBrainDump(await player(api, 'Fast', true), 80)
    await playVoiceBrainDump(await player(api, 'Private', false), 200)

    const board = await (await player(api, 'Viewer', false)).leaderboard()

    expect(board.map((e) => [e.codeName, e.wpm])).toEqual([['Fast', 80], ['Slow', 30]])
  })

  it('leaves out a voice round that was flagged, such as one typed instead', async () => {
    const api = createMemoryApi()
    await playVoiceBrainDump(await player(api, 'Honest', true), 40)
    await playVoiceBrainDump(await player(api, 'Typist', true), 150, 'flagged')

    const board = await (await player(api, 'Viewer', false)).leaderboard()

    expect(board.map((e) => e.codeName)).toEqual(['Honest'])
  })

  it('shows the top ten only', async () => {
    const api = createMemoryApi()
    for (let i = 0; i < 12; i++) await playVoiceBrainDump(await player(api, `P${i}`, true), 10 + i)

    const board = await (await player(api, 'Viewer', false)).leaderboard()

    expect(board).toHaveLength(10)
    expect(board[0].wpm).toBe(21)
  })

  it('marks the arcade done once every game is complete, and remembers it on resume', async () => {
    const api = createMemoryApi()
    const session = await player(api, 'Finisher', false)
    for (const game of ALL.slice(0, 4)) {
      await session.completeRound(game, 'typed', metrics())
      await session.completeRound(game, 'voice', metrics())
    }
    expect(session.view().arcadeDone).toBe(false)

    await session.completeRound('snippet', 'typed', metrics())
    expect(session.view().arcadeDone).toBe(false)
    await session.completeRound('snippet', 'voice', metrics())
    expect(session.view().arcadeDone).toBe(true)

    const back = createSession({ api })
    await back.resume(session.token()!)
    expect(back.view().arcadeDone).toBe(true)
  })
})

describe('a failed finish', () => {
  it('is retried by submitting the last round again', async () => {
    const api = createMemoryApi()
    let failures = 1
    const flaky = { ...api, finishArcade: async (t: string) => { if (failures-- > 0) throw new Error('offline'); return api.finishArcade(t) } }
    const session = createSession({ api: flaky })
    await session.register(profile())
    await session.giveConsent({ leaderboardOptIn: false })
    for (const game of ['brain_dump', 'decode', 'rant', 'juggler'] as const) {
      await session.completeRound(game, 'typed', metrics())
      await session.completeRound(game, 'voice', metrics())
    }
    await session.completeRound('snippet', 'typed', metrics())

    await expect(session.completeRound('snippet', 'voice', metrics())).rejects.toThrow('offline')
    expect(session.view().arcadeDone).toBe(false)

    await session.completeRound('snippet', 'voice', metrics())
    expect(session.view().arcadeDone).toBe(true)
  })
})

describe('the three-day experiment', () => {
  const HOUR = 3600_000
  const DAY = 24 * HOUR
  const ALL = ['brain_dump', 'decode', 'rant', 'juggler', 'snippet'] as const

  async function finishedArcade() {
    const clock = { ms: Date.parse('2026-11-01T10:00:00Z') }
    const now = () => new Date(clock.ms)
    const api = createMemoryApi({ now })
    const session = createSession({ api, now })
    await session.register(profile())
    await session.giveConsent({ leaderboardOptIn: false })
    for (const game of ALL) {
      await session.completeRound(game, 'typed', metrics())
      await session.completeRound(game, 'voice', metrics())
    }
    const reopen = async () => {
      const back = createSession({ api, now })
      await back.resume(session.token()!)
      return back
    }
    return { api, session, clock, reopen }
  }

  it('has no quests, check-in or boss before the arcade is done', async () => {
    const api = createMemoryApi()
    const session = createSession({ api })
    await session.register(profile())
    await session.giveConsent({ leaderboardOptIn: false })

    expect(session.view().phase).toBe('arcade')
    expect(session.view().checkinDue).toBe(false)
    expect(session.view().bossDue).toBe(false)
    await session.markQuest()
    expect(api.players()).toHaveLength(1)
    expect((await api.getState(session.token()!)).questDays).toEqual([])
  })

  it('offers one quest a day and lets the Player tick today only, building a streak', async () => {
    const { session, clock } = await finishedArcade()
    expect(session.view().phase).toBe('quests')
    expect(session.view().quests.map((q) => q.status)).toEqual(['today', 'locked', 'locked'])
    expect(session.view().streak).toBe(0)

    await session.markQuest()
    expect(session.view().quests.map((q) => q.status)).toEqual(['done', 'locked', 'locked'])
    expect(session.view().streak).toBe(1)

    clock.ms += DAY
    expect(session.view().quests.map((q) => q.status)).toEqual(['done', 'today', 'locked'])
    await session.markQuest()
    expect(session.view().streak).toBe(2)
  })

  it('shows a missed day and a broken streak', async () => {
    const { session, clock } = await finishedArcade()
    await session.markQuest()
    clock.ms += 2 * DAY

    expect(session.view().quests.map((q) => q.status)).toEqual(['done', 'missed', 'today'])
    expect(session.view().streak).toBe(0)
    await session.markQuest()
    expect(session.view().streak).toBe(1)
  })

  it('keeps the quest ticks across a return through the personal link', async () => {
    const { session, clock, reopen } = await finishedArcade()
    await session.markQuest()
    clock.ms += DAY

    const back = await reopen()
    expect(back.view().quests.map((q) => q.status)).toEqual(['done', 'today', 'locked'])
    expect(back.view().streak).toBe(1)
  })

  it('makes the check-in due from day 3 and stores it with its image and apps', async () => {
    const { api, session, clock } = await finishedArcade()
    clock.ms += DAY
    expect(session.view().checkinDue).toBe(false)
    clock.ms += DAY
    expect(session.view().checkinDue).toBe(true)
    expect(session.view().phase).toBe('checkin')

    await session.submitCheckin({
      streakDays: 3,
      totalWords: 4200,
      apps: ['Slack', 'VS Code'],
      builtinTried: true,
      builtinReason: 'It stopped mid-sentence',
      image: new Blob(['png'], { type: 'image/png' }),
    })

    expect(api.uploads()).toHaveLength(1)
    expect(api.uploads()[0]).toContain(session.token()!)
    expect(api.checkins()).toEqual([
      {
        day: 3,
        streakDays: 3,
        totalWords: 4200,
        apps: ['Slack', 'VS Code'],
        screenshotPath: api.uploads()[0],
        answers: { tried_builtin: true, builtin_dictation_reason: 'It stopped mid-sentence' },
      },
    ])
    expect(session.view().checkinDue).toBe(false)
    expect(session.view().bossDue).toBe(true)
    expect(session.view().phase).toBe('boss')
  })

  it('stores the boss round, then shows the totals on the thank-you', async () => {
    const { api, session, clock, reopen } = await finishedArcade()
    await session.markQuest()
    clock.ms += 2 * DAY
    await session.submitCheckin({ streakDays: 2, totalWords: 900, apps: [], builtinTried: false, builtinReason: '' })

    await session.submitBoss({ annoyance: 5, disappointment: 'very', payIntent: 'maybe', payIf: 'Cheaper for students' })

    expect(api.boss()).toEqual([
      { annoyance: 5, disappointment: 'very', payIntent: 'maybe', payIf: 'Cheaper for students' },
    ])
    expect(session.view().bossDue).toBe(false)
    expect(session.view().phase).toBe('thanks')
    expect(session.view().totals).toEqual({ waves: 10, rounds: 10, questsDone: 1, streak: 0 })

    const back = await reopen()
    expect(back.view().phase).toBe('thanks')
  })

  it('stores a blank "what would change your mind" as nothing', async () => {
    const { api, session, clock } = await finishedArcade()
    clock.ms += 2 * DAY
    await session.submitCheckin({ streakDays: 1, totalWords: 1, apps: [], builtinTried: false, builtinReason: '' })
    await session.submitBoss({ annoyance: 1, disappointment: 'not', payIntent: 'no', payIf: '   ' })

    expect(api.boss()[0].payIf).toBeNull()
  })

  it('does not report a boss round due before the check-in', async () => {
    const { session, clock } = await finishedArcade()
    clock.ms += 5 * DAY
    expect(session.view().bossDue).toBe(false)
    expect(session.view().checkinDue).toBe(true)
  })
})
