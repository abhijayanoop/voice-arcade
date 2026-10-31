/** Voice and typing within this factor of each other count as a tie. */
export const TIE_RATIO = 1.2

/** One sentence on typed versus voice speed, or why there is no fair comparison. */
export function speedVerdict(typedWpm: number, voiceWpm: number, voiceTypedInstead: boolean): string {
  if (voiceTypedInstead) return 'You typed the voice round, so there is no voice comparison this time.'
  if (typedWpm === 0 || voiceWpm === 0) return 'One of your rounds has no usable timing, so there is no fair speed comparison this time.'
  const ratio = voiceWpm / typedWpm
  if (ratio >= TIE_RATIO) return `Voice was ${ratio.toFixed(1)}× faster than typing.`
  if (ratio <= 1 / TIE_RATIO) return `Typing was ${(1 / ratio).toFixed(1)}× faster than voice.`
  return 'Basically a tie between typing and voice.'
}
