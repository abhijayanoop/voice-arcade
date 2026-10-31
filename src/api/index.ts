import { createMemoryApi } from './memoryApi'
import { createSupabaseApi } from './supabaseApi'
import type { Api } from './types'

/** The browser bundle holds only the public URL and publishable key. Without them, the app runs on the in-memory Api. */
export function createApi(): Api {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (url && key) return createSupabaseApi(url, key)
  return createMemoryApi()
}
