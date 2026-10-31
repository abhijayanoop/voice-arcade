export function Chip({
  pressed,
  onToggle,
  children,
}: {
  pressed: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <button type="button" className="wa-chip" aria-pressed={pressed} onClick={onToggle}>
      {children}
    </button>
  )
}
