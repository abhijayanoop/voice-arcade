export const ROUTE_FOR_STEP = { register: '/name', consent: '/ready', lobby: '/lobby' } as const

/** Where a Player who has finished the arcade belongs, by phase. */
export const ROUTE_FOR_PHASE = { quests: '/quests', checkin: '/check-in', boss: '/boss', thanks: '/thanks' } as const
