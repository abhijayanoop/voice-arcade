import { AVATARS } from './avatars'

export function Avatar({ index }: { index: number }) {
  return (
    <span className="wa-avatar" style={{ background: AVATARS[index]?.color }} aria-hidden="true">
      <i />
      <i />
    </span>
  )
}
