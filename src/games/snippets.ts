import type { Mode } from '../api/types'

export interface Snippet {
  key: string
  code: string
  /** Technical terms a good explanation would name. Matched exactly, case-sensitive. */
  terms: string[]
}

/** A different snippet for each mode, so the two rounds never repeat. */
export const SNIPPETS: Record<Mode, Snippet> = {
  typed: {
    key: 'sn_typed_1',
    code: `function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}`,
    terms: ['debounce', 'closure', 'callback', 'setTimeout', 'clearTimeout', 'timer', 'arguments', 'delay'],
  },
  voice: {
    key: 'sn_voice_1',
    code: `async function loadUser(id) {
  const res = await fetch(\`/api/users/\${id}\`)
  if (!res.ok) throw new Error('not found')
  const { name, email } = await res.json()
  return { name, email }
}`,
    terms: ['async', 'await', 'fetch', 'promise', 'JSON', 'destructuring', 'throw', 'Error'],
  },
}
