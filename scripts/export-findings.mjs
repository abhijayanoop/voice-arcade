// Exports aggregate findings as one static JSON snapshot for the portfolio.
// Run: npm run findings   (reads SUPABASE_SERVICE_KEY from the local .env; it never goes in the browser bundle)
// Output: findings.json (override with FINDINGS_OUT). Rerun any time; games that ship later are included automatically.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { buildFindings } from './lib/aggregate.mjs'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
if (!url || !serviceKey) {
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env (local only).')
  process.exit(1)
}

const client = createClient(url, serviceKey, { auth: { persistSession: false } })

async function all(table, columns) {
  // Page through the table: Supabase caps a single read at 1000 rows and truncates silently.
  const PAGE = 1000
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client.from(table).select(columns).range(from, from + PAGE - 1)
    if (error) {
      console.error(`Reading ${table} failed: ${error.message}`)
      process.exit(1)
    }
    rows.push(...data)
    if (data.length < PAGE) return rows
  }
}

// Simulated players (scripts/seed-simulated.mjs) are left out unless --include-simulated is passed.
const MANIFEST = new URL('./.simulated-players.json', import.meta.url)
const simulated = new Set(
  existsSync(MANIFEST) && !process.argv.includes('--include-simulated')
    ? JSON.parse(readFileSync(MANIFEST, 'utf8')).players.map((p) => p.id)
    : [],
)
const real = (rows) => rows.filter((r) => !simulated.has(r.player_id))

// Only the columns the aggregates need: never token, code_name, description text or screenshot paths.
const players = (await all('player', 'id, cohort, os, arcade_done_at')).filter((p) => !simulated.has(p.id))
const rounds = real(await all('round', 'id, player_id, game, mode, wpm, integrity, answers, extras'))
const roundIds = new Set(rounds.map((r) => r.id))
const descriptions = (await all('description', 'id, round_id')).filter((d) => roundIds.has(d.round_id))
const descriptionIds = new Set(descriptions.map((d) => d.id))
const findings = buildFindings({
  players,
  rounds,
  descriptions,
  judgments: (await all('judgment', 'description_id, judge_key, correct')).filter((j) => descriptionIds.has(j.description_id)),
  quests: real(await all('quest', 'player_id, day')),
  checkins: real(await all('checkin', 'player_id, day, streak_days, total_words, apps')),
  boss: await all('boss', 'annoyance, disappointment, pay_intent, pay_if'),
})
findings.simulatedPlayersExcluded = simulated.size

const out = process.env.FINDINGS_OUT ?? 'findings.json'
writeFileSync(out, JSON.stringify(findings, null, 2) + '\n')
console.log(`Wrote ${out}: ${findings.players.n} players, ${Object.keys(findings.games).length} games.`)
