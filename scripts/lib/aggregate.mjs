// Pure aggregation for the findings export. Takes raw table rows, returns aggregates with counts.
// No code names, tokens, descriptions or per-player rows ever leave this module.

/** Apps that count as an "AI tool" for the "still using" headline (the check-in's app chips). */
export const AI_APPS = ['Cursor']

const round2 = (n) => Math.round(n * 100) / 100
const mean = (xs) => (xs.length ? round2(xs.reduce((a, b) => a + b, 0) / xs.length) : null)
const median = (xs) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return round2(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2)
}

function tally(values) {
  const out = {}
  for (const v of values) {
    const key = v === null || v === undefined || v === '' ? 'unknown' : String(v)
    out[key] = (out[key] ?? 0) + 1
  }
  return out
}

function playersBlock(players) {
  return {
    n: players.length,
    byCohort: tally(players.map((p) => p.cohort)),
    byOs: tally(players.map((p) => p.os)),
    arcadeCompleted: { n: players.filter((p) => p.arcade_done_at).length, of: players.length },
  }
}

function gamesBlock(rounds) {
  const out = {}
  for (const game of [...new Set(rounds.map((r) => r.game))].sort()) {
    const inGame = rounds.filter((r) => r.game === game)
    const byMode = {}
    for (const mode of ['typed', 'voice']) {
      const rs = inGame.filter((r) => r.mode === mode)
      const clean = rs.filter((r) => r.integrity !== 'flagged').map((r) => Number(r.wpm))
      byMode[mode] = {
        rounds: rs.length,
        flagged: rs.filter((r) => r.integrity === 'flagged').length,
        wpmUnflaggedN: clean.length,
        meanWpm: mean(clean),
        medianWpm: median(clean),
      }
    }
    // Per-player comparison, only players with an unflagged round in both modes.
    const perPlayer = new Map()
    for (const r of inGame) {
      if (r.integrity === 'flagged') continue
      perPlayer.set(r.player_id, { ...perPlayer.get(r.player_id), [r.mode]: Number(r.wpm) })
    }
    const pairs = [...perPlayer.values()].filter((e) => e.typed !== undefined && e.voice !== undefined)
    const ratios = pairs.filter((e) => e.typed > 0).map((e) => round2(e.voice / e.typed)).sort((a, b) => a - b)
    out[game] = {
      byMode,
      comparison: {
        playersWithBothModes: pairs.length,
        voiceToTypedRatio: { n: ratios.length, mean: mean(ratios), median: median(ratios), values: ratios },
        winners: {
          n: pairs.length,
          voice: pairs.filter((e) => e.voice > e.typed).length,
          typed: pairs.filter((e) => e.typed > e.voice).length,
          tie: pairs.filter((e) => e.voice === e.typed).length,
        },
      },
    }
  }
  return out
}

function decodeBlock(rounds, descriptions, judgments) {
  const roundById = new Map(rounds.map((r) => [r.id, r]))
  const modeOf = new Map()
  for (const d of descriptions) {
    const round = roundById.get(d.round_id)
    if (round) modeOf.set(d.id, round.mode)
  }
  const byMode = {}
  for (const mode of ['typed', 'voice']) {
    const js = judgments.filter((j) => modeOf.get(j.description_id) === mode)
    const hits = js.filter((j) => j.correct).length
    byMode[mode] = {
      descriptions: [...modeOf.values()].filter((m) => m === mode).length,
      judgments: js.length,
      correct: hits,
      hitRate: js.length ? round2(hits / js.length) : null,
    }
  }
  return { judges: new Set(judgments.map((j) => j.judge_key)).size, judgments: judgments.length, byMode }
}

