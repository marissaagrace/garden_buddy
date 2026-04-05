/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  /** Legacy JWT anon key (Settings → API → anon public). */
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** New publishable key (sb_publishable_…), if your project uses it. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** Alias matching Supabase dashboard naming. */
  readonly VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY?: string
  /** Optional. Public site origin for auth email redirects (e.g. https://your-app.vercel.app). Defaults to window.location.origin. */
  readonly VITE_SITE_URL?: string
  /** Perenual plant API key for species search/autocomplete. */
  readonly VITE_PERENUAL_API_KEY?: string
  /** OpenWeather API key for the dashboard weather widget. */
  readonly VITE_OPENWEATHER_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
