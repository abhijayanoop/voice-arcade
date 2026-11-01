import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Cohort, Os } from '../api/types'
import { useBlip, useBlipOnMount } from '../blip/BlipProvider'
import { AVATARS } from '../ui/avatars'
import { Chip } from '../ui/Chip'
import { useSession } from './SessionProvider'

const ADJECTIVES = ['Mango', 'Cosmic', 'Sunny', 'Turbo', 'Velvet', 'Pixel', 'Zesty', 'Mellow']
const NOUNS = ['Otter', 'Comet', 'Waffle', 'Falcon', 'Noodle', 'Panda', 'Lantern', 'Pickle']
const LANGUAGES = ['English', 'Hinglish', 'Hindi', 'Spanish', 'Other mix']
const COHORTS: { value: Cohort; label: string }[] = [
  { value: 'developer', label: 'Developer' },
  { value: 'prompt_engineer', label: 'Prompt engineer' },
]
const SYSTEMS: { value: Os; label: string }[] = [
  { value: 'mac', label: 'Mac' },
  { value: 'windows', label: 'Windows' },
  { value: 'other', label: 'Other' },
]

/** How long the code name cheer stays up before Blip moves on to the avatars. */
const NAME_LINE_MS = 3000

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export function NameScreen() {
  const { view, register } = useSession()
  const { say } = useBlip()
  useBlipOnMount('setup.pick_name')
  const navigate = useNavigate()
  const suggestions = useMemo(
    () => Array.from({ length: 3 }, () => `${pick(ADJECTIVES)}${pick(NOUNS)}`),
    [],
  )
  const [codeName, setCodeName] = useState('')
  const [avatar, setAvatar] = useState(0)
  const [cohort, setCohort] = useState<Cohort | null>(null)
  const [os, setOs] = useState<Os | null>(null)
  const [languages, setLanguages] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const name = codeName.trim()
  const ready = name.length >= 2 && cohort !== null && os !== null && languages.length > 0

  useEffect(() => {
    if (view.step === 'consent') navigate('/ready', { replace: true })
  }, [view.step, navigate])

  // Blip cheers a usable code name once per name, then points at the avatars.
  const announced = useRef('')
  const nextStep = useRef(0)
  function announceName() {
    if (name.length < 2 || announced.current === name) return
    announced.current = name
    say('setup.name_done', { name })
    window.clearTimeout(nextStep.current)
    nextStep.current = window.setTimeout(() => say('setup.pick_avatar'), NAME_LINE_MS)
  }
  useEffect(() => () => window.clearTimeout(nextStep.current), [])

  function pickAvatar(index: number) {
    setAvatar(index)
    if (languages.length === 0) say('setup.languages')
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!ready || !cohort || !os) return
    setBusy(true)
    try {
      await register({ codeName: name, avatar, cohort, os, languages })
    } finally {
      setBusy(false)
    }
  }

  const toggleLanguage = (language: string) =>
    setLanguages((current) =>
      current.includes(language) ? current.filter((l) => l !== language) : [...current, language],
    )

  return (
    <main id="main" className="wa-page">
      <form className="wa-screen" onSubmit={submit}>
        <h1 className="wa-heading">Pick your code name</h1>
        <div className="wa-card">
          <div className="wa-field">
            <label className="wa-label" htmlFor="code-name">
              Code name
            </label>
            <input
              id="code-name"
              className="wa-input"
              value={codeName}
              maxLength={20}
              autoComplete="off"
              aria-describedby="code-name-help"
              aria-invalid={view.registerError ? true : undefined}
              data-blip-target="name-input"
              onBlur={announceName}
              onChange={(e) => setCodeName(e.target.value)}
            />
            <p id="code-name-help" className="wa-note">
              The only name shown anywhere. No real names.
            </p>
            {view.registerError === 'code_name_taken' && (
              <p className="wa-error" role="alert">
                That code name is taken. Pick another.
              </p>
            )}
            <div className="wa-chips">
              {suggestions.map((s) => (
                <Chip key={s} pressed={codeName === s} onToggle={() => setCodeName(s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </div>

          <fieldset className="wa-field" data-blip-target="avatar-grid">
            <legend className="wa-label">Avatar</legend>
            <div className="wa-row">
              {AVATARS.map((a, i) => (
                <button
                  key={a.name}
                  type="button"
                  className="wa-avatar wa-avatar-pick"
                  style={{ background: a.color }}
                  aria-label={a.name}
                  aria-pressed={avatar === i}
                  onClick={() => pickAvatar(i)}
                >
                  <i />
                  <i />
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="wa-field">
            <legend className="wa-label">You are a</legend>
            <div className="wa-chips">
              {COHORTS.map((o) => (
                <Chip key={o.value} pressed={cohort === o.value} onToggle={() => setCohort(o.value)}>
                  {o.label}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset className="wa-field">
            <legend className="wa-label">Your computer</legend>
            <div className="wa-chips">
              {SYSTEMS.map((o) => (
                <Chip key={o.value} pressed={os === o.value} onToggle={() => setOs(o.value)}>
                  {o.label}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset className="wa-field" data-blip-target="language-card">
            <legend className="wa-label">Languages you talk in (pick any)</legend>
            <div className="wa-chips">
              {LANGUAGES.map((language) => (
                <Chip
                  key={language}
                  pressed={languages.includes(language)}
                  onToggle={() => toggleLanguage(language)}
                >
                  {language}
                </Chip>
              ))}
            </div>
          </fieldset>

          <div className="wa-actions">
            <button type="submit" className="wa-btn wa-btn--primary" disabled={!ready || busy}>
              Continue
            </button>
          </div>
        </div>
      </form>
    </main>
  )
}
