import { createClient } from '@supabase/supabase-js'
import type { PlantEventRow, PlantRow, WateringRuleRow } from '@/lib/types'

/** Vite uses `VITE_*` (not Next.js `NEXT_PUBLIC_*`). Any of these client keys work with createClient. */
function getSupabaseUrl(): string | undefined {
  return import.meta.env.VITE_SUPABASE_URL
}

function getSupabaseKey(): string | undefined {
  const env = import.meta.env
  return (
    env.VITE_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  )
}

const url = getSupabaseUrl()
const key = getSupabaseKey()

export const isSupabaseConfigured = Boolean(
  url &&
    key &&
    !url.includes('your-project') &&
    key !== 'your-anon-key' &&
    key !== 'your-publishable-key',
)

// Valid-shaped placeholders so createClient never throws during local dev without .env
const resolvedUrl = url && !url.includes('your-project') ? url : 'https://placeholder.supabase.co'
const resolvedKey =
  key && key !== 'your-anon-key' && key !== 'your-publishable-key'
    ? key
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder'

export const supabase = createClient(
  resolvedUrl,
  resolvedKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
)

export type Database = {
  public: {
    Tables: {
      plants: { Row: PlantRow; Insert: Partial<PlantRow> & Pick<PlantRow, 'name'> }
      plant_events: {
        Row: PlantEventRow
        Insert: Omit<PlantEventRow, 'id'> & { id?: string }
      }
      watering_rules: {
        Row: WateringRuleRow
        Insert: Omit<WateringRuleRow, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
      }
    }
  }
}
