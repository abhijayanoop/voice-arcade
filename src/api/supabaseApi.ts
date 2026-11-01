import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  CodeNameTakenError,
  UnknownTokenError,
  type Api,
  type JudgeItem,
  type LeaderboardEntry,
  type PlayerState,
} from './types'

/** The only module that talks to Supabase; every call is a named RPC function (ADR 0001). */
export function createSupabaseApi(url: string, publishableKey: string): Api {
  const client: SupabaseClient = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await client.rpc(fn, args)
    if (error) {
      if (error.message.includes('code_name_taken')) throw new CodeNameTakenError()
      if (error.message.includes('unknown_token')) throw new UnknownTokenError()
      throw new Error(`${fn} failed: ${error.message}`)
    }
    return data as T
  }

  return {
    async registerPlayer(profile) {
      const token = await rpc<string>('register_player', {
        p_code_name: profile.codeName,
        p_avatar: profile.avatar,
        p_cohort: profile.cohort,
        p_os: profile.os,
        p_languages: profile.languages,
      })
      return { token }
    },
    async recordConsent(token, leaderboardOptIn) {
      await rpc('record_consent', { p_token: token, p_leaderboard_opt_in: leaderboardOptIn })
    },
    async getState(token) {
      return rpc<PlayerState>('get_state', { p_token: token })
    },
    async submitRound(token, round, description) {
      await rpc('submit_round', {
        p_token: token,
        p_round: {
          game: round.game,
          mode: round.mode,
          mode_order: round.modeOrder,
          prompt_key: round.promptKey,
          started_at: round.startedAt,
          active_ms: round.activeMs,
          words: round.words,
          chars: round.chars,
          wpm: round.wpm,
          keystrokes: round.keystrokes,
          paste_events: round.pasteEvents,
          insert_events: round.insertEvents,
          integrity: round.integrity,
          answers: round.answers,
          extras: round.extras,
        },
        p_description: description
          ? { scene_set: description.sceneSet, target_scene: description.targetScene, text: description.text }
          : null,
      })
    },
    async finishArcade(token) {
      await rpc('finish_arcade', { p_token: token })
    },
    async getLeaderboard() {
      const rows = await rpc<{ code_name: string; avatar: number; wpm: number }[]>('get_leaderboard', {})
      return rows.map((r): LeaderboardEntry => ({ codeName: r.code_name, avatar: r.avatar, wpm: Number(r.wpm) }))
    },
    async recordAnswers(token, game, mode, answers) {
      await rpc('record_answers', { p_token: token, p_game: game, p_mode: mode, p_answers: answers })
    },
    async getJudgeBatch(judgeKey, n) {
      const rows = await rpc<{ id: string; text: string; scene_set: string }[]>('get_judge_batch', {
        p_judge_key: judgeKey,
        p_n: n,
      })
      return rows.map((r): JudgeItem => ({ id: r.id, text: r.text, sceneSet: r.scene_set }))
    },
    async submitJudgment(judgeKey, descriptionId, pickedScene) {
      await rpc('submit_judgment', { p_judge_key: judgeKey, p_description_id: descriptionId, p_picked_scene: pickedScene })
    },
    async markQuest(token, day) {
      await rpc('mark_quest', { p_token: token, p_day: day })
    },
    async uploadStreakCard(token, day, file) {
      const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/webp' ? 'webp' : 'png'
      const path = `${token}/day${day}.${ext}`
      const { error } = await client.storage.from('streak-cards').upload(path, file, { contentType: file.type })
      // The bucket is insert-only, so a retry of an upload that already landed is a duplicate, not a failure.
      if (error && !/duplicate|already exists/i.test(error.message)) {
        throw new Error(`streak card upload failed: ${error.message}`)
      }
      return path
    },
    async submitCheckin(token, checkin) {
      await rpc('submit_checkin', {
        p_token: token,
        p_day: checkin.day,
        p_fields: {
          streak_days: checkin.streakDays,
          total_words: checkin.totalWords,
          apps: checkin.apps,
          screenshot_path: checkin.screenshotPath,
          answers: checkin.answers,
        },
      })
    },
    async submitBoss(token, boss) {
      await rpc('submit_boss', {
        p_token: token,
        p_fields: {
          annoyance: boss.annoyance,
          disappointment: boss.disappointment,
          pay_intent: boss.payIntent,
          pay_if: boss.payIf,
        },
      })
    },
  }
}
