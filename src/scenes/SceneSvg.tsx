import { CATALOGUE, type Scene } from './scenes'

const SUN_AT = [
  { x: 28, y: 24, r: 14 },
  { x: 172, y: 24, r: 14 },
  { x: 100, y: 16, r: 10 },
  { x: 172, y: 70, r: 14 },
]
const WINDOW_AT = [[88], [78, 108], [74, 94, 114]]
const TREE_AT = [[28], [28, 172], [24, 172, 150]]

/** One scene as inline SVG, drawn from its attributes with design tokens. */
export function SceneSvg({ scene, label }: { scene: Scene; label?: string }) {
  const { attrs } = scene
  const fill = (key: 'house' | 'roof' | 'door') => CATALOGUE[key].options[attrs[key]].fill
  const sun = SUN_AT[attrs.sun]
  return (
    <svg viewBox="0 0 200 150" role="img" aria-label={label ?? 'A scene with a house, a sun and trees'} className="wa-scene__svg">
      <rect width="200" height="150" fill="var(--sky)" opacity="0.35" />
      <rect y="120" width="200" height="30" fill="var(--sage)" />
      <circle cx={sun.x} cy={sun.y} r={sun.r} fill="var(--mustard)" />
      {TREE_AT[attrs.trees].map((x, i) => (
        <g key={i}>
          <rect x={x - 3} y={104} width="6" height="22" fill="var(--ink-soft)" />
          <circle cx={x} cy={96} r={i === 2 ? 12 : 16} fill="var(--sage-ink)" />
        </g>
      ))}
      <rect x="60" y="72" width="80" height="54" fill={fill('house')} stroke="var(--ink)" strokeWidth="2" />
      <polygon points="52,74 100,38 148,74" fill={fill('roof')} stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
      <rect x="92" y="100" width="16" height="26" rx="2" fill={fill('door')} stroke="var(--ink)" strokeWidth="1.5" />
      {WINDOW_AT[attrs.windows].map((x) => (
        <rect key={x} x={x - 6} y={82} width="12" height="12" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.5" />
      ))}
    </svg>
  )
}
