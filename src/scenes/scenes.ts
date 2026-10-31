/** Decode scenes: a house, a sun and trees, generated deterministically from a seed. */

export interface SceneAttrs {
  house: number
  roof: number
  door: number
  windows: number
  sun: number
  trees: number
}

export type AttrKey = keyof SceneAttrs

interface Option {
  /** Words for the result screen, e.g. "red roof". */
  label: string
  /** A design token or colour; unused for non-colour attributes. */
  fill?: string
}

/** The small catalogue every scene is drawn from. */
export const CATALOGUE: Record<AttrKey, { name: string; options: Option[] }> = {
  house: {
    name: 'House colour',
    options: [
      { label: 'cream house', fill: 'var(--cream-200)' },
      { label: 'sage house', fill: 'var(--sage-100)' },
      { label: 'lavender house', fill: 'var(--lavender)' },
      { label: 'mustard house', fill: 'var(--mustard)' },
      { label: 'sky-blue house', fill: 'var(--sky)' },
    ],
  },
  roof: {
    name: 'Roof colour',
    options: [
      { label: 'red roof', fill: 'var(--tomato)' },
      { label: 'dark roof', fill: 'var(--ink)' },
      { label: 'green roof', fill: 'var(--sage)' },
      { label: 'purple roof', fill: 'var(--lavender-ink)' },
    ],
  },
  door: {
    name: 'Door colour',
    options: [
      { label: 'red door', fill: 'var(--tomato-deep)' },
      { label: 'dark door', fill: 'var(--ink)' },
      { label: 'yellow door', fill: 'var(--mustard)' },
      { label: 'blue door', fill: 'var(--sky)' },
    ],
  },
  windows: {
    name: 'Windows',
    options: [{ label: 'one window' }, { label: 'two windows' }, { label: 'three windows' }],
  },
  sun: {
    name: 'Sun',
    options: [
      { label: 'sun top left' },
      { label: 'sun top right' },
      { label: 'sun high in the middle' },
      { label: 'sun low on the right' },
    ],
  },
  trees: {
    name: 'Trees',
    options: [{ label: 'one tree' }, { label: 'two trees' }, { label: 'three trees' }],
  },
}

export const ATTR_KEYS = Object.keys(CATALOGUE) as AttrKey[]

export interface Scene {
  /** Unique across all sets, e.g. `s1234-2`; this is what a Judge picks and what is stored as the target. */
  id: string
  attrs: SceneAttrs
}

export interface SceneSet {
  /** `s<seed>`; the four scenes can be rebuilt from it alone. */
  id: string
  scenes: Scene[]
}

/** Small seeded generator (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SET_SIZE = 4
/** How many attributes each lookalike changes from the base scene. */
const CHANGES = 2

function shuffled<T>(items: T[], next: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const sameAttrs = (a: SceneAttrs, b: SceneAttrs) => ATTR_KEYS.every((k) => a[k] === b[k])

/** The same seed always gives the same four scenes: near-identical, each differing from the base in a couple of attributes. */
export function generateSceneSet(seed: number): SceneSet {
  const next = rng(seed)
  const pick = (key: AttrKey) => Math.floor(next() * CATALOGUE[key].options.length)
  const base = Object.fromEntries(ATTR_KEYS.map((k) => [k, pick(k)])) as unknown as SceneAttrs
  const variants: SceneAttrs[] = [base]
  while (variants.length < SET_SIZE) {
    const candidate = { ...base }
    for (const key of shuffled(ATTR_KEYS, next).slice(0, CHANGES)) {
      const count = CATALOGUE[key].options.length
      candidate[key] = (base[key] + 1 + Math.floor(next() * (count - 1))) % count
    }
    if (!variants.some((v) => sameAttrs(v, candidate))) variants.push(candidate)
  }
  const id = `s${seed}`
  return {
    id,
    scenes: shuffled(variants, next).map((attrs, i) => ({ id: `${id}-${i}`, attrs })),
  }
}

/** Rebuilds a set from its stored id, or null when the id is not one of ours. */
export function sceneSetFromId(id: string): SceneSet | null {
  const match = /^s(\d+)$/.exec(id)
  return match ? generateSceneSet(Number(match[1])) : null
}

/**
 * A fresh seed for a round. Typed rounds draw even seeds and voice rounds odd ones,
 * so the two rounds of a game can never share a set, and so never a target.
 */
export function seedForMode(mode: 'typed' | 'voice', random: () => number = Math.random): number {
  return Math.floor(random() * 1_000_000) * 2 + (mode === 'voice' ? 1 : 0)
}

export interface Detail {
  attr: AttrKey
  name: string
  /** The target's value, e.g. "red roof". */
  label: string
  /** How many of the lookalikes differ from the target on this attribute. */
  separates: number
}

/** The target's details that tell it apart from the lookalikes, most useful first. */
export function distinguishingDetails(set: SceneSet, targetId: string): Detail[] {
  const target = set.scenes.find((s) => s.id === targetId)
  if (!target) return []
  const others = set.scenes.filter((s) => s.id !== targetId)
  return ATTR_KEYS.map((attr) => ({
    attr,
    name: CATALOGUE[attr].name,
    label: CATALOGUE[attr].options[target.attrs[attr]].label,
    separates: others.filter((o) => o.attrs[attr] !== target.attrs[attr]).length,
  }))
    .filter((d) => d.separates > 0)
    .sort((a, b) => b.separates - a.separates)
}
