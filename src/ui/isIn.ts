/** True when text reads as "I'm in", whether typed or dictated. */
export function isIn(text: string): boolean {
  return /^(i['’]?m|i am) in$/.test(text.toLowerCase().replace(/[^a-z' ’]/g, '').trim())
}
