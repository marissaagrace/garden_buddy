import type { PlantEventRow, WateringRuleRow } from '@/lib/types'
import { addDays } from '@/lib/dates'

export function latestWateredAt(
  events: Pick<PlantEventRow, 'type' | 'occurred_at'>[],
): string | null {
  const watered = events
    .filter((e) => e.type === 'watered')
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
  return watered[0]?.occurred_at ?? null
}

export function nextWaterDue(
  rule: WateringRuleRow | null | undefined,
  lastWateredIso: string | null,
): Date | null {
  if (rule?.next_due_at) return new Date(rule.next_due_at)
  if (rule?.interval_days != null && lastWateredIso) {
    return addDays(new Date(lastWateredIso), rule.interval_days)
  }
  if (rule?.interval_days != null && !lastWateredIso) {
    return addDays(new Date(), rule.interval_days)
  }
  return null
}

export function isDueSoon(due: Date | null, withinDays = 7): boolean {
  if (!due) return false
  const now = new Date()
  const diff = due.getTime() - now.getTime()
  const days = diff / (1000 * 60 * 60 * 24)
  return days <= withinDays
}

export function isOverdue(due: Date | null): boolean {
  if (!due) return false
  return due.getTime() < Date.now()
}
