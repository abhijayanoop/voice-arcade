import { createMemoryApi } from './memoryApi'
import { createSupabaseApi } from './supabaseApi'
import type { Api } from './types'

/** The browser bundle holds only the public URL and publishable key. Without them, the app runs on the in-memory Api. */
export function createApi(): Api {
  cached ??= build()
  return cached
}

/** One Api per page, so the Player's session and the Judge page share the same backend (and the same fake in dev). */
let cached: Api | undefined

function build(): Api {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (url && key) return createSupabaseApi(url, key)
  return createMemoryApi()
}
