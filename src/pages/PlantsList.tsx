import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatDate } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type { PlantRow, WateringRuleRow } from '@/lib/types'
import { nextWaterDue } from '@/lib/watering'
import { useAuth } from '@/providers/AuthProvider'

type PlantWithRules = PlantRow & { watering_rules: WateringRuleRow[] | null }

export function PlantsList() {
  const { user } = useAuth()
  const reduce = useReducedMotion()
  const [plants, setPlants] = useState<PlantWithRules[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      setErr(null)
      const { data, error } = await supabase
        .from('plants')
        .select('*, watering_rules(*)')
        .order('name')
      if (cancelled) return
      if (error) setErr(error.message)
      setPlants((data as PlantWithRules[]) ?? [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user])

  const container = reduce
    ? undefined
    : {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.05 } },
      }
  const item = reduce ? undefined : { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }

  if (loading) {
    return <p className="text-ac-muted text-center font-semibold">Loading plants…</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-ac-ink text-2xl font-bold">Plants</h1>
          <p className="text-ac-muted text-sm">Tap a plant to see its story and watering rhythm.</p>
        </div>
        <Link to="/plants/new">
          <Button type="button" className="gap-2">
            <Plus className="h-4 w-4" />
            New plant
          </Button>
        </Link>
      </div>
      {err && (
        <p className="text-sm font-medium text-red-700" role="alert">
          {err}
        </p>
      )}
      {plants.length === 0 ? (
        <Card>
          <p className="text-ac-muted text-sm">No plants yet. Add your first one to begin.</p>
          <Link to="/plants/new" className="mt-3 inline-block">
            <Button type="button">Add plant</Button>
          </Link>
        </Card>
      ) : reduce ? (
        <ul className="flex flex-col gap-2">
          {plants.map((p) => {
            const rule = p.watering_rules?.[0]
            const due = nextWaterDue(rule, null)
            return (
              <li key={p.id}>
                <Link to={`/plants/${p.id}`}>
                  <Card className="hover:border-ac-leaf-dark/35 py-3 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-ac-ink font-bold">{p.name}</p>
                        {p.species && (
                          <p className="text-ac-muted text-sm italic">{p.species}</p>
                        )}
                      </div>
                      <span className="text-ac-muted text-xs">
                        {due ? `Next ~ ${formatDate(due.toISOString())}` : 'No schedule'}
                      </span>
                    </div>
                  </Card>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <motion.ul
          className="flex flex-col gap-2"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {plants.map((p) => {
            const rule = p.watering_rules?.[0]
            const due = nextWaterDue(rule, null)
            return (
              <motion.li key={p.id} variants={item}>
                <Link to={`/plants/${p.id}`}>
                  <Card className="hover:border-ac-leaf-dark/35 py-3 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-ac-ink font-bold">{p.name}</p>
                        {p.species && (
                          <p className="text-ac-muted text-sm italic">{p.species}</p>
                        )}
                      </div>
                      <span className="text-ac-muted text-xs">
                        {due ? `Next ~ ${formatDate(due.toISOString())}` : 'No schedule'}
                      </span>
                    </div>
                  </Card>
                </Link>
              </motion.li>
            )
          })}
        </motion.ul>
      )}
    </div>
  )
}
