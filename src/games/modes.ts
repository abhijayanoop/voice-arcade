import type { Mode } from '../api/types'

export const other = (mode: Mode): Mode => (mode === 'typed' ? 'voice' : 'typed')
