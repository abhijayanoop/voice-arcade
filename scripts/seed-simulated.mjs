// Seeds SIMULATED players so the whole pipeline (quest board, check-in, findings export) can be exercised.
// These are not real survey responses. Every simulated player is recorded in scripts/.simulated-players.json
// (git-ignored), and `npm run findings` leaves them out unless you pass --include-simulated.
//
//   npm run seed-sim                 create the simulated players (refuses if a manifest already exists)
//   npm run seed-sim -- --remove     delete them, their streak-card images and the manifest
//
// Needs the service key in .env (local only). Runs through vite-node so it can reuse the scene generator.
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { createClient } from '@supabase/supabase-js'
import { distinguishingDetails, generateSceneSet, seedForMode } from '../src/scenes/scenes'

const MANIFEST = new URL('./.simulated-players.json', import.meta.url)
const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
if (!url || !serviceKey) {
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env (local only).')
  process.exit(1)
}
const client = createClient(url, serviceKey, { auth: { persistSession: false } })

// ---------------------------------------------------------------- remove
if (process.argv.includes('--remove')) {
  if (!existsSync(MANIFEST)) {
    console.log('No manifest: nothing to remove.')
    process.exit(0)
  }
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
  const paths = manifest.players.flatMap((p) => p.paths)
  if (paths.length) {
    const { error } = await client.storage.from('streak-cards').remove(paths)
    if (error) console.error('Storage removal:', error.message)
  }
  const { error } = await client.from('player').delete().in('id', manifest.players.map((p) => p.id))
  if (error) {
    console.error('Player removal failed:', error.message)
    process.exit(1)
  }
  unlinkSync(MANIFEST)
  console.log(`Removed ${manifest.players.length} simulated players and ${paths.length} images.`)
  process.exit(0)
}

if (existsSync(MANIFEST)) {
  console.error('A manifest already exists. Run with --remove first.')
  process.exit(1)
}

