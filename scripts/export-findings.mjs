// Exports aggregate findings as one static JSON snapshot for the portfolio.
// Run: npm run findings   (reads SUPABASE_SERVICE_KEY from the local .env; it never goes in the browser bundle)
// Output: findings.json (override with FINDINGS_OUT). Rerun any time; games that ship later are included automatically.
import { writeFileSync } from 'node:fs'
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

// Only the columns the aggregates need: never token, code_name, description text or screenshot paths.
const findings = buildFindings({
  players: await all('player', 'id, cohort, os, arcade_done_at'),
  rounds: await all('round', 'id, player_id, game, mode, wpm, integrity, answers, extras'),
  descriptions: await all('description', 'id, round_id'),
  judgments: await all('judgment', 'description_id, judge_key, correct'),
  quests: await all('quest', 'player_id, day'),
  checkins: await all('checkin', 'player_id, day, streak_days, total_words, apps'),
  boss: await all('boss', 'annoyance, disappointment, pay_intent, pay_if'),
})

const out = process.env.FINDINGS_OUT ?? 'findings.json'
writeFileSync(out, JSON.stringify(findings, null, 2) + '\n')
console.log(`Wrote ${out}: ${findings.players.n} players, ${Object.keys(findings.games).length} games.`)
