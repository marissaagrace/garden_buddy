import { isSupabaseConfigured } from '@/lib/supabase'

export function ConfigBanner() {
  if (isSupabaseConfigured) return null
  return (
    <div
      role="status"
      className="border-ac-leaf-dark/30 bg-ac-cream text-ac-ink rounded-ac-lg border-2 px-4 py-3 text-left text-sm shadow-ac-soft"
    >
      <p className="font-semibold">Connect Supabase</p>
      <p className="mt-1 opacity-90">
        Copy <code className="rounded bg-white/60 px-1.5 py-0.5 font-mono text-xs">.env.example</code>{' '}
        to <code className="rounded bg-white/60 px-1.5 py-0.5 font-mono text-xs">.env</code> and set{' '}
        <code className="rounded bg-white/60 px-1.5 py-0.5 font-mono text-xs">VITE_SUPABASE_URL</code> plus{' '}
        <code className="rounded bg-white/60 px-1.5 py-0.5 font-mono text-xs">VITE_SUPABASE_ANON_KEY</code> or a publishable key. Run the SQL in{' '}
        <code className="rounded bg-white/60 px-1.5 py-0.5 font-mono text-xs">supabase/migrations/001_initial_schema.sql</code>.
      </p>
    </div>
  )
}