// ---------------------------------------------------------------- helpers
let seed = 20261102
const rand = () => {
  seed = (seed + 0x6d2b79f5) >>> 0
  let t = seed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const between = (a, b) => a + rand() * (b - a)
const int = (a, b) => Math.round(between(a, b))
const pick = (list) => list[Math.floor(rand() * list.length)]
const chance = (p) => rand() < p
const round1 = (n) => Math.round(n * 10) / 10

const PEOPLE = [
  { name: 'CobaltFinch', cohort: 'developer', os: 'windows' },
  { name: 'MapleRunner', cohort: 'prompt_engineer', os: 'windows' },
  { name: 'QuietHarbor', cohort: 'developer', os: 'mac' },
  { name: 'NimbleOtter', cohort: 'developer', os: 'windows' },
  { name: 'SaffronKite', cohort: 'prompt_engineer', os: 'windows' },
  { name: 'PixelMoth', cohort: 'developer', os: 'windows', typedInsteadRant: true },
  { name: 'DriftwoodAsh', cohort: 'prompt_engineer', os: 'mac' },
  { name: 'BrightLantern', cohort: 'developer', os: 'windows' },
  { name: 'TealSparrow', cohort: 'prompt_engineer', os: 'mac' },
]
const GAME_SECONDS = { brain_dump: 60, decode: 90, rant: 90, juggler: 60, snippet: 75 }
const GAMES = Object.keys(GAME_SECONDS)
const PROMPT_KEYS = {
  brain_dump: { typed: 'bd_typed_1', voice: 'bd_voice_1' },
  rant: { typed: 'rant_typed_1', voice: 'rant_voice_1' },
  juggler: { typed: 'jg_typed_1', voice: 'jg_voice_1' },
  snippet: { typed: 'sn_typed_1', voice: 'sn_voice_1' },
}

// ---------------------------------------------------------------- Decode descriptions, built from the scene's real attributes
const FILLERS = ['so', 'basically', 'I guess', 'let me see', 'okay', 'right', 'kind of']
function describe(set, target, mode) {
  const details = distinguishingDetails(set, target.id).sort((a, b) => b.separates - a.separates)
  const labels = details.map((d) => d.label)
  const chosen = mode === 'voice' ? labels.slice(0, int(3, 5)) : labels.slice(0, int(2, 4))
  if (chance(0.2)) chosen.pop() // sometimes the best detail is simply missed
  const [first, ...rest] = chosen.length ? chosen : labels.slice(0, 2)
  if (mode === 'typed') return `${first}, ${rest.join(', ')}. ${chance(0.5) ? 'nothing else on the lawn.' : 'pretty plain otherwise.'}`
  const bits = rest.map((r) => `${pick(FILLERS)} ${r}`)
  return `${pick(FILLERS)} this one is the ${first}. ${bits.join('. ')}. ${chance(0.6) ? 'and compared to the other ones that is what stands out to me.' : 'the rest looks about the same as the others.'}`
}

// ---------------------------------------------------------------- Round numbers
function roundFor(person, game, mode, order, startedAt) {
  const typed = mode === 'typed'
  const limit = GAME_SECONDS[game] * 1000
  const base = person.typedWpm * between(0.9, 1.1)
  const wpmRaw = typed ? base : Math.min(person.typedWpm * person.voiceMult * between(0.78, 1.22), 232)
  const activeMs = Math.round(typed ? limit * between(0.6, 0.99) : limit * between(0.4, 0.85))
  const words = Math.max(8, Math.round((wpmRaw * activeMs) / 60000))
  const wpm = round1((words * 60000) / activeMs)
  const chars = Math.round(words * between(4.6, 5.6))
  const flaggedInstead = !typed && game === 'rant' && person.typedInsteadRant
  const keystrokes = typed || flaggedInstead ? Math.round(chars * between(1.05, 1.45)) : int(0, 3)
  const asTyped = typed || flaggedInstead
  const extras = {}
  const answers = {}
  if (game === 'brain_dump') {
    extras.idea_count = Math.max(2, Math.round(words / (typed ? 4.6 : 11)))
    extras.edit_chars = typed ? int(40, 150) : int(0, 20)
  } else if (game === 'decode') {
    extras.edit_chars = typed ? int(5, 45) : int(0, 12)
  } else if (game === 'rant') {
    extras.edit_chars = typed ? int(0, 30) : int(0, 40)
  } else if (game === 'juggler') {
    const total = int(40, 50)
    const caught = typed ? int(Math.round(total * 0.25), Math.round(total * 0.6)) : int(Math.round(total * 0.82), Math.round(total * 0.97))
    extras.caught = caught
    extras.dropped = total - caught
    extras.rubric_hits = int(1, 3)
  } else if (game === 'snippet') {
    extras.jargon_total = 8
    extras.jargon_hits = typed ? int(1, 4) : int(0, 5)
  }
  if (game === 'rant') {
    answers.lang_mix = 'English'
    answers.sendable = int(2, 5)
    answers.accuracy = typed || flaggedInstead ? null : int(3, 5)
    if (flaggedInstead) answers.typed_instead = true
  }
  if (!typed) {
    answers.felt_natural = flaggedInstead ? 3 : int(person.natural - 1, person.natural + 1)
    answers.ownership = pick(['mine', 'mine', 'mine', 'mostly', 'mostly', 'not'].slice(0, person.ownershipPool))
  }
  return {
    game, mode, mode_order: order,
    prompt_key: PROMPT_KEYS[game]?.[mode] ?? null,
    started_at: startedAt, active_ms: activeMs, words, chars, wpm, keystrokes,
    paste_events: asTyped ? 0 : 1, insert_events: asTyped ? 0 : int(1, 2),
    integrity: flaggedInstead ? 'flagged' : 'ok', answers, extras,
  }
}

// ---------------------------------------------------------------- A plain PNG streak card (a placeholder, not a real Flow screenshot)
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data])
  const out = Buffer.alloc(body.length + 8)
  out.writeUInt32BE(data.length, 0)
  body.copy(out, 4)
  out.writeUInt32BE(crc32(body), body.length + 4)
  return out
}
function streakCardPng(days, hue) {
  const W = 480, H = 270
  const px = Buffer.alloc((W * 4 + 1) * H)
  const colors = [[244, 237, 224], [255, 255, 255], hue, [60, 44, 36]]
  for (let y = 0; y < H; y++) {
    px[y * (W * 4 + 1)] = 0
    for (let x = 0; x < W; x++) {
      let c = colors[0]
      if (x > 20 && x < W - 20 && y > 20 && y < H - 20) c = colors[1]
      const inCircle = (x - 120) ** 2 + (y - 135) ** 2 < 70 ** 2
      if (inCircle) c = colors[2]
      if (y > 120 && y < 150) for (let d = 0; d < days; d++) if (x > 240 + d * 60 && x < 280 + d * 60) c = colors[2]
      if (y > 190 && y < 200 && x > 240 && x < 440) c = colors[3]
      const o = y * (W * 4 + 1) + 1 + x * 4
      px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255
    }
  }
  const head = Buffer.alloc(13)
  head.writeUInt32BE(W, 0); head.writeUInt32BE(H, 4); head[8] = 8; head[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', head), chunk('IDAT', deflateSync(px)), chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------------------------------------------------------------- Run
const APPS = {
  developer: ['VS Code', 'Cursor', 'Terminal', 'Slack', 'Browser', 'Email', 'Docs'],
  prompt_engineer: ['Docs', 'Notion', 'Browser', 'Slack', 'Email', 'Cursor'],
}
const REASONS = [
  'It cut off mid-sentence and I had to repeat myself.',
  'It worked but it was slower to start than Flow.',
  'No custom words, so it kept mangling names.',
]
const rpc = async (fn, args) => {
  const { data, error } = await client.rpc(fn, args)
  if (error) throw new Error(`${fn}: ${error.message}`)
  return data
}

const manifest = { createdAt: new Date().toISOString(), note: 'SIMULATED players. Not real survey data.', players: [] }
const save = () => writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')

for (const [index, person] of PEOPLE.entries()) {
  Object.assign(person, {
    typedWpm: between(28, 58),
    voiceMult: between(2.2, 4.0),
    natural: int(3, 5),
    ownershipPool: pick([3, 4, 5, 6]),
  })
  const token = await rpc('register_player', {
    p_code_name: person.name, p_avatar: 1 + (index % 6), p_cohort: person.cohort, p_os: person.os, p_languages: ['English'],
  })
  const { data: row } = await client.from('player').select('id').eq('code_name', person.name).single()
  const entry = { id: row.id, codeName: person.name, paths: [] }
  manifest.players.push(entry)
  save() // recorded first, so a failure part-way is still removable

  await rpc('record_consent', { p_token: token, p_leaderboard_opt_in: false })

  const finishAt = Date.now() - (24 + between(0.5, 6)) * 3600_000 // day 2 has opened
  let slot = GAMES.length * 2
  for (const game of GAMES) {
    const firstMode = chance(0.5) ? 'typed' : 'voice'
    for (const [i, mode] of [firstMode, firstMode === 'typed' ? 'voice' : 'typed'].entries()) {
      const startedAt = new Date(finishAt - slot-- * 95_000 - between(0, 20_000)).toISOString()
      const round = roundFor(person, game, mode, i + 1, startedAt)
      let description = null
      if (game === 'decode') {
        const set = generateSceneSet(seedForMode(mode, rand))
        const target = set.scenes[Math.floor(rand() * set.scenes.length)]
        round.prompt_key = `decode_${set.id}`
        description = { scene_set: set.id, target_scene: target.id, text: describe(set, target, mode) }
      }
      await rpc('submit_round', { p_token: token, p_round: round, p_description: description })
    }
  }
  await rpc('finish_arcade', { p_token: token })
  await rpc('mark_quest', { p_token: token, p_day: 1 })

  const streakDays = chance(0.6) ? 2 : 1
  const path = `${token}/day3.png`
  const up = await client.storage.from('streak-cards').upload(path, streakCardPng(streakDays, pick([[240, 120, 100], [130, 170, 130], [150, 130, 210], [230, 180, 60]])), { contentType: 'image/png' })
  if (up.error) throw new Error(`upload: ${up.error.message}`)
  entry.paths.push(path)
  save()
  const tried = chance(0.45)
  await rpc('submit_checkin', {
    p_token: token,
    p_day: 3,
    p_fields: {
      streak_days: streakDays,
      total_words: int(700, 5200),
      apps: [...new Set(Array.from({ length: int(2, 4) }, () => pick(APPS[person.cohort])))],
      screenshot_path: path,
      answers: { tried_builtin: tried, builtin_dictation_reason: tried ? pick(REASONS) : '' },
    },
  })

  // Day 2 has opened: move the finish time back by about a day.
  const { error } = await client.from('player').update({ arcade_done_at: new Date(finishAt).toISOString() }).eq('id', row.id)
  if (error) throw new Error(`backdate: ${error.message}`)
  console.log(`seeded ${person.name} (${person.os}, ${person.cohort}, ${streakDays}-day streak)`)
}
console.log(`Done: ${manifest.players.length} simulated players. Manifest: scripts/.simulated-players.json`)
