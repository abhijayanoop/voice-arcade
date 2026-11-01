import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBlip, useBlipOnMount } from '../blip/BlipProvider'
import { Chip } from '../ui/Chip'
import { useSession } from './SessionProvider'

const APPS = ['Slack', 'Email', 'VS Code', 'Cursor', 'Terminal', 'Notion', 'Browser', 'Docs', 'Other']
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export function CheckIn() {
  const { submitCheckin } = useSession()
  const { say } = useBlip()
  useBlipOnMount('quest.upload_prompt')
  const navigate = useNavigate()
  const [image, setImage] = useState<File | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [streakDays, setStreakDays] = useState('')
  const [totalWords, setTotalWords] = useState('')
  const [apps, setApps] = useState<string[]>([])
  const [tried, setTried] = useState<boolean | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const days = Number(streakDays)
  const words = Number(totalWords)
  const ready =
    image !== null &&
    streakDays !== '' &&
    totalWords !== '' &&
    Number.isInteger(days) && days >= 0 &&
    Number.isInteger(words) && words >= 0 &&
    apps.length > 0 &&
    tried !== null

  function pickImage(file: File | undefined) {
    setImageError(null)
    if (!file) return setImage(null)
    if (!IMAGE_TYPES.includes(file.type)) {
      setImage(null)
      return setImageError('Use a PNG, JPEG or WebP image.')
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImage(null)
      return setImageError('That image is over 5 MB. Try a smaller screenshot.')
    }
    setImage(file)
    say('quest.upload_done')
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!ready || !image || tried === null) return
    setBusy(true)
    setFailed(false)
    try {
      await submitCheckin({
        streakDays: days,
        totalWords: words,
        apps,
        builtinTried: tried,
        builtinReason: reason,
        image,
      })
      navigate('/boss', { replace: true })
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  const toggleApp = (app: string) =>
    setApps((current) => (current.includes(app) ? current.filter((a) => a !== app) : [...current, app]))

  return (
    <main className="wa-page">
      <form className="wa-screen" onSubmit={submit}>
        <h1 className="wa-title">Day 3 check-in</h1>
        <div className="wa-card">
          <div className="wa-field" data-blip-target="upload">
            <label className="wa-label" htmlFor="streak-card">Your Flow streak card</label>
            <input
              id="streak-card"
              className="wa-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-describedby="streak-card-help"
              onChange={(e) => pickImage(e.target.files?.[0])}
            />
            <p id="streak-card-help" className="wa-note">
              A screenshot of your streak card from Flow. It stays private: only the researcher can open it.
            </p>
            {imageError && <p className="wa-error" role="alert">{imageError}</p>}
          </div>

          <div className="wa-field">
            <label className="wa-label" htmlFor="streak-days">Streak days on the card</label>
            <input
              id="streak-days"
              className="wa-input"
              type="number"
              inputMode="numeric"
              min={0}
              value={streakDays}
              onChange={(e) => setStreakDays(e.target.value)}
            />
          </div>

          <div className="wa-field">
            <label className="wa-label" htmlFor="total-words">Total words on the card</label>
            <input
              id="total-words"
              className="wa-input"
              type="number"
              inputMode="numeric"
              min={0}
              value={totalWords}
              onChange={(e) => setTotalWords(e.target.value)}
            />
          </div>

          <fieldset className="wa-field">
            <legend className="wa-label">Where did you use Flow most?</legend>
            <div className="wa-chips">
              {APPS.map((app) => (
                <Chip key={app} pressed={apps.includes(app)} onToggle={() => toggleApp(app)}>
                  {app}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset className="wa-field">
            <legend className="wa-label">Have you tried your computer&apos;s built-in dictation?</legend>
            <div className="wa-chips">
              <Chip pressed={tried === true} onToggle={() => setTried(true)}>Yes</Chip>
              <Chip pressed={tried === false} onToggle={() => setTried(false)}>No</Chip>
            </div>
          </fieldset>

          {tried === true && (
            <div className="wa-field">
              <label className="wa-label" htmlFor="builtin-reason">Why did you switch, or why didn&apos;t you stay?</label>
              <textarea
                id="builtin-reason"
                className="wa-input"
                value={reason}
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}
        </div>

        {failed && <p className="wa-error" role="alert">That did not save. Check your connection and try again.</p>}
        <div className="wa-actions">
          <button type="submit" className="wa-btn wa-btn--primary" disabled={!ready || busy}>
            Send my check-in
          </button>
        </div>
      </form>
    </main>
  )
}
