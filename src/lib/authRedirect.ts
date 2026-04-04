/**
 * Used for Supabase email links (confirm, reset). Must match URLs allowed in
 * Supabase → Authentication → URL Configuration → Redirect URLs.
 */
export function getAuthRedirectOrigin(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}
