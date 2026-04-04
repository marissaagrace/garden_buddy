import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Droplets, Pencil, Trash2 } from 'lucide-react'
import { CelebrateBurst } from '@/components/rewards/CelebrateBurst'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { addDays, formatDate, formatDateTime } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import { EVENT_TYPES, type PlantEventRow, type PlantRow, type WateringRuleRow } from '@/lib/types'
import { latestWateredAt, nextWaterDue } from '@/lib/watering'
import { useAuth } from '@/providers/AuthProvider'

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

  const [eventType, setEventType] = useState<string>('note')
  const [eventNote, setEventNote] = useState('')

  const load = useCallback(async () => {
    if (!id || !user) return
    setLoading(true)
    setErr(null)
    const [{ data: p, error: pErr }, { data: r }, { data: ev, error: eErr }] = await Promise.all([
      supabase.from('plants').select('*').eq('id', id).single(),
      supabase.from('watering_rules').select('*').eq('plant_id', id).maybeSingle(),
      supabase.from('plant_events').select('*').eq('plant_id', id).order('occurred_at', { ascending: false }),
    ])
    if (pErr || !p) {
      setErr(pErr?.message ?? 'Not found')
      setPlant(null)
      setLoading(false)
      return
    }
    if (eErr) setErr(eErr.message)
    setPlant(p as PlantRow)
    setRule(r as WateringRuleRow | null)
    setEvents(ev ?? [])
    setLoading(false)
  }, [id, user])

  useEffect(() => {
    // Load plant + events when route id changes; async work lives in load().
    const t = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(t)
  }, [load])

  const lastWatered = latestWateredAt(events)
  const due = nextWaterDue(rule, lastWatered)

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
      await supabase
        .from('watering_rules')
        .update({ next_due_at: nextDue })
        .eq('id', rule.id)
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

  async function addEvent(e: FormEvent) {
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

  return (
    <div className="flex flex-col gap-5">
      <CelebrateBurst show={celebrate} />
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

      {plant.notes && (
        <Card>
          <p className="text-ac-ink text-sm leading-relaxed whitespace-pre-wrap">{plant.notes}</p>
        </Card>
      )}

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

      <Card>
        <h2 className="text-ac-ink mb-3 text-lg font-bold">Log something</h2>
        <form onSubmit={addEvent} className="flex flex-col gap-2 text-left">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Type
            <select
              className="rounded-ac-xl border-ac-leaf-dark/25 text-ac-ink border-2 bg-white/80 px-3 py-2"
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
              className="rounded-ac-xl border-ac-leaf-dark/25 text-ac-ink border-2 bg-white/80 px-3 py-2"
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
                  <div className="flex flex-wrap justify-between gap-2 text-sm">
                    <span className="font-semibold capitalize text-ac-ink">
                      {ev.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-ac-muted">{formatDateTime(ev.occurred_at)}</span>
                  </div>
                  {typeof ev.payload?.note === 'string' && (
                    <p className="text-ac-ink mt-1 text-sm">{ev.payload.note}</p>
                  )}
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
                  <div className="flex flex-wrap justify-between gap-2 text-sm">
                    <span className="font-semibold capitalize text-ac-ink">
                      {ev.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-ac-muted">{formatDateTime(ev.occurred_at)}</span>
                  </div>
                  {typeof ev.payload?.note === 'string' && (
                    <p className="text-ac-ink mt-1 text-sm">{ev.payload.note}</p>
                  )}
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
