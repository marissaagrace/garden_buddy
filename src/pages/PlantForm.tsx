import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LIFECYCLE_STAGES } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import type { PlantRow, WateringRuleRow } from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'
import { addDays } from '@/lib/dates'

export function PlantForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [species, setSpecies] = useState('')
  const [plantedDate, setPlantedDate] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [lifecycleStage, setLifecycleStage] = useState<string>('')
  const [intervalDays, setIntervalDays] = useState<number>(7)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit || !id || !user) return
    let cancelled = false
    async function load() {
      setErr(null)
      const { data: plant, error: pErr } = await supabase
        .from('plants')
        .select('*')
        .eq('id', id)
        .single()
      const { data: rules, error: rErr } = await supabase
        .from('watering_rules')
        .select('*')
        .eq('plant_id', id)
        .maybeSingle()
      if (cancelled) return
      if (pErr || !plant) {
        setErr(pErr?.message ?? 'Plant not found')
        setLoading(false)
        return
      }
      if (rErr) setErr(rErr.message)
      const p = plant as PlantRow
      setName(p.name)
      setSpecies(p.species ?? '')
      setPlantedDate(p.planted_date ?? '')
      setLocation(p.location ?? '')
      setNotes(p.notes ?? '')
      setLifecycleStage(p.lifecycle_stage ?? '')
      const r = rules as WateringRuleRow | null
      if (r?.interval_days != null) setIntervalDays(r.interval_days)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, isEdit, user])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setErr(null)

    const base = {
      name: name.trim(),
      species: species.trim() || null,
      planted_date: plantedDate || null,
      location: location.trim() || null,
      notes: notes.trim() || null,
      lifecycle_stage: lifecycleStage || null,
    }

    if (isEdit && id) {
      const { error: uErr } = await supabase.from('plants').update(base).eq('id', id)
      if (uErr) {
        setErr(uErr.message)
        setSaving(false)
        return
      }
      const nextDue = addDays(new Date(), intervalDays).toISOString()
      const { data: existing } = await supabase
        .from('watering_rules')
        .select('id')
        .eq('plant_id', id)
        .maybeSingle()
      if (existing?.id) {
        await supabase
          .from('watering_rules')
          .update({
            interval_days: intervalDays,
            cadence: `every ${intervalDays} days`,
            next_due_at: nextDue,
          })
          .eq('id', existing.id)
      } else {
        await supabase.from('watering_rules').insert({
          user_id: user.id,
          plant_id: id,
          interval_days: intervalDays,
          cadence: `every ${intervalDays} days`,
          next_due_at: nextDue,
        })
      }
      setSaving(false)
      navigate(`/plants/${id}`)
      return
    }

    const { data: created, error: cErr } = await supabase
      .from('plants')
      .insert({ ...base, user_id: user.id })
      .select()
      .single()
    if (cErr || !created) {
      setErr(cErr?.message ?? 'Could not create plant')
      setSaving(false)
      return
    }
    const plantId = (created as PlantRow).id
    const nextDue = addDays(new Date(), intervalDays).toISOString()
    await supabase.from('watering_rules').insert({
      user_id: user.id,
      plant_id: plantId,
      interval_days: intervalDays,
      cadence: `every ${intervalDays} days`,
      next_due_at: nextDue,
    })
    setSaving(false)
    navigate(`/plants/${plantId}`)
  }

  if (loading) {
    return <p className="text-ac-muted text-center font-semibold">Loading plant…</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-ac-ink text-2xl font-bold">{isEdit ? 'Edit plant' : 'New plant'}</h1>
        <p className="text-ac-muted text-sm">Give it a name and a cozy watering rhythm.</p>
      </div>
      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-3 text-left">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Name
            <input
              required
              className="rounded-ac-xl border-ac-leaf-dark/25 text-ac-ink border-2 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-ac-leaf/50"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Species <span className="text-ac-muted font-normal">(optional)</span>
            <input
              className="rounded-ac-xl border-ac-leaf-dark/25 text-ac-ink border-2 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-ac-leaf/50"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Planted date
            <input
              type="date"
              className="rounded-ac-xl border-ac-leaf-dark/25 text-ac-ink border-2 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-ac-leaf/50"
              value={plantedDate}
              onChange={(e) => setPlantedDate(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Location
            <input
              className="rounded-ac-xl border-ac-leaf-dark/25 text-ac-ink border-2 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-ac-leaf/50"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Windowsill, greenhouse…"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Lifecycle stage
            <select
              className="rounded-ac-xl border-ac-leaf-dark/25 text-ac-ink border-2 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-ac-leaf/50"
              value={lifecycleStage}
              onChange={(e) => setLifecycleStage(e.target.value)}
            >
              <option value="">—</option>
              {LIFECYCLE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Water every (days)
            <input
              type="number"
              min={1}
              max={90}
              required
              className="rounded-ac-xl border-ac-leaf-dark/25 text-ac-ink border-2 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-ac-leaf/50"
              value={intervalDays}
              onChange={(e) => setIntervalDays(Number(e.target.value))}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Notes
            <textarea
              rows={3}
              className="rounded-ac-xl border-ac-leaf-dark/25 text-ac-ink border-2 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-ac-leaf/50"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          {err && (
            <p className="text-sm font-medium text-red-700" role="alert">
              {err}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create plant'}
            </Button>
            <Link to={isEdit && id ? `/plants/${id}` : '/plants'}>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}
