import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LIFECYCLE_STAGES } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import type { PlantRow, WateringRuleRow } from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'
import { addDays } from '@/lib/dates'

const PERENUAL_KEY = import.meta.env.VITE_PERENUAL_API_KEY

interface PerenualResult {
  id: number
  common_name: string
  scientific_name: string[]
  watering: string // "Frequent" | "Average" | "Minimum" | "None"
  sunlight: string[]
  description?: string
}

// Map Perenual watering labels to interval days
function wateringToDays(watering: string): number {
  switch (watering?.toLowerCase()) {
    case 'frequent': return 2
    case 'average': return 7
    case 'minimum': return 14
    case 'none': return 30
    default: return 7
  }
}

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

  // Autofill state
  const [suggestions, setSuggestions] = useState<PerenualResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Search Perenual as user types in the species field
  function handleSpeciesChange(value: string) {
    setSpecies(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!value.trim() || value.length < 2 || !PERENUAL_KEY) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `https://perenual.com/api/species-list?key=${PERENUAL_KEY}&q=${encodeURIComponent(value)}&page=1`
        )
        const data = await res.json()
        const results: PerenualResult[] = (data.data ?? []).slice(0, 6)
        setSuggestions(results)
        setShowDropdown(results.length > 0)
      } catch {
        setSuggestions([])
        setShowDropdown(false)
      } finally {
        setSearching(false)
      }
    }, 400)
  }

  // Autofill species/watering/notes when user picks a suggestion — name is left as-is
  function selectSuggestion(plant: PerenualResult) {
    setSpecies(plant.scientific_name?.[0] ?? plant.common_name)
    setIntervalDays(wateringToDays(plant.watering))
    if (plant.description) {
      setNotes(`Sunlight: ${plant.sunlight?.join(', ') ?? '—'}. ${plant.description}`.slice(0, 300))
    } else {
      setNotes(`Sunlight: ${plant.sunlight?.join(', ') ?? '—'}. Watering: ${plant.watering ?? '—'}.`)
    }
    setSuggestions([])
    setShowDropdown(false)
  }

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
    return () => { cancelled = true }
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
      if (uErr) { setErr(uErr.message); setSaving(false); return }
      const nextDue = addDays(new Date(), intervalDays).toISOString()
      const { data: existing } = await supabase
        .from('watering_rules').select('id').eq('plant_id', id).maybeSingle()
      if (existing?.id) {
        await supabase.from('watering_rules').update({
          interval_days: intervalDays,
          cadence: `every ${intervalDays} days`,
          next_due_at: nextDue,
        }).eq('id', existing.id)
      } else {
        await supabase.from('watering_rules').insert({
          user_id: user.id, plant_id: id,
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
      .from('plants').insert({ ...base, user_id: user.id }).select().single()
    if (cErr || !created) { setErr(cErr?.message ?? 'Could not create plant'); setSaving(false); return }
    const plantId = (created as PlantRow).id
    const nextDue = addDays(new Date(), intervalDays).toISOString()
    await supabase.from('watering_rules').insert({
      user_id: user.id, plant_id: plantId,
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

  const inputClass = "rounded-ac-xl border-ac-leaf-dark/25 text-ac-ink border-2 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-ac-leaf/50"

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
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What do you call this plant?"
            />
          </label>

          {/* Species with autofill dropdown */}
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Species <span className="text-ac-muted font-normal">(type to search)</span>
            <div className="relative" ref={dropdownRef}>
              <input
                className={inputClass + ' w-full'}
                value={species}
                onChange={(e) => handleSpeciesChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                placeholder="e.g. tomato, basil, monstera…"
                autoComplete="off"
              />
              {searching && (
                <span className="absolute right-3 top-2.5 text-xs text-ac-muted animate-pulse">
                  searching…
                </span>
              )}
              {showDropdown && suggestions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-ac-xl border-2 border-ac-leaf-dark/20 bg-white shadow-lg overflow-hidden">
                  {suggestions.map((plant) => (
                    <button
                      key={plant.id}
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-ac-leaf/10 transition-colors border-b border-ac-leaf-dark/10 last:border-0"
                      onClick={() => selectSuggestion(plant)}
                    >
                      <span className="block text-sm font-semibold text-ac-ink">
                        {plant.common_name}
                      </span>
                      <span className="block text-xs text-ac-muted italic">
                        {plant.scientific_name?.[0]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Planted date
            <input
              type="date"
              className={inputClass}
              value={plantedDate}
              onChange={(e) => setPlantedDate(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Location
            <input
              className={inputClass}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Windowsill, greenhouse…"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Lifecycle stage
            <select
              className={inputClass}
              value={lifecycleStage}
              onChange={(e) => setLifecycleStage(e.target.value)}
            >
              <option value="">—</option>
              {LIFECYCLE_STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
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
              className={inputClass}
              value={intervalDays}
              onChange={(e) => setIntervalDays(Number(e.target.value))}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Notes
            <textarea
              rows={3}
              className={inputClass}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          {err && (
            <p className="text-sm font-medium text-red-700" role="alert">{err}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create plant'}
            </Button>
            <Link to={isEdit && id ? `/plants/${id}` : '/plants'}>
              <Button type="button" variant="ghost">Cancel</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}