import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Droplets } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { WeatherWidget } from '@/components/WeatherWidget'
import { formatDate, formatDateTime } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type { PlantEventRow, PlantRow, WateringRuleRow } from '@/lib/types'
import { isOverdue, isDueSoon, latestWateredAt, nextWaterDue } from '@/lib/watering'
import { useAuth } from '@/providers/AuthProvider'

type PlantWithRules = PlantRow & { watering_rules: WateringRuleRow[] | null }

export function Dashboard() {
  const { user } = useAuth()
  const reduce = useReducedMotion()
  const [plants, setPlants] = useState<PlantWithRules[]>([])
  const [wateredEvents, setWateredEvents] = useState<PlantEventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      setErr(null)
      const [pRes, eRes] = await Promise.all([
        supabase.from('plants').select('*, watering_rules(*)').order('name'),
        supabase.from('plant_events').select('*').eq('type', 'watered'),
      ])
      if (cancelled) return
      if (pRes.error) setErr(pRes.error.message)
      if (eRes.error) setErr(eRes.error.message)
      setPlants((pRes.data as PlantWithRules[]) ?? [])
      setWateredEvents(eRes.data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user])

  const rows = useMemo(() => {
    const byPlant = new Map<string, PlantEventRow[]>()
    for (const ev of wateredEvents) {
      const list = byPlant.get(ev.plant_id) ?? []
      list.push(ev)
      byPlant.set(ev.plant_id, list)
    }
    return plants.map((p) => {
      const rule = p.watering_rules?.[0] ?? null
      const last = latestWateredAt(byPlant.get(p.id) ?? [])
      const due = nextWaterDue(rule, last)
      return { plant: p, rule, lastWatered: last, due }
    })
  }, [plants, wateredEvents])

  const dueBucket = useMemo(() => {
    const overdue: typeof rows = []
    const soon: typeof rows = []
    const ok: typeof rows = []
    for (const row of rows) {
      if (!row.due && !row.rule?.interval_days && !row.rule?.next_due_at) {
        ok.push(row)
        continue
      }
      if (row.due && isOverdue(row.due)) overdue.push(row)
      else if (row.due && isDueSoon(row.due, 7)) soon.push(row)
      else ok.push(row)
    }
    return { overdue, soon, ok }
  }, [rows])

  const container = reduce
    ? undefined
    : {
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: 0.06 },
        },
      }
  const item = reduce
    ? undefined
    : {
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0 },
      }

  if (loading) {
    return (
      <p className="text-ac-muted text-center font-semibold">Gathering your tools…</p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ac-ink text-2xl font-bold">Today in your garden</h1>
        <p className="text-ac-muted mt-1 text-sm">Watering nudges and friendly check-ins.</p>
      </div>
      {err && (
        <p className="text-sm font-medium text-red-700" role="alert">
          {err}
        </p>
      )}

      <WeatherWidget />

      <section aria-labelledby="due-heading">
        <h2 id="due-heading" className="text-ac-ink mb-3 flex items-center gap-2 text-lg font-bold">
          <Droplets className="h-5 w-5 text-sky-600" aria-hidden />
          Needs attention
        </h2>
        {dueBucket.overdue.length === 0 && dueBucket.soon.length === 0 ? (
          <Card>
            <p className="text-ac-muted text-sm">
              Nothing urgent — your plants are sipping happily. Check back after your next watering day.
            </p>
          </Card>
        ) : (
          <motion.ul
            className="flex flex-col gap-3"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {[...dueBucket.overdue, ...dueBucket.soon].map(({ plant, due, lastWatered }) => (
              <motion.li key={plant.id} variants={item}>
                <Link to={`/plants/${plant.id}`}>
                  <Card className="hover:border-ac-leaf-dark/35 transition-colors">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-ac-ink font-bold">{plant.name}</p>
                        {plant.species && (
                          <p className="text-ac-muted text-sm italic">{plant.species}</p>
                        )}
                        <p className="text-ac-muted mt-1 text-xs">
                          Last watered: {lastWatered ? formatDateTime(lastWatered) : '—'}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        {due && (
                          <p
                            className={
                              isOverdue(due)
                                ? 'font-bold text-red-700'
                                : 'font-semibold text-amber-800'
                            }
                          >
                            {isOverdue(due) ? 'Overdue' : 'Due soon'}
                          </p>
                        )}
                        {due && (
                          <p className="text-ac-muted text-xs">Next: {formatDateTime(due.toISOString())}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </section>

      <section aria-labelledby="all-heading">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="all-heading" className="text-ac-ink text-lg font-bold">
            All plants
          </h2>
          <Link
            to="/plants/new"
            className="text-ac-leaf-dark text-sm font-semibold underline"
          >
            Add plant
          </Link>
        </div>
        {plants.length === 0 ? (
          <Card>
            <p className="text-ac-muted text-sm">
              No plants yet — add your first sprout to start tracking watering and growth.
            </p>
            <Link
              to="/plants/new"
              className="text-ac-leaf-dark mt-3 inline-block text-sm font-semibold underline"
            >
              Add a plant
            </Link>
          </Card>
        ) : (
          <motion.ul
            className="flex flex-col gap-2"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {rows.map(({ plant, due }) => (
              <motion.li key={plant.id} variants={item}>
                <Link to={`/plants/${plant.id}`}>
                  <Card className="hover:border-ac-leaf-dark/35 py-3 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-ac-ink font-semibold">{plant.name}</span>
                      <span className="text-ac-muted text-xs">
                        {due ? `Next water ~ ${formatDate(due.toISOString())}` : 'No schedule'}
                      </span>
                    </div>
                  </Card>
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </section>
    </div>
  )
}
