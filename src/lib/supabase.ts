import { createClient } from '@supabase/supabase-js'
import type { PlantEventRow, PlantRow, WateringRuleRow } from '@/lib/types'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(
  url &&
    key &&
    !url.includes('your-project') &&
    key !== 'your-anon-key',
)

// Valid-shaped placeholders so createClient never throws during local dev without .env
const resolvedUrl = url && !url.includes('your-project') ? url : 'https://placeholder.supabase.co'
const resolvedKey =
  key && key !== 'your-anon-key' ? key : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder'

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
