import idleSvg from '../../docs/design/blip/blip-idle.svg?raw'

/** Blip docked bottom-left. Silent until the Blip runtime ticket. */
export function BlipDock() {
  return (
    <div className="wa-dock">
      <div className="blip blip--bob" dangerouslySetInnerHTML={{ __html: idleSvg }} />
    </div>
  )
}

export function BlipHero() {
  return (
    <div
      className="blip blip--bob"
      style={{ width: 160, height: 160 }}
      dangerouslySetInnerHTML={{ __html: idleSvg }}
    />
  )
}
