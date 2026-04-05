export type PlantRow = {
  id: string
  user_id: string
  name: string
  species: string | null
  planted_date: string | null
  location: string | null
  notes: string | null
  lifecycle_stage: string | null
  created_at: string
  updated_at: string
}

export type PlantEventRow = {
  id: string
  user_id: string
  plant_id: string
  type: string
  occurred_at: string
  payload: Record<string, unknown>
}

export type WateringRuleRow = {
  id: string
  user_id: string
  plant_id: string
  cadence: string | null
  interval_days: number | null
  next_due_at: string | null
  created_at: string
}

export const LIFECYCLE_STAGES = [
  'seedling',
  'vegetative',
  'flowering',
  'fruiting',
  'dormant',
] as const

export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number]

export const EVENT_TYPES = [
  'watered',
  'fertilized',
  'pruned',
  'repotted',
  'pest_sighting',
  'health_check',
  'note',
  'lifecycle',
] as const

export const MILESTONE_TYPES = [
  'Seeded',
  'Sprouted',
  'Transplanted',
  'First Bud',
  'First Bloom',
  'Harvested',
  'Dormant',
  'Other',
] as const

export type MilestoneType = (typeof MILESTONE_TYPES)[number]
