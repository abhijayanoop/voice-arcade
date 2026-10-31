// Smoke test against a real Supabase project: registers a Player, submits a round and
// reads state back, using only the public URL and publishable key (the browser's view).
// Run: npm run smoke   (reads .env). If SUPABASE_SERVICE_KEY is set, the test Player is deleted afterwards.
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !publishableKey) {
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env (run scripts/setup-wizard.sh).')
  process.exit(1)
}

const client = createClient(url, publishableKey, { auth: { persistSession: false } })
const codeName = `Smoke${Math.random().toString(36).slice(2, 8)}`
let failures = 0

function check(label, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : ` ${detail}`}`)
  if (!ok) failures++
}

const rpc = (fn, args) => client.rpc(fn, args)

const direct = await client.from('player').select('*')
check('direct table read is denied', Boolean(direct.error) || (direct.data ?? []).length === 0, JSON.stringify(direct))

const registered = await rpc('register_player', {
  p_code_name: codeName, p_avatar: 1, p_cohort: 'developer', p_os: 'mac', p_languages: ['English'],
})
const token = registered.data
check('register returns a long token', typeof token === 'string' && token.length >= 32, JSON.stringify(registered.error))

const dupe = await rpc('register_player', {
  p_code_name: codeName.toLowerCase(), p_avatar: 1, p_cohort: 'developer', p_os: 'mac', p_languages: [],
})
check('taken code name is rejected, ignoring case', dupe.error?.message.includes('code_name_taken'), JSON.stringify(dupe.error))

const consent = await rpc('record_consent', { p_token: token, p_leaderboard_opt_in: true })
check('consent recorded', !consent.error, JSON.stringify(consent.error))

const round = {
  game: 'brain_dump', mode: 'voice', mode_order: 1, prompt_key: 'smoke',
  started_at: new Date().toISOString(), active_ms: 60000, words: 42, chars: 210, wpm: 42,
  keystrokes: 0, paste_events: 1, insert_events: 3, integrity: 'ok', answers: {}, extras: {},
}
const first = await rpc('submit_round', { p_token: token, p_round: round, p_description: null })
const again = await rpc('submit_round', { p_token: token, p_round: round, p_description: null })
check('round submitted, and a repeat is accepted', !first.error && !again.error, JSON.stringify(first.error ?? again.error))

const answered = await rpc('record_answers', { p_token: token, p_game: 'brain_dump', p_mode: 'voice', p_answers: { felt_natural: 4 } })
check('answers are recorded on a saved round', !answered.error, JSON.stringify(answered.error))

// Decode: a description stored with its scene set and target, then judged from a second browser (a fresh client).
const description = `smoke description ${codeName}`
const decodeRound = { ...round, game: 'decode', mode: 'typed', prompt_key: 'smoke_decode' }
const described = await rpc('submit_round', {
  p_token: token,
  p_round: decodeRound,
  p_description: { scene_set: 's1', target_scene: 's1-2', text: description },
})
check('decode round stored with its description', !described.error, JSON.stringify(described.error))

const judge = createClient(url, publishableKey, { auth: { persistSession: false } })
const judgeKey = `smoke-judge-${codeName}`
const batch = await judge.rpc('get_judge_batch', { p_judge_key: judgeKey, p_n: 20 })
const mine = (batch.data ?? []).find((d) => d.text === description)
check('a second browser is served the description', Boolean(mine), JSON.stringify(batch.error ?? batch.data))
check('the Judge receives only id, text and scene set', Object.keys(mine ?? {}).sort().join() === 'id,scene_set,text', JSON.stringify(mine))
if (mine) {
  const picked = await judge.rpc('submit_judgment', { p_judge_key: judgeKey, p_description_id: mine.id, p_picked_scene: 's1-2' })
  check('judgment submitted', !picked.error, JSON.stringify(picked.error))
  const after = await judge.rpc('get_judge_batch', { p_judge_key: judgeKey, p_n: 20 })
  check('a judged description is not served again', !(after.data ?? []).some((d) => d.id === mine.id), JSON.stringify(after.data))
}

const state = await rpc('get_state', { p_token: token })
const s = state.data
check('state restores the Player', s?.player?.codeName === codeName && s.player.consented === true && s.player.leaderboardOptIn === true, JSON.stringify(state))
check('state has exactly the two rounds submitted (idempotent)', s?.rounds?.length === 2 && s.rounds[0].modeOrder === 1, JSON.stringify(s?.rounds))

const unknown = await rpc('get_state', { p_token: 'nope' })
check('unknown token is rejected', unknown.error?.message.includes('unknown_token'), JSON.stringify(unknown.error))

const serviceKey = process.env.SUPABASE_SERVICE_KEY
if (serviceKey) {
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const removed = await admin.from('player').delete().eq('code_name', codeName)
  check('test Player cleaned up', !removed.error, JSON.stringify(removed.error))
} else {
  console.log(`note  left test Player ${codeName} behind (no SUPABASE_SERVICE_KEY); delete it in the table editor.`)
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