function rantBlock(rounds) {
  const voice = rounds.filter(
    (r) => r.game === 'rant' && r.mode === 'voice' && r.answers?.accuracy != null && !r.answers?.typed_instead,
  )
  const mixOf = (r) => r.answers?.lang_mix ?? 'unknown'
  const byLangMix = {}
  for (const mix of [...new Set(voice.map(mixOf))].sort()) {
    const rs = voice.filter((r) => mixOf(r) === mix)
    byLangMix[mix] = {
      n: rs.length,
      accuracy: tally(rs.map((r) => r.answers.accuracy)),
      meanAccuracy: mean(rs.map((r) => Number(r.answers.accuracy))),
    }
  }
  return { n: voice.length, accuracy: tally(voice.map((r) => r.answers.accuracy)), byLangMix }
}

function snippetBlock(rounds) {
  const out = {}
  for (const mode of ['typed', 'voice']) {
    const rs = rounds.filter((r) => r.game === 'snippet' && r.mode === mode && Number(r.extras?.jargon_total) > 0)
    const hits = rs.reduce((a, r) => a + Number(r.extras.jargon_hits), 0)
    const total = rs.reduce((a, r) => a + Number(r.extras.jargon_total), 0)
    out[mode] = { rounds: rs.length, hits, total, hitRate: total ? round2(hits / total) : null }
  }
  return out
}

/** "Still using": quest days 1-3 all done, and the day-3 check-in lists an AI tool among its apps. */
export function stillUsing(players, quests, checkins) {
  const daysBy = new Map()
  for (const q of quests) daysBy.set(q.player_id, (daysBy.get(q.player_id) ?? new Set()).add(q.day))
  const allThree = (id) => [1, 2, 3].every((d) => daysBy.get(id)?.has(d))
  const day3 = new Map(checkins.filter((c) => c.day === 3).map((c) => [c.player_id, c]))
  const meets = players.filter((p) => allThree(p.id) && day3.get(p.id)?.apps.some((a) => AI_APPS.includes(a)))
  return {
    definition: `Quest days 1, 2 and 3 all done, and the day-3 check-in lists an AI tool (${AI_APPS.join(', ')}) among its apps.`,
    stillUsing: meets.length,
    outOf: players.length,
    allThreeQuestDays: players.filter((p) => allThree(p.id)).length,
    checkedInDay3: day3.size,
  }
}

function checkinBlock(players, checkins, day) {
  const cs = checkins.filter((c) => c.day === day)
  const apps = Object.entries(tally(cs.flatMap((c) => c.apps)))
    .sort((a, b) => b[1] - a[1])
    .map(([app, n]) => ({ app, n }))
  return {
    playersWithCheckin: cs.length,
    outOf: players.length,
    meanStreakDays: mean(cs.map((c) => c.streak_days)),
    meanTotalWords: mean(cs.map((c) => c.total_words)),
    apps,
  }
}

function bossBlock(boss) {
  return {
    n: boss.length,
    annoyance: tally(boss.map((b) => b.annoyance)),
    meanAnnoyance: mean(boss.map((b) => b.annoyance)),
    lossTest: tally(boss.map((b) => b.disappointment)),
    payIntent: tally(boss.map((b) => b.pay_intent)),
    // Listed without code names; no quote is attributed to anyone.
    payIf: boss.map((b) => (b.pay_if ?? '').trim()).filter(Boolean),
  }
}

export function buildFindings({ players, rounds, descriptions, judgments, quests, checkins, boss }, generatedAt = new Date()) {
  return {
    generatedAt: generatedAt.toISOString(),
    note: 'Aggregates only. Every figure carries the count behind it. No code names, tokens or dictated text.',
    players: playersBlock(players),
    headline: stillUsing(players, quests, checkins),
    games: gamesBlock(rounds),
    describeToDecode: decodeBlock(rounds, descriptions, judgments),
    rant: rantBlock(rounds),
    explainTheSnippet: snippetBlock(rounds),
    day3: checkinBlock(players, checkins, 3),
    boss: bossBlock(boss),
    day5Update: {
      label: 'UPDATE: day-5 follow-up, collected after the day-3 submission.',
      ...checkinBlock(players, checkins, 5),
    },
  }
}
