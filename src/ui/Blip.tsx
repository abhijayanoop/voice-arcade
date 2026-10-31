import idleSvg from '../../docs/design/blip/blip-idle.svg?raw'

export function BlipHero() {
  return (
    <div
      className="blip blip--bob blip--hero"
      dangerouslySetInnerHTML={{ __html: idleSvg }}
    />
  )
}
