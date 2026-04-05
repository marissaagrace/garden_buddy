import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Camera, Droplets, Pencil, Trash2, X } from 'lucide-react'
import { CelebrateBurst } from '@/components/rewards/CelebrateBurst'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { addDays, formatDate, formatDateTime } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import {
  EVENT_TYPES,
  MILESTONE_TYPES,
  type PlantEventRow,
  type PlantRow,
  type WateringRuleRow,
} from '@/lib/types'
import { latestWateredAt, nextWaterDue } from '@/lib/watering'
import { useAuth } from '@/providers/AuthProvider'

// Returns the public URL for a path stored in the plant-photos bucket.
function getPhotoUrl(path: string): string {
  const { data } = supabase.storage.from('plant-photos').getPublicUrl(path)
  return data.publicUrl
}

const inputCls =
  'rounded-ac-xl border-ac-leaf-dark/25 text-ac-ink border-2 bg-white/80 px-3 py-2'

// ─── Timeline event card (extracted to keep JSX tidy) ────────────────────────

function EventCard({
  ev,
  onPhotoClick,
}: {
  ev: PlantEventRow
  onPhotoClick: (url: string) => void
}) {
  const isMilestone = ev.type === 'milestone'
  const milestoneType =
    typeof ev.payload.milestone_type === 'string' ? ev.payload.milestone_type : null
  const photoPath = typeof ev.payload.photo_path === 'string' ? ev.payload.photo_path : null
  const note = typeof ev.payload.note === 'string' ? ev.payload.note : null

  const label = isMilestone ? (milestoneType ?? 'Milestone') : ev.type.replace(/_/g, ' ')
  // Milestones show date only; other events show date + time.
  const dateStr = isMilestone ? formatDate(ev.occurred_at) : formatDateTime(ev.occurred_at)

  return (
    <>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <span className="font-semibold capitalize text-ac-ink">
          {isMilestone ? `🌱 ${label}` : label}
        </span>
        <span className="text-ac-muted">{dateStr}</span>
      </div>
      {note && <p className="text-ac-ink mt-1 text-sm">{note}</p>}
      {photoPath && (
        <button
          type="button"
          className="mt-2 block overflow-hidden rounded-ac-lg"
          onClick={() => onPhotoClick(getPhotoUrl(photoPath))}
          aria-label="View full photo"
        >
          <img
            src={getPhotoUrl(photoPath)}
            alt=""
            className="h-20 w-20 object-cover transition-opacity hover:opacity-85"
          />
        </button>
      )}
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function PlantDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const reduce = useReducedMotion()

  const [plant, setPlant] = useState<PlantRow | null>(null)
  const [rule, setRule] = useState<WateringRuleRow | null>(null)
  const [events, setEvents] = useState<PlantEventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const [busy, setBusy] = useState(false)

  // existing quick-log form
  const [eventType, setEventType] = useState<string>('note')
  const [eventNote, setEventNote] = useState('')

  // observations (general plant notes)
  const [notesText, setNotesText] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesErr, setNotesErr] = useState<string | null>(null)
  // ref so the load callback can check edit state without being re-created
  const editingNotesRef = useRef(false)
  useEffect(() => {
    editingNotesRef.current = editingNotes
  }, [editingNotes])

  // milestone form
  const todayStr = new Date().toISOString().slice(0, 10)
  const [milestoneType, setMilestoneType] = useState<string>(MILESTONE_TYPES[0])
  const [milestoneDate, setMilestoneDate] = useState(todayStr)
  const [milestoneNote, setMilestoneNote] = useState('')
  const [milestoneErr, setMilestoneErr] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // photo lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // ── data loading ────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!id || !user) return
    setLoading(true)
    setErr(null)
    const [{ data: p, error: pErr }, { data: r }, { data: ev, error: eErr }] = await Promise.all([
      supabase.from('plants').select('*').eq('id', id).single(),
      supabase.from('watering_rules').select('*').eq('plant_id', id).maybeSingle(),
      supabase
        .from('plant_events')
        .select('*')
        .eq('plant_id', id)
        .order('occurred_at', { ascending: false }),
    ])
    if (pErr || !p) {
      setErr(pErr?.message ?? 'Not found')
      setPlant(null)
      setLoading(false)
      return
    }
    if (eErr) setErr(eErr.message)
    const plantRow = p as PlantRow
    setPlant(plantRow)
    setRule(r as WateringRuleRow | null)
    setEvents(ev ?? [])
    // Only sync notes text when the user isn't actively editing it.
    if (!editingNotesRef.current) setNotesText(plantRow.notes ?? '')
    setLoading(false)
  }, [id, user])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(t)
  }, [load])

  // Revoke object URL on unmount / when preview changes.
  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    }
  }, [photoPreviewUrl])

  // ── derived values ──────────────────────────────────────────────────────────

  const lastWatered = latestWateredAt(events)
  const due = nextWaterDue(rule, lastWatered)

  // ── handlers ────────────────────────────────────────────────────────────────

  async function logWater() {
    if (!user || !id || !plant) return
    setBusy(true)
    setErr(null)
    const interval = rule?.interval_days ?? 7
    const nextDue = addDays(new Date(), interval).toISOString()

    const { error: evErr } = await supabase.from('plant_events').insert({
      user_id: user.id,
      plant_id: id,
      type: 'watered',
      occurred_at: new Date().toISOString(),
      payload: {},
    })
    if (evErr) {
      setErr(evErr.message)
      setBusy(false)
      return
    }

    if (rule?.id) {
      await supabase.from('watering_rules').update({ next_due_at: nextDue }).eq('id', rule.id)
    } else {
      await supabase.from('watering_rules').insert({
        user_id: user.id,
        plant_id: id,
        interval_days: interval,
        cadence: `every ${interval} days`,
        next_due_at: nextDue,
      })
    }

    setCelebrate(true)
    window.setTimeout(() => setCelebrate(false), 650)
    await load()
    setBusy(false)
  }

  async function addEvent(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!user || !id) return
    setBusy(true)
    setErr(null)
    const payload: Record<string, unknown> = {}
    if (eventNote.trim()) payload.note = eventNote.trim()
    const { error } = await supabase.from('plant_events').insert({
      user_id: user.id,
      plant_id: id,
      type: eventType,
      payload,
    })
    if (error) setErr(error.message)
    else {
      setEventNote('')
      await load()
    }
    setBusy(false)
  }

  async function removePlant() {
    if (!id || !plant) return
    if (!window.confirm(`Remove ${plant.name} from your garden? This cannot be undone.`)) return
    const { error } = await supabase.from('plants').delete().eq('id', id)
    if (error) setErr(error.message)
    else navigate('/plants')
  }

  async function saveNotes(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!id) return
    setSavingNotes(true)
    setNotesErr(null)
    const { error } = await supabase
      .from('plants')
      .update({ notes: notesText.trim() || null })
      .eq('id', id)
    if (error) {
      setNotesErr(error.message)
    } else {
      setPlant((prev) => (prev ? { ...prev, notes: notesText.trim() || null } : prev))
      setEditingNotes(false)
    }
    setSavingNotes(false)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setPhotoFile(file)
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    setPhotoPreviewUrl(file ? URL.createObjectURL(file) : null)
  }

  function clearPhoto() {
    setPhotoFile(null)
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    setPhotoPreviewUrl(null)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  async function addMilestone(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!user || !id) return
    setBusy(true)
    setMilestoneErr(null)

    let storedPath: string | undefined
    if (photoFile) {
      const ext = photoFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${user.id}/${id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('plant-photos')
        .upload(path, photoFile)
      if (uploadErr) {
        setMilestoneErr(uploadErr.message)
        setBusy(false)
        return
      }
      storedPath = path
    }

    const payload: Record<string, unknown> = { milestone_type: milestoneType }
    if (milestoneNote.trim()) payload.note = milestoneNote.trim()
    if (storedPath) payload.photo_path = storedPath

    // Use UTC noon so the date is stable across all common timezones.
    const occurredAt = new Date(`${milestoneDate}T12:00:00Z`).toISOString()

    const { error } = await supabase.from('plant_events').insert({
      user_id: user.id,
      plant_id: id,
      type: 'milestone',
      occurred_at: occurredAt,
      payload,
    })

    if (error) {
      setMilestoneErr(error.message)
      // Roll back the uploaded photo so storage stays clean.
      if (storedPath) await supabase.storage.from('plant-photos').remove([storedPath])
    } else {
      setMilestoneNote('')
      setMilestoneDate(new Date().toISOString().slice(0, 10))
      setMilestoneType(MILESTONE_TYPES[0])
      clearPhoto()
      await load()
    }
    setBusy(false)
  }

  // ── early returns ────────────────────────────────────────────────────────────

  if (loading) {
    return <p className="text-ac-muted text-center font-semibold">Loading…</p>
  }
  if (!plant) {
    return (
      <Card>
        <p className="text-ac-muted">{err ?? 'Plant not found.'}</p>
        <Link to="/plants" className="text-ac-leaf-dark mt-3 inline-block font-semibold underline">
          Back to plants
        </Link>
      </Card>
    )
  }

  const listVariants = reduce
    ? undefined
    : {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.03 } },
      }
  const item = reduce ? undefined : { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">
      <CelebrateBurst show={celebrate} />

      {/* ── Lightbox ── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white"
            onClick={() => setLightboxUrl(null)}
            aria-label="Close photo viewer"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxUrl}
            alt=""
            className="rounded-ac-xl max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* ── Plant header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-ac-ink text-2xl font-bold">{plant.name}</h1>
          {plant.species && <p className="text-ac-muted italic">{plant.species}</p>}
          <div className="text-ac-muted mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {plant.location && <span>📍 {plant.location}</span>}
            {plant.planted_date && <span>Planted {formatDate(plant.planted_date)}</span>}
            {plant.lifecycle_stage && (
              <span className="rounded-ac-lg bg-ac-mint/60 px-2 py-0.5 font-medium text-ac-ink">
                {plant.lifecycle_stage}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/plants/${id}/edit`}>
            <Button type="button" variant="ghost" className="gap-2">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button type="button" variant="danger" className="gap-2" onClick={removePlant}>
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        </div>
      </div>

      {/* ── Observations (general notes, editable inline) ── */}
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-ac-ink text-lg font-bold">Observations</h2>
          {!editingNotes && (
            <Button
              type="button"
              variant="ghost"
              className="gap-1.5 text-sm"
              onClick={() => setEditingNotes(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>
        {editingNotes ? (
          <form onSubmit={saveNotes} className="flex flex-col gap-2">
            <textarea
              rows={4}
              className={`${inputCls} text-sm`}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Ongoing observations, growing habits, care quirks…"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
            {notesErr && (
              <p className="text-sm font-medium text-red-700" role="alert">
                {notesErr}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={savingNotes}>
                {savingNotes ? 'Saving…' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setNotesText(plant.notes ?? '')
                  setEditingNotes(false)
                  setNotesErr(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : notesText ? (
          <p className="text-ac-ink text-sm leading-relaxed whitespace-pre-wrap">{notesText}</p>
        ) : (
          <p className="text-ac-muted text-sm">No observations yet — tap Edit to add notes.</p>
        )}
      </Card>

      {/* ── Watering ── */}
      <Card>
        <h2 className="text-ac-ink mb-2 flex items-center gap-2 text-lg font-bold">
          <Droplets className="h-5 w-5 text-sky-600" aria-hidden />
          Watering
        </h2>
        <p className="text-ac-muted text-sm">
          Last watered: {lastWatered ? formatDateTime(lastWatered) : '—'}
        </p>
        <p className="text-ac-muted text-sm">
          Next due: {due ? formatDateTime(due.toISOString()) : 'Set a rhythm in edit'}
        </p>
        {rule?.interval_days != null && (
          <p className="text-ac-muted mt-1 text-xs">Every {rule.interval_days} days</p>
        )}
        <Button type="button" className="mt-3 gap-2" onClick={logWater} disabled={busy}>
          <Droplets className="h-4 w-4" />
          {busy ? 'Logging…' : 'Log watering'}
        </Button>
      </Card>

      {/* ── Log something (existing quick-log) ── */}
      <Card>
        <h2 className="text-ac-ink mb-3 text-lg font-bold">Log something</h2>
        <form onSubmit={addEvent} className="flex flex-col gap-2 text-left">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Type
            <select
              className={inputCls}
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Note <span className="text-ac-muted font-normal">(optional)</span>
            <textarea
              rows={2}
              className={inputCls}
              value={eventNote}
              onChange={(e) => setEventNote(e.target.value)}
            />
          </label>
          {err && (
            <p className="text-sm font-medium text-red-700" role="alert">
              {err}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Add entry'}
          </Button>
        </form>
      </Card>

      {/* ── Milestone log (new) ── */}
      <Card>
        <h2 className="text-ac-ink mb-3 text-lg font-bold">Log milestone</h2>
        <form onSubmit={addMilestone} className="flex flex-col gap-2 text-left">
          <div className="flex flex-wrap gap-2">
            <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-sm font-semibold">
              Milestone
              <select
                className={inputCls}
                value={milestoneType}
                onChange={(e) => setMilestoneType(e.target.value)}
              >
                {MILESTONE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-sm font-semibold">
              Date
              <input
                type="date"
                className={inputCls}
                value={milestoneDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setMilestoneDate(e.target.value)}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Note <span className="text-ac-muted font-normal">(optional)</span>
            <textarea
              rows={2}
              className={inputCls}
              value={milestoneNote}
              onChange={(e) => setMilestoneNote(e.target.value)}
            />
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold">
              Photo <span className="text-ac-muted font-normal">(optional)</span>
            </span>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                className="gap-1.5 text-sm"
                onClick={() => photoInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
                {photoFile ? 'Change photo' : 'Add photo'}
              </Button>
              {photoPreviewUrl && (
                <div className="relative">
                  <img
                    src={photoPreviewUrl}
                    alt="Preview"
                    className="rounded-ac-lg border-ac-leaf-dark/20 h-16 w-16 border-2 object-cover"
                  />
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 shadow"
                    aria-label="Remove photo"
                  >
                    <X className="text-ac-ink h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
          {milestoneErr && (
            <p className="text-sm font-medium text-red-700" role="alert">
              {milestoneErr}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Add milestone'}
          </Button>
        </form>
      </Card>

      {/* ── Timeline ── */}
      <section aria-labelledby="timeline-heading">
        <h2 id="timeline-heading" className="text-ac-ink mb-2 text-lg font-bold">
          Timeline
        </h2>
        {events.length === 0 ? (
          <Card>
            <p className="text-ac-muted text-sm">No events yet — log watering or a note above.</p>
          </Card>
        ) : reduce ? (
          <ul className="flex flex-col gap-2">
            {events.map((ev) => (
              <li key={ev.id}>
                <Card className="py-3">
                  <EventCard ev={ev} onPhotoClick={setLightboxUrl} />
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <motion.ul
            className="flex flex-col gap-2"
            variants={listVariants}
            initial="hidden"
            animate="show"
          >
            {events.map((ev) => (
              <motion.li key={ev.id} variants={item}>
                <Card className="py-3">
                  <EventCard ev={ev} onPhotoClick={setLightboxUrl} />
                </Card>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </section>

      <Link to="/plants" className="text-ac-leaf-dark text-sm font-semibold underline">
        ← All plants
      </Link>
    </div>
  )
}
